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
