"""Genera el SQL para dar de alta el atlas Gordon 333 (solo corteza,
Gordon et al., 2016): sus 333 regiones corticales, sus 333 coordenadas
reales, sus 12 redes funcionales propias del atlas y la pertenencia
(determinista, no derivada por voto) de 286 de esas regiones a su red —
todo leído directamente del archivo real `Gordon333.32k_fs_LR.dlabel.nii`
más los mismos `.surf.gii` que HCP-MMP1.0.

Uso:
    python scripts/register_gordon333.py <dlabel.nii> <surf_L.gii> <surf_R.gii> > salida.sql

No requiere conexión a la base de datos: solo imprime el SQL, que se
aplica siguiendo el patrón de `backend/database/migrations/README.md`
(docker cp + psql -f). Requiere la migración 0003
(region_network_memberships) ya aplicada.
"""
from __future__ import annotations

import datetime as dt
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
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.neuroimaging.gordon333 import (
        ATLAS_ID,
        ATLAS_NAME,
        SPECIES_ID,
        read_gordon333_coordinates,
        read_gordon333_networks,
        read_gordon333_regions,
        region_network_memberships,
    )

    dlabel_path, surf_left_path, surf_right_path = (Path(a) for a in argv)
    regions = read_gordon333_regions(dlabel_path)
    coordinates = read_gordon333_coordinates(dlabel_path, surf_left_path, surf_right_path)
    networks = read_gordon333_networks(dlabel_path)
    memberships = region_network_memberships(dlabel_path)

    if len(regions) != 333:
        print(f"aviso: se esperaban 333 regiones, se leyeron {len(regions)}", file=sys.stderr)
    if len(networks) != 12:
        print(f"aviso: se esperaban 12 redes, se leyeron {len(networks)}", file=sys.stderr)
    print(
        f"aviso: {len(memberships)} de 333 regiones obtuvieron una red "
        "(el resto queda sin pertenencia: son las del grupo 'None')",
        file=sys.stderr,
    )

    now = dt.datetime.now(dt.timezone.utc).isoformat()

    lines = [
        "-- Alta del atlas Gordon 333 (Gordon et al., 2016, Cerebral Cortex,",
        "-- DOI 10.1093/cercor/bhu239) -- solo corteza: sus 333 regiones reales,",
        "-- sus 333 coordenadas, sus 12 redes propias del atlas y la pertenencia",
        "-- (determinista, confidence=1.0) de 286 regiones a su red. Las 19",
        "-- etiquetas subcorticales que declara el mismo archivo se excluyen",
        "-- a propósito: no tienen ningún dato real detrás (ver",
        "-- backend/ingestion/neuroimaging/gordon333.py). Generado por",
        "-- scripts/register_gordon333.py. Requiere la migración 0003",
        "-- (region_network_memberships) ya aplicada.",
        "",
        "INSERT INTO atlases (id, name, species_id, version) VALUES (",
        f"  '{ATLAS_ID}', '{_escape(ATLAS_NAME)}', '{SPECIES_ID}', NULL",
        ")",
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;",
        "",
        "INSERT INTO regions (id, name, abbreviation, species_id, atlas_id, synonyms, hemisphere) VALUES",
    ]
    region_value_lines = [
        f"  ('{r.id}', '{_escape(r.name)}', '{_escape(r.abbreviation)}', '{SPECIES_ID}', "
        f"'{ATLAS_ID}', ARRAY['{_escape(r.raw_label)}'], '{r.hemisphere}')"
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

    lines += ["", "INSERT INTO networks (id, name) VALUES"]
    network_value_lines = [f"  ('{n.id}', '{_escape(n.name)}')" for n in networks]
    lines.append(",\n".join(network_value_lines))
    lines.append("ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;")

    lines += [
        "",
        "INSERT INTO region_network_memberships "
        "(id, region_id, network_id, confidence, method, source_dataset_id, "
        "algorithm, created_at) VALUES",
    ]
    membership_value_lines = [
        f"  ('{m.id}', '{m.region_id}', '{m.network_id}', {m.confidence!r}, "
        f"'{_escape(m.method)}', 'dataset.human.hcp.s1200_groupavg_extracted', "
        f"'gordon_intrinsic_label', '{now}')"
        for m in memberships
    ]
    lines.append(",\n".join(membership_value_lines))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET network_id = EXCLUDED.network_id, "
        "confidence = EXCLUDED.confidence, method = EXCLUDED.method;"
    )

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
