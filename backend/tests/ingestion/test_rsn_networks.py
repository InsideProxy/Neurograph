from pathlib import Path

import numpy as np
import pytest

from backend.ingestion.neuroimaging.rsn_networks import (
    SOURCE_POWER,
    SOURCE_YEO7,
    Cifti1LabelMap,
    LabelEntry,
    majority_vote_memberships,
    power_vertex_network_map,
    yeo_vertex_network_map,
)

_YEO7_RGB = {
    1: (120, 18, 133),
    2: (70, 130, 180),
    3: (0, 118, 14),
    4: (196, 57, 249),
    5: (220, 248, 163),
    6: (230, 147, 33),
    7: (205, 61, 78),
}


def _yeo7_map(values):
    labels = {0: LabelEntry(0, "???", (170, 170, 170)), 37: LabelEntry(37, "FreeSurfer_Defined_Medial_Wall", (0, 0, 0))}
    # Claves del archivo real: 7Networks_k no va en orden de clave.
    for key, number in zip((41, 43, 38, 44, 42, 39, 40), (1, 2, 3, 4, 5, 6, 7), strict=True):
        labels[key] = LabelEntry(key, f"7Networks_{number}", _YEO7_RGB[number])
    return Cifti1LabelMap(name="7", labels=labels, values=np.array(values))


def test_yeo7_networks_are_named_and_ordered_by_the_original_numbering():
    label_map = _yeo7_map([41, 43, 38, 44, 42, 39, 40, 37, 0])
    network_map = yeo_vertex_network_map(label_map, 7)
    assert [n.slug for n in network_map.networks] == [
        "yeo2011-7.vis",
        "yeo2011-7.sommot",
        "yeo2011-7.dorsattn",
        "yeo2011-7.salventattn",
        "yeo2011-7.limbic",
        "yeo2011-7.cont",
        "yeo2011-7.default",
    ]
    # La pared medial y el fondo no son ninguna red.
    assert network_map.vertex_network_index.tolist() == [0, 1, 2, 3, 4, 5, 6, -1, -1]
    assert network_map.networks[0].id == "network.human.yeo2011-7.vis"


def test_yeo_color_that_does_not_match_cbig_is_an_error():
    label_map = _yeo7_map([41, 43, 38, 44, 42, 39, 40])
    label_map.labels[41] = LabelEntry(41, "7Networks_1", (0, 0, 0))
    with pytest.raises(ValueError):
        yeo_vertex_network_map(label_map, 7)


def test_yeo_missing_network_is_an_error():
    with pytest.raises(ValueError):
        yeo_vertex_network_map(_yeo7_map([41, 43]), 7)


def _power_map(values, extra=None):
    labels = {
        0: LabelEntry(0, "???", (170, 170, 170)),
        1: LabelEntry(1, "u1_Unassigned", (255, 255, 255)),
        2: LabelEntry(2, "u2_Ventral_frontal_temporal", (128, 128, 128)),
        3: LabelEntry(3, "a3_Default_mode", (255, 0, 0)),
        4: LabelEntry(4, 'a4_"Hand"_somatosensory-motor', (0, 255, 255)),
        28: LabelEntry(28, 'a4_"Hand"_somatosensory-motor', (0, 255, 255)),
    }
    labels.update(extra or {})
    return Cifti1LabelMap(name="power", labels=labels, values=np.array(values))


def test_power_merges_identical_names_and_never_uses_uncertain_communities():
    network_map = power_vertex_network_map(_power_map([3, 4, 28, 2, 1, 0]))
    assert [n.slug for n in network_map.networks] == [
        f"{SOURCE_POWER}.default-mode",
        f"{SOURCE_POWER}.hand-somatosensory-motor",
    ]
    assert network_map.vertex_network_index.tolist() == [0, 1, 1, -1, -1, -1]


def test_power_same_name_with_different_color_is_not_merged_silently():
    label_map = _power_map([3, 4, 28], extra={28: LabelEntry(28, 'a4_"Hand"_somatosensory-motor', (1, 2, 3))})
    with pytest.raises(ValueError):
        power_vertex_network_map(label_map)


def test_majority_vote_ignores_vertices_without_network_and_never_forces_one():
    # Las cinco últimas redes están en vértices sin región (-1), solo para
    # que el mapa tenga las 7 redes completas.
    network_map = yeo_vertex_network_map(_yeo7_map([41, 41, 43, 37, 37, 37, 0, 0, 38, 44, 42, 39, 40]), 7)
    # región 0: vértices 0-5 (dos Vis, un SomMot, tres pared medial); región 1: solo fondo.
    vertex_region_index = np.array([0, 0, 0, 0, 0, 0, 1, 1, -1, -1, -1, -1, -1])
    memberships = majority_vote_memberships(
        network_map,
        ("region.human.hcp-mmp1.l_a", "region.human.hcp-mmp1.l_b"),
        vertex_region_index,
        method="prueba",
    )
    assert len(memberships) == 1
    only = memberships[0]
    assert only.region_id == "region.human.hcp-mmp1.l_a"
    assert only.network_id == "network.human.yeo2011-7.vis"
    assert only.confidence == pytest.approx(2 / 3)
    assert only.id == f"membership.human.{SOURCE_YEO7}.l_a"


_RSN_FILE = (
    Path.home() / "mnt" / "NeuroData" / "derived" / "extracted" / "hcp_s1200_groupavg"
    / "HCP_S1200_Atlas_Z4_pkXDZ" / "RSN-networks.32k_fs_LR.dlabel.nii"
)


@pytest.mark.skipif(not _RSN_FILE.exists(), reason="requiere la biblioteca de datos real (E:\\NeuroData) montada")
def test_real_rsn_file_maps_are_pure_and_complete():
    from backend.ingestion.neuroimaging.rsn_networks import read_cifti1_dense_labels, read_rsn_vertex_maps

    raw_maps = read_cifti1_dense_labels(_RSN_FILE)
    # Orden de datos correcto: cada mapa solo contiene etiquetas de su familia.
    families = []
    for label_map in raw_maps:
        names = {label_map.labels[int(k)].name for k in np.unique(label_map.values)}
        families.append(
            {"yeo7" if n.startswith("7Networks") else "yeo17" if n.startswith("17Networks")
             else "otro" if n in ("???", "FreeSurfer_Defined_Medial_Wall") else "power" for n in names}
        )
    assert families[0] == {"yeo7", "otro"}
    assert families[1] == {"yeo17", "otro"}
    assert families[3] == {"power", "otro"}

    maps = read_rsn_vertex_maps(_RSN_FILE)
    assert len(maps["yeo2011-7"].networks) == 7
    assert len(maps["yeo2011-17"].networks) == 17
    assert len(maps["power2011"].networks) == 17
