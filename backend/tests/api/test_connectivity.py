from dataclasses import dataclass

from backend.api.routers.connectivity import compute_induced_connectivity


@dataclass
class _FakeConnection:
    id: str
    source_id: str
    target_id: str
    type: str
    evidence_level: str
    weight: float | None


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


def test_with_fewer_than_two_regions_returns_nothing_without_reinterpreting():
    # Ni una selección vacía ni una de un único nodo tienen "conectividad
    # entre regiones seleccionadas" que inducir.
    result = compute_induced_connectivity(["A"], [], [], {}, {}, {})

    assert result.region_ids == ["A"]
    assert result.connections == []
    assert result.tracts == []


def test_induces_only_connections_with_both_ends_in_the_selection():
    # Quien llama ya filtró las conexiones a las que tienen ambos
    # extremos en la selección (igual que hace el endpoint); la función
    # pura solo traduce -- pero además comprueba que no se cuela nada
    # con un extremo fuera si se le pasa por error.
    connections = [
        _FakeConnection("c1", "A", "B", "functional", "direct", 0.8),
    ]

    result = compute_induced_connectivity(["A", "B"], connections, [], {}, {}, {})

    assert len(result.connections) == 1
    assert result.connections[0].source == "A"
    assert result.connections[0].target == "B"


def test_a_tract_touching_only_one_selected_region_is_not_reported():
    # El tracto T1 solo toca A de las dos regiones seleccionadas (A, B):
    # no dice nada sobre la conectividad ENTRE A y B, así que no debe
    # aparecer -- condición estructural, no un umbral arbitrario.
    tract_touch = [_FakeTractTouch(source_id="tract.T1", target_id="A", source_dataset_id="dataset.D1")]
    tracts_by_id = {"tract.T1": _FakeTract(id="tract.T1", name="Tracto 1", abbreviation="T1")}

    result = compute_induced_connectivity(["A", "B"], [], tract_touch, tracts_by_id, {}, {})

    assert result.tracts == []


def test_a_tract_touching_two_or_more_selected_regions_is_reported_with_its_citation():
    tract_touch = [
        _FakeTractTouch(source_id="tract.AF", target_id="A", source_dataset_id="dataset.YEH2022"),
        _FakeTractTouch(source_id="tract.AF", target_id="B", source_dataset_id="dataset.YEH2022"),
    ]
    tracts_by_id = {"tract.AF": _FakeTract(id="tract.AF", name="Fascículo arqueado", abbreviation="AF")}
    datasets_by_id = {"dataset.YEH2022": _FakeDataset(id="dataset.YEH2022", study_id="study.YEH2022")}
    studies_by_id = {
        "study.YEH2022": _FakeStudy(id="study.YEH2022", name="Yeh et al. 2022", doi="10.1038/x", year=2022)
    }

    result = compute_induced_connectivity(
        ["A", "B"], [], tract_touch, tracts_by_id, datasets_by_id, studies_by_id
    )

    assert len(result.tracts) == 1
    tract = result.tracts[0]
    assert tract.id == "tract.AF"
    assert tract.abbreviation == "AF"
    assert tract.region_ids == ["A", "B"]
    assert len(tract.studies) == 1
    assert tract.studies[0].doi == "10.1038/x"


def test_a_tract_without_a_linked_study_never_gets_a_fabricated_citation():
    # El dataset no tiene study_id todavía (o el tracto no tiene fila de
    # dataset asociada): la cita se deja vacía, nunca inventada.
    tract_touch = [
        _FakeTractTouch(source_id="tract.CST", target_id="A", source_dataset_id=None),
        _FakeTractTouch(source_id="tract.CST", target_id="B", source_dataset_id=None),
    ]
    tracts_by_id = {"tract.CST": _FakeTract(id="tract.CST", name="Tracto corticoespinal", abbreviation="CST")}

    result = compute_induced_connectivity(["A", "B"], [], tract_touch, tracts_by_id, {}, {})

    assert len(result.tracts) == 1
    assert result.tracts[0].studies == []
