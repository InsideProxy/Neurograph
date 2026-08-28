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


def test_representative_point_returns_a_real_point_not_the_centroid():
    import numpy as np
    from backend.ingestion.neuroimaging.hcp_mmp1 import representative_point

    points = np.array([[0.0, 0.0, 0.0], [10.0, 0.0, 0.0], [0.0, 10.0, 0.0]])
    rep = representative_point(points)
    # el representante debe ser exactamente uno de los puntos originales
    assert any(np.array_equal(rep, p) for p in points)


def test_representative_point_picks_the_one_closest_to_the_mean():
    import numpy as np
    from backend.ingestion.neuroimaging.hcp_mmp1 import representative_point

    points = np.array([[0.0, 0.0, 0.0], [1.0, 0.0, 0.0], [100.0, 0.0, 0.0]])
    # centroide ~ (33.67, 0, 0) -> el más cercano es (1, 0, 0), no el centroide en si
    rep = representative_point(points)
    assert list(rep) == [1.0, 0.0, 0.0]


_REAL_SURF_L = _REAL_DLABEL_PATH.parent / "S1200.L.midthickness_MSMAll.32k_fs_LR.surf.gii"
_REAL_SURF_R = _REAL_DLABEL_PATH.parent / "S1200.R.midthickness_MSMAll.32k_fs_LR.surf.gii"


@pytest.mark.skipif(
    not (_REAL_DLABEL_PATH.exists() and _REAL_SURF_L.exists() and _REAL_SURF_R.exists()),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada",
)
def test_read_mmp1_coordinates_against_real_hcp_files():
    from backend.ingestion.neuroimaging.hcp_mmp1 import read_mmp1_coordinates

    coords = read_mmp1_coordinates(_REAL_DLABEL_PATH, _REAL_SURF_L, _REAL_SURF_R)
    assert len(coords) == 360
    assert len({c.id for c in coords}) == 360
    assert all(c.reference_space == "fsLR_32k_S1200_groupavg_midthickness_MSMAll" for c in coords)

    # convención esperada: hemisferio izquierdo -> x negativa; derecho -> x positiva
    left = [c for c in coords if ".l_" in c.id]
    right = [c for c in coords if ".r_" in c.id]
    assert len(left) == 180 and len(right) == 180
    assert all(c.x < 0 for c in left)
    assert all(c.x > 0 for c in right)
