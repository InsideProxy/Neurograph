import { describe, expect, it } from "vitest";
import { markerSize } from "./markerSize";

// Radios de antes de la Legibilidad del 3D, para comparar.
const OLD_RADIUS = 0.06;
const OLD_SELECTED_RADIUS = 0.09;
const OLD_OUTLINE_SCALE = 1.18;
const OLD_LABEL_OFFSET = 0.24;

describe("markerSize", () => {
  it("el radio base es la mitad del de antes y el de la región seleccionada, un 40 % mayor", () => {
    expect(markerSize(false).radius).toBeCloseTo(OLD_RADIUS / 2, 10);
    expect(markerSize(true).radius / markerSize(false).radius).toBeCloseTo(1.4, 10);
  });

  it("el anillo del contorno de un marcador normal mide lo mismo que antes", () => {
    const { radius, outlineScale } = markerSize(false);
    expect(radius * (outlineScale - 1)).toBeCloseTo(OLD_RADIUS * (OLD_OUTLINE_SCALE - 1), 10);
  });

  it("el anillo de la región seleccionada no es más fino que el de un marcador normal", () => {
    const ring = (s: ReturnType<typeof markerSize>) => s.radius * (s.outlineScale - 1);
    expect(ring(markerSize(true))).toBeGreaterThanOrEqual(ring(markerSize(false)));
  });

  it("la zona de clic es la esfera de antes y envuelve el contorno", () => {
    expect(markerSize(false).hitRadius).toBe(OLD_RADIUS);
    expect(markerSize(true).hitRadius).toBe(OLD_SELECTED_RADIUS);
    for (const selected of [false, true]) {
      const size = markerSize(selected);
      expect(size.hitRadius).toBeGreaterThan(size.radius * size.outlineScale);
    }
  });

  // Antes, la etiqueta iba a 0,24 del centro en los dos: a 0,18 del borde de
  // un marcador normal y a 0,15 del de uno seleccionado. Ahora, a 0,18 en
  // los dos.
  it("la etiqueta queda a 0,18 del borde del marcador, la separación que tenía un marcador normal", () => {
    const gap = OLD_LABEL_OFFSET - OLD_RADIUS;
    for (const selected of [false, true]) {
      const size = markerSize(selected);
      expect(size.labelOffset - size.radius).toBeCloseTo(gap, 10);
    }
  });
});
