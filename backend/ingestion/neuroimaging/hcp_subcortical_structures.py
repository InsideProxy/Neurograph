"""Segmentación subcortical estándar del espacio de "grayordinates" del
HCP (Glasser et al., 2013, NeuroImage, "The minimal preprocessing
pipelines for the Human Connectome Project", DOI
10.1016/j.neuroimage.2013.04.127): 19 estructuras — 9 pares bilaterales
(amígdala, hipocampo, núcleo accumbens, caudado, pálido, putamen,
tálamo, diencéfalo ventral, cerebelo) más el tronco del encéfalo (sin
lateralidad) — derivadas de la segmentación automática de FreeSurfer y
usadas como parte fija del espacio de 91282 grayordinates que comparten
TODOS los archivos CIFTI de este paquete (HCP-MMP1.0, Gordon333,
Cole-Anticevic...).

A diferencia de Gordon333 o HCP-MMP1.0 (donde la región de cada
grayordinate es un VALOR de datos que puede o no estar poblado — ver
`gordon333.py`), esta segmentación vive en el propio EJE espacial del
archivo CIFTI (`BrainModelAxis.name`, qué estructura anatómica es cada
grayordinate), no en sus valores: por eso está garantizado que tiene
datos reales para los 91282 puntos, siempre — es la propia definición
del espacio, no una clasificación que se le haya aplicado encima.

No es un archivo descargado aparte: este metadato es idéntico en
cualquier archivo `.dlabel.nii`/`.dscalar.nii` de este paquete. Se lee
aquí de `Gordon333.32k_fs_LR.dlabel.nii` solo porque ya estaba
disponible; `tests/ingestion/test_hcp_subcortical_structures.py`
comprueba explícitamente (no lo asume) que el eje espacial es idéntico
leído desde otro archivo distinto del mismo paquete.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from backend.ingestion.neuroimaging.hcp_mmp1 import representative_point
from backend.ontology.schema import EntityType, build_id

SPECIES_ID = build_id(EntityType.SPECIES, "human", "ncbi-taxonomy", "9606")
SPECIES_NAME = "Ser humano"
SPECIES_SCIENTIFIC_NAME = "Homo sapiens"

ATLAS_ID = build_id(EntityType.ATLAS, "human", "hcp", "subcortex_grayordinates")
ATLAS_NAME = (
    "Segmentación subcortical estándar de los grayordinates del HCP "
    "(Glasser et al., 2013, NeuroImage)"
)

REFERENCE_SPACE = "MNI152_FSL_2mm"

_HEMISPHERE_NAMES = {"L": "izquierdo", "R": "derecho"}

# Palabra de estructura (para nombrar la región) -> sufijo real del
# nombre de estructura CIFTI (comprobado en el propio header, no
# asumido: el orden de las palabras no siempre coincide, p. ej.
# "VentralDiencephalon" -> "DIENCEPHALON_VENTRAL").
_PAIRED_STRUCTURES = {
    "Amygdala": "AMYGDALA",
    "Hippocampus": "HIPPOCAMPUS",
    "Accumbens": "ACCUMBENS",
    "Caudate": "CAUDATE",
    "Pallidum": "PALLIDUM",
    "Putamen": "PUTAMEN",
    "Thalamus": "THALAMUS",
    "VentralDiencephalon": "DIENCEPHALON_VENTRAL",
    "Cerebellum": "CEREBELLUM",
}


@dataclass(frozen=True)
class SubcorticalStructure:
    word: str  # p. ej. "Amygdala", o "BrainStem" (sin lateralidad)
    hemisphere: str | None  # "L", "R" o None
    cifti_structure_name: str


def known_structures() -> list[SubcorticalStructure]:
    """Las 19 estructuras conocidas de este espacio, en el orden en que
    HCP las declara. No se leen de ningún archivo: son parte fija del
    formato CIFTI de grayordinates, igual para cualquier archivo de
    este espacio (ver docstring del módulo)."""
    structures = [SubcorticalStructure("BrainStem", None, "CIFTI_STRUCTURE_BRAIN_STEM")]
    for word, suffix in _PAIRED_STRUCTURES.items():
        for hemisphere in ("L", "R"):
            side = "LEFT" if hemisphere == "L" else "RIGHT"
            structures.append(
                SubcorticalStructure(word, hemisphere, f"CIFTI_STRUCTURE_{suffix}_{side}")
            )
    return structures


def local_code(structure: SubcorticalStructure) -> str:
    if structure.hemisphere is None:
        return structure.word.lower()
    return f"{structure.hemisphere}_{structure.word}".lower()


def region_name(structure: SubcorticalStructure) -> str:
    if structure.hemisphere is None:
        return structure.word
    return f"{structure.word} (hemisferio {_HEMISPHERE_NAMES[structure.hemisphere]})"


@dataclass(frozen=True)
class HcpSubcorticalRegion:
    id: str
    name: str
    cifti_structure_name: str


@dataclass(frozen=True)
class HcpSubcorticalCoordinate:
    id: str
    entity_id: str
    x: float
    y: float
    z: float
    reference_space: str


def read_hcp_subcortical_regions() -> list[HcpSubcorticalRegion]:
    return [
        HcpSubcorticalRegion(
            id=build_id(EntityType.REGION, "human", "hcp-subcortex", local_code(s)),
            name=region_name(s),
            cifti_structure_name=s.cifti_structure_name,
        )
        for s in known_structures()
    ]


def read_hcp_subcortical_coordinates(any_grayordinate_cifti_path: Path) -> list[HcpSubcorticalCoordinate]:
    """Calcula una coordenada representativa por estructura: el vóxel
    real más cercano al centroide de sus vóxeles, convertido a
    milímetros con la matriz affine real del propio CIFTI (igual
    principio que Brainnetome). `any_grayordinate_cifti_path` puede ser
    cualquier archivo `.dlabel.nii`/`.dscalar.nii` de este espacio: el
    eje espacial que se necesita aquí es idéntico en todos ellos."""
    import nibabel as nib

    img = nib.load(str(any_grayordinate_cifti_path))
    brain_model = img.header.get_axis(1)
    structure_per_grayordinate = np.asarray(brain_model.name)
    voxel_per_grayordinate = brain_model.voxel
    affine = brain_model.affine

    coordinates: list[HcpSubcorticalCoordinate] = []
    for structure in known_structures():
        mask = structure_per_grayordinate == structure.cifti_structure_name
        n_voxels = int(mask.sum())
        if n_voxels == 0:
            raise ValueError(
                f"La estructura {structure.cifti_structure_name!r} no tiene "
                "ningún grayordinate en este archivo: el eje espacial no es "
                "el esperado."
            )
        voxel_indices = voxel_per_grayordinate[mask]
        homogeneous = np.hstack([voxel_indices, np.ones((len(voxel_indices), 1))])
        points = (affine @ homogeneous.T).T[:, :3]
        x, y, z = representative_point(points)

        code = local_code(structure)
        coordinates.append(
            HcpSubcorticalCoordinate(
                id=build_id(EntityType.COORDINATE, "human", "hcp-subcortex", code),
                entity_id=build_id(EntityType.REGION, "human", "hcp-subcortex", code),
                x=float(x),
                y=float(y),
                z=float(z),
                reference_space=REFERENCE_SPACE,
            )
        )
    return coordinates
