from dataclasses import dataclass

from backend.api.services.connectivity_service import build_tract_matches


@dataclass
class _FakeTractTouch:
    source_id: str
    target_id: str
    source_dataset_id: str | None


@dataclass
class _FakeTract:
    id: str
    name: str
    abbreviation: str | None


@dataclass
class _FakeDataset:
    id: str
    study_id: str | None


@dataclass
class _FakeStudy:
    id: str
    name: str
    doi: str | None
    year: int | None


def test_build_tract_matches_includes_a_tract_touching_only_one_region():
    # A diferencia de `compute_induced_connectivity` (que exige ≥2
    # regiones DE UNA SELECCIÓN, condición estructural de esa pregunta
    # concreta -- decisión 12), `build_tract_matches` no aplica ningún
    # filtro de cantidad: para una búsqueda de tractos, uno que toca una
    # sola región sigue siendo una respuesta real y válida.
    touch = [_FakeTractTouch(source_id="tract.CST", target_id="A", source_dataset_id=None)]
    tracts_by_id = {"tract.CST": _FakeTract(id="tract.CST", name="Tracto corticoespinal", abbreviation="CST")}

    matches = build_tract_matches(touch, tracts_by_id, {}, {})

    assert len(matches) == 1
    assert matches[0].region_ids == ["A"]


def test_build_tract_matches_reports_all_regions_a_tract_touches():
    touch = [
        _FakeTractTouch(source_id="tract.AF", target_id="A", source_dataset_id="dataset.D1"),
        _FakeTractTouch(source_id="tract.AF", target_id="B", source_dataset_id="dataset.D1"),
        _FakeTractTouch(source_id="tract.AF", target_id="C", source_dataset_id="dataset.D1"),
    ]
    tracts_by_id = {"tract.AF": _FakeTract(id="tract.AF", name="Fascículo arqueado", abbreviation="AF")}
    datasets_by_id = {"dataset.D1": _FakeDataset(id="dataset.D1", study_id="study.D1")}
    studies_by_id = {"study.D1": _FakeStudy(id="study.D1", name="Estudio D1", doi="10.1/d1", year=2020)}

    matches = build_tract_matches(touch, tracts_by_id, datasets_by_id, studies_by_id)

    assert len(matches) == 1
    assert matches[0].region_ids == ["A", "B", "C"]
    assert matches[0].studies[0].doi == "10.1/d1"


def test_build_tract_matches_never_fabricates_a_citation_without_a_linked_study():
    touch = [_FakeTractTouch(source_id="tract.CST", target_id="A", source_dataset_id=None)]
    tracts_by_id = {"tract.CST": _FakeTract(id="tract.CST", name="Tracto corticoespinal", abbreviation="CST")}

    matches = build_tract_matches(touch, tracts_by_id, {}, {})

    assert matches[0].studies == []


def test_build_tract_matches_orders_results_by_tract_id():
    touch = [
        _FakeTractTouch(source_id="tract.Z", target_id="A", source_dataset_id=None),
        _FakeTractTouch(source_id="tract.A", target_id="B", source_dataset_id=None),
    ]
    tracts_by_id = {
        "tract.Z": _FakeTract(id="tract.Z", name="Tracto Z", abbreviation="Z"),
        "tract.A": _FakeTract(id="tract.A", name="Tracto A", abbreviation="A"),
    }

    matches = build_tract_matches(touch, tracts_by_id, {}, {})

    assert [m.id for m in matches] == ["tract.A", "tract.Z"]


def test_a_region_id_filter_keeps_only_tracts_touching_that_region_without_truncating_their_data():
    # Mismo criterio documentado en `search_tracts`: filtrar por
    # region_id decide QUÉ tractos aparecen, nunca recorta lo que se
    # cuenta de cada uno -- se replica aquí el filtro post-hoc que hace
    # el servicio sobre el resultado ya construido por
    # `build_tract_matches`.
    touch = [
        _FakeTractTouch(source_id="tract.AF", target_id="A", source_dataset_id=None),
        _FakeTractTouch(source_id="tract.AF", target_id="B", source_dataset_id=None),
        _FakeTractTouch(source_id="tract.CST", target_id="C", source_dataset_id=None),
    ]
    tracts_by_id = {
        "tract.AF": _FakeTract(id="tract.AF", name="Fascículo arqueado", abbreviation="AF"),
        "tract.CST": _FakeTract(id="tract.CST", name="Tracto corticoespinal", abbreviation="CST"),
    }

    matches = build_tract_matches(touch, tracts_by_id, {}, {})
    filtered = [m for m in matches if "A" in m.region_ids]

    assert len(filtered) == 1
    assert filtered[0].id == "tract.AF"
    # Sigue mostrando TODAS sus regiones reales (A y B), no solo "A".
    assert filtered[0].region_ids == ["A", "B"]
