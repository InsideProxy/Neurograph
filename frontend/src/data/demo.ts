// DATOS DE DEMOSTRACIÓN — SYNTHETIC / ILLUSTRATIVE.
// No representan ninguna medición real. Sirven únicamente para probar que
// el connectograma y el cerebro 3D se renderizan y se sincronizan
// correctamente (sección 27: "primera versión funcional"). En cuanto
// exista la API real (Fase 3-4), estos datos se sustituyen por una
// llamada a SEARCH_REGION / FIND_CONNECTIONS.
import type { GraphConnection, GraphNode } from "../types/domain";

export const DEMO_NODES: GraphNode[] = [
  { id: "region.human.demo.prefrontal", label: "Corteza Prefrontal", network: "executive", position3d: [0, 2.2, 1.2] },
  { id: "region.human.demo.episodic_memory", label: "Memoria Episódica", network: "memory", position3d: [1.6, 0.5, -0.8] },
  { id: "region.human.demo.attention", label: "Sistema Atencional", network: "attention", position3d: [-1.6, 0.8, 0.6] },
  { id: "region.human.demo.limbic", label: "Sistema Límbico", network: "limbic", position3d: [0.8, -1.4, -0.6] },
  { id: "region.human.demo.language", label: "Lenguaje", network: "language", position3d: [1.8, -0.6, 0.9] },
  { id: "region.human.demo.executive_control", label: "Control Ejecutivo", network: "executive", position3d: [-0.4, -1.8, 1.0] },
  { id: "region.human.demo.vision", label: "Visión", network: "sensory", position3d: [-1.6, -1.0, -0.7] },
  { id: "region.human.demo.motor", label: "Moción y Acción", network: "motor", position3d: [-1.8, 0.4, -1.0] },
];

export const DEMO_CONNECTIONS: GraphConnection[] = [
  { id: "conn.demo.1", source: "region.human.demo.prefrontal", target: "region.human.demo.episodic_memory", type: "structural", weight: 0.73 },
  { id: "conn.demo.2", source: "region.human.demo.prefrontal", target: "region.human.demo.attention", type: "functional", weight: 0.55 },
  { id: "conn.demo.3", source: "region.human.demo.language", target: "region.human.demo.executive_control", type: "structural", weight: 0.41 },
  { id: "conn.demo.4", source: "region.human.demo.vision", target: "region.human.demo.attention", type: "structural", weight: 0.62 },
  { id: "conn.demo.5", source: "region.human.demo.motor", target: "region.human.demo.executive_control", type: "effective", weight: 0.38 },
  { id: "conn.demo.6", source: "region.human.demo.limbic", target: "region.human.demo.episodic_memory", type: "structural", weight: 0.67 },
];
