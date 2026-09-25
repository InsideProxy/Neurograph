import { describe, expect, it } from "vitest";
import * as d3 from "d3";
import {
  HEMISPHERE_ARC_CLEARANCE,
  HEMISPHERE_ARC_GAP,
  HEMISPHERE_ARC_OFFSET,
  HEMISPHERE_ARC_WIDTH,
  RING_MARGIN,
  SELECTION_HALO_GAP,
  SELECTION_HALO_OPACITY,
  arcLabelSides,
  arcPath,
  estimatedLabelWidth,
  hemisphereArcs,
  hemisphereBlocks,
  labelReach,
  labelTransform,
  radialLabel,
  ringLayout,
  selectionHalo,
  type Hemisphere,
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

// Los ángulos de pantalla de `count` nodos, como en components/Connectogram.tsx.
function screenAngles(count: number): { angleOf: (index: number) => number; step: number } {
  const scale = d3.scalePoint<number>().domain(d3.range(count)).range([0, 2 * Math.PI]).padding(0.5);
  return { angleOf: (index) => (scale(index) ?? 0) - Math.PI / 2, step: scale.step() };
}

const repeat = (hemisphere: Hemisphere, count: number): Hemisphere[] => Array.from({ length: count }, () => hemisphere);

describe("hemisphereBlocks", () => {
  it("un bloque seguido por hemisferio, como en HCP-MMP1.0 (primero el derecho)", () => {
    expect(hemisphereBlocks([...repeat("R", 180), ...repeat("L", 180)])).toEqual([
      { hemisphere: "R", first: 0, last: 179 },
      { hemisphere: "L", first: 180, last: 359 },
    ]);
  });

  it("el círculo se cierra: un bloque puede pasar por el principio del orden", () => {
    expect(hemisphereBlocks(["L", "R", "R", "L"])).toEqual([
      { hemisphere: "R", first: 1, last: 2 },
      { hemisphere: "L", first: 3, last: 0 },
    ]);
  });

  it("sin arcos si los hemisferios alternan, si alguno no tiene hemisferio o si solo hay uno", () => {
    expect(hemisphereBlocks(["R", "L", "R", "L"])).toBeNull();
    expect(hemisphereBlocks(["R", "R", null, "L"])).toBeNull();
    expect(hemisphereBlocks(["R", "R", "R"])).toBeNull();
    expect(hemisphereBlocks([])).toBeNull();
  });
});

describe("hemisphereArcs", () => {
  it("cada arco va del borde de su primer nodo al de su último, menos 4° a cada lado", () => {
    const { angleOf, step } = screenAngles(360);
    const arcs = hemisphereArcs(hemisphereBlocks([...repeat("R", 180), ...repeat("L", 180)])!, 360, angleOf, step);
    expect(arcs.map((arc) => arc.hemisphere)).toEqual(["R", "L"]);
    expect(arcs[0].start).toBeCloseTo(-Math.PI / 2 + HEMISPHERE_ARC_GAP);
    expect(arcs[0].end).toBeCloseTo(Math.PI / 2 - HEMISPHERE_ARC_GAP);
    expect(arcs[1].start).toBeCloseTo(Math.PI / 2 + HEMISPHERE_ARC_GAP);
    expect(arcs[1].end).toBeCloseTo((3 * Math.PI) / 2 - HEMISPHERE_ARC_GAP);
  });

  it("con un bloque que pasa por el principio, su arco también; y con uno muy corto, la separación se acorta", () => {
    const four = screenAngles(4);
    const [, left] = hemisphereArcs(hemisphereBlocks(["L", "R", "R", "L"])!, 4, four.angleOf, four.step);
    expect(left.end - left.start).toBeCloseTo(Math.PI - 2 * HEMISPHERE_ARC_GAP);
    const many = screenAngles(360);
    const [single] = hemisphereArcs([{ hemisphere: "R", first: 5, last: 5 }], 360, many.angleOf, many.step);
    expect(single.end - single.start).toBeCloseTo(many.step / 2);
  });
});

describe("arcPath", () => {
  it("dibuja el arco en el sentido de las agujas del reloj, con la bandera de arco grande cuando pasa de media vuelta", () => {
    expect(arcPath(100, 100, 50, -Math.PI / 2, Math.PI / 2)).toBe("M 100 50 A 50 50 0 0 1 100 150");
    expect(arcPath(100, 100, 50, 0, (3 * Math.PI) / 2)).toBe("M 150 100 A 50 50 0 1 1 100 50");
  });
});

describe("arcLabelSides", () => {
  const { angleOf, step } = screenAngles(360);
  const arcsOf = (hemispheres: Hemisphere[]) => hemisphereArcs(hemisphereBlocks(hemispheres)!, hemispheres.length, angleOf, step);

  it("cada rótulo va en la esquina del lado en que queda su arco", () => {
    const hcp = arcLabelSides(arcsOf([...repeat("R", 180), ...repeat("L", 180)]));
    expect([hcp.get("R"), hcp.get("L")]).toEqual(["right", "left"]);
    const reversed = arcLabelSides(arcsOf([...repeat("L", 180), ...repeat("R", 180)]));
    expect([reversed.get("L"), reversed.get("R")]).toEqual(["right", "left"]);
  });

  it("si los dos arcos quedan igual de centrados, el izquierdo a la izquierda", () => {
    const sides = arcLabelSides([
      { hemisphere: "R", start: -Math.PI / 2, end: Math.PI / 2 + Math.PI },
      { hemisphere: "L", start: Math.PI / 2 - 0.1, end: Math.PI / 2 + 0.1 },
    ]);
    expect([sides.get("L"), sides.get("R")]).toEqual(["left", "right"]);
  });
});

// El margen del anillo incluye los arcos, por fuera de las etiquetas
// (decisión del usuario del 25/09/2026).
describe("ringLayout con arcos de hemisferio", () => {
  it("con las etiquetas de HCP-MMP1.0, a 34 px del anillo, por fuera de las etiquetas en reposo, y el círculo como sin ellos", () => {
    const withArcs = ringLayout({ size: 666, labels: HCP, nodeRadius: 3, fontSize: 5.5, fitLabels: true, withArcs: true });
    const without = ringLayout({ size: 666, labels: HCP, nodeRadius: 3, fontSize: 5.5, fitLabels: true });
    expect(withArcs.arcOffset).toBe(HEMISPHERE_ARC_OFFSET);
    expect(withArcs.arcOffset - HEMISPHERE_ARC_WIDTH / 2).toBeGreaterThan(labelReach(HCP, 3, 5.5).rest);
    expect(withArcs.radius).toBe(without.radius);
  });

  it("con etiquetas largas, se apartan hasta quedar por fuera de ellas, y el margen los incluye", () => {
    const labels = [...Array.from({ length: 199 }, () => "l_visual_1"), "r_frontoparietal_20"];
    const ring = ringLayout({ size: 666, labels, nodeRadius: 3, fontSize: 5.5, fitLabels: true, withArcs: true });
    expect(ring.arcOffset).toBeGreaterThan(HEMISPHERE_ARC_OFFSET);
    expect(ring.arcOffset).toBeCloseTo(labelReach(labels, 3, 5.5).rest + HEMISPHERE_ARC_CLEARANCE);
    expect(ring.arcOffset + HEMISPHERE_ARC_WIDTH / 2).toBeLessThanOrEqual(666 / 2 - ring.radius);
  });

  it("en la miniatura, a 34 px del anillo de siempre", () => {
    const ring = ringLayout({ size: 200, labels: ["r_frontoparietal_20"], nodeRadius: 6, fontSize: 9, fitLabels: false, withArcs: true });
    expect(ring).toEqual({ radius: 200 / 2 - RING_MARGIN, arcOffset: HEMISPHERE_ARC_OFFSET });
  });

  it("con el círculo en su mínimo, los arcos no se salen del dibujo", () => {
    const ring = ringLayout({ size: 320, labels: ["r_ventraldiencephalon"], nodeRadius: 6, fontSize: 9, fitLabels: true, withArcs: true });
    expect(ring.radius).toBe((320 / 2 - RING_MARGIN) / 2);
    expect(ring.radius + ring.arcOffset + HEMISPHERE_ARC_WIDTH / 2).toBeLessThanOrEqual(320 / 2);
  });
});
