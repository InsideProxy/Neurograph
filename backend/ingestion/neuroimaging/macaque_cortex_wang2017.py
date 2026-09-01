"""Macaque Cortex Atlas LR160 (Wang J, Zuo Z, Xie S, Miao Y, Ma Y, Zhao X,
Jiang T, 2017/2018, Brain Topography, "Parcellation of Macaque Cortex with
Anatomical Connectivity Profiles", DOI 10.1007/s10548-017-0576-9): primera
entidad `Species` no humana del proyecto (Fase 7 -- Evolución, sección 11) y
primer atlas volumétrico de macaco. 160 subáreas (80 por hemisferio),
definidas por diferencias en los patrones de conectividad anatómica
(tractografía probabilística de fibra completa) sobre 24 macacos rhesus
sanos (Macaca mulatta, todos machos, ~6 kg -- Métodos del artículo).

Distribuido como un único volumen NIfTI de etiquetas
(`Macaque_Cortex_Atlas_LR160_for_download.nii`), sin ninguna tabla de
nombres de región en formato separado: la correspondencia etiqueta -> área
cito/anatómica solo existe dentro de la Tabla 1 del propio artículo (PDF).
`REGION_DEFINITIONS` de abajo es esa tabla transcrita literalmente (80
filas, columnas Lóbulo/Circunvolución/ID-izquierda/ID-derecha/área), no una
tabla inventada ni aproximada -- verificada dos veces: (a) contra el texto
extraído del PDF con `pdfplumber` el 31/08/2026, y (b) contra el propio
volumen NIfTI, que contiene exactamente 161 valores únicos (0 = fondo, más
1-80 para el hemisferio izquierdo y 1001-1080 para el derecho, sin ninguna
etiqueta que falte ni sobre). El desglose por lóbulo (14 frontal + 9
sensoriomotor + 13 parietal + 16 temporal + 16 occipital + 12 límbico = 80)
coincide exactamente con el resumen del propio artículo.

Espacio de referencia -- INIA19 (verificación, 31/08/2026, decisión 28 de
docs/analisis-arquitectura.md): el paquete descargado empareja el volumen
de etiquetas con un archivo `INIA19_brain.nii`, pero el propio texto de
Métodos del artículo dice que las máscaras semilla se definieron usando
"the NeuroMaps atlas (Rohlfing et al. 2012)" -- una posible discrepancia de
espacio, del mismo tipo que la de MNI152_FSL vs ICBM152_2009c (riesgo 5,
decisión 6/25). Se resolvió consultando la propia publicación de Rohlfing
et al. (2012, Frontiers in Neuroinformatics, DOI 10.3389/fninf.2012.00027,
"The INIA19 Template and NeuroMaps Atlas for Primate Brain Image
Parcellation and Spatial Normalization"): INIA19 (la plantilla T1) y
NeuroMaps (la parcelación de 724 regiones) son dos productos de ESA MISMA
publicación, y el propio artículo de Rohlfing et al. registra NeuroMaps
sobre INIA19 -- no son espacios distintos ni en conflicto, son el mismo
recurso. Por tanto "NeuroMaps atlas (Rohlfing et al. 2012)" tal y como lo
cita Wang et al. (2017) está, por construcción, en espacio INIA19, igual
que el `INIA19_brain.nii` incluido en este mismo paquete de descarga.

Nota aparte, no bloqueante: el volumen de etiquetas y `INIA19_brain.nii`
difieren en 1 vóxel de forma/origen ((84,103,64) vs (85,104,65), affines
con un desplazamiante de 1mm en Y) y el volumen de etiquetas lleva
`descrip: b'FSL5.0'` en su cabecera NIfTI (comprobado con nibabel) --
indicio de que se recortó/remuestreó con FSL al preparar este paquete de
descarga, no de que esté en una plantilla distinta: ambos comparten el
mismo origen (x=-42) y el mismo tamaño de vóxel (1mm isotrópico).
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from backend.ingestion.neuroimaging.hcp_mmp1 import representative_point
from backend.ontology.schema import EntityType, build_id

# Macaca mulatta (macaco rhesus), NCBI Taxonomy ID 9544 -- verificado el
# 31/08/2026 contra https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi
# ?mode=Info&id=9544, y coincide con el Métodos del artículo ("Twenty-four
# healthy rhesus macaques (Macaca mulatta, all males...)").
SPECIES_ID = build_id(EntityType.SPECIES, "macaque", "ncbi-taxonomy", "9544")
SPECIES_NAME = "Macaco rhesus"
SPECIES_SCIENTIFIC_NAME = "Macaca mulatta"

ATLAS_ID = build_id(EntityType.ATLAS, "macaque", "wang2017", "cortex_lr160")
ATLAS_NAME = "Macaque Cortex Atlas LR160 (Wang et al., 2017, Brain Topography)"
ATLAS_VERSION = "LR160"

# Ver docstring del módulo: NeuroMaps (Rohlfing et al. 2012) está, por
# construcción de esa misma publicación, registrado sobre la plantilla
# INIA19 -- no es una plantilla distinta de la citada en el Métodos de
# Wang et al. (2017).
REFERENCE_SPACE = "INIA19"

_HEMISPHERE_NAMES = {"L": "izquierdo", "R": "derecho"}

# Tabla 1 del artículo (págs. 6-7 del PDF), transcrita literalmente:
# (id_izquierda, lóbulo, circunvolución, abreviatura_cruda, nombre_área).
# id_derecha = id_izquierda + 1000 en todos los casos (verificado contra
# el propio volumen NIfTI: los 80 valores 1-80 y los 80 valores 1001-1080
# son exactamente ese mismo desplazamiento, sin excepción).
#
# Tres abreviaturas de la ínsula (69-71) se transcriben aquí como
# "Ia"/"Id"/"Ig" (I mayúscula) en vez de "la"/"ld"/"lg": el texto extraído
# del PDF confunde la "I" mayúscula de "Insula" con una "l" minúscula (un
# artefacto conocido de extracción de fuentes con `pdfplumber`, no un dato
# distinto) -- se corrige a la nomenclatura estándar de subdivisión
# insular (agranular/disgranular/granular, Ia/Id/Ig), consistente con el
# propio nombre de la columna "Insula (INS)".
REGION_DEFINITIONS: list[tuple[int, str, str, str, str]] = [
    # Frontal lobe
    (1, "Frontal lobe", "Superior frontal gyrus (SFG)", "9m", "medial area 9"),
    (2, "Frontal lobe", "Superior frontal gyrus (SFG)", "9l", "lateral area 9"),
    (3, "Frontal lobe", "Superior frontal gyrus (SFG)", "8B", "medial area 8"),
    (4, "Frontal lobe", "Superior frontal gyrus (SFG)", "6DR", "rostral dorsal area 6"),
    (5, "Frontal lobe", "Superior frontal gyrus (SFG)", "SMA", "supplementary motor area"),
    (6, "Frontal lobe", "Superior frontal gyrus (SFG)", "6DC", "caudal dorsal area 6"),
    (7, "Frontal lobe", "Middle frontal gyrus (MFG)", "10d", "dorsal areas 10"),
    (8, "Frontal lobe", "Middle frontal gyrus (MFG)", "46d", "dorsal area 46"),
    (9, "Frontal lobe", "Middle frontal gyrus (MFG)", "9/46d", "area 9/46d"),
    (10, "Frontal lobe", "Middle frontal gyrus (MFG)", "8Ad", "dorsolateral area 8"),
    (11, "Frontal lobe", "Inferior frontal gyrus (IFG)", "10v", "ventral area 10"),
    (12, "Frontal lobe", "Inferior frontal gyrus (IFG)", "46v", "ventral area 46"),
    (13, "Frontal lobe", "Inferior frontal gyrus (IFG)", "9/46v/45", "areas 9/46v or area 45"),
    (14, "Frontal lobe", "Inferior frontal gyrus (IFG)", "8Av", "ventrolateral area 8"),
    # Sensorimotor
    (15, "Sensorimotor", "Precentral gyrus (PrCG)", "ProM", "ventrorostral premotor cortex"),
    (16, "Sensorimotor", "Precentral gyrus (PrCG)", "6V", "ventral area 6"),
    (17, "Sensorimotor", "Precentral gyrus (PrCG)", "l4M", "lateral area 4M"),
    (18, "Sensorimotor", "Precentral gyrus (PrCG)", "m4M", "medial 4M"),
    (19, "Sensorimotor", "Postcentral gyrus (PoCG)", "PoCG-head", "head part"),
    (20, "Sensorimotor", "Postcentral gyrus (PoCG)", "PoCG-hand", "hand part"),
    (21, "Sensorimotor", "Postcentral gyrus (PoCG)", "PoCG-forelimb", "forelimb part"),
    (22, "Sensorimotor", "Postcentral gyrus (PoCG)", "PoCG-trunck", "trunck part"),
    (23, "Sensorimotor", "Postcentral gyrus (PoCG)", "PoCG-foot/leg", "foot/leg part"),
    # Parietal lobe
    (24, "Parietal lobe", "Superior parietal lobule (SPL)", "5V", "ventral area 5"),
    (25, "Parietal lobe", "Superior parietal lobule (SPL)", "5D", "dorsal area 5"),
    (26, "Parietal lobe", "Superior parietal lobule (SPL)", "PEa", "anterior SPL"),
    (27, "Parietal lobe", "Superior parietal lobule (SPL)", "PEcr", "rostral posterior SPL"),
    (28, "Parietal lobe", "Superior parietal lobule (SPL)", "PEcp", "caudal posterior SPL"),
    (29, "Parietal lobe", "Inferior parietal lobule (IPL)", "PFop", "parietal operculum"),
    (30, "Parietal lobe", "Inferior parietal lobule (IPL)", "PF", "anterior supramarginal gyrus"),
    (31, "Parietal lobe", "Inferior parietal lobule (IPL)", "PFG", "posterior supramarginal gyrus"),
    (32, "Parietal lobe", "Inferior parietal lobule (IPL)", "PG", "anterior angular gyrus"),
    (33, "Parietal lobe", "Inferior parietal lobule (IPL)", "Opt", "posterior angular gyrus"),
    (34, "Parietal lobe", "Precuneus (PCUN)", "PEcm", "medial SPL"),
    (35, "Parietal lobe", "Precuneus (PCUN)", "PGm", "middle precuneus"),
    (36, "Parietal lobe", "Precuneus (PCUN)", "PO", "parieto-occipital gyrus"),
    # Temporal lobe
    (37, "Temporal lobe", "Superior temporal gyrus (STG)", "Ts1", "anterior STG"),
    (38, "Temporal lobe", "Superior temporal gyrus (STG)", "Ts2", "middle anterior STG"),
    (39, "Temporal lobe", "Superior temporal gyrus (STG)", "Ts3", "posterior anterior STG"),
    (40, "Temporal lobe", "Superior temporal gyrus (STG)", "paAlt", "auditory cortex"),
    (41, "Temporal lobe", "Superior temporal gyrus (STG)", "Tpt", "temporoparietal area"),
    (42, "Temporal lobe", "Superior temporal sulcus (STS)", "TEa/TEm", "anterior/medial STS"),
    (43, "Temporal lobe", "Superior temporal sulcus (STS)", "TPO-1",
     "rostral temporal parietal occipital area"),
    (44, "Temporal lobe", "Superior temporal sulcus (STS)", "TPO-2",
     "intermediate temporal parietal occipital area"),
    (45, "Temporal lobe", "Superior temporal sulcus (STS)", "TPO-3",
     "caudal temporal parietal occipital area"),
    (46, "Temporal lobe", "Superior temporal sulcus (STS)", "TPO-4/MT", "middle temporal area"),
    (47, "Temporal lobe", "Inferior temporal gyrus (ITG)", "TE1/TE2", "anterior ITG"),
    (48, "Temporal lobe", "Inferior temporal gyrus (ITG)", "TE3", "posterior ITG"),
    (49, "Temporal lobe", "Inferior temporal gyrus (ITG)", "TEO", "occipitotemporal area"),
    (50, "Temporal lobe", "Medial inferior temporal gyrus (ITGm)", "aITGm", "anterior ITGm"),
    (51, "Temporal lobe", "Medial inferior temporal gyrus (ITGm)", "mITGm", "intermediate ITGm"),
    (52, "Temporal lobe", "Medial inferior temporal gyrus (ITGm)", "pITGm", "posterior ITGm"),
    # Occipital lobe
    (53, "Occipital lobe", "Occipitotemporal area (OA)", "DP", "dorsal prelunate area"),
    (54, "Occipital lobe", "Occipitotemporal area (OA)", "V4d", "dorsal area V4"),
    (55, "Occipital lobe", "Occipitotemporal area (OA)", "V4v", "ventral area V4"),
    (56, "Occipital lobe", "Cuneus (CUNE)", "V6Ad", "dorsal area V6A"),
    (57, "Occipital lobe", "Cuneus (CUNE)", "V6Av", "ventral area V6A"),
    (58, "Occipital lobe", "Cuneus (CUNE)", "V6", "area V6"),
    (59, "Occipital lobe", "Cuneus (CUNE)", "RRC", "retrosplenial cortex"),
    (60, "Occipital lobe", "Visual cortex", "V1", "area V1"),
    (61, "Occipital lobe", "Visual cortex", "V2d", "dorsal area V2"),
    (62, "Occipital lobe", "Visual cortex", "V3d", "dorsal area V3"),
    (63, "Occipital lobe", "Visual cortex", "V2v", "ventral area V2"),
    (64, "Occipital lobe", "Visual cortex", "LOC", "lateral occipital central area"),
    (65, "Occipital lobe", "Visual cortex", "V3A", "area V3A"),
    (66, "Occipital lobe", "Visual cortex", "V3v", "ventral area V3"),
    (67, "Occipital lobe", "Visual cortex", "SOG", "superior occipital gyrus"),
    (68, "Occipital lobe", "Visual cortex", "VOT", "ventral occipitotemporal area"),
    # Limbic lobe
    (69, "Limbic lobe", "Insula (INS)", "Ia", "agranular insular cortex"),
    (70, "Limbic lobe", "Insula (INS)", "Id", "dysgranular insular cortex"),
    (71, "Limbic lobe", "Insula (INS)", "Ig", "granular insular cortex"),
    (72, "Limbic lobe", "Insula (INS)", "G", "gustatory cortex"),
    (73, "Limbic lobe", "Cingulate gyrus (CG)", "25", "area 25"),
    (74, "Limbic lobe", "Cingulate gyrus (CG)", "32v", "ventral area 32"),
    (75, "Limbic lobe", "Cingulate gyrus (CG)", "32d", "dorsal area 32"),
    (76, "Limbic lobe", "Cingulate gyrus (CG)", "24", "anterior area 24"),
    (77, "Limbic lobe", "Cingulate gyrus (CG)", "24a/24b", "ventral area 24"),
    (78, "Limbic lobe", "Cingulate gyrus (CG)", "23a/23b", "ventral area 23"),
    (79, "Limbic lobe", "Cingulate gyrus (CG)", "31", "area 31"),
    (80, "Limbic lobe", "Cingulate gyrus (CG)", "23", "posterior area 23"),
]

_SANITIZE_PATTERN = re.compile(r"[^a-z0-9_\-]+")


def _sanitize_local_code(raw_abbreviation: str) -> str:
    """`9/46v/45` -> `9-46v-45`. El esquema de identificadores
    (`backend.ontology.schema.build_id`) no admite `/` ni espacios en el
    código local; el nombre/abreviatura legible que se muestra en la
    interfaz conserva el formato original de la Tabla 1 sin tocar."""
    return _SANITIZE_PATTERN.sub("-", raw_abbreviation.lower()).strip("-")


@dataclass(frozen=True)
class MacaqueRegion:
    id: str
    name: str
    abbreviation: str  # forma original de la Tabla 1, p. ej. "9/46v/45"
    lobe: str
    gyrus: str
    label_id: int
    hemisphere: str  # "L" o "R"


@dataclass(frozen=True)
class MacaqueCoordinate:
    id: str
    entity_id: str
    x: float
    y: float
    z: float
    reference_space: str


def regions_from_definitions() -> list[MacaqueRegion]:
    """Construye las 160 entidades `Region` (80 filas x 2 hemisferios) a
    partir de `REGION_DEFINITIONS`. El id derecho es siempre el id
    izquierdo + 1000 (convención propia del atlas, verificada contra el
    volumen NIfTI real -- nunca inferida)."""
    regions: list[MacaqueRegion] = []
    for label_id_left, lobe, gyrus, raw_abbrev, area_name in REGION_DEFINITIONS:
        local_stub = _sanitize_local_code(raw_abbrev)
        for hemisphere, label_id in (("L", label_id_left), ("R", label_id_left + 1000)):
            local_code = f"{hemisphere}_{local_stub}"
            name = f"{area_name} ({raw_abbrev}) (hemisferio {_HEMISPHERE_NAMES[hemisphere]})"
            regions.append(
                MacaqueRegion(
                    id=build_id(EntityType.REGION, "macaque", "wang2017", local_code),
                    name=name,
                    abbreviation=raw_abbrev,
                    lobe=lobe,
                    gyrus=gyrus,
                    label_id=label_id,
                    hemisphere=hemisphere,
                )
            )
    return regions


def read_macaque_coordinates(atlas_nii_path: Path) -> list[MacaqueCoordinate]:
    """Para cada una de las 160 regiones, calcula el vóxel real más
    cercano al centroide de sus vóxeles en el propio volumen de
    etiquetas, convertido a milímetros con la matriz affine de ESE MISMO
    volumen (nunca la de `INIA19_brain.nii`, que tiene un origen y una
    forma ligeramente distintos -- ver docstring del módulo). Mismo
    principio que `brainnetome.read_brainnetome_coordinates`: el vóxel
    real más cercano, nunca el centroide interpolado."""
    import nibabel as nib

    img = nib.load(str(atlas_nii_path))
    data = np.asarray(img.dataobj)
    affine = img.affine

    regions = regions_from_definitions()
    coordinates: list[MacaqueCoordinate] = []
    for region in regions:
        voxel_indices = np.argwhere(data == region.label_id)
        if voxel_indices.size == 0:
            raise ValueError(
                f"La etiqueta {region.label_id} ({region.id}) no tiene ningún vóxel en el volumen"
            )
        n = voxel_indices.shape[0]
        homogeneous = np.hstack([voxel_indices, np.ones((n, 1))])
        world_points = (affine @ homogeneous.T).T[:, :3]
        x, y, z = representative_point(world_points)

        coordinates.append(
            MacaqueCoordinate(
                id=build_id(EntityType.COORDINATE, "macaque", "wang2017",
                            region.id.rsplit(".", 1)[-1]),
                entity_id=region.id,
                x=float(x), y=float(y), z=float(z),
                reference_space=REFERENCE_SPACE,
            )
        )
    return coordinates
