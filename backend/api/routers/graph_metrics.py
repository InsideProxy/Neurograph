"""Endpoint de métricas del motor matemático (sección 10) sobre el grafo
cerebral real.

`backend/core/graph/` no depende de la base de datos, a propósito (se
puede probar con grafos de ejemplo, sección 10); este router es el
único punto que lo conecta con las regiones y conexiones reales. La
traducción de conexiones+regiones a métricas (`compute_graph_metrics`)
es una función pura, separada del endpoint, para poder probarse sin una
base de datos real -- mismo patrón que `region_to_node` en
`regions.py` y `connection_to_edge` en `connections.py`.
"""
from __future__ import annotations

import networkx as nx
from fastapi import APIRouter, Depends
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
from backend.database.session import get_db

router = APIRouter(prefix="/graph-metrics", tags=["graph-metrics"])


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


@router.get("", response_model=GraphMetrics)
def list_graph_metrics(
    atlas_id: str,
    connection_type: str = "structural",
    min_weight: float = 0.0,
    db: Session = Depends(get_db),
) -> GraphMetrics:
    """Métricas del motor matemático sobre las regiones y conexiones
    reales de un atlas. `atlas_id` es obligatorio (nunca se calcula
    sobre "todo", que mezclaría regiones de parcelaciones distintas que
    ocupan el mismo espacio físico dos veces -- mismo principio que el
    selector de atlas del frontend). Un atlas sin ninguna conexión
    cargada todavía (HCP-MMP1.0, Gordon 333) devuelve un grafo sin
    aristas: las métricas de centralidad y comunidad siguen siendo
    válidas (cada nodo su propia comunidad, centralidad 0), pero no
    aportan nada hasta que haya conectividad real que analizar.
    """
    region_ids = list(db.execute(select(Region.id).where(Region.atlas_id == atlas_id)).scalars().all())

    connection_rows = list(
        db.execute(
            select(Connection).where(
                Connection.type == connection_type,
                Connection.source_id.in_(select(Region.id).where(Region.atlas_id == atlas_id)),
            )
        ).scalars().all()
    )

    return compute_graph_metrics(
        region_ids=region_ids,
        connections=connection_rows,
        atlas_id=atlas_id,
        connection_type=connection_type,
        min_weight=min_weight,
    )
