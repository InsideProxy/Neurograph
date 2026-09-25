import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getLabelTexture, getMarkRingTexture, labelTextureKey, markRingTextureKey } from "./textSprite";

// Estilos de etiqueta: la de siempre en Grafito (texto del tema sobre su
// fondo translúcido) y la de una región marcada (docs/rediseno-interfaz-diseno.md, 5.9 y 6.3).
const GRAFITO = { background: "rgba(22, 25, 30, 0.84)", color: "#c9ced6" };
const PILL = { background: "#2563eb", color: "#ffffff" };

// Las texturas se guardan en caché (logic/textSprite.ts), por su texto, sus
// dos colores y la versión de fuentes (fase 4 del rediseño, spec 6.3).
describe("claves de la caché de texturas", () => {
  it("cambian con el texto, con cada color y con la versión de fuentes", () => {
    const key = labelTextureKey("V1", GRAFITO, 0);
    expect(labelTextureKey("V1", { ...GRAFITO }, 0)).toBe(key);
    expect(labelTextureKey("V2", GRAFITO, 0)).not.toBe(key);
    expect(labelTextureKey("V1", { ...GRAFITO, background: "rgba(255, 255, 255, 0.88)" }, 0)).not.toBe(key);
    expect(labelTextureKey("V1", { ...GRAFITO, color: "#3a3d43" }, 0)).not.toBe(key);
    expect(labelTextureKey("V1", GRAFITO, 1)).not.toBe(key);
    expect(labelTextureKey("V1", PILL, 0)).not.toBe(key);
  });

  it("el anillo de las marcas, por el color del hueco y el del anillo", () => {
    expect(markRingTextureKey("#16191e", "#2563eb")).not.toBe(markRingTextureKey("#ffffff", "#2563eb"));
    expect(markRingTextureKey("#16191e", "#2563eb")).not.toBe(markRingTextureKey("#16191e", "#1d4ed8"));
  });
});

// Que las texturas se guardan de verdad con esas claves. En node no hay DOM:
// un <canvas> sin contexto 2D basta, porque sin él textSprite crea igual la
// textura, vacía, y la guarda.
describe("caché de texturas", () => {
  beforeAll(() => {
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => null }) });
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("la misma etiqueta es la misma textura; con otro tema, otra", () => {
    const label = getLabelTexture("V1", GRAFITO, 0);
    expect(getLabelTexture("V1", { ...GRAFITO }, 0)).toBe(label);
    expect(getLabelTexture("V1", { ...GRAFITO, color: "#3a3d43" }, 0)).not.toBe(label);
    expect(getLabelTexture("V1", PILL, 0)).not.toBe(label);
    expect(getLabelTexture("V1", { ...PILL, background: "#1d4ed8" }, 0)).not.toBe(getLabelTexture("V1", PILL, 0));
  });

  it("el anillo es otra textura con otro color de hueco o de anillo, y la misma con los mismos", () => {
    const ring = getMarkRingTexture("#16191e", "#2563eb");
    expect(getMarkRingTexture("#16191e", "#2563eb")).toBe(ring);
    expect(getMarkRingTexture("#ffffff", "#2563eb")).not.toBe(ring);
    expect(getMarkRingTexture("#16191e", "#1d4ed8")).not.toBe(ring);
  });

  // Va la última: sube la versión de fuentes de la caché.
  it("cuando sube la versión de fuentes, las etiquetas se vuelven a dibujar y las de antes se liberan", () => {
    const before = getLabelTexture("V1", GRAFITO, 0);
    const disposed = vi.fn();
    before.texture.addEventListener("dispose", disposed);
    const after = getLabelTexture("V1", GRAFITO, 1);
    expect(after).not.toBe(before);
    expect(disposed).toHaveBeenCalledTimes(1);
    expect(getLabelTexture("V1", GRAFITO, 1)).toBe(after);
  });
});
