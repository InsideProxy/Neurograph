import numpy as np

from backend.core.graph.model import Edge, build_graph
from backend.core.graph.matrices import (
    adjacency_matrix,
    degree_matrix,
    graph_laplacian,
    node_order,
)


def test_adjacency_and_degree_on_triangle():
    # Triángulo con pesos distintos: A-B-C-A
    graph = build_graph(
        ["A", "B", "C"],
        [Edge("A", "B", 1.0), Edge("B", "C", 2.0), Edge("C", "A", 3.0)],
    )
    order = node_order(graph)
    A = adjacency_matrix(graph, order)
    D = degree_matrix(graph, order)

    assert A.shape == (3, 3)
    np.testing.assert_allclose(A, A.T)  # simétrica (no dirigido)
    # cada fila de D es la suma de la fila correspondiente de A
    np.testing.assert_allclose(np.diag(D), A.sum(axis=1))


def test_laplacian_is_degree_minus_adjacency():
    graph = build_graph(["A", "B"], [Edge("A", "B", 2.5)])
    order = node_order(graph)
    L = graph_laplacian(graph, order)
    expected = degree_matrix(graph, order) - adjacency_matrix(graph, order)
    np.testing.assert_allclose(L, expected)

    # para dos nodos conectados con peso w: L = [[w, -w], [-w, w]]
    np.testing.assert_allclose(L, [[2.5, -2.5], [-2.5, 2.5]])


def test_laplacian_row_sums_are_zero():
    # Propiedad estructural del Laplaciano: cada fila suma 0, siempre.
    graph = build_graph(
        ["A", "B", "C", "D"],
        [Edge("A", "B", 1.0), Edge("B", "C", 0.5), Edge("C", "D", 2.0), Edge("D", "A", 1.5)],
    )
    L = graph_laplacian(graph)
    np.testing.assert_allclose(L.sum(axis=1), np.zeros(4), atol=1e-10)
