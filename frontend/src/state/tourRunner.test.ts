import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GraphConnection, GraphNode } from "../types/domain";
import { AUTOPLAY_STEP_MS, autoplayDelay } from "../logic/tourAutoplay";
import { TOUR_ATLAS_ID, TOUR_NETWORKS, findRegion } from "../logic/tourPlan";
import { ALL_SECTIONS_OPEN, type TourSections } from "../logic/tourRestore";
import { EXPLAIN_ONLY_TEXT, TOUR_STEPS, type TourMainView } from "../logic/tourSteps";
import { hcpLikeConnections, hcpLikeNodes } from "../logic/tourTestData";
import { useFiltersStore } from "./filters";
import { currentSnapshot, resetForAtlasChange, resetHistory, resumeRecording, undo, useHistoryStore } from "./history";
import { useMarksStore } from "./marks";
import { useSelectionStore } from "./selection";
import { registerTourControl } from "./tourControls";
import { TourRunner, type TourData, type TourHost, type TourStepView, type TourView } from "./tourRunner";

const HCP_NODES = hcpLikeNodes();
const HCP_CONNECTIONS = hcpLikeConnections(HCP_NODES);
const OTHER_NODES: GraphNode[] = ["a", "b", "c"].map((name) => ({
  id: `region.otro.${name}`,
  label: name,
  abbreviation: name,
  hemisphere: "L",
  network: "otra.red",
  position3d: [0, 0, 0],
  referenceSpace: null,
}));
const DEMO_NODES: GraphNode[] = [{ ...OTHER_NODES[0], id: "region.human.demo.x", network: "executive" }];
const LAST = TOUR_STEPS.length - 1;
const flush = () => Promise.resolve();

// Los datos que da la API para un atlas y una clasificación.
function dataFor(atlasId: string, networkSource: string | null, api: "real" | "demo"): TourData {
  if (api === "demo") return { kind: "demo", nodes: DEMO_NODES, connections: [] };
  if (atlasId !== TOUR_ATLAS_ID) return { kind: "real", nodes: OTHER_NODES, connections: [], networkSource };
  const nodes =
    networkSource === null || networkSource === "cole-anticevic"
      ? HCP_NODES
      : HCP_NODES.map((node) => ({ ...node, network: `${networkSource}.${node.network.split(".")[1]}` }));
  return { kind: "real", nodes, connections: HCP_CONNECTIONS as GraphConnection[], networkSource };
}

// Una App de mentira que se porta como la de verdad: cambiar de atlas vacía
// las marcas y el historial (resetForAtlasChange) y pasa por «cargando»; los
// datos llegan después, y al llegar App vacía el historial (resetHistory). Los
// componentes ofrecen sus controles mientras están montados, y al montarse de
// nuevo empiezan con su estado inicial.
class FakeApp implements TourHost {
  view = "atlas";
  atlasId: string = TOUR_ATLAS_ID;
  networkSource: string | null = null;
  data: TourData;
  mainView: TourMainView = "brain3d";
  filtersCollapsed = false;
  lens = false;
  search = "";
  sections: TourSections = ALL_SECTIONS_OPEN;
  loads = 0;
  // Lo que responde la API: datos reales o, si no responde, los de demostración.
  api: "real" | "demo";
  private unregister: Partial<Record<"lupa" | "buscador" | "secciones", () => void>> = {};

  constructor(api: "real" | "demo" = "real") {
    this.api = api;
    this.data = dataFor(this.atlasId, this.networkSource, api);
    this.sync();
  }

  setView(view: string) {
    this.view = view;
    this.sync();
  }
  changeAtlas(atlasId: string) {
    this.atlasId = atlasId;
    this.networkSource = null;
    this.data = { kind: "loading" };
    resetForAtlasChange();
    this.sync();
    this.load();
  }
  setNetworkSource(source: string | null) {
    this.networkSource = source;
    this.load();
  }
  setMainView(view: TourMainView) {
    this.mainView = view;
  }
  setFiltersCollapsed(collapsed: boolean) {
    this.filtersCollapsed = collapsed;
    this.sync();
  }
  // Llegan los datos: los de lo elegido al pedirlos.
  private load() {
    const [atlasId, networkSource] = [this.atlasId, this.networkSource];
    setTimeout(() => {
      if (this.atlasId !== atlasId || this.networkSource !== networkSource) return;
      this.data = dataFor(atlasId, networkSource, this.api);
      this.loads += 1;
      resetHistory();
      this.sync();
    }, 40);
  }
  // Monta y desmonta los componentes con controles.
  sync() {
    const workspace = this.view === "atlas" && this.data.kind !== "loading";
    const filters = workspace && !this.filtersCollapsed;
    this.mount("lupa", workspace, () => {
      this.lens = false;
      return registerTourControl("lupa", { get: () => this.lens, set: (value) => (this.lens = value) });
    });
    this.mount("buscador", filters, () => {
      this.search = "";
      return registerTourControl("buscador", { get: () => this.search, set: (value) => (this.search = value) });
    });
    this.mount("secciones", filters, () => {
      this.sections = ALL_SECTIONS_OPEN;
      return registerTourControl("secciones", { get: () => this.sections, set: (value) => (this.sections = value) });
    });
  }
  private mount(key: "lupa" | "buscador" | "secciones", mounted: boolean, register: () => () => void) {
    if (mounted && !this.unregister[key]) this.unregister[key] = register();
    if (!mounted && this.unregister[key]) {
      this.unregister[key]!();
      delete this.unregister[key];
    }
  }
  dispose() {
    for (const unregister of Object.values(this.unregister)) unregister?.();
  }
}

class FakeView implements TourView {
  shown: TourStepView[] = [];
  busy: (string | null)[] = [];
  announced: string[] = [];
  autoplay: boolean[] = [];
  refreshed = 0;
  closed = false;
  show(step: TourStepView) {
    this.shown.push(step);
  }
  refresh() {
    this.refreshed += 1;
  }
  setBusy(message: string | null) {
    this.busy.push(message);
  }
  setAutoplay(playing: boolean) {
    this.autoplay.push(playing);
  }
  announce(text: string) {
    this.announced.push(text);
  }
  close() {
    this.closed = true;
  }
  anchorReady() {
    return true;
  }
  get index() {
    return this.shown.at(-1)?.index ?? -1;
  }
}

let app: FakeApp;
let view: FakeView;
let exits: number;
let finished: number;

function makeRunner(host: FakeApp = app) {
  return new TourRunner({
    host: () => host,
    view,
    frame: () => new Promise((resolve) => setTimeout(resolve, 16)),
    userAgent: "X11; Linux",
    onExit: () => (exits += 1),
    onFinished: () => (finished += 1),
  });
}
// Deja pasar el tiempo hasta que la promesa acaba (los fotogramas y los
// datos que llegan van con temporizadores). 300 ms bastan para entrar en un
// paso, también si cambia de atlas, y aún no llega la acción del paso (a los
// 800 ms).
async function settle<T>(promise: Promise<T>, ms = 300): Promise<T> {
  await vi.advanceTimersByTimeAsync(ms);
  return promise;
}
async function goToStep(runner: TourRunner, index: number) {
  while (view.index < index) await settle(runner.next());
}

// El montaje del usuario: una selección, filtros, una marca, un historial con
// tres pasos por deshacer y uno por rehacer, la lupa encendida, texto en el
// buscador, una sección plegada y los hemisferios en grande.
async function userSetup() {
  const selection = useSelectionStore.getState();
  selection.selectNodes([HCP_NODES[10].id, HCP_NODES[11].id]);
  await flush();
  useFiltersStore.getState().setHiddenNetworks(new Set(["cole-anticevic.auditory"]));
  await flush();
  useMarksStore.getState().toggleMark(HCP_NODES[12].id);
  await flush();
  useFiltersStore.getState().toggleConnectionType("functional");
  await flush();
  undo();
  app.lens = true;
  app.search = "ifj";
  app.sections = { networks: true, types: false, weight: true };
  app.mainView = "hemispheres";
}

function snapshotOfEverything() {
  const history = useHistoryStore.getState();
  return {
    stores: currentSnapshot(),
    past: history.past,
    present: history.present,
    future: history.future,
    ui: {
      view: app.view,
      atlasId: app.atlasId,
      networkSource: app.networkSource,
      mainView: app.mainView,
      filtersCollapsed: app.filtersCollapsed,
      lens: app.lens,
      search: app.search,
      sections: app.sections,
    },
  };
}

function expectExactly(before: ReturnType<typeof snapshotOfEverything>) {
  const after = snapshotOfEverything();
  expect(after.stores.selectedNodeIds).toBe(before.stores.selectedNodeIds);
  expect(after.stores.selectedConnectionId).toBe(before.stores.selectedConnectionId);
  expect(after.stores.hiddenNetworks).toBe(before.stores.hiddenNetworks);
  expect(after.stores.hiddenConnectionTypes).toBe(before.stores.hiddenConnectionTypes);
  expect(after.stores.minWeight).toBe(before.stores.minWeight);
  expect(after.stores.markedIds).toBe(before.stores.markedIds);
  expect(after.past).toBe(before.past);
  expect(after.present).toBe(before.present);
  expect(after.future).toBe(before.future);
  expect(after.ui).toEqual(before.ui);
}

beforeEach(() => {
  vi.useFakeTimers();
  useSelectionStore.setState({ selectedNodeIds: new Set(), selectedConnectionId: null });
  useFiltersStore.setState({ hiddenNetworks: new Set(), hiddenConnectionTypes: new Set(), minWeight: 0 });
  useMarksStore.setState({ markedIds: new Set() });
  resetHistory();
  app = new FakeApp();
  view = new FakeView();
  exits = 0;
  finished = 0;
});

afterEach(() => {
  app.dispose();
  resumeRecording();
  vi.useRealTimers();
});

describe("tour guiado: el recorrido", () => {
  it("empieza en la bienvenida sin tocar el montaje", async () => {
    await userSetup();
    const before = snapshotOfEverything();
    const runner = makeRunner();
    await settle(runner.start());
    expect(view.index).toBe(0);
    expect(view.announced.at(-1)).toBe(`Paso 1 de ${TOUR_STEPS.length}: Tour guiado.`);
    expectExactly(before);
  });

  it("cada paso hace su acción con los stores de la app, como en el guion", async () => {
    const runner = makeRunner();
    await settle(runner.start());
    const selected = () => [...useSelectionStore.getState().selectedNodeIds];
    const ifjp = findRegion(HCP_NODES, "IFJp", "L")!.id;
    const te1m = findRegion(HCP_NODES, "TE1m", "R")!.id;
    const v1 = findRegion(HCP_NODES, "V1", "L")!.id;

    await goToStep(runner, 1);
    expect(app.mainView).toBe("connectogram");
    expect(selected()).toEqual([]);
    await goToStep(runner, 2);
    await vi.advanceTimersByTimeAsync(1500);
    const hidden = useFiltersStore.getState().hiddenNetworks;
    expect(hidden.has(TOUR_NETWORKS.principal) || hidden.has(TOUR_NETWORKS.anadida)).toBe(false);
    expect(hidden.size).toBeGreaterThan(5);
    await goToStep(runner, 3);
    await vi.advanceTimersByTimeAsync(1500);
    expect(selected()).toHaveLength(50);
    await goToStep(runner, 4);
    await vi.advanceTimersByTimeAsync(1500);
    expect(selected()).toHaveLength(73);
    await goToStep(runner, 5);
    await vi.advanceTimersByTimeAsync(1500);
    expect(useFiltersStore.getState().minWeight).toBeGreaterThan(0);
    await goToStep(runner, 6);
    await vi.advanceTimersByTimeAsync(1500);
    expect(selected()).toEqual([ifjp]);
    await goToStep(runner, 7);
    await vi.advanceTimersByTimeAsync(1500);
    expect(app.search).toBe("TE1m");
    await vi.advanceTimersByTimeAsync(3000);
    expect(app.search).toBe("");
    expect(selected()).toEqual([ifjp, te1m]);
    await goToStep(runner, 8);
    await vi.advanceTimersByTimeAsync(4000);
    expect([...useMarksStore.getState().markedIds]).toEqual([v1]);
    expect(useFiltersStore.getState().hiddenNetworks.has(TOUR_NETWORKS.marcada)).toBe(false);
    await goToStep(runner, 9);
    await vi.advanceTimersByTimeAsync(1500);
    expect(app.lens).toBe(true);
    await goToStep(runner, 10);
    expect(app.mainView).toBe("connectogram");
    await vi.advanceTimersByTimeAsync(2000);
    expect(app.mainView).toBe("brain3d");
    // Deshacer y rehacer, con el historial del propio tour.
    await goToStep(runner, 11);
    expect(useHistoryStore.getState().past).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(useMarksStore.getState().markedIds.size).toBe(0);
    expect(useHistoryStore.getState().future).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(3000);
    expect([...useMarksStore.getState().markedIds]).toEqual([v1]);
    expect(view.refreshed).toBeGreaterThan(0);
  });

  it("retroceder deshace la acción del paso siguiente y vuelve a hacer la del paso", async () => {
    const runner = makeRunner();
    await settle(runner.start());
    await goToStep(runner, 5);
    await vi.advanceTimersByTimeAsync(1500);
    expect(useFiltersStore.getState().minWeight).toBeGreaterThan(0);
    // Del peso a «+ Añadir»: el peso vuelve a 0 y la selección, a solo
    // Frontoparietal; luego se vuelve a añadir Lenguaje.
    await settle(runner.prev());
    expect(view.index).toBe(4);
    expect(useFiltersStore.getState().minWeight).toBe(0);
    expect(useSelectionStore.getState().selectedNodeIds.size).toBe(50);
    await vi.advanceTimersByTimeAsync(1500);
    expect(useSelectionStore.getState().selectedNodeIds.size).toBe(73);
    await settle(runner.prev());
    expect(view.index).toBe(3);
    await vi.advanceTimersByTimeAsync(1500);
    expect(useSelectionStore.getState().selectedNodeIds.size).toBe(50);
    await settle(runner.prev());
    await settle(runner.prev());
    expect(view.index).toBe(1);
    expect(useSelectionStore.getState().selectedNodeIds.size).toBe(0);
    expect(useFiltersStore.getState().hiddenNetworks.size).toBe(0);
  });

  it("las acciones del tour no dejan pasos: el registro está en pausa", async () => {
    await userSetup();
    const past = useHistoryStore.getState().past;
    const runner = makeRunner();
    await settle(runner.start());
    // Al seleccionar IFJp, el tour quita 73 regiones de la selección: si se
    // registrara, sería un paso con su aviso «Deshacer».
    await goToStep(runner, 6);
    await vi.advanceTimersByTimeAsync(1500);
    expect(useSelectionStore.getState().selectedNodeIds.size).toBe(1);
    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useHistoryStore.getState().lastStep).toBeNull();
    // Y mostrar una red o marcar una región, tampoco.
    await goToStep(runner, 8);
    await vi.advanceTimersByTimeAsync(1500);
    expect(useHistoryStore.getState().past).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(3000);
    expect(useMarksStore.getState().markedIds.size).toBe(1);
    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useHistoryStore.getState().lastStep).toBeNull();
    await settle(runner.exit());
    expect(useHistoryStore.getState().past).toBe(past);
  });
});

describe("tour guiado: la bienvenida y el final enseñan el montaje del usuario", () => {
  it("el último paso ya lo ha devuelto, antes de salir", async () => {
    await userSetup();
    const before = snapshotOfEverything();
    const runner = makeRunner();
    await settle(runner.start());
    await goToStep(runner, LAST);
    expect(view.closed).toBe(false);
    expectExactly(before);
    await settle(runner.exit());
    expectExactly(before);
  });

  it("volver a la bienvenida también lo devuelve", async () => {
    await userSetup();
    const before = snapshotOfEverything();
    const runner = makeRunner();
    await settle(runner.start());
    await goToStep(runner, 3);
    await vi.advanceTimersByTimeAsync(1500);
    while (view.index > 0) await settle(runner.prev());
    expectExactly(before);
  });
});

describe("tour guiado: al salir, el montaje queda exactamente como estaba", () => {
  it.each(TOUR_STEPS.map((step, index) => [index, step.id] as const))(
    "desde el paso %i (%s), con la selección, los filtros, las marcas, el historial y la interfaz",
    async (index) => {
      await userSetup();
      const before = snapshotOfEverything();
      const runner = makeRunner();
      await settle(runner.start());
      await goToStep(runner, index);
      await vi.advanceTimersByTimeAsync(index === 7 ? 2000 : 500);
      await settle(runner.exit());
      expect(view.closed).toBe(true);
      expect(exits).toBe(1);
      expect(finished).toBe(1);
      expectExactly(before);
      // Y se vuelve a registrar: lo siguiente es un paso desde lo restaurado.
      useSelectionStore.getState().toggleNode(HCP_NODES[20].id);
      await flush();
      expect(useHistoryStore.getState().past).toHaveLength(before.past.length + 1);
      expect(useHistoryStore.getState().lastStep?.before).toBe(before.present);
    },
  );

  it("desde otra pestaña y con Filtros plegado, vuelve a ellos", async () => {
    await userSetup();
    app.setFiltersCollapsed(true);
    app.setView("species");
    const before = snapshotOfEverything();
    const runner = makeRunner();
    await settle(runner.start());
    await goToStep(runner, 3);
    expect(app.view).toBe("atlas");
    expect(app.filtersCollapsed).toBe(false);
    await settle(runner.exit());
    const after = snapshotOfEverything();
    expect(after.stores.selectedNodeIds).toBe(before.stores.selectedNodeIds);
    expect(after.stores.markedIds).toBe(before.stores.markedIds);
    expect(after.past).toBe(before.past);
    expect(after.future).toBe(before.future);
    // La lupa, el buscador y las secciones no estaban en la página: no se tocan.
    const ui = (state: typeof before.ui) => ({ ...state, lens: null, search: null, sections: null });
    expect(ui(after.ui)).toEqual(ui(before.ui));
  });

  it("si estaba en otro atlas y otra clasificación, vuelve a ellos y espera a sus datos antes de poner su montaje", async () => {
    app.changeAtlas("atlas.otro");
    app.setNetworkSource("yeo2011-7");
    await vi.advanceTimersByTimeAsync(100);
    useSelectionStore.getState().selectNodes([OTHER_NODES[0].id]);
    await flush();
    useMarksStore.getState().toggleMark(OTHER_NODES[1].id);
    await flush();
    const before = snapshotOfEverything();
    const loadsBefore = app.loads;
    const runner = makeRunner();
    await settle(runner.start());
    await settle(runner.next());
    expect(view.busy.some((message) => message !== null)).toBe(true);
    expect(app.atlasId).toBe(TOUR_ATLAS_ID);
    expect(view.index).toBe(1);
    await goToStep(runner, 5);
    await settle(runner.exit());
    expect(app.loads).toBe(loadsBefore + 2);
    expectExactly(before);
  });

  it("salir mientras carga el atlas del ejemplo cancela el paso y vuelve igual", async () => {
    app.changeAtlas("atlas.otro");
    await vi.advanceTimersByTimeAsync(100);
    const before = snapshotOfEverything();
    const runner = makeRunner();
    await settle(runner.start());
    const pending = runner.next();
    await vi.advanceTimersByTimeAsync(10);
    expect(app.data.kind).toBe("loading");
    const exited = runner.exit();
    await settle(Promise.all([pending, exited]));
    expect(view.index).toBe(0);
    expectExactly(before);
  });

  it("si falla algo antes de poner su montaje, al menos devuelve los stores y el historial, y vuelve a registrar", async () => {
    app.changeAtlas("atlas.otro");
    await vi.advanceTimersByTimeAsync(100);
    useSelectionStore.getState().selectNodes([OTHER_NODES[0].id]);
    await flush();
    const before = snapshotOfEverything();
    const runner = makeRunner();
    await settle(runner.start());
    await goToStep(runner, 2);
    app.changeAtlas = () => {
      throw new Error("sin red");
    };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await settle(runner.exit());
    errors.mockRestore();
    expect(finished).toBe(1);
    const after = snapshotOfEverything();
    expect(after.stores.selectedNodeIds).toBe(before.stores.selectedNodeIds);
    expect(after.past).toBe(before.past);
    expect(after.present).toBe(before.present);
    useSelectionStore.getState().toggleNode(OTHER_NODES[2].id);
    await flush();
    expect(useHistoryStore.getState().past).toHaveLength(before.past.length + 1);
  });

  it("si la app se desmonta a medias, al menos devuelve la selección, los filtros, las marcas y el historial", async () => {
    await userSetup();
    const before = snapshotOfEverything();
    const runner = makeRunner();
    await settle(runner.start());
    await goToStep(runner, 6);
    await vi.advanceTimersByTimeAsync(1500);
    runner.dispose();
    const after = snapshotOfEverything();
    expect(after.stores.selectedNodeIds).toBe(before.stores.selectedNodeIds);
    expect(after.past).toBe(before.past);
    useSelectionStore.getState().toggleNode(HCP_NODES[20].id);
    await flush();
    expect(useHistoryStore.getState().past).toHaveLength(before.past.length + 1);
  });
});

describe("tour guiado: sin datos reales, solo explica", () => {
  it("lo dice en la bienvenida y no cambia la selección, los filtros ni las marcas en ningún paso", async () => {
    app = new FakeApp("demo");
    useSelectionStore.getState().selectNodes([DEMO_NODES[0].id]);
    await flush();
    const before = snapshotOfEverything();
    const runner = makeRunner(app);
    await settle(runner.start());
    expect(view.shown[0].description).toContain(EXPLAIN_ONLY_TEXT);
    for (let index = 1; index <= LAST; index++) {
      await settle(runner.next());
      await vi.advanceTimersByTimeAsync(5000);
      expect(useSelectionStore.getState().selectedNodeIds).toBe(before.stores.selectedNodeIds);
      expect(useFiltersStore.getState().hiddenNetworks).toBe(before.stores.hiddenNetworks);
      expect(useMarksStore.getState().markedIds).toBe(before.stores.markedIds);
      expect(view.shown.at(-1)?.description).not.toMatch(/\bAquí\b/);
    }
    expect(app.atlasId).toBe(TOUR_ATLAS_ID);
    await settle(runner.exit());
    expectExactly(before);
  });

  it("si el atlas del ejemplo cae a los datos de demostración, sigue solo explicando y lo dice en ese paso", async () => {
    app.changeAtlas("atlas.otro");
    await vi.advanceTimersByTimeAsync(100);
    // A partir de aquí, la API ya no da datos reales.
    app.api = "demo";
    const runner = makeRunner(app);
    await settle(runner.start());
    expect(view.shown[0].description).not.toContain(EXPLAIN_ONLY_TEXT);
    await settle(runner.next());
    expect(view.index).toBe(1);
    expect(view.shown.at(-1)?.description).toMatch(/no se pudieron cargar|no hay datos reales/i);
    await settle(runner.next());
    expect(view.shown.at(-1)?.description).not.toMatch(/\bAquí\b/);
    await settle(runner.exit());
  });
});

describe("tour guiado: ▶ Automático", () => {
  it("avanza solo y se pausa con cualquier otro control", async () => {
    const runner = makeRunner();
    await settle(runner.start());
    runner.toggleAutoplay();
    expect(view.autoplay.at(-1)).toBe(true);
    await vi.advanceTimersByTimeAsync(autoplayDelay(view.shown[0].description) + 300);
    expect(view.index).toBe(1);
    expect(view.shown.at(-1)?.autoplay).toBe(true);
    await vi.advanceTimersByTimeAsync(autoplayDelay(view.shown[1].description) + 300);
    expect(view.index).toBe(2);
    await settle(runner.prev());
    expect(view.shown.at(-1)?.autoplay).toBe(false);
    const index = view.index;
    await vi.advanceTimersByTimeAsync(3 * AUTOPLAY_STEP_MS);
    expect(view.index).toBe(index);
  });

  it("en el último paso se para: salir lo decide el usuario", async () => {
    const runner = makeRunner();
    await settle(runner.start());
    await goToStep(runner, LAST - 1);
    runner.toggleAutoplay();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(view.index).toBe(LAST);
    expect(view.shown.at(-1)?.autoplay).toBe(false);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(view.closed).toBe(false);
    // «Terminar» (Siguiente en el último paso) sale.
    await settle(runner.next());
    expect(view.closed).toBe(true);
  });
});
