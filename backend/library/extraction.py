"""Descompresión de datasets originales (sección 3): cuando el dato
original es un archivo comprimido, las herramientas de neuroimagen
necesitan los archivos sueltos para leerlos. La copia descomprimida es
un dato *derivado* como cualquier otro: 100% regenerable a partir del
original con la misma herramienta, y con su propia procedencia
(`derived_from`, `algorithm`) en vez de fingir que es un dato de nuevo.
El original comprimido nunca se modifica ni se borra.
"""
from __future__ import annotations

import datetime as dt
import zipfile
from pathlib import Path

from backend.ingestion.datasets.manifest import DatasetManifest, write_dataset_manifest
from backend.ontology.schema import EntityType, build_id, parse_id


def extracted_dataset_id(source_id: str) -> str:
    """Id del dataset derivado-por-descompresión de `source_id`, siguiendo
    el mismo esquema `<tipo>.<especie>.<fuente>.<codigo_local>` (no una
    concatenación de texto libre)."""
    parts = parse_id(source_id)
    return build_id(
        EntityType.DATASET, parts["species"], parts["source"],
        f"{parts['local_code']}_extracted",
    )


def extract_zip_dataset(
    zip_path: Path, target_dir: Path, source_manifest: DatasetManifest
) -> DatasetManifest:
    """Descomprime `zip_path` (un dataset original en zip) en `target_dir`
    y escribe ahí su propio `dataset.yaml`, enlazado como derivado del
    dataset de origen. No modifica `zip_path`. No sobrescribe si
    `target_dir` ya tiene un dataset.yaml (evita descomprimir dos veces).
    """
    zip_path = Path(zip_path)
    target_dir = Path(target_dir)

    from backend.ingestion.datasets.manifest import read_dataset_manifest
    existing = read_dataset_manifest(target_dir)
    if existing is not None:
        return existing

    target_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(target_dir)

    derived = DatasetManifest(
        id=extracted_dataset_id(source_manifest.id),
        name=f"{source_manifest.name} (descomprimido)",
        source=source_manifest.source,
        format=source_manifest.format,
        date_added=dt.date.today(),
        species=source_manifest.species,
        version=source_manifest.version,
        license=source_manifest.license,
        description=(
            f"Copia descomprimida de '{source_manifest.id}', regenerable en "
            "cualquier momento a partir del zip original. No añade ni cambia "
            "ningún dato: existe para que las herramientas de neuroimagen "
            "puedan leer los archivos directamente, sin pasar por el zip."
        ),
        derived_from=source_manifest.id,
        algorithm="descompresión (zipfile.extractall, biblioteca estándar de Python)",
        software_version="python3-zipfile",
    )
    write_dataset_manifest(target_dir, derived)
    return derived
