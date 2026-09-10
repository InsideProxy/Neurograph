"""Generación de SQL de alta a partir de un `FormatReadResult` ya
despachado (decisión 45, la segunda mitad de la dirección de diseño de
la decisión 17: "un protocolo de ingesta de nuevos repositorios asistido
por la IA del usuario").

Mismo criterio de siempre en todo el proyecto (`backend/database/
migrations/README.md`, todos los `scripts/register_*.py` ya existentes):
esto NUNCA se conecta a la base de datos real. Solo genera el mismo tipo
de sentencias `INSERT ... ON CONFLICT (id) DO UPDATE` que ya usan
`register_macaque_cortex_wang2017.py`, `register_yeh2022_tract_region.py`
y el resto -- idempotentes, revisables a ojo antes de aplicarse con
`docker cp` + `psql -f` (o `scripts/apply_sql.ps1`, decisión 41). Ninguna
automatización de esta pieza sustituye esa revisión humana.

Las cuatro familias de dataclasses de región/coordenada de
`backend/ingestion/neuroimaging/` (`MmpRegion`, `GordonRegion`,
`BrainnetomeRegion`, `HcpSubcorticalRegion` / sus `*Coordinate`
equivalentes) comparten, por diseño desde que se escribieron, exactamente
los mismos nombres de atributo que las columnas reales de `regions`/
`coordinates` (`id`, `name`, `abbreviation`, `hemisphere` / `id`,
`entity_id`, `x`, `y`, `z`, `reference_space`) -- por eso este módulo
puede generar su SQL con `getattr` genérico, sin necesitar un caso
especial por atlas.
"""
from __future__ import annotations

from dataclasses import dataclass

from backend.ingestion.datasets.formats import AtlasMetadata, FormatReadResult, get_format_adapter


@dataclass(frozen=True)
class StudyInfo:
    """Metadatos del estudio que define el atlas/dataset, cuando quien
    invoca la ingesta los tiene y quiere enlazarlos (`atlases.study_id`).
    Ninguno de los cuatro módulos de `neuroimaging/` declara esto como
    constante propia (a diferencia de `SPECIES_ID`/`ATLAS_ID`): a
    diferencia de esos, el DOI/autores/revista de un estudio no se puede
    verificar mecánicamente contra el propio archivo de datos -- tiene
    que aportarlo, ya verificado contra la fuente primaria (mismo
    criterio que todas las decisiones de citas de este proyecto), quien
    propone la ingesta. Por eso es opcional: sin `study`, el atlas se da
    de alta igualmente, solo que sin enlazar ningún estudio todavía.
    """

    id: str
    name: str
    doi: str | None = None
    year: int | None = None
    authors: list[str] | None = None
    journal: str | None = None
    abstract: str | None = None


def _escape(value: str) -> str:
    return value.replace("'", "''")


def _sql_str(value: str) -> str:
    return f"'{_escape(value)}'"


def _sql_str_or_null(value: str | None) -> str:
    return "NULL" if value is None else _sql_str(value)


def _sql_num_or_null(value: float | None) -> str:
    return "NULL" if value is None else repr(value)


def _sql_array(values: list[str]) -> str:
    return "ARRAY[" + ",".join(_sql_str(v) for v in values) + "]::text[]"


def _species_sql(meta: AtlasMetadata) -> str:
    return (
        "-- Especie (id/nombre/nombre científico: constantes reales del "
        "adaptador, decisión 44).\n"
        "INSERT INTO species (id, name, scientific_name) VALUES\n"
        f"  ({_sql_str(meta.species_id)}, {_sql_str(meta.species_name)}, "
        f"{_sql_str(meta.species_scientific_name)})\n"
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "scientific_name = EXCLUDED.scientific_name;"
    )


def _study_sql(study: StudyInfo) -> str:
    columns = ["id", "name"]
    values = [_sql_str(study.id), _sql_str(study.name)]
    updates = ["name = EXCLUDED.name"]
    if study.doi is not None:
        columns.append("doi")
        values.append(_sql_str(study.doi))
        updates.append("doi = EXCLUDED.doi")
    if study.year is not None:
        columns.append("year")
        values.append(str(int(study.year)))
        updates.append("year = EXCLUDED.year")
    if study.authors is not None:
        columns.append("authors")
        values.append(_sql_array(study.authors))
        updates.append("authors = EXCLUDED.authors")
    if study.journal is not None:
        columns.append("journal")
        values.append(_sql_str(study.journal))
        updates.append("journal = EXCLUDED.journal")
    if study.abstract is not None:
        columns.append("abstract")
        values.append(_sql_str(study.abstract))
        updates.append("abstract = EXCLUDED.abstract")
    return (
        "-- Estudio que define el atlas (aportado por quien propone la ingesta,\n"
        "-- verificado contra la fuente primaria antes de llegar aquí -- este\n"
        "-- módulo nunca comprueba un DOI por sí mismo).\n"
        f"INSERT INTO studies ({', '.join(columns)}) VALUES\n"
        f"  ({', '.join(values)})\n"
        f"ON CONFLICT (id) DO UPDATE SET {', '.join(updates)};"
    )


def _atlas_sql(meta: AtlasMetadata, study_id: str | None) -> str:
    # `study_id` usa COALESCE en el UPDATE: si esta ejecución no aporta
    # estudio (study=None), nunca borra un study_id que ya estuviera
    # guardado en la base de datos real de una ejecución anterior --
    # solo lo actualiza cuando esta ejecución sí trae uno.
    return (
        "-- Atlas, enlazado a la especie y (si se aportó) al estudio.\n"
        "INSERT INTO atlases (id, name, species_id, version, study_id) VALUES\n"
        f"  ({_sql_str(meta.atlas_id)}, {_sql_str(meta.atlas_name)}, "
        f"{_sql_str(meta.species_id)}, {_sql_str_or_null(meta.atlas_version)}, "
        f"{_sql_str_or_null(study_id)})\n"
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "version = EXCLUDED.version, "
        "study_id = COALESCE(EXCLUDED.study_id, atlases.study_id);"
    )


def _regions_sql(regions: list, species_id: str, atlas_id: str) -> str:
    rows = [
        f"  ({_sql_str(r.id)}, {_sql_str(r.name)}, {_sql_str(species_id)}, "
        f"{_sql_str(atlas_id)}, {_sql_str_or_null(getattr(r, 'abbreviation', None))}, "
        f"{_sql_str_or_null(getattr(r, 'hemisphere', None))})"
        for r in regions
    ]
    return (
        f"-- {len(regions)} regiones.\n"
        "INSERT INTO regions (id, name, species_id, atlas_id, abbreviation, hemisphere) VALUES\n"
        + ",\n".join(rows)
        + "\nON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "abbreviation = EXCLUDED.abbreviation, hemisphere = EXCLUDED.hemisphere;"
    )


def _coordinates_sql(coordinates: list) -> str:
    rows = [
        f"  ({_sql_str(c.id)}, {_sql_str(c.entity_id)}, {c.x!r}, {c.y!r}, {c.z!r}, "
        f"{_sql_str(c.reference_space)})"
        for c in coordinates
    ]
    return (
        f"-- {len(coordinates)} coordenadas.\n"
        "INSERT INTO coordinates (id, entity_id, x, y, z, reference_space) VALUES\n"
        + ",\n".join(rows)
        + "\nON CONFLICT (id) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, "
        "z = EXCLUDED.z, reference_space = EXCLUDED.reference_space;"
    )


def _networks_sql(networks: list) -> str:
    rows = [f"  ({_sql_str(n.id)}, {_sql_str(n.name)})" for n in networks]
    return (
        f"-- {len(networks)} redes propias del atlas.\n"
        "INSERT INTO networks (id, name) VALUES\n"
        + ",\n".join(rows)
        + "\nON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;"
    )


def _memberships_sql(memberships: list) -> str:
    rows = [
        f"  ({_sql_str(m.id)}, {_sql_str(m.region_id)}, {_sql_str(m.network_id)}, "
        f"{m.confidence!r}, {_sql_str(m.method)})"
        for m in memberships
    ]
    return (
        f"-- {len(memberships)} pertenencias región-red.\n"
        "INSERT INTO region_network_memberships (id, region_id, network_id, confidence, method) VALUES\n"
        + ",\n".join(rows)
        + "\nON CONFLICT (id) DO UPDATE SET confidence = EXCLUDED.confidence, "
        "method = EXCLUDED.method;"
    )


def generate_ingestion_sql(
    format_label: str,
    result: FormatReadResult,
    *,
    study: StudyInfo | None = None,
    header_comment: str | None = None,
) -> str:
    """Genera el SQL de alta completo para el resultado ya despachado de
    `format_label`. No valida de nuevo `result` contra el formato (eso ya
    lo hace `formats.read_dataset` al construirlo) -- solo lo traduce a
    SQL, exactamente con el mismo criterio de escapado/idempotencia que
    el resto de `scripts/register_*.py`.

    `study` es opcional (ver `StudyInfo`); si no se aporta, el atlas se
    da de alta sin `study_id` (o sin tocarlo, si ya tenía uno de una
    ejecución anterior -- ver `_atlas_sql`).
    """
    meta = get_format_adapter(format_label).atlas_metadata

    if not result.regions:
        raise ValueError("El resultado no tiene ninguna región: no hay nada que dar de alta")
    if not result.coordinates:
        raise ValueError("El resultado no tiene ninguna coordenada: no hay nada que dar de alta")

    blocks: list[str] = []
    if header_comment:
        blocks.append(f"-- {header_comment}")
    blocks.append(f"-- Formato: {format_label} (backend/ingestion/datasets/formats.py).")
    blocks.append(_species_sql(meta))
    if study is not None:
        blocks.append(_study_sql(study))
    blocks.append(_atlas_sql(meta, study.id if study is not None else None))
    blocks.append(_regions_sql(result.regions, meta.species_id, meta.atlas_id))
    blocks.append(_coordinates_sql(result.coordinates))
    if result.networks:
        blocks.append(_networks_sql(result.networks))
    if result.memberships:
        blocks.append(_memberships_sql(result.memberships))

    return "\n\n".join(blocks) + "\n"
