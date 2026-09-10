"""Capa de servicio de métricas del motor matemático (Fase 10, sección
16). Dueña real del modelo `GraphMetrics`, de la función pura
`compute_graph_metrics` y de la consulta que las conecta con las
regiones/conexiones reales -- antes las tres vivían dentro del endpoint
`GET /graph-metrics` (`backend/api/routers/graph_metrics.py`). Se mueven
aquí por el mismo motivo que el resto de servicios de esta fase: que la
API HTTP y las herramientas MCP `calculate_laplacian`/`calculate_
spectrum` llamen a la misma función real, cada una devolviendo solo el
subconjunto de este mismo resultado que su nombre promete (ninguna
recalcula nada por su cuenta). El router reexporta `GraphMetrics`/
`compute_graph_metrics` para no romper
`backend/tests/api/test_graph_metrics.py`.
"""
from __future__ import annotations

import networkx as nx
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.core.graph.from_connections import edges_from_connections
from backend.core.graph.model import build_graph
from backend.core.graph.network_analysis import (
    betweenness_centrality,
    degree_centrality,
    detect_communities,
    eigenvector_centrality,
    modularity,
    participation_coefficient,
)
from backend.core.graph.spectral import eigen_decomposition, spectral_embedding
from backend.database.models.entities import Connection, Region


class GraphMetrics(BaseModel):
    atlas_id: str
    connection_type: str
    min_weight: float
    n_nodes: int
    n_edges: int
    degree_centrality: dict[str, float]
    betweenness_centrality: dict[str, float]
    # None cuando NetworkX no converge (p. ej. un grafo con nodos
    # aislados o muy disperso): nunca se rellena con un valor inventado.
    eigenvector_centrality: dict[str, float] | None
    community: dict[str, int]
    modularity: float | None
    participation_coefficient: dict[str, float]
    # Espectro completo del Laplaciano (autovalores, ascendente): el
    # segundo autovalor (>0 en un grafo conexo) es la "conectividad
    # algebraica" del grafo -- cuánto le cuesta desconectarse.
    laplacian_eigenvalues: list[float]
    # Embedding espectral 2D (Laplacian eigenmaps): None cuando el grafo
    # es demasiado pequeño para calcularlo (menos de 4 nodos).
    spectral_embedding_2d: dict[str, tuple[float, float]] | None


def compute_graph_metrics(
    region_ids: list[str],
    connections: list[Connection],
    atlas_id: str,
    connection_type: str,
    min_weight: float = 0.0,
) -> GraphMetrics:
    """Construye el grafo real con `backend/core/graph/` y calcula sus
    métricas. Nunca mezcla tipos de conectividad (sección 8): quien
    llama debe pasar ya solo las conexiones del `connection_type`
    pedido, filtradas antes de llegar aquí (ver `list_graph_metrics`)."""
    edges = edges_from_connections(connections, min_weight=min_weight)
    graph = build_graph(region_ids, edges)

    communities = detect_communities(graph)
    try:
        eigen_centrality: dict[str, float] | None = eigenvector_centrality(graph)
    except (nx.PowerIterationFailedConvergence, nx.AmbiguousSolution, ZeroDivisionError):
        eigen_centrality = None

    try:
        graph_modularity: float | None = modularity(graph, communities)
    except ZeroDivisionError:
        # Un grafo sin aristas no tiene modularidad definida.
        graph_modularity = None

    decomposition = eigen_decomposition(graph)

    embedding_2d: dict[str, tuple[float, float]] | None = None
    if len(region_ids) >= 4:
        embedding = spectral_embedding(graph, n_components=2)
        embedding_2d = {node: (float(coords[0]), float(coords[1])) for node, coords in embedding.items()}

    return GraphMetrics(
        atlas_id=atlas_id,
        connection_type=connection_type,
        min_weight=min_weight,
        n_nodes=graph.number_of_nodes(),
        n_edges=graph.number_of_edges(),
        degree_centrality=degree_centrality(graph),
        betweenness_centrality=betweenness_centrality(graph),
        eigenvector_centrality=eigen_centrality,
        community=communities,
        modularity=graph_modularity,
        participation_coefficient=participation_coefficient(graph, communities),
        laplacian_eigenvalues=[float(v) for v in decomposition.eigenvalues],
        spectral_embedding_2d=embedding_2d,
    )


class LaplacianResult(BaseModel):
    """Vista de `GraphMetrics` para la herramienta MCP
    `calculate_laplacian` (Fase 10, sección 16): solo el espectro del
    Laplaciano (`laplacian_eigenvalues`, ya el campo de `GraphMetrics`
    llamado así) y el tamaño real del grafo del que sale -- nunca se
    recalcula nada aparte, es un subconjunto del mismo `GraphMetrics`
    real que ya calcula `compute_graph_metrics`."""

    atlas_id: str
    connection_type: str
    min_weight: float
    n_nodes: int
    n_edges: int
    laplacian_eigenvalues: list[float]


class SpectrumResult(BaseModel):
    """Vista de `GraphMetrics` para la herramienta MCP
    `calculate_spectrum` (Fase 10, sección 16): el embedding espectral
    2D (`spectral_embedding_2d`) -- la otra mitad del análisis espectral
    del grafo, distinta de `laplacian_eigenvalues` (que ya tiene su
    propia herramienta, `calculate_laplacian`). None cuando el grafo
    tiene menos de 4 nodos (mismo criterio que `compute_graph_metrics`,
    nunca se inventa un embedding para un grafo demasiado pequeño)."""

    atlas_id: str
    connection_type: str
    min_weight: float
    n_nodes: int
    spectral_embedding_2d: dict[str, tuple[float, float]] | None


def laplacian_view(metrics: GraphMetrics) -> LaplacianResult:
    """Función pura: extrae de un `GraphMetrics` ya calculado solo lo
    que promete `calculate_laplacian`."""
    return LaplacianResult(
        atlas_id=metrics.atlas_id,
        connection_type=metrics.connection_type,
        min_weight=metrics.min_weight,
        n_nodes=metrics.n_nodes,
        n_edges=metrics.n_edges,
        laplacian_eigenvalues=metrics.laplacian_eigenvalues,
    )


def spectrum_view(metrics: GraphMetrics) -> SpectrumResult:
    """Función pura: extrae de un `GraphMetrics` ya calculado solo lo
    que promete `calculate_spectrum`."""
    return SpectrumResult(
        atlas_id=metrics.atlas_id,
        connection_type=metrics.connection_type,
        min_weight=metrics.min_weight,
        n_nodes=metrics.n_nodes,
        spectral_embedding_2d=metrics.spectral_embedding_2d,
    )


def load_atlas_regions_and_connections(
    db: Session, atlas_id: str, connection_type: str
) -> tuple[list[str], list[Connection]]:
    """Ids de región + conexiones reales de un atlas para `connection_type`,
    sin aplicar todavía ningún umbral de peso (eso lo decide cada función
    que consuma el resultado, vía `min_weight`). Consulta compartida entre
    `list_graph_metrics` y `paths_service.find_path` -- nunca se repite
    esta consulta en más de un sitio (sección 15: nunca reimplementar
    lógica ya existente)."""
    region_ids = list(db.execute(select(Region.id).where(Region.atlas_id == atlas_id)).scalars().all())
    connection_rows = list(
        db.execute(
            select(Connection).where(
                Connection.type == connection_type,
                Connection.source_id.in_(select(Region.id).where(Region.atlas_id == atlas_id)),
            )
        ).scalars().all()
    )
    return region_ids, connection_rows


def list_graph_metrics(
    db: Session,
    atlas_id: str,
    connection_type: str = "structural",
    min_weight: float = 0.0,
) -> GraphMetrics:
    """Métricas del motor matemático sobre las regiones y conexiones
    reales de un atlas. `atlas_id` es obligatorio (nunca se calcula
    sobre "todo", que mezclaría regiones de parcelaciones distintas que
    ocupan el mismo espacio físico dos veces)."""
    region_ids, connection_rows = load_atlas_regions_and_connections(db, atlas_id, connection_type)

    return compute_graph_metrics(
        region_ids=region_ids,
        connections=connection_rows,
        atlas_id=atlas_id,
        connection_type=connection_type,
        min_weight=min_weight,
    )
