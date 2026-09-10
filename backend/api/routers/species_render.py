"""Endpoints de las tres imágenes reales de comparación entre especies
(Fase 10, 31/08/2026 -- parte de RENDER_BRAIN/RENDER_NETWORK aplicada a
una comparación entre especies, sección 15/16, decisión de la usuaria:
connectograma circular de homología + dos esquemas interhemisféricos).
Reutiliza íntegramente `backend/api/services/species_render_service.py`.

Tres endpoints en vez de uno que devuelva las tres imágenes a la vez:
HTTP no tiene una forma estándar de devolver varias imágenes en una sola
respuesta sin envolverlas en algo (multipart, zip) que complicaría más
de lo que resuelve para un caso de tres imágenes -- la herramienta MCP
`compare_species_images`, en cambio, sí devuelve las tres juntas (un
`list[Image]` es justo lo que MCP admite de forma nativa). Cada endpoint
recalcula la comparación completa (barata: 54 filas de homología en
total hoy) para no arrastrar estado entre peticiones HTTP.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from backend.api.services import species_render_service
from backend.database.session import get_db

router = APIRouter(prefix="/render/species", tags=["render"])

__all__ = ["hemisphere_a", "hemisphere_b", "homology_connectogram", "router"]


def _render_images(db: Session, species_a_id: str, species_b_id: str, connection_type: str, min_weight: float):
    try:
        return species_render_service.render_species_comparison_images(
            db, species_a_id, species_b_id, connection_type, min_weight
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/homology-connectogram")
def homology_connectogram(
    species_a_id: str,
    species_b_id: str,
    connection_type: str = "structural",
    min_weight: float = 0.0,
    db: Session = Depends(get_db),
) -> Response:
    """Connectograma circular real de homología entre dos especies, en
    PNG. 404 si alguna especie no existe o si no comparten ninguna
    homología real."""
    images = _render_images(db, species_a_id, species_b_id, connection_type, min_weight)
    return Response(content=images.homology_connectogram_png, media_type="image/png")


@router.get("/hemisphere-a")
def hemisphere_a(
    species_a_id: str,
    species_b_id: str,
    connection_type: str = "structural",
    min_weight: float = 0.0,
    db: Session = Depends(get_db),
) -> Response:
    """Esquema interhemisférico real de la especie A de la comparación
    (solo sus regiones homólogas con la especie B), en PNG."""
    images = _render_images(db, species_a_id, species_b_id, connection_type, min_weight)
    return Response(content=images.species_a_hemisphere_png, media_type="image/png")


@router.get("/hemisphere-b")
def hemisphere_b(
    species_a_id: str,
    species_b_id: str,
    connection_type: str = "structural",
    min_weight: float = 0.0,
    db: Session = Depends(get_db),
) -> Response:
    """Esquema interhemisférico real de la especie B de la comparación
    (solo sus regiones homólogas con la especie A), en PNG."""
    images = _render_images(db, species_a_id, species_b_id, connection_type, min_weight)
    return Response(content=images.species_b_hemisphere_png, media_type="image/png")
