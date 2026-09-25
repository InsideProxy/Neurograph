import { describe, expect, it, vi } from "vitest";
import { LABEL_FONT } from "../logic/textSprite";
import { requestLabelFont, useLabelFontStore } from "./labelFont";

// Versión de fuentes de las etiquetas del 3D (docs/rediseno-interfaz-diseno.md, 6.3).
describe("requestLabelFont", () => {
  it("pide la fuente de las etiquetas y, cuando llega, sube la versión", async () => {
    const before = useLabelFontStore.getState().version;
    const fonts = { load: vi.fn(() => Promise.resolve([])) };
    await requestLabelFont(fonts);
    expect(fonts.load).toHaveBeenCalledWith(LABEL_FONT);
    expect(useLabelFontStore.getState().version).toBe(before + 1);
  });

  it("la pide una sola vez", async () => {
    const fonts = { load: vi.fn(() => Promise.resolve([])) };
    await requestLabelFont(fonts);
    const after = useLabelFontStore.getState().version;
    await requestLabelFont(fonts);
    expect(fonts.load).toHaveBeenCalledTimes(1);
    expect(useLabelFontStore.getState().version).toBe(after);
  });

  it("si no llega, o no hay document.fonts, la versión no cambia y no hay error", async () => {
    const before = useLabelFontStore.getState().version;
    await requestLabelFont({ load: () => Promise.reject(new Error("sin red")) });
    await requestLabelFont(undefined);
    expect(useLabelFontStore.getState().version).toBe(before);
  });
});

describe("tipografía de las etiquetas", () => {
  it("es la de la interfaz, con la de respaldo del sistema", () => {
    expect(LABEL_FONT).toBe("600 44px 'Atkinson Hyperlegible Next', system-ui, sans-serif");
  });
});
