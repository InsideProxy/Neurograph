"""Servidor MCP de NeuroGraph (sección 16).

MCP es un adaptador entre la API científica y los modelos de IA: cada
herramienta MCP llama a la misma capa de servicio que usa la API HTTP
(`backend/api/services/`), nunca reimplementa lógica propia. MCP no
sustituye a la API: la API sigue siendo independiente y utilizable sin
IA (`backend/api/main.py` no depende de este módulo en ningún sentido).

Las herramientas listadas en la sección 16 (search_region, search_tract,
get_connectivity, find_path, find_homologues, calculate_laplacian,
calculate_spectrum, compare_species, render_brain, render_network,
render_lesion, ...) se implementan fase a fase, a medida que su lógica
correspondiente exista en backend/core/. Alcance de esta primera entrega
(Fase 10, 31/08/2026 -- ver decisión 27 de docs/analisis-arquitectura.md
para el porqué completo, incluida la interpretación de
calculate_laplacian/calculate_spectrum como las dos mitades del análisis
espectral que ya calcula `GraphMetrics`, sección 10):

- search_region       -> backend/api/services/regions_service.py
- get_connectivity     -> backend/api/services/connectivity_service.py (conectividad inducida)
- search_tract         -> backend/api/services/connectivity_service.py (nuevo en esta fase)
- calculate_laplacian  -> backend/api/services/graph_metrics_service.py (vista laplacian_view)
- calculate_spectrum   -> backend/api/services/graph_metrics_service.py (vista spectrum_view)

find_path, find_homologues, compare_species, render_brain,
render_network y render_lesion NO tienen todavía ninguna lógica real en
backend/core/ (no hay motor de caminos en el grafo, no hay entidades
`Homology` ni `Species` cargadas, no hay ningún mecanismo de
renderizado fuera del frontend): construirlas ahora sería empezar de
cero, no conectar algo existente, así que quedan fuera de esta entrega
-- se añadirán en fases futuras según lo previsto en esta misma
docstring, nunca improvisadas aquí.

Cada llamada real se audita en la tabla `mcp_call_log`
(`backend/mcp/audit.py`, migración 0010) antes de devolver su
resultado, para reproducibilidad (sección 23) -- decisión de la
usuaria, 31/08/2026: una tabla de PostgreSQL, no un archivo de log.

Para ejecutarlo (stdio, el transporte que usan la mayoría de clientes
MCP locales):

    python -m backend.mcp.server
"""
from __future__ import annotations

from mcp.server.fastmcp import FastMCP

from backend.api.services import connectivity_service, graph_metrics_service, regions_service
from backend.api.services.connectivity_service import InducedConnectivity, InducedTract
from backend.api.services.graph_metrics_service import LaplacianResult, SpectrumResult
from backend.api.services.regions_service import RegionNode
from backend.database.session import session_scope
from backend.mcp.audit import audited_tool

mcp = FastMCP(
    name="neurograph",
    instructions=(
        "Herramientas científicas de NeuroGraph: regiones, tractos y conectividad reales de "
        "atlas cerebrales cargados en su base de datos, y métricas del motor de grafos "
        "(Laplaciano, embedding espectral). Todo lo que devuelven es dato real trazable a su "
        "atlas/estudio de origen -- nunca un valor inventado o interpolado por la propia "
        "herramienta (sección 24 de la especificación de NeuroGraph)."
    ),
)


@mcp.tool()
@audited_tool("search_region")
def search_region(atlas_id: str | None = None) -> list[RegionNode]:
    """Busca regiones reales cargadas en NeuroGraph. `atlas_id` filtra a
    un atlas concreto (p. ej. "atlas.human.hcp.mmp1_0"); sin él, se
    devuelven las regiones de todos los atlas cargados. Cada región
    lleva su coordenada real, el espacio de referencia en el que está
    expresada, y su red funcional si ya se calculó una (si no,
    "unclassified" -- nunca una red inventada)."""
    with session_scope() as db:
        return regions_service.list_regions(db, atlas_id)


@mcp.tool()
@audited_tool("get_connectivity")
def get_connectivity(region_ids: list[str]) -> InducedConnectivity:
    """Conectividad real entre un conjunto de regiones dadas: qué
    conexiones existen entre ellas y qué tractos con nombre las tocan
    (con su cita real). Con menos de dos region_ids no hay conectividad
    "entre regiones" que calcular, y se devuelve vacío en vez de
    reinterpretar la petición."""
    with session_scope() as db:
        return connectivity_service.induced_connectivity(db, region_ids)


@mcp.tool()
@audited_tool("search_tract")
def search_tract(name: str | None = None, region_id: str | None = None) -> list[InducedTract]:
    """Busca tractos reales por nombre/abreviatura (subcadena) y/o por
    una región que deban tocar. Cada tracto devuelto lleva TODAS las
    regiones reales que toca (no solo region_id, si se dio uno) y su
    cita real. Un tracto sin ninguna conexión real registrada no
    aparece: no hay nada verificado que reportar sobre él."""
    with session_scope() as db:
        return connectivity_service.search_tracts(db, name=name, region_id=region_id)


@mcp.tool()
@audited_tool("calculate_laplacian")
def calculate_laplacian(
    atlas_id: str, connection_type: str = "structural", min_weight: float = 0.0
) -> LaplacianResult:
    """Espectro del Laplaciano del grafo real de un atlas (autovalores,
    ascendente): el segundo autovalor, en un grafo conexo, es su
    "conectividad algebraica" -- cuánto le cuesta desconectarse.
    `connection_type` nunca mezcla structural/functional/effective
    (sección 8); `min_weight` es un umbral explícito que decide quien
    llama, no uno aplicado de antemano al cargar los datos."""
    with session_scope() as db:
        metrics = graph_metrics_service.list_graph_metrics(db, atlas_id, connection_type, min_weight)
        return graph_metrics_service.laplacian_view(metrics)


@mcp.tool()
@audited_tool("calculate_spectrum")
def calculate_spectrum(
    atlas_id: str, connection_type: str = "structural", min_weight: float = 0.0
) -> SpectrumResult:
    """Embedding espectral 2D del grafo real de un atlas (Laplacian
    eigenmaps): una posición por región derivada de la estructura del
    grafo, útil para ver agrupamientos sin depender de la posición
    anatómica. None por región cuando el grafo tiene menos de 4 nodos
    (nunca un embedding inventado para un grafo demasiado pequeño)."""
    with session_scope() as db:
        metrics = graph_metrics_service.list_graph_metrics(db, atlas_id, connection_type, min_weight)
        return graph_metrics_service.spectrum_view(metrics)


if __name__ == "__main__":
    mcp.run(transport="stdio")
