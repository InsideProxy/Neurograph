// Datos de prueba del tour guiado (D11 de docs/decisiones-diseno.md), solo
// para las pruebas: la app no importa este módulo. Imitan lo que el tour
// necesita de HCP-MMP1.0 con las redes de Cole-Anticevic, comprobado contra la
// API local (GET /regions y /connections, 25/09/2026):
// - 360 regiones, 180 por hemisferio, y las 64 620 conexiones entre todas;
// - Frontoparietal, 50 regiones; Lenguaje, 23; Visual, 6;
// - IFJp de los dos lados en Frontoparietal; TE1m izquierda en Por defecto y
//   derecha en Frontoparietal; V1 de los dos lados en Visual.
// El resto de regiones y los pesos son inventados, con una semilla fija.
import type { GraphConnection, GraphNode } from "../types/domain";

const NETWORK_SIZES: Record<string, number> = {
  "cole-anticevic.auditory": 15,
  "cole-anticevic.cingulo-opercular": 56,
  "cole-anticevic.default": 77,
  "cole-anticevic.dorsal-attention": 23,
  "cole-anticevic.frontoparietal": 50,
  "cole-anticevic.language": 23,
  "cole-anticevic.orbito-affective": 6,
  "cole-anticevic.posterior-multimodal": 7,
  "cole-anticevic.somatomotor": 39,
  "cole-anticevic.ventral-multimodal": 4,
  "cole-anticevic.visual": 6,
  "cole-anticevic.visual2": 54,
};

// Las regiones con nombre del ejemplo: [abreviatura, hemisferio, red].
const NAMED: [string, "L" | "R", string][] = [
  ["V1", "R", "cole-anticevic.visual"],
  ["IFJp", "R", "cole-anticevic.frontoparietal"],
  ["TE1m", "R", "cole-anticevic.frontoparietal"],
  ["V1", "L", "cole-anticevic.visual"],
  ["IFJp", "L", "cole-anticevic.frontoparietal"],
  ["TE1m", "L", "cole-anticevic.default"],
];

function region(abbreviation: string, hemisphere: "L" | "R", network: string): GraphNode {
  const side = hemisphere === "L" ? "izquierdo" : "derecho";
  return {
    id: `region.human.hcp-mmp1.${hemisphere.toLowerCase()}_${abbreviation.toLowerCase()}`,
    label: `Area ${abbreviation} (hemisferio ${side})`,
    abbreviation,
    hemisphere,
    network,
    position3d: [0, 0, 0],
    referenceSpace: "fsLR_32k_S1200_groupavg_midthickness_MSMAll",
  };
}

// Las 360 regiones: primero las con nombre y luego las demás, repartidas por
// red hasta llenar cada una, alternando hemisferio.
export function hcpLikeNodes(): GraphNode[] {
  const remaining = { ...NETWORK_SIZES };
  const nodes = NAMED.map(([abbreviation, hemisphere, network]) => {
    remaining[network] -= 1;
    return region(abbreviation, hemisphere, network);
  });
  let counter = 0;
  for (const [network, count] of Object.entries(remaining)) {
    for (let i = 0; i < count; i++) {
      counter += 1;
      nodes.push(region(`X${counter}`, counter % 2 === 0 ? "L" : "R", network));
    }
  }
  return nodes;
}

// Todas las parejas, con pesos repartidos en cinco órdenes de magnitud (de
// 1e-6 a 0,1), como los de Rosen y Halgren: generador congruencial con
// semilla fija.
export function hcpLikeConnections(nodes: readonly GraphNode[]): GraphConnection[] {
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const connections: GraphConnection[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      connections.push({
        id: `connection.${i}_${j}`,
        source: nodes[i].id,
        target: nodes[j].id,
        type: "structural",
        weight: 10 ** (-6 + 5 * random()),
        evidenceLevel: "indirect",
      });
    }
  }
  return connections;
}
