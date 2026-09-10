import datetime as dt
from pathlib import Path

import pytest

from backend.ingestion.datasets.formats import UNSUPPORTED_FORMAT_LABEL
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
        format="hcp_mmp1_cifti_dlabel",
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
    # Formato de ejemplo sin lector real todavía (un conectoma estructural
    # derivado por sujeto no es ninguno de los cuatro adaptadores del
    # catálogo, decisión 44) -- se cataloga honestamente con el centinela,
    # nunca con una etiqueta de formato inventada.
    manifest = DatasetManifest(
        id="connectome.subject01.structural",
        name="Conectoma estructural del sujeto 01",
        source="derivado de dwi.subject01",
        format=UNSUPPORTED_FORMAT_LABEL,
        date_added=dt.date(2026, 8, 28),
        derived_from="dwi.subject01",
        algorithm="MRtrix3 tckgen + tck2connectome",
        parameters={"algorithm": "iFOD2", "seeds": 10_000_000},
        software_version="MRtrix3 3.0.4",
        description="Matriz región-región en CSV, generada localmente -- sin adaptador todavía",
    )
    dataset_dir = tmp_path / "connectome-subject01"
    write_dataset_manifest(dataset_dir, manifest)

    loaded = read_dataset_manifest(dataset_dir)
    assert loaded.is_derived is True
    assert loaded.derived_from == "dwi.subject01"
    assert loaded.parameters == {"algorithm": "iFOD2", "seeds": 10_000_000}


def test_derived_dataset_accepts_multiple_sources_as_a_list(tmp_path: Path):
    # Bug real encontrado en el manifiesto real `derived/meshes/
    # dataset.yaml` (decisión 45/49): dos mallas derivadas de DOS
    # datasets de origen cada una -- `derived_from` traía una lista de
    # dos cadenas, no una sola, y el dataclass solo admitía `str`.
    manifest = DatasetManifest(
        id="dataset.human.brain_meshes_3d",
        name="Mallas de fondo del cerebro 3D",
        source="generadas por scripts/generate_brain_meshes.py",
        format=UNSUPPORTED_FORMAT_LABEL,
        date_added=dt.date(2026, 8, 30),
        derived_from=[
            "dataset.human.hcp.s1200_groupavg_extracted",
            "dataset.human.mni152_fsl_2mm",
        ],
        algorithm="marching cubes / superficies GIFTI combinadas",
    )
    dataset_dir = tmp_path / "brain-meshes"
    write_dataset_manifest(dataset_dir, manifest)

    loaded = read_dataset_manifest(dataset_dir)
    assert loaded.is_derived is True
    assert loaded.derived_from == [
        "dataset.human.hcp.s1200_groupavg_extracted",
        "dataset.human.mni152_fsl_2mm",
    ]


def test_unknown_format_is_rejected():
    with pytest.raises(ValueError, match="no soportado"):
        DatasetManifest(
            id="dataset.mistery",
            name="Dataset con formato inventado",
            source="quien sea",
            format="algo_que_no_existe",
            date_added=dt.date(2026, 9, 2),
        )


def test_read_missing_manifest_returns_none(tmp_path: Path):
    assert read_dataset_manifest(tmp_path / "no-existe") is None


def test_checksums_field_roundtrips_for_multi_file_datasets(tmp_path: Path):
    # Regresión real (decisión 45): cuatro de los seis dataset.yaml ya
    # existentes en la biblioteca real de la usuaria traían un mapa
    # `checksums` (nombre de archivo -> sha256, la entrada real de
    # `backend/library/dataset_registration.py::combined_checksum()` para
    # un dataset sin un único archivo contenedor) que `DatasetManifest` no
    # declaraba -- `from_yaml()` fallaba con `TypeError` para los cuatro.
    manifest = DatasetManifest(
        id="dataset.multi-archivo",
        name="Dataset de varios archivos sueltos",
        source="descarga pública",
        format=UNSUPPORTED_FORMAT_LABEL,
        date_added=dt.date(2026, 9, 2),
        checksum_sha256="combinado -- ver checksums",
        checksums={
            "archivo_a.nii.gz": "aaaa",
            "archivo_b.xlsx": "bbbb",
        },
    )
    dataset_dir = tmp_path / "multi-archivo"
    write_dataset_manifest(dataset_dir, manifest)

    loaded = read_dataset_manifest(dataset_dir)
    assert loaded == manifest
    assert loaded.checksums == {"archivo_a.nii.gz": "aaaa", "archivo_b.xlsx": "bbbb"}


def test_scan_library_datasets_finds_original_and_derived(tmp_path: Path):
    initialize_library(tmp_path)

    original = DatasetManifest(
        id="dataset.original.001",
        name="Atlas original",
        source="descarga externa",
        format="brainnetome_nifti_xlsx",
        date_added=dt.date(2026, 8, 28),
    )
    write_dataset_manifest(tmp_path / "original" / "atlases" / "example", original)

    derived = DatasetManifest(
        id="dataset.derived.001",
        name="Parcelación derivada",
        source="derivado del atlas original",
        format=UNSUPPORTED_FORMAT_LABEL,
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
