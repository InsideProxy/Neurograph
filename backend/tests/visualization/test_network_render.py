from dataclasses import dataclass

import pytest

from backend.core.graph.model import Edge
from backend.visualization.network_render import render_network_image

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


@dataclass
class _FakeNode:
    id: str
    network: str


def test_render_network_image_raises_when_there_are_no_nodes():
    with pytest.raises(ValueError):
        render_network_image([], [], title="vacío")


def test_render_network_image_produces_a_real_png():
    nodes = [
        _FakeNode(id="region.A", network="cole-anticevic.default"),
        _FakeNode(id="region.B", network="cole-anticevic.visual"),
        _FakeNode(id="region.C", network="unclassified"),
    ]
    edges = [Edge(source="region.A", target="region.B", weight=0.5)]

    png_bytes = render_network_image(nodes, edges, title="atlas de prueba")

    assert png_bytes.startswith(_PNG_MAGIC)
    assert len(png_bytes) > 0


def test_render_network_image_ignores_an_edge_pointing_to_a_node_not_in_the_atlas():
    # No debería pasar en la práctica (la arista viene de la misma
    # consulta de atlas que los nodos), pero si pasa, se ignora esa
    # arista en vez de fallar toda la imagen.
    nodes = [_FakeNode(id="region.A", network="cole-anticevic.default")]
    edges = [Edge(source="region.A", target="region.no-existe", weight=1.0)]

    png_bytes = render_network_image(nodes, edges, title="atlas de prueba")

    assert png_bytes.startswith(_PNG_MAGIC)
