"""Capa de servicio de renderizado real de un único atlas (Fase 10,
sección 16/20-21, herramientas MCP `render_network`/`render_brain` --
versión de un solo atlas, petición explícita de la usuaria además de la
versión de comparación entre especies, que vive en
`species_render_service.py`).

No reimplementa ninguna consulta: reutiliza `regions_service.list_regions`
(nodos reales, con su red funcional y coordenada ya resueltas) y la misma
`graph_metrics_service.load_atlas_regions_and_connections` + `core.graph.
from_connections.edges_from_connections` que ya usa `paths_service`
(mismo criterio de `min_weight`/`connection_type`, sección 8 y 24). Solo
añade la llamada real a `backend/visualization/` para producir la imagen.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from backend.api.services import regions_service
from backend.api.services.graph_metrics_service import load_atlas_regions_and_connections
from backend.core.graph.from_connections import edges_from_connections
from backend.visualization.brain_render import render_brain_image
from backend.visualization.network_render import render_network_image


def render_network(
    db: Session, atlas_id: str, connection_type: str = "structural", min_weight: float = 0.0
) -> bytes:
    """PNG real del connectograma circular de un atlas. Lanza `ValueError`
    si el atlas no tiene ninguna región real cargada -- nunca una imagen
    vacía sin avisar de por qué (mismo criterio que `compare_species`,
    decisión 35)."""
    nodes = regions_service.list_regions(db, atlas_id)
    if not nodes:
        raise ValueError(f"No hay regiones reales cargadas para el atlas {atlas_id!r}")
    _, connection_rows = load_atlas_regions_and_connections(db, atlas_id, connection_type)
    edges = edges_from_connections(connection_rows, min_weight=min_weight)
    return render_network_image(nodes, edges, title=f"Connectograma real -- {atlas_id}")


def render_brain(
    db: Session, atlas_id: str, connection_type: str = "structural", min_weight: float = 0.0
) -> bytes:
    """PNG real de la proyección 2D (vista axial) de un atlas. Mismo
    criterio de error que `render_network`."""
    nodes = regions_service.list_regions(db, atlas_id)
    if not nodes:
        raise ValueError(f"No hay regiones reales cargadas para el atlas {atlas_id!r}")
    _, connection_rows = load_atlas_regions_and_connections(db, atlas_id, connection_type)
    edges = edges_from_connections(connection_rows, min_weight=min_weight)
    return render_brain_image(nodes, edges, title=f"Vista axial real -- {atlas_id}")
