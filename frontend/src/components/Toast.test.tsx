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
  it("sin avisos no pinta nada", () => {
    expect(renderToStaticMarkup(<ToastRegion toasts={[]} onDismiss={noop} />)).toBe("");
  });

  it("cada aviso es role=alert, lleva su clave y se cierra con un botón", () => {
    const html = renderToStaticMarkup(<ToastRegion toasts={TOASTS} onDismiss={noop} />);
    expect(html.match(/role="alert"/g)).toHaveLength(2);
    expect(html).toContain('data-toast-key="redes"');
    expect(html.match(/>Entendido<\/button>/g)).toHaveLength(2);
  });

  it("«Detalles» solo aparece si hay texto técnico", () => {
    const html = renderToStaticMarkup(<ToastRegion toasts={TOASTS} onDismiss={noop} />);
    expect(html.match(/<summary>Detalles<\/summary>/g)).toHaveLength(1);
    expect(html).toContain("<pre>pila</pre>");
  });
});
