import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MarksLineView } from "./MarksLine";

const noop = () => {};
const HINT = "Ctrl+clic en una región para marcarla";
const FIVE = {
  count: 5,
  names: ["TE1m (izq.)", "IFJa (der.)", "V1 (izq.)"],
  allNames: ["TE1m (izq.)", "IFJa (der.)", "V1 (izq.)", "V1 (der.)", "FEF (der.)"],
  hidden: 1,
};
const NONE = { count: 0, names: [], allNames: [], hidden: 0 };

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

describe("MarksLine", () => {
  it("con marcas: cuántas, las primeras por su nombre y cuántas más, las ocultas y «Quitar marcas»", () => {
    const html = renderToStaticMarkup(<MarksLineView summary={FIVE} gestureHint={HINT} onClear={noop} />);
    expect(html).toContain(">Marcadas: 5</span>");
    expect(html).toContain(
      'title="TE1m (izq.), IFJa (der.), V1 (izq.), V1 (der.) y FEF (der.)">TE1m (izq.), IFJa (der.), V1 (izq.) y 2 más · 1 oculta por los filtros</p>',
    );
    expect(html).not.toContain(HINT);
    expect(html).toMatch(/<button type="button" class="[^"]*" aria-disabled="false"[^>]*>Quitar marcas<\/button>/);
    expect(maxButtonDepth(html)).toBe(1);
  });

  it("sin marcas lo dice y explica el gesto; «Quitar marcas» queda desactivado sin perder la posibilidad de tener el foco", () => {
    const html = renderToStaticMarkup(<MarksLineView summary={NONE} gestureHint={HINT} onClear={noop} />);
    expect(html).toContain(">Ninguna región marcada</span>");
    expect(html).toContain(`>${HINT}</p>`);
    expect(html).toMatch(/<button type="button" class="[^"]*" aria-disabled="true"[^>]*>Quitar marcas<\/button>/);
    expect(html).not.toContain('disabled=""');
  });

  // Las marcas cambian con un clic en las vistas o con Ctrl+Intro en el
  // buscador: la región viva lo anuncia, como la del aviso con «Deshacer».
  it("lo que cambia se anuncia en una región viva oculta, sin el botón", () => {
    const status = (summary: typeof FIVE) =>
      renderToStaticMarkup(<MarksLineView summary={summary} gestureHint={HINT} onClear={noop} />).match(
        /<span class="visually-hidden" role="status">(.*?)<\/span>/,
      )?.[1];
    expect(status(FIVE)).toBe("5 regiones marcadas: TE1m (izq.), IFJa (der.), V1 (izq.) y 2 más; 1 oculta por los filtros");
    expect(status({ count: 1, names: ["V1 (izq.)"], allNames: ["V1 (izq.)"], hidden: 0 })).toBe("1 región marcada: V1 (izq.)");
    expect(status(NONE)).toBe("Ninguna región marcada");
  });
});
