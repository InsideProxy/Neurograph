"""Genera el SQL para dar de alta el atlas Brainnetome (Fan et al., 2016):
la especie (Homo sapiens, reutilizando el mismo id que HCP-MMP1.0), el
atlas, sus 246 regiones y sus 246 coordenadas representativas — todo
leído de los archivos reales (.nii.gz + .xlsx).

Uso:
    python scripts/register_brainnetome_atlas.py <BN_Atlas_246_2mm.nii.gz> <BNA_subregions.xlsx> > salida.sql

No requiere conexión a la base de datos: solo imprime el SQL.
"""
from __future__ import annotations

import sys
from pathlib import Path


def _escape(value: str) -> str:
    return value.replace("'", "''")


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.neuroimaging.brainnetome import (
        ATLAS_ID,
        ATLAS_NAME,
        SPECIES_ID,
        SPECIES_NAME,
        SPECIES_SCIENTIFIC_NAME,
        read_brainnetome_coordinates,
        read_brainnetome_regions,
    )

    atlas_nii_path, xlsx_path = (Path(a) for a in argv)
    regions = read_brainnetome_regions(xlsx_path)
    coordinates = read_brainnetome_coordinates(atlas_nii_path, xlsx_path)
    if len(regions) != 246:
        print(f"aviso: se esperaban 246 regiones, se leyeron {len(regions)}", file=sys.stderr)
    if len(coordinates) != 246:
        print(f"aviso: se esperaban 246 coordenadas, se leyeron {len(coordinates)}", file=sys.stderr)

    lines = [
        "-- Alta de Brainnetome Atlas (Fan et al., 2016, Cerebral Cortex) --",
        "-- especie, atlas, sus 246 regiones y sus 246 coordenadas",
        "-- representativas. Generado por scripts/register_brainnetome_atlas.py",
        "-- a partir de los archivos .nii.gz/.xlsx reales (Fase 3/4).",
        "-- Requiere dataset.human.brainnetome.bna_246 ya registrado",
        "-- (register_dataset_brainnetome.sql).",
        "",
        "INSERT INTO species (id, name, scientific_name) VALUES (",
        f"  '{SPECIES_ID}', '{_escape(SPECIES_NAME)}', '{_escape(SPECIES_SCIENTIFIC_NAME)}'",
        ")",
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "scientific_name = EXCLUDED.scientific_name;",
        "",
        "INSERT INTO atlases (id, name, species_id, version) VALUES (",
        f"  '{ATLAS_ID}', '{_escape(ATLAS_NAME)}', '{SPECIES_ID}', NULL",
        ")",
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, version = EXCLUDED.version;",
        "",
        "INSERT INTO regions (id, name, species_id, atlas_id, synonyms) VALUES",
    ]

    region_value_lines = []
    for region in regions:
        synonyms = (
            "ARRAY['" + _escape(region.raw_bilateral_code) + "', "
            "'BN_" + str(region.label_id) + "']"
        )
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
