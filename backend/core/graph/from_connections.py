"""Adaptador entre las conexiones reales de la base de datos y el motor
de grafos de `core.graph` (sección 10). No toca la base de datos: la
consulta la hace el router (`backend/api/routers/graph_metrics.py`),
este módulo solo convierte filas ya leídas en la estructura que
`build_graph()` espera -- así se mantiene la independencia de la base
de datos exigida en la sección 10, y se puede probar sin ella.
"""
from __future__ import annotations

from typing import Protocol

from backend.core.graph.model import Edge


class ConnectionLike(Protocol):
    source_id: str
    target_id: str
    weight: float | None


def edges_from_connections(
    connections: list[ConnectionLike], min_weight: float = 0.0
) -> list[Edge]:
    """Convierte conexiones reales en aristas del motor de grafos.

    Un par con `weight <= min_weight` se EXCLUYE del grafo, nunca se
    incluye con peso 0: en Fase 4 se decidió guardar la matriz completa
    de conectividad estructural de Brainnetome sin umbral (sección 7.5),
    así que casi la mitad de sus 30 135 pares tiene `weight` exactamente
    0 (comprobado empíricamente, no un caso hipotético) -- eso es la
    ausencia comprobada de conexión, no una conexión débil, y tratarla
    como arista real rompería cualquier análisis topológico (comunidades,
    centralidad de intermediación...) que dependa de qué pares están
    conectados de verdad. `min_weight=0.0` por defecto excluye solo esos
    pares sin conexión real; aplicar un umbral mayor es elección de quien
    llama, nunca se impone aquí -- mismo principio que en `GET
    /connections`: la carga de datos no descarta nada, decidir qué
    analizar sí es decisión de quien pide el análisis.
    """
    return [
        Edge(source=c.source_id, target=c.target_id, weight=c.weight)
        for c in connections
        if c.weight is not None and c.weight > min_weight
    ]
