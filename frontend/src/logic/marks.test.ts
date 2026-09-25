import { describe, expect, it } from "vitest";
import type { GraphNode } from "../types/domain";
import {
  MARK_ATTRIBUTE,
  MARK_ELEMENT,
  MARK_RING_GAP,
  estimatedTextBox,
  isMarkGesture,
  markGestureHint,
  markRing,
  marksHeading,
  marksHiddenText,
  marksNamesText,
  marksSummary,
  outwardLabel,
  pillAround,
  removeMarkElements,
} from "./marks";

const keys = (changes: Partial<Record<"ctrlKey" | "metaKey" | "altKey" | "shiftKey", boolean>> = {}) => ({
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...changes,
});

describe("isMarkGesture", () => {
  it("Ctrl+clic, o ⌘+clic en macOS, marca", () => {
    expect(isMarkGesture(keys({ ctrlKey: true }))).toBe(true);
    expect(isMarkGesture(keys({ metaKey: true }))).toBe(true);
  });

  it("el clic normal selecciona, y con Alt o Mayús tampoco marca", () => {
    expect(isMarkGesture(keys())).toBe(false);
    expect(isMarkGesture(keys({ ctrlKey: true, altKey: true }))).toBe(false);
    expect(isMarkGesture(keys({ ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(isMarkGesture(keys({ metaKey: true, shiftKey: true }))).toBe(false);
    expect(isMarkGesture(keys({ altKey: true }))).toBe(false);
  });
});

describe("markRing", () => {
  it("el anillo queda fuera del contorno del nodo, tras un hueco", () => {
    for (const [radius, stroke] of [
      [3, 1],
      [6, 2.5],
    ]) {
      const ring = markRing(radius, stroke);
      const innerEdge = ring.radius - ring.strokeWidth / 2;
      expect(innerEdge - (radius + stroke / 2)).toBeCloseTo(MARK_RING_GAP);
    }
  });
});

describe("outwardLabel", () => {
  it("desplaza la etiqueta hacia fuera y la alinea para que crezca hacia fuera", () => {
    expect(outwardLabel({ x: 100, y: 50 }, 1, 0, 10)).toEqual({ x: 110, y: 50, anchor: "start" });
    expect(outwardLabel({ x: 100, y: 50 }, -1, 0, 10)).toEqual({ x: 90, y: 50, anchor: "end" });
    expect(outwardLabel({ x: 100, y: 50 }, 0, -1, 10)).toEqual({ x: 100, y: 40, anchor: "middle" });
  });
});

describe("pastilla de la etiqueta", () => {
  it("rodea la caja del texto con margen, con los extremos redondos", () => {
    const pill = pillAround({ x: 10, y: 20, width: 30, height: 8 }, 6);
    expect(pill.x).toBeLessThan(10);
    expect(pill.y).toBeLessThan(20);
    expect(pill.x + pill.width).toBeGreaterThan(40);
    expect(pill.y + pill.height).toBeGreaterThan(28);
    expect(pill.x + pill.width / 2).toBeCloseTo(25);
    expect(pill.y + pill.height / 2).toBeCloseTo(24);
    expect(pill.rx).toBeCloseTo(pill.height / 2);
  });

  it("antes de medir, estima la caja del texto según su alineación, centrada en su línea", () => {
    const start = estimatedTextBox("IFJa", 100, 50, "start", 6);
    expect(start.x).toBe(100);
    expect(start.width).toBeGreaterThan(0);
    expect(start.y + start.height / 2).toBeCloseTo(50);
    expect(estimatedTextBox("IFJa", 100, 50, "end", 6).x).toBeCloseTo(100 - start.width);
    expect(estimatedTextBox("IFJa", 100, 50, "middle", 6).x).toBeCloseTo(100 - start.width / 2);
    expect(estimatedTextBox("IFJa", 100, 50, "start", 12).width).toBeCloseTo(start.width * 2);
  });
});

// Exportación (spec 5.9): las marcas solo existen en pantalla.
describe("removeMarkElements", () => {
  it("quita del clon todo lo que lleva el atributo de marca, y nada más", () => {
    const removed: string[] = [];
    const element = (name: string) => ({ remove: () => removed.push(name) });
    const selectors: string[] = [];
    const clone = {
      querySelectorAll(selector: string) {
        selectors.push(selector);
        return [element("hueco"), element("anillo y pastilla")];
      },
    };
    expect(removeMarkElements(clone)).toBe(2);
    expect(removed).toEqual(["hueco", "anillo y pastilla"]);
    expect(selectors).toEqual([`[${MARK_ATTRIBUTE}]`]);
  });

  it("los elementos de las marcas llevan ese atributo", () => {
    expect(Object.keys(MARK_ELEMENT)).toEqual([MARK_ATTRIBUTE]);
  });
});

// La línea de las marcas en Filtros (spec 5.9): «Marcadas: N» con sus
// nombres, los primeros y «y N más», y cuántas ocultan los filtros.
describe("línea de las marcas", () => {
  function region(id: string, abbreviation: string, hemisphere: "L" | "R", network = "cole-anticevic.visual"): GraphNode {
    return { id, label: `Area ${abbreviation}`, abbreviation, hemisphere, network, position3d: [0, 0, 0], referenceSpace: null };
  }
  const NODES = [
    region("l_te1m", "TE1m", "L"),
    region("r_ifja", "IFJa", "R"),
    region("l_v1", "V1", "L"),
    region("r_v1", "V1", "R"),
    region("r_fef", "FEF", "R", "cole-anticevic.default"),
  ];
  const BY_ID = new Map(NODES.map((node) => [node.id, node]));
  const hiddenByFilters = (node: GraphNode) => node.network === "cole-anticevic.default";

  it("cuenta solo las regiones cargadas y nombra las primeras en el orden en que se marcaron, con su lado", () => {
    const summary = marksSummary(new Set(["l_te1m", "r_ifja", "otro_atlas", "l_v1", "r_v1", "r_fef"]), BY_ID, hiddenByFilters);
    expect(summary.count).toBe(5);
    expect(summary.names).toEqual(["TE1m (izq.)", "IFJa (der.)", "V1 (izq.)"]);
    expect(summary.allNames).toEqual(["TE1m (izq.)", "IFJa (der.)", "V1 (izq.)", "V1 (der.)", "FEF (der.)"]);
    expect(summary.hidden).toBe(1);
    expect(marksNamesText(summary)).toBe("TE1m (izq.), IFJa (der.), V1 (izq.) y 2 más");
  });

  it("con pocas, las nombra todas, con «e» ante el sonido /i/", () => {
    expect(marksNamesText(marksSummary(new Set(["l_v1"]), BY_ID, hiddenByFilters))).toBe("V1 (izq.)");
    expect(marksNamesText(marksSummary(new Set(["l_v1", "r_ifja"]), BY_ID, hiddenByFilters))).toBe("V1 (izq.) e IFJa (der.)");
    expect(marksNamesText(marksSummary(new Set(["r_ifja", "l_v1", "l_te1m"]), BY_ID, hiddenByFilters))).toBe(
      "IFJa (der.), V1 (izq.) y TE1m (izq.)",
    );
  });

  it("dice cuántas hay, o que no hay ninguna, y cuántas ocultan los filtros", () => {
    expect(marksHeading(0)).toBe("Ninguna región marcada");
    expect(marksHeading(5)).toBe("Marcadas: 5");
    expect(marksHiddenText(0)).toBeNull();
    expect(marksHiddenText(1)).toBe("1 oculta por los filtros");
    expect(marksHiddenText(2)).toBe("2 ocultas por los filtros");
  });

  it("sin marcas, explica el gesto como en cada sistema", () => {
    expect(markGestureHint("Mozilla/5.0 (X11; Linux x86_64)")).toBe("Ctrl+clic en una región para marcarla");
    expect(markGestureHint("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)")).toBe("⌘+clic en una región para marcarla");
  });
});
