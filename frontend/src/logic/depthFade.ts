// Atenuación por profundidad del cerebro 3D, «Atenuar lo que queda detrás»
// (Legibilidad del 3D; docs/rediseno-interfaz-diseno.md, 6.3). Con la
// corteza pintada, los marcadores, las líneas y las etiquetas de la
// selección se dibujan sin prueba de profundidad, así que lo que está en la
// cara interna o en el otro hemisferio parece flotar delante. Con la
// atenuación, cada fragmento de esos objetos pierde opacidad cuanto más lejos
// de la cámara queda dentro del cerebro: una línea larga se desvanece a lo
// largo de su recorrido. No se usa la oclusión estricta: las líneas van en
// recta entre dos puntos de la corteza, pasan por dentro y quedarían casi
// todas tapadas.
//
// Aquí está lo que se puede probar sin WebGL: el factor (el mismo cálculo que
// hace el shader), el tramo de profundidad, el tamaño del cerebro, el parche
// del código de los shaders, los uniforms que comparten los materiales, y
// las props y la clave de React de esos materiales. Brain3D.tsx lo conecta
// a la escena.
import * as THREE from "three";

// Opacidad que conserva lo más lejano (el spec pide entre 0,15 y 0,2).
export const DEPTH_FADE_MIN = 0.2;
// El tramo se mide con la semiprofundidad del cerebro en la dirección de la
// vista (depthExtent): empieza 0,2 de ella por delante del centro (hasta ahí,
// todo se ve entero) y acaba en la cara más lejana del cerebro (desde ahí,
// DEPTH_FADE_MIN).
export const DEPTH_FADE_NEAR = -0.2;
export const DEPTH_FADE_FAR = 1;

export interface DepthFadeRange {
  near: number;
  far: number;
  fadeMin: number;
}

// Sin atenuación: el factor vale exactamente 1 a cualquier profundidad.
export const NO_DEPTH_FADE: Readonly<DepthFadeRange> = { near: 0, far: 1, fadeMin: 1 };

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Factor por el que se multiplica la opacidad a una profundidad (la distancia
 * a la cámara a lo largo de su eje). Es la fórmula del shader:
 * 1 − (1 − fadeMin) · smoothstep(near, far, profundidad). Equivale a
 * mix(1, fadeMin, smoothstep(…)), pero con fadeMin = 1 da exactamente 1.
 */
export function depthFadeFactor(depth: number, range: DepthFadeRange): number {
  return 1 - (1 - range.fadeMin) * smoothstep(range.near, range.far, depth);
}

/**
 * Tramo de la atenuación para un cerebro cuyo centro está a `centerDepth` de
 * la cámara y que mide `extent` de su centro a su cara más lejana en la
 * dirección de la vista. Con valores que no sirven, sin atenuación.
 */
export function depthFadeRange(centerDepth: number, extent: number): DepthFadeRange {
  if (!Number.isFinite(centerDepth) || !Number.isFinite(extent) || extent <= 0) return NO_DEPTH_FADE;
  return {
    near: centerDepth + DEPTH_FADE_NEAR * extent,
    far: centerDepth + DEPTH_FADE_FAR * extent,
    fadeMin: DEPTH_FADE_MIN,
  };
}

// --- Tamaño del cerebro ---
//
// La caja del cerebro que se ve, en coordenadas de la escena. El tramo se
// mide con el elipsoide inscrito en ella y no con una esfera: el cerebro es
// más largo que ancho, y con la esfera, en la vista lateral del principio, la
// cara externa del otro hemisferio quedaría a poco más de medio radio del
// centro y apenas se atenuaría.

export interface DepthBounds {
  center: [number, number, number];
  halfSize: [number, number, number];
}

// Lo que se necesita de una lista de puntos. Un BufferAttribute de three.js
// lo cumple tal cual.
export interface PointList {
  getX(index: number): number;
  getY(index: number): number;
  getZ(index: number): number;
}

/** Los puntos de una lista de tripletes, como `position3d` de los nodos. */
export function tuplePoints(points: readonly (readonly [number, number, number])[]): PointList {
  return {
    getX: (index) => points[index][0],
    getY: (index) => points[index][1],
    getZ: (index) => points[index][2],
  };
}

/**
 * Caja de los puntos [start, end), multiplicados por `scale`: su centro y la
 * mitad de su tamaño en cada eje. null si no hay puntos o alguno no es
 * finito.
 */
export function depthBounds(points: PointList, start: number, end: number, scale = 1): DepthBounds | null {
  if (!(end > start)) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = start; i < end; i++) {
    const p = [points.getX(i), points.getY(i), points.getZ(i)];
    for (let axis = 0; axis < 3; axis++) {
      if (!Number.isFinite(p[axis])) return null;
      min[axis] = Math.min(min[axis], p[axis]);
      max[axis] = Math.max(max[axis], p[axis]);
    }
  }
  const center = [0, 1, 2].map((axis) => ((min[axis] + max[axis]) / 2) * scale);
  const halfSize = [0, 1, 2].map((axis) => ((max[axis] - min[axis]) / 2) * scale);
  return { center: [center[0], center[1], center[2]], halfSize: [halfSize[0], halfSize[1], halfSize[2]] };
}

/**
 * Distancia del centro a la cara más lejana del elipsoide de semiejes
 * `halfSize` en la dirección `direction` (vector unitario):
 * √((hx·dx)² + (hy·dy)² + (hz·dz)²).
 */
export function depthExtent(
  halfSize: readonly [number, number, number],
  direction: readonly [number, number, number],
): number {
  return Math.hypot(halfSize[0] * direction[0], halfSize[1] * direction[1], halfSize[2] * direction[2]);
}

// --- Parche de los shaders ---
//
// Los materiales de la capa de foco son de cuatro familias de three.js:
// LineBasicMaterial y MeshBasicMaterial (shader «basic»), LineDashedMaterial
// («dashed»), MeshStandardMaterial («physical») y SpriteMaterial
// («sprite»). Las cuatro traen, una sola vez, los trozos que sirven de ancla.
// En el shader de vértices, tras <fog_vertex> ya existe mvPosition, la
// posición en el espacio de la cámara. En el de fragmentos, tras
// <opaque_fragment> ya está gl_FragColor y el alfa todavía no se ha
// premultiplicado.

const COMMON = "#include <common>";
const FOG_VERTEX = "#include <fog_vertex>";
const OPAQUE_FRAGMENT = "#include <opaque_fragment>";

export type DepthFadePatch =
  | { ok: true; vertexShader: string; fragmentShader: string }
  | { ok: false; missing: string[] };

function occurrences(source: string, chunk: string): number {
  return source.split(chunk).length - 1;
}

// Añade `code` tras la única aparición de `chunk`. Con una función de
// reemplazo, para que un `$` del código no se interprete.
function insertAfter(source: string, chunk: string, code: string): string {
  return source.replace(chunk, () => `${chunk}\n${code}`);
}

/**
 * Añade la atenuación al código de un material de three.js. Todo o nada: si
 * falta alguno de los cuatro trozos, o aparece más de una vez, devuelve
 * `ok: false` con la lista, y el material se queda como estaba. Así, una
 * versión de three.js que cambie esos trozos deja la vista de siempre, nunca
 * un shader roto.
 */
export function patchDepthFadeShader(vertexShader: string, fragmentShader: string): DepthFadePatch {
  const anchors: [string, string, string][] = [
    ["vértices", vertexShader, COMMON],
    ["vértices", vertexShader, FOG_VERTEX],
    ["fragmentos", fragmentShader, COMMON],
    ["fragmentos", fragmentShader, OPAQUE_FRAGMENT],
  ];
  const missing = anchors
    .filter(([, source, chunk]) => occurrences(source, chunk) !== 1)
    .map(([stage, , chunk]) => `${chunk} (${stage})`);
  if (missing.length > 0) return { ok: false, missing };
  const vertex = insertAfter(vertexShader, COMMON, "varying float ngViewDepth;");
  const fragment = insertAfter(
    fragmentShader,
    COMMON,
    "varying float ngViewDepth;\nuniform float ngFadeNear;\nuniform float ngFadeFar;\nuniform float ngFadeMin;",
  );
  return {
    ok: true,
    vertexShader: insertAfter(vertex, FOG_VERTEX, "\tngViewDepth = - mvPosition.z;"),
    fragmentShader: insertAfter(
      fragment,
      OPAQUE_FRAGMENT,
      "\tgl_FragColor.a *= 1.0 - ( 1.0 - ngFadeMin ) * smoothstep( ngFadeNear, ngFadeFar, ngViewDepth );",
    ),
  };
}

// --- Uniforms compartidos y enganche a los materiales ---

export interface DepthFadeUniforms {
  ngFadeNear: { value: number };
  ngFadeFar: { value: number };
  ngFadeMin: { value: number };
}

// Lo que three.js pasa a onBeforeCompile y aquí se usa.
export interface CompilingShader {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
}

export interface DepthFade {
  // Los mismos objetos en todos los materiales: al cambiar su valor cambian
  // todos a la vez, sin volver a compilar.
  uniforms: DepthFadeUniforms;
  onBeforeCompile: (shader: CompilingShader) => void;
  // Clave del programa compilado de three.js: separa el parcheado del de
  // siempre.
  customProgramCacheKey: () => string;
}

export const DEPTH_FADE_PROGRAM_KEY = "neurograph-atenuacion-profundidad-v1";

const warnedMissing = new Set<string>();

// En desarrollo, un aviso por cada combinación de trozos que falten, no uno
// por material: la capa de foco puede tener cientos.
function warnMissingInDev(missing: string[]): void {
  const key = missing.join(", ");
  if (!import.meta.env.DEV || warnedMissing.has(key)) return;
  warnedMissing.add(key);
  // eslint-disable-next-line no-console
  console.warn(`Atenuación por profundidad: falta ${key} en el shader; ese material se dibuja sin atenuar.`);
}

/** Uniforms y enganche para los materiales de un lienzo. */
export function createDepthFade(onMissing: (missing: string[]) => void = warnMissingInDev): DepthFade {
  const uniforms: DepthFadeUniforms = {
    ngFadeNear: { value: NO_DEPTH_FADE.near },
    ngFadeFar: { value: NO_DEPTH_FADE.far },
    ngFadeMin: { value: NO_DEPTH_FADE.fadeMin },
  };
  return {
    uniforms,
    onBeforeCompile: (shader) => {
      const patch = patchDepthFadeShader(shader.vertexShader, shader.fragmentShader);
      if (!patch.ok) {
        onMissing(patch.missing);
        return;
      }
      shader.vertexShader = patch.vertexShader;
      shader.fragmentShader = patch.fragmentShader;
      Object.assign(shader.uniforms, uniforms);
    },
    customProgramCacheKey: () => DEPTH_FADE_PROGRAM_KEY,
  };
}

/**
 * Props que la atenuación añade a un material de la capa de foco: el parche
 * del shader y, en los marcadores y los conos, que hasta ahora eran opacos,
 * `transparent`. Así se pueden atenuar, y three.js los dibuja con las
 * líneas, de atrás adelante; los renderOrder no cambian. Sin atenuación
 * (null) no añade nada: el material es el de siempre.
 */
export function fadeMaterialProps(fade: DepthFade | null, opaque: boolean) {
  if (!fade) return {};
  return {
    onBeforeCompile: fade.onBeforeCompile,
    customProgramCacheKey: fade.customProgramCacheKey,
    ...(opaque ? { transparent: true } : {}),
  };
}

/**
 * Clave de React de cada material de la capa de foco. Cambia con el
 * interruptor, así que al alternar React crea materiales nuevos en vez de
 * cambiar las props de los que ya hay. Es imprescindible: al desactivar,
 * las props de fadeMaterialProps desaparecen, y react-three-fiber 9.7 no
 * deja sin tocar una prop que desaparece. Su applyProps se salta los
 * undefined, pero su diffProps repone las props quitadas y, en un material,
 * cuyo constructor recibe parámetros, las pone a 0. customProgramCacheKey
 * valdría 0, y three.js falla en cuanto vuelve a preparar el programa del
 * material, porque WebGLPrograms.getParameters la llama. Además, three.js
 * no vuelve a compilar por su cuenta el shader de un material que ya existe.
 */
export function fadeKey(fade: DepthFade | null): string {
  return fade ? "atenuado" : "normal";
}

const viewCenter = new THREE.Vector3();
const viewDirection = new THREE.Vector3();

/**
 * Pone en los uniforms el tramo de la atenuación para esta cámara y la caja
 * del cerebro que se ve. Sin caja, sin atenuación. Se llama en cada
 * fotograma, antes de dibujar.
 */
export function updateDepthFadeUniforms(
  uniforms: DepthFadeUniforms,
  camera: THREE.Camera,
  bounds: DepthBounds | null,
): void {
  let range: DepthFadeRange = NO_DEPTH_FADE;
  if (bounds) {
    camera.updateMatrixWorld();
    viewCenter.set(...bounds.center).applyMatrix4(camera.matrixWorldInverse);
    camera.getWorldDirection(viewDirection);
    const extent = depthExtent(bounds.halfSize, [viewDirection.x, viewDirection.y, viewDirection.z]);
    range = depthFadeRange(-viewCenter.z, extent);
  }
  uniforms.ngFadeNear.value = range.near;
  uniforms.ngFadeFar.value = range.far;
  uniforms.ngFadeMin.value = range.fadeMin;
}
