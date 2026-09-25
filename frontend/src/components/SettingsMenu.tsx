// Engranaje de Ajustes (D3 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 5.2).
// Fase 1: solo el tema. La opción «Colores de las redes» llega con la
// paleta suave, en la fase 2.
import { useEffect, useId, useRef, useState, type FocusEvent } from "react";
import { useAppearanceStore } from "../state/appearance";
import { effectivePaletteMode, resolveNetworkColor } from "../theme/colors";
import { THEME_IDS, THEME_INFO } from "../theme/themes";

// Cinco redes de Cole-Anticevic para la vista previa de cada tema, con la
// paleta que tendría ese tema (fase 2 del rediseño).
const PREVIEW_NETWORKS = [
  "cole-anticevic.visual",
  "cole-anticevic.default",
  "cole-anticevic.frontoparietal",
  "cole-anticevic.dorsal-attention",
  "cole-anticevic.auditory",
];

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const theme = useAppearanceStore((state) => state.theme);
  const paletteMode = useAppearanceStore((state) => state.paletteMode);
  const setTheme = useAppearanceStore((state) => state.setTheme);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogTitleId = useId();
  const themeLabelId = useId();
  const descBaseId = useId();

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // El foco vuelve al engranaje si estaba dentro del panel, y también
        // si no había nada enfocado o el foco había caído en <body>. Eso
        // pasa tras un clic en una zona del panel sin foco propio, como el
        // título o «TEMA», y sin esto Escape dejaría el foco perdido en
        // <body>.
        const current = document.activeElement;
        const refocus = !current || current === document.body || panelRef.current?.contains(current);
        setOpen(false);
        if (refocus) triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    panelRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  // Si el foco sale del bloque .settings (engranaje y panel) con Tab o
  // Mayús+Tab, el panel se cierra y el foco sigue su curso natural: un
  // panel abierto que ya no tiene el foco se quedaría olvidado encima de
  // la vista.
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    // relatedTarget nulo no significa que el foco haya salido del bloque.
    // En Chromium, un clic en una parte no enfocable del panel (el título,
    // «TEMA», el relleno) deja el foco en <body> sin relatedTarget. En
    // macOS, WebKit (Safari) y Firefox no dan el foco a los botones al
    // pulsarlos, así que elegir una tarjeta tampoco pone relatedTarget
    // dentro del panel. En ninguno de los dos casos hay que cerrar aquí: un
    // clic de verdad fuera ya lo cierra el «pointerdown» del otro efecto.
    const next = event.relatedTarget as Node | null;
    if (!next || event.currentTarget.contains(next)) return;
    setOpen(false);
  };

  return (
    <div className="settings" onBlur={handleBlur}>
      <button
        ref={triggerRef}
        type="button"
        className="icon-btn settings__trigger"
        aria-label="Ajustes"
        title="Ajustes"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="settings__icon">
          <path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      {open && (
        <div ref={panelRef} className="settings__panel" role="dialog" aria-labelledby={dialogTitleId}>
          <div className="settings__header">
            <h2 id={dialogTitleId}>Ajustes</h2>
            <button type="button" className="icon-btn" aria-label="Cerrar ajustes" onClick={close}>
              ×
            </button>
          </div>
          <p className="settings__label" id={themeLabelId}>
            Tema
          </p>
          <div className="settings__themes" role="group" aria-labelledby={themeLabelId}>
            {THEME_IDS.map((id) => {
              const info = THEME_INFO[id];
              return (
                <button
                  key={id}
                  type="button"
                  className="settings__theme"
                  aria-pressed={theme === id}
                  aria-label={`${info.number} · ${info.name}`}
                  aria-describedby={`${descBaseId}-${id}`}
                  onClick={() => setTheme(id)}
                >
                  {/* data-theme-preview: index.css aplica a este elemento las
                      variables del tema que representa (D3 de docs/decisiones-diseno.md). */}
                  <span className="settings__preview" data-theme-preview={id} aria-hidden="true">
                    <span className="settings__preview-side" />
                    <span className="settings__preview-main">
                      {PREVIEW_NETWORKS.map((key) => (
                        <span key={key} className="settings__preview-dot" style={{ background: resolveNetworkColor(key, id, effectivePaletteMode(id, paletteMode)) }} />
                      ))}
                    </span>
                  </span>
                  <span className="settings__theme-name">
                    {info.number} · {info.name}
                  </span>
                  <span className="settings__theme-desc" id={`${descBaseId}-${id}`}>
                    {info.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
