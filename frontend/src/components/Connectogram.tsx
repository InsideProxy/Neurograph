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
import { connectionArrow, regionPassingText } from "../logic/displayText";
import { exportSvgAsJpeg } from "../logic/exportImage";
import { abbreviationAddsInformation } from "../logic/regionLabel";
import { nearestNodeId } from "../logic/magnifier";
import { MARK_ELEMENT, isMarkGesture, markRing, type ClickKeys } from "../logic/marks";
import {
  HEMISPHERE_ARC_WIDTH,
  HEMISPHERE_NAMES,
  SELECTION_HALO_OPACITY,
  arcLabelSides,
  arcPath,
  hemisphereArcs,
  hemisphereBlocks,
  labelTransform,
  radialLabel,
  ringLayout,
  selectionHalo,
} from "../logic/connectogramLayout";
import { useMarksStore } from "../state/marks";
import { CONNECTION_TYPE_LABELS, EVIDENCE_LEVEL_LABELS } from "../theme/networks";
import { ngFill, ngStroke, ngStrokeOpacity } from "../theme/colors";
import { currentExportResolver, useDrawColors, type DrawColors } from "../theme/useDrawColors";
import { Icon } from "./Icon";
import { MarkedLabel } from "./MarkedLabel";
import { RegionSummary } from "./NetworkTag";

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

  // Marcas de regiones (docs/rediseno-interfaz-diseno.md, 5.9): una capa
  // aparte de la selección, para encontrar regiones de un vistazo.
  // Ctrl+clic (⌘+clic en macOS) en un nodo, también con la lupa, lo marca o
  // lo desmarca; el clic normal sigue seleccionando.
  const markedIds = useMarksStore((state) => state.markedIds);
  const toggleMark = useMarksStore((state) => state.toggleMark);
  const clickNode = (id: string, keys: ClickKeys) => (isMarkGesture(keys) ? toggleMark(id) : toggleNode(id));

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
  // usuaria, 30/08/2026): el propio <svg> no lleva fondo inline
  // (decisión 18, 30/08/2026 -- vive en App.css como `.viz-svg`, solo
  // para pantalla), y exportImage.ts compone el resultado sobre un blanco
  // explícito. Los colores no se serializan tal cual: en el clon,
  // applyExportColors (logic/exportPalette.ts) cambia cada color marcado
  // con un atributo data-ng-* por el de la paleta de exportación del tema
  // (D3 de docs/decisiones-diseno.md).
  const svgRef = useRef<SVGSVGElement>(null);
  const handleExport = () => {
    if (svgRef.current) {
      exportSvgAsJpeg(
        svgRef.current,
        `neurograph-connectograma-${Date.now()}.jpg`,
        currentExportResolver(),
      );
    }
  };

  const center = size / 2;

  // Con muchos nodos, puntos más pequeños evitan que se toquen entre sí
  // alrededor del círculo.
  const nodeRadius = nodes.length > 150 ? 3 : nodes.length > 40 ? 4.5 : 6;
  const labelFontSize = nodes.length > 150 ? 5.5 : nodes.length > 40 ? 7 : 9;

  // Arcos de hemisferio (fase 4 del rediseño; spec 6.1): dos arcos finos por
  // fuera de las etiquetas, rotulados IZQUIERDO y DERECHO. Solo si, en el
  // orden actual, cada hemisferio forma un único bloque seguido y ningún nodo
  // tiene el hemisferio sin asignar; si no, no se dibujan. El orden de los
  // nodos no se toca. Se mira aquí porque el margen del anillo los incluye.
  const blocks = hemisphereBlocks(nodes.map((node) => node.hemisphere));

  // Radio del anillo (fase 4 del rediseño; spec 6.1; decisión del usuario
  // del 25/09/2026). Antes era siempre `size / 2 - 40`. Ahora esos 40 px de
  // margen son el mínimo, y crecen lo justo para que la etiqueta más larga
  // quepa entera, también ampliada, y los arcos de hemisferio, si se dibujan,
  // por fuera de las etiquetas: al ir giradas en dirección radial, las
  // etiquetas llegan también al borde de arriba y al de abajo. En la
  // miniatura, el de siempre (logic/connectogramLayout.ts).
  const { radius, arcOffset } = ringLayout({
    size,
    labels: nodes.map((node) => node.abbreviation),
    nodeRadius,
    fontSize: labelFontSize,
    fitLabels: !compact,
    withArcs: blocks !== null,
  });

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

  // Los arcos de hemisferio (ver `blocks`, arriba), con los mismos ángulos
  // que `positions`.
  const arcs = blocks
    ? hemisphereArcs(blocks, nodes.length, (index) => (angleScale(nodes[index].id) ?? 0) - Math.PI / 2, angleScale.step())
    : [];
  const arcSides = arcs.length === 2 ? arcLabelSides(arcs) : null;

  // Lupa (decisión 76, 24/09/2026, propuesta de la usuaria): en las zonas
  // densas del círculo los nodos y sus abreviaturas quedan diminutos. Con
  // el botón «Lupa» activado, un círculo sigue al ratón y dibuja
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
      clickNode(id, event);
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
    // Región, hemisferio y red con su color (D4 de docs/decisiones-diseno.md; spec 5.4).
    readout = <RegionSummary node={hoveredNode} />;
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
        {` ${connectionArrow(selectedConnection.type)} `}
        {target ? <RegionReadoutText node={target} /> : <strong>{selectedConnection.target}</strong>}
        {" · "}
        {CONNECTION_TYPE_LABELS[selectedConnection.type]}
        {" · "}
        {EVIDENCE_LEVEL_LABELS[selectedConnection.evidenceLevel]}
      </span>
    );
  } else if (selectedNodesList.length === 1) {
    const node = selectedNodesList[0];
    // Con una sola región seleccionada, cuántas de sus conexiones pasan
    // los filtros, con el umbral, y una pista (D4 de
    // docs/decisiones-diseno.md; spec 5.4, como en la maqueta). Por encima
    // del tope de dibujo, dice también que no se dibujan.
    const single = selectedNodeIds.size === 1;
    const passing = single ? filteredConnections.filter((c) => c.source === node.id || c.target === node.id).length : 0;
    readout = (
      <span className="readout-selection">
        <RegionSummary node={node} />
        {single && (
          <span className="readout-selection__count">
            {regionPassingText(passing, filters.minWeight, tooManyConnections)}
          </span>
        )}
        {single && <span className="readout-selection__hint">pasa el ratón por otra región para verla</span>}
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

  // Lo que las marcas (spec 5.9) necesitan de cada región marcada que se
  // dibuja: su nodo, con su radio y su trazo, para el anillo, y su etiqueta,
  // para la pastilla. Son las mismas cuentas que el dibujo de los nodos, más
  // abajo. Una región marcada que ocultan los filtros no está en `nodes`: no
  // se dibuja, y Filtros lo dice.
  const markedLayout = nodes.flatMap((node) => {
    const pos = positions.get(node.id);
    if (!pos || !markedIds.has(node.id)) return [];
    const isSelected = selectedNodeIds.has(node.id);
    const isEnlarged = isSelected || hoveredNodeId === node.id;
    const currentNodeRadius = isEnlarged ? nodeRadius + 3 : nodeRadius;
    return [
      {
        node,
        pos,
        ring: markRing(currentNodeRadius, isSelected ? 2.5 : 1),
        label: radialLabel(pos, (pos.x - center) / radius, (pos.y - center) / radius, currentNodeRadius + 7),
        fontSize: isEnlarged ? labelFontSize + 1.5 : labelFontSize,
        fontWeight: isEnlarged ? 700 : 600,
      },
    ];
  });

  // Halo de las regiones seleccionadas (fase 4 del rediseño; spec 6.1): un
  // anillo del color de selección al 35 % por fuera de su contorno. Una
  // región seleccionada siempre se dibuja ampliada (radio + 3) y con el
  // contorno de 2,5 px, como en el dibujo de los nodos, más abajo.
  const halo = selectionHalo(nodeRadius + 3, 2.5);
  const haloCenters = [...selectedNodeIds].flatMap((id) => {
    const pos = positions.get(id);
    return pos ? [{ id, pos }] : [];
  });

  return (
    <div className="viz-panel">
    {!compact && (
      <div className="viz-panel__toolbar">
        {/* Botón de alternar (D4 de docs/decisiones-diseno.md; spec 5.4):
            antes era una casilla. Mismo estado. */}
        <button
          type="button"
          className="export-btn"
          aria-pressed={lensEnabled}
          title="Amplía la zona bajo el ratón (útil en zonas con muchos nodos)"
          onClick={() => {
            setLensEnabled((enabled) => !enabled);
            setHoveredNodeId(null);
          }}
        >
          <Icon name="search" size={15} />
          Lupa
        </button>
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
      {/* Arcos de hemisferio (fase 4 del rediseño; spec 6.1), debajo de todo.
          Sus rótulos van en las esquinas de arriba, cada uno del lado de su
          arco, y no se ven en la miniatura, como en la maqueta. Se
          exportan: son parte del dibujo. */}
      {arcs.length > 0 && (
        <g style={{ pointerEvents: "none" }}>
          {arcs.map((arc) => (
            <path
              key={arc.hemisphere}
              d={arcPath(center, center, radius + arcOffset, arc.start, arc.end)}
              fill="none"
              stroke={colors.edge}
              {...ngStroke("edge")}
              strokeWidth={HEMISPHERE_ARC_WIDTH}
              strokeLinecap="round"
            />
          ))}
          {!compact &&
            arcSides &&
            arcs.map((arc) => {
              const right = arcSides.get(arc.hemisphere) === "right";
              return (
                <text
                  key={`${arc.hemisphere}-rotulo`}
                  x={right ? size - 10 : 10}
                  y={18}
                  textAnchor={right ? "end" : "start"}
                  fontSize={10}
                  fontWeight={600}
                  letterSpacing={1}
                  fill={colors.label}
                  {...ngFill("label")}
                >
                  {HEMISPHERE_NAMES[arc.hemisphere]}
                </text>
              );
            })}
        </g>
      )}
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
              // Un Ctrl+clic que no acierta con el nodo y cae en una línea
              // no hace nada (spec 5.9): seleccionar la conexión vaciaría la
              // selección de regiones.
              onClick={(event) => {
                if (!isMarkGesture(event)) selectConnection(conn.id);
              }}
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
      {/* Marcas (spec 5.9), bajo los nodos: el hueco del color del fondo
          entre cada nodo marcado y su anillo, que tapa las líneas que pasan
          por debajo. Ni esto ni el anillo y la pastilla, encima de los nodos,
          se exportan: llevan data-ng-mark, y exportSvgAsJpeg los quita del
          clon. */}
      {markedLayout.length > 0 && (
        <g {...MARK_ELEMENT} style={{ pointerEvents: "none" }}>
          {markedLayout.map(({ node, pos, ring }) => (
            <circle key={node.id} cx={pos.x} cy={pos.y} r={ring.radius} fill={colors.sceneBg} />
          ))}
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
          // Fase 4 del rediseño (docs/rediseno-interfaz-diseno.md, 6.1): la
          // etiqueta va además girada en dirección radial. En la mitad
          // derecha se alinea al principio; en la izquierda se gira 180° más
          // y se alinea al final, para leerse de izquierda a derecha. Las
          // dos crecen hacia fuera del círculo. La pastilla de una región
          // marcada (markedLayout, arriba) usa la misma cuenta.
          const label = radialLabel(pos, ux, uy, labelOffset);

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
                  onClick={(event) => clickNode(node.id, event)}
                />
              </g>
              {node.abbreviation && (
                <text
                  x={label.x}
                  y={label.y}
                  transform={labelTransform(label)}
                  textAnchor={label.anchor}
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
      {/* Halo de las regiones seleccionadas (fase 4 del rediseño; spec 6.1),
          encima de los nodos vecinos, como en la maqueta, y debajo del anillo
          de una marca, que no se mueve. Es parte del dibujo: se exporta, con
          el color de selección de la exportación. */}
      {haloCenters.length > 0 && (
        <g style={{ pointerEvents: "none" }}>
          {haloCenters.map(({ id, pos }) => (
            <circle
              key={id}
              cx={pos.x}
              cy={pos.y}
              r={halo.radius}
              fill="none"
              stroke={colors.selected}
              {...ngStroke("selected")}
              strokeOpacity={SELECTION_HALO_OPACITY}
              strokeWidth={halo.strokeWidth}
            />
          ))}
        </g>
      )}
      {/* Marcas (spec 5.9), encima de los nodos y de las etiquetas, para que
          ninguna vecina las tape: el anillo del color de marca y la etiqueta
          sobre su pastilla (MarkedLabel). */}
      {markedLayout.length > 0 && (
        <g {...MARK_ELEMENT} style={{ pointerEvents: "none" }}>
          {markedLayout.map(({ node, pos, ring, label, fontSize, fontWeight }) => (
            <g key={node.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={ring.radius}
                fill="none"
                stroke={colors.mark}
                strokeWidth={ring.strokeWidth}
              />
              {node.abbreviation && (
                <MarkedLabel
                  text={node.abbreviation}
                  x={label.x}
                  y={label.y}
                  anchor={label.anchor}
                  fontSize={fontSize}
                  fontWeight={fontWeight}
                  transform={labelTransform(label)}
                  colors={colors}
                />
              )}
            </g>
          ))}
        </g>
      )}
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
          markedIds={markedIds}
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
  // Marcas (spec 5.9): en la lupa, también con su anillo y su pastilla.
  markedIds: ReadonlySet<string>;
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
  markedIds,
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
          // Halo de una región seleccionada (fase 4 del rediseño; spec 6.1),
          // como en el dibujo principal: debajo del anillo de una marca.
          const lensHalo = selectionHalo(r, 2.5);
          // Región marcada (spec 5.9): el anillo, con el hueco del color del
          // fondo, detrás del nodo, y la etiqueta sobre su pastilla, girada
          // con ella.
          const isMarked = markedIds.has(node.id);
          const markedRing = markRing(r, isSelected || isHovered ? 2.5 : 1);
          return (
            <g key={node.id}>
              {isSelected && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={lensHalo.radius}
                  fill="none"
                  stroke={colors.selected}
                  strokeOpacity={SELECTION_HALO_OPACITY}
                  strokeWidth={lensHalo.strokeWidth}
                />
              )}
              {isMarked && (
                <circle
                  {...MARK_ELEMENT}
                  cx={p.x}
                  cy={p.y}
                  r={markedRing.radius}
                  fill={colors.sceneBg}
                  stroke={colors.mark}
                  strokeWidth={markedRing.strokeWidth}
                />
              )}
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
              {isMarked && node.abbreviation && (
                <MarkedLabel
                  text={node.abbreviation}
                  x={lx}
                  y={ly}
                  anchor={textAnchor}
                  fontSize={zoomedFontSize}
                  fontWeight={isHovered || isSelected ? 700 : 600}
                  transform={`rotate(${rotation} ${lx} ${ly})`}
                  colors={colors}
                />
              )}
            </g>
          );
        })}
      </g>
      <circle cx={pointer.x} cy={pointer.y} r={lensRadius} className="connectogram-lens__border" />
    </g>
  );
}
