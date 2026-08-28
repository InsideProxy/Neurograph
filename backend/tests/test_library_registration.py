from backend.library.manifest import LibraryManifest
from backend.library.registration import library_insert_sql


def test_insert_sql_contains_expected_fields():
    manifest = LibraryManifest(
        library_id="11111111-1111-1111-1111-111111111111",
        created_at="2026-01-01T00:00:00+00:00",
        index_schema_version=1,
    )
    sql = library_insert_sql(manifest, "E:\\NeuroData")

    assert "11111111-1111-1111-1111-111111111111" in sql
    assert "E:\\NeuroData" in sql
    assert "INSERT INTO libraries" in sql
    assert "ON CONFLICT (id) DO UPDATE" in sql


def test_insert_sql_escapes_single_quotes_in_path():
    manifest = LibraryManifest(
        library_id="22222222-2222-2222-2222-222222222222",
        created_at="2026-01-01T00:00:00+00:00",
        index_schema_version=1,
    )
    sql = library_insert_sql(manifest, "E:\\O'Brien\\NeuroData")

    assert "O''Brien" in sql
    # ninguna comilla simple suelta que pudiera romper la sentencia SQL
    assert "O'Brien" not in sql
