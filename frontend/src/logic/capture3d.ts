// Captura del cerebro 3D para exportarlo sin parpadeo (Legibilidad del 3D;
// docs/rediseno-interfaz-diseno.md, 6.3). Hasta ahora (D3 de
// docs/decisiones-diseno.md), la exportación volvía a dibujar el lienzo
// visible con los colores de exportación, y en pantalla se veían entre 2 y 4
// fotogramas con ellos. Ahora la captura se dibuja en un destino fuera de
// pantalla y, mientras dura la exportación, el lienzo visible no se vuelve a
// dibujar: sigue mostrando el último fotograma.
import * as THREE from "three";

// --- Fases de la exportación ---
//
// - idle: sin exportar; el lienzo se dibuja en cada fotograma.
// - capturing: la escena lleva los colores de exportación; el lienzo no se
//   dibuja, y la captura va al destino fuera de pantalla.
// - restoring: la escena ya lleva otra vez los colores de pantalla, pero el
//   lienzo espera un fotograma más: la corteza pintada los recalcula en un
//   efecto, que para entonces ya ha terminado.
export type ExportPhase = "idle" | "capturing" | "restoring";
// abort: el lienzo se desmontó o perdió el contexto WebGL a mitad.
export type ExportEvent = "request" | "captured" | "restored" | "abort";

export function exportPhaseAfter(phase: ExportPhase, event: ExportEvent): ExportPhase {
  switch (event) {
    case "request":
      return phase === "idle" ? "capturing" : phase;
    case "captured":
      return phase === "capturing" ? "restoring" : phase;
    case "restored":
      return phase === "restoring" ? "idle" : phase;
    case "abort":
      return "idle";
  }
}

/**
 * Filas de abajo arriba, como las da readPixels de WebGL, puestas de arriba
 * abajo, como las espera una imagen. Devuelve una copia.
 */
export function flipRows(pixels: Uint8Array, width: number, height: number): Uint8Array<ArrayBuffer> {
  const rowBytes = width * 4;
  const flipped = new Uint8Array(rowBytes * height);
  for (let row = 0; row < height; row++) {
    const from = (height - 1 - row) * rowBytes;
    flipped.set(pixels.subarray(from, from + rowBytes), row * rowBytes);
  }
  return flipped;
}

/**
 * Destino fuera de pantalla que da los mismos colores que el lienzo:
 * - RGBA de 8 bits (UnsignedByteType): WebKitGTK y WebView2 no siempre leen
 *   destinos de coma flotante.
 * - En pantalla, three.js aplica en el shader la curva de tono (ACES, la de
 *   react-three-fiber) y la codificación sRGB, y mezcla las transparencias
 *   sobre esos valores. En un destino normal no aplica ninguna de las dos:
 *   dibuja en lineal. Las aplica en pantalla y en los destinos marcados como
 *   de WebXR (isXRRenderTarget), con el espacio de color de su textura
 *   (three.js 0.185: WebGLPrograms, WebGLRenderer.setProgram y
 *   getUnlitUniformColorSpace). Por eso el destino lleva esa marca y
 *   colorSpace sRGB.
 * - El formato interno RGBA8 es imprescindible. La marca también actúa en
 *   WebGLTextures: fuerza RGBA8 en el renderbuffer multimuestra, pero no en
 *   la textura en la que se resuelven sus muestras, que con colorSpace sRGB
 *   sería SRGB8_ALPHA8. Resolver entre formatos distintos (blitFramebuffer)
 *   da INVALID_OPERATION. Con RGBA8 fijado, los dos coinciden, y la GPU no
 *   vuelve a codificar a sRGB lo que el shader ya codificó.
 * - 4 muestras de antialiasing, como el lienzo (antialias de
 *   react-three-fiber). La profundidad no se resuelve (resolveDepthBuffer):
 *   solo se lee el color.
 */
export function createCaptureTarget(width: number, height: number): THREE.WebGLRenderTarget {
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    colorSpace: THREE.SRGBColorSpace,
    internalFormat: "RGBA8",
    samples: 4,
    resolveDepthBuffer: false,
  });
  return Object.assign(target, { isXRRenderTarget: true });
}

export interface CapturedPixels {
  pixels: Uint8Array<ArrayBuffer>;
  width: number;
  height: number;
}

/**
 * Dibuja la escena sobre blanco (decisión 11) en un destino fuera de
 * pantalla del tamaño del lienzo y devuelve sus píxeles, de arriba abajo. El
 * lienzo visible no se toca. Aunque falle, deja el destino, el color de
 * borrado y el fondo de la escena como estaban.
 *
 * Si se ha perdido el contexto WebGL o el búfer de dibujo no tiene tamaño,
 * no dibuja nada: lo dice en la consola y devuelve null. Con el contexto
 * perdido, readPixels no lee nada y el JPEG saldría negro.
 */
export function renderSceneOffscreen(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): CapturedPixels | null {
  const size = gl.getDrawingBufferSize(new THREE.Vector2());
  if (gl.getContext().isContextLost()) {
    // eslint-disable-next-line no-console
    console.error("No se pudo exportar el cerebro 3D: se perdió el contexto WebGL.");
    return null;
  }
  if (size.x === 0 || size.y === 0) {
    // eslint-disable-next-line no-console
    console.error(`No se pudo exportar el cerebro 3D: el lienzo mide ${size.x} × ${size.y} píxeles.`);
    return null;
  }
  const target = createCaptureTarget(size.x, size.y);
  const previousTarget = gl.getRenderTarget();
  const previousClearColor = gl.getClearColor(new THREE.Color());
  const previousClearAlpha = gl.getClearAlpha();
  const previousBackground = scene.background;
  try {
    // Como en la decisión 18: scene.background gana siempre al color de
    // borrado, así que se cambian los dos.
    gl.setClearColor("#ffffff", 1);
    scene.background = new THREE.Color("#ffffff");
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    const pixels = new Uint8Array(size.x * size.y * 4);
    gl.readRenderTargetPixels(target, 0, 0, size.x, size.y, pixels);
    return { pixels: flipRows(pixels, size.x, size.y), width: size.x, height: size.y };
  } finally {
    gl.setRenderTarget(previousTarget);
    gl.setClearColor(previousClearColor, previousClearAlpha);
    scene.background = previousBackground;
    target.dispose();
  }
}
