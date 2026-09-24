import { describe, expect, it } from "vitest";
import {
  TOP_BAR_COLLAPSE_STEPS,
  collapseAttribute,
  fitSignature,
  fitTopBar,
  smallestFittingLevel,
  tabAfterClosing,
  type FittableBar,
} from "./topBarFit";

describe("collapseAttribute", () => {
  it("pliega por orden: el estado de los datos, Importar, las síntesis y al final las vistas", () => {
    expect(TOP_BAR_COLLAPSE_STEPS).toEqual(["status", "import", "synthesis", "tabs"]);
    expect(collapseAttribute(0)).toBe("");
    expect(collapseAttribute(1)).toBe("status");
    expect(collapseAttribute(2)).toBe("status import");
    expect(collapseAttribute(4)).toBe("status import synthesis tabs");
  });

  it("satura fuera de rango: un nivel negativo no pliega nada, y uno de más se queda en el último paso", () => {
    expect(collapseAttribute(-3)).toBe("");
    expect(collapseAttribute(99)).toBe("status import synthesis tabs");
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

  it("al cerrar la primera de varias síntesis, pasa a la que ocupa su sitio", () => {
    expect(tabAfterClosing(TABS, "s1")).toBe("s2");
  });

  it("sin más síntesis, a la primera pestaña (Atlas); una pestaña que no se cierra, a ninguna", () => {
    expect(tabAfterClosing(TABS.slice(0, 3), "s1")).toBe("atlas");
    expect(tabAfterClosing(TABS, "species")).toBeNull();
  });

  it("un id que no está entre las pestañas, a ninguna", () => {
    expect(tabAfterClosing(TABS, "no-existe")).toBeNull();
  });
});

describe("fitTopBar", () => {
  // Barra de mentira: mismo contrato que un HTMLElement real (clientWidth,
  // scrollWidth, innerHTML, dataset), sin DOM. scrollWidth fijo -- no
  // depende del nivel probado -- basta para probar el salto de firma, el
  // forzado y la elección del último nivel.
  function fakeBar(overrides: Partial<{ clientWidth: number; scrollWidth: number; innerHTML: string }> = {}): FittableBar {
    return { clientWidth: 1000, scrollWidth: 1000, innerHTML: "<div>contenido</div>", dataset: {}, ...overrides };
  }

  it("sin cambios en el ancho ni el contenido, no vuelve a medir (devuelve null)", () => {
    const bar = fakeBar();
    expect(fitTopBar(bar, undefined)).toBe(0);
    expect(fitTopBar(bar, fitSignature(bar))).toBeNull();
  });

  it("con force, mide aunque la firma no haya cambiado", () => {
    const bar = fakeBar();
    const signature = fitSignature(bar);
    expect(fitTopBar(bar, signature, true)).toBe(0);
  });

  it("si no cabe con ningún nivel, aplica el último y lo deja en dataset.collapse", () => {
    const bar = fakeBar({ scrollWidth: 2000 });
    expect(fitTopBar(bar, undefined)).toBe(4);
    expect(bar.dataset.collapse).toBe("status import synthesis tabs");
  });
});
