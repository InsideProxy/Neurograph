import { describe, expect, it } from "vitest";
import { TOP_BAR_COLLAPSE_STEPS, collapseAttribute, smallestFittingLevel, tabAfterClosing } from "./topBarFit";

describe("collapseAttribute", () => {
  it("pliega por orden: el estado de los datos, Importar, las síntesis y al final las vistas", () => {
    expect(TOP_BAR_COLLAPSE_STEPS).toEqual(["status", "import", "synthesis", "tabs"]);
    expect(collapseAttribute(0)).toBe("");
    expect(collapseAttribute(1)).toBe("status");
    expect(collapseAttribute(2)).toBe("status import");
    expect(collapseAttribute(4)).toBe("status import synthesis tabs");
  });
});

describe("smallestFittingLevel", () => {
  it("si cabe sin plegar nada, se queda en el nivel 0", () => {
    expect(smallestFittingLevel(() => true)).toBe(0);
  });

  it("se queda en el primer nivel que cabe, sin probar los siguientes", () => {
    const tried: number[] = [];
    const level = smallestFittingLevel((n) => {
      tried.push(n);
      return n >= 1;
    });
    expect(level).toBe(1);
    expect(tried).toEqual([0, 1]);
  });

  it("si no cabe con ninguno, el último, que ni se prueba", () => {
    const tried: number[] = [];
    const level = smallestFittingLevel((n) => {
      tried.push(n);
      return false;
    });
    expect(level).toBe(4);
    expect(tried).toEqual([0, 1, 2, 3]);
  });
});

describe("tabAfterClosing", () => {
  const noop = () => {};
  const TABS = [
    { id: "atlas" },
    { id: "species" },
    { id: "s1", onClose: noop },
    { id: "s2", onClose: noop },
    { id: "s3", onClose: noop },
  ];

  it("el foco pasa a la síntesis que ocupa su sitio, o a la anterior si era la última", () => {
    expect(tabAfterClosing(TABS, "s2")).toBe("s3");
    expect(tabAfterClosing(TABS, "s3")).toBe("s2");
  });

  it("sin más síntesis, a la primera pestaña (Atlas); una pestaña que no se cierra, a ninguna", () => {
    expect(tabAfterClosing(TABS.slice(0, 3), "s1")).toBe("atlas");
    expect(tabAfterClosing(TABS, "species")).toBeNull();
  });
});
