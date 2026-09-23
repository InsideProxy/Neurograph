import { describe, expect, it } from "vitest";
import {
  NETWORK_SURFACE_URL_BY_SOURCE,
  NO_NETWORK,
  validateNetworkSurfaceFile,
  vertexNetworkForDisplay,
  type NetworkSurfaceMap,
} from "./networkSurface";
import { NETWORK_COLORS, NETWORK_LABELS } from "../theme/networks";

const EXPECTED = { networkSource: "fuente-x", nVerticesLeft: 2, nVerticesRight: 2 };

function goodFile() {
  return {
    schemaVersion: 1,
    networkSource: "fuente-x",
    surfaceMesh: "fs_LR_32k",
    surfaceVertexCount: { left: 2, right: 2 },
    vertexOrder: "left_then_right",
    networks: [
      { slug: "fuente-x.a", name: "A", color: "#ff0000" },
      { slug: "fuente-x.b", name: "B", color: "#00ff00" },
    ],
    vertexNetworkIndex: [0, 1, 1, NO_NETWORK],
  };
}

describe("validateNetworkSurfaceFile", () => {
  it("acepta un archivo correcto", () => {
    const result = validateNetworkSurfaceFile(goodFile(), EXPECTED);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.from(result.map.vertexNetworkIndex)).toEqual([0, 1, 1, -1]);
      expect(result.map.networks.map((n) => n.slug)).toEqual(["fuente-x.a", "fuente-x.b"]);
    }
  });

  it("rechaza un mapa de otra clasificación", () => {
    const result = validateNetworkSurfaceFile({ ...goodFile(), networkSource: "otra" }, EXPECTED);
    expect(result.ok).toBe(false);
  });

  it("rechaza una superficie con otro número de vértices", () => {
    const result = validateNetworkSurfaceFile(
      { ...goodFile(), surfaceVertexCount: { left: 3, right: 1 } },
      EXPECTED,
    );
    expect(result.ok).toBe(false);
  });

  it("rechaza una red que no es de la clasificación declarada", () => {
    const file = goodFile();
    file.networks[1] = { slug: "otra.b", name: "B", color: "#00ff00" };
    expect(validateNetworkSurfaceFile(file, EXPECTED).ok).toBe(false);
  });

  it("rechaza índices de red inexistentes", () => {
    const file = goodFile();
    file.vertexNetworkIndex = [0, 2, 1, -1];
    expect(validateNetworkSurfaceFile(file, EXPECTED).ok).toBe(false);
  });

  it("rechaza slugs repetidos y colores no hexadecimales", () => {
    const dup = goodFile();
    dup.networks[1] = { ...dup.networks[0] };
    expect(validateNetworkSurfaceFile(dup, EXPECTED).ok).toBe(false);
    const badColor = goodFile();
    badColor.networks[0] = { ...badColor.networks[0], color: "rojo" };
    expect(validateNetworkSurfaceFile(badColor, EXPECTED).ok).toBe(false);
  });
});

describe("vertexNetworkForDisplay", () => {
  const map: NetworkSurfaceMap = {
    networkSource: "fuente-x",
    nVerticesLeft: 2,
    nVerticesRight: 2,
    networks: [
      { slug: "fuente-x.a", name: "A", color: "#ff0000" },
      { slug: "fuente-x.b", name: "B", color: "#00ff00" },
    ],
    vertexNetworkIndex: Int32Array.from([0, 1, 1, NO_NETWORK]),
    provenance: null,
  };
  // Región 0 = vértices 0 y 1 (dos redes distintas dentro de UNA región).
  const regions = Int32Array.from([0, 0, 1, -1]);

  it("sin selección ni filtros, cada vértice con su propia red", () => {
    expect(Array.from(vertexNetworkForDisplay(map, regions, () => true, null))).toEqual([0, 1, 1, -1]);
  });

  it("una red oculta en los filtros queda en gris solo donde está esa red", () => {
    expect(Array.from(vertexNetworkForDisplay(map, regions, (i) => i !== 1, null))).toEqual([0, -1, -1, -1]);
  });

  it("con selección, solo se pinta dentro de las regiones del foco -- conservando la mezcla de redes", () => {
    expect(Array.from(vertexNetworkForDisplay(map, regions, () => true, (r) => r === 0))).toEqual([0, 1, -1, -1]);
  });

  it("rechaza mapas con distinto número de vértices", () => {
    expect(() => vertexNetworkForDisplay(map, Int32Array.from([0, 0]), () => true, null)).toThrow();
  });
});

// Los archivos REALES de frontend/public/parcels/networks/ (generados por
// scripts/generate_network_surface_maps.py): cada red tiene que tener el
// mismo color exacto en theme/networks.ts (el que usa el connectograma)
// y una etiqueta, y cada archivo tiene que estar registrado.
const REAL_FILES = import.meta.glob<{ default: unknown }>("../../public/parcels/networks/*.fslr32k.json", {
  eager: true,
});

describe("mapas de redes reales publicados", () => {
  it("hay exactamente un archivo por clasificación registrada", () => {
    const names = Object.keys(REAL_FILES).map((p) => p.split("/").pop());
    const expected = Object.values(NETWORK_SURFACE_URL_BY_SOURCE).map((u) => u.split("/").pop());
    expect(names.sort()).toEqual(expected.sort());
  });

  for (const [path, mod] of Object.entries(REAL_FILES)) {
    const source = path.split("/").pop()!.replace(".fslr32k.json", "");
    it(`${source}: válido sobre fs_LR 32k y con los mismos colores que theme/networks.ts`, () => {
      const result = validateNetworkSurfaceFile(mod.default, {
        networkSource: source,
        nVerticesLeft: 32492,
        nVerticesRight: 32492,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      for (const network of result.map.networks) {
        expect(NETWORK_COLORS[network.slug]).toBe(network.color);
        expect(NETWORK_LABELS[network.slug]).toBeTruthy();
      }
    });
  }
});
