"""Capa de servicio de comparación real entre dos especies (Fase 10,
sección 16, herramienta MCP `compare_species`).

Decisión de la usuaria, 31/08/2026 (presentado el hallazgo de qué datos
entre-especies existen de verdad antes de preguntar): "ambos combinados"
-- un resumen cuantitativo Y la lista de homologías compartidas, nunca
solo uno de los dos. El resumen cuantitativo tiene que ser honesto sobre
lo que hay realmente cargado: no existe ninguna `Connection` estructural
de chimpancé ni de macaco (solo humano, vía Brainnetome/HCP-MMP1.0), así
que "comparar topología" entre especies no es una pregunta que se pueda
responder con datos reales todavía. Lo que sí es real: cuántas regiones
tiene cargada cada especie, cuántas de ellas participan en alguna
homología con la otra especie, y la lista completa de esas homologías
(reutilizando íntegramente `homology_service`, nunca reimplementada).
"""
from __future__ import annotations

from collections import Counter
from typing import Protocol

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.api.services import homology_service
from backend.api.services.homology_service import HomologyMatch
from backend.database.models.entities import Region, Species


class SpeciesListItem(BaseModel):
    id: str
    name: str
    scientific_name: str
    # Total de regiones reales cargadas de esta especie (cualquier
    # atlas) -- mismo campo que `SpeciesSummary.region_count`, aquí sin
    # necesitar todavía un segundo species_id de comparación.
    region_count: int


class SpeciesSummary(BaseModel):
    id: str
    scientific_name: str
    # Total de regiones reales cargadas de esta especie (cualquier atlas),
    # nunca solo las que aparecen en alguna homología.
    region_count: int
    # Cuántas de esas regiones participan en al menos una homología real
    # con la OTRA especie de esta comparación -- nunca con cualquier
    # especie: es un dato específico de este par.
    regions_in_shared_homologies: int


class CompareSpeciesResult(BaseModel):
    species_a: SpeciesSummary
    species_b: SpeciesSummary
    homology_count: int
    # Recuento real por `status` (candidate_homology, confirmed_homology,
    # ...) -- nunca colapsado a un único número que oculte la
    # incertidumbre real de cada fila.
    homologies_by_status: dict[str, int]
    homologies: list[HomologyMatch]


class _SpeciesLike(Protocol):
    id: str
    scientific_name: str


def compute_species_comparison(
    species_a: _SpeciesLike,
    species_b: _SpeciesLike,
    region_count_a: int,
    region_count_b: int,
    all_homology_matches: list[HomologyMatch],
) -> CompareSpeciesResult:
    """Función pura (sin base de datos): filtra `all_homology_matches`
    (ya construidas por `homology_service.compute_homology_matches`, con
    la región y la especie real de cada extremo) a las que tocan
    EXACTAMENTE este par de especies -- en cualquier orden, porque cada
    fila `Homology` real solo registra un orden concreto de sus dos
    extremos, no ambos. Nunca deriva una homología nueva ni aproxima una
    comparación cuantitativa que los datos reales no dan (ver docstring
    del módulo)."""
    wanted = {species_a.id, species_b.id}
    filtered = [m for m in all_homology_matches if {m.source.species_id, m.target.species_id} == wanted]

    def _regions_of(species_id: str) -> set[str]:
        return {
            m.source.id if m.source.species_id == species_id else m.target.id
            for m in filtered
        }

    return CompareSpeciesResult(
        species_a=SpeciesSummary(
            id=species_a.id,
            scientific_name=species_a.scientific_name,
            region_count=region_count_a,
            regions_in_shared_homologies=len(_regions_of(species_a.id)),
        ),
        species_b=SpeciesSummary(
            id=species_b.id,
            scientific_name=species_b.scientific_name,
            region_count=region_count_b,
            regions_in_shared_homologies=len(_regions_of(species_b.id)),
        ),
        homology_count=len(filtered),
        homologies_by_status=dict(Counter(m.status for m in filtered)),
        homologies=filtered,
    )


def list_species(db: Session) -> list[SpeciesListItem]:
    """Todas las especies reales que tienen al menos una región cargada
    (nunca una especie sin ningún dato real todavía, que solo confundiría
    en un desplegable de selección -- p. ej. el frontend, panel de
    comparación entre especies, decisión 38, 01/09/2026). Ordenadas por
    nombre científico para que el desplegable salga siempre en el mismo
    orden, nunca dependiente del orden de inserción en la base de
    datos."""
    rows = db.execute(
        select(Species.id, Species.name, Species.scientific_name, func.count(Region.id))
        .join(Region, Region.species_id == Species.id)
        .group_by(Species.id, Species.name, Species.scientific_name)
        .order_by(Species.scientific_name)
    ).all()
    return [
        SpeciesListItem(id=row[0], name=row[1], scientific_name=row[2], region_count=row[3])
        for row in rows
    ]


def compare_species(db: Session, species_a_id: str, species_b_id: str) -> CompareSpeciesResult:
    """Consulta real detrás de `GET /species/compare` y de la herramienta
    MCP `compare_species`. Lanza `ValueError` si alguna de las dos
    especies no existe (nunca se compara silenciosamente contra una
    especie inventada) -- mismo criterio que `tract_definitions()`
    (decisión 15 de docs/analisis-arquitectura.md)."""
    species_rows = {
        s.id: s
        for s in db.execute(select(Species).where(Species.id.in_([species_a_id, species_b_id]))).scalars().all()
    }
    species_a = species_rows.get(species_a_id)
    species_b = species_rows.get(species_b_id)
    if species_a is None:
        raise ValueError(f"Especie no encontrada: {species_a_id!r}")
    if species_b is None:
        raise ValueError(f"Especie no encontrada: {species_b_id!r}")

    region_count_a = db.execute(
        select(func.count()).select_from(Region).where(Region.species_id == species_a_id)
    ).scalar_one()
    region_count_b = db.execute(
        select(func.count()).select_from(Region).where(Region.species_id == species_b_id)
    ).scalar_one()

    # Reutiliza íntegramente homology_service (nunca una segunda consulta
    # de homologías con su propia lógica de cita/región/especie): todas
    # las homologías reales, sin filtro, y el filtro al par de especies
    # se aplica aquí de forma pura sobre el resultado ya construido.
    all_matches = homology_service.find_homologues(db)

    return compute_species_comparison(species_a, species_b, region_count_a, region_count_b, all_matches)
