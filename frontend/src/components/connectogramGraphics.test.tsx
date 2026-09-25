import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GraphNode } from "../types/domain";
import { DRAW_TOKENS } from "../theme/themes";
import { HEMISPHERE_ARC_WIDTH, RING_MARGIN, estimatedLabelWidth, ringLayout } from "../logic/connectogramLayout";
import { pillAround } from "../logic/marks";
import { Connectogram } from "./Connectogram";

// Gráficos del connectograma de la fase 4 del rediseño
// (docs/rediseno-interfaz-diseno.md, 6.1 y 5.4), en el marcado. Con
// renderToStaticMarkup, zustand da el estado inicial de cada store: aquí la
// selección empieza con IFJa (der.), y las marcas con IFJa (der.) y V1
// (izq.). El tema es el de por defecto, Grafito. Sin DOM, el <svg> mide lo de
// partida, 420 px: el centro está en (210, 210).
vi.mock("../state/selection", async () => {
  const { create } = await import("zustand");
  return {
    useSelectionStore: create(() => ({
      selectedNodeIds: new Set(["r_ifja"]),
      selectedConnectionId: null,
      toggleNode: () => {},
      selectNodes: () => {},
      addNodes: () => {},
      clearNodeSelection: () => {},
      selectConnection: () => {},
    })),
  };
});
vi.mock("../state/marks", async () => {
  const { create } = await import("zustand");
  return {
    useMarksStore: create(() => ({ markedIds: new Set(["r_ifja", "l_v1"]), toggleMark: () => {}, clearMarks: () => {} })),
  };
});

function region(id: string, abbreviation: string, hemisphere: "L" | "R" | null): GraphNode {
  return {
    id,
    label: `Area ${abbreviation}`,
    abbreviation,
    hemisphere,
    network: "cole-anticevic.visual",
    position3d: [0, 0, 0],
    referenceSpace: null,
  };
}

// En el orden del círculo: los dos primeros, en la mitad derecha (arriba y
// abajo); los dos últimos, en la izquierda (abajo y arriba). Cada hemisferio,
// un bloque seguido, como en HCP-MMP1.0.
const NODES = [
  region("r_ifja", "IFJa", "R"),
  region("r_fef", "FEF", "R"),
  region("l_v1", "V1", "L"),
  region("l_te1m", "TE1m", "L"),
];
const CENTER = 210;
const TOKENS = DRAW_TOKENS.grafito;

type Attributes = Record<string, string>;

function attributes(text: string): Attributes {
  return Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
}

// Cada nodo del dibujo, con su posición (el translate de su grupo) y los
// atributos de su etiqueta.
function nodeLabels(html: string): Map<string, { x: number; y: number; label: Attributes }> {
  const found = new Map<string, { x: number; y: number; label: Attributes }>();
  const pattern = /<g transform="translate\(([-\d.e]+), ([-\d.e]+)\)"><circle [^>]*><\/circle><\/g><text ([^>]*)>([^<]*)<\/text>/g;
  for (const m of html.matchAll(pattern)) found.set(m[4], { x: Number(m[1]), y: Number(m[2]), label: attributes(m[3]) });
  return found;
}

// La etiqueta de una región marcada: el texto sobre su pastilla, con el color
// de texto de marca.
function markedLabel(html: string, text: string): { rect: Attributes; text: Attributes } | null {
  const m = new RegExp(`<rect ([^>]*)></rect><text ([^>]*fill="${TOKENS.markText}"[^>]*)>${text}</text>`).exec(html);
  return m ? { rect: attributes(m[1]), text: attributes(m[2]) } : null;
}

function rotation(transform: string): { angle: number; x: number; y: number } {
  const m = /^rotate\(([-\d.e]+) ([-\d.e]+) ([-\d.e]+)\)$/.exec(transform);
  if (!m) throw new Error(`transform inesperado: ${transform}`);
  return { angle: Number(m[1]), x: Number(m[2]), y: Number(m[3]) };
}

// Ángulo en grados de 0 a 360.
const normalized = (degrees: number) => ((degrees % 360) + 360) % 360;

describe("etiquetas del connectograma (6.1)", () => {
  const html = renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} />);
  const labels = nodeLabels(html);

  it("hay una etiqueta por nodo, con el color de las abreviaturas", () => {
    expect([...labels.keys()].sort()).toEqual(["FEF", "IFJa", "TE1m", "V1"]);
    for (const { label } of labels.values()) expect(label.fill).toBe(TOKENS.label);
  });

  it("van por fuera del anillo, en la dirección que va del centro al nodo", () => {
    for (const [text, { x, y, label }] of labels) {
      const [lx, ly] = [Number(label.x), Number(label.y)];
      const node = Math.hypot(x - CENTER, y - CENTER);
      expect(Math.hypot(lx - CENTER, ly - CENTER), text).toBeGreaterThan(node);
      // Misma dirección: el producto vectorial de las dos es nulo.
      expect((x - CENTER) * (ly - y) - (y - CENTER) * (lx - x), text).toBeCloseTo(0, 6);
    }
  });

  it("giradas con el ángulo del nodo: en la mitad derecha, alineadas al principio; en la izquierda, 180° más y al final", () => {
    for (const [text, { x, y, label }] of labels) {
      const turn = rotation(label.transform);
      expect([turn.x, turn.y], text).toEqual([Number(label.x), Number(label.y)]);
      const angle = (Math.atan2(y - CENTER, x - CENTER) * 180) / Math.PI;
      const right = x > CENTER;
      expect(label["text-anchor"], text).toBe(right ? "start" : "end");
      expect(normalized(turn.angle), text).toBeCloseTo(normalized(right ? angle : angle + 180), 6);
    }
  });

  it("la pastilla de una región marcada sigue exactamente a su etiqueta, también seleccionada", () => {
    for (const text of ["IFJa", "V1"]) {
      const { label } = labels.get(text)!;
      const marked = markedLabel(html, text);
      expect(marked, text).not.toBeNull();
      for (const name of ["x", "y", "transform", "text-anchor", "font-size", "font-weight"]) {
        expect(marked!.text[name], `${text}: ${name}`).toBe(label[name]);
      }
      expect(marked!.rect.transform, text).toBe(label.transform);
      expect(marked!.rect.fill, text).toBe(TOKENS.mark);
    }
  });
});

// Espacio de las etiquetas (decisión del usuario del 25/09/2026): el anillo
// deja sitio a la etiqueta más larga. Dos regiones, a la derecha y a la
// izquierda del círculo, donde las etiquetas van en horizontal hacia el borde.
// La de la derecha, seleccionada y marcada (ampliada y con su pastilla), lleva
// la abreviatura más ancha de Brainnetome.
describe("espacio de las etiquetas (6.1)", () => {
  const LONG = [region("r_ifja", "R_MVOcC _5_4", "R"), region("l_v1", "V1", "L")];
  const ringOf = (html: string) => {
    const { x, y } = nodeLabels(html).get("V1")!;
    return Math.hypot(x - CENTER, y - CENTER);
  };

  it("el anillo se encoge para que la etiqueta más larga quepa entera, ampliada y con su pastilla", () => {
    const html = renderToStaticMarkup(<Connectogram nodes={LONG} connections={[]} />);
    const { label } = nodeLabels(html).get("R_MVOcC _5_4")!;
    const fontSize = Number(label["font-size"]);
    expect(label["font-weight"]).toBe("700");
    const pill = pillAround({ x: Number(label.x), y: 0, width: estimatedLabelWidth("R_MVOcC _5_4", fontSize), height: 0 }, fontSize);
    expect(pill.x + pill.width).toBeLessThanOrEqual(2 * CENTER + 1e-9);
    expect(ringOf(html)).toBeLessThan(CENTER - RING_MARGIN);
    const expected = ringLayout({ size: 2 * CENTER, labels: LONG.map((node) => node.abbreviation), nodeRadius: 6, fontSize: 9, fitLabels: true });
    expect(ringOf(html)).toBeCloseTo(expected.radius, 6);
  });

  it("con etiquetas cortas, el anillo de siempre", () => {
    const html = renderToStaticMarkup(<Connectogram nodes={[region("r_ifja", "V2", "R"), region("l_v1", "V1", "L")]} connections={[]} />);
    expect(ringOf(html)).toBeCloseTo(CENTER - RING_MARGIN, 6);
  });

  it("en la miniatura, el anillo de siempre", () => {
    const html = renderToStaticMarkup(<Connectogram nodes={LONG} connections={[]} compact />);
    expect(ringOf(html)).toBeCloseTo(CENTER - RING_MARGIN, 6);
  });
});

describe("halo de la región seleccionada (6.1)", () => {
  const html = renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} />);
  const halos = [...html.matchAll(/<circle ([^>]*stroke-opacity="0.35"[^>]*)><\/circle>/g)].map((m) => attributes(m[1]));
  const ifja = nodeLabels(html).get("IFJa")!;
  const node = attributes(/<g transform="translate\([^)]*\)"><circle ([^>]*)><\/circle><\/g><text [^>]*>IFJa</.exec(html)![1]);

  it("solo la región seleccionada lo lleva: un anillo del color de selección al 35 %, que se exporta", () => {
    expect(halos).toHaveLength(1);
    const [halo] = halos;
    expect([Number(halo.cx), Number(halo.cy)]).toEqual([ifja.x, ifja.y]);
    expect(halo.fill).toBe("none");
    expect(halo.stroke).toBe(TOKENS.selected);
    expect(halo["data-ng-stroke"]).toBe("selected");
    expect(halo["data-ng-mark"]).toBeUndefined();
  });

  it("va por fuera del contorno de 2,5 px del nodo; el anillo de su marca, donde estaba y encima, deja ver su borde de fuera", () => {
    const [halo] = halos;
    expect(node["stroke-width"]).toBe("2.5");
    const nodeOuter = Number(node.r) + Number(node["stroke-width"]) / 2;
    expect(Number(halo.r) - Number(halo["stroke-width"]) / 2).toBeGreaterThan(nodeOuter);
    const ring = attributes(new RegExp(`<circle ([^>]*stroke="${TOKENS.mark}"[^>]*)></circle>`).exec(html)![1]);
    expect(Number(ring.cx)).toBe(ifja.x);
    expect(Number(ring.r) - Number(ring["stroke-width"]) / 2).toBeGreaterThan(nodeOuter);
    expect(Number(ring.r) + Number(ring["stroke-width"]) / 2).toBeLessThan(Number(halo.r) + Number(halo["stroke-width"]) / 2);
    expect(html.indexOf(`stroke="${TOKENS.mark}"`)).toBeGreaterThan(html.indexOf('stroke-opacity="0.35"'));
  });
});

describe("arcos de hemisferio (6.1)", () => {
  const arcsOf = (html: string) =>
    [...html.matchAll(/<path d="M ([-\d.]+) ([-\d.]+) A [^"]* ([-\d.]+) ([-\d.]+)" ([^>]*)><\/path>/g)].map((m) => ({
      ends: [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])],
      attrs: attributes(m[5]),
    }));
  const titlesOf = (html: string) =>
    [...html.matchAll(/<text ([^>]*)>(IZQUIERDO|DERECHO)<\/text>/g)].map((m) => ({ text: m[2], attrs: attributes(m[1]) }));

  it("con cada hemisferio en un bloque seguido, dos arcos finos por fuera de las etiquetas, uno a cada lado", () => {
    const html = renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} />);
    const arcs = arcsOf(html);
    expect(arcs).toHaveLength(2);
    // A la distancia del anillo que da ringLayout, con el margen que los
    // incluye: por fuera de las etiquetas en reposo y dentro del dibujo. Una
    // ampliada (seleccionada o con el ratón encima) puede cruzar el arco, que
    // queda debajo.
    const ring = ringLayout({
      size: 2 * CENTER,
      labels: NODES.map((node) => node.abbreviation),
      nodeRadius: 6,
      fontSize: 9,
      fitLabels: true,
      withArcs: true,
    });
    const arcRadius = ring.radius + ring.arcOffset;
    const labels = nodeLabels(html);
    const { x, y } = labels.get("FEF")!;
    expect(Math.hypot(x - CENTER, y - CENTER)).toBeCloseTo(ring.radius, 6);
    for (const [text, { label }] of labels) {
      if (label["font-weight"] === "700") continue;
      const end = Math.hypot(Number(label.x) - CENTER, Number(label.y) - CENTER) + estimatedLabelWidth(text, Number(label["font-size"]));
      expect(end, text).toBeLessThan(arcRadius - HEMISPHERE_ARC_WIDTH / 2);
    }
    expect(arcRadius + HEMISPHERE_ARC_WIDTH / 2).toBeLessThanOrEqual(CENTER);
    for (const arc of arcs) {
      expect([arc.attrs.fill, arc.attrs.stroke, arc.attrs["data-ng-stroke"], arc.attrs["stroke-width"]]).toEqual(["none", TOKENS.edge, "edge", "1.5"]);
      const [x0, y0, x1, y1] = arc.ends;
      expect(Math.hypot(x0 - CENTER, y0 - CENTER)).toBeCloseTo(arcRadius, 1);
      expect(Math.hypot(x1 - CENTER, y1 - CENTER)).toBeCloseTo(arcRadius, 1);
      expect(Math.sign(x0 - CENTER)).toBe(Math.sign(x1 - CENTER));
    }
    expect(arcs.map((arc) => Math.sign(arc.ends[0] - CENTER)).sort()).toEqual([-1, 1]);
  });

  it("rotulados IZQUIERDO y DERECHO en las esquinas de arriba, cada uno del lado de su hemisferio, y se exportan", () => {
    const titles = titlesOf(renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} />));
    const byText = new Map(titles.map((title) => [title.text, title.attrs]));
    expect(titles).toHaveLength(2);
    expect(Number(byText.get("IZQUIERDO")!.x)).toBeLessThan(CENTER);
    expect(byText.get("IZQUIERDO")!["text-anchor"]).toBe("start");
    expect(Number(byText.get("DERECHO")!.x)).toBeGreaterThan(CENTER);
    expect(byText.get("DERECHO")!["text-anchor"]).toBe("end");
    for (const { attrs } of titles) expect([attrs.fill, attrs["data-ng-fill"]]).toEqual([TOKENS.label, "label"]);
  });

  it("en la miniatura, los arcos sin rótulos", () => {
    const html = renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} compact />);
    expect(arcsOf(html)).toHaveLength(2);
    expect(titlesOf(html)).toHaveLength(0);
  });

  it("no se dibujan si los hemisferios alternan, si alguna región no tiene hemisferio o si solo hay uno", () => {
    const alternating = [NODES[0], NODES[2], NODES[1], NODES[3]];
    const withoutSide = [...NODES.slice(0, 3), region("sub_tronco", "BS", null)];
    const oneSide = NODES.slice(0, 2);
    for (const nodes of [alternating, withoutSide, oneSide]) {
      const html = renderToStaticMarkup(<Connectogram nodes={nodes} connections={[]} />);
      expect(arcsOf(html)).toHaveLength(0);
      expect(titlesOf(html)).toHaveLength(0);
    }
  });
});
