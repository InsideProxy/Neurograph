"""Representación de grafo cerebral (sección 7: G = (V, E)).

Este módulo no depende de la base de datos: recibe nodos y aristas ya
extraídos (por ejemplo, de una consulta a `connections`) y construye un
grafo de NetworkX sobre el que operan el resto de módulos de `core.graph`.
Mantenerlo desacoplado de la base de datos es lo que permite probarlo con
datos de ejemplo, tal como exige la sección 10 ("estos módulos deben ser
independientes y testeables").
"""
from __future__ import annotations

from dataclasses import dataclass

import networkx as nx


@dataclass(frozen=True)
class Edge:
    source: str
    target: str
    weight: float = 1.0


def build_graph(
    nodes: list[str],
    edges: list[Edge],
    directed: bool = False,
) -> nx.Graph:
    """Construye un grafo ponderado a partir de nodos y aristas.

    No mezclar tipos de conectividad (sección 8) en un mismo grafo: quien
    llama a esta función debe pasar ya solo las aristas del tipo que
    quiere analizar (p. ej. solo `structural`), filtrando antes de llegar
    aquí.
    """
    graph: nx.Graph = nx.DiGraph() if directed else nx.Graph()
    graph.add_nodes_from(nodes)
    for edge in edges:
        graph.add_edge(edge.source, edge.target, weight=edge.weight)
    return graph
