import { describe, expect, it } from "vitest";
import {
  connectionArrow,
  connectionTitle,
  connectionsPassingText,
  formatCount,
  hemisphereLabel,
  networkShortLabel,
  regionNameWithSide,
  regionPassingText,
  regionTitleParts,
  selectionStatusText,
} from "./displayText";
import type { GraphNode } from "../types/domain";

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

describe("connectionArrow", () => {
  it("«→» solo para la conectividad efectiva; «↔» para las demás", () => {
    expect(connectionArrow("effective")).toBe("→");
    expect(connectionArrow("structural")).toBe("↔");
    expect(connectionArrow("functional")).toBe("↔");
  });
});

describe("regionNameWithSide", () => {
  it("añade el lado, salvo si no hay hemisferio o si la abreviatura ya lo dice", () => {
    expect(regionNameWithSide({ abbreviation: "IFJa", label: "Area IFJa (hemisferio derecho)", hemisphere: "R" })).toBe("IFJa (der.)");
    expect(regionNameWithSide({ abbreviation: "L_SFG_7_1", label: "SFG_L_7_1", hemisphere: "L" })).toBe("L_SFG_7_1");
    expect(regionNameWithSide({ abbreviation: "l_amygdala", label: "Amígdala", hemisphere: "L" })).toBe("l_amygdala");
    expect(regionNameWithSide({ abbreviation: null, label: "Tronco del encéfalo", hemisphere: null })).toBe("Tronco del encéfalo");
  });
});

describe("connectionTitle", () => {
  const NODES = new Map<string, Pick<GraphNode, "abbreviation" | "label" | "hemisphere">>([
    ["l_v1", { abbreviation: "V1", label: "Primary Visual Cortex (hemisferio izquierdo)", hemisphere: "L" }],
    ["r_v1", { abbreviation: "V1", label: "Primary Visual Cortex (hemisferio derecho)", hemisphere: "R" }],
    ["l_v2", { abbreviation: "V2", label: "Second Visual Area (hemisferio izquierdo)", hemisphere: "L" }],
    ["talamo", { abbreviation: null, label: "Tálamo", hemisphere: null }],
  ]);

  it("la flecha, solo para la conectividad efectiva", () => {
    expect(connectionTitle({ source: "l_v1", target: "l_v2", type: "effective" }, NODES)).toBe("V1 → V2");
    expect(connectionTitle({ source: "l_v1", target: "l_v2", type: "structural" }, NODES)).toBe("V1 ↔ V2");
  });

  it("con el mismo nombre o en hemisferios distintos, cada región lleva su lado", () => {
    expect(connectionTitle({ source: "l_v1", target: "r_v1", type: "functional" }, NODES)).toBe("V1 (izq.) ↔ V1 (der.)");
    expect(connectionTitle({ source: "l_v2", target: "r_v1", type: "structural" }, NODES)).toBe("V2 (izq.) ↔ V1 (der.)");
  });

  it("una región sin hemisferio no lleva lado, y una que no está cargada se nombra con su id", () => {
    expect(connectionTitle({ source: "talamo", target: "l_v1", type: "structural" }, NODES)).toBe("Tálamo ↔ V1 (izq.)");
    expect(connectionTitle({ source: "x", target: "l_v1", type: "structural" }, NODES)).toBe("x ↔ V1 (izq.)");
  });
});
