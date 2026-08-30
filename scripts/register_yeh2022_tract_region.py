"""Genera el SQL para dar de alta la conectividad tracto-región de Yeh
(2022): el estudio, el dataset (enlazado al estudio vía
`datasets.study_id`, migración 0006), las 52 entidades `Tract` (26
tractos x 2 hemisferios) y las 9360 conexiones tracto -> región,
reutilizando los `Region.id` ya existentes del atlas HCP-MMP1.0 (no se
crean regiones nuevas).

Uso:
    python scripts/register_yeh2022_tract_region.py \\
        <tract_to_region_connectome_MMP.xlsx> <abbreviation2.xlsx> > salida.sql

No requiere conexión a la base de datos: solo imprime el SQL, que se
aplica siguiendo el patrón de `backend/database/migrations/README.md`
(docker cp + psql -f). Requiere la migración 0006 (dataset_study_link)
y las 360 regiones de HCP-MMP1.0 ya dadas de alta.
"""
from __future__ import annotations

import sys
from pathlib import Path

from backend.library.dataset_registration import combined_checksum
from backend.ontology.schema import EntityType, build_id

SPECIES_ID = build_id(EntityType.SPECIES, "human", "ncbi-taxonomy", "9606")

STUDY_ID = build_id(EntityType.STUDY, "human", "yeh2022", "yeh_2022")
STUDY_NAME = (
    "Yeh FC (2022). Population-based tract-to-region connectome of the "
    "human brain and its hierarchical topology. Nature Communications, "
    "13, 4933."
)
STUDY_DOI = "10.1038/s41467-022-32595-4"
STUDY_YEAR = 2022

DATASET_ID = "dataset.human.yeh2022.tract_to_region_mmp"
DATASET_NAME = "Population-based tract-to-region connectome (Yeh, 2022) — parcelación HCP-MMP"
DATASET_FORMAT = (
    "Dos hojas de calculo Excel: matriz tracto-region (180 areas x 26 "
    "tractos x 2 hemisferios, probabilidad poblacional) y tabla de "
    "abreviaturas de tractos"
)
DATASET_LICENSE = (
    "Articulo de acceso abierto en Nature Communications (\"Open access\", "
    "(c) 2022 The Author(s)) -- version exacta de la licencia Creative "
    "Commons no verificada linea a linea en el articulo"
)


def _escape(value: str) -> str:
    return value.replace("'", "''")


def _sha256_of(path: Path) -> str:
    import hashlib

    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main(argv: list[str]) -> int:
    # Fuerza UTF-8 en stdout aunque se redirija a un archivo en Windows
    # (bug real, encontrado el 30/08/2026: sin esto, Python usa la
    # página de códigos del sistema -- cp1252 en el caso de la usuaria --
    # y un carácter como el guion largo "—" se escribe como un byte que
    # PostgreSQL luego rechaza con "invalid byte sequence for encoding
    # \"UTF8\": 0x97" al aplicar el SQL -- ver riesgo 17 de
    # docs/analisis-arquitectura.md). No depender de que quien ejecute el
    # script recuerde poner $env:PYTHONUTF8=1 antes.
    sys.stdout.reconfigure(encoding="utf-8")
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.connectivity.yeh2022_tract_region import (
        METHOD,
        read_tract_full_names,
        tract_definitions,
        tract_region_connections,
    )

    connectome_path, abbreviation_path = (Path(a) for a in argv)

    full_names = read_tract_full_names(abbreviation_path)
    tracts = tract_definitions(full_names)
    connections = tract_region_connections(connectome_path)

    if len(tracts) != 52:
        print(f"aviso: se esperaban 52 tractos, se generaron {len(tracts)}", file=sys.stderr)
    expected_connections = 180 * 26 * 2
    if len(connections) != expected_connections:
        print(
            f"aviso: se esperaban {expected_connections} conexiones, se generaron {len(connections)}",
            file=sys.stderr,
        )
    print(f"tractos: {len(tracts)}, conexiones: {len(connections)}", file=sys.stderr)

    file_hashes = {
        connectome_path.name: _sha256_of(connectome_path),
        abbreviation_path.name: _sha256_of(abbreviation_path),
    }
    checksum = combined_checksum(file_hashes)

    lines: list[str] = []

    lines.append("-- Estudio: Yeh (2022), Nature Communications.")
    lines.append("-- Generado por scripts/register_yeh2022_tract_region.py.")
    lines.append(
        "INSERT INTO studies (id, name, doi, year) VALUES\n"
        f"  ('{STUDY_ID}', '{_escape(STUDY_NAME)}', '{STUDY_DOI}', {STUDY_YEAR})\n"
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, doi = EXCLUDED.doi, "
        "year = EXCLUDED.year;"
    )
    lines.append("")

    lines.append("-- Dataset: matriz tracto-region + tabla de abreviaturas, enlazado al estudio.")
    lines.append(
        "INSERT INTO datasets (id, name, format, license, checksum_sha256, study_id, created_at)\n"
        "VALUES (\n"
        f"  '{DATASET_ID}', '{_escape(DATASET_NAME)}', '{_escape(DATASET_FORMAT)}',\n"
        f"  '{_escape(DATASET_LICENSE)}', '{checksum}', '{STUDY_ID}', now()\n"
        ")\n"
        "ON CONFLICT (id) DO UPDATE SET\n"
        "  name = EXCLUDED.name, format = EXCLUDED.format, license = EXCLUDED.license,\n"
        "  checksum_sha256 = EXCLUDED.checksum_sha256, study_id = EXCLUDED.study_id;"
    )
    lines.append("")

    lines.append("-- 52 entidades Tract (26 tractos x 2 hemisferios).")
    lines.append("INSERT INTO tracts (id, name, abbreviation, species_id) VALUES")
    tract_values = [
        f"  ('{t.id}', '{_escape(t.name)}', "
        f"'{_escape(f'{t.hemisphere}_{t.header_code}')}', '{SPECIES_ID}')"
        for t in tracts
    ]
    lines.append(",\n".join(tract_values))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "abbreviation = EXCLUDED.abbreviation;"
    )
    lines.append("")

    lines.append(
        "-- 9360 conexiones tracto -> region (probabilidad poblacional, sin umbral)."
    )
    lines.append(
        "INSERT INTO connections "
        "(id, source_id, target_id, type, evidence_level, weight, "
        "source_dataset_id, algorithm, created_at) VALUES"
    )
    conn_values = [
        f"  ('{c.id}', '{c.source_id}', '{c.target_id}', 'structural', 'indirect', "
        f"{c.weight!r}, '{DATASET_ID}', '{METHOD}', now())"
        for c in connections
    ]
    lines.append(",\n".join(conn_values))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET weight = EXCLUDED.weight, "
        "evidence_level = EXCLUDED.evidence_level;"
    )

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
