// Pruebas de marcado del contexto de datos (revisión de la Task 1):
// renderToStaticMarkup, sin DOM, como el resto de pruebas de componentes
// del plan (comun.md).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataContextMenu } from "./DataContextMenu";

const OPTIONS = [
  { value: "a", label: "Opción A" },
  { value: "b", label: "Opción B" },
];

describe("DataContextMenu", () => {
  it("el botón cerrado anuncia la lista desplegable sin abrirla", () => {
    const markup = renderToStaticMarkup(
      <DataContextMenu caption="Atlas" valueLabel="A" options={OPTIONS} value="a" onChange={() => {}} />,
    );
    expect(markup).toContain('aria-haspopup="listbox"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("aria-controls");
    expect(markup).not.toContain('role="listbox"');
  });

  it("mientras carga, lo dice al lector de pantalla, en el icono y en la etiqueta emergente", () => {
    const markup = renderToStaticMarkup(
      <DataContextMenu
        caption="Redes"
        valueLabel="Cole-Anticevic"
        title="Cole-Anticevic (Ji et al., 2019)"
        options={OPTIONS}
        value="a"
        onChange={() => {}}
        pending
      />,
    );
    expect(markup).toContain(", cargando");
    expect(markup).toContain("data-menu__spinner");
    expect(markup).toContain("Cole-Anticevic (Ji et al., 2019) (cargando");
  });

  it("sin carga, no hay ningún indicio de carga en el marcado", () => {
    const markup = renderToStaticMarkup(
      <DataContextMenu
        caption="Redes"
        valueLabel="Cole-Anticevic"
        title="Cole-Anticevic (Ji et al., 2019)"
        options={OPTIONS}
        value="a"
        onChange={() => {}}
      />,
    );
    expect(markup).not.toContain(", cargando");
    expect(markup).not.toContain("data-menu__spinner");
    expect(markup).not.toContain("cargando");
  });
});
