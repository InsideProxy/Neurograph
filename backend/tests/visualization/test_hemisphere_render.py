from dataclasses import dataclass

import pytest

from backend.core.graph.model import Edge
from backend.visualization.hemisphere_render import render_hemisphere_schematic_image

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


@dataclass
class _FakeNode:
    id: str
    hemisphere: str | None
    position3d: tuple[float, float, float]
    abbreviation: str | None = None


def test_render_hemisphere_schematic_image_raises_when_there_are_no_nodes():
    with pytest.raises(ValueError):
        render_hemisphere_schematic_image([], [], {}, title="vacío")


def test_render_hemisphere_schematic_image_produces_a_real_png():
    nodes = [
        _FakeNode(id="region.A", hemisphere="L", position3d=(-58.7, -39.5, 33.0), abbreviation="RA"),
        _FakeNode(id="region.B", hemisphere="R", position3d=(60.4, -33.3, 34.9), abbreviation="RB"),
        _FakeNode(id="region.C", hemisphere=None, position3d=(0.0, 0.0, 40.0), abbreviation=None),
    ]
    edges = [Edge(source="region.A", target="region.B", weight=0.4)]
    pair_color_by_region_id = {"region.A": "#4C72B0", "region.B": "#4C72B0", "region.C": "#DD8452"}

    png_bytes = render_hemisphere_schematic_image(nodes, edges, pair_color_by_region_id, title="esquema de prueba")

    assert png_bytes.startswith(_PNG_MAGIC)
    assert len(png_bytes) > 0


def test_render_hemisphere_schematic_image_works_without_any_real_connections():
    # Caso real: ninguna especie no humana tiene todavía ninguna
    # Connection estructural cargada (decisión 35) -- la imagen debe
    # seguir siendo un PNG válido con solo los puntos, sin aristas.
    nodes = [_FakeNode(id="region.A", hemisphere="L", position3d=(-10.0, 5.0, 20.0), abbreviation="RA")]
    pair_color_by_region_id = {"region.A": "#4C72B0"}

    png_bytes = render_hemisphere_schematic_image(nodes, [], pair_color_by_region_id, title="esquema de prueba")

    assert png_bytes.startswith(_PNG_MAGIC)


def test_render_hemisphere_schematic_image_ignores_an_edge_pointing_outside_the_drawn_regions():
    nodes = [_FakeNode(id="region.A", hemisphere="L", position3d=(0.0, 0.0, 0.0), abbreviation="RA")]
    edges = [Edge(source="region.A", target="region.no-existe", weight=1.0)]
    pair_color_by_region_id = {"region.A": "#4C72B0"}

    png_bytes = render_hemisphere_schematic_image(nodes, edges, pair_color_by_region_id, title="esquema de prueba")

    assert png_bytes.startswith(_PNG_MAGIC)


def test_render_hemisphere_schematic_image_falls_back_to_neutral_color_for_an_unmapped_region():
    # Caso real defensivo: si algún nodo llega sin color de par asignado
    # (no debería pasar en uso real, ver comentario de `_MISSING_PAIR_
    # COLOR` en hemisphere_render.py), la imagen debe seguir siendo un
    # PNG válido en vez de fallar con un KeyError.
    nodes = [_FakeNode(id="region.A", hemisphere="L", position3d=(0.0, 0.0, 0.0), abbreviation="RA")]

    png_bytes = render_hemisphere_schematic_image(nodes, [], {}, title="esquema de prueba")

    assert png_bytes.startswith(_PNG_MAGIC)
