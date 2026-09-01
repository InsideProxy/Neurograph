"""Endpoint de métricas del motor matemático (sección 10) sobre el grafo
cerebral real.

`backend/core/graph/` no depende de la base de datos, a propósito (se
puede probar con grafos de ejemplo, sección 10). El modelo, la función
pura `compute_graph_metrics` y la consulta que las conecta con las
regiones/conexiones reales viven ahora en
`backend/api/services/graph_metrics_service.py` (Fase 10, 31/08/2026):
este módulo solo reexporta `GraphMetrics`/`compute_graph_metrics` (para
no romper `backend/tests/api/test_graph_metrics.py`) y define el
endpoint HTTP, que delega en el servicio -- las herramientas MCP
`calculate_laplacian`/`calculate_spectrum` (`backend/mcp/server.py`)
llaman a la misma función, cada una quedándose solo con el subconjunto
del resultado que su nombre promete.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.services import graph_metrics_service
from backend.api.services.graph_metrics_service import GraphMetrics, compute_graph_metrics
from backend.database.session import get_db

router = APIRouter(prefix="/graph-metrics", tags=["graph-metrics"])

__all__ = ["GraphMetrics", "compute_graph_metrics", "list_graph_metrics", "router"]


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
    return graph_metrics_service.list_graph_metrics(db, atlas_id, connection_type, min_weight)
