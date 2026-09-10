"""Capa de servicio del grafo híbrido tractografía+parcelación (cuarta
pestaña de tractografía, decisión 66, 09/09/2026 -- petición de la
usuaria: "hagamos una cuarta pestaña con nodos derivados de
tractografía... se seleccionan nodos y el programa devuelve la
tractografía que los une").

Separado de `tractography_service.py` a propósito: ese módulo resuelve
"¿qué forma 3D tiene ESTE tracto?" (streamlines completas de un único
tracto con nombre, ORG-800FC-100HCP); este resuelve "¿qué streamlines
reales conectan ESTOS nodos que acabo de marcar?" (nodos derivados del
wmparc, agregados a través de los 41 tractos) -- dos preguntas
distintas sobre el mismo dato de origen, mismo criterio de separación
ya aplicado entre `tractography_service.py` y `connectivity_service.py`.

`induced_hybrid_edges` sigue el mismo patrón estructural que
`compute_induced_connectivity` (decisión 12): solo se devuelven aristas
reales cuyos DOS extremos están dentro del conjunto de nodos
seleccionado -- nunca una arista que sale del conjunto hacia un nodo no
marcado (eso ya lo decide `tractography_edges` en el momento de
generarse: cada fila ya conecta exactamente dos nodos reales, así que
"inducido" aquí es un simple filtro SQL `node_a_id IN (...) AND
node_b_id IN (...)`, no una agregación nueva)."""
from __future__ import annotations

from typing import Protocol

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database.models.entities import TractographyEdge, TractographyNode


class HybridNodeOut(BaseModel):
    """Un nodo real del grafo híbrido -- para la lista de selección de
    la pestaña, con su posición real en el espacio propio de
    ORG-800FC-100HCP (nunca MNI152, ver `reference_space`)."""

    id: str
    name: str
    x: float
    y: float
    z: float
    reference_space: str


class HybridEdgeOut(BaseModel):
    """Arista real entre dos nodos marcados. `streamline_count_real` es
    el total real de streamlines de ORG-800FC-100HCP cuyos dos extremos
    caen en este par de nodos; `streamline_count_shown` es cuántas de
    esas trae de verdad `streamlines` -- nunca se reduce sin dejar
    constancia del total real, mismo principio que `TractGeometryOut`."""

    node_a_id: str
    node_b_id: str
    tract_codes: list[str]
    streamline_count_real: int
    streamline_count_shown: int
    streamlines: list[list[tuple[float, float, float]]]
    reference_space: str


class _NodeLike(Protocol):
    id: str
    name: str
    x: float
    y: float
    z: float
    reference_space: str


class _EdgeLike(Protocol):
    node_a_id: str
    node_b_id: str
    tract_codes: list[str]
    streamline_count_real: int
    streamline_count_shown: int
    streamlines: list
    reference_space: str


def build_hybrid_node_out(node: _NodeLike) -> HybridNodeOut:
    """Función pura (sin base de datos): arma la salida de un único
    nodo ya cargado."""
    return HybridNodeOut(
        id=node.id, name=node.name, x=node.x, y=node.y, z=node.z,
        reference_space=node.reference_space,
    )


def build_hybrid_edge_out(edge: _EdgeLike) -> HybridEdgeOut:
    """Función pura (sin base de datos): arma la salida de una única
    arista ya cargada."""
    return HybridEdgeOut(
        node_a_id=edge.node_a_id,
        node_b_id=edge.node_b_id,
        tract_codes=list(edge.tract_codes),
        streamline_count_real=edge.streamline_count_real,
        streamline_count_shown=edge.streamline_count_shown,
        streamlines=edge.streamlines,
        reference_space=edge.reference_space,
    )


def list_hybrid_nodes(db: Session) -> list[HybridNodeOut]:
    """Los 176 nodos reales del grafo híbrido, ordenados por nombre para
    una lista de selección estable y legible -- ver docstring del
    módulo y decisión 66 para por qué son 176 (178 etiquetas reales del
    wmparc menos las 2 "unknown" sin nombre anatómico verificado)."""
    rows = db.execute(select(TractographyNode).order_by(TractographyNode.name)).scalars()
    return [build_hybrid_node_out(row) for row in rows]


def induced_hybrid_edges(db: Session, node_ids: list[str]) -> list[HybridEdgeOut]:
    """Aristas reales cuyos DOS extremos están en `node_ids` -- pedida
    solo cuando la usuaria marca 2 o más nodos en la pestaña, nunca de
    golpe para los 176 (podría ser una consulta muy grande sin ningún
    filtro). No aplica ningún umbral de recuento: devuelve todas las
    aristas reales que cumplen la condición estructural, igual que
    `induced_connectivity` (decisión 12) -- filtrar por fuerza de
    conexión es cosa de la interfaz, no de este servicio."""
    rows = db.execute(
        select(TractographyEdge).where(
            TractographyEdge.node_a_id.in_(node_ids),
            TractographyEdge.node_b_id.in_(node_ids),
        )
    ).scalars()
    return [build_hybrid_edge_out(row) for row in rows]
