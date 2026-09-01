"""Endpoints de regiones (sección 15: versión mínima de SEARCH_REGION).
Cada región real que se devuelve viene siempre acompañada de su
coordenada y del espacio de referencia en el que está expresada — nunca
una posición desnuda sin saber en qué sistema vive (sección 2.7 / riesgo
5 de docs/analisis-arquitectura.md).

La consulta real y la traducción pura viven en
`backend/api/services/regions_service.py` desde la Fase 10 (31/08/2026):
este módulo solo reexporta `RegionNode`/`region_to_node` (para no romper
`backend/tests/api/test_regions.py`, que los importa desde aquí) y
define el endpoint HTTP, que delega en el servicio -- la herramienta MCP
`search_region` (`backend/mcp/server.py`) llama a la misma función.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.services import regions_service
from backend.api.services.regions_service import RegionNode, region_to_node
from backend.database.session import get_db

router = APIRouter(prefix="/regions", tags=["regions"])

__all__ = ["RegionNode", "list_regions", "region_to_node", "router"]


@router.get("", response_model=list[RegionNode])
def list_regions(atlas_id: str | None = None, db: Session = Depends(get_db)) -> list[RegionNode]:
    """Devuelve las regiones que tienen coordenada registrada (una región
    sin coordenada no se puede colocar en el cerebro 3D, así que se
    excluye en vez de mandarse con una posición inventada). La red
    funcional es opcional (LEFT JOIN): una región sin pertenencia
    calculada todavía se devuelve igual, marcada "unclassified".
    """
    return regions_service.list_regions(db, atlas_id)
