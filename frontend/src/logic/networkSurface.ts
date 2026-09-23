// Mapas ORIGINALES de redes, vértice a vértice, sobre fs_LR 32k (decisión
// 73 de docs/analisis-arquitectura.md, 23/09/2026): Yeo et al. 2011 (7 y
// 17 redes) y comunidades de Power et al. 2011, tal y como vienen en el
// RSN-networks.32k_fs_LR.dlabel.nii del HCP (archivos generados por
// scripts/generate_network_surface_maps.py). Complementan -- nunca
// sustituyen -- la red asignada a cada región por voto mayoritario: aquí
// se ve dónde pasa de verdad la frontera entre redes, también DENTRO de
// una región.
//
// Mismo principio que surfaceParcels.ts: un archivo se rechaza entero si
// no es de la clasificación pedida o no encaja con la superficie en la
// que se va a pintar -- nunca se pinta "lo que cuadre".

import { NO_REGION } from "./surfaceParcels";

export const NO_NETWORK = -1;

// Clasificaciones con mapa vértice a vértice publicado en
// frontend/public/parcels/networks/. Cole-Anticevic y Gordon 333 no
// están a propósito: asignan la red a regiones ENTERAS, así que su mapa
// vértice a vértice sería idéntico al de "regiones pintadas".
export const NETWORK_SURFACE_URL_BY_SOURCE: Record<string, string> = {
  "yeo2011-7": "/parcels/networks/yeo2011-7.fslr32k.json",
  "yeo2011-17": "/parcels/networks/yeo2011-17.fslr32k.json",
  power2011: "/parcels/networks/power2011.fslr32k.json",
};

export interface SurfaceNetwork {
  slug: string;
  name: string;
  color: string;
}

export interface NetworkSurfaceMap {
  networkSource: string;
  nVerticesLeft: number;
  nVerticesRight: number;
  networks: SurfaceNetwork[];
  // Vértice global (izquierda primero) -> índice en `networks`, o NO_NETWORK.
  vertexNetworkIndex: Int32Array;
  provenance: string | null;
}

export type NetworkSurfaceValidation = { ok: true; map: NetworkSurfaceMap } | { ok: false; error: string };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function validateNetworkSurfaceFile(
  raw: unknown,
  expected: { networkSource: string; nVerticesLeft: number; nVerticesRight: number },
): NetworkSurfaceValidation {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "El mapa de redes por vértice no es un objeto JSON." };
  }
  const file = raw as Record<string, unknown>;
  if (file.schemaVersion !== 1) {
    return { ok: false, error: `schemaVersion inesperado (${JSON.stringify(file.schemaVersion)}).` };
  }
  if (file.networkSource !== expected.networkSource) {
    return {
      ok: false,
      error: `El mapa es de la clasificación '${String(file.networkSource)}', no de '${expected.networkSource}'.`,
    };
  }
  if (file.surfaceMesh !== "fs_LR_32k" || file.vertexOrder !== "left_then_right") {
    return { ok: false, error: "El mapa de redes no está sobre fs_LR 32k con el orden izquierda-derecha esperado." };
  }
  const counts = file.surfaceVertexCount as { left?: unknown; right?: unknown } | undefined;
  if (counts?.left !== expected.nVerticesLeft || counts?.right !== expected.nVerticesRight) {
    return {
      ok: false,
      error:
        `El mapa de redes tiene ${String(counts?.left)}+${String(counts?.right)} vértices y la superficie ` +
        `${expected.nVerticesLeft}+${expected.nVerticesRight}: no es la misma malla.`,
    };
  }
  const networks = file.networks;
  if (!Array.isArray(networks) || networks.length === 0) {
    return { ok: false, error: "El mapa de redes no trae ninguna red." };
  }
  const parsed: SurfaceNetwork[] = [];
  for (const n of networks) {
    const entry = n as Record<string, unknown>;
    if (typeof entry.slug !== "string" || typeof entry.name !== "string" || typeof entry.color !== "string") {
      return { ok: false, error: "Una red del mapa no tiene slug, nombre y color." };
    }
    if (!entry.slug.startsWith(`${expected.networkSource}.`)) {
      return { ok: false, error: `La red '${entry.slug}' no pertenece a la clasificación '${expected.networkSource}'.` };
    }
    if (!HEX_COLOR.test(entry.color)) {
      return { ok: false, error: `Color no válido para '${entry.slug}'.` };
    }
    parsed.push({ slug: entry.slug, name: entry.name, color: entry.color });
  }
  if (new Set(parsed.map((n) => n.slug)).size !== parsed.length) {
    return { ok: false, error: "El mapa de redes tiene slugs repetidos." };
  }
  const index = file.vertexNetworkIndex;
  const total = expected.nVerticesLeft + expected.nVerticesRight;
  if (!Array.isArray(index) || index.length !== total) {
    return { ok: false, error: `vertexNetworkIndex debe tener exactamente ${total} valores.` };
  }
  for (const i of index) {
    if (!Number.isInteger(i) || (i !== NO_NETWORK && (i < 0 || i >= parsed.length))) {
      return { ok: false, error: "vertexNetworkIndex apunta a una red inexistente." };
    }
  }
  return {
    ok: true,
    map: {
      networkSource: expected.networkSource,
      nVerticesLeft: expected.nVerticesLeft,
      nVerticesRight: expected.nVerticesRight,
      networks: parsed,
      vertexNetworkIndex: Int32Array.from(index as number[]),
      provenance: typeof file.provenance === "string" ? file.provenance : null,
    },
  };
}

// Qué red colorea cada vértice en el modo "redes vértice a vértice":
// índice de red del vértice, o NO_NETWORK si ese vértice debe quedar en
// gris -- porque no tiene red en el mapa, porque su red está oculta en
// los filtros, o porque hay una selección y el vértice no cae dentro de
// ninguna región seleccionada (con selección, se pinta solo DENTRO de las
// regiones del foco, para ver cómo se reparten entre redes).
export function vertexNetworkForDisplay(
  networkMap: NetworkSurfaceMap,
  vertexRegionIndex: Int32Array,
  visibleNetwork: (networkIndex: number) => boolean,
  focusRegion: ((regionIndex: number) => boolean) | null,
): Int32Array {
  const n = networkMap.vertexNetworkIndex.length;
  if (vertexRegionIndex.length !== n) throw new Error("mapa de regiones y de redes con distinto número de vértices");
  const visible = networkMap.networks.map((_, i) => visibleNetwork(i));
  const out = new Int32Array(n);
  for (let v = 0; v < n; v++) {
    const net = networkMap.vertexNetworkIndex[v];
    if (net === NO_NETWORK || !visible[net]) {
      out[v] = NO_NETWORK;
      continue;
    }
    if (focusRegion) {
      const region = vertexRegionIndex[v];
      if (region === NO_REGION || !focusRegion(region)) {
        out[v] = NO_NETWORK;
        continue;
      }
    }
    out[v] = net;
  }
  return out;
}
