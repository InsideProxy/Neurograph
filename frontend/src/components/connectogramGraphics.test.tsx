import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GraphNode } from "../types/domain";
import { DRAW_TOKENS } from "../theme/themes";
import { HEMISPHERE_ARC_WIDTH, RING_MARGIN, estimatedLabelWidth, ringLayout } from "../logic/connectogramLayout";
import { pillAround } from "../logic/marks";
import { Connectogram } from "./Connectogram";
import { ConnectogramLegend } from "./ConnectogramLegend";

// Gráficos del connectograma de la fase 4 del rediseño
// (docs/rediseno-interfaz-diseno.md, 6.1 y 5.4), en el marcado. Con
// renderToStaticMarkup, zustand da el estado inicial de cada store: aquí la
// selección empieza con IFJa (der.), y las marcas con IFJa (der.) y V1
// (izq.). Los filtros no ocultan nada, salvo en las pruebas que ocultan
// redes (filters.hiddenNetworks). El tema es el de por defecto, Grafito. Sin
// DOM, el <svg> mide lo de partida, 420 px: el centro está en (210, 210).
const filters = vi.hoisted(() => ({
  hiddenNetworks: new Set<string>(),
  hiddenConnectionTypes: new Set<string>(),
  minWeight: 0,
}));
vi.mock("../state/filters", () => ({ useFiltersStore: () => filters }));
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

function region(id: string, abbreviation: string, hemisphere: "L" | "R" | null, network = "cole-anticevic.visual"): GraphNode {
  return {
    id,
    label: `Area ${abbreviation}`,
    abbreviation,
    hemisphere,
    network,
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

  // La pastilla acaba justo en el borde, ni antes ni después: así las cuentas
  // que logic/connectogramLayout.ts repite del dibujo (los 7 px hasta la
  // etiqueta, el nodo 3 px mayor y la letra 1,5 px mayor) quedan atadas en
  // los dos sentidos.
  it("el anillo se encoge para que la etiqueta más larga quepa entera, ampliada y con su pastilla", () => {
    const html = renderToStaticMarkup(<Connectogram nodes={LONG} connections={[]} />);
    const { label } = nodeLabels(html).get("R_MVOcC _5_4")!;
    const fontSize = Number(label["font-size"]);
    expect(label["font-weight"]).toBe("700");
    const pill = pillAround({ x: Number(label.x), y: 0, width: estimatedLabelWidth("R_MVOcC _5_4", fontSize), height: 0 }, fontSize);
    expect(pill.x + pill.width).toBeCloseTo(2 * CENTER, 6);
    expect(ringOf(html)).toBeLessThan(CENTER - RING_MARGIN);
    const expected = ringLayout({
      size: 2 * CENTER,
      labels: LONG.map((node) => node.abbreviation),
      nodeRadius: 6,
      fontSize: 9,
      fitLabels: true,
      withArcs: true,
    });
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

// Un radio por atlas (decisión del usuario del 25/09/2026): el anillo reserva
// sitio a las etiquetas de todas las regiones, también las que ocultan los
// filtros, así que el círculo no salta al mostrar u ocultar redes. La
// etiqueta más larga va en la red que se oculta: si el sitio se reservara
// solo para las que se ven, el círculo crecería al ocultarla. Las dos redes
// ocultas dejan el mismo número de nodos a un lado de 40 y de 150, así que la
// letra no cambia. Con un lado de 720 px, el círculo no llega a su mínimo.
describe("un radio por atlas: mostrar u ocultar redes no cambia el círculo (6.1)", () => {
  const SIZE = 720;
  const radiusWith = (nodes: GraphNode[], hidden: string[]) => {
    filters.hiddenNetworks = new Set(hidden);
    try {
      const html = renderToStaticMarkup(<Connectogram nodes={nodes} connections={[]} size={SIZE} />);
      const drawn = [...nodeLabels(html).values()];
      expect(drawn.length).toBe(nodes.filter((node) => !hidden.includes(node.network)).length);
      return Math.hypot(drawn[0].x - SIZE / 2, drawn[0].y - SIZE / 2);
    } finally {
      filters.hiddenNetworks = new Set();
    }
  };

  it("como en Gordon 333: 333 regiones, y la etiqueta más larga en la red frontoparietal", () => {
    const nodes = Array.from({ length: 333 }, (_, i) =>
      i < 24
        ? region(`r_fp_${i}`, `r_frontoparietal_${i + 1}`, "R", "gordon333.frontoparietal")
        : region(`l_vis_${i}`, `l_visual_${i}`, "L", "gordon333.visual"),
    );
    const all = radiusWith(nodes, []);
    expect(all).toBeLessThan(SIZE / 2 - RING_MARGIN);
    expect(radiusWith(nodes, ["gordon333.frontoparietal"])).toBeCloseTo(all, 6);
  });

  it("como en el Subcórtex: 19 regiones, una sin hemisferio, y la más larga, el diencéfalo ventral", () => {
    const nodes = [
      ...["accumbens", "amygdala", "caudate", "hippocampus", "pallidum", "putamen", "thalamus", "cerebellum"].flatMap((name) => [
        region(`l_${name}`, `l_${name}`, "L", "subcortex.basal"),
        region(`r_${name}`, `r_${name}`, "R", "subcortex.basal"),
      ]),
      region("l_vdc", "l_ventraldiencephalon", "L", "subcortex.diencephalon"),
      region("r_vdc", "r_ventraldiencephalon", "R", "subcortex.diencephalon"),
      region("brainstem", "brainstem", null, "subcortex.basal"),
    ];
    expect(nodes).toHaveLength(19);
    const all = radiusWith(nodes, []);
    expect(all).toBeLessThan(SIZE / 2 - RING_MARGIN);
    expect(radiusWith(nodes, ["subcortex.diencephalon"])).toBeCloseTo(all, 6);
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

  // En la miniatura, el anillo no deja sitio a las etiquetas y los arcos no
  // se apartan de ellas. Con etiquetas cortas, las de en reposo acaban antes
  // que los arcos; con largas y letra grande, como en el IPL (18 regiones,
  // letra de 9 px), los cruzarían, y no se dibujan. En la vista grande sí,
  // apartados. Con las cuatro de NODES («TE1m», a 9 px) tampoco caben.
  it("en la miniatura, los arcos sin rótulos, si las etiquetas en reposo no llegan hasta ellos", () => {
    const short = [region("r_v1", "V1", "R"), region("r_v2", "V2", "R"), region("l_v1", "V1", "L"), region("l_v2", "V2", "L")];
    const html = renderToStaticMarkup(<Connectogram nodes={short} connections={[]} compact />);
    expect(arcsOf(html)).toHaveLength(2);
    expect(titlesOf(html)).toHaveLength(0);
    expect(arcsOf(renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} compact />))).toHaveLength(0);
  });

  it("en la miniatura, sin arcos si las etiquetas los cruzarían, como en el IPL", () => {
    const ipl = (["L", "R"] as const).flatMap((side) =>
      ["2_1", "2_2", "3_1", "3_2", "3_3", "4_1", "4_2", "4_3", "4_4"].map((part) => region(`${side}_${part}`, `IPL_${part}`, side)),
    );
    expect(arcsOf(renderToStaticMarkup(<Connectogram nodes={ipl} connections={[]} compact />))).toHaveLength(0);
    expect(arcsOf(renderToStaticMarkup(<Connectogram nodes={ipl} connections={[]} />))).toHaveLength(2);
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

// La leyenda va bajo el dibujo, no encima (decisión del usuario del
// 25/09/2026): encima, como en la maqueta, tapaba nodos, y también la lupa.
describe("leyenda del connectograma (5.4)", () => {
  // role="list" en la lista: con list-style: none, Safari deja de anunciarla
  // como lista.
  it("en la vista grande, bajo el dibujo y fuera del <svg>, con sus cuatro entradas; la discontinua, con el discontinuo del tema", () => {
    const html = renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} />);
    const legend = /<ul class="connectogram-legend" role="list" aria-label="Leyenda del connectograma">(.*?)<\/ul>/.exec(html);
    expect(legend).not.toBeNull();
    // Fuera del hueco del dibujo, que el <svg> llena, justo después de él y
    // antes del recuadro de lectura.
    expect(html).toContain(`</svg></div>${legend![0]}<div class="connectogram-readout">`);
    const entries = [...legend![1].matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1]);
    expect(entries.map((entry) => entry.replace(/<svg .*?<\/svg>/, ""))).toEqual([
      "Evidencia no directa (indirecta o hipótesis)",
      "Evidencia directa",
      "Efectiva (con dirección)",
      "Color del punto = red",
    ]);
    for (const entry of entries) expect(entry).toMatch(/^<svg class="connectogram-legend__sample"[^>]*aria-hidden="true"/);
    expect(entries[0]).toContain(`stroke-dasharray="${TOKENS.dash}"`);
    expect(entries[1]).not.toContain("stroke-dasharray");
  });

  // Con otro discontinuo que el del tema por defecto: uno fijo en la leyenda
  // no pasaría.
  it("cada muestra, la suya: la discontinua con el discontinuo que recibe (el del tema), la flecha y el punto", () => {
    const entries = [...renderToStaticMarkup(<ConnectogramLegend dash="6 4" />).matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1]);
    expect(entries[0]).toContain('stroke-dasharray="6 4"');
    expect(entries[2]).toContain('d="M1 4H22 M18 1l4 3-4 3"');
    expect(entries[3]).toMatch(/<circle [^>]*r="2.5"/);
  });

  // Como las líneas del dibujo (Connectogram.tsx): 1 px y extremos rectos. Con
  // extremos redondos, cada trazo del discontinuo crece por los dos lados y
  // los huecos encogen.
  it("las muestras de las dos líneas, con el grosor y los extremos de las líneas del dibujo", () => {
    const entries = [...renderToStaticMarkup(<ConnectogramLegend dash="3 3" />).matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1]);
    for (const entry of entries.slice(0, 2)) {
      expect(entry).toMatch(/<path d="M1 4H25"[^>]* stroke-width="1" stroke-linecap="butt"><\/path>/);
    }
  });

  it("no está en la miniatura", () => {
    expect(renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} compact />)).not.toContain("connectogram-legend");
  });
});

// Los estilos de la leyenda (App.css), que en node no se aplican: se leen como
// texto, como en marksWiring.test.ts. Se pide "node:fs" con
// process.getBuiltinModule porque tsconfig.app.json solo carga los tipos de
// vite/client.
interface NodeFs {
  readFileSync(path: URL, encoding: "utf8"): string;
}
const { readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule(id: "node:fs"): NodeFs } }
).process.getBuiltinModule("node:fs");
const APP_CSS = readFileSync(new URL("../App.css", import.meta.url), "utf8");

// Las declaraciones de las reglas de App.css con ese selector, sin comentarios.
function declarations(selector: string): string {
  const rules = [...APP_CSS.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  return rules
    .filter(([, selectors]) => selectors.split(",").some((each) => each.trim() === selector))
    .map(([, , body]) => body)
    .join(" ");
}

describe("leyenda del connectograma: estilos", () => {
  it("ocupa su fila bajo el dibujo, sin taparlo, y el hueco del dibujo se queda con el alto que sobra", () => {
    const legend = declarations(".connectogram-legend");
    expect(legend).not.toContain("position:");
    expect(legend).toContain("flex: 0 0 auto;");
    expect(legend).toContain("flex-wrap: wrap;");
    expect(declarations(".viz-panel")).toContain("flex-direction: column;");
    expect(declarations(".viz-panel__area")).toContain("flex: 1 1 0;");
  });

  it("sin selección de texto, a 0,7rem, y sobre el panel, con su mismo fondo", () => {
    const legend = declarations(".connectogram-legend");
    expect(legend).toContain("-webkit-user-select: none;");
    expect(legend).toContain(" user-select: none;");
    expect(legend).toContain("font-size: 0.7rem;");
    expect(legend).toContain("background: var(--panel-bg);");
    expect(APP_CSS).not.toContain("color-mix(in srgb, var(--panel-bg) 84%");
  });

  // A 1400 × 900, la leyenda tiene 776 px: con 14 px entre entradas y 8
  // dentro de cada una necesitaba 797 y se partía en dos filas; con 8 y 6,
  // unos 771.
  it("en una fila a 1400 × 900: 8 px entre entradas y 6 entre la muestra y su texto", () => {
    expect(declarations(".connectogram-legend")).toContain("gap: 2px 8px;");
    expect(declarations(".connectogram-legend li")).toContain("gap: 6px;");
  });

  it("el texto, secundario; las muestras, del color del texto y con trazo", () => {
    expect(declarations(".connectogram-legend")).toContain(" color: var(--text-muted);");
    const sample = declarations(".connectogram-legend__sample");
    for (const rule of ["color: var(--text);", "stroke: currentColor;", "fill: currentColor;"]) expect(sample).toContain(rule);
    expect(declarations(".connectogram-legend__sample path")).toContain("fill: none;");
  });
});
