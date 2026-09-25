// Oclusión por la corteza del cerebro 3D (docs/rediseno-interfaz-diseno.md,
// 6.3). Con la corteza pintada, lo que ella tapa se ve tenue, y más cuanto
// más hondo queda; lo que está delante, o en la misma superficie, se ve
// entero. Vale para toda la capa de foco: líneas, marcadores con su
// contorno, conos de dirección y etiquetas. Sustituye a «Atenuar lo que
// queda detrás» de la D5, que dependía de la distancia a la cámara y no de
// lo que tapa la corteza: en un primer plano no cambiaba nada.
//
// Cómo:
// - En cada fotograma, antes de dibujar la escena, la corteza sola se dibuja
//   en un destino fuera de pantalla con textura de profundidad
//   (renderCortexDepth), con la misma cámara y el mismo hemisferio visible.
//   Se separa del resto con una capa de three.js (CORTEX_OCCLUDER_LAYER).
// - Cada fragmento de la capa de foco lee esa profundidad en su posición de
//   pantalla, la pasa a distancia en el eje de la cámara y calcula cuánto
//   queda detrás de la corteza. Su opacidad se multiplica por
//   occlusionFactor. La capa de foco se sigue dibujando sin prueba de
//   profundidad: la opacidad hace la oclusión, y lo que queda un poco por
//   debajo de la superficie (la mitad de un marcador en su vértice ancla) no
//   se corta de golpe.
// - Sin la corteza pintada (malla translúcida, atlas volumétricos o la vista
//   de repuesto si la corteza falla) no hay pasada, y los materiales no
//   llevan el parche: todo se ve entero, como antes de la D5.
//
// Aquí está lo que se puede probar sin WebGL: las cuentas (las mismas que
// hace el shader), el parche del código de los shaders, los uniforms y las
// props que comparten los materiales, y la pasada con un renderer falso.
// Brain3D.tsx lo conecta a la escena, y PaintedCortex.tsx pone la corteza en
// su capa.
import * as THREE from "three";

// --- Valores ---
//
// En unidades de la escena: DISPLAY_SCALE (data/api.ts) es 1/40, así que 1
// equivale a 40 mm. Son los valores de partida del spec; los ajusta la
// verificación con capturas.
//
// Hasta OCCLUSION_START por detrás de la corteza (10 mm), entero. Tiene que
// quedar por encima de la separación de la etiqueta (logic/markerSize.ts:
// 0,21 del centro del marcador en +Y de los datos, 0,222 en la región
// seleccionada): vista desde detrás, la etiqueta de un marcador visible queda
// detrás de él, sobre la misma corteza, y tiene que verse entera.
export const OCCLUSION_START = 0.25;
// Desde OCCLUSION_END (30 mm), OCCLUSION_MIN de opacidad.
export const OCCLUSION_END = 0.75;
export const OCCLUSION_MIN = 0.2;

// Capa de three.js de la corteza pintada. Todo lo demás está solo en la 0,
// la de siempre; nada más en frontend/src usa capas.
export const CORTEX_OCCLUDER_LAYER = 1;

// Prioridad del useFrame de la pasada. react-three-fiber llama a los useFrame
// ordenados por prioridad, de menor a mayor, con una resta: vale un número
// con decimales. Los controles (OrbitControls) colocan la cámara con
// prioridad 0, y ExportBridge dibuja el lienzo con prioridad 1: la pasada va
// entre los dos, con la cámara de este fotograma y antes de dibujar. Una
// prioridad mayor que 0 cuenta para react-three-fiber como «dibuja por su
// cuenta», pero ExportBridge ya lo hace así: no cambia nada.
export const OCCLUSION_PASS_PRIORITY = 0.5;

// --- Cuentas ---

export interface OcclusionRange {
  start: number;
  end: number;
  min: number;
}

const DEFAULT_RANGE: Readonly<OcclusionRange> = { start: OCCLUSION_START, end: OCCLUSION_END, min: OCCLUSION_MIN };

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Factor por el que se multiplica la opacidad de un fragmento que queda
 * `behind` por detrás de la corteza, en el eje de la cámara (negativo si
 * está delante). Es la cuenta del shader:
 * 1 − (1 − mínimo) · smoothstep(inicio, fin, detrás).
 */
export function occlusionFactor(behind: number, range: Readonly<OcclusionRange> = DEFAULT_RANGE): number {
  return 1 - (1 - range.min) * smoothstep(range.start, range.end, behind);
}

/**
 * Distancia a la cámara, en su eje, de un valor del búfer de profundidad
 * (entre 0, el plano near, y 1, el far) de una cámara de perspectiva. Es
 * perspectiveDepthToViewZ de three.js (ShaderChunk/packing.glsl.js), sin la
 * profundidad invertida, que el lienzo no usa, y cambiada de signo: allí la
 * z de la vista es negativa delante de la cámara.
 */
export function viewDepthFromDepthBuffer(depth: number, near: number, far: number): number {
  return -(near * far) / ((far - near) * depth - far);
}

// --- Parche de los shaders ---
//
// Los materiales de la capa de foco son de cuatro familias de three.js:
// LineBasicMaterial y MeshBasicMaterial (shader «basic»), LineDashedMaterial
// («dashed»), MeshStandardMaterial («physical») y SpriteMaterial
// («sprite»). Las cuatro traen, una sola vez, los trozos que sirven de ancla.
// En el shader de vértices, tras <fog_vertex> ya existen mvPosition, la
// posición en el espacio de la cámara, y gl_Position, la posición de
// recorte definitiva. En el de fragmentos, tras <opaque_fragment> ya está
// gl_FragColor y el alfa todavía no se ha premultiplicado.
//
// La posición en pantalla sale de la de recorte (xy / w), no de
// gl_FragCoord: así no depende del tamaño del destino en el que se dibuja,
// que en la exportación es otro (logic/capture3d.ts).
//
// La cuenta de la profundidad es la de perspectiveDepthToViewZ de three.js,
// con su prefijo propio: no se incluye <packing>. Si una familia lo incluyera
// ya, el shader tendría sus funciones dos veces y no compilaría.

const COMMON = "#include <common>";
const FOG_VERTEX = "#include <fog_vertex>";
const OPAQUE_FRAGMENT = "#include <opaque_fragment>";

const VERTEX_DECLARATIONS = ["varying float ngViewDepth;", "varying vec4 ngClipPosition;"].join("\n");

const VERTEX_MAIN = ["\tngViewDepth = - mvPosition.z;", "\tngClipPosition = gl_Position;"].join("\n");

const FRAGMENT_DECLARATIONS = [
  "varying float ngViewDepth;",
  "varying vec4 ngClipPosition;",
  "uniform sampler2D ngCortexDepth;",
  "uniform float ngCameraNear;",
  "uniform float ngCameraFar;",
  "uniform float ngOcclusionStart;",
  "uniform float ngOcclusionEnd;",
  "uniform float ngOcclusionMin;",
  "uniform float ngOcclusionOn;",
  "float ngPerspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {",
  "\t#ifdef USE_REVERSED_DEPTH_BUFFER",
  "\t\treturn ( near * far ) / ( ( near - far ) * depth - near );",
  "\t#else",
  "\t\treturn ( near * far ) / ( ( far - near ) * depth - far );",
  "\t#endif",
  "}",
  "float ngOcclusionFactor() {",
  "\tif ( ngOcclusionOn < 0.5 ) return 1.0;",
  "\tvec2 ngUv = ngClipPosition.xy / ngClipPosition.w * 0.5 + 0.5;",
  "\tfloat ngCortexViewDepth = - ngPerspectiveDepthToViewZ( texture2D( ngCortexDepth, ngUv ).x, ngCameraNear, ngCameraFar );",
  "\tfloat ngBehind = ngViewDepth - ngCortexViewDepth;",
  "\treturn 1.0 - ( 1.0 - ngOcclusionMin ) * smoothstep( ngOcclusionStart, ngOcclusionEnd, ngBehind );",
  "}",
].join("\n");

const FRAGMENT_MAIN = "\tgl_FragColor.a *= ngOcclusionFactor();";

export type OcclusionPatch =
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
 * Añade la oclusión al código de un material de three.js. Todo o nada: si
 * falta alguno de los cuatro trozos, o aparece más de una vez, devuelve
 * `ok: false` con la lista, y el material se queda como estaba. Así, una
 * versión de three.js que cambie esos trozos deja la vista de siempre, nunca
 * un shader roto.
 */
export function patchOcclusionShader(vertexShader: string, fragmentShader: string): OcclusionPatch {
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
  return {
    ok: true,
    vertexShader: insertAfter(insertAfter(vertexShader, COMMON, VERTEX_DECLARATIONS), FOG_VERTEX, VERTEX_MAIN),
    fragmentShader: insertAfter(
      insertAfter(fragmentShader, COMMON, FRAGMENT_DECLARATIONS),
      OPAQUE_FRAGMENT,
      FRAGMENT_MAIN,
    ),
  };
}

// --- Uniforms compartidos y enganche a los materiales ---

export interface CortexOcclusionUniforms {
  // La profundidad de la corteza del último fotograma; null sin pasada.
  ngCortexDepth: { value: THREE.Texture | null };
  ngCameraNear: { value: number };
  ngCameraFar: { value: number };
  ngOcclusionStart: { value: number };
  ngOcclusionEnd: { value: number };
  ngOcclusionMin: { value: number };
  // 1 con la profundidad de la corteza lista para este fotograma; 0 si no,
  // y entonces todo se ve entero.
  ngOcclusionOn: { value: number };
}

// Lo que three.js pasa a onBeforeCompile y aquí se usa.
export interface CompilingShader {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
}

export interface CortexOcclusion {
  // Los mismos objetos en todos los materiales de un lienzo: al cambiar su
  // valor cambian todos a la vez, sin volver a compilar.
  uniforms: CortexOcclusionUniforms;
  onBeforeCompile: (shader: CompilingShader) => void;
  // Clave del programa compilado de three.js: separa el parcheado del de
  // siempre.
  customProgramCacheKey: () => string;
}

export const OCCLUSION_PROGRAM_KEY = "neurograph-oclusion-corteza-v1";

const warnedMissing = new Set<string>();

// En desarrollo, un aviso por cada combinación de trozos que falten, no uno
// por material: la capa de foco puede tener cientos.
function warnMissingInDev(missing: string[]): void {
  const key = missing.join(", ");
  if (!import.meta.env.DEV || warnedMissing.has(key)) return;
  warnedMissing.add(key);
  // eslint-disable-next-line no-console
  console.warn(`Oclusión por la corteza: falta ${key} en el shader; ese material se dibuja sin oclusión.`);
}

/** Uniforms y enganche para los materiales de un lienzo. Empieza apagada. */
export function createCortexOcclusion(onMissing: (missing: string[]) => void = warnMissingInDev): CortexOcclusion {
  const uniforms: CortexOcclusionUniforms = {
    ngCortexDepth: { value: null },
    ngCameraNear: { value: 0.1 },
    ngCameraFar: { value: 1000 },
    ngOcclusionStart: { value: OCCLUSION_START },
    ngOcclusionEnd: { value: OCCLUSION_END },
    ngOcclusionMin: { value: OCCLUSION_MIN },
    ngOcclusionOn: { value: 0 },
  };
  return {
    uniforms,
    onBeforeCompile: (shader) => {
      const patch = patchOcclusionShader(shader.vertexShader, shader.fragmentShader);
      if (!patch.ok) {
        onMissing(patch.missing);
        return;
      }
      shader.vertexShader = patch.vertexShader;
      shader.fragmentShader = patch.fragmentShader;
      Object.assign(shader.uniforms, uniforms);
    },
    customProgramCacheKey: () => OCCLUSION_PROGRAM_KEY,
  };
}

/**
 * Props que la oclusión añade a un material de la capa de foco, solo con la
 * corteza pintada (`overlay`): el parche del shader y, en los materiales
 * opacos (marcadores, contornos y conos), `transparent`. Sin `transparent`,
 * three.js no mezcla su alfa y no podrían verse tenues; con él, los dibuja
 * con las líneas, de atrás adelante, y los renderOrder no cambian.
 *
 * Sin la corteza pintada no añade nada, y los materiales se dibujan como
 * antes de la D5. Sin el parche no leen los uniforms, así que tampoco les
 * afecta la oclusión si quedara encendida sin pasada. Un material opaco con
 * el parche escribiría sin mezclar un alfa menor que 1 en el lienzo, que
 * react-three-fiber crea con canal alfa, y la página se vería a través de él.
 *
 * Todas son constantes en la vida de un elemento: `overlay` solo cambia
 * montando otra rama de Brain3D.tsx (corteza pintada, translúcida o la
 * vista de repuesto), así que react-three-fiber nunca tiene que quitar una
 * de estas props de un material que ya existe.
 */
export function occlusionMaterialProps(
  occlusion: CortexOcclusion,
  { opaque, overlay }: { opaque: boolean; overlay: boolean },
) {
  if (!overlay) return {};
  return {
    onBeforeCompile: occlusion.onBeforeCompile,
    customProgramCacheKey: occlusion.customProgramCacheKey,
    ...(opaque ? { transparent: true } : {}),
  };
}

/**
 * Pone un objeto (la malla de la corteza pintada) en la capa de la corteza,
 * sin quitarlo de la 0: la cámara del lienzo lo sigue viendo. Sirve de ref
 * de React, que la llama con null al desmontar.
 */
export function enableCortexOccluderLayer(object: THREE.Object3D | null): void {
  object?.layers.enable(CORTEX_OCCLUDER_LAYER);
}

/** Pone los uniforms en «sin oclusión»: lo que quede se dibuja entero. */
export function detachCortexOcclusion(occlusion: CortexOcclusion): void {
  occlusion.uniforms.ngOcclusionOn.value = 0;
  occlusion.uniforms.ngCortexDepth.value = null;
}

// --- Pasada de la profundidad de la corteza ---

/**
 * Destino de la pasada: la profundidad va en una textura (DepthTexture, que
 * se lee sin interpolar). Sin antialiasing, que no se podría leer así. Su
 * tamaño lo pone renderCortexDepth en cada fotograma.
 */
export function createOcclusionTarget(): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    depthTexture: new THREE.DepthTexture(1, 1),
    samples: 0,
  });
}

/**
 * Material con el que se dibuja la corteza en la pasada: solo escribe
 * profundidad, sin color ni luces. Las dos caras, como el material de la
 * corteza (PaintedCortex.tsx).
 */
export function createOcclusionOverrideMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
}

// Las luces también se ven en la pasada, aunque ahí no alumbran nada. three.js
// guarda las luces de una escena en un solo estado para la pasada y para el
// lienzo, y cuando cambia el número de luces obliga a revisar el programa de
// cada material con luces: sin ellas en la pasada, la corteza y todos los
// marcadores repetirían esa revisión en cada fotograma. Se añade la capa a
// las luces que haya, también a las que se monten después; siguen en la 0.
function showLightInCortexPass(object: THREE.Object3D): void {
  if ((object as THREE.Light).isLight) object.layers.enable(CORTEX_OCCLUDER_LAYER);
}

const drawingBufferSize = new THREE.Vector2();

/**
 * Dibuja la profundidad de la corteza en `target`, con la misma cámara que el
 * lienzo, y enciende la oclusión con ella. Se llama en cada fotograma, antes
 * de dibujar la escena. La cámara ve solo la capa de la corteza (y las
 * luces), y todo se dibuja con `overrideMaterial`. El mismo hemisferio
 * visible sale solo: PaintedCortex.tsx oculta el otro con el drawRange de la
 * geometría, que vale con cualquier material. El destino toma el tamaño del
 * búfer de dibujo, y solo se rehace cuando cambia.
 *
 * Aunque render falle, deja como estaban las capas de la cámara, el
 * material de la escena y el destino, y la oclusión queda apagada. Sin
 * contexto WebGL, con el búfer de dibujo sin tamaño o con una cámara que no
 * es de perspectiva, no dibuja nada y la apaga en ese fotograma: todo se ve
 * entero.
 */
export function renderCortexDepth(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  target: THREE.WebGLRenderTarget,
  occlusion: CortexOcclusion,
  overrideMaterial: THREE.Material,
): void {
  const { uniforms } = occlusion;
  // Apagada hasta que la pasada termine bien.
  uniforms.ngOcclusionOn.value = 0;
  const perspective = camera as THREE.PerspectiveCamera;
  const size = gl.getDrawingBufferSize(drawingBufferSize);
  if (gl.getContext().isContextLost() || size.x === 0 || size.y === 0 || !perspective.isPerspectiveCamera) return;
  if (target.width !== size.x || target.height !== size.y) target.setSize(size.x, size.y);
  scene.traverse(showLightInCortexPass);
  const previousTarget = gl.getRenderTarget();
  const previousOverride = scene.overrideMaterial;
  const previousMask = camera.layers.mask;
  try {
    camera.layers.set(CORTEX_OCCLUDER_LAYER);
    scene.overrideMaterial = overrideMaterial;
    gl.setRenderTarget(target);
    // render borra la profundidad del destino antes de dibujar: three.js
    // borra con autoClear, activado por defecto, y siempre que el fondo de
    // la escena es un color, como aquí (en los dos casos, con autoClearDepth).
    gl.render(scene, camera);
  } finally {
    gl.setRenderTarget(previousTarget);
    scene.overrideMaterial = previousOverride;
    camera.layers.mask = previousMask;
  }
  uniforms.ngCortexDepth.value = target.depthTexture;
  uniforms.ngCameraNear.value = perspective.near;
  uniforms.ngCameraFar.value = perspective.far;
  uniforms.ngOcclusionOn.value = 1;
}
