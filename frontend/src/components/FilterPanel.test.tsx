import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GraphNode } from "../types/domain";
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

  it("el deslizador dice el peso mínimo con palabras", () => {
    expect(html).toContain('aria-valuetext="0 (sin filtro, se muestra todo)"');
  });
});
