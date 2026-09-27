import { describe, expect, it, vi } from "vitest";
import { IMPORT_DESKTOP_ONLY_MESSAGE, runInDesktop } from "./desktopOnly";

describe("runInDesktop", () => {
  it("en el navegador no llama a la acción", async () => {
    const action = vi.fn(async () => "archivo");
    await expect(runInDesktop(action, () => false)).resolves.toEqual({ kind: "browser" });
    expect(action).not.toHaveBeenCalled();
  });

  it("en la aplicación de escritorio devuelve lo que da la acción", async () => {
    await expect(runInDesktop(async () => "archivo", () => true)).resolves.toEqual({ kind: "done", value: "archivo" });
  });

  it("los errores de la acción llegan a quien llama, sin mirar su texto", async () => {
    const failing = async () => {
      throw new Error("sin diálogo");
    };
    await expect(runInDesktop(failing, () => true)).rejects.toThrow("sin diálogo");
  });

  it("por defecto pregunta a isTauri(): en node no hay Tauri", async () => {
    const action = vi.fn(async () => 1);
    await expect(runInDesktop(action)).resolves.toEqual({ kind: "browser" });
    expect(action).not.toHaveBeenCalled();
  });

  it("el aviso usa el texto del spec", () => {
    expect(IMPORT_DESKTOP_ONLY_MESSAGE).toBe("“Importar síntesis” solo funciona en la aplicación de escritorio.");
  });
});
