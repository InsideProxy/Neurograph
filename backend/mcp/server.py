"""Servidor MCP de NeuroGraph (sección 16).

MCP es un adaptador entre la API científica y los modelos de IA: cada
herramienta MCP debe llamar a la misma capa de servicio que usa la API
HTTP (backend/api/services/), nunca reimplementar lógica propia. MCP no
sustituye a la API: la API debe seguir siendo independiente y utilizable
sin IA.

Las herramientas listadas en la sección 16 (search_region, search_tract,
get_connectivity, find_path, find_homologues, calculate_laplacian,
calculate_spectrum, compare_species, render_brain, render_network,
render_lesion, ...) se implementan fase a fase, a medida que su lógica
correspondiente exista en backend/core/. Este archivo es el esqueleto de
registro, no la implementación.
"""
from __future__ import annotations

# TODO(Fase 10): registrar aquí las herramientas MCP, cada una llamando a
# backend/api/services/*, y registrar cada llamada para reproducibilidad
# (sección 23).
