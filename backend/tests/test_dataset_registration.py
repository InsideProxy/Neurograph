from backend.library.dataset_registration import combined_checksum, dataset_insert_sql


def test_combined_checksum_is_order_independent():
    a = combined_checksum({"b.nii.gz": "222", "a.nii.gz": "111"})
    b = combined_checksum({"a.nii.gz": "111", "b.nii.gz": "222"})
    assert a == b


def test_combined_checksum_changes_if_any_file_changes():
    base = combined_checksum({"a.nii.gz": "111", "b.nii.gz": "222"})
    changed = combined_checksum({"a.nii.gz": "111", "b.nii.gz": "999"})
    assert base != changed


def test_dataset_insert_sql_includes_combined_checksum():
    sql = dataset_insert_sql(
        dataset_id="dataset.human.test.example",
        name="Ejemplo",
        format_description="NIfTI",
        license_text="uso académico",
        file_hashes={"a.nii.gz": "111", "b.nii.gz": "222"},
    )
    expected_checksum = combined_checksum({"a.nii.gz": "111", "b.nii.gz": "222"})
    assert expected_checksum in sql
    assert "dataset.human.test.example" in sql
    assert "ON CONFLICT" in sql
