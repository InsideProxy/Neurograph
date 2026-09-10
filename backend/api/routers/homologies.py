"""Endpoint de búsqueda de homologías reales entre especies (Fase 10,
31/08/2026 -- versión mínima de FIND_HOMOLOGUES, sección 16). Reutiliza
íntegramente `backend/api/services/homology_service.py`, mismo criterio
que `GET /tracts` (sección 15: nunca reimplementar).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.services import homology_service
from backend.api.services.homology_service import HomologyMatch
from backend.database.session import get_db

router = APIRouter(prefix="/homologies", tags=["homologies"])

__all__ = ["HomologyMatch", "find_homologues", "router"]


@router.get("", response_model=list[HomologyMatch])
def find_homologues(
    region_id: str | None = None,
    species_id: str | None = None,
    db: Session = Depends(get_db),
) -> list[HomologyMatch]:
    """Busca homologías reales ya cargadas. Sin filtro, devuelve todas.
    `region_id` filtra a las que tocan esa región (en cualquiera de los
    dos extremos); `species_id`, a las que tocan esa especie. Ningún
    filtro reduce lo que se cuenta de cada homología encontrada -- solo
    decide cuáles aparecen (ver docstring de `find_homologues` en el
    servicio)."""
    return homology_service.find_homologues(db, region_id=region_id, species_id=species_id)
