"""Endpoints de regiones (sección 15: versión mínima de SEARCH_REGION).
Cada región real que se devuelve viene siempre acompañada de su
coordenada y del espacio de referencia en el que está expresada — nunca
una posición desnuda sin saber en qué sistema vive (sección 2.7 / riesgo
5 de docs/analisis-arquitectura.md).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database.models.entities import Coordinate, Region
from backend.database.session import get_db

router = APIRouter(prefix="/regions", tags=["regions"])


class RegionNode(BaseModel):
    id: str
    label: str
    network: str
    position3d: tuple[float, float, float]
    reference_space: str


def region_to_node(region: Region, coordinate: Coordinate) -> RegionNode:
    """Traducción pura (sin base de datos) de una `Region` + su
    `Coordinate` a la forma que consume el frontend. Separada del
    endpoint para poder probarla sin una base de datos real.
    """
    return RegionNode(
        id=region.id,
        label=region.name,
        # Fase 3 todavía no carga redes funcionales (llegan con la
        # parcelación Cole-Anticevic); "unclassified" es explícito, no un
        # valor inventado.
        network="unclassified",
        position3d=(coordinate.x, coordinate.y, coordinate.z),
        reference_space=coordinate.reference_space,
    )


@router.get("", response_model=list[RegionNode])
def list_regions(atlas_id: str | None = None, db: Session = Depends(get_db)) -> list[RegionNode]:
    """Devuelve las regiones que tienen coordenada registrada (una región
    sin coordenada no se puede colocar en el cerebro 3D, así que se
    excluye en vez de mandarse con una posición inventada)."""
    query = select(Region, Coordinate).join(Coordinate, Coordinate.entity_id == Region.id)
    if atlas_id is not None:
        query = query.where(Region.atlas_id == atlas_id)
    rows = db.execute(query).all()
    return [region_to_node(region, coordinate) for region, coordinate in rows]
