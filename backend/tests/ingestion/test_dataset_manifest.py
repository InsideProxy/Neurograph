import datetime as dt
from pathlib import Path

from backend.ingestion.datasets.manifest import (
    DatasetManifest,
    read_dataset_manifest,
    scan_library_datasets,
    write_dataset_manifest,
)
from backend.library.manifest import initialize_library


def test_write_and_read_roundtrip(tmp_path: Path):
    manifest = DatasetManifest(
        id="dataset.hcp-mmp1",
        name="HCP-MMP1.0 parcellation",
        source="Glasser et al. 2016",
        format="GIFTI",
        date_added=dt.date(2026, 8, 28),
        species="human",
        atlas="HCP-MMP1.0",
        license="CC-BY-4.0",
    )
    dataset_dir = tmp_path / "hcp-mmp1"
    write_dataset_manifest(dataset_dir, manifest)

    loaded = read_dataset_manifest(dataset_dir)
    assert loaded == manifest
    assert loaded.is_derived is False


def test_derived_dataset_keeps_provenance(tmp_path: Path):
    manifest = DatasetManifest(
        id="connectome.subject01.structural",
        name="Conectoma estructural del sujeto 01",
        source="derivado de dwi.subject01",
        format="CSV",
        date_added=dt.date(2026, 8, 28),
        derived_from="dwi.subject01",
        algorithm="MRtrix3 tckgen + tck2connectome",
        parameters={"algorithm": "iFOD2", "seeds": 10_000_000},
        software_version="MRtrix3 3.0.4",
    )
    dataset_dir = tmp_path / "connectome-subject01"
    write_dataset_manifest(dataset_dir, manifest)

    loaded = read_dataset_manifest(dataset_dir)
    assert loaded.is_derived is True
    assert loaded.derived_from == "dwi.subject01"
    assert loaded.parameters == {"algorithm": "iFOD2", "seeds": 10_000_000}


def test_read_missing_manifest_returns_none(tmp_path: Path):
    assert read_dataset_manifest(tmp_path / "no-existe") is None


def test_scan_library_datasets_finds_original_and_derived(tmp_path: Path):
    initialize_library(tmp_path)

    original = DatasetManifest(
        id="dataset.original.001",
        name="Atlas original",
        source="descarga externa",
        format="NIfTI",
        date_added=dt.date(2026, 8, 28),
    )
    write_dataset_manifest(tmp_path / "original" / "atlases" / "example", original)

    derived = DatasetManifest(
        id="dataset.derived.001",
        name="Parcelación derivada",
        source="derivado del atlas original",
        format="CSV",
        date_added=dt.date(2026, 8, 28),
        derived_from="dataset.original.001",
        algorithm="ejemplo",
    )
    write_dataset_manifest(tmp_path / "derived" / "parcellations" / "example", derived)

    found = scan_library_datasets(tmp_path)
    found_ids = {manifest.id for _, manifest in found}

    assert found_ids == {"dataset.original.001", "dataset.derived.001"}


def test_scan_library_ignores_folders_without_manifest(tmp_path: Path):
    initialize_library(tmp_path)
    (tmp_path / "original" / "atlases" / "sin_manifiesto").mkdir(parents=True)

    found = scan_library_datasets(tmp_path)
    assert found == []
