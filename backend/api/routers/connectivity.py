"""Endpoint de conectividad inducida entre varias regiones seleccionadas
a la vez (petición de la usuaria, 30/08/2026): dado un conjunto de
regiones, qué conexiones existen entre ellas y, si alguna de esas
regiones forma parte de un tracto con nombre (Yeh 2022), qué tracto es y
en qué estudio se apoya. Pensado para una app de investigación: cada
tracto devuelto lleva su cita real, nunca una referencia genérica ni
inventada (sección 24).

Un tracto solo se considera relevante para la selección si toca **dos o
más** de las regiones seleccionadas (no una sola): un tracto que solo
pasa por una región no dice nada sobre la conectividad *entre* las
regiones elegidas, que es lo que se pidió. Esto no es un umbral
estadístico arbitrario (como los que la sección 24 prohíbe aplicar al
cargar datos) sino una condición estructural de la propia pregunta —
está documentado como decisión 12 en docs/analisis-arquitectura.md.

La consulta real, los modelos y la lógica pura viven ahora en
`backend/api/services/connectivity_service.py` (Fase 10, 31/08/2026):
este módulo solo reexporta lo público (para no romper
`backend/tests/api/test_connectivity.py`) y define el endpoint HTTP, que
delega en el servicio -- la herramienta MCP `get_connectivity`
(`backend/mcp/server.py`) llama a la misma función.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.api.services import connectivity_service
from backend.api.services.connectivity_service import (
    InducedConnectivity,
    InducedTract,
    TractCitation,
    build_tract_matches,
    compute_induced_connectivity,
)
from backend.database.session import get_db

router = APIRouter(prefix="/connectivity", tags=["connectivity"])

__all__ = [
    "InducedConnectivity",
    "InducedTract",
    "TractCitation",
    "build_tract_matches",
    "compute_induced_connectivity",
    "induced_connectivity",
    "router",
]


@router.get("/induced", response_model=InducedConnectivity)
def induced_connectivity(
    region_ids: list[str] = Query(..., min_length=1),
    db: Session = Depends(get_db),
) -> InducedConnectivity:
    """Conectividad inducida por un conjunto de regiones seleccionadas a
    la vez en la interfaz (selección múltiple, decisión del 30/08/2026
    con la usuaria: clic normal añade/quita una región del conjunto).

    No aplica ningún umbral de peso: devuelve todas las conexiones y
    tractos reales que cumplen la condición estructural de
    `compute_induced_connectivity`, igual que el resto de la API
    (sección 24) -- filtrar por peso es cosa de la interfaz, no de este
    endpoint.
    """
    return connectivity_service.induced_connectivity(db, region_ids)
