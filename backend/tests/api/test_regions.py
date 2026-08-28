import datetime as dt

from backend.api.routers.regions import region_to_node
from backend.database.models.entities import Coordinate, Region


def test_region_to_node_translates_shape():
    region = Region(id="region.human.hcp-mmp1.r_v1", name="V1 (hemisferio derecho)",
                     species_id="species.human.ncbi-taxonomy.9606",
                     atlas_id="atlas.human.hcp.mmp1_0", synonyms=["R_V1_ROI"])
    coordinate = Coordinate(id="coordinate.human.hcp-mmp1.r_v1", entity_id=region.id,
                             x=14.2, y=-78.5, z=4.6,
                             reference_space="fsLR_32k_S1200_groupavg_midthickness_MSMAll")

    node = region_to_node(region, coordinate)

    assert node.id == "region.human.hcp-mmp1.r_v1"
    assert node.label == "V1 (hemisferio derecho)"
    assert node.network == "unclassified"
    assert node.position3d == (14.2, -78.5, 4.6)
    assert node.reference_space == "fsLR_32k_S1200_groupavg_midthickness_MSMAll"
