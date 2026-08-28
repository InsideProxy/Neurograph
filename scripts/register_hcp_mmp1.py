"""Genera el SQL para dar de alta el atlas HCP-MMP1.0 (Glasser et al.,
2016) en la base de datos: la especie (Homo sapiens), el atlas, sus 360
regiones corticales y sus 360 coordenadas representativas — todo leído
directamente de los archivos reales (.dlabel.nii + .surf.gii).

Uso:
    python scripts/register_hcp_mmp1.py <dlabel.nii> <surf_L.gii> <surf_R.gii> > salida.sql

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
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.neuroimaging.hcp_mmp1 import (
        ATLAS_ID,
        ATLAS_NAME,
        ATLAS_VERSION,
        SPECIES_ID,
        SPECIES_NAME,
        SPECIES_SCIENTIFIC_NAME,
        read_mmp1_coordinates,
        read_mmp1_regions,
    )

    dlabel_path, surf_left_path, surf_right_path = (Path(a) for a in argv)
    regions = read_mmp1_regions(dlabel_path)
    coordinates = read_mmp1_coordinates(dlabel_path, surf_left_path, surf_right_path)
    if len(regions) != 360:
        print(f"aviso: se esperaban 360 regiones, se leyeron {len(regions)}", file=sys.stderr)
    if len(coordinates) != 360:
        print(f"aviso: se esperaban 360 coordenadas, se leyeron {len(coordinates)}", file=sys.stderr)

    lines = [
        "-- Alta de HCP-MMP1.0 (Glasser et al., 2016, Nature) — especie, atlas,",
        "-- sus 360 regiones corticales y sus 360 coordenadas representativas.",
        "-- Generado por scripts/register_hcp_mmp1.py a partir de los archivos",
        "-- .dlabel.nii y .surf.gii reales (Fase 3).",
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

    region_value_lines = []
    for region in regions:
        synonyms = "ARRAY['" + _escape(region.raw_label) + "']"
        region_value_lines.append(
            f"  ('{region.id}', '{_escape(region.name)}', '{SPECIES_ID}', "
            f"'{ATLAS_ID}', {synonyms})"
        )
    lines.append(",\n".join(region_value_lines))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "atlas_id = EXCLUDED.atlas_id, synonyms = EXCLUDED.synonyms;"
    )

    lines += [
        "",
        "INSERT INTO coordinates (id, entity_id, x, y, z, reference_space) VALUES",
    ]
    coord_value_lines = []
    for coord in coordinates:
        coord_value_lines.append(
            f"  ('{coord.id}', '{coord.entity_id}', {coord.x!r}, {coord.y!r}, {coord.z!r}, "
            f"'{coord.reference_space}')"
        )
    lines.append(",\n".join(coord_value_lines))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z, "
        "reference_space = EXCLUDED.reference_space;"
    )

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
