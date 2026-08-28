"""HCP-MMP1.0 (Glasser et al., 2016, Nature, "A multi-modal parcellation
of human cerebral cortex"): parcelación de la corteza humana en 360 áreas
(180 por hemisferio), distribuida por el HCP dentro del paquete S1200
Group Average. Traduce sus etiquetas CIFTI y sus superficies a entidades
de la ontología de NeuroGraph (sección 6): un `Species`, un `Atlas`, 360
`Region` y sus `Coordinate`.

Cada hemisferio es una entidad `Region` propia (no una sola región con un
atributo de lado): son estructuras físicamente distintas. Si algún día
hace falta relacionar V1 izquierda con V1 derecha como homólogas, eso es
trabajo de la entidad `Homology` (Fase 7), no de fusionarlas aquí.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

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

# Espacio de referencia de las coordenadas: la malla de superficie estándar
# fs_LR de 32k vértices por hemisferio, sobre la superficie "midthickness"
# del promedio de grupo S1200 tras el registro MSMAll. Deliberadamente NO
# se llama "MNI" ni "Talairach": el archivo .surf.gii declara internamente
# un sistema "talairach-to-talairach", pero es una etiqueta genérica del
# formato GIFTI que el propio HCP no usa de forma literal — es una
# convención conocida del pipeline, no coordenadas Talairach reales. Llamar
# a esto "MNI" sin comprobarlo sería precisamente el riesgo de sistemas de
# coordenadas mixtos señalado en `docs/analisis-arquitectura.md` (riesgo 5).
REFERENCE_SPACE = "fsLR_32k_S1200_groupavg_midthickness_MSMAll"

_HEMISPHERE_NAMES = {"L": "izquierdo", "R": "derecho"}
_BACKGROUND_LABEL = "???"
_CORTEX_STRUCTURE = {
    "L": "CIFTI_STRUCTURE_CORTEX_LEFT",
    "R": "CIFTI_STRUCTURE_CORTEX_RIGHT",
}


@dataclass(frozen=True)
class MmpRegion:
    id: str
    name: str
    raw_label: str
    hemisphere: str  # "L" o "R"


@dataclass(frozen=True)
class MmpCoordinate:
    id: str
    entity_id: str  # id de la Region a la que pertenece
    x: float
    y: float
    z: float
    reference_space: str


def _region_local_code(raw_label: str) -> str:
    """`R_V1_ROI` -> `R_V1`. Lanza `ValueError` ante cualquier etiqueta
    que no siga el formato `<hemisferio>_<area>_ROI` esperado, en vez de
    ignorarla silenciosamente (sección 24: nunca "redondear" sobre datos
    que no encajan en el modelo)."""
    hemisphere, sep, rest = raw_label.partition("_")
    if not sep or hemisphere not in _HEMISPHERE_NAMES or not rest.endswith("_ROI"):
        raise ValueError(f"Etiqueta HCP-MMP1.0 con formato inesperado: {raw_label!r}")
    area_code = rest[: -len("_ROI")]
    return f"{hemisphere}_{area_code}"


def regions_from_labels(labels: list[CiftiLabel]) -> list[MmpRegion]:
    """Convierte las etiquetas CIFTI crudas de HCP-MMP1.0 (p. ej.
    `R_V1_ROI`) en entidades `Region` de la ontología. Excluye la
    etiqueta de fondo."""
    regions: list[MmpRegion] = []
    for label in labels:
        if label.name == _BACKGROUND_LABEL:
            continue
        local_code = _region_local_code(label.name)
        hemisphere = local_code[0]
        area_code = local_code[2:]
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


def representative_point(points: np.ndarray) -> np.ndarray:
    """El vértice real más cercano al centroide de `points` (nunca el
    centroide en sí): así la coordenada devuelta es siempre un punto que
    existe de verdad sobre la superficie cortical, no un punto
    interpolado que podría caer fuera de ella (p. ej. en medio de un
    surco muy plegado)."""
    if len(points) == 0:
        raise ValueError("no hay puntos de los que calcular un representante")
    centroid = points.mean(axis=0)
    distances = np.linalg.norm(points - centroid, axis=1)
    return points[int(np.argmin(distances))]


def read_mmp1_coordinates(
    dlabel_path: Path, surf_left_path: Path, surf_right_path: Path
) -> list[MmpCoordinate]:
    """Calcula una coordenada representativa por región: el vértice real
    de la superficie "midthickness" más cercano al centroide de todos los
    vértices que pertenecen a esa región. Comprueba, para cada región,
    que sus vértices están todos en un único hemisferio (si no, algo no
    encaja entre el nombre de la etiqueta y los datos reales, y se
    considera un error, no un caso a ignorar).
    """
    import nibabel as nib

    img = nib.load(str(dlabel_path))
    data = img.get_fdata()[0]
    label_axis = img.header.get_axis(0)
    labels = label_axis.label[0]

    brain_model = img.header.get_axis(1)
    structure_per_grayordinate = np.asarray(brain_model.name)
    vertex_per_grayordinate = brain_model.vertex

    surf_coords = {
        "L": nib.load(str(surf_left_path)).darrays[0].data,
        "R": nib.load(str(surf_right_path)).darrays[0].data,
    }

    coordinates: list[MmpCoordinate] = []
    for label_index, (raw_label, _rgba) in labels.items():
        if raw_label == _BACKGROUND_LABEL:
            continue
        local_code = _region_local_code(raw_label)
        hemisphere = local_code[0]
        expected_structure = _CORTEX_STRUCTURE[hemisphere]

        grayordinate_mask = data == label_index
        structures_present = set(structure_per_grayordinate[grayordinate_mask])
        if structures_present != {expected_structure}:
            raise ValueError(
                f"La región {raw_label!r} (hemisferio {hemisphere}) tiene vértices "
                f"fuera de {expected_structure}: {structures_present}"
            )

        vertex_indices = vertex_per_grayordinate[grayordinate_mask]
        points = surf_coords[hemisphere][vertex_indices]
        x, y, z = representative_point(points)

        region_id = build_id(EntityType.REGION, "human", "hcp-mmp1", local_code)
        coord_id = build_id(EntityType.COORDINATE, "human", "hcp-mmp1", local_code)
        coordinates.append(
            MmpCoordinate(
                id=coord_id,
                entity_id=region_id,
                x=float(x),
                y=float(y),
                z=float(z),
                reference_space=REFERENCE_SPACE,
            )
        )
    return coordinates
