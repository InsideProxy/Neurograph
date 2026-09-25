// Buscador de regiones (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.8): qué regiones sugiere lo escrito y
// en qué orden, cuándo avisa de las redes ocultas, cuál queda activa, qué
// hace cada tecla en el campo y cuándo Ctrl+K lleva a él. Funciones puras:
// se prueban sin DOM.
import type { GraphNode } from "../types/domain";
import { shortcutLabel } from "./clipboard";
import { SIDE_IN_ABBREVIATION, networkShortLabel, regionNameWithSide, regionTitleParts } from "./displayText";
import { isTextEntry, type ShortcutTarget } from "./historyStep";
import { listboxKey, type ListboxKeyResult } from "./listbox";

// Como mucho, 8 sugerencias (spec 5.8).
export const SEARCH_LIMIT = 8;

// Sin mayúsculas ni tildes: «Área» y «area» son lo mismo. NFD separa cada
// letra de su tilde, y \p{Mn} quita las tildes. Los espacios de más no
// cuentan.
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export interface RegionSuggestion {
  id: string;
  // La abreviatura, con su lado si no lo lleva: «TE1m (izq.)»
  // (regionNameWithSide, logic/displayText.ts).
  label: string;
  // El nombre completo sin «(hemisferio …)», o null si no dice nada más
  // (regionTitleParts).
  name: string | null;
  network: string;
}

// Aviso de las redes ocultas: qué dice y qué redes muestra su botón.
export interface HiddenHint {
  message: string;
  networks: string[];
}

export interface RegionSearchResult {
  // Sugerencias de las redes visibles, como mucho SEARCH_LIMIT.
  suggestions: RegionSuggestion[];
  // Aviso de las redes ocultas, si lo hay.
  hidden: HiddenHint | null;
  // Lo escrito no coincide con ninguna región, ni visible ni oculta.
  noMatch: boolean;
}

interface Match {
  node: GraphNode;
  level: number;
  // Abreviatura sin el lado (o nombre, si no la tiene), para ordenar.
  sortKey: string;
}

// El nombre completo, sin «(hemisferio …)».
function fullName(node: GraphNode): string {
  const { main, secondary } = regionTitleParts(node);
  return secondary ?? main;
}

// La abreviatura sin el lado que llevan algunas (SIDE_IN_ABBREVIATION):
// «L_SFG_7_1» se busca y se ordena como «SFG_7_1», así que el par
// izquierdo y derecho quedan juntos.
function bareAbbreviation(node: GraphNode): string | null {
  return node.abbreviation === null ? null : node.abbreviation.replace(SIDE_IN_ABBREVIATION, "");
}

// Nivel de una abreviatura: 0, exacta; 1, empieza por lo escrito; 2, lo
// contiene. null si no coincide.
function abbreviationLevel(abbreviation: string, query: string): number | null {
  if (abbreviation === "") return null;
  if (abbreviation === query) return 0;
  if (abbreviation.startsWith(query)) return 1;
  return abbreviation.includes(query) ? 2 : null;
}

// Nivel de la coincidencia (spec 5.8): el mejor de la abreviatura sin el
// lado y de la entera (así «l_sfg_7_1» también encuentra L_SFG_7_1); si no,
// 3, el nombre completo que lo contiene. null si no coincide.
function matchLevel(node: GraphNode, query: string): number | null {
  const levels = [bareAbbreviation(node), node.abbreviation]
    .map((abbreviation) => (abbreviation === null ? null : abbreviationLevel(normalizeSearch(abbreviation), query)))
    .filter((level): level is number => level !== null);
  if (levels.length > 0) return Math.min(...levels);
  return normalizeSearch(fullName(node)).includes(query) ? 3 : null;
}

// A igualdad de nivel, por abreviatura (con los números en su orden: 7
// antes que 10) y por lado: izquierdo, derecho y sin hemisferio.
const SIDE_ORDER = { L: 0, R: 1 } as const;
const sideOrder = (node: GraphNode) => (node.hemisphere === null ? 2 : SIDE_ORDER[node.hemisphere]);

function compareMatches(a: Match, b: Match): number {
  return (
    a.level - b.level ||
    a.sortKey.localeCompare(b.sortKey, "es", { numeric: true }) ||
    sideOrder(a.node) - sideOrder(b.node) ||
    (a.node.id < b.node.id ? -1 : a.node.id > b.node.id ? 1 : 0)
  );
}

function joinNames(names: readonly string[]): string {
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

// El aviso de las redes ocultas (spec 5.8): nombra la región, si todas las
// coincidencias ocultas son la misma («TE1m», también las dos de un par), o
// «Lo escrito», y su red o sus redes; con más de tres, solo cuántas. El
// botón las muestra todas.
function hiddenHint(matches: readonly Match[]): HiddenHint {
  const networks = [...new Set(matches.map(({ node }) => node.network))];
  const names = new Set(matches.map(({ node }) => bareAbbreviation(node) ?? regionTitleParts(node).main));
  const who = names.size === 1 ? [...names][0] : "Lo escrito";
  const where =
    networks.length === 1
      ? `la red ${networkShortLabel(networks[0])}, que está oculta`
      : networks.length <= 3
        ? `las redes ${joinNames(networks.map(networkShortLabel))}, que están ocultas`
        : `${networks.length} redes ocultas`;
  return { message: `${who} está en ${where}.`, networks };
}

export function searchRegions(
  nodes: readonly GraphNode[],
  query: string,
  hiddenNetworks: ReadonlySet<string>,
): RegionSearchResult {
  const wanted = normalizeSearch(query);
  if (wanted === "") return { suggestions: [], hidden: null, noMatch: false };
  const matches: Match[] = [];
  for (const node of nodes) {
    const level = matchLevel(node, wanted);
    if (level !== null) matches.push({ node, level, sortKey: normalizeSearch(bareAbbreviation(node) ?? fullName(node)) });
  }
  matches.sort(compareMatches);
  // Solo redes visibles (spec 5.8): las regiones de una red oculta no se
  // ven en las vistas.
  const visible = matches.filter(({ node }) => !hiddenNetworks.has(node.network));
  const inHidden = matches.filter(({ node }) => hiddenNetworks.has(node.network));
  // El aviso sale si nada visible coincide, o si la abreviatura exacta solo
  // está en redes ocultas, aunque haya sugerencias visibles: «pf» con la
  // red de PF oculta lo dice, aunque se vean PFm y PFop.
  const exact = matches.filter(({ level }) => level === 0);
  const hidden =
    visible.length === 0 && inHidden.length > 0
      ? hiddenHint(inHidden)
      : exact.length > 0 && exact.every(({ node }) => hiddenNetworks.has(node.network))
        ? hiddenHint(exact)
        : null;
  return {
    suggestions: visible.slice(0, SEARCH_LIMIT).map(({ node }) => ({
      id: node.id,
      label: regionNameWithSide(node),
      name: regionTitleParts(node).secondary,
      network: node.network,
    })),
    hidden,
    noMatch: matches.length === 0,
  };
}

export const NO_MATCH_TEXT = "Ninguna región coincide.";

// Sugerencia activa al escribir: la primera, salvo que ya esté seleccionada;
// entonces, la primera que no lo esté. Así, escribir «te1m» e Intro dos
// veces añade las dos. Si todas lo están, la primera.
export function defaultActiveIndex(suggestions: readonly RegionSuggestion[], selectedIds: ReadonlySet<string>): number {
  const index = suggestions.findIndex((suggestion) => !selectedIds.has(suggestion.id));
  return index === -1 ? 0 : index;
}

// Qué hace cada tecla en el campo (patrón combobox, spec 5.8). Con la lista
// abierta, como en la lista del contexto de datos (logic/listbox.ts): las
// flechas se mueven, Intro elige, Escape cierra y Tab cierra y sigue.
// Espacio, Inicio y Fin son del campo: escriben o mueven el cursor. Sin
// lista, la flecha abajo la abre y Escape vacía el campo a la primera.
export type SearchKeyResult = ListboxKeyResult | { kind: "open" } | { kind: "clear" };

export function searchKey(
  key: string,
  state: { open: boolean; active: number; count: number; hasText: boolean },
): SearchKeyResult {
  if (state.open) {
    if (key === " " || key === "Home" || key === "End") return { kind: "ignore" };
    return listboxKey(key, state.active, state.count);
  }
  if (key === "ArrowDown" && state.count > 0) return { kind: "open" };
  if (key === "Escape" && state.hasText) return { kind: "clear" };
  return { kind: "ignore" };
}

// Atajo del buscador (spec 5.8): Ctrl+K, o ⌘K en macOS, con la tecla física
// si el teclado no tiene letras latinas. Las mismas reglas que los atajos
// del historial (logic/historyStep.ts): no con Alt ni Mayús, ni con la tecla
// repetida, ni si otro ya atendió el evento, ni dentro de otro campo de
// texto. En el propio buscador sí (inRegionSearch): selecciona lo escrito.
export function regionSearchShortcut(
  event: Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey" | "repeat" | "defaultPrevented">,
  target: ShortcutTarget | null,
  inRegionSearch = false,
): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.repeat || event.defaultPrevented) return false;
  const letter = /^[a-z]$/i.test(event.key) ? event.key.toLowerCase() : event.code === "KeyK" ? "k" : "";
  return letter === "k" && (inRegionSearch || !isTextEntry(target));
}

// Cómo se escribe el atajo en cada sistema, como el de copiar
// (logic/clipboard.ts): «⌘K» en macOS, «Ctrl+K» en los demás.
export function searchShortcutLabel(userAgent: string): string {
  return shortcutLabel("K", userAgent);
}
