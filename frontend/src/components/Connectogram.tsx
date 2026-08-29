// Visualización 1 — Connectogram / diagrama de cuerdas (sección 5.1).
// Implementación mínima: nodos dispuestos en círculo (D3 para el layout
// angular), conexiones como arcos. El grosor codifica el peso; el color,
// la red a la que pertenece cada nodo origen. Selección sincronizada vía
// el store compartido (sección 5.3).
//
// Con 8 nodos de demostración, mostrar siempre las 360 etiquetas de texto
// alrededor del círculo no daba problemas. Con las 360 regiones reales de
// HCP-MMP1.0 (confirmado el 28/08/2026, ver captura de la usuaria), esas
// 360 etiquetas simultáneas se solapan hasta volverse ilegibles — y,
// combinado con un fondo oscuro heredado sin querer del tema por defecto
// del navegador (ver src/index.css), el texto oscuro sobre fondo oscuro
// prácticamente desaparecía, dejando solo un ruido de píxeles. Por eso
// ahora solo se dibuja la etiqueta del nodo seleccionado o con el ratón
// encima; el resto se identifican por color/posición y aparecen al pasar
// por ellos.
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { GraphConnection, GraphNode } from "../types/domain";
import { useSelectionStore } from "../state/selection";
import { useFiltersStore } from "../state/filters";
import { filterGraph } from "../logic/visibility";
import { NETWORK_COLORS } from "../theme/networks";

interface Props {
  nodes: GraphNode[];
  connections: GraphConnection[];
  size?: number;
}

export function Connectogram({ nodes: allNodes, connections: allConnections, size: fixedSize }: Props) {
  const { selectedNodeId, selectedConnectionId, selectNode, selectConnection } =
    useSelectionStore();
  const filters = useFiltersStore();
  const { nodes, connections } = filterGraph(allNodes, allConnections, filters);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

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

  const radius = size / 2 - 40;
  const center = size / 2;

  // Con muchos nodos, puntos más pequeños evitan que se toquen entre sí
  // alrededor del círculo.
  const nodeRadius = nodes.length > 150 ? 3 : nodes.length > 40 ? 4.5 : 6;

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

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
    <svg
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
            selectedConnectionId === conn.id ||
            selectedNodeId === conn.source ||
            selectedNodeId === conn.target;
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
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const showLabel = isSelected || isHovered;
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
                onClick={() => selectNode(node.id)}
              />
              {showLabel && (
                <text
                  x={pos.x > center ? 12 : -12}
                  textAnchor={pos.x > center ? "start" : "end"}
                  dy={4}
                  fontSize={12}
                  fontWeight={600}
                  fill="#111"
                  stroke="#fff"
                  strokeWidth={3}
                  paintOrder="stroke"
                  style={{ pointerEvents: "none" }}
                >
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
    </div>
  );
}
