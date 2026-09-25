import { describe, expect, it } from "vitest";
import type { GraphNode } from "../types/domain";
import {
  SEARCH_LIMIT,
  defaultActiveIndex,
  normalizeSearch,
  regionSearchShortcut,
  searchKey,
  searchRegions,
  searchShortcutLabel,
} from "./regionSearch";

const AUDITORY = "cole-anticevic.auditory";
const VISUAL = "cole-anticevic.visual";
const FRONTOPARIETAL = "cole-anticevic.frontoparietal";
const DEFAULT = "cole-anticevic.default";

// Regiones con el nombre que da la ingesta: el completo y, al final, su
// hemisferio.
function region(id: string, abbreviation: string | null, hemisphere: "L" | "R" | null, name: string, network = AUDITORY): GraphNode {
  const side = hemisphere === "L" ? " (hemisferio izquierdo)" : hemisphere === "R" ? " (hemisferio derecho)" : "";
  return { id, label: `${name}${side}`, abbreviation, hemisphere, network, position3d: [0, 0, 0], referenceSpace: null };
}

const NODES = [
  region("r_te1m", "TE1m", "R", "Area TE1 Middle"),
  region("a5", "A5", "L", "Auditory 5 Complex next to TE1"),
  region("l_pte1", "PTE1", "L", "Area PTE1"),
  region("l_te1m", "TE1m", "L", "Area TE1 Middle"),
  region("l_te1a", "TE1a", "L", "Area TE1 anterior"),
  region("l_te1", "TE1", "L", "Area TE1"),
  region("l_v1", "V1", "L", "Primary Visual Cortex", VISUAL),
];
const NONE_HIDDEN = new Set<string>();

const labels = (query: string, hidden: ReadonlySet<string> = NONE_HIDDEN, nodes = NODES) =>
  searchRegions(nodes, query, hidden).suggestions.map((suggestion) => suggestion.label);

describe("searchRegions", () => {
  it("ordena: abreviatura exacta, que empieza por lo escrito, que lo contiene y nombre que lo contiene", () => {
    expect(labels("te1")).toEqual(["TE1 (izq.)", "TE1a (izq.)", "TE1m (izq.)", "TE1m (der.)", "PTE1 (izq.)", "A5 (izq.)"]);
  });

  it("no distingue mayúsculas ni tildes, ni en lo escrito ni en el nombre", () => {
    expect(normalizeSearch("  Área   TE1m ")).toBe("area te1m");
    expect(labels("ÁREA te1 MIDDLE")).toEqual(["TE1m (izq.)", "TE1m (der.)"]);
    expect(labels("area de", NONE_HIDDEN, [region("x1", "X1", "L", "Área de prueba")])).toEqual(["X1 (izq.)"]);
  });

  it(`sugiere como mucho ${SEARCH_LIMIT} regiones`, () => {
    const many = Array.from({ length: 12 }, (_, i) => region(`r${i}`, `R${i}`, "L", `Región ${i}`));
    expect(labels("r", NONE_HIDDEN, many)).toHaveLength(SEARCH_LIMIT);
  });

  it("cada sugerencia lleva el nombre sin «(hemisferio …)», y el lado solo si la abreviatura no lo lleva", () => {
    expect(searchRegions(NODES, "te1m", NONE_HIDDEN).suggestions).toEqual([
      { id: "l_te1m", label: "TE1m (izq.)", name: "Area TE1 Middle", network: AUDITORY },
      { id: "r_te1m", label: "TE1m (der.)", name: "Area TE1 Middle", network: AUDITORY },
    ]);
    expect(labels("brain", NONE_HIDDEN, [region("bs", "BS", null, "Brain Stem")])).toEqual(["BS"]);
  });

  it("las abreviaturas con el lado se buscan y se ordenan sin él, con los números en su orden: el par queda junto", () => {
    const brainnetome = [
      region("sfg_10_1_l", "L_SFG_10_1", "L", "Superior frontal gyrus, area 10"),
      region("sfg_7_2_r", "R_SFG_7_2", "R", "Superior frontal gyrus, area 7"),
      region("sfg_7_1_r", "R_SFG_7_1", "R", "Superior frontal gyrus, area 7"),
      region("sfg_7_2_l", "L_SFG_7_2", "L", "Superior frontal gyrus, area 7"),
      region("sfg_7_1_l", "L_SFG_7_1", "L", "Superior frontal gyrus, area 7"),
    ];
    expect(labels("sfg", NONE_HIDDEN, brainnetome)).toEqual(["L_SFG_7_1", "R_SFG_7_1", "L_SFG_7_2", "R_SFG_7_2", "L_SFG_10_1"]);
    expect(labels("l_sfg_7_1", NONE_HIDDEN, brainnetome)).toEqual(["L_SFG_7_1"]);
    const gordon = [region("g12", "l_default_12", "L", "Default 12"), region("g2", "l_default_2", "L", "Default 2")];
    expect(labels("default", NONE_HIDDEN, gordon)).toEqual(["l_default_2", "l_default_12"]);
  });

  it("solo sugiere regiones de redes visibles", () => {
    expect(labels("1", new Set([AUDITORY]))).toEqual(["V1 (izq.)"]);
  });

  it("si lo escrito solo está en redes ocultas, lo dice y nombra la red", () => {
    expect(searchRegions(NODES, "te1m", new Set([AUDITORY]))).toEqual({
      suggestions: [],
      hidden: { message: "TE1m está en la red Auditiva, que está oculta.", networks: [AUDITORY] },
      noMatch: false,
    });
  });

  it("una abreviatura exacta que solo está en redes ocultas se avisa aunque haya sugerencias visibles", () => {
    const nodes = [
      region("l_pf", "PF", "L", "Area PF Complex", FRONTOPARIETAL),
      region("r_pf", "PF", "R", "Area PF Complex", FRONTOPARIETAL),
      region("l_pfm", "PFm", "L", "Area PFm Complex", DEFAULT),
    ];
    expect(searchRegions(nodes, "pf", new Set([FRONTOPARIETAL]))).toEqual({
      suggestions: [{ id: "l_pfm", label: "PFm (izq.)", name: "Area PFm Complex", network: DEFAULT }],
      hidden: { message: "PF está en la red Frontoparietal, que está oculta.", networks: [FRONTOPARIETAL] },
      noMatch: false,
    });
    expect(searchRegions(nodes, "pf", NONE_HIDDEN).hidden).toBeNull();
  });

  it("si solo está oculta una parte de las coincidencias exactas, avisa de esa parte y la nombra con su lado", () => {
    // Como TE1m en Cole-Anticevic: la izquierda en Por defecto y la derecha
    // en Frontoparietal.
    const split = [region("l_te1m", "TE1m", "L", "Area TE1 Middle", DEFAULT), region("r_te1m", "TE1m", "R", "Area TE1 Middle", FRONTOPARIETAL)];
    expect(searchRegions(split, "te1m", new Set([DEFAULT]))).toEqual({
      suggestions: [{ id: "r_te1m", label: "TE1m (der.)", name: "Area TE1 Middle", network: FRONTOPARIETAL }],
      hidden: { message: "TE1m (izq.) está en la red Por defecto, que está oculta.", networks: [DEFAULT] },
      noMatch: false,
    });
  });

  it("con coincidencias en varias redes ocultas, las nombra; con más de tres, dice cuántas", () => {
    const split = [region("l_te1m", "TE1m", "L", "Area TE1 Middle"), region("r_te1m", "TE1m", "R", "Area TE1 Middle", VISUAL)];
    expect(searchRegions(split, "te1m", new Set([AUDITORY, VISUAL])).hidden).toEqual({
      message: "TE1m está en las redes Auditiva y Visual, que están ocultas.",
      networks: [AUDITORY, VISUAL],
    });
    const spread = [AUDITORY, VISUAL, FRONTOPARIETAL, DEFAULT].map((network, i) => region(`r${i}`, `R${i}`, "L", `Región ${i}`, network));
    expect(searchRegions(spread, "r", new Set([AUDITORY, VISUAL, FRONTOPARIETAL, DEFAULT])).hidden).toEqual({
      message: "Lo escrito está en 4 redes ocultas.",
      networks: [AUDITORY, VISUAL, FRONTOPARIETAL, DEFAULT],
    });
  });

  it("al unir las redes, «e» y no «y» ante el sonido /i/, salvo si forma diptongo con la vocal siguiente", () => {
    const pair = (network: string) => [region("l_x1", "X1", "L", "Area X1", VISUAL), region("r_x1", "X1", "R", "Area X1", network)];
    expect(searchRegions(pair("power2011.hippocampus"), "x1", new Set([VISUAL, "power2011.hippocampus"])).hidden?.message).toBe(
      "X1 está en las redes Visual e Hipocampo — Hippocampus, que están ocultas.",
    );
    expect(searchRegions(pair("Ínsula"), "x1", new Set([VISUAL, "Ínsula"])).hidden?.message).toBe(
      "X1 está en las redes Visual e Ínsula, que están ocultas.",
    );
    expect(searchRegions(pair("Hielo"), "x1", new Set([VISUAL, "Hielo"])).hidden?.message).toBe(
      "X1 está en las redes Visual y Hielo, que están ocultas.",
    );
  });

  it("sin nada escrito no busca, y sin ninguna coincidencia lo dice", () => {
    expect(searchRegions(NODES, "   ", NONE_HIDDEN)).toEqual({ suggestions: [], hidden: null, noMatch: false });
    expect(searchRegions(NODES, "zzz", NONE_HIDDEN)).toEqual({ suggestions: [], hidden: null, noMatch: true });
  });
});

describe("defaultActiveIndex", () => {
  const suggestions = ["a", "b", "c"].map((id) => ({ id, label: id, name: null, network: VISUAL }));

  it("la primera sugerencia que no está ya seleccionada; si todas lo están, la primera", () => {
    expect(defaultActiveIndex(suggestions, new Set())).toBe(0);
    expect(defaultActiveIndex(suggestions, new Set(["a"]))).toBe(1);
    expect(defaultActiveIndex(suggestions, new Set(["a", "b", "c"]))).toBe(0);
  });
});

describe("searchKey", () => {
  const open = { open: true, active: 1, count: 3, hasText: true };
  const closed = { open: false, active: 0, count: 3, hasText: true };

  it("con la lista abierta: flechas, Intro, Escape y Tab, como la lista del contexto de datos", () => {
    expect(searchKey("ArrowDown", open)).toEqual({ kind: "move", index: 2 });
    expect(searchKey("ArrowUp", open)).toEqual({ kind: "move", index: 0 });
    expect(searchKey("Enter", open)).toEqual({ kind: "choose", index: 1 });
    expect(searchKey("Escape", open)).toEqual({ kind: "close", keepDefault: false });
    expect(searchKey("Tab", open)).toEqual({ kind: "close", keepDefault: true });
    for (const key of [" ", "Home", "End", "a"]) expect(searchKey(key, open)).toEqual({ kind: "ignore" });
  });

  it("sin lista: la flecha abajo la abre y Escape vacía el campo a la primera", () => {
    expect(searchKey("ArrowDown", closed)).toEqual({ kind: "open" });
    expect(searchKey("ArrowDown", { ...closed, count: 0 })).toEqual({ kind: "ignore" });
    expect(searchKey("Escape", closed)).toEqual({ kind: "clear" });
    expect(searchKey("Escape", { ...closed, count: 0 })).toEqual({ kind: "clear" });
    expect(searchKey("Escape", { ...closed, hasText: false })).toEqual({ kind: "ignore" });
    expect(searchKey("Enter", closed)).toEqual({ kind: "ignore" });
  });
});

describe("regionSearchShortcut", () => {
  const NO_KEYS = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, repeat: false, defaultPrevented: false };
  const key = (k: string, mods: Partial<KeyboardEvent> = {}) => ({ key: k, code: `Key${k.toUpperCase()}`, ...NO_KEYS, ...mods });
  const body = { tagName: "BODY" };

  it("Ctrl+K y ⌘K, también con un teclado sin letras latinas", () => {
    expect(regionSearchShortcut(key("k", { ctrlKey: true }), body)).toBe(true);
    expect(regionSearchShortcut(key("k", { metaKey: true }), body)).toBe(true);
    expect(regionSearchShortcut({ ...key("л", { ctrlKey: true }), code: "KeyK" }, body)).toBe(true);
  });

  it("no con Mayús o Alt, repetida, ya atendida o dentro de otro campo de texto; en el propio buscador, sí", () => {
    expect(regionSearchShortcut(key("k"), body)).toBe(false);
    expect(regionSearchShortcut(key("K", { ctrlKey: true, shiftKey: true }), body)).toBe(false);
    expect(regionSearchShortcut(key("k", { ctrlKey: true, altKey: true }), body)).toBe(false);
    expect(regionSearchShortcut(key("k", { ctrlKey: true, repeat: true }), body)).toBe(false);
    expect(regionSearchShortcut(key("k", { ctrlKey: true, defaultPrevented: true }), body)).toBe(false);
    const field = { tagName: "INPUT", type: "text" };
    expect(regionSearchShortcut(key("k", { ctrlKey: true }), field)).toBe(false);
    expect(regionSearchShortcut(key("k", { ctrlKey: true }), field, true)).toBe(true);
  });

  it("el atajo se nombra como en cada sistema, igual que el de copiar", () => {
    expect(searchShortcutLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)")).toBe("⌘K");
    expect(searchShortcutLabel("Mozilla/5.0 (X11; Linux x86_64)")).toBe("Ctrl+K");
  });
});
