import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GraphNode } from "../types/domain";
import type { ValidatedSynthesis } from "../types/synthesis";
import { DRAW_TOKENS, type ThemeId } from "../theme/themes";
import { FunctionSynthesisTab } from "./FunctionSynthesisTab";

// Pruebas de marcado del diagrama de una síntesis de IA (decisión 71). Con
// renderToStaticMarkup, zustand da el estado inicial de cada store, así que
// el tema se elige aquí: useDrawColors devuelve los colores reales de ese
// tema, con su paleta automática.
const theme = vi.hoisted(() => ({ current: "grafito" as ThemeId }));
vi.mock("../theme/useDrawColors", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../theme/useDrawColors")>();
  const { effectivePaletteMode } = await import("../theme/colors");
  return {
    ...actual,
    useDrawColors: () => actual.drawColorsFor(theme.current, effectivePaletteMode(theme.current, null)),
  };
});

function node(id: string, abbreviation: string, x: number, y: number): GraphNode {
  return {
    id,
    label: `Area ${abbreviation}`,
    abbreviation,
    hemisphere: "L",
    network: "cole-anticevic.frontoparietal",
    position3d: [x, y, 0],
    referenceSpace: null,
  };
}

const A = node("region.human.hcp-mmp1.l_8c", "8C", -40, 20);
const B = node("region.human.hcp-mmp1.l_ifjp", "IFJp", -45, 10);

const VALIDATED: ValidatedSynthesis = {
  file: {
    schemaVersion: 1,
    function: "prueba",
    generatedBy: "prueba",
    atlasId: "atlas.human.hcp.mmp1_0",
    findings: [
      {
        id: "f1",
        summary: "Hallazgo de prueba.",
        evidenceType: "functional",
        regionIds: [A.id, B.id],
        networkSlug: null,
        citation: { authors: "Autor", year: 2026, title: "Título de prueba", journal: null, doi: null, url: null },
        agreesWith: null,
        conflictsWith: null,
      },
    ],
    notes: null,
  },
  resolvedNodes: { [A.id]: A, [B.id]: B },
  importedAt: "2026-09-26T00:00:00Z",
};

function nodeStrokes(themeId: ThemeId): string[] {
  theme.current = themeId;
  const html = renderToStaticMarkup(<FunctionSynthesisTab validated={VALIDATED} />);
  return [...html.matchAll(/<circle[^>]*\bstroke="([^"]+)"/g)].map((m) => m[1]);
}

describe("FunctionSynthesisTab", () => {
  it("en Claro, los nodos del diagrama llevan el anillo neutro y no el blanco del panel (D12)", () => {
    expect(nodeStrokes("claro")).toEqual([DRAW_TOKENS.claro.nodeRing, DRAW_TOKENS.claro.nodeRing]);
  });

  it("en Original, conservan el contorno de antes del rediseño (D3)", () => {
    expect(nodeStrokes("original")).toEqual(["#0b0c10", "#0b0c10"]);
  });
});
