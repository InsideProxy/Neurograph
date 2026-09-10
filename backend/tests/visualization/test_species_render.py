import pytest

from backend.visualization.species_render import render_homology_connectogram_image

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def test_render_homology_connectogram_image_raises_when_neither_species_has_regions():
    with pytest.raises(ValueError):
        render_homology_connectogram_image([], [], set(), [], "Especie A", "Especie B", title="vacío")


def test_render_homology_connectogram_image_produces_a_real_png():
    species_a_ids = ["region.chimp.cheng2021.L_g2_1", "region.chimp.cheng2021.L_g2_2"]
    species_b_ids = [
        "region.human.hcp.mmp1_0.area1",  # exclusiva de humano, sin homología
        "region.human.cheng2021.L_g2_1",
        "region.human.cheng2021.L_g2_2",
    ]
    shared = {
        "region.chimp.cheng2021.L_g2_1", "region.human.cheng2021.L_g2_1",
        "region.chimp.cheng2021.L_g2_2", "region.human.cheng2021.L_g2_2",
    }
    arcs = [
        ("region.chimp.cheng2021.L_g2_1", "region.human.cheng2021.L_g2_1"),
        ("region.chimp.cheng2021.L_g2_2", "region.human.cheng2021.L_g2_2"),
    ]

    png_bytes = render_homology_connectogram_image(
        species_a_ids, species_b_ids, shared, arcs,
        species_a_label="Pan troglodytes", species_b_label="Homo sapiens",
        title="comparación de prueba",
    )

    assert png_bytes.startswith(_PNG_MAGIC)
    assert len(png_bytes) > 0


def test_render_homology_connectogram_image_ignores_an_arc_pointing_outside_the_drawn_regions():
    species_a_ids = ["region.chimp.cheng2021.L_g2_1"]
    species_b_ids = ["region.human.cheng2021.L_g2_1"]
    shared = {"region.chimp.cheng2021.L_g2_1", "region.human.cheng2021.L_g2_1"}
    arcs = [("region.chimp.cheng2021.L_g2_1", "region.no-existe")]

    png_bytes = render_homology_connectogram_image(
        species_a_ids, species_b_ids, shared, arcs,
        species_a_label="Pan troglodytes", species_b_label="Homo sapiens",
        title="comparación de prueba",
    )

    assert png_bytes.startswith(_PNG_MAGIC)


def test_render_homology_connectogram_image_works_when_only_one_species_has_regions():
    # No debería pasar en la práctica (compare_species exige al menos
    # una homología real, que implica regiones de las dos especies),
    # pero la función de dibujo en sí no debe fallar si una lista viene
    # vacía -- solo si las DOS lo están.
    png_bytes = render_homology_connectogram_image(
        ["region.chimp.cheng2021.L_g2_1"], [], set(), [],
        species_a_label="Pan troglodytes", species_b_label="Homo sapiens",
        title="comparación de prueba",
    )

    assert png_bytes.startswith(_PNG_MAGIC)
