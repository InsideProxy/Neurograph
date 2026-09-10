"""Endpoint de comparación real entre dos especies (Fase 10, 31/08/2026 --
versión mínima de COMPARE_SPECIES, sección 16). Reutiliza íntegramente
`backend/api/services/species_service.py`.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.api.services import species_service
from backend.api.services.species_service import CompareSpeciesResult, SpeciesListItem
from backend.database.session import get_db

router = APIRouter(prefix="/species", tags=["species"])

__all__ = ["CompareSpeciesResult", "SpeciesListItem", "compare_species", "list_species", "router"]


@router.get("", response_model=list[SpeciesListItem])
def list_species(db: Session = Depends(get_db)) -> list[SpeciesListItem]:
    """Todas las especies reales con al menos una región cargada --
    pensado para poblar un desplegable de selección (frontend, panel de
    comparación entre especies) sin depender de IDs escritos a mano."""
    return species_service.list_species(db)


@router.get("/compare", response_model=CompareSpeciesResult)
def compare_species(
    species_a_id: str,
    species_b_id: str,
    db: Session = Depends(get_db),
) -> CompareSpeciesResult:
    """Compara dos especies reales: cuántas regiones tiene cargada cada
    una, cuántas participan en alguna homología real con la otra, y la
    lista completa de esas homologías (con su cita real). 404 si alguna
    de las dos especies no existe -- nunca una comparación silenciosa
    contra una especie inventada."""
    try:
        return species_service.compare_species(db, species_a_id, species_b_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
