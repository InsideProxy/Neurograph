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

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.api.services import connectivity_service, tractography_service
from backend.api.services.connectivity_service import InducedTract
from backend.api.services.tractography_service import TractGeometryOut, TractSummary
from backend.database.session import get_db

router = APIRouter(prefix="/tracts", tags=["tracts"])

__all__ = ["get_tract_geometry", "list_tract_geometries", "router", "search_tracts"]


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



@router.get("/geometry", response_model=list[TractSummary])
def list_tract_geometries(db: Session = Depends(get_db)) -> list[TractSummary]:
    """Metadatos (sin streamlines) de los tractos reales que SÍ tienen
    geometría 3D cargada (ORG-800FC-100HCP, 41 tractos) -- para la lista
    de selección de la pestaña de tractografía. Los 52 tractos de Yeh
    2022 (sin geometría) nunca aparecen aquí; siguen disponibles en
    `GET /tracts` para la búsqueda por conectividad."""
    return tractography_service.list_tracts_with_geometry(db)


@router.get("/{tract_id}/geometry", response_model=TractGeometryOut)
def get_tract_geometry(tract_id: str, db: Session = Depends(get_db)) -> TractGeometryOut:
    """Geometría real (streamlines) de un único tracto, pedida solo
    cuando la usuaria lo marca en la pestaña de tractografía -- nunca de
    los 41 a la vez, para no cargar varios MB sin necesidad. 404 si el
    id no existe o no tiene geometría (nunca una lista vacía disfrazada
    de "no existe")."""
    result = tractography_service.get_tract_geometry(db, tract_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Tracto sin geometría: {tract_id}")
    return result
