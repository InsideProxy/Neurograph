import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GraphConnection, GraphNode } from "../types/domain";
import { Connectogram } from "./Connectogram";
import { Hemisferios } from "./Hemisferios";

// El recuadro de lectura del connectograma y de los hemisferios avisa de las
// regiones seleccionadas que oculta el filtro de redes (D13). Con
// renderToStaticMarkup, zustand daría el estado inicial de cada store, así
// que la selección y las redes ocultas salen de aquí.
const stores = vi.hoisted(() => ({ selected: new Set<string>(), hiddenNetworks: new Set<string>() }));

vi.mock("../state/selection", async (importOriginal) => {
  const original = await importOriginal<typeof import("../state/selection")>();
  const hook = (selector?: (state: unknown) => unknown) => {
    const state = { ...original.useSelectionStore.getState(), selectedNodeIds: stores.selected };
    return selector ? selector(state) : state;
  };
  return { ...original, useSelectionStore: Object.assign(hook, original.useSelectionStore) };
});

vi.mock("../state/filters", async (importOriginal) => {
  const original = await importOriginal<typeof import("../state/filters")>();
  const hook = (selector?: (state: unknown) => unknown) => {
    const state = { ...original.useFiltersStore.getState(), hiddenNetworks: stores.hiddenNetworks };
    return selector ? selector(state) : state;
  };
  return { ...original, useFiltersStore: Object.assign(hook, original.useFiltersStore) };
});

const FRONTOPARIETAL = "cole-anticevic.frontoparietal";
const AUDITORY = "cole-anticevic.auditory";

function region(id: string, abbreviation: string, hemisphere: "L" | "R", network: string, x: number): GraphNode {
  return {
    id,
    label: `Area ${abbreviation}`,
    abbreviation,
    hemisphere,
    network,
    position3d: [x, x, 0],
    referenceSpace: null,
  };
}

const NODES = [
  region("r_avi", "AVI", "R", FRONTOPARIETAL, 1),
  region("r_ifja", "IFJa", "R", FRONTOPARIETAL, 2),
  region("l_ifja", "IFJa", "L", FRONTOPARIETAL, -2),
  region("r_ta2", "TA2", "R", AUDITORY, 3),
  region("l_a4", "A4", "L", AUDITORY, -3),
];

// Una conexión entre las dos regiones frontoparietales de la derecha, y otra
// con una auditiva, que el filtro de redes quita.
const CONNECTIONS: GraphConnection[] = [
  { id: "c1", source: "r_avi", target: "r_ifja", type: "structural", weight: 1, evidenceLevel: "direct" },
  { id: "c2", source: "r_avi", target: "r_ta2", type: "structural", weight: 1, evidenceLevel: "direct" },
];

const text = (html: string) => html.replace(/<[^>]+>/g, "");

describe.each([
  ["connectograma", () => text(renderToStaticMarkup(<Connectogram nodes={NODES} connections={CONNECTIONS} />))],
  ["hemisferios", () => text(renderToStaticMarkup(<Hemisferios nodes={NODES} connections={CONNECTIONS} />))],
])("selección oculta en %s", (_view, render) => {
  beforeEach(() => {
    stores.hiddenNetworks = new Set([AUDITORY]);
  });

  it("con varias a la vista, cuenta las que se ven y avisa de las ocultas y de su red", () => {
    stores.selected = new Set(["r_avi", "r_ifja", "r_ta2", "l_a4"]);
    expect(render()).toContain(
      "2 regiones seleccionadas · 1 conexión entre ellas · 2 más ocultas por el filtro de redes (Auditiva)",
    );
  });

  it("con una a la vista, la muestra y avisa de las ocultas", () => {
    stores.selected = new Set(["r_avi", "r_ta2", "l_a4"]);
    const readout = render();
    expect(readout).toContain("AVI — Area AVI · hemisferio derecho");
    expect(readout).toContain("2 más ocultas por el filtro de redes (Auditiva)");
  });

  it("con todas ocultas, lo dice en lugar de invitar a seleccionar", () => {
    stores.selected = new Set(["r_ta2", "l_a4"]);
    const readout = render();
    expect(readout).toContain("2 regiones seleccionadas, todas ocultas por el filtro de redes (Auditiva)");
    expect(readout).not.toContain("selecciona una región");
  });

  it("sin redes ocultas no avisa de nada", () => {
    stores.hiddenNetworks = new Set();
    stores.selected = new Set(["r_avi", "r_ta2"]);
    const readout = render();
    expect(readout).toContain("2 regiones seleccionadas");
    expect(readout).not.toContain("filtro de redes");
  });
});
