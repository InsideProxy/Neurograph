"""Connectograma circular real de un único atlas (Fase 10, sección
16/20-21, herramienta MCP `render_network` -- versión de un solo atlas;
la versión de comparación entre especies vive en `species_render.py`).

Nunca dibuja nada que no venga ya calculado por el resto del motor:
recibe los nodos reales (`regions_service.RegionNode`, con su red
funcional ya resuelta) y las aristas reales ya filtradas por
`connection_type`/`min_weight` (`core.graph.from_connections.
edges_from_connections`) -- este módulo solo decide POSICIÓN y COLOR,
nunca qué cuenta como nodo o arista real (esa decisión ya se tomó antes
de llegar aquí, en `backend/api/services/render_service.py`).
"""
from __future__ import annotations

import io
import math
from typing import Protocol

import matplotlib.pyplot as plt

from backend.visualization.colors import network_color_map


class _NodeLike(Protocol):
    id: str
    network: str


class _EdgeLike(Protocol):
    source: str
    target: str
    weight: float


def _circle_positions(node_ids: list[str]) -> dict[str, tuple[float, float]]:
    n = len(node_ids)
    return {
        node_id: (math.cos(2 * math.pi * i / n), math.sin(2 * math.pi * i / n))
        for i, node_id in enumerate(node_ids)
    }


def render_network_image(nodes: list[_NodeLike], edges: list[_EdgeLike], title: str) -> bytes:
    """Un nodo por región real, en un círculo, ordenado por red y luego
    por id (para que las regiones de una misma red queden agrupadas
    visualmente); una cuerda gris por cada arista real (nunca coloreada
    por peso -- el color del nodo ya codifica la red, añadir un segundo
    canal de color por peso sería difícil de leer en un círculo de
    cientos de nodos). Leyenda obligatoria de red -> color. Lanza
    `ValueError` si no hay ningún nodo real que dibujar -- nunca una
    imagen vacía sin avisar de por qué."""
    if not nodes:
        raise ValueError("no hay regiones reales que dibujar")

    ordered = sorted(nodes, key=lambda n: (n.network, n.id))
    ids = [n.id for n in ordered]
    positions = _circle_positions(ids)
    colors = network_color_map([n.network for n in ordered])

    fig, ax = plt.subplots(figsize=(8, 8))
    for edge in edges:
        if edge.source not in positions or edge.target not in positions:
            continue
        x1, y1 = positions[edge.source]
        x2, y2 = positions[edge.target]
        ax.plot([x1, x2], [y1, y2], color="#999999", alpha=0.25, linewidth=0.6, zorder=1)

    xs = [positions[i][0] for i in ids]
    ys = [positions[i][1] for i in ids]
    node_colors = [colors[n.network] for n in ordered]
    ax.scatter(xs, ys, c=node_colors, s=40, zorder=2, edgecolors="white", linewidths=0.4)

    legend_handles = [
        plt.Line2D([0], [0], marker="o", linestyle="", color=color, label=slug)
        for slug, color in sorted(colors.items())
    ]
    ax.legend(handles=legend_handles, loc="upper left", bbox_to_anchor=(1.02, 1.0), fontsize=7, frameon=False)
    ax.set_title(title)
    ax.set_aspect("equal")
    ax.axis("off")

    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    return buffer.getvalue()
