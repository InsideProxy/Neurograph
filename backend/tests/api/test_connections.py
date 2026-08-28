from backend.api.routers.connections import connection_to_edge
from backend.database.models.entities import Connection


def test_connection_to_edge_translates_shape():
    connection = Connection(
        id="connection.human.brainnetome.l_sfg_7_1__r_sfg_7_1",
        source_id="region.human.brainnetome.l_sfg_7_1",
        target_id="region.human.brainnetome.r_sfg_7_1",
        type="structural",
        evidence_level="indirect",
        weight=0.91,
    )

    edge = connection_to_edge(connection)

    assert edge.id == "connection.human.brainnetome.l_sfg_7_1__r_sfg_7_1"
    assert edge.source == "region.human.brainnetome.l_sfg_7_1"
    assert edge.target == "region.human.brainnetome.r_sfg_7_1"
    assert edge.type == "structural"
    assert edge.weight == 0.91
    assert edge.evidenceLevel == "indirect"


def test_connection_to_edge_defaults_missing_weight_to_zero():
    connection = Connection(
        id="connection.human.test.a__b", source_id="a", target_id="b",
        type="functional", evidence_level="hypothetical", weight=None,
    )

    edge = connection_to_edge(connection)

    assert edge.weight == 0.0
