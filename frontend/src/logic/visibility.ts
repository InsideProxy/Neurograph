// Lógica pura de visibilidad, separada de los componentes para que sea
// comprobable con pruebas sin necesidad de renderizar nada (sección 29:
// "ejecutar tests" antes de dar por buena una fase).
import type { FiltersState } from "../state/filters";
import type { GraphConnection, GraphNode } from "../types/domain";

export function isNodeVisible(
  node: GraphNode,
  filters: Pick<FiltersState, "hiddenNetworks">
): boolean {
  return !filters.hiddenNetworks.has(node.network);
}

export function isConnectionVisible(
  connection: GraphConnection,
  filters: Pick<FiltersState, "hiddenConnectionTypes" | "minWeight">,
  isEndpointVisible: (nodeId: string) => boolean
): boolean {
  if (filters.hiddenConnectionTypes.has(connection.type)) return false;
  if (connection.weight < filters.minWeight) return false;
  return isEndpointVisible(connection.source) && isEndpointVisible(connection.target);
}

export function filterGraph(
  nodes: GraphNode[],
  connections: GraphConnection[],
  filters: Pick<FiltersState, "hiddenNetworks" | "hiddenConnectionTypes" | "minWeight">
): { nodes: GraphNode[]; connections: GraphConnection[] } {
  const visibleNodes = nodes.filter((n) => isNodeVisible(n, filters));
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const visibleConnections = connections.filter((c) =>
    isConnectionVisible(c, filters, (id) => visibleIds.has(id))
  );
  return { nodes: visibleNodes, connections: visibleConnections };
}
