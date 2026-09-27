import { describe, expect, it } from "vitest";
import type { GraphNode } from "../types/domain";
import { hiddenSelectedNodes, hiddenSelectionText } from "./hiddenSelection";

const node = (id: string, label: string, network: string): GraphNode => ({
  id,
  label,
  abbreviation: null,
  hemisphere: null,
  network,
  position3d: [0, 0, 0],
  referenceSpace: null,
});

const AUDITORY = "cole-anticevic.auditory";
const VISUAL2 = "cole-anticevic.visual2";
const DEFAULT = "cole-anticevic.default";
const LANGUAGE = "cole-anticevic.language";
const SOMATOMOTOR = "cole-anticevic.somatomotor";

const NODES = [
  node("ta2", "Area TA2", AUDITORY),
  node("a4", "Auditory 4 Complex", AUDITORY),
  node("v2", "Second Visual Area", VISUAL2),
  node("te1m", "Area TE1 Middle", DEFAULT),
  node("avi", "Anterior Ventral Insular Area", LANGUAGE),
];

describe("hiddenSelectedNodes", () => {
  it("devuelve solo las seleccionadas de una red oculta, por orden alfabético", () => {
    const hidden = hiddenSelectedNodes(new Set(["v2", "te1m", "ta2", "a4"]), NODES, new Set([AUDITORY, VISUAL2]));
    expect(hidden.map((n) => n.id)).toEqual(["ta2", "a4", "v2"]);
  });

  it("no cuenta las de una red visible ni las ocultas sin seleccionar", () => {
    expect(hiddenSelectedNodes(new Set(["te1m", "avi"]), NODES, new Set([AUDITORY]))).toEqual([]);
  });

  it("no cuenta los ids que no están cargados", () => {
    expect(hiddenSelectedNodes(new Set(["otro_atlas"]), NODES, new Set([AUDITORY]))).toEqual([]);
  });
});

describe("hiddenSelectionText", () => {
  it("sin ninguna oculta no dice nada", () => {
    expect(hiddenSelectionText([], 3)).toBeNull();
    expect(hiddenSelectionText([], 0)).toBeNull();
  });

  it("tras las que se ven, cuenta las ocultas y nombra su red", () => {
    expect(hiddenSelectionText(NODES.slice(0, 2), 3)).toBe("2 más ocultas por el filtro de redes (Auditiva)");
    expect(hiddenSelectionText(NODES.slice(0, 1), 3)).toBe("1 más oculta por el filtro de redes (Auditiva)");
  });

  it("nombra hasta tres redes, en orden alfabético y sin la clasificación", () => {
    expect(hiddenSelectionText([NODES[2], NODES[3], NODES[0]], 1)).toBe(
      "3 más ocultas por el filtro de redes (Auditiva, Por defecto y Visual 2)",
    );
  });

  it("con más de tres redes, solo cuántas", () => {
    const four = [...NODES.slice(0, 4), node("m1", "Primary Motor Cortex", SOMATOMOTOR)];
    expect(hiddenSelectionText(four, 2)).toBe("5 más ocultas por el filtro de redes (4 redes)");
  });

  it("si no se ve ninguna, cuenta la selección entera y dice que está oculta", () => {
    expect(hiddenSelectionText(NODES.slice(0, 3), 0)).toBe(
      "3 regiones seleccionadas, todas ocultas por el filtro de redes (Auditiva y Visual 2)",
    );
    expect(hiddenSelectionText(NODES.slice(0, 1), 0)).toBe("1 región seleccionada, oculta por el filtro de redes (Auditiva)");
  });
});
