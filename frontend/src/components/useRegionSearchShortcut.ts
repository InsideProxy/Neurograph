// Atajo del buscador de regiones (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.8): Ctrl+K (⌘K) lleva el foco al
// buscador desde cualquier sitio de la vista Atlas. El mismo diseño que los
// atajos del historial (useHistoryShortcuts): un escuchador en window, solo
// en la vista Atlas, con la decisión en una función pura
// (logic/regionSearch.ts, regionSearchShortcut). No actúa mientras está
// abierta una lista desplegable, salvo la del propio buscador, o el panel de
// Ajustes. Anula lo que haría el navegador con Ctrl+K.
import { useEffect, useRef } from "react";
import { regionSearchShortcut } from "../logic/regionSearch";

const OPEN_POPUP = '[role="listbox"]:not(.region-search__list), .settings__panel';

// Lleva el foco al campo del buscador que haya en container y selecciona lo
// escrito, para poder sustituirlo.
export function focusRegionSearch(container: ParentNode | null) {
  const input = container?.querySelector<HTMLInputElement>(".region-search__input");
  input?.focus();
  input?.select();
}

export function useRegionSearchShortcut(enabled: boolean, onShortcut: () => void) {
  // La función más reciente, sin volver a poner el escuchador en cada render.
  const onShortcutRef = useRef(onShortcut);
  useEffect(() => {
    onShortcutRef.current = onShortcut;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector(OPEN_POPUP)) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!regionSearchShortcut(event, target, target?.classList.contains("region-search__input") ?? false)) return;
      event.preventDefault();
      onShortcutRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
