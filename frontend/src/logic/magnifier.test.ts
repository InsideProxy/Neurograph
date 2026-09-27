import { describe, expect, it } from "vitest";
import { nearestNodeId } from "./magnifier";

const positions = new Map([
  ["a", { x: 0, y: 0 }],
  ["b", { x: 5, y: 0 }],
  ["c", { x: 100, y: 100 }],
]);

describe("nearestNodeId", () => {
  it("devuelve el nodo más cercano dentro del radio", () => {
    expect(nearestNodeId(positions, 1, 0, 10)).toBe("a");
    expect(nearestNodeId(positions, 4, 1, 10)).toBe("b");
  });

  it("devuelve null si ningún nodo está dentro del radio", () => {
    expect(nearestNodeId(positions, 50, 50, 10)).toBeNull();
    expect(nearestNodeId(new Map(), 0, 0, 10)).toBeNull();
  });
});
