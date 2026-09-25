import { describe, expect, it } from "vitest";
import {
  MARK_ATTRIBUTE,
  MARK_ELEMENT,
  MARK_RING_GAP,
  estimatedTextBox,
  isMarkGesture,
  markRing,
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
