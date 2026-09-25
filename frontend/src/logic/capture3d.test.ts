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
});
