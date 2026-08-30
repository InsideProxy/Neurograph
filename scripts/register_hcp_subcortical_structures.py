"""Genera el SQL para dar de alta el atlas de la segmentación
subcortical estándar de los grayordinates del HCP (Glasser et al.,
2013): sus 19 regiones (9 pares + tronco del encéfalo) y sus 19
coordenadas reales, calculadas a partir del eje espacial de cualquier
archivo CIFTI del paquete HCP S1200 Group Average.

Uso:
    python scripts/register_hcp_subcortical_structures.py <cualquier .dlabel.nii o .dscalar.nii del paquete> > salida.sql

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
    # Fuerza UTF-8 en stdout aunque se redirija a un archivo en Windows
    # (bug real, encontrado el 30/08/2026: sin esto, Python usa la
    # página de códigos del sistema -- cp1252 en el caso de la usuaria --
    # y un carácter como el guion largo "—" se escribe como un byte que
    # PostgreSQL luego rechaza con "invalid byte sequence for encoding
    # \"UTF8\": 0x97" al aplicar el SQL -- ver riesgo 17 de
    # docs/analisis-arquitectura.md). No depender de que quien ejecute el
    # script recuerde poner $env:PYTHONUTF8=1 antes.
    sys.stdout.reconfigure(encoding="utf-8")
    if len(argv) != 1:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.neuroimaging.hcp_subcortical_structures import (
        ATLAS_ID,
        ATLAS_NAME,
        SPECIES_ID,
        read_hcp_subcortical_coordinates,
        read_hcp_subcortical_regions,
    )

    cifti_path = Path(argv[0])
    regions = read_hcp_subcortical_regions()
    coordinates = read_hcp_subcortical_coordinates(cifti_path)

    if len(regions) != 19:
        print(f"aviso: se esperaban 19 regiones, se leyeron {len(regions)}", file=sys.stderr)
    if len(coordinates) != 19:
        print(f"aviso: se esperaban 19 coordenadas, se leyeron {len(coordinates)}", file=sys.stderr)

    lines = [
        "-- Alta del atlas de segmentación subcortical estándar de los",
        "-- grayordinates del HCP (Glasser et al., 2013, NeuroImage, DOI",
        "-- 10.1016/j.neuroimage.2013.04.127): 19 regiones (9 pares + tronco",
        "-- del encéfalo) y sus coordenadas reales. Generado por",
        "-- scripts/register_hcp_subcortical_structures.py.",
        "",
        "INSERT INTO atlases (id, name, species_id, version) VALUES (",
        f"  '{ATLAS_ID}', '{_escape(ATLAS_NAME)}', '{SPECIES_ID}', NULL",
        ")",
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;",
        "",
        "INSERT INTO regions (id, name, abbreviation, species_id, atlas_id, synonyms, hemisphere) VALUES",
    ]
    def _hemisphere_sql(hemisphere: str | None) -> str:
        # El tronco del encéfalo es la única estructura de este atlas sin
        # lateralidad real (`hemisphere is None`): NULL literal, nunca un
        # valor inventado como 'L' o "sin lateralidad".
        return "NULL" if hemisphere is None else f"'{hemisphere}'"

    region_value_lines = [
        f"  ('{r.id}', '{_escape(r.name)}', '{_escape(r.abbreviation)}', '{SPECIES_ID}', "
        f"'{ATLAS_ID}', ARRAY['{_escape(r.cifti_structure_name)}'], {_hemisphere_sql(r.hemisphere)})"
        for r in regions
    ]
    lines.append(",\n".join(region_value_lines))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "abbreviation = EXCLUDED.abbreviation, "
        "atlas_id = EXCLUDED.atlas_id, synonyms = EXCLUDED.synonyms, "
        "hemisphere = EXCLUDED.hemisphere;"
    )

    lines += ["", "INSERT INTO coordinates (id, entity_id, x, y, z, reference_space) VALUES"]
    coord_value_lines = [
        f"  ('{c.id}', '{c.entity_id}', {c.x!r}, {c.y!r}, {c.z!r}, '{c.reference_space}')"
        for c in coordinates
    ]
    lines.append(",\n".join(coord_value_lines))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z, "
        "reference_space = EXCLUDED.reference_space;"
    )

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
