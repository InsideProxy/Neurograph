// La preparación antes de dev y build (H5): el orden de los pasos, el
// silencio cuando no hay nada que hacer y cómo para si algo falla. Con
// pasos de prueba, sin tocar node_modules ni ejecutar npm.
import { afterEach, describe, expect, it, vi } from "vitest";
import { npmDependencies } from "./npm-deps.mjs";
import { STEPS, prepare } from "./prepare.mjs";

// Un paso de prueba: `line` es lo que tiene pendiente (null: nada) y
// `status`, lo que devuelve al hacerlo. Apunta en `calls` lo que se le pide.
function step(name, line, status, calls) {
  return {
    pending: () => {
      calls.push(`${name}: ¿pendiente?`);
      return line;
    },
    run: () => {
      calls.push(`${name}: hecho`);
      return status;
    },
  };
}

// Lo que se imprime: console.log a `calls` y console.error aparte.
function captureOutput(calls) {
  vi.spyOn(console, "log").mockImplementation((line) => calls.push(line));
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("prepare: los pasos antes de dev y build", () => {
  it("el primer paso son las dependencias de npm", () => {
    expect(STEPS[0]).toBe(npmDependencies);
  });

  it("sin nada que hacer no dice nada, no ejecuta nada y sale con 0", () => {
    const calls = [];
    const error = captureOutput(calls);
    expect(prepare([step("a", null, 0, calls), step("b", null, 0, calls)])).toBe(0);
    expect(calls).toEqual(["a: ¿pendiente?", "b: ¿pendiente?"]);
    expect(error).not.toHaveBeenCalled();
  });

  it("un paso con algo que hacer dice su línea antes de hacerlo, y los demás siguen en orden", () => {
    const calls = [];
    captureOutput(calls);
    const steps = [step("a", "Haciendo a…", 0, calls), step("b", null, 0, calls), step("c", "Haciendo c…", 0, calls)];
    expect(prepare(steps)).toBe(0);
    expect(calls).toEqual([
      "a: ¿pendiente?",
      "Haciendo a…",
      "a: hecho",
      "b: ¿pendiente?",
      "c: ¿pendiente?",
      "Haciendo c…",
      "c: hecho",
    ]);
  });

  it("si un paso falla, para ahí con su código: ni los pasos siguientes ni Vite", () => {
    const calls = [];
    captureOutput(calls);
    expect(prepare([step("a", "Haciendo a…", 7, calls), step("b", "Haciendo b…", 0, calls)])).toBe(7);
    expect(calls).toEqual(["a: ¿pendiente?", "Haciendo a…", "a: hecho"]);
  });

  it("un paso que no devuelve un número también para, con 1", () => {
    const calls = [];
    captureOutput(calls);
    expect(prepare([step("a", "Haciendo a…", undefined, calls), step("b", "Haciendo b…", 0, calls)])).toBe(1);
    expect(calls).not.toContain("b: ¿pendiente?");
  });

  it("si un paso lanza un error, al mirar qué falta o al hacerlo, dice su mensaje y para con 1", () => {
    const calls = [];
    const error = captureOutput(calls);
    const unreadable = {
      pending: () => {
        throw new Error("No se puede leer package-lock.json: Unexpected token");
      },
      run: () => 0,
    };
    expect(prepare([unreadable, step("b", "Haciendo b…", 0, calls)])).toBe(1);
    expect(error).toHaveBeenCalledWith("No se puede leer package-lock.json: Unexpected token");
    expect(calls).toEqual([]);

    const noNpm = {
      pending: () => "Instalando las dependencias de npm que faltan…",
      run: () => {
        throw new Error("No se pudo ejecutar npm: spawn sh ENOENT");
      },
    };
    expect(prepare([noNpm, step("b", "Haciendo b…", 0, calls)])).toBe(1);
    expect(error).toHaveBeenLastCalledWith("No se pudo ejecutar npm: spawn sh ENOENT");
    expect(calls).toEqual(["Instalando las dependencias de npm que faltan…"]);
  });
});
