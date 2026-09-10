from dataclasses import dataclass

from backend.api.services.hybrid_tractography_service import (
    build_hybrid_edge_out,
    build_hybrid_node_out,
)


@dataclass
class _FakeNode:
    id: str
    name: str
    x: float
    y: float
    z: float
    reference_space: str = "ORG_800FC_100HCP_groupwise"


@dataclass
class _FakeEdge:
    node_a_id: str
    node_b_id: str
    tract_codes: list
    streamline_count_real: int
    streamline_count_shown: int
    streamlines: list
    reference_space: str = "ORG_800FC_100HCP_groupwise"


def test_build_hybrid_node_out_carries_real_centroid_and_reference_space():
    node = _FakeNode(
        id="region.human.org2018_wmparc.10", name="Left-Thalamus",
        x=1.5, y=-2.5, z=3.0,
    )

    result = build_hybrid_node_out(node)

    assert result.id == "region.human.org2018_wmparc.10"
    assert result.name == "Left-Thalamus"
    assert (result.x, result.y, result.z) == (1.5, -2.5, 3.0)
    assert result.reference_space == "ORG_800FC_100HCP_groupwise"


def test_build_hybrid_edge_out_carries_real_counts_and_tract_codes():
    edge = _FakeEdge(
        node_a_id="region.human.org2018_wmparc.10",
        node_b_id="region.human.org2018_wmparc.49",
        tract_codes=["CC1", "CB"],
        streamline_count_real=2874,
        streamline_count_shown=20,
        streamlines=[[(0.0, 0.0, 0.0), (1.0, 1.0, 1.0)]],
    )

    result = build_hybrid_edge_out(edge)

    assert result.node_a_id == "region.human.org2018_wmparc.10"
    assert result.node_b_id == "region.human.org2018_wmparc.49"
    assert result.tract_codes == ["CC1", "CB"]
    # El recuento real y el mostrado nunca se igualan artificialmente.
    assert result.streamline_count_real != result.streamline_count_shown
    assert result.streamlines == [[(0.0, 0.0, 0.0), (1.0, 1.0, 1.0)]]
