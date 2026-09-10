"""Capa de servicio de homologías reales entre especies (Fase 10, sección
16, herramienta MCP `find_homologues`). Opera exclusivamente sobre filas
`Homology` ya cargadas (54 en este proyecto, todas de Cheng et al. 2021,
`status="candidate_homology"`, `confidence=None` -- decisión 29 de
`docs/analisis-arquitectura.md`): nunca deriva, aproxima ni completa una
homología que no esté ya registrada como tal.

Mismo patrón de separación pura/base de datos que el resto de
`backend/api/services/` (`compute_homology_matches` sin base de datos,
probada con dataclasses falsas; `find_homologues` solo añade la consulta
real) y mismo criterio de cita real que `connectivity_service.
build_tract_matches`: vacío cuando el dataset de origen no tiene estudio
enlazado, nunca una cita inventada.
"""
from __future__ import annotations

from typing import Protocol

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database.models.entities import Dataset, Homology, Region, Species, Study


class HomologyCitation(BaseModel):
    id: str
    name: str
    doi: str | None
    year: int | None


class HomologyRegion(BaseModel):
    id: str
    name: str
    species_id: str
    # Nombre científico real de la especie (p. ej. "Pan troglodytes"),
    # nunca el nombre común -- mismo dato que ya usa `Species.scientific_name`.
    species_scientific_name: str


class HomologyMatch(BaseModel):
    id: str
    # candidate_homology | confirmed_homology | analogy | similarity |
    # functional_correspondence | uncertain_correspondence (nunca
    # colapsado a una única categoría -- ver docstring de `Homology`).
    status: str
    # None cuando el estudio de origen no da ningún número que se pueda
    # usar honestamente (caso real de las 54 homologías de Cheng 2021,
    # decisión 29) -- nunca un valor inventado para rellenar el hueco.
    confidence: float | None
    method: str | None
    source: HomologyRegion
    target: HomologyRegion
    # Vacío si el dataset de origen no tiene estudio enlazado todavía,
    # nunca una cita inventada (mismo criterio que
    # `connectivity_service.InducedTract.studies`).
    studies: list[HomologyCitation]


class _HomologyLike(Protocol):
    id: str
    source_id: str
    target_id: str
    status: str
    confidence: float | None
    method: str | None
    source_dataset_id: str | None


class _RegionLike(Protocol):
    id: str
    name: str
    species_id: str


class _SpeciesLike(Protocol):
    id: str
    scientific_name: str


class _DatasetLike(Protocol):
    id: str
    study_id: str | None


class _StudyLike(Protocol):
    id: str
    name: str
    doi: str | None
    year: int | None


def _region_to_homology_region(region: _RegionLike, species_by_id: dict[str, _SpeciesLike]) -> HomologyRegion:
    species = species_by_id.get(region.species_id)
    return HomologyRegion(
        id=region.id,
        name=region.name,
        species_id=region.species_id,
        # No debería faltar (toda Region real tiene su Species real),
        # pero si falta, no se inventa un nombre científico.
        species_scientific_name=species.scientific_name if species is not None else "",
    )


def compute_homology_matches(
    homology_rows: list[_HomologyLike],
    regions_by_id: dict[str, _RegionLike],
    species_by_id: dict[str, _SpeciesLike],
    datasets_by_id: dict[str, _DatasetLike],
    studies_by_id: dict[str, _StudyLike],
) -> list[HomologyMatch]:
    """Traduce filas `Homology` reales a la forma de respuesta, con la
    región y la especie real de cada extremo y su cita real. Una fila
    cuyo `source_id`/`target_id` no resuelva a una `Region` cargada no
    debería pasar (viene de la propia tabla de homologías), pero si pasa,
    se descarta en vez de construir una entrada a medias (mismo criterio
    que `build_tract_matches`)."""
    matches: list[HomologyMatch] = []
    for row in sorted(homology_rows, key=lambda r: r.id):
        source_region = regions_by_id.get(row.source_id)
        target_region = regions_by_id.get(row.target_id)
        if source_region is None or target_region is None:
            continue
        dataset = datasets_by_id.get(row.source_dataset_id) if row.source_dataset_id else None
        study = studies_by_id.get(dataset.study_id) if dataset is not None and dataset.study_id else None
        studies = (
            [HomologyCitation(id=study.id, name=study.name, doi=study.doi, year=study.year)]
            if study is not None
            else []
        )
        matches.append(
            HomologyMatch(
                id=row.id,
                status=row.status,
                confidence=row.confidence,
                method=row.method,
                source=_region_to_homology_region(source_region, species_by_id),
                target=_region_to_homology_region(target_region, species_by_id),
                studies=studies,
            )
        )
    return matches


def find_homologues(db: Session, region_id: str | None = None, species_id: str | None = None) -> list[HomologyMatch]:
    """Consulta real detrás de `GET /homologies` y de la herramienta MCP
    `find_homologues`. Sin filtro, devuelve todas las homologías reales
    cargadas. `region_id` filtra a las que tocan esa región concreta (en
    cualquiera de los dos extremos); `species_id` filtra a las que tocan
    esa especie (en cualquiera de los dos extremos) -- igual que
    `search_tracts`, un filtro decide QUÉ homologías aparecen, nunca
    recorta lo que se cuenta de cada una."""
    homology_rows = list(db.execute(select(Homology)).scalars().all())
    if not homology_rows:
        return []

    touched_region_ids = sorted({r.source_id for r in homology_rows} | {r.target_id for r in homology_rows})
    regions_by_id = {
        r.id: r for r in db.execute(select(Region).where(Region.id.in_(touched_region_ids))).scalars().all()
    }
    species_ids = sorted({r.species_id for r in regions_by_id.values()})
    species_by_id = {
        s.id: s for s in db.execute(select(Species).where(Species.id.in_(species_ids))).scalars().all()
    }
    dataset_ids = sorted({r.source_dataset_id for r in homology_rows if r.source_dataset_id is not None})
    datasets_by_id = {
        d.id: d for d in db.execute(select(Dataset).where(Dataset.id.in_(dataset_ids))).scalars().all()
    }
    study_ids = sorted({d.study_id for d in datasets_by_id.values() if d.study_id is not None})
    studies_by_id = {
        s.id: s for s in db.execute(select(Study).where(Study.id.in_(study_ids))).scalars().all()
    }

    matches = compute_homology_matches(homology_rows, regions_by_id, species_by_id, datasets_by_id, studies_by_id)

    if region_id is not None:
        matches = [m for m in matches if region_id in (m.source.id, m.target.id)]
    if species_id is not None:
        matches = [m for m in matches if species_id in (m.source.species_id, m.target.species_id)]
    return matches
