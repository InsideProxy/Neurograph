"""Genera el SQL para dar de alta la sección de tractografía (petición
de la usuaria, 02/09/2026: "tractografía es una vista propia... ha de
tener su propia pestaña de interfaz, como la de homologías"): el
estudio (Zhang et al., 2018), el dataset del propio .zip descargado
por la usuaria (checksum real, formato, licencia), las 41 entidades
`Tract` con nombre anatómico real y su geometría real (streamlines
reducidas de forma determinista, recuento real y mostrado guardados
juntos -- migración 0012).

Uso:
    python scripts/generate_org_tractography_geometry.py \\
        E:\\NeuroData\\original\\tractography\\ORG-800FiberClusters.zip > salida.sql

No requiere conexión a la base de datos: solo imprime el SQL, que se
aplica siguiendo el patrón de `backend/database/migrations/README.md`
(docker cp + psql -f). Requiere la migración 0012
(tract_study_link_and_geometry). El SQL resultante es grande (~40MB:
12300 streamlines reales con su geometría 3D completa) -- normal para
`psql -f`, no es un error.

Reproducible: `pip install vtk` y ejecutar este script con la ruta real
del .zip como argumento -- `vtk` no está en las dependencias del
proyecto (pyproject.toml) porque, igual que `scikit-image`/`pygltflib`
en `scripts/generate_brain_meshes.py`, solo hace falta para este script
de un solo uso, nunca en tiempo de ejecución del backend.

Toda la lectura/decodificación real del .zip vive en
`backend.ingestion.tractography.org_atlas` (módulo puro, sin SQL); este
script solo añade el registro del `Dataset` (checksum del .zip real) y
serializa a SQL, mismo reparto de responsabilidades que
`scripts/register_yeh2022_tract_region.py`.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from backend.ingestion.tractography.org_atlas import (
    STUDY_ID,
    TRACT_NAMES,
    TractGeometryDefinition,
    read_org_atlas,
)

STUDY_NAME = (
    "Zhang F, Wu Y, Norton I, Rigolo L, Rathi Y, Makris N, O'Donnell LJ (2018). "
    "An anatomically curated fiber clustering white matter atlas for consistent "
    "white matter tract parcellation across the lifespan. NeuroImage, 179, 429-447."
)
STUDY_DOI = "10.1016/j.neuroimage.2018.06.027"
STUDY_YEAR = 2018

DATASET_ID = "dataset.human.org2018.fiber_clusters_800"
DATASET_NAME = (
    "ORG-800FC-100HCP Fiber Clustering White Matter Atlas "
    "(Zhang et al., 2018) -- SlicerDMRI/ORG-Atlases"
)
DATASET_FORMAT = (
    "ZIP: 800 archivos VTK PolyData (.vtp) de clusters de fibra (streamlines de "
    "hasta ~100 sujetos del HCP, agrupadas) + 42 archivos .mrml de agrupacion "
    "anatomica (41 tractos reales + FalsePositive)"
)
DATASET_LICENSE = (
    "3D Slicer Contribution and Software License Agreement v1.0 -- permite "
    "reuso/redistribucion/obra derivada con atribucion y cita de los articulos "
    "del atlas; solo uso de investigacion, sin uso clinico (verificado contra "
    "LICENSE.md de SlicerDMRI/ORG-Atlases, 02/09/2026)"
)


def _escape(value: str) -> str:
    return value.replace("'", "''")


def _sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _tracts_sql(tracts: list[TractGeometryDefinition]) -> list[str]:
    lines: list[str] = []

    lines.append(f"-- {len(tracts)} entidades Tract (ORG-800FC-100HCP, Zhang et al. 2018).")
    lines.append("INSERT INTO tracts (id, name, abbreviation, species_id, study_id) VALUES")
    tract_values = [
        f"  ('{t.id}', '{_escape(t.name)}', '{_escape(t.abbreviation)}', "
        f"'{t.species_id}', '{t.study_id}')"
        for t in tracts
    ]
    lines.append(",\n".join(tract_values))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "abbreviation = EXCLUDED.abbreviation, study_id = EXCLUDED.study_id;"
    )
    lines.append("")

    lines.append(
        f"-- Geometria real de {len(tracts)} tractos (streamlines reducidas de forma "
        "determinista -- ver streamline_count_real/_shown para el total sin reducir)."
    )
    lines.append(
        "INSERT INTO tract_geometries "
        "(tract_id, streamlines, streamline_count_real, streamline_count_shown, "
        "reference_space) VALUES"
    )
    geometry_values = [
        f"  ('{t.id}', '{_escape(json.dumps(t.streamlines))}'::jsonb, "
        f"{t.streamline_count_real}, {t.streamline_count_shown}, "
        f"'{_escape(t.reference_space)}')"
        for t in tracts
    ]
    lines.append(",\n".join(geometry_values))
    lines.append(
        "ON CONFLICT (tract_id) DO UPDATE SET\n"
        "  streamlines = EXCLUDED.streamlines,\n"
        "  streamline_count_real = EXCLUDED.streamline_count_real,\n"
        "  streamline_count_shown = EXCLUDED.streamline_count_shown,\n"
        "  reference_space = EXCLUDED.reference_space;"
    )
    lines.append("")

    return lines


def main(argv: list[str]) -> int:
    # Fuerza UTF-8 en stdout aunque se redirija a un archivo en Windows
    # -- mismo bug real que scripts/register_yeh2022_tract_region.py
    # (riesgo 17 de docs/analisis-arquitectura.md): sin esto, un
    # caracter fuera de cp1252 rompe luego "psql -f".
    sys.stdout.reconfigure(encoding="utf-8")
    if len(argv) != 1:
        print(__doc__, file=sys.stderr)
        return 1

    zip_path = Path(argv[0])
    if not zip_path.is_file():
        print(f"error: no existe el archivo {zip_path}", file=sys.stderr)
        return 1

    print(f"leyendo {zip_path} ...", file=sys.stderr)
    tracts = read_org_atlas(zip_path)

    if len(tracts) != len(TRACT_NAMES):
        print(
            f"aviso: se esperaban {len(TRACT_NAMES)} tractos, se generaron {len(tracts)}",
            file=sys.stderr,
        )
    total_real = sum(t.streamline_count_real for t in tracts)
    total_shown = sum(t.streamline_count_shown for t in tracts)
    print(
        f"tractos: {len(tracts)}, streamlines reales: {total_real}, "
        f"streamlines mostradas: {total_shown}",
        file=sys.stderr,
    )

    print("calculando checksum sha256 del .zip real ...", file=sys.stderr)
    checksum = _sha256_of(zip_path)

    lines: list[str] = []

    lines.append("-- Estudio: Zhang et al. (2018), NeuroImage -- atlas ORG-800FC-100HCP.")
    lines.append("-- Generado por scripts/generate_org_tractography_geometry.py.")
    lines.append(
        "INSERT INTO studies (id, name, doi, year) VALUES\n"
        f"  ('{STUDY_ID}', '{_escape(STUDY_NAME)}', '{STUDY_DOI}', {STUDY_YEAR})\n"
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, doi = EXCLUDED.doi, "
        "year = EXCLUDED.year;"
    )
    lines.append("")

    lines.append("-- Dataset: el .zip real descargado por la usuaria, enlazado al estudio.")
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

    lines.extend(_tracts_sql(tracts))

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
