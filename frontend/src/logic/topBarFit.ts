// Compactación de la barra superior (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.1). La barra va en una fila. Si no
// cabe, se pliega lo secundario por este orden, y solo lo que haga falta:
//   1. «Datos reales» se queda en su punto de color («Datos de
//      demostración» nunca: es un aviso).
//   2. «Importar» se queda en su icono.
//   3. Las pestañas de síntesis inactivas se quedan en su icono.
//   4. Las pestañas de vista inactivas se quedan en su icono.
// Las vistas son la navegación principal: son lo último que se pliega.
// Funciones puras; TopBar.tsx mide la barra y App.css aplica cada paso.

export const TOP_BAR_COLLAPSE_STEPS = ["status", "import", "synthesis", "tabs"] as const;

// Valor del atributo data-collapse con los `level` primeros pasos plegados.
export function collapseAttribute(level: number): string {
  return TOP_BAR_COLLAPSE_STEPS.slice(0, Math.max(0, level)).join(" ");
}

// Menor nivel con el que la barra cabe: fits(n) aplica el nivel n y dice
// si cabe. Los niveles se prueban en orden. Si no cabe con ninguno, se
// queda el último, en el que la barra puede pasar a dos filas.
export function smallestFittingLevel(
  fits: (level: number) => boolean,
  maxLevel: number = TOP_BAR_COLLAPSE_STEPS.length,
): number {
  for (let level = 0; level < maxLevel; level++) {
    if (fits(level)) return level;
  }
  return maxLevel;
}

// Pestaña que recibe el foco al cerrar una de síntesis (las únicas con
// onClose), porque el botón que lo tenía desaparece: la síntesis que ocupa
// su sitio, o la anterior si era la última; sin más síntesis, la primera
// pestaña (Atlas). null si la pestaña no se cierra o no está.
export function tabAfterClosing(tabs: readonly { id: string; onClose?: unknown }[], closedId: string): string | null {
  const closable = tabs.filter((tab) => tab.onClose !== undefined);
  const index = closable.findIndex((tab) => tab.id === closedId);
  if (index === -1) return null;
  return (closable[index + 1] ?? closable[index - 1] ?? tabs[0]).id;
}
