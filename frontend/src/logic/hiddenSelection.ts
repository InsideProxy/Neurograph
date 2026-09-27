// Regiones seleccionadas que oculta el filtro de redes (D13): el
// connectograma y los hemisferios solo cuentan las que dibujan, y el
// recuadro de lectura avisa de las demás (principio 9: lo que se excluye se
// cuenta y se avisa). Funciones puras: se prueban sin DOM.
import type { GraphNode } from "../types/domain";
import { formatCount, joinNames, networkShortLabel } from "./displayText";

// Las seleccionadas cuya red está oculta, por orden alfabético. Los ids que
// no están cargados no cuentan: no son del atlas que se ve.
export function hiddenSelectedNodes(
  selectedNodeIds: ReadonlySet<string>,
  allNodes: readonly GraphNode[],
  hiddenNetworks: ReadonlySet<string>,
): GraphNode[] {
  return allNodes
    .filter((node) => selectedNodeIds.has(node.id) && hiddenNetworks.has(node.network))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Cuántas redes se nombran; con más, solo cuántas, como el aviso de las
// redes ocultas del buscador (logic/regionSearch.ts).
const NETWORKS_NAMED = 3;

// «15 más ocultas por el filtro de redes (Auditiva)», tras las que se ven.
// Si no se ve ninguna, lo dice entero: «18 regiones seleccionadas, todas
// ocultas por el filtro de redes (Auditiva y Visual 2)». null si no hay
// ninguna oculta.
export function hiddenSelectionText(hidden: readonly GraphNode[], visibleCount: number): string | null {
  if (hidden.length === 0) return null;
  const networks = [...new Set(hidden.map((node) => networkShortLabel(node.network)))].sort((a, b) =>
    a.localeCompare(b),
  );
  const where =
    networks.length <= NETWORKS_NAMED ? joinNames(networks) : `${networks.length} redes`;
  const count = formatCount(hidden.length);
  const one = hidden.length === 1;
  if (visibleCount > 0) {
    return `${count} más ${one ? "oculta" : "ocultas"} por el filtro de redes (${where})`;
  }
  return one
    ? `1 región seleccionada, oculta por el filtro de redes (${where})`
    : `${count} regiones seleccionadas, todas ocultas por el filtro de redes (${where})`;
}
