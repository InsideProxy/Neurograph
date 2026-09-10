"""Paleta de colores determinista para las visualizaciones reales de
NeuroGraph (Fase 10, sección 16/20-21: `render_network`, `render_brain`,
comparación entre especies). Un mismo slug de red (o de especie) recibe
siempre el mismo color dentro de una misma llamada, asignado por orden
alfabético del slug -- nunca un color aleatorio o dependiente del orden
de llegada de los datos, para que una misma leyenda sea reproducible
entre dos llamadas con el mismo conjunto de redes/especies.

matplotlib se usa con el backend "Agg" (sin servidor gráfico: no hay
pantalla en este entorno ni falta que la haya, solo se generan bytes
PNG) -- fijado aquí, en el primer módulo que importa matplotlib, para
que cualquier otro módulo de `backend/visualization/` lo herede sin
tener que repetirlo.
"""
from __future__ import annotations

import matplotlib

matplotlib.use("Agg")

from matplotlib import colors as mcolors  # noqa: E402
from matplotlib import colormaps  # noqa: E402

# Paleta cualitativa de matplotlib (tab20): 20 colores distinguibles,
# suficiente para las ~12 redes reales de cualquier atlas cargado hoy
# (Cole-Anticevic: 12; Gordon 333: 12). Si algún día hay más de 20 redes
# distintas en una misma llamada, los colores se reciclan -- nunca se
# rompe la llamada por quedarse sin colores nuevos.
_PALETTE = [mcolors.to_hex(c) for c in colormaps["tab20"].colors]

# Gris neutro fijo para "unclassified" (región sin red calculada todavía,
# ver `regions_service.region_to_node`): nunca un color de la paleta
# cualitativa, para que no se confunda visualmente con una red real.
UNCLASSIFIED_COLOR = "#888888"


def network_color_map(network_slugs: list[str]) -> dict[str, str]:
    """Un color hexadecimal estable por slug de red, asignado por orden
    alfabético de los slugs reales (excluyendo "unclassified", que
    siempre recibe `UNCLASSIFIED_COLOR` en vez de un turno de la
    paleta)."""
    real_slugs = sorted({s for s in network_slugs if s != "unclassified"})
    mapping = {slug: _PALETTE[i % len(_PALETTE)] for i, slug in enumerate(real_slugs)}
    if "unclassified" in network_slugs:
        mapping["unclassified"] = UNCLASSIFIED_COLOR
    return mapping


# Colores fijos para la comparación entre especies (decisión de la
# usuaria, 31/08/2026): tres categorías siempre presentes en el
# connectograma de homología, nunca dependientes de los datos --
# "exclusiva de la especie A", "exclusiva de la especie B", "compartida/
# homóloga" son las tres únicas categorías posibles en ese diagrama por
# construcción (ver docstring de `species_render.py`).
SPECIES_A_ONLY_COLOR = "#4C72B0"
SPECIES_B_ONLY_COLOR = "#DD8452"
SHARED_HOMOLOGY_COLOR = "#55A868"


def homology_pair_color_map(homology_row_ids: list[str]) -> dict[str, str]:
    """Un color hexadecimal estable por fila `Homology` real (un color
    por PAR homólogo, no por especie ni por red), asignado por orden
    alfabético del id real de la fila -- mismo criterio determinista que
    `network_color_map`. Pensado para `hemisphere_render.py` (decisión
    38, 01/09/2026): la usuaria señaló que colorear los dos esquemas por
    hemisferio no dejaba ver qué región de una especie corresponde a
    cuál de la otra -- dar el mismo color a las dos regiones de un mismo
    par real, en las dos imágenes de la comparación, sí lo permite de un
    vistazo. Si algún día hay más de 20 pares homólogos reales en una
    misma comparación, los colores se reciclan (mismo criterio que
    `network_color_map`) -- el emparejamiento sigue siendo exacto de
    todas formas gracias a la etiqueta de texto real que dibuja
    `render_hemisphere_schematic_image` junto a cada punto, nunca
    depende solo del color."""
    ordered_ids = sorted(set(homology_row_ids))
    return {row_id: _PALETTE[i % len(_PALETTE)] for i, row_id in enumerate(ordered_ids)}
