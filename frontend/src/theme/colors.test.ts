import { describe, expect, it } from "vitest";
import { NEUTRAL_COLOR } from "./networks";
import { DRAW_TOKENS } from "./themes";
import { exportColorFor, exportResolverFor, resolveNetworkColor } from "./colors";

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

describe("exportColorFor", () => {
  it("resuelve colores de red con el prefijo net:", () => {
    expect(exportColorFor("net:cole-anticevic.default", "grafito")).toBe("#ff0000");
  });

  it("con el tema original, los colores de dibujo son los de hoy", () => {
    expect(exportColorFor("edge", "original")).toBe(NEUTRAL_COLOR);
    expect(exportColorFor("edgeOpacityConnectogram", "original")).toBe("0.55");
    expect(exportColorFor("hemiFill", "original")).toBe("none");
  });

  it("con los temas 2 a 4, los de Claro", () => {
    expect(exportColorFor("edge", "noche")).toBe(DRAW_TOKENS.claro.edge);
    expect(exportColorFor("selected", "grafito")).toBe(DRAW_TOKENS.claro.selected);
  });

  it("devuelve null para referencias desconocidas o que no son un color", () => {
    expect(exportColorFor("inventado", "original")).toBeNull();
    expect(exportColorFor("cortexSulcus", "original")).toBeNull();
  });

  it("exportResolverFor fija el tema", () => {
    expect(exportResolverFor("claro")("edge")).toBe(DRAW_TOKENS.claro.edge);
  });
});
