"""Grafo híbrido tractografía+parcelación (decisión 66, 09/09/2026):
cuarta pestaña de la sección de tractografía pedida por la usuaria --
"hagamos una cuarta pestaña con nodos derivados de tractografía...
se seleccionan nodos y el programa devuelve la tractografía que los
une". Investigado antes de construir nada (ver docs/analisis-
arquitectura.md, decisión 66): NO existe ningún registro espacial
verificado entre el espacio propio de ORG-800FC-100HCP y MNI152/fsLR32k
(fuentes primarias: scripts/README de SlicerDMRI, el propio paper de
registro de O'Donnell & Wells 2012, y el atlas sucesor de 2024) -- así
que un "atlas híbrido" que mezclara nodos del connectograma (MNI152)
con streamlines reales habría repetido exactamente el error que la
decisión 49 ya evitó. La alternativa real, sin ese problema: derivar los
nodos DENTRO del propio espacio de la tractografía, a partir de una
parcelación que ya vive ahí -- el mismo `100HCP-population-mean-
wmparc.nii.gz` que la decisión 63 ya verificó en el mismo espacio real
que las streamlines (solape empírico confirmado, caja delimitadora casi
1:1).

Dos piezas reales, calculadas aquí, sin ninguna base de datos de por
medio (módulo puro, mismo reparto de responsabilidades que
`org_atlas.py`):

1. **Nodos** (`compute_node_definitions`): un nodo por cada etiqueta
   real y con nombre verificado del wmparc (`wmparc_labels.label_name`)
   -- excluye siempre la etiqueta de fondo (0) y las dos etiquetas
   "unknown" de la propia parcelación (`wmparc_labels.EXCLUDED_LABELS`,
   nunca una región real). La posición de cada nodo es el centroide real
   (media de los vóxeles reales de esa etiqueta, transformado a
   milímetros con el affine real del NIfTI) -- un dato DERIVADO, nunca
   publicado directamente por el atlas, por eso `method` es obligatorio
   (riesgo 4 del análisis de arquitectura, mismo criterio que
   `RegionNetworkMembership`).

2. **Aristas** (`compute_edge_definitions`): para cada una de las 523696
   streamlines REALES (resolución completa, nunca la muestra de 300 por
   tracto ya recortada de `tract_geometries` -- usar esa habría sesgado
   la conectividad hacia lo que ya se decidió mostrar, no hacia lo que
   de verdad conecta cada par de nodos) de los 41 tractos de
   ORG-800FC-100HCP, se toman sus dos puntos extremos reales, se
   transforman a índice de vóxel con el affine INVERSO real del NIfTI
   (redondeo al vóxel más cercano, nunca interpolado) y se consulta la
   etiqueta real del wmparc en ese vóxel. Una streamline solo forma
   parte de una arista si SUS DOS extremos caen en una etiqueta real
   nombrada (nunca fondo, nunca "unknown", nunca el mismo nodo en los
   dos extremos -- un bucle no informa de conectividad ENTRE nodos,
   mismo criterio estructural que ya exige `compute_induced_connectivity`
   para un tracto: "toca dos o más regiones", decisión 12). El resto
   (extremo en fondo/unknown, o los dos extremos en el mismo nodo) se
   cuenta y se disclosea en `HybridGraphDiagnostics`, nunca se descarta
   en silencio.

   El recuento real de streamlines de cada arista se guarda siempre
   junto al recuento mostrado (`streamline_count_real`/`_shown`, mismo
   principio que `TractGeometryDefinition`); la muestra mostrada es una
   reserva determinista (algoritmo R de muestreo por reserva, semilla
   fija) sobre el ORDEN REAL de aparición de las streamlines (tractos en
   orden alfabético de código, streamlines dentro de cada tracto en el
   orden real de lectura del .zip) -- nunca las primeras N ni una
   muestra sin semilla, mismo criterio que `downsample_streamlines`.

Investigado y validado empíricamente antes de escribir este módulo
(09/09/2026, ver decisión 66): 178 etiquetas reales distintas con
vóxeles en el wmparc, 176 con nombre verificado (2 excluidas,
"ctx-lh/rh-unknown", 482 vóxeles reales de más de 800000), 5176 aristas
reales tras fusionar por par de nodos a través de los 41 tractos, con
ejemplos anatómicamente coherentes verificados a mano (tracto
corticoespinal, conexiones calloas homotópicas, fascículo arqueado).
"""
from __future__ import annotations

import random
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path

import nibabel as nib
import numpy as np

from backend.ingestion.tractography.org_atlas import (
    REFERENCE_SPACE,
    Point,
    iter_full_streamlines_by_tract,
)
from backend.ingestion.tractography.wmparc_labels import EXCLUDED_LABELS, label_name
from backend.ontology.schema import EntityType, build_id

SPECIES_ID = build_id(EntityType.SPECIES, "human", "ncbi-taxonomy", "9606")

# Topes de INGENIERÍA (cuántas streamlines dibuja un navegador con
# fluidez por arista), nunca científicos -- mismo criterio que
# DEFAULT_MAX_STREAMLINES_PER_TRACT de org_atlas.py. Con 5176 aristas
# reales (muchas más que los 41 tractos), un tope menor por arista
# mantiene el volumen total de geometría en el mismo orden que
# tract_geometries (~40000 streamlines mostradas en total, comprobado
# contra el archivo real, decisión 66).
DEFAULT_MAX_STREAMLINES_PER_EDGE = 20
DEFAULT_RNG_SEED = 0

METHOD_NODE_CENTROID = "wmparc_label_centroid_real_affine"
METHOD_EDGE_ENDPOINTS = "streamline_endpoint_to_wmparc_label_nearest_voxel"


@dataclass(frozen=True)
class HybridNodeDefinition:
    id: str
    name: str
    wmparc_label: int
    x: float
    y: float
    z: float
    reference_space: str
    method: str

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("HybridNodeDefinition.id no puede estar vacío")
        if not self.name:
            raise ValueError("HybridNodeDefinition.name no puede estar vacío")


@dataclass(frozen=True)
class HybridEdgeDefinition:
    node_a_id: str
    node_b_id: str
    tract_codes: tuple[str, ...]
    streamlines: tuple[tuple[Point, ...], ...]
    streamline_count_real: int
    streamline_count_shown: int
    reference_space: str
    method: str

    def __post_init__(self) -> None:
        if self.node_a_id == self.node_b_id:
            raise ValueError(
                "HybridEdgeDefinition no admite node_a_id == node_b_id -- "
                "un bucle no es una conexión ENTRE dos nodos (ver docstring)"
            )
        if self.node_a_id >= self.node_b_id:
            raise ValueError(
                "HybridEdgeDefinition exige node_a_id < node_b_id (orden "
                "canónico) -- para que cada par real solo tenga una fila"
            )
        if not self.tract_codes:
            raise ValueError(
                "HybridEdgeDefinition.tract_codes no puede estar vacío -- "
                "toda arista real viene de al menos un tracto real"
            )
        if self.streamline_count_shown != len(self.streamlines):
            raise ValueError(
                "streamline_count_shown no coincide con len(streamlines) -- "
                "mismo criterio que TractGeometryDefinition"
            )
        if self.streamline_count_shown > self.streamline_count_real:
            raise ValueError(
                "streamline_count_shown no puede superar streamline_count_real"
            )


@dataclass(frozen=True)
class HybridGraphDiagnostics:
    """Disclosure honesto de lo que NO se convirtió en arista -- nunca se
    descarta un extremo/streamline en silencio (sección 24). Todos los
    campos son recuentos reales, no estimaciones."""

    streamlines_real_total: int
    endpoints_real_total: int
    endpoints_in_named_label: int
    endpoints_background: int
    endpoints_in_excluded_label: int
    streamlines_dropped_self_loop: int
    excluded_label_voxel_counts: dict[int, int] = field(default_factory=dict)


@dataclass(frozen=True)
class HybridGraphResult:
    nodes: list[HybridNodeDefinition]
    edges: list[HybridEdgeDefinition]
    diagnostics: HybridGraphDiagnostics


def read_wmparc(wmparc_path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Carga el wmparc real y devuelve `(data, affine)` -- mismo patrón
    ya usado en `scripts/generate_org_atlas_mesh.py` (`nib.load`,
    `img.affine` real, nunca un affine supuesto). `data` conserva el
    tipo entero real de las etiquetas (nunca redondeado desde float)."""
    img = nib.load(str(wmparc_path))
    data = np.asarray(img.dataobj).astype(np.int64)
    return data, np.asarray(img.affine, dtype=np.float64)


def compute_node_definitions(data: np.ndarray, affine: np.ndarray) -> list[HybridNodeDefinition]:
    """Un nodo por cada etiqueta real (≠0, no excluida) con al menos un
    vóxel real en `data`. Centroide = media de los índices de vóxel
    reales de esa etiqueta, transformada a milímetros con el affine
    real (`nib.affines.apply_affine`) -- nunca el centro de la caja
    delimitadora (que puede caer fuera de la propia estructura en formas
    no convexas)."""
    labels = np.unique(data)
    nodes: list[HybridNodeDefinition] = []
    for label in sorted(int(v) for v in labels if v != 0):
        if label in EXCLUDED_LABELS:
            continue
        name = label_name(label)  # UnverifiedLabelError real si no está verificado
        voxel_idx = np.argwhere(data == label)  # (N, 3) real, índices (i, j, k)
        centroid_voxel = voxel_idx.mean(axis=0)
        centroid_mm = nib.affines.apply_affine(affine, centroid_voxel)
        nodes.append(
            HybridNodeDefinition(
                id=build_id(EntityType.REGION, "human", "org2018_wmparc", str(label)),
                name=name,
                wmparc_label=label,
                x=float(centroid_mm[0]),
                y=float(centroid_mm[1]),
                z=float(centroid_mm[2]),
                reference_space=REFERENCE_SPACE,
                method=METHOD_NODE_CENTROID,
            )
        )
    return nodes


def _endpoint_label(point_mm: Point, inv_affine: np.ndarray, data: np.ndarray) -> int:
    """Etiqueta real del vóxel más cercano a un punto real en milímetros
    -- transforma con el afín INVERSO real (`np.linalg.inv(affine)`,
    nunca uno supuesto) y redondea al índice de vóxel entero más
    próximo. Devuelve 0 (fondo) si el punto cae fuera del volumen real
    -- nunca inventa una etiqueta de borde."""
    voxel = inv_affine @ np.array([point_mm[0], point_mm[1], point_mm[2], 1.0])
    i, j, k = (round(v) for v in voxel[:3])
    shape = data.shape
    if not (0 <= i < shape[0] and 0 <= j < shape[1] and 0 <= k < shape[2]):
        return 0
    return int(data[i, j, k])


def compute_edge_definitions(
    node_defs: Iterable[HybridNodeDefinition],
    data: np.ndarray,
    affine: np.ndarray,
    tracts: Iterable[tuple[str, list[list[Point]]]],
    max_streamlines_per_edge: int = DEFAULT_MAX_STREAMLINES_PER_EDGE,
    seed: int = DEFAULT_RNG_SEED,
) -> tuple[list[HybridEdgeDefinition], HybridGraphDiagnostics]:
    """Recorre las streamlines REALES y completas de `tracts` -- en
    producción, `iter_full_streamlines_by_tract(zip_path)`, nunca la
    muestra ya recortada de `tract_geometries` -- y agrega, por par de
    nodos reales, sus tractos contribuyentes, el recuento real total y
    una muestra determinista (algoritmo R, semilla fija) de la geometría
    completa para dibujar. Recibe `tracts` ya como pares
    `(código, streamlines)` (en vez de una ruta de archivo) para poder
    probarse con datos sintéticos sin depender del .zip real -- mismo
    reparto puro/E-S ya usado en el resto del proyecto (p. ej.
    `build_tract_summaries` vs `list_tracts_with_geometry`)."""
    node_id_by_label = {n.wmparc_label: n.id for n in node_defs}
    inv_affine = np.linalg.inv(affine)

    # Estado de agregación por par canónico (label_a < label_b).
    counts: dict[tuple[int, int], int] = {}
    tract_codes: dict[tuple[int, int], set[str]] = {}
    reservoirs: dict[tuple[int, int], list[list[Point]]] = {}
    seen: dict[tuple[int, int], int] = {}
    rng = random.Random(seed)

    streamlines_real_total = 0
    endpoints_in_named_label = 0
    endpoints_background = 0
    endpoints_in_excluded_label = 0
    streamlines_dropped_self_loop = 0

    for code, streamlines in tracts:
        for streamline in streamlines:
            streamlines_real_total += 1
            label_a = _endpoint_label(streamline[0], inv_affine, data)
            label_b = _endpoint_label(streamline[-1], inv_affine, data)

            for label in (label_a, label_b):
                if label == 0:
                    endpoints_background += 1
                elif label in EXCLUDED_LABELS:
                    endpoints_in_excluded_label += 1
                else:
                    endpoints_in_named_label += 1

            if label_a == 0 or label_b == 0:
                continue
            if label_a in EXCLUDED_LABELS or label_b in EXCLUDED_LABELS:
                continue
            if label_a == label_b:
                streamlines_dropped_self_loop += 1
                continue

            key = (label_a, label_b) if label_a < label_b else (label_b, label_a)
            counts[key] = counts.get(key, 0) + 1
            tract_codes.setdefault(key, set()).add(code)

            n_seen = seen.get(key, 0) + 1
            seen[key] = n_seen
            reservoir = reservoirs.setdefault(key, [])
            if len(reservoir) < max_streamlines_per_edge:
                reservoir.append(streamline)
            else:
                j = rng.randint(0, n_seen - 1)
                if j < max_streamlines_per_edge:
                    reservoir[j] = streamline

    excluded_voxel_counts = {
        label: int(np.count_nonzero(data == label)) for label in EXCLUDED_LABELS
    }

    edges: list[HybridEdgeDefinition] = []
    for key in sorted(counts):
        label_a, label_b = key
        node_a_id = node_id_by_label[label_a]
        node_b_id = node_id_by_label[label_b]
        # Orden canónico por id de nodo (no por etiqueta numérica): el
        # constructor de HybridEdgeDefinition lo exige.
        if node_a_id > node_b_id:
            node_a_id, node_b_id = node_b_id, node_a_id
        shown = reservoirs[key]
        edges.append(
            HybridEdgeDefinition(
                node_a_id=node_a_id,
                node_b_id=node_b_id,
                tract_codes=tuple(sorted(tract_codes[key])),
                streamlines=tuple(tuple(pt for pt in s) for s in shown),
                streamline_count_real=counts[key],
                streamline_count_shown=len(shown),
                reference_space=REFERENCE_SPACE,
                method=METHOD_EDGE_ENDPOINTS,
            )
        )

    diagnostics = HybridGraphDiagnostics(
        streamlines_real_total=streamlines_real_total,
        endpoints_real_total=streamlines_real_total * 2,
        endpoints_in_named_label=endpoints_in_named_label,
        endpoints_background=endpoints_background,
        endpoints_in_excluded_label=endpoints_in_excluded_label,
        streamlines_dropped_self_loop=streamlines_dropped_self_loop,
        excluded_label_voxel_counts=excluded_voxel_counts,
    )
    return edges, diagnostics


def compute_hybrid_graph(
    wmparc_path: Path,
    tract_zip_path: Path,
    max_streamlines_per_edge: int = DEFAULT_MAX_STREAMLINES_PER_EDGE,
    seed: int = DEFAULT_RNG_SEED,
) -> HybridGraphResult:
    """Orquesta las dos piezas reales (nodos, aristas) contra los dos
    archivos reales de la usuaria. No toca ninguna base de datos --
    `scripts/generate_hybrid_tractography_nodes.py` es quien genera el
    SQL a partir de este resultado, mismo reparto de responsabilidades
    que `org_atlas.read_org_atlas` / `generate_org_tractography_geometry.py`."""
    data, affine = read_wmparc(wmparc_path)
    nodes = compute_node_definitions(data, affine)
    edges, diagnostics = compute_edge_definitions(
        nodes,
        data,
        affine,
        iter_full_streamlines_by_tract(tract_zip_path),
        max_streamlines_per_edge,
        seed,
    )
    return HybridGraphResult(nodes=nodes, edges=edges, diagnostics=diagnostics)
