"""Endpoints del grafo híbrido tractografía+parcelación (cuarta pestaña
de tractografía, decisión 66, 09/09/2026). Separado de
`backend/api/routers/tracts.py` (geometría de UN tracto con nombre) --
aquí la pregunta es "¿qué streamlines reales conectan estos nodos que
acabo de marcar?", sobre nodos derivados del wmparc, no sobre tractos
con nombre propio. Mismo reparto de responsabilidades ya establecido en
todo el proyecto: la consulta real y los modelos viven en
`backend/api/services/hybrid_tractography_service.py`, este módulo solo
define el endpoint HTTP.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.api.services import hybrid_tractography_service
from backend.api.services.hybrid_tractography_service import HybridEdgeOut, HybridNodeOut
from backend.database.session import get_db

router = APIRouter(prefix="/tractography", tags=["tractography"])

__all__ = ["HybridEdgeOut", "HybridNodeOut", "induced_hybrid_edges", "list_hybrid_nodes", "router"]


@router.get("/nodes", response_model=list[HybridNodeOut])
def list_hybrid_nodes(db: Session = Depends(get_db)) -> list[HybridNodeOut]:
    """Los 176 nodos reales del grafo híbrido (etiquetas del wmparc con
    nombre anatómico verificado, decisión 66) -- para la lista de
    selección de la pestaña, con casilla por nodo igual que
    Tractografía 3D."""
    return hybrid_tractography_service.list_hybrid_nodes(db)


@router.get("/edges", response_model=list[HybridEdgeOut])
def induced_hybrid_edges(
    node_ids: list[str] = Query(..., min_length=2),
    db: Session = Depends(get_db),
) -> list[HybridEdgeOut]:
    """Aristas reales entre los nodos marcados -- exige al menos 2
    (condición estructural, no un umbral arbitrario: una arista conecta
    dos nodos por definición, mismo criterio ya usado en
    `GET /connectivity/induced`, decisión 12). Solo devuelve aristas
    cuyos DOS extremos están en `node_ids`, nunca una que sale del
    conjunto marcado."""
    return hybrid_tractography_service.induced_hybrid_edges(db, node_ids)
