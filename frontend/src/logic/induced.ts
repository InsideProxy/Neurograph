// Conectividad inducida por la selección múltiple de nodos (decisión de
// la usuaria, 30/08/2026: "el usuario selecciona TODOS LOS NODOS que
// desea conectar y el programa mostrará la conectividad que existe entre
// ellos"). A diferencia de los tractos con nombre (que sí requieren una
// consulta a la API real -- ver src/data/api.ts, fetchInducedTracts), la
// conectividad región-región ya está cargada en el frontend (tanto en
// modo real como de demostración), así que se calcula aquí mismo, sin
// ninguna petición nueva: pura función, comprobable sin renderizar nada,
// mismo criterio que src/logic/visibility.ts.
import type { GraphConnection } from "../types/domain";

/**
 * Con menos de dos nodos seleccionados no hay "conectividad entre nodos
 * seleccionados" que inducir -- se devuelve `null` (no una lista vacía)
 * para que quien llama pueda distinguir "sin selección múltiple todavía"
 * de "selección múltiple sin ninguna conexión real entre sí", que son
 * dos situaciones distintas de mostrar en la interfaz.
 */
export function inducedConnections(
  connections: GraphConnection[],
  selectedNodeIds: Set<string>
): GraphConnection[] | null {
  if (selectedNodeIds.size < 2) return null;
  return connections.filter(
    (c) => selectedNodeIds.has(c.source) && selectedNodeIds.has(c.target)
  );
}
