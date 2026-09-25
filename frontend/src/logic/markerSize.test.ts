import { describe, expect, it } from "vitest";
import { markRing3d, markerSize } from "./markerSize";

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

// Anillo de una región marcada en el 3D (spec 5.9): como en los dibujos, un
// hueco del color del fondo y el anillo del color de marca, fuera del
// contorno neutro del marcador.
describe("markRing3d", () => {
  it("el hueco empieza en el borde del contorno neutro, y el anillo va detrás", () => {
    for (const selected of [false, true]) {
      const size = markerSize(selected);
      const ring = markRing3d(size);
      expect(ring.gapInner).toBeCloseTo(size.radius * size.outlineScale, 10);
      expect(ring.ringInner).toBeGreaterThan(ring.gapInner);
      expect(ring.outerRadius).toBeGreaterThan(ring.ringInner);
    }
  });

  it("guarda la proporción con el marcador: una sola textura sirve para el normal y el seleccionado", () => {
    const normal = markRing3d(markerSize(false));
    const selected = markRing3d(markerSize(true));
    expect(selected.outerRadius).toBeGreaterThan(normal.outerRadius);
    expect(selected.ringInner / selected.outerRadius).toBeCloseTo(normal.ringInner / normal.outerRadius, 10);
    expect(selected.gapInner / selected.outerRadius).toBeCloseTo(normal.gapInner / normal.outerRadius, 10);
  });

  // La etiqueta mide 0,13 de alto (NodeLabel, en Brain3D.tsx) y va centrada
  // a labelOffset del centro del marcador.
  it("la etiqueta queda fuera del anillo", () => {
    for (const selected of [false, true]) {
      const size = markerSize(selected);
      expect(size.labelOffset - 0.13 / 2).toBeGreaterThan(markRing3d(size).outerRadius);
    }
  });
});
