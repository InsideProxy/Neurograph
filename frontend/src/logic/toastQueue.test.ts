import { describe, expect, it } from "vitest";
import { dismissToast, showToast, toastAfterDismiss, type ToastEntry } from "./toastQueue";

const importError: ToastEntry = { key: "importar", tone: "error", message: "No se pudo abrir el selector de archivos." };

describe("showToast", () => {
  it("añade el aviso al final", () => {
    const queue = showToast([importError], "redes", { tone: "error", message: "Falló la clasificación." });
    expect(queue.map((toast) => toast.key)).toEqual(["importar", "redes"]);
  });

  it("un aviso con la misma clave sustituye al anterior y pasa al final", () => {
    const start = showToast([importError], "redes", { tone: "error", message: "Uno" });
    const queue = showToast(start, "importar", { tone: "info", message: "Dos" });
    expect(queue).toEqual([
      { key: "redes", tone: "error", message: "Uno" },
      { key: "importar", tone: "info", message: "Dos" },
    ]);
  });

  it("no modifica la cola que recibe", () => {
    const start: ToastEntry[] = [importError];
    showToast(start, "redes", { tone: "info", message: "Otro" });
    expect(start).toEqual([importError]);
  });
});

describe("dismissToast", () => {
  it("quita el aviso de esa clave", () => {
    expect(dismissToast([importError], "importar")).toEqual([]);
  });

  it("sin aviso de esa clave devuelve la misma cola, así React no vuelve a pintar", () => {
    const queue: ToastEntry[] = [importError];
    expect(dismissToast(queue, "redes")).toBe(queue);
  });
});

describe("toastAfterDismiss", () => {
  const three: ToastEntry[] = [
    { key: "importar", tone: "error", message: "Uno" },
    { key: "redes", tone: "error", message: "Dos" },
    { key: "deshacer", tone: "info", message: "Tres" },
  ];

  it("con «Entendido», el foco pasa al aviso siguiente, o al anterior si era el último", () => {
    expect(toastAfterDismiss(three, 1, false)).toEqual({ kind: "toast", key: "deshacer" });
    expect(toastAfterDismiss(three, 2, false)).toEqual({ kind: "toast", key: "redes" });
  });

  it("si no queda ningún aviso, vuelve adonde diga el aviso o quien pinta la región", () => {
    expect(toastAfterDismiss([importError], 0, false)).toEqual({ kind: "return" });
  });

  it("tras usar la acción de un aviso, vuelve siempre adonde diga el aviso, aunque queden otros", () => {
    expect(toastAfterDismiss(three, 2, true)).toEqual({ kind: "return" });
    expect(toastAfterDismiss(three, 0, true)).toEqual({ kind: "return" });
  });
});
