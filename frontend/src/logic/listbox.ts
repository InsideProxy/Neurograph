// Teclado de la lista desplegable del contexto de datos (D4 de
// docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 5.1 y 8).
// Función pura: dice qué hacer con cada tecla; DataContextMenu.tsx lo hace.

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
