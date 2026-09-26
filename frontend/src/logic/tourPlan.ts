// Qué hace la app en cada paso del tour guiado (D11 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.10): el ejemplo real de HCP-MMP1.0 con
// las redes de Cole-Anticevic, calculado sobre los datos cargados. Las
// regiones se buscan por abreviatura y lado, nunca por un id escrito a mano, y
// el peso mínimo sale de las conexiones que se ven. Si los datos no cuentan lo
// que dicen los textos (logic/tourSteps.ts), no hay plan y el tour solo
// explica: nunca se enseña una frase que la pantalla contradiga.
//
// Cada paso se describe con escenas completas (la selección, los filtros, las
// marcas, la vista grande, la lupa, el buscador y el historial que se ve en ↶
// y ↷): el paso entra en una y la app hace su acción al poco, pasando a la
// siguiente. Cada paso empieza donde acabó el anterior, así que volver atrás
// es volver a entrar en el paso: deshace la acción del siguiente. Funciones
// puras.
import type { ConnectionType } from "../state/filters";
import type { GraphConnection, GraphNode } from "../types/domain";
import { defaultActiveIndex, searchRegions } from "./regionSearch";
import { TOUR_STEPS, type TourMainView, type TourNetworkKeys, type TourStepId } from "./tourSteps";
import { formatMinWeight } from "./weightScale";

// El atlas y la clasificación del ejemplo (en App, ATLASES y las fuentes de
// GET /regions/network-sources).
export const TOUR_ATLAS_ID = "atlas.human.hcp.mmp1_0";
export const TOUR_NETWORK_SOURCE = "cole-anticevic";

// Las redes del ejemplo (theme/networks.ts): la que se resalta, la que se
// añade y la de la región que se marca, que empieza oculta.
export const TOUR_NETWORKS = {
  principal: "cole-anticevic.frontoparietal",
  anadida: "cole-anticevic.language",
  marcada: "cole-anticevic.visual",
} as const;

// Las regiones del ejemplo, por abreviatura y lado.
export const TOUR_REGIONS = {
  seleccionada: { abbreviation: "IFJp", hemisphere: "L" },
  buscada: { abbreviation: "TE1m", oculta: "L", anadida: "R" },
  marcada: { abbreviation: "V1", hemisphere: "L" },
} as const;

// Lo que dicen los textos del atlas: «sus 360 regiones» y «más de 64 000
// conexiones».
export const TOUR_FACTS = { regions: 360, connectionsOver: 64_000 } as const;

// Cuántas conexiones de Frontoparietal y Lenguaje deja el peso mínimo del
// ejemplo: las justas para que el dibujo respire.
export const TOUR_WEIGHT_RANGE = { min: 300, max: 600, target: 450 } as const;

// Pausa entre que el tour señala algo y la app hace la acción, para verla
// pasar.
export const TOUR_ACTION_MS = 800;

// La selección, los filtros y las marcas de una escena, con listas en lugar
// de Set: se comparan y se prueban tal cual.
export interface TourStores {
  selectedNodeIds: string[];
  selectedConnectionId: string | null;
  hiddenNetworks: string[];
  hiddenConnectionTypes: ConnectionType[];
  minWeight: number;
  markedIds: string[];
}

export interface TourScene {
  stores: TourStores;
  mainView: TourMainView;
  lens: boolean;
  // El texto del buscador.
  search: string;
  // El historial que se ve en ↶ y ↷: los estados de antes y de después del
  // de `stores` (state/history.ts). En el tour, vacío salvo en «Deshacer y
  // rehacer».
  history: { past: TourStores[]; future: TourStores[] };
}

// Lo que hace la app en un paso, al cabo de `afterMs`: pasar a otra escena, o
// deshacer o rehacer con el historial de la escena.
export type TourMove = { afterMs: number; scene: TourScene } | { afterMs: number; history: "undo" | "redo" };

export interface TourStepPlan {
  enter: TourScene;
  moves: TourMove[];
}

export interface TourPlan {
  // Las redes que se señalan en la lista de Filtros.
  networkKeys: TourNetworkKeys;
  minWeight: number;
  // Lo que se escribe en los textos: el peso, en la notación de Filtros.
  values: { peso: string };
  // Uno por paso de TOUR_STEPS; null en la bienvenida y el final, que dejan
  // el montaje del usuario.
  steps: (TourStepPlan | null)[];
}

export type TourPlanResult = { ok: true; plan: TourPlan } | { ok: false; problems: string[] };

export function findRegion(
  nodes: readonly GraphNode[],
  abbreviation: string,
  hemisphere: "L" | "R",
): GraphNode | undefined {
  return nodes.find((node) => node.abbreviation === abbreviation && node.hemisphere === hemisphere);
}

// Si los nodos traen las redes de Cole-Anticevic.
export function hasTourNetworks(nodes: readonly GraphNode[]): boolean {
  return nodes.some((node) => node.network === TOUR_NETWORKS.principal);
}

// Los pesos que se prueban: 1, 2 y 5 por cada potencia de diez de la escala
// del deslizador (de 1e-6 a 1, logic/weightScale.ts), que en Filtros se leen
// redondos. Se escriben como texto para que sean exactos: 5e-6, no
// 4.999…e-6.
export function weightCandidates(): number[] {
  const candidates: number[] = [];
  for (let exponent = -6; exponent < 0; exponent++) {
    for (const mantissa of [1, 2, 5]) candidates.push(Number(`${mantissa}e${exponent}`));
  }
  candidates.push(1);
  return candidates;
}

interface WeightOption {
  weight: number;
  count: number;
  inRange: boolean;
  distance: number;
}

function betterWeight(a: WeightOption, b: WeightOption): boolean {
  if (a.inRange !== b.inRange) return a.inRange;
  if (a.distance !== b.distance) return a.distance < b.distance;
  // A igual distancia, menos líneas; con las mismas, el peso más bajo que lo
  // consigue (van en orden creciente): se sube lo justo.
  return a.count < b.count;
}

// El peso mínimo que deja respirar el dibujo: de los candidatos, el que deja
// un número de conexiones dentro del margen y más cerca del objetivo. Si
// ninguno cae dentro, el que más se acerca sin dejar el dibujo vacío. Sin
// conexiones, null.
export function chooseMinWeight(
  weights: readonly number[],
  range: { min: number; max: number; target: number } = TOUR_WEIGHT_RANGE,
): number | null {
  let best: WeightOption | null = null;
  for (const weight of weightCandidates()) {
    const count = weights.filter((value) => value >= weight).length;
    if (count === 0) continue;
    const option = {
      weight,
      count,
      inRange: count >= range.min && count <= range.max,
      distance: Math.abs(count - range.target),
    };
    if (best === null || betterWeight(option, best)) best = option;
  }
  return best?.weight ?? null;
}

function scene(stores: TourStores, overrides: Partial<Omit<TourScene, "stores">> = {}): TourScene {
  return { stores, mainView: "connectogram", lens: false, search: "", history: { past: [], future: [] }, ...overrides };
}

// El plan del tour sobre los nodos y las conexiones de HCP-MMP1.0 con
// Cole-Anticevic, o por qué no se puede hacer el ejemplo con estos datos.
export function planTour(nodes: readonly GraphNode[], connections: readonly GraphConnection[]): TourPlanResult {
  const problems: string[] = [];
  if (nodes.length !== TOUR_FACTS.regions) {
    problems.push(`El atlas tiene ${nodes.length} regiones, y los textos dicen ${TOUR_FACTS.regions}.`);
  }
  if (connections.length <= TOUR_FACTS.connectionsOver) {
    problems.push(`El atlas tiene ${connections.length} conexiones, y los textos dicen más de ${TOUR_FACTS.connectionsOver}.`);
  }
  const present = new Set(nodes.map((node) => node.network));
  for (const network of Object.values(TOUR_NETWORKS)) {
    if (!present.has(network)) problems.push(`Falta la red ${network}.`);
  }
  const { seleccionada, buscada, marcada } = TOUR_REGIONS;
  const selected = findRegion(nodes, seleccionada.abbreviation, seleccionada.hemisphere);
  if (selected?.network !== TOUR_NETWORKS.principal) problems.push("IFJp (izq.) no está en la red frontoparietal.");
  const marked = findRegion(nodes, marcada.abbreviation, marcada.hemisphere);
  if (marked?.network !== TOUR_NETWORKS.marcada) problems.push("V1 (izq.) no está en la red Visual.");
  if (problems.length > 0 || !selected || !marked) return { ok: false, problems };

  const idsOf = (network: string) => nodes.filter((node) => node.network === network).map((node) => node.id);
  // Mostrar u ocultar: quedan solo las dos redes del ejemplo.
  const hidden = [...present].filter((network) => network !== TOUR_NETWORKS.principal && network !== TOUR_NETWORKS.anadida).sort();
  const hiddenSet = new Set(hidden);

  // Peso mínimo: sobre las conexiones entre las regiones que se ven.
  const visibleIds = new Set(nodes.filter((node) => !hiddenSet.has(node.network)).map((node) => node.id));
  const weights = connections
    .filter((connection) => visibleIds.has(connection.source) && visibleIds.has(connection.target))
    .map((connection) => connection.weight);
  const minWeight = chooseMinWeight(weights);
  if (minWeight === null || weights.filter((weight) => weight >= minWeight).length > TOUR_WEIGHT_RANGE.max) {
    problems.push("Ningún peso mínimo deja respirar el dibujo de Frontoparietal y Lenguaje.");
  }

  // El buscador, como en RegionSearch: «TE1m» con la izquierda en una red
  // oculta, que avisa, y la sugerencia activa, que Intro añade.
  const search = searchRegions(nodes, buscada.abbreviation, hiddenSet);
  const leftHidden = nodes.some(
    (node) => node.abbreviation === buscada.abbreviation && node.hemisphere === buscada.oculta && hiddenSet.has(node.network),
  );
  if (search.hidden === null || !leftHidden) problems.push("TE1m (izq.) no está en una red oculta: el buscador no avisaría.");
  const active = search.suggestions[defaultActiveIndex(search.suggestions, new Set([selected.id]))];
  const added = active ? nodes.find((node) => node.id === active.id) : undefined;
  if (added?.abbreviation !== buscada.abbreviation || added.hemisphere !== buscada.anadida) {
    problems.push("Intro no añadiría TE1m (der.) a la selección.");
  }
  if (problems.length > 0 || minWeight === null || !added) return { ok: false, problems };

  const principal = idsOf(TOUR_NETWORKS.principal);
  const anadida = idsOf(TOUR_NETWORKS.anadida);
  const start: TourStores = {
    selectedNodeIds: [],
    selectedConnectionId: null,
    hiddenNetworks: [],
    hiddenConnectionTypes: [],
    minWeight: 0,
    markedIds: [],
  };
  const atlas = scene(start);
  const shown = scene({ ...start, hiddenNetworks: hidden });
  const highlighted = scene({ ...shown.stores, selectedNodeIds: principal });
  const both = scene({ ...highlighted.stores, selectedNodeIds: [...principal, ...anadida] });
  const breathing = scene({ ...both.stores, minWeight });
  const oneRegion = scene({ ...breathing.stores, selectedNodeIds: [selected.id] });
  const typed = scene(oneRegion.stores, { search: buscada.abbreviation });
  const found = scene({ ...oneRegion.stores, selectedNodeIds: [selected.id, added.id] });
  const visual = scene({ ...found.stores, hiddenNetworks: hidden.filter((network) => network !== TOUR_NETWORKS.marcada) });
  const markedScene = scene({ ...visual.stores, markedIds: [marked.id] });
  const lens = scene(markedScene.stores, { lens: true });
  const brain = scene(markedScene.stores, { lens: true, mainView: "brain3d" });
  const undoable = scene(markedScene.stores, {
    lens: true,
    mainView: "brain3d",
    history: { past: [{ ...markedScene.stores, markedIds: [] }], future: [] },
  });

  const byStep: Partial<Record<TourStepId, TourStepPlan>> = {
    "atlas-y-redes": { enter: atlas, moves: [] },
    "mostrar-ocultar": { enter: atlas, moves: [{ afterMs: TOUR_ACTION_MS, scene: shown }] },
    resaltar: { enter: shown, moves: [{ afterMs: TOUR_ACTION_MS, scene: highlighted }] },
    anadir: { enter: highlighted, moves: [{ afterMs: TOUR_ACTION_MS, scene: both }] },
    peso: { enter: both, moves: [{ afterMs: TOUR_ACTION_MS, scene: breathing }] },
    seleccionar: { enter: breathing, moves: [{ afterMs: TOUR_ACTION_MS, scene: oneRegion }] },
    buscar: {
      enter: oneRegion,
      moves: [
        { afterMs: TOUR_ACTION_MS, scene: typed },
        { afterMs: 3800, scene: found },
      ],
    },
    marcar: {
      enter: found,
      moves: [
        { afterMs: TOUR_ACTION_MS, scene: visual },
        { afterMs: 2600, scene: markedScene },
      ],
    },
    lupa: { enter: markedScene, moves: [{ afterMs: TOUR_ACTION_MS, scene: lens }] },
    vista: { enter: lens, moves: [{ afterMs: 1200, scene: brain }] },
    deshacer: {
      enter: undoable,
      moves: [
        { afterMs: 1500, history: "undo" },
        { afterMs: 4000, history: "redo" },
      ],
    },
  };
  return {
    ok: true,
    plan: {
      networkKeys: { principal: TOUR_NETWORKS.principal, anadida: TOUR_NETWORKS.anadida },
      minWeight,
      values: { peso: formatMinWeight(minWeight) },
      steps: TOUR_STEPS.map((step) => byStep[step.id] ?? null),
    },
  };
}
