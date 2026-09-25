import { describe, expect, it } from "vitest";
import type { GraphNode } from "../types/domain";
import {
  TOUR_NETWORKS,
  TOUR_WEIGHT_RANGE,
  chooseMinWeight,
  findRegion,
  planTour,
  weightCandidates,
  type TourPlan,
  type TourScene,
  type TourStepPlan,
} from "./tourPlan";
import { TOUR_STEPS } from "./tourSteps";
import { hcpLikeConnections, hcpLikeNodes } from "./tourTestData";

const NODES = hcpLikeNodes();
const CONNECTIONS = hcpLikeConnections(NODES);
const idOf = (abbreviation: string, hemisphere: "L" | "R") => findRegion(NODES, abbreviation, hemisphere)!.id;
const IFJP_L = idOf("IFJp", "L");
const TE1M_R = idOf("TE1m", "R");
const V1_L = idOf("V1", "L");
const FP = NODES.filter((node) => node.network === TOUR_NETWORKS.principal).map((node) => node.id);
const LANG = NODES.filter((node) => node.network === TOUR_NETWORKS.anadida).map((node) => node.id);

function okPlan(nodes: readonly GraphNode[] = NODES): TourPlan {
  const result = planTour(nodes, CONNECTIONS);
  if (!result.ok) throw new Error(result.problems.join("; "));
  return result.plan;
}
const PLAN = okPlan();
const indexOf = (id: string) => TOUR_STEPS.findIndex((step) => step.id === id);
const stepPlan = (id: string): TourStepPlan => {
  const plan = PLAN.steps[indexOf(id)];
  if (!plan) throw new Error(`el paso ${id} no tiene plan`);
  return plan;
};
// Lo que deja un paso al acabar: su última escena, o la de entrada si no
// tiene movimientos de escena.
function result(plan: TourStepPlan): TourScene {
  const scenes = plan.moves.flatMap((move) => ("scene" in move ? [move.scene] : []));
  return scenes.at(-1) ?? plan.enter;
}

describe("peso mínimo que deja respirar el dibujo", () => {
  it("prueba pesos redondos de la escala logarítmica: 1, 2 y 5 por cada potencia de diez", () => {
    const candidates = weightCandidates();
    expect(candidates[0]).toBeCloseTo(1e-6, 12);
    expect(candidates).toContain(1e-3);
    expect(candidates.at(-1)).toBe(1);
    expect(candidates.slice(0, 3).map((w) => w / 1e-6)).toEqual([1, 2, 5].map((n) => expect.closeTo(n, 9)));
  });

  it("elige el que deja un número de conexiones dentro del margen, el más cercano al objetivo", () => {
    const weights = [
      ...Array.from({ length: 500 }, () => 5e-4),
      ...Array.from({ length: 200 }, () => 1.5e-3),
      ...Array.from({ length: 300 }, () => 3e-3),
    ];
    // ≥ 5e-4: 1000; ≥ 1e-3: 500; ≥ 2e-3: 300; ≥ 5e-3: 0.
    expect(chooseMinWeight(weights, { min: 300, max: 600, target: 450 })).toBe(1e-3);
    expect(chooseMinWeight(weights, { min: 300, max: 600, target: 320 })).toBe(2e-3);
  });

  it("si ninguno cae en el margen, el que más se acerca sin dejar el dibujo vacío; sin conexiones, null", () => {
    const weights = [...Array.from({ length: 900 }, () => 4e-4), ...Array.from({ length: 50 }, () => 8e-3)];
    // ≥ 2e-4: 950; de 5e-4 a 5e-3: 50; ≥ 1e-2: 0 (vacío, descartado). Con
    // las mismas líneas, el peso más bajo que lo consigue: sube lo justo.
    expect(chooseMinWeight(weights, { min: 300, max: 600, target: 450 })).toBe(5e-4);
    expect(chooseMinWeight([], TOUR_WEIGHT_RANGE)).toBeNull();
  });

  it("a igual distancia del objetivo, el que deja menos líneas", () => {
    const weights = [...Array.from({ length: 400 }, () => 1.5e-3), ...Array.from({ length: 100 }, () => 3e-3)];
    // ≥ 1e-3: 500; ≥ 2e-3: 100. Con el objetivo en 300, los dos quedan a 200.
    expect(chooseMinWeight(weights, { min: 50, max: 600, target: 300 })).toBe(2e-3);
  });
});

describe("el ejemplo del tour, sobre los datos cargados", () => {
  it("busca las regiones por abreviatura y lado, sin ids escritos a mano", () => {
    expect(findRegion(NODES, "IFJp", "L")?.hemisphere).toBe("L");
    expect(findRegion(NODES, "IFJp", "L")?.network).toBe(TOUR_NETWORKS.principal);
    expect(findRegion(NODES, "V1", "L")?.network).toBe(TOUR_NETWORKS.marcada);
    expect(findRegion(NODES, "NoExiste", "L")).toBeUndefined();
  });

  it("la bienvenida y el final no tienen plan: dejan el montaje del usuario", () => {
    expect(PLAN.steps).toHaveLength(TOUR_STEPS.length);
    expect(PLAN.steps[0]).toBeNull();
    expect(PLAN.steps.at(-1)).toBeNull();
    expect(PLAN.steps.slice(1, -1).every((step) => step !== null)).toBe(true);
  });

  it("parte de cero: HCP con todo a la vista, nada seleccionado ni marcado y el connectograma en grande", () => {
    const start = stepPlan("atlas-y-redes").enter;
    expect(start.stores).toEqual({
      selectedNodeIds: [],
      selectedConnectionId: null,
      hiddenNetworks: [],
      hiddenConnectionTypes: [],
      minWeight: 0,
      markedIds: [],
    });
    expect(start).toMatchObject({ mainView: "connectogram", lens: false, search: "", history: { past: [], future: [] } });
  });

  it("mostrar u ocultar: quedan solo Frontoparietal y Lenguaje", () => {
    const hidden = new Set(result(stepPlan("mostrar-ocultar")).stores.hiddenNetworks);
    const present = new Set(NODES.map((node) => node.network));
    expect(hidden.has(TOUR_NETWORKS.principal)).toBe(false);
    expect(hidden.has(TOUR_NETWORKS.anadida)).toBe(false);
    expect(hidden.size).toBe(present.size - 2);
  });

  it("◎ Resaltar sustituye la selección por la red frontoparietal entera, y + Añadir le suma Lenguaje", () => {
    expect(result(stepPlan("resaltar")).stores.selectedNodeIds).toEqual(FP);
    expect(result(stepPlan("anadir")).stores.selectedNodeIds).toEqual([...FP, ...LANG]);
  });

  it("el peso sube hasta dejar entre 300 y 600 conexiones de Frontoparietal y Lenguaje, y la caja lo dice", () => {
    const weight = result(stepPlan("peso")).stores.minWeight;
    expect(weight).toBe(PLAN.minWeight);
    const inExample = new Set([...FP, ...LANG]);
    const passing = CONNECTIONS.filter((c) => inExample.has(c.source) && inExample.has(c.target) && c.weight >= weight);
    expect(passing.length).toBeGreaterThanOrEqual(TOUR_WEIGHT_RANGE.min);
    expect(passing.length).toBeLessThanOrEqual(TOUR_WEIGHT_RANGE.max);
    expect(PLAN.values.peso).toMatch(/^\d/);
  });

  it("seleccionar empieza de cero con IFJp (izq.)", () => {
    expect(result(stepPlan("seleccionar")).stores.selectedNodeIds).toEqual([IFJP_L]);
  });

  it("el buscador escribe «TE1m», con la izquierda en una red oculta, y luego añade la derecha como haría Intro", () => {
    const plan = stepPlan("buscar");
    const typed = plan.moves[0];
    expect("scene" in typed && typed.scene.search).toBe("TE1m");
    expect("scene" in typed && typed.scene.stores.selectedNodeIds).toEqual([IFJP_L]);
    const chosen = result(plan);
    expect(chosen.search).toBe("");
    expect(chosen.stores.selectedNodeIds).toEqual([IFJP_L, TE1M_R]);
    const times = plan.moves.map((move) => move.afterMs);
    expect(times).toEqual(times.toSorted((a, b) => a - b));
  });

  it("marcar muestra la red Visual y marca V1 (izq.), sin tocar la selección", () => {
    const plan = stepPlan("marcar");
    const [shown, marked] = plan.moves.map((move) => ("scene" in move ? move.scene : null));
    expect(plan.enter.stores.hiddenNetworks).toContain(TOUR_NETWORKS.marcada);
    expect(shown?.stores.hiddenNetworks).not.toContain(TOUR_NETWORKS.marcada);
    expect(shown?.stores.markedIds).toEqual([]);
    expect(marked?.stores.markedIds).toEqual([V1_L]);
    expect(marked?.stores.selectedNodeIds).toEqual(plan.enter.stores.selectedNodeIds);
  });

  it("la lupa se enciende con el connectograma en grande, y después el 3D pasa a grande", () => {
    expect(stepPlan("lupa").enter.mainView).toBe("connectogram");
    expect(result(stepPlan("lupa")).lens).toBe(true);
    expect(stepPlan("vista").enter.mainView).toBe("connectogram");
    expect(result(stepPlan("vista")).mainView).toBe("brain3d");
  });

  it("deshacer y rehacer: la marca de V1 (izq.) es el paso que se deshace, con el historial del propio tour", () => {
    const plan = stepPlan("deshacer");
    expect(plan.enter.stores.markedIds).toEqual([V1_L]);
    expect(plan.enter.history.future).toEqual([]);
    expect(plan.enter.history.past).toEqual([{ ...plan.enter.stores, markedIds: [] }]);
    expect(plan.moves.map((move) => ("history" in move ? move.history : "escena"))).toEqual(["undo", "redo"]);
  });

  it("retroceder deshace el paso: cada paso empieza en lo que dejó el anterior", () => {
    for (let index = 2; index < TOUR_STEPS.length - 1; index++) {
      const previous = PLAN.steps[index - 1]!;
      const current = PLAN.steps[index]!;
      const { history: _previousHistory, ...left } = result(previous);
      const { history: _currentHistory, ...entered } = current.enter;
      expect(entered, TOUR_STEPS[index].id).toEqual(left);
    }
  });

  it("todos los movimientos de un paso acaban antes de que avance el automático (8 s)", () => {
    for (const plan of PLAN.steps) for (const move of plan?.moves ?? []) expect(move.afterMs).toBeLessThan(8000);
  });

  it("da las claves de las dos redes que señala en la lista", () => {
    expect(PLAN.networkKeys).toEqual({ principal: TOUR_NETWORKS.principal, anadida: TOUR_NETWORKS.anadida });
  });
});

describe("si los datos no cuentan lo que dice el guion, el tour solo explica", () => {
  const without = (predicate: (node: GraphNode) => boolean) => NODES.filter((node) => !predicate(node));
  const moved = (abbreviation: string, hemisphere: "L" | "R", network: string) =>
    NODES.map((node) => (node.abbreviation === abbreviation && node.hemisphere === hemisphere ? { ...node, network } : node));

  it("sin la red frontoparietal", () => {
    const result = planTour(without((node) => node.network === TOUR_NETWORKS.principal), CONNECTIONS);
    expect(result.ok).toBe(false);
  });

  it("sin IFJp izquierda, o fuera de la red frontoparietal", () => {
    expect(planTour(without((node) => node.abbreviation === "IFJp" && node.hemisphere === "L"), CONNECTIONS).ok).toBe(false);
    expect(planTour(moved("IFJp", "L", "cole-anticevic.default"), CONNECTIONS).ok).toBe(false);
  });

  it("si TE1m izquierda no está en una red oculta, o no queda la derecha para Intro", () => {
    expect(planTour(moved("TE1m", "L", TOUR_NETWORKS.anadida), CONNECTIONS).ok).toBe(false);
    expect(planTour(moved("TE1m", "R", "cole-anticevic.default"), CONNECTIONS).ok).toBe(false);
  });

  it("sin V1 izquierda en la red Visual", () => {
    expect(planTour(moved("V1", "L", "cole-anticevic.visual2"), CONNECTIONS).ok).toBe(false);
  });

  it("si no son las 360 regiones ni más de 64 000 conexiones que dicen los textos", () => {
    expect(planTour(NODES.slice(0, 359), CONNECTIONS).ok).toBe(false);
    expect(planTour(NODES, CONNECTIONS.slice(0, 60_000)).ok).toBe(false);
  });

  it("y dice por qué", () => {
    const result = planTour(moved("V1", "L", "cole-anticevic.visual2"), CONNECTIONS);
    expect(result.ok ? [] : result.problems).toEqual([expect.stringContaining("V1")]);
  });
});
