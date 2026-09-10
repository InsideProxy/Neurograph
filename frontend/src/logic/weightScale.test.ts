import { describe, expect, it } from "vitest";
import {
  LOG_MAX_WEIGHT,
  LOG_MIN_WEIGHT,
  formatMinWeight,
  sliderPositionToWeight,
  weightToSliderPosition,
} from "./weightScale";

describe("sliderPositionToWeight / weightToSliderPosition", () => {
  it("la posición 0 es siempre 'sin filtro' (peso 0)", () => {
    expect(sliderPositionToWeight(0)).toBe(0);
    expect(weightToSliderPosition(0)).toBe(0);
  });

  it("la posición 1 corresponde al peso máximo real", () => {
    expect(sliderPositionToWeight(1)).toBeCloseTo(LOG_MAX_WEIGHT, 10);
    expect(weightToSliderPosition(LOG_MAX_WEIGHT)).toBeCloseTo(1, 10);
  });

  it("un peso por debajo del mínimo real se satura a la posición 0, nunca negativa", () => {
    expect(weightToSliderPosition(LOG_MIN_WEIGHT / 10)).toBe(
      weightToSliderPosition(LOG_MIN_WEIGHT)
    );
    expect(weightToSliderPosition(1e-12)).toBeGreaterThanOrEqual(0);
  });

  it("un peso por encima del máximo real se satura a la posición 1", () => {
    expect(weightToSliderPosition(5)).toBe(1);
  });

  it("es una escala logarítmica monótona creciente (más posición = más peso)", () => {
    const positions = [0.1, 0.3, 0.5, 0.7, 0.9];
    const weights = positions.map(sliderPositionToWeight);
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeGreaterThan(weights[i - 1]);
    }
  });

  it("weightToSliderPosition deshace sliderPositionToWeight (ida y vuelta)", () => {
    for (const p of [0.05, 0.25, 0.5, 0.75, 0.95]) {
      const w = sliderPositionToWeight(p);
      expect(weightToSliderPosition(w)).toBeCloseTo(p, 6);
    }
  });

  it("el peso real máximo observado de Rosen & Halgren (0.144) cae claramente por debajo del tope de la escala", () => {
    // No es una prueba de los datos en sí (eso vive en el pipeline de
    // ingesta, ver rosen_halgren2021_mmp1_connectome.py) -- solo
    // comprueba que la escala elegida deja margen real por encima del
    // máximo ya verificado, en vez de recortarlo por accidente.
    const position = weightToSliderPosition(0.144);
    expect(position).toBeLessThan(1);
    expect(position).toBeGreaterThan(0);
  });
});

describe("formatMinWeight", () => {
  it("formatea 'sin filtro' para peso 0", () => {
    expect(formatMinWeight(0)).toBe("0 (sin filtro, se muestra todo)");
  });

  it("usa dos decimales fijos por encima de 0.01", () => {
    expect(formatMinWeight(0.3)).toBe("0.30");
    expect(formatMinWeight(0.05)).toBe("0.05");
  });

  it("usa notación exponencial por debajo de 0.01, para no confundir pesos reales distintos", () => {
    const a = formatMinWeight(0.0001);
    const b = formatMinWeight(0.003);
    expect(a).not.toBe(b);
    expect(a).toBe((0.0001).toExponential(1));
  });
});
