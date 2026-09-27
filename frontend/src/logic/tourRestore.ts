// El montaje del usuario durante el tour guiado (D11 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.10): qué hay que cambiar, y en qué
// orden, para pasar del estado de la app al de un paso del tour y, al salir,
// para volver exactamente al que había. Lo mismo sirve para las dos cosas.
// - Los datos van primero: otro atlas u otra clasificación se piden a la vez
//   y se espera a que lleguen. Mientras tanto, App sigue enseñando lo
//   anterior, o nada si cambia el atlas.
// - Lo que monta partes de la interfaz (la vista Atlas, Filtros desplegado)
//   va antes de lo que vive dentro de ellas (las secciones de Filtros, el
//   texto del buscador, la lupa y la vista grande), y lo que las desmonta
//   (plegar Filtros, otra pestaña), al final. Así el buscador del usuario
//   vuelve a su texto antes de que se pliegue Filtros.
// - null es «no se toca»: en el destino, que el paso no lo cambia; en el
//   estado de la app, que no está en la página (con Filtros plegado no hay
//   buscador, y su texto se pierde igual que al plegarlo a mano).
// La selección, los filtros, las marcas y el historial van en
// state/tourRunner.ts, entre lo que monta y lo de dentro. Funciones puras.
import type { TourMainView } from "./tourSteps";

// Las secciones plegables de Filtros (FilterPanel): abiertas o plegadas.
export interface TourSections {
  networks: boolean;
  types: boolean;
  weight: boolean;
}
export const ALL_SECTIONS_OPEN: TourSections = { networks: true, types: true, weight: true };

// Lo de la interfaz que el tour cambia. `view` es la pestaña de App.
export interface TourUi {
  view: string;
  filtersCollapsed: boolean;
  mainView: TourMainView;
  sections: TourSections | null;
  search: string | null;
  lens: boolean | null;
}
export type TourUiTarget = { [K in keyof TourUi]: TourUi[K] | null };

export type TourUiOp =
  | { kind: "view"; value: string }
  | { kind: "filtersCollapsed"; value: boolean }
  | { kind: "sections"; value: TourSections }
  | { kind: "search"; value: string }
  | { kind: "lens"; value: boolean }
  | { kind: "mainView"; value: TourMainView };

export interface TourUiPlan {
  mount: TourUiOp[];
  inside: TourUiOp[];
  unmount: TourUiOp[];
}

const ATLAS_VIEW = "atlas";

function sameSections(a: TourSections | null, b: TourSections): boolean {
  return a !== null && a.networks === b.networks && a.types === b.types && a.weight === b.weight;
}

export function planUi(current: TourUi, target: TourUiTarget): TourUiPlan {
  const mount: TourUiOp[] = [];
  const inside: TourUiOp[] = [];
  const unmount: TourUiOp[] = [];
  if (target.view === ATLAS_VIEW && current.view !== ATLAS_VIEW) mount.push({ kind: "view", value: ATLAS_VIEW });
  if (target.filtersCollapsed === false && current.filtersCollapsed) mount.push({ kind: "filtersCollapsed", value: false });
  if (target.sections !== null && !sameSections(current.sections, target.sections)) {
    inside.push({ kind: "sections", value: target.sections });
  }
  if (target.search !== null && current.search !== target.search) inside.push({ kind: "search", value: target.search });
  if (target.lens !== null && current.lens !== target.lens) inside.push({ kind: "lens", value: target.lens });
  if (target.mainView !== null && current.mainView !== target.mainView) inside.push({ kind: "mainView", value: target.mainView });
  if (target.filtersCollapsed === true && !current.filtersCollapsed) unmount.push({ kind: "filtersCollapsed", value: true });
  if (target.view !== null && target.view !== ATLAS_VIEW && current.view !== target.view) {
    unmount.push({ kind: "view", value: target.view });
  }
  return { mount, inside, unmount };
}

// El atlas y la clasificación elegidos en App (null, la de por defecto del
// atlas).
export interface TourDataChoice {
  atlasId: string;
  networkSource: string | null;
}

export type TourDataOp = { kind: "atlas"; value: string } | { kind: "networkSource"; value: string | null };

// Cambiar de atlas deja la clasificación en la de por defecto (App,
// handleChangeAtlas): si el destino lleva otra, se pide a la vez, y App carga
// una sola vez.
export function planData(current: TourDataChoice, target: TourDataChoice): TourDataOp[] {
  if (current.atlasId !== target.atlasId) {
    const ops: TourDataOp[] = [{ kind: "atlas", value: target.atlasId }];
    if (target.networkSource !== null) ops.push({ kind: "networkSource", value: target.networkSource });
    return ops;
  }
  return current.networkSource === target.networkSource ? [] : [{ kind: "networkSource", value: target.networkSource }];
}

// Lo que App tiene cargado: sus datos reales con la clasificación con la que
// llegaron, los de demostración o nada todavía.
export type TourLoaded = { kind: "loading" } | { kind: "real"; networkSource: string | null } | { kind: "demo" };

// Si ya han llegado los datos de lo elegido. `seen`: App ya mostró lo pedido
// alguna vez; si después vuelve a otra clasificación, es que no pudo cargarla
// (se vuelve a la de por defecto con un aviso) y no hay nada que esperar. Sin
// datos reales tampoco: el atlas no tiene, o la API no responde.
export function dataStatus(
  state: TourDataChoice & { data: TourLoaded },
  target: TourDataChoice,
  seen: boolean,
): "loading" | "ready" | "failed" {
  const chosen = state.atlasId === target.atlasId && state.networkSource === target.networkSource;
  if (!chosen) return seen ? "failed" : "loading";
  if (state.data.kind === "loading") return "loading";
  if (state.data.kind === "demo") return "ready";
  return state.data.networkSource === target.networkSource ? "ready" : "loading";
}
