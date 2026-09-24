// Resolución de colores (docs/rediseno-interfaz-diseno.md, 4.3 y 4.4).
// Funciones puras: se prueban sin DOM.
import { NETWORK_COLORS } from "./networks";
import { exportDrawTokens, type DrawTokens, type ThemeId } from "./themes";

const UNCLASSIFIED = "unclassified";

// Color de una red en pantalla. En la fase 1 es siempre el original del
// atlas (NETWORK_COLORS); la paleta suave llega en la fase 2. Una clave
// desconocida usa el gris de «sin clasificar». Antes cada componente tenía
// su propio respaldo ("#888" o NEUTRAL_COLOR).
export function resolveNetworkColor(key: string): string {
  return Object.hasOwn(NETWORK_COLORS, key) ? NETWORK_COLORS[key] : NETWORK_COLORS[UNCLASSIFIED];
}

// Valor de exportación de una referencia `data-ng-*`: un token de
// DrawTokens (color u opacidad) o `net:<clave de red>`. null si la
// referencia no existe o no es un valor que se pueda escribir en un
// atributo SVG (los grises de la corteza son tripletes).
export function exportColorFor(ref: string, theme: ThemeId): string | null {
  if (ref.startsWith("net:")) return resolveNetworkColor(ref.slice("net:".length));
  const tokens = exportDrawTokens(theme);
  if (!Object.hasOwn(tokens, ref)) return null;
  const value = tokens[ref as keyof DrawTokens];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

export function exportResolverFor(theme: ThemeId): (ref: string) => string | null {
  return (ref) => exportColorFor(ref, theme);
}
