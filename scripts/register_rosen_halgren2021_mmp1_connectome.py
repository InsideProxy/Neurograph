"""Genera el SQL para dar de alta la conectividad región-región real de
Rosen & Halgren (2021) sobre HCP-MMP1.0: el estudio, el dataset (matriz de
grupo + tabla de correspondencia de índices, checksum combinado -- mismo
patrón que Yeh 2022), y las 64620 conexiones región-región (peso = 10 **
log10 Fpt publicado, ver docstring de
`backend.ingestion.connectivity.rosen_halgren2021_mmp1_connectome` para el
porqué de esa transformación).

Uso:
    python scripts/register_rosen_halgren2021_mmp1_connectome.py \\
        <averageConnectivity_Fpt.csv> <allTables.xlsx> > salida.sql

No requiere conexión a la base de datos: solo imprime el SQL, que se aplica
siguiendo el patrón de `backend/database/migrations/README.md` (docker cp +
psql -f). Requiere las 360 regiones de HCP-MMP1.0 ya dadas de alta
(decisión 6) -- no crea ninguna región nueva.

El SQL de las conexiones se divide en bloques de 5000 filas por sentencia
INSERT (64620 filas en total) para mantener cada sentencia individual en un
tamaño razonable de revisar, no por ninguna razón de la base de datos.
"""
from __future__ import annotations

import sys
from pathlib import Path

from backend.library.dataset_registration import combined_checksum
from backend.ontology.schema import EntityType, build_id

_CHUNK_SIZE = 5000

STUDY_ID = build_id(EntityType.STUDY, "human", "rosen-halgren2021", "rosen_halgren_2021")
STUDY_NAME = (
    "Rosen BQ, Halgren E (2021). A Whole-Cortex Probabilistic Diffusion "
    "Tractography Connectome. eNeuro, 8(1), ENEURO.0416-20.2020."
)
STUDY_DOI = "10.1523/ENEURO.0416-20.2020"
STUDY_YEAR = 2021

DATASET_ID = "dataset.human.rosen-halgren2021.mmp1_group_connectome"
DATASET_NAME = (
    "Whole-cortex probabilistic diffusion tractography connectome "
    "(Rosen & Halgren, 2021) -- matriz de grupo sobre HCP-MMP1.0"
)
DATASET_FORMAT = (
    "CSV matriz 360x360 (log10 Fpt, diagonal NaN, simetrica, sin umbral) + "
    "tabla Excel de correspondencia indice->parcela (allTables.xlsx, hojas "
    "'table 2' y 'figure 8-3')"
)
DATASET_LICENSE = (
    "Zenodo, DOI 10.5281/zenodo.4060485, licencia CC BY 4.0 (verificada "
    "directamente en el registro real de Zenodo, 01/09/2026)"
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


def _chunked(items: list, size: int):
    for start in range(0, len(items), size):
        yield items[start : start + size]


def main(argv: list[str]) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.connectivity.rosen_halgren2021_mmp1_connectome import (
        EXPECTED_CONNECTION_COUNT,
        read_connectivity_matrix,
        read_parcel_order,
        region_region_connections,
    )

    csv_path, xlsx_path = (Path(a) for a in argv)

    parcel_order = read_parcel_order(xlsx_path)
    matrix = read_connectivity_matrix(csv_path)
    connections = region_region_connections(parcel_order, matrix)

    if len(connections) != EXPECTED_CONNECTION_COUNT:
        print(
            f"aviso: se esperaban {EXPECTED_CONNECTION_COUNT} conexiones, "
            f"se generaron {len(connections)}",
            file=sys.stderr,
        )
    if len({c.id for c in connections}) != len(connections):
        print("aviso: hay ids de conexion duplicados", file=sys.stderr)
    print(f"conexiones: {len(connections)}", file=sys.stderr)

    file_hashes = {
        csv_path.name: _sha256_of(csv_path),
        xlsx_path.name: _sha256_of(xlsx_path),
    }
    checksum = combined_checksum(file_hashes)

    lines: list[str] = []

    lines.append("-- Estudio: Rosen & Halgren (2021), eNeuro.")
    lines.append("-- Generado por scripts/register_rosen_halgren2021_mmp1_connectome.py.")
    lines.append(
        "INSERT INTO studies (id, name, doi, year) VALUES\n"
        f"  ('{STUDY_ID}', '{_escape(STUDY_NAME)}', '{STUDY_DOI}', {STUDY_YEAR})\n"
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, doi = EXCLUDED.doi, "
        "year = EXCLUDED.year;"
    )
    lines.append("")

    lines.append(
        "-- Dataset: matriz de grupo + tabla de correspondencia de indices, "
        "enlazado al estudio."
    )
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

    lines.append(
        f"-- {len(connections)} conexiones region-region reales "
        "(peso = 10 ** log10 Fpt publicado, matriz de grupo simetrica sin "
        "umbral, ver docstring del modulo de ingesta para el detalle de la "
        "transformacion). Dividido en bloques de "
        f"{_CHUNK_SIZE} filas por sentencia."
    )
    from backend.ingestion.connectivity.rosen_halgren2021_mmp1_connectome import METHOD

    for chunk in _chunked(connections, _CHUNK_SIZE):
        lines.append(
            "INSERT INTO connections "
            "(id, source_id, target_id, type, evidence_level, weight, "
            "source_dataset_id, algorithm, created_at) VALUES"
        )
        values = [
            f"  ('{c.id}', '{c.source_id}', '{c.target_id}', 'structural', "
            f"'indirect', {c.weight!r}, '{DATASET_ID}', '{METHOD}', now())"
            for c in chunk
        ]
        lines.append(",\n".join(values))
        lines.append(
            "ON CONFLICT (id) DO UPDATE SET weight = EXCLUDED.weight, "
            "evidence_level = EXCLUDED.evidence_level;"
        )
        lines.append("")

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
