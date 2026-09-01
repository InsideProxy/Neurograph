from pathlib import Path

import pytest

from backend.ingestion.neuroimaging.macaque_cortex_wang2017 import (
    ATLAS_ID,
    REGION_DEFINITIONS,
    SPECIES_ID,
    _sanitize_local_code,
    read_macaque_coordinates,
    regions_from_definitions,
)


def test_species_and_atlas_ids_follow_ontology_scheme():
    assert SPECIES_ID == "species.macaque.ncbi-taxonomy.9544"
    assert ATLAS_ID == "atlas.macaque.wang2017.cortex_lr160"


def test_sanitize_local_code_removes_slashes_and_spaces():
    assert _sanitize_local_code("9/46v/45") == "9-46v-45"
    assert _sanitize_local_code("PoCG-foot/leg") == "pocg-foot-leg"
    assert _sanitize_local_code("V1") == "v1"


def test_region_definitions_has_80_rows_matching_the_papers_own_lobe_breakdown():
    assert len(REGION_DEFINITIONS) == 80
    label_ids = [d[0] for d in REGION_DEFINITIONS]
    assert label_ids == list(range(1, 81))

    lobe_counts: dict[str, int] = {}
    for _, lobe, *_rest in REGION_DEFINITIONS:
        lobe_counts[lobe] = lobe_counts.get(lobe, 0) + 1
    # Desglose declarado en el resumen del artículo (Wang et al. 2017):
    # 14 frontal, 9 sensoriomotor, 13 parietal, 16 temporal, 16 occipital,
    # 12 límbico.
    assert lobe_counts == {
        "Frontal lobe": 14,
        "Sensorimotor": 9,
        "Parietal lobe": 13,
        "Temporal lobe": 16,
        "Occipital lobe": 16,
        "Limbic lobe": 12,
    }


def test_regions_from_definitions_builds_160_regions_both_hemispheres():
    regions = regions_from_definitions()
    assert len(regions) == 160
    assert len({r.id for r in regions}) == 160  # todos los ids son únicos

    left = [r for r in regions if r.hemisphere == "L"]
    right = [r for r in regions if r.hemisphere == "R"]
    assert len(left) == 80
    assert len(right) == 80
    # id_derecha = id_izquierda + 1000, convención propia del atlas.
    left_by_stub = {r.id.rsplit(".", 1)[-1][2:]: r.label_id for r in left}
    right_by_stub = {r.id.rsplit(".", 1)[-1][2:]: r.label_id for r in right}
    assert set(left_by_stub) == set(right_by_stub)
    for stub, left_label in left_by_stub.items():
        assert right_by_stub[stub] == left_label + 1000


def test_v1_region_is_present_with_expected_name_and_ids():
    regions = regions_from_definitions()
    v1_left = next(r for r in regions if r.abbreviation == "V1" and r.hemisphere == "L")
    assert v1_left.id == "region.macaque.wang2017.l_v1"
    assert v1_left.label_id == 60
    assert v1_left.lobe == "Occipital lobe"
    assert "area V1" in v1_left.name

    v1_right = next(r for r in regions if r.abbreviation == "V1" and r.hemisphere == "R")
    assert v1_right.label_id == 1060


def test_insula_abbreviations_use_capital_i_not_lowercase_l():
    regions = regions_from_definitions()
    insula_abbrevs = {r.abbreviation for r in regions if r.gyrus == "Insula (INS)"}
    assert insula_abbrevs == {"Ia", "Id", "Ig", "G"}


_ATLAS_NII_PATH = (
    Path.home() / "mnt" / "NeuroData" / "original" / "atlases"
    / "macaque_cortex_wang2017" / "Macaque_Cortex_Atlas_LR160_for_download.nii"
)

_REQUIRES_REAL_DATA = pytest.mark.skipif(
    not _ATLAS_NII_PATH.exists(),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada, "
           "con el zip ya descomprimido en macaque_cortex_wang2017/",
)


@_REQUIRES_REAL_DATA
def test_read_macaque_coordinates_against_real_file():
    coords = read_macaque_coordinates(_ATLAS_NII_PATH)
    assert len(coords) == 160
    assert len({c.id for c in coords}) == 160
    assert all(c.reference_space == "INIA19" for c in coords)

    v1_left = next(c for c in coords if c.entity_id == "region.macaque.wang2017.l_v1")
    # El volumen tiene origen (-42,-59,-30) y vóxel 1mm isotrópico: toda
    # coordenada real debe caer dentro de la caja del volumen (84x103x64
    # vóxeles) una vez trasladada por el affine.
    assert -42 <= v1_left.x <= 42
    assert -59 <= v1_left.y <= 44
    assert -30 <= v1_left.z <= 34
