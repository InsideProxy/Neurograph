from pathlib import Path

import pytest

from backend.ingestion.neuroimaging.cole_anticevic_networks import (
    network_slug,
    read_networks,
    region_network_assignments,
    subcortical_network_distribution,
)


def test_network_slug_normalizes_spaces_and_case():
    assert network_slug("Cingulo-Opercular") == "cingulo-opercular"
    assert network_slug("Dorsal Attention") == "dorsal-attention"
    assert network_slug("Visual2") == "visual2"


_HCP_DIR = (
    Path.home() / "mnt" / "NeuroData" / "derived" / "extracted" / "hcp_s1200_groupavg"
    / "HCP_S1200_Atlas_Z4_pkXDZ"
)
_MMP_DLABEL_PATH = (
    _HCP_DIR / "Q1-Q6_RelatedValidation210.CorticalAreas_dil_Final_Final_Areas_Group_Colors.32k_fs_LR.dlabel.nii"
)
_CA_DLABEL_PATH = (
    _HCP_DIR / "CortexSubcortex_ColeAnticevic_NetPartition_wSubcorGSR_netassignments_LR.dlabel.nii"
)

_REQUIRES_REAL_DATA = pytest.mark.skipif(
    not (_MMP_DLABEL_PATH.exists() and _CA_DLABEL_PATH.exists()),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada",
)


@_REQUIRES_REAL_DATA
def test_read_networks_against_real_file():
    networks = read_networks(_CA_DLABEL_PATH)
    # las 12 redes de Cole-Anticevic (Ji et al., 2019), sin la etiqueta de fondo
    assert len(networks) == 12
    assert len({n.id for n in networks}) == 12
    slugs = {n.slug for n in networks}
    assert "somatomotor" in slugs
    assert "default" in slugs
    assert "cingulo-opercular" in slugs


@_REQUIRES_REAL_DATA
def test_region_network_assignments_against_real_files():
    assignments = region_network_assignments(_MMP_DLABEL_PATH, _CA_DLABEL_PATH)
    # puede haber menos de 360 si alguna región cae entera en el fondo de
    # la partición Cole-Anticevic; nunca más de 360.
    assert 0 < len(assignments) <= 360
    assert len({a.id for a in assignments}) == len(assignments)
    assert len({a.region_id for a in assignments}) == len(assignments)  # una por región
    assert all(0.0 < a.confidence <= 1.0 for a in assignments)
    assert all(a.n_majority_vertices <= a.n_region_vertices for a in assignments)

    # V1 es corteza visual primaria: debe caer en una red visual con alta
    # confianza, no es un caso ambiguo.
    v1_left = next(a for a in assignments if a.region_id == "region.human.hcp-mmp1.l_v1")
    assert "visual" in v1_left.network_id
    assert v1_left.confidence > 0.8


@_REQUIRES_REAL_DATA
def test_subcortical_network_distribution_against_real_file():
    assignments = subcortical_network_distribution(
        _CA_DLABEL_PATH, "CIFTI_STRUCTURE_CEREBELLUM_LEFT", "region.human.hcp-subcortex.l_cerebellum"
    )
    # Comprobado empíricamente el 29/08/2026: el cerebelo izquierdo tiene
    # las 10 (de 12) redes presentes en algún grado, nunca un único
    # ganador -- por eso aquí se esperan varias filas, no como máximo 1.
    assert len(assignments) == 10
    assert len({a.id for a in assignments}) == 10
    assert all(a.region_id == "region.human.hcp-subcortex.l_cerebellum" for a in assignments)
    # ninguna fila filtrada por pequeña que sea su fracción (sección 24):
    # las sumas de confidence deben cubrir el 100% de los grayordinates
    # con red asignada, no una submuestra recortada por umbral.
    assert abs(sum(a.confidence for a in assignments) - 1.0) < 1e-9
    assert all(0.0 < a.confidence <= 1.0 for a in assignments)

    # la red mayoritaria real es Frontoparietal (~30%), no una red
    # arbitraria ni el 100% que tendría un voto mayoritario forzado
    top = max(assignments, key=lambda a: a.confidence)
    assert "frontoparietal" in top.network_id
    assert 0.25 < top.confidence < 0.35


@_REQUIRES_REAL_DATA
def test_subcortical_network_distribution_raises_on_unknown_structure():
    with pytest.raises(ValueError):
        subcortical_network_distribution(_CA_DLABEL_PATH, "CIFTI_STRUCTURE_NO_EXISTE", "region.x.y.z")
