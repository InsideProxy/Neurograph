// Pasos del historial de deshacer (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.7): qué cambia entre dos
// instantáneas, cómo se dice, si merece el aviso con «Deshacer», qué dicen
// los botones y qué atajo de teclado deshace o rehace. Funciones puras: se
// prueban sin DOM.
import type { ConnectionType } from "../state/filters";
import { CONNECTION_TYPE_LABELS } from "../theme/networks";
import type { GraphConnection, GraphNode } from "../types/domain";
import { connectionTitle, formatCount, formatWeightAtMost, networkShortLabel, regionNameWithSide } from "./displayText";

// La selección y los filtros en un momento dado (state/history.ts). Son
// los mismos Set que tenían los stores: ninguno de los dos los modifica,
// siempre crea uno nuevo.
export interface HistorySnapshot {
  selectedNodeIds: Set<string>;
  selectedConnectionId: string | null;
  hiddenNetworks: Set<string>;
  hiddenConnectionTypes: Set<ConnectionType>;
  minWeight: number;
  // Las regiones marcadas (spec 5.9; state/marks.ts), que tampoco modifica
  // su Set.
  markedIds: Set<string>;
}

// Con qué se nombra lo que cambia: las regiones cargadas y, cuando hace
// falta, una conexión, que se busca solo entonces.
export interface StepContext {
  nodeById: ReadonlyMap<string, GraphNode>;
  findConnection: (id: string) => GraphConnection | undefined;
}

export type ChangeKind = "selection" | "networks" | "types" | "weight" | "marks";

function missing<T>(from: ReadonlySet<T>, other: ReadonlySet<T>): T[] {
  return [...from].filter((item) => !other.has(item));
}

function sameSet<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  return a === b || (a.size === b.size && missing(a, b).length === 0);
}

// Qué ha cambiado de una instantánea a otra. Compara el contenido de los
// Set, no solo la referencia: «Todas» con ninguna red oculta crea un Set
// nuevo, pero no cambia nada.
export function changedKinds(before: HistorySnapshot, after: HistorySnapshot): ChangeKind[] {
  const kinds: ChangeKind[] = [];
  if (
    before.selectedConnectionId !== after.selectedConnectionId ||
    !sameSet(before.selectedNodeIds, after.selectedNodeIds)
  ) {
    kinds.push("selection");
  }
  if (!sameSet(before.hiddenNetworks, after.hiddenNetworks)) kinds.push("networks");
  if (!sameSet(before.hiddenConnectionTypes, after.hiddenConnectionTypes)) kinds.push("types");
  if (before.minWeight !== after.minWeight) kinds.push("weight");
  if (!sameSet(before.markedIds, after.markedIds)) kinds.push("marks");
  return kinds;
}

// Nombre de una región en una descripción, con su lado: «IFJa (der.)»
// (logic/displayText.ts). Una región que no está cargada es de otro atlas:
// App no vacía la selección al cambiar de atlas, así que sus ids siguen en
// el store. Se nombra de forma genérica, y no con su id en crudo
// («region.human.hcp-mmp1.r_v1»).
function regionName(id: string, context: StepContext): string {
  const node = context.nodeById.get(id);
  return node ? regionNameWithSide(node) : "una región de otro atlas";
}

function describeSelection(before: HistorySnapshot, after: HistorySnapshot, context: StepContext): string {
  if (after.selectedConnectionId !== null && after.selectedConnectionId !== before.selectedConnectionId) {
    const connection = context.findConnection(after.selectedConnectionId);
    return `seleccionar la conexión ${connection ? connectionTitle(connection, context.nodeById) : after.selectedConnectionId}`;
  }
  const added = missing(after.selectedNodeIds, before.selectedNodeIds);
  const removed = missing(before.selectedNodeIds, after.selectedNodeIds);
  // Quitar la única región seleccionada es «quitar», no «limpiar».
  if (after.selectedNodeIds.size === 0 && after.selectedConnectionId === null) {
    return removed.length === 1 && before.selectedConnectionId === null
      ? `quitar ${regionName(removed[0], context)} de la selección`
      : "limpiar la selección";
  }
  // Sustituir: se quita algo a la vez que se añade, o se deja una conexión
  // por una región.
  if (added.length > 0 && (removed.length > 0 || before.selectedConnectionId !== null)) {
    return added.length === 1 ? `seleccionar ${regionName(added[0], context)}` : `seleccionar ${formatCount(added.length)} regiones`;
  }
  if (added.length > 0) {
    return added.length === 1
      ? `añadir ${regionName(added[0], context)} a la selección`
      : `añadir ${formatCount(added.length)} regiones`;
  }
  return removed.length === 1
    ? `quitar ${regionName(removed[0], context)} de la selección`
    : `quitar ${formatCount(removed.length)} regiones`;
}

// Marcas (spec 5.9): «marcar IFJa (der.)», «desmarcar IFJa (der.)» o, con
// «Quitar marcas» de varias, «quitar las marcas (5)». Quitar la única marca
// es «desmarcar», como quitar la única región seleccionada.
function describeMarks(before: HistorySnapshot, after: HistorySnapshot, context: StepContext): string {
  const added = missing(after.markedIds, before.markedIds);
  const removed = missing(before.markedIds, after.markedIds);
  if (added.length > 0 && removed.length > 0) return "cambiar las marcas";
  if (added.length > 0) {
    return added.length === 1 ? `marcar ${regionName(added[0], context)}` : `marcar ${formatCount(added.length)} regiones`;
  }
  if (removed.length === 1) return `desmarcar ${regionName(removed[0], context)}`;
  return after.markedIds.size === 0
    ? `quitar las marcas (${formatCount(removed.length)})`
    : `desmarcar ${formatCount(removed.length)} regiones`;
}

function describeHidden(
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
  one: (item: string, hide: boolean) => string,
  many: (count: number, hide: boolean) => string,
  mixed: string,
): string {
  const hidden = missing(after, before);
  const shown = missing(before, after);
  if (hidden.length > 0 && shown.length > 0) return mixed;
  const items = hidden.length > 0 ? hidden : shown;
  return items.length === 1 ? one(items[0], hidden.length > 0) : many(items.length, hidden.length > 0);
}

// Descripción de un paso, en castellano, para la etiqueta emergente de
// Deshacer y Rehacer: «añadir IFJa (der.) a la selección», «quitar 3
// regiones», «seleccionar la conexión V1 (izq.) ↔ V1 (der.)», «limpiar la
// selección», «ocultar la red Visual», «peso mínimo de 1.0e-3 a 3.9e-3»,
// «marcar IFJa (der.)», «quitar las marcas (5)» o, si cambian varias cosas,
// «varios cambios». El peso se escribe sin redondearlo hacia arriba
// (formatWeightAtMost, logic/displayText.ts).
export function describeStep(before: HistorySnapshot, after: HistorySnapshot, context: StepContext): string {
  const kinds = changedKinds(before, after);
  if (kinds.length !== 1) return "varios cambios";
  switch (kinds[0]) {
    case "selection":
      return describeSelection(before, after, context);
    case "networks":
      return describeHidden(
        before.hiddenNetworks,
        after.hiddenNetworks,
        (network, hide) => `${hide ? "ocultar" : "mostrar"} la red ${networkShortLabel(network)}`,
        (count, hide) => `${hide ? "ocultar" : "mostrar"} ${count} redes`,
        "cambiar las redes visibles",
      );
    case "types":
      return describeHidden(
        before.hiddenConnectionTypes,
        after.hiddenConnectionTypes,
        (type, hide) => `${hide ? "ocultar" : "mostrar"} el tipo ${CONNECTION_TYPE_LABELS[type] ?? type}`,
        (count, hide) => `${hide ? "ocultar" : "mostrar"} ${count} tipos`,
        "cambiar los tipos visibles",
      );
    case "weight":
      return `peso mínimo de ${formatWeightAtMost(before.minWeight)} a ${formatWeightAtMost(after.minWeight)}`;
    case "marks":
      return describeMarks(before, after, context);
  }
}

// El aviso con «Deshacer» sale cuando un paso quita dos o más regiones de
// la selección: un clic en una línea, «Resaltar» otra red o «Limpiar». Solo
// cuentan las regiones del atlas que se está viendo (isLoaded): los ids de
// un atlas anterior se quedan en el store, y no se ven. null si el paso no
// lo merece.
// Marcas (spec 5.9): sale también cuando «Quitar marcas» quita dos o más,
// porque un clic de más perdería igual lo que se había montado.
export function stepNotice(
  before: HistorySnapshot,
  after: HistorySnapshot,
  isLoaded: (id: string) => boolean,
): string | null {
  const removed = missing(before.selectedNodeIds, after.selectedNodeIds).filter(isLoaded);
  if (removed.length < 2) {
    const unmarked = missing(before.markedIds, after.markedIds).filter(isLoaded);
    return unmarked.length < 2 ? null : `Se quitaron las marcas de ${formatCount(unmarked.length)} regiones`;
  }
  const replaced = [...before.selectedNodeIds].filter(isLoaded).length;
  const emptied = after.selectedNodeIds.size === 0 && after.selectedConnectionId === null;
  return `${emptied ? "Se vació" : "Se sustituyó"} la selección de ${formatCount(replaced)} regiones`;
}

// Lo que necesitan los botones: el historial tal como lo guarda
// state/history.ts.
export interface HistoryView {
  past: readonly HistorySnapshot[];
  present: HistorySnapshot;
  future: readonly HistorySnapshot[];
  pendingFrom: HistorySnapshot | null;
}

export interface HistoryButtonState {
  enabled: boolean;
  tip: string;
}

// Estado y etiqueta emergente de «Deshacer» y «Rehacer»: el paso que se
// desharía o se reharía, o que no hay ninguno. Un cambio de peso que todavía
// no se ha registrado (pendingFrom) ya se puede deshacer, y con él ya no hay
// nada que rehacer; si el peso ha vuelto a donde estaba, no cuenta.
export function historyButtons(
  history: HistoryView,
  context: StepContext,
): { undo: HistoryButtonState; redo: HistoryButtonState } {
  const pending =
    history.pendingFrom !== null && changedKinds(history.pendingFrom, history.present).length > 0
      ? history.pendingFrom
      : null;
  const undoFrom = pending ?? history.past.at(-1) ?? null;
  const redoTo = pending ? null : (history.future[0] ?? null);
  return {
    undo: undoFrom
      ? { enabled: true, tip: `Deshacer: ${describeStep(undoFrom, history.present, context)}` }
      : { enabled: false, tip: "Nada que deshacer" },
    redo: redoTo
      ? { enabled: true, tip: `Rehacer: ${describeStep(history.present, redoTo, context)}` }
      : { enabled: false, tip: "Nada que rehacer" },
  };
}

// Tipos de <input> en los que se escribe: ahí los atajos de teclado son
// del campo.
const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "number", "password", "tel", "url"]);

// Dónde está el foco cuando llega un atajo de teclado.
export interface ShortcutTarget {
  tagName: string;
  type?: string;
  isContentEditable?: boolean;
}

// Si el foco está donde se escribe: ahí los atajos de teclado son del campo.
// La comparten los del historial y el del buscador de regiones (5.8).
export function isTextEntry(target: ShortcutTarget | null): boolean {
  return (
    target !== null &&
    (target.isContentEditable === true ||
      target.tagName === "TEXTAREA" ||
      (target.tagName === "INPUT" && TEXT_INPUT_TYPES.has(target.type ?? "text")))
  );
}

// Atajo de teclado del historial: Ctrl+Z (⌘Z en macOS) deshace; Ctrl+Mayús+Z,
// ⌘Mayús+Z y Ctrl+Y rehacen. Con distribuciones de teclado sin letras
// latinas, se mira la tecla física (code). No actúa dentro de un campo de
// texto, si la tecla se repite al mantenerla pulsada o si otro ya atendió
// el evento (defaultPrevented).
export function historyShortcut(
  event: Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey" | "repeat" | "defaultPrevented">,
  target: ShortcutTarget | null,
): "undo" | "redo" | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.repeat || event.defaultPrevented) return null;
  if (isTextEntry(target)) return null;
  const letter = /^[a-z]$/i.test(event.key)
    ? event.key.toLowerCase()
    : event.code === "KeyZ"
      ? "z"
      : event.code === "KeyY"
        ? "y"
        : "";
  if (letter === "z") return event.shiftKey ? "redo" : "undo";
  if (letter === "y" && event.ctrlKey && !event.shiftKey) return "redo";
  return null;
}
