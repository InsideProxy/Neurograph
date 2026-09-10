// Malla de referencia anatómica reutilizable -- extraída de Brain3D.tsx
// el 08/09/2026 (decisión 63), al añadir una segunda vista 3D
// (Tractography3D.tsx) que también necesita una malla de fondo, en SU
// PROPIO espacio de referencia (distinto del de Brain3D.tsx: ver
// org_atlas.REFERENCE_SPACE). Mismo comportamiento exacto que ya tenía
// Brain3D.tsx desde el 30/08/2026 -- solo cambia la ubicación, para no
// duplicar la carga/materialización de un .glb en dos sitios del código.
//
// Cada vista decide SU PROPIO mapa "espacio de referencia real -> url
// del .glb" y si debe mostrarla (Brain3D.tsx: REFERENCE_SPACE_MESH, dos
// entradas; Tractography3D.tsx: su propio mapa, una entrada) -- este
// componente solo sabe cargar y pintar un .glb ya resuelto, nunca decide
// cuál usar ni mezcla espacios.
import { useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useLoader } from "@react-three/fiber";
import { NEUTRAL_COLOR } from "../theme/networks";
import { DISPLAY_SCALE } from "../data/api";

/** Malla de fondo anatómica (superficie o isosuperficie real, nunca
 * inventada -- ver scripts/generate_brain_meshes.py y
 * scripts/generate_org_atlas_mesh.py). Material translúcido único y
 * neutro (NEUTRAL_COLOR), fuera de la detección de clics
 * (`raycast={() => null}`), escalada con el mismo DISPLAY_SCALE que el
 * resto de coordenadas reales de la vista que la usa -- el .glb en sí
 * siempre guarda milímetros reales sin escalar. */
export function ReferenceMesh({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = new THREE.MeshStandardMaterial({
          color: NEUTRAL_COLOR,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        obj.raycast = () => null;
      }
    });
    return cloned;
  }, [gltf]);
  return (
    <group scale={DISPLAY_SCALE}>
      <primitive object={scene} />
    </group>
  );
}
