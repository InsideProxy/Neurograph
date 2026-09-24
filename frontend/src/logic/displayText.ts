// Textos que se muestran en la interfaz (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, sección 5). Funciones puras: se prueban
// sin DOM.

// Número con los miles separados por un espacio duro, como pide la
// ortografía del español (64 620). Los de cuatro cifras van sin separar
// (1047).
export function formatCount(value: number): string {
  const digits = String(Math.round(value));
  return digits.length <= 4 ? digits : digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
