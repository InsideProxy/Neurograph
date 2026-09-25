// «▶ Automático» del tour guiado (D11 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.10): avanza solo, unos 8 s por paso, y
// se pausa con cualquier otro control. Un paso largo espera lo que se tarda en
// leerlo, a 250 ms por palabra (240 por minuto), y nunca más de 12 s: el tour
// entero dura así unos dos minutos. En el último paso se para, porque salir
// devuelve el montaje y eso lo decide el usuario. Funciones puras.

export const AUTOPLAY_STEP_MS = 8000;
export const AUTOPLAY_MS_PER_WORD = 250;
export const AUTOPLAY_MAX_MS = 12_000;

// Cuánto espera un paso, según el texto de su caja.
export function autoplayDelay(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.min(AUTOPLAY_MAX_MS, Math.max(AUTOPLAY_STEP_MS, words * AUTOPLAY_MS_PER_WORD));
}

// Los controles del tour: «Siguiente →», «← Anterior», las flechas del
// teclado, «▶ Automático» y el avance del propio automático.
export type TourControlKind = "next" | "prev" | "key" | "toggle" | "auto";

// Si sigue en automático después de usar un control.
export function autoplayAfter(playing: boolean, control: TourControlKind): boolean {
  if (control === "toggle") return !playing;
  if (control === "auto") return playing;
  return false;
}

// El paso al que avanza el automático, o null en el último.
export function autoplayTarget(index: number, total: number): number | null {
  return index + 1 < total ? index + 1 : null;
}

// Si sigue en automático al mostrar el paso `index`: en el último se para.
export function autoplayOnShow(playing: boolean, index: number, total: number): boolean {
  return playing && autoplayTarget(index, total) !== null;
}
