// Panel de detalle (sección 20: al seleccionar una estructura debe poder
// accederse a ID, nombre, red, conexiones, etc.). Con datos reales
// (Fase 3+) esta es la superficie donde aparecerán también evidencia,
// estudios, homologías y fenotipos — por eso ya se estructura como una
// lista de campos, no como una frase suelta.
//
// Modo de selección múltiple (decisión de la usuaria, 30/08/2026): con
// dos o más regiones seleccionadas a la vez, este panel deja de mostrar
// el detalle de una sola región y pasa a mostrar (a) la lista de
// regiones elegidas con su abreviatura y nombre completo -- la misma
// lista sirve de leyenda exportable --, (b) la conectividad real que
// existe ENTRE ellas (nunca inventada, respetando siempre la distinción
// directo/indirecto/hipotético de la sección 24) y (c) los tractos con
// nombre que tocan dos o más de las regiones elegidas, con su literatura
// real -- consultados a GET /connectivity/induced. Este último punto
// solo tiene sentido con datos reales: en modo demostración no existe
// tractografía real que consultar, así que `canFetchTracts=false` evita
// la petición por completo en vez de mostrar un resultado vacío que
// parezca "no hay tractos" cuando en realidad es "no se ha buscado".
import { useEffect, useMemo, useRef, useState } from "react";
import { CONNECTION_TYPE_LABELS, EVIDENCE_LEVEL_LABELS, NETWORK_COLORS, NETWORK_LABELS } from "../theme/networks";
import { useSelectionStore } from "../state/selection";
import { fetchInducedTracts } from "../data/api";
import { inducedConnections } from "../logic/induced";
import { exportSvgAsJpeg } from "../logic/exportImage";
import type { GraphConnection, GraphNode, InducedTract } from "../types/domain";

interface Props {
  nodes: GraphNode[];
  connections: GraphConnection[];
  canFetchTracts?: boolean;
}

function ConnectionRow({ conn, otherLabel }: { conn: GraphConnection; otherLabel: string }) {
  return (
    <li>
      {otherLabel} — {CONNECTION_TYPE_LABELS[conn.type]}, peso {conn.weight}, {EVIDENCE_LEVEL_LABELS[conn.evidenceLevel]}
    </li>
  );
}

function TractRow({ tract, nodeById }: { tract: InducedTract; nodeById: Map<string, GraphNode> }) {
  const regionLabels = tract.regionIds
    .map((id) => nodeById.get(id)?.abbreviation ?? nodeById.get(id)?.label ?? id)
    .join(", ");
  return (
    <li>
      <strong>{tract.abbreviation ?? tract.id}</strong> — {tract.name}
      <br />
      Toca: {regionLabels}
      {tract.studies.length > 0 ? (
        <ul>
          {tract.studies.map((study) => (
            <li key={study.id}>
              {study.name}
              {study.year ? ` (${study.year})` : ""}
              {study.doi ? ` — DOI ${study.doi}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <div className="detail-panel__no-citation">Sin estudio enlazado todavía en la base de datos.</div>
      )}
    </li>
  );
}

export function DetailPanel({ nodes, connections, canFetchTracts = false }: Props) {
  const { selectedNodeIds, selectedConnectionId } = useSelectionStore();
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const connection = connections.find((c) => c.id === selectedConnectionId);

  const selectedNodesList = useMemo(
    () =>
      [...selectedNodeIds]
        .map((id) => nodeById.get(id))
        .filter((n): n is GraphNode => n !== undefined)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [selectedNodeIds, nodeById]
  );

  const induced = useMemo(
    () => inducedConnections(connections, selectedNodeIds),
    [connections, selectedNodeIds]
  );

  const [tracts, setTracts] = useState<InducedTract[]>([]);
  const [tractsLoading, setTractsLoading] = useState(false);
  const [tractsError, setTractsError] = useState(false);

  useEffect(() => {
    if (!canFetchTracts || selectedNodesList.length < 2) {
      setTracts([]);
      setTractsError(false);
      return;
    }
    let cancelled = false;
    setTractsLoading(true);
    setTractsError(false);
    fetchInducedTracts(selectedNodesList.map((n) => n.id))
      .then((result) => {
        if (cancelled) return;
        setTracts(result);
      })
      .catch(() => {
        if (cancelled) return;
        setTractsError(true);
        setTracts([]);
      })
      .finally(() => {
        if (cancelled) return;
        setTractsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // selectedNodesList se reconstruye en cada render; se compara por su
    // contenido real (los ids, ya ordenados) para no relanzar la
    // petición cuando la identidad del array cambia sin que cambie la
    // selección en sí.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetchTracts, selectedNodesList.map((n) => n.id).join(",")]);

  const legendSvgRef = useRef<SVGSVGElement>(null);
  const handleExportLegend = () => {
    if (legendSvgRef.current) {
      exportSvgAsJpeg(legendSvgRef.current, `neurograph-leyenda-${Date.now()}.jpg`);
    }
  };

  if (!connection && selectedNodesList.length === 0) {
    return (
      <aside className="detail-panel detail-panel--empty">
        Selecciona una o varias regiones, o una conexión, en cualquiera de
        las dos vistas. Un clic normal añade o quita una región del
        conjunto seleccionado.
      </aside>
    );
  }

  if (connection) {
    const source = nodeById.get(connection.source);
    const target = nodeById.get(connection.target);
    return (
      <aside className="detail-panel">
        <h2>Conexión</h2>
        <dl>
          <dt>ID</dt>
          <dd><code>{connection.id}</code></dd>
          <dt>Origen</dt>
          <dd>{source?.abbreviation ? `${source.abbreviation} — ` : ""}{source?.label ?? connection.source}</dd>
          <dt>Destino</dt>
          <dd>{target?.abbreviation ? `${target.abbreviation} — ` : ""}{target?.label ?? connection.target}</dd>
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

  if (selectedNodesList.length === 1) {
    const node = selectedNodesList[0];
    const related = connections.filter((c) => c.source === node.id || c.target === node.id);
    return (
      <aside className="detail-panel">
        <h2>{node.abbreviation ? `${node.abbreviation} — ` : ""}{node.label}</h2>
        <dl>
          <dt>ID científico</dt>
          <dd><code>{node.id}</code></dd>
          <dt>Red</dt>
          <dd>{NETWORK_LABELS[node.network] ?? node.network}</dd>
          <dt>Conexiones ({related.length})</dt>
          <dd>
            <ul>
              {related.map((c) => {
                const otherId = c.source === node.id ? c.target : c.source;
                const other = nodeById.get(otherId);
                const otherLabel = other?.abbreviation ? `${other.abbreviation} — ${other.label}` : otherId;
                return <ConnectionRow key={c.id} conn={c} otherLabel={otherLabel} />;
              })}
            </ul>
          </dd>
        </dl>
      </aside>
    );
  }

  // Selección múltiple: dos o más regiones a la vez.
  const legendLineHeight = 20;
  const legendHeight = 28 + selectedNodesList.length * legendLineHeight;

  return (
    <aside className="detail-panel">
      <h2>{selectedNodesList.length} regiones seleccionadas</h2>

      <div className="detail-panel__legend-header">
        <span>Leyenda</span>
        <button type="button" className="export-btn" onClick={handleExportLegend}>
          Exportar leyenda JPEG
        </button>
      </div>
      <svg
        ref={legendSvgRef}
        width={260}
        height={legendHeight}
        role="img"
        aria-label="Leyenda de regiones seleccionadas"
        style={{ background: "#fff", border: "1px solid #eee", borderRadius: 4 }}
      >
        {selectedNodesList.map((node, i) => (
          <g key={node.id} transform={`translate(10, ${20 + i * legendLineHeight})`}>
            <circle r={5} cy={-4} fill={NETWORK_COLORS[node.network] ?? "#888"} />
            <text x={14} fontSize={11} fill="#222">
              <tspan fontWeight={700}>{node.abbreviation ?? "?"}</tspan>
              {" — " + node.label}
            </text>
          </g>
        ))}
      </svg>

      <h3>Conectividad entre las regiones seleccionadas</h3>
      {induced && induced.length > 0 ? (
        <ul>
          {induced.map((c) => {
            const source = nodeById.get(c.source);
            const target = nodeById.get(c.target);
            const sourceLabel = source?.abbreviation ?? c.source;
            const targetLabel = target?.abbreviation ?? c.target;
            return (
              <li key={c.id}>
                {sourceLabel} → {targetLabel} — {CONNECTION_TYPE_LABELS[c.type]}, peso {c.weight}, {EVIDENCE_LEVEL_LABELS[c.evidenceLevel]}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="detail-panel__empty-note">
          No hay ninguna conexión real cargada directamente entre estas regiones.
        </p>
      )}

      <h3>Tractos con nombre</h3>
      {!canFetchTracts ? (
        <p className="detail-panel__empty-note">
          No disponible con datos de demostración (solo con un atlas real cargado en la base de datos).
        </p>
      ) : tractsLoading ? (
        <p className="detail-panel__empty-note">Buscando tractografía real…</p>
      ) : tractsError ? (
        <p className="detail-panel__empty-note">No se pudo consultar la API de conectividad.</p>
      ) : tracts.length > 0 ? (
        <ul>
          {tracts.map((tract) => (
            <TractRow key={tract.id} tract={tract} nodeById={nodeById} />
          ))}
        </ul>
      ) : (
        <p className="detail-panel__empty-note">
          Ninguna de las regiones seleccionadas comparte un tracto con nombre registrado.
        </p>
      )}
    </aside>
  );
}
