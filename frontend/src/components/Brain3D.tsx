// Visualización 2 — Cerebro 3D + tractografía (sección 5.2).
// Implementación mínima: cada región es una esfera en su posición 3D;
// cada conexión, una línea recta entre dos esferas (un tracto real,
// cuando exista, sustituirá esta línea por la geometría de streamline
// cargada del backend — sección 4.1 de docs/analisis-arquitectura.md).
// Selección sincronizada vía el store compartido (sección 5.3). Lo
// hipotético/indirecto se dibuja discontinuo y la conectividad efectiva
// lleva una flecha de dirección (secciones 5.1 y 24): la codificación
// visual debe coincidir con la del connectograma.
//
// Nota de implementación: usamos three/examples/jsm/controls/OrbitControls
// directamente (de forma imperativa) en vez de @react-three/drei, para no
// arrastrar su enorme superficie de dependencias opcionales (mediapipe,
// rapier, etc.) que no necesitamos en este esqueleto. Por la misma razón,
// las conexiones usan la etiqueta <threeLine> que @react-three/fiber ya
// expone precisamente para evitar la colisión entre el <line> de three.js
// y el <line> de SVG en el sistema de tipos de React.
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import type { GraphConnection, GraphNode } from "../types/domain";
import { useSelectionStore } from "../state/selection";
import { useFiltersStore } from "../state/filters";
import { filterGraph } from "../logic/visibility";
import { NETWORK_COLORS } from "../theme/networks";

// Registro explícito de <threeLine> bajo la clave 'ThreeLine' del
// catálogo de react-three-fiber (en vez de confiar en que r3f le quite
// el prefijo "three" automáticamente). Confirmado el 28/08/2026: en esta
// versión (@react-three/fiber 9.7.0 + React 19), quitar el prefijo SÍ
// pasa al crear el elemento por primera vez, pero NO al actualizarlo
// (commitUpdate llama a validateInstance con el nombre sin recortar) —
// una inconsistencia real de la librería entre creación y actualización,
// nunca detectada antes porque `connections` siempre había estado vacío
// (Fase 4 no empezada): la primera vez que de verdad se dibujó una línea
// fue con los datos de demostración (que sí traen conexiones), al caer
// a ellos por un fallo de CORS — ver riesgo 12 del análisis de
// arquitectura. Con el registro explícito, la búsqueda en el catálogo
// encuentra 'ThreeLine' directamente tanto al crear como al actualizar,
// sin pasar nunca por ese mecanismo de recorte.
extend({ ThreeLine: THREE.Line });

// Con 8 nodos de demostración, orbitar alrededor del origen (0,0,0) daba
// igual porque los datos ya estaban ahí centrados. Con 360 regiones
// reales el centro real de la nube de puntos no coincide con el origen
// (ver docs/analisis-arquitectura.md): si la cámara orbita alrededor de
// un punto que no es donde está el cerebro, al girar el cerebro se sale
// del encuadre — parece que "todo desaparece" aunque no haya ningún
// error. Por eso el objetivo de la cámara se calcula a partir de los
// nodos reales en vez de asumir el origen.
function computeCentroid(nodes: GraphNode[]): THREE.Vector3 {
  if (nodes.length === 0) return new THREE.Vector3(0, 0, 0);
  const sum = nodes.reduce(
    (acc, n) => {
      acc.x += n.position3d[0];
      acc.y += n.position3d[1];
      acc.z += n.position3d[2];
      return acc;
    },
    { x: 0, y: 0, z: 0 }
  );
  return new THREE.Vector3(sum.x / nodes.length, sum.y / nodes.length, sum.z / nodes.length);
}

function Controls({ target }: { target: THREE.Vector3 }) {
  const { camera, gl } = useThree();
  const controls = useMemo(
    () => new OrbitControls(camera, gl.domElement),
    [camera, gl]
  );
  useEffect(() => {
    controls.enablePan = false;
    // Límites de zoom: sin ellos, la rueda del ratón puede acercar la
    // cámara casi hasta el plano "near" (todo se recorta) o alejarla
    // muchísimo (el cerebro se vuelve un punto). No es la causa del
    // problema reportado, pero es la misma familia de fallo silencioso.
    controls.minDistance = 2;
    controls.maxDistance = 30;
    controls.target.copy(target);
    controls.update();
    return () => controls.dispose();
  }, [controls, target]);
  useFrame(() => controls.update());
  return null;
}

// Si el contexto WebGL se pierde (ocurre en algunos equipos con GPU
// integrada cuando hay muchos objetos en pantalla), el navegador no lanza
// ningún error de JavaScript: simplemente deja de dibujar, y la escena
// desaparece sin avisar — el síntoma exacto de "parece que ha crusheado".
// Esto lo detecta y avisa en vez de dejar un lienzo en blanco sin
// explicación.
function ContextLossWatcher({ onLost }: { onLost: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      // eslint-disable-next-line no-console
      console.error("Se perdió el contexto WebGL del cerebro 3D.");
      onLost();
    };
    canvas.addEventListener("webglcontextlost", handleLost);
    return () => canvas.removeEventListener("webglcontextlost", handleLost);
  }, [gl, onLost]);
  return null;
}

function NodeMesh({ node }: { node: GraphNode }) {
  const { selectedNodeId, selectNode } = useSelectionStore();
  const isSelected = selectedNodeId === node.id;
  return (
    <mesh position={node.position3d} onClick={() => selectNode(node.id)}>
      {/* 14x14 en vez de 24x24: con cientos de regiones reales, cada
          segmento de más cuesta 360 veces más caro que en la demo de 8
          nodos. Sigue viéndose redondo a esta escala. */}
      <sphereGeometry args={[isSelected ? 0.16 : 0.11, 14, 14]} />
      <meshStandardMaterial
        color={NETWORK_COLORS[node.network] ?? "#888"}
        emissive={isSelected ? "#ffffff" : "#000000"}
        emissiveIntensity={isSelected ? 0.4 : 0}
      />
    </mesh>
  );
}

function DirectionArrow({
  from,
  to,
  color,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
}) {
  // Un pequeño cono a un 80% del trayecto, orientado de origen a destino:
  // el equivalente 3D de la flecha del connectograma para conectividad
  // efectiva (sección 5.1: "Se puede codificar dirección... mediante
  // flechas").
  const position = useMemo(() => from.clone().lerp(to, 0.8), [from, to]);
  const quaternion = useMemo(() => {
    const direction = to.clone().sub(from).normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction
    );
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <coneGeometry args={[0.035, 0.09, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function ConnectionLine({
  a,
  b,
  isSelected,
  isDashed,
  isDirected,
  onClick,
}: {
  a: [number, number, number];
  b: [number, number, number];
  isSelected: boolean;
  isDashed: boolean;
  isDirected: boolean;
  onClick: () => void;
}) {
  const from = useMemo(() => new THREE.Vector3(...a), [a]);
  const to = useMemo(() => new THREE.Vector3(...b), [b]);
  const color = isSelected ? "#222222" : "#999999";

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints([from, to]);
    if (isDashed) {
      // computeLineDistances() vive en THREE.Line, no en BufferGeometry;
      // como aquí no tenemos la instancia de Line todavía, se calcula a
      // mano el atributo lineDistance que necesita lineDashedMaterial
      // (con dos puntos es solo [0, distancia entre ambos]).
      geom.setAttribute(
        "lineDistance",
        new THREE.Float32BufferAttribute([0, from.distanceTo(to)], 1)
      );
    }
    return geom;
  }, [from, to, isDashed]);

  return (
    <>
      <threeLine geometry={geometry} onClick={onClick}>
        {isDashed ? (
          <lineDashedMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.95 : 0.35}
            dashSize={0.08}
            gapSize={0.06}
          />
        ) : (
          <lineBasicMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.95 : 0.35}
          />
        )}
      </threeLine>
      {isDirected && <DirectionArrow from={from} to={to} color={color} />}
    </>
  );
}

interface Props {
  nodes: GraphNode[];
  connections: GraphConnection[];
}

export function Brain3D({ nodes: allNodes, connections: allConnections }: Props) {
  const { selectedNodeId, selectedConnectionId, selectConnection } = useSelectionStore();
  const filters = useFiltersStore();
  const { nodes, connections } = filterGraph(allNodes, allConnections, filters);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const [contextLost, setContextLost] = useState(false);
  // Centroide de TODOS los nodos (no solo los visibles tras filtrar): así
  // el punto de giro no salta cada vez que se oculta o muestra una red.
  const target = useMemo(() => computeCentroid(allNodes), [allNodes]);

  if (contextLost) {
    return (
      <p className="canvas-error">
        Se perdió el contexto gráfico (WebGL) al dibujar el cerebro 3D —
        pasa a veces con muchos objetos en pantalla en algunos equipos.
        Recarga la página. Si se repite, dime qué navegador y sistema usas.
      </p>
    );
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          "webglcontextrestored",
          () => setContextLost(false),
          { once: true }
        );
      }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={60} />
      <Controls target={target} />
      <ContextLossWatcher onLost={() => setContextLost(true)} />
      {nodes.map((node) => (
        <NodeMesh key={node.id} node={node} />
      ))}
      {connections.map((conn) => {
        const a = nodeById.get(conn.source);
        const b = nodeById.get(conn.target);
        if (!a || !b) return null;
        const isSelected =
          selectedConnectionId === conn.id ||
          selectedNodeId === conn.source ||
          selectedNodeId === conn.target;
        return (
          <ConnectionLine
            key={conn.id}
            a={a.position3d}
            b={b.position3d}
            isSelected={isSelected}
            isDashed={conn.evidenceLevel !== "direct"}
            isDirected={conn.type === "effective"}
            onClick={() => selectConnection(conn.id)}
          />
        );
      })}
    </Canvas>
  );
}
