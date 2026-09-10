import datetime as dt
import zipfile

from backend.ingestion.datasets.formats import UNSUPPORTED_FORMAT_LABEL
from backend.ingestion.datasets.manifest import DatasetManifest, read_dataset_manifest
from backend.library.extraction import extract_zip_dataset, extracted_dataset_id


def _make_zip(path, files):
    with zipfile.ZipFile(path, "w") as zf:
        for name, content in files.items():
            zf.writestr(name, content)


def test_extracted_dataset_id_follows_ontology_scheme():
    assert (
        extracted_dataset_id("dataset.human.hcp.s1200_groupavg")
        == "dataset.human.hcp.s1200_groupavg_extracted"
    )


def test_extract_zip_dataset_writes_files_and_linked_manifest(tmp_path):
    zip_path = tmp_path / "source.zip"
    _make_zip(zip_path, {"a.nii": b"1234", "sub/b.gii": b"5678"})

    source = DatasetManifest(
        id="dataset.human.hcp.s1200_groupavg",
        name="HCP S1200 Group Average Data Release",
        source="BALSA",
        format=UNSUPPORTED_FORMAT_LABEL,
        date_added=dt.date(2026, 8, 28),
    )
    target_dir = tmp_path / "extracted"

    derived = extract_zip_dataset(zip_path, target_dir, source)

    assert (target_dir / "a.nii").read_bytes() == b"1234"
    assert (target_dir / "sub" / "b.gii").read_bytes() == b"5678"
    assert derived.id == "dataset.human.hcp.s1200_groupavg_extracted"
    assert derived.derived_from == "dataset.human.hcp.s1200_groupavg"

    on_disk = read_dataset_manifest(target_dir)
    assert on_disk.id == derived.id


def test_extract_zip_dataset_does_not_re_extract_if_already_done(tmp_path):
    zip_path = tmp_path / "source.zip"
    _make_zip(zip_path, {"a.nii": b"1234"})
    source = DatasetManifest(
        id="dataset.human.hcp.s1200_groupavg", name="x", source="BALSA",
        format=UNSUPPORTED_FORMAT_LABEL, date_added=dt.date(2026, 8, 28),
    )
    target_dir = tmp_path / "extracted"

    first = extract_zip_dataset(zip_path, target_dir, source)
    (target_dir / "a.nii").write_bytes(b"CAMBIADO")  # simula que el usuario tocó algo
    second = extract_zip_dataset(zip_path, target_dir, source)

    assert first.id == second.id
    # no se volvió a extraer: el archivo "tocado" sigue como lo dejamos
    assert (target_dir / "a.nii").read_bytes() == b"CAMBIADO"
