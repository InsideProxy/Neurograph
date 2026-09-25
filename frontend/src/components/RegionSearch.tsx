// Buscador de regiones (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.8): un campo con autocompletado en
// Filtros, sobre la selección, con el patrón combobox. Sugiere regiones de
// las redes visibles (logic/regionSearch.ts). Elegir una la añade a la
// selección con addNodes, del store de selección, así que es un paso que se
// puede deshacer (5.7). El campo se vacía y conserva el foco, para seguir
// añadiendo. Si lo buscado está en redes ocultas, lo dice en una línea bajo
// el campo, con un botón para mostrarlas: una lista (listbox) no puede
// llevar botones. Ctrl+K lleva aquí (useRegionSearchShortcut, desde App).
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";
import {
  NO_MATCH_TEXT,
  defaultActiveIndex,
  searchKey,
  searchRegions,
  searchShortcutLabel,
  type RegionSearchResult,
} from "../logic/regionSearch";
import { useFiltersStore } from "../state/filters";
import { useSelectionStore } from "../state/selection";
import { useDrawColors } from "../theme/useDrawColors";
import type { GraphNode } from "../types/domain";
import { Icon } from "./Icon";

interface RegionSearchViewProps {
  baseId: string;
  query: string;
  result: RegionSearchResult;
  // La lista está abierta y active es la sugerencia activa.
  open: boolean;
  active: number;
  selectedIds: ReadonlySet<string>;
  shortcutLabel: string;
  inputRef?: Ref<HTMLInputElement>;
  listRef?: Ref<HTMLUListElement>;
  onQueryChange: (query: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onFocusChange: (focused: boolean) => void;
  onChoose: (index: number) => void;
  // El ratón pasa por una sugerencia: pasa a ser la activa.
  onHover: (index: number) => void;
  onShowNetworks: (networks: readonly string[]) => void;
}

// El buscador sin estado: se prueba con cualquier resultado.
export function RegionSearchView(props: RegionSearchViewProps) {
  const { baseId, query, result, open, active, selectedIds, shortcutLabel, inputRef, listRef } = props;
  const { onQueryChange, onKeyDown, onFocusChange, onChoose, onHover, onShowNetworks } = props;
  const { networkColor } = useDrawColors();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const hint = result.hidden;
  return (
    <div className="region-search">
      <label className="visually-hidden" htmlFor={inputId}>Buscar una región</label>
      <div className="region-search__field">
        <Icon name="search" size={14} className="region-search__icon" />
        <input
          ref={inputRef}
          id={inputId}
          className="region-search__input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? optionId(active) : undefined}
          aria-keyshortcuts="Control+K Meta+K"
          placeholder={`Buscar región (${shortcutLabel})`}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
        />
      </div>
      {/* Siempre presente, para que se anuncie lo que aparezca en ella. Va
          bajo el campo; la lista, que flota, bajo ella. */}
      <div className="region-search__status" role="status">
        {hint && (
          <>
            <span>{hint.message}</span>
            <button
              type="button"
              className="filters__text-btn filters__text-btn--strong"
              onClick={() => onShowNetworks(hint.networks)}
            >
              {hint.networks.length === 1 ? "Mostrar la red" : "Mostrar las redes"}
            </button>
          </>
        )}
        {result.noMatch && <span>{NO_MATCH_TEXT}</span>}
      </div>
      {/* La lista solo está en la página mientras está abierta: la guarda de
          los atajos de deshacer busca listas abiertas ([role="listbox"]).
          Un clic en ella no se lleva el foco del campo. */}
      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="region-search__list"
          role="listbox"
          aria-label="Regiones sugeridas"
          onMouseDown={(event) => event.preventDefault()}
        >
          {result.suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={optionId(index)}
              className={`region-search__option${index === active ? " region-search__option--active" : ""}`}
              role="option"
              aria-selected={index === active}
              onClick={() => onChoose(index)}
              onMouseMove={() => onHover(index)}
            >
              <span className="region-search__dot" style={{ backgroundColor: networkColor(suggestion.network) }} aria-hidden="true" />
              <span className="region-search__text">
                <span className="region-search__label">{suggestion.label}</span>
                {suggestion.name && <span className="region-search__name"> {suggestion.name}</span>}
              </span>
              {selectedIds.has(suggestion.id) && (
                <span className="region-search__selected">
                  <span className="visually-hidden">, </span>seleccionada
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RegionSearch({ nodes }: { nodes: readonly GraphNode[] }) {
  const hiddenNetworks = useFiltersStore((state) => state.hiddenNetworks);
  const toggleNetwork = useFiltersStore((state) => state.toggleNetwork);
  const selectedNodeIds = useSelectionStore((state) => state.selectedNodeIds);
  const addNodes = useSelectionStore((state) => state.addNodes);
  const [query, setQuery] = useState("");
  // null: la sugerencia activa por defecto (defaultActiveIndex).
  const [active, setActive] = useState<number | null>(null);
  // Escape cerró la lista; se vuelve a abrir al escribir o con la flecha abajo.
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Si la sugerencia activa debe desplazarse a la vista: al abrir la lista,
  // al escribir y con el teclado, nunca al pasar el ratón (como en
  // DataContextMenu).
  const scrollActiveRef = useRef(true);
  const baseId = useId();

  const result = useMemo(() => searchRegions(nodes, query, hiddenNetworks), [nodes, query, hiddenNetworks]);
  const { suggestions } = result;
  const open = focused && !dismissed && suggestions.length > 0;
  const current = Math.min(active ?? defaultActiveIndex(suggestions, selectedNodeIds), Math.max(suggestions.length - 1, 0));

  // La sugerencia activa, a la vista: con dos líneas cada una, ocho no caben
  // en la lista. Se ajusta list.scrollTop a mano, porque scrollIntoView
  // desplazaría también a .app--workspace, que tiene overflow: hidden. Lo
  // visible se mide sin el borde (clientTop, clientHeight).
  useEffect(() => {
    if (!open || !scrollActiveRef.current) return;
    scrollActiveRef.current = false;
    const list = listRef.current;
    const option = document.getElementById(`${baseId}-option-${current}`);
    if (!list || !option) return;
    const top = list.getBoundingClientRect().top + list.clientTop;
    const bottom = top + list.clientHeight;
    const box = option.getBoundingClientRect();
    if (box.top < top) list.scrollTop -= top - box.top;
    else if (box.bottom > bottom) list.scrollTop += box.bottom - bottom;
  }, [open, current, baseId]);

  const restart = (text: string) => {
    scrollActiveRef.current = true;
    setQuery(text);
    setActive(null);
    setDismissed(false);
  };

  // Elegir una región la añade a la selección (spec 5.8). Si ya estaba, no
  // cambia nada: ni siquiera se llama a addNodes, que crearía otro Set.
  const choose = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    if (!selectedNodeIds.has(suggestion.id)) addNodes([suggestion.id]);
    restart("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const action = searchKey(event.key, { open, active: current, count: suggestions.length, hasText: query !== "" });
    switch (action.kind) {
      case "ignore":
        return;
      case "move":
        event.preventDefault();
        scrollActiveRef.current = true;
        setActive(action.index);
        return;
      case "choose":
        event.preventDefault();
        choose(action.index);
        return;
      case "close":
        if (!action.keepDefault) event.preventDefault();
        setDismissed(true);
        return;
      case "open":
        event.preventDefault();
        scrollActiveRef.current = true;
        setActive(null);
        setDismissed(false);
        return;
      case "clear":
        event.preventDefault();
        restart("");
        return;
      default: {
        // Comprobación exhaustiva, como en DataContextMenu: un resultado
        // nuevo de searchKey que no se trate aquí no compila.
        const exhaustive: never = action;
        return exhaustive;
      }
    }
  };

  const onFocusChange = (isFocused: boolean) => {
    if (isFocused) scrollActiveRef.current = true;
    setFocused(isFocused);
  };

  const onHover = (index: number) => {
    scrollActiveRef.current = false;
    setActive(index);
  };

  // «Mostrar la red» o «Mostrar las redes»: dejan de estar ocultas, la lista
  // vuelve a abrirse y el foco vuelve al campo, donde ya salen sus regiones.
  const showNetworks = (networks: readonly string[]) => {
    for (const network of networks) toggleNetwork(network);
    scrollActiveRef.current = true;
    setDismissed(false);
    inputRef.current?.focus();
  };

  return (
    <RegionSearchView
      baseId={baseId}
      query={query}
      result={result}
      open={open}
      active={current}
      selectedIds={selectedNodeIds}
      shortcutLabel={searchShortcutLabel(typeof navigator === "undefined" ? "" : navigator.userAgent)}
      inputRef={inputRef}
      listRef={listRef}
      onQueryChange={restart}
      onKeyDown={onKeyDown}
      onFocusChange={onFocusChange}
      onChoose={choose}
      onHover={onHover}
      onShowNetworks={showNetworks}
    />
  );
}
