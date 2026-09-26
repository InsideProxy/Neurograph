import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GraphNode } from "../types/domain";
import { DRAW_TOKENS } from "../theme/themes";
import { Connectogram } from "./Connectogram";
import { Hemisferios } from "./Hemisferios";

// Marcas de regiones (docs/rediseno-interfaz-diseno.md, 5.9) en el
// connectograma y los hemisferios. Con renderToStaticMarkup, zustand da el
// estado inicial de cada store, así que aquí el store de marcas empieza con
// IFJa (der.) marcada. El tema es el de por defecto, Grafito.
vi.mock("../state/marks", async () => {
  const { create } = await import("zustand");
  return {
    useMarksStore: create(() => ({ markedIds: new Set(["r_ifja"]), toggleMark: () => {}, clearMarks: () => {} })),
  };
});

function region(id: string, abbreviation: string, hemisphere: "L" | "R", x: number, y: number): GraphNode {
  return {
    id,
    label: `Area ${abbreviation}`,
    abbreviation,
    hemisphere,
    network: "cole-anticevic.visual",
    position3d: [x, y, 0],
    referenceSpace: null,
  };
}

const NODES = [region("l_v1", "V1", "L", -1, 0), region("r_ifja", "IFJa", "R", 1, 1), region("r_fef", "FEF", "R", 2, -1)];
const { mark, markText, sceneBg, hemiFill } = DRAW_TOKENS.grafito;

// Lo que va dentro de los grupos de marca (data-ng-mark), que la exportación
// quita del clon, y lo que queda fuera.
function split(html: string) {
  const marks = [...html.matchAll(/<g data-ng-mark="" style="pointer-events:none">(.*?)<\/g>(?=<g>|<g data-ng-mark|<\/svg>)/g)];
  let rest = html;
  for (const [whole] of marks) rest = rest.replace(whole, "");
  return { marks: marks.map((m) => m[1]), rest };
}

describe.each([
  ["connectograma", () => renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} />), sceneBg],
  ["hemisferios", () => renderToStaticMarkup(<Hemisferios nodes={NODES} connections={[]} />), hemiFill],
])("marcas en %s", (_view, render, gapColor) => {
  const html = render();
  const { marks, rest } = split(html);

  it("la región marcada lleva un hueco del color del fondo bajo los nodos, y encima un anillo y su etiqueta sobre una pastilla", () => {
    expect(marks).toHaveLength(2);
    const [under, over] = marks;
    expect(under.match(/<circle /g)).toHaveLength(1);
    expect(under).toContain(`fill="${gapColor}"`);
    expect(over).toMatch(new RegExp(`<circle [^>]*fill="none" stroke="${mark}" stroke-width="[\\d.]+"`));
    expect(over).toMatch(new RegExp(`<rect [^>]*fill="${mark}"></rect><text [^>]*fill="${markText}">IFJa</text>`));
    expect(over).not.toContain(">V1<");
    expect(over).not.toContain(">FEF<");
  });

  it("el hueco va antes de los nodos y el anillo con la pastilla, después", () => {
    const firstNode = html.indexOf('data-ng-fill="net:');
    const lastNode = html.lastIndexOf('data-ng-fill="net:');
    expect(html.indexOf(marks[0])).toBeLessThan(firstNode);
    expect(html.indexOf(marks[1])).toBeGreaterThan(lastNode);
  });

  it("sin las marcas queda el dibujo de siempre, con la etiqueta normal de la región marcada", () => {
    expect(rest).not.toContain(mark);
    expect(rest).toMatch(/fill="[^"]+" data-ng-fill="label"[^>]*>IFJa<\/text>/);
  });
});
