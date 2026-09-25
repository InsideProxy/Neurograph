import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DepthFadeToggle } from "./DepthFadeToggle";

const noop = () => {};

describe("DepthFadeToggle", () => {
  it("es un botón de alternar con aria-pressed y el texto del spec", () => {
    const on = renderToStaticMarkup(<DepthFadeToggle enabled onToggle={noop} />);
    expect(on).toMatch(/<button type="button"[^>]*aria-pressed="true"[^>]*>Atenuar lo que queda detrás<\/button>/);
    const off = renderToStaticMarkup(<DepthFadeToggle enabled={false} onToggle={noop} />);
    expect(off).toMatch(/<button type="button"[^>]*aria-pressed="false"[^>]*>Atenuar lo que queda detrás<\/button>/);
  });

  it("activado, lleva el estilo de estado activo de los botones de herramienta", () => {
    expect(renderToStaticMarkup(<DepthFadeToggle enabled onToggle={noop} />)).toContain(
      'class="export-btn export-btn--active"',
    );
    expect(renderToStaticMarkup(<DepthFadeToggle enabled={false} onToggle={noop} />)).toContain('class="export-btn"');
  });

  it("va dentro de su propio contenedor, no suelto en la barra", () => {
    expect(renderToStaticMarkup(<DepthFadeToggle enabled onToggle={noop} />)).toMatch(
      /^<div class="brain3d-depth-fade"><button /,
    );
  });
});
