// Carga de nodos reales desde la API de NeuroGraph (backend/api). Si la
// API no responde (no está levantada, o la base de datos aún no tiene
// datos), quien llama debe caer de vuelta a los datos de demostración —
// nunca mezclar ambos en la misma vista (sección 24: nunca presentar lo
// real y lo ilustrativo como si fueran lo mismo).
import type { GraphConnection, GraphNode } from "../types/domain";

const API_BASE_URL = "http://127.0.0.1:8420";

// Factor de escala puramente visual: las coordenadas reales vienen en
// milímetros aproximados de superficie cortical (rango ~-80 a 80); esta
// vista está calibrada para el rango pequeño de los datos de demostración
// (~-2 a 2). No es una transformación científica: la coordenada real, sin
// escalar, sigue siendo la que se guarda en la base de datos — esto solo
// afecta a dónde se dibuja el punto en pantalla.
const DISPLAY_SCALE = 1 / 40;

interface ApiRegionNode {
  id: string;
  label: string;
  network: string;
  position3d: [number, number, number];
  reference_space: string;
}

export async function fetchRealNodes(atlasId?: string): Promise<GraphNode[]> {
  const url = new URL("/regions", API_BASE_URL);
  if (atlasId) url.searchParams.set("atlas_id", atlasId);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`la API respondió ${response.status}`);
  }
  const rows: ApiRegionNode[] = await response.json();
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    network: row.network,
    position3d: row.position3d.map((v) => v * DISPLAY_SCALE) as [number, number, number],
  }));
}

interface ApiConnectionEdge {
  id: string;
  source: string;
  target: string;
  type: "structural" | "functional" | "effective";
  weight: number;
  evidenceLevel: "direct" | "indirect" | "hypothetical";
}

export async function fetchRealConnections(atlasId?: string): Promise<GraphConnection[]> {
  const url = new URL("/connections", API_BASE_URL);
  if (atlasId) url.searchParams.set("atlas_id", atlasId);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`la API respondió ${response.status}`);
  }
  const rows: ApiConnectionEdge[] = await response.json();
  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    target: row.target,
    type: row.type,
    weight: row.weight,
    evidenceLevel: row.evidenceLevel,
  }));
}
