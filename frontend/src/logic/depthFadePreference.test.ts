import { describe, expect, it } from "vitest";
import type { StorageLike } from "../state/appearance";
import { DEPTH_FADE_STORAGE_KEY, readDepthFadePreference, writeDepthFadePreference } from "./depthFadePreference";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const failingStorage: StorageLike = {
  getItem: () => {
    throw new Error("sin acceso");
  },
  setItem: () => {
    throw new Error("sin acceso");
  },
};

describe("preferencia de la atenuación por profundidad", () => {
  it("activada por defecto: sin almacenamiento, sin valor guardado o con uno que no se entiende", () => {
    expect(readDepthFadePreference(null)).toBe(true);
    expect(readDepthFadePreference(memoryStorage())).toBe(true);
    expect(readDepthFadePreference(memoryStorage({ [DEPTH_FADE_STORAGE_KEY]: "quizá" }))).toBe(true);
  });

  it("se guarda y se vuelve a leer", () => {
    const storage = memoryStorage();
    writeDepthFadePreference(storage, false);
    expect(storage.data[DEPTH_FADE_STORAGE_KEY]).toBe("false");
    expect(readDepthFadePreference(storage)).toBe(false);
    writeDepthFadePreference(storage, true);
    expect(readDepthFadePreference(storage)).toBe(true);
  });

  it("si el almacenamiento falla, activada y sin errores", () => {
    expect(readDepthFadePreference(failingStorage)).toBe(true);
    expect(() => writeDepthFadePreference(failingStorage, false)).not.toThrow();
    expect(() => writeDepthFadePreference(null, false)).not.toThrow();
  });
});
