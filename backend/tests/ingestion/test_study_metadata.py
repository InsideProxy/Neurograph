import pytest

from backend.ingestion.literature.study_metadata import StudyMetadata, study_insert_sql


def test_study_metadata_rejects_empty_id():
    with pytest.raises(ValueError):
        StudyMetadata(id="", name="Algún estudio")


def test_study_metadata_rejects_empty_name():
    with pytest.raises(ValueError):
        StudyMetadata(id="study.human.example.foo_2026", name="")


def test_study_insert_sql_includes_all_fields():
    study = StudyMetadata(
        id="study.human.example.foo_2026",
        name="Foo A, Bar B (2026). Un estudio de ejemplo. Journal of Examples, 1(1), 1-10.",
        doi="10.1234/example.2026",
        year=2026,
        authors=("Foo A", "Bar B"),
        journal="Journal of Examples",
        abstract="Un resumen de ejemplo.",
    )
    sql = study_insert_sql(study)
    assert "study.human.example.foo_2026" in sql
    assert "10.1234/example.2026" in sql
    assert "2026" in sql
    assert "ARRAY['Foo A', 'Bar B']" in sql
    assert "Journal of Examples" in sql
    assert "Un resumen de ejemplo." in sql
    assert "ON CONFLICT (id) DO UPDATE" in sql


def test_study_insert_sql_uses_null_for_missing_optional_fields():
    study = StudyMetadata(id="study.human.example.bar_2026", name="Bar (2026). Ejemplo.")
    sql = study_insert_sql(study)
    # doi, year, authors, journal, abstract -- los cinco opcionales, en NULL.
    assert sql.count("NULL") == 5


def test_study_insert_sql_escapes_single_quotes():
    study = StudyMetadata(
        id="study.human.example.quote_2026",
        name="O'Brien C (2026). It's an example. Journal, 1(1), 1-2.",
        authors=("O'Brien C",),
    )
    sql = study_insert_sql(study)
    assert "O''Brien" in sql
    assert "It''s an example" in sql
