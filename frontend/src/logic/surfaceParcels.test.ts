import { describe, expect, it } from "vitest";
import {
  DEFAULT_CORTEX_GRAYS,
  NO_REGION,
  cortexGraysFromSrgb,
  fillVertexColors,
  fillVertexColorsByIndex,
  hexToLinearRgb,
  leftTriangleCount,
  parseSulcFile,
  regionAtFace,
  srgbToLinear,
  validateParcelFile,
  type CortexGrays,
} from "./surfaceParcels";

const EXPECTED = { atlasId: "atlas.human.prueba.x", referenceSpace: "espacio_x" };

// 2 vértices por hemisferio; región 0 = vértices 0-1 (izquierda),
// región 1 = vértice 2 (derecha), vértice 3 sin región (pared medial).
function goodFile() {
  return {
    schemaVersion: 1,
    atlasId: EXPECTED.atlasId,
    referenceSpace: EXPECTED.referenceSpace,
    surfaceVertexCount: { left: 2, right: 2 },
    regionIds: ["region.human.prueba.a", "region.human.prueba.b"],
    anchorVertices: [1, 2],
    vertexRegionIndex: [0, 0, 1, NO_REGION],
  };
}

describe("validateParcelFile", () => {
  it("acepta un archivo coherente con el atlas y los nodos cargados", () => {
    const result = validateParcelFile(goodFile(), EXPECTED, ["region.human.prueba.a"]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(Array.from(result.map.vertexRegionIndex)).toEqual([0, 0, 1, NO_REGION]);
  });

  it("rechaza otro atlas o otro espacio de referencia (nunca se mezclan)", () => {
    expect(validateParcelFile({ ...goodFile(), atlasId: "otro" }, EXPECTED, []).ok).toBe(false);
    expect(validateParcelFile({ ...goodFile(), referenceSpace: "MNI" }, EXPECTED, []).ok).toBe(false);
  });

  it("rechaza el archivo entero si falta alguna región cargada", () => {
    const result = validateParcelFile(goodFile(), EXPECTED, ["region.human.prueba.a", "region.human.prueba.z"]);
    expect(result.ok).toBe(false);
  });

  it("rechaza longitudes o índices incoherentes", () => {
    expect(validateParcelFile({ ...goodFile(), vertexRegionIndex: [0, 0, 1] }, EXPECTED, []).ok).toBe(false);
    expect(validateParcelFile({ ...goodFile(), vertexRegionIndex: [0, 0, 7, -1] }, EXPECTED, []).ok).toBe(false);
    expect(validateParcelFile({ ...goodFile(), anchorVertices: [1] }, EXPECTED, []).ok).toBe(false);
  });

  it("rechaza un vértice ancla que no pertenece a su región", () => {
    expect(validateParcelFile({ ...goodFile(), anchorVertices: [2, 2] }, EXPECTED, []).ok).toBe(false);
  });

  it("rechaza regionIds repetidos", () => {
    const file = { ...goodFile(), regionIds: ["region.human.prueba.a", "region.human.prueba.a"] };
    expect(validateParcelFile(file, EXPECTED, []).ok).toBe(false);
  });
});

describe("fillVertexColors", () => {
  const validated = validateParcelFile(goodFile(), EXPECTED, []);
  if (!validated.ok) throw new Error("fixture inválido");
  const map = validated.map;

  it("pinta con el color de la región cuando se pide, y en gris cuando no", () => {
    const out = new Float32Array(12);
    fillVertexColors(out, map, null, (r) => (r === 0 ? [1, 0, 0] : null));
    expect(Array.from(out.slice(0, 3))).toEqual([1, 0, 0]);
    // región 1 sin resaltar: gris (tres canales iguales)
    expect(out[6]).toBeCloseTo(out[7]);
    expect(out[7]).toBeCloseTo(out[8]);
    // pared medial: más oscura que una región sin resaltar
    expect(out[9]).toBeLessThan(out[6]);
  });

  it("los giros (mayor surco en el convenio del HCP) salen más claros que los surcos", () => {
    const out = new Float32Array(12);
    const sulc = new Float32Array([1, -1, 0, Number.NaN]);
    fillVertexColors(out, map, sulc, () => null);
    expect(out[0]).toBeGreaterThan(out[3]);
  });

  it("usa los grises del tema: surco, giro, pared medial y sin dato", () => {
    const grays: CortexGrays = {
      sulcus: [0.1, 0.2, 0.3],
      gyrus: [0.5, 0.6, 0.7],
      noData: [0.4, 0.4, 0.4],
      medialWall: [0.9, 0.8, 0.7],
    };
    // v0 fondo de surco, v1 corona de giro, v2 pared medial, v3 región sin dato de surco.
    const vertexIndex = new Int32Array([0, 0, NO_REGION, 0]);
    const sulc = new Float32Array([0, 1, Number.NaN, Number.NaN]);
    const out = new Float32Array(12);
    fillVertexColorsByIndex(out, vertexIndex, 1, sulc, () => null, grays);
    const expected = [0.1, 0.2, 0.3, 0.5, 0.6, 0.7, 0.9, 0.8, 0.7, 0.4, 0.4, 0.4];
    expected.forEach((value, i) => expect(out[i]).toBeCloseTo(value, 5));
  });

  it("fillVertexColors reenvía los grises a fillVertexColorsByIndex", () => {
    const grays: CortexGrays = { ...DEFAULT_CORTEX_GRAYS, medialWall: [0.9, 0.1, 0.1] };
    const out = new Float32Array(12);
    // vértice 3 del fixture es NO_REGION (pared medial); sulc null para
    // que no entre en juego el degradado surco-giro.
    fillVertexColors(out, map, null, () => null, grays);
    expect(out[9]).toBeCloseTo(0.9, 5);
    expect(out[10]).toBeCloseTo(0.1, 5);
    expect(out[11]).toBeCloseTo(0.1, 5);
  });
});

describe("regionAtFace", () => {
  const idx = Int32Array.from([0, 0, 1, NO_REGION]);
  it("usa la región mayoritaria del triángulo", () => {
    expect(regionAtFace(idx, 2, 0, 1)).toBe(0);
    expect(regionAtFace(idx, 0, 1, 2)).toBe(0);
  });
  it("con tres regiones distintas, la del primer vértice", () => {
    expect(regionAtFace(idx, 2, 0, 3)).toBe(1);
  });
});

describe("leftTriangleCount", () => {
  it("encuentra la división izquierda/derecha real", () => {
    expect(leftTriangleCount([0, 1, 0, 2, 3, 2], 2)).toBe(1);
  });
  it("devuelve null si un triángulo mezcla hemisferios o el orden no es izquierda-derecha", () => {
    expect(leftTriangleCount([0, 1, 2], 2)).toBeNull();
    expect(leftTriangleCount([2, 3, 2, 0, 1, 0], 2)).toBeNull();
  });
});

describe("parseSulcFile", () => {
  it("convierte null en NaN y comprueba la longitud", () => {
    const parsed = parseSulcFile({ values: [0.5, null] }, 2);
    expect(parsed?.[0]).toBeCloseTo(0.5);
    expect(Number.isNaN(parsed?.[1])).toBe(true);
    expect(parseSulcFile({ values: [0.5] }, 2)).toBeNull();
  });
});

describe("conversión de color", () => {
  it("convierte sRGB a lineal con la curva estándar", () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(1)).toBeCloseTo(1);
    expect(srgbToLinear(0.5)).toBeCloseTo(0.214, 3);
    expect(hexToLinearRgb("#ff0000")).toEqual([1, 0, 0]);
    expect(hexToLinearRgb("no-es-un-color")).toBeNull();
  });

  it("cortexGraysFromSrgb con los tokens de siempre da DEFAULT_CORTEX_GRAYS", () => {
    const grays = cortexGraysFromSrgb({
      cortexSulcus: [0.35, 0.35, 0.35],
      cortexGyrus: [0.72, 0.72, 0.72],
      cortexNoData: [0.55, 0.55, 0.55],
      cortexMedialWall: [0.25, 0.25, 0.25],
    });
    expect(grays).toEqual(DEFAULT_CORTEX_GRAYS);
  });
});
