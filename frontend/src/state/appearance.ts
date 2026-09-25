// Tema elegido y modo de la paleta de redes (D3 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 4.5). paletteMode null = automático:
// "original" con el tema 1 y "suave" con los demás (effectivePaletteMode, en
// theme/colors.ts). Cambiar de tema no borra un modo elegido a mano.
import { create } from "zustand";
import { isPaletteMode, type PaletteMode } from "../theme/colors";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "../theme/themes";

export interface Appearance {
  theme: ThemeId;
  paletteMode: PaletteMode | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const APPEARANCE_STORAGE_KEY = "neurograph.apariencia";
const DEFAULT_APPEARANCE: Appearance = { theme: DEFAULT_THEME, paletteMode: null };

export function readAppearance(storage: StorageLike | null): Appearance {
  if (!storage) return { ...DEFAULT_APPEARANCE };
  try {
    const raw = storage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APPEARANCE };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { ...DEFAULT_APPEARANCE };
    const { theme, paletteMode } = parsed as Record<string, unknown>;
    return {
      theme: isThemeId(theme) ? theme : DEFAULT_THEME,
      paletteMode: isPaletteMode(paletteMode) ? paletteMode : null,
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function writeAppearance(storage: StorageLike | null, value: Appearance): void {
  if (!storage) return;
  try {
    storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Sin almacenamiento (modo privado, cuota llena): la elección dura
    // solo esta sesión.
  }
}

export function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

// index.css define los colores de interfaz para cada data-theme.
export function applyThemeToDocument(theme: ThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

interface AppearanceState extends Appearance {
  setTheme: (theme: ThemeId) => void;
  setPaletteMode: (paletteMode: PaletteMode | null) => void;
}

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  ...readAppearance(browserStorage()),
  setTheme: (theme) => {
    set({ theme });
    writeAppearance(browserStorage(), { theme, paletteMode: get().paletteMode });
    applyThemeToDocument(theme);
  },
  // «Colores de las redes» en Ajustes (5.2). No toca el documento: los
  // colores de red no son variables CSS, los componentes los leen del store
  // con useDrawColors.
  setPaletteMode: (paletteMode) => {
    set({ paletteMode });
    writeAppearance(browserStorage(), { theme: get().theme, paletteMode });
  },
}));
