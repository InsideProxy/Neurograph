import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getLabelTexture, getMarkRingTexture, labelTextureKey, markRingTextureKey } from "./textSprite";

const PILL = { background: "#2563eb", color: "#ffffff" };

// Las texturas se guardan en caché (logic/textSprite.ts). La etiqueta de
// una región marcada (spec 5.9) lleva la pastilla del color de marca del
// tema: su clave lleva esos colores, así que no se confunde con la etiqueta
// de siempre ni con la de otro tema.
describe("claves de la caché de texturas", () => {
  it("la etiqueta de siempre se guarda por su texto, como hasta ahora", () => {
    expect(labelTextureKey("V1", null)).toBe("V1");
  });

  it("la de una región marcada lleva los colores de la pastilla", () => {
    expect(labelTextureKey("V1", PILL)).not.toBe(labelTextureKey("V1", null));
    expect(labelTextureKey("V1", PILL)).not.toBe(labelTextureKey("V1", { ...PILL, background: "#1d4ed8" }));
    expect(labelTextureKey("V1", PILL)).not.toBe(labelTextureKey("V1", { ...PILL, color: "#000000" }));
    expect(labelTextureKey("V1", PILL)).toBe(labelTextureKey("V1", { ...PILL }));
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

  it("la etiqueta de una región marcada es otra textura por cada par de colores, y la misma con los mismos", () => {
    const marked = getLabelTexture("V1", PILL);
    expect(getLabelTexture("V1", { ...PILL })).toBe(marked);
    expect(getLabelTexture("V1", { ...PILL, background: "#1d4ed8" })).not.toBe(marked);
    expect(getLabelTexture("V1", { ...PILL, color: "#000000" })).not.toBe(marked);
    expect(getLabelTexture("V1", null)).not.toBe(marked);
    expect(getLabelTexture("V1")).toBe(getLabelTexture("V1", null));
  });

  it("el anillo es otra textura con otro color de hueco o de anillo, y la misma con los mismos", () => {
    const ring = getMarkRingTexture("#16191e", "#2563eb");
    expect(getMarkRingTexture("#16191e", "#2563eb")).toBe(ring);
    expect(getMarkRingTexture("#ffffff", "#2563eb")).not.toBe(ring);
    expect(getMarkRingTexture("#16191e", "#1d4ed8")).not.toBe(ring);
  });
});
