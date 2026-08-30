import { describe, expect, it } from "vitest";
import { inducedConnections } from "./induced";
import type { GraphConnection } from "../types/domain";

const connAB: GraphConnection = { id: "ab", source: "a", target: "b", type: "structural", weight: 0.5, evidenceLevel: "direct" };
const connBC: GraphConnection = { id: "bc", source: "b", target: "c", type: "structural", weight: 0.4, evidenceLevel: "direct" };

describe("inducedConnections", () => {
  it("devuelve null con menos de dos nodos seleccionados", () => {
    expect(inducedConnections([connAB, connBC], new Set())).toBeNull();
    expect(inducedConnections([connAB, connBC], new Set(["a"]))).toBeNull();
  });

  it("con dos o más nodos, solo devuelve las conexiones con ambos extremos en la selección", () => {
    const result = inducedConnections([connAB, connBC], new Set(["a", "b"]));
    expect(result).toEqual([connAB]);
  });

  it("una selección sin ninguna conexión real entre sí devuelve una lista vacía, no null", () => {
    const result = inducedConnections([connAB, connBC], new Set(["a", "c"]));
    expect(result).toEqual([]);
  });

  it("con toda la selección conectada en cadena, devuelve todas las conexiones internas", () => {
    const result = inducedConnections([connAB, connBC], new Set(["a", "b", "c"]));
    expect(result).toEqual([connAB, connBC]);
  });
});
