"""Matrices fundamentales de un grafo cerebral (sección 10).

Se implementa el Laplaciano de forma explícita (L = D - A), tal como pide
la especificación, en vez de delegarlo por completo en una función de
biblioteca de caja negra.
"""
from __future__ import annotations

import networkx as nx
import numpy as np


def node_order(graph: nx.Graph) -> list[str]:
    """Orden estable de nodos, usado como base de todas las matrices
    devueltas por este módulo (mismo índice de fila/columna en todas)."""
    return list(graph.nodes())


def adjacency_matrix(graph: nx.Graph, order: list[str] | None = None) -> np.ndarray:
    order = order or node_order(graph)
    return nx.to_numpy_array(graph, nodelist=order, weight="weight")


def degree_matrix(graph: nx.Graph, order: list[str] | None = None) -> np.ndarray:
    order = order or node_order(graph)
    adjacency = adjacency_matrix(graph, order)
    degrees = adjacency.sum(axis=1)
    return np.diag(degrees)


def graph_laplacian(graph: nx.Graph, order: list[str] | None = None) -> np.ndarray:
    """L = D - A, calculado explícitamente (sección 10)."""
    order = order or node_order(graph)
    adjacency = adjacency_matrix(graph, order)
    degree = degree_matrix(graph, order)
    return degree - adjacency


def normalized_laplacian(graph: nx.Graph, order: list[str] | None = None) -> np.ndarray:
    """L_norm = I - D^{-1/2} A D^{-1/2}, útil para comparar grafos de
    distinto tamaño (p. ej. entre especies, sección 11)."""
    order = order or node_order(graph)
    adjacency = adjacency_matrix(graph, order)
    degrees = adjacency.sum(axis=1)
    with np.errstate(divide="ignore"):
        inv_sqrt_degrees = np.where(degrees > 0, 1.0 / np.sqrt(degrees), 0.0)
    d_inv_sqrt = np.diag(inv_sqrt_degrees)
    identity = np.eye(len(order))
    return identity - d_inv_sqrt @ adjacency @ d_inv_sqrt
