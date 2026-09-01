"""Genera el SQL para dar de alta el Macaque Cortex Atlas LR160 (Wang et
al. 2017): la especie `Macaca mulatta` (primera especie no humana del
proyecto), el estudio, el atlas y sus 160 regiones (80 x 2 hemisferios) con
coordenada real en espacio INIA19 -- ver el docstring de
`backend.ingestion.neuroimaging.macaque_cortex_wang2017` para la
verificación completa del espacio de referencia y de la Tabla 1 transcrita.

Uso:
    python scripts/register_macaque_cortex_wang2017.py \\
        <Macaque_Cortex_Atlas_LR160_for_download.nii> > salida.sql

No requiere conexión a la base de datos: solo imprime el SQL, que se
aplica siguiendo el patrón de `backend/database/migrations/README.md`
(docker cp + psql -f). No depende de ninguna migración nueva: usa
únicamente las tablas `species`, `studies`, `atlases`, `regions` y
`coordinates` ya existentes desde la migración 0001 (`Region`/`Coordinate`
no tienen columnas de procedencia -- `ProvenanceMixin` -- así que, a
diferencia de `register_yeh2022_tract_region.py`, este script no crea
ninguna fila en `datasets`; mismo criterio ya aplicado a Brainnetome y
HCP-MMP1.0, que tampoco tienen `Dataset` asociado).
"""
from __future__ import annotations

import sys
from pathlib import Path


def _escape(value: str) -> str:
    return value.replace("'", "''")


def _sql_array(values: list[str]) -> str:
    return "ARRAY[" + ",".join(f"'{_escape(v)}'" for v in values) + "]::text[]"


def main(argv: list[str]) -> int:
    # Fuerza UTF-8 en stdout (ver comentario idéntico en
    # register_yeh2022_tract_region.py -- riesgo 17 de
    # docs/analisis-arquitectura.md).
    sys.stdout.reconfigure(encoding="utf-8")
    if len(argv) != 1:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.neuroimaging.macaque_cortex_wang2017 import (
        ATLAS_ID,
        ATLAS_NAME,
        ATLAS_VERSION,
        SPECIES_ID,
        SPECIES_NAME,
        SPECIES_SCIENTIFIC_NAME,
        read_macaque_coordinates,
        regions_from_definitions,
    )

    atlas_nii_path = Path(argv[0])

    regions = regions_from_definitions()
    coordinates = read_macaque_coordinates(atlas_nii_path)

    if len(regions) != 160:
        print(f"aviso: se esperaban 160 regiones, se generaron {len(regions)}", file=sys.stderr)
    if len(coordinates) != 160:
        print(
            f"aviso: se esperaban 160 coordenadas, se generaron {len(coordinates)}",
            file=sys.stderr,
        )
    print(f"regiones: {len(regions)}, coordenadas: {len(coordinates)}", file=sys.stderr)

    # Estudio: DOI y metadatos verificados contra Crossref el 31/08/2026
    # (10.1007/s10548-017-0576-9): 7 autores, Brain Topography, vol 31(2),
    # pp 161-173. Año: 2017 es el de publicación en línea (coincide con la
    # cita habitual "Wang et al. 2017" y con el propio nombre del paquete
    # de descarga); la versión impresa es de 2018 -- se documenta en el
    # propio nombre del estudio para no perder ese dato, sin inventar un
    # segundo campo `year` que el modelo no tiene.
    study_id = "study.macaque.wang2017.wang_2017"
    study_name = (
        "Wang J, Zuo Z, Xie S, Miao Y, Ma Y, Zhao X, Jiang T (2017, en línea; "
        "2018, impreso). Parcellation of Macaque Cortex with Anatomical "
        "Connectivity Profiles. Brain Topography, 31(2), 161-173."
    )
    study_doi = "10.1007/s10548-017-0576-9"
    study_year = 2017
    study_authors = [
        "Jiaojian Wang", "Zhentao Zuo", "Sangma Xie", "Yifan Miao",
        "Yuanye Ma", "Xudong Zhao", "Tianzi Jiang",
    ]
    study_journal = "Brain Topography"
    study_abstract = (
        "The macaque model has been widely used to investigate the brain "
        "mechanisms of specific cognitive functions and psychiatric "
        "disorders. However, a detailed functional architecture map of the "
        "macaque cortex in vivo is still lacking. Here, we aimed to "
        "construct a new macaque cortex atlas based on its anatomical "
        "connectivity profiles using in vivo diffusion MRI. First, we "
        "defined the macaque cortical seed areas using the NeuroMaps "
        "atlas. Then, we applied the anatomical connectivity "
        "patterns-based parcellation approach to parcellate the macaque "
        "cortex into 80 subareas in each hemisphere, which were "
        "approximately symmetric between the two hemispheres. In each "
        "hemisphere, we identified 14 subareas in the frontal cortex, 9 "
        "subareas in the somatosensory cortex, 13 subareas in the parietal "
        "cortex, 16 subareas in the temporal cortex, 16 subareas in the "
        "occipital cortex, and 12 subareas in the limbic system. Finally, "
        "the graph-based network analyses of the anatomical network based "
        "on newly constructed macaque cortex atlas identified seven hub "
        "areas including bilateral ventral premotor cortex, bilateral "
        "superior parietal lobule, right medial precentral gyrus, and "
        "right precuneus. This newly constructed macaque cortex atlas may "
        "facilitate studies of the structure and functions of the macaque "
        "brain in the future."
    )

    lines: list[str] = []

    lines.append(
        "-- Especie: Macaca mulatta (macaco rhesus), NCBI Taxonomy 9544 -- "
        "primera especie no humana del proyecto (Fase 7)."
    )
    lines.append("-- Generado por scripts/register_macaque_cortex_wang2017.py.")
    lines.append(
        "INSERT INTO species (id, name, scientific_name) VALUES\n"
        f"  ('{SPECIES_ID}', '{_escape(SPECIES_NAME)}', '{_escape(SPECIES_SCIENTIFIC_NAME)}')\n"
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "scientific_name = EXCLUDED.scientific_name;"
    )
    lines.append("")

    lines.append("-- Estudio: Wang et al. (2017), Brain Topography.")
    lines.append(
        "INSERT INTO studies (id, name, doi, year, authors, journal, abstract) VALUES\n"
        f"  ('{study_id}', '{_escape(study_name)}', '{study_doi}', {study_year},\n"
        f"   {_sql_array(study_authors)}, '{_escape(study_journal)}', "
        f"'{_escape(study_abstract)}')\n"
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, doi = EXCLUDED.doi, "
        "year = EXCLUDED.year, authors = EXCLUDED.authors, journal = EXCLUDED.journal, "
        "abstract = EXCLUDED.abstract;"
    )
    lines.append("")

    lines.append("-- Atlas: Macaque Cortex Atlas LR160, enlazado al estudio y a la especie.")
    lines.append(
        "INSERT INTO atlases (id, name, species_id, version, study_id) VALUES\n"
        f"  ('{ATLAS_ID}', '{_escape(ATLAS_NAME)}', '{SPECIES_ID}', "
        f"'{ATLAS_VERSION}', '{study_id}')\n"
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "version = EXCLUDED.version, study_id = EXCLUDED.study_id;"
    )
    lines.append("")

    lines.append("-- 160 regiones (80 areas x 2 hemisferios, Tabla 1 del articulo).")
    lines.append(
        "INSERT INTO regions (id, name, species_id, atlas_id, abbreviation, hemisphere) VALUES"
    )
    region_values = [
        f"  ('{r.id}', '{_escape(r.name)}', '{SPECIES_ID}', '{ATLAS_ID}', "
        f"'{_escape(r.abbreviation)}', '{r.hemisphere}')"
        for r in regions
    ]
    lines.append(",\n".join(region_values))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "abbreviation = EXCLUDED.abbreviation, hemisphere = EXCLUDED.hemisphere;"
    )
    lines.append("")

    lines.append("-- 160 coordenadas (voxel real mas cercano al centroide, espacio INIA19).")
    lines.append("INSERT INTO coordinates (id, entity_id, x, y, z, reference_space) VALUES")
    coord_values = [
        f"  ('{c.id}', '{c.entity_id}', {c.x!r}, {c.y!r}, {c.z!r}, '{c.reference_space}')"
        for c in coordinates
    ]
    lines.append(",\n".join(coord_values))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z, "
        "reference_space = EXCLUDED.reference_space;"
    )

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
