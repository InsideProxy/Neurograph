from backend.api.routers.regions import region_to_node
from backend.database.models.entities import Coordinate, Network, Region


def _region_and_coordinate(abbreviation=None, hemisphere=None):
    region = Region(id="region.human.hcp-mmp1.r_v1", name="V1 (hemisferio derecho)",
                     abbreviation=abbreviation, hemisphere=hemisphere,
                     species_id="species.human.ncbi-taxonomy.9606",
                     atlas_id="atlas.human.hcp.mmp1_0", synonyms=["R_V1_ROI"])
    coordinate = Coordinate(id="coordinate.human.hcp-mmp1.r_v1", entity_id=region.id,
                             x=14.2, y=-78.5, z=4.6,
                             reference_space="fsLR_32k_S1200_groupavg_midthickness_MSMAll")
    return region, coordinate


def test_region_to_node_without_network_is_explicitly_unclassified():
    region, coordinate = _region_and_coordinate()

    node = region_to_node(region, coordinate, network=None)

    assert node.id == "region.human.hcp-mmp1.r_v1"
    assert node.label == "V1 (hemisferio derecho)"
    assert node.abbreviation is None
    assert node.hemisphere is None
    assert node.network == "unclassified"
    assert node.position3d == (14.2, -78.5, 4.6)
    assert node.reference_space == "fsLR_32k_S1200_groupavg_midthickness_MSMAll"


def test_region_to_node_never_fabricates_an_abbreviation():
    # Si la ingesta de un atlas todavia no calcula/registra abreviatura
    # (migracion 0007), el endpoint debe devolver None, nunca inventar
    # una a partir del nombre completo -- principio de rigor (seccion 24).
    region, coordinate = _region_and_coordinate(abbreviation="V1")

    node = region_to_node(region, coordinate, network=None)

    assert node.abbreviation == "V1"


def test_region_to_node_carries_a_real_hemisphere_without_inferring_it():
    # Migracion 0008: el hemisferio real se traslada tal cual, nunca se
    # infiere del signo de la coordenada x (seccion 24). "R" aqui viene
    # de la propia region, no del valor x=14.2 (positivo) de la
    # coordenada de _region_and_coordinate.
    region, coordinate = _region_and_coordinate(hemisphere="R")

    node = region_to_node(region, coordinate, network=None)

    assert node.hemisphere == "R"


def test_region_to_node_never_fabricates_a_hemisphere():
    # None puede significar "todavia no backfillado" o "esta region no
    # tiene lateralidad real" (p. ej. el tronco del encefalo) -- en
    # ningun caso se adivina, ni siquiera del signo de x.
    region, coordinate = _region_and_coordinate(hemisphere=None)

    node = region_to_node(region, coordinate, network=None)

    assert node.hemisphere is None


def test_region_to_node_with_network_uses_a_source_qualified_slug():
    # No solo el código local ("visual"): distintas parcelaciones tienen
    # redes con el mismo nombre pero método distinto (p. ej.
    # Cole-Anticevic y Gordon 333 tienen las dos una red "Default"). El
    # slug lleva la fuente por delante para que nunca se confundan.
    region, coordinate = _region_and_coordinate()
    network = Network(id="network.human.cole-anticevic.visual", name="Visual")

    node = region_to_node(region, coordinate, network=network)

    assert node.network == "cole-anticevic.visual"


def test_region_to_node_disambiguates_networks_with_the_same_local_code():
    region, coordinate = _region_and_coordinate()
    ca_default = Network(id="network.human.cole-anticevic.default", name="Default")
    gordon_default = Network(id="network.human.gordon333.default", name="Default")

    ca_node = region_to_node(region, coordinate, network=ca_default)
    gordon_node = region_to_node(region, coordinate, network=gordon_default)

    assert ca_node.network != gordon_node.network
    assert ca_node.network == "cole-anticevic.default"
    assert gordon_node.network == "gordon333.default"


# --- Varias clasificaciones de red por región (decisión 73) ---

def _network(network_id):
    return Network(id=network_id, name=network_id)


def _m(network_id, algorithm="majority_vote", confidence=1.0):
    from backend.api.services.regions_service import MembershipRow

    return MembershipRow(_network(network_id), algorithm, confidence)


def test_choose_network_uses_the_atlas_default_source_when_none_is_requested():
    from backend.api.services.regions_service import choose_network

    region, _ = _region_and_coordinate()
    memberships = [_m("network.human.yeo2011-7.vis"), _m("network.human.cole-anticevic.visual")]
    assert choose_network(region, memberships, None).network.id == "network.human.cole-anticevic.visual"


def test_choose_network_uses_the_requested_source():
    from backend.api.services.regions_service import choose_network

    region, _ = _region_and_coordinate()
    memberships = [_m("network.human.yeo2011-7.vis"), _m("network.human.cole-anticevic.visual")]
    assert choose_network(region, memberships, "yeo2011-7").network.id == "network.human.yeo2011-7.vis"


def test_choose_network_never_borrows_a_network_from_another_source():
    from backend.api.services.regions_service import choose_network

    region, _ = _region_and_coordinate()
    assert choose_network(region, [_m("network.human.cole-anticevic.visual")], "yeo2011-17") is None


def test_choose_network_two_single_assignments_in_the_same_source_is_an_error():
    import pytest

    from backend.api.services.regions_service import choose_network

    region, _ = _region_and_coordinate()
    memberships = [_m("network.human.yeo2011-7.vis"), _m("network.human.yeo2011-7.default")]
    with pytest.raises(ValueError):
        choose_network(region, memberships, "yeo2011-7")


def test_choose_network_full_distribution_is_never_collapsed_into_one_network():
    # Caso real: el cerebelo del subcórtex del HCP tiene 10 pertenencias
    # a Cole-Anticevic con algorithm='full_distribution' (decisión 10).
    from backend.api.services.regions_service import choose_network

    region, _ = _region_and_coordinate()
    memberships = [
        _m("network.human.cole-anticevic.frontoparietal", "full_distribution"),
        _m("network.human.cole-anticevic.default", "full_distribution"),
    ]
    assert choose_network(region, memberships, "cole-anticevic") is None


def test_rows_with_several_memberships_produce_one_node_per_region():
    from backend.api.services.regions_service import _rows_to_nodes

    region, coordinate = _region_and_coordinate()
    rows = [
        (region, coordinate, _network("network.human.cole-anticevic.visual"), "majority_vote", 0.9),
        (region, coordinate, _network("network.human.yeo2011-7.vis"), "majority_vote", 0.28),
    ]
    nodes = _rows_to_nodes(rows, "yeo2011-7")
    assert len(nodes) == 1
    assert nodes[0].network == "yeo2011-7.vis"
    # La confianza real de la pertenencia elegida viaja con el nodo, nunca
    # la de otra clasificación.
    assert nodes[0].network_algorithm == "majority_vote"
    assert nodes[0].network_confidence == 0.28


def test_unclassified_node_carries_no_membership_details():
    from backend.api.services.regions_service import _rows_to_nodes

    region, coordinate = _region_and_coordinate()
    rows = [(region, coordinate, _network("network.human.cole-anticevic.visual"), "majority_vote", 0.9)]
    node = _rows_to_nodes(rows, "yeo2011-17")[0]
    assert node.network == "unclassified"
    assert node.network_algorithm is None
    assert node.network_confidence is None
