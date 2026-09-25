import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PaletteMode } from "../theme/colors";
import { NETWORK_COLORS } from "../theme/networks";
import { SOFT_NETWORK_COLORS } from "../theme/softPalettes";
import type { ThemeId } from "../theme/themes";
import { SettingsChoices } from "./SettingsMenu";

const noop = () => {};

function render(theme: ThemeId, paletteMode: PaletteMode | null): string {
  return renderToStaticMarkup(
    <SettingsChoices theme={theme} paletteMode={paletteMode} onTheme={noop} onPaletteMode={noop} />,
  );
}

// Los radios de «Colores de las redes», con sus atributos, sin depender del
// orden en que React los escribe.
function radios(html: string): Record<string, string>[] {
  return [...html.matchAll(/<input type="radio"[^>]*>/g)].map((m) =>
    Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])),
  );
}

const checkedOption = (html: string) => radios(html).find((radio) => "checked" in radio)?.value;

// Colores de los cinco puntos de cada tarjeta de tema, en orden.
function cardDots(html: string): string[][] {
  return html
    .split('<button type="button" class="settings__theme"')
    .slice(1)
    .map((card) => [...card.matchAll(/class="settings__preview-dot" style="background:(#[0-9a-f]{6})"/g)].map((m) => m[1]));
}

// La muestra de la paleta: su marcado y sus colores, en orden.
function sampleBlock(html: string): string {
  return html.slice(html.indexOf('class="settings__palette-sample"'), html.indexOf('class="settings__note"'));
}
const sample = (html: string) => [...sampleBlock(html).matchAll(/style="background:(#[0-9a-f]{6})"/g)].map((m) => m[1]);

const PREVIEW = [
  "cole-anticevic.visual",
  "cole-anticevic.default",
  "cole-anticevic.frontoparietal",
  "cole-anticevic.dorsal-attention",
  "cole-anticevic.auditory",
];
const COLE = Object.keys(NETWORK_COLORS).filter((key) => key.startsWith("cole-anticevic."));

describe("Ajustes: «Colores de las redes»", () => {
  it("es un radiogroup con nombre y nota, con tres radios del mismo name", () => {
    const html = render("grafito", null);
    const group =
      /<p class="settings__label" id="([^"]+)">Colores de las redes<\/p><div class="settings__palette" role="radiogroup" aria-labelledby="\1" aria-describedby="([^"]+)">/.exec(
        html,
      );
    expect(group).not.toBeNull();
    expect(html).toContain(
      `<p class="settings__note" id="${group![2]}">Los originales son los del archivo de cada atlas: úsalos si una figura tiene que coincidir con la del artículo.</p>`,
    );
    const options = radios(html);
    expect(options.map((radio) => radio.value)).toEqual(["auto", "suave", "original"]);
    expect(new Set(options.map((radio) => radio.name)).size).toBe(1);
    expect(html).toMatch(/value="auto"[^>]*\/>Automática<\/label>/);
    expect(html).toMatch(/value="suave"[^>]*\/>Suaves<\/label>/);
    expect(html).toMatch(/value="original"[^>]*\/>Originales del atlas<\/label>/);
  });

  it("«Automática» lleva su explicación", () => {
    const html = render("grafito", null);
    const auto = radios(html).find((radio) => radio.value === "auto");
    expect(html).toContain(
      `<p class="settings__hint" id="${auto?.["aria-describedby"]}">Automática: suaves en los temas nuevos; originales en Original.</p>`,
    );
  });

  it("sin elección, marca «Automática» en cualquier tema", () => {
    expect(checkedOption(render("grafito", null))).toBe("auto");
    expect(checkedOption(render("original", null))).toBe("auto");
  });

  it("marca la elección guardada", () => {
    expect(checkedOption(render("original", "suave"))).toBe("suave");
    expect(checkedOption(render("noche", "original"))).toBe("original");
  });

  it("la muestra enseña las doce redes de Cole-Anticevic con la paleta que se aplica", () => {
    expect(sample(render("noche", null))).toEqual(COLE.map((key) => SOFT_NETWORK_COLORS.noche[key]));
    expect(sample(render("original", null))).toEqual(COLE.map((key) => NETWORK_COLORS[key]));
    expect(sample(render("noche", "original"))).toEqual(COLE.map((key) => NETWORK_COLORS[key]));
    expect(sample(render("original", "suave"))).toEqual(COLE.map((key) => SOFT_NETWORK_COLORS.grafito[key]));
  });

  it("la muestra es decorativa y no tiene etiquetas emergentes, que el teclado no alcanza", () => {
    const block = sampleBlock(render("grafito", null));
    expect(block).toContain('aria-hidden="true"');
    expect(block).not.toContain("title=");
  });
});

describe("Ajustes: vista previa de cada tema", () => {
  it("con «Automática», cada tarjeta muestra la paleta automática de su tema", () => {
    expect(cardDots(render("grafito", null))).toEqual([
      PREVIEW.map((key) => NETWORK_COLORS[key]),
      PREVIEW.map((key) => SOFT_NETWORK_COLORS.grafito[key]),
      PREVIEW.map((key) => SOFT_NETWORK_COLORS.noche[key]),
      PREVIEW.map((key) => SOFT_NETWORK_COLORS.claro[key]),
    ]);
  });

  it("con «Suaves» elegida, Original enseña la columna de Grafito", () => {
    expect(cardDots(render("claro", "suave"))[0]).toEqual(PREVIEW.map((key) => SOFT_NETWORK_COLORS.grafito[key]));
  });

  it("con «Originales del atlas» elegida, todas las tarjetas enseñan los originales", () => {
    for (const dots of cardDots(render("noche", "original"))) {
      expect(dots).toEqual(PREVIEW.map((key) => NETWORK_COLORS[key]));
    }
  });
});
