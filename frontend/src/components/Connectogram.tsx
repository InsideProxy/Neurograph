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
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as d3 from "d3";
import type { GraphConnection, GraphNode } from "../types/domain";
import { useSelectionStore } from "../state/selection";
import { useFiltersStore } from "../state/filters";
import { filterGraph } from "../logic/visibility";
import { inducedConnections } from "../logic/induced";
import { exportSvgAsJpeg } from "../logic/exportImage";
import { NETWORK_COLORS, CONNECTION_TYPE_LABELS, EVIDENCE_LEVEL_LABELS } from "../theme/networks";

interface Props {
  nodes: GraphNode[];
  connections: GraphConnection[];
  size?: number;
}

export function Connectogram({ nodes: allNodes, connections: allConnections, size: fixedSize }: Props) {
  const { selectedNodeIds, selectedConnectionId, toggleNode, selectConnection } =
    useSelectionStore();
  const filters = useFiltersStore();
  const { nodes, connections: filteredConnections } = filterGraph(allNodes, allConnections, filters);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

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

  // Tamaño fijo a 420px heredado de cuando solo había 8 nodos de
  // demostración (pendiente señalado por la usuaria el 28/08/2026):
  // el connectograma nunca crecía aunque el panel que lo contiene
  // tuviera mucho más espacio. Corregido el 29/08/2026: se mide el
  // ancho real del contenedor con ResizeObserver y se usa ese valor
  // (acotado entre 320 y 720px, para que siga siendo legible tanto
  // en una ventana pequeña como en un monitor muy ancho). `size`
  // sigue existiendo como escape explícito -- si se pasa, gana
  // siempre sobre la medición automática (p. ej. para pruebas).
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredSize, setMeasuredSize] = useState(420);

  useEffect(() => {
    if (fixedSize !== undefined) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (!width) return;
      setMeasuredSize(Math.round(Math.max(320, Math.min(width, 720))));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fixedSize]);

  const size = fixedSize ?? measuredSize;

  // Exportación a JPEG en color sobre fondo blanco (decisión de la
  // usuaria, 30/08/2026): el SVG ya se dibuja sobre fondo blanco
  // (style de más abajo), así que basta con serializarlo tal cual --
  // ver frontend/src/logic/exportImage.ts para el porqué de componer
  // explícitamente sobre blanco en vez de fiarse solo de ese estilo.
  const svgRef = useRef<SVGSVGElement>(null);
  const handleExport = () => {
    if (svgRef.current) {
      exportSvgAsJpeg(svgRef.current, `neurograph-connectograma-${Date.now()}.jpg`);
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
        <strong>{hoveredNode.abbreviation ?? "(sin abreviatura)"}</strong> — {hoveredNode.label}
      </span>
    );
  } else if (selectedConnection) {
    const source = nodeById.get(selectedConnection.source);
    const target = nodeById.get(selectedConnection.target);
    readout = (
      <span>
        <strong>{source?.abbreviation ?? selectedConnection.source}</strong>
        {" → "}
        <strong>{target?.abbreviation ?? selectedConnection.target}</strong>
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
        <strong>{node.abbreviation ?? "(sin abreviatura)"}</strong> — {node.label}
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
              <strong>{node.abbreviation ?? "(sin abreviatura)"}</strong> — {node.label}
            </li>
          ))}
        </ul>
      </span>
    );
  } else {
    readout = <span className="connectogram-readout__placeholder">Pasa el ratón o selecciona una región.</span>;
  }

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
      <button type="button" className="export-btn" onClick={handleExport}>
        Exportar JPEG
      </button>
    </div>
    <svg
      ref={svgRef}
      width={size}
      height={size}
      role="img"
      aria-label="Connectograma"
      style={{ background: "#fff", borderRadius: 8, display: "block", margin: "0 auto" }}
    >
      <defs>
        <marker
          id="connectogram-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#222" />
        </marker>
      </defs>
      <g>
        {connections.map((conn) => {
          const a = positions.get(conn.source);
          const b = positions.get(conn.target);
          if (!a || !b) return null;
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
          return (
            <path
              key={conn.id}
              d={`M ${a.x} ${a.y} Q ${center} ${center} ${b.x} ${b.y}`}
              fill="none"
              stroke={isSelected ? "#222" : "#b8b8b8"}
              strokeOpacity={isSelected ? 0.9 : 0.35}
              strokeWidth={Math.max(1, conn.weight * 6)}
              strokeDasharray={isDashed ? "6 4" : undefined}
              markerEnd={isDirected ? "url(#connectogram-arrow)" : undefined}
              style={{ cursor: "pointer" }}
              onClick={() => selectConnection(conn.id)}
            />
          );
        })}
      </g>
      <g>
        {nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const isSelected = selectedNodeIds.has(node.id);
          const isHovered = hoveredNodeId === node.id;
          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
            >
              <circle
                r={isSelected || isHovered ? nodeRadius + 3 : nodeRadius}
                fill={NETWORK_COLORS[node.network] ?? "#888"}
                stroke={isSelected ? "#111" : "none"}
                strokeWidth={2}
                style={{ cursor: "pointer" }}
                onClick={() => toggleNode(node.id)}
              />
              {node.abbreviation && (
                <text
                  x={pos.x > center ? 8 : -8}
                  textAnchor={pos.x > center ? "start" : "end"}
                  dy={3}
                  fontSize={isSelected || isHovered ? labelFontSize + 1.5 : labelFontSize}
                  fontWeight={isSelected || isHovered ? 700 : 500}
                  fill="#222"
                  stroke="#fff"
                  strokeWidth={2}
                  paintOrder="stroke"
                  style={{ pointerEvents: "none" }}
                >
                  {node.abbreviation}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
    <div className="connectogram-readout">{readout}</div>
    </div>
  );
}
