// Tipos mínimos del dominio para el frontend.
//
// TEMPORAL: esta forma debe generarse a partir del esquema de la API
// (backend/api) en cuanto exista un contrato OpenAPI estable, para que el
// frontend nunca defina por su cuenta la forma de una entidad científica
// (sección 21: todo objeto visual debe ser trazable hasta su ID científico).
export interface GraphNode {
  id: string; // identificador científico estable, ej. "region.human.hcp-mmp1.area44"
  label: string;
  // Código corto para dibujar junto al nodo (p. ej. "V1"), migración
  // 0007 del backend. `null` cuando la ingesta de este atlas todavía no
  // lo tiene calculado/registrado -- nunca se inventa uno a partir de
  // `label` (sección 24).
  abbreviation: string | null;
  // "L", "R" o null -- migración 0008 del backend. `null` puede
  // significar "esta ingesta todavía no lo tiene backfillado" o "esta
  // región no tiene lateralidad real" (p. ej. el tronco del encéfalo):
  // nunca se infiere del signo de position3d[0] -- ver Hemisferios.tsx.
  hemisphere: "L" | "R" | null;
  network: string;
  position3d: [number, number, number];
  // Espacio de referencia real de `position3d` (sección 2.7 / riesgo 5 de
  // docs/analisis-arquitectura.md), p. ej. "fsLR_32k_S1200_groupavg_
  // midthickness_MSMAll" o "MNI152_FSL_2mm" -- nunca inventado ni supuesto,
  // siempre el valor real que ya devuelve `coordinate.reference_space` en
  // el backend (backend/api/routers/regions.py). `null` en los datos de
  // demostración (sección 24: son sintéticos, no viven en ningún espacio
  // de referencia real -- por eso Brain3D.tsx nunca les superpone una
  // malla anatómica real, decisión 22 del 30/08/2026). Se usa para elegir
  // -- nunca adivinar -- qué malla de fondo del cerebro 3D corresponde a
  // cada atlas, dado que HCP-MMP1.0/Gordon 333 y Brainnetome/subcórtex
  // del HCP viven en dos espacios genuinamente distintos.
  referenceSpace: string | null;
}

export type EvidenceLevel = "direct" | "indirect" | "hypothetical";

export interface GraphConnection {
  id: string;
  source: string; // GraphNode.id
  target: string; // GraphNode.id
  type: "structural" | "functional" | "effective";
  weight: number;
  // Sección 24: un dato observado directamente, una inferencia indirecta y
  // una hipótesis nunca deben mostrarse igual. "direct" = línea continua;
  // "indirect"/"hypothetical" = línea discontinua (sección 5.1).
  evidenceLevel: EvidenceLevel;
}

// Cita real de un estudio que respalda un tracto (nunca una referencia
// genérica ni inventada -- sección 24). `doi`/`year` pueden ser `null`
// si el estudio real todavía no los tiene registrados.
export interface StudyCitation {
  id: string;
  name: string;
  doi: string | null;
  year: number | null;
}

// Un tracto con nombre (Yeh 2022) que toca dos o más regiones de la
// selección múltiple actual -- ver GET /connectivity/induced y decisión
// 13 de docs/analisis-arquitectura.md.
export interface InducedTract {
  id: string;
  name: string;
  abbreviation: string | null;
  regionIds: string[];
  studies: StudyCitation[];
}
