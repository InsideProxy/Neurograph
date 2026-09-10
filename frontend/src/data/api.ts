// Carga de nodos reales desde la API de NeuroGraph (backend/api). Si la
// API no responde (no está levantada, o la base de datos aún no tiene
// datos), quien llama debe caer de vuelta a los datos de demostración —
// nunca mezclar ambos en la misma vista (sección 24: nunca presentar lo
// real y lo ilustrativo como si fueran lo mismo).
import type { GraphConnection, GraphNode, HybridEdge, HybridNode, InducedTract, Point3D, TractGeometry, TractSummary } from "../types/domain";

// Exportada (01/09/2026, decisión 38) para que speciesApi.ts use
// exactamente esta misma URL base -- nunca una segunda constante
// duplicada que pudiera desincronizarse en silencio si esto cambia.
export const API_BASE_URL = "http://127.0.0.1:8420";

// Factor de escala puramente visual: las coordenadas reales vienen en
// milímetros aproximados de superficie cortical (rango ~-80 a 80); esta
// vista está calibrada para el rango pequeño de los datos de demostración
// (~-2 a 2). No es una transformación científica: la coordenada real, sin
// escalar, sigue siendo la que se guarda en la base de datos — esto solo
// afecta a dónde se dibuja el punto en pantalla. Exportado (30/08/2026,
// decisión 22) porque Brain3D.tsx tiene que aplicar EXACTAMENTE este mismo
// factor a la malla de fondo del cerebro 3D -- la malla se genera en
// milímetros reales sin escalar (scripts/generate_brain_meshes.py), así
// que si algún día este valor cambia aquí, la malla tiene que moverse con
// él automáticamente, nunca quedarse con una copia separada que se
// desincronice en silencio.
export const DISPLAY_SCALE = 1 / 40;

interface ApiRegionNode {
  id: string;
  label: string;
  abbreviation: string | null;
  hemisphere: "L" | "R" | null;
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
    abbreviation: row.abbreviation,
    hemisphere: row.hemisphere,
    network: row.network,
    position3d: row.position3d.map((v) => v * DISPLAY_SCALE) as [number, number, number],
    referenceSpace: row.reference_space,
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


interface ApiTractCitation {
  id: string;
  name: string;
  doi: string | null;
  year: number | null;
}

interface ApiInducedTract {
  id: string;
  name: string;
  abbreviation: string | null;
  region_ids: string[];
  studies: ApiTractCitation[];
}

interface ApiInducedConnectivity {
  region_ids: string[];
  connections: ApiConnectionEdge[];
  tracts: ApiInducedTract[];
}

// Tractos con nombre (Yeh 2022) que tocan dos o más de las regiones
// seleccionadas, con su cita real -- ver GET /connectivity/induced y
// decisión 13 de docs/analisis-arquitectura.md. Solo tiene sentido con
// datos reales: en modo demostración no existe ningún tracto real que
// consultar, así que quien llama nunca debe invocar esto con datos de
// demostración (App.tsx lo respeta).
export async function fetchInducedTracts(regionIds: string[]): Promise<InducedTract[]> {
  if (regionIds.length < 2) return [];

  const url = new URL("/connectivity/induced", API_BASE_URL);
  for (const id of regionIds) url.searchParams.append("region_ids", id);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`la API respondió ${response.status}`);
  }
  const data: ApiInducedConnectivity = await response.json();
  return data.tracts.map((tract) => ({
    id: tract.id,
    name: tract.name,
    abbreviation: tract.abbreviation,
    regionIds: tract.region_ids,
    studies: tract.studies.map((study) => ({
      id: study.id,
      name: study.name,
      doi: study.doi,
      year: study.year,
    })),
  }));
}


interface ApiTractSummary {
  id: string;
  name: string;
  abbreviation: string | null;
  streamline_count_real: number;
  streamline_count_shown: number;
  studies: ApiTractCitation[];
  reference_space: string;
}

// Los 41 tractos reales de ORG-800FC-100HCP que SÍ tienen geometría 3D
// (nunca los 52 de Yeh 2022, sin geometría) -- para la lista de
// selección de la pestaña de tractografía. Ligero: no trae streamlines.
export async function fetchTractSummaries(): Promise<TractSummary[]> {
  const response = await fetch(new URL("/tracts/geometry", API_BASE_URL).toString());
  if (!response.ok) {
    throw new Error(`la API respondió ${response.status}`);
  }
  const rows: ApiTractSummary[] = await response.json();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    abbreviation: row.abbreviation,
    streamlineCountReal: row.streamline_count_real,
    streamlineCountShown: row.streamline_count_shown,
    studies: row.studies.map((study) => ({
      id: study.id,
      name: study.name,
      doi: study.doi,
      year: study.year,
    })),
    referenceSpace: row.reference_space,
  }));
}

interface ApiTractGeometry {
  id: string;
  name: string;
  abbreviation: string | null;
  streamline_count_real: number;
  streamline_count_shown: number;
  streamlines: Point3D[][];
  reference_space: string;
}

// Geometría real (streamlines) de un único tracto -- pedida solo cuando
// la usuaria lo marca en la lista, nunca los 41 de golpe (puede pesar
// varios MB por tracto). Se aplica el mismo DISPLAY_SCALE que
// Brain3D.tsx -- comprobado empíricamente que el rango real de estas
// coordenadas (~-60 a 60) es del mismo orden de magnitud que las
// coordenadas MNI152 de las regiones (~-80 a 80), así que reutilizar el
// factor da un tamaño en pantalla comparable -- decisión puramente
// visual, nunca una afirmación de que los dos espacios de referencia
// coinciden (siguen sin mezclarse: esta vista nunca combina esta
// geometría con `position3d` de `GraphNode`).
export async function fetchTractGeometry(tractId: string): Promise<TractGeometry> {
  const response = await fetch(
    new URL(`/tracts/${encodeURIComponent(tractId)}/geometry`, API_BASE_URL).toString()
  );
  if (!response.ok) {
    throw new Error(`la API respondió ${response.status}`);
  }
  const row: ApiTractGeometry = await response.json();
  return {
    id: row.id,
    name: row.name,
    abbreviation: row.abbreviation,
    streamlineCountReal: row.streamline_count_real,
    streamlineCountShown: row.streamline_count_shown,
    streamlines: row.streamlines.map(
      (streamline) => streamline.map((pt) => pt.map((v) => v * DISPLAY_SCALE) as Point3D)
    ),
    referenceSpace: row.reference_space,
  };
}

interface ApiHybridNode {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  reference_space: string;
}

// Los 176 nodos reales de la cuarta pestaña de tractografía (decisión
// 66, 09/09/2026) -- etiquetas del wmparc de ORG-800FC-100HCP con
// nombre anatómico verificado. Mismo DISPLAY_SCALE que el resto de esta
// sección (mismo espacio de referencia real, ORG_800FC_100HCP_groupwise).
export async function fetchHybridNodes(): Promise<HybridNode[]> {
  const response = await fetch(new URL("/tractography/nodes", API_BASE_URL).toString());
  if (!response.ok) {
    throw new Error(`la API respondió ${response.status}`);
  }
  const rows: ApiHybridNode[] = await response.json();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    x: row.x * DISPLAY_SCALE,
    y: row.y * DISPLAY_SCALE,
    z: row.z * DISPLAY_SCALE,
    referenceSpace: row.reference_space,
  }));
}

interface ApiHybridEdge {
  node_a_id: string;
  node_b_id: string;
  tract_codes: string[];
  streamline_count_real: number;
  streamline_count_shown: number;
  streamlines: Point3D[][];
  reference_space: string;
}

// Aristas reales entre los nodos marcados -- pedida solo cuando hay 2 o
// más marcados (condición estructural, no un umbral: una arista conecta
// dos nodos por definición, mismo criterio que fetchInducedTracts).
export async function fetchHybridEdges(nodeIds: string[]): Promise<HybridEdge[]> {
  if (nodeIds.length < 2) return [];

  const url = new URL("/tractography/edges", API_BASE_URL);
  for (const id of nodeIds) url.searchParams.append("node_ids", id);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`la API respondió ${response.status}`);
  }
  const rows: ApiHybridEdge[] = await response.json();
  return rows.map((row) => ({
    nodeAId: row.node_a_id,
    nodeBId: row.node_b_id,
    tractCodes: row.tract_codes,
    streamlineCountReal: row.streamline_count_real,
    streamlineCountShown: row.streamline_count_shown,
    streamlines: row.streamlines.map(
      (streamline) => streamline.map((pt) => pt.map((v) => v * DISPLAY_SCALE) as Point3D)
    ),
    referenceSpace: row.reference_space,
  }));
}
