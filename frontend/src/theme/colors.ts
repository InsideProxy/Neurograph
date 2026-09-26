// Resolución de colores (docs/rediseno-interfaz-diseno.md, 4.3 a 4.5).
// Funciones puras: se prueban sin DOM. Reciben el modo de paleta que se
// aplica; solo effectivePaletteMode recibe la elección guardada, que puede
// ser null (automático).
import { NETWORK_COLORS } from "./networks";
import { SOFT_NETWORK_COLORS, type SoftPaletteTheme } from "./softPalettes";
import { exportDrawTokens, type DrawTokens, type OpacityToken, type PaintToken, type ThemeId } from "./themes";

const UNCLASSIFIED = "unclassified";

// Colores de las redes (4.3): «Suaves» o «Originales del atlas».
export const PALETTE_MODES = ["suave", "original"] as const;
export type PaletteMode = (typeof PALETTE_MODES)[number];

export function isPaletteMode(value: unknown): value is PaletteMode {
  return typeof value === "string" && (PALETTE_MODES as readonly string[]).includes(value);
}

// Modo que se aplica (4.5): el elegido o, sin elección (null), el
// automático: «Originales» con el tema Original y «Suaves» con los demás.
export function effectivePaletteMode(theme: ThemeId, paletteMode: PaletteMode | null): PaletteMode {
  return paletteMode ?? (theme === "original" ? "original" : "suave");
}

// True si la clave tiene color en NETWORK_COLORS (redes de los atlas, de demostración y «sin clasificar»), sin contar las heredadas del prototipo.
export function hasNetworkColor(key: string): boolean {
  return Object.hasOwn(NETWORK_COLORS, key);
}

// Columna de la paleta suave de cada tema. El tema Original no tiene
// columna propia: usa la de Grafito (4.3).
function softColumn(theme: ThemeId): SoftPaletteTheme {
  return theme === "original" ? "grafito" : theme;
}

// Color de una red en pantalla. Con «Originales del atlas», el de
// NETWORK_COLORS; con «Suaves», el de la tabla generada para el tema
// (theme/softPalettes.ts). Una clave desconocida usa el «sin clasificar» de
// la paleta activa. El `??` final solo actuaría con una tabla sin
// regenerar (theme/softPalettes.test.ts lo impide): antes el color del
// atlas que un gris que parecería «sin red».
export function resolveNetworkColor(key: string, theme: ThemeId, mode: PaletteMode): string {
  const known = hasNetworkColor(key) ? key : UNCLASSIFIED;
  if (mode === "original") return NETWORK_COLORS[known];
  return SOFT_NETWORK_COLORS[softColumn(theme)][known] ?? NETWORK_COLORS[known];
}

// Color de una red en la exportación JPEG, siempre sobre blanco (4.4): con
// «Suaves», la columna de Claro, sea cual sea el tema de pantalla.
export function exportNetworkColor(key: string, mode: PaletteMode): string {
  return resolveNetworkColor(key, "claro", mode);
}

// Referencia de pintura para un atributo `data-ng-fill`/`data-ng-stroke`:
// un token de color de DrawTokens o una red con el prefijo `net:`.
export type PaintRef = PaintToken | `net:${string}`;
export type ExportAttributeKind = "paint" | "opacity";

// Valor de exportación de una referencia `data-ng-*`. Con `kind: "paint"`
// resuelve `net:<clave de red>` (exportNetworkColor) o un token de
// DrawTokens que sea color (nunca "dash", que no es una pintura). Con
// `kind: "opacity"` resuelve un token de DrawTokens que sea número, como
// cadena. null si la referencia no existe, es heredada del prototipo, o no
// es de la clase pedida (los grises de la corteza son tripletes: nunca son
// ni "paint" ni "opacity").
export function exportColorFor(ref: string, kind: ExportAttributeKind, theme: ThemeId, mode: PaletteMode): string | null {
  const tokens = exportDrawTokens(theme);
  if (kind === "paint") {
    if (ref.startsWith("net:")) return exportNetworkColor(ref.slice("net:".length), mode);
    if (ref === "dash" || !Object.hasOwn(tokens, ref)) return null;
    const value = tokens[ref as keyof DrawTokens];
    return typeof value === "string" ? value : null;
  }
  if (!Object.hasOwn(tokens, ref)) return null;
  const value = tokens[ref as keyof DrawTokens];
  return typeof value === "number" ? String(value) : null;
}

export function exportResolverFor(
  theme: ThemeId,
  mode: PaletteMode,
): (ref: string, kind: ExportAttributeKind) => string | null {
  return (ref, kind) => exportColorFor(ref, kind, theme, mode);
}

// Ayudantes tipados para los atributos data-ng-*: una referencia mal
// escrita es un error de compilación en JSX, no un fallo silencioso que
// solo se ve en la imagen exportada.
export function ngFill(ref: PaintRef): { "data-ng-fill": PaintRef } {
  return { "data-ng-fill": ref };
}
export function ngStroke(ref: PaintRef): { "data-ng-stroke": PaintRef } {
  return { "data-ng-stroke": ref };
}
export function ngStrokeOpacity(ref: OpacityToken): { "data-ng-stroke-opacity": OpacityToken } {
  return { "data-ng-stroke-opacity": ref };
}
