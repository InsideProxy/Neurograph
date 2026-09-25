// Avisos flotantes (D4 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md,
// 5.6). Sustituyen a las franjas rojas fijas de App.tsx. Van arriba a la
// derecha, bajo la barra y sobre la columna derecha, y se apilan hacia
// abajo, sin tapar la vista grande (App.css; D6). Cada aviso es
// role="alert", con un mensaje comprensible y, si lo hay, el texto técnico
// completo en «Detalles», y se queda hasta que se cierra. Los discretos
// (polite), como el aviso con «Deshacer» (5.7), no llevan rol: su texto lo
// anuncia una región viva siempre presente. Pueden llevar un botón de
// acción e irse solos.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toastAfterDismiss, type ToastEntry } from "../logic/toastQueue";
import { Icon } from "./Icon";

export function Toast({
  toast,
  onDismiss,
  onAction,
  onExpire,
}: {
  toast: ToastEntry;
  onDismiss: () => void;
  onAction?: () => void;
  // Se ha ido solo (autoDismissMs): no mueve el foco.
  onExpire?: () => void;
}) {
  // Mientras tiene el ratón encima o el foco dentro, el tiempo no corre; al
  // salir, vuelve a empezar.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const expireRef = useRef(onExpire);
  useEffect(() => {
    expireRef.current = onExpire;
  });
  useEffect(() => {
    if (toast.autoDismissMs === undefined || hovered || focused) return;
    const timer = setTimeout(() => expireRef.current?.(), toast.autoDismissMs);
    return () => clearTimeout(timer);
  }, [toast.autoDismissMs, toast.stamp, hovered, focused]);

  return (
    <div
      className={`toast toast--${toast.tone}`}
      role={toast.polite ? undefined : "alert"}
      data-toast-key={toast.key}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <Icon name={toast.tone === "error" ? "alert" : "info"} size={18} className="toast__icon" />
      <div className="toast__body">
        <p className="toast__message">{toast.message}</p>
        {toast.details && (
          <details className="toast__details">
            <summary>Detalles</summary>
            {/* tabIndex: con el teclado, el texto largo se desplaza con las
                flechas; WebKitGTK no lleva el foco a un bloque que solo
                se desplaza. */}
            <pre tabIndex={0}>{toast.details}</pre>
          </details>
        )}
        <div className="toast__buttons">
          {toast.action && (
            <button type="button" className="toast__action" onClick={onAction}>
              {toast.action.label}
            </button>
          )}
          <button type="button" className="toast__close" onClick={onDismiss}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// Al cerrar un aviso con «Entendido», el foco pasa al «Entendido» del
// siguiente (o del anterior, si era el último). Si no queda ninguno, va
// adonde diga el aviso (returnFocus) o, si no dice nada, adonde decida quien
// pinta la región (onEmptied): App lo devuelve a «Importar». Tras usar la
// acción de un aviso, va siempre adonde diga el aviso. Sin esto, el foco
// caería en la página, porque el botón desaparece. Un aviso que se va solo
// no mueve el foco.
export function ToastRegion({
  toasts,
  onDismiss,
  onEmptied,
}: {
  toasts: readonly ToastEntry[];
  onDismiss: (key: string) => void;
  onEmptied?: () => void;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  const focusAfterDismiss = useRef<string | null>(null);

  useLayoutEffect(() => {
    const key = focusAfterDismiss.current;
    if (key === null) return;
    focusAfterDismiss.current = null;
    const toast = [...(regionRef.current?.querySelectorAll<HTMLElement>(".toast") ?? [])].find(
      (element) => element.dataset.toastKey === key,
    );
    toast?.querySelector<HTMLButtonElement>(".toast__close")?.focus();
  });

  // El destino del foco (logic/toastQueue.ts) se guarda antes de la acción y
  // de onDismiss: si cualquiera de los dos hace pintar la región en el acto,
  // el efecto de arriba ya lo encuentra.
  const leave = (index: number, runAction: boolean) => {
    const toast = toasts[index];
    const target = toastAfterDismiss(toasts, index, runAction);
    if (target.kind === "toast") focusAfterDismiss.current = target.key;
    if (runAction) toast.action?.run();
    onDismiss(toast.key);
    if (target.kind === "return") (toast.returnFocus ?? onEmptied)?.();
  };

  return (
    <>
      {/* Región viva de los avisos discretos: siempre presente, para que el
          lector de pantalla anuncie el texto cuando cambia. */}
      <div className="visually-hidden" aria-live="polite">
        {toasts
          .filter((toast) => toast.polite)
          .map((toast) => (
            <span key={`${toast.key}-${toast.stamp ?? 0}`}>{toast.message}</span>
          ))}
      </div>
      {toasts.length > 0 && (
        <div ref={regionRef} className="toast-region">
          {toasts.map((toast, index) => (
            <Toast
              key={toast.key}
              toast={toast}
              onDismiss={() => leave(index, false)}
              onAction={() => leave(index, true)}
              onExpire={() => onDismiss(toast.key)}
            />
          ))}
        </div>
      )}
    </>
  );
}
