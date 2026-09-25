import { describe, expect, it } from "vitest";
import { SOFT_NETWORK_COLORS } from "./softPalettes";
import { DEFAULT_THEME, DRAW_TOKENS, THEME_IDS, type ThemeId } from "./themes";

// Bloques de tema de index.css (D3 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 4.1 y 8). El archivo se lee del disco:
// en vitest, las importaciones ?raw de un .css llegan vacías. Se pide
// "node:fs" con process.getBuiltinModule en vez de importarlo porque
// tsconfig.app.json solo carga los tipos de vite/client, y con la
// importación tsc -b fallaría.
interface NodeFs {
  readFileSync(path: URL, encoding: "utf8"): string;
}
const { readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule(id: "node:fs"): NodeFs } }
).process.getBuiltinModule("node:fs");
const CSS = readFileSync(new URL("../index.css", import.meta.url), "utf8");

interface Rule {
  selectors: string[];
  body: string;
}

// Reglas de primer nivel (sin comentarios), con su lista de selectores.
function topLevelRules(css: string): Rule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: Rule[] = [];
  let depth = 0;
  let start = 0;
  let selector = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) {
        selector = text.slice(start, i);
        start = i + 1;
      }
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        rules.push({ selectors: selector.split(",").map((s) => s.trim()), body: text.slice(start, i) });
        start = i + 1;
      }
    }
  }
  return rules;
}

function variables(body: string): Map<string, string> {
  return new Map([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const RULES = topLevelRules(CSS);
const THEME_BLOCKS = new Map<ThemeId, Rule>(
  THEME_IDS.map((id) => {
    const matches = RULES.filter((r) => r.selectors.includes(`[data-theme-preview="${id}"]`));
    if (matches.length !== 1) throw new Error(`index.css: ${matches.length} bloques para el tema ${id}`);
    return [id, matches[0]];
  }),
);

describe("bloques de tema de index.css", () => {
  it("los cuatro definen exactamente las mismas variables", () => {
    const expected = [...variables(THEME_BLOCKS.get(DEFAULT_THEME)!.body).keys()].sort();
    expect(expected.length).toBeGreaterThan(15);
    for (const id of THEME_IDS) {
      expect([...variables(THEME_BLOCKS.get(id)!.body).keys()].sort(), id).toEqual(expected);
    }
  });

  it("cada bloque se aplica a su data-theme y a su vista previa", () => {
    for (const id of THEME_IDS) {
      const { selectors } = THEME_BLOCKS.get(id)!;
      expect(selectors, id).toContain(`:root[data-theme="${id}"]`);
      expect(selectors, id).toContain(`[data-theme-preview="${id}"]`);
    }
  });

  it("el respaldo sin data-theme (:root a secas) es el tema por defecto", () => {
    for (const id of THEME_IDS) {
      expect(THEME_BLOCKS.get(id)!.selectors.includes(":root"), id).toBe(id === DEFAULT_THEME);
    }
  });

  it("ninguna otra regla de :root redefine una variable de tema", () => {
    const themeVars = new Set(variables(THEME_BLOCKS.get(DEFAULT_THEME)!.body).keys());
    const others = RULES.filter((r) => r.selectors.includes(":root") && ![...THEME_BLOCKS.values()].includes(r));
    for (const rule of others) {
      for (const name of variables(rule.body).keys()) expect(themeVars.has(name), name).toBe(false);
    }
  });
});

// Contraste WCAG (spec 4.1 y 8): el texto supera 4,5:1.
type Rgb = readonly [number, number, number];

function parseColor(value: string): { rgb: Rgb; alpha: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 };
  }
  const rgba = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/.exec(value);
  if (rgba) return { rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])], alpha: Number(rgba[4]) };
  throw new Error(`color no reconocido: ${value}`);
}

function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Un color translúcido compuesto sobre un fondo opaco.
function over(value: string, background: Rgb): Rgb {
  const { rgb, alpha } = parseColor(value);
  const mix = (i: 0 | 1 | 2) => alpha * rgb[i] + (1 - alpha) * background[i];
  return [mix(0), mix(1), mix(2)];
}

describe("contraste de los temas", () => {
  it.each(THEME_IDS)("tema %s: el texto y los colores de estado superan 4,5:1 sobre el panel", (id) => {
    const vars = variables(THEME_BLOCKS.get(id)!.body);
    const panel = parseColor(vars.get("--panel-bg")!).rgb;
    for (const name of ["--text", "--text-h", "--text-muted", "--success", "--warning", "--error", "--synthesis"]) {
      expect(contrast(parseColor(vars.get(name)!).rgb, panel), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(THEME_IDS)("tema %s: las etiquetas de estado superan 4,5:1 sobre su fondo tintado", (id) => {
    const vars = variables(THEME_BLOCKS.get(id)!.body);
    const bg = parseColor(vars.get("--bg")!).rgb;
    for (const name of ["--success", "--warning", "--error", "--synthesis"]) {
      const tinted = over(vars.get(`${name}-bg`)!, bg);
      expect(contrast(parseColor(vars.get(name)!).rgb, tinted), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Paleta suave (4.3 y 10): sobre el panel de los temas oscuros, los
  // colores de red superan 3:1. El tema Original, con «Suaves», usa la
  // columna de Grafito sobre su propio panel. En Claro no se exige: ahí los
  // nodos cuentan con el anillo neutro (principio 6).
  it.each([
    ["grafito", "grafito"],
    ["noche", "noche"],
    ["original", "grafito"],
  ] as const)("tema %s: los colores de red suaves (columna %s) superan 3:1 sobre el panel", (id, column) => {
    const panel = parseColor(variables(THEME_BLOCKS.get(id)!.body).get("--panel-bg")!).rgb;
    for (const [key, color] of Object.entries(SOFT_NETWORK_COLORS[column])) {
      expect(contrast(parseColor(color).rgb, panel), key).toBeGreaterThanOrEqual(3);
    }
  });
});

// Color de marca (spec 5.9): un azul como el de la selección de texto. La
// pastilla de la etiqueta y el anillo del nodo superan 3:1 sobre el fondo
// de los cuatro temas, y el texto de la pastilla 4,5:1 sobre ella. Los
// dibujos (SVG y 3D) toman los mismos colores de DRAW_TOKENS.
describe("color de marca", () => {
  it.each(THEME_IDS)("tema %s: la pastilla y el anillo superan 3:1 sobre el fondo y el panel, y su texto 4,5:1", (id) => {
    const vars = variables(THEME_BLOCKS.get(id)!.body);
    const mark = parseColor(vars.get("--mark")!).rgb;
    for (const name of ["--bg", "--panel-bg"]) {
      expect(contrast(mark, parseColor(vars.get(name)!).rgb), name).toBeGreaterThanOrEqual(3);
    }
    expect(contrast(parseColor(vars.get("--mark-text")!).rgb, mark)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(THEME_IDS)("tema %s: los dibujos usan los mismos colores, y superan 3:1 sobre el fondo de cada dibujo", (id) => {
    const vars = variables(THEME_BLOCKS.get(id)!.body);
    const { mark, markText, sceneBg, hemiFill } = DRAW_TOKENS[id];
    expect(mark).toBe(vars.get("--mark"));
    expect(markText).toBe(vars.get("--mark-text"));
    // El connectograma y el 3D se dibujan sobre el panel (sceneBg), y los
    // nodos de los hemisferios, dentro de sus elipses (hemiFill, o el panel
    // si no tienen relleno).
    for (const background of [sceneBg, hemiFill].filter((color) => color !== "none")) {
      expect(contrast(parseColor(mark).rgb, parseColor(background).rgb), background).toBeGreaterThanOrEqual(3);
    }
  });

  // El hueco entre el nodo y su anillo es del color del fondo del dibujo: en
  // el connectograma, sceneBg, que tiene que ser el --panel-bg del <svg>.
  it.each(THEME_IDS)("tema %s: el fondo de la escena es el del panel", (id) => {
    expect(DRAW_TOKENS[id].sceneBg).toBe(variables(THEME_BLOCKS.get(id)!.body).get("--panel-bg"));
  });
});

// Etiquetas del cerebro 3D (spec 6.3; fase 4 del rediseño): el texto del
// tema sobre el fondo de la escena, translúcido. Detrás puede quedar
// cualquier cosa (la corteza, una red, el fondo): el texto se lee con al
// menos 4,5:1 con el fondo compuesto sobre negro y sobre blanco, los dos
// extremos.
describe("etiquetas del cerebro 3D", () => {
  it.each(THEME_IDS)("tema %s: el texto del tema sobre el fondo de la escena translúcido, legible con cualquier cosa detrás", (id) => {
    const vars = variables(THEME_BLOCKS.get(id)!.body);
    const { label3dText, label3dBackground, sceneBg } = DRAW_TOKENS[id];
    expect(label3dText).toBe(vars.get("--text"));
    const background = parseColor(label3dBackground);
    expect(background.rgb).toEqual(parseColor(sceneBg).rgb);
    expect(background.alpha).toBeGreaterThanOrEqual(0.8);
    expect(background.alpha).toBeLessThan(1);
    for (const behind of [
      [0, 0, 0],
      [255, 255, 255],
    ] as const) {
      expect(contrast(parseColor(label3dText).rgb, over(label3dBackground, behind)), `detrás ${behind}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
