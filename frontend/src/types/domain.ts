// Tipos mínimos del dominio para el frontend.
//
// TEMPORAL: esta forma debe generarse a partir del esquema de la API
// (backend/api) en cuanto exista un contrato OpenAPI estable, para que el
// frontend nunca defina por su cuenta la forma de una entidad científica
// (sección 21: todo objeto visual debe ser trazable hasta su ID científico).
export interface GraphNode {
  id: string; // identificador científico estable, ej. "region.human.hcp-mmp1.area44"
  label: string;
  network: string;
  position3d: [number, number, number];
}

export interface GraphConnection {
  id: string;
  source: string; // GraphNode.id
  target: string; // GraphNode.id
  type: "structural" | "functional" | "effective";
  weight: number;
}
