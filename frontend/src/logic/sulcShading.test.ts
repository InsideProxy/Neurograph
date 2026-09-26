import { describe, expect, it } from "vitest";
import {
  SULC_PERCENTILES,
  fillVertexColorsByIndex,
  percentile,
  sulcRange,
  sulcShade,
  type CortexGrays,
} from "./surfaceParcels";

// Surcos más visibles (docs/rediseno-interfaz-diseno.md, 6.3 y 10): los
// percentiles 5 y 95 y el suavizado, sobre un vector conocido. La rampa
// 0, 1, …, 100 tiene sus percentiles 5 y 95 en 5 y 95.
const ramp = (count: number) => Float32Array.from({ length: count }, (_, i) => i);

describe("percentile", () => {
  it("interpola entre los dos valores más cercanos, como numpy", () => {
    expect(percentile([0, 10], 5)).toBeCloseTo(0.5);
    expect(percentile([0, 10], 95)).toBeCloseTo(9.5);
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([7], 95)).toBe(7);
  });
});

describe("sulcRange", () => {
  it("son los percentiles 5 y 95 del archivo, no su mínimo y su máximo", () => {
    expect(SULC_PERCENTILES).toEqual([5, 95]);
    expect(sulcRange(ramp(101))).toEqual([5, 95]);
  });

  it("no cuenta los vértices sin dato, y sin un rango de verdad devuelve null", () => {
    expect(sulcRange(Float32Array.from([Number.NaN, ...ramp(101), Number.NaN]))).toEqual([5, 95]);
    expect(sulcRange(Float32Array.from([2, 2, 2]))).toBeNull();
    expect(sulcRange(Float32Array.from([Number.NaN]))).toBeNull();
    expect(sulcRange(null)).toBeNull();
  });

  it("se calcula una vez por archivo de surcos", () => {
    const sulc = ramp(101);
    const first = sulcRange(sulc);
    expect(sulcRange(sulc)).toBe(first);
    expect(sulcRange(ramp(101))).not.toBe(first);
  });
});

describe("sulcShade", () => {
  it("recorta a 0-1 y suaviza con smoothstep", () => {
    expect(sulcShade(-0.5)).toBe(0);
    expect(sulcShade(0)).toBe(0);
    expect(sulcShade(0.25)).toBeCloseTo(0.15625);
    expect(sulcShade(0.5)).toBe(0.5);
    expect(sulcShade(1)).toBe(1);
    expect(sulcShade(1.5)).toBe(1);
  });
});

describe("fillVertexColorsByIndex, con los percentiles y el suavizado", () => {
  const grays: CortexGrays = {
    sulcus: [0, 0, 0],
    gyrus: [1, 1, 1],
    noData: [0.4, 0.4, 0.4],
    medialWall: [0.2, 0.2, 0.2],
  };
  // Todos los vértices en la categoría 0, en gris, salvo el 50 y el 80, que
  // están en la 1 y tienen color.
  const vertexIndex = new Int32Array(101);
  vertexIndex[50] = 1;
  vertexIndex[80] = 1;
  const out = new Float32Array(101 * 3);
  fillVertexColorsByIndex(out, vertexIndex, 2, ramp(101), (category) => (category === 1 ? [1, 0.5, 0] : null), grays);

  it("por debajo del percentil 5, el gris del surco; por encima del 95, el del giro; entre ellos, suavizado", () => {
    expect(out[4 * 3]).toBe(0);
    expect(out[5 * 3]).toBe(0);
    expect(out[95 * 3]).toBe(1);
    expect(out[100 * 3]).toBe(1);
    // 20 queda a 1/6 del rango: el smoothstep da 2/27, más oscuro que el 0,2 de antes.
    expect(out[20 * 3]).toBeCloseTo(2 / 27, 6);
  });

  it("el color de una región se oscurece en los surcos con el mismo valor suavizado", () => {
    // 50 queda en medio: 0,7 + 0,3 × 0,5.
    const colored = Array.from(out.slice(50 * 3, 50 * 3 + 3));
    [0.85, 0.425, 0].forEach((value, i) => expect(colored[i]).toBeCloseTo(value, 5));
    // 80 queda a 5/6 del rango: el smoothstep da 25/27 y el factor,
    // 0,7 + 0,3 × 25/27 (sin suavizar, 0,95; con el mínimo y el máximo, 0,94).
    const shade = 0.7 + (0.3 * 25) / 27;
    const colored80 = Array.from(out.slice(80 * 3, 80 * 3 + 3));
    [shade, shade / 2, 0].forEach((value, i) => expect(colored80[i]).toBeCloseTo(value, 5));
  });
});
