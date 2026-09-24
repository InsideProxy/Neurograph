// Temas de NeuroGraph (decisión 77; docs/rediseno-interfaz-diseno.md,
// secciones 4.1 y 4.2). Los colores de interfaz viven en index.css, un
// bloque por `data-theme`. Aquí están los de DIBUJO: lo que se pinta dentro
// de los SVG y del lienzo 3D, que no pueden leer variables CSS. En
// "original" son exactamente los valores de hoy (constantes de la decisión
// 18 y valores que antes estaban sueltos en cada componente).
import {
  ACCENT_SELECTED_COLOR,
  HOMOLOGY_HIGHLIGHT_COLOR,
  HOVER_HIGHLIGHT_COLOR,
  INTER_HEMISPHERE_COLOR,
  INTRA_HEMISPHERE_COLOR,
  NEUTRAL_COLOR,
} from "./networks";

export const THEME_IDS = ["original", "grafito", "noche", "claro"] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME: ThemeId = "grafito";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export interface ThemeInfo {
  number: number;
  name: string;
  description: string;
}

export const THEME_INFO: Readonly<Record<ThemeId, Readonly<ThemeInfo>>> = {
  original: {
    number: 1,
    name: "Original",
    description: "Los colores de siempre de NeuroGraph",
  },
  grafito: {
    number: 2,
    name: "Grafito",
    description: "Oscuro neutro, tonos suaves",
  },
  noche: {
    number: 3,
    name: "Noche",
    description: "Oscuro azulado, algo más de intensidad",
  },
  claro: {
    number: 4,
    name: "Claro",
    description: "Fondo claro, como la imagen exportada",
  },
};

// sRGB 0-1, no lineal: así "original" conserva exactamente los grises de
// hoy de logic/surfaceParcels.ts (0,35 / 0,72 / 0,25 / 0,55).
export type Srgb = readonly [number, number, number];

export interface DrawTokens {
  edge: string;
  edgeOpacityConnectogram: number;
  edgeOpacityHemispheres: number;
  edgeOpacity3d: number;
  edgeOpacityHoverOther: number;
  edgeOpacityHoverSelected: number;
  edgeOpacitySelected: number;
  dash: string;
  selected: string;
  hoverHighlight: string;
  label: string;
  nodeRing: string;
  // Contorno oscuro de los nodos del diagrama de síntesis de IA.
  nodeGap: string;
  intra: string;
  inter: string;
  hemiFill: string;
  homology: string;
  sceneBg: string;
  cortexSulcus: Srgb;
  cortexGyrus: Srgb;
  cortexMedialWall: Srgb;
  cortexNoData: Srgb;
}

type KeysOfType<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];
// Tokens que son un color (sirven para fill/stroke) y tokens que son una opacidad.
export type PaintToken = Exclude<KeysOfType<DrawTokens, string>, "dash">;
export type OpacityToken = KeysOfType<DrawTokens, number>;

function gray(value: number): Srgb {
  return [value, value, value];
}

export function hexToSrgb(hex: string): Srgb {
  if (!/^#?[0-9a-f]{6}$/i.test(hex)) throw new Error(`hexToSrgb: color no válido "${hex}" (se espera #rrggbb)`);
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export const DRAW_TOKENS: Readonly<Record<ThemeId, Readonly<DrawTokens>>> = {
  original: {
    edge: NEUTRAL_COLOR,
    edgeOpacityConnectogram: 0.55,
    edgeOpacityHemispheres: 0.6,
    edgeOpacity3d: 0.55,
    edgeOpacityHoverOther: 0.12,
    edgeOpacityHoverSelected: 0.45,
    edgeOpacitySelected: 0.95,
    dash: "6 4",
    selected: ACCENT_SELECTED_COLOR,
    hoverHighlight: HOVER_HIGHLIGHT_COLOR,
    label: NEUTRAL_COLOR,
    nodeRing: NEUTRAL_COLOR,
    nodeGap: "#0b0c10",
    intra: INTRA_HEMISPHERE_COLOR,
    inter: INTER_HEMISPHERE_COLOR,
    hemiFill: "none",
    homology: HOMOLOGY_HIGHLIGHT_COLOR,
    sceneBg: "#1d1e26",
    cortexSulcus: gray(0.35),
    cortexGyrus: gray(0.72),
    cortexMedialWall: gray(0.25),
    cortexNoData: gray(0.55),
  },
  grafito: {
    edge: "#8b93a0",
    edgeOpacityConnectogram: 0.24,
    edgeOpacityHemispheres: 0.3,
    edgeOpacity3d: 0.55,
    edgeOpacityHoverOther: 0.08,
    edgeOpacityHoverSelected: 0.4,
    edgeOpacitySelected: 0.95,
    dash: "3 3",
    selected: "#f1f3f6",
    hoverHighlight: "#ffd84a",
    label: "#8d95a3",
    nodeRing: "#8b93a0",
    nodeGap: "#0f1115",
    intra: "#6cc497",
    inter: "#ec8d9c",
    hemiFill: "#1d2127",
    homology: HOMOLOGY_HIGHLIGHT_COLOR,
    sceneBg: "#16191e",
    cortexSulcus: hexToSrgb("#565c66"),
    cortexGyrus: hexToSrgb("#e3e5e9"),
    cortexMedialWall: hexToSrgb("#2a2e35"),
    cortexNoData: hexToSrgb("#7d838c"),
  },
  noche: {
    edge: "#8a98b6",
    edgeOpacityConnectogram: 0.26,
    edgeOpacityHemispheres: 0.3,
    edgeOpacity3d: 0.55,
    edgeOpacityHoverOther: 0.08,
    edgeOpacityHoverSelected: 0.4,
    edgeOpacitySelected: 0.95,
    dash: "3 3",
    selected: "#f2f5fb",
    hoverHighlight: "#ffd84a",
    label: "#8a97b0",
    nodeRing: "#8a98b6",
    nodeGap: "#0a0e17",
    intra: "#5fd0a0",
    inter: "#f58fa3",
    hemiFill: "#172035",
    homology: HOMOLOGY_HIGHLIGHT_COLOR,
    sceneBg: "#111726",
    cortexSulcus: hexToSrgb("#4f5869"),
    cortexGyrus: hexToSrgb("#dfe4ee"),
    cortexMedialWall: hexToSrgb("#262d3b"),
    cortexNoData: hexToSrgb("#7a8396"),
  },
  claro: {
    edge: "#6f737c",
    edgeOpacityConnectogram: 0.26,
    edgeOpacityHemispheres: 0.3,
    edgeOpacity3d: 0.55,
    edgeOpacityHoverOther: 0.08,
    edgeOpacityHoverSelected: 0.4,
    edgeOpacitySelected: 0.95,
    dash: "3 3",
    selected: "#16181c",
    hoverHighlight: "#b7791f",
    label: "#686c74",
    nodeRing: "#6f737c",
    nodeGap: "#ffffff",
    intra: "#2e8a5a",
    inter: "#c24a5f",
    hemiFill: "#f6f5f1",
    homology: HOMOLOGY_HIGHLIGHT_COLOR,
    sceneBg: "#ffffff",
    cortexSulcus: hexToSrgb("#6f7680"),
    cortexGyrus: hexToSrgb("#dcdfe4"),
    cortexMedialWall: hexToSrgb("#a3a8b0"),
    cortexNoData: hexToSrgb("#b9bdc4"),
  },
};

// Colores de dibujo de la exportación JPEG, siempre sobre blanco (decisión
// 11). Con el tema 1 salen los mismos de hoy; con los demás, los de Claro.
export function exportDrawTokens(theme: ThemeId): Readonly<DrawTokens> {
  return theme === "original" ? DRAW_TOKENS.original : DRAW_TOKENS.claro;
}
