import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GraphNode } from "../types/domain";
import { NETWORK_COLORS } from "../theme/networks";
import { SOFT_NETWORK_COLORS } from "../theme/softPalettes";
import { FilterPanel } from "./FilterPanel";

const NODES: GraphNode[] = [
  { id: "a", label: "A", abbreviation: "A", hemisphere: "L", network: "cole-anticevic.visual", position3d: [0, 0, 0], referenceSpace: null },
  { id: "b", label: "B", abbreviation: "B", hemisphere: "R", network: "cole-anticevic.default", position3d: [0, 0, 0], referenceSpace: null },
];

// Profundidad máxima de <button> anidados: un botón dentro de otro no es HTML válido.
function maxButtonDepth(html: string): number {
  let depth = 0;
  let max = 0;
  for (const match of html.matchAll(/<(\/?)button\b/g)) {
    depth += match[1] ? -1 : 1;
    max = Math.max(max, depth);
  }
  return max;
}

describe("FilterPanel", () => {
  const html = renderToStaticMarkup(
    <FilterPanel
      nodes={NODES}
      connectionCountsByType={{ structural: 3, functional: 0, effective: 1 }}
      connectionTotals={{ visible: 4, loaded: 9 }}
    />,
  );

  it("cada sección se pliega con un botón aria-expanded que controla su cuerpo, y empieza abierta", () => {
    const toggles = [
      ...html.matchAll(/<button type="button" class="filters__disclosure" aria-expanded="true" aria-controls="([^"]+)"/g),
    ];
    expect(toggles).toHaveLength(3);
    for (const [, id] of toggles) expect(html).toContain(`id="${id}"`);
    expect(html).not.toContain('hidden=""');
  });

  it("«Todas» y «Ninguna» son botones aparte, fuera del de la sección", () => {
    expect(maxButtonDepth(html)).toBe(1);
    expect(html).toContain(">Todas</button>");
    expect(html).toContain(">Ninguna</button>");
  });

  it("«Todas», «Ninguna» y la ayuda de ◎ y + conservan los textos del desarrollador principal (D11)", () => {
    expect(html).toContain('title="Marcar todas las redes">Todas</button>');
    expect(html).toContain('title="Desmarcar todas las redes">Ninguna</button>');
    expect(html).toContain("<p>◎ resalta solo esa red · + la añade a lo ya resaltado.</p>");
  });

  it("lleva las anclas del tour guiado (D11): la selección, la sección de redes, cada red con su clave y el peso mínimo", () => {
    expect(html).toContain('<div class="filters__selection" data-tour="seleccion">');
    expect(html).toMatch(/<div class="filters__section" role="group" aria-labelledby="[^"]+-networks" data-tour="redes">/);
    expect(html).toContain('<li class="filters__network" data-tour="red" data-network="cole-anticevic.visual">');
    expect(html).toContain('<li class="filters__network" data-tour="red" data-network="cole-anticevic.default">');
    expect(html).toMatch(/<div class="filters__section" role="group" aria-labelledby="[^"]+-weight" data-tour="peso">/);
  });

  it("◎ y + dicen qué hacen, en su nombre y en su etiqueta emergente", () => {
    expect(html).toContain(
      'aria-label="Resaltar solo la red Visual (sustituye la selección)" title="Resaltar solo la red Visual (sustituye la selección)"',
    );
    expect(html).toContain('aria-label="Añadir la red Visual a la selección"');
  });

  it("cada red dice cuántas regiones tiene, y la cabecera cuántas redes hay, también con su unidad para los lectores de pantalla", () => {
    expect(html.match(/<span class="filters__count" aria-hidden="true">1<\/span>/g)).toHaveLength(3);
    expect(html.match(/<span class="visually-hidden">, 1 región<\/span>/g)).toHaveLength(2);
    expect(html).toContain('<span class="visually-hidden">, 2 redes</span>');
  });

  it("da el recuento de cada tipo, con su unidad, y cuántas conexiones pasan los filtros", () => {
    expect(html).toContain('<span class="filters__count" aria-hidden="true">3</span><span class="visually-hidden">, 3 conexiones</span>');
    expect(html).toContain('<span class="visually-hidden">, 1 conexión</span>');
    expect(html).toContain("4 de 9 conexiones pasan los filtros");
  });

  it("para los lectores de pantalla, el recuento va con los dígitos seguidos, sin el espacio de los miles", () => {
    const large = renderToStaticMarkup(
      <FilterPanel
        nodes={NODES}
        connectionCountsByType={{ structural: 64620, functional: 0, effective: 0 }}
        connectionTotals={{ visible: 64620, loaded: 64620 }}
      />,
    );
    expect(large).toContain('<span class="visually-hidden">, 64620 conexiones</span>');
  });

  it("el deslizador dice el peso mínimo con palabras", () => {
    expect(html).toContain('aria-valuetext="0 (sin filtro, se muestra todo)"');
  });

  // Marcas de regiones (spec 5.9). Con renderToStaticMarkup, el store de
  // marcas da su estado inicial: ninguna. Contextual (decisión del usuario,
  // 25/09/2026): sin marcas no se dibuja la línea, solo su región viva.
  it("sin marcas no se dibuja la línea, pero su región viva sigue entre la selección y las redes, y la ayuda explica cómo marcar", () => {
    const selection = html.indexOf('class="filters__selection"');
    const marksLive = html.indexOf("Ninguna región marcada");
    expect(selection).toBeGreaterThan(-1);
    expect(html).not.toContain('class="filters__marks"');
    expect(marksLive).toBeGreaterThan(selection);
    expect(marksLive).toBeLessThan(html.indexOf('class="filters__section"'));
    expect(html).toContain(
      "<p>Ctrl+clic (⌘+clic en macOS) en una región, o Ctrl+Intro (⌘+Intro) en el buscador, la marca o la desmarca:",
    );
  });
});

// Paleta suave (fase 2 del rediseño). En node no hay almacenamiento: el store
// empieza en Grafito sin paleta elegida, y la automática es «Suaves».
describe("FilterPanel: muestras de color", () => {
  const counts = {
    connectionCountsByType: { structural: 0, functional: 0, effective: 0 },
    connectionTotals: { visible: 0, loaded: 0 },
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("siguen la paleta automática", () => {
    const html = renderToStaticMarkup(<FilterPanel nodes={NODES} {...counts} />);
    const visual = SOFT_NETWORK_COLORS.grafito["cole-anticevic.visual"];
    expect(html).toMatch(new RegExp(`class="filters__swatch"[^>]*style="background-color:${visual}"`));
    expect(html).not.toContain(NETWORK_COLORS["cole-anticevic.visual"]);
  });

  // El store lee la elección guardada al crearse. vi.resetModules lo vuelve
  // a crear, ahora con un localStorage simulado que guarda «Originales del
  // atlas». Si useDrawColors no leyera el modo guardado, la muestra seguiría
  // siendo la suave.
  it("siguen la paleta guardada", async () => {
    vi.resetModules();
    const saved = JSON.stringify({ theme: "grafito", paletteMode: "original" });
    vi.stubGlobal("window", { localStorage: { getItem: () => saved, setItem: () => {} } });
    const server = await import("react-dom/server");
    const { FilterPanel: StoredFilterPanel } = await import("./FilterPanel");
    const html = server.renderToStaticMarkup(<StoredFilterPanel nodes={NODES} {...counts} />);
    expect(html).toMatch(
      new RegExp(`class="filters__swatch"[^>]*style="background-color:${NETWORK_COLORS["cole-anticevic.visual"]}"`),
    );
  });
});
