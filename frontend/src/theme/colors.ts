// Resolución de colores (docs/rediseno-interfaz-diseno.md, 4.3 y 4.4).
// Funciones puras: se prueban sin DOM.
import { NETWORK_COLORS } from "./networks";
import { exportDrawTokens, type DrawTokens, type OpacityToken, type PaintToken, type ThemeId } from "./themes";

const UNCLASSIFIED = "unclassified";

// True si la clave es una red real del atlas (no heredada del prototipo).
export function hasNetworkColor(key: string): boolean {
  return Object.hasOwn(NETWORK_COLORS, key);
}

// Color de una red en pantalla. En la fase 1 es siempre el original del
// atlas (NETWORK_COLORS); la paleta suave llega en la fase 2. Una clave
// desconocida usa el gris de «sin clasificar». Antes cada componente tenía
// su propio respaldo ("#888" o NEUTRAL_COLOR).
export function resolveNetworkColor(key: string): string {
  return hasNetworkColor(key) ? NETWORK_COLORS[key] : NETWORK_COLORS[UNCLASSIFIED];
}

// Referencia de pintura para un atributo `data-ng-fill`/`data-ng-stroke`:
// un token de color de DrawTokens o una red con el prefijo `net:`.
export type PaintRef = PaintToken | `net:${string}`;
export type ExportAttributeKind = "paint" | "opacity";

// Valor de exportación de una referencia `data-ng-*`. Con `kind: "paint"`
// resuelve `net:<clave de red>` o un token de DrawTokens que sea color
// (nunca "dash", que no es una pintura). Con `kind: "opacity"` resuelve un
// token de DrawTokens que sea número, como cadena. null si la referencia no
// existe, es heredada del prototipo, o no es de la clase pedida (los grises
// de la corteza son tripletes: nunca son ni "paint" ni "opacity").
export function exportColorFor(ref: string, kind: ExportAttributeKind, theme: ThemeId): string | null {
  const tokens = exportDrawTokens(theme);
  if (kind === "paint") {
    if (ref.startsWith("net:")) return resolveNetworkColor(ref.slice("net:".length));
    if (ref === "dash" || !Object.hasOwn(tokens, ref)) return null;
    const value = tokens[ref as keyof DrawTokens];
    return typeof value === "string" ? value : null;
  }
  if (!Object.hasOwn(tokens, ref)) return null;
  const value = tokens[ref as keyof DrawTokens];
  return typeof value === "number" ? String(value) : null;
}

export function exportResolverFor(theme: ThemeId): (ref: string, kind: ExportAttributeKind) => string | null {
  return (ref, kind) => exportColorFor(ref, kind, theme);
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
