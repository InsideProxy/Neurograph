import { describe, expect, it } from "vitest";
import {
  RING_MARGIN,
  SELECTION_HALO_GAP,
  SELECTION_HALO_OPACITY,
  estimatedLabelWidth,
  labelReach,
  labelTransform,
  radialLabel,
  ringLayout,
  selectionHalo,
} from "./connectogramLayout";
import { markRing, pillAround } from "./marks";

// Geometría del connectograma de la fase 4 del rediseño
// (docs/rediseno-interfaz-diseno.md, 6.1).
describe("radialLabel", () => {
  it("en la mitad derecha, fuera del nodo, girada con su ángulo y alineada al principio", () => {
    const right = radialLabel({ x: 100, y: 50 }, 1, 0, 10);
    expect(right).toEqual({ x: 110, y: 50, anchor: "start", rotation: 0 });
    const lowerRight = radialLabel({ x: 0, y: 0 }, Math.SQRT1_2, Math.SQRT1_2, 10);
    expect(lowerRight.x).toBeCloseTo(7.071, 3);
    expect(lowerRight.y).toBeCloseTo(7.071, 3);
    expect(lowerRight.anchor).toBe("start");
    expect(lowerRight.rotation).toBeCloseTo(45);
  });

  it("en la mitad izquierda, girada 180° más y alineada al final, para leerse de izquierda a derecha", () => {
    const left = radialLabel({ x: 100, y: 50 }, -1, 0, 10);
    expect(left.x).toBe(90);
    expect(left.y).toBeCloseTo(50);
    expect(left.anchor).toBe("end");
    expect(left.rotation).toBeCloseTo(360);
    const upperLeft = radialLabel({ x: 0, y: 0 }, -Math.SQRT1_2, -Math.SQRT1_2, 10);
    expect(upperLeft.anchor).toBe("end");
    expect(upperLeft.rotation).toBeCloseTo(45);
  });

  it("arriba y abajo del círculo, en vertical y hacia fuera", () => {
    expect(radialLabel({ x: 0, y: 0 }, 0, -1, 10)).toEqual({ x: 0, y: -10, anchor: "start", rotation: -90 });
    expect(radialLabel({ x: 0, y: 0 }, 0, 1, 10)).toEqual({ x: 0, y: 10, anchor: "start", rotation: 90 });
  });
});

describe("labelTransform", () => {
  it("gira alrededor del punto de la etiqueta", () => {
    expect(labelTransform({ x: 110, y: 50, anchor: "start", rotation: 30 })).toBe("rotate(30 110 50)");
  });
});

// Espacio de las etiquetas: el margen del anillo se reserva según la etiqueta
// más larga (decisión del usuario del 25/09/2026).

// Lo que la pastilla de una región marcada (5.9) sobresale del final del texto.
const pillPad = (fontSize: number) => {
  const pill = pillAround({ x: 0, y: 0, width: 0, height: 0 }, fontSize);
  return pill.x + pill.width;
};

// Las abreviaturas más largas de HCP-MMP1.0, las de los datos, repetidas hasta
// sus 360 regiones.
const HCP_LONGEST = ["p9-46v", "a9-46v", "v23ab", "d23ab", "a32pr", "p32pr", "a24pr", "p24pr", "OP2-3", "TPOJ1", "STSdp", "PoI2"];
const HCP = Array.from({ length: 360 }, (_, index) => HCP_LONGEST[index % HCP_LONGEST.length]);

describe("estimatedLabelWidth", () => {
  // La abreviatura más ancha de cada atlas, con su ancho real en Atkinson
  // Hyperlegible Next con peso 700, en em, medido en el archivo de la fuente.
  const MEASURED: [string, number][] = [
    ["p9-46v", 3.32], // HCP-MMP1.0
    ["R_MVOcC _5_4", 6.809], // Brainnetome
    ["r_frontoparietal_20", 8.887], // Gordon 333
    ["r_ventraldiencephalon", 10.349], // Subcórtex
    ["PoCG-forelimb", 6.93], // Wang 2017, en el macaco
  ];

  it("cubre el ancho real de las etiquetas más anchas de los atlas, con el espaciado de la página, sin pasarse mucho", () => {
    for (const [text, em] of MEASURED) {
      const real = em * 10 + text.length * 0.18;
      const estimate = estimatedLabelWidth(text, 10);
      expect(estimate, text).toBeGreaterThanOrEqual(real);
      expect(estimate / real, text).toBeLessThan(1.15);
    }
  });

  it("crece con el tamaño de la letra, y sin texto no ocupa nada", () => {
    expect(estimatedLabelWidth("IFJa", 7)).toBeGreaterThan(estimatedLabelWidth("IFJa", 5.5));
    expect(estimatedLabelWidth("", 9)).toBe(0);
  });
});

describe("labelReach", () => {
  it("en reposo, hasta el final del texto más largo; ampliada, con el nodo y la letra mayores, hasta el final de su pastilla", () => {
    const reach = labelReach(["V1", "r_frontoparietal_20", null, "IFJa"], 3, 5.5);
    expect(reach.rest).toBeCloseTo(3 + 7 + estimatedLabelWidth("r_frontoparietal_20", 5.5));
    expect(reach.enlarged).toBeCloseTo(3 + 3 + 7 + estimatedLabelWidth("r_frontoparietal_20", 7) + pillPad(7));
  });

  it("sin etiquetas, solo la separación del nodo", () => {
    expect(labelReach([null, ""], 6, 9).rest).toBe(6 + 7);
  });
});

describe("ringLayout", () => {
  const usual = (size: number) => size / 2 - RING_MARGIN;

  it("con las 360 etiquetas cortas de HCP-MMP1.0, el círculo mide lo de siempre, o casi", () => {
    for (const size of [420, 626, 666, 720]) {
      const { radius } = ringLayout({ size, labels: HCP, nodeRadius: 3, fontSize: 5.5, fitLabels: true });
      expect(radius, String(size)).toBeLessThanOrEqual(usual(size));
      expect(usual(size) - radius, String(size)).toBeLessThan(3);
    }
  });

  it("con etiquetas aún más cortas, el margen de siempre, que es el mínimo", () => {
    const labels = Array.from({ length: 360 }, () => "V1");
    expect(ringLayout({ size: 666, labels, nodeRadius: 3, fontSize: 5.5, fitLabels: true }).radius).toBe(usual(666));
  });

  it("con etiquetas largas se encoge lo justo: la más larga, ampliada y con su pastilla, acaba en el borde", () => {
    const labels = [...Array.from({ length: 332 }, () => "l_visual_1"), "r_frontoparietal_20"];
    const { radius } = ringLayout({ size: 666, labels, nodeRadius: 3, fontSize: 5.5, fitLabels: true });
    expect(radius).toBeLessThan(usual(666));
    // Arriba del todo, donde la etiqueta va en vertical hacia el borde.
    const label = radialLabel({ x: 333, y: 333 - radius }, 0, -1, 3 + 3 + 7);
    const end = label.y - estimatedLabelWidth("r_frontoparietal_20", 7) - pillPad(7);
    expect(end).toBeCloseTo(0, 9);
  });

  it("lo decide la etiqueta más larga, no cuántas hay", () => {
    const one = ringLayout({ size: 666, labels: ["r_ventraldiencephalon", "V1"], nodeRadius: 6, fontSize: 9, fitLabels: true });
    const many = ringLayout({
      size: 666,
      labels: ["r_ventraldiencephalon", ...Array.from({ length: 18 }, () => "l_putamen")],
      nodeRadius: 6,
      fontSize: 9,
      fitLabels: true,
    });
    expect(many.radius).toBeCloseTo(one.radius);
    expect(666 / 2 - one.radius).toBeCloseTo(labelReach(["r_ventraldiencephalon"], 6, 9).enlarged);
  });

  it("en la miniatura, el margen de siempre, sin mirar las etiquetas", () => {
    const { radius } = ringLayout({ size: 200, labels: ["r_ventraldiencephalon"], nodeRadius: 6, fontSize: 9, fitLabels: false });
    expect(radius).toBe(usual(200));
  });

  it("en un dibujo pequeño con etiquetas muy largas, el círculo no baja de la mitad de su radio de siempre", () => {
    const { radius } = ringLayout({ size: 320, labels: ["r_ventraldiencephalon"], nodeRadius: 6, fontSize: 9, fitLabels: true });
    expect(radius).toBe(usual(320) / 2);
  });
});

describe("halo de la región seleccionada", () => {
  it("es un anillo al 35 %, por fuera del contorno de 2,5 px y separado de él", () => {
    const halo = selectionHalo(6, 2.5);
    expect(SELECTION_HALO_OPACITY).toBe(0.35);
    expect(halo.radius - halo.strokeWidth / 2 - (6 + 2.5 / 2)).toBeCloseTo(SELECTION_HALO_GAP);
  });

  it("con una marca, el anillo de la marca no se mueve y deja ver el borde de fuera del halo", () => {
    const halo = selectionHalo(6, 2.5);
    const ring = markRing(6, 2.5);
    expect(ring.radius - ring.strokeWidth / 2).toBeGreaterThan(6 + 2.5 / 2);
    expect(ring.radius + ring.strokeWidth / 2).toBeLessThan(halo.radius + halo.strokeWidth / 2);
  });
});
