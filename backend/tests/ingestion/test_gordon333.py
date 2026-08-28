from pathlib import Path

import pytest

from backend.ingestion.neuroimaging.cifti_labels import CiftiLabel
from backend.ingestion.neuroimaging.gordon333 import (
    ATLAS_ID,
    SPECIES_ID,
    networks_from_labels,
    parse_cortical_label,
    region_network_memberships,
    regions_from_labels,
)


def test_parse_cortical_label_extracts_hemisphere_network_and_index():
    parsed = parse_cortical_label("L_Default_12")
    assert parsed.hemisphere == "L"
    assert parsed.network_token == "Default"
    assert parsed.index == "12"


def test_parse_cortical_label_rejects_subcortical_labels():
    # Las etiquetas subcorticales del archivo no tienen datos reales
    # detrás (ver docstring del módulo): nunca deben aceptarse aquí.
    with pytest.raises(ValueError):
        parse_cortical_label("L_Amygdala")
    with pytest.raises(ValueError):
        parse_cortical_label("BrainStem")


def test_regions_from_labels_builds_stable_ontology_id():
    labels = [CiftiLabel(1, "L_Default_12", (0, 0, 0, 1))]
    regions = regions_from_labels(labels)
    assert regions[0].id == "region.human.gordon333.l_default_12"


def test_regions_from_labels_excludes_background():
    labels = [CiftiLabel(0, "???", (1, 1, 1, 0)), CiftiLabel(1, "R_Visual_3", (0, 0, 0, 1))]
    regions = regions_from_labels(labels)
    assert len(regions) == 1


def test_networks_from_labels_excludes_the_unassigned_none_group():
    labels = [
        CiftiLabel(1, "L_Default_1", (0, 0, 0, 1)),
        CiftiLabel(2, "R_Default_1", (0, 0, 0, 1)),
        CiftiLabel(3, "L_None_1", (0, 0, 0, 1)),
    ]
    networks = networks_from_labels(labels)
    assert len(networks) == 1
    assert networks[0].slug == "default"


def test_atlas_and_species_ids_follow_ontology_scheme():
    assert SPECIES_ID == "species.human.ncbi-taxonomy.9606"
    assert ATLAS_ID == "atlas.human.gordon333.cortex"


_HCP_DIR = (
    Path.home() / "mnt" / "NeuroData" / "derived" / "extracted" / "hcp_s1200_groupavg"
    / "HCP_S1200_Atlas_Z4_pkXDZ"
)
_DLABEL_PATH = _HCP_DIR / "Gordon333.32k_fs_LR.dlabel.nii"
_SURF_L = _HCP_DIR / "S1200.L.midthickness_MSMAll.32k_fs_LR.surf.gii"
_SURF_R = _HCP_DIR / "S1200.R.midthickness_MSMAll.32k_fs_LR.surf.gii"

_REQUIRES_REAL_DATA = pytest.mark.skipif(
    not _DLABEL_PATH.exists(), reason="requiere la biblioteca de datos real (E:\\NeuroData) montada"
)


@_REQUIRES_REAL_DATA
def test_read_gordon333_regions_against_real_file_excludes_empty_subcortical_labels():
    from backend.ingestion.neuroimaging.gordon333 import read_gordon333_regions

    regions = read_gordon333_regions(_DLABEL_PATH)
    # 333 parcelas corticales reales; las 19 etiquetas subcorticales del
    # archivo no tienen ningún grayordinate real y deben quedar fuera.
    assert len(regions) == 333
    assert len({r.id for r in regions}) == 333
    assert all(".l_" in r.id or ".r_" in r.id for r in regions)


@_REQUIRES_REAL_DATA
def test_read_gordon333_networks_against_real_file():
    from backend.ingestion.neuroimaging.gordon333 import read_gordon333_networks

    networks = read_gordon333_networks(_DLABEL_PATH)
    assert len(networks) == 12
    slugs = {n.slug for n in networks}
    assert "default" in slugs
    assert "visual" in slugs
    assert "none" not in slugs


@_REQUIRES_REAL_DATA
def test_region_network_memberships_against_real_file():
    memberships = region_network_memberships(_DLABEL_PATH)
    # 333 parcelas - 47 sin red asignada ("None") = 286
    assert len(memberships) == 286
    assert len({m.id for m in memberships}) == 286
    assert all(m.confidence == 1.0 for m in memberships)


@_REQUIRES_REAL_DATA
def test_read_gordon333_coordinates_against_real_files():
    from backend.ingestion.neuroimaging.gordon333 import read_gordon333_coordinates

    coords = read_gordon333_coordinates(_DLABEL_PATH, _SURF_L, _SURF_R)
    assert len(coords) == 333
    assert len({c.id for c in coords}) == 333
    assert all(c.reference_space == "fsLR_32k_S1200_groupavg_midthickness_MSMAll" for c in coords)

    left = [c for c in coords if ".l_" in c.id]
    right = [c for c in coords if ".r_" in c.id]
    assert all(c.x < 0 for c in left)
    assert all(c.x > 0 for c in right)
