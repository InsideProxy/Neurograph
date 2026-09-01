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
// 4. Petición explícita de la usuaria (30/08/2026, tras revisar el panel
//    con datos reales): abreviatura permanente junto a cada nodo, igual
//    que el connectograma -- sustituye la decisión de diseño anterior
//    (documentada aquí hasta hoy) de no dibujar texto permanente por
//    riesgo de solape con atlas de cientos de regiones agrupadas por
//    posición anatómica. Ese riesgo sigue siendo real (más aquí que en
//    el connectograma, donde los nodos se reparten uniformemente en un
//    círculo): se mitiga igual que allí -- radio de nodo y tamaño de
//    letra que se reducen cuando hay muchos nodos que dibujar (mismo
//    criterio que Connectogram.tsx) -- pero no se puede eliminar del
//    todo sin dejar de cumplir lo que pide la usuaria. El recuadro de
//    lectura fijo bajo el dibujo se mantiene para el nombre completo
//    (la abreviatura nunca sustituye esa información, solo la
//    complementa).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { GraphNode } from "../types/domain";
import { useSelectionStore } from "../state/selection";
import { useFiltersStore } from "../state/filters";
import { filterGraph } from "../logic/visibility";
import { inducedConnections } from "../logic/induced";
import { exportSvgAsJpeg } from "../logic/exportImage";
import { abbreviationAddsInformation } from "../logic/regionLabel";
import {
  NETWORK_COLORS,
  CONNECTION_TYPE_LABELS,
  EVIDENCE_LEVEL_LABELS,
  NEUTRAL_COLOR,
  ACCENT_SELECTED_COLOR,
  INTRA_HEMISPHERE_COLOR,
  INTER_HEMISPHERE_COLOR,
} from "../theme/networks";
import type { GraphConnection } from "../types/domain";

interface Props {
  nodes: GraphNode[];
  connections: GraphConnection[];
}

// Mismo criterio que Connectogram.tsx (fix del 30/08/2026): en HCP-MMP1.0
// el nombre completo ya empieza por la abreviatura ("V1 (hemisferio
// izquierdo)" para la abreviatura "V1"), así que mostrar ambos por
// separado repetía la misma información dos veces. Ver
// logic/regionLabel.ts para el porqué completo.
function RegionReadoutText({ node }: { node: GraphNode }) {
  if (!abbreviationAddsInformation(node)) return <>{node.label}</>;
  return (
    <>
      <strong>{node.abbreviation}</strong> — {node.label}
    </>
  );
}

// Geometría del esquema (vista axial esquemática, no una proyección
// anatómica exacta -- el propósito es legibilidad de la topología
// inter/intra-hemisférica, no precisión milimétrica de forma cortical).
// Diseñada originalmente a 460x340 unidades; esa proporción se conserva
// como DISEÑO, nunca como tamaño fijo en píxeles -- ver `scale` dentro
// del componente (fix del 30/08/2026, líneas gruesas) más abajo.
const DESIGN_VIEW_W = 460;
const DESIGN_VIEW_H = 340;
const DESIGN_ELLIPSE_CY = 170;
const DESIGN_ELLIPSE_RX = 95;
const DESIGN_ELLIPSE_RY = 110;
const DESIGN_LEFT_CX = 125;
const DESIGN_RIGHT_CX = 335;
const DESIGN_MIDLINE_X = 230;

// INTRA_COLOR/INTER_COLOR vivían aquí como constantes locales; ahora se
// importan de theme/networks.ts (decisión 18, 30/08/2026) porque dejaron
// de ser "un verde y un rojo cualquiera" -- son colores calculados para
// leerse con contraste suficiente tanto sobre el tema oscuro de la app
// en pantalla como sobre el blanco que fuerza siempre la exportación
// (decisión 11), y ese cálculo tiene que vivir en un solo sitio para no
// desincronizarse con Connectogram.tsx/Brain3D.tsx/DetailPanel.tsx.
const INTRA_COLOR = INTRA_HEMISPHERE_COLOR;
const INTER_COLOR = INTER_HEMISPHERE_COLOR;

export function Hemisferios({ nodes: allNodes, connections: allConnections }: Props) {
  const { selectedNodeIds, selectedConnectionId, toggleNode, selectConnection } =
    useSelectionStore();
  const filters = useFiltersStore();
  const { nodes, connections: filteredConnections } = filterGraph(allNodes, allConnections, filters);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Fix del 30/08/2026 (bug real reportado por la usuaria: "las líneas de
  // unión [...] son demasiado gruesas, no entiendo por qué"). Causa: este
  // <svg> declaraba un viewBox fijo de 460x340 con width="100%" y SIN
  // height explícito -- en cuanto el panel se renderizaba más ancho que
  // 460px (el layout flex de la app lo hace casi siempre), el navegador
  // escalaba TODO el sistema de coordenadas del viewBox para llenar ese
  // ancho, así que 1 unidad de viewBox dejaba de equivaler a 1 píxel CSS
  // y todo lo definido en unidades de viewBox -- grosor de línea, radio
  // de nodo, tamaño de letra -- se ampliaba en la misma proporción, sin
  // que ninguna parte del código pidiera ese engrosamiento.
  //
  // Mismo criterio que Connectogram.tsx (que nunca ha tenido este bug):
  // se mide el ancho real del contenedor con ResizeObserver y el <svg>
  // declara `width`/`height` en píxeles EXACTOS iguales a su viewBox, de
  // forma que 1 unidad de viewBox = 1 píxel CSS SIEMPRE, sea cual sea el
  // ancho del panel. La disposición (elipses, línea media, textos de eje)
  // se reescala con `scale` para seguir aprovechando todo el ancho
  // disponible -- pero el grosor de línea, el radio de nodo y el tamaño
  // de letra (ya escalados solo por número de nodos, nunca por tamaño de
  // contenedor) se quedan en valores absolutos fijos, exactamente igual
  // que en Connectogram.tsx.
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(DESIGN_VIEW_W);

  // Sin tope superior (30/08/2026, corrige una regresión real reportada por
  // la usuaria: "el panel... ha quedado demasiado pequeño. Al corregir el
  // grosor de las líneas se ha empequeñecido todo el cuadro"). Antes de
  // este archivo tener NINGÚN control de tamaño (`width="100%"` sin más),
  // el esquema podía crecer sin límite hasta llenar el panel entero, por
  // ancho que fuera. El primer intento de corregir el bug de las líneas
  // gruesas añadió aquí un tope de 800px "para que siguiera siendo
  // legible" -- copiado sin pensarlo del tope de 720px de
  // Connectogram.tsx -- pero ese tope es nuevo respecto al comportamiento
  // de antes, y en un panel más ancho que 800px encogía visiblemente el
  // dibujo entero (elipses, letra, todo) frente a lo que la usuaria ya
  // conocía. Quitado: solo se mantiene un suelo de 320px para que el
  // esquema no se vuelva ilegible en una ventana muy estrecha, igual que
  // el suelo (pero no el techo) de Connectogram.tsx.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (!width) return;
      setMeasuredWidth(Math.round(Math.max(320, width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = measuredWidth / DESIGN_VIEW_W;
  const VIEW_W = measuredWidth;
  const VIEW_H = Math.round(DESIGN_VIEW_H * scale);
  const ELLIPSE_CY = DESIGN_ELLIPSE_CY * scale;
  const ELLIPSE_RX = DESIGN_ELLIPSE_RX * scale;
  const ELLIPSE_RY = DESIGN_ELLIPSE_RY * scale;
  const LEFT_CX = DESIGN_LEFT_CX * scale;
  const RIGHT_CX = DESIGN_RIGHT_CX * scale;
  const MIDLINE_X = DESIGN_MIDLINE_X * scale;

  // Mismo criterio que Connectogram.tsx: con selección múltiple activa,
  // solo se dibuja la conectividad real entre las regiones elegidas.
  const induced = inducedConnections(filteredConnections, selectedNodeIds);
  const connections = induced ?? filteredConnections;
  const isInducedView = induced !== null;

  const lateralized = useMemo(() => nodes.filter((n) => n.hemisphere !== null), [nodes]);
  const unlateralizedCount = nodes.length - lateralized.length;

  // Radio de nodo y tamaño de letra escalados por cuántos nodos hay que
  // dibujar (mismo criterio que Connectogram.tsx) -- con la abreviatura
  // permanente ya activada (30/08/2026), un atlas de cientos de regiones
  // necesita puntos y letra más pequeños todavía que uno de unas pocas
  // decenas para seguir siendo legible.
  const nodeRadius = lateralized.length > 150 ? 2 : lateralized.length > 40 ? 2.5 : 3.5;
  const labelFontSize = lateralized.length > 150 ? 4.5 : lateralized.length > 40 ? 5.5 : 7;

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
  }, [lateralized, maxAbsX, minY, yRange, scale]);

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
        <RegionReadoutText node={hoveredNode} />
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
        {/* Abreviatura + nombre completo (30/08/2026, aclaración de la
            usuaria tras la decisión 19: "en la leyenda ha de aparecer la
            abreviatura y a continuación el nombre completo... no solo la
            abreviatura") -- la decisión 19 ya había corregido esto para un
            único nodo/región seleccionados, pero se quedó sin aplicar aquí,
            en el origen/destino de una CONEXIÓN seleccionada, que seguía
            mostrando solo la abreviatura. Mismo componente
            `RegionReadoutText` que ya usa el resto del panel, para que el
            criterio de cuándo el nombre completo aporta algo nuevo sea
            siempre el mismo (ver logic/regionLabel.ts). */}
        {source ? <RegionReadoutText node={source} /> : <strong>{selectedConnection.source}</strong>}
        {" → "}
        {target ? <RegionReadoutText node={target} /> : <strong>{selectedConnection.target}</strong>}
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
        <RegionReadoutText node={node} />
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
    <div ref={containerRef} style={{ width: "100%" }}>
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
        width={VIEW_W}
        height={VIEW_H}
        role="img"
        aria-label="Esquema de hemisferios"
        className="viz-svg"
        style={{ borderRadius: 8, display: "block" }}
      >
        <defs>
          {/* Mismo criterio que Connectogram.tsx (decisión 18,
              30/08/2026): un marcador neutro y otro con el color de
              acento de selección, en vez de un único "#222" invisible
              contra el fondo oscuro cuando la conexión no está
              seleccionada. */}
          <marker
            id="hemisferios-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={NEUTRAL_COLOR} />
          </marker>
          <marker
            id="hemisferios-arrow-selected"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={ACCENT_SELECTED_COLOR} />
          </marker>
        </defs>

        <text x={MIDLINE_X} y={14} textAnchor="middle" fontSize={11} fontWeight={700} fill={NEUTRAL_COLOR}>
          ANTERIOR
        </text>
        <text x={MIDLINE_X} y={VIEW_H - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={NEUTRAL_COLOR}>
          POSTERIOR
        </text>
        <text x={LEFT_CX} y={ELLIPSE_CY - ELLIPSE_RY - 10} textAnchor="middle" fontSize={10} fontWeight={600} fill={NEUTRAL_COLOR}>
          IZQUIERDO
        </text>
        <text x={RIGHT_CX} y={ELLIPSE_CY - ELLIPSE_RY - 10} textAnchor="middle" fontSize={10} fontWeight={600} fill={NEUTRAL_COLOR}>
          DERECHO
        </text>

        {/* Elipses sin relleno (decisión 18, 30/08/2026): antes tenían un
            relleno "#fbfbfb" casi blanco, pensado solo para fondo claro
            -- sobre el tema oscuro se veía como un bloque casi blanco
            enorme. Sin relleno, el fondo del propio panel (oscuro en
            pantalla, blanco forzado en la exportación) se ve directamente
            a través, y solo el trazo necesita ser "intermedio". */}
        <line
          x1={MIDLINE_X}
          y1={ELLIPSE_CY - ELLIPSE_RY - 15}
          x2={MIDLINE_X}
          y2={ELLIPSE_CY + ELLIPSE_RY + 15}
          stroke={NEUTRAL_COLOR}
          strokeDasharray="4 4"
        />
        <ellipse cx={LEFT_CX} cy={ELLIPSE_CY} rx={ELLIPSE_RX} ry={ELLIPSE_RY} fill="none" stroke={NEUTRAL_COLOR} />
        <ellipse cx={RIGHT_CX} cy={ELLIPSE_CY} rx={ELLIPSE_RX} ry={ELLIPSE_RY} fill="none" stroke={NEUTRAL_COLOR} />

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
            const color = !isClassified ? NEUTRAL_COLOR : isInter ? INTER_COLOR : INTRA_COLOR;
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
                strokeOpacity={isSelected ? 0.95 : 0.6}
                strokeWidth={Math.max(1, conn.weight * 5) * (isSelected ? 1.4 : 1)}
                strokeDasharray={isDashed ? "6 4" : undefined}
                markerEnd={
                  isDirected
                    ? `url(#hemisferios-arrow${isSelected ? "-selected" : ""})`
                    : undefined
                }
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
            const r = isSelected || isHovered ? nodeRadius + 1.5 : nodeRadius;
            // Dirección de la etiqueta (30/08/2026, abreviatura permanente
            // pedida por la usuaria): mismo principio que el connectograma
            // -- desplazar en la dirección real desde el CENTRO hacia el
            // nodo, nunca con un offset horizontal/vertical fijo -- pero
            // aquí los nodos no están todos a la misma distancia de un
            // único centro (no es un círculo, son dos elipses), así que la
            // dirección se calcula normalizando por los semiejes de la
            // elipse de su propio hemisferio (rx, ry) antes de tomar el
            // vector unitario: así un nodo cerca del borde superior de la
            // elipse se etiqueta hacia arriba, uno cerca del borde lateral
            // se etiqueta hacia el lado, sea cual sea la forma real
            // (ELLIPSE_RX != ELLIPSE_RY) de la elipse.
            const ellipseCx = node.hemisphere === "L" ? LEFT_CX : RIGHT_CX;
            const dx = (pos.x - ellipseCx) / ELLIPSE_RX;
            const dy = (pos.y - ELLIPSE_CY) / ELLIPSE_RY;
            const dMag = Math.hypot(dx, dy) || 1e-6;
            const ux = dx / dMag;
            const uy = dy / dMag;
            const labelOffset = r + 5;
            const labelX = pos.x + ux * labelOffset;
            const labelY = pos.y + uy * labelOffset;
            const textAnchor = ux > 0.3 ? "start" : ux < -0.3 ? "end" : "middle";
            return (
              <g key={node.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={NETWORK_COLORS[node.network] ?? "#888"}
                  stroke={isSelected ? ACCENT_SELECTED_COLOR : NEUTRAL_COLOR}
                  strokeWidth={isSelected ? 2.5 : 1}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
                  onClick={() => toggleNode(node.id)}
                />
                {node.abbreviation && (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor={textAnchor}
                    dominantBaseline="central"
                    fontSize={isSelected || isHovered ? labelFontSize + 1.5 : labelFontSize}
                    fontWeight={isSelected || isHovered ? 700 : 600}
                    fill={NEUTRAL_COLOR}
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
