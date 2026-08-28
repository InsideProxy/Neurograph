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
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { GraphConnection, GraphNode } from "../types/domain";
import { useSelectionStore } from "../state/selection";
import { useFiltersStore } from "../state/filters";
import { filterGraph } from "../logic/visibility";
import { NETWORK_COLORS } from "../theme/networks";

function Controls() {
  const { camera, gl } = useThree();
  const controls = useMemo(
    () => new OrbitControls(camera, gl.domElement),
    [camera, gl]
  );
  useEffect(() => {
    controls.enablePan = false;
    return () => controls.dispose();
  }, [controls]);
  useFrame(() => controls.update());
  return null;
}

function NodeMesh({ node }: { node: GraphNode }) {
  const { selectedNodeId, selectNode } = useSelectionStore();
  const isSelected = selectedNodeId === node.id;
  return (
    <mesh position={node.position3d} onClick={() => selectNode(node.id)}>
      <sphereGeometry args={[isSelected ? 0.16 : 0.11, 24, 24]} />
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

  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={60} />
      <Controls />
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
