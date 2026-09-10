"""Capa de servicio de geometría real de tractografía (sección de
tractografía pedida por la usuaria el 02/09/2026 -- ver el docstring de
`backend/ingestion/tractography/org_atlas.py` para el diagnóstico
completo de dónde viene el dato, y la decisión 61 de
docs/analisis-arquitectura.md para el cierre de esta pieza).

Separado de `connectivity_service.py` a propósito: ese módulo resuelve
"¿qué regiones toca este tracto?" (peso tracto->región de Yeh 2022, sin
geometría 3D); este resuelve "¿qué forma 3D tiene este tracto?"
(streamlines reales de ORG-800FC-100HCP, sin relación con weight ni
regiones) -- son dos preguntas distintas sobre la misma tabla `tracts`,
con datos de origen distintos: los 52 tractos de Yeh 2022 nunca tienen
geometría, los 41 de ORG-800FC-100HCP siempre la tienen (join real con
`tract_geometries`, nunca asumido). Reutiliza `TractCitation` de
`connectivity_service` en vez de duplicarla -- mismo criterio ya
documentado en `tracts.py`: un tracto es un tracto, tenga o no
geometría alrededor.

Mismo patrón de separación pura/base de datos que el resto de
`backend/api/services/` (`build_tract_summaries`/`build_tract_geometry_out`
sin base de datos, probables con dataclasses falsas; `list_tracts_with_
geometry`/`get_tract_geometry` solo añaden la consulta real).
"""
from __future__ import annotations

from typing import Protocol

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.api.services.connectivity_service import TractCitation
from backend.database.models.entities import Study, Tract, TractGeometry


class TractSummary(BaseModel):
    """Metadatos de un tracto CON geometría real cargada -- para la
    lista de selección de la pestaña de tractografía, sin las
    streamlines en sí (que pueden pesar varios MB por tracto): la
    interfaz pide la geometría de un tracto concreto solo cuando la
    usuaria lo marca, nunca la de los 41 a la vez de golpe."""

    id: str
    name: str
    # None si el tracto no tiene abreviatura registrada (migración
    # 0007) -- nunca se inventa una.
    abbreviation: str | None
    streamline_count_real: int
    streamline_count_shown: int
    # Vacío si el tracto no tiene estudio de origen enlazado todavía
    # (`Tract.study_id` nullable, migración 0012), nunca una cita
    # inventada -- mismo criterio que `InducedTract.studies`.
    studies: list[TractCitation]
    # Espacio de referencia real de la geometría (migración 0014,
    # decisión 63) -- para que el frontend sepa qué malla de fondo
    # anatómica corresponde a este tracto, sin asumir que solo existe
    # una posible (ver Tractography3D.tsx, REFERENCE_SPACE_MESH).
    reference_space: str


class TractGeometryOut(BaseModel):
    """Geometría real de un único tracto. `streamlines` son listas de
    puntos [x, y, z] en el espacio de referencia PROPIO de
    ORG-800FC-100HCP -- nunca MNI152 ni el espacio de ningún otro atlas
    del proyecto (decisión 49: mezclarlos sin verificar el registro
    real entre espacios sería inventar una correspondencia que no
    existe). Por eso esta vista nunca combina esta geometría con
    coordenadas de `Coordinate` (que sí son MNI152)."""

    id: str
    name: str
    abbreviation: str | None
    streamline_count_real: int
    streamline_count_shown: int
    streamlines: list[list[tuple[float, float, float]]]
    reference_space: str


class _TractLike(Protocol):
    id: str
    name: str
    abbreviation: str | None
    study_id: str | None


class _GeometryLike(Protocol):
    streamline_count_real: int
    streamline_count_shown: int
    streamlines: list
    reference_space: str


class _StudyLike(Protocol):
    id: str
    name: str
    doi: str | None
    year: int | None


def build_tract_summaries(
    tracts_with_geometry: list[tuple[_TractLike, _GeometryLike]],
    studies_by_id: dict[str, _StudyLike],
) -> list[TractSummary]:
    """Función pura (sin base de datos): junta cada tracto con su fila
    de geometría y, si tiene `study_id`, su cita real -- vacía si no la
    tiene, nunca inventada. No decide el orden (lo hace la consulta real,
    `ORDER BY Tract.name`); aquí solo se preserva el orden de entrada."""
    result: list[TractSummary] = []
    for tract, geometry in tracts_with_geometry:
        study = studies_by_id.get(tract.study_id) if tract.study_id else None
        citations = (
            [TractCitation(id=study.id, name=study.name, doi=study.doi, year=study.year)]
            if study is not None
            else []
        )
        result.append(
            TractSummary(
                id=tract.id,
                name=tract.name,
                abbreviation=tract.abbreviation,
                streamline_count_real=geometry.streamline_count_real,
                streamline_count_shown=geometry.streamline_count_shown,
                studies=citations,
                reference_space=geometry.reference_space,
            )
        )
    return result


def build_tract_geometry_out(tract: _TractLike, geometry: _GeometryLike) -> TractGeometryOut:
    """Función pura (sin base de datos): arma la respuesta de geometría
    de un único tracto a partir de sus dos filas reales ya cargadas."""
    return TractGeometryOut(
        id=tract.id,
        name=tract.name,
        abbreviation=tract.abbreviation,
        streamline_count_real=geometry.streamline_count_real,
        streamline_count_shown=geometry.streamline_count_shown,
        streamlines=geometry.streamlines,
        reference_space=geometry.reference_space,
    )


def list_tracts_with_geometry(db: Session) -> list[TractSummary]:
    """Los tractos que de verdad tienen geometría 3D cargada (join real
    con `tract_geometries`, nunca los 52 de Yeh 2022 que no la tienen)
    -- para poblar la lista de selección de la pestaña de tractografía.
    Ordenado por nombre para una lista estable y legible."""
    rows = db.execute(
        select(Tract, TractGeometry)
        .join(TractGeometry, TractGeometry.tract_id == Tract.id)
        .order_by(Tract.name)
    ).all()
    study_ids = {tract.study_id for tract, _ in rows if tract.study_id}
    studies_by_id = (
        {s.id: s for s in db.execute(select(Study).where(Study.id.in_(study_ids))).scalars()}
        if study_ids
        else {}
    )
    return build_tract_summaries([(tract, geometry) for tract, geometry in rows], studies_by_id)


def get_tract_geometry(db: Session, tract_id: str) -> TractGeometryOut | None:
    """Geometría real de un único tracto, o `None` si el id no existe o
    no tiene geometría cargada -- nunca una lista vacía disfrazada de
    "no existe" (mismo criterio que `search_tracts`)."""
    row = db.execute(
        select(Tract, TractGeometry)
        .join(TractGeometry, TractGeometry.tract_id == Tract.id)
        .where(Tract.id == tract_id)
    ).first()
    if row is None:
        return None
    tract, geometry = row
    return build_tract_geometry_out(tract, geometry)
