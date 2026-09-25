// Historial de deshacer y rehacer (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.7). Guarda instantáneas de la
// selección y de los filtros. Se suscribe a sus dos stores, que son del
// desarrollador principal, sin cambiar su código ni su API, y las restaura
// con setState. No registra los cambios que provoca él mismo.
// - Los cambios que llegan en la misma tarea son un solo paso: «Resaltar»
//   una red oculta la muestra y la selecciona a la vez.
// - Un arrastre del deslizador de peso es un solo paso: se registra al
//   soltar el puntero (setPointerHeld). Con el teclado, los cambios de peso
//   que llegan a menos de 500 ms se juntan. Si el peso vuelve a donde
//   estaba, no hay paso.
// - Guarda los 50 últimos pasos.
// - App lo vacía al cambiar de atlas o de clasificación (resetHistory).
import { create } from "zustand";
import { changedKinds, type HistorySnapshot } from "../logic/historyStep";
import { useFiltersStore } from "./filters";
import { useSelectionStore } from "./selection";

export const HISTORY_LIMIT = 50;
export const WEIGHT_SETTLE_MS = 500;

interface HistoryState {
  // Instantáneas de antes de cada paso, de la más antigua a la más reciente.
  past: HistorySnapshot[];
  // El estado de los stores tal como se registró por última vez.
  present: HistorySnapshot;
  // Instantáneas de después de cada paso deshecho; la primera es la próxima.
  future: HistorySnapshot[];
  // Cambio de peso todavía sin registrar: la instantánea de antes.
  pendingFrom: HistorySnapshot | null;
  // Sube con cada cambio del historial. lastStep es el último paso
  // registrado, hasta el siguiente cambio: App decide con él si sale el
  // aviso con «Deshacer» (logic/historyStep.ts, stepNotice).
  version: number;
  lastStep: { before: HistorySnapshot; after: HistorySnapshot } | null;
}

function currentSnapshot(): HistorySnapshot {
  const { selectedNodeIds, selectedConnectionId } = useSelectionStore.getState();
  const { hiddenNetworks, hiddenConnectionTypes, minWeight } = useFiltersStore.getState();
  return { selectedNodeIds, selectedConnectionId, hiddenNetworks, hiddenConnectionTypes, minWeight };
}

export const useHistoryStore = create<HistoryState>(() => ({
  past: [],
  present: currentSnapshot(),
  future: [],
  pendingFrom: null,
  version: 0,
  lastStep: null,
}));

let restoring = false;
let batchScheduled = false;
let pointerHeld = false;
let settleTimer: ReturnType<typeof setTimeout> | undefined;

function bump(changes: Partial<HistoryState>) {
  useHistoryStore.setState((state) => ({ ...changes, version: state.version + 1 }));
}

// Registra el cambio de peso pendiente como un paso. Si el peso ha vuelto a
// donde estaba, no hay paso, y lo que se podía rehacer se conserva.
function commitPendingWeight() {
  clearTimeout(settleTimer);
  const { pendingFrom, present, past } = useHistoryStore.getState();
  if (pendingFrom === null) return;
  if (changedKinds(pendingFrom, present).length === 0) {
    bump({ pendingFrom: null, lastStep: null });
    return;
  }
  bump({
    past: [...past, pendingFrom].slice(-HISTORY_LIMIT),
    future: [],
    pendingFrom: null,
    lastStep: { before: pendingFrom, after: present },
  });
}

function settleWeight() {
  // Mientras el puntero sigue pulsado, el arrastre no ha terminado.
  if (!pointerHeld) commitPendingWeight();
}

function record(next: HistorySnapshot) {
  const { present, pendingFrom } = useHistoryStore.getState();
  const kinds = changedKinds(present, next);
  if (kinds.length === 0) return;
  if (kinds.length === 1 && kinds[0] === "weight") {
    // Deslizador: se junta con los cambios de peso que siguen.
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settleWeight, WEIGHT_SETTLE_MS);
    bump({ present: next, pendingFrom: pendingFrom ?? present, lastStep: null });
    return;
  }
  commitPendingWeight();
  const { past, present: before } = useHistoryStore.getState();
  bump({ past: [...past, before].slice(-HISTORY_LIMIT), present: next, future: [], lastStep: { before, after: next } });
}

function flushBatch() {
  if (!batchScheduled) return;
  batchScheduled = false;
  record(currentSnapshot());
}

function scheduleRecord() {
  if (restoring || batchScheduled) return;
  batchScheduled = true;
  queueMicrotask(flushBatch);
}

const unsubscribers = [useSelectionStore.subscribe(scheduleRecord), useFiltersStore.subscribe(scheduleRecord)];

// En desarrollo, al recargar este módulo en caliente, el módulo anterior
// deja de escuchar a los stores.
import.meta.hot?.dispose(() => {
  for (const unsubscribe of unsubscribers) unsubscribe();
});

// Pone en los stores una instantánea: los mismos Set y valores que tenían.
function apply(snapshot: HistorySnapshot) {
  restoring = true;
  try {
    useSelectionStore.setState({
      selectedNodeIds: snapshot.selectedNodeIds,
      selectedConnectionId: snapshot.selectedConnectionId,
    });
    useFiltersStore.setState({
      hiddenNetworks: snapshot.hiddenNetworks,
      hiddenConnectionTypes: snapshot.hiddenConnectionTypes,
      minWeight: snapshot.minWeight,
    });
  } finally {
    restoring = false;
  }
}

export function undo() {
  flushBatch();
  commitPendingWeight();
  const { past, present, future } = useHistoryStore.getState();
  const previous = past.at(-1);
  if (!previous) return;
  apply(previous);
  bump({ past: past.slice(0, -1), present: previous, future: [present, ...future], lastStep: null });
}

export function redo() {
  flushBatch();
  commitPendingWeight();
  const { past, present, future } = useHistoryStore.getState();
  const next = future[0];
  if (!next) return;
  apply(next);
  bump({ past: [...past, present].slice(-HISTORY_LIMIT), present: next, future: future.slice(1), lastStep: null });
}

// Vacía el historial: la instantánea de partida es lo que haya ahora en los
// stores. App lo llama al cambiar de atlas y cuando llega otra
// clasificación de redes.
export function resetHistory() {
  batchScheduled = false;
  clearTimeout(settleTimer);
  bump({ past: [], present: currentSnapshot(), future: [], pendingFrom: null, lastStep: null });
}

// Puntero pulsado o suelto sobre el deslizador de peso
// (useHistoryShortcuts): un arrastre se registra al soltar.
export function setPointerHeld(held: boolean) {
  pointerHeld = held;
  if (!held) commitPendingWeight();
}
