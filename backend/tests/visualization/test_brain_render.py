from dataclasses import dataclass

import pytest

from backend.core.graph.model import Edge
from backend.visualization.brain_render import render_brain_image

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


@dataclass
class _FakeNode:
    id: str
    network: str
    position3d: tuple[float, float, float]


def test_render_brain_image_raises_when_there_are_no_nodes():
    with pytest.raises(ValueError):
        render_brain_image([], [], title="vacío")


def test_render_brain_image_produces_a_real_png():
    nodes = [
        _FakeNode(id="region.A", network="cole-anticevic.default", position3d=(-58.7, -39.5, 33.0)),
        _FakeNode(id="region.B", network="cole-anticevic.visual", position3d=(60.4, -33.3, 34.9)),
    ]
    edges = [Edge(source="region.A", target="region.B", weight=0.5)]

    png_bytes = render_brain_image(nodes, edges, title="atlas de prueba")

    assert png_bytes.startswith(_PNG_MAGIC)
    assert len(png_bytes) > 0


def test_render_brain_image_ignores_an_edge_pointing_to_a_node_not_in_the_atlas():
    nodes = [_FakeNode(id="region.A", network="cole-anticevic.default", position3d=(0.0, 0.0, 0.0))]
    edges = [Edge(source="region.A", target="region.no-existe", weight=1.0)]

    png_bytes = render_brain_image(nodes, edges, title="atlas de prueba")

    assert png_bytes.startswith(_PNG_MAGIC)
