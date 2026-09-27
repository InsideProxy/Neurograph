import { describe, expect, it } from "vitest";
import { fittedWidth } from "./exportImage";

// Ancho de la leyenda exportada con fitWidthToContent (D3 de
// docs/decisiones-diseno.md). La medida en el navegador se comprueba en la
// aplicación real; aquí, solo la cuenta.
describe("fittedWidth", () => {
  it("nunca estrecha el ancho de partida", () => {
    expect(fittedWidth(260, 100)).toBe(260);
    expect(fittedWidth(260, 250)).toBe(260);
    expect(fittedWidth(260, 0)).toBe(260);
  });

  it("ensancha hasta el contenido más el margen, redondeando hacia arriba", () => {
    // 397,4 es el borde derecho medido de «TPOJ1 — Area TemporoParietoOccipital
    // Junction 1 (hemisferio izquierdo)» con la fuente de la exportación.
    expect(fittedWidth(260, 397.4)).toBe(408);
    expect(fittedWidth(260, 250.01)).toBe(261);
    expect(fittedWidth(260, 300.2, 0)).toBe(301);
  });

  it("devuelve el ancho de partida si la medida no es un número finito", () => {
    expect(fittedWidth(260, Number.NaN)).toBe(260);
    expect(fittedWidth(260, Number.POSITIVE_INFINITY)).toBe(260);
    expect(fittedWidth(260, Number.NEGATIVE_INFINITY)).toBe(260);
  });
});
