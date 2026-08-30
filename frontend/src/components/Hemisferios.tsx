// Visualización 3 — Hemisferios 2D (petición de la usuaria, 30/08/2026):
// "ha de ilustrar sobre todo la diferencia entre la conectividad inter
// hemisferial e intrahemisferial". A diferencia del connectograma (que
// distribuye los nodos por identidad, sin relación con su posición real)
// y del cerebro 3D (que muestra la anatomía completa), este panel es un
// esquema plano en vista axial (desde arriba): dos elipses -- IZQUIERDO y
// DERECHO -- separadas por una línea media discontinua, con el eje
// anteroposterior en vertical (ANTERIOR arriba, POSTERIOR abajo) y el eje
// medial-lateral en horizontal dentro de cada elipse.
//
// Reglas de rigor (sección 24) que gobiernan este componente:
//
// 1. El hemisferio de cada nodo viene SIEMPRE de `node.hemisphere`
//    (migración 0008 del backend, calculado por la propia ingesta de
//    cada atlas), nunca del signo de `position3d[0]`. Una región con
//    `hemisphere === null` (todavía no backfillada, o una estructura
//    real sin lateralidad como el tronco del encéfalo) no se dibuja en
//    ninguna elipse -- adivinar su lado sería precisamente el tipo de
//    error silencioso que la sección 24 prohíbe. Se cuentan aparte y se
//    avisa de cuántas quedan fuera, nunca se ocultan sin más.
// 2. La posición DENTRO de cada elipse no es arbitraria: el eje
//    horizontal usa el valor absoluto de la coordenada x real (0 =
//    línea media/medial, máximo = más lateral) y el eje vertical usa la
//    coordenada y real (anteroposterior). Ambos se normalizan contra el
//    rango real de los nodos que se van a dibujar -- nunca contra un
//    valor fijo inventado -- para que el esquema aproveche toda la
//    elipse sea cual sea el atlas cargado. La coordenada z (eje
//    superoinferior) no se usa: es el eje que la vista axial colapsa a
//    propósito, igual que el connectograma no usa ninguna coordenada 3D
//    y el cerebro 3D usa las tres.
// 3. La distinción intra/inter-hemisférica es la codificación visual
//    PRINCIPAL de este panel (color verde/rojo + estadística en texto),
//    pero se añade SOBRE las codificaciones ya obligatorias en el resto
//    de la aplicación, nunca las sustituye: el trazo discontinuo para
//    evidencia no directa y la flecha para conectividad efectiva siguen
//    exactamente el mismo criterio que en Connectogram.tsx/Brain3D.tsx.
// 4. Con atlas reales de cientos de regiones, un nombre o abreviatura
//    permanente junto a cada nodo volvería a solaparse igual que ya pasó
//    en el connectograma con HCP-MMP1.0 (360 regiones, corregido el
//    30/08/2026) -- aquí el problema sería peor, porque la posición
//    anatómica agrupa regiones vecinas muy cerca entre sí. Por eso este
//    panel nunca dibuja texto permanente junto al nodo: usa el mismo
//    recuadro de lectura fijo bajo el dibujo que ya se estableció para
//    el connectograma.
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { GraphNode } from "../types/domain";
import { useSelectionStore } from "../state/selection";
import { useFiltersStore } from "../state/filters";
import { filterGraph } from "../logic/visibility";
import { inducedConnections } from "../logic/induced";
import { exportSvgAsJpeg } from "../logic/exportImage";
import { NETWORK_COLORS, CONNECTION_TYPE_LABELS, EVIDENCE_LEVEL_LABELS } from "../theme/networks";
import type { GraphConnection } from "../types/domain";

interface Props {
  nodes: GraphNode[];
  connections: GraphConnection[];
}

// Geometría fija del esquema (vista axial esquemática, no una proyección
// anatómica exacta -- el propósito es legibilidad de la topología
// inter/intra-hemisférica, no precisión milimétrica de forma cortical).
const VIEW_W = 460;
const VIEW_H = 340;
const ELLIPSE_CY = 170;
const ELLIPSE_RX = 95;
const ELLIPSE_RY = 110;
const LEFT_CX = 125;
const RIGHT_CX = 335;
const MIDLINE_X = 230;

const INTRA_COLOR = "#2a9d5c";
const INTER_COLOR = "#d1495b";

export function Hemisferios({ nodes: allNodes, connections: allConnections }: Props) {
  const { selectedNodeIds, selectedConnectionId, toggleNode, selectConnection } =
    useSelectionStore();
  const filters = useFiltersStore();
  const { nodes, connections: filteredConnections } = filterGraph(allNodes, allConnections, filters);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Mismo criterio que Connectogram.tsx: con selección múltiple activa,
  // solo se dibuja la conectividad real entre las regiones elegidas.
  const induced = inducedConnections(filteredConnections, selectedNodeIds);
  const connections = induced ?? filteredConnections;
  const isInducedView = induced !== null;

  const lateralized = useMemo(() => nodes.filter((n) => n.hemisphere !== null), [nodes]);
  const unlateralizedCount = nodes.length - lateralized.length;

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Rangos reales de los nodos que de verdad se van a dibujar -- nunca un
  // rango fijo inventado -- para que el esquema aproveche siempre toda la
  // elipse, sea cual sea el atlas o el subconjunto filtrado.
  const { maxAbsX, minY, maxY } = useMemo(() => {
    let maxAbsX = 0;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const n of lateralized) {
      const [x, y] = n.position3d;
      maxAbsX = Math.max(maxAbsX, Math.abs(x));
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    if (!Number.isFinite(minY)) minY = 0;
    if (!Number.isFinite(maxY)) maxY = 0;
    return { maxAbsX: Math.max(maxAbsX, 1e-6), minY, maxY };
  }, [lateralized]);

  const yRange = Math.max(maxY - minY, 1e-6);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const node of lateralized) {
      const [x, y] = node.position3d;
      const tLateral = Math.min(Math.abs(x) / maxAbsX, 1); // 0 = medial, 1 = lateral
      const tAnterior = (y - minY) / yRange; // 0 = posterior, 1 = anterior
      const screenY = ELLIPSE_CY + ELLIPSE_RY - tAnterior * (2 * ELLIPSE_RY);
      const screenX =
        node.hemisphere === "L"
          ? LEFT_CX + ELLIPSE_RX - tLateral * (2 * ELLIPSE_RX)
          : RIGHT_CX - ELLIPSE_RX + tLateral * (2 * ELLIPSE_RX);
      map.set(node.id, { x: screenX, y: screenY });
    }
    return map;
  }, [lateralized, maxAbsX, minY, yRange]);

  // Estadística principal del panel (petición explícita de la usuaria:
  // esta distinción debe ilustrarse "sobre todo"). Se calcula sobre las
  // conexiones que de verdad se dibujan (tras filtros/selección), y solo
  // sobre las que tienen los dos extremos lateralizados -- una conexión
  // donde algún extremo no tiene hemisferio asignado no se puede
  // clasificar como intra ni inter, así que se cuenta aparte en vez de
  // forzarla a una de las dos categorías.
  const { intraCount, interCount, unclassifiableCount } = useMemo(() => {
    let intraCount = 0;
    let interCount = 0;
    let unclassifiableCount = 0;
    for (const c of connections) {
      const sourceHemi = nodeById.get(c.source)?.hemisphere ?? null;
      const targetHemi = nodeById.get(c.target)?.hemisphere ?? null;
      if (sourceHemi === null || targetHemi === null) {
        unclassifiableCount++;
      } else if (sourceHemi === targetHemi) {
        intraCount++;
      } else {
        interCount++;
      }
    }
    return { intraCount, interCount, unclassifiableCount };
  }, [connections, nodeById]);

  const classifiedTotal = intraCount + interCount;
  const interPct = classifiedTotal > 0 ? Math.round((interCount / classifiedTotal) * 100) : null;

  const svgRef = useRef<SVGSVGElement>(null);
  const handleExport = () => {
    if (svgRef.current) {
      exportSvgAsJpeg(svgRef.current, `neurograph-hemisferios-${Date.now()}.jpg`);
    }
  };

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
        {" · "}
        {hoveredNode.hemisphere === "L" ? "hemisferio izquierdo" : hoveredNode.hemisphere === "R" ? "hemisferio derecho" : "sin hemisferio asignado"}
      </span>
    );
  } else if (selectedConnection) {
    const source = nodeById.get(selectedConnection.source);
    const target = nodeById.get(selectedConnection.target);
    const sourceHemi = source?.hemisphere ?? null;
    const targetHemi = target?.hemisphere ?? null;
    const kind =
      sourceHemi !== null && targetHemi !== null
        ? sourceHemi === targetHemi
          ? "intra-hemisférica"
          : "inter-hemisférica"
        : "sin clasificar (algún extremo sin hemisferio asignado)";
    readout = (
      <span>
        <strong>{source?.abbreviation ?? selectedConnection.source}</strong>
        {" → "}
        <strong>{target?.abbreviation ?? selectedConnection.target}</strong>
        {" · "}
        {CONNECTION_TYPE_LABELS[selectedConnection.type]}
        {" · "}
        {EVIDENCE_LEVEL_LABELS[selectedConnection.evidenceLevel]}
        {" · "}
        <strong>{kind}</strong>
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
      <span className="hemisferios-readout__legend">
        <strong>{selectedNodesList.length} regiones seleccionadas</strong>
        {isInducedView && (
          <> · {connections.length} conexión{connections.length === 1 ? "" : "es"} entre ellas</>
        )}
      </span>
    );
  } else {
    readout = <span className="hemisferios-readout__placeholder">Pasa el ratón o selecciona una región.</span>;
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <button type="button" className="export-btn" onClick={handleExport}>
          Exportar JPEG
        </button>
      </div>

      <div className="hemisferios-summary">
        <strong>{intraCount}</strong> intra-hemisféricas · <strong>{interCount}</strong> inter-hemisféricas
        {interPct !== null && <> ({interPct}% de las clasificadas es inter-hemisférica)</>}
        {unclassifiableCount > 0 && (
          <span className="hemisferios-summary__note">
            {" "}
            · {unclassifiableCount} conexión{unclassifiableCount === 1 ? "" : "es"} sin clasificar (algún extremo sin hemisferio asignado todavía)
          </span>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        role="img"
        aria-label="Esquema de hemisferios"
        style={{ background: "#fff", borderRadius: 8, display: "block" }}
      >
        <defs>
          <marker
            id="hemisferios-arrow"
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

        <text x={MIDLINE_X} y={14} textAnchor="middle" fontSize={11} fontWeight={700} fill="#555">
          ANTERIOR
        </text>
        <text x={MIDLINE_X} y={VIEW_H - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill="#555">
          POSTERIOR
        </text>
        <text x={LEFT_CX} y={ELLIPSE_CY - ELLIPSE_RY - 10} textAnchor="middle" fontSize={10} fill="#777">
          IZQUIERDO
        </text>
        <text x={RIGHT_CX} y={ELLIPSE_CY - ELLIPSE_RY - 10} textAnchor="middle" fontSize={10} fill="#777">
          DERECHO
        </text>

        <line
          x1={MIDLINE_X}
          y1={ELLIPSE_CY - ELLIPSE_RY - 15}
          x2={MIDLINE_X}
          y2={ELLIPSE_CY + ELLIPSE_RY + 15}
          stroke="#bbb"
          strokeDasharray="4 4"
        />
        <ellipse cx={LEFT_CX} cy={ELLIPSE_CY} rx={ELLIPSE_RX} ry={ELLIPSE_RY} fill="#fbfbfb" stroke="#ddd" />
        <ellipse cx={RIGHT_CX} cy={ELLIPSE_CY} rx={ELLIPSE_RX} ry={ELLIPSE_RY} fill="#fbfbfb" stroke="#ddd" />

        <g>
          {connections.map((conn) => {
            const a = positions.get(conn.source);
            const b = positions.get(conn.target);
            if (!a || !b) return null;
            const source = nodeById.get(conn.source);
            const target = nodeById.get(conn.target);
            const sourceHemi = source?.hemisphere ?? null;
            const targetHemi = target?.hemisphere ?? null;
            const isClassified = sourceHemi !== null && targetHemi !== null;
            const isInter = isClassified && sourceHemi !== targetHemi;
            const color = !isClassified ? "#999" : isInter ? INTER_COLOR : INTRA_COLOR;
            const isSelected =
              isInducedView ||
              selectedConnectionId === conn.id ||
              selectedNodeIds.has(conn.source) ||
              selectedNodeIds.has(conn.target);
            // Sección 5.1/24: la evidencia no directa nunca se dibuja
            // igual que la observada directamente, y la conectividad
            // efectiva siempre lleva flecha -- exactamente el mismo
            // criterio que Connectogram.tsx/Brain3D.tsx, aquí superpuesto
            // sobre la codificación de color intra/inter.
            const isDashed = conn.evidenceLevel !== "direct";
            const isDirected = conn.type === "effective";
            return (
              <line
                key={conn.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={color}
                strokeOpacity={isSelected ? 0.95 : 0.45}
                strokeWidth={Math.max(1, conn.weight * 5) * (isSelected ? 1.4 : 1)}
                strokeDasharray={isDashed ? "6 4" : undefined}
                markerEnd={isDirected ? "url(#hemisferios-arrow)" : undefined}
                style={{ cursor: "pointer" }}
                onClick={() => selectConnection(conn.id)}
              />
            );
          })}
        </g>

        <g>
          {lateralized.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const isSelected = selectedNodeIds.has(node.id);
            const isHovered = hoveredNodeId === node.id;
            const r = isSelected || isHovered ? 6.5 : 4;
            return (
              <circle
                key={node.id}
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={NETWORK_COLORS[node.network] ?? "#888"}
                stroke={isSelected ? "#111" : "none"}
                strokeWidth={2}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
                onClick={() => toggleNode(node.id)}
              />
            );
          })}
        </g>
      </svg>

      {unlateralizedCount > 0 && (
        <p className="hemisferios-unlateralized-note">
          {unlateralizedCount} región{unlateralizedCount === 1 ? "" : "es"} sin hemisferio asignado todavía
          (no se {unlateralizedCount === 1 ? "muestra" : "muestran"} en este esquema, nunca se adivina su lado).
        </p>
      )}

      <div className="hemisferios-readout">{readout}</div>
    </div>
  );
}
