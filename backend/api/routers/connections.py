"""Endpoint de conexiones (sección 15: versión mínima de
FIND_CONNECTIONS/BUILD_CONNECTOME). Cada conexión real que se devuelve
lleva siempre su `evidence_level` explícito — nunca se asume "direct"
quien la reciba (sección 24).

La consulta real y la traducción pura viven en
`backend/api/services/connections_service.py` desde la Fase 10
(31/08/2026): este módulo solo reexporta `ConnectionEdge`/
`connection_to_edge` (para no romper
`backend/tests/api/test_connections.py`, ni las importaciones que ya
hacía `backend/api/routers/connectivity.py`) y define el endpoint HTTP,
que delega en el servicio.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.services import connections_service
from backend.api.services.connections_service import ConnectionEdge, connection_to_edge
from backend.database.session import get_db

router = APIRouter(prefix="/connections", tags=["connections"])

__all__ = ["ConnectionEdge", "connection_to_edge", "list_connections", "router"]


@router.get("", response_model=list[ConnectionEdge])
def list_connections(atlas_id: str | None = None, db: Session = Depends(get_db)) -> list[ConnectionEdge]:
    """Devuelve las conexiones cuyo origen pertenece al atlas indicado
    (si se da uno). No filtra por peso ni aplica ningún umbral aquí: el
    dato completo es responsabilidad de la API, decidir qué mostrar es
    responsabilidad de la interfaz (sección 24 / decisión del 28/08/2026
    con la usuaria)."""
    return connections_service.list_connections(db, atlas_id)
