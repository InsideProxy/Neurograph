"""Biblioteca NeuroGraph portátil (secciones 2 y 26 de la especificación).

Cada biblioteca de datos (típicamente un SSD externo) lleva en su raíz un
manifiesto `.neurograph_library.yaml` que la identifica de forma estable,
independiente de la ruta en la que esté montada: así se puede desconectar,
trasladar a otro ordenador y reconectar sin perder la identidad de los datos.

Los datos originales (original/) nunca se tocan. Los índices derivados son
reconstruibles a partir del manifiesto y del contenido de original/.
"""
from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import yaml

MANIFEST_FILENAME = ".neurograph_library.yaml"
INDEX_SCHEMA_VERSION = 1


@dataclass
class LibraryManifest:
    library_id: str
    created_at: str
    index_schema_version: int
    checksums: dict[str, str] = field(default_factory=dict)

    @classmethod
    def create(cls) -> "LibraryManifest":
        return cls(
            library_id=str(uuid.uuid4()),
            created_at=datetime.now(timezone.utc).isoformat(),
            index_schema_version=INDEX_SCHEMA_VERSION,
        )

    def to_yaml(self) -> str:
        return yaml.safe_dump(
            {
                "library_id": self.library_id,
                "created_at": self.created_at,
                "index_schema_version": self.index_schema_version,
                "checksums": self.checksums,
            },
            sort_keys=False,
        )

    @classmethod
    def from_yaml(cls, text: str) -> "LibraryManifest":
        raw = yaml.safe_load(text) or {}
        return cls(
            library_id=raw["library_id"],
            created_at=raw["created_at"],
            index_schema_version=raw.get("index_schema_version", INDEX_SCHEMA_VERSION),
            checksums=raw.get("checksums", {}),
        )


def manifest_path(library_root: Path) -> Path:
    return Path(library_root) / MANIFEST_FILENAME


def detect_library(library_root: Path) -> LibraryManifest | None:
    """Detecta si `library_root` es una biblioteca NeuroGraph. Devuelve
    el manifiesto si existe, o None si la ruta no es (todavía) una biblioteca.
    """
    path = manifest_path(library_root)
    if not path.exists():
        return None
    return LibraryManifest.from_yaml(path.read_text())


def initialize_library(library_root: Path) -> LibraryManifest:
    """Crea una biblioteca NeuroGraph nueva en `library_root` (estructura
    original/ + derived/ de la sección 3, y el manifiesto de la sección 26).
    No sobrescribe una biblioteca ya existente.
    """
    library_root = Path(library_root)
    existing = detect_library(library_root)
    if existing is not None:
        return existing

    for sub in (
        "original/atlases", "original/tractography", "original/imaging",
        "original/connectivity", "original/lesions", "original/literature",
        "original/datasets",
        "derived/parcellations", "derived/tractograms", "derived/connectomes",
        "derived/matrices", "derived/graphs", "derived/laplacians",
        "derived/spectral", "derived/embeddings", "derived/statistics",
    ):
        (library_root / sub).mkdir(parents=True, exist_ok=True)

    manifest = LibraryManifest.create()
    manifest_path(library_root).write_text(manifest.to_yaml())
    return manifest


def _sha256_of(file_path: Path) -> str:
    digest = hashlib.sha256()
    with open(file_path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_integrity(library_root: Path, sample_only: bool = True) -> list[str]:
    """Comprueba los checksums registrados en el manifiesto contra los
    archivos reales de `original/`. Devuelve la lista de rutas cuyo
    checksum no coincide (vacía si todo está intacto).

    `sample_only=True` limita la comprobación a los archivos ya registrados
    en el manifiesto, sin recalcular checksums de archivos nuevos todavía
    no indexados (eso es tarea de la indexación, no de la verificación).
    """
    manifest = detect_library(library_root)
    if manifest is None:
        raise FileNotFoundError(f"No es una biblioteca NeuroGraph: {library_root}")

    mismatches = []
    for relative_path, expected_checksum in manifest.checksums.items():
        full_path = Path(library_root) / "original" / relative_path
        if not full_path.exists():
            mismatches.append(relative_path)
            continue
        if _sha256_of(full_path) != expected_checksum:
            mismatches.append(relative_path)
    return mismatches
