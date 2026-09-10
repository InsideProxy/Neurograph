"""Connectograma circular real de homología entre dos especies (Fase 10,
sección 16/20-21, primera de las tres imágenes de `compare_species`).

Decisión de la usuaria, 31/08/2026: reúne en un único círculo las
regiones reales de las DOS especies (todos sus atlas, no solo las que
participan en alguna homología -- así el círculo muestra de verdad
cuánto de cada especie es exclusivo y cuánto está homologado, no solo la
parte homologada). Tres colores fijos (nunca dependientes de los datos):
exclusiva de la especie A, exclusiva de la especie B, y homóloga/
compartida -- una región es "compartida" si participa en al menos una
homología real con la otra especie de esta comparación concreta, nunca
si tiene alguna homología con una TERCERA especie. Una cuerda por cada
fila `Homology` real que conecta ambas especies, siempre en el color
"compartida" -- nunca una cuerda por cada par posible de regiones, solo
por las homologías reales.

No dibuja etiquetas de texto por nodo (mismo criterio que
`network_render.py` y el riesgo 10 de docs/analisis-arquitectura.md:
con cientos de nodos, las etiquetas se solapan hasta ser ilegibles) --
la leyenda de color es la que lleva el significado real.
"""
from __future__ import annotations

import io
import math

import matplotlib.pyplot as plt

from backend.visualization.colors import SHARED_HOMOLOGY_COLOR, SPECIES_A_ONLY_COLOR, SPECIES_B_ONLY_COLOR


def _circle_positions(ordered_ids: list[str]) -> dict[str, tuple[float, float]]:
    n = len(ordered_ids)
    return {
        node_id: (math.cos(2 * math.pi * i / n), math.sin(2 * math.pi * i / n))
        for i, node_id in enumerate(ordered_ids)
    }


def render_homology_connectogram_image(
    species_a_region_ids: list[str],
    species_b_region_ids: list[str],
    shared_region_ids: set[str],
    homology_arcs: list[tuple[str, str]],
    species_a_label: str,
    species_b_label: str,
    title: str,
) -> bytes:
    """`species_a_region_ids`/`species_b_region_ids`: TODAS las regiones
    reales cargadas de cada especie (cualquier atlas). `shared_region_ids`:
    el subconjunto (de cualquiera de las dos listas) que participa en al
    menos una homología real con la otra especie. `homology_arcs`: pares
    (source_id, target_id) de cada fila `Homology` real entre ambas
    especies -- una cuerda por fila, nunca deducida ni completada. Lanza
    `ValueError` si ninguna de las dos especies tiene ninguna región real
    cargada."""
    if not species_a_region_ids and not species_b_region_ids:
        raise ValueError("ninguna de las dos especies tiene regiones reales cargadas")

    # Dos mitades del círculo, una por especie -- nunca intercaladas: así
    # se ve de un vistazo qué proporción de cada especie es exclusiva
    # (la mayoría de su mitad, si la especie tiene un atlas de cuerpo
    # completo) frente a homóloga (el grupo que cruza al otro lado).
    ordered_ids = sorted(species_a_region_ids) + sorted(species_b_region_ids)
    positions = _circle_positions(ordered_ids)
    species_a_set = set(species_a_region_ids)

    def _node_color(region_id: str) -> str:
        if region_id in shared_region_ids:
            return SHARED_HOMOLOGY_COLOR
        return SPECIES_A_ONLY_COLOR if region_id in species_a_set else SPECIES_B_ONLY_COLOR

    fig, ax = plt.subplots(figsize=(9, 9))
    for source_id, target_id in homology_arcs:
        if source_id not in positions or target_id not in positions:
            continue
        x1, y1 = positions[source_id]
        x2, y2 = positions[target_id]
        ax.plot([x1, x2], [y1, y2], color=SHARED_HOMOLOGY_COLOR, alpha=0.5, linewidth=0.9, zorder=1)

    xs = [positions[i][0] for i in ordered_ids]
    ys = [positions[i][1] for i in ordered_ids]
    node_colors = [_node_color(i) for i in ordered_ids]
    ax.scatter(xs, ys, c=node_colors, s=22, zorder=2, edgecolors="white", linewidths=0.25)

    legend_handles = [
        plt.Line2D([0], [0], marker="o", linestyle="", color=SPECIES_A_ONLY_COLOR, label=f"Exclusiva de {species_a_label}"),
        plt.Line2D([0], [0], marker="o", linestyle="", color=SPECIES_B_ONLY_COLOR, label=f"Exclusiva de {species_b_label}"),
        plt.Line2D([0], [0], marker="o", linestyle="", color=SHARED_HOMOLOGY_COLOR, label="Homóloga (compartida)"),
    ]
    ax.legend(handles=legend_handles, loc="upper left", bbox_to_anchor=(1.02, 1.0), fontsize=8, frameon=False)
    ax.set_title(title)
    ax.set_aspect("equal")
    ax.axis("off")

    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    return buffer.getvalue()
