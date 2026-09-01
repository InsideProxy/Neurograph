"""Endpoint de búsqueda de tractos (Fase 10, 31/08/2026 -- versión
mínima de SEARCH_TRACT, sección 15/16): antes esta información solo
aparecía de forma incidental dentro de `GET /connectivity/induced`
(acotada a una selección de regiones); este endpoint la expone como
búsqueda propia, por nombre/abreviatura y/o por una región que el
tracto deba tocar.

Reutiliza íntegramente los modelos y la lógica de
`backend/api/services/connectivity_service.py` (`InducedTract` como
forma de respuesta, `build_tract_matches` como agregación): un tracto es
un tracto, tenga o no una selección de regiones alrededor, así que no
hace falta un modelo nuevo con el mismo contenido (sección 15: nunca
reimplementar).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.services import connectivity_service
from backend.api.services.connectivity_service import InducedTract
from backend.database.session import get_db

router = APIRouter(prefix="/tracts", tags=["tracts"])

__all__ = ["router", "search_tracts"]


@router.get("", response_model=list[InducedTract])
def search_tracts(
    name: str | None = None,
    region_id: str | None = None,
    db: Session = Depends(get_db),
) -> list[InducedTract]:
    """Busca tractos reales por nombre/abreviatura (subcadena, sin
    distinguir mayúsculas) y/o por una región que deban tocar. Cada
    tracto devuelto lleva TODAS las regiones que realmente toca (no solo
    `region_id`, si se dio uno) y su cita real, igual criterio que
    `GET /connectivity/induced`. Un tracto sin ninguna fila de
    conectividad real (`weight > 0`) no aparece: no hay nada verificado
    que reportar sobre él (ver docstring de `search_tracts` en el
    servicio).
    """
    return connectivity_service.search_tracts(db, name=name, region_id=region_id)
