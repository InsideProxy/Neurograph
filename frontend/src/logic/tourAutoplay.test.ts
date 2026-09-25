import { describe, expect, it } from "vitest";
import {
  AUTOPLAY_MAX_MS,
  AUTOPLAY_STEP_MS,
  autoplayAfter,
  autoplayDelay,
  autoplayOnShow,
  autoplayTarget,
} from "./tourAutoplay";
import { TOUR_STEPS, stepDescription } from "./tourSteps";

const words = (count: number) => Array.from({ length: count }, () => "palabra").join(" ");

describe("▶ Automático (spec 5.10)", () => {
  it("unos 8 s por paso: un texto corto espera 8 s", () => {
    expect(AUTOPLAY_STEP_MS).toBe(8000);
    expect(autoplayDelay(words(10))).toBe(8000);
    expect(autoplayDelay("")).toBe(8000);
  });

  it("un paso largo espera lo que se tarda en leerlo, a 250 ms por palabra, y nunca más de 12 s", () => {
    expect(autoplayDelay(words(40))).toBe(10_000);
    expect(autoplayDelay(words(200))).toBe(AUTOPLAY_MAX_MS);
    expect(AUTOPLAY_MAX_MS).toBe(12_000);
  });

  it("el tour entero, con sus textos de verdad, dura unos dos minutos", () => {
    const LINUX = "X11; Linux";
    const advancing = TOUR_STEPS.slice(0, -1);
    const total = advancing.reduce(
      (sum, step) => sum + autoplayDelay(stepDescription(step, { withDemo: true, values: { peso: "1.0e-3" } }, LINUX)),
      0,
    );
    expect(total / 60_000).toBeGreaterThan(1.5);
    expect(total / 60_000).toBeLessThan(2.25);
    // Y de media, unos 8 o 9 s por paso.
    expect(total / advancing.length).toBeLessThan(10_000);
  });

  it("se pausa con cualquier otro control; su botón lo alterna y su propio avance lo mantiene", () => {
    expect(autoplayAfter(false, "toggle")).toBe(true);
    expect(autoplayAfter(true, "toggle")).toBe(false);
    expect(autoplayAfter(true, "auto")).toBe(true);
    for (const control of ["next", "prev", "key"] as const) {
      expect(autoplayAfter(true, control), control).toBe(false);
      expect(autoplayAfter(false, control), control).toBe(false);
    }
  });

  it("avanza al paso siguiente y se para en el último, que no se salta solo", () => {
    expect(autoplayTarget(0, 13)).toBe(1);
    expect(autoplayTarget(11, 13)).toBe(12);
    expect(autoplayTarget(12, 13)).toBeNull();
    expect(autoplayOnShow(true, 11, 13)).toBe(true);
    expect(autoplayOnShow(true, 12, 13)).toBe(false);
    expect(autoplayOnShow(false, 3, 13)).toBe(false);
  });
});
