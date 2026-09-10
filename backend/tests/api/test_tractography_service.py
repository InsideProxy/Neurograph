from dataclasses import dataclass

from backend.api.services.tractography_service import (
    build_tract_geometry_out,
    build_tract_summaries,
)


@dataclass
class _FakeTract:
    id: str
    name: str
    abbreviation: str | None
    study_id: str | None


@dataclass
class _FakeGeometry:
    streamline_count_real: int
    streamline_count_shown: int
    streamlines: list
    reference_space: str = "ORG_800FC_100HCP_groupwise"


@dataclass
class _FakeStudy:
    id: str
    name: str
    doi: str | None
    year: int | None


def test_build_tract_summaries_includes_real_citation_when_study_linked():
    tract = _FakeTract(id="tract.AF_L", name="Fascículo arqueado izquierdo", abbreviation="AF_L", study_id="study.zhang2018")
    geometry = _FakeGeometry(streamline_count_real=12847, streamline_count_shown=300, streamlines=[])
    study = _FakeStudy(id="study.zhang2018", name="Zhang et al. 2018", doi="10.1016/j.neuroimage.2018.06.027", year=2018)

    result = build_tract_summaries([(tract, geometry)], {"study.zhang2018": study})

    assert len(result) == 1
    assert result[0].id == "tract.AF_L"
    assert result[0].streamline_count_real == 12847
    assert result[0].streamline_count_shown == 300
    assert len(result[0].studies) == 1
    assert result[0].studies[0].doi == "10.1016/j.neuroimage.2018.06.027"
    assert result[0].reference_space == "ORG_800FC_100HCP_groupwise"


def test_build_tract_summaries_gives_empty_citation_when_no_study_linked():
    # Los 52 tractos de Yeh 2022 no tienen geometría (nunca aparecen
    # aquí), pero un tracto CON geometría podría en teoría no tener
    # `study_id` todavía -- nunca se inventa una cita en ese caso.
    tract = _FakeTract(id="tract.X", name="Tracto sin estudio enlazado", abbreviation=None, study_id=None)
    geometry = _FakeGeometry(streamline_count_real=100, streamline_count_shown=100, streamlines=[])

    result = build_tract_summaries([(tract, geometry)], {})

    assert result[0].studies == []


def test_build_tract_summaries_preserves_input_order():
    tracts = [
        (_FakeTract(id=f"tract.{i}", name=f"Tracto {i}", abbreviation=None, study_id=None),
         _FakeGeometry(streamline_count_real=1, streamline_count_shown=1, streamlines=[]))
        for i in range(3)
    ]

    result = build_tract_summaries(tracts, {})

    assert [r.id for r in result] == ["tract.0", "tract.1", "tract.2"]


def test_build_tract_geometry_out_carries_real_streamlines_and_both_counts():
    tract = _FakeTract(id="tract.CST_L", name="Tracto corticoespinal izquierdo", abbreviation="CST_L", study_id=None)
    streamlines = [[(0.0, 0.0, 0.0), (1.5, 2.5, -3.0)], [(4.0, 4.0, 4.0)]]
    geometry = _FakeGeometry(streamline_count_real=9000, streamline_count_shown=2, streamlines=streamlines)

    result = build_tract_geometry_out(tract, geometry)

    assert result.id == "tract.CST_L"
    assert result.streamline_count_real == 9000
    assert result.streamline_count_shown == 2
    assert result.streamlines == streamlines
    # El recuento real y el mostrado nunca se igualan artificialmente:
    # esta prueba deja constancia de que ambos viajan tal cual, sin que
    # el servicio recorte ni complete ninguno de los dos.
    assert result.streamline_count_real != result.streamline_count_shown


def test_build_tract_geometry_out_carries_real_reference_space():
    # Migracion 0014 / decision 63: el espacio de referencia real tiene
    # que llegar hasta la respuesta de la API sin que el servicio lo
    # invente ni lo asuma -- viaja tal cual desde la fila real de
    # `tract_geometries`.
    tract = _FakeTract(id="tract.CST_L", name="Tracto corticoespinal izquierdo", abbreviation="CST_L", study_id=None)
    geometry = _FakeGeometry(
        streamline_count_real=10,
        streamline_count_shown=10,
        streamlines=[],
        reference_space="ORG_800FC_100HCP_groupwise",
    )

    result = build_tract_geometry_out(tract, geometry)

    assert result.reference_space == "ORG_800FC_100HCP_groupwise"
