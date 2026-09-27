import { describe, expect, it } from "vitest";
import { useAppearanceStore } from "../state/appearance";
import { NETWORK_COLORS, NEUTRAL_COLOR } from "./networks";
import { SOFT_NETWORK_COLORS } from "./softPalettes";
import { DRAW_TOKENS, THEME_IDS, type DrawTokens } from "./themes";
import {
  PALETTE_MODES,
  effectivePaletteMode,
  exportColorFor,
  exportNetworkColor,
  exportResolverFor,
  hasNetworkColor,
  isPaletteMode,
  ngFill,
  ngStrokeOpacity,
  resolveNetworkColor,
} from "./colors";
import { currentExportResolver, drawColorsFor } from "./useDrawColors";

const KNOWN_KEYS = Object.keys(NETWORK_COLORS);

describe("effectivePaletteMode", () => {
  it("sin elección (null), «Originales» con el tema Original y «Suaves» con los demás", () => {
    expect(effectivePaletteMode("original", null)).toBe("original");
    for (const theme of ["grafito", "noche", "claro"] as const) expect(effectivePaletteMode(theme, null)).toBe("suave");
  });

  it("una elección gana al automático en cualquier tema", () => {
    for (const theme of THEME_IDS) {
      expect(effectivePaletteMode(theme, "suave")).toBe("suave");
      expect(effectivePaletteMode(theme, "original")).toBe("original");
    }
  });

  it("isPaletteMode reconoce los dos modos", () => {
    expect(PALETTE_MODES.every(isPaletteMode)).toBe(true);
    expect(isPaletteMode("auto")).toBe(false);
    expect(isPaletteMode(null)).toBe(false);
  });
});

describe("resolveNetworkColor", () => {
  it.each(THEME_IDS)("con «Originales del atlas», el color de NETWORK_COLORS (tema %s)", (theme) => {
    for (const key of KNOWN_KEYS) expect(resolveNetworkColor(key, theme, "original"), key).toBe(NETWORK_COLORS[key]);
  });

  it.each(["grafito", "noche", "claro"] as const)("con «Suaves», la columna del tema %s", (theme) => {
    for (const key of KNOWN_KEYS) expect(resolveNetworkColor(key, theme, "suave"), key).toBe(SOFT_NETWORK_COLORS[theme][key]);
  });

  it("el tema Original, con «Suaves», usa la columna de Grafito", () => {
    for (const key of KNOWN_KEYS) expect(resolveNetworkColor(key, "original", "suave"), key).toBe(SOFT_NETWORK_COLORS.grafito[key]);
  });

  it("una red desconocida usa el «sin clasificar» de la paleta activa", () => {
    expect(resolveNetworkColor("no-existe", "grafito", "original")).toBe("#8a8a8a");
    expect(resolveNetworkColor("no-existe", "grafito", "suave")).toBe("#a4a4a4");
    expect(resolveNetworkColor("no-existe", "claro", "suave")).toBe("#6f6f6f");
    expect(resolveNetworkColor("no-existe", "original", "suave")).toBe("#a4a4a4");
    // Claves que existen en cualquier objeto por su prototipo, no como red.
    expect(resolveNetworkColor("constructor", "noche", "original")).toBe("#8a8a8a");
    expect(resolveNetworkColor("constructor", "noche", "suave")).toBe("#a4a4a4");
  });
});

describe("hasNetworkColor", () => {
  it("distingue una red real de una clave heredada o inexistente", () => {
    expect(hasNetworkColor("cole-anticevic.visual")).toBe(true);
    expect(hasNetworkColor("no-existe")).toBe(false);
    expect(hasNetworkColor("constructor")).toBe(false);
  });
});

describe("exportColorFor", () => {
  it("con «Originales del atlas», las redes salen con el color de NETWORK_COLORS en cualquier tema", () => {
    for (const theme of THEME_IDS) {
      expect(exportColorFor("net:cole-anticevic.default", "paint", theme, "original")).toBe("#ff0000");
    }
  });

  it("con «Suaves», las redes salen con la columna de Claro en cualquier tema (4.4)", () => {
    for (const theme of THEME_IDS) {
      expect(exportColorFor("net:cole-anticevic.default", "paint", theme, "suave")).toBe("#bd3024");
    }
  });

  it("una red desconocida en net: usa el «sin clasificar» de la paleta de exportación", () => {
    expect(exportColorFor("net:desconocida", "paint", "claro", "original")).toBe("#8a8a8a");
    expect(exportColorFor("net:desconocida", "paint", "grafito", "suave")).toBe("#6f6f6f");
  });

  it("con el tema Original y «Originales del atlas», exactamente los colores de hoy", () => {
    for (const key of [...KNOWN_KEYS, "red-que-no-existe"]) {
      const today = hasNetworkColor(key) ? NETWORK_COLORS[key] : "#8a8a8a";
      expect(exportColorFor(`net:${key}`, "paint", "original", "original"), key).toBe(today);
    }
    expect(exportColorFor("edge", "paint", "original", "original")).toBe(NEUTRAL_COLOR);
    expect(exportColorFor("selected", "paint", "original", "original")).toBe("#ac61d1");
    expect(exportColorFor("edgeOpacityConnectogram", "opacity", "original", "original")).toBe("0.55");
    expect(exportColorFor("hemiFill", "paint", "original", "original")).toBe("none");
  });

  it("con los temas 2 a 4, los colores de dibujo de Claro, con cualquier paleta", () => {
    for (const mode of PALETTE_MODES) {
      expect(exportColorFor("edge", "paint", "noche", mode)).toBe(DRAW_TOKENS.claro.edge);
      expect(exportColorFor("selected", "paint", "grafito", mode)).toBe(DRAW_TOKENS.claro.selected);
    }
  });

  it("devuelve null para referencias desconocidas o que no son un color", () => {
    expect(exportColorFor("inventado", "paint", "original", "original")).toBeNull();
    expect(exportColorFor("cortexSulcus", "paint", "original", "original")).toBeNull();
  });

  it("un tipo que no coincide con el del token devuelve null", () => {
    expect(exportColorFor("edgeOpacitySelected", "paint", "original", "original")).toBeNull();
    expect(exportColorFor("edge", "opacity", "original", "original")).toBeNull();
    expect(exportColorFor("dash", "paint", "original", "original")).toBeNull();
    expect(exportColorFor("net:cole-anticevic.visual", "opacity", "original", "suave")).toBeNull();
  });

  it("las claves heredadas del prototipo no son un token válido", () => {
    expect(exportColorFor("toString", "paint", "original", "original")).toBeNull();
    expect(exportColorFor("__proto__", "paint", "original", "original")).toBeNull();
    expect(exportColorFor("constructor", "paint", "original", "original")).toBeNull();
  });

  it("exportResolverFor fija el tema y la paleta", () => {
    expect(exportResolverFor("claro", "suave")("edge", "paint")).toBe(DRAW_TOKENS.claro.edge);
    expect(exportResolverFor("noche", "suave")("net:cole-anticevic.visual", "paint")).toBe("#09309c");
    expect(exportResolverFor("noche", "original")("net:cole-anticevic.visual", "paint")).toBe("#0000ff");
  });
});

// Los SVG exportan con currentExportResolver: lee el tema y la paleta del
// store al pulsar «Exportar JPEG» (el único resolvedor de exportación).
describe("currentExportResolver", () => {
  it.each([
    ["grafito", null, "#09309c"],
    ["original", null, "#0000ff"],
    ["original", "suave", "#09309c"],
    ["claro", "original", "#0000ff"],
  ] as const)("tema %s con paleta %s: Visual sale %s", (theme, paletteMode, expected) => {
    useAppearanceStore.setState({ theme, paletteMode });
    expect(currentExportResolver()("net:cole-anticevic.visual", "paint")).toBe(expected);
  });

  it("los colores de dibujo siguen al tema del store", () => {
    useAppearanceStore.setState({ theme: "original", paletteMode: "suave" });
    expect(currentExportResolver()("selected", "paint")).toBe(DRAW_TOKENS.original.selected);
    useAppearanceStore.setState({ theme: "noche", paletteMode: "original" });
    expect(currentExportResolver()("selected", "paint")).toBe(DRAW_TOKENS.claro.selected);
  });
});

describe("ayudantes data-ng-*", () => {
  it("ngFill y ngStrokeOpacity generan el atributo con la referencia", () => {
    expect(ngFill("edge")).toEqual({ "data-ng-fill": "edge" });
    expect(ngStrokeOpacity("edgeOpacitySelected")).toEqual({ "data-ng-stroke-opacity": "edgeOpacitySelected" });
  });
});

describe("ayudantes data-ng-* con tipo", () => {
  it("una referencia mal escrita no compila", () => {
    // Estos @ts-expect-error solo fallan con `tsc -b` (build y chequeo de tipos), no con `npm test`.
    // @ts-expect-error: "egde" no es un token de color
    ngFill("egde");
    // @ts-expect-error: "edge" es un color, no una opacidad
    ngStrokeOpacity("edge");
    expect(typeof ngFill).toBe("function");
  });
});

describe("drawColorsFor", () => {
  it("devuelve los tokens del tema y los colores de red de su paleta", () => {
    const colors = drawColorsFor("noche", "suave");
    expect(colors.edge).toBe(DRAW_TOKENS.noche.edge);
    expect(colors.networkColor("cole-anticevic.visual")).toBe("#3364db");
    expect(drawColorsFor("noche", "original").networkColor("cole-anticevic.visual")).toBe("#0000ff");
  });

  it("forExport devuelve los tokens de exportación", () => {
    expect(drawColorsFor("grafito", "suave", true).selected).toBe(DRAW_TOKENS.claro.selected);
    expect(drawColorsFor("original", "original", true).selected).toBe(DRAW_TOKENS.original.selected);
  });
});

// El cerebro 3D exporta volviendo a dibujar con drawColorsFor(tema, modo,
// true); los SVG, con exportColorFor sobre sus atributos data-ng-*. Las dos
// vías tienen que dar los mismos colores en cada tema y con cada paleta, o
// el 3D y el connectograma exportados no casarían.
describe("exportación: el 3D y los SVG usan los mismos colores", () => {
  const keys = [...KNOWN_KEYS, "red-que-no-existe"];
  const cases = THEME_IDS.flatMap((theme) => PALETTE_MODES.map((mode) => [theme, mode] as const));

  it.each(cases)("colores de red, tema %s, paleta %s", (theme, mode) => {
    const colors = drawColorsFor(theme, mode, true);
    for (const key of keys) {
      expect(colors.networkColor(key), key).toBe(exportColorFor(`net:${key}`, "paint", theme, mode));
    }
  });

  it.each(cases)("tokens de color y de opacidad, tema %s, paleta %s", (theme, mode) => {
    const colors = drawColorsFor(theme, mode, true);
    for (const key of Object.keys(DRAW_TOKENS[theme]) as (keyof DrawTokens)[]) {
      const value = colors[key];
      if (typeof value === "number") expect(exportColorFor(key, "opacity", theme, mode), key).toBe(String(value));
      else if (typeof value === "string" && key !== "dash") expect(exportColorFor(key, "paint", theme, mode), key).toBe(value);
    }
  });

  it.each(THEME_IDS)("tema %s: con «Suaves», la columna de Claro; con «Originales», NETWORK_COLORS", (theme) => {
    for (const key of KNOWN_KEYS) {
      expect(exportNetworkColor(key, "suave"), key).toBe(SOFT_NETWORK_COLORS.claro[key]);
      expect(drawColorsFor(theme, "suave", true).networkColor(key), key).toBe(SOFT_NETWORK_COLORS.claro[key]);
      expect(drawColorsFor(theme, "original", true).networkColor(key), key).toBe(NETWORK_COLORS[key]);
    }
  });
});
