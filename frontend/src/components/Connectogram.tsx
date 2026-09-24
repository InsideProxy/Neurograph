// Visualización 1 — Connectogram / diagrama de cuerdas (sección 5.1).
// Implementación mínima: nodos dispuestos en círculo (D3 para el layout
// angular), conexiones como arcos. El grosor codifica el peso; el color,
// la red a la que pertenece cada nodo origen. Selección sincronizada vía
// el store compartido (sección 5.3).
//
// Con 8 nodos de demostración, mostrar siempre las 360 etiquetas de texto
// alrededor del círculo no daba problemas. Con las 360 regiones reales de
// HCP-MMP1.0 (confirmado el 28/08/2026, ver captura de la usuaria), esas
// 360 etiquetas simultáneas se solapan hasta volverse ilegibles. Corregido
// el 30/08/2026 (decisión de la usuaria): ya no se dibuja el nombre
// completo junto al nodo bajo ningún caso -- se dibuja su ABREVIATURA
// (mucho más corta, cabe junto al punto sin solaparse) de forma
// permanente, y el nombre completo vive en un recuadro de lectura fijo
// debajo del diagrama, nunca flotando junto al ratón o el nodo (así no
// se sale del cuadro ni depende de dónde esté el puntero).
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from "react";
import * as d3 from "d3";
import type { GraphConnection, GraphNode } from "../types/domain";
import { useSelectionStore } from "../state/selection";
import { useFiltersStore } from "../state/filters";
import { filterGraph } from "../logic/visibility";
import { inducedConnections } from "../logic/induced";
import { MAX_RENDERED_CONNECTIONS } from "../logic/renderSafety";
import { exportSvgAsJpeg } from "../logic/exportImage";
import { abbreviationAddsInformation } from "../logic/regionLabel";
import { nearestNodeId } from "../logic/magnifier";
import { CONNECTION_TYPE_LABELS, EVIDENCE_LEVEL_LABELS } from "../theme/networks";
import { exportResolverFor, ngFill, ngStroke, ngStrokeOpacity } from "../theme/colors";
import { useDrawColors, type DrawColors } from "../theme/useDrawColors";
import { useAppearanceStore } from "../state/appearance";

// Recuadro de lectura (30/08/2026, corrige un problema real reportado
// por la usuaria): antes siempre se mostraba "abreviatura — nombre",
// pero para HCP-MMP1.0 el "nombre" es literalmente la misma abreviatura
// con el hemisferio al lado (ver logic/regionLabel.ts) -- se veía como
// si la abreviatura apareciera dos veces. Se omite el prefijo solo
// cuando de verdad no aporta nada nuevo.
function RegionReadoutText({ node }: { node: GraphNode }) {
  if (!abbreviationAddsInformation(node)) return <>{node.label}</>;
  return (
    <>
      <strong>{node.abbreviation}</strong> — {node.label}
    </>
  );
}

interface Props {
  nodes: GraphNode[];
  connections: GraphConnection[];
  size?: number;
  // Miniatura (rediseño de la disposición, decisión 74): solo el dibujo,
  // sin botones ni recuadro de lectura.
  compact?: boolean;
}

export function Connectogram({ nodes: allNodes, connections: allConnections, size: fixedSize, compact = false }: Props) {
  const { selectedNodeIds, selectedConnectionId, toggleNode, selectConnection } =
    useSelectionStore();
  const filters = useFiltersStore();
  const { nodes, connections: filteredConnections } = filterGraph(allNodes, allConnections, filters);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const colors = useDrawColors();

  // Con dos o más regiones seleccionadas a la vez, el dibujo deja de
  // mostrar TODAS las conexiones filtradas y pasa a mostrar solo la
  // conectividad que existe ENTRE las regiones elegidas (decisión de la
  // usuaria, 30/08/2026: "el programa mostrará la conectividad que
  // existe entre ellos"). Los nodos siguen siendo todos los que pasan
  // los filtros -- así se puede seguir clicando para ampliar la
  // selección -- solo las conexiones dibujadas se acotan.
  const induced = inducedConnections(filteredConnections, selectedNodeIds);
  const connections = induced ?? filteredConnections;
  const isInducedView = induced !== null;

  // Tope de seguridad (01/09/2026, ver logic/renderSafety.ts para el
  // diagnóstico real completo): con un conectoma real denso y el peso
  // mínimo bajo, `connections` puede llegar a decenas de miles -- dibujar
  // un <path> con su propio manejador de clic por cada una crashea el
  // WebView. Por encima del tope no se dibuja NINGUNA conexión (nunca un
  // subconjunto truncado al azar, que daría una imagen falsamente
  // completa); se avisa en su lugar. Los nodos se siguen dibujando
  // siempre -- su cantidad está acotada por el tamaño del atlas, nunca
  // por el peso mínimo, así que no representan el mismo riesgo.
  const tooManyConnections = connections.length > MAX_RENDERED_CONNECTIONS;
  const visibleConnections = tooManyConnections ? [] : connections;
  const hoveredConnections = hoveredNodeId
    ? visibleConnections.filter((c) => c.source === hoveredNodeId || c.target === hoveredNodeId)
    : [];

  // Tamaño fijo a 420px heredado de cuando solo había 8 nodos de
  // demostración (pendiente señalado por la usuaria el 28/08/2026):
  // el connectograma nunca crecía aunque el panel que lo contiene
  // tuviera mucho más espacio. Corregido el 29/08/2026: se mide el
  // ancho real del contenedor con ResizeObserver y se usa ese valor
  // (acotado entre 320 y 720px, para que siga siendo legible tanto
  // en una ventana pequeña como en un monitor muy ancho). `size`
  // sigue existiendo como escape explícito -- si se pasa, gana
  // siempre sobre la medición automática (p. ej. para pruebas).
  //
  // Decisión 74 (24/09/2026): la app ya no se desplaza hacia abajo -- cada
  // vista llena un hueco fijo de la ventana (grande, o miniatura). El
  // círculo se ajusta al lado MENOR de ese hueco (ancho y alto), no solo
  // al ancho, para que nunca se salga por abajo; el suelo baja a 160 px
  // para que quepa en una miniatura. Si el hueco no tiene alto propio
  // (contenedor sin altura), se vuelve al criterio anterior por ancho.
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredSize, setMeasuredSize] = useState(420);

  useEffect(() => {
    if (fixedSize !== undefined) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect?.width) return;
      const side = rect.height > 0 ? Math.min(rect.width, rect.height) : Math.min(rect.width, 720);
      setMeasuredSize(Math.round(Math.max(160, side)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fixedSize]);

  const size = fixedSize ?? measuredSize;

  // Exportación a JPEG en color sobre fondo blanco (decisión de la
  // usuaria, 30/08/2026): el propio <svg> ya no lleva ningún fondo
  // inline (decisión 18, 30/08/2026 -- vive en App.css como `.viz-svg`,
  // solo para pantalla), así que basta con serializarlo tal cual --
  // exportImage.ts compone el resultado sobre un blanco explícito sin
  // depender de que el SVG traiga fondo propio.
  const svgRef = useRef<SVGSVGElement>(null);
  const handleExport = () => {
    if (svgRef.current) {
      exportSvgAsJpeg(
        svgRef.current,
        `neurograph-connectograma-${Date.now()}.jpg`,
        exportResolverFor(useAppearanceStore.getState().theme),
      );
    }
  };

  const radius = size / 2 - 40;
  const center = size / 2;

  // Con muchos nodos, puntos más pequeños evitan que se toquen entre sí
  // alrededor del círculo.
  const nodeRadius = nodes.length > 150 ? 3 : nodes.length > 40 ? 4.5 : 6;
  const labelFontSize = nodes.length > 150 ? 5.5 : nodes.length > 40 ? 7 : 9;

  const angleScale = useMemo(
    () =>
      d3
        .scalePoint<string>()
        .domain(nodes.map((n) => n.id))
        .range([0, 2 * Math.PI])
        .padding(0.5),
    [nodes]
  );

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
      const angle = (angleScale(node.id) ?? 0) - Math.PI / 2;
      map.set(node.id, {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      });
    }
    return map;
  }, [nodes, angleScale, center, radius]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Lupa (decisión 76, 24/09/2026, propuesta de la usuaria): en las zonas
  // densas del círculo los nodos y sus abreviaturas quedan diminutos. Con
  // la casilla "Lupa" activada, un círculo sigue al ratón y dibuja
  // ampliados los nodos que hay debajo (ver <ConnectogramLens>). Con la
  // lupa activa, pasar/clicar actúa sobre el nodo más cercano al puntero
  // (logic/magnifier.ts): no hace falta acertar con el círculo de 3 px.
  const [lensEnabled, setLensEnabled] = useState(false);
  const lensPickDistance = 12;

  const lensPointer = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handleSvgMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    if (!lensEnabled) return;
    const { x, y } = lensPointer(event);
    setHoveredNodeId(nearestNodeId(positions, x, y, lensPickDistance));
  };

  const handleSvgMouseLeave = () => {
    if (lensEnabled) setHoveredNodeId(null);
  };

  // Fase de captura: con la lupa activa, el clic sobre (o cerca de) un
  // nodo lo selecciona y no llega a la conexión que pudiera haber debajo.
  const handleSvgClickCapture = (event: MouseEvent<SVGSVGElement>) => {
    if (!lensEnabled) return;
    const { x, y } = lensPointer(event);
    const id = nearestNodeId(positions, x, y, lensPickDistance);
    if (id) {
      event.stopPropagation();
      toggleNode(id);
    }
  };

  // Recuadro de lectura fijo debajo del diagrama (decisión de la
  // usuaria, 30/08/2026): nunca flota junto al ratón ni al nodo -- así
  // el nombre nunca se sale del cuadro ni depende de dónde esté el
  // puntero. Prioridad: nodo bajo el ratón > conexión seleccionada > un
  // único nodo seleccionado > leyenda de la selección múltiple > vacío.
  const hoveredNode = hoveredNodeId ? nodeById.get(hoveredNodeId) : undefined;
  const selectedConnection = selectedConnectionId
    ? connections.find((c) => c.id === selectedConnectionId) ??
      filteredConnections.find((c) => c.id === selectedConnectionId)
    : undefined;
  const selectedNodesList = useMemo(
    () =>
      [...selectedNodeIds]
        .map((id) => nodeById.get(id))
        .filter((n): n is GraphNode => n !== undefined)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [selectedNodeIds, nodeById]
  );

  let readout: ReactNode;
  if (hoveredNode) {
    readout = (
      <span>
        <RegionReadoutText node={hoveredNode} />
      </span>
    );
  } else if (selectedConnection) {
    const source = nodeById.get(selectedConnection.source);
    const target = nodeById.get(selectedConnection.target);
    readout = (
      <span>
        {/* Abreviatura + nombre completo (30/08/2026, aclaración de la
            usuaria tras la decisión 19: "en la leyenda ha de aparecer la
            abreviatura y a continuación el nombre completo... no solo la
            abreviatura") -- la decisión 19 corrigió esto para un único nodo
            seleccionado, pero se quedó sin aplicar aquí, en el
            origen/destino de una CONEXIÓN seleccionada, que seguía
            mostrando solo la abreviatura. Mismo `RegionReadoutText` que ya
            usa el resto del panel. */}
        {source ? <RegionReadoutText node={source} /> : <strong>{selectedConnection.source}</strong>}
        {" → "}
        {target ? <RegionReadoutText node={target} /> : <strong>{selectedConnection.target}</strong>}
        {" · "}
        {CONNECTION_TYPE_LABELS[selectedConnection.type]}
        {" · "}
        {EVIDENCE_LEVEL_LABELS[selectedConnection.evidenceLevel]}
      </span>
    );
  } else if (selectedNodesList.length === 1) {
    const node = selectedNodesList[0];
    readout = (
      <span>
        <RegionReadoutText node={node} />
      </span>
    );
  } else if (selectedNodesList.length > 1) {
    readout = (
      <span className="connectogram-readout__legend">
        <strong>{selectedNodesList.length} regiones seleccionadas</strong>
        {isInducedView && (
          <> · {connections.length} conexión{connections.length === 1 ? "" : "es"} entre ellas</>
        )}
        <ul>
          {selectedNodesList.map((node) => (
            <li key={node.id}>
              <RegionReadoutText node={node} />
            </li>
          ))}
        </ul>
      </span>
    );
  } else {
    readout = <span className="connectogram-readout__placeholder">Pasa el ratón o selecciona una región.</span>;
  }

  return (
    <div className="viz-panel">
    {!compact && (
      <div className="viz-panel__toolbar">
        <label className="connectogram-lens-toggle" title="Amplía la zona bajo el ratón (útil en zonas con muchos nodos)">
          <input
            type="checkbox"
            checked={lensEnabled}
            onChange={(e) => {
              setLensEnabled(e.target.checked);
              setHoveredNodeId(null);
            }}
          />
          Lupa
        </label>
        <button type="button" className="export-btn" onClick={handleExport}>
          Exportar JPEG
        </button>
      </div>
    )}
    {tooManyConnections && compact && (
      <p className="connectogram-toomany-warning">Demasiadas conexiones para dibujar: solo nodos.</p>
    )}
    {tooManyConnections && !compact && (
      <p className="connectogram-toomany-warning">
        Hay {connections.length} conexiones con los filtros actuales —
        demasiadas para dibujar sin arriesgar que la aplicación se
        congele, así que no se dibuja ninguna (los nodos sí se muestran).
        Sube el "peso mínimo" o oculta más redes en el panel de Filtros
        para reducir la cantidad.
      </p>
    )}
    <div ref={containerRef} className="viz-panel__area">
    <svg
      ref={svgRef}
      width={size}
      height={size}
      role="img"
      aria-label="Connectograma"
      className="viz-svg"
      style={{ borderRadius: 8, display: "block", margin: "0 auto", cursor: lensEnabled ? "crosshair" : undefined }}
      onMouseMove={handleSvgMouseMove}
      onMouseLeave={handleSvgMouseLeave}
      onClickCapture={handleSvgClickCapture}
    >
      <defs>
        {/* Dos marcadores en vez de uno (decisión 18, 30/08/2026): antes
            la flecha era siempre "#222", invisible sobre el fondo oscuro
            en cuanto la conexión no estaba seleccionada. Cada marcador usa
            los tokens de dibujo del tema (theme/themes.ts), los mismos que
            la línea a la que acompaña; al exportar, applyExportColors los
            sustituye por los de la paleta de exportación (D3 de
            docs/decisiones-diseno.md). */}
        <marker
          id="connectogram-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.edge} {...ngFill("edge")} />
        </marker>
        <marker
          id="connectogram-arrow-selected"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.selected} {...ngFill("selected")} />
        </marker>
        <marker
          id="connectogram-arrow-hover"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.hoverHighlight} {...ngFill("hoverHighlight")} />
        </marker>
      </defs>
      <g>
        {visibleConnections.map((conn) => {
          const a = positions.get(conn.source);
          const b = positions.get(conn.target);
          if (!a || !b) return null;
          // Las del nodo bajo el ratón se dibujan aparte, encima (ver más abajo).
          if (hoveredNodeId !== null && (conn.source === hoveredNodeId || conn.target === hoveredNodeId)) {
            return null;
          }
          const isSelected =
            isInducedView ||
            selectedConnectionId === conn.id ||
            selectedNodeIds.has(conn.source) ||
            selectedNodeIds.has(conn.target);
          // Sección 5.1/24: lo hipotético o indirecto nunca se dibuja igual
          // que lo observado directamente; la dirección (conectividad
          // efectiva) se marca con una flecha, no solo con el grosor.
          const isDashed = conn.evidenceLevel !== "direct";
          const isDirected = conn.type === "effective";
          const strokeRef: "selected" | "edge" = isSelected ? "selected" : "edge";
          const restOpacityRef: "edgeOpacitySelected" | "edgeOpacityConnectogram" = isSelected
            ? "edgeOpacitySelected"
            : "edgeOpacityConnectogram";
          return (
            <path
              key={conn.id}
              d={`M ${a.x} ${a.y} Q ${center} ${center} ${b.x} ${b.y}`}
              fill="none"
              stroke={colors[strokeRef]}
              {...ngStroke(strokeRef)}
              strokeOpacity={
                hoveredNodeId !== null
                  ? isSelected
                    ? colors.edgeOpacityHoverSelected
                    : colors.edgeOpacityHoverOther
                  : colors[restOpacityRef]
              }
              // La referencia de exportación usa la opacidad de reposo (sin hover): al exportar nunca hay ratón encima.
              {...ngStrokeOpacity(restOpacityRef)}
              strokeWidth={Math.max(1, conn.weight * 6)}
              strokeDasharray={isDashed ? colors.dash : undefined}
              markerEnd={
                isDirected
                  ? `url(#connectogram-arrow${isSelected ? "-selected" : ""})`
                  : undefined
              }
              style={{ cursor: "pointer" }}
              onClick={() => selectConnection(conn.id)}
            />
          );
        })}
      </g>
      {/* Resaltado al pasar el ratón por un nodo (decisión 76c, 24/09/2026,
          petición de la usuaria: "algo muy resaltado, esté o no activada la
          lupa"): sus conexiones van encima de todas, más gruesas y en
          el color de resaltado del tema (token hoverHighlight), y el resto
          se atenúa mientras dura el hover. Sin eventos propios: el clic
          sigue llegando a la conexión real de debajo (su selección no
          cambia de lugar). */}
      {hoveredConnections.length > 0 && (
        <g style={{ pointerEvents: "none" }}>
          {hoveredConnections.map((conn) => {
            const a = positions.get(conn.source);
            const b = positions.get(conn.target);
            if (!a || !b) return null;
            return (
              <path
                key={conn.id}
                d={`M ${a.x} ${a.y} Q ${center} ${center} ${b.x} ${b.y}`}
                fill="none"
                stroke={colors.hoverHighlight}
                strokeOpacity={1}
                strokeWidth={Math.max(2, conn.weight * 6) + 1.5}
                strokeDasharray={conn.evidenceLevel !== "direct" ? colors.dash : undefined}
                markerEnd={conn.type === "effective" ? "url(#connectogram-arrow-hover)" : undefined}
              />
            );
          })}
        </g>
      )}
      <g>
        {nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const isSelected = selectedNodeIds.has(node.id);
          const isHovered = hoveredNodeId === node.id;
          const nodeStrokeRef: "selected" | "nodeRing" = isSelected ? "selected" : "nodeRing";
          const currentNodeRadius = isSelected || isHovered ? nodeRadius + 3 : nodeRadius;

          // Etiqueta SIEMPRE por fuera del círculo (30/08/2026, corrige un
          // problema real reportado por la usuaria: con el desplazamiento
          // horizontal fijo de antes, un nodo cerca de la parte de arriba
          // o de abajo del círculo -- donde `pos.x` está cerca de `center`
          // -- apenas se movía, y la etiqueta quedaba prácticamente encima
          // del propio nodo). Todos los nodos están a la misma distancia
          // `radius` del centro por construcción (ver `positions` más
          // arriba), así que (pos.x-center, pos.y-center)/radius es
          // directamente el vector unitario que apunta del centro hacia
          // el nodo -- desplazar la etiqueta en esa misma dirección la
          // deja siempre radialmente hacia fuera, sea cual sea el ángulo.
          const ux = (pos.x - center) / radius;
          const uy = (pos.y - center) / radius;
          const labelOffset = currentNodeRadius + 7;
          const labelX = pos.x + ux * labelOffset;
          const labelY = pos.y + uy * labelOffset;
          // Cerca de arriba/abajo (ux pequeño) centrado; a los lados,
          // alineado para que el texto crezca hacia fuera del círculo, no
          // hacia dentro.
          const textAnchor = ux > 0.3 ? "start" : ux < -0.3 ? "end" : "middle";

          return (
            <g key={node.id}>
              <g
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseEnter={lensEnabled ? undefined : () => setHoveredNodeId(node.id)}
                onMouseLeave={
                  lensEnabled
                    ? undefined
                    : () => setHoveredNodeId((current) => (current === node.id ? null : current))
                }
              >
                {/* El relleno es SIEMPRE el color de red real (no se toca,
                    ver theme/networks.ts), pero el trazo ya no es "none"
                    para el caso no seleccionado (decisión 18, 30/08/2026):
                    algunos colores reales son extremos (p. ej. "#000000"
                    de gordon333.salience) y desaparecerían contra el fondo
                    oscuro sin un contorno propio. El contorno usa el token
                    nodeRing del tema; al exportar, applyExportColors lo
                    cambia por uno legible sobre blanco (D3 de
                    docs/decisiones-diseno.md). */}
                <circle
                  r={currentNodeRadius}
                  fill={colors.networkColor(node.network)}
                  {...ngFill(`net:${node.network}`)}
                  stroke={colors[nodeStrokeRef]}
                  {...ngStroke(nodeStrokeRef)}
                  strokeWidth={isSelected ? 2.5 : 1}
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleNode(node.id)}
                />
              </g>
              {node.abbreviation && (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  fontSize={isSelected || isHovered ? labelFontSize + 1.5 : labelFontSize}
                  fontWeight={isSelected || isHovered ? 700 : 600}
                  fill={colors.label}
                  {...ngFill("label")}
                  style={{ pointerEvents: "none" }}
                >
                  {node.abbreviation}
                </text>
              )}
            </g>
          );
        })}
      </g>
      {lensEnabled && !compact && (
        <ConnectogramLens
          svgRef={svgRef}
          nodes={nodes}
          positions={positions}
          center={center}
          radius={radius}
          size={size}
          nodeRadius={nodeRadius}
          labelFontSize={labelFontSize}
          hoveredNodeId={hoveredNodeId}
          selectedNodeIds={selectedNodeIds}
          connections={visibleConnections}
          selectedConnectionId={selectedConnectionId}
          isInducedView={isInducedView}
          colors={colors}
        />
      )}
    </svg>
    </div>
    {!compact && <div className="connectogram-readout">{readout}</div>}
    </div>
  );
}

// Lupa del connectograma (decisión 76). Primer intento: un <use> que
// clonaba el dibujo entero, escalado y recortado -- en Chrome el pintado
// se quedaba colgado en cuanto la lupa pasaba sobre el anillo de 360
// nodos (comprobado a mano el 24/09/2026). Ahora la lupa vuelve a dibujar
// SOLO los nodos cercanos al puntero (una decena), a LENS_ZOOM veces su
// tamaño y separación, con sus abreviaturas legibles. Guarda su propia posición del ratón (escucha el <svg> por su
// cuenta) para que moverla no redibuje los cientos de nodos del padre.
//
// Conexiones dentro de la lupa (petición de la usuaria, 24/09/2026: "podríamos
// dibujar conexiones activas también, para marcar fácilmente"): no todas --
// ampliar las miles del dibujo es justo lo que colgaba el primer intento --
// sino solo las ACTIVAS: las que el dibujo principal ya resalta (tocan un
// nodo seleccionado, son la conexión seleccionada, o toda la vista inducida)
// en el color de selección, y las del nodo bajo el cursor en el amarillo de
// resaltado (el mismo que en el dibujo principal, decisión 76c),
// para ver adónde va antes de clicar. Una curva cuadrática sigue siéndolo
// tras el escalado, así que basta con ampliar sus tres puntos de control;
// el grosor no se amplía (sería una mancha).
const LENS_ZOOM = 3;

interface LensProps {
  svgRef: RefObject<SVGSVGElement | null>;
  nodes: GraphNode[];
  positions: Map<string, { x: number; y: number }>;
  center: number;
  radius: number;
  size: number;
  nodeRadius: number;
  labelFontSize: number;
  hoveredNodeId: string | null;
  selectedNodeIds: Set<string>;
  connections: GraphConnection[];
  selectedConnectionId: string | null;
  isInducedView: boolean;
  colors: DrawColors;
}

function ConnectogramLens({
  svgRef,
  nodes,
  positions,
  center,
  radius,
  size,
  nodeRadius,
  labelFontSize,
  hoveredNodeId,
  selectedNodeIds,
  connections,
  selectedConnectionId,
  isInducedView,
  colors,
}: LensProps) {
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  // Independiente de la posición del ratón: se recalcula solo al cambiar
  // la selección o el nodo bajo el cursor, no en cada movimiento.
  const activeConnections = useMemo(() => {
    const result: { conn: GraphConnection; hovered: boolean }[] = [];
    for (const conn of connections) {
      const selected =
        isInducedView ||
        selectedConnectionId === conn.id ||
        selectedNodeIds.has(conn.source) ||
        selectedNodeIds.has(conn.target);
      const hovered = hoveredNodeId !== null && (conn.source === hoveredNodeId || conn.target === hoveredNodeId);
      if (selected || hovered) result.push({ conn, hovered });
    }
    // Las del nodo bajo el cursor encima (y con su color, aunque además
    // estén seleccionadas), igual que en el dibujo principal.
    return result.sort((a, b) => Number(a.hovered) - Number(b.hovered));
  }, [connections, selectedConnectionId, selectedNodeIds, hoveredNodeId, isInducedView]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let frame = 0;
    const onMove = (event: globalThis.MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const next = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPointer(next));
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      setPointer(null);
    };
    svg.addEventListener("mousemove", onMove);
    svg.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      svg.removeEventListener("mousemove", onMove);
      svg.removeEventListener("mouseleave", onLeave);
    };
  }, [svgRef]);

  if (!pointer) return null;

  const lensRadius = Math.round(Math.max(45, Math.min(110, size * 0.14)));
  // Coordenadas del dibujo -> coordenadas dentro de la lupa: escalado
  // alrededor del puntero, así el nodo bajo el cursor sigue bajo él.
  const zoom = (x: number, y: number) => ({
    x: pointer.x + (x - pointer.x) * LENS_ZOOM,
    y: pointer.y + (y - pointer.y) * LENS_ZOOM,
  });
  // Margen extra para que entren las etiquetas de nodos cuyo punto queda
  // justo fuera del borde de la lupa.
  const reach = lensRadius / LENS_ZOOM + 12;
  const inside = nodes.filter((node) => {
    const pos = positions.get(node.id);
    return pos !== undefined && Math.hypot(pos.x - pointer.x, pos.y - pointer.y) <= reach;
  });

  const ring = zoom(center, center);
  const zoomedNodeRadius = Math.min(nodeRadius * LENS_ZOOM, 9);
  const zoomedFontSize = Math.min(labelFontSize * LENS_ZOOM, 15);
  const clipId = "connectogram-lens-clip";

  return (
    <g style={{ pointerEvents: "none" }}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={pointer.x} cy={pointer.y} r={lensRadius} />
        </clipPath>
      </defs>
      <circle cx={pointer.x} cy={pointer.y} r={lensRadius} className="connectogram-lens__bg" />
      <g clipPath={`url(#${clipId})`}>
        {/* El propio anillo, ampliado, como guía de por dónde va el círculo. */}
        <circle
          cx={ring.x}
          cy={ring.y}
          r={radius * LENS_ZOOM}
          fill="none"
          stroke={colors.edge}
          strokeOpacity={0.35}
        />
        {activeConnections.map(({ conn, hovered }) => {
          const a = positions.get(conn.source);
          const b = positions.get(conn.target);
          if (!a || !b) return null;
          const za = zoom(a.x, a.y);
          const zb = zoom(b.x, b.y);
          const isDirected = conn.type === "effective";
          return (
            <path
              key={conn.id}
              d={`M ${za.x} ${za.y} Q ${ring.x} ${ring.y} ${zb.x} ${zb.y}`}
              fill="none"
              stroke={hovered ? colors.hoverHighlight : colors.selected}
              strokeOpacity={hovered ? 1 : colors.edgeOpacitySelected}
              strokeWidth={hovered ? Math.max(2, conn.weight * 6) + 1.5 : Math.max(1, conn.weight * 6)}
              strokeDasharray={conn.evidenceLevel !== "direct" ? colors.dash : undefined}
              markerEnd={
                isDirected ? `url(#connectogram-arrow-${hovered ? "hover" : "selected"})` : undefined
              }
            />
          );
        })}
        {inside.map((node) => {
          const pos = positions.get(node.id)!;
          const p = zoom(pos.x, pos.y);
          const isSelected = selectedNodeIds.has(node.id);
          const isHovered = hoveredNodeId === node.id;
          const r = isSelected || isHovered ? zoomedNodeRadius + 3 : zoomedNodeRadius;
          const ux = (pos.x - center) / radius;
          const uy = (pos.y - center) / radius;
          // Dentro de la lupa la etiqueta va hacia DENTRO del círculo (al
          // revés que en el dibujo normal): la lupa suele quedar pegada al
          // borde del <svg> y hacia fuera se cortaría (un halo del color de
          // fondo la separa de las conexiones activas). Y va girada en
          // dirección radial: arriba y abajo del círculo los nodos quedan
          // uno al lado del otro en horizontal y las etiquetas rectas se
          // pisaban. En la mitad izquierda se gira 180° más para que el
          // texto nunca quede cabeza abajo.
          const offset = r + 5;
          const lx = p.x - ux * offset;
          const ly = p.y - uy * offset;
          const angle = (Math.atan2(uy, ux) * 180) / Math.PI;
          const leftHalf = ux < 0;
          const rotation = leftHalf ? angle + 180 : angle;
          const textAnchor = leftHalf ? "start" : "end";
          return (
            <g key={node.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={colors.networkColor(node.network)}
                stroke={isSelected || isHovered ? colors.selected : colors.nodeRing}
                strokeWidth={isSelected || isHovered ? 2.5 : 1}
              />
              {node.abbreviation && (
                <text
                  x={lx}
                  y={ly}
                  transform={`rotate(${rotation} ${lx} ${ly})`}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  fontSize={zoomedFontSize}
                  fontWeight={isHovered || isSelected ? 700 : 600}
                  fill={isHovered ? "var(--text-h)" : colors.label}
                  className="connectogram-lens__label"
                >
                  {node.abbreviation}
                </text>
              )}
            </g>
          );
        })}
      </g>
      <circle cx={pointer.x} cy={pointer.y} r={lensRadius} className="connectogram-lens__border" />
    </g>
  );
}
