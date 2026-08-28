"""Endpoint de conexiones (sección 15: versión mínima de
FIND_CONNECTIONS/BUILD_CONNECTOME). Cada conexión real que se devuelve
lleva siempre su `evidence_level` explícito — nunca se asume "direct"
quien la reciba (sección 24).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database.models.entities import Connection, Region
from backend.database.session import get_db

router = APIRouter(prefix="/connections", tags=["connections"])


class ConnectionEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str
    weight: float
    evidenceLevel: str


def connection_to_edge(connection: Connection) -> ConnectionEdge:
    """Traducción pura (sin base de datos) de una `Connection` a la forma
    que consume el frontend. Un `weight` ausente en la base de datos se
    convierte en 0.0 explícito, no se inventa un valor intermedio."""
    return ConnectionEdge(
        id=connection.id,
        source=connection.source_id,
        target=connection.target_id,
        type=connection.type,
        weight=connection.weight if connection.weight is not None else 0.0,
        evidenceLevel=connection.evidence_level,
    )


@router.get("", response_model=list[ConnectionEdge])
def list_connections(atlas_id: str | None = None, db: Session = Depends(get_db)) -> list[ConnectionEdge]:
    """Devuelve las conexiones cuyo origen pertenece al atlas indicado
    (si se da uno). No filtra por peso ni aplica ningún umbral aquí: el
    dato completo es responsabilidad de la API, decidir qué mostrar es
    responsabilidad de la interfaz (sección 24 / decisión del 28/08/2026
    con la usuaria)."""
    query = select(Connection)
    if atlas_id is not None:
        region_ids = select(Region.id).where(Region.atlas_id == atlas_id)
        query = query.where(Connection.source_id.in_(region_ids))
    rows = db.execute(query).scalars().all()
    return [connection_to_edge(connection) for connection in rows]
