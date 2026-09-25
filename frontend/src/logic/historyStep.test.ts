import { describe, expect, it } from "vitest";
import type { ConnectionType } from "../state/filters";
import type { GraphConnection, GraphNode } from "../types/domain";
import {
  changedKinds,
  describeStep,
  historyButtons,
  historyShortcut,
  stepNotice,
  type HistorySnapshot,
} from "./historyStep";

function region(id: string, abbreviation: string, hemisphere: "L" | "R"): GraphNode {
  const side = hemisphere === "L" ? "izquierdo" : "derecho";
  return {
    id,
    label: `Area ${abbreviation} (hemisferio ${side})`,
    abbreviation,
    hemisphere,
    network: "cole-anticevic.visual",
    position3d: [0, 0, 0],
    referenceSpace: null,
  };
}

const NODES = [region("r_ifja", "IFJa", "R"), region("l_v1", "V1", "L"), region("r_v1", "V1", "R"), region("r_fef", "FEF", "R")];
const CONNECTION: GraphConnection = { id: "c1", source: "l_v1", target: "r_v1", type: "structural", weight: 0.1, evidenceLevel: "direct" };
const CONTEXT = {
  nodeById: new Map(NODES.map((n) => [n.id, n])),
  findConnection: (id: string) => (id === CONNECTION.id ? CONNECTION : undefined),
};
const LOADED = (id: string) => NODES.some((n) => n.id === id);

function snapshot(changes: Partial<HistorySnapshot> = {}): HistorySnapshot {
  return {
    selectedNodeIds: new Set(),
    selectedConnectionId: null,
    hiddenNetworks: new Set(),
    hiddenConnectionTypes: new Set<ConnectionType>(),
    minWeight: 0,
    markedIds: new Set(),
    ...changes,
  };
}

describe("describeStep", () => {
  it("añadir o quitar regiones de la selección, con su lado", () => {
    const one = snapshot({ selectedNodeIds: new Set(["l_v1"]) });
    const two = snapshot({ selectedNodeIds: new Set(["l_v1", "r_ifja"]) });
    expect(describeStep(one, two, CONTEXT)).toBe("añadir IFJa (der.) a la selección");
    expect(describeStep(two, one, CONTEXT)).toBe("quitar IFJa (der.) de la selección");
    const four = snapshot({ selectedNodeIds: new Set(["l_v1", "r_v1", "r_ifja", "r_fef"]) });
    expect(describeStep(four, one, CONTEXT)).toBe("quitar 3 regiones");
    expect(describeStep(one, four, CONTEXT)).toBe("añadir 3 regiones");
  });

  it("quitar la única región seleccionada es «quitar», no «limpiar»", () => {
    expect(describeStep(snapshot({ selectedNodeIds: new Set(["r_ifja"]) }), snapshot(), CONTEXT)).toBe(
      "quitar IFJa (der.) de la selección",
    );
  });

  it("seleccionar una conexión, sustituir la selección o limpiarla", () => {
    const regions = snapshot({ selectedNodeIds: new Set(["l_v1", "r_ifja"]) });
    expect(describeStep(regions, snapshot({ selectedConnectionId: "c1" }), CONTEXT)).toBe(
      "seleccionar la conexión V1 (izq.) ↔ V1 (der.)",
    );
    expect(describeStep(regions, snapshot({ selectedNodeIds: new Set(["r_fef"]) }), CONTEXT)).toBe("seleccionar FEF (der.)");
    expect(describeStep(regions, snapshot(), CONTEXT)).toBe("limpiar la selección");
  });

  it("filtros: redes, tipos y peso mínimo, sin redondearlo hacia arriba", () => {
    expect(describeStep(snapshot(), snapshot({ hiddenNetworks: new Set(["cole-anticevic.visual"]) }), CONTEXT)).toBe(
      "ocultar la red Visual",
    );
    expect(describeStep(snapshot({ hiddenNetworks: new Set(["a", "b"]) }), snapshot(), CONTEXT)).toBe("mostrar 2 redes");
    expect(
      describeStep(snapshot(), snapshot({ hiddenConnectionTypes: new Set<ConnectionType>(["structural"]) }), CONTEXT),
    ).toBe("ocultar el tipo Estructural");
    expect(describeStep(snapshot({ minWeight: 0.001 }), snapshot({ minWeight: 0.0039810717 }), CONTEXT)).toBe(
      "peso mínimo de 1.0e-3 a 3.9e-3",
    );
  });

  it("una región que no está cargada, como las de otro atlas que siguen en la selección, se nombra de forma genérica", () => {
    expect(describeStep(snapshot({ selectedNodeIds: new Set(["region.human.hcp-mmp1.r_v1"]) }), snapshot(), CONTEXT)).toBe(
      "quitar una región de otro atlas de la selección",
    );
  });

  it("si cambian varias cosas a la vez, «varios cambios»", () => {
    const after = snapshot({ selectedNodeIds: new Set(["r_ifja"]), hiddenNetworks: new Set(["cole-anticevic.visual"]) });
    expect(describeStep(snapshot(), after, CONTEXT)).toBe("varios cambios");
  });
});

// Marcas (spec 5.9): marcar, desmarcar y «Quitar marcas» son pasos.
describe("describeStep: marcas", () => {
  it("marcar y desmarcar una región, con su lado", () => {
    const one = snapshot({ markedIds: new Set(["l_v1"]) });
    const two = snapshot({ markedIds: new Set(["l_v1", "r_ifja"]) });
    expect(describeStep(one, two, CONTEXT)).toBe("marcar IFJa (der.)");
    expect(describeStep(two, one, CONTEXT)).toBe("desmarcar IFJa (der.)");
    expect(describeStep(one, snapshot(), CONTEXT)).toBe("desmarcar V1 (izq.)");
  });

  it("«Quitar marcas» de varias regiones dice cuántas", () => {
    const five = snapshot({ markedIds: new Set(["l_v1", "r_v1", "r_ifja", "r_fef", "otro_atlas"]) });
    expect(describeStep(five, snapshot(), CONTEXT)).toBe("quitar las marcas (5)");
  });

  it("una región que no está cargada se nombra de forma genérica", () => {
    expect(describeStep(snapshot(), snapshot({ markedIds: new Set(["otro_atlas"]) }), CONTEXT)).toBe(
      "marcar una región de otro atlas",
    );
  });

  it("marcar a la vez que otro cambio son «varios cambios»", () => {
    const after = snapshot({ markedIds: new Set(["r_ifja"]), selectedNodeIds: new Set(["r_ifja"]) });
    expect(describeStep(snapshot(), after, CONTEXT)).toBe("varios cambios");
  });
});

describe("changedKinds", () => {
  it("compara el contenido de los Set, no solo su referencia", () => {
    expect(changedKinds(snapshot({ hiddenNetworks: new Set(["a"]) }), snapshot({ hiddenNetworks: new Set(["a"]) }))).toEqual([]);
    expect(changedKinds(snapshot({ markedIds: new Set(["a"]) }), snapshot({ markedIds: new Set(["a"]) }))).toEqual([]);
  });

  it("las marcas son un cambio aparte de la selección", () => {
    expect(changedKinds(snapshot(), snapshot({ markedIds: new Set(["r_ifja"]) }))).toEqual(["marks"]);
  });
});

describe("stepNotice", () => {
  const three = snapshot({ selectedNodeIds: new Set(["l_v1", "r_v1", "r_ifja"]) });

  it("avisa si el paso quita dos o más regiones: sustituir o vaciar", () => {
    expect(stepNotice(three, snapshot({ selectedConnectionId: "c1" }), LOADED)).toBe("Se sustituyó la selección de 3 regiones");
    expect(stepNotice(three, snapshot({ selectedNodeIds: new Set(["r_fef"]) }), LOADED)).toBe(
      "Se sustituyó la selección de 3 regiones",
    );
    expect(stepNotice(three, snapshot(), LOADED)).toBe("Se vació la selección de 3 regiones");
  });

  it("no avisa si quita una región o ninguna", () => {
    expect(stepNotice(three, snapshot({ selectedNodeIds: new Set(["l_v1", "r_v1"]) }), LOADED)).toBeNull();
    expect(stepNotice(three, snapshot({ ...three, minWeight: 0.01 }), LOADED)).toBeNull();
  });

  it("solo cuentan las regiones del atlas que se está viendo", () => {
    const withOld = snapshot({ selectedNodeIds: new Set(["r_ifja", "otro_atlas_1", "otro_atlas_2"]) });
    expect(stepNotice(withOld, snapshot(), LOADED)).toBeNull();
    const twoLoaded = snapshot({ selectedNodeIds: new Set(["r_ifja", "r_fef", "otro_atlas_1"]) });
    expect(stepNotice(twoLoaded, snapshot(), LOADED)).toBe("Se vació la selección de 2 regiones");
  });

  // Como al vaciar la selección: con un clic de más se pierde el montaje.
  it("avisa si «Quitar marcas» quita dos o más marcas, contando solo las del atlas que se está viendo", () => {
    expect(stepNotice(snapshot({ markedIds: new Set(["l_v1", "r_v1", "r_ifja"]) }), snapshot(), LOADED)).toBe(
      "Se quitaron las marcas de 3 regiones",
    );
    expect(stepNotice(snapshot({ markedIds: new Set(["r_ifja", "otro_atlas"]) }), snapshot(), LOADED)).toBeNull();
  });

  it("no avisa al desmarcar una sola región", () => {
    const two = snapshot({ markedIds: new Set(["l_v1", "r_ifja"]) });
    expect(stepNotice(two, snapshot({ markedIds: new Set(["l_v1"]) }), LOADED)).toBeNull();
  });
});

describe("historyButtons", () => {
  const before = snapshot();
  const after = snapshot({ selectedNodeIds: new Set(["r_ifja"]) });

  it("con pasos, cada botón describe el suyo", () => {
    const buttons = historyButtons({ past: [before], present: after, future: [], pendingFrom: null }, CONTEXT);
    expect(buttons.undo).toEqual({ enabled: true, tip: "Deshacer: añadir IFJa (der.) a la selección" });
    expect(buttons.redo).toEqual({ enabled: false, tip: "Nada que rehacer" });
    const undone = historyButtons({ past: [], present: before, future: [after], pendingFrom: null }, CONTEXT);
    expect(undone.redo).toEqual({ enabled: true, tip: "Rehacer: añadir IFJa (der.) a la selección" });
  });

  it("un cambio de peso sin registrar ya se puede deshacer", () => {
    const weighted = snapshot({ minWeight: 0.02 });
    const buttons = historyButtons({ past: [], present: weighted, future: [], pendingFrom: before }, CONTEXT);
    expect(buttons.undo.tip).toBe("Deshacer: peso mínimo de 0 a 0.02");
  });
});

describe("historyShortcut", () => {
  const key = (
    k: string,
    mods: Partial<Pick<KeyboardEvent, "code" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey" | "repeat" | "defaultPrevented">> = {},
  ) => ({
    key: k,
    code: `Key${k.toUpperCase()}`,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    repeat: false,
    defaultPrevented: false,
    ...mods,
  });
  const body = { tagName: "BODY" };

  it("Ctrl+Z y ⌘Z deshacen; Ctrl+Mayús+Z, ⌘Mayús+Z y Ctrl+Y rehacen", () => {
    expect(historyShortcut(key("z", { ctrlKey: true }), body)).toBe("undo");
    expect(historyShortcut(key("z", { metaKey: true }), body)).toBe("undo");
    expect(historyShortcut(key("Z", { ctrlKey: true, shiftKey: true }), body)).toBe("redo");
    expect(historyShortcut(key("Z", { metaKey: true, shiftKey: true }), body)).toBe("redo");
    expect(historyShortcut(key("y", { ctrlKey: true }), body)).toBe("redo");
  });

  it("con un teclado sin letras latinas, mira la tecla física", () => {
    expect(historyShortcut({ ...key("я", { ctrlKey: true }), code: "KeyZ" }, body)).toBe("undo");
    expect(historyShortcut({ ...key("н", { ctrlKey: true }), code: "KeyY" }, body)).toBe("redo");
  });

  it("sin Ctrl ni ⌘, con Alt, repetida, ya atendida o dentro de un campo de texto, nada", () => {
    expect(historyShortcut(key("z"), body)).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true, altKey: true }), body)).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true, repeat: true }), body)).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true, defaultPrevented: true }), body)).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true }), { tagName: "INPUT", type: "text" })).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true }), { tagName: "TEXTAREA" })).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true }), { tagName: "DIV", isContentEditable: true })).toBeNull();
  });

  it("en el deslizador o en una casilla sí deshace", () => {
    expect(historyShortcut(key("z", { ctrlKey: true }), { tagName: "INPUT", type: "range" })).toBe("undo");
    expect(historyShortcut(key("z", { ctrlKey: true }), { tagName: "INPUT", type: "checkbox" })).toBe("undo");
  });
});
