// Atajos del historial de deshacer (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.7): un solo escuchador de teclado en
// window, activo en la vista Atlas aunque el panel de Filtros esté
// plegado. Ctrl+Z (⌘Z) deshace; Ctrl+Mayús+Z y Ctrl+Y rehacen; dentro de un
// campo de texto no hace nada (logic/historyStep.ts, historyShortcut).
// Tampoco mientras está abierta una lista desplegable o el panel de
// Ajustes, que atienden su propio teclado. Avisa además al historial de
// cuándo se pulsa y se suelta el puntero sobre el deslizador de peso: un
// arrastre es un solo paso.
import { useEffect } from "react";
import { historyShortcut } from "../logic/historyStep";
import { redo, setPointerHeld, undo } from "../state/history";

// La lista del contexto de datos (DataContextMenu) y el panel de Ajustes
// (SettingsMenu) solo están en la página mientras están abiertos.
const OPEN_POPUP = '[role="listbox"], .settings__panel';

export function useHistoryShortcuts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector(OPEN_POPUP)) return;
      const action = historyShortcut(event, event.target instanceof HTMLElement ? event.target : null);
      if (action === null) return;
      event.preventDefault();
      if (action === "undo") undo();
      else redo();
    };
    // Solo cuenta el puntero pulsado sobre un deslizador.
    let held = false;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof HTMLInputElement) || event.target.type !== "range") return;
      held = true;
      setPointerHeld(true);
    };
    // También si el puntero se suelta fuera de la ventana: al perder el foco.
    const onRelease = () => {
      if (!held) return;
      held = false;
      setPointerHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onRelease, true);
    window.addEventListener("pointercancel", onRelease, true);
    window.addEventListener("blur", onRelease);
    return () => {
      onRelease();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onRelease, true);
      window.removeEventListener("pointercancel", onRelease, true);
      window.removeEventListener("blur", onRelease);
    };
  }, [enabled]);
}
