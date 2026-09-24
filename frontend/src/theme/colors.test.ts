import { describe, expect, it } from "vitest";
import { NEUTRAL_COLOR } from "./networks";
import { DRAW_TOKENS } from "./themes";
import { exportColorFor, exportResolverFor, hasNetworkColor, ngFill, ngStrokeOpacity, resolveNetworkColor } from "./colors";

describe("resolveNetworkColor", () => {
  it("devuelve el color original del atlas", () => {
    expect(resolveNetworkColor("cole-anticevic.visual")).toBe("#0000ff");
  });

  it("una red desconocida usa el gris de «sin clasificar»", () => {
    expect(resolveNetworkColor("no-existe")).toBe("#8a8a8a");
    // Claves que existen en cualquier objeto por su prototipo, no como red.
    expect(resolveNetworkColor("constructor")).toBe("#8a8a8a");
  });
});

describe("hasNetworkColor", () => {
  it("distingue una red real de una clave heredada o inexistente", () => {
    expect(hasNetworkColor("cole-anticevic.visual")).toBe(true);
    expect(hasNetworkColor("no-existe")).toBe(false);
    expect(hasNetworkColor("constructor")).toBe(false);
  });
});

describe("exportColorFor", () => {
  it("resuelve colores de red con el prefijo net:", () => {
    expect(exportColorFor("net:cole-anticevic.default", "paint", "grafito")).toBe("#ff0000");
  });

  it("una red desconocida en net: usa el gris de «sin clasificar»", () => {
    expect(exportColorFor("net:desconocida", "paint", "claro")).toBe("#8a8a8a");
  });

  it("con el tema original, los colores de dibujo son los de hoy", () => {
    expect(exportColorFor("edge", "paint", "original")).toBe(NEUTRAL_COLOR);
    expect(exportColorFor("edgeOpacityConnectogram", "opacity", "original")).toBe("0.55");
    expect(exportColorFor("hemiFill", "paint", "original")).toBe("none");
  });

  it("con los temas 2 a 4, los de Claro", () => {
    expect(exportColorFor("edge", "paint", "noche")).toBe(DRAW_TOKENS.claro.edge);
    expect(exportColorFor("selected", "paint", "grafito")).toBe(DRAW_TOKENS.claro.selected);
  });

  it("devuelve null para referencias desconocidas o que no son un color", () => {
    expect(exportColorFor("inventado", "paint", "original")).toBeNull();
    expect(exportColorFor("cortexSulcus", "paint", "original")).toBeNull();
  });

  it("un tipo que no coincide con el del token devuelve null", () => {
    expect(exportColorFor("edgeOpacitySelected", "paint", "original")).toBeNull();
    expect(exportColorFor("edge", "opacity", "original")).toBeNull();
    expect(exportColorFor("dash", "paint", "original")).toBeNull();
    expect(exportColorFor("net:cole-anticevic.visual", "opacity", "original")).toBeNull();
  });

  it("las claves heredadas del prototipo no son un token válido", () => {
    expect(exportColorFor("toString", "paint", "original")).toBeNull();
    expect(exportColorFor("__proto__", "paint", "original")).toBeNull();
    expect(exportColorFor("constructor", "paint", "original")).toBeNull();
  });

  it("exportResolverFor fija el tema", () => {
    expect(exportResolverFor("claro")("edge", "paint")).toBe(DRAW_TOKENS.claro.edge);
  });
});

describe("ayudantes data-ng-*", () => {
  it("ngFill y ngStrokeOpacity generan el atributo con la referencia", () => {
    expect(ngFill("edge")).toEqual({ "data-ng-fill": "edge" });
    expect(ngStrokeOpacity("edgeOpacitySelected")).toEqual({ "data-ng-stroke-opacity": "edgeOpacitySelected" });
  });
});

describe("ayudantes data-ng-* con tipo", () => {
  it("una referencia mal escrita no compila", () => {
    // Estos @ts-expect-error solo fallan con `tsc -b` (build y chequeo de tipos), no con `npm test`.
    // @ts-expect-error: "egde" no es un token de color
    ngFill("egde");
    // @ts-expect-error: "edge" es un color, no una opacidad
    ngStrokeOpacity("edge");
    expect(typeof ngFill).toBe("function");
  });
});
