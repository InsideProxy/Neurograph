import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HistoryButtons, HistoryButtonsView } from "./HistoryButtons";

const noop = () => {};

describe("HistoryButtons", () => {
  it("sin pasos, los dos botones llevan aria-disabled y lo dicen en su etiqueta emergente", () => {
    // Con renderToStaticMarkup, zustand da el estado inicial del historial:
    // sin pasos.
    const html = renderToStaticMarkup(<HistoryButtons nodes={[]} connections={[]} />);
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(html).toContain('data-tip="Nada que deshacer"');
    expect(html).toContain('data-tip="Nada que rehacer"');
  });

  it("con un paso, su botón lo describe; los dos declaran sus atajos de teclado", () => {
    const html = renderToStaticMarkup(
      <HistoryButtonsView
        undo={{ enabled: true, tip: "Deshacer: añadir IFJa (der.) a la selección" }}
        redo={{ enabled: false, tip: "Nada que rehacer" }}
        onUndo={noop}
        onRedo={noop}
      />,
    );
    expect(html).toContain(
      'aria-label="Deshacer" aria-disabled="false" aria-keyshortcuts="Control+Z Meta+Z" title="Deshacer: añadir IFJa (der.) a la selección" data-tip="Deshacer: añadir IFJa (der.) a la selección"',
    );
    expect(html).toContain('aria-label="Rehacer" aria-disabled="true" aria-keyshortcuts="Control+Shift+Z Control+Y Meta+Shift+Z"');
  });
});
