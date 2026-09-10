"""Endpoints de renderizado real de un único atlas (Fase 10, 31/08/2026 --
versión mínima de RENDER_NETWORK/RENDER_BRAIN, sección 15/16). A
diferencia del resto de la API, estos dos devuelven PNG real
(`media_type="image/png"`), no un sobre JSON: es una imagen lo que se
pidió, no un descriptor de escena (petición explícita de la usuaria,
31/08/2026). Reutiliza íntegramente `backend/api/services/render_service.py`.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from backend.api.services import render_service
from backend.database.session import get_db

router = APIRouter(prefix="/render", tags=["render"])

__all__ = ["render_brain", "render_network", "router"]


@router.get("/network")
def render_network(
    atlas_id: str,
    connection_type: str = "structural",
    min_weight: float = 0.0,
    db: Session = Depends(get_db),
) -> Response:
    """Connectograma circular real de un atlas, en PNG. 404 si el atlas
    no tiene ninguna región real cargada."""
    try:
        png_bytes = render_service.render_network(db, atlas_id, connection_type, min_weight)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(content=png_bytes, media_type="image/png")


@router.get("/brain")
def render_brain(
    atlas_id: str,
    connection_type: str = "structural",
    min_weight: float = 0.0,
    db: Session = Depends(get_db),
) -> Response:
    """Proyección 2D real (vista axial) de un atlas, en PNG. 404 si el
    atlas no tiene ninguna región real cargada."""
    try:
        png_bytes = render_service.render_brain(db, atlas_id, connection_type, min_weight)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(content=png_bytes, media_type="image/png")
