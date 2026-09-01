"""Capa de servicio de conectividad inducida y búsqueda de tractos
(Fase 10, sección 16).

Dueña real de:

- Los modelos y la función pura `compute_induced_connectivity`, que
  antes vivían en `backend/api/routers/connectivity.py` (petición de la
  usuaria, 30/08/2026: conectividad entre varias regiones seleccionadas
  a la vez). Se mueven aquí por el mismo motivo que
  `regions_service.py`/`connections_service.py`: que la API HTTP y las
  herramientas MCP (`get_connectivity`) llamen a la misma función. El
  router reexporta todo lo público para no romper
  `backend/tests/api/test_connectivity.py`.
- `build_tract_matches`, una función pura NUEVA (Fase 10, 31/08/2026)
  que factoriza el bucle de "agrupar filas tracto->región por tracto y
  construir su cita real" -- antes vivía duplicado dentro de
  `compute_induced_connectivity` sin nombre propio. `compute_induced_
  connectivity` la reutiliza (llamada + filtro estructural de "≥2
  regiones de la selección"); `search_tracts`, más abajo, la reutiliza
  sin ese filtro (aquí no hay una "selección": es una búsqueda global o
  acotada a una única región). Mismo principio que en el resto del
  proyecto: nunca reimplementar una lógica ya escrita.
- Las dos consultas reales: `induced_connectivity` (ya existía dentro
  del endpoint) y `search_tracts` (Fase 10, nueva: respalda tanto el
  endpoint `GET /tracts` como la herramienta MCP `search_tract`).
"""
from __future__ import annotations

from typing import Protocol

from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.api.services.connections_service import ConnectionEdge, connection_to_edge
from backend.database.models.entities import Connection, Dataset, Study, Tract


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
    # Regiones reales que este tracto toca, según el contexto de quien
    # llama: en `compute_induced_connectivity`, el subconjunto de la
    # selección que realmente toca; en `search_tracts`, TODAS las
    # regiones que toca (sin selección de por medio). Nunca una lista
    # parcial sin dejar claro cuál de los dos casos es.
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
    Yeh 2022) que necesitan `build_tract_matches` y sus llamantes."""

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


def build_tract_matches(
    touch_rows: list[_TractTouchRow],
    tracts_by_id: dict[str, _TractLike],
    datasets_by_id: dict[str, _DatasetLike],
    studies_by_id: dict[str, _StudyLike],
) -> list[InducedTract]:
    """A partir de filas tracto->región ya filtradas a `weight > 0`
    (mismo criterio en todo el proyecto: una fila con probabilidad 0
    significa que ese tracto no pasa por esa región, no "toca la región
    pero débil" -- sección 24), agrupa por tracto y construye su lista
    de regiones tocadas + su cita real, ordenado por id de tracto.

    Función pura (sin base de datos), reutilizada por
    `compute_induced_connectivity` (que además filtra a tractos con ≥2
    regiones DE LA SELECCIÓN, condición estructural de esa pregunta
    concreta -- decisión 12 de docs/analisis-arquitectura.md) y por
    `search_tracts` (que no aplica ningún filtro de cantidad: aquí un
    tracto que solo toca una región sigue siendo una respuesta válida a
    "¿qué tractos tocan esta región?").
    """
    regions_by_tract: dict[str, set[str]] = {}
    dataset_by_tract: dict[str, str | None] = {}
    for row in touch_rows:
        regions_by_tract.setdefault(row.source_id, set()).add(row.target_id)
        dataset_by_tract[row.source_id] = row.source_dataset_id

    matches: list[InducedTract] = []
    for tract_id in sorted(regions_by_tract):
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
        matches.append(
            InducedTract(
                id=tract.id,
                name=tract.name,
                abbreviation=tract.abbreviation,
                region_ids=sorted(regions_by_tract[tract_id]),
                studies=studies,
            )
        )
    return matches


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
    filtrado por quien llama a solo las filas cuyo `target_id` está en
    la selección (mismo motivo estructural: un tracto que toca A pero
    no B no dice nada sobre A-B)."""
    if len(unique_region_ids) < 2:
        return InducedConnectivity(region_ids=unique_region_ids, connections=[], tracts=[])

    edges = [connection_to_edge(c) for c in connections]

    all_matches = build_tract_matches(tract_touch_rows, tracts_by_id, datasets_by_id, studies_by_id)
    # Condición estructural de ESTA pregunta (no un umbral arbitrario,
    # sección 24 -- decisión 12): un tracto solo es relevante para la
    # selección si toca dos o más de sus regiones.
    tracts = [t for t in all_matches if len(t.region_ids) >= 2]

    return InducedConnectivity(region_ids=unique_region_ids, connections=edges, tracts=tracts)


def induced_connectivity(db: Session, region_ids: list[str]) -> InducedConnectivity:
    """Consulta real detrás de `GET /connectivity/induced` y de la
    herramienta MCP `get_connectivity`: dado un conjunto de regiones
    seleccionadas a la vez, qué conexiones existen entre ellas y qué
    tractos con nombre las conectan, con su cita real."""
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


def search_tracts(db: Session, name: str | None = None, region_id: str | None = None) -> list[InducedTract]:
    """Consulta real detrás de `GET /tracts` y de la herramienta MCP
    `search_tract` (Fase 10, 31/08/2026): busca tractos por nombre/
    abreviatura (subcadena, sin distinguir mayúsculas) y/o por una
    región que deban tocar, y devuelve para cada uno TODAS las regiones
    reales que toca (con `weight > 0`, sección 24) y su cita, sin
    restringir la lista a la región de filtro -- filtrar por región_id
    decide QUÉ tractos aparecen, nunca RECORTA lo que se cuenta de cada
    uno, para no dar una imagen parcial de un tracto real.

    Un tracto candidato (por nombre) que no tiene ninguna fila con
    `weight > 0` en la base de datos no aparece en el resultado: no hay
    nada real que reportar sobre a qué regiones toca, y devolverlo con
    `region_ids=[]` se confundiría con "se comprobó y no toca ninguna",
    que es una afirmación distinta y no verificada aquí.
    """
    tract_query = select(Tract)
    if name is not None:
        pattern = f"%{name}%"
        tract_query = tract_query.where(or_(Tract.name.ilike(pattern), Tract.abbreviation.ilike(pattern)))
    candidate_tracts = list(db.execute(tract_query).scalars().all())
    if not candidate_tracts:
        return []
    candidate_tract_ids = [t.id for t in candidate_tracts]

    touch_rows = list(
        db.execute(
            select(Connection).where(
                Connection.source_id.in_(candidate_tract_ids),
                Connection.weight.is_not(None),
                Connection.weight > 0,
            )
        ).scalars().all()
    )

    tracts_by_id = {t.id: t for t in candidate_tracts}
    dataset_ids = sorted({row.source_dataset_id for row in touch_rows if row.source_dataset_id is not None})
    datasets_by_id = {
        d.id: d
        for d in db.execute(select(Dataset).where(Dataset.id.in_(dataset_ids))).scalars().all()
    }
    study_ids = sorted({d.study_id for d in datasets_by_id.values() if d.study_id is not None})
    studies_by_id = {
        s.id: s
        for s in db.execute(select(Study).where(Study.id.in_(study_ids))).scalars().all()
    }

    matches = build_tract_matches(touch_rows, tracts_by_id, datasets_by_id, studies_by_id)

    if region_id is not None:
        matches = [m for m in matches if region_id in m.region_ids]

    return matches
