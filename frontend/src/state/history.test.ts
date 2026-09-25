import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFiltersStore } from "./filters";
import { HISTORY_LIMIT, redo, resetHistory, setPointerHeld, undo, useHistoryStore } from "./history";
import { useSelectionStore } from "./selection";

// El historial registra cada cambio en una microtarea: así, los cambios
// que llegan juntos son un solo paso. await flush() la deja pasar.
const flush = () => Promise.resolve();
const selection = () => useSelectionStore.getState();
const filters = () => useFiltersStore.getState();
const history = () => useHistoryStore.getState();

beforeEach(() => {
  useSelectionStore.setState({ selectedNodeIds: new Set(), selectedConnectionId: null });
  useFiltersStore.setState({ hiddenNetworks: new Set(), hiddenConnectionTypes: new Set(), minWeight: 0 });
  resetHistory();
});

afterEach(() => {
  vi.useRealTimers();
  setPointerHeld(false);
});

describe("historial", () => {
  it("registra un cambio de la selección, lo deshace y lo rehace con los mismos Set", async () => {
    const empty = selection().selectedNodeIds;
    selection().toggleNode("a");
    await flush();
    const withA = selection().selectedNodeIds;
    expect(history().past).toHaveLength(1);
    undo();
    expect(selection().selectedNodeIds).toBe(empty);
    redo();
    expect(selection().selectedNodeIds).toBe(withA);
  });

  it("lo que llega a la vez a los dos stores es un solo paso, y deshacerlo no registra nada más", async () => {
    filters().setHiddenNetworks(new Set(["red"]));
    selection().selectNodes(["a", "b"]);
    await flush();
    expect(history().past).toHaveLength(1);
    undo();
    await flush();
    expect(filters().hiddenNetworks.size).toBe(0);
    expect(selection().selectedNodeIds.size).toBe(0);
    expect(history().past).toHaveLength(0);
    expect(history().future).toHaveLength(1);
  });

  it("«Todas» con ninguna red oculta no es un paso", async () => {
    filters().setHiddenNetworks(new Set());
    await flush();
    expect(history().past).toHaveLength(0);
  });

  it("un cambio nuevo tras deshacer borra lo que se podía rehacer", async () => {
    selection().toggleNode("a");
    await flush();
    selection().toggleNode("b");
    await flush();
    undo();
    expect(history().future).toHaveLength(1);
    selection().toggleNode("c");
    await flush();
    expect(history().future).toHaveLength(0);
    redo();
    expect([...selection().selectedNodeIds]).toEqual(["a", "c"]);
  });

  it("no registra lo que él mismo restaura", async () => {
    selection().toggleNode("a");
    await flush();
    undo();
    await flush();
    expect(history().past).toHaveLength(0);
    expect(history().future).toHaveLength(1);
  });

  it("un arrastre del deslizador es un solo paso, que se registra al soltar", async () => {
    vi.useFakeTimers();
    setPointerHeld(true);
    for (const weight of [0.001, 0.002, 0.004]) {
      filters().setMinWeight(weight);
      await flush();
      vi.advanceTimersByTime(600);
    }
    expect(history().past).toHaveLength(0);
    setPointerHeld(false);
    expect(history().past).toHaveLength(1);
    undo();
    expect(filters().minWeight).toBe(0);
  });

  it("un arrastre que acaba donde empezó no es un paso, y no borra lo que se podía rehacer", async () => {
    selection().toggleNode("a");
    await flush();
    undo();
    setPointerHeld(true);
    filters().setMinWeight(0.004);
    await flush();
    filters().setMinWeight(0);
    await flush();
    setPointerHeld(false);
    expect(history().past).toHaveLength(0);
    expect(history().future).toHaveLength(1);
    expect(history().pendingFrom).toBeNull();
  });

  it("con el teclado, los cambios de peso a menos de 500 ms se juntan", async () => {
    vi.useFakeTimers();
    filters().setMinWeight(0.001);
    await flush();
    vi.advanceTimersByTime(300);
    filters().setMinWeight(0.002);
    await flush();
    vi.advanceTimersByTime(300);
    expect(history().past).toHaveLength(0);
    vi.advanceTimersByTime(300);
    expect(history().past).toHaveLength(1);
    filters().setMinWeight(0.004);
    await flush();
    vi.advanceTimersByTime(600);
    expect(history().past).toHaveLength(2);
    undo();
    expect(filters().minWeight).toBe(0.002);
  });

  it("un cambio de peso pendiente seguido de uno de la selección son dos pasos, en orden", async () => {
    vi.useFakeTimers();
    filters().setMinWeight(0.004);
    await flush();
    selection().toggleNode("a");
    await flush();
    expect(history().past).toHaveLength(2);
    undo();
    expect(selection().selectedNodeIds.size).toBe(0);
    expect(filters().minWeight).toBe(0.004);
    undo();
    expect(filters().minWeight).toBe(0);
  });

  it("deshacer con un cambio de peso sin registrar vuelve al valor de antes", async () => {
    vi.useFakeTimers();
    filters().setMinWeight(0.004);
    await flush();
    undo();
    expect(filters().minWeight).toBe(0);
  });

  it("al cambiar de atlas se vacía, y parte de lo que hay ahora", async () => {
    selection().toggleNode("a");
    await flush();
    resetHistory();
    expect(history().past).toHaveLength(0);
    expect(history().future).toHaveLength(0);
    undo();
    expect([...selection().selectedNodeIds]).toEqual(["a"]);
  });

  it(`guarda como mucho ${HISTORY_LIMIT} pasos`, async () => {
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      selection().toggleNode(`r${i}`);
      await flush();
    }
    expect(history().past).toHaveLength(HISTORY_LIMIT);
  });

  it("guarda el último paso para el aviso, y deshacer lo retira", async () => {
    selection().selectNodes(["a", "b", "c"]);
    await flush();
    selection().selectConnection("c1");
    await flush();
    expect(history().lastStep?.before.selectedNodeIds.size).toBe(3);
    expect(history().lastStep?.after.selectedConnectionId).toBe("c1");
    undo();
    expect(history().lastStep).toBeNull();
  });
});
