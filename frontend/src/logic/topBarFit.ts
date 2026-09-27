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

// Forma mínima que necesita fitTopBar para medir y aplicar un nivel: así
// se prueba en node con un elemento de mentira, sin DOM real (sección 10
// de comun.md). dataset es mutable a propósito: fitTopBar escribe ahí el
// nivel que va probando.
export interface FittableBar {
  readonly clientWidth: number;
  readonly scrollWidth: number;
  readonly innerHTML: string;
  readonly dataset: { collapse?: string };
}

// Firma del ancho y el contenido actuales de la barra: si no cambian
// desde la última medida (TopBar.tsx la guarda por barra en un WeakMap),
// el resultado sería el mismo.
export function fitSignature(bar: FittableBar): string {
  return `${bar.clientWidth}|${bar.innerHTML}`;
}

// Aplica el menor nivel de compactación con el que `bar` cabe en una fila:
// prueba cada nivel escribiendo su data-collapse y mirando si scrollWidth
// ya no pasa de clientWidth (con flex-wrap: nowrap en el CSS real, lo que
// no cabe sobresale). Sin `force`, no mide si la firma no cambió desde
// `lastSignature`: devuelve null, nada que aplicar. Devuelve el nivel
// aplicado si midió.
export function fitTopBar(bar: FittableBar, lastSignature: string | undefined, force = false): number | null {
  const signature = fitSignature(bar);
  if (!force && lastSignature === signature) return null;
  const level = smallestFittingLevel((n) => {
    bar.dataset.collapse = collapseAttribute(n);
    return bar.scrollWidth <= bar.clientWidth;
  });
  bar.dataset.collapse = collapseAttribute(level);
  return level;
}
