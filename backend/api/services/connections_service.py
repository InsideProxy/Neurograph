"""Capa de servicio de conexiones (Fase 10, sección 16).

Dueña real de la traducción pura `Connection` -> `ConnectionEdge` y de
la consulta que lista conexiones. Antes ambas vivían dentro del
endpoint `GET /connections` (`backend/api/routers/connections.py`); se
mueven aquí por el mismo motivo que `regions_service.py`: que la API
HTTP y las herramientas MCP llamen a la misma función. El router
reexporta `ConnectionEdge`/`connection_to_edge` para no romper
`backend/tests/api/test_connections.py`.
"""
from __future__ import annotations

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database.models.entities import Connection, Region


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


def list_connections(db: Session, atlas_id: str | None = None) -> list[ConnectionEdge]:
    """Conexiones cuyo origen pertenece al atlas indicado (si se da
    uno). No filtra por peso ni aplica ningún umbral aquí: el dato
    completo es responsabilidad de la API/MCP, decidir qué mostrar es
    responsabilidad de quien la consuma (sección 24)."""
    query = select(Connection)
    if atlas_id is not None:
        region_ids = select(Region.id).where(Region.atlas_id == atlas_id)
        query = query.where(Connection.source_id.in_(region_ids))
    rows = db.execute(query).scalars().all()
    return [connection_to_edge(connection) for connection in rows]
