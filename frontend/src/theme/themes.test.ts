import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, DRAW_TOKENS, THEME_IDS, exportDrawTokens, hexToSrgb, isThemeId } from "./themes";

describe("DRAW_TOKENS", () => {
  it("el tema original conserva los colores y opacidades de hoy", () => {
    const o = DRAW_TOKENS.original;
    expect(o.edge).toBe("#837f90");
    expect(o.label).toBe("#837f90");
    expect(o.nodeRing).toBe("#837f90");
    expect(o.selected).toBe("#ac61d1");
    expect(o.hoverHighlight).toBe("#ffd84a");
    expect(o.intra).toBe("#2a925e");
    expect(o.inter).toBe("#cf596d");
    expect(o.homology).toBe("#da500b");
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

  it("la exportación nunca necesita reescribir el discontinuo", () => {
    for (const id of THEME_IDS) expect(DRAW_TOKENS[id].dash).toBe(exportDrawTokens(id).dash);
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

  it("hexToSrgb rechaza un color que no es #rrggbb", () => {
    expect(() => hexToSrgb("#fff")).toThrow();
  });
});
