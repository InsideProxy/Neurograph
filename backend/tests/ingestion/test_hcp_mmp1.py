from pathlib import Path

import pytest

from backend.ingestion.neuroimaging.cifti_labels import CiftiLabel, read_cifti_labels
from backend.ingestion.neuroimaging.hcp_mmp1 import (
    ATLAS_ID,
    SPECIES_ID,
    read_mmp1_regions,
    regions_from_labels,
)


def test_regions_from_labels_excludes_background():
    labels = [CiftiLabel(0, "???", (1, 1, 1, 0)), CiftiLabel(1, "R_V1_ROI", (0, 0, 0, 1))]
    regions = regions_from_labels(labels)
    assert len(regions) == 1
    assert regions[0].raw_label == "R_V1_ROI"


def test_regions_from_labels_builds_stable_ontology_id():
    labels = [CiftiLabel(1, "R_V1_ROI", (0, 0, 0, 1))]
    regions = regions_from_labels(labels)
    assert regions[0].id == "region.human.hcp-mmp1.r_v1"


def test_regions_from_labels_left_and_right_are_distinct_regions():
    labels = [CiftiLabel(1, "L_V1_ROI", (0, 0, 0, 1)), CiftiLabel(2, "R_V1_ROI", (0, 0, 0, 1))]
    regions = regions_from_labels(labels)
    ids = {r.id for r in regions}
    assert ids == {"region.human.hcp-mmp1.l_v1", "region.human.hcp-mmp1.r_v1"}


def test_regions_from_labels_rejects_unexpected_format():
    labels = [CiftiLabel(1, "algo_raro", (0, 0, 0, 1))]
    with pytest.raises(ValueError):
        regions_from_labels(labels)


def test_atlas_and_species_ids_follow_ontology_scheme():
    assert SPECIES_ID == "species.human.ncbi-taxonomy.9606"
    assert ATLAS_ID == "atlas.human.hcp.mmp1_0"


_REAL_DLABEL_PATH = (
    Path.home() / "mnt" / "NeuroData" / "derived" / "extracted" / "hcp_s1200_groupavg"
    / "HCP_S1200_Atlas_Z4_pkXDZ"
    / "Q1-Q6_RelatedValidation210.CorticalAreas_dil_Final_Final_Areas_Group_Colors.32k_fs_LR.dlabel.nii"
)


@pytest.mark.skipif(
    not _REAL_DLABEL_PATH.exists(),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada",
)
def test_read_mmp1_regions_against_real_hcp_file():
    labels = read_cifti_labels(_REAL_DLABEL_PATH)
    assert len(labels) == 361  # 360 áreas + fondo "???"

    regions = read_mmp1_regions(_REAL_DLABEL_PATH)
    assert len(regions) == 360
    assert len({r.id for r in regions}) == 360  # todos los ids son únicos
    assert sum(1 for r in regions if r.hemisphere == "L") == 180
    assert sum(1 for r in regions if r.hemisphere == "R") == 180
