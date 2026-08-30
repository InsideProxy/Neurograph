// DATOS DE DEMOSTRACIÓN — SYNTHETIC / ILLUSTRATIVE.
// No representan ninguna medición real. Sirven únicamente para probar que
// el connectograma y el cerebro 3D se renderizan y se sincronizan
// correctamente (sección 27: "primera versión funcional"). En cuanto
// exista la API real (Fase 3-4), estos datos se sustituyen por una
// llamada a SEARCH_REGION / FIND_CONNECTIONS.
import type { GraphConnection, GraphNode } from "../types/domain";

export const DEMO_NODES: GraphNode[] = [
  { id: "region.human.demo.prefrontal", label: "Corteza Prefrontal", abbreviation: "PFC", network: "executive", position3d: [0, 2.2, 1.2] },
  { id: "region.human.demo.episodic_memory", label: "Memoria Episódica", abbreviation: "MEP", network: "memory", position3d: [1.6, 0.5, -0.8] },
  { id: "region.human.demo.attention", label: "Sistema Atencional", abbreviation: "ATN", network: "attention", position3d: [-1.6, 0.8, 0.6] },
  { id: "region.human.demo.limbic", label: "Sistema Límbico", abbreviation: "LMB", network: "limbic", position3d: [0.8, -1.4, -0.6] },
  { id: "region.human.demo.language", label: "Lenguaje", abbreviation: "LNG", network: "language", position3d: [1.8, -0.6, 0.9] },
  { id: "region.human.demo.executive_control", label: "Control Ejecutivo", abbreviation: "EC", network: "executive", position3d: [-0.4, -1.8, 1.0] },
  { id: "region.human.demo.vision", label: "Visión", abbreviation: "VIS", network: "sensory", position3d: [-1.6, -1.0, -0.7] },
  { id: "region.human.demo.motor", label: "Moción y Acción", abbreviation: "MOT", network: "motor", position3d: [-1.8, 0.4, -1.0] },
];

export const DEMO_CONNECTIONS: GraphConnection[] = [
  { id: "conn.demo.1", source: "region.human.demo.prefrontal", target: "region.human.demo.episodic_memory", type: "structural", weight: 0.73, evidenceLevel: "direct" },
  { id: "conn.demo.2", source: "region.human.demo.prefrontal", target: "region.human.demo.attention", type: "functional", weight: 0.55, evidenceLevel: "direct" },
  { id: "conn.demo.3", source: "region.human.demo.language", target: "region.human.demo.executive_control", type: "structural", weight: 0.41, evidenceLevel: "indirect" },
  { id: "conn.demo.4", source: "region.human.demo.vision", target: "region.human.demo.attention", type: "structural", weight: 0.62, evidenceLevel: "direct" },
  { id: "conn.demo.5", source: "region.human.demo.motor", target: "region.human.demo.executive_control", type: "effective", weight: 0.38, evidenceLevel: "direct" },
  { id: "conn.demo.6", source: "region.human.demo.limbic", target: "region.human.demo.episodic_memory", type: "structural", weight: 0.67, evidenceLevel: "direct" },
  { id: "conn.demo.7", source: "region.human.demo.attention", target: "region.human.demo.executive_control", type: "effective", weight: 0.3, evidenceLevel: "hypothetical" },
];
