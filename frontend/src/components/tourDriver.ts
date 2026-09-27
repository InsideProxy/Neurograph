// La caja del tour guiado, con driver.js 1.8.0 (D11 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.10). Ilumina lo que señala cada paso,
// atenúa el resto con el fondo del tema (--bg) y pone la caja al lado, con los
// colores, la tipografía y el anillo de foco de la app (App.css,
// .tour-popover). Qué pasa en cada paso lo decide TourRunner
// (state/tourRunner.ts); aquí solo se enseña y se recogen los controles.
// - «← Anterior», «Siguiente →» (en el último paso, «Terminar») y «Salir» son
//   los botones de driver.js, con los patrones de botón de la app; «▶
//   Automático» se añade a su pie. Las flechas y Escape los atiende driver.js.
// - Un clic en lo atenuado no hace nada: se sale con «Salir» o con Escape.
// - La caja es un diálogo con nombre (el título) y descripción (el texto), que
//   pone driver.js. El foco va a ella, al botón del control que se usó, y al
//   salir App lo devuelve a «?».
// - Con prefers-reduced-motion, sin animaciones.
// - Mientras dura, los atajos de la app no actúan (blocksAppShortcut): se dan
//   por atendidos (preventDefault) antes de llegar a sus escuchadores, que
//   entonces no hacen nada.
import { driver, type Config, type DriveStep, type PopoverDOM } from "driver.js";
import { TOUR_STEPS, blocksAppShortcut, progressText } from "../logic/tourSteps";
import { TourRunner, type TourHost, type TourStepView, type TourView } from "../state/tourRunner";

export interface TourSession {
  dispose(): void;
}

export interface TourSessionOptions {
  host: () => TourHost;
  // La región viva que anuncia cada paso (GuidedTour).
  live: HTMLElement | null;
  onExit: () => void;
  onFinished: () => void;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

// Lo primero de la lista que está en la página y se ve.
function findAnchor(selectors: readonly string[]): Element | undefined {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.getClientRects().length > 0) return element;
  }
  return undefined;
}

export function startTour(options: TourSessionOptions): TourSession {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  let current: TourStepView | null = null;
  let popover: PopoverDOM | null = null;
  let autoButton: HTMLButtonElement | null = null;
  let status: HTMLParagraphElement | null = null;
  let started = false;

  const announce = (text: string) => {
    const live = options.live;
    if (!live) return;
    // Se vacía antes: así también se anuncia un texto igual al anterior.
    live.textContent = "";
    requestAnimationFrame(() => {
      live.textContent = text;
    });
  };

  const focusTarget = (kind: TourStepView["focus"]): HTMLButtonElement | undefined => {
    if (!popover) return undefined;
    const candidates = kind === "prev" ? [popover.previousButton] : kind === "auto" ? [autoButton] : [];
    return [...candidates, popover.nextButton].find((button): button is HTMLButtonElement => !!button && !button.disabled);
  };

  // La caja de cada paso: los textos del paso, «Salir» y el paso actual
  // arriba, una línea para la espera y «▶ Automático» en el pie.
  const renderPopover = (dom: PopoverDOM) => {
    popover = dom;
    const step = current;
    if (!step) return;
    dom.title.textContent = step.title;
    dom.description.textContent = step.description;
    dom.progress.textContent = progressText(step.index, step.total);
    dom.closeButton.textContent = "Salir";
    dom.closeButton.removeAttribute("aria-label");
    const top = document.createElement("div");
    top.className = "tour-popover__top";
    top.append(dom.progress, dom.closeButton);
    dom.wrapper.insertBefore(top, dom.title);

    status = document.createElement("p");
    status.className = "tour-popover__status";
    status.hidden = true;
    dom.description.after(status);

    // Los patrones de botón de la app (App.css): los secundarios, como
    // «Exportar JPEG», y la acción, como el «Deshacer» de los avisos.
    dom.previousButton.classList.replace("driver-popover-footer-btn", "export-btn");
    dom.nextButton.classList.replace("driver-popover-footer-btn", "toast__action");
    autoButton = document.createElement("button");
    autoButton.type = "button";
    autoButton.className = "export-btn tour-popover__auto";
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "▶";
    autoButton.append(icon, " Automático");
    autoButton.setAttribute("aria-pressed", String(step.autoplay));
    autoButton.disabled = step.lastStep;
    autoButton.title = step.lastStep ? "Es el último paso" : "Avanza solo, unos 8 s por paso; cualquier otro control lo pausa";
    autoButton.addEventListener("click", () => runner.toggleAutoplay());
    dom.footer.insertBefore(autoButton, dom.footerButtons);

    // driver.js da el foco al primer botón de la caja; el paso se lo da al
    // del control que se usó.
    queueMicrotask(() => focusTarget(step.focus)?.focus());
  };

  const view: TourView = {
    show(step) {
      current = step;
      if (started) {
        tour.moveTo(step.index);
      } else {
        started = true;
        tour.drive(step.index);
      }
    },
    refresh() {
      tour.refresh();
    },
    setBusy(message) {
      if (message !== null) announce(message);
      if (!popover || !current) return;
      const busy = message !== null;
      if (busy) popover.wrapper.setAttribute("aria-busy", "true");
      else popover.wrapper.removeAttribute("aria-busy");
      popover.previousButton.disabled = busy || current.index === 0;
      popover.nextButton.disabled = busy;
      if (autoButton) autoButton.disabled = busy || current.lastStep;
      if (status) {
        status.textContent = message ?? "";
        status.hidden = !busy;
      }
    },
    setAutoplay(playing) {
      autoButton?.setAttribute("aria-pressed", String(playing));
    },
    announce,
    close() {
      window.removeEventListener("keydown", blockShortcuts, true);
      if (tour.isActive()) tour.destroy();
    },
    anchorReady(selectors) {
      return selectors.length === 0 || findAnchor(selectors) !== undefined;
    },
  };

  const runner = new TourRunner({
    host: options.host,
    view,
    frame: nextFrame,
    userAgent: navigator.userAgent,
    onExit: options.onExit,
    onFinished: options.onFinished,
  });

  const steps: DriveStep[] = TOUR_STEPS.map((step, index) => ({
    // Se busca al iluminar, entre los selectores que da el paso. Si no hay
    // nada, driver.js pone su elemento de relleno y centra la caja, aunque su
    // tipo pida un Element.
    element: step.anchor
      ? ((() => findAnchor(current?.index === index ? current.selectors : []) ?? null) as unknown as () => Element)
      : undefined,
    disableActiveInteraction: !step.interactive,
    popover: { title: step.title, description: step.text, side: step.side, align: step.align },
  }));

  const config: Config = {
    steps,
    animate: !reducedMotion,
    smoothScroll: false,
    allowClose: true,
    allowKeyboardControl: true,
    overlayClickBehavior: () => {},
    overlayColor: "var(--bg)",
    overlayOpacity: 0.6,
    stagePadding: 6,
    stageRadius: 12,
    popoverOffset: 10,
    disableActiveInteraction: true,
    showProgress: true,
    showButtons: ["next", "previous", "close"],
    nextBtnText: "Siguiente →",
    prevBtnText: "← Anterior",
    doneBtnText: "Terminar",
    popoverClass: "tour-popover",
    onNextClick: () => void runner.next(),
    onPrevClick: () => void runner.prev(),
    onCloseClick: () => void runner.exit(),
    // Escape.
    onDestroyStarted: () => void runner.exit(),
    onPopoverRender: renderPopover,
  };
  const tour = driver(config);

  const blockShortcuts = (event: KeyboardEvent) => {
    if (blocksAppShortcut(event)) event.preventDefault();
  };
  window.addEventListener("keydown", blockShortcuts, true);
  void runner.start();

  return {
    dispose() {
      window.removeEventListener("keydown", blockShortcuts, true);
      runner.dispose();
    },
  };
}
