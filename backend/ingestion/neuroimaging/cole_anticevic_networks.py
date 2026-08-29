"""Clasificación de las regiones de HCP-MMP1.0 en las 12 redes funcionales
de la parcelación Cole-Anticevic (Ji et al., 2019, NeuroImage), distribuida
dentro del mismo paquete HCP S1200 Group Average
(`CortexSubcortex_ColeAnticevic_NetPartition_wSubcorGSR_netassignments_LR.dlabel.nii`).

Esa parcelación está definida vértice a vértice (grayordinates), no región
a región, así que no hay una "red de la región X" en el archivo original:
hay que decidir, para cada una de las 360 regiones de HCP-MMP1.0, a qué red
pertenece la mayoría de sus vértices. Eso es un dato DERIVADO (sección 24),
nunca una etiqueta que venga ya puesta en el atlas — por eso cada
pertenencia registra su `confidence` (fracción de vértices que coinciden
con la red mayoritaria, sobre los vértices con alguna red asignada) y su
`method`, nunca opcionales.

Los vértices de una región que caen en la etiqueta de fondo de la
parcelación Cole-Anticevic ('???', sin red) se excluyen del voto: no
cuentan ni a favor ni en contra de ninguna red, porque no dicen nada sobre
la red de esa región, solo que esos vértices en concreto quedaron fuera de
la parcelación funcional. Si TODOS los vértices de una región caen en
fondo, esa región se deja sin pertenencia (permanece "sin red asignada" en
la interfaz) en vez de forzar una red arbitraria.

Alineación entre archivos: se comprobó (28/08/2026) que los primeros
59 412 grayordinates de este archivo (toda la corteza) coinciden
exactamente, índice a índice, en estructura y vértice, con los del archivo
de HCP-MMP1.0 — ambos usan el mismo espacio de grayordinates estándar del
HCP S1200. La correspondencia por índice es válida sin necesidad de volver
a cruzar por coordenadas.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from backend.ingestion.neuroimaging.cifti_labels import read_cifti_labels
from backend.ontology.schema import EntityType, build_id

_BACKGROUND_LABEL = "???"


@dataclass(frozen=True)
class NetworkDef:
    id: str
    name: str
    raw_label: str
    slug: str


@dataclass(frozen=True)
class RegionNetworkAssignment:
    id: str
    region_id: str
    network_id: str
    confidence: float
    method: str
    n_region_vertices: int
    n_majority_vertices: int


def network_slug(raw_label: str) -> str:
    """`Cingulo-Opercular` -> `cingulo-opercular`. Nunca se inventa un
    nombre distinto del que trae el archivo: solo se normaliza a
    minúsculas con espacios como guiones, para usarlo como clave estable
    (identificador y clave de tema en el frontend)."""
    return raw_label.strip().lower().replace(" ", "-")


def read_networks(ca_dlabel_path: Path) -> list[NetworkDef]:
    """Lee las redes reales declaradas en la tabla de etiquetas del
    archivo Cole-Anticevic (excluyendo la etiqueta de fondo)."""
    networks = []
    for label in read_cifti_labels(ca_dlabel_path):
        if label.name == _BACKGROUND_LABEL:
            continue
        slug = network_slug(label.name)
        network_id = build_id(EntityType.NETWORK, "human", "cole-anticevic", slug)
        networks.append(NetworkDef(id=network_id, name=label.name, raw_label=label.name, slug=slug))
    return networks


def region_network_assignments(
    mmp_dlabel_path: Path, ca_dlabel_path: Path
) -> list[RegionNetworkAssignment]:
    """Para cada región de HCP-MMP1.0, calcula por voto mayoritario a qué
    red de Cole-Anticevic pertenece la mayoría de sus vértices corticales.
    """
    import nibabel as nib

    from backend.ingestion.neuroimaging.hcp_mmp1 import _region_local_code

    mmp_img = nib.load(str(mmp_dlabel_path))
    mmp_data = mmp_img.get_fdata()[0]
    mmp_labels = mmp_img.header.get_axis(0).label[0]

    ca_img = nib.load(str(ca_dlabel_path))
    ca_data = ca_img.get_fdata()[0]
    ca_label_table = ca_img.header.get_axis(0).label[0]
    ca_index_to_name = {index: name for index, (name, _rgba) in ca_label_table.items()}

    n_cortex = mmp_data.shape[0]
    ca_cortex = ca_data[:n_cortex]

    networks_by_slug = {net.slug: net for net in read_networks(ca_dlabel_path)}

    assignments: list[RegionNetworkAssignment] = []
    for label_index, (raw_label, _rgba) in mmp_labels.items():
        if raw_label == "???":
            continue
        local_code = _region_local_code(raw_label)
        region_mask = mmp_data == label_index
        n_region_vertices = int(region_mask.sum())

        ca_values = ca_cortex[region_mask]
        ca_names = [ca_index_to_name[int(v)] for v in ca_values]
        non_background = [name for name in ca_names if name != _BACKGROUND_LABEL]
        if not non_background:
            # Ningún vértice de esta región cae dentro de la parcelación
            # funcional: se deja sin pertenencia, no se fuerza una red.
            continue

        counts = Counter(non_background)
        majority_name, n_majority = counts.most_common(1)[0]
        confidence = n_majority / len(non_background)

        network = networks_by_slug[network_slug(majority_name)]
        region_id = build_id(EntityType.REGION, "human", "hcp-mmp1", local_code)
        membership_id = build_id(
            EntityType.MEMBERSHIP, "human", "cole-anticevic", local_code
        )
        assignments.append(
            RegionNetworkAssignment(
                id=membership_id,
                region_id=region_id,
                network_id=network.id,
                confidence=confidence,
                method=(
                    "voto_mayoritario_de_vertices_hcp_mmp1_sobre_la_particion_"
                    "cole_anticevic_wsubcorgsr_netassignments_lr_excluyendo_fondo"
                ),
                n_region_vertices=n_region_vertices,
                n_majority_vertices=n_majority,
            )
        )
    return assignments


def subcortical_network_distribution(
    ca_dlabel_path: Path, cifti_structure_name: str, region_id: str
) -> list[RegionNetworkAssignment]:
    """Distribución COMPLETA de redes de Cole-Anticevic sobre los
    grayordinates de una estructura subcortical (identificada por su
    nombre CIFTI_STRUCTURE_*, ver `hcp_subcortical_structures.py`) --
    nunca un único ganador por voto mayoritario.

    Decisión (con la usuaria, 29/08/2026, ver
    docs/analisis-arquitectura.md): a diferencia de
    `region_network_assignments()` (una región de HCP-MMP1.0,
    anatómicamente pequeña y funcionalmente homogénea, donde un único
    ganador con alta confianza es representativo), una estructura como
    el cerebelo tiene una organización funcional DISTRIBUIDA por
    diseño -- no hay una única red "verdadera" a la que pertenezca.
    Comprobado empíricamente sobre el archivo real (29/08/2026): el
    cerebelo izquierdo reparte sus grayordinates entre las 10 de las 12
    redes presentes en absoluto, con la red mayoritaria (Frontoparietal)
    quedándose en apenas ~30% -- forzar un único ganador ocultaría el
    70% restante de la señal real. Se registra una fila por cada red
    presente, sin filtrar ninguna por pequeña que sea su fracción
    (sección 24): `confidence` = fracción de grayordinates de la
    estructura que caen en esa red.
    """
    import nibabel as nib

    img = nib.load(str(ca_dlabel_path))
    data = img.get_fdata()[0]
    label_table = img.header.get_axis(0).label[0]
    index_to_name = {index: name for index, (name, _rgba) in label_table.items()}

    brain_model = img.header.get_axis(1)
    structure_per_grayordinate = np.asarray(brain_model.name)
    mask = structure_per_grayordinate == cifti_structure_name
    n_total = int(mask.sum())
    if n_total == 0:
        raise ValueError(
            f"la estructura {cifti_structure_name!r} no tiene grayordinates en este archivo"
        )

    values = data[mask]
    names = [index_to_name[int(v)] for v in values]
    non_background = [name for name in names if name != _BACKGROUND_LABEL]
    if not non_background:
        return []

    networks_by_slug = {net.slug: net for net in read_networks(ca_dlabel_path)}
    n_with_network = len(non_background)
    counts = Counter(non_background)

    local_code = region_id.rsplit(".", 1)[-1]
    assignments: list[RegionNetworkAssignment] = []
    for network_name, n_network in counts.most_common():
        network = networks_by_slug[network_slug(network_name)]
        network_local_code = network.id.rsplit(".", 1)[-1]
        confidence = n_network / n_with_network
        membership_id = build_id(
            EntityType.MEMBERSHIP, "human", "cole-anticevic",
            f"{local_code}__{network_local_code}",
        )
        assignments.append(
            RegionNetworkAssignment(
                id=membership_id,
                region_id=region_id,
                network_id=network.id,
                confidence=confidence,
                method=(
                    "distribucion_completa_de_grayordinates_sobre_la_particion_"
                    "cole_anticevic_wsubcorgsr_netassignments_lr_excluyendo_fondo_"
                    "sin_voto_mayoritario_unico_estructura_funcionalmente_distribuida"
                ),
                n_region_vertices=n_total,
                n_majority_vertices=n_network,
            )
        )
    return assignments
