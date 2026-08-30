"""Brainnetome Atlas (Fan et al., 2016, Cerebral Cortex): parcelación de
246 regiones (123 pares bilaterales), distribuida como un volumen NIfTI
de etiquetas en espacio MNI152 (rejilla de FSL, 2mm) más una tabla de
nombres anatómicos (`BNA_subregions.xlsx`).

A diferencia de HCP-MMP1.0 (malla de superficie, vértices), este atlas es
volumétrico: las regiones son conjuntos de vóxeles, y la coordenada
representativa de cada una es el vóxel real más cercano al centroide de
sus vóxeles (nunca el centroide en sí — mismo principio que en
`hcp_mmp1.representative_point`, aquí en espacio físico de milímetros en
vez de vértices de malla).
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from backend.ingestion.neuroimaging.hcp_mmp1 import representative_point
from backend.ontology.schema import EntityType, build_id

SPECIES_ID = build_id(EntityType.SPECIES, "human", "ncbi-taxonomy", "9606")
SPECIES_NAME = "Ser humano"
SPECIES_SCIENTIFIC_NAME = "Homo sapiens"

ATLAS_ID = build_id(EntityType.ATLAS, "human", "brainnetome", "bna_246")
ATLAS_NAME = "Brainnetome Atlas (Fan et al., 2016, Cerebral Cortex)"

# El volumen de etiquetas (BN_Atlas_246_2mm.nii.gz) y el de conectividad
# (BNA_SC_4D.nii.gz) comparten exactamente la misma rejilla y matriz
# affine (comprobado el 28/08/2026, no asumido): [[-2,0,0,90],[0,2,0,-126],
# [0,0,2,-72],[0,0,0,1]] — la rejilla estándar de FSL para MNI152 a 2mm
# (metadato `descrip` del NIfTI: "FSL5.0"). Se etiqueta como
# "MNI152_FSL_2mm" y no solo "MNI152" a secas: distintas plantillas MNI152
# (FSL vs ICBM152 2009c que usa HCP) no son intercambiables sin registrar
# (mismo riesgo de sistemas de coordenadas mixtos que con HCP-MMP1.0 —
# riesgo 5 del análisis de arquitectura). No comparte espacio con
# fsLR_32k_S1200_groupavg_midthickness_MSMAll (HCP-MMP1.0): mezclar
# coordenadas de los dos atlas sin registrar sería incorrecto.
REFERENCE_SPACE = "MNI152_FSL_2mm"

_HEMISPHERE_NAMES = {"L": "izquierdo", "R": "derecho"}
_BILATERAL_CODE_PATTERN = re.compile(r"L\(R\)")


@dataclass(frozen=True)
class BrainnetomeRegionDef:
    label_id: int
    hemisphere: str  # "L" o "R"
    local_code: str
    name: str
    raw_bilateral_code: str


@dataclass(frozen=True)
class BrainnetomeRegion:
    id: str
    name: str
    abbreviation: str  # = local_code, p. ej. "L_SFG_7_1"
    raw_bilateral_code: str
    label_id: int
    hemisphere: str


@dataclass(frozen=True)
class BrainnetomeCoordinate:
    id: str
    entity_id: str
    x: float
    y: float
    z: float
    reference_space: str


def _local_code(raw_bilateral_code: str, hemisphere: str) -> str:
    """`SFG_L(R)_7_1` + "L" -> `L_SFG_7_1`. El código de la tabla oficial
    tiene el hemisferio en medio; se mueve al principio para que
    coincida con el mismo patrón que HCP-MMP1.0 (`hemisferio_area`)."""
    if not _BILATERAL_CODE_PATTERN.search(raw_bilateral_code):
        raise ValueError(f"Código bilateral con formato inesperado: {raw_bilateral_code!r}")
    parts = raw_bilateral_code.split("_")
    # p.ej. ['SFG', 'L(R)', '7', '1'] -> quitar el 'L(R)' de en medio
    parts = [p for p in parts if p != "L(R)"]
    return f"{hemisphere}_{'_'.join(parts)}"


def read_region_definitions(xlsx_path: Path) -> list[BrainnetomeRegionDef]:
    """Lee `BNA_subregions.xlsx` y devuelve una definición por región
    (246 en total: 123 filas de la tabla, cada una da lugar a una entrada
    izquierda y una derecha)."""
    import openpyxl

    wb = openpyxl.load_workbook(str(xlsx_path), data_only=True)
    ws = wb[wb.sheetnames[0]]

    definitions: list[BrainnetomeRegionDef] = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        raw_bilateral_code, label_id_l, label_id_r, description = row[2], row[3], row[4], row[6]
        if raw_bilateral_code is None or label_id_l is None or label_id_r is None:
            continue
        description = (description or raw_bilateral_code).strip()
        for hemisphere, label_id in (("L", label_id_l), ("R", label_id_r)):
            local_code = _local_code(raw_bilateral_code, hemisphere)
            name = f"{description} (hemisferio {_HEMISPHERE_NAMES[hemisphere]})"
            definitions.append(
                BrainnetomeRegionDef(
                    label_id=int(label_id),
                    hemisphere=hemisphere,
                    local_code=local_code,
                    name=name,
                    raw_bilateral_code=raw_bilateral_code,
                )
            )
    return definitions


def regions_from_definitions(definitions: list[BrainnetomeRegionDef]) -> list[BrainnetomeRegion]:
    return [
        BrainnetomeRegion(
            id=build_id(EntityType.REGION, "human", "brainnetome", d.local_code),
            name=d.name,
            abbreviation=d.local_code,
            raw_bilateral_code=d.raw_bilateral_code,
            label_id=d.label_id,
            hemisphere=d.hemisphere,
        )
        for d in definitions
    ]


def read_brainnetome_regions(xlsx_path: Path) -> list[BrainnetomeRegion]:
    return regions_from_definitions(read_region_definitions(xlsx_path))


def read_brainnetome_coordinates(
    atlas_nii_path: Path, xlsx_path: Path
) -> list[BrainnetomeCoordinate]:
    """Para cada una de las 246 regiones, calcula el vóxel real más
    cercano al centroide de sus vóxeles, convertido a milímetros con la
    matriz affine del propio volumen (nunca una coordenada de vóxel
    desnuda, ni una coordenada de la tabla oficial sin verificar contra
    el volumen real)."""
    import nibabel as nib

    img = nib.load(str(atlas_nii_path))
    data = np.asarray(img.dataobj)
    affine = img.affine

    definitions = read_region_definitions(xlsx_path)

    coordinates: list[BrainnetomeCoordinate] = []
    for d in definitions:
        voxel_indices = np.argwhere(data == d.label_id)
        if voxel_indices.size == 0:
            raise ValueError(
                f"La etiqueta {d.label_id} ({d.local_code}) no tiene ningún vóxel en el volumen"
            )
        # vóxel -> mm: coordenadas homogéneas por la matriz affine
        n = voxel_indices.shape[0]
        homogeneous = np.hstack([voxel_indices, np.ones((n, 1))])
        world_points = (affine @ homogeneous.T).T[:, :3]
        x, y, z = representative_point(world_points)

        region_id = build_id(EntityType.REGION, "human", "brainnetome", d.local_code)
        coord_id = build_id(EntityType.COORDINATE, "human", "brainnetome", d.local_code)
        coordinates.append(
            BrainnetomeCoordinate(
                id=coord_id, entity_id=region_id, x=float(x), y=float(y), z=float(z),
                reference_space=REFERENCE_SPACE,
            )
        )
    return coordinates
