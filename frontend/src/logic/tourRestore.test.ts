import { describe, expect, it } from "vitest";
import {
  ALL_SECTIONS_OPEN,
  dataStatus,
  planData,
  planUi,
  type TourDataChoice,
  type TourUi,
  type TourUiOp,
  type TourUiTarget,
} from "./tourRestore";

// Aplica las operaciones como lo haría App, en orden: primero las que montan
// (la vista Atlas, Filtros desplegado), luego lo de dentro y al final las que
// desmontan. Mientras algo no está en la página, su valor no se puede leer
// (null), como en los controles del tour.
function run(state: TourUi, ops: readonly TourUiOp[]): TourUi {
  let next = { ...state };
  for (const op of ops) next = { ...next, [op.kind]: op.value };
  return next;
}
const runPlan = (state: TourUi, target: TourUiTarget) => {
  const plan = planUi(state, target);
  return run(state, [...plan.mount, ...plan.inside, ...plan.unmount]);
};

const USER: TourUi = {
  view: "species",
  filtersCollapsed: true,
  mainView: "hemispheres",
  sections: null,
  search: null,
  lens: null,
};
const TOUR: TourUiTarget = {
  view: "atlas",
  filtersCollapsed: false,
  mainView: "connectogram",
  sections: ALL_SECTIONS_OPEN,
  search: "",
  lens: false,
};

describe("interfaz: del montaje del usuario al tour y vuelta", () => {
  it("al entrar en el tour, primero se monta lo que hace falta: la vista Atlas y Filtros desplegado", () => {
    const plan = planUi(USER, TOUR);
    expect(plan.mount).toEqual([
      { kind: "view", value: "atlas" },
      { kind: "filtersCollapsed", value: false },
    ]);
    expect(plan.unmount).toEqual([]);
    expect(plan.inside.map((op) => op.kind)).toEqual(["sections", "search", "lens", "mainView"]);
  });

  it("al salir, vuelve exactamente a lo que había, y lo que desmonta va al final", () => {
    const during = runPlan(USER, TOUR);
    expect(during).toMatchObject({ view: "atlas", filtersCollapsed: false, mainView: "connectogram" });
    const plan = planUi(during, USER);
    expect(plan.unmount).toEqual([
      { kind: "filtersCollapsed", value: true },
      { kind: "view", value: "species" },
    ]);
    expect(plan.mount).toEqual([]);
    // El buscador y la lupa no estaban en la página (null): no se tocan.
    expect(plan.inside).toEqual([{ kind: "mainView", value: "hemispheres" }]);
    expect(run(during, [...plan.mount, ...plan.inside, ...plan.unmount])).toEqual({
      ...USER,
      sections: ALL_SECTIONS_OPEN,
      search: "",
      lens: false,
    });
  });

  it("con todo en la página, lo deja todo como estaba: secciones, buscador, lupa y vista grande", () => {
    const user: TourUi = {
      view: "atlas",
      filtersCollapsed: false,
      mainView: "brain3d",
      sections: { networks: false, types: true, weight: false },
      search: "ifj",
      lens: true,
    };
    const during = runPlan(user, TOUR);
    expect(during).toEqual({ ...user, mainView: "connectogram", sections: ALL_SECTIONS_OPEN, search: "", lens: false });
    expect(runPlan(during, user)).toEqual(user);
  });

  it("si ya está como se quiere, no hace nada", () => {
    const plan = planUi(runPlan(USER, TOUR), TOUR);
    expect(plan).toEqual({ mount: [], inside: [], unmount: [] });
  });

  it("lo que el destino deja en null no se toca", () => {
    const plan = planUi(USER, { view: "atlas", filtersCollapsed: false, mainView: null, sections: null, search: null, lens: null });
    expect([...plan.inside, ...plan.unmount]).toEqual([]);
  });
});

describe("datos: atlas y clasificación de redes", () => {
  const hcp: TourDataChoice = { atlasId: "hcp", networkSource: null };

  it("otro atlas: se cambia de atlas y, si hace falta, de clasificación, a la vez", () => {
    expect(planData({ atlasId: "bna", networkSource: null }, hcp)).toEqual([{ kind: "atlas", value: "hcp" }]);
    expect(planData(hcp, { atlasId: "bna", networkSource: "yeo2011-7" })).toEqual([
      { kind: "atlas", value: "bna" },
      { kind: "networkSource", value: "yeo2011-7" },
    ]);
  });

  it("el mismo atlas: solo la clasificación, si cambia; si no, nada", () => {
    expect(planData({ atlasId: "hcp", networkSource: "yeo2011-7" }, hcp)).toEqual([{ kind: "networkSource", value: null }]);
    expect(planData(hcp, hcp)).toEqual([]);
  });

  it("espera a que lleguen los datos de lo elegido", () => {
    const target = { atlasId: "hcp", networkSource: "yeo2011-7" };
    const loading = { ...target, data: { kind: "loading" as const } };
    expect(dataStatus(loading, target, false)).toBe("loading");
    // Mientras llega otra clasificación, App sigue enseñando la anterior.
    expect(dataStatus({ ...target, data: { kind: "real", networkSource: null } }, target, false)).toBe("loading");
    expect(dataStatus({ ...target, data: { kind: "real", networkSource: "yeo2011-7" } }, target, false)).toBe("ready");
    // Sin datos reales (la API no responde o el atlas no tiene), no hay más que esperar.
    expect(dataStatus({ ...target, data: { kind: "demo" } }, target, false)).toBe("ready");
  });

  it("si App vuelve a la clasificación por defecto tras un error, es un fallo, no una espera", () => {
    const target = { atlasId: "hcp", networkSource: "yeo2011-7" };
    const reverted = { atlasId: "hcp", networkSource: null, data: { kind: "real" as const, networkSource: null } };
    // Antes de ver lo pedido, es que App aún no lo ha recibido.
    expect(dataStatus(reverted, target, false)).toBe("loading");
    expect(dataStatus(reverted, target, true)).toBe("failed");
  });
});
