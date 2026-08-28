"""Gordon 333 (Gordon et al., 2016, Cerebral Cortex, "Generation and
Evaluation of a Cortical Area Parcellation from Resting-State
Correlations", DOI 10.1093/cercor/bhu239): 333 parcelas corticales
agrupadas en 12 redes de comunidad intrínsecas al propio atlas (más un
grupo "None" de 47 parcelas sin red asignada), distribuidas dentro del
mismo paquete HCP S1200 Group Average usado para HCP-MMP1.0
(`Gordon333.32k_fs_LR.dlabel.nii`).

El mismo archivo declara además, en su tabla de etiquetas, 19
estructuras subcorticales (amígdala, hipocampo, tálamo...) con nombre y
color — pero se comprobó empíricamente (28/08/2026) que ninguna tiene
ningún grayordinate real asignado en el mapa: los 31 870 puntos
subcorticales del archivo valen 0 ("sin clasificar") en los 353 índices
de la tabla de etiquetas, ninguno de los 19 aparece nunca como valor
real. Son una plantilla heredada al construir el archivo, no una
clasificación real de Gordon — cargarlas como región sería inventar 351
regiones donde solo hay 333 reales. Por eso este módulo NUNCA lee las
etiquetas subcorticales de este archivo: la segmentación subcortical
real y separada vive en `hcp_subcortical_structures.py`, con su propia
cita (Glasser et al., 2013), porque no la define este artículo.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from backend.ingestion.neuroimaging.cifti_labels import CiftiLabel, read_cifti_labels
from backend.ingestion.neuroimaging.cole_anticevic_networks import network_slug
from backend.ingestion.neuroimaging.hcp_mmp1 import representative_point
from backend.ontology.schema import EntityType, build_id

SPECIES_ID = build_id(EntityType.SPECIES, "human", "ncbi-taxonomy", "9606")
SPECIES_NAME = "Ser humano"
SPECIES_SCIENTIFIC_NAME = "Homo sapiens"

ATLAS_ID = build_id(EntityType.ATLAS, "human", "gordon333", "cortex")
ATLAS_NAME = "Gordon 333 (Gordon et al., 2016, Cerebral Cortex) — solo corteza"

REFERENCE_SPACE = "fsLR_32k_S1200_groupavg_midthickness_MSMAll"

_BACKGROUND_LABEL = "???"
_UNASSIGNED_NETWORK_TOKEN = "None"
_HEMISPHERE_NAMES = {"L": "izquierdo", "R": "derecho"}
_CORTEX_STRUCTURE = {
    "L": "CIFTI_STRUCTURE_CORTEX_LEFT",
    "R": "CIFTI_STRUCTURE_CORTEX_RIGHT",
}
# `L_Default_12`, `R_None_5`... nunca las 19 etiquetas subcorticales
# (Amygdala, Hippocampus...), que este patrón no admite a propósito.
_CORTICAL_LABEL_PATTERN = re.compile(r"^(L|R)_([A-Za-z]+)_(\d+)$")


@dataclass(frozen=True)
class ParsedCorticalLabel:
    hemisphere: str
    network_token: str
    index: str


def parse_cortical_label(raw_label: str) -> ParsedCorticalLabel:
    """Solo acepta etiquetas corticales reales (`L_Default_12`, etc.).
    Cualquier otra cosa —incluidas las 19 etiquetas subcorticales sin
    datos reales— lanza `ValueError`: nunca se ignoran en silencio,
    para que un cambio futuro del archivo no pase desapercibido."""
    match = _CORTICAL_LABEL_PATTERN.match(raw_label)
    if not match:
        raise ValueError(f"Etiqueta Gordon333 con formato cortical inesperado: {raw_label!r}")
    hemisphere, network_token, index = match.groups()
    return ParsedCorticalLabel(hemisphere=hemisphere, network_token=network_token, index=index)


def local_code(raw_label: str) -> str:
    return raw_label.lower()


def region_name(parsed: ParsedCorticalLabel) -> str:
    hemi_txt = f" (hemisferio {_HEMISPHERE_NAMES[parsed.hemisphere]})"
    if parsed.network_token == _UNASSIGNED_NETWORK_TOKEN:
        return f"Parcela cortical sin red asignada {parsed.index}{hemi_txt}"
    return f"Parcela cortical de la red {parsed.network_token} {parsed.index}{hemi_txt}"


@dataclass(frozen=True)
class GordonRegion:
    id: str
    name: str
    raw_label: str
    hemisphere: str


@dataclass(frozen=True)
class GordonCoordinate:
    id: str
    entity_id: str
    x: float
    y: float
    z: float
    reference_space: str


@dataclass(frozen=True)
class GordonNetworkDef:
    id: str
    name: str
    slug: str


@dataclass(frozen=True)
class GordonMembership:
    id: str
    region_id: str
    network_id: str
    confidence: float
    method: str


def _cortical_labels_present_in_data(dlabel_path: Path) -> list[CiftiLabel]:
    """Filtra la tabla de etiquetas del archivo a solo las que tienen
    algún grayordinate real asignado (excluye tanto el fondo como las
    19 etiquetas subcorticales, que no tienen ninguno — ver docstring
    del módulo). No asume la lista de etiquetas "buenas" de antemano:
    la calcula del propio mapa de datos, para que cualquier cambio en
    el archivo se refleje aquí sin tener que tocar el código."""
    import nibabel as nib

    img = nib.load(str(dlabel_path))
    data = img.get_fdata()[0]
    populated_indices = {int(v) for v in np.unique(data)}
    return [
        label
        for label in read_cifti_labels(dlabel_path)
        if label.name != _BACKGROUND_LABEL and label.index in populated_indices
    ]


def regions_from_labels(labels: list[CiftiLabel]) -> list[GordonRegion]:
    regions: list[GordonRegion] = []
    for label in labels:
        if label.name == _BACKGROUND_LABEL:
            continue
        parsed = parse_cortical_label(label.name)
        region_id = build_id(EntityType.REGION, "human", "gordon333", local_code(label.name))
        regions.append(
            GordonRegion(
                id=region_id,
                name=region_name(parsed),
                raw_label=label.name,
                hemisphere=parsed.hemisphere,
            )
        )
    return regions


def read_gordon333_regions(dlabel_path: Path) -> list[GordonRegion]:
    return regions_from_labels(_cortical_labels_present_in_data(dlabel_path))


def networks_from_labels(labels: list[CiftiLabel]) -> list[GordonNetworkDef]:
    """Las 12 redes reales del atlas de Gordon. "None" (47 parcelas sin
    red) queda deliberadamente fuera: no es una red, es la ausencia de
    una — igual que las regiones sin mayoría clara se dejan sin
    pertenencia en Cole-Anticevic."""
    seen: dict[str, GordonNetworkDef] = {}
    for label in labels:
        if label.name == _BACKGROUND_LABEL:
            continue
        parsed = parse_cortical_label(label.name)
        if parsed.network_token == _UNASSIGNED_NETWORK_TOKEN:
            continue
        slug = network_slug(parsed.network_token)
        if slug not in seen:
            network_id = build_id(EntityType.NETWORK, "human", "gordon333", slug)
            seen[slug] = GordonNetworkDef(id=network_id, name=parsed.network_token, slug=slug)
    return list(seen.values())


def read_gordon333_networks(dlabel_path: Path) -> list[GordonNetworkDef]:
    return networks_from_labels(_cortical_labels_present_in_data(dlabel_path))


def region_network_memberships(dlabel_path: Path) -> list[GordonMembership]:
    """A diferencia de Cole-Anticevic sobre HCP-MMP1.0, aquí no hace
    falta ningún voto: la red de cada parcela es la que ya trae la
    propia etiqueta del atlas de Gordon, de forma exacta y determinista
    — `confidence` es 1.0 siempre que se asigna."""
    memberships: list[GordonMembership] = []
    for label in _cortical_labels_present_in_data(dlabel_path):
        parsed = parse_cortical_label(label.name)
        if parsed.network_token == _UNASSIGNED_NETWORK_TOKEN:
            continue
        code = local_code(label.name)
        region_id = build_id(EntityType.REGION, "human", "gordon333", code)
        network_id = build_id(EntityType.NETWORK, "human", "gordon333", network_slug(parsed.network_token))
        membership_id = build_id(EntityType.MEMBERSHIP, "human", "gordon333", code)
        memberships.append(
            GordonMembership(
                id=membership_id,
                region_id=region_id,
                network_id=network_id,
                confidence=1.0,
                method="etiqueta_intrinseca_de_la_parcelacion_de_gordon_et_al_2016_gordon333",
            )
        )
    return memberships


def read_gordon333_coordinates(
    dlabel_path: Path, surf_left_path: Path, surf_right_path: Path
) -> list[GordonCoordinate]:
    """El vértice real de la superficie "midthickness" más cercano al
    centroide de los vértices de cada parcela (igual método que
    HCP-MMP1.0). Comprueba que los grayordinates de cada parcela caen
    todos en el hemisferio esperado por su etiqueta."""
    import nibabel as nib

    img = nib.load(str(dlabel_path))
    data = img.get_fdata()[0]
    labels = img.header.get_axis(0).label[0]

    brain_model = img.header.get_axis(1)
    structure_per_grayordinate = np.asarray(brain_model.name)
    vertex_per_grayordinate = brain_model.vertex

    surf_coords = {
        "L": nib.load(str(surf_left_path)).darrays[0].data,
        "R": nib.load(str(surf_right_path)).darrays[0].data,
    }

    cortical_labels = {label.index: label for label in _cortical_labels_present_in_data(dlabel_path)}

    coordinates: list[GordonCoordinate] = []
    for label_index, (raw_label, _rgba) in labels.items():
        if label_index not in cortical_labels:
            continue
        parsed = parse_cortical_label(raw_label)
        expected_structure = _CORTEX_STRUCTURE[parsed.hemisphere]

        grayordinate_mask = data == label_index
        structures_present = set(structure_per_grayordinate[grayordinate_mask])
        if structures_present != {expected_structure}:
            raise ValueError(
                f"La parcela {raw_label!r} tiene vértices fuera de "
                f"{expected_structure}: {structures_present}"
            )

        vertex_indices = vertex_per_grayordinate[grayordinate_mask]
        points = surf_coords[parsed.hemisphere][vertex_indices]
        x, y, z = representative_point(points)

        code = local_code(raw_label)
        coordinates.append(
            GordonCoordinate(
                id=build_id(EntityType.COORDINATE, "human", "gordon333", code),
                entity_id=build_id(EntityType.REGION, "human", "gordon333", code),
                x=float(x),
                y=float(y),
                z=float(z),
                reference_space=REFERENCE_SPACE,
            )
        )
    return coordinates
