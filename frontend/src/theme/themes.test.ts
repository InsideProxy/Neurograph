import { describe, expect, it } from "vitest";
import {
  ACCENT_SELECTED_COLOR,
  HOMOLOGY_HIGHLIGHT_COLOR,
  HOVER_HIGHLIGHT_COLOR,
  INTER_HEMISPHERE_COLOR,
  INTRA_HEMISPHERE_COLOR,
  NEUTRAL_COLOR,
} from "./networks";
import { DEFAULT_THEME, DRAW_TOKENS, THEME_IDS, exportDrawTokens, hexToSrgb, isThemeId } from "./themes";

describe("DRAW_TOKENS", () => {
  it("el tema original conserva los colores y opacidades de hoy", () => {
    const o = DRAW_TOKENS.original;
    expect(o.edge).toBe(NEUTRAL_COLOR);
    expect(o.label).toBe(NEUTRAL_COLOR);
    expect(o.nodeRing).toBe(NEUTRAL_COLOR);
    expect(o.selected).toBe(ACCENT_SELECTED_COLOR);
    expect(o.hoverHighlight).toBe(HOVER_HIGHLIGHT_COLOR);
    expect(o.intra).toBe(INTRA_HEMISPHERE_COLOR);
    expect(o.inter).toBe(INTER_HEMISPHERE_COLOR);
    expect(o.homology).toBe(HOMOLOGY_HIGHLIGHT_COLOR);
    expect(o.sceneBg).toBe("#1d1e26");
    expect(o.nodeGap).toBe("#0b0c10");
    expect(o.hemiFill).toBe("none");
    expect(o.dash).toBe("6 4");
    expect([o.edgeOpacityConnectogram, o.edgeOpacityHemispheres, o.edgeOpacity3d]).toEqual([0.55, 0.6, 0.55]);
    expect([o.edgeOpacityHoverOther, o.edgeOpacityHoverSelected, o.edgeOpacitySelected]).toEqual([0.12, 0.45, 0.95]);
    expect(o.cortexSulcus).toEqual([0.35, 0.35, 0.35]);
    expect(o.cortexGyrus).toEqual([0.72, 0.72, 0.72]);
    expect(o.cortexMedialWall).toEqual([0.25, 0.25, 0.25]);
    expect(o.cortexNoData).toEqual([0.55, 0.55, 0.55]);
  });

  it("los cuatro temas definen los mismos tokens", () => {
    const keys = Object.keys(DRAW_TOKENS.original).sort();
    for (const id of THEME_IDS) expect(Object.keys(DRAW_TOKENS[id]).sort()).toEqual(keys);
  });

  it("la exportación usa el tema 1 tal cual y Claro para los demás", () => {
    expect(exportDrawTokens("original")).toBe(DRAW_TOKENS.original);
    for (const id of ["grafito", "noche", "claro"] as const) {
      expect(exportDrawTokens(id)).toBe(DRAW_TOKENS.claro);
    }
  });

  it("los temas 2 a 4 comparten el discontinuo, porque la exportación no lo reescribe", () => {
    for (const id of ["grafito", "noche"] as const) expect(DRAW_TOKENS[id].dash).toBe(DRAW_TOKENS.claro.dash);
  });
});

describe("utilidades de tema", () => {
  it("reconoce los ids de tema; el tema por defecto es Grafito", () => {
    expect(DEFAULT_THEME).toBe("grafito");
    expect(isThemeId("noche")).toBe(true);
    expect(isThemeId("azul")).toBe(false);
    expect(isThemeId(3)).toBe(false);
  });

  it("convierte un hex a sRGB 0-1", () => {
    expect(hexToSrgb("#ff8000")).toEqual([1, 128 / 255, 0]);
  });
});
