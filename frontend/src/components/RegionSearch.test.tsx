import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { RegionSearchResult } from "../logic/regionSearch";
import { RegionSearch, RegionSearchView } from "./RegionSearch";

const noop = () => {};
const AUDITORY = "cole-anticevic.auditory";
const VISUAL = "cole-anticevic.visual";
const TE1M: RegionSearchResult["suggestions"] = [
  { id: "l_te1m", label: "TE1m (izq.)", name: "Area TE1 Middle", network: AUDITORY },
  { id: "r_te1m", label: "TE1m (der.)", name: "Area TE1 Middle", network: AUDITORY },
];

const HANDLERS = { onQueryChange: noop, onKeyDown: noop, onFocusChange: noop, onChoose: noop, onHover: noop, onShowNetworks: noop };

function view(result: RegionSearchResult, open: boolean, selected: string[] = []) {
  const state = { baseId: "busca", query: "te1m", result, open, active: 0, selectedIds: new Set(selected), shortcutLabel: "Ctrl+K" };
  return renderToStaticMarkup(<RegionSearchView {...state} {...HANDLERS} />);
}

describe("RegionSearch", () => {
  it("es un combobox con nombre y con su atajo, y empieza cerrado y sin lista", () => {
    const html = renderToStaticMarkup(<RegionSearch nodes={[]} />);
    const input = html.match(/<input[^>]*>/)?.[0] ?? "";
    for (const attribute of ['role="combobox"', 'aria-autocomplete="list"', 'aria-expanded="false"', 'aria-keyshortcuts="Control+K Meta+K"']) {
      expect(input).toContain(attribute);
    }
    expect(input).not.toContain("aria-controls");
    expect(input).not.toContain("aria-activedescendant");
    const id = input.match(/ id="([^"]+)"/)?.[1];
    expect(html).toContain(`<label class="visually-hidden" for="${id}">Buscar una región</label>`);
    expect(html).not.toContain('role="listbox"');
  });

  it("abierto, el campo controla la lista y apunta a la sugerencia activa", () => {
    const html = view({ suggestions: TE1M, hidden: null, noMatch: false }, true, ["l_te1m"]);
    expect(html).toContain('aria-expanded="true" aria-controls="busca-list" aria-activedescendant="busca-option-0"');
    expect(html).toContain('<ul id="busca-list" class="region-search__list" role="listbox" aria-label="Regiones sugeridas">');
    expect(html).toContain('<li id="busca-option-0" class="region-search__option region-search__option--active" role="option" aria-selected="true">');
    expect(html).toContain('<li id="busca-option-1" class="region-search__option" role="option" aria-selected="false">');
    expect(html).toContain('<span class="region-search__label">TE1m (izq.)</span><span class="region-search__name"> Area TE1 Middle</span>');
    expect(html.match(/seleccionada/g)).toHaveLength(1);
  });

  it("los avisos van en una línea bajo el campo: el de las redes ocultas, con su botón, también junto a la lista", () => {
    const one = view(
      { suggestions: [], hidden: { message: "TE1m está en la red Auditiva, que está oculta.", networks: [AUDITORY] }, noMatch: false },
      false,
    );
    expect(one).toContain(
      '<div class="region-search__status" role="status"><span>TE1m está en la red Auditiva, que está oculta.</span><button type="button" class="filters__text-btn filters__text-btn--strong">Mostrar la red</button></div>',
    );
    expect(one).not.toContain('role="listbox"');
    const both = view(
      {
        suggestions: TE1M,
        hidden: { message: "TE1m está en las redes Auditiva y Visual, que están ocultas.", networks: [AUDITORY, VISUAL] },
        noMatch: false,
      },
      true,
    );
    expect(both).toContain(">Mostrar las redes</button></div><ul");
    expect(view({ suggestions: [], hidden: null, noMatch: true }, false)).toContain(
      '<div class="region-search__status" role="status"><span>Ninguna región coincide.</span></div>',
    );
  });
});
