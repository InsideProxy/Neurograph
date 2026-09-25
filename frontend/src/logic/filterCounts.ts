// Recuentos del panel de filtros (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.3). Usa las mismas reglas de
// visibilidad que las vistas (logic/visibility.ts).
import type { ConnectionType, FiltersState } from "../state/filters";
import type { GraphConnection, GraphNode } from "../types/domain";
import { isConnectionVisible, isNodeVisible } from "./visibility";

export interface ConnectionCounts {
  // Por tipo: las que pasan los demás filtros (redes y peso mínimo), sin
  // contar la casilla de su propio tipo. Así se ve cuántas añadiría
  // marcarla.
  byType: Record<ConnectionType, number>;
  // Las que pasan todos los filtros («N de M…»): las mismas que
  // filterGraph.
  visible: number;
  // Todas las cargadas para el atlas («…de M conexiones»).
  loaded: number;
}

export function countConnections(
  nodes: readonly GraphNode[],
  connections: readonly GraphConnection[],
  filters: Pick<FiltersState, "hiddenNetworks" | "hiddenConnectionTypes" | "minWeight">,
): ConnectionCounts {
  const visibleIds = new Set(nodes.filter((node) => isNodeVisible(node, filters)).map((node) => node.id));
  const isEndpointVisible = (id: string) => visibleIds.has(id);
  const withoutTypeFilter = { hiddenConnectionTypes: new Set<ConnectionType>(), minWeight: filters.minWeight };
  const byType: Record<ConnectionType, number> = { structural: 0, functional: 0, effective: 0 };
  let visible = 0;
  for (const connection of connections) {
    if (!isConnectionVisible(connection, withoutTypeFilter, isEndpointVisible)) continue;
    // Un tipo que el panel no conoce (un dato nuevo del backend) no tiene
    // casilla y no suma en ninguno; sí cuenta entre las visibles, como en
    // las vistas.
    if (Object.hasOwn(byType, connection.type)) byType[connection.type] += 1;
    if (isConnectionVisible(connection, filters, isEndpointVisible)) visible += 1;
  }
  return { byType, visible, loaded: connections.length };
}
