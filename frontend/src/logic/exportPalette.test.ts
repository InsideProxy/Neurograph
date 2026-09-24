import { describe, expect, it } from "vitest";
import { applyExportColors, type ExportableElement } from "./exportPalette";
import { ngFill, ngStroke, ngStrokeOpacity } from "../theme/colors";

class FakeElement implements ExportableElement {
  attributes: Record<string, string>;
  children: FakeElement[];
  constructor(attributes: Record<string, string>, children: FakeElement[] = []) {
    this.attributes = { ...attributes };
    this.children = children;
  }
  getAttribute(name: string): string | null {
    return name in this.attributes ? this.attributes[name] : null;
  }
  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }
  // Solo entiende selectores de la forma "[atributo]", los que usa exportPalette.
  querySelectorAll(selector: string): FakeElement[] {
    const name = selector.slice(1, -1);
    const found: FakeElement[] = [];
    const walk = (el: FakeElement) => {
      for (const child of el.children) {
        if (name in child.attributes) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
}

const resolve = (ref: string) =>
  ({ edge: "#6f737c", "net:cole-anticevic.visual": "#0000ff", edgeOpacityConnectogram: "0.26" })[ref] ?? null;

function recordingResolver() {
  const calls: [string, string][] = [];
  const resolveAndRecord = (ref: string, kind: string) => {
    calls.push([ref, kind]);
    return resolve(ref);
  };
  return { calls, resolve: resolveAndRecord };
}

describe("applyExportColors", () => {
  it("reescribe fill, stroke y stroke-opacity según las referencias", () => {
    const node = new FakeElement({ fill: "#aaaaaa", ...ngFill("net:cole-anticevic.visual") });
    const line = new FakeElement({
      stroke: "#8b93a0",
      ...ngStroke("edge"),
      "stroke-opacity": "0.24",
      ...ngStrokeOpacity("edgeOpacityConnectogram"),
    });
    const root = new FakeElement({}, [new FakeElement({}, [node]), line]);
    applyExportColors(root, resolve);
    expect(node.attributes.fill).toBe("#0000ff");
    expect(line.attributes.stroke).toBe("#6f737c");
    expect(line.attributes["stroke-opacity"]).toBe("0.26");
  });

  it("deja el atributo como estaba si la referencia no se resuelve, y lo avisa", () => {
    // "desconocida" no es un PaintRef válido a propósito -- es justo la referencia
    // sin resolver que prueba este caso, así que no puede construirse con ngFill.
    const el = new FakeElement({ fill: "#123456", "data-ng-fill": "desconocida" });
    const unresolved: [string, string][] = [];
    applyExportColors(new FakeElement({}, [el]), resolve, (ref, attribute) => unresolved.push([ref, attribute]));
    expect(el.attributes.fill).toBe("#123456");
    expect(unresolved).toEqual([["desconocida", "data-ng-fill"]]);
  });

  it("pide color para fill y stroke, y opacidad para stroke-opacity", () => {
    const line = new FakeElement({ ...ngStroke("edge"), ...ngStrokeOpacity("edgeOpacityConnectogram") });
    const node = new FakeElement({ ...ngFill("net:cole-anticevic.visual") });
    const recorder = recordingResolver();
    applyExportColors(new FakeElement({}, [line, node]), recorder.resolve);
    expect(recorder.calls).toHaveLength(3);
    expect(recorder.calls).toEqual(
      expect.arrayContaining([
        ["net:cole-anticevic.visual", "paint"],
        ["edge", "paint"],
        ["edgeOpacityConnectogram", "opacity"],
      ]),
    );
  });

  it("también trata la propia raíz", () => {
    const root = new FakeElement({ fill: "#000000", ...ngFill("edge") });
    applyExportColors(root, resolve);
    expect(root.attributes.fill).toBe("#6f737c");
  });
});
