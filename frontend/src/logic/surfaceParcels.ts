// Lógica pura (sin three.js ni React) para pintar las regiones reales
// sobre la corteza del cerebro 3D -- decisión 72 de
// docs/analisis-arquitectura.md, 23/09/2026. Los archivos que valida y
// usa este módulo los genera scripts/generate_surface_parcels.py a partir
// de los .dlabel.nii reales (ver el docstring de ese script y de
// backend/ingestion/neuroimaging/surface_parcels.py).
//
// Principio de siempre (sección 24): nunca se pinta nada que no se haya
// comprobado. Un archivo de regiones se rechaza entero si no corresponde
// al atlas y al espacio de referencia de los nodos que de verdad están
// cargados, o si alguno de esos nodos no aparece en él -- nunca se pinta
// "lo que sí cuadra" descartando el resto en silencio.

export const NO_REGION = -1;

export interface SurfaceParcelMap {
  atlasId: string;
  referenceSpace: string;
  nVerticesLeft: number;
  nVerticesRight: number;
  regionIds: string[];
  // Índice de región -> índice global (izquierda primero) del vértice ancla:
  // el mismo vértice cuya coordenada midthickness guarda la base de datos.
  anchorVertices: number[];
  // Vértice global -> índice de región, o NO_REGION (pared medial / sin etiqueta).
  vertexRegionIndex: Int32Array;
}

export type ParcelValidation = { ok: true; map: SurfaceParcelMap } | { ok: false; error: string };

function isIntArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => Number.isInteger(v));
}

export function validateParcelFile(
  raw: unknown,
  expected: { atlasId: string; referenceSpace: string },
  loadedNodeIds: string[],
): ParcelValidation {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "El archivo de regiones de superficie no es un objeto JSON." };
  }
  const file = raw as Record<string, unknown>;
  if (file.schemaVersion !== 1) {
    return { ok: false, error: `schemaVersion inesperado (${JSON.stringify(file.schemaVersion)}).` };
  }
  if (file.atlasId !== expected.atlasId) {
    return {
      ok: false,
      error: `El archivo de regiones es de '${String(file.atlasId)}', no del atlas activo '${expected.atlasId}'.`,
    };
  }
  if (file.referenceSpace !== expected.referenceSpace) {
    return {
      ok: false,
      error:
        `Espacio de referencia distinto: archivo '${String(file.referenceSpace)}', ` +
        `nodos '${expected.referenceSpace}'. No se mezclan espacios.`,
    };
  }
  const counts = file.surfaceVertexCount as { left?: unknown; right?: unknown } | undefined;
  const nLeft = counts?.left;
  const nRight = counts?.right;
  if (!Number.isInteger(nLeft) || !Number.isInteger(nRight)) {
    return { ok: false, error: "Falta surfaceVertexCount.left/right." };
  }
  const total = (nLeft as number) + (nRight as number);
  const regionIds = file.regionIds;
  const anchors = file.anchorVertices;
  const vertexRegion = file.vertexRegionIndex;
  if (!Array.isArray(regionIds) || !regionIds.every((r) => typeof r === "string")) {
    return { ok: false, error: "regionIds no es una lista de cadenas." };
  }
  if (new Set(regionIds).size !== regionIds.length) {
    return { ok: false, error: "regionIds tiene identificadores repetidos." };
  }
  if (!isIntArray(anchors) || anchors.length !== regionIds.length) {
    return { ok: false, error: "anchorVertices no tiene un vértice entero por región." };
  }
  if (anchors.some((a) => a < 0 || a >= total)) {
    return { ok: false, error: "anchorVertices contiene un vértice fuera de la superficie." };
  }
  if (!isIntArray(vertexRegion) || vertexRegion.length !== total) {
    return { ok: false, error: `vertexRegionIndex debe tener exactamente ${total} enteros.` };
  }
  if (vertexRegion.some((i) => i !== NO_REGION && (i < 0 || i >= regionIds.length))) {
    return { ok: false, error: "vertexRegionIndex apunta a una región inexistente." };
  }
  // Cada ancla tiene que pertenecer a su propia región -- si no, el
  // archivo está corrupto o no corresponde a esta superficie.
  for (let r = 0; r < anchors.length; r++) {
    if (vertexRegion[anchors[r]] !== r) {
      return { ok: false, error: `El vértice ancla de ${regionIds[r]} no pertenece a esa región.` };
    }
  }
  const known = new Set(regionIds);
  const missing = loadedNodeIds.filter((id) => !known.has(id));
  if (missing.length > 0) {
    return {
      ok: false,
      error:
        `${missing.length} región(es) cargada(s) no aparecen en el archivo de superficie ` +
        `(p. ej. ${missing[0]}). No se pinta nada para no mostrar un mapa incompleto.`,
    };
  }
  return {
    ok: true,
    map: {
      atlasId: expected.atlasId,
      referenceSpace: expected.referenceSpace,
      nVerticesLeft: nLeft as number,
      nVerticesRight: nRight as number,
      regionIds: regionIds as string[],
      anchorVertices: anchors,
      vertexRegionIndex: Int32Array.from(vertexRegion),
    },
  };
}

// Profundidad de surco real por vértice (NaN = pared medial / sin dato).
// En el archivo del HCP, mayor valor = corona de giro (comprobado en
// scripts/generate_surface_parcels.py, que aborta si no es así).
export function parseSulcFile(raw: unknown, expectedVertexCount: number): Float32Array | null {
  if (typeof raw !== "object" || raw === null) return null;
  const values = (raw as { values?: unknown }).values;
  if (!Array.isArray(values) || values.length !== expectedVertexCount) return null;
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    out[i] = typeof v === "number" && Number.isFinite(v) ? v : Number.NaN;
  }
  return out;
}

export type RGB = [number, number, number];

// Gris de fondo según el surco: giros más claros, surcos más oscuros --
// la convención habitual de visores de superficie, para que la anatomía
// siga leyéndose en las superficies infladas. Sin dato de surco, un gris
// medio uniforme; en la pared medial, más oscuro para distinguirla.
//
// IMPORTANTE: todos los colores de este módulo están en RGB LINEAL (el
// espacio de trabajo de three.js para atributos de color por vértice),
// no en sRGB como los hex de theme/networks.ts -- por eso los grises se
// dan ya convertidos (sRGB 0.35 / 0.72 / 0.55 / 0.25) y los colores de
// red deben pasar por `hexToLinearRgb`. Sin esta conversión, los
// colores reales de cada red se verían lavados en la superficie y no
// coincidirían con los del connectograma.
//
// Grises de la corteza en RGB lineal. Cada tema tiene los suyos (D3,
// DrawTokens de theme/themes.ts). Estos son los de siempre (tema 1).
export interface CortexGrays {
  sulcus: RGB;
  gyrus: RGB;
  noData: RGB;
  medialWall: RGB;
}

function uniformGray(srgb: number): RGB {
  const v = srgbToLinear(srgb);
  return [v, v, v];
}

export const DEFAULT_CORTEX_GRAYS: CortexGrays = {
  sulcus: uniformGray(0.35),
  gyrus: uniformGray(0.72),
  noData: uniformGray(0.55),
  medialWall: uniformGray(0.25),
};

// Tokens de un tema (sRGB 0-1) a RGB lineal.
export function cortexGraysFromSrgb(tokens: {
  cortexSulcus: readonly [number, number, number];
  cortexGyrus: readonly [number, number, number];
  cortexNoData: readonly [number, number, number];
  cortexMedialWall: readonly [number, number, number];
}): CortexGrays {
  const lin = (c: readonly [number, number, number]): RGB => [
    srgbToLinear(c[0]),
    srgbToLinear(c[1]),
    srgbToLinear(c[2]),
  ];
  return {
    sulcus: lin(tokens.cortexSulcus),
    gyrus: lin(tokens.cortexGyrus),
    noData: lin(tokens.cortexNoData),
    medialWall: lin(tokens.cortexMedialWall),
  };
}

export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function sulcRange(sulc: Float32Array | null): [number, number] | null {
  if (!sulc) return null;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const v of sulc) {
    if (Number.isNaN(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return Number.isFinite(min) && max > min ? [min, max] : null;
}

// Rellena `out` (RGB lineal 0-1, 3 valores por vértice) con el color de
// cada vértice: el color de su región si `colorForRegion` devuelve uno,
// o gris sombreado por el surco si devuelve null (región no resaltada).
export function fillVertexColors(
  out: Float32Array,
  map: SurfaceParcelMap,
  sulc: Float32Array | null,
  colorForRegion: (regionIndex: number) => RGB | null,
  grays: CortexGrays = DEFAULT_CORTEX_GRAYS,
): void {
  fillVertexColorsByIndex(out, map.vertexRegionIndex, map.regionIds.length, sulc, colorForRegion, grays);
}

// Versión general (decisión 73): cada vértice tiene un índice de
// categoría (región, o red en el modo "redes vértice a vértice") o
// NO_REGION (-1); cada categoría, un color o null (= gris de fondo).
export function fillVertexColorsByIndex(
  out: Float32Array,
  vertexIndex: Int32Array,
  categoryCount: number,
  sulc: Float32Array | null,
  colorForCategory: (index: number) => RGB | null,
  grays: CortexGrays = DEFAULT_CORTEX_GRAYS,
): void {
  const n = vertexIndex.length;
  if (out.length !== n * 3) throw new Error("tamaño del búfer de colores incorrecto");
  const range = sulcRange(sulc);
  const categoryColors = new Array<RGB | null>(categoryCount);
  for (let r = 0; r < categoryCount; r++) categoryColors[r] = colorForCategory(r);

  for (let v = 0; v < n; v++) {
    const category = vertexIndex[v];
    const s = sulc ? sulc[v] : Number.NaN;
    const t = range && !Number.isNaN(s) ? (s - range[0]) / (range[1] - range[0]) : null;
    let r: number;
    let g: number;
    let b: number;
    if (t !== null) {
      r = grays.sulcus[0] + (grays.gyrus[0] - grays.sulcus[0]) * t;
      g = grays.sulcus[1] + (grays.gyrus[1] - grays.sulcus[1]) * t;
      b = grays.sulcus[2] + (grays.gyrus[2] - grays.sulcus[2]) * t;
    } else {
      const base = category === NO_REGION ? grays.medialWall : grays.noData;
      [r, g, b] = base;
    }

    const color = category === NO_REGION ? null : (categoryColors[category] ?? null);
    if (color) {
      // El color real de la red se conserva, solo algo más oscuro en los
      // surcos (factor 0.7-1.0) para no perder la forma de la corteza.
      const shade = t === null ? 1 : 0.7 + 0.3 * t;
      out[v * 3] = color[0] * shade;
      out[v * 3 + 1] = color[1] * shade;
      out[v * 3 + 2] = color[2] * shade;
    } else {
      out[v * 3] = r;
      out[v * 3 + 1] = g;
      out[v * 3 + 2] = b;
    }
  }
}

// Región de un triángulo tocado con el ratón: la que tengan al menos dos
// de sus tres vértices; si los tres son distintos (triángulo en la
// frontera exacta entre tres regiones), la del primer vértice. NO_REGION
// si esa mayoría es "sin región".
export function regionAtFace(vertexRegionIndex: Int32Array, a: number, b: number, c: number): number {
  const ra = vertexRegionIndex[a];
  const rb = vertexRegionIndex[b];
  const rc = vertexRegionIndex[c];
  if (rb === rc && rb !== ra) return rb;
  return ra;
}

// Número de triángulos del hemisferio izquierdo, si el búfer de índices
// está limpiamente dividido "primero izquierda, luego derecha" (así lo
// escribe scripts/generate_brain_meshes.py::build_fslr_mesh). Se
// comprueba de verdad en vez de suponerlo: devuelve null si algún
// triángulo mezcla hemisferios o el orden no es el esperado, y entonces
// la interfaz no ofrece ocultar un hemisferio.
export function leftTriangleCount(index: ArrayLike<number>, nVerticesLeft: number): number | null {
  if (index.length % 3 !== 0) return null;
  const triangles = index.length / 3;
  let split = -1;
  for (let t = 0; t < triangles; t++) {
    const a = index[t * 3];
    const b = index[t * 3 + 1];
    const c = index[t * 3 + 2];
    const left = a < nVerticesLeft && b < nVerticesLeft && c < nVerticesLeft;
    const right = a >= nVerticesLeft && b >= nVerticesLeft && c >= nVerticesLeft;
    if (!left && !right) return null;
    if (split === -1 && right) split = t;
    if (split !== -1 && left) return null;
  }
  return split === -1 ? triangles : split;
}

// Color hex sRGB (el formato de theme/networks.ts) -> RGB lineal.
export function hexToLinearRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return null;
  return [
    srgbToLinear(parseInt(m[1], 16) / 255),
    srgbToLinear(parseInt(m[2], 16) / 255),
    srgbToLinear(parseInt(m[3], 16) / 255),
  ];
}
