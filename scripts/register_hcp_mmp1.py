"""Genera el SQL para dar de alta el atlas HCP-MMP1.0 (Glasser et al.,
2016) en la base de datos: la especie (Homo sapiens), el atlas y sus 360
regiones corticales, leídas directamente del archivo `.dlabel.nii` real.

Uso:
    python scripts/register_hcp_mmp1.py <ruta_al_dlabel.nii> > salida.sql

No requiere conexión a la base de datos: solo imprime el SQL, que se
aplica siguiendo el patrón de `backend/database/migrations/README.md`
(docker cp + psql -f).
"""
from __future__ import annotations

import sys
from pathlib import Path


def _escape(value: str) -> str:
    return value.replace("'", "''")


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.neuroimaging.hcp_mmp1 import (
        ATLAS_ID,
        ATLAS_NAME,
        ATLAS_VERSION,
        SPECIES_ID,
        SPECIES_NAME,
        SPECIES_SCIENTIFIC_NAME,
        read_mmp1_regions,
    )

    dlabel_path = Path(argv[0])
    regions = read_mmp1_regions(dlabel_path)
    if len(regions) != 360:
        print(f"aviso: se esperaban 360 regiones, se leyeron {len(regions)}", file=sys.stderr)

    lines = [
        "-- Alta de HCP-MMP1.0 (Glasser et al., 2016, Nature) — especie, atlas",
        "-- y sus 360 regiones corticales. Generado por scripts/register_hcp_mmp1.py",
        "-- a partir del archivo .dlabel.nii real (Fase 3).",
        "",
        "INSERT INTO species (id, name, scientific_name) VALUES (",
        f"  '{SPECIES_ID}', '{_escape(SPECIES_NAME)}', '{_escape(SPECIES_SCIENTIFIC_NAME)}'",
        ")",
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "scientific_name = EXCLUDED.scientific_name;",
        "",
        "INSERT INTO atlases (id, name, species_id, version) VALUES (",
        f"  '{ATLAS_ID}', '{_escape(ATLAS_NAME)}', '{SPECIES_ID}', '{ATLAS_VERSION}'",
        ")",
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, version = EXCLUDED.version;",
        "",
        "INSERT INTO regions (id, name, species_id, atlas_id, synonyms) VALUES",
    ]

    value_lines = []
    for region in regions:
        synonyms = "ARRAY['" + _escape(region.raw_label) + "']"
        value_lines.append(
            f"  ('{region.id}', '{_escape(region.name)}', '{SPECIES_ID}', "
            f"'{ATLAS_ID}', {synonyms})"
        )
    lines.append(",\n".join(value_lines))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "atlas_id = EXCLUDED.atlas_id, synonyms = EXCLUDED.synonyms;"
    )

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
