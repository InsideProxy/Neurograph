from dataclasses import dataclass

from backend.core.graph.from_connections import edges_from_connections


@dataclass
class _FakeConnection:
    source_id: str
    target_id: str
    weight: float | None


def test_edges_from_connections_translates_shape():
    connections = [_FakeConnection("a", "b", 0.7)]
    edges = edges_from_connections(connections)
    assert len(edges) == 1
    assert edges[0].source == "a"
    assert edges[0].target == "b"
    assert edges[0].weight == 0.7


def test_edges_from_connections_excludes_exactly_zero_weight_by_default():
    # No es "una conexión débil": es la ausencia comprobada de conexión
    # (así se guardó la matriz completa de Brainnetome, sin umbral).
    connections = [
        _FakeConnection("a", "b", 0.0),
        _FakeConnection("a", "c", 0.001),
    ]
    edges = edges_from_connections(connections)
    assert len(edges) == 1
    assert edges[0].target == "c"


def test_edges_from_connections_excludes_missing_weight():
    connections = [_FakeConnection("a", "b", None)]
    edges = edges_from_connections(connections)
    assert edges == []


def test_edges_from_connections_applies_a_higher_threshold_when_asked():
    connections = [
        _FakeConnection("a", "b", 0.1),
        _FakeConnection("a", "c", 0.5),
    ]
    edges = edges_from_connections(connections, min_weight=0.3)
    assert len(edges) == 1
    assert edges[0].target == "c"
