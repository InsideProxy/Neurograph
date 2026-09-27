// Lupa del connectograma (decisión 76, 24/09/2026, propuesta de la
// usuaria): con cientos de nodos (HCP-MMP1.0, 360 regiones) los puntos
// quedan a ~5 px unos de otros y acertar con el ratón es difícil. Con la
// lupa activada, el nodo "bajo el cursor" deja de depender de tocar
// exactamente su círculo de 3 px: es el más cercano al puntero, siempre
// que esté a menos de `maxDistance` (en coordenadas del dibujo sin
// ampliar). Fuera de ese radio no hay ninguno -- así el cursor sobre el
// centro del círculo no "engancha" un nodo lejano.
export function nearestNodeId(
  positions: ReadonlyMap<string, { x: number; y: number }>,
  x: number,
  y: number,
  maxDistance: number
): string | null {
  let bestId: string | null = null;
  let bestDist2 = maxDistance * maxDistance;
  for (const [id, pos] of positions) {
    const dx = pos.x - x;
    const dy = pos.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestDist2) {
      bestDist2 = d2;
      bestId = id;
    }
  }
  return bestId;
}
