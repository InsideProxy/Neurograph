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

# Nombres anatómicos completos ("long name") de las 180 áreas corticales
# del atlas de Glasser et al. (2016). El CIFTI original solo trae el
# código corto de la etiqueta (p. ej. `R_V1_ROI` -> código "V1"): no
# existe en el propio archivo ningún nombre descriptivo, y hasta ahora
# `name` se construía a partir de ese código sin más ("V1 (hemisferio
# izquierdo)"), lo que produce una leyenda donde dos regiones sin
# relación pueden parecer la misma abreviatura repetida dos veces --
# hueco ya señalado antes en `frontend/src/logic/regionLabel.ts`
# ("en HCP-MMP1.0, la etiqueta de origen (CIFTI) no trae más que el
# código de área... no existe un nombre anatómico descriptivo distinto").
#
# Verificados contra la Tabla 1 de:
#
#   Huang CC, Rolls ET, Feng J, Lin CP (2022). An extended Human
#   Connectome Project multimodal parcellation atlas of the human cortex
#   and subcortical areas. Brain Structure and Function, 227(3),
#   763-778. https://doi.org/10.1007/s00429-021-02421-6
#
# Esa tabla reproduce el campo `RegionLongName` original de la
# publicación que define el atlas (Glasser et al. 2016) para las 180
# áreas por hemisferio. No es la fuente primaria del atlas, pero sí una
# reproducción directa y citable de su nomenclatura oficial (el propio
# Glasser et al. 2016 no incluye esta tabla completa en su texto
# principal).
#
# Los 180 códigos de esta tabla se contrastaron uno a uno -- no solo por
# el recuento total -- contra los 180 códigos reales obtenidos
# ejecutando la propia `regions_from_labels` de este módulo sobre el
# archivo CIFTI real de la usuaria
# (`Q1-Q6_RelatedValidation210.CorticalAreas_dil_Final_Final_Areas_Group_Colors.32k_fs_LR.dlabel.nii`,
# 02/09/2026). Esa comparación encontró y corrigió una única
# discrepancia real: la tabla de Huang et al. imprime "7Pl", pero el
# código real de la etiqueta CIFTI (y el de Glasser et al. 2016) es
# "7PL" -- esta tabla usa el código real, nunca el de la tabla
# secundaria cuando difieren.
REGION_LONG_NAMES: dict[str, str] = {
    "1": "Area 1",
    "10d": "Area 10d",
    "10pp": "Polar 10p",
    "10r": "Area 10r",
    "10v": "Area 10v",
    "11l": "Area 11l",
    "13l": "Area 13l",
    "2": "Area 2",
    "23c": "Area 23c",
    "23d": "Area 23d",
    "24dd": "Dorsal Area 24d",
    "24dv": "Ventral Area 24d",
    "25": "Area 25",
    "31a": "Area 31a",
    "31pd": "Area 31pd",
    "31pv": "Area 31p ventral",
    "33pr": "Area 33 prime",
    "3a": "Area 3a",
    "3b": "Primary Sensory Cortex",
    "4": "Primary Motor Cortex",
    "43": "Area 43",
    "44": "Area 44",
    "45": "Area 45",
    "46": "Area 46",
    "47l": "Area 47l (47 lateral)",
    "47m": "Area 47m",
    "47s": "Area 47s",
    "52": "Area 52",
    "55b": "Area 55b",
    "5L": "Area 5L",
    "5m": "Area 5m",
    "5mv": "Area 5m ventral",
    "6a": "Area 6 anterior",
    "6d": "Dorsal area 6",
    "6ma": "Area 6m anterior",
    "6mp": "Area 6mp",
    "6r": "Rostral Area 6",
    "6v": "Ventral Area 6",
    "7AL": "Lateral Area 7A",
    "7Am": "Medial Area 7A",
    "7PC": "Area 7PC",
    "7PL": "Lateral Area 7P",
    "7Pm": "Medial Area 7P",
    "7m": "Area 7m",
    "8Ad": "Area 8Ad",
    "8Av": "Area 8Av",
    "8BL": "Area 8B Lateral",
    "8BM": "Area 8BM",
    "8C": "Area 8C",
    "9-46d": "Area 9-46d",
    "9a": "Area 9 anterior",
    "9m": "Area 9 Middle",
    "9p": "Area 9 Posterior",
    "A1": "Primary Auditory Cortex",
    "A4": "Auditory 4 Complex",
    "A5": "Auditory 5 Complex",
    "AAIC": "Anterior Agranular Insula Complex",
    "AIP": "Anterior IntraParietal Area",
    "AVI": "Anterior Ventral Insular Area",
    "DVT": "Dorsal Transitional Visual Area",
    "EC": "Entorhinal Cortex",
    "FEF": "Frontal Eye Fields",
    "FFC": "Fusiform Face Complex",
    "FOP1": "Frontal Opercular Area 1",
    "FOP2": "Frontal Opercular Area 2",
    "FOP3": "Frontal Opercular Area 3",
    "FOP4": "Frontal Opercular Area 4",
    "FOP5": "Area Frontal Opercular 5",
    "FST": "Area FST",
    "H": "Hippocampus",
    "IFJa": "Area IFJa",
    "IFJp": "Area IFJp",
    "IFSa": "Area IFSa",
    "IFSp": "Area IFSp",
    "IP0": "Area IntraParietal 0",
    "IP1": "Area IntraParietal 1",
    "IP2": "Area IntraParietal 2",
    "IPS1": "IntraParietal Sulcus Area 1",
    "Ig": "Insular Granular Complex",
    "LBelt": "Lateral Belt Complex",
    "LIPd": "Area Lateral IntraParietal dorsal",
    "LIPv": "Area Lateral IntraParietal ventral",
    "LO1": "Area Lateral Occipital 1",
    "LO2": "Area Lateral Occipital 2",
    "LO3": "Area Lateral Occipital 3",
    "MBelt": "Medial Belt Complex",
    "MI": "Middle Insular Area",
    "MIP": "Medial IntraParietal Area",
    "MST": "Medial Superior Temporal Area",
    "MT": "Middle Temporal Area",
    "OFC": "Orbital Frontal Complex",
    "OP1": "Area OP1-SII",
    "OP2-3": "Area OP2-3-VS",
    "OP4": "Area OP4-PV",
    "PBelt": "ParaBelt Complex",
    "PCV": "PreCuneus Visual Area",
    "PEF": "Premotor Eye Field",
    "PF": "Area PF Complex",
    "PFcm": "Area PFcm",
    "PFm": "Area PFm Complex",
    "PFop": "Area PF Opercular",
    "PFt": "Area PFt",
    "PGi": "Area PGi",
    "PGp": "Area PGp",
    "PGs": "Area PGs",
    "PH": "Area PH",
    "PHA1": "ParaHippocampal Area 1",
    "PHA2": "ParaHippocampal Area 2",
    "PHA3": "ParaHippocampal Area 3",
    "PHT": "Area PHT",
    "PI": "Para-Insular Area",
    "PIT": "Posterior InferoTemporal complex",
    "POS1": "Parieto-Occipital Sulcus Area 1",
    "POS2": "Parieto-Occipital Sulcus Area 2",
    "PSL": "PeriSylvian Language Area",
    "PeEc": "Perirhinal Ectorhinal Cortex",
    "Pir": "Pirform Cortex",
    "PoI1": "Area Posterior Insular 1",
    "PoI2": "Posterior Insular Area 2",
    "PreS": "PreSubiculum",
    "ProS": "ProStriate Area",
    "RI": "RetroInsular Cortex",
    "RSC": "RetroSplenial Complex",
    "SCEF": "Supplementary and Cingulate Eye Field",
    "SFL": "Superior Frontal Language Area",
    "STGa": "Area STGa",
    "STSda": "Area STSd anterior",
    "STSdp": "Area STSd posterior",
    "STSva": "Area STSv anterior",
    "STSvp": "Area STSv posterior",
    "STV": "Superior Temporal Visual Area",
    "TA2": "Area TA2",
    "TE1a": "Area TE1 anterior",
    "TE1m": "Area TE1 Middle",
    "TE1p": "Area TE1 posterior",
    "TE2a": "Area TE2 anterior",
    "TE2p": "Area TE2 posterior",
    "TF": "Area TF",
    "TGd": "Area TG dorsal",
    "TGv": "Area TG Ventral",
    "TPOJ1": "Area TemporoParietoOccipital Junction 1",
    "TPOJ2": "Area TemporoParietoOccipital Junction 2",
    "TPOJ3": "Area TemporoParietoOccipital Junction 3",
    "V1": "Primary Visual Cortex",
    "V2": "Second Visual Area",
    "V3": "Third Visual Area",
    "V3A": "Area V3A",
    "V3B": "Area V3B",
    "V3CD": "Area V3CD",
    "V4": "Fourth Visual Area",
    "V4t": "Area V4t",
    "V6": "Sixth Visual Area",
    "V6A": "Area V6A",
    "V7": "Seventh Visual Area",
    "V8": "Eighth Visual Area",
    "VIP": "Ventral IntraParietal Complex",
    "VMV1": "VentroMedial Visual Area 1",
    "VMV2": "VentroMedial Visual Area 2",
    "VMV3": "VentroMedial Visual Area 3",
    "VVC": "Ventral Visual Complex",
    "a10p": "Area anterior 10p",
    "a24": "Area a24",
    "a24pr": "Anterior 24 prime",
    "a32pr": "Area anterior 32 prime",
    "a47r": "Area anterior 47r",
    "a9-46v": "Area anterior 9-46v",
    "d23ab": "Area dorsal 23 a+b",
    "d32": "Area dorsal 32",
    "i6-8": "Inferior 6-8 Transitional Area",
    "p10p": "Area posterior 10p",
    "p24": "Area posterior 24",
    "p24pr": "Area Posterior 24 prime",
    "p32": "Area p32",
    "p32pr": "Area p32 prime",
    "p47r": "Area posterior 47r",
    "p9-46v": "Area posterior 9-46v",
    "pOFC": "Posterior OFC Complex",
    "s32": "Area s32",
    "s6-8": "Superior 6-8 Transitional Area",
    "v23ab": "Area ventral 23 a+b",
}


@dataclass(frozen=True)
class MmpRegion:
    id: str
    name: str
    abbreviation: str  # p. ej. "V1", "44", "9-46d" -- sin el hemisferio
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


def _region_long_name(area_code: str) -> str:
    """Nombre anatómico completo verificado de `area_code` (ver
    `REGION_LONG_NAMES`). Lanza `ValueError`, no un `KeyError` silencioso,
    si algún día apareciera un código sin nombre verificado -- mismo
    criterio que `_region_local_code`."""
    long_name = REGION_LONG_NAMES.get(area_code)
    if long_name is None:
        raise ValueError(
            f"No hay nombre anatómico verificado en REGION_LONG_NAMES para "
            f"el código de área HCP-MMP1.0 {area_code!r}"
        )
    return long_name


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
        name = f"{_region_long_name(area_code)} (hemisferio {_HEMISPHERE_NAMES[hemisphere]})"
        regions.append(
            MmpRegion(
                id=region_id,
                name=name,
                abbreviation=area_code,
                raw_label=label.name,
                hemisphere=hemisphere,
            )
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
