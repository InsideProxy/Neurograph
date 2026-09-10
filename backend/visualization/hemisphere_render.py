"""Esquema real de una única especie, dentro de una comparación entre
especies (Fase 10, sección 16/20-21, dos de las tres imágenes de
`compare_species`; rediseñado en la decisión 38, 01/09/2026).

Misma proyección 2D que `brain_render.py` (coordenada X/Y real de cada
región, eje Z descartado). Coloreado por PAR HOMÓLOGO real (mismo color
en esta imagen y en la de la otra especie de la misma comparación para
las dos regiones de un mismo par -- `colors.homology_pair_color_map`),
no por hemisferio ni por red funcional: la primera versión de esta
función (decisión 37) coloreaba por hemisferio porque las regiones
entre-especies de esta fase (p. ej. Cheng et al. 2021, IPL) no tienen
ninguna red funcional calculada todavía -- pero la usuaria señaló, al
probarlo de verdad (decisión 38), que un esquema por especie no permite
ver NINGÚN circuito compartido si el color no liga las dos especies
entre sí: el hemisferio es un dato real de esa región, pero no dice nada
sobre la otra especie. Cada punto lleva además su abreviatura real
(nunca inventada) como etiqueta de texto -- en los datos actuales
(Cheng et al. 2021) la propia fuente ya usa la MISMA abreviatura para un
par homólogo en las tres especies (p. ej. "IPL_2_1"), así que la
etiqueta por sí sola ya deja emparejar sin depender solo de distinguir
colores. El hemisferio real no se descarta: se conserva como FORMA del
marcador (círculo/cuadrado/triángulo), nunca como color, para no volver
a mezclar dos codificaciones en un mismo canal visual.

Las aristas (si las hay) son conexiones reales, igual criterio que el
resto del proyecto: ninguna especie no humana tiene hoy ninguna
`Connection` estructural cargada (decisión 35), así que esta imagen
mostrará solo puntos hasta que exista ese dato -- nunca se dibuja una
conexión que no esté en la base de datos.
"""
from __future__ import annotations

import io
from typing import Protocol

import matplotlib.pyplot as plt

# Gris neutro para un punto sin color de par asignado -- no debería
# ocurrir nunca en uso real (todo nodo que llega aquí participa, por
# construcción, en al menos una homología de la comparación en curso,
# ver `species_render_service.render_species_comparison_images`), pero
# se dibuja en vez de fallar si algún día pasa.
_MISSING_PAIR_COLOR = "#888888"

# Forma del marcador por hemisferio real (nunca color: el color de esta
# vista está reservado al par homólogo). "None" cubre tanto "sin
# lateralidad real" como "todavía sin backfillar" -- mismo criterio que
# el resto del proyecto, nunca se adivina a partir de la coordenada.
_HEMISPHERE_MARKERS: dict[str | None, str] = {"L": "o", "R": "s"}
_DEFAULT_MARKER = "^"
_HEMISPHERE_MARKER_LABELS: dict[str | None, str] = {
    "L": "hemisferio izquierdo (L)",
    "R": "hemisferio derecho (R)",
    None: "sin lateralidad registrada",
}


class _NodeLike(Protocol):
    id: str
    abbreviation: str | None
    hemisphere: str | None
    position3d: tuple[float, float, float]


class _EdgeLike(Protocol):
    source: str
    target: str
    weight: float


def render_hemisphere_schematic_image(
    nodes: list[_NodeLike],
    edges: list[_EdgeLike],
    pair_color_by_region_id: dict[str, str],
    title: str,
) -> bytes:
    """Cada región real en su posición X/Y real, coloreada por el par
    homólogo real al que pertenece (mismo color que su pareja en la
    imagen de la otra especie, ver `pair_color_by_region_id`, calculado
    en `species_render_service.py`) y con su abreviatura real como
    etiqueta. La forma del marcador (no el color) indica el hemisferio
    real. Lanza `ValueError` si no hay ningún nodo real que dibujar."""
    if not nodes:
        raise ValueError("no hay regiones reales que dibujar")

    positions = {n.id: (n.position3d[0], n.position3d[1]) for n in nodes}

    # Tamaño de figura proporcional al rango real de X/Y de esta especie
    # (nunca fijo a 7x7): con `aspect="equal"` más abajo, una figura
    # cuadrada frente a datos con un rango X mucho mayor que el Y (o
    # viceversa) obliga a matplotlib a encoger la caja del gráfico dentro
    # de la figura, dejando un hueco en blanco grande -- verificado
    # visualmente con datos de prueba antes de esta corrección (decisión
    # 38, 01/09/2026). Los límites 3.0/10.0 solo evitan una figura
    # degenerada en el caso extremo de puntos casi colineales.
    xs_all = [p[0] for p in positions.values()]
    ys_all = [p[1] for p in positions.values()]
    x_span = (max(xs_all) - min(xs_all)) or 1.0
    y_span = (max(ys_all) - min(ys_all)) or 1.0
    fig_width = 8.0
    fig_height = min(max(fig_width * (y_span / x_span), 3.0), 10.0)

    fig, ax = plt.subplots(figsize=(fig_width, fig_height))
    for edge in edges:
        if edge.source not in positions or edge.target not in positions:
            continue
        x1, y1 = positions[edge.source]
        x2, y2 = positions[edge.target]
        ax.plot([x1, x2], [y1, y2], color="#999999", alpha=0.3, linewidth=0.7, zorder=1)

    present_hemispheres = sorted({n.hemisphere for n in nodes}, key=lambda h: (h is None, h or ""))
    for hemisphere in present_hemispheres:
        group = [n for n in nodes if n.hemisphere == hemisphere]
        xs = [n.position3d[0] for n in group]
        ys = [n.position3d[1] for n in group]
        node_colors = [pair_color_by_region_id.get(n.id, _MISSING_PAIR_COLOR) for n in group]
        ax.scatter(
            xs, ys, c=node_colors, s=70, zorder=2,
            marker=_HEMISPHERE_MARKERS.get(hemisphere, _DEFAULT_MARKER),
            edgecolors="white", linewidths=0.6,
        )

    # Etiqueta de texto real (abreviatura ya cargada, nunca inventada;
    # el id completo si no hay abreviatura) junto a cada punto -- con las
    # comparaciones de hoy (<=18 regiones por especie) cabe sin saturar,
    # y es la forma más directa de responder "qué corresponde con qué"
    # sin depender solo de distinguir colores.
    for n in nodes:
        x, y = positions[n.id]
        label_text = n.abbreviation or n.id
        ax.annotate(label_text, (x, y), fontsize=7, xytext=(4, 4), textcoords="offset points", zorder=3)

    # Leyenda de FORMAS (hemisferio), deliberadamente sin color propio
    # (contorno neutro) -- para no sugerir que el color tenga algo que
    # ver con el hemisferio en esta vista.
    shape_legend_handles = [
        plt.Line2D(
            [0], [0], marker=_HEMISPHERE_MARKERS.get(h, _DEFAULT_MARKER), linestyle="",
            markerfacecolor="none", markeredgecolor="#333333", markersize=8,
            label=_HEMISPHERE_MARKER_LABELS.get(h, "sin lateralidad registrada"),
        )
        for h in present_hemispheres
    ]
    ax.legend(
        handles=shape_legend_handles, loc="upper left", bbox_to_anchor=(1.02, 1.0),
        fontsize=8, frameon=False, title="Forma = hemisferio real",
    )
    # Línea media real en x=0 -- referencia visual entre "izquierda" y
    # "derecha" en el propio espacio de coordenadas de la especie, nunca
    # una línea anatómica exacta (cada especie tiene su propio espacio de
    # referencia, ver decisión 29 de docs/analisis-arquitectura.md).
    ax.axvline(0, color="#cccccc", linewidth=0.8, zorder=0)
    ax.set_title(title)
    ax.set_xlabel("Posición X real, propia de esta especie (no comparable con la otra imagen)")
    ax.set_ylabel("Posición Y real, propia de esta especie")
    ax.set_aspect("equal")

    # El pie de página se ancla justo debajo del bbox real ya renderizado
    # de los ejes (incluyendo su etiqueta de X), no a una fracción fija
    # de la figura ni de los ejes: con `aspect="equal"` la caja de los
    # ejes puede encogerse dentro de su hueco asignado, así que una
    # fracción fija a veces caía encima de la propia etiqueta de X y
    # otras veces dejaba un hueco enorme -- verificado visualmente antes
    # de esta corrección (decisión 38, 01/09/2026).
    fig.canvas.draw()
    axes_bbox_fig = ax.get_tightbbox(fig.canvas.get_renderer()).transformed(fig.transFigure.inverted())
    fig.text(
        0.5, axes_bbox_fig.y0 - 0.03,
        "El color y la etiqueta de cada punto son los mismos en la otra imagen de esta "
        "comparación cuando es el mismo par homólogo real.",
        ha="center", va="top", fontsize=8, wrap=True,
    )

    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    return buffer.getvalue()
