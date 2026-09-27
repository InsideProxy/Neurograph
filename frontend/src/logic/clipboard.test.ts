import { describe, expect, it } from "vitest";
import { copyShortcutLabel, copyText } from "./clipboard";

describe("copyText", () => {
  it("copia y devuelve true", async () => {
    const written: string[] = [];
    const clipboard = {
      writeText: async (text: string) => {
        written.push(text);
      },
    };
    await expect(copyText("region.human.hcp-mmp1.r_ifja", clipboard)).resolves.toBe(true);
    expect(written).toEqual(["region.human.hcp-mmp1.r_ifja"]);
  });

  it("si el portapapeles falla, devuelve false sin lanzar", async () => {
    const clipboard = {
      writeText: async () => {
        throw new Error("permiso denegado");
      },
    };
    await expect(copyText("x", clipboard)).resolves.toBe(false);
  });

  it("sin portapapeles (contexto no seguro), devuelve false", async () => {
    await expect(copyText("x", undefined)).resolves.toBe(false);
  });
});

describe("copyShortcutLabel", () => {
  it("⌘C en macOS y Ctrl+C en los demás sistemas", () => {
    expect(copyShortcutLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15")).toBe("⌘C");
    expect(copyShortcutLabel("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")).toBe("Ctrl+C");
  });
});
