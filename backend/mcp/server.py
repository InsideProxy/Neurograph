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
correspondiente exista en backend/core/. Alcance acumulado hasta ahora
(Fase 10 -- ver decisión 27 de docs/analisis-arquitectura.md para el
porqué completo, incluida la interpretación de
calculate_laplacian/calculate_spectrum como las dos mitades del análisis
espectral que ya calcula `GraphMetrics`, sección 10; ver decisiones
33-37 para el resto, 31/08/2026 -- "vamos con las seis herramientas"):

- search_region           -> backend/api/services/regions_service.py
- get_connectivity         -> backend/api/services/connectivity_service.py (conectividad inducida)
- search_tract             -> backend/api/services/connectivity_service.py (nuevo en esta fase)
- calculate_laplacian      -> backend/api/services/graph_metrics_service.py (vista laplacian_view)
- calculate_spectrum       -> backend/api/services/graph_metrics_service.py (vista spectrum_view)
- find_path                -> backend/api/services/paths_service.py (camino más corto real, decisión 33)
- find_homologues          -> backend/api/services/homology_service.py (homologías reales cargadas, decisión 34)
- compare_species          -> backend/api/services/species_service.py (resumen cuantitativo + homologías compartidas, decisión 35)
- render_network           -> backend/api/services/render_service.py + backend/visualization/ (connectograma circular real, un solo atlas, decisión 36)
- render_brain             -> backend/api/services/render_service.py + backend/visualization/ (proyección 2D real, un solo atlas, decisión 36)
- compare_species_images   -> backend/api/services/species_render_service.py + backend/visualization/ (tres imágenes reales de comparación entre especies, decisión 37)
- propose_dataset_ingestion -> backend/api/services/dataset_ingestion_service.py (SQL de alta propuesto a partir de un dataset.yaml real, sin tocar la base de datos, decisión 46)

Con esto quedan completas las seis herramientas de este bloque.
render_lesion es la única de la sección 16 que sigue sin ninguna lógica
real: carece por completo de datos de Fase 8 (decisión 31) -- se
añadirá cuando exista una fuente real concreta para esa fase, nunca
antes.

Cada llamada real se audita en la tabla `mcp_call_log`
(`backend/mcp/audit.py`, migración 0010) antes de devolver su
resultado, para reproducibilidad (sección 23) -- decisión de la
usuaria, 31/08/2026: una tabla de PostgreSQL, no un archivo de log.

Para ejecutarlo (stdio, el transporte que usan la mayoría de clientes
MCP locales):

    python -m backend.mcp.server
"""
from __future__ import annotations

from mcp.server.fastmcp import FastMCP, Image

from backend.api.services import (
    connectivity_service,
    dataset_ingestion_service,
    graph_metrics_service,
    homology_service,
    paths_service,
    regions_service,
    render_service,
    species_render_service,
    species_service,
)
from backend.api.services.connectivity_service import InducedConnectivity, InducedTract
from backend.api.services.dataset_ingestion_service import DatasetIngestionProposal
from backend.api.services.graph_metrics_service import LaplacianResult, SpectrumResult
from backend.api.services.homology_service import HomologyMatch
from backend.api.services.paths_service import PathResult
from backend.api.services.regions_service import RegionNode
from backend.api.services.species_service import CompareSpeciesResult
from backend.database.session import session_scope
from backend.ingestion.datasets.sql_generation import StudyInfo
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


@mcp.tool()
@audited_tool("find_path")
def find_path(
    atlas_id: str,
    source_id: str,
    target_id: str,
    connection_type: str = "structural",
    min_weight: float = 0.0,
) -> PathResult:
    """Camino más corto real entre dos regiones del mismo atlas, sobre el
    grafo de conectividad de `connection_type` (un peso mayor es una
    conexión más fuerte, no un coste mayor -- el camino real más corto
    tiende hacia las conexiones fuertes). `path` y `distance` quedan en
    None cuando source_id/target_id no pertenecen a este atlas, o cuando
    no existe ningún camino real entre ambos (p. ej. componentes
    desconectadas) -- nunca se aproxima ni se inventa un camino."""
    with session_scope() as db:
        return paths_service.find_path(db, atlas_id, source_id, target_id, connection_type, min_weight)


@mcp.tool()
@audited_tool("find_homologues")
def find_homologues(region_id: str | None = None, species_id: str | None = None) -> list[HomologyMatch]:
    """Busca homologías reales entre especies ya cargadas (54 en este
    proyecto, todas de Cheng et al. 2021, con `status="candidate_homology"`
    y `confidence=None` porque el propio estudio no da ningún número
    utilizable con solo 3 especies -- nunca se inventa una confianza).
    `region_id` filtra a las que tocan esa región concreta (en cualquiera
    de los dos extremos); `species_id`, a las que tocan esa especie. Cada
    homología lleva la región y la especie real de sus dos extremos, y su
    cita real si el dataset de origen tiene un estudio enlazado (nunca una
    cita inventada)."""
    with session_scope() as db:
        return homology_service.find_homologues(db, region_id=region_id, species_id=species_id)


@mcp.tool()
@audited_tool("compare_species")
def compare_species(species_a_id: str, species_b_id: str) -> CompareSpeciesResult:
    """Compara dos especies reales combinando un resumen cuantitativo y
    la lista completa de homologías compartidas (decisión de la usuaria,
    31/08/2026: "ambos combinados"). El resumen cuenta cuántas regiones
    reales tiene cargada cada especie y cuántas de ellas participan en
    alguna homología real con la otra especie de esta comparación --
    nunca compara "topología" entre especies, porque solo el humano
    tiene conectividad estructural real cargada (Brainnetome/HCP-MMP1.0);
    chimpancé y macaco solo tienen regiones y homologías. Lanza un error
    si alguna de las dos especies no existe -- nunca compara contra una
    especie inventada."""
    with session_scope() as db:
        return species_service.compare_species(db, species_a_id, species_b_id)


@mcp.tool()
@audited_tool("render_network")
def render_network(atlas_id: str, connection_type: str = "structural", min_weight: float = 0.0) -> Image:
    """Imagen PNG real: connectograma circular de un atlas, con los nodos
    coloreados por red funcional real (leyenda incluida) y una cuerda
    gris por cada conexión real por encima de `min_weight`. Nunca un
    descriptor de escena -- una imagen real, igual que pidió la usuaria
    (31/08/2026). Lanza un error si el atlas no tiene ninguna región real
    cargada."""
    with session_scope() as db:
        png_bytes = render_service.render_network(db, atlas_id, connection_type, min_weight)
    return Image(data=png_bytes, format="png")


@mcp.tool()
@audited_tool("render_brain")
def render_brain(atlas_id: str, connection_type: str = "structural", min_weight: float = 0.0) -> Image:
    """Imagen PNG real: proyección 2D (vista axial, coordenada real X/Y
    de cada región, eje Z descartado) de un atlas, coloreada por red
    funcional real (leyenda incluida), con las conexiones reales por
    encima de `min_weight` como líneas finas. Lanza un error si el atlas
    no tiene ninguna región real cargada."""
    with session_scope() as db:
        png_bytes = render_service.render_brain(db, atlas_id, connection_type, min_weight)
    return Image(data=png_bytes, format="png")


@mcp.tool(structured_output=False)  # ver docstring: `list[Image]` no es esquematizable por pydantic
@audited_tool("compare_species_images")
def compare_species_images(
    species_a_id: str, species_b_id: str, connection_type: str = "structural", min_weight: float = 0.0
) -> list[Image]:
    """Tres imágenes PNG reales que comparan dos especies (decisión de la
    usuaria, 31/08/2026): (1) un connectograma circular con las regiones
    reales de las dos especies (todos sus atlas), coloreadas en tres
    categorías -- exclusiva de la especie A, exclusiva de la especie B, y
    homóloga/compartida (participa en al menos una homología real con la
    otra especie de esta comparación) -- con una cuerda real por cada
    homología y leyenda de las tres categorías; (2) y (3), un esquema
    interhemisférico real por especie (solo sus regiones homólogas con la
    otra), coloreado por hemisferio real. Nunca superpone las dos
    especies en un único cerebro 3D: cada una tiene su propia anatomía y
    su propio espacio de referencia (decisión 29), así que no tendría
    sentido dibujarlas juntas en una escena espacial. Lanza un error si
    alguna de las dos especies no existe, o si existen pero no comparten
    ninguna homología real.

    `structured_output=False` (bug real encontrado al conectar esta
    herramienta, 31/08/2026, decisión 37): el SDK de MCP intenta generar
    un esquema pydantic de salida a partir del tipo de retorno anotado, y
    `Image` está especialcasada para un retorno suelto pero NO dentro de
    un `list[...]` -- sin este parámetro, registrar la herramienta
    lanzaba `PydanticSchemaGenerationError` en cuanto se importaba este
    módulo, antes incluso de poder llamarla."""
    with session_scope() as db:
        images = species_render_service.render_species_comparison_images(
            db, species_a_id, species_b_id, connection_type, min_weight
        )
    return [
        Image(data=images.homology_connectogram_png, format="png"),
        Image(data=images.species_a_hemisphere_png, format="png"),
        Image(data=images.species_b_hemisphere_png, format="png"),
    ]


@mcp.tool()
@audited_tool("propose_dataset_ingestion")
def propose_dataset_ingestion(
    dataset_dir: str,
    study_id: str | None = None,
    study_name: str | None = None,
    study_doi: str | None = None,
    study_year: int | None = None,
    study_authors: list[str] | None = None,
    study_journal: str | None = None,
) -> DatasetIngestionProposal:
    """Propone el SQL de alta de un dataset real ya organizado con su
    `dataset.yaml` y su mapa `files` (decisión 46, cierra el ciclo que la
    decisión 44 dejó preparado: manifiesto real -> lector real -> SQL).
    `dataset_dir` es una ruta LOCAL en la máquina donde corre este
    servidor MCP (la misma que ya aloja la biblioteca de datos, sección
    23) -- nunca una ruta remota ni relativa a este proceso.

    Solo funciona si el `format` del manifiesto ya es una de las cuatro
    etiquetas de `backend/ingestion/datasets/formats.py::SUPPORTED_FORMATS`
    (nunca `unsupported_pending_adapter`, que necesita su propio
    adaptador nuevo primero, ver `docs/protocolo-ingesta-ia.md`) y si su
    mapa `files` cubre todos los roles que ese formato necesita.

    NUNCA toca la base de datos real ni la conexión con ella: solo
    genera y devuelve el SQL de alta (idempotente, `ON CONFLICT DO
    UPDATE`, mismo estilo que todos los `scripts/register_*.py`) para
    que una persona lo revise antes de aplicarlo -- ninguna
    automatización de este protocolo sustituye esa revisión humana
    (decisión 17). `study_id`/`study_name` son opcionales pero, si se da
    uno, hace falta el otro: sin ellos, el atlas se da de alta sin
    enlazar ningún estudio (nunca uno inventado)."""
    study = None
    if study_id is not None:
        if study_name is None:
            raise ValueError("study_id requiere también study_name")
        study = StudyInfo(
            id=study_id,
            name=study_name,
            doi=study_doi,
            year=study_year,
            authors=study_authors,
            journal=study_journal,
        )
    return dataset_ingestion_service.propose_dataset_ingestion(dataset_dir, study=study)


if __name__ == "__main__":
    mcp.run(transport="stdio")
