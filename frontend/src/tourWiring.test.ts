import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GuidedTour } from "./components/GuidedTour";
import { historyShortcut } from "./logic/historyStep";
import { regionSearchShortcut } from "./logic/regionSearch";
import { TOUR_ANCHORS } from "./logic/tourSteps";
import type { TourHost } from "./state/tourRunner";

// Cómo se conecta el tour guiado (D11 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.10) donde no se puede probar en node:
// App.tsx, que lo abre y le da su estado, driver.js, que necesita el
// navegador, las anclas de los componentes y los estilos. La lógica se prueba
// aparte (logic/tourSteps.test.ts, logic/tourPlan.test.ts,
// logic/tourRestore.test.ts, logic/tourAutoplay.test.ts,
// state/tourRunner.test.ts y state/history.test.ts); esto guarda las líneas
// que la conectan.
//
// Lee los archivos como texto, igual que marksWiring.test.ts: se pide "node:fs"
// con process.getBuiltinModule en vez de importarlo porque tsconfig.app.json
// solo carga los tipos de vite/client, y con la importación tsc -b fallaría.
interface NodeFs {
  readFileSync(path: URL, encoding: "utf8"): string;
}
const { readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule(id: "node:fs"): NodeFs } }
).process.getBuiltinModule("node:fs");

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

// El código sin comentarios y con los espacios juntos: así las pruebas no
// dependen de cómo se parten las líneas.
function code(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/\s+/g, " ");
}
const APP = code(read("./App.tsx"));
const APP_CSS = read("./App.css");
const TOUR_DRIVER = code(read("./components/tourDriver.ts"));
const GUIDED_TOUR = code(read("./components/GuidedTour.tsx"));
const COMPONENTS: Record<string, string> = {
  "App.tsx": APP,
  "TopBar.tsx": code(read("./components/TopBar.tsx")),
  "FilterPanel.tsx": code(read("./components/FilterPanel.tsx")),
  "RegionSearch.tsx": code(read("./components/RegionSearch.tsx")),
};
const DRIVER_JS = read("../node_modules/driver.js/dist/driver.js.mjs");

// El trozo de `source` que va de `start` a `end`.
function between(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  expect(from, start).toBeGreaterThan(-1);
  expect(to, end).toBeGreaterThan(from);
  return source.slice(from, to);
}

// La etiqueta JSX de apertura que contiene la posición `at`: del «<» al «>»
// que la cierra, saltando las llaves de las expresiones (en ellas, «=>»).
function openingTag(source: string, at: number): string {
  let start = at;
  while (start > 0 && source[start] !== "<") start -= 1;
  let depth = 0;
  for (let end = start; end < source.length; end++) {
    const char = source[end];
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (char === ">" && depth === 0) return source.slice(start, end + 1);
  }
  return source.slice(start);
}

// Las reglas de App.css, sin comentarios: sus selectores y sus declaraciones.
const CSS_RULES = [...APP_CSS.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
  selectors: selectors.trim(),
  body,
}));

describe("el botón «?» abre el tour, y al salir el foco vuelve a él", () => {
  it("App lo abre desde la barra y lo cierra cuando el tour acaba de devolver el montaje", () => {
    expect(APP).toContain("const [tourOpen, setTourOpen] = useState(false);");
    expect(APP).toContain("onHelp={() => setTourOpen(true)}");
    expect(APP).toContain("helpRef={helpButtonRef}");
    expect(APP).toContain(
      "<GuidedTour open={tourOpen} host={tourHost} onExit={() => helpButtonRef.current?.focus()} onFinished={() => setTourOpen(false)} />",
    );
  });

  it("el tour va con la barra, en todas las pestañas: también si se abre fuera de la vista Atlas", () => {
    const header = between(APP, "const renderHeader = ", "if (view === \"species\")");
    expect(header).toContain('<Fragment key="barra">');
    expect(header).toContain("<GuidedTour");
  });

  it("le da a TourRunner el estado de App y sus propios manejadores, los de la interfaz", () => {
    const host = between(APP, "const tourHost: TourHost = {", "};");
    for (const line of [
      "view,",
      "atlasId: selectedAtlasId,",
      "changeAtlas: handleChangeAtlas,",
      "networkSource,",
      "data: source,",
      "mainView,",
      "setMainView,",
      "filtersCollapsed,",
      "setFiltersCollapsed,",
    ]) {
      expect(host).toContain(line);
    }
    // Otra clasificación, como desde la lista «Redes»: retira el aviso de un error anterior.
    expect(host).toContain("setToasts((queue) => dismissToast(queue, NETWORK_TOAST)); setNetworkSource(value);");
  });
});

describe("salir desde cualquier paso pasa por TourRunner.exit, que devuelve el montaje", () => {
  it("«Salir» y Escape salen; «Siguiente →» en el último paso («Terminar») sale en TourRunner.next", () => {
    expect(TOUR_DRIVER).toContain("onCloseClick: () => void runner.exit(),");
    // driver.js llama a onDestroyStarted al pulsar Escape, en lugar de cerrarse.
    expect(TOUR_DRIVER).toContain("onDestroyStarted: () => void runner.exit(),");
    expect(TOUR_DRIVER).toContain("onNextClick: () => void runner.next(),");
    expect(TOUR_DRIVER).toContain("onPrevClick: () => void runner.prev(),");
  });

  it("un clic en lo atenuado no sale ni avanza", () => {
    expect(TOUR_DRIVER).toContain("overlayClickBehavior: () => {},");
  });

  it("si GuidedTour se desmonta a medias, TourRunner devuelve lo que puede (dispose)", () => {
    expect(GUIDED_TOUR).toContain("return () => session.dispose();");
    expect(TOUR_DRIVER).toContain("runner.dispose();");
  });

  it("driver.js no se cierra solo: solo TourRunner llama a destroy", () => {
    expect(TOUR_DRIVER.match(/\.destroy\(\)/g)).toHaveLength(1);
    expect(between(TOUR_DRIVER, "close() {", "anchorReady(")).toContain("if (tour.isActive()) tour.destroy();");
  });
});

describe("anclas: los data-tour de los componentes", () => {
  it("cada ancla del guion está en un componente", () => {
    const all = Object.values(COMPONENTS).join("\n");
    for (const anchor of TOUR_ANCHORS) expect(all, anchor).toContain(`data-tour="${anchor}"`);
  });

  it("la fila de una red lleva su clave, y cada vista su id", () => {
    expect(COMPONENTS["FilterPanel.tsx"]).toContain('data-tour="red" data-network={network}');
    expect(openingTag(APP, APP.indexOf('data-tour="vista"'))).toContain("data-view={id}");
  });

  it("ningún ancla lleva aria-haspopup, aria-expanded ni aria-controls: driver.js los quita de lo que deja de señalar", () => {
    for (const [file, source] of Object.entries(COMPONENTS)) {
      for (const match of source.matchAll(/data-tour="/g)) {
        const tag = openingTag(source, match.index);
        expect(tag, `${file}: ${tag}`).not.toMatch(/aria-(haspopup|expanded|controls)/);
      }
    }
    // Lo que se da por hecho de driver.js 1.8.0: si cambia, esta prueba avisa.
    expect(DRIVER_JS).toContain("o.removeAttribute(`aria-haspopup`),o.removeAttribute(`aria-expanded`),o.removeAttribute(`aria-controls`)");
  });

  it("los controles del tour están en sus componentes, con su propio estado y su manejador", () => {
    expect(code(read("./components/Connectogram.tsx"))).toContain('useTourControl("lupa", lensEnabled, setLensEnabled);');
    expect(COMPONENTS["RegionSearch.tsx"]).toContain('useTourControl("buscador", query, restart);');
    expect(COMPONENTS["FilterPanel.tsx"]).toContain('useTourControl("secciones", openSections, setOpenSections);');
  });
});

describe("accesibilidad", () => {
  it("la caja es un diálogo con nombre (el título) y descripción (el texto), que pone driver.js y el tour no quita", () => {
    expect(DRIVER_JS).toContain("m.setAttribute(`role`,`dialog`),m.setAttribute(`aria-labelledby`,`driver-popover-title`),m.setAttribute(`aria-describedby`,`driver-popover-description`)");
    expect(TOUR_DRIVER).not.toMatch(/removeAttribute\("(role|aria-labelledby|aria-describedby)"\)/);
    expect(TOUR_DRIVER).toContain("dom.title.textContent = step.title;");
    expect(TOUR_DRIVER).toContain("dom.description.textContent = step.description;");
  });

  it("el cambio de paso se anuncia en una región viva que está siempre en la página", () => {
    const host = {} as TourHost;
    const html = renderToStaticMarkup(createElement(GuidedTour, { open: false, host, onExit: () => {}, onFinished: () => {} }));
    expect(html).toBe('<div class="visually-hidden" aria-live="polite"></div>');
    expect(TOUR_DRIVER).toContain("announce,");
  });

  it("con prefers-reduced-motion, sin animaciones", () => {
    expect(TOUR_DRIVER).toContain('window.matchMedia?.("(prefers-reduced-motion: reduce)").matches');
    expect(TOUR_DRIVER).toContain("animate: !reducedMotion,");
    expect(APP_CSS).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.driver-fade \.driver-overlay, \.driver-fade \.driver-popover \{ animation: none; \}/);
  });

  it("mientras dura, los atajos de la app se dan por atendidos antes de llegar a ellos, y ellos entonces no actúan", () => {
    expect(TOUR_DRIVER).toContain('window.addEventListener("keydown", blockShortcuts, true);');
    expect(TOUR_DRIVER).toContain("if (blocksAppShortcut(event)) event.preventDefault();");
    const handled = { key: "z", code: "KeyZ", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, repeat: false, defaultPrevented: true };
    expect(historyShortcut(handled, null)).toBeNull();
    expect(regionSearchShortcut({ ...handled, key: "k", code: "KeyK" }, null)).toBe(false);
  });
});

describe("estilos: la caja con los tokens del tema", () => {
  it("importa la hoja de driver.js, y App.css la tapa", () => {
    expect(GUIDED_TOUR).toContain('import "driver.js/dist/driver.css";');
    expect(CSS_RULES.some((rule) => rule.selectors === ".driver-popover.tour-popover")).toBe(true);
  });

  it("ningún color fijo: en sus reglas, todo color sale de una variable del tema", () => {
    const tourRules = CSS_RULES.filter((rule) => /tour-popover|topbar__help|driver-/.test(rule.selectors));
    expect(tourRules.length).toBeGreaterThan(10);
    for (const rule of tourRules) {
      expect(rule.body, rule.selectors).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    }
    // La capa que atenúa, con el fondo del tema.
    expect(TOUR_DRIVER).toContain('overlayColor: "var(--bg)",');
  });

  it("el fondo, el texto, el borde, la sombra, la tipografía y el anillo de foco son los de la app", () => {
    const box = CSS_RULES.find((rule) => rule.selectors === ".driver-popover.tour-popover")?.body ?? "";
    for (const declaration of [
      "background: var(--panel-bg)",
      "color: var(--text)",
      "border: 1px solid var(--border-strong)",
      "box-shadow: var(--shadow)",
      "font-family: var(--sans)",
    ]) {
      expect(box).toContain(declaration);
    }
    expect(CSS_RULES.find((rule) => rule.selectors === ".tour-popover button:focus-visible")?.body).toContain(
      "outline: 2px solid var(--accent)",
    );
    // «Salir», con el foco: driver.js le pone un color fijo con :focus.
    expect(CSS_RULES.find((rule) => rule.selectors.includes(".tour-popover .driver-popover-close-btn:focus"))?.body).toContain(
      "color: var(--text-h)",
    );
  });

  it("los botones usan los patrones de la app, no uno nuevo", () => {
    expect(TOUR_DRIVER).toContain('dom.previousButton.classList.replace("driver-popover-footer-btn", "export-btn");');
    expect(TOUR_DRIVER).toContain('dom.nextButton.classList.replace("driver-popover-footer-btn", "toast__action");');
    expect(TOUR_DRIVER).toContain('autoButton.className = "export-btn tour-popover__auto";');
  });
});
