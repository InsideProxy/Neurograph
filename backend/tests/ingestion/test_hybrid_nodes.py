"""Pruebas de backend/ingestion/tractography/hybrid_nodes.py.

Sintéticas en su mayoría -- no dependen de los archivos reales de la
usuaria (wmparc/.zip de tractografía). El último grupo
(`test_compute_hybrid_graph_against_real_files`) sí los requiere y se
salta si no están montados, con los valores de referencia fijados a
partir del cálculo exhaustivo verificado el 09/09/2026 contra esos
mismos archivos (decisión 66 de docs/analisis-arquitectura.md) -- mismo
patrón que `test_read_org_atlas_against_real_zip`."""
from pathlib import Path

import numpy as np
import pytest

from backend.ingestion.tractography.hybrid_nodes import (
    METHOD_EDGE_ENDPOINTS,
    METHOD_NODE_CENTROID,
    HybridEdgeDefinition,
    HybridNodeDefinition,
    _endpoint_label,
    compute_edge_definitions,
    compute_hybrid_graph,
    compute_node_definitions,
)
from backend.ingestion.tractography.wmparc_labels import UnverifiedLabelError

# ---------------------------------------------------------------------------
# HybridNodeDefinition / HybridEdgeDefinition -- validación pura
# ---------------------------------------------------------------------------


def _valid_node_kwargs(**overrides):
    kwargs = {
        "id": "region.human.org2018_wmparc.10",
        "name": "Left-Thalamus",
        "wmparc_label": 10,
        "x": 1.0, "y": 2.0, "z": 3.0,
        "reference_space": "ORG_800FC_100HCP_groupwise",
        "method": METHOD_NODE_CENTROID,
    }
    kwargs.update(overrides)
    return kwargs


def _valid_edge_kwargs(**overrides):
    kwargs = {
        "node_a_id": "region.human.org2018_wmparc.10",
        "node_b_id": "region.human.org2018_wmparc.49",
        "tract_codes": ("CST",),
        "streamlines": (((0.0, 0.0, 0.0), (1.0, 1.0, 1.0)),),
        "streamline_count_real": 1,
        "streamline_count_shown": 1,
        "reference_space": "ORG_800FC_100HCP_groupwise",
        "method": METHOD_EDGE_ENDPOINTS,
    }
    kwargs.update(overrides)
    return kwargs


def test_node_definition_accepts_valid_data():
    node = HybridNodeDefinition(**_valid_node_kwargs())
    assert node.name == "Left-Thalamus"


def test_node_definition_rejects_empty_id():
    with pytest.raises(ValueError):
        HybridNodeDefinition(**_valid_node_kwargs(id=""))


def test_node_definition_rejects_empty_name():
    with pytest.raises(ValueError):
        HybridNodeDefinition(**_valid_node_kwargs(name=""))


def test_edge_definition_accepts_valid_data():
    edge = HybridEdgeDefinition(**_valid_edge_kwargs())
    assert edge.tract_codes == ("CST",)


def test_edge_definition_rejects_self_loop():
    with pytest.raises(ValueError):
        HybridEdgeDefinition(
            **_valid_edge_kwargs(
                node_a_id="region.human.org2018_wmparc.10",
                node_b_id="region.human.org2018_wmparc.10",
            )
        )


def test_edge_definition_rejects_non_canonical_order():
    with pytest.raises(ValueError):
        HybridEdgeDefinition(
            **_valid_edge_kwargs(
                node_a_id="region.human.org2018_wmparc.49",
                node_b_id="region.human.org2018_wmparc.10",
            )
        )


def test_edge_definition_rejects_empty_tract_codes():
    with pytest.raises(ValueError):
        HybridEdgeDefinition(**_valid_edge_kwargs(tract_codes=()))


def test_edge_definition_rejects_shown_count_mismatch():
    with pytest.raises(ValueError):
        HybridEdgeDefinition(**_valid_edge_kwargs(streamline_count_shown=2))


def test_edge_definition_rejects_shown_greater_than_real():
    with pytest.raises(ValueError):
        HybridEdgeDefinition(
            **_valid_edge_kwargs(
                streamlines=(
                    ((0.0, 0.0, 0.0),),
                    ((1.0, 1.0, 1.0),),
                ),
                streamline_count_real=1,
                streamline_count_shown=2,
            )
        )


# ---------------------------------------------------------------------------
# Volumen sintético: affine identidad, dos etiquetas reales + fondo +
# una etiqueta excluida (1000) -- mismo tipo de dato que el wmparc real,
# a escala manejable.
# ---------------------------------------------------------------------------


def _synthetic_volume():
    data = np.zeros((10, 10, 10), dtype=np.int64)
    data[1:3, 1:3, 1:3] = 10  # Left-Thalamus, 8 vóxeles reales
    data[6:8, 6:8, 6:8] = 49  # Right-Thalamus, 8 vóxeles reales
    data[0, 0, 0] = 1000  # ctx-lh-unknown -- excluida, nunca nodo
    affine = np.eye(4)
    return data, affine


def test_compute_node_definitions_excludes_background_and_unknown():
    data, affine = _synthetic_volume()
    nodes = compute_node_definitions(data, affine)
    labels = {n.wmparc_label for n in nodes}
    assert labels == {10, 49}  # ni 0 (fondo) ni 1000 (excluida)


def test_compute_node_definitions_centroid_is_real_voxel_mean_in_mm():
    data, affine = _synthetic_volume()
    nodes = {n.wmparc_label: n for n in compute_node_definitions(data, affine)}
    # Con affine identidad, el centroide en mm == centroide en índice de
    # vóxel: media de {1, 2} en cada eje = 1.5.
    assert nodes[10].x == pytest.approx(1.5)
    assert nodes[10].y == pytest.approx(1.5)
    assert nodes[10].z == pytest.approx(1.5)
    assert nodes[10].method == METHOD_NODE_CENTROID


def test_compute_node_definitions_raises_on_unverified_real_label():
    data, affine = _synthetic_volume()
    data[5, 5, 5] = 424242  # etiqueta real en el volumen, sin nombre verificado
    with pytest.raises(UnverifiedLabelError):
        compute_node_definitions(data, affine)


# ---------------------------------------------------------------------------
# _endpoint_label
# ---------------------------------------------------------------------------


def test_endpoint_label_returns_real_label_at_nearest_voxel():
    data, affine = _synthetic_volume()
    inv_affine = np.linalg.inv(affine)
    assert _endpoint_label((1.6, 1.4, 1.5), inv_affine, data) == 10


def test_endpoint_label_returns_background_when_outside_volume():
    data, affine = _synthetic_volume()
    inv_affine = np.linalg.inv(affine)
    assert _endpoint_label((999.0, 999.0, 999.0), inv_affine, data) == 0


# ---------------------------------------------------------------------------
# compute_edge_definitions -- streamlines sintéticas, tractos sintéticos
# ---------------------------------------------------------------------------


def _synthetic_tracts():
    # Tres streamlines reales conectando Thalamus izq. (label 10, ~ (1.5,1.5,1.5))
    # con Thalamus der. (label 49, ~ (6.5,6.5,6.5)), una con ambos extremos
    # en el mismo nodo (bucle, debe descartarse) y una que toca fondo.
    thal_l = (1.5, 1.5, 1.5)
    thal_r = (6.5, 6.5, 6.5)
    return [
        ("AF", [[thal_l, (3.0, 3.0, 3.0), thal_r]]),
        ("CST", [[thal_l, thal_r], [thal_l, thal_l]]),  # una real + un bucle
        ("UF", [[thal_l, (500.0, 500.0, 500.0)]]),  # un extremo en fondo
    ]


def test_compute_edge_definitions_aggregates_across_tracts():
    data, affine = _synthetic_volume()
    nodes = compute_node_definitions(data, affine)
    edges, _diagnostics = compute_edge_definitions(nodes, data, affine, _synthetic_tracts())

    assert len(edges) == 1
    edge = edges[0]
    assert set(edge.tract_codes) == {"AF", "CST"}
    assert edge.streamline_count_real == 2  # AF (1) + CST (1 real, sin el bucle)
    assert edge.streamline_count_shown == 2


def test_compute_edge_definitions_drops_self_loop_and_counts_it():
    data, affine = _synthetic_volume()
    nodes = compute_node_definitions(data, affine)
    _, diagnostics = compute_edge_definitions(nodes, data, affine, _synthetic_tracts())
    assert diagnostics.streamlines_dropped_self_loop == 1


def test_compute_edge_definitions_discloses_background_endpoint():
    data, affine = _synthetic_volume()
    nodes = compute_node_definitions(data, affine)
    _, diagnostics = compute_edge_definitions(nodes, data, affine, _synthetic_tracts())
    # La streamline de UF toca fondo en un extremo -- un endpoint de
    # fondo real, nunca descartado en silencio.
    assert diagnostics.endpoints_background >= 1
    assert diagnostics.streamlines_real_total == 4  # 1 (AF) + 2 (CST) + 1 (UF)


def test_compute_edge_definitions_is_deterministic_with_same_seed():
    data, affine = _synthetic_volume()
    nodes = compute_node_definitions(data, affine)
    many_streamlines = [
        ("AF", [[(1.5, 1.5, 1.5), (float(i), float(i), float(i)), (6.5, 6.5, 6.5)] for i in range(50)])
    ]
    edges_a, _ = compute_edge_definitions(nodes, data, affine, many_streamlines, max_streamlines_per_edge=5, seed=7)
    edges_b, _ = compute_edge_definitions(nodes, data, affine, many_streamlines, max_streamlines_per_edge=5, seed=7)
    assert edges_a[0].streamlines == edges_b[0].streamlines
    assert edges_a[0].streamline_count_real == 50
    assert edges_a[0].streamline_count_shown == 5


def test_compute_edge_definitions_never_exceeds_cap_even_with_many_real_streamlines():
    data, affine = _synthetic_volume()
    nodes = compute_node_definitions(data, affine)
    many_streamlines = [
        ("AF", [[(1.5, 1.5, 1.5), (6.5, 6.5, 6.5)] for _ in range(1000)])
    ]
    edges, _ = compute_edge_definitions(nodes, data, affine, many_streamlines, max_streamlines_per_edge=10)
    assert edges[0].streamline_count_real == 1000
    assert edges[0].streamline_count_shown == 10


# ---------------------------------------------------------------------------
# compute_hybrid_graph -- requiere los dos archivos reales de la usuaria
# ---------------------------------------------------------------------------

_WMPARC_PATH = (
    Path.home() / "mnt" / "NeuroData" / "original" / "tractography"
    / "100HCP-population-mean-wmparc.nii.gz"
)
_ZIP_PATH = (
    Path.home() / "mnt" / "NeuroData" / "original" / "tractography"
    / "ORG-800FiberClusters.zip"
)

_REQUIRES_REAL_DATA = pytest.mark.skipif(
    not (_WMPARC_PATH.exists() and _ZIP_PATH.exists()),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada",
)


@_REQUIRES_REAL_DATA
def test_compute_hybrid_graph_against_real_files():
    result = compute_hybrid_graph(_WMPARC_PATH, _ZIP_PATH)

    # Valores de referencia verificados exhaustivamente el 09/09/2026
    # contra los archivos reales (decisión 66) -- no un umbral.
    assert len(result.nodes) == 176
    assert len(result.edges) == 5176
    assert result.diagnostics.streamlines_real_total == 523696
    assert result.diagnostics.endpoints_real_total == 1047392
    assert (
        result.diagnostics.endpoints_in_named_label
        + result.diagnostics.endpoints_background
        + result.diagnostics.endpoints_in_excluded_label
        == result.diagnostics.endpoints_real_total
    )
    assert result.diagnostics.excluded_label_voxel_counts == {1000: 64, 2000: 418}

    node_ids = [n.id for n in result.nodes]
    assert len(node_ids) == len(set(node_ids))
    for edge in result.edges:
        assert edge.node_a_id < edge.node_b_id
        assert edge.streamline_count_shown <= edge.streamline_count_real
