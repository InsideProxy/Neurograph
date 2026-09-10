"""Capa de servicio de camino más corto real entre dos regiones (Fase 10,
sección 16, herramienta MCP `find_path`). Reutiliza íntegramente
`backend/core/graph/` (la función pura `shortest_path`) y la misma
consulta ya compartida por `graph_metrics_service.list_graph_metrics`
(`load_atlas_regions_and_connections`) -- nunca reimplementa ninguna de
las dos (sección 15). Separa, igual que `graph_metrics_service`, una
función pura (`compute_path`, probable sin base de datos) de la consulta
real (`find_path`).
"""
from __future__ import annotations

from typing import Protocol

from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.services.graph_metrics_service import load_atlas_regions_and_connections
from backend.core.graph.from_connections import edges_from_connections
from backend.core.graph.model import build_graph
from backend.core.graph.network_analysis import shortest_path


class ConnectionLike(Protocol):
    source_id: str
    target_id: str
    weight: float | None


class PathResult(BaseModel):
    atlas_id: str
    connection_type: str
    min_weight: float
    source_id: str
    target_id: str
    # None cuando no existe ningún camino real entre las dos regiones --
    # nunca porque source_id/target_id no pertenezcan a este atlas (eso
    # también da None, pero es un caso distinto) ni porque se haya
    # inventado un camino aproximado.
    path: list[str] | None
    distance: float | None


def compute_path(
    region_ids: list[str],
    connections: list[ConnectionLike],
    atlas_id: str,
    source_id: str,
    target_id: str,
    connection_type: str = "structural",
    min_weight: float = 0.0,
) -> PathResult:
    """Función pura (sin base de datos, igual criterio que
    `compute_graph_metrics`): construye el grafo real con
    `backend/core/graph/` y busca el camino más corto entre `source_id` y
    `target_id`. `path`/`distance` quedan en `None` cuando alguno de los
    dos no está en el grafo, o cuando no existe ningún camino real entre
    ambos (p. ej. componentes desconectadas) -- nunca se aproxima ni se
    inventa un camino."""
    edges = edges_from_connections(connections, min_weight=min_weight)
    graph = build_graph(region_ids, edges)

    result = shortest_path(graph, source_id, target_id)
    path, distance = result if result is not None else (None, None)

    return PathResult(
        atlas_id=atlas_id,
        connection_type=connection_type,
        min_weight=min_weight,
        source_id=source_id,
        target_id=target_id,
        path=path,
        distance=distance,
    )


def find_path(
    db: Session,
    atlas_id: str,
    source_id: str,
    target_id: str,
    connection_type: str = "structural",
    min_weight: float = 0.0,
) -> PathResult:
    """Camino más corto real entre dos regiones del mismo atlas, sobre el
    grafo de conectividad de `connection_type` -- mismo criterio de
    `atlas_id` obligatorio que `list_graph_metrics` (nunca mezclar
    regiones de parcelaciones distintas)."""
    region_ids, connection_rows = load_atlas_regions_and_connections(db, atlas_id, connection_type)
    return compute_path(region_ids, connection_rows, atlas_id, source_id, target_id, connection_type, min_weight)
