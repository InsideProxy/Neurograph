import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPEARANCE_STORAGE_KEY,
  readAppearance,
  useAppearanceStore,
  writeAppearance,
  type StorageLike,
} from "./appearance";

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

const brokenStorage: StorageLike = {
  getItem: () => {
    throw new Error("sin acceso");
  },
  setItem: () => {
    throw new Error("sin acceso");
  },
};

describe("readAppearance", () => {
  it("sin almacenamiento o sin valor guardado, Grafito y paleta automática", () => {
    expect(readAppearance(null)).toEqual({ theme: "grafito", paletteMode: null });
    expect(readAppearance(memoryStorage())).toEqual({ theme: "grafito", paletteMode: null });
  });

  it("lee lo guardado", () => {
    const storage = memoryStorage({ [APPEARANCE_STORAGE_KEY]: '{"theme":"claro","paletteMode":"original"}' });
    expect(readAppearance(storage)).toEqual({ theme: "claro", paletteMode: "original" });
  });

  it("descarta valores inválidos campo a campo", () => {
    const storage = memoryStorage({ [APPEARANCE_STORAGE_KEY]: '{"theme":"azul","paletteMode":"suave"}' });
    expect(readAppearance(storage)).toEqual({ theme: "grafito", paletteMode: "suave" });
    const badMode = memoryStorage({ [APPEARANCE_STORAGE_KEY]: '{"theme":"noche","paletteMode":"vivo"}' });
    expect(readAppearance(badMode)).toEqual({ theme: "noche", paletteMode: null });
  });

  it("un JSON roto o un almacenamiento que falla no rompen nada", () => {
    expect(readAppearance(memoryStorage({ [APPEARANCE_STORAGE_KEY]: "{no es json" }))).toEqual({
      theme: "grafito",
      paletteMode: null,
    });
    expect(readAppearance(brokenStorage)).toEqual({ theme: "grafito", paletteMode: null });
  });
});

describe("writeAppearance", () => {
  it("guarda y se puede volver a leer", () => {
    const storage = memoryStorage();
    writeAppearance(storage, { theme: "noche", paletteMode: null });
    expect(readAppearance(storage)).toEqual({ theme: "noche", paletteMode: null });
  });

  it("no lanza si el almacenamiento falla", () => {
    expect(() => writeAppearance(brokenStorage, { theme: "noche", paletteMode: null })).not.toThrow();
  });
});

// Sin window ni document (node), el store no guarda nada ni toca el
// documento: la primera prueba mira solo el estado. La segunda simula los
// dos con vi.stubGlobal para comprobar que setTheme guarda y aplica el
// tema.
describe("useAppearanceStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("cambiar de tema conserva el modo de paleta elegido (spec 4.5)", () => {
    useAppearanceStore.setState({ theme: "grafito", paletteMode: "original" });
    useAppearanceStore.getState().setTheme("claro");
    expect(useAppearanceStore.getState()).toMatchObject({ theme: "claro", paletteMode: "original" });
  });

  it("setTheme guarda en localStorage (con paletteMode) y aplica data-theme al documento", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("document", { documentElement: { dataset: {} as Record<string, string> } });

    useAppearanceStore.setState({ theme: "grafito", paletteMode: "original" });
    useAppearanceStore.getState().setTheme("claro");

    expect(JSON.parse(storage.data[APPEARANCE_STORAGE_KEY])).toEqual({ theme: "claro", paletteMode: "original" });
    expect(document.documentElement.dataset.theme).toBe("claro");
  });

  it("setPaletteMode guarda la elección con el tema actual, sin cambiar el tema; null vuelve a «Automática»", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage });

    useAppearanceStore.setState({ theme: "noche", paletteMode: null });
    useAppearanceStore.getState().setPaletteMode("original");
    expect(useAppearanceStore.getState()).toMatchObject({ theme: "noche", paletteMode: "original" });
    expect(JSON.parse(storage.data[APPEARANCE_STORAGE_KEY])).toEqual({ theme: "noche", paletteMode: "original" });

    useAppearanceStore.getState().setPaletteMode(null);
    expect(useAppearanceStore.getState()).toMatchObject({ theme: "noche", paletteMode: null });
    expect(JSON.parse(storage.data[APPEARANCE_STORAGE_KEY])).toEqual({ theme: "noche", paletteMode: null });
  });
});
