import numpy as np
import pytest

from backend.core.graph.model import Edge, build_graph
from backend.core.graph.spectral import eigen_decomposition, spectral_embedding


def test_smallest_eigenvalue_is_zero_for_connected_graph():
    # Propiedad conocida: para cualquier grafo conexo, el autovalor más
    # pequeño del Laplaciano es 0 (autovector constante).
    graph = build_graph(
        ["A", "B", "C"],
        [Edge("A", "B", 1.0), Edge("B", "C", 1.0), Edge("C", "A", 1.0)],
    )
    decomposition = eigen_decomposition(graph)
    assert decomposition.eigenvalues[0] == pytest.approx(0.0, abs=1e-8)


def test_number_of_zero_eigenvalues_equals_connected_components():
    # Dos componentes desconectadas (A-B) y (C-D): la multiplicidad del
    # autovalor 0 del Laplaciano es igual al número de componentes conexas.
    graph = build_graph(
        ["A", "B", "C", "D"],
        [Edge("A", "B", 1.0), Edge("C", "D", 1.0)],
    )
    decomposition = eigen_decomposition(graph)
    zero_eigenvalues = np.sum(np.abs(decomposition.eigenvalues) < 1e-8)
    assert zero_eigenvalues == 2


def test_spectral_embedding_shape():
    graph = build_graph(
        ["A", "B", "C", "D", "E"],
        [
            Edge("A", "B", 1.0),
            Edge("B", "C", 1.0),
            Edge("C", "D", 1.0),
            Edge("D", "E", 1.0),
            Edge("E", "A", 1.0),
        ],
    )
    embedding = spectral_embedding(graph, n_components=2)
    assert set(embedding.keys()) == {"A", "B", "C", "D", "E"}
    for coordinates in embedding.values():
        assert coordinates.shape == (2,)
