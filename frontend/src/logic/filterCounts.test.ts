import { describe, expect, it } from "vitest";
import type { ConnectionType } from "../state/filters";
import type { GraphConnection, GraphNode } from "../types/domain";
import { countConnections } from "./filterCounts";
import { filterGraph } from "./visibility";

function node(id: string, network: string): GraphNode {
  return { id, label: id, abbreviation: id, hemisphere: "L", network, position3d: [0, 0, 0], referenceSpace: null };
}

function connection(id: string, source: string, target: string, type: ConnectionType, weight: number): GraphConnection {
  return { id, source, target, type, weight, evidenceLevel: "direct" };
}

const NODES = [node("a", "red1"), node("b", "red1"), node("c", "red2")];
const CONNECTIONS = [
  connection("ab-e", "a", "b", "structural", 0.5),
  connection("ab-f", "a", "b", "functional", 0.05),
  connection("ac-e", "a", "c", "structural", 0.3),
  connection("bc-ef", "b", "c", "effective", 0.9),
];

describe("countConnections", () => {
  it("cuenta cada tipo con los filtros de redes y peso, también si el tipo está oculto", () => {
    const counts = countConnections(NODES, CONNECTIONS, {
      hiddenNetworks: new Set(),
      hiddenConnectionTypes: new Set<ConnectionType>(["structural"]),
      minWeight: 0.1,
    });
    expect(counts.byType).toEqual({ structural: 2, functional: 0, effective: 1 });
  });

  it("una red oculta quita las conexiones que la tocan", () => {
    const counts = countConnections(NODES, CONNECTIONS, {
      hiddenNetworks: new Set(["red2"]),
      hiddenConnectionTypes: new Set(),
      minWeight: 0,
    });
    expect(counts.byType).toEqual({ structural: 1, functional: 1, effective: 0 });
  });

  it("visibles son las que pasan todos los filtros, como en filterGraph; cargadas, todas", () => {
    const filters = {
      hiddenNetworks: new Set<string>(),
      hiddenConnectionTypes: new Set<ConnectionType>(["structural"]),
      minWeight: 0.1,
    };
    const counts = countConnections(NODES, CONNECTIONS, filters);
    expect(counts.visible).toBe(filterGraph(NODES, CONNECTIONS, filters).connections.length);
    expect(counts.visible).toBe(1);
    expect(counts.loaded).toBe(4);
  });

  it("un tipo que el panel no conoce no suma en ningún tipo, pero sí entre las visibles, como en filterGraph", () => {
    const withUnknown = [...CONNECTIONS, connection("ab-x", "a", "b", "desconocido" as string as ConnectionType, 0.5)];
    const filters = { hiddenNetworks: new Set<string>(), hiddenConnectionTypes: new Set<ConnectionType>(), minWeight: 0 };
    const counts = countConnections(NODES, withUnknown, filters);
    expect(counts.byType).toEqual({ structural: 2, functional: 1, effective: 1 });
    expect(counts.visible).toBe(filterGraph(NODES, withUnknown, filters).connections.length);
    expect(counts.visible).toBe(5);
  });

  it("una conexión con un extremo que no está entre los nodos no cuenta, salvo entre las cargadas", () => {
    const withOrphan = [...CONNECTIONS, connection("az", "a", "z", "structural", 0.9)];
    const counts = countConnections(NODES, withOrphan, {
      hiddenNetworks: new Set(),
      hiddenConnectionTypes: new Set(),
      minWeight: 0,
    });
    expect(counts.byType.structural).toBe(2);
    expect(counts.visible).toBe(4);
    expect(counts.loaded).toBe(5);
  });
});
