// Teclado de la lista desplegable del contexto de datos (D4 de
// docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 5.1 y 8), que
// usa también la del buscador de regiones, y si un mousemove sobre una de
// ellas es un movimiento de verdad. Funciones puras: dicen qué hacer con
// cada tecla y con el ratón; DataContextMenu.tsx y RegionSearch.tsx lo hacen.

export type ListboxKeyResult =
  | { kind: "move"; index: number }
  | { kind: "choose"; index: number }
  // keepDefault: Tab cierra la lista y deja que el foco siga su camino
  // (desde el botón); Escape cierra y no hace nada más.
  | { kind: "close"; keepDefault: boolean }
  | { kind: "ignore" };

export function listboxKey(key: string, active: number, count: number): ListboxKeyResult {
  if (key === "Escape") return { kind: "close", keepDefault: false };
  if (key === "Tab") return { kind: "close", keepDefault: true };
  if (count === 0) return { kind: "ignore" };
  const last = count - 1;
  const current = Math.min(Math.max(active, 0), last);
  switch (key) {
    case "ArrowDown":
      return { kind: "move", index: Math.min(current + 1, last) };
    case "ArrowUp":
      return { kind: "move", index: Math.max(current - 1, 0) };
    case "Home":
      return { kind: "move", index: 0 };
    case "End":
      return { kind: "move", index: last };
    case "Enter":
    case " ":
      return { kind: "choose", index: current };
    default:
      return { kind: "ignore" };
  }
}

// Opción activa al abrir: la elegida, o la primera si no hay ninguna.
export function initialActiveIndex(selectedIndex: number, count: number): number {
  return selectedIndex >= 0 && selectedIndex < count ? selectedIndex : 0;
}

export interface PointerPosition {
  clientX: number;
  clientY: number;
}

// Si un mousemove sobre una opción es un movimiento de verdad, y no uno de
// los que WebKit repite con las mismas coordenadas cuando la lista se
// mueve bajo el ratón quieto (components/useMouseMoved.ts, que lo usa en
// esta lista y en la del buscador de regiones). Sin posición anterior
// tampoco cuenta: justo tras montarse la lista, el primero puede ser uno
// de esos repetidos, y el siguiente movimiento real ya cuenta.
export function pointerMoved(previous: PointerPosition | null, current: PointerPosition): boolean {
  return previous !== null && (previous.clientX !== current.clientX || previous.clientY !== current.clientY);
}
