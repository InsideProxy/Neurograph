from pathlib import Path

import pytest

from backend.ingestion.connectivity.yeh2022_tract_region import (
    EXPECTED_HEADER_TRACT_CODES,
    read_tract_full_names,
    tract_definitions,
    tract_region_connections,
)


def test_tract_definitions_applies_known_correction():
    full_names = {code: f"nombre de {code}" for code in EXPECTED_HEADER_TRACT_CODES}
    # Sin TPAT/C_PR (los nombres reales de la tabla de abreviaturas):
    # deben usarse en vez de PTAT/C_R para que se resuelva la corrección.
    del full_names["PTAT"]
    del full_names["C_R"]
    full_names["TPAT"] = "Temporo-Parietal Aslant Tract"
    full_names["C_PR"] = "Cingulum, Parolfactory Segment"

    defs = tract_definitions(full_names)
    assert len(defs) == 52  # 26 tractos x 2 hemisferios
    assert len({d.id for d in defs}) == 52

    ptat_left = next(d for d in defs if d.header_code == "PTAT" and d.hemisphere == "L")
    assert "Temporo-Parietal Aslant Tract" in ptat_left.name
    c_r_right = next(d for d in defs if d.header_code == "C_R" and d.hemisphere == "R")
    assert "Cingulum, Parolfactory Segment" in c_r_right.name


def test_tract_definitions_raises_on_missing_name():
    full_names = {code: f"nombre de {code}" for code in EXPECTED_HEADER_TRACT_CODES}
    # Sin la corrección PTAT->TPAT ni C_R->C_PR, debe fallar en vez de
    # inventar un nombre.
    del full_names["PTAT"]
    with pytest.raises(ValueError):
        tract_definitions(full_names)


_CONNECTOME_XLSX_PATH = (
    Path.home() / "mnt" / "NeuroData" / "original" / "connectivity"
    / "yeh2022_tract_region" / "tract_to_region_connectome_MMP.xlsx"
)
_ABBREVIATION_XLSX_PATH = (
    Path.home() / "mnt" / "NeuroData" / "original" / "connectivity"
    / "yeh2022_tract_region" / "abbreviation2.xlsx"
)

_REQUIRES_REAL_DATA = pytest.mark.skipif(
    not (_CONNECTOME_XLSX_PATH.exists() and _ABBREVIATION_XLSX_PATH.exists()),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada",
)


@_REQUIRES_REAL_DATA
def test_read_tract_full_names_against_real_file():
    names = read_tract_full_names(_ABBREVIATION_XLSX_PATH)
    assert len(names) == 26
    assert names["AF"] == "Arcuate Fasciculus"
    assert names["TPAT"] == "Temporo-Parietal Aslant Tract"
    assert names["C_PR"] == "Cingulum, Parolfactory Segment"
    # las 26 correcciones deben resolver a nombres reales
    for code in EXPECTED_HEADER_TRACT_CODES:
        assert names.get(code) or names.get({"PTAT": "TPAT", "C_R": "C_PR"}.get(code, code))


@_REQUIRES_REAL_DATA
def test_tract_definitions_against_real_file():
    names = read_tract_full_names(_ABBREVIATION_XLSX_PATH)
    defs = tract_definitions(names)
    assert len(defs) == 52
    assert len({d.id for d in defs}) == 52
    assert all(d.id.startswith("tract.human.yeh2022.") for d in defs)


@_REQUIRES_REAL_DATA
def test_tract_region_connections_against_real_file():
    conns = tract_region_connections(_CONNECTOME_XLSX_PATH)
    # 180 areas x 26 tractos x 2 hemisferios, sin umbral (incluye ceros)
    assert len(conns) == 180 * 26 * 2
    assert len({c.id for c in conns}) == len(conns)
    assert all(0.0 <= c.weight <= 1.0 for c in conns)
    assert all(c.source_id.startswith("tract.human.yeh2022.") for c in conns)
    assert all(c.target_id.startswith("region.human.hcp-mmp1.") for c in conns)

    zero_count = sum(1 for c in conns if c.weight == 0.0)
    # Verificado empíricamente el 29/08/2026: 75.3% de la matriz es
    # exactamente 0.0 -- se mantiene como referencia de regresión, no
    # como umbral aplicado en el código.
    zero_fraction = zero_count / len(conns)
    assert 0.70 < zero_fraction < 0.80

    # Un par conocido y verificado a mano contra el archivo real: TGd
    # (izquierda) con AF, probabilidad ~0.0413.
    known = next(
        c for c in conns
        if c.hemisphere == "L"
        and c.target_id == "region.human.hcp-mmp1.l_tgd"
        and c.source_id == "tract.human.yeh2022.l_af"
    )
    assert abs(known.weight - 0.0413145539906103) < 1e-9
