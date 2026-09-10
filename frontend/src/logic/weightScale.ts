// Escala logarítmica real del filtro "peso mínimo" (decisión de la
// usuaria, 07/09/2026, ver docs/analisis-arquitectura.md decisión 61).
//
// El peso de conectividad real (fracción de streamlines de tractografía,
// o media de probabilidad de tractografía) se distribuye en varios
// órdenes de magnitud con casi toda la masa cerca de cero -- comprobado
// contra los datos reales, no supuesto: el máximo real de todo el
// conectoma de Rosen & Halgren (64620 conexiones) es 0.144 (calculado
// directamente de `averageConnectivity_Fpt.csv`, el archivo fuente),
// con mediana 0.0001 y percentil 99 en 0.034; Brainnetome (30135
// conexiones, decisión 5/18) tiene mediana ~0.0004 y percentil 99 ~0.85.
// Un deslizador LINEAL de 0 a 1 dedicaba casi todo su recorrido a una
// zona sin ningún dato real (por encima de ~0.15-0.85 según la fuente) y
// casi ninguna resolución a la zona donde de verdad hay conectividad.
//
// Aquí se mapea la posición del deslizador (0 a 1, lineal) a un peso
// real en escala logarítmica entre LOG_MIN_WEIGHT y LOG_MAX_WEIGHT. La
// posición 0 exacta está reservada para "sin filtro" (peso 0, se
// muestra toda la conectividad real) -- nunca alcanzable en una escala
// puramente logarítmica, que nunca llega a 0. `filters.ts` sigue
// guardando `minWeight` como el peso real (no la posición del
// deslizador ni su logaritmo), así que `logic/visibility.ts` no cambia
// en absoluto: sigue comparando pesos reales contra un umbral real.
//
// El tope de dibujado (`renderSafety.ts`, MAX_RENDERED_CONNECTIONS) es
// quien protege contra "demasiado que dibujar" ahora que el valor por
// defecto ya no filtra nada por sí mismo (ver INITIAL_MIN_WEIGHT en
// filters.ts) -- exactamente la misma separación ya documentada en la
// decisión 42: minWeight es una decisión CIENTÍFICA (qué conectividad
// es relevante), el tope de dibujado es una decisión de INGENIERÍA
// (cuánto puede dibujar el navegador sin congelarse). Ninguna de las
// dos debe hacer el trabajo de la otra.

// Un orden de magnitud por debajo del mínimo real observado en
// cualquier fuente cargada (~5.7e-7, Rosen & Halgren) -- deja margen
// sin inventar una cota arbitraria mucho más generosa de lo que el dato
// real necesita.
export const LOG_MIN_WEIGHT = 1e-6;

// Cota superior real de todas las fuentes de conectividad del proyecto:
// Yeh 2022 ya viene validado en [0,1] en su propia ingesta: nunca hace
// falta una escala logarítmica por encima de 1.
export const LOG_MAX_WEIGHT = 1;

const LOG_MIN_EXPONENT = Math.log10(LOG_MIN_WEIGHT);
const LOG_MAX_EXPONENT = Math.log10(LOG_MAX_WEIGHT);

/** Posición del deslizador (0 a 1) -> peso real. */
export function sliderPositionToWeight(position: number): number {
  if (position <= 0) return 0;
  const clamped = Math.min(1, position);
  const exponent = LOG_MIN_EXPONENT + clamped * (LOG_MAX_EXPONENT - LOG_MIN_EXPONENT);
  return 10 ** exponent;
}

/** Peso real -> posición del deslizador (0 a 1). Inversa de la anterior,
 * salvo por debajo de LOG_MIN_WEIGHT, donde se satura a la posición 0 en
 * vez de dar una posición negativa (un peso real pero minúsculo se ve en
 * el deslizador como "prácticamente sin filtro", nunca como un valor
 * fuera de rango). */
export function weightToSliderPosition(weight: number): number {
  if (weight <= 0) return 0;
  if (weight >= LOG_MAX_WEIGHT) return 1;
  const exponent = Math.max(LOG_MIN_EXPONENT, Math.log10(weight));
  return (exponent - LOG_MIN_EXPONENT) / (LOG_MAX_EXPONENT - LOG_MIN_EXPONENT);
}

/** Formato legible del peso real para la leyenda del filtro -- nunca el
 * logaritmo ni la posición del deslizador, siempre el peso real que de
 * verdad se está comparando en `visibility.ts`. Por debajo de 0.01 se usa
 * notación exponencial (p. ej. "3.4e-4"): con dos decimales fijos, un
 * peso real de 0.0001 y uno de 0.03 se verían idénticos ("0.00"). */
export function formatMinWeight(weight: number): string {
  if (weight <= 0) return "0 (sin filtro, se muestra todo)";
  if (weight >= 0.01) return weight.toFixed(2);
  return weight.toExponential(1);
}
