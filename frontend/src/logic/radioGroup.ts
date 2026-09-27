// Flechas de un grupo de radios nativos: «Colores de las redes», en Ajustes
// (fase 2 del rediseño; docs/rediseno-interfaz-diseno.md, 5.2 y 8). Función
// pura: dice a qué radio van; SettingsMenu.tsx le da el foco y lo marca.
//
// El navegador ya mueve la elección con las flechas, pero WebKit, el motor de
// Tauri en Linux (WebKitGTK), no da la vuelta en los extremos y deja sin
// :focus-visible el radio al que llegan, así que su anillo de foco se perdía.

export interface ArrowKeyEvent {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

// Índice del radio al que va la flecha, dando la vuelta en los extremos:
// Derecha y Abajo, al siguiente; Izquierda y Arriba, al anterior. null si no
// es una flecha, si va con Alt, Ctrl o Meta (atajos del navegador o del
// sistema) o si el índice no es del grupo.
export function nextRadioIndex(event: ArrowKeyEvent, index: number, count: number): number | null {
  if (event.altKey || event.ctrlKey || event.metaKey || index < 0 || index >= count) return null;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      return (index + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (index - 1 + count) % count;
    default:
      return null;
  }
}
