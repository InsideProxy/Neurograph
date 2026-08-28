import pytest

from backend.ontology.schema import EntityType, build_id, parse_id


def test_build_and_parse_id_roundtrip():
    entity_id = build_id(EntityType.REGION, "human", "hcp-mmp1", "area44")
    assert entity_id == "region.human.hcp-mmp1.area44"

    parsed = parse_id(entity_id)
    assert parsed["type"] == "region"
    assert parsed["species"] == "human"
    assert parsed["local_code"] == "area44"


def test_build_id_rejects_spaces_safely():
    entity_id = build_id(EntityType.TRACT, "human", "generic", "arcuate fasciculus")
    assert " " not in entity_id
