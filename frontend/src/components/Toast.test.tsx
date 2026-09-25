import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ToastEntry } from "../logic/toastQueue";
import { ToastRegion } from "./Toast";

const noop = () => {};

const TOASTS: ToastEntry[] = [
  { key: "importar", tone: "info", message: "Uno" },
  { key: "redes", tone: "error", message: "Dos", details: "pila" },
];

describe("ToastRegion", () => {
  it("sin avisos solo pinta la región viva, vacía", () => {
    expect(renderToStaticMarkup(<ToastRegion toasts={[]} onDismiss={noop} />)).toBe(
      '<div class="visually-hidden" aria-live="polite"></div>',
    );
  });

  it("cada aviso es role=alert, lleva su clave y se cierra con un botón", () => {
    const html = renderToStaticMarkup(<ToastRegion toasts={TOASTS} onDismiss={noop} />);
    expect(html.match(/role="alert"/g)).toHaveLength(2);
    expect(html).toContain('data-toast-key="redes"');
    expect(html.match(/>Entendido<\/button>/g)).toHaveLength(2);
  });

  it("un aviso discreto no lleva rol: lo anuncia la región viva, y puede llevar una acción", () => {
    const html = renderToStaticMarkup(
      <ToastRegion
        toasts={[{ key: "deshacer", tone: "info", polite: true, message: "Se vació la selección de 3 regiones", action: { label: "Deshacer", run: noop } }]}
        onDismiss={noop}
      />,
    );
    expect(html).toContain('<div class="visually-hidden" aria-live="polite"><span>Se vació la selección de 3 regiones</span></div>');
    expect(html).not.toContain("role=");
    expect(html).toContain('<button type="button" class="toast__action">Deshacer</button>');
  });

  it("«Detalles» solo aparece si hay texto técnico", () => {
    const html = renderToStaticMarkup(<ToastRegion toasts={TOASTS} onDismiss={noop} />);
    expect(html.match(/<summary>Detalles<\/summary>/g)).toHaveLength(1);
    expect(html).toContain('<pre tabindex="0">pila</pre>');
  });
});
