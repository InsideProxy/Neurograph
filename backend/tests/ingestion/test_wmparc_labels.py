"""Pruebas de backend/ingestion/tractography/wmparc_labels.py."""
import pytest

from backend.ingestion.tractography.wmparc_labels import (
    DK_CORTICAL,
    EXCLUDED_LABELS,
    SUBCORTICAL,
    UnverifiedLabelError,
    label_name,
)


def test_subcortical_label_resolves_to_real_name():
    assert label_name(17) == "Left-Hippocampus"
    assert label_name(5002) == "Right-UnsegmentedWhiteMatter"


def test_cortical_label_ranges_resolve_with_real_hemisphere_prefix():
    assert label_name(1001) == "ctx-lh-bankssts"
    assert label_name(2035) == "ctx-rh-insula"
    assert label_name(3001) == "wm-lh-bankssts"
    assert label_name(4035) == "wm-rh-insula"


def test_excluded_labels_raise_instead_of_naming_an_unclassified_bin():
    with pytest.raises(UnverifiedLabelError):
        label_name(1000)
    with pytest.raises(UnverifiedLabelError):
        label_name(2000)


def test_unmapped_label_raises_rather_than_guessing():
    with pytest.raises(UnverifiedLabelError):
        label_name(999999)


def test_dk_cortical_has_no_entry_for_local_code_zero():
    # El código local 0 ("unknown") se maneja aparte, vía EXCLUDED_LABELS
    # -- nunca como una entrada más de DK_CORTICAL.
    assert 0 not in DK_CORTICAL


def test_excluded_labels_disjoint_from_named_tables():
    assert not set(EXCLUDED_LABELS) & set(SUBCORTICAL)
