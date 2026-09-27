import { describe, expect, it } from "vitest";
import type { GraphConnection } from "../types/domain";
import { CONNECTIONS_PREVIEW_COUNT, regionConnectionsByWeight, visibleRegionConnections } from "./regionConnections";

function connection(id: string, source: string, target: string, weight: number): GraphConnection {
  return { id, source, target, type: "structural", weight, evidenceLevel: "direct" };
}

describe("regionConnectionsByWeight", () => {
  it("reúne las conexiones de la región, con el id de la otra y su sentido, de mayor a menor peso", () => {
    const result = regionConnectionsByWeight(
      [connection("1", "a", "b", 0.1), connection("2", "c", "a", 0.5), connection("3", "b", "c", 0.9), connection("4", "a", "d", 0.3)],
      "a",
    );
    expect(result.map((row) => [row.connection.id, row.otherId, row.outgoing])).toEqual([
      ["2", "c", false],
      ["4", "d", true],
      ["1", "b", true],
    ]);
  });

  it("a igual peso, ordena por id: el orden no cambia de un render a otro", () => {
    const result = regionConnectionsByWeight([connection("b", "a", "x", 0.2), connection("a", "a", "y", 0.2)], "a");
    expect(result.map((row) => row.connection.id)).toEqual(["a", "b"]);
  });
});

describe("visibleRegionConnections", () => {
  it("se ven las cinco primeras y, al desplegar, todas", () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7];
    expect(CONNECTIONS_PREVIEW_COUNT).toBe(5);
    expect(visibleRegionConnections(sorted, false)).toEqual([1, 2, 3, 4, 5]);
    expect(visibleRegionConnections(sorted, true)).toEqual(sorted);
    expect(visibleRegionConnections([1, 2], false)).toEqual([1, 2]);
  });
});
