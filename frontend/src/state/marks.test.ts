import { beforeEach, describe, expect, it } from "vitest";
import { useMarksStore } from "./marks";

const marks = () => useMarksStore.getState();

beforeEach(() => {
  useMarksStore.setState({ markedIds: new Set() });
});

describe("marcas de regiones", () => {
  it("empiezan vacías", () => {
    expect(useMarksStore.getInitialState().markedIds.size).toBe(0);
  });

  it("marcar y desmarcar una región crea siempre un Set nuevo, sin tocar el anterior", () => {
    const empty = marks().markedIds;
    marks().toggleMark("a");
    const withA = marks().markedIds;
    expect(withA).not.toBe(empty);
    expect([...withA]).toEqual(["a"]);
    marks().toggleMark("b");
    marks().toggleMark("a");
    expect([...marks().markedIds]).toEqual(["b"]);
    expect([...withA]).toEqual(["a"]);
  });

  it("«Quitar marcas» las vacía; sin marcas, no cambia nada", () => {
    marks().toggleMark("a");
    marks().toggleMark("b");
    marks().clearMarks();
    expect(marks().markedIds.size).toBe(0);
    let changes = 0;
    const unsubscribe = useMarksStore.subscribe(() => changes++);
    marks().clearMarks();
    unsubscribe();
    expect(changes).toBe(0);
  });
});
