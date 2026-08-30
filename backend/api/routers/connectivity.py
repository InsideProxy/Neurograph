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

Mismo patrón que `compute_graph_metrics` en `graph_metrics.py`:
`compute_induced_connectivity` es una función pura (sin base de datos)
que recibe filas ya consultadas, para poder probarse sin una base de
datos real; el endpoint solo hace las consultas y traduce.
"""
from __future__ import annotations

from typing import Protocol

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.api.routers.connections import ConnectionEdge, connection_to_edge
from backend.database.models.entities import Connection, Dataset, Study, Tract
from backend.database.session import get_db

router = APIRouter(prefix="/connectivity", tags=["connectivity"])


class TractCitation(BaseModel):
    id: str
    name: str
    doi: str | None
    year: int | None


class InducedTract(BaseModel):
    id: str
    name: str
    # None si la ingesta de tractos todavía no tiene abreviatura
    # registrada para este (migración 0007) -- nunca se inventa una.
    abbreviation: str | None
    # Subconjunto de la selección que este tracto realmente toca (puede
    # ser menos que toda la selección: p. ej. 2 de 3 regiones elegidas).
    region_ids: list[str]
    # Vacío si el dataset de origen no tiene estudio enlazado todavía,
    # nunca una cita inventada.
    studies: list[TractCitation]


class InducedConnectivity(BaseModel):
    # Eco de la selección real tras deduplicar, para que quien llame
    # pueda verificar qué se le respondió exactamente.
    region_ids: list[str]
    connections: list[ConnectionEdge]
    tracts: list[InducedTract]


class _TractTouchRow(Protocol):
    """Forma mínima de una fila tracto->región (Connection real de
    Yeh 2022) que necesita `compute_induced_connectivity`."""

    source_id: str
    target_id: str
    source_dataset_id: str | None


class _TractLike(Protocol):
    id: str
    name: str
    abbreviation: str | None


class _DatasetLike(Protocol):
    id: str
    study_id: str | None


class _StudyLike(Protocol):
    id: str
    name: str
    doi: str | None
    year: int | None


def compute_induced_connectivity(
    unique_region_ids: list[str],
    connections: list[Connection],
    tract_touch_rows: list[_TractTouchRow],
    tracts_by_id: dict[str, _TractLike],
    datasets_by_id: dict[str, _DatasetLike],
    studies_by_id: dict[str, _StudyLike],
) -> InducedConnectivity:
    """Con menos de dos regiones no hay "conectividad entre regiones
    seleccionadas" que inducir: se devuelve vacío en vez de
    reinterpretar la petición. `tract_touch_rows` debe venir ya
    filtrado a `weight > 0` (una fila con probabilidad 0 significa que
    ese tracto no pasa por esa región, no es "parte de la selección
    pero débil": sección 24)."""
    if len(unique_region_ids) < 2:
        return InducedConnectivity(region_ids=unique_region_ids, connections=[], tracts=[])

    edges = [connection_to_edge(c) for c in connections]

    regions_by_tract: dict[str, set[str]] = {}
    dataset_by_tract: dict[str, str | None] = {}
    for row in tract_touch_rows:
        regions_by_tract.setdefault(row.source_id, set()).add(row.target_id)
        dataset_by_tract[row.source_id] = row.source_dataset_id

    qualifying_tract_ids = sorted(tid for tid, regs in regions_by_tract.items() if len(regs) >= 2)

    tracts: list[InducedTract] = []
    for tract_id in qualifying_tract_ids:
        tract = tracts_by_id.get(tract_id)
        if tract is None:
            # No debería pasar (viene de la propia tabla de tractos),
            # pero si pasa, no se inventa una entrada a medias.
            continue
        dataset = datasets_by_id.get(dataset_by_tract.get(tract_id))
        study = studies_by_id.get(dataset.study_id) if dataset is not None and dataset.study_id else None
        studies = (
            [TractCitation(id=study.id, name=study.name, doi=study.doi, year=study.year)]
            if study is not None
            else []
        )
        tracts.append(
            InducedTract(
                id=tract.id,
                name=tract.name,
                abbreviation=tract.abbreviation,
                region_ids=sorted(regions_by_tract[tract_id]),
                studies=studies,
            )
        )

    return InducedConnectivity(region_ids=unique_region_ids, connections=edges, tracts=tracts)


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
    unique_region_ids = sorted(set(region_ids))
    if len(unique_region_ids) < 2:
        return InducedConnectivity(region_ids=unique_region_ids, connections=[], tracts=[])

    connections = list(
        db.execute(
            select(Connection).where(
                Connection.source_id.in_(unique_region_ids),
                Connection.target_id.in_(unique_region_ids),
            )
        ).scalars().all()
    )

    tract_ids_subquery = select(Tract.id)
    tract_touch_rows = list(
        db.execute(
            select(Connection).where(
                Connection.source_id.in_(tract_ids_subquery),
                Connection.target_id.in_(unique_region_ids),
                Connection.weight.is_not(None),
                Connection.weight > 0,
            )
        ).scalars().all()
    )

    touched_tract_ids = sorted({row.source_id for row in tract_touch_rows})
    tracts_by_id = {
        t.id: t
        for t in db.execute(select(Tract).where(Tract.id.in_(touched_tract_ids))).scalars().all()
    }
    dataset_ids = sorted({row.source_dataset_id for row in tract_touch_rows if row.source_dataset_id is not None})
    datasets_by_id = {
        d.id: d
        for d in db.execute(select(Dataset).where(Dataset.id.in_(dataset_ids))).scalars().all()
    }
    study_ids = sorted({d.study_id for d in datasets_by_id.values() if d.study_id is not None})
    studies_by_id = {
        s.id: s
        for s in db.execute(select(Study).where(Study.id.in_(study_ids))).scalars().all()
    }

    return compute_induced_connectivity(
        unique_region_ids=unique_region_ids,
        connections=connections,
        tract_touch_rows=tract_touch_rows,
        tracts_by_id=tracts_by_id,
        datasets_by_id=datasets_by_id,
        studies_by_id=studies_by_id,
    )
