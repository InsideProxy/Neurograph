from pathlib import Path

import numpy as np
import pytest

from backend.ingestion.neuroimaging.hcp_mmp1 import representative_point
from backend.ingestion.neuroimaging.surface_parcels import (
    NO_REGION,
    build_surface_parcel_map,
    representative_vertex_index,
    sulc_hull_correlation,
)

_LEFT = "CIFTI_STRUCTURE_CORTEX_LEFT"
_RIGHT = "CIFTI_STRUCTURE_CORTEX_RIGHT"


def _surfaces():
    # 4 vértices por hemisferio, coordenadas sintéticas distintas.
    left = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0], [5, 5, 5]], dtype=np.float32)
    right = np.array([[10, 0, 0], [11, 0, 0], [10, 1, 0], [15, 5, 5]], dtype=np.float32)
    return {"L": left, "R": right}


def _build(labels, structures, vertices, names):
    return build_surface_parcel_map(
        atlas_id="atlas.human.prueba.x",
        reference_space="espacio_de_prueba",
        label_per_grayordinate=np.array(labels, dtype=float),
        label_names=names,
        structure_per_grayordinate=np.array(structures),
        vertex_per_grayordinate=np.array(vertices),
        surf_coords=_surfaces(),
        region_id_for_label=lambda raw: f"region.human.prueba.{raw.lower()}",
        hemisphere_for_label=lambda raw: raw[0],
    )


_NAMES = {0: "???", 1: "L_A", 2: "R_B"}


def test_vertices_are_mapped_left_then_right_with_the_same_region_ids():
    # La pared medial (vértice 3 de cada hemisferio) no es grayordinate.
    parcel_map = _build(
        labels=[1, 1, 0, 2, 2, 2],
        structures=[_LEFT, _LEFT, _LEFT, _RIGHT, _RIGHT, _RIGHT],
        vertices=[0, 1, 2, 0, 1, 2],
        names=_NAMES,
    )
    assert parcel_map.region_ids == ("region.human.prueba.l_a", "region.human.prueba.r_b")
    assert parcel_map.vertex_region_index.tolist() == [0, 0, NO_REGION, NO_REGION, 1, 1, 1, NO_REGION]


def test_anchor_vertex_is_global_and_matches_representative_point():
    surfaces = _surfaces()
    parcel_map = _build(
        labels=[1, 1, 1, 2, 2, 2],
        structures=[_LEFT, _LEFT, _LEFT, _RIGHT, _RIGHT, _RIGHT],
        vertices=[0, 1, 2, 0, 1, 2],
        names=_NAMES,
    )
    all_vertices = np.concatenate([surfaces["L"], surfaces["R"]])
    for region_index, hemi in ((0, "L"), (1, "R")):
        anchor = parcel_map.anchor_vertices[region_index]
        expected = representative_point(surfaces[hemi][[0, 1, 2]])
        assert np.array_equal(all_vertices[anchor], expected)
    # El ancla del hemisferio derecho está desplazada por los vértices del izquierdo.
    assert parcel_map.anchor_vertices[1] >= 4


def test_representative_vertex_index_agrees_with_representative_point():
    points = np.array([[0, 0, 0], [2, 0, 0], [0, 2, 0], [0.9, 0.8, 0]], dtype=np.float32)
    assert np.array_equal(points[representative_vertex_index(points)], representative_point(points))


def test_region_in_the_wrong_hemisphere_is_an_error_not_ignored():
    with pytest.raises(ValueError):
        _build(labels=[1, 1], structures=[_LEFT, _RIGHT], vertices=[0, 0], names=_NAMES)


def test_label_outside_cortex_is_an_error_not_ignored():
    with pytest.raises(ValueError):
        _build(
            labels=[1, 2],
            structures=[_LEFT, "CIFTI_STRUCTURE_THALAMUS_LEFT"],
            vertices=[0, 0],
            names=_NAMES,
        )


def test_background_outside_cortex_is_accepted():
    parcel_map = _build(
        labels=[1, 0],
        structures=[_LEFT, "CIFTI_STRUCTURE_THALAMUS_LEFT"],
        vertices=[0, 0],
        names=_NAMES,
    )
    assert parcel_map.region_ids == ("region.human.prueba.l_a",)


def test_label_missing_from_table_is_an_error():
    with pytest.raises(ValueError):
        _build(labels=[7], structures=[_LEFT], vertices=[0], names=_NAMES)


def test_sulc_hull_correlation_detects_sign():
    # Puntos en las caras de un cubo (distancia 0 al casco) y otros hacia
    # dentro: "más hondo" = más lejos del casco.
    rng = np.random.default_rng(0)
    outer = rng.uniform(-1, 1, size=(200, 3))
    outer[np.arange(200), rng.integers(0, 3, 200)] = rng.choice([-1.0, 1.0], 200)
    inner = rng.uniform(-0.5, 0.5, size=(200, 3))
    points = np.concatenate([outer, inner])
    depth_positive_is_gyrus = np.concatenate([np.ones(200), -np.ones(200)])
    assert sulc_hull_correlation(points, depth_positive_is_gyrus) < 0
    assert sulc_hull_correlation(points, -depth_positive_is_gyrus) > 0


_HCP_DIR = (
    Path.home() / "mnt" / "NeuroData" / "derived" / "extracted" / "hcp_s1200_groupavg"
    / "HCP_S1200_Atlas_Z4_pkXDZ"
)
_MMP_DLABEL = (
    _HCP_DIR / "Q1-Q6_RelatedValidation210.CorticalAreas_dil_Final_Final_Areas_Group_Colors.32k_fs_LR.dlabel.nii"
)
_SURF_L = _HCP_DIR / "S1200.L.midthickness_MSMAll.32k_fs_LR.surf.gii"
_SURF_R = _HCP_DIR / "S1200.R.midthickness_MSMAll.32k_fs_LR.surf.gii"


@pytest.mark.skipif(
    not _MMP_DLABEL.exists(),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada",
)
def test_real_mmp1_surface_map_matches_ingestion_exactly():
    from backend.ingestion.neuroimaging import hcp_mmp1
    from backend.ingestion.neuroimaging.surface_parcels import load_surfaces, read_surface_parcel_map

    parcel_map = read_surface_parcel_map("hcp_mmp1", _MMP_DLABEL, _SURF_L, _SURF_R)
    assert set(parcel_map.region_ids) == {r.id for r in hcp_mmp1.read_mmp1_regions(_MMP_DLABEL)}

    surfaces = load_surfaces(_SURF_L, _SURF_R)
    all_vertices = np.concatenate([surfaces["L"], surfaces["R"]])
    coords = {
        c.entity_id: (c.x, c.y, c.z)
        for c in hcp_mmp1.read_mmp1_coordinates(_MMP_DLABEL, _SURF_L, _SURF_R)
    }
    for region_id, anchor in zip(parcel_map.region_ids, parcel_map.anchor_vertices, strict=True):
        assert tuple(float(x) for x in all_vertices[anchor]) == coords[region_id]
    # 64 984 vértices en total; 59 412 son grayordinates corticales (el resto, pared medial).
    assert len(parcel_map.vertex_region_index) == 64984
    assert int((parcel_map.vertex_region_index >= 0).sum()) == 59412
