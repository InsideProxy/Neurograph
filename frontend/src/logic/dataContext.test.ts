import { describe, expect, it } from "vitest";
import { NETWORK_SOURCE_LABELS } from "../theme/networks";
import {
  NETWORK_SOURCE_SHORT_LABELS,
  atlasShortLabel,
  networkSourceLabel,
  networkSourceOptionLabel,
  networkSourceShortLabel,
} from "./dataContext";

// Las cuatro etiquetas de ATLASES (App.tsx) cuando se escribió esta prueba.
// Si se añade un atlas allí, añade aquí su etiqueta.
const ATLAS_LABELS = [
  "HCP-MMP1.0 — 360 regiones, redes funcionales",
  "Brainnetome — 246 regiones, conectividad estructural",
  "Gordon 333 — 333 regiones corticales, redes propias del atlas",
  "Subcórtex HCP — 19 regiones (amígdala, tálamo, cerebelo...)",
];

describe("atlasShortLabel", () => {
  it("se queda con lo que va antes de « — »", () => {
    expect(ATLAS_LABELS.map(atlasShortLabel)).toEqual(["HCP-MMP1.0", "Brainnetome", "Gordon 333", "Subcórtex HCP"]);
  });

  it("los nombres cortos de los cuatro atlas no se repiten", () => {
    expect(new Set(ATLAS_LABELS.map(atlasShortLabel)).size).toBe(ATLAS_LABELS.length);
  });

  it("sin « — », la etiqueta entera", () => {
    expect(atlasShortLabel("Atlas nuevo")).toBe("Atlas nuevo");
  });
});

describe("clasificaciones de red", () => {
  it("nombre corto de las clasificaciones conocidas", () => {
    expect(networkSourceShortLabel("cole-anticevic")).toBe("Cole-Anticevic");
    expect(networkSourceShortLabel("yeo2011-7")).toBe("Yeo 7");
    expect(networkSourceShortLabel("yeo2011-17")).toBe("Yeo 17");
  });

  it("toda clasificación con etiqueta tiene nombre corto, y no se repiten", () => {
    for (const source of Object.keys(NETWORK_SOURCE_LABELS)) {
      expect(Object.hasOwn(NETWORK_SOURCE_SHORT_LABELS, source)).toBe(true);
    }
    const shortLabels = Object.values(NETWORK_SOURCE_SHORT_LABELS);
    expect(new Set(shortLabels).size).toBe(shortLabels.length);
  });

  it("una clasificación desconocida se muestra con su identificador, como hasta ahora", () => {
    expect(networkSourceShortLabel("nueva2030")).toBe("nueva2030");
    expect(networkSourceShortLabel("constructor")).toBe("constructor");
    expect(networkSourceLabel("nueva2030")).toBe("nueva2030");
  });

  it("la etiqueta de la lista es la de siempre", () => {
    expect(networkSourceOptionLabel({ source: "cole-anticevic", regionCount: 360, isDefault: true }, 360)).toBe(
      "Cole-Anticevic (Ji et al., 2019) — 360 de 360 regiones (por defecto)",
    );
    expect(networkSourceOptionLabel({ source: "yeo2011-7", regionCount: 358, isDefault: false }, 360)).toBe(
      "Yeo et al., 2011 — 7 redes — 358 de 360 regiones",
    );
  });
});
