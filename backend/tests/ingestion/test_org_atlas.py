"""Pruebas de backend/ingestion/tractography/org_atlas.py.

La mayoría son sintéticas y no requieren el .zip real de 500MB
(`ORG-800FiberClusters.zip`) ni la librería `vtk` instalada -- prueban
la lógica pura (parseo de nombres de cluster, muestreo determinista,
validación del dataclass, saneado del código con `&`). El único grupo
que necesita `vtk` (`test_read_streamlines_from_vtp_bytes_*`) usa
`pytest.importorskip` porque `vtk` no es una dependencia obligatoria
del proyecto -- igual que `scikit-image`/`pygltflib` en
`scripts/generate_brain_meshes.py`, solo hace falta para el script de
un solo uso, nunca en tiempo de ejecución del backend -- y construye su
propio archivo `.vtp` sintético con el propio `vtk` (ida y vuelta:
escribe puntos conocidos, los decodifica, comprueba que coinciden) en
vez de fabricar bytes binarios a mano.

El último grupo (`test_read_org_atlas_against_real_zip`) sí requiere el
archivo real de la usuaria y se salta si no está montado, con los
valores esperados fijados a partir del recuento exhaustivo verificado
el 02/09/2026 contra ese mismo archivo (523696 streamlines reales /
26293928 puntos en total; ver docs/analisis-arquitectura.md, decisión
49) -- mismo patrón que test_yeh2022_tract_region.py.
"""
from pathlib import Path

import pytest

from backend.ingestion.tractography.org_atlas import (
    DEFAULT_RNG_SEED,
    FALSE_POSITIVE_CODE,
    STUDY_ID,
    TRACT_NAMES,
    TractGeometryDefinition,
    _sanitize_code_for_id,
    downsample_streamlines,
    parse_cluster_filenames,
    read_org_atlas,
)


def _valid_kwargs(**overrides):
    kwargs = dict(
        id="tract.human.org2018.af",
        name="Arcuate Fasciculus",
        abbreviation="AF",
        species_id="species.human.ncbi-taxonomy.9606",
        study_id=STUDY_ID,
        streamlines=((0.0, 0.0, 0.0), (1.0, 1.0, 1.0)),
        streamline_count_real=2,
        streamline_count_shown=2,
        reference_space="ORG_800FC_100HCP_groupwise",
    )
    kwargs.update(overrides)
    return kwargs


# ---------------------------------------------------------------------------
# TRACT_NAMES / constantes
# ---------------------------------------------------------------------------


def test_tract_names_has_41_entries_and_no_false_positive():
    assert len(TRACT_NAMES) == 41
    assert FALSE_POSITIVE_CODE not in TRACT_NAMES


def test_study_id_follows_the_project_convention():
    assert STUDY_ID == "study.human.zhang2018.zhang_2018"


# ---------------------------------------------------------------------------
# _sanitize_code_for_id
# ---------------------------------------------------------------------------


def test_sanitize_code_for_id_replaces_ampersand():
    assert _sanitize_code_for_id("Intra-CBLM-I&P") == "Intra-CBLM-IandP"


def test_sanitize_code_for_id_leaves_ordinary_codes_untouched():
    for code in ("AF", "SLF-I", "CC1"):
        assert _sanitize_code_for_id(code) == code


# ---------------------------------------------------------------------------
# parse_cluster_filenames
# ---------------------------------------------------------------------------


def test_parse_cluster_filenames_dedupes_and_sorts():
    mrml = """
    <MRML>
      <ModelNode name="cluster_00042.vtp" storageNodeRef="..."/>
      <ModelStorageNode fileName="cluster_00042.vtp"/>
      <ModelNode name="cluster_00007.vtp"/>
    </MRML>
    """
    assert parse_cluster_filenames(mrml) == ["cluster_00007.vtp", "cluster_00042.vtp"]


def test_parse_cluster_filenames_returns_empty_list_when_no_match():
    assert parse_cluster_filenames("<MRML></MRML>") == []


# ---------------------------------------------------------------------------
# downsample_streamlines
# ---------------------------------------------------------------------------


def test_downsample_streamlines_returns_all_when_under_cap():
    streamlines = [[(float(i), 0.0, 0.0)] for i in range(5)]
    result = downsample_streamlines(streamlines, max_count=300)
    assert result == streamlines


def test_downsample_streamlines_reduces_to_max_count():
    streamlines = [[(float(i), 0.0, 0.0)] for i in range(1000)]
    result = downsample_streamlines(streamlines, max_count=300, seed=DEFAULT_RNG_SEED)
    assert len(result) == 300
    # cada streamline muestreada es una de las originales, no inventada
    assert all(s in streamlines for s in result)


def test_downsample_streamlines_is_deterministic_with_same_seed():
    streamlines = [[(float(i), 0.0, 0.0)] for i in range(1000)]
    first = downsample_streamlines(streamlines, max_count=300, seed=7)
    second = downsample_streamlines(streamlines, max_count=300, seed=7)
    assert first == second


def test_downsample_streamlines_differs_with_different_seed():
    streamlines = [[(float(i), 0.0, 0.0)] for i in range(1000)]
    a = downsample_streamlines(streamlines, max_count=300, seed=0)
    b = downsample_streamlines(streamlines, max_count=300, seed=1)
    assert a != b


# ---------------------------------------------------------------------------
# TractGeometryDefinition
# ---------------------------------------------------------------------------


def test_tract_geometry_definition_accepts_valid_data():
    d = TractGeometryDefinition(**_valid_kwargs())
    assert d.abbreviation == "AF"


def test_tract_geometry_definition_rejects_empty_id():
    with pytest.raises(ValueError):
        TractGeometryDefinition(**_valid_kwargs(id=""))


def test_tract_geometry_definition_rejects_shown_count_mismatch():
    with pytest.raises(ValueError):
        TractGeometryDefinition(**_valid_kwargs(streamline_count_shown=1))


def test_tract_geometry_definition_rejects_shown_greater_than_real():
    with pytest.raises(ValueError):
        TractGeometryDefinition(
            **_valid_kwargs(streamline_count_real=1, streamline_count_shown=2)
        )


def test_tract_geometry_definition_rejects_empty_streamlines_with_nonzero_real_count():
    with pytest.raises(ValueError):
        TractGeometryDefinition(
            **_valid_kwargs(streamlines=(), streamline_count_real=5, streamline_count_shown=0)
        )


# ---------------------------------------------------------------------------
# read_streamlines_from_vtp_bytes -- requiere vtk (no es dependencia
# obligatoria del proyecto, ver docstring del módulo)
# ---------------------------------------------------------------------------


def _build_synthetic_vtp_bytes(points: list[tuple[float, float, float]]) -> bytes:
    """Construye un `.vtp` sintético real (ida y vuelta con el propio
    `vtk`, nunca bytes fabricados a mano) con una única streamline que
    pasa por `points`, exclusivamente para probar el decodificador --
    no representa ninguna estructura anatómica real."""
    import vtk

    vtk_points = vtk.vtkPoints()
    for p in points:
        vtk_points.InsertNextPoint(*p)

    line = vtk.vtkPolyLine()
    line.GetPointIds().SetNumberOfIds(len(points))
    for i in range(len(points)):
        line.GetPointIds().SetId(i, i)

    lines = vtk.vtkCellArray()
    lines.InsertNextCell(line)

    poly = vtk.vtkPolyData()
    poly.SetPoints(vtk_points)
    poly.SetLines(lines)

    writer = vtk.vtkXMLPolyDataWriter()
    writer.SetInputData(poly)
    writer.SetWriteToOutputString(True)
    writer.SetDataModeToAscii()
    writer.Write()
    return writer.GetOutputString().encode("ascii")


def test_read_streamlines_from_vtp_bytes_round_trips_known_points():
    pytest.importorskip("vtk")
    from backend.ingestion.tractography.org_atlas import read_streamlines_from_vtp_bytes

    points = [(0.0, 0.0, 0.0), (1.0, 2.0, 3.0), (4.0, 5.0, 6.0)]
    data = _build_synthetic_vtp_bytes(points)

    result = read_streamlines_from_vtp_bytes(data)
    assert len(result) == 1
    assert result[0] == points


def test_read_streamlines_from_vtp_bytes_returns_empty_list_when_no_lines():
    pytest.importorskip("vtk")
    import vtk

    from backend.ingestion.tractography.org_atlas import read_streamlines_from_vtp_bytes

    poly = vtk.vtkPolyData()
    writer = vtk.vtkXMLPolyDataWriter()
    writer.SetInputData(poly)
    writer.SetWriteToOutputString(True)
    writer.SetDataModeToAscii()
    writer.Write()
    data = writer.GetOutputString().encode("ascii")

    assert read_streamlines_from_vtp_bytes(data) == []


# ---------------------------------------------------------------------------
# read_org_atlas -- requiere el .zip real de la usuaria
# ---------------------------------------------------------------------------

_ZIP_PATH = (
    Path.home() / "mnt" / "NeuroData" / "original" / "tractography"
    / "ORG-800FiberClusters.zip"
)

_REQUIRES_REAL_DATA = pytest.mark.skipif(
    not _ZIP_PATH.exists(),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada",
)


@_REQUIRES_REAL_DATA
def test_read_org_atlas_against_real_zip():
    defs = read_org_atlas(_ZIP_PATH)

    assert len(defs) == 41
    assert {d.abbreviation for d in defs} == set(TRACT_NAMES)
    assert len({d.id for d in defs}) == 41
    assert all(d.id.startswith("tract.human.org2018.") for d in defs)
    assert all(d.study_id == STUDY_ID for d in defs)

    # Recuento exhaustivo verificado el 02/09/2026 contra el archivo real
    # (decisión 49) -- valor de referencia, no un umbral. `streamlines`
    # en cada definición ya es la muestra reducida (streamline_count_shown),
    # no la geometría completa de streamline_count_real -- por diseño
    # (TractGeometryDefinition no retiene los puntos de lo descartado).
    total_real = sum(d.streamline_count_real for d in defs)
    total_shown = sum(d.streamline_count_shown for d in defs)
    assert total_real == 523696
    assert total_shown == 12300  # 41 tractos x 300 (todos superan el tope)
    assert all(len(d.streamlines) == d.streamline_count_shown for d in defs)

    af = next(d for d in defs if d.abbreviation == "AF")
    assert af.streamline_count_real == 11843
    assert af.streamline_count_shown == 300

    special = next(d for d in defs if d.abbreviation == "Intra-CBLM-I&P")
    assert special.id == "tract.human.org2018.intra-cblm-iandp"
    assert special.abbreviation == "Intra-CBLM-I&P"  # el código real, sin sanear
