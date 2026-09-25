import { describe, expect, it } from "vitest";
import { NETWORK_COLORS } from "./networks";
import { SOFT_NETWORK_COLORS, SOFT_PALETTE_THEMES, type SoftPaletteTheme } from "./softPalettes";

// La tabla generada por scripts/generate_soft_palettes.py cumple el método
// de docs/rediseno-interfaz-diseno.md, 4.3 (pruebas de la sección 10). Mismo
// OKLab que el script. El contraste con el panel está en themeCss.test.ts,
// que lee el panel de index.css.

type Lab = readonly [number, number, number];

function oklab(hex: string): Lab {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [channel(0), channel(1), channel(2)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const lightness = (hex: string) => oklab(hex)[0];
const chroma = (hex: string) => Math.hypot(oklab(hex)[1], oklab(hex)[2]);
const hue = (hex: string) => (Math.atan2(oklab(hex)[2], oklab(hex)[1]) * 180) / Math.PI;
const deltaE = (first: string, second: string) => {
  const [a, b] = [oklab(first), oklab(second)];
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
};

const BANDS: Readonly<Record<SoftPaletteTheme, readonly [number, number]>> = {
  grafito: [0.6, 0.9],
  noche: [0.6, 0.9],
  claro: [0.46, 0.76],
};
const BAND_MARGIN = 0.06;
const L_TOLERANCE = 0.005; // el redondeo a #rrggbb mueve algo la L
const ACHROMATIC = 0.02;
// Acromáticos: los originales grises, que no tienen tono. Casi grises: los
// suaves por debajo de este croma, donde el redondeo a #rrggbb ya mueve el
// tono más de 3°.
const HUE_CHROMA_FLOOR = 0.04;

// Grupos del método: una clasificación por prefijo, más las claves de
// demostración, que no llevan prefijo. «Sin clasificar» va aparte.
function groups(): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const key of Object.keys(NETWORK_COLORS)) {
    if (key === "unclassified") continue;
    const group = key.includes(".") ? key.slice(0, key.indexOf(".")) : "demostración";
    result.set(group, [...(result.get(group) ?? []), key]);
  }
  return result;
}

describe("SOFT_NETWORK_COLORS", () => {
  it.each(SOFT_PALETTE_THEMES)("tema %s: un #rrggbb por cada clave de NETWORK_COLORS, y ninguna más", (theme) => {
    const table = SOFT_NETWORK_COLORS[theme];
    expect(Object.keys(table).sort()).toEqual(Object.keys(NETWORK_COLORS).sort());
    for (const [key, color] of Object.entries(table)) expect(color, key).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(SOFT_PALETTE_THEMES)("tema %s: cada red conserva su tono (±3°), salvo las casi grises", (theme) => {
    for (const [key, original] of Object.entries(NETWORK_COLORS)) {
      const soft = SOFT_NETWORK_COLORS[theme][key];
      if (chroma(original) < ACHROMATIC || chroma(soft) < HUE_CHROMA_FLOOR) continue;
      const drift = ((hue(soft) - hue(original) + 540) % 360) - 180;
      expect(Math.abs(drift), `${key}: ${original} -> ${soft}`).toBeLessThanOrEqual(3);
    }
  });

  it.each(SOFT_PALETTE_THEMES)("tema %s: la luminosidad queda en la banda del tema ±0,06", (theme) => {
    const [lo, hi] = BANDS[theme];
    for (const [key, color] of Object.entries(SOFT_NETWORK_COLORS[theme])) {
      expect(lightness(color), key).toBeGreaterThanOrEqual(lo - BAND_MARGIN - L_TOLERANCE);
      expect(lightness(color), key).toBeLessThanOrEqual(hi + BAND_MARGIN + L_TOLERANCE);
    }
  });

  it.each(SOFT_PALETTE_THEMES)("tema %s: dos redes del mismo grupo distan al menos ΔE_OK 0,085", (theme) => {
    const table = SOFT_NETWORK_COLORS[theme];
    for (const [group, keys] of groups()) {
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          const pair = `${group}: ${keys[i]} y ${keys[j]}`;
          expect(deltaE(table[keys[i]], table[keys[j]]), pair).toBeGreaterThanOrEqual(0.085);
        }
      }
    }
  });

  it("«sin clasificar» es un gris a la mitad de la banda menos 0,02", () => {
    expect([SOFT_NETWORK_COLORS.grafito.unclassified, SOFT_NETWORK_COLORS.noche.unclassified]).toEqual([
      "#a8a8a8",
      "#a8a8a8",
    ]);
    expect(SOFT_NETWORK_COLORS.claro.unclassified).toBe("#7d7d7d");
  });

  // La tabla de 4.3, que es la de la maqueta aprobada.
  it("Cole-Anticevic da los colores de la tabla del spec", () => {
    const expected: Record<string, readonly [string, string, string]> = {
      "cole-anticevic.visual": ["#4f74c4", "#4d76cf", "#294c9f"],
      "cole-anticevic.visual2": ["#8a85de", "#8780e3", "#5f56b2"],
      "cole-anticevic.somatomotor": ["#4cedec", "#19efef", "#00bdbd"],
      "cole-anticevic.cingulo-opercular": ["#ae66ac", "#b362b0", "#853a83"],
      "cole-anticevic.dorsal-attention": ["#98e191", "#91e38a", "#67b461"],
      "cole-anticevic.language": ["#35b3b3", "#35b3b3", "#008686"],
      "cole-anticevic.frontoparietal": ["#e3e67b", "#e4e66c", "#b7b840"],
      "cole-anticevic.auditory": ["#db90d8", "#df8cdd", "#b062ae"],
      "cole-anticevic.default": ["#eb8475", "#f27f6f", "#c05548"],
      "cole-anticevic.posterior-multimodal": ["#cc7242", "#cc7242", "#9e4812"],
      "cole-anticevic.ventral-multimodal": ["#f2a958", "#f8a647", "#c77b11"],
      "cole-anticevic.orbito-affective": ["#6a9e49", "#66a03d", "#3f750d"],
    };
    for (const [key, columns] of Object.entries(expected)) {
      const actual = SOFT_PALETTE_THEMES.map((theme) => SOFT_NETWORK_COLORS[theme][key]);
      expect(actual, key).toEqual(columns);
    }
  });
});
