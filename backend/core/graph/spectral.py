"""Análisis espectral (sección 10): autovalores, autovectores y embedding
espectral a partir del Laplaciano calculado en matrices.py.
"""
from __future__ import annotations

from dataclasses import dataclass

import networkx as nx
import numpy as np

from backend.core.graph.matrices import graph_laplacian, node_order


@dataclass(frozen=True)
class SpectralDecomposition:
    order: list[str]
    eigenvalues: np.ndarray  # ascendente
    eigenvectors: np.ndarray  # columnas = autovectores, alineados con eigenvalues


def eigen_decomposition(graph: nx.Graph) -> SpectralDecomposition:
    """Descompone el Laplaciano en autovalores/autovectores (sección 10),
    ordenados de menor a mayor autovalor. El Laplaciano es simétrico para
    grafos no dirigidos, así que se usa `eigh` (más estable que `eig`).
    """
    order = node_order(graph)
    laplacian = graph_laplacian(graph, order)
    eigenvalues, eigenvectors = np.linalg.eigh(laplacian)
    return SpectralDecomposition(order=order, eigenvalues=eigenvalues, eigenvectors=eigenvectors)


def spectral_embedding(graph: nx.Graph, n_components: int = 2) -> dict[str, np.ndarray]:
    """Embedding espectral (Laplacian eigenmaps): usa los `n_components`
    autovectores no triviales (se descarta el primero, de autovalor ~0,
    que es constante y no aporta separación) como coordenadas de cada nodo.
    Útil para visualizar comunidades o comparar la posición relativa de
    regiones entre especies (sección 11).
    """
    decomposition = eigen_decomposition(graph)
    # se descarta la primera componente (autovalor ~0)
    coordinates = decomposition.eigenvectors[:, 1 : 1 + n_components]
    return {node: coordinates[i] for i, node in enumerate(decomposition.order)}
