// Conexiones de una región para el panel de detalle (D4 de
// docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 5.5): de
// mayor a menor peso, y al principio solo las cinco primeras.
import type { GraphConnection } from "../types/domain";

export const CONNECTIONS_PREVIEW_COUNT = 5;

export interface RegionConnection {
  connection: GraphConnection;
  otherId: string;
  // La región es el origen de la conexión. Solo se muestra en las
  // efectivas, las que tienen sentido: «hacia» o «desde» la otra.
  outgoing: boolean;
}

export function regionConnectionsByWeight(connections: readonly GraphConnection[], regionId: string): RegionConnection[] {
  return (
    connections
      .filter((c) => c.source === regionId || c.target === regionId)
      .map((connection) => ({
        connection,
        otherId: connection.source === regionId ? connection.target : connection.source,
        outgoing: connection.source === regionId,
      }))
      // A igual peso, por id: el orden no cambia de un render a otro.
      .sort(
        (a, b) =>
          b.connection.weight - a.connection.weight ||
          (a.connection.id < b.connection.id ? -1 : a.connection.id > b.connection.id ? 1 : 0),
      )
  );
}

export function visibleRegionConnections<T>(
  sorted: readonly T[],
  showAll: boolean,
  limit = CONNECTIONS_PREVIEW_COUNT,
): readonly T[] {
  return showAll ? sorted : sorted.slice(0, limit);
}
