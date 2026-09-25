// Quien lleva el tour guiado (D11 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.10): guarda el montaje del usuario al
// empezar, entra en cada paso con la app (los stores de la selección, los
// filtros y las marcas, lo que App le da para el atlas, la clasificación y la
// vista, y los controles de los componentes), espera a los datos cuando hay
// que cargarlos y, al salir desde cualquier paso, lo devuelve todo tal como
// estaba.
// - Las acciones del tour no son pasos del historial: el registro está en
//   pausa mientras dura (state/history.ts), y al salir vuelven los stores con
//   sus mismos Set y el historial tal cual.
// - Otro atlas u otra clasificación se piden y se espera a que lleguen sus
//   datos antes de poner nada: al llegar, App vacía el historial, y lo del
//   usuario va después.
// - Sin datos reales, solo explica: no toca la selección, los filtros ni las
//   marcas; solo lleva a la vista Atlas y despliega Filtros para señalar.
// No sabe nada de driver.js: la caja es un TourView (components/GuidedTour.tsx),
// y en las pruebas, uno de mentira.
import type { HistorySnapshot } from "../logic/historyStep";
import { autoplayAfter, autoplayDelay, autoplayOnShow, autoplayTarget, type TourControlKind } from "../logic/tourAutoplay";
import {
  TOUR_ATLAS_ID,
  TOUR_NETWORK_SOURCE,
  hasTourNetworks,
  planTour,
  type TourMove,
  type TourPlan,
  type TourScene,
  type TourStores,
} from "../logic/tourPlan";
import {
  ALL_SECTIONS_OPEN,
  dataStatus,
  planData,
  planUi,
  type TourDataChoice,
  type TourLoaded,
  type TourUi,
  type TourUiOp,
  type TourUiTarget,
} from "../logic/tourRestore";
import { TOUR_STEPS, anchorSelectors, stepAnnouncement, stepDescription, type TourMainView } from "../logic/tourSteps";
import type { GraphConnection, GraphNode } from "../types/domain";
import { useFiltersStore, type FiltersState } from "./filters";
import {
  applySnapshot,
  currentSnapshot,
  loadHistory,
  pauseRecording,
  redo,
  resetHistory,
  resumeRecording,
  undo,
  useHistoryStore,
  type HistoryContents,
} from "./history";
import { useMarksStore } from "./marks";
import { useSelectionStore } from "./selection";
import { tourControl } from "./tourControls";

// Lo que App tiene cargado (su DataSource).
export type TourData =
  | { kind: "loading" }
  | { kind: "real"; nodes: readonly GraphNode[]; connections: readonly GraphConnection[]; networkSource: string | null }
  | { kind: "demo"; nodes: readonly GraphNode[]; connections: readonly GraphConnection[] };

// Lo que App enseña y cómo cambiarlo: su estado, tal como quedó en el último
// render, y sus manejadores. `setView` recibe una pestaña que ya estaba en
// `view`, o «atlas».
export interface TourHost {
  view: string;
  atlasId: string;
  networkSource: string | null;
  data: TourData;
  mainView: TourMainView;
  filtersCollapsed: boolean;
  setView(view: string): void;
  changeAtlas(atlasId: string): void;
  setNetworkSource(source: string | null): void;
  setMainView(view: TourMainView): void;
  setFiltersCollapsed(collapsed: boolean): void;
}

// Lo que enseña la caja de un paso.
export interface TourStepView {
  index: number;
  total: number;
  title: string;
  description: string;
  autoplay: boolean;
  lastStep: boolean;
  // El botón que se lleva el foco: el del control que se usó.
  focus: "next" | "prev" | "auto";
  // Dónde señalar, en orden de preferencia; sin ninguno, la caja va centrada.
  selectors: string[];
  interactive: boolean;
}

// La caja del tour (driver.js, en components/GuidedTour.tsx).
export interface TourView {
  show(step: TourStepView): void;
  // Vuelve a colocar lo iluminado y la caja: lo señalado ha cambiado.
  refresh(): void;
  // Espera: cargando datos. null, ya no.
  setBusy(message: string | null): void;
  setAutoplay(playing: boolean): void;
  announce(text: string): void;
  close(): void;
  anchorReady(selectors: readonly string[]): boolean;
}

export interface TourRunnerDeps {
  host: () => TourHost;
  view: TourView;
  // El siguiente fotograma (requestAnimationFrame): para entonces, React ya ha
  // pintado lo que se le pidió.
  frame: () => Promise<void>;
  userAgent: string;
  // Al salir: cuando se cierra la caja (el foco vuelve a «?») y cuando el
  // montaje ya está devuelto.
  onExit: () => void;
  onFinished: () => void;
}

const LOADING_EXAMPLE = "Cargando HCP-MMP1.0 con las redes de Cole-Anticevic…";
const RESTORING = "Volviendo a tu atlas…";
const EXAMPLE_UNAVAILABLE = "No se pudieron cargar los datos reales de HCP-MMP1.0: a partir de aquí solo te lo explico.";
const EXAMPLE_MISMATCH = "Los datos cargados no son los de este ejemplo: a partir de aquí solo te lo explico.";
const DATA_TIMEOUT_MS = 30_000;
const CONTROL_TIMEOUT_MS = 1000;
const ANCHOR_TIMEOUT_MS = 1500;

// Sin datos reales: solo lo necesario para señalar.
const EXPLAIN_UI: TourUiTarget = {
  view: "atlas",
  filtersCollapsed: false,
  mainView: null,
  sections: ALL_SECTIONS_OPEN,
  search: null,
  lens: null,
};

interface SavedSetup {
  data: TourDataChoice;
  dataKind: TourData["kind"];
  stores: HistorySnapshot;
  history: HistoryContents;
  ui: TourUi;
}

function toSnapshot(stores: TourStores): HistorySnapshot {
  return {
    selectedNodeIds: new Set(stores.selectedNodeIds),
    selectedConnectionId: stores.selectedConnectionId,
    hiddenNetworks: new Set(stores.hiddenNetworks),
    hiddenConnectionTypes: new Set(stores.hiddenConnectionTypes),
    minWeight: stores.minWeight,
    markedIds: new Set(stores.markedIds),
  };
}

function sameSet<T>(set: ReadonlySet<T>, list: readonly T[]): boolean {
  return set.size === list.length && list.every((item) => set.has(item));
}

// Una escena en los stores, solo lo que cambia: cada Set nuevo vuelve a pintar
// las vistas.
function applyStores(stores: TourStores) {
  const selection = useSelectionStore.getState();
  if (
    selection.selectedConnectionId !== stores.selectedConnectionId ||
    !sameSet(selection.selectedNodeIds, stores.selectedNodeIds)
  ) {
    useSelectionStore.setState({
      selectedNodeIds: new Set(stores.selectedNodeIds),
      selectedConnectionId: stores.selectedConnectionId,
    });
  }
  const filters = useFiltersStore.getState();
  const next: Partial<FiltersState> = {};
  if (!sameSet(filters.hiddenNetworks, stores.hiddenNetworks)) next.hiddenNetworks = new Set(stores.hiddenNetworks);
  if (!sameSet(filters.hiddenConnectionTypes, stores.hiddenConnectionTypes)) {
    next.hiddenConnectionTypes = new Set(stores.hiddenConnectionTypes);
  }
  if (filters.minWeight !== stores.minWeight) next.minWeight = stores.minWeight;
  if (Object.keys(next).length > 0) useFiltersStore.setState(next);
  if (!sameSet(useMarksStore.getState().markedIds, stores.markedIds)) {
    useMarksStore.setState({ markedIds: new Set(stores.markedIds) });
  }
}

// El historial de una escena: vacío, salvo en «Deshacer y rehacer». Si ya
// está vacío, no se toca.
function applySceneHistory(scene: TourScene) {
  const { past, future } = useHistoryStore.getState();
  const empty = scene.history.past.length === 0 && scene.history.future.length === 0;
  if (empty && past.length === 0 && future.length === 0) return;
  loadHistory({
    past: scene.history.past.map(toSnapshot),
    present: currentSnapshot(),
    future: scene.history.future.map(toSnapshot),
  });
}

function sameStores(a: HistorySnapshot, b: HistorySnapshot): boolean {
  return (
    a.selectedNodeIds === b.selectedNodeIds &&
    a.selectedConnectionId === b.selectedConnectionId &&
    a.hiddenNetworks === b.hiddenNetworks &&
    a.hiddenConnectionTypes === b.hiddenConnectionTypes &&
    a.minWeight === b.minWeight &&
    a.markedIds === b.markedIds
  );
}

function loaded(data: TourData): TourLoaded {
  if (data.kind === "real") return { kind: "real", networkSource: data.networkSource };
  return { kind: data.kind };
}

function exampleLoaded(host: TourHost): boolean {
  return host.atlasId === TOUR_ATLAS_ID && host.data.kind === "real" && hasTourNetworks(host.data.nodes);
}

export class TourRunner {
  private readonly deps: TourRunnerDeps;
  private saved: SavedSetup | null = null;
  private mode: "demo" | "explain" = "demo";
  private plan: TourPlan | null = null;
  private notice: { index: number; text: string } | null = null;
  private index = -1;
  private description = "";
  private autoplay = false;
  private busy = false;
  private closing = false;
  private finished = false;
  private generation = 0;
  private focus: TourStepView["focus"] = "next";
  private moveTimers: ReturnType<typeof setTimeout>[] = [];
  private autoplayTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(deps: TourRunnerDeps) {
    this.deps = deps;
  }

  // Guarda el montaje, pausa el historial y enseña la bienvenida. Sin datos
  // reales, el tour solo explica, y la bienvenida lo dice.
  start(): Promise<void> {
    const host = this.deps.host();
    const history = pauseRecording();
    this.saved = {
      data: { atlasId: host.atlasId, networkSource: host.networkSource },
      dataKind: host.data.kind,
      stores: currentSnapshot(),
      history,
      ui: this.currentUi(),
    };
    this.mode = host.data.kind === "demo" ? "explain" : "demo";
    return this.goTo(0, "next");
  }

  next(control: "next" | "key" = "next"): Promise<void> {
    if (this.closing || this.busy || this.index < 0) return Promise.resolve();
    if (this.index >= TOUR_STEPS.length - 1) return this.exit();
    return this.goTo(this.index + 1, control);
  }

  prev(control: "prev" | "key" = "prev"): Promise<void> {
    if (this.closing || this.busy || this.index <= 0) return Promise.resolve();
    return this.goTo(this.index - 1, control, "prev");
  }

  toggleAutoplay(): void {
    if (this.closing || this.index < 0) return;
    this.autoplay = autoplayOnShow(autoplayAfter(this.autoplay, "toggle"), this.index, TOUR_STEPS.length);
    this.deps.view.setAutoplay(this.autoplay);
    clearTimeout(this.autoplayTimer);
    if (this.autoplay && !this.busy) this.scheduleAutoplay();
  }

  // Salir desde cualquier paso, con «Salir», Escape o «Terminar»: se cierra la
  // caja y se devuelve el montaje. Aunque algo falle por el camino, los stores
  // y el historial vuelven, y el historial vuelve a registrar.
  async exit(): Promise<void> {
    if (this.closing || !this.saved) return;
    const saved = this.saved;
    this.closing = true;
    this.generation += 1;
    this.clearTimers();
    this.autoplay = false;
    this.deps.view.close();
    this.deps.onExit();
    const alive = () => !this.finished;
    let restored = false;
    try {
      // host() se pone al día en un efecto (GuidedTour), que puede llegar
      // después de pintar: justo después de pedir otro atlas (el automático,
      // con Escape a la vez), aún diría el de antes. Dos fotogramas después,
      // ya dice lo pedido.
      await this.settle(alive);
      await this.restore(alive);
      restored = true;
    } catch (error) {
      console.error("Tour guiado: no se pudo devolver el montaje entero", error);
    } finally {
      if (!restored && !this.finished) {
        applySnapshot(saved.stores);
        loadHistory(saved.history);
      }
      resumeRecording();
      this.finished = true;
      this.deps.onFinished();
    }
  }

  // Si la app se desmonta a medias (en desarrollo, al recargar en caliente):
  // lo que se puede devolver sin esperar, los stores y el historial.
  dispose(): void {
    if (this.finished || !this.saved) return;
    this.finished = true;
    this.closing = true;
    this.generation += 1;
    this.clearTimers();
    this.deps.view.close();
    applySnapshot(this.saved.stores);
    loadHistory(this.saved.history);
    resumeRecording();
  }

  private async goTo(index: number, control: TourControlKind, focus: TourStepView["focus"] = "next"): Promise<void> {
    if (this.closing) return;
    const generation = ++this.generation;
    const alive = () => generation === this.generation && !this.closing;
    this.clearTimers();
    this.autoplay = autoplayAfter(this.autoplay, control);
    this.focus = control === "auto" ? "auto" : focus;
    this.busy = true;
    try {
      await this.enter(index, alive);
    } catch (error) {
      console.error("Tour guiado: no se pudo preparar el paso", error);
    }
    if (!alive()) return;
    this.busy = false;
    this.deps.view.setBusy(null);
    const selectors = this.selectorsFor(index);
    await this.waitFor(() => this.deps.view.anchorReady(selectors), alive, ANCHOR_TIMEOUT_MS);
    if (!alive()) return;
    this.index = index;
    this.autoplay = autoplayOnShow(this.autoplay, index, TOUR_STEPS.length);
    const step = this.stepView(index, selectors);
    this.description = step.description;
    try {
      this.deps.view.show(step);
    } catch (error) {
      // Sin caja no hay «Salir»: se sale ya, y vuelven el montaje, el
      // registro del historial y los atajos.
      console.error("Tour guiado: no se pudo enseñar el paso", error);
      void this.exit();
      return;
    }
    this.deps.view.announce(stepAnnouncement(index, TOUR_STEPS.length, step.title));
    this.scheduleMoves(index, alive);
    if (this.autoplay) this.scheduleAutoplay();
  }

  // La bienvenida y el final enseñan el montaje del usuario; los demás pasos,
  // su escena del ejemplo, o sin datos reales, solo lo necesario para señalar.
  private async enter(index: number, alive: () => boolean): Promise<void> {
    if (index === 0 || index === TOUR_STEPS.length - 1) {
      await this.restore(alive);
      return;
    }
    if (this.mode === "demo") await this.prepareExample(index, alive);
    if (!alive()) return;
    const plan = this.mode === "demo" ? this.plan?.steps[index] : null;
    if (plan) await this.applyScene(plan.enter, alive);
    else await this.applyUi(EXPLAIN_UI, alive);
  }

  // Carga HCP-MMP1.0 con Cole-Anticevic si no está, y calcula el ejemplo. Si
  // no llegan datos reales, o no cuentan lo que dicen los textos, el tour
  // sigue solo explicando y lo dice en este paso.
  private async prepareExample(index: number, alive: () => boolean): Promise<void> {
    let host = this.deps.host();
    if (this.plan && exampleLoaded(host)) return;
    if (host.atlasId !== TOUR_ATLAS_ID || host.data.kind === "loading") {
      const target = { atlasId: TOUR_ATLAS_ID, networkSource: host.atlasId === TOUR_ATLAS_ID ? host.networkSource : null };
      this.deps.view.setBusy(LOADING_EXAMPLE);
      if (host.atlasId !== TOUR_ATLAS_ID) host.changeAtlas(TOUR_ATLAS_ID);
      await this.waitForData(target, alive);
      if (!alive()) return;
      host = this.deps.host();
    }
    if (host.data.kind === "real" && !hasTourNetworks(host.data.nodes)) {
      this.deps.view.setBusy(LOADING_EXAMPLE);
      host.setNetworkSource(TOUR_NETWORK_SOURCE);
      await this.waitForData({ atlasId: TOUR_ATLAS_ID, networkSource: TOUR_NETWORK_SOURCE }, alive);
      if (!alive()) return;
      host = this.deps.host();
    }
    const result = host.data.kind === "real" ? planTour(host.data.nodes, host.data.connections) : null;
    if (result?.ok) {
      this.plan = result.plan;
      return;
    }
    if (result) console.warn("Tour guiado: los datos no son los del ejemplo; solo se explica.", result.problems);
    this.mode = "explain";
    this.plan = null;
    this.notice = { index, text: result ? EXAMPLE_MISMATCH : EXAMPLE_UNAVAILABLE };
  }

  // Devuelve el montaje del usuario: primero su atlas y su clasificación, con
  // sus datos ya llegados; luego la selección, los filtros y las marcas con
  // sus mismos Set, y el historial tal cual (salvo si los datos ya no son del
  // mismo tipo: al caer a los de demostración, sus pasos ya no valen y queda
  // vacío, desde lo devuelto); por último, la interfaz.
  private async restore(alive: () => boolean): Promise<void> {
    const saved = this.saved;
    if (!saved) return;
    const host = this.deps.host();
    const ops = planData({ atlasId: host.atlasId, networkSource: host.networkSource }, saved.data);
    if (ops.length > 0) {
      if (!this.closing) this.deps.view.setBusy(RESTORING);
      for (const op of ops) {
        if (op.kind === "atlas") host.changeAtlas(op.value);
        else host.setNetworkSource(op.value);
      }
    }
    // También si ya los pidió una vuelta que se cortó (Salir o Escape mientras
    // la bienvenida o el final esperaban sus datos).
    await this.waitForData(saved.data, alive);
    if (!alive()) return;
    const target: TourUiTarget = saved.ui;
    await this.applyUi(target, alive, () => {
      if (!sameStores(currentSnapshot(), saved.stores)) applySnapshot(saved.stores);
      const dataKind = this.deps.host().data.kind;
      const history = useHistoryStore.getState();
      const sameData = saved.dataKind === "loading" || dataKind === saved.dataKind;
      const same = history.past === saved.history.past && history.present === saved.history.present && history.future === saved.history.future;
      if (sameData && !same) loadHistory(saved.history);
      else if (!sameData) resetHistory();
    });
  }

  private applyScene(scene: TourScene, alive: () => boolean): Promise<void> {
    return this.applyUi(
      {
        view: "atlas",
        filtersCollapsed: false,
        mainView: scene.mainView,
        sections: ALL_SECTIONS_OPEN,
        search: scene.search,
        lens: scene.lens,
      },
      alive,
      () => {
        applyStores(scene.stores);
        applySceneHistory(scene);
      },
    );
  }

  // La interfaz en el orden de logic/tourRestore.ts: lo que monta, lo de los
  // stores (between), lo de dentro y lo que desmonta.
  private async applyUi(target: TourUiTarget, alive: () => boolean, between?: () => void): Promise<void> {
    const first = planUi(this.currentUi(), target);
    this.runUi(first.mount);
    if (first.mount.length > 0) {
      await this.settle(alive);
      await this.waitFor(() => this.controlsReady(target), alive, CONTROL_TIMEOUT_MS);
      if (!alive()) return;
    }
    between?.();
    const second = planUi(this.currentUi(), target);
    this.runUi(second.inside);
    this.runUi(second.unmount);
    await this.settle(alive);
  }

  private runUi(ops: readonly TourUiOp[]) {
    const host = this.deps.host();
    for (const op of ops) {
      switch (op.kind) {
        case "view":
          host.setView(op.value);
          break;
        case "filtersCollapsed":
          host.setFiltersCollapsed(op.value);
          break;
        case "mainView":
          host.setMainView(op.value);
          break;
        case "sections":
          tourControl("secciones")?.set(op.value);
          break;
        case "search":
          tourControl("buscador")?.set(op.value);
          break;
        case "lens":
          tourControl("lupa")?.set(op.value);
          break;
      }
    }
  }

  private currentUi(): TourUi {
    const host = this.deps.host();
    return {
      view: host.view,
      filtersCollapsed: host.filtersCollapsed,
      mainView: host.mainView,
      sections: tourControl("secciones")?.get() ?? null,
      search: tourControl("buscador")?.get() ?? null,
      lens: tourControl("lupa")?.get() ?? null,
    };
  }

  // Lo montado ya ofrece sus controles.
  private controlsReady(target: TourUiTarget): boolean {
    return (
      (target.sections === null || tourControl("secciones") !== undefined) &&
      (target.search === null || tourControl("buscador") !== undefined) &&
      (target.lens === null || tourControl("lupa") !== undefined)
    );
  }

  private async waitForData(target: TourDataChoice, alive: () => boolean): Promise<void> {
    let seen = false;
    const deadline = Date.now() + DATA_TIMEOUT_MS;
    while (alive() && Date.now() <= deadline) {
      const host = this.deps.host();
      seen ||= host.atlasId === target.atlasId && host.networkSource === target.networkSource;
      const state = { atlasId: host.atlasId, networkSource: host.networkSource, data: loaded(host.data) };
      if (dataStatus(state, target, seen) !== "loading") return;
      await this.deps.frame();
    }
  }

  private async waitFor(check: () => boolean, alive: () => boolean, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (alive() && !check() && Date.now() <= deadline) await this.deps.frame();
  }

  // Dos fotogramas: React ya ha pintado lo pedido.
  private async settle(alive: () => boolean): Promise<void> {
    await this.deps.frame();
    if (alive()) await this.deps.frame();
  }

  private scheduleMoves(index: number, alive: () => boolean) {
    const plan = this.mode === "demo" ? this.plan?.steps[index] : null;
    for (const move of plan?.moves ?? []) {
      this.moveTimers.push(setTimeout(() => void this.runMove(move, alive), move.afterMs));
    }
  }

  // La acción del paso: otra escena, o deshacer o rehacer con el historial de
  // la app. Luego, lo iluminado se recoloca: puede haber cambiado de sitio o
  // de tamaño.
  private async runMove(move: TourMove, alive: () => boolean): Promise<void> {
    if (!alive()) return;
    try {
      if ("history" in move) {
        if (move.history === "undo") undo();
        else redo();
      } else {
        await this.applyScene(move.scene, alive);
      }
      await this.settle(alive);
      if (alive()) this.deps.view.refresh();
    } catch (error) {
      console.error("Tour guiado: no se pudo hacer la acción del paso", error);
    }
  }

  private scheduleAutoplay() {
    clearTimeout(this.autoplayTimer);
    const target = autoplayTarget(this.index, TOUR_STEPS.length);
    if (target === null) return;
    const generation = this.generation;
    this.autoplayTimer = setTimeout(() => {
      if (generation !== this.generation || this.closing || this.busy || !this.autoplay) return;
      void this.goTo(target, "auto");
    }, autoplayDelay(this.description));
  }

  private clearTimers() {
    for (const timer of this.moveTimers) clearTimeout(timer);
    this.moveTimers = [];
    clearTimeout(this.autoplayTimer);
  }

  private selectorsFor(index: number): string[] {
    const step = TOUR_STEPS[index];
    return step.anchor ? anchorSelectors(step.anchor, this.plan?.networkKeys ?? null, step.fallback) : [];
  }

  private stepView(index: number, selectors: string[]): TourStepView {
    const step = TOUR_STEPS[index];
    const description = stepDescription(
      step,
      {
        withDemo: this.mode === "demo",
        values: { peso: this.plan?.values.peso ?? "" },
        notice: this.notice?.index === index ? this.notice.text : null,
      },
      this.deps.userAgent,
    );
    return {
      index,
      total: TOUR_STEPS.length,
      title: step.title,
      description,
      autoplay: this.autoplay,
      lastStep: index === TOUR_STEPS.length - 1,
      focus: this.focus,
      selectors,
      interactive: step.interactive === true,
    };
  }
}
