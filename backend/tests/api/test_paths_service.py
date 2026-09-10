from dataclasses import dataclass

from backend.api.services.paths_service import compute_path


@dataclass
class _FakeConnection:
    source_id: str
    target_id: str
    weight: float | None


def test_compute_path_returns_the_real_shortest_path():
    region_ids = ["A", "B", "C"]
    connections = [_FakeConnection("A", "B", 1.0), _FakeConnection("B", "C", 1.0)]

    result = compute_path(region_ids, connections, "atlas.human.test.demo", "A", "C")

    assert result.path == ["A", "B", "C"]
    assert result.distance == 2.0


def test_compute_path_favors_the_strong_weight_path():
    # Mismo caso de libro de texto que en network_analysis: el camino
    # real más corto entre A y C es el de conexiones fuertes (peso alto),
    # no el que tendría menos "distancia" si se pasara el peso tal cual.
    region_ids = ["A", "B", "C", "D"]
    connections = [
        _FakeConnection("A", "B", 10.0), _FakeConnection("B", "C", 10.0),
        _FakeConnection("A", "D", 0.1), _FakeConnection("D", "C", 0.1),
    ]

    result = compute_path(region_ids, connections, "atlas.human.test.demo", "A", "C")

    assert result.path == ["A", "B", "C"]


def test_compute_path_is_none_when_disconnected():
    region_ids = ["A", "B", "C", "D"]
    connections = [_FakeConnection("A", "B", 1.0), _FakeConnection("C", "D", 1.0)]

    result = compute_path(region_ids, connections, "atlas.human.test.demo", "A", "D")

    assert result.path is None
    assert result.distance is None


def test_compute_path_excludes_zero_weight_pairs():
    # Mismo criterio que compute_graph_metrics: un par con weight
    # exactamente 0 no es una arista real (Brainnetome, sección 7.5).
    region_ids = ["A", "B", "C"]
    connections = [_FakeConnection("A", "B", 0.0), _FakeConnection("B", "C", 1.0)]

    result = compute_path(region_ids, connections, "atlas.human.test.demo", "A", "C")

    # Sin la arista A-B (peso 0 excluido), A y C quedan desconectados.
    assert result.path is None


def test_compute_path_applies_the_requested_threshold():
    region_ids = ["A", "B", "C"]
    connections = [_FakeConnection("A", "B", 0.1), _FakeConnection("B", "C", 0.5)]

    result = compute_path(region_ids, connections, "atlas.human.test.demo", "A", "C", min_weight=0.3)

    assert result.path is None
    assert result.min_weight == 0.3


def test_compute_path_is_none_when_source_is_not_in_the_atlas():
    region_ids = ["A", "B"]
    connections = [_FakeConnection("A", "B", 1.0)]

    result = compute_path(region_ids, connections, "atlas.human.test.demo", "no-existe", "B")

    assert result.path is None
