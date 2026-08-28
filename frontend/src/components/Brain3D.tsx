// Visualización 2 — Cerebro 3D + tractografía (sección 5.2).
// Implementación mínima: cada región es una esfera en su posición 3D;
// cada conexión, una línea recta entre dos esferas (un tracto real,
// cuando exista, sustituirá esta línea por la geometría de streamline
// cargada del backend — sección 4.1 de docs/analisis-arquitectura.md).
// Selección sincronizada vía el store compartido (sección 5.3).
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

function ConnectionLine({
  a,
  b,
  isSelected,
  onClick,
}: {
  a: [number, number, number];
  b: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
}) {
  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...a),
      new THREE.Vector3(...b),
    ]);
  }, [a, b]);

  return (
    <threeLine geometry={geometry} onClick={onClick}>
      <lineBasicMaterial
        color={isSelected ? "#222222" : "#999999"}
        transparent
        opacity={isSelected ? 0.95 : 0.35}
      />
    </threeLine>
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
            onClick={() => selectConnection(conn.id)}
          />
        );
      })}
    </Canvas>
  );
}
