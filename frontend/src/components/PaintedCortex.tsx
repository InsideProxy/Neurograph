// Corteza con las regiones reales pintadas (decisión 72 de
// docs/analisis-arquitectura.md, 23/09/2026). Sustituye, cuando el atlas
// activo es de superficie (HCP-MMP1.0, Gordon 333), a la malla
// translúcida de ReferenceMesh.tsx: en vez de esferas "flotando" sobre un
// cerebro transparente, cada vértice real de la superficie fs_LR 32k se
// colorea con la región que le asigna el propio .dlabel.nii del atlas
// (mapa generado y verificado por scripts/generate_surface_parcels.py).
//
// Qué NO hace este componente, a propósito: decidir QUÉ regiones se
// colorean (eso lo decide Brain3D.tsx con la selección y los filtros, y
// se lo pasa como `colorForRegion`), ni inventar ningún color: los
// colores de red siguen siendo los reales de theme/networks.ts.
//
// Las superficies infladas son solo otra forma de ver la MISMA
// superficie (misma topología, comprobada cara a cara al generarlas):
// las coordenadas científicas siguen siendo las de la midthickness. Por
// eso los hijos (esferas y líneas de la selección) no usan
// `position3d` directamente, sino `positionOfVertex(ancla)`: el vértice
// ancla de cada región en la superficie que se está mostrando. En la
// midthickness, esa posición es exactamente `position3d` (comprobado para
// las 693 regiones al generar los archivos).
import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useLoader, type ThreeEvent } from "@react-three/fiber";
import { DISPLAY_SCALE } from "../data/api";
import { enableCortexOccluderLayer } from "../logic/cortexOcclusion";
import {
  fillVertexColors,
  fillVertexColorsByIndex,
  leftTriangleCount,
  regionAtFace,
  type CortexGrays,
  type RGB,
  type SurfaceParcelMap,
} from "../logic/surfaceParcels";

export type HemisphereVisibility = "both" | "L" | "R";

// Pintar por otra categoría que no sea la región (decisión 73: la red
// ORIGINAL de cada vértice, sin agregar por región). La región de cada
// vértice se sigue usando para el clic y el paso del ratón.
export interface VertexPaint {
  vertexIndex: Int32Array;
  categoryCount: number;
  colorFor: (index: number) => RGB | null;
}

export interface SurfaceOverlayHelpers {
  positionOfVertex: (vertex: number) => [number, number, number];
  isVertexVisible: (vertex: number) => boolean;
}

interface Props {
  meshUrl: string;
  map: SurfaceParcelMap;
  sulc: Float32Array | null;
  colorForRegion: (regionIndex: number) => RGB | null;
  paintBy?: VertexPaint | null;
  grays: CortexGrays;
  hemisphere: HemisphereVisibility;
  // Marcar regiones (docs/rediseno-interfaz-diseno.md, 5.9): el clic llega
  // con sus teclas, para que Brain3D distinga Ctrl+clic (marcar) del clic
  // normal (seleccionar).
  onRegionClick: (regionIndex: number, keys: Pick<MouseEvent, "ctrlKey" | "metaKey" | "altKey" | "shiftKey">) => void;
  // `face`: los tres vértices del triángulo bajo el cursor, para quien
  // necesite saber algo más que la región (p. ej. la red del vértice).
  onRegionHover: (regionIndex: number | null, face: [number, number, number] | null) => void;
  onHemisphereSplitAvailable: (available: boolean) => void;
  children: (helpers: SurfaceOverlayHelpers) => ReactNode;
}

export function PaintedCortex({
  meshUrl,
  map,
  sulc,
  colorForRegion,
  paintBy = null,
  grays,
  hemisphere,
  onRegionClick,
  onRegionHover,
  onHemisphereSplitAvailable,
  children,
}: Props) {
  const gltf = useLoader(GLTFLoader, meshUrl);

  const geometry = useMemo(() => {
    let source: THREE.BufferGeometry | null = null;
    gltf.scene.traverse((obj) => {
      if (!source && obj instanceof THREE.Mesh) source = obj.geometry as THREE.BufferGeometry;
    });
    if (!source) throw new Error(`${meshUrl}: el archivo no contiene ninguna malla`);
    const geom = (source as THREE.BufferGeometry).clone();
    const vertexCount = geom.getAttribute("position").count;
    if (vertexCount !== map.vertexRegionIndex.length) {
      // Nunca se pinta un mapa de regiones sobre una malla que no es la
      // suya: los índices de vértice no significarían nada.
      throw new Error(
        `${meshUrl} tiene ${vertexCount} vértices, pero el mapa de regiones ${map.vertexRegionIndex.length}`
      );
    }
    geom.computeVertexNormals();
    geom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
    return geom;
  }, [gltf, map, meshUrl]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Colores por vértice: se reescriben en el mismo búfer (sincronizar con
  // la GPU es justo el tipo de "sistema externo" para el que existe un
  // efecto), nunca se recrea la geometría por un cambio de selección.
  useEffect(() => {
    const attr = geometry.getAttribute("color") as THREE.BufferAttribute;
    if (paintBy) {
      if (paintBy.vertexIndex.length !== map.vertexRegionIndex.length) {
        throw new Error("el mapa por vértice no tiene el mismo número de vértices que la superficie");
      }
      fillVertexColorsByIndex(
        attr.array as Float32Array,
        paintBy.vertexIndex,
        paintBy.categoryCount,
        sulc,
        paintBy.colorFor,
        grays,
      );
    } else {
      fillVertexColors(attr.array as Float32Array, map, sulc, colorForRegion, grays);
    }
    attr.needsUpdate = true;
  }, [geometry, map, sulc, colorForRegion, paintBy, grays]);

  const splitTriangles = useMemo(() => {
    const index = geometry.getIndex();
    return index ? leftTriangleCount(index.array, map.nVerticesLeft) : null;
  }, [geometry, map]);

  useEffect(() => {
    onHemisphereSplitAvailable(splitTriangles !== null);
  }, [splitTriangles, onHemisphereSplitAvailable]);

  const effectiveHemisphere: HemisphereVisibility = splitTriangles === null ? "both" : hemisphere;
  useEffect(() => {
    if (splitTriangles === null || effectiveHemisphere === "both") {
      geometry.setDrawRange(0, Infinity);
    } else if (effectiveHemisphere === "L") {
      geometry.setDrawRange(0, splitTriangles * 3);
    } else {
      geometry.setDrawRange(splitTriangles * 3, Infinity);
    }
  }, [geometry, splitTriangles, effectiveHemisphere]);

  const helpers = useMemo<SurfaceOverlayHelpers>(() => {
    const position = geometry.getAttribute("position");
    return {
      positionOfVertex: (vertex) => [
        position.getX(vertex) * DISPLAY_SCALE,
        position.getY(vertex) * DISPLAY_SCALE,
        position.getZ(vertex) * DISPLAY_SCALE,
      ],
      isVertexVisible: (vertex) =>
        effectiveHemisphere === "both" ||
        (effectiveHemisphere === "L" ? vertex < map.nVerticesLeft : vertex >= map.nVerticesLeft),
    };
  }, [geometry, effectiveHemisphere, map]);

  const regionOfEvent = (e: ThreeEvent<PointerEvent | MouseEvent>): number | null => {
    const face = e.face;
    if (!face) return null;
    const region = regionAtFace(map.vertexRegionIndex, face.a, face.b, face.c);
    return region < 0 ? null : region;
  };

  return (
    <>
      <group scale={DISPLAY_SCALE}>
        {/* ref: la corteza va también en su capa de three.js, la que dibuja
            la pasada de la oclusión por la corteza de Brain3D.tsx
            (logic/cortexOcclusion.ts). */}
        <mesh
          ref={enableCortexOccluderLayer}
          geometry={geometry}
          onClick={(e) => {
            e.stopPropagation();
            const region = regionOfEvent(e);
            if (region !== null) onRegionClick(region, e.nativeEvent);
          }}
          onPointerMove={(e) => {
            e.stopPropagation();
            onRegionHover(regionOfEvent(e), e.face ? [e.face.a, e.face.b, e.face.c] : null);
          }}
          onPointerOut={() => onRegionHover(null, null)}
        >
          <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.85} metalness={0} />
        </mesh>
      </group>
      {children(helpers)}
    </>
  );
}
