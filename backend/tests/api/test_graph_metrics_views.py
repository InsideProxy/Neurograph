from backend.api.services.graph_metrics_service import GraphMetrics, laplacian_view, spectrum_view


def _metrics(**overrides):
    base = dict(
        atlas_id="atlas.human.test.demo",
        connection_type="structural",
        min_weight=0.0,
        n_nodes=3,
        n_edges=2,
        degree_centrality={"A": 1.0, "B": 2.0, "C": 1.0},
        betweenness_centrality={"A": 0.0, "B": 1.0, "C": 0.0},
        eigenvector_centrality=None,
        community={"A": 0, "B": 0, "C": 0},
        modularity=None,
        participation_coefficient={"A": 0.0, "B": 0.0, "C": 0.0},
        laplacian_eigenvalues=[0.0, 1.0, 3.0],
        spectral_embedding_2d={"A": (0.1, 0.2), "B": (0.3, 0.4), "C": (0.5, 0.6)},
    )
    base.update(overrides)
    return GraphMetrics(**base)


def test_laplacian_view_keeps_only_what_calculate_laplacian_promises():
    metrics = _metrics()

    result = laplacian_view(metrics)

    assert result.atlas_id == "atlas.human.test.demo"
    assert result.n_nodes == 3
    assert result.n_edges == 2
    assert result.laplacian_eigenvalues == [0.0, 1.0, 3.0]
    assert not hasattr(result, "spectral_embedding_2d")


def test_spectrum_view_keeps_only_what_calculate_spectrum_promises():
    metrics = _metrics()

    result = spectrum_view(metrics)

    assert result.spectral_embedding_2d == {"A": (0.1, 0.2), "B": (0.3, 0.4), "C": (0.5, 0.6)}
    assert not hasattr(result, "laplacian_eigenvalues")


def test_spectrum_view_never_fabricates_an_embedding_for_a_small_graph():
    # Mismo criterio que compute_graph_metrics: menos de 4 nodos no
    # tiene embedding calculado -- None, no un embedding inventado.
    metrics = _metrics(n_nodes=3, spectral_embedding_2d=None)

    result = spectrum_view(metrics)

    assert result.spectral_embedding_2d is None
