from backend.api.routers.regions import region_to_node
from backend.database.models.entities import Coordinate, Network, Region


def _region_and_coordinate():
    region = Region(id="region.human.hcp-mmp1.r_v1", name="V1 (hemisferio derecho)",
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
    assert node.network == "unclassified"
    assert node.position3d == (14.2, -78.5, 4.6)
    assert node.reference_space == "fsLR_32k_S1200_groupavg_midthickness_MSMAll"


def test_region_to_node_with_network_uses_its_local_code_as_slug():
    region, coordinate = _region_and_coordinate()
    network = Network(id="network.human.cole-anticevic.visual", name="Visual")

    node = region_to_node(region, coordinate, network=network)

    assert node.network == "visual"
