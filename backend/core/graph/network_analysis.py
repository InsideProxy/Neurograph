"""Análisis de redes (sección 10): centralidad, comunidades, caminos
mínimos, modularidad, coeficiente de participación y rich-club.

Se apoya en NetworkX para los algoritmos estándar y añade únicamente lo
que NetworkX no ofrece directamente (coeficiente de participación).
"""
from __future__ import annotations

import networkx as nx


def degree_centrality(graph: nx.Graph) -> dict[str, float]:
    return nx.degree_centrality(graph)


def betweenness_centrality(graph: nx.Graph) -> dict[str, float]:
    """Centralidad de intermediación, ponderada por 1/peso -- igual
    principio que en `shortest_paths` (más abajo): un peso mayor
    representa una conexión más fuerte, no un coste mayor, así que se
    invierte antes de que NetworkX busque caminos mínimos.

    Pasar el peso tal cual (como hacía esta función hasta el
    28/08/2026) le dice a NetworkX que lo trate como una DISTANCIA: una
    conexión FUERTE (peso alto) se interpretaría entonces como la más
    LEJANA, justo al revés de lo esperado, y la intermediación
    terminaría favoreciendo caminos que pasan por conexiones débiles en
    vez de fuertes. El error nunca se detectó porque las pruebas hasta
    entonces usaban solo pesos uniformes (1.0): con todos los pesos
    iguales, invertir o no da el mismo resultado -- solo se manifestó
    al conectar el motor a datos reales no uniformes (Fase 5,
    conectividad estructural de Brainnetome). Ver
    `test_betweenness_centrality_favors_the_strong_weight_path`.
    """
    inverted = graph.copy()
    for _, _, data in inverted.edges(data=True):
        weight = data.get("weight", 1.0)
        data["distance"] = 1.0 / weight if weight > 0 else float("inf")
    return nx.betweenness_centrality(inverted, weight="distance")


def eigenvector_centrality(graph: nx.Graph, max_iter: int = 1000) -> dict[str, float]:
    return nx.eigenvector_centrality(graph, weight="weight", max_iter=max_iter)


def detect_communities(graph: nx.Graph) -> dict[str, int]:
    """Detección de comunidades por modularidad (Clauset-Newman-Moore).
    Devuelve, para cada nodo, el índice de la comunidad a la que pertenece.
    """
    communities = nx.algorithms.community.greedy_modularity_communities(
        graph, weight="weight"
    )
    assignment: dict[str, int] = {}
    for community_index, community_nodes in enumerate(communities):
        for node in community_nodes:
            assignment[node] = community_index
    return assignment


def modularity(graph: nx.Graph, community_assignment: dict[str, int]) -> float:
    communities_by_index: dict[int, set[str]] = {}
    for node, community_index in community_assignment.items():
        communities_by_index.setdefault(community_index, set()).add(node)
    return nx.algorithms.community.modularity(
        graph, communities_by_index.values(), weight="weight"
    )


def shortest_paths(graph: nx.Graph, source: str) -> dict[str, float]:
    """Distancia mínima (ponderada por 1/peso, ya que un peso mayor
    representa una conexión más fuerte, no un coste mayor) desde `source`
    a cada nodo alcanzable.
    """
    inverted = graph.copy()
    for _, _, data in inverted.edges(data=True):
        weight = data.get("weight", 1.0)
        data["distance"] = 1.0 / weight if weight > 0 else float("inf")
    return nx.single_source_dijkstra_path_length(inverted, source, weight="distance")


def participation_coefficient(
    graph: nx.Graph, community_assignment: dict[str, int]
) -> dict[str, float]:
    """Coeficiente de participación (Guimerà & Amaral, 2005):

        P_i = 1 - sum_s (k_is / k_i)^2

    donde k_i es el grado total del nodo i y k_is es su grado dentro de la
    comunidad s. Mide si un nodo conecta principalmente dentro de su propia
    comunidad (P cercano a 0) o de forma repartida entre varias (P cercano
    a 1) — un candidato natural a "hub" entre redes cognitivas.
    """
    result: dict[str, float] = {}
    for node in graph.nodes():
        neighbors = list(graph.neighbors(node))
        total_degree = sum(graph[node][n].get("weight", 1.0) for n in neighbors)
        if total_degree == 0:
            result[node] = 0.0
            continue
        degree_by_community: dict[int, float] = {}
        for neighbor in neighbors:
            community = community_assignment.get(neighbor)
            weight = graph[node][neighbor].get("weight", 1.0)
            degree_by_community[community] = degree_by_community.get(community, 0.0) + weight
        fraction_squared_sum = sum(
            (degree / total_degree) ** 2 for degree in degree_by_community.values()
        )
        result[node] = 1.0 - fraction_squared_sum
    return result


def rich_club_coefficient(graph: nx.Graph) -> dict[int, float]:
    """Coeficiente rich-club (no ponderado, sobre una copia sin pesos):
    para cada grado k, qué fracción de las conexiones posibles existen
    entre los nodos de grado > k.
    """
    unweighted = nx.Graph()
    unweighted.add_nodes_from(graph.nodes())
    unweighted.add_edges_from(graph.edges())
    return dict(nx.rich_club_coefficient(unweighted, normalized=False))
