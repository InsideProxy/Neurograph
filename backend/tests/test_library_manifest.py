from pathlib import Path

from backend.library.manifest import detect_library, initialize_library


def test_initialize_and_detect_library(tmp_path: Path):
    assert detect_library(tmp_path) is None

    manifest = initialize_library(tmp_path)
    assert manifest.library_id

    detected = detect_library(tmp_path)
    assert detected is not None
    assert detected.library_id == manifest.library_id
    assert (tmp_path / "original" / "atlases").is_dir()
    assert (tmp_path / "derived" / "connectomes").is_dir()


def test_initialize_is_idempotent(tmp_path: Path):
    first = initialize_library(tmp_path)
    second = initialize_library(tmp_path)
    assert first.library_id == second.library_id
