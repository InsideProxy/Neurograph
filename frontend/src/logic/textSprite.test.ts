import { describe, expect, it } from "vitest";
import { labelTextureKey, markRingTextureKey } from "./textSprite";

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
