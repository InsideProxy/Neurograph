"""Endpoint de camino más corto real entre dos regiones (Fase 10,
31/08/2026 -- versión mínima de FIND_PATH, sección 16). Reutiliza
íntegramente `backend/api/services/paths_service.py`: la herramienta MCP
`find_path` llama a la misma función.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.services import paths_service
from backend.api.services.paths_service import PathResult
from backend.database.session import get_db

router = APIRouter(prefix="/path", tags=["path"])

__all__ = ["PathResult", "find_path", "router"]


@router.get("", response_model=PathResult)
def find_path(
    atlas_id: str,
    source_id: str,
    target_id: str,
    connection_type: str = "structural",
    min_weight: float = 0.0,
    db: Session = Depends(get_db),
) -> PathResult:
    """Camino más corto real entre `source_id` y `target_id`, dentro del
    mismo atlas (`atlas_id` obligatorio, mismo motivo que `GET
    /graph-metrics`). `path`/`distance` vienen `None` cuando no existe
    ningún camino real entre ambas regiones -- nunca se inventa uno."""
    return paths_service.find_path(db, atlas_id, source_id, target_id, connection_type, min_weight)
