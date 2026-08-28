// Panel de detalle (sección 20: al seleccionar una estructura debe poder
// accederse a ID, nombre, red, conexiones, etc.). Con datos reales
// (Fase 3+) esta es la superficie donde aparecerán también evidencia,
// estudios, homologías y fenotipos — por eso ya se estructura como una
// lista de campos, no como una frase suelta.
import { CONNECTION_TYPE_LABELS, EVIDENCE_LEVEL_LABELS, NETWORK_LABELS } from "../theme/networks";
import { useSelectionStore } from "../state/selection";
import type { GraphConnection, GraphNode } from "../types/domain";

interface Props {
  nodes: GraphNode[];
  connections: GraphConnection[];
}

export function DetailPanel({ nodes, connections }: Props) {
  const { selectedNodeId, selectedConnectionId } = useSelectionStore();
  const node = nodes.find((n) => n.id === selectedNodeId);
  const connection = connections.find((c) => c.id === selectedConnectionId);

  if (!node && !connection) {
    return (
      <aside className="detail-panel detail-panel--empty">
        Selecciona un nodo o una conexión en cualquiera de las dos vistas.
      </aside>
    );
  }

  if (node) {
    const related = connections.filter((c) => c.source === node.id || c.target === node.id);
    return (
      <aside className="detail-panel">
        <h2>{node.label}</h2>
        <dl>
          <dt>ID científico</dt>
          <dd><code>{node.id}</code></dd>
          <dt>Red</dt>
          <dd>{NETWORK_LABELS[node.network] ?? node.network}</dd>
          <dt>Conexiones ({related.length})</dt>
          <dd>
            <ul>
              {related.map((c) => (
                <li key={c.id}>
                  {c.source === node.id ? c.target : c.source} — {CONNECTION_TYPE_LABELS[c.type]}, peso {c.weight}
                </li>
              ))}
            </ul>
          </dd>
        </dl>
      </aside>
    );
  }

  if (connection) {
    const source = nodes.find((n) => n.id === connection.source);
    const target = nodes.find((n) => n.id === connection.target);
    return (
      <aside className="detail-panel">
        <h2>Conexión</h2>
        <dl>
          <dt>ID</dt>
          <dd><code>{connection.id}</code></dd>
          <dt>Origen</dt>
          <dd>{source?.label ?? connection.source}</dd>
          <dt>Destino</dt>
          <dd>{target?.label ?? connection.target}</dd>
          <dt>Tipo</dt>
          <dd>{CONNECTION_TYPE_LABELS[connection.type]}</dd>
          <dt>Peso</dt>
          <dd>{connection.weight}</dd>
          <dt>Nivel de evidencia</dt>
          <dd>{EVIDENCE_LEVEL_LABELS[connection.evidenceLevel]}</dd>
        </dl>
      </aside>
    );
  }

  return null;
}
