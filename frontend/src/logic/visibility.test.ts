import { describe, expect, it } from "vitest";
import { filterGraph, isConnectionVisible, isNodeVisible } from "./visibility";
import type { GraphConnection, GraphNode } from "../types/domain";

const nodeA: GraphNode = { id: "a", label: "A", network: "memory", position3d: [0, 0, 0] };
const nodeB: GraphNode = { id: "b", label: "B", network: "language", position3d: [1, 0, 0] };
const connAB: GraphConnection = { id: "ab", source: "a", target: "b", type: "structural", weight: 0.5 };

describe("isNodeVisible", () => {
  it("es visible si su red no está oculta", () => {
    expect(isNodeVisible(nodeA, { hiddenNetworks: new Set() })).toBe(true);
  });

  it("no es visible si su red está oculta", () => {
    expect(isNodeVisible(nodeA, { hiddenNetworks: new Set(["memory"]) })).toBe(false);
  });
});

describe("isConnectionVisible", () => {
  const allVisible = () => true;

  it("no es visible si su tipo está oculto", () => {
    const visible = isConnectionVisible(
      connAB,
      { hiddenConnectionTypes: new Set(["structural"]), minWeight: 0 },
      allVisible
    );
    expect(visible).toBe(false);
  });

  it("no es visible si su peso está por debajo del umbral", () => {
    const visible = isConnectionVisible(
      connAB,
      { hiddenConnectionTypes: new Set(), minWeight: 0.6 },
      allVisible
    );
    expect(visible).toBe(false);
  });

  it("no es visible si alguno de sus extremos está oculto", () => {
    const visible = isConnectionVisible(
      connAB,
      { hiddenConnectionTypes: new Set(), minWeight: 0 },
      (id) => id !== "b"
    );
    expect(visible).toBe(false);
  });

  it("es visible cuando pasa todos los filtros", () => {
    const visible = isConnectionVisible(
      connAB,
      { hiddenConnectionTypes: new Set(), minWeight: 0 },
      allVisible
    );
    expect(visible).toBe(true);
  });
});

describe("filterGraph", () => {
  it("elimina una conexión cuando oculta la red de uno de sus nodos", () => {
    const result = filterGraph([nodeA, nodeB], [connAB], {
      hiddenNetworks: new Set(["language"]),
      hiddenConnectionTypes: new Set(),
      minWeight: 0,
    });
    expect(result.nodes).toEqual([nodeA]);
    expect(result.connections).toEqual([]);
  });
});
