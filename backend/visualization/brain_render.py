"""Proyección 2D real de un único atlas, vista axial (Fase 10, sección
16/20-21, herramienta MCP `render_brain` -- versión de un solo atlas).

No es una escena 3D (eso ya lo hace el frontend con Three.js, sección
21): es una imagen real, estática, con la posición X/Y real de cada
región (`Coordinate.x`/`Coordinate.y`, eje Z descartado a propósito para
esta vista -- convención de "vista axial" habitual en neuroimagen,
mirando el cerebro desde arriba), coloreada por red funcional. Mismo
principio que `network_render.py`: este módulo no decide qué cuenta
como región o conexión real, solo posición (ya dada, no calculada aquí)
y color.
"""
from __future__ import annotations

import io
from typing import Protocol

import matplotlib.pyplot as plt

from backend.visualization.colors import network_color_map


class _NodeLike(Protocol):
    id: str
    network: str
    position3d: tuple[float, float, float]


class _EdgeLike(Protocol):
    source: str
    target: str
    weight: float


def render_brain_image(nodes: list[_NodeLike], edges: list[_EdgeLike], title: str) -> bytes:
    """Cada región real en su posición X/Y real (coordenada ya calculada
    por la ingesta del atlas, nunca inventada aquí), coloreada por red
    funcional, con las aristas reales dibujadas como líneas finas.
    Leyenda obligatoria de red -> color. Lanza `ValueError` si no hay
    ningún nodo real que dibujar."""
    if not nodes:
        raise ValueError("no hay regiones reales que dibujar")

    positions = {n.id: (n.position3d[0], n.position3d[1]) for n in nodes}
    colors = network_color_map([n.network for n in nodes])

    fig, ax = plt.subplots(figsize=(8, 8))
    for edge in edges:
        if edge.source not in positions or edge.target not in positions:
            continue
        x1, y1 = positions[edge.source]
        x2, y2 = positions[edge.target]
        ax.plot([x1, x2], [y1, y2], color="#999999", alpha=0.25, linewidth=0.6, zorder=1)

    xs = [positions[n.id][0] for n in nodes]
    ys = [positions[n.id][1] for n in nodes]
    node_colors = [colors[n.network] for n in nodes]
    ax.scatter(xs, ys, c=node_colors, s=30, zorder=2, edgecolors="white", linewidths=0.3)

    legend_handles = [
        plt.Line2D([0], [0], marker="o", linestyle="", color=color, label=slug)
        for slug, color in sorted(colors.items())
    ]
    ax.legend(handles=legend_handles, loc="upper left", bbox_to_anchor=(1.02, 1.0), fontsize=7, frameon=False)
    ax.set_title(title)
    ax.set_xlabel("X (vista axial, eje Z descartado)")
    ax.set_ylabel("Y")
    ax.set_aspect("equal")

    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    return buffer.getvalue()
