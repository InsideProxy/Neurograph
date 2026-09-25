import { describe, expect, it } from "vitest";
import { connectionsPassingText, formatCount, networkShortLabel, selectionStatusText } from "./displayText";

describe("formatCount", () => {
  it("separa los miles con un espacio duro a partir de cinco cifras", () => {
    expect(formatCount(64620)).toBe("64\u00a0620");
    expect(formatCount(1234567)).toBe("1\u00a0234\u00a0567");
  });

  it("deja sin separar los números de hasta cuatro cifras", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(360)).toBe("360");
    expect(formatCount(1047)).toBe("1047");
  });
});

describe("networkShortLabel", () => {
  it("quita el paréntesis final de la clasificación", () => {
    expect(networkShortLabel("cole-anticevic.visual")).toBe("Visual");
    expect(networkShortLabel("cole-anticevic.default")).toBe("Por defecto");
    expect(networkShortLabel("yeo2011-7.vis")).toBe("Visual — Vis");
  });

  it("una red sin etiqueta se muestra con su clave", () => {
    expect(networkShortLabel("atlas-nuevo.red")).toBe("atlas-nuevo.red");
    expect(networkShortLabel("constructor")).toBe("constructor");
  });
});

describe("selectionStatusText", () => {
  it("cuenta las regiones seleccionadas", () => {
    expect(selectionStatusText(1, false)).toBe("1 región seleccionada");
    expect(selectionStatusText(12, false)).toBe("12 regiones seleccionadas");
  });

  it("sin regiones, dice si hay una conexión seleccionada o nada", () => {
    expect(selectionStatusText(0, true)).toBe("1 conexión seleccionada");
    expect(selectionStatusText(0, false)).toBe("Ninguna región seleccionada");
  });
});

describe("connectionsPassingText", () => {
  it("cuenta las que pasan los filtros, con el singular donde toca", () => {
    expect(connectionsPassingText(4, 9)).toBe("4 de 9 conexiones pasan los filtros");
    expect(connectionsPassingText(1, 9)).toBe("1 de 9 conexiones pasa los filtros");
    expect(connectionsPassingText(1, 1)).toBe("1 de 1 conexión pasa los filtros");
    expect(connectionsPassingText(0, 0)).toBe("0 de 0 conexiones pasan los filtros");
  });
});
