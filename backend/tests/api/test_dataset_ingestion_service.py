import datetime as dt

import pytest

from backend.api.services.dataset_ingestion_service import propose_dataset_ingestion
from backend.ingestion.datasets.formats import SUPPORTED_FORMATS, FormatAdapter, FormatReadResult
from backend.ingestion.datasets.manifest import DatasetManifest, write_dataset_manifest
from backend.ingestion.datasets.sql_generation import StudyInfo


def _fake_brainnetome_adapter(monkeypatch, regions=None, coordinates=None):
    real_adapter = SUPPORTED_FORMATS["brainnetome_nifti_xlsx"]

    def fake_read(paths):
        return FormatReadResult(regions=regions or [], coordinates=coordinates or [])

    test_double = FormatAdapter(
        label=real_adapter.label,
        description=real_adapter.description,
        required_files=real_adapter.required_files,
        read=fake_read,
        atlas_metadata=real_adapter.atlas_metadata,
    )
    monkeypatch.setitem(SUPPORTED_FORMATS, "brainnetome_nifti_xlsx", test_double)


def test_propose_dataset_ingestion_reports_missing_manifest(tmp_path):
    with pytest.raises(ValueError, match="No hay dataset.yaml"):
        propose_dataset_ingestion(str(tmp_path / "no-existe"))


def test_propose_dataset_ingestion_rejects_unsupported_format(tmp_path):
    manifest = DatasetManifest(
        id="dataset.mistery",
        name="Dataset sin adaptador",
        source="quien sea",
        format="unsupported_pending_adapter",
        date_added=dt.date(2026, 9, 2),
    )
    write_dataset_manifest(tmp_path, manifest)

    with pytest.raises(ValueError, match="no tiene lector automático todavía"):
        propose_dataset_ingestion(str(tmp_path))


def test_propose_dataset_ingestion_reports_missing_file_roles(tmp_path):
    manifest = DatasetManifest(
        id="dataset.brainnetome.incompleto",
        name="Brainnetome sin archivos declarados",
        source="descarga pública",
        format="brainnetome_nifti_xlsx",
        date_added=dt.date(2026, 9, 2),
        files={"atlas_nii": "BN_Atlas_246_2mm.nii.gz"},  # falta regions_xlsx
    )
    write_dataset_manifest(tmp_path, manifest)

    with pytest.raises(ValueError, match="regions_xlsx"):
        propose_dataset_ingestion(str(tmp_path))


def test_propose_dataset_ingestion_reports_missing_files_on_disk(tmp_path):
    manifest = DatasetManifest(
        id="dataset.brainnetome.archivos_ausentes",
        name="Brainnetome con archivos que no existen",
        source="descarga pública",
        format="brainnetome_nifti_xlsx",
        date_added=dt.date(2026, 9, 2),
        files={"atlas_nii": "no_existe.nii.gz", "regions_xlsx": "tampoco.xlsx"},
    )
    write_dataset_manifest(tmp_path, manifest)

    with pytest.raises(ValueError, match="no existen en disco"):
        propose_dataset_ingestion(str(tmp_path))


def test_propose_dataset_ingestion_generates_sql_end_to_end(tmp_path, monkeypatch):
    from backend.ingestion.neuroimaging.hcp_mmp1 import MmpCoordinate, MmpRegion

    region = MmpRegion(
        id="region.human.brainnetome.a1_1",
        name="Área de prueba",
        abbreviation="A1",
        raw_label="A1_L",
        hemisphere="L",
    )
    coordinate = MmpCoordinate(
        id="coordinate.human.brainnetome.a1_1",
        entity_id="region.human.brainnetome.a1_1",
        x=-1.0,
        y=-2.0,
        z=3.0,
        reference_space="MNI152_FSL_2mm",
    )
    _fake_brainnetome_adapter(monkeypatch, regions=[region], coordinates=[coordinate])

    (tmp_path / "BN_Atlas_246_2mm.nii.gz").write_bytes(b"fake")
    (tmp_path / "BNA_subregions.xlsx").write_bytes(b"fake")
    manifest = DatasetManifest(
        id="dataset.human.brainnetome.bna_246",
        name="Brainnetome Atlas",
        source="Brainnetome Center",
        format="brainnetome_nifti_xlsx",
        date_added=dt.date(2026, 9, 2),
        files={"atlas_nii": "BN_Atlas_246_2mm.nii.gz", "regions_xlsx": "BNA_subregions.xlsx"},
    )
    write_dataset_manifest(tmp_path, manifest)

    proposal = propose_dataset_ingestion(
        str(tmp_path),
        study=StudyInfo(id="study.human.brainnetome.fan_2016", name="Fan L et al. (2016)."),
    )

    assert proposal.dataset_id == "dataset.human.brainnetome.bna_246"
    assert proposal.format == "brainnetome_nifti_xlsx"
    assert proposal.region_count == 1
    assert proposal.coordinate_count == 1
    assert proposal.network_count == 0
    assert proposal.membership_count == 0
    assert "INSERT INTO studies" in proposal.sql
    assert "study.human.brainnetome.fan_2016" in proposal.sql
    assert "region.human.brainnetome.a1_1" in proposal.sql
