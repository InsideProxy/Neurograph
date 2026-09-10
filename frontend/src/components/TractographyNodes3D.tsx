// Cuarta pestaña de tractografía: nodos derivados de la parcelación
// (decisión 66, 09/09/2026) -- petición de la usuaria: "hagamos una
// cuarta pestaña con nodos derivados de tractografía, pues, nos vale
// para lo que queremos que es ubicar redes... se seleccionan nodos y el
// programa devuelve la tractografía que los une". Investigado antes de
// construir nada (ver docs/analisis-arquitectura.md, decisión 66): NO
// existe ningún registro espacial verificado entre el espacio propio de
// ORG-800FC-100HCP y MNI152/fsLR32k, así que estos nodos NUNCA se
// mezclan con GraphNode/Coordinate de otros atlas -- son 176 etiquetas
// reales y con nombre verificado del wmparc de este mismo atlas
// (backend/ingestion/tractography/wmparc_labels.py), en su mismo
// espacio de referencia real.
//
// Misma estructura exacta que Tractography3D.tsx (petición explícita de
// la usuaria): lista de nodos con casilla a la izquierda, canvas 3D
// único a la derecha, reutilizando la malla de fondo ya existente
// (ReferenceMesh, mismo .glb -- mismo espacio de referencia real,
// verificado en la decisión 63). A diferencia de Tractography3D.tsx
// (selección aditiva de TRACTOS que se dibujan cada uno por su cuenta),
// aquí la selección es de NODOS: marcar 2 o más pide a la API las
// aristas reales (streamlines) que conectan ESOS nodos entre sí
// (`GET /tractography/edges`), nunca las de un nodo hacia fuera del
// conjunto marcado.
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Canvas, extend, useThree } from "@react-three/fiber";
import { fetchHybridEdges, fetchHybridNodes } from "../data/api";
import { colorForTractIndex } from "../logic/tractColors";
import type { HybridEdge, HybridNode } from "../types/domain";
import { ErrorBoundary } from "./ErrorBoundary";
import { ReferenceMesh } from "./ReferenceMesh";

// Mismo motivo que Tractography3D.tsx/Brain3D.tsx: <threeLine> es la
// etiqueta que @react-three/fiber expone para evitar la colisión entre
// el <line> de three.js y el <line> de SVG -- repetido aquí a propósito
// (extend es idempotente) para que este componente no dependa de que
// otro archivo ya lo haya registrado.
extend({ ThreeLine: THREE.Line });

const SCENE_BG = "#1d1e26";

// Misma malla real de fondo que Tractography3D.tsx -- mismo espacio de
// referencia exacto (ORG_800FC_100HCP_groupwise), así que se reutiliza
// el mismo activo ya verificado (decisión 63) en vez de generar uno
// nuevo. Si algún día hubiera una segunda fuente de nodos híbridos en
// otro espacio, esta tabla es donde se declara su propia malla -- o,
// deliberadamente, ninguna (mismo criterio que Tractography3D.tsx).
const REFERENCE_SPACE_MESH: Record<string, string> = {
  ORG_800FC_100HCP_groupwise: "/meshes/org_800fc_100hcp_wmparc_brain.glb",
};

function resolveMeshUrl(nodes: HybridNode[]): string | null {
  const spaces = new Set(nodes.map((n) => n.referenceSpace));
  if (spaces.size !== 1) {
    if (spaces.size > 1) {
      // eslint-disable-next-line no-console
      console.error(
        "TractographyNodes3D: nodos con más de un espacio de referencia a la vez, no se muestra ninguna malla:",
        [...spaces]
      );
    }
    return null;
  }
  const [space] = spaces;
  return REFERENCE_SPACE_MESH[space] ?? null;
}

// Radio de la esfera de cada nodo marcado -- decisión de INGENIERÍA
// puramente visual (que se distinga a simple vista del grosor de una
// streamline), nunca una medida real del propio nodo (el volumen real
// de cada etiqueta del wmparc varía mucho, de decenas a decenas de
// miles de vóxeles -- dibujarlo a escala real haría casi invisibles los
// nodos pequeños).
const NODE_SPHERE_RADIUS = 0.04;

type EdgesState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; edges: HybridEdge[] }
  | { kind: "error" };

function Controls() {
  const { camera, gl } = useThree();
  useEffect(() => {
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, gl.domElement);
    controls.minDistance = 0.5;
    controls.maxDistance = 30;
    return () => controls.dispose();
  }, [camera, gl]);
  return null;
}

function NodeMarker({ node, color }: { node: HybridNode; color: string }) {
  return (
    <mesh position={[node.x, node.y, node.z]}>
      <sphereGeometry args={[NODE_SPHERE_RADIUS, 16, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function EdgeStreamlineSet({ edge, color }: { edge: HybridEdge; color: string }) {
  const bufferGeometries = useMemo(
    () =>
      edge.streamlines.map(
        (points) => new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p)))
      ),
    [edge]
  );
  return (
    <>
      {bufferGeometries.map((bufferGeometry, i) => (
        <threeLine key={i} geometry={bufferGeometry}>
          <lineBasicMaterial color={color} transparent opacity={0.6} />
        </threeLine>
      ))}
    </>
  );
}

export function TractographyNodes3D() {
  const [nodes, setNodes] = useState<HybridNode[] | "loading" | "error">("loading");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [edgesState, setEdgesState] = useState<EdgesState>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    fetchHybridNodes()
      .then((rows) => {
        if (!cancelled) setNodes(rows);
      })
      .catch(() => {
        if (!cancelled) setNodes("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const checkedIdsList = useMemo(() => [...checkedIds].sort(), [checkedIds]);

  useEffect(() => {
    if (checkedIdsList.length < 2) {
      setEdgesState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setEdgesState({ kind: "loading" });
    fetchHybridEdges(checkedIdsList)
      .then((edges) => {
        if (!cancelled) setEdgesState({ kind: "loaded", edges });
      })
      .catch(() => {
        if (!cancelled) setEdgesState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [checkedIdsList]);

  const colorById = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(nodes)) {
      nodes.forEach((n, i) => map.set(n.id, colorForTractIndex(i, nodes.length)));
    }
    return map;
  }, [nodes]);

  const meshUrl = useMemo(() => (Array.isArray(nodes) ? resolveMeshUrl(nodes) : null), [nodes]);

  const nodesById = useMemo(() => {
    const map = new Map<string, HybridNode>();
    if (Array.isArray(nodes)) nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const toggleNode = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setCheckedIds(new Set());

  return (
    <div className="layout">
      <aside className="filter-panel">
        <h2>Nodos (parcelación del wmparc, ORG-800FC-100HCP)</h2>
        <p className="filter-panel__weight-help">
          176 nodos reales (etiquetas anatómicas del wmparc con nombre
          verificado, nunca las regiones de otros atlas -- espacio de
          referencia propio de la tractografía). Marca 2 o más para ver
          las streamlines reales que de verdad los conectan.
        </p>
        {nodes === "loading" && <p className="filter-panel__empty">Cargando lista de nodos...</p>}
        {nodes === "error" && (
          <p className="filter-panel__empty">No se pudo cargar la lista de nodos.</p>
        )}
        {Array.isArray(nodes) && (
          <>
            <div className="filter-panel__selection-status">
              <span>
                {checkedIds.size > 0
                  ? `${checkedIds.size} nodo${checkedIds.size === 1 ? "" : "s"} marcado${checkedIds.size === 1 ? "" : "s"}`
                  : "Ningún nodo marcado"}
              </span>
              <button
                type="button"
                className="filter-panel__bulk-btn"
                disabled={checkedIds.size === 0}
                onClick={clearSelection}
              >
                Limpiar selección
              </button>
            </div>
            {nodes.length === 0 && (
              <p className="filter-panel__empty">Ningún nodo real cargado todavía.</p>
            )}
            {nodes.map((node) => (
              <div key={node.id} className="filter-row filter-row--network">
                <label>
                  <input
                    type="checkbox"
                    checked={checkedIds.has(node.id)}
                    onChange={() => toggleNode(node.id)}
                  />
                  <span
                    className="legend-swatch"
                    style={{ backgroundColor: colorById.get(node.id) }}
                  />
                  {node.name}
                </label>
              </div>
            ))}
          </>
        )}
      </aside>
      <section className="panel panel--focus">
        <h2>Nodos de tractografía 3D</h2>
        {edgesState.kind === "loaded" && checkedIdsList.length >= 2 && (
          <p className="filter-panel__weight-help">
            {edgesState.edges.length === 0
              ? "Ninguna streamline real conecta directamente los nodos marcados."
              : `${edgesState.edges.length} conexión${edgesState.edges.length === 1 ? "" : "es"} real${edgesState.edges.length === 1 ? "" : "es"} entre los nodos marcados.`}
          </p>
        )}
        {edgesState.kind === "error" && (
          <p className="filter-panel__empty">No se pudieron cargar las conexiones entre los nodos marcados.</p>
        )}
        <div className="canvas-wrap">
          {checkedIds.size === 0 ? (
            <div className="brain3d-focus-placeholder">
              Marca uno o varios nodos en la lista para verlos aquí en 3D.
            </div>
          ) : (
            <Canvas camera={{ position: [4, 0, 0], fov: 45 }}>
              <color attach="background" args={[SCENE_BG]} />
              <ambientLight intensity={0.7} />
              <pointLight position={[5, 5, 5]} intensity={60} />
              <Controls />
              {meshUrl && (
                <ErrorBoundary fallback={null}>
                  <Suspense fallback={null}>
                    <ReferenceMesh url={meshUrl} />
                  </Suspense>
                </ErrorBoundary>
              )}
              {checkedIdsList.map((id) => {
                const node = nodesById.get(id);
                if (!node) return null;
                return <NodeMarker key={id} node={node} color={colorById.get(id) ?? "#ffffff"} />;
              })}
              {edgesState.kind === "loaded" &&
                edgesState.edges.map((edge) => (
                  <EdgeStreamlineSet
                    key={`${edge.nodeAId}|${edge.nodeBId}`}
                    edge={edge}
                    color={colorById.get(edge.nodeAId) ?? "#ffffff"}
                  />
                ))}
            </Canvas>
          )}
        </div>
      </section>
    </div>
  );
}
