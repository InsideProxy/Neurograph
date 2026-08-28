"""HCP-MMP1.0 (Glasser et al., 2016, Nature, "A multi-modal parcellation
of human cerebral cortex"): parcelación de la corteza humana en 360 áreas
(180 por hemisferio), distribuida por el HCP dentro del paquete S1200
Group Average. Traduce sus etiquetas CIFTI a entidades de la ontología de
NeuroGraph (sección 6): un `Species`, un `Atlas` y 360 `Region`.

Cada hemisferio es una entidad `Region` propia (no una sola región con un
atributo de lado): son estructuras físicamente distintas. Si algún día
hace falta relacionar V1 izquierda con V1 derecha como homólogas, eso es
trabajo de la entidad `Homology` (Fase 7), no de fusionarlas aquí.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from backend.ingestion.neuroimaging.cifti_labels import CiftiLabel, read_cifti_labels
from backend.ontology.schema import EntityType, build_id

# Homo sapiens, NCBI Taxonomy ID 9606 (identificador estable y verificable,
# no un nombre de texto libre).
SPECIES_ID = build_id(EntityType.SPECIES, "human", "ncbi-taxonomy", "9606")
SPECIES_NAME = "Ser humano"
SPECIES_SCIENTIFIC_NAME = "Homo sapiens"

ATLAS_ID = build_id(EntityType.ATLAS, "human", "hcp", "mmp1_0")
ATLAS_NAME = "HCP Multi-Modal Parcellation 1.0 (Glasser et al., 2016, Nature)"
ATLAS_VERSION = "1.0"

_HEMISPHERE_NAMES = {"L": "izquierdo", "R": "derecho"}
_BACKGROUND_LABEL = "???"


@dataclass(frozen=True)
class MmpRegion:
    id: str
    name: str
    raw_label: str
    hemisphere: str  # "L" o "R"


def regions_from_labels(labels: list[CiftiLabel]) -> list[MmpRegion]:
    """Convierte las etiquetas CIFTI crudas de HCP-MMP1.0 (p. ej.
    `R_V1_ROI`) en entidades `Region` de la ontología. Excluye la
    etiqueta de fondo. Lanza `ValueError` ante cualquier etiqueta que no
    sigan el formato `<hemisferio>_<area>_ROI` esperado, en vez de
    ignorarla silenciosamente (sección 24: nunca "redondear" sobre datos
    que no encajan en el modelo).
    """
    regions: list[MmpRegion] = []
    for label in labels:
        if label.name == _BACKGROUND_LABEL:
            continue
        hemisphere, sep, rest = label.name.partition("_")
        if not sep or hemisphere not in _HEMISPHERE_NAMES or not rest.endswith("_ROI"):
            raise ValueError(f"Etiqueta HCP-MMP1.0 con formato inesperado: {label.name!r}")
        area_code = rest[: -len("_ROI")]
        local_code = f"{hemisphere}_{area_code}"
        region_id = build_id(EntityType.REGION, "human", "hcp-mmp1", local_code)
        name = f"{area_code} (hemisferio {_HEMISPHERE_NAMES[hemisphere]})"
        regions.append(
            MmpRegion(id=region_id, name=name, raw_label=label.name, hemisphere=hemisphere)
        )
    return regions


def read_mmp1_regions(dlabel_path: Path) -> list[MmpRegion]:
    """Lee y convierte las 360 áreas corticales directamente desde el
    archivo `.dlabel.nii` real."""
    return regions_from_labels(read_cifti_labels(dlabel_path))
