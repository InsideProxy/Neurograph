// Vista de tractografía 3D (sección de tractografía, decisión 61 de
// docs/analisis-arquitectura.md) -- cierra el punto 2 del roadmap
// acordado el 02/09/2026: "tractografía es una vista propia, con su
// propia pestaña de interfaz, como la de homologías". Dibuja la
// geometría 3D REAL de los 41 tractos de ORG-800FC-100HCP (streamlines
// reales, reducidas de forma determinista a un máximo dibujable -- ver
// backend/ingestion/tractography/org_atlas.py) -- NUNCA junto a las
// regiones/conexiones de otros atlas: el espacio de referencia de este
// atlas es propio, no MNI152 (decisión 49), así que esta vista nunca
// comparte escena con Brain3D.tsx ni con ninguna `position3d` de
// `GraphNode`.
//
// Selección aditiva mediante casillas (07/09/2026, decisión explícita
// de la usuaria): se listan los 41 tractos con una casilla cada uno --
// marcar varios los dibuja todos a la vez, cada uno con un color propio
// (`logic/tractColors.ts`, asignación de INGENIERÍA, nunca un color
// "real" del atlas -- ORG-800FC-100HCP no define ninguno).
//
// La geometría de cada tracto se pide a la API solo cuando se marca su
// casilla (puede pesar varios MB por tracto, `GET /tracts/{id}/
// geometry`) -- nunca los 41 de golpe -- y se guarda en un mapa de
// estado mientras el componente esté montado, para no volver a pedirla
// si se desmarca y se vuelve a marcar el mismo tracto en la misma
// sesión de la pestaña.
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Canvas, extend, useThree } from "@react-three/fiber";
import { fetchTractGeometry, fetchTractSummaries } from "../data/api";
import { colorForTractIndex } from "../logic/tractColors";
import type { TractGeometry, TractSummary } from "../types/domain";
import { ErrorBoundary } from "./ErrorBoundary";
import { ReferenceMesh } from "./ReferenceMesh";

// Mismo motivo que Brain3D.tsx: <threeLine> es la etiqueta que
// @react-three/fiber expone para evitar la colisión entre el <line> de
// three.js y el <line> de SVG en el sistema de tipos de React. Repetido
// aquí (en vez de asumir que Brain3D.tsx ya lo registró) para que este
// componente no dependa de un efecto secundario de otro archivo --
// `extend` es idempotente, así que registrarlo dos veces no tiene coste
// ni efecto distinto.
extend({ ThreeLine: THREE.Line });

const SCENE_BG = "#1d1e26";

// Malla de fondo real para ESTE espacio de referencia (decisión 63,
// 08/09/2026, petición de la usuaria: "falta construir una malla o
// descargar un cerebro... para identificar cada tracto en su posición
// absoluta y relativa en el encéfalo"). Mismo patrón exacto que
// REFERENCE_SPACE_MESH de Brain3D.tsx -- clave real
// (`TractSummary.referenceSpace`, migración 0014), nunca el id del
// atlas ni un supuesto de que solo existe un espacio posible. Hoy solo
// hay una entrada porque solo hay una fuente de tractografía real
// cargada (ORG-800FC-100HCP); el día que se cargue una segunda, en otro
// espacio, esta tabla es donde se declara su propia malla -- o,
// deliberadamente, ninguna, si no hay una isosuperficie verificada en
// su mismo espacio (mejor no mostrar nada que una aproximación no
// verificada, mismo criterio que resolveMeshUrl en Brain3D.tsx).
//
// Fuente real: `100HCP-population-mean-wmparc.nii.gz`, distribuido por
// los propios autores del atlas (O'Donnell Research Group) en un
// registro de Zenodo propio, 10.5281/zenodo.8082481 -- DISTINTO del
// registro de ORG-800FC-100HCP.zip (10.5281/zenodo.2648292: error real
// cometido y corregido el 09/09/2026, ver decisión 63). "For anatomical
// reference, we provide the atlas population mean T1/T2/b0 images"
// (README real de SlicerDMRI/ORG-Atlases): la imagen viene del MISMO
// proceso de registro groupwise que las streamlines, nunca una
// plantilla ajena. Isosuperficie por marching cubes sobre la máscara
// binaria (etiqueta > 0, ninguna intensidad inventada) del propio
// wmparc, coordenadas de vóxel a milímetros reales con el affine real
// del NIfTI -- ver scripts/generate_org_atlas_mesh.py, mismo criterio
// que scripts/generate_brain_meshes.py (decisión 22). Verificado contra
// el rango real de coordenadas ya cargadas antes de usarse -- ver ese
// script y la decisión 63 para el resultado exacto de esa comprobación.
const REFERENCE_SPACE_MESH: Record<string, string> = {
  ORG_800FC_100HCP_groupwise: "/meshes/org_800fc_100hcp_wmparc_brain.glb",
};

/** Igual que resolveMeshUrl en Brain3D.tsx: solo devuelve una malla si
 * TODOS los tractos con geometría cargada declaran el mismo espacio de
 * referencia real -- nunca adivina ni mezcla, y avisa si alguna vez
 * hubiera más de uno a la vez (no debería ocurrir hoy, con un solo
 * atlas de tractografía real). */
function resolveMeshUrl(summaries: TractSummary[]): string | null {
  const spaces = new Set(summaries.map((s) => s.referenceSpace));
  if (spaces.size !== 1) {
    if (spaces.size > 1) {
      // eslint-disable-next-line no-console
      console.error(
        "Tractography3D: tractos con más de un espacio de referencia a la vez, no se muestra ninguna malla:",
        [...spaces]
      );
    }
    return null;
  }
  const [space] = spaces;
  return REFERENCE_SPACE_MESH[space] ?? null;
}

type GeometryState =
  | { kind: "loading" }
  | { kind: "loaded"; geometry: TractGeometry }
  | { kind: "error" };

function Controls() {
  const { camera, gl } = useThree();
  useEffect(() => {
    // Mismo criterio que Brain3D.tsx (decisión 30/08/2026): el polo de
    // giro de OrbitControls debe ser el eje anatómico real
    // inferior-superior (Z de los datos), no el (0,1,0) por defecto.
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, gl.domElement);
    controls.minDistance = 0.5;
    controls.maxDistance = 30;
    return () => controls.dispose();
  }, [camera, gl]);
  return null;
}

function StreamlineSet({ geometry, color }: { geometry: TractGeometry; color: string }) {
  const bufferGeometries = useMemo(
    () =>
      geometry.streamlines.map(
        (points) => new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p)))
      ),
    [geometry]
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

export function Tractography3D() {
  const [summaries, setSummaries] = useState<TractSummary[] | "loading" | "error">("loading");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [geometryById, setGeometryById] = useState<Map<string, GeometryState>>(new Map());

  useEffect(() => {
    let cancelled = false;
    fetchTractSummaries()
      .then((rows) => {
        if (!cancelled) setSummaries(rows);
      })
      .catch(() => {
        if (!cancelled) setSummaries("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const colorById = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(summaries)) {
      summaries.forEach((s, i) => map.set(s.id, colorForTractIndex(i, summaries.length)));
    }
    return map;
  }, [summaries]);

  const meshUrl = useMemo(
    () => (Array.isArray(summaries) ? resolveMeshUrl(summaries) : null),
    [summaries]
  );

  const toggleTract = (id: string) => {
    const isCurrentlyChecked = checkedIds.has(id);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyChecked) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!isCurrentlyChecked && !geometryById.has(id)) {
      setGeometryById((prev) => new Map(prev).set(id, { kind: "loading" }));
      fetchTractGeometry(id)
        .then((geometry) => {
          setGeometryById((prev) => new Map(prev).set(id, { kind: "loaded", geometry }));
        })
        .catch(() => {
          setGeometryById((prev) => new Map(prev).set(id, { kind: "error" }));
        });
    }
  };

  const clearSelection = () => setCheckedIds(new Set());

  return (
    <div className="layout">
      <aside className="filter-panel">
        <h2>Tractos (ORG-800FC-100HCP)</h2>
        <p className="filter-panel__weight-help">
          Geometría real de 41 tractos (Zhang et al., 2018), en el
          espacio de referencia propio de este atlas -- nunca superpuesta
          a las regiones de otros atlas. El primer número de cada fila es
          cuántas streamlines reales se dibujan; el segundo, cuántas
          streamlines reales tiene el tracto en total.
        </p>
        {summaries === "loading" && <p className="filter-panel__empty">Cargando lista de tractos...</p>}
        {summaries === "error" && (
          <p className="filter-panel__empty">No se pudo cargar la lista de tractos.</p>
        )}
        {Array.isArray(summaries) && (
          <>
            <div className="filter-panel__selection-status">
              <span>
                {checkedIds.size > 0
                  ? `${checkedIds.size} tracto${checkedIds.size === 1 ? "" : "s"} marcado${checkedIds.size === 1 ? "" : "s"}`
                  : "Ningún tracto marcado"}
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
            {summaries.length === 0 && (
              <p className="filter-panel__empty">Ningún tracto con geometría cargada todavía.</p>
            )}
            {summaries.map((tract) => (
              <div key={tract.id} className="filter-row filter-row--network">
                <label>
                  <input
                    type="checkbox"
                    checked={checkedIds.has(tract.id)}
                    onChange={() => toggleTract(tract.id)}
                  />
                  <span
                    className="legend-swatch"
                    style={{ backgroundColor: colorById.get(tract.id) }}
                  />
                  {tract.name}
                  {tract.abbreviation ? ` (${tract.abbreviation})` : ""}
                </label>
                <span
                  className="tractography-panel__count"
                  title={`${tract.streamlineCountShown} de ${tract.streamlineCountReal} streamlines reales dibujadas (el resto, real también, no se dibuja por rendimiento)`}
                >
                  {tract.streamlineCountShown}/{tract.streamlineCountReal}
                </span>
              </div>
            ))}
          </>
        )}
      </aside>
      <section className="panel panel--focus">
        <h2>Tractografía 3D</h2>
        <div className="canvas-wrap">
          {checkedIds.size === 0 ? (
            <div className="brain3d-focus-placeholder">
              Marca uno o varios tractos en la lista para verlos aquí en 3D.
            </div>
          ) : (
            <Canvas camera={{ position: [4, 0, 0], fov: 45 }}>
              <color attach="background" args={[SCENE_BG]} />
              <ambientLight intensity={0.7} />
              <pointLight position={[5, 5, 5]} intensity={60} />
              <Controls />
              {/* Malla de fondo real (decisión 63) -- envuelta en su
                  propio ErrorBoundary+Suspense, mismo criterio que
                  Brain3D.tsx: si el .glb no carga, la vista sigue
                  mostrando las streamlines con normalidad, solo sin
                  fondo anatómico. */}
              {meshUrl && (
                <ErrorBoundary fallback={null}>
                  <Suspense fallback={null}>
                    <ReferenceMesh url={meshUrl} />
                  </Suspense>
                </ErrorBoundary>
              )}
              {[...checkedIds].map((id) => {
                const state = geometryById.get(id);
                if (!state || state.kind !== "loaded") return null;
                return (
                  <StreamlineSet key={id} geometry={state.geometry} color={colorById.get(id) ?? "#ffffff"} />
                );
              })}
            </Canvas>
          )}
        </div>
      </section>
    </div>
  );
}
