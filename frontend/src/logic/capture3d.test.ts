import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  createCaptureTarget,
  exportPhaseAfter,
  flipRows,
  renderSceneOffscreen,
  type ExportEvent,
  type ExportPhase,
} from "./capture3d";

// Lee el código fuente de three.js para la prueba "guarda ante una
// actualización de three.js", más abajo. Igual que en
// theme/themeCss.test.ts: se pide "node:fs" con process.getBuiltinModule en
// vez de importarlo porque tsconfig.app.json solo carga los tipos de
// vite/client, y con la importación tsc -b fallaría.
interface NodeFs {
  readFileSync(path: URL, encoding: "utf8"): string;
}
const { readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule(id: "node:fs"): NodeFs } }
).process.getBuiltinModule("node:fs");

describe("exportPhaseAfter", () => {
  it("una exportación entera: pedir, capturar, volver a pantalla", () => {
    let phase: ExportPhase = "idle";
    const steps: ExportPhase[] = [];
    for (const event of ["request", "captured", "restored"] as ExportEvent[]) {
      phase = exportPhaseAfter(phase, event);
      steps.push(phase);
    }
    expect(steps).toEqual(["capturing", "restoring", "idle"]);
  });

  it("pedir otra exportación durante una no hace nada", () => {
    expect(exportPhaseAfter("capturing", "request")).toBe("capturing");
    expect(exportPhaseAfter("restoring", "request")).toBe("restoring");
  });

  it("cada paso solo vale desde el anterior", () => {
    expect(exportPhaseAfter("idle", "captured")).toBe("idle");
    expect(exportPhaseAfter("idle", "restored")).toBe("idle");
    expect(exportPhaseAfter("capturing", "restored")).toBe("capturing");
    expect(exportPhaseAfter("restoring", "captured")).toBe("restoring");
  });

  it("si el lienzo se desmonta a mitad, se sale de la exportación", () => {
    for (const phase of ["idle", "capturing", "restoring"] as ExportPhase[]) {
      expect(exportPhaseAfter(phase, "abort")).toBe("idle");
    }
  });
});

describe("flipRows", () => {
  it("la última fila pasa a ser la primera, sin tocar el original", () => {
    // 2 × 3 píxeles; cada píxel lleva el número de su fila.
    const pixels = new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255, 1, 1, 1, 255, 1, 1, 1, 255, 2, 2, 2, 255, 2, 2, 2, 255]);
    const copy = pixels.slice();
    expect([...flipRows(pixels, 2, 3)]).toEqual([2, 2, 2, 255, 2, 2, 2, 255, 1, 1, 1, 255, 1, 1, 1, 255, 0, 0, 0, 255, 0, 0, 0, 255]);
    expect(pixels).toEqual(copy);
  });
});

describe("createCaptureTarget", () => {
  const target = createCaptureTarget(640, 480);

  it("tiene el tamaño pedido", () => {
    expect([target.width, target.height]).toEqual([640, 480]);
  });

  it("es RGBA de 8 bits, que se lee en todos los navegadores", () => {
    expect(target.texture.type).toBe(THREE.UnsignedByteType);
    expect(target.texture.format).toBe(THREE.RGBAFormat);
    expect(target.texture.internalFormat).toBe("RGBA8");
  });

  it("recibe la curva de tono y la codificación sRGB, como el lienzo", () => {
    expect((target as THREE.WebGLRenderTarget & { isXRRenderTarget?: boolean }).isXRRenderTarget).toBe(true);
    expect(target.texture.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it("con antialiasing y profundidad, que no se resuelve: solo se lee el color", () => {
    expect(target.samples).toBe(4);
    expect(target.depthBuffer).toBe(true);
    expect(target.resolveDepthBuffer).toBe(false);
  });
});

describe("renderSceneOffscreen", () => {
  // Un renderer con solo lo que se mira antes de dibujar: si la función
  // llamara a algo más (setRenderTarget, render…), la prueba fallaría.
  const renderer = (width: number, height: number, lost: boolean) =>
    ({
      getContext: () => ({ isContextLost: () => lost }),
      getDrawingBufferSize: (target: THREE.Vector2) => target.set(width, height),
    }) as unknown as THREE.WebGLRenderer;
  const camera = new THREE.PerspectiveCamera();

  interface FakeCall {
    method: string;
    args: unknown[];
  }

  // Renderer falso más completo, para las pruebas del camino de éxito: deja
  // llegar hasta el final (setRenderTarget, render, readRenderTargetPixels)
  // y registra cada llamada relevante, con el color de fondo de la escena
  // en el momento de "dibujar" (no hay WebGL de verdad: solo se registra).
  // getClearColor/getClearAlpha/getRenderTarget simulan lo que había ANTES
  // de capturar, para comprobar que se restaura tal cual (mismos objetos,
  // cuando aplica). Por defecto, readRenderTargetPixels rellena el búfer
  // con markedPixels (una captura "válida"); con emptyCapture, lo deja en
  // ceros -- como si el contexto se hubiera perdido a mitad, o el destino
  // hubiera quedado incompleto.
  function fakeCaptureRenderer(options: {
    width?: number;
    height?: number;
    onRender?: () => void;
    emptyCapture?: boolean;
  }) {
    const width = options.width ?? 2;
    const height = options.height ?? 3;
    const calls: FakeCall[] = [];
    const previousTarget = {} as unknown as THREE.WebGLRenderTarget;
    const previousColor = new THREE.Color("#123456");
    const previousAlpha = 0.5;
    const gl = {
      getContext: () => ({ isContextLost: () => false }),
      getDrawingBufferSize: (v: THREE.Vector2) => v.set(width, height),
      getRenderTarget: () => {
        calls.push({ method: "getRenderTarget", args: [] });
        return previousTarget;
      },
      getClearColor: (target: THREE.Color) => {
        calls.push({ method: "getClearColor", args: [] });
        return target.copy(previousColor);
      },
      getClearAlpha: () => {
        calls.push({ method: "getClearAlpha", args: [] });
        return previousAlpha;
      },
      setClearColor: (color: unknown, alpha: number) => {
        calls.push({ method: "setClearColor", args: [color, alpha] });
      },
      setRenderTarget: (target: unknown) => {
        calls.push({ method: "setRenderTarget", args: [target] });
      },
      render: (scene: THREE.Scene) => {
        calls.push({ method: "render", args: [(scene.background as THREE.Color | null)?.getHexString() ?? null] });
        options.onRender?.();
      },
      readRenderTargetPixels: (
        _target: THREE.WebGLRenderTarget,
        _x: number,
        _y: number,
        w: number,
        h: number,
        pixels: Uint8Array,
      ) => {
        calls.push({ method: "readRenderTargetPixels", args: [] });
        if (!options.emptyCapture) pixels.set(markedPixels(w, h));
      },
    };
    return {
      gl: gl as unknown as THREE.WebGLRenderer,
      calls,
      previousTarget,
      previousColor,
      previousAlpha,
      width,
      height,
    };
  }

  it("con el contexto WebGL perdido no dibuja ni da píxeles (el JPEG saldría negro), y lo dice", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const scene = new THREE.Scene();
    expect(renderSceneOffscreen(renderer(640, 480, true), scene, camera)).toBeNull();
    expect(scene.background).toBeNull();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it("con el búfer de dibujo sin tamaño, tampoco", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(renderSceneOffscreen(renderer(0, 0, false), new THREE.Scene(), camera)).toBeNull();
    expect(renderSceneOffscreen(renderer(640, 0, false), new THREE.Scene(), camera)).toBeNull();
    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });

  it("con los píxeles vacíos (contexto perdido o destino incompleto a mitad de la captura), no da nada y lo dice", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { gl } = fakeCaptureRenderer({ emptyCapture: true });
    expect(renderSceneOffscreen(gl, new THREE.Scene(), camera)).toBeNull();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  // Marca cada fila con su propio número (en los tres canales de color, para
  // que se note tanto si se pierde una fila como si se mezclan), y alfa 255
  // (una captura "válida"). Se usa tanto para rellenar el renderer falso
  // como para construir el resultado esperado con la propia flipRows.
  function markedPixels(width: number, height: number): Uint8Array {
    const pixels = new Uint8Array(width * height * 4);
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const i = (row * width + col) * 4;
        pixels[i] = row;
        pixels[i + 1] = row;
        pixels[i + 2] = row;
        pixels[i + 3] = 255;
      }
    }
    return pixels;
  }

  it("camino de éxito: dibuja sobre blanco, invierte las filas y restaura destino, color de borrado, alfa y fondo", () => {
    const { gl, calls, previousTarget, previousColor, previousAlpha, width, height } = fakeCaptureRenderer({});
    const scene = new THREE.Scene();
    const originalBackground = new THREE.Color("#010203");
    scene.background = originalBackground;
    const dispose = vi.spyOn(Object.getPrototypeOf(THREE.WebGLRenderTarget.prototype) as { dispose(): void }, "dispose");

    const result = renderSceneOffscreen(gl, scene, camera);

    // El fondo es blanco en el momento de dibujar (y no antes: la llamada a
    // render es la única forma de saberlo, ya que aquí no se dibuja nada de
    // verdad).
    expect(calls.find((c) => c.method === "render")?.args).toEqual(["ffffff"]);
    // Se restaura después de dibujar.
    expect(scene.background).toBe(originalBackground);
    // El destino de dibujo vuelve a ser el de antes (getRenderTarget de
    // three.js da la referencia directa, sin copiar: aquí sí importa que
    // sea el mismo objeto).
    expect(calls.filter((c) => c.method === "setRenderTarget").at(-1)?.args[0]).toBe(previousTarget);
    // El color de borrado y su alfa también. getClearColor de three.js copia
    // el valor en el target que se le pasa (nunca da su referencia interna),
    // así que aquí solo se puede comprobar el valor, no la identidad.
    const lastClearColor = calls.filter((c) => c.method === "setClearColor").at(-1);
    expect(lastClearColor?.args[0]).toEqual(previousColor);
    expect(lastClearColor?.args[1]).toBe(previousAlpha);
    // El destino fuera de pantalla se libera.
    expect(dispose).toHaveBeenCalledOnce();
    dispose.mockRestore();
    // Las filas llegan invertidas (de abajo arriba a arriba abajo).
    expect(result?.pixels).toEqual(flipRows(markedPixels(width, height), width, height));
  });

  it("si render lanza, también se restaura el destino, el color de borrado, su alfa y el fondo, y se libera el destino", () => {
    const boom = new Error("boom");
    const { gl, calls, previousTarget, previousColor, previousAlpha } = fakeCaptureRenderer({
      onRender: () => {
        throw boom;
      },
    });
    const scene = new THREE.Scene();
    const originalBackground = new THREE.Color("#010203");
    scene.background = originalBackground;
    const dispose = vi.spyOn(Object.getPrototypeOf(THREE.WebGLRenderTarget.prototype) as { dispose(): void }, "dispose");

    expect(() => renderSceneOffscreen(gl, scene, camera)).toThrow(boom);

    // Aunque render lanzara después de que el fondo ya se puso en blanco
    // (se ve en la propia llamada registrada), todo se restaura igual.
    expect(calls.find((c) => c.method === "render")?.args).toEqual(["ffffff"]);
    expect(scene.background).toBe(originalBackground);
    expect(calls.filter((c) => c.method === "setRenderTarget").at(-1)?.args[0]).toBe(previousTarget);
    const lastClearColor = calls.filter((c) => c.method === "setClearColor").at(-1);
    expect(lastClearColor?.args[0]).toEqual(previousColor);
    expect(lastClearColor?.args[1]).toBe(previousAlpha);
    expect(dispose).toHaveBeenCalledOnce();
    dispose.mockRestore();
  });
});

// Guarda ante una actualización de three.js (Legibilidad del 3D):
// createCaptureTarget (más arriba) marca el destino como isXRRenderTarget
// para que three.js le aplique la misma curva de tono y codificación sRGB
// que al lienzo -- ver su comentario de documentación.
// Si una versión futura de three.js dejara de mirar esa marca para elegir
// el colorSpace de salida, la captura saldría con otros colores que el
// lienzo, en silencio. `three` exporta `./src/*`; se lee como texto, igual
// que theme/themeCss.test.ts lee index.css -- no se importa, porque no es
// el módulo que se quiere ejecutar, solo el texto que ancla la suposición.
describe("guarda ante una actualización de three.js", () => {
  it("WebGLPrograms sigue mirando isXRRenderTarget para elegir el colorSpace de salida", () => {
    const source = readFileSync(
      new URL("../../node_modules/three/src/renderers/webgl/WebGLPrograms.js", import.meta.url),
      "utf8",
    );
    expect(source).toContain(
      "currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace",
    );
  });
});
