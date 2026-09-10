import csv
from pathlib import Path

import openpyxl
import pytest

from backend.ingestion.connectivity.rosen_halgren2021_mmp1_connectome import (
    EXPECTED_CONNECTION_COUNT,
    MATRIX_SIZE,
    read_connectivity_matrix,
    read_parcel_order,
    region_region_connections,
)

# ---------------------------------------------------------------------------
# Fixtures sintéticas (generadas programáticamente, no reales) que respetan
# la FORMA exacta de los archivos reales -- 180 parcelas en "table 2", 180
# en "figure 8-3", matriz 360x360 -- para poder probar la lógica de
# validación y transformación sin necesitar los archivos reales.
# ---------------------------------------------------------------------------


def _write_all_tables_xlsx(path: Path, *, break_index: int | None = None) -> None:
    """Construye un allTables.xlsx sintético con las 360 parcelas
    correctas (nombres 'p1'..'p180'). Si `break_index` se indica, ese
    índice del lado derecho ('figure 8-3') se escribe con un nombre que
    NO coincide con su homólogo izquierdo, para probar la detección de
    discrepancias."""
    workbook = openpyxl.Workbook()
    table2 = workbook.active
    table2.title = "table 2"
    table2.append(["Idx.", "Parcel", "Orig.", "Network"] * 3)
    for row_start in range(1, 61):
        row = []
        for block in range(3):
            idx = row_start + block * 60
            row.extend([idx, f"p{idx}", idx, "SomeNetwork"])
        table2.append(row)

    figure83 = workbook.create_sheet("figure 8-3")
    figure83.append(["Idx.", "Parcel", "r", "p"] * 3)
    for row_start in range(1, 61):
        row = []
        for block in range(3):
            idx = 180 + row_start + block * 60
            left_idx = idx - 180
            name = f"p{left_idx}"
            if idx == break_index:
                name = "wrong_name"
            row.extend([idx, f"R_{name}", 0.1, "n.s."])
        figure83.append(row)

    workbook.save(str(path))


def _write_symmetric_matrix_csv(path: Path, *, size: int = MATRIX_SIZE, seed: int = 7) -> list:
    """Matriz size x size simétrica, diagonal NaN, valores reproducibles
    (no aleatorios de verdad -- generador determinista simple)."""
    matrix = [[0.0] * size for _ in range(size)]
    for i in range(size):
        for j in range(i + 1, size):
            value = -1.0 - ((i * 37 + j * seed) % 500) / 100.0
            matrix[i][j] = value
            matrix[j][i] = value
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        for i in range(size):
            row = ["NaN" if i == j else repr(matrix[i][j]) for j in range(size)]
            writer.writerow(row)
    return matrix


def test_read_parcel_order_maps_all_360_indices(tmp_path):
    xlsx_path = tmp_path / "allTables.xlsx"
    _write_all_tables_xlsx(xlsx_path)

    parcel_order = read_parcel_order(xlsx_path)

    assert len(parcel_order) == 360
    assert parcel_order[1] == "region.human.hcp-mmp1.l_p1"
    assert parcel_order[181] == "region.human.hcp-mmp1.r_p1"
    assert parcel_order[180] == "region.human.hcp-mmp1.l_p180"
    assert parcel_order[360] == "region.human.hcp-mmp1.r_p180"


def test_read_parcel_order_rejects_mismatched_homolog(tmp_path):
    xlsx_path = tmp_path / "allTables.xlsx"
    _write_all_tables_xlsx(xlsx_path, break_index=200)

    with pytest.raises(ValueError):
        read_parcel_order(xlsx_path)


def test_read_connectivity_matrix_validates_shape_and_symmetry(tmp_path):
    csv_path = tmp_path / "matrix.csv"
    expected = _write_symmetric_matrix_csv(csv_path)

    matrix = read_connectivity_matrix(csv_path)

    assert len(matrix) == MATRIX_SIZE
    assert all(len(row) == MATRIX_SIZE for row in matrix)
    assert matrix[0][0] is None
    assert matrix[5][5] is None
    assert matrix[3][10] == pytest.approx(expected[3][10])


def test_read_connectivity_matrix_rejects_wrong_shape(tmp_path):
    csv_path = tmp_path / "matrix_too_small.csv"
    _write_symmetric_matrix_csv(csv_path, size=10)

    with pytest.raises(ValueError):
        read_connectivity_matrix(csv_path)


def test_read_connectivity_matrix_rejects_broken_symmetry(tmp_path):
    csv_path = tmp_path / "matrix.csv"
    _write_symmetric_matrix_csv(csv_path)
    # Rompe la simetría a mano en una única celda.
    with open(csv_path) as f:
        rows = list(csv.reader(f))
    rows[0][1] = "-999.0"
    with open(csv_path, "w", newline="") as f:
        csv.writer(f).writerows(rows)

    with pytest.raises(ValueError):
        read_connectivity_matrix(csv_path)


def test_region_region_connections_builds_all_pairs_once():
    parcel_order = {
        idx: f"region.human.hcp-mmp1.{'l' if idx <= 180 else 'r'}_p{idx if idx <= 180 else idx - 180}"
        for idx in range(1, 361)
    }
    matrix = [[0.0] * MATRIX_SIZE for _ in range(MATRIX_SIZE)]
    for i in range(MATRIX_SIZE):
        for j in range(MATRIX_SIZE):
            if i != j:
                matrix[i][j] = -2.0
            else:
                matrix[i][j] = None  # type: ignore[assignment]

    connections = region_region_connections(parcel_order, matrix)

    assert len(connections) == EXPECTED_CONNECTION_COUNT
    assert len({c.id for c in connections}) == EXPECTED_CONNECTION_COUNT
    assert all(c.source_id < c.target_id for c in connections)
    assert all(c.weight == pytest.approx(10.0**-2.0) for c in connections)


def test_region_region_connections_skips_missing_values():
    parcel_order = {
        1: "region.human.hcp-mmp1.l_a",
        2: "region.human.hcp-mmp1.l_b",
        3: "region.human.hcp-mmp1.l_c",
    }
    # Solo se usan los 3 primeros índices de una matriz 360x360 -- el
    # resto queda en None para simular huecos y comprobar que se saltan.
    matrix = [[None] * MATRIX_SIZE for _ in range(MATRIX_SIZE)]
    matrix[0][1] = matrix[1][0] = -1.0  # par (1,2) real
    # (1,3) y (2,3) quedan sin valor -- deben excluirse, no forzarse a 0.

    connections = region_region_connections(parcel_order, matrix)

    assert len(connections) == 1
    assert connections[0].weight == pytest.approx(10.0**-1.0)


# ---------------------------------------------------------------------------
# Pruebas contra los archivos reales (Rosen & Halgren, 2021), omitidas si la
# biblioteca de datos real no está montada.
# ---------------------------------------------------------------------------

_REAL_DIR = (
    Path.home() / "mnt" / "NeuroData" / "original" / "connectivity" / "rosen_halgren_2021"
)
_REAL_CSV_PATH = _REAL_DIR / "averageConnectivity_Fpt.csv"
_REAL_XLSX_PATH = _REAL_DIR / "allTables.xlsx"

_REQUIRES_REAL_DATA = pytest.mark.skipif(
    not (_REAL_CSV_PATH.exists() and _REAL_XLSX_PATH.exists()),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada",
)


@_REQUIRES_REAL_DATA
def test_real_files_produce_expected_connection_count():
    parcel_order = read_parcel_order(_REAL_XLSX_PATH)
    matrix = read_connectivity_matrix(_REAL_CSV_PATH)
    connections = region_region_connections(parcel_order, matrix)

    assert len(connections) == EXPECTED_CONNECTION_COUNT == 64620
    assert len({c.id for c in connections}) == EXPECTED_CONNECTION_COUNT


@_REQUIRES_REAL_DATA
def test_real_known_pair_v1_pros_matches_published_value():
    # Verificado a mano contra el CSV real: fila 1 (V1), columna 2 (ProS)
    # = -3.707 (log10 Fpt) -> peso = 10**-3.707.
    parcel_order = read_parcel_order(_REAL_XLSX_PATH)
    matrix = read_connectivity_matrix(_REAL_CSV_PATH)
    connections = region_region_connections(parcel_order, matrix)

    by_id = {c.id for c in connections}
    v1_id = "region.human.hcp-mmp1.l_v1"
    pros_id = "region.human.hcp-mmp1.l_pros"
    source_id, target_id = sorted((v1_id, pros_id))
    conn = next(c for c in connections if c.source_id == source_id and c.target_id == target_id)

    assert conn.id in by_id
    assert conn.weight == pytest.approx(10.0**-3.707, rel=1e-4)


@_REQUIRES_REAL_DATA
def test_real_all_360_regions_already_exist_in_hcp_mmp1_atlas():
    # No verifica la base de datos real directamente (este entorno no
    # tiene acceso a ella): comprueba que el propio parcel_order genera
    # ids con el mismo esquema exacto que backend/ingestion/neuroimaging
    # /hcp_mmp1.py, y que no hay ids repetidos ni vacíos.
    parcel_order = read_parcel_order(_REAL_XLSX_PATH)
    assert len(parcel_order) == 360
    assert len(set(parcel_order.values())) == 360
    for idx, region_id in parcel_order.items():
        hemisphere_prefix = "l_" if idx <= 180 else "r_"
        assert region_id.startswith(f"region.human.hcp-mmp1.{hemisphere_prefix}")
