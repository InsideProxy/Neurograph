import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GraphNode } from "../types/domain";
import { MarksLine, MarksLineView } from "./MarksLine";

// MarksLine con los stores (la última prueba): con renderToStaticMarkup,
// zustand da el estado inicial de cada store, así que aquí V1 (izq.) y FEF
// (der.) están marcadas y la red Por defecto, la de FEF, está oculta en los
// filtros. MarksLineView no usa los stores.
vi.mock("../state/marks", async () => {
  const { create } = await import("zustand");
  return {
    useMarksStore: create(() => ({ markedIds: new Set(["l_v1", "r_fef"]), toggleMark: () => {}, clearMarks: () => {} })),
  };
});
vi.mock("../state/filters", async () => {
  const { create } = await import("zustand");
  return { useFiltersStore: create(() => ({ hiddenNetworks: new Set(["cole-anticevic.default"]) })) };
});

const noop = () => {};
const FIVE = {
  count: 5,
  names: ["TE1m (izq.)", "IFJa (der.)", "V1 (izq.)"],
  allNames: ["TE1m (izq.)", "IFJa (der.)", "V1 (izq.)", "V1 (der.)", "FEF (der.)"],
  hidden: 1,
};
const NONE = { count: 0, names: [], allNames: [], hidden: 0 };

const line = (summary: typeof FIVE) => renderToStaticMarkup(<MarksLineView summary={summary} onClear={noop} />);

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

// El <button> del árbol de elementos que devuelve MarksLineView, que no usa
// hooks y se puede llamar como una función: así se pulsa sin DOM.
function findButton(node: ReactNode): ReactElement<{ onClick: () => void }> | null {
  if (!isValidElement<{ children?: ReactNode }>(node)) return null;
  if (node.type === "button") return node as ReactElement<{ onClick: () => void }>;
  for (const child of Children.toArray(node.props.children)) {
    const found = findButton(child);
    if (found) return found;
  }
  return null;
}

function region(id: string, abbreviation: string, hemisphere: "L" | "R", network: string): GraphNode {
  return { id, label: `Area ${abbreviation}`, abbreviation, hemisphere, network, position3d: [0, 0, 0], referenceSpace: null };
}

describe("MarksLine", () => {
  it("con marcas: cuántas, las primeras por su nombre y cuántas más, las ocultas en su propia línea y «Quitar marcas»", () => {
    const html = line(FIVE);
    expect(html).toContain(">Marcadas: 5</span>");
    expect(html).toContain(
      '<p class="filters__marks-detail" title="TE1m (izq.), IFJa (der.), V1 (izq.), V1 (der.) y FEF (der.)">' +
        '<span class="filters__marks-text">TE1m (izq.), IFJa (der.), V1 (izq.) y 2 más</span>' +
        '<span class="filters__marks-hidden">1 oculta por los filtros</span></p>',
    );
    expect(html).toContain(
      '<button type="button" class="filters__text-btn filters__text-btn--strong" title="Quita las marcas de todas las regiones (se puede deshacer)">Quitar marcas</button>',
    );
    expect(html).not.toContain("aria-disabled");
    expect(maxButtonDepth(html)).toBe(1);
  });

  it("si los filtros no ocultan ninguna, solo van los nombres", () => {
    const html = line({ ...FIVE, hidden: 0 });
    expect(html).toContain('<span class="filters__marks-text">TE1m (izq.), IFJa (der.), V1 (izq.) y 2 más</span></p>');
    expect(html).not.toContain("filters__marks-hidden");
  });

  // Contextual (decisión del usuario, 25/09/2026): sin marcas no se dibuja
  // nada, ni el rótulo ni el botón, para aprovechar el espacio. Solo queda
  // montada la región viva, para poder anunciar que ya no hay ninguna.
  it("sin marcas no se dibuja nada, salvo la región viva que lo anuncia", () => {
    const html = line(NONE);
    expect(html).toBe('<span class="visually-hidden" role="status">Ninguna región marcada</span>');
  });

  it("«Quitar marcas» llama a onClear", () => {
    const onClear = vi.fn();
    const button = findButton(MarksLineView({ summary: FIVE, onClear }));
    expect(button).not.toBeNull();
    button?.props.onClick();
    expect(onClear.mock.calls.length).toBe(1);
  });

  it("sin marcas no hay botón que pulsar", () => {
    expect(findButton(MarksLineView({ summary: NONE, onClear: noop }))).toBeNull();
  });

  // Las marcas cambian con un clic en las vistas o con Ctrl+Intro en el
  // buscador: la región viva lo anuncia, como la del aviso con «Deshacer».
  // Mostrar u ocultar una red no cambia las marcas: no se vuelve a anunciar.
  it("la región viva oculta anuncia cuántas y cuáles, sin el botón, y no cambia con las que ocultan los filtros", () => {
    const status = (summary: typeof FIVE) => line(summary).match(/<span class="visually-hidden" role="status">(.*?)<\/span>/)?.[1];
    expect(status(FIVE)).toBe("5 regiones marcadas: TE1m (izq.), IFJa (der.), V1 (izq.) y 2 más");
    expect(status({ ...FIVE, hidden: 0 })).toBe(status(FIVE));
    expect(status({ ...FIVE, hidden: 3 })).toBe(status(FIVE));
    expect(status({ count: 1, names: ["V1 (izq.)"], allNames: ["V1 (izq.)"], hidden: 0 })).toBe("1 región marcada: V1 (izq.)");
    expect(status(NONE)).toBe("Ninguna región marcada");
  });

  it("con los stores: cuenta las marcadas que están cargadas y cuántas de ellas ocultan los filtros", () => {
    const nodes = [
      region("l_v1", "V1", "L", "cole-anticevic.visual"),
      region("r_ifja", "IFJa", "R", "cole-anticevic.visual"),
      region("r_fef", "FEF", "R", "cole-anticevic.default"),
    ];
    const html = renderToStaticMarkup(<MarksLine nodes={nodes} />);
    expect(html).toContain(">Marcadas: 2</span>");
    expect(html).toContain(
      '<span class="filters__marks-text">V1 (izq.) y FEF (der.)</span><span class="filters__marks-hidden">1 oculta por los filtros</span>',
    );
  });
});
