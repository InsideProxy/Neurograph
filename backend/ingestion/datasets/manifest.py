"""Metadatos de datasets (sección 9): cada carpeta de dataset dentro de la
biblioteca lleva un `dataset.yaml` con su procedencia. Esto es lo que
permite reproducir un resultado (sección 4/23): saber de dónde vino cada
dato y, si es derivado, con qué algoritmo y parámetros se generó.
"""
from __future__ import annotations

import datetime as dt
from dataclasses import asdict, dataclass, field
from pathlib import Path

import yaml

MANIFEST_FILENAME = "dataset.yaml"


@dataclass
class DatasetManifest:
    id: str
    name: str
    source: str
    format: str
    date_added: dt.date
    species: str | None = None
    atlas: str | None = None
    version: str | None = None
    license: str | None = None
    checksum_sha256: str | None = None
    description: str | None = None
    # Presentes solo si el dataset es derivado (sección 3): de qué dataset
    # viene, con qué algoritmo/parámetros/versión de software.
    derived_from: str | None = None
    algorithm: str | None = None
    parameters: dict | None = None
    software_version: str | None = None

    @property
    def is_derived(self) -> bool:
        return self.derived_from is not None

    def to_yaml(self) -> str:
        data = asdict(self)
        data["date_added"] = self.date_added.isoformat()
        # omitir campos vacíos para que el archivo quede legible
        data = {k: v for k, v in data.items() if v is not None}
        return yaml.safe_dump(data, sort_keys=False, allow_unicode=True)

    @classmethod
    def from_yaml(cls, text: str) -> "DatasetManifest":
        raw = yaml.safe_load(text) or {}
        if isinstance(raw.get("date_added"), str):
            raw["date_added"] = dt.date.fromisoformat(raw["date_added"])
        return cls(**raw)


def manifest_path(dataset_dir: Path) -> Path:
    return Path(dataset_dir) / MANIFEST_FILENAME


def read_dataset_manifest(dataset_dir: Path) -> DatasetManifest | None:
    path = manifest_path(dataset_dir)
    if not path.exists():
        return None
    return DatasetManifest.from_yaml(path.read_text(encoding="utf-8"))


def write_dataset_manifest(dataset_dir: Path, manifest: DatasetManifest) -> None:
    dataset_dir = Path(dataset_dir)
    dataset_dir.mkdir(parents=True, exist_ok=True)
    manifest_path(dataset_dir).write_text(manifest.to_yaml(), encoding="utf-8")


def scan_library_datasets(library_root: Path) -> list[tuple[Path, DatasetManifest]]:
    """Recorre `original/` y `derived/` de una biblioteca (sección 3) y
    devuelve, para cada carpeta con `dataset.yaml`, su ruta y su manifiesto.
    No valida `original/` frente a `derived/`: quien llama decide qué hacer
    con cada uno (los originales nunca se reescriben; los derivados sí
    pueden regenerarse).
    """
    library_root = Path(library_root)
    found: list[tuple[Path, DatasetManifest]] = []
    for section in ("original", "derived"):
        section_dir = library_root / section
        if not section_dir.exists():
            continue
        for manifest_file in section_dir.rglob(MANIFEST_FILENAME):
            dataset_dir = manifest_file.parent
            manifest = read_dataset_manifest(dataset_dir)
            if manifest is not None:
                found.append((dataset_dir, manifest))
    return found
