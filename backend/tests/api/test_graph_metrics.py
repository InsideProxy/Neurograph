from dataclasses import dataclass

from backend.api.routers.graph_metrics import compute_graph_metrics


@dataclass
class _FakeConnection:
    source_id: str
    target_id: str
    weight: float | None


def test_compute_graph_metrics_on_a_simple_real_shaped_graph():
    # Dos "redes cognitivas" (A,B,C) y (D,E,F) unidas por un único
    # puente débil B-D -- mismo caso de libro de texto que
    # test_graph_network_analysis.py, pasando ya por la capa de
    # traducción real de conexiones de la base de datos.
    region_ids = ["A", "B", "C", "D", "E", "F"]
    connections = [
        _FakeConnection("A", "B", 1.0), _FakeConnection("B", "C", 1.0), _FakeConnection("A", "C", 1.0),
        _FakeConnection("D", "E", 1.0), _FakeConnection("E", "F", 1.0), _FakeConnection("D", "F", 1.0),
        _FakeConnection("B", "D", 0.2),
    ]

    metrics = compute_graph_metrics(
        region_ids=region_ids,
        connections=connections,
        atlas_id="atlas.human.test.demo",
        connection_type="structural",
    )

    assert metrics.n_nodes == 6
    assert metrics.n_edges == 7
    assert metrics.community["A"] == metrics.community["B"] == metrics.community["C"]
    assert metrics.community["A"] != metrics.community["D"]
    assert metrics.modularity is not None and metrics.modularity > 0
    assert metrics.participation_coefficient["B"] > metrics.participation_coefficient["A"]
    assert len(metrics.laplacian_eigenvalues) == 6
    # el Laplaciano de un grafo conexo tiene un único autovalor 0
    assert sum(1 for v in metrics.laplacian_eigenvalues if abs(v) < 1e-9) == 1
    assert metrics.spectral_embedding_2d is not None
    assert set(metrics.spectral_embedding_2d) == set(region_ids)


def test_compute_graph_metrics_excludes_zero_weight_pairs_from_the_graph():
    # Como en Brainnetome (sección 7.5): casi la mitad de los pares se
    # guardan con weight exactamente 0 (matriz completa, sin umbral).
    # Esos pares no deben contarse como aristas reales.
    region_ids = ["A", "B", "C"]
    connections = [
        _FakeConnection("A", "B", 0.9),
        _FakeConnection("A", "C", 0.0),
        _FakeConnection("B", "C", 0.0),
    ]

    metrics = compute_graph_metrics(
        region_ids=region_ids,
        connections=connections,
        atlas_id="atlas.human.test.demo",
        connection_type="structural",
    )

    assert metrics.n_edges == 1


def test_compute_graph_metrics_on_a_graph_without_any_connections_yet():
    # HCP-MMP1.0 y Gordon 333 no tienen ninguna conexión cargada
    # todavía: debe devolver una respuesta válida, no fallar.
    region_ids = ["A", "B", "C"]

    metrics = compute_graph_metrics(
        region_ids=region_ids,
        connections=[],
        atlas_id="atlas.human.hcp.mmp1_0",
        connection_type="structural",
    )

    assert metrics.n_nodes == 3
    assert metrics.n_edges == 0
    assert metrics.degree_centrality == {"A": 0.0, "B": 0.0, "C": 0.0}
    # sin ninguna arista, cada nodo es su propia comunidad
    assert len({metrics.community["A"], metrics.community["B"], metrics.community["C"]}) == 3


def test_compute_graph_metrics_applies_the_requested_threshold():
    region_ids = ["A", "B", "C"]
    connections = [
        _FakeConnection("A", "B", 0.1),
        _FakeConnection("A", "C", 0.5),
    ]

    metrics = compute_graph_metrics(
        region_ids=region_ids,
        connections=connections,
        atlas_id="atlas.human.test.demo",
        connection_type="structural",
        min_weight=0.3,
    )

    assert metrics.n_edges == 1
    assert metrics.min_weight == 0.3
