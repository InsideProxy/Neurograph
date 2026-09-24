// Avisos flotantes (D4 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md,
// 5.6). Sustituyen a las franjas rojas fijas de App.tsx. Van arriba a la
// derecha, bajo la barra y sobre la columna derecha, sin tapar la vista
// grande. Cada aviso es role="alert", con un mensaje comprensible y, si lo
// hay, el texto técnico completo en «Detalles». Se quedan hasta que se
// cierran.
import { useLayoutEffect, useRef } from "react";
import type { ToastEntry } from "../logic/toastQueue";
import { Icon } from "./Icon";

export function Toast({ toast, onDismiss }: { toast: ToastEntry; onDismiss: () => void }) {
  return (
    <div className={`toast toast--${toast.tone}`} role="alert" data-toast-key={toast.key}>
      <Icon name={toast.tone === "error" ? "alert" : "info"} size={18} className="toast__icon" />
      <div className="toast__body">
        <p className="toast__message">{toast.message}</p>
        {toast.details && (
          <details className="toast__details">
            <summary>Detalles</summary>
            <pre>{toast.details}</pre>
          </details>
        )}
        <div className="toast__buttons">
          <button type="button" className="toast__close" onClick={onDismiss}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// Al cerrar un aviso con su botón, el foco pasa al botón del aviso
// siguiente (o del anterior, si era el último). Si no queda ninguno, lo
// decide quien pinta la región (onEmptied): App lo devuelve a «Importar».
// Sin esto, el foco caería en la página, porque el botón desaparece.
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

  if (toasts.length === 0) return null;

  const dismiss = (index: number) => {
    const next = toasts[index + 1] ?? toasts[index - 1];
    onDismiss(toasts[index].key);
    if (next) focusAfterDismiss.current = next.key;
    else onEmptied?.();
  };

  return (
    <div ref={regionRef} className="toast-region">
      {toasts.map((toast, index) => (
        <Toast key={toast.key} toast={toast} onDismiss={() => dismiss(index)} />
      ))}
    </div>
  );
}
