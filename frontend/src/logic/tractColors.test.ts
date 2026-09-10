import { describe, expect, it } from "vitest";
import { colorForTractIndex } from "./tractColors";

describe("colorForTractIndex", () => {
  it("da el mismo color para el mismo índice y total (determinista)", () => {
    expect(colorForTractIndex(5, 41)).toBe(colorForTractIndex(5, 41));
  });

  it("reparte los colores en toda la rueda de tono, no en un rango estrecho", () => {
    const first = colorForTractIndex(0, 41);
    const last = colorForTractIndex(40, 41);
    expect(first).not.toBe(last);
  });

  it("dos tractos consecutivos nunca comparten exactamente el mismo tono", () => {
    const colors = Array.from({ length: 41 }, (_, i) => colorForTractIndex(i, 41));
    const unique = new Set(colors);
    expect(unique.size).toBe(41);
  });

  it("no falla con una lista vacía (total 0)", () => {
    expect(() => colorForTractIndex(0, 0)).not.toThrow();
  });
});
