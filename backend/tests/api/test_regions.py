from backend.api.routers.regions import region_to_node
from backend.database.models.entities import Coordinate, Network, Region


def _region_and_coordinate(abbreviation=None):
    region = Region(id="region.human.hcp-mmp1.r_v1", name="V1 (hemisferio derecho)",
                     abbreviation=abbreviation,
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
