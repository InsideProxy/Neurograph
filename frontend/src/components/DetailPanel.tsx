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
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CONNECTION_TYPE_LABELS, EVIDENCE_LEVEL_LABELS } from "../theme/networks";
import { exportResolverFor, ngFill, ngStroke } from "../theme/colors";
import { useDrawColors } from "../theme/useDrawColors";
import { useAppearanceStore } from "../state/appearance";
import { useSelectionStore } from "../state/selection";
import { fetchInducedTracts } from "../data/api";
import { inducedConnections } from "../logic/induced";
import { exportSvgAsJpeg } from "../logic/exportImage";
import { abbreviationAddsInformation } from "../logic/regionLabel";
import { copyShortcutLabel, copyText } from "../logic/clipboard";
import { connectionArrow, connectionTitle, formatCount, hemisphereLabel, regionTitleParts } from "../logic/displayText";
import { CONNECTIONS_PREVIEW_COUNT, regionConnectionsByWeight, visibleRegionConnections } from "../logic/regionConnections";
import { weightToSliderPosition } from "../logic/weightScale";
import type { GraphConnection, GraphNode, InducedTract } from "../types/domain";
import { Icon } from "./Icon";
import { NetworkTag } from "./NetworkTag";

interface Props {
  nodes: GraphNode[];
  connections: GraphConnection[];
  canFetchTracts?: boolean;
}

// Ancho mínimo de la leyenda de la selección múltiple (el de siempre) y
// hueco a la derecha de su texto más largo (el mismo que a la izquierda).
const LEGEND_MIN_WIDTH = 260;
const LEGEND_MARGIN = 10;

// Escribe en el <svg> de la leyenda el ancho de su texto. Si el navegador
// todavía no puede medirlo (getBBox falla sin maqueta), se queda el que
// tenga, como hace contentRightEdge en logic/exportImage.ts.
function fitLegendWidth(svg: SVGSVGElement | null) {
  if (!svg) return;
  let box: DOMRect;
  try {
    box = svg.getBBox();
  } catch {
    return;
  }
  svg.setAttribute("width", String(Math.max(LEGEND_MIN_WIDTH, Math.ceil(box.x + box.width + LEGEND_MARGIN))));
}

// Mismo criterio que Connectogram.tsx/Hemisferios.tsx (fix del
// 30/08/2026): en HCP-MMP1.0 el nombre completo ya empieza por la
// abreviatura, así que anteponerla aquí repetía la misma información dos
// veces ("V1 — V1 (hemisferio izquierdo)"). Ver logic/regionLabel.ts.
// Devuelve texto plano (no JSX) porque los cinco usos de este patrón en
// este archivo concatenan directamente dentro de <dd>/<h2>/texto de
// lista, sin necesitar la abreviatura en negrita por separado.
function regionDisplayText(node: GraphNode | undefined, fallbackId: string): string {
  if (!node) return fallbackId;
  if (!abbreviationAddsInformation(node)) return node.label;
  return `${node.abbreviation} — ${node.label}`;
}

// Una conexión de la región (D4 de docs/decisiones-diseno.md; spec 5.5).
// Conserva la información de antes: la otra región, el tipo, el peso con
// el mismo formato y el nivel de evidencia. Añade el color de la red de
// la otra región, el sentido de las efectivas («hacia» o «desde» la otra
// región) y una barra de peso en la escala logarítmica del filtro
// (logic/weightScale.ts), porque los pesos abarcan varios órdenes de
// magnitud. El color sale de useDrawColors, como en las vistas.
function ConnectionRow({
  conn,
  otherLabel,
  otherNetwork,
  outgoing,
}: {
  conn: GraphConnection;
  otherLabel: string;
  otherNetwork: string | null;
  outgoing: boolean;
}) {
  const colors = useDrawColors();
  return (
    <li className="detail__connection">
      <span
        className="detail__connection-dot"
        style={{ backgroundColor: colors.networkColor(otherNetwork ?? "unclassified") }}
        aria-hidden="true"
      />
      <span className="detail__connection-name">
        {conn.type === "effective" && (
          <span className="detail__connection-direction">{outgoing ? "hacia " : "desde "}</span>
        )}
        {otherLabel}
      </span>
      <span className="detail__connection-weight">
        <span className="visually-hidden">peso </span>
        {conn.weight}
      </span>
      <span className="detail__connection-bar" aria-hidden="true">
        <span style={{ width: `${Math.round(weightToSliderPosition(conn.weight) * 100)}%` }} />
      </span>
      <span className="detail__connection-meta">
        {CONNECTION_TYPE_LABELS[conn.type]} · {EVIDENCE_LEVEL_LABELS[conn.evidenceLevel]}
      </span>
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

// Decisión 73: el algoritmo y la confianza REALES de la pertenencia a la
// red (backend `region_network_memberships`), en palabras. Una
// asignación por voto mayoritario con el 30 % de los vértices no es lo
// mismo que una con el 100 %, y la interfaz no debe presentarlas igual.
function membershipDescription(algorithm: string, confidence: number | null): string {
  const pct = confidence === null ? null : `${Math.round(confidence * 100)} %`;
  if (algorithm === "majority_vote") {
    return pct === null
      ? "Voto mayoritario de los vértices de la región (confianza no registrada)"
      : `Voto mayoritario: el ${pct} de los vértices de la región cae en esta red`;
  }
  if (algorithm === "gordon_intrinsic_label") {
    return "Etiqueta propia del atlas (Gordon et al., 2016), no calculada por NeuroGraph";
  }
  return pct === null ? algorithm : `${algorithm} (confianza ${pct})`;
}

// ID científico al pie, en letra monoespaciada, con un botón para copiarlo
// (D4; spec 5.5). Si el portapapeles no está disponible (permiso denegado,
// contexto no seguro), se selecciona el texto para copiarlo a mano, y se
// dice, a la vista y a los lectores de pantalla; si vuelve a fallar, se
// vuelve a anunciar. El temporizador que devuelve el botón a «Copiar» se
// cancela en el clic siguiente y si el panel se desmonta antes.
function ScientificId({ id, label }: { id: string; label: string }) {
  const codeRef = useRef<HTMLElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  // Sube con cada intento: el mensaje se vuelve a pintar, y a anunciar,
  // aunque diga lo mismo que la vez anterior.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const handleCopy = async () => {
    window.clearTimeout(timerRef.current);
    setAttempt((count) => count + 1);
    if (await copyText(id, navigator.clipboard)) {
      setStatus("copied");
      timerRef.current = window.setTimeout(() => setStatus("idle"), 1500);
      return;
    }
    const code = codeRef.current;
    const selection = window.getSelection();
    if (code && selection) selection.selectAllChildren(code);
    setStatus("failed");
  };

  const message =
    status === "copied"
      ? "Identificador copiado"
      : status === "failed"
        ? `No se pudo copiar: el identificador queda seleccionado (${copyShortcutLabel(navigator.userAgent)})`
        : "";

  return (
    <div className="detail__id">
      <span className="detail__id-label">{label}</span>
      <code ref={codeRef} className="detail__id-value">
        {id}
      </code>
      <button
        type="button"
        className="detail__id-copy"
        aria-label="Copiar el identificador"
        title={status === "copied" ? "Copiado" : "Copiar"}
        onClick={handleCopy}
      >
        <Icon name={status === "copied" ? "check" : "copy"} size={14} />
      </button>
      {/* El fallo se ve, bajo el ID; «copiado» solo se anuncia, porque
          el botón ya lo muestra con ✓. */}
      <span className={status === "failed" ? "detail__id-status" : "visually-hidden"} role="status">
        {message && <span key={attempt}>{message}</span>}
      </span>
    </div>
  );
}

// Detalle de una región (D4 de docs/decisiones-diseno.md; spec 5.5), de
// más a menos importante: la región, su red y su hemisferio, cómo se
// asignó la red, sus conexiones (más fuertes primero; se ven las cinco
// primeras) y, al pie, el ID científico. DetailPanel monta uno por región
// (key), así que «Ver las N» vuelve a plegarse al cambiar de región sin
// ningún efecto. Se exporta solo para su prueba de marcado
// (DetailPanel.test.tsx): en node, la selección del store no se puede
// fijar antes de pintar DetailPanel.
export function RegionDetail({
  node,
  connections,
  nodeById,
}: {
  node: GraphNode;
  connections: GraphConnection[];
  nodeById: Map<string, GraphNode>;
}) {
  const [showAll, setShowAll] = useState(false);
  const listId = useId();
  const sorted = useMemo(() => regionConnectionsByWeight(connections, node.id), [connections, node.id]);
  const shown = visibleRegionConnections(sorted, showAll);
  const { main, secondary } = regionTitleParts(node);

  return (
    <aside className="detail-panel detail detail--with-id" aria-label="Región seleccionada">
      <p className="detail__eyebrow">Región seleccionada</p>
      <h2 className="detail__title">
        <span className="detail__main">{main}</span>
        {secondary && <span className="detail__secondary">{secondary}</span>}
      </h2>
      <div className="detail__tags">
        <NetworkTag network={node.network} />
        <span className="detail__tag">{hemisphereLabel(node.hemisphere)}</span>
      </div>
      {node.networkAlgorithm && (
        <p className="detail__note" title="Cómo se asignó la red">
          <Icon name="info" size={14} />
          <span>
            <span className="visually-hidden">Cómo se asignó la red: </span>
            {membershipDescription(node.networkAlgorithm, node.networkConfidence ?? null)}
          </span>
        </p>
      )}
      <div className="detail__section-header">
        <h3 className="detail__heading">
          Conexiones <span className="detail__count">{formatCount(sorted.length)}</span>
        </h3>
        {sorted.length > 1 && <span className="detail__hint">más fuertes primero · barra logarítmica</span>}
      </div>
      {sorted.length === 0 ? (
        <p className="detail-panel__empty-note">Esta región no tiene conexiones cargadas.</p>
      ) : (
        <ul className="detail__connections" id={listId}>
          {shown.map(({ connection, otherId, outgoing }) => {
            const other = nodeById.get(otherId);
            return (
              <ConnectionRow
                key={connection.id}
                conn={connection}
                otherLabel={regionDisplayText(other, otherId)}
                otherNetwork={other?.network ?? null}
                outgoing={outgoing}
              />
            );
          })}
        </ul>
      )}
      {sorted.length > CONNECTIONS_PREVIEW_COUNT && (
        <button
          type="button"
          className="detail__more"
          aria-expanded={showAll}
          aria-controls={listId}
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? `Ver solo las ${CONNECTIONS_PREVIEW_COUNT} primeras` : `Ver las ${formatCount(sorted.length)}`}
          <Icon name={showAll ? "chevronUp" : "arrowRight"} size={14} />
        </button>
      )}
      <ScientificId id={node.id} label="ID científico" />
    </aside>
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
  // La leyenda cortaba en pantalla las etiquetas largas (spec, sección 12;
  // D3 de docs/decisiones-diseno.md). Tras cada render se mide su texto y
  // se escribe el ancho en el propio <svg>: LEGEND_MIN_WIDTH, el de
  // siempre, o más si el texto lo necesita. Si el panel es más estrecho,
  // su recuadro se desplaza en horizontal. El ancho no es estado de React
  // (el <svg> no lleva la prop width), así que medir no provoca otro
  // render. La exportación parte de este ancho y solo lo ensancha
  // (fitWidthToContent): con etiquetas cortas el JPEG sale como antes, y
  // con largas puede salir algo más ancho, nunca cortado.
  useLayoutEffect(() => fitLegendWidth(legendSvgRef.current));
  // Una fuente que llega tarde cambia lo que mide el texto: se vuelve a medir.
  useEffect(() => {
    const fonts = document.fonts;
    const refit = () => fitLegendWidth(legendSvgRef.current);
    fonts?.addEventListener("loadingdone", refit);
    return () => fonts?.removeEventListener("loadingdone", refit);
  }, []);
  const colors = useDrawColors();
  const handleExportLegend = () => {
    if (legendSvgRef.current) {
      // fitWidthToContent: la exportación usa otra fuente (una pila del
      // sistema, D3 de docs/decisiones-diseno.md), así que vuelve a medir
      // el texto con ella y, si no cabe en el ancho que el <svg> tiene en
      // pantalla (el del efecto de arriba, D4), ensancha la imagen. Nunca
      // la estrecha. Sin esto, una etiqueta larga podría salir cortada.
      exportSvgAsJpeg(
        legendSvgRef.current,
        `neurograph-leyenda-${Date.now()}.jpg`,
        exportResolverFor(useAppearanceStore.getState().theme),
        { fitWidthToContent: true },
      );
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
      <aside className="detail-panel detail detail--with-id" aria-label="Conexión seleccionada">
        <p className="detail__eyebrow">Conexión seleccionada</p>
        <h2 className="detail__title">
          <span className="detail__main detail__main--text">{connectionTitle(connection, nodeById)}</span>
        </h2>
        <dl className="detail__facts">
          {/* «Origen» y «Destino» solo si la conexión tiene sentido (efectiva);
              si no, las dos regiones van en pie de igualdad. */}
          <dt>{connection.type === "effective" ? "Origen" : "Región A"}</dt>
          <dd>{regionDisplayText(source, connection.source)}</dd>
          <dt>{connection.type === "effective" ? "Destino" : "Región B"}</dt>
          <dd>{regionDisplayText(target, connection.target)}</dd>
          <dt>Tipo</dt>
          <dd>{CONNECTION_TYPE_LABELS[connection.type]}</dd>
          <dt>Peso</dt>
          <dd>{connection.weight}</dd>
          <dt>Nivel de evidencia</dt>
          <dd>{EVIDENCE_LEVEL_LABELS[connection.evidenceLevel]}</dd>
        </dl>
        <ScientificId key={connection.id} id={connection.id} label="ID" />
      </aside>
    );
  }

  if (selectedNodesList.length === 1) {
    const node = selectedNodesList[0];
    return <RegionDetail key={node.id} node={node} connections={connections} nodeById={nodeById} />;
  }

  // Selección múltiple: dos o más regiones a la vez.
  const legendLineHeight = 20;
  const legendHeight = 28 + selectedNodesList.length * legendLineHeight;

  return (
    <aside className="detail-panel detail" aria-label="Regiones seleccionadas">
      <p className="detail__eyebrow">Selección múltiple</p>
      <h2 className="detail__title">
        <span className="detail__main detail__main--text">{selectedNodesList.length} regiones seleccionadas</span>
      </h2>

      <div className="detail__section-header">
        <h3 className="detail__heading">Leyenda</h3>
        <button type="button" className="export-btn" onClick={handleExportLegend}>
          Exportar leyenda JPEG
        </button>
      </div>
      {/* Mismo criterio que Connectogram.tsx/Hemisferios.tsx (decisión
          18, 30/08/2026): sin fondo inline en el propio <svg> (vive en
          App.css como `.legend-svg`, solo pantalla) para que
          exportSvgAsJpeg pueda seguir componiendo esta leyenda -- también
          exportable -- sobre blanco explícito sin que un fondo oscuro
          clonado lo tape. El círculo usa el color de red y el texto el
          token label del tema; al exportar, applyExportColors los cambia
          por los de la paleta de exportación (D3 de
          docs/decisiones-diseno.md). */}
      <div className="detail__legend">
        <svg
          ref={legendSvgRef}
          height={legendHeight}
          role="img"
          aria-label="Leyenda de regiones seleccionadas"
          className="legend-svg"
        >
          {selectedNodesList.map((node, i) => (
            <g key={node.id} transform={`translate(10, ${20 + i * legendLineHeight})`}>
              <circle
                r={5}
                cy={-4}
                fill={colors.networkColor(node.network)}
                {...ngFill(`net:${node.network}`)}
                stroke={colors.nodeRing}
                {...ngStroke("nodeRing")}
                strokeWidth={1}
              />
              <text x={14} fontSize={11} fill={colors.label} {...ngFill("label")}>
                {abbreviationAddsInformation(node) ? (
                  <>
                    <tspan fontWeight={700}>{node.abbreviation}</tspan>
                    {" — " + node.label}
                  </>
                ) : (
                  node.label
                )}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="detail__section-header">
        <h3 className="detail__heading">Conectividad entre las regiones seleccionadas</h3>
      </div>
      {induced && induced.length > 0 ? (
        <ul className="detail__list">
          {induced.map((c) => {
            const source = nodeById.get(c.source);
            const target = nodeById.get(c.target);
            // Abreviatura + nombre completo (30/08/2026, aclaración de la
            // usuaria tras la decisión 19: "en la leyenda ha de aparecer la
            // abreviatura y a continuación el nombre completo... no solo la
            // abreviatura") -- este listado de conectividad inducida usaba
            // solo la abreviatura, mismo bug que se corrigió en otros
            // cuatro sitios de este archivo pero se quedó sin aplicar aquí.
            // Mismo `regionDisplayText` que ya usa el resto del panel.
            const sourceLabel = regionDisplayText(source, c.source);
            const targetLabel = regionDisplayText(target, c.target);
            return (
              <li key={c.id}>
                {sourceLabel} {connectionArrow(c.type)} {targetLabel} — {CONNECTION_TYPE_LABELS[c.type]}, peso {c.weight},{" "}
                {EVIDENCE_LEVEL_LABELS[c.evidenceLevel]}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="detail-panel__empty-note">
          No hay ninguna conexión real cargada directamente entre estas regiones.
        </p>
      )}

      <div className="detail__section-header">
        <h3 className="detail__heading">Tractos con nombre</h3>
      </div>
      {!canFetchTracts ? (
        <p className="detail-panel__empty-note">
          No disponible con datos de demostración (solo con un atlas real cargado en la base de datos).
        </p>
      ) : tractsLoading ? (
        <p className="detail-panel__empty-note">Buscando tractografía real…</p>
      ) : tractsError ? (
        <p className="detail-panel__empty-note">No se pudo consultar la API de conectividad.</p>
      ) : tracts.length > 0 ? (
        <ul className="detail__list">
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
