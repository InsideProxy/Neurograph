"""Metadatos bibliográficos de un `Study` (sección 6, inicio de la Fase 6
-- Literatura, 30/08/2026).

Mismo patrón que `backend/ingestion/datasets/manifest.py` y
`backend/library/dataset_registration.py`: una función pura que genera el
SQL de alta/actualización, para que la usuaria lo revise y lo aplique
ella misma con `docker cp` + `psql -f` (ver
`backend/database/migrations/README.md`) -- nunca una conexión directa a
su base de datos real desde este entorno.

`studies.name` sigue siendo la cita completa que ya se usaba antes de
esta fase (p. ej. "Glasser MF, Coalson TS... Nature, 536(7615), 171-178",
ver decisiones 6 y 9 de `docs/analisis-arquitectura.md`); `authors`/
`journal`/`abstract` (migración 0009) son una descomposición estructurada
NUEVA, pensada para poder consultarse por separado (p. ej. "todos los
estudios de un autor") -- no sustituyen ni reconstruyen `name`, y los
cinco `Study` ya cargados los tienen `NULL` hasta que alguien los rellene
explícitamente, igual que el resto de columnas backfillables del
proyecto (`abbreviation`, `hemisphere`).

Ningún campo se adivina ni se copia de una base de datos de terceros sin
comprobar: `doi` debe verificarse contra la web del editor o el redirect
oficial de `doi.org` (mismo criterio ya aplicado en las decisiones 6 y
9), y `authors`/`journal`/`abstract` deberían verificarse igual (p. ej.
contra Crossref o la propia web del editor) antes de darse de alta -- eso
es trabajo de quien llama a `study_insert_sql`, no de este módulo.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class StudyMetadata:
    id: str
    name: str
    doi: str | None = None
    year: int | None = None
    # Tupla, no lista: StudyMetadata es inmutable (frozen=True) por
    # diseño -- una lista mutable rompería esa garantía.
    authors: tuple[str, ...] | None = None
    journal: str | None = None
    abstract: str | None = None

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("StudyMetadata.id no puede estar vacío")
        if not self.name:
            raise ValueError("StudyMetadata.name no puede estar vacío")


def _escape(value: str) -> str:
    return value.replace("'", "''")


def _sql_array(values: tuple[str, ...] | None) -> str:
    if not values:
        return "NULL"
    escaped = ", ".join(f"'{_escape(v)}'" for v in values)
    return f"ARRAY[{escaped}]"


def _sql_string_or_null(value: str | None) -> str:
    return "NULL" if value is None else f"'{_escape(value)}'"


def _sql_int_or_null(value: int | None) -> str:
    return "NULL" if value is None else str(value)


def study_insert_sql(study: StudyMetadata) -> str:
    """SQL de alta/actualización de un `Study` en la tabla `studies`,
    mismo patrón `INSERT ... ON CONFLICT (id) DO UPDATE` que el resto de
    scripts de registro del proyecto."""
    return (
        "INSERT INTO studies (id, name, doi, year, authors, journal, abstract) VALUES (\n"
        f"  '{_escape(study.id)}', '{_escape(study.name)}', "
        f"{_sql_string_or_null(study.doi)}, {_sql_int_or_null(study.year)},\n"
        f"  {_sql_array(study.authors)}, {_sql_string_or_null(study.journal)}, "
        f"{_sql_string_or_null(study.abstract)}\n"
        ")\n"
        "ON CONFLICT (id) DO UPDATE SET\n"
        "  name = EXCLUDED.name,\n"
        "  doi = EXCLUDED.doi,\n"
        "  year = EXCLUDED.year,\n"
        "  authors = EXCLUDED.authors,\n"
        "  journal = EXCLUDED.journal,\n"
        "  abstract = EXCLUDED.abstract;\n"
    )
