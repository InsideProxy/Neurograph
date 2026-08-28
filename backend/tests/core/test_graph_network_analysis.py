import pytest

from backend.core.graph.model import Edge, build_graph
from backend.core.graph.network_analysis import (
    betweenness_centrality,
    degree_centrality,
    detect_communities,
    modularity,
    participation_coefficient,
    shortest_paths,
)


def _two_clusters_graph():
    # Dos "redes cognitivas" densamente conectadas por dentro (A,B,C) y
    # (D,E,F), unidas por un único puente débil B-D: caso de libro de texto
    # para comunidades y para el coeficiente de participación.
    edges = [
        Edge("A", "B", 1.0), Edge("B", "C", 1.0), Edge("A", "C", 1.0),
        Edge("D", "E", 1.0), Edge("E", "F", 1.0), Edge("D", "F", 1.0),
        Edge("B", "D", 0.2),
    ]
    return build_graph(["A", "B", "C", "D", "E", "F"], edges)


def test_degree_centrality_ranks_hub_highest():
    graph = build_graph(
        ["hub", "a", "b", "c"],
        [Edge("hub", "a", 1.0), Edge("hub", "b", 1.0), Edge("hub", "c", 1.0)],
    )
    centrality = degree_centrality(graph)
    assert centrality["hub"] > centrality["a"]
    assert centrality["hub"] > centrality["b"]
    assert centrality["hub"] > centrality["c"]


def test_betweenness_is_zero_for_leaf_nodes():
    graph = build_graph(
        ["center", "a", "b"],
        [Edge("center", "a", 1.0), Edge("center", "b", 1.0)],
    )
    centrality = betweenness_centrality(graph)
    assert centrality["a"] == 0.0
    assert centrality["b"] == 0.0
    assert centrality["center"] > 0.0


def test_betweenness_centrality_favors_the_strong_weight_path():
    # A y C solo se conectan por dos caminos: A-B-C (fuerte, peso 10 en
    # cada tramo) y A-D-C (débil, peso 0.1 en cada tramo). Un peso mayor
    # es una conexión más fuerte, no un coste mayor -- el camino real
    # "más corto" es el fuerte (A-B-C), así que toda la intermediación
    # debe caer en B, ninguna en D. Antes del 28/08/2026 esta función
    # pasaba el peso tal cual a NetworkX (que lo interpreta como
    # distancia), así que habría dado justo lo contrario: toda la
    # intermediación en D.
    graph = build_graph(
        ["A", "B", "C", "D"],
        [
            Edge("A", "B", 10.0), Edge("B", "C", 10.0),
            Edge("A", "D", 0.1), Edge("D", "C", 0.1),
        ],
    )
    centrality = betweenness_centrality(graph)
    assert centrality["B"] > 0.0
    assert centrality["D"] == 0.0


def test_detect_communities_separates_two_clusters():
    graph = _two_clusters_graph()
    communities = detect_communities(graph)
    assert communities["A"] == communities["B"] == communities["C"]
    assert communities["D"] == communities["E"] == communities["F"]
    assert communities["A"] != communities["D"]


def test_modularity_is_positive_for_clear_community_structure():
    graph = _two_clusters_graph()
    communities = detect_communities(graph)
    assert modularity(graph, communities) > 0


def test_participation_coefficient_bridge_node_higher_than_core_node():
    graph = _two_clusters_graph()
    communities = detect_communities(graph)
    participation = participation_coefficient(graph, communities)
    # B toca las dos comunidades (vía el puente a D); A solo la suya.
    assert participation["B"] > participation["A"]


def test_shortest_paths_from_source():
    graph = build_graph(
        ["A", "B", "C"],
        [Edge("A", "B", 1.0), Edge("B", "C", 1.0)],
    )
    distances = shortest_paths(graph, "A")
    assert distances["A"] == 0.0
    assert distances["B"] == pytest.approx(1.0)
    assert distances["C"] == pytest.approx(2.0)
