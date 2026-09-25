import { describe, expect, it } from "vitest";
import {
  connectionsPassingText,
  formatCount,
  hemisphereLabel,
  networkShortLabel,
  regionPassingText,
  regionTitleParts,
  selectionStatusText,
} from "./displayText";

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

describe("regionPassingText", () => {
  it("cuenta las conexiones de la región que pasan los filtros, con el umbral como en Filtros", () => {
    expect(regionPassingText(5, 0.02)).toBe("5 conexiones pasan los filtros (peso ≥ 0.02)");
    expect(regionPassingText(1, 0.0039810717)).toBe("1 conexión pasa los filtros (peso ≥ 4.0e-3)");
    expect(regionPassingText(359, 0)).toBe("359 conexiones pasan los filtros");
  });
});

describe("hemisphereLabel", () => {
  it("nombra el hemisferio, o dice que no hay", () => {
    expect(hemisphereLabel("L")).toBe("Hemisferio izquierdo");
    expect(hemisphereLabel("R")).toBe("Hemisferio derecho");
    expect(hemisphereLabel(null)).toBe("Sin hemisferio asignado");
  });
});

describe("regionTitleParts", () => {
  it("abreviatura y nombre, sin el «(hemisferio …)» final de HCP-MMP1.0", () => {
    expect(regionTitleParts({ abbreviation: "IFJa", label: "Area IFJa (hemisferio derecho)", hemisphere: "R" })).toEqual({
      main: "IFJa",
      secondary: "Area IFJa",
    });
  });

  it("sin nombre aparte si solo repite la abreviatura (ingestas antiguas de HCP-MMP1.0)", () => {
    expect(regionTitleParts({ abbreviation: "V1", label: "V1 (hemisferio izquierdo)", hemisphere: "L" })).toEqual({
      main: "V1",
      secondary: null,
    });
  });

  it("sin abreviatura, el nombre es lo principal", () => {
    expect(regionTitleParts({ abbreviation: null, label: "Tálamo izquierdo", hemisphere: "L" })).toEqual({
      main: "Tálamo izquierdo",
      secondary: null,
    });
  });

  it("un nombre que no acaba en «(hemisferio …)» no se toca", () => {
    expect(regionTitleParts({ abbreviation: "A8m_L", label: "medial area 8 (izquierda)", hemisphere: "L" })).toEqual({
      main: "A8m_L",
      secondary: "medial area 8 (izquierda)",
    });
  });

  it("el sufijo solo se quita si coincide con el hemisferio de la región", () => {
    expect(regionTitleParts({ abbreviation: "IFJa", label: "Area IFJa (hemisferio derecho)", hemisphere: null })).toEqual({
      main: "IFJa",
      secondary: "Area IFJa (hemisferio derecho)",
    });
    expect(regionTitleParts({ abbreviation: "IFJa", label: "Area IFJa (hemisferio derecho)", hemisphere: "L" })).toEqual({
      main: "IFJa",
      secondary: "Area IFJa (hemisferio derecho)",
    });
  });
});
