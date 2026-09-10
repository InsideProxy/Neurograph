"""Metadatos de datasets (sección 9): cada carpeta de dataset dentro de la
biblioteca lleva un `dataset.yaml` con su procedencia. Esto es lo que
permite reproducir un resultado (sección 4/23): saber de dónde vino cada
dato y, si es derivado, con qué algoritmo y parámetros se generó.

`format` (decisión 44, ampliando la dirección de diseño de la decisión
17) ya NO es texto libre descriptivo: es una etiqueta controlada,
validada contra el catálogo cerrado de `backend/ingestion/datasets/
formats.py`, que además de identificar el formato permite despachar
automáticamente al lector real correspondiente. Ver ese módulo para el
porqué completo y para `UNSUPPORTED_FORMAT_LABEL`, el valor centinela
para catalogar un dataset real cuyo formato todavía no tiene lector.
"""
from __future__ import annotations

import datetime as dt
from dataclasses import asdict, dataclass
from pathlib import Path

import yaml

from backend.ingestion.datasets.formats import SUPPORTED_FORMATS, UNSUPPORTED_FORMAT_LABEL

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
    # Checksums por archivo (nombre -> sha256) para un dataset multi-archivo
    # sin un único contenedor (a diferencia de un .zip): es la entrada real
    # de `backend/library/dataset_registration.py::combined_checksum()`, que
    # calcula `checksum_sha256` a partir de este mismo mapa (concatenación
    # ordenada "nombre:sha256\n") -- nunca dos fuentes de verdad
    # independientes para el mismo dato. Descubierto como campo real y ya
    # usado (no propuesto aquí) al corregir la regresión de la decisión 45:
    # cuatro de los seis `dataset.yaml` reales ya existentes lo traían, y
    # `DatasetManifest` no lo declaraba -- `from_yaml()` fallaba con
    # `TypeError` para los cuatro antes de añadir este campo.
    checksums: dict[str, str] | None = None
    description: str | None = None
    # Mapa rol -> ruta relativa DENTRO de esta carpeta de dataset, para
    # los roles que declara `FormatAdapter.required_files` del formato
    # de esta fila (decisión 45/46) -- p. ej. {"dlabel": "Gordon333.32k_fs_
    # LR.dlabel.nii", "surf_left": "S1200.L.midthickness_MSMAll.32k_fs_
    # LR.surf.gii", ...}. Opcional a propósito: un manifiesto puede
    # describir un dataset sin tener todavía organizados sus archivos por
    # rol. `scripts/register_from_manifest.py`/`propose_dataset_ingestion`
    # son quienes exigen y validan que estén todos los roles del formato
    # antes de despachar -- nunca este dataclass, que solo describe.
    files: dict[str, str] | None = None
    # Presentes solo si el dataset es derivado (sección 3): de qué dataset
    # viene, con qué algoritmo/parámetros/versión de software.
    # `str | list[str]`, nunca solo `str` (bug real, decisión 45/49):
    # `derived/extracted/hcp_s1200_groupavg/dataset.yaml` real usa una
    # sola cadena (una fuente), pero `derived/meshes/dataset.yaml` real
    # usa una lista de dos cadenas (dos fuentes, una por malla) -- las
    # dos formas ya existen en la biblioteca real de la usuaria, YAML
    # las carga tal cual (list o str), y forzar aquí un único tipo
    # perdería o rompería una de las dos sin ninguna necesidad real:
    # ambas se serializan y leen sin transformación en `to_yaml`/
    # `from_yaml` (`yaml.safe_dump`/`safe_load` ya soportan las dos).
    derived_from: str | list[str] | None = None
    algorithm: str | None = None
    parameters: dict | None = None
    software_version: str | None = None

    def __post_init__(self) -> None:
        # Nunca se acepta un valor de `format` que no sea uno de los ya
        # soportados (con lector real) o el centinela explícito de "sin
        # lector todavía" -- aceptar cualquier texto sería volver a la
        # descripción libre que esta decisión elimina precisamente porque
        # ya no basta con que una persona la entienda: el programa la usa
        # para decidir qué código ejecutar.
        if self.format not in SUPPORTED_FORMATS and self.format != UNSUPPORTED_FORMAT_LABEL:
            known = ", ".join(sorted(SUPPORTED_FORMATS))
            raise ValueError(
                f"Formato de dataset no soportado: {self.format!r}. "
                f"Formatos con lector real ya integrado: {known}. "
                f"Si es un dataset real cuyo formato no tiene lector "
                f"todavía, usa format={UNSUPPORTED_FORMAT_LABEL!r} y "
                f"describe el formato real en `description`."
            )

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
    def from_yaml(cls, text: str) -> DatasetManifest:
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
