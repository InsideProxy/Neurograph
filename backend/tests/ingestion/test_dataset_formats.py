from pathlib import Path

import pytest

from backend.ingestion.datasets.formats import (
    SUPPORTED_FORMATS,
    UNSUPPORTED_FORMAT_LABEL,
    FormatAdapter,
    FormatReadResult,
    get_format_adapter,
    read_dataset,
)

EXPECTED_LABELS = {
    "hcp_mmp1_cifti_dlabel",
    "gordon333_cifti_dlabel",
    "brainnetome_nifti_xlsx",
    "hcp_subcortex_grayordinates",
}


def test_catalog_has_exactly_the_four_current_adapters():
    # Cerrado a propósito (decisión 44): un formato nuevo se añade
    # escribiendo su propio adaptador, nunca ampliando esta lista sin
    # lector real detrás.
    assert set(SUPPORTED_FORMATS) == EXPECTED_LABELS


def test_unsupported_label_is_not_itself_in_the_catalog():
    # El centinela es un valor válido para DatasetManifest.format (ver
    # test_dataset_manifest.py) pero deliberadamente NO tiene adaptador:
    # aceptarlo aquí sería fingir un lector que no existe.
    assert UNSUPPORTED_FORMAT_LABEL not in SUPPORTED_FORMATS


@pytest.mark.parametrize("label", sorted(EXPECTED_LABELS))
def test_each_adapter_declares_its_required_files(label):
    adapter = get_format_adapter(label)
    assert adapter.label == label
    assert len(adapter.required_files) >= 1
    assert all(isinstance(role, str) and role for role in adapter.required_files)
    assert adapter.description  # nunca vacía: es lo único que verá una persona


@pytest.mark.parametrize("label", sorted(EXPECTED_LABELS))
def test_each_adapter_carries_real_atlas_metadata_not_placeholders(label):
    # decisión 45: species_id/atlas_id reales (build_id real, con puntos),
    # nunca un valor de relleno inventado para esta pieza nueva.
    meta = get_format_adapter(label).atlas_metadata
    assert meta.species_id.startswith("species.")
    assert meta.atlas_id.startswith("atlas.")
    assert meta.species_name and meta.species_scientific_name and meta.atlas_name


def test_get_format_adapter_rejects_unknown_label_with_actionable_message():
    with pytest.raises(ValueError, match="no soportado") as excinfo:
        get_format_adapter("formato_que_no_existe")
    # El mensaje debe listar los formatos reales -- para que el error sea
    # accionable, no solo "no funciona".
    for label in EXPECTED_LABELS:
        assert label in str(excinfo.value)


def test_read_dataset_dispatches_to_the_right_adapter(monkeypatch):
    calls: list[dict] = []

    def fake_read(paths):
        calls.append(dict(paths))
        return FormatReadResult(regions=["r1", "r2"], coordinates=["c1", "c2"])

    # `FormatAdapter` es inmutable a propósito (nunca se reasigna su
    # lector real por accidente en producción) -- para probar el
    # despacho sin tocar ningún archivo real, se sustituye la entrada
    # entera del catálogo por un doble de prueba, no un atributo suelto.
    real_adapter = SUPPORTED_FORMATS["brainnetome_nifti_xlsx"]
    test_double = FormatAdapter(
        label=real_adapter.label,
        description=real_adapter.description,
        required_files=real_adapter.required_files,
        read=fake_read,
        atlas_metadata=real_adapter.atlas_metadata,
    )
    monkeypatch.setitem(SUPPORTED_FORMATS, "brainnetome_nifti_xlsx", test_double)

    paths = {
        "atlas_nii": Path("/fake/BN_Atlas_246_2mm.nii.gz"),
        "regions_xlsx": Path("/fake/BNA_subregions.xlsx"),
    }
    result = read_dataset("brainnetome_nifti_xlsx", paths)

    assert result.regions == ["r1", "r2"]
    assert result.coordinates == ["c1", "c2"]
    assert calls == [paths]


def test_read_dataset_reports_missing_files_without_guessing():
    with pytest.raises(ValueError, match="faltan"):
        read_dataset("hcp_mmp1_cifti_dlabel", {"dlabel": Path("/fake/only_one.dlabel.nii")})


def test_format_read_result_defaults_are_real_empty_lists_not_none():
    result = FormatReadResult(regions=[], coordinates=[])
    assert result.networks == []
    assert result.memberships == []
