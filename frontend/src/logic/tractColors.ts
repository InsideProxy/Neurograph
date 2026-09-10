// Colores de tractos (07/09/2026, sección de tractografía 3D, decisión
// 61 de docs/analisis-arquitectura.md). A diferencia de NETWORK_COLORS
// (theme/networks.ts, extraídos de la fuente real del atlas cuando
// existe -- p. ej. el propio .dlabel.nii de Cole-Anticevic),
// ORG-800FC-100HCP no define ningún color canónico por tracto: no hay
// ningún "color real" que preservar aquí, así que esto es una decisión
// puramente de INGENIERÍA (poder distinguir tractos a simple vista en
// la lista y en la escena 3D), nunca una afirmación científica.
//
// Determinista por posición en la lista ya ordenada por nombre (nunca
// por hash del id, que daría un orden de colores imprevisible en la
// rueda de tono) -- el mismo tracto tiene siempre el mismo color
// mientras la lista no cambie de orden real (algo que solo pasaría si
// se renombrara un tracto, nunca por session).
export function colorForTractIndex(index: number, total: number): string {
  if (total <= 0) return "hsl(0, 70%, 55%)";
  const hue = (index * 360) / total;
  return `hsl(${hue.toFixed(1)}, 70%, 55%)`;
}
