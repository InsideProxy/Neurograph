from pathlib import Path

import pytest

from backend.ingestion.neuroimaging.brainnetome import (
    ATLAS_ID,
    SPECIES_ID,
    BrainnetomeRegionDef,
    _local_code,
    read_brainnetome_regions,
    regions_from_definitions,
)


def test_local_code_moves_hemisphere_to_the_front():
    assert _local_code("SFG_L(R)_7_1", "L") == "L_SFG_7_1"
    assert _local_code("SFG_L(R)_7_1", "R") == "R_SFG_7_1"


def test_local_code_rejects_unexpected_format():
    with pytest.raises(ValueError):
        _local_code("algo_raro", "L")


def test_regions_from_definitions_builds_stable_ontology_id():
    defs = [
        BrainnetomeRegionDef(
            label_id=1, hemisphere="L", local_code="L_SFG_7_1",
            name="A8m, medial area 8 (hemisferio izquierdo)", raw_bilateral_code="SFG_L(R)_7_1",
        )
    ]
    regions = regions_from_definitions(defs)
    assert regions[0].id == "region.human.brainnetome.l_sfg_7_1"


def test_atlas_and_species_ids_follow_ontology_scheme():
    assert SPECIES_ID == "species.human.ncbi-taxonomy.9606"
    assert ATLAS_ID == "atlas.human.brainnetome.bna_246"


_XLSX_PATH = Path.home() / "mnt" / "NeuroData" / "original" / "atlases" / "brainnetome" / "BNA_subregions.xlsx"
_ATLAS_NII_PATH = Path.home() / "mnt" / "NeuroData" / "original" / "atlases" / "brainnetome" / "BN_Atlas_246_2mm.nii.gz"

_REQUIRES_REAL_DATA = pytest.mark.skipif(
    not (_XLSX_PATH.exists() and _ATLAS_NII_PATH.exists()),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada",
)


@_REQUIRES_REAL_DATA
def test_read_brainnetome_regions_against_real_file():
    regions = read_brainnetome_regions(_XLSX_PATH)
    assert len(regions) == 246
    assert len({r.id for r in regions}) == 246
    assert sum(1 for r in regions if r.hemisphere == "L") == 123
    assert sum(1 for r in regions if r.hemisphere == "R") == 123


@_REQUIRES_REAL_DATA
def test_read_brainnetome_coordinates_against_real_files():
    from backend.ingestion.neuroimaging.brainnetome import read_brainnetome_coordinates

    coords = read_brainnetome_coordinates(_ATLAS_NII_PATH, _XLSX_PATH)
    assert len(coords) == 246
    assert len({c.id for c in coords}) == 246
    assert all(c.reference_space == "MNI152_FSL_2mm" for c in coords)

    left = [c for c in coords if ".l_" in c.id]
    right = [c for c in coords if ".r_" in c.id]
    assert len(left) == 123 and len(right) == 123
    # convención MNI: hemisferio izquierdo -> x negativa; derecho -> x positiva
    assert all(c.x < 0 for c in left)
    assert all(c.x > 0 for c in right)
