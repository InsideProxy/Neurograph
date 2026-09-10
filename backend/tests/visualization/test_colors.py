from backend.visualization.colors import UNCLASSIFIED_COLOR, network_color_map


def test_network_color_map_assigns_the_same_color_regardless_of_input_order():
    slugs = ["cole-anticevic.default", "cole-anticevic.visual", "cole-anticevic.auditory"]

    colors_a = network_color_map(slugs)
    colors_b = network_color_map(list(reversed(slugs)))

    assert colors_a == colors_b


def test_network_color_map_gives_unclassified_its_own_fixed_gray():
    colors = network_color_map(["cole-anticevic.default", "unclassified"])

    assert colors["unclassified"] == UNCLASSIFIED_COLOR
    assert colors["cole-anticevic.default"] != UNCLASSIFIED_COLOR


def test_network_color_map_never_assigns_the_unclassified_gray_to_a_real_network():
    # Ninguna red real puede terminar con el mismo gris reservado a
    # "unclassified", aunque haya muchas redes -- se comprueba con más
    # de las 20 de la paleta cualitativa para forzar el reciclado.
    slugs = [f"atlas.network_{i}" for i in range(25)] + ["unclassified"]

    colors = network_color_map(slugs)

    real_colors = {slug: color for slug, color in colors.items() if slug != "unclassified"}
    assert UNCLASSIFIED_COLOR not in real_colors.values()


def test_network_color_map_recycles_the_palette_without_failing_past_twenty_networks():
    slugs = [f"atlas.network_{i}" for i in range(30)]

    colors = network_color_map(slugs)

    assert len(colors) == 30
    assert all(color.startswith("#") for color in colors.values())


def test_network_color_map_is_stable_across_two_independent_calls():
    slugs = ["b.network", "a.network"]

    assert network_color_map(slugs) == network_color_map(slugs)
