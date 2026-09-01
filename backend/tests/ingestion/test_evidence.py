import pytest

from backend.ingestion.literature.evidence import (
    EVIDENCE_KINDS,
    EXTRACTION_METHODS,
    EvidenceRecord,
    evidence_insert_sql,
)


def _valid_kwargs(**overrides):
    kwargs = dict(
        id="evidence.human.example.foo_2026_claim1",
        name="Ejemplo de afirmación",
        study_id="study.human.example.foo_2026",
        kind="correlation",
        quote="La región X mostró una correlación significativa con Y (p<0.01).",
        extraction_method="manual_transcription",
    )
    kwargs.update(overrides)
    return kwargs


def test_evidence_record_accepts_all_recognized_kinds():
    for kind in EVIDENCE_KINDS:
        record = EvidenceRecord(**_valid_kwargs(kind=kind))
        assert record.kind == kind


def test_evidence_record_rejects_unrecognized_kind():
    with pytest.raises(ValueError):
        EvidenceRecord(**_valid_kwargs(kind="wild_guess"))


def test_evidence_record_rejects_empty_quote():
    with pytest.raises(ValueError):
        EvidenceRecord(**_valid_kwargs(quote=""))


def test_evidence_record_rejects_whitespace_only_quote():
    with pytest.raises(ValueError):
        EvidenceRecord(**_valid_kwargs(quote="   "))


def test_evidence_record_rejects_unrecognized_extraction_method():
    with pytest.raises(ValueError):
        EvidenceRecord(**_valid_kwargs(extraction_method="a_ojo"))


def test_evidence_record_accepts_ai_assisted_as_a_valid_method():
    # "ai_assisted" está reconocido en el esquema (migración 0009) aunque
    # ningún código de este repositorio lo produzca todavía -- ver el
    # docstring de evidence.py. Esta prueba solo confirma que el valor es
    # válido para cuando llegue ese pipeline, no ejerce ningún pipeline
    # real.
    assert "ai_assisted" in EXTRACTION_METHODS
    record = EvidenceRecord(**_valid_kwargs(extraction_method="ai_assisted"))
    assert record.extraction_method == "ai_assisted"


def test_evidence_insert_sql_includes_quote_and_extraction_method():
    record = EvidenceRecord(**_valid_kwargs())
    sql = evidence_insert_sql(record)
    assert "correlación significativa" in sql
    assert "manual_transcription" in sql
    assert "ON CONFLICT (id) DO UPDATE" in sql


def test_evidence_insert_sql_serializes_detail_as_jsonb():
    record = EvidenceRecord(**_valid_kwargs(detail={"region": "V1", "p_value": 0.01}))
    sql = evidence_insert_sql(record)
    assert "::jsonb" in sql
    assert '"region": "V1"' in sql


def test_evidence_insert_sql_uses_null_when_detail_is_missing():
    record = EvidenceRecord(**_valid_kwargs())
    sql = evidence_insert_sql(record)
    assert ", NULL\n)" in sql


def test_evidence_insert_sql_escapes_single_quotes_in_quote():
    record = EvidenceRecord(**_valid_kwargs(quote="It's a significant effect (p<0.01)."))
    sql = evidence_insert_sql(record)
    assert "It''s a significant effect" in sql
