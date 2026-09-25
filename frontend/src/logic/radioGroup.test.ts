import { describe, expect, it } from "vitest";
import { nextRadioIndex, type ArrowKeyEvent } from "./radioGroup";

const press = (key: string, modifiers: Partial<ArrowKeyEvent> = {}): ArrowKeyEvent => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  ...modifiers,
});

describe("nextRadioIndex", () => {
  it("Derecha y Abajo van al radio siguiente; Izquierda y Arriba, al anterior", () => {
    expect(nextRadioIndex(press("ArrowRight"), 0, 3)).toBe(1);
    expect(nextRadioIndex(press("ArrowDown"), 1, 3)).toBe(2);
    expect(nextRadioIndex(press("ArrowLeft"), 2, 3)).toBe(1);
    expect(nextRadioIndex(press("ArrowUp"), 1, 3)).toBe(0);
  });

  it("dan la vuelta en los extremos, también en WebKit", () => {
    expect(nextRadioIndex(press("ArrowRight"), 2, 3)).toBe(0);
    expect(nextRadioIndex(press("ArrowDown"), 2, 3)).toBe(0);
    expect(nextRadioIndex(press("ArrowLeft"), 0, 3)).toBe(2);
    expect(nextRadioIndex(press("ArrowUp"), 0, 3)).toBe(2);
  });

  it("con Alt, Ctrl o Meta, o con otra tecla, no mueven nada", () => {
    expect(nextRadioIndex(press("ArrowRight", { altKey: true }), 0, 3)).toBeNull();
    expect(nextRadioIndex(press("ArrowLeft", { ctrlKey: true }), 1, 3)).toBeNull();
    expect(nextRadioIndex(press("ArrowDown", { metaKey: true }), 1, 3)).toBeNull();
    for (const key of ["Tab", " ", "Enter", "Home", "End", "a"]) {
      expect(nextRadioIndex(press(key), 1, 3), key).toBeNull();
    }
  });

  it("un índice que no es del grupo no mueve nada", () => {
    expect(nextRadioIndex(press("ArrowRight"), -1, 3)).toBeNull();
    expect(nextRadioIndex(press("ArrowLeft"), 3, 3)).toBeNull();
    expect(nextRadioIndex(press("ArrowDown"), 0, 0)).toBeNull();
  });
});
