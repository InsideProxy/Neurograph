import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DataStatus, TopBar, type TopBarTab } from "./TopBar";

const noop = () => {};

const TABS: TopBarTab[] = [
  { id: "atlas", label: "Atlas", icon: "atlas", active: true, onSelect: noop },
  { id: "species", label: "Comparar especies", icon: "species", active: false, onSelect: noop },
  {
    id: "synthesis-1",
    label: "Memoria de trabajo",
    icon: "synthesis",
    active: false,
    onSelect: noop,
    onClose: noop,
    closeLabel: 'Cerrar pestaña de síntesis "Memoria de trabajo"',
  },
];

// Profundidad máxima de <button> anidados: un botón dentro de otro no es HTML válido.
function maxButtonDepth(html: string): number {
  let depth = 0;
  let max = 0;
  for (const match of html.matchAll(/<(\/?)button\b/g)) {
    depth += match[1] ? -1 : 1;
    max = Math.max(max, depth);
  }
  return max;
}

describe("TopBar", () => {
  const html = renderToStaticMarkup(<TopBar tabs={TABS} onImport={noop} />);

  it("marca solo la pestaña activa, con aria-current", () => {
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    const fromCurrent = html.slice(html.indexOf('aria-current="page"'));
    expect(fromCurrent.slice(0, fromCurrent.indexOf("</button>"))).toContain("Atlas");
  });

  it("una pestaña de síntesis se cierra con su propio <button>, sin anidar", () => {
    expect(html).toContain(
      'class="topbar__tab-close" aria-label="Cerrar pestaña de síntesis &quot;Memoria de trabajo&quot;"',
    );
    expect(html).not.toContain('role="button"');
    expect(maxButtonDepth(html)).toBe(1);
  });

  it("Importar y las pestañas llevan su etiqueta emergente, también para el teclado (data-tip), y su nombre en un texto que se puede plegar", () => {
    expect(html).toContain('title="Importar una síntesis de IA" data-tip="Importar una síntesis de IA"');
    expect(html).toContain('<span class="topbar__import-label">Importar</span>');
    expect(html).toContain('data-tip="Comparar especies"');
    expect(html).toContain('<span class="topbar__tab-label">Comparar especies</span>');
  });

  it("cada pestaña lleva su data-tab-id, para que TopBar pueda enfocarla tras cerrar una síntesis", () => {
    expect(html).toContain('data-tab-id="atlas"');
    expect(html).toContain('data-tab-id="species"');
    expect(html).toContain('data-tab-id="synthesis-1"');
  });

  it("--active y --closable solo aparecen cuando toca, nunca juntas aquí", () => {
    expect(html).toContain('class="topbar__tab topbar__tab--active"'); // atlas: activa, no cerrable
    expect(html).toContain('class="topbar__tab"'); // species: ni activa ni cerrable
    expect(html).toContain('class="topbar__tab topbar__tab--closable"'); // synthesis-1: cerrable, inactiva
  });
});

describe("DataStatus", () => {
  it('las tres variantes son una región role="status", para que el cambio se anuncie', () => {
    expect(renderToStaticMarkup(<DataStatus kind="loading" />)).toContain('role="status"');
    expect(renderToStaticMarkup(<DataStatus kind="real" regionCount={1} connectionCount={1} />)).toContain(
      'role="status"',
    );
    expect(renderToStaticMarkup(<DataStatus kind="demo" />)).toContain('role="status"');
  });

  it('"loading" muestra un punto neutro con "Cargando…", sin title ni texto oculto', () => {
    const html = renderToStaticMarkup(<DataStatus kind="loading" />);
    expect(html).toContain('<span class="data-status data-status--loading" role="status">');
    expect(html).toContain('<span class="data-status__text">Cargando…</span>');
    expect(html).not.toContain("title=");
    expect(html).not.toContain("visually-hidden");
  });

  it("con datos reales, la etiqueta emergente dice qué es y da las cifras, y el texto oculto no trocea el número", () => {
    const html = renderToStaticMarkup(<DataStatus kind="real" regionCount={360} connectionCount={64620} />);
    expect(html).toContain('<span class="data-status__text">Datos reales</span>');
    expect(html).toContain('title="Datos reales · 360 regiones · 64\u00a0620 conexiones"');
    // Sin agrupar: un espacio duro en medio del número puede hacer que la
    // voz lo trocee ("64" pausa "620") en vez de decirlo entero.
    expect(html).toContain('<span class="visually-hidden">: 360 regiones · 64620 conexiones</span>');
  });

  it("con datos de demostración, lo dice, la etiqueta emergente conserva el aviso de siempre entero, y el texto oculto es una frase corta", () => {
    const html = renderToStaticMarkup(<DataStatus kind="demo" />);
    expect(html).toContain("Datos de demostración");
    expect(html).toContain("Datos sintéticos · solo ilustrativos.");
    expect(html).toContain("revisa que el backend esté en marcha");
    expect(html).toContain('<span class="visually-hidden">: datos sintéticos, solo ilustrativos</span>');
  });
});
