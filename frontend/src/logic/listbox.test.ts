import { describe, expect, it } from "vitest";
import { initialActiveIndex, listboxKey } from "./listbox";

describe("listboxKey", () => {
  it("las flechas mueven la opción activa sin salirse de la lista", () => {
    expect(listboxKey("ArrowDown", 0, 3)).toEqual({ kind: "move", index: 1 });
    expect(listboxKey("ArrowDown", 2, 3)).toEqual({ kind: "move", index: 2 });
    expect(listboxKey("ArrowUp", 2, 3)).toEqual({ kind: "move", index: 1 });
    expect(listboxKey("ArrowUp", 0, 3)).toEqual({ kind: "move", index: 0 });
  });

  it("Inicio y Fin van a la primera y a la última", () => {
    expect(listboxKey("Home", 2, 3)).toEqual({ kind: "move", index: 0 });
    expect(listboxKey("End", 0, 3)).toEqual({ kind: "move", index: 2 });
  });

  it("Intro y la barra espaciadora eligen la opción activa", () => {
    expect(listboxKey("Enter", 1, 3)).toEqual({ kind: "choose", index: 1 });
    expect(listboxKey(" ", 1, 3)).toEqual({ kind: "choose", index: 1 });
  });

  it("Escape cierra; Tab cierra y deja que el foco siga su camino", () => {
    expect(listboxKey("Escape", 1, 3)).toEqual({ kind: "close", keepDefault: false });
    expect(listboxKey("Tab", 1, 3)).toEqual({ kind: "close", keepDefault: true });
  });

  it("las demás teclas no hacen nada; con la lista vacía solo cierran Escape y Tab", () => {
    expect(listboxKey("a", 1, 3)).toEqual({ kind: "ignore" });
    expect(listboxKey("ArrowDown", 0, 0)).toEqual({ kind: "ignore" });
    expect(listboxKey("Enter", 0, 0)).toEqual({ kind: "ignore" });
    expect(listboxKey("Escape", 0, 0)).toEqual({ kind: "close", keepDefault: false });
  });

  it("un índice fuera de rango se corrige antes de usarlo", () => {
    expect(listboxKey("ArrowDown", 7, 3)).toEqual({ kind: "move", index: 2 });
    expect(listboxKey("Enter", -1, 3)).toEqual({ kind: "choose", index: 0 });
  });
});

describe("initialActiveIndex", () => {
  it("al abrir, la opción activa es la elegida; si no hay ninguna, la primera", () => {
    expect(initialActiveIndex(2, 4)).toBe(2);
    expect(initialActiveIndex(-1, 4)).toBe(0);
    expect(initialActiveIndex(9, 4)).toBe(0);
    expect(initialActiveIndex(-1, 0)).toBe(0);
  });
});
