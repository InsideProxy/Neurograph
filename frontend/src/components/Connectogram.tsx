// Visualización 1 — Connectogram / diagrama de cuerdas (sección 5.1).
// Implementación mínima: nodos dispuestos en círculo (D3 para el layout
// angular), conexiones como arcos. El grosor codifica el peso; el color,
// la red a la que pertenece cada nodo origen. Selección sincronizada vía
// el store compartido (sección 5.3).
import { useMemo } from "react";
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

export function Connectogram({ nodes: allNodes, connections: allConnections, size = 420 }: Props) {
  const { selectedNodeId, selectedConnectionId, selectNode, selectConnection } =
    useSelectionStore();
  const filters = useFiltersStore();
  const { nodes, connections } = filterGraph(allNodes, allConnections, filters);

  const radius = size / 2 - 40;
  const center = size / 2;

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
    <svg width={size} height={size} role="img" aria-label="Connectograma">
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
          return (
            <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
              <circle
                r={isSelected ? 9 : 6}
                fill={NETWORK_COLORS[node.network] ?? "#888"}
                stroke={isSelected ? "#111" : "none"}
                strokeWidth={2}
                style={{ cursor: "pointer" }}
                onClick={() => selectNode(node.id)}
              />
              <text
                x={pos.x > center ? 12 : -12}
                textAnchor={pos.x > center ? "start" : "end"}
                dy={4}
                fontSize={11}
                fill="#333"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
