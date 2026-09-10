"""Conectividad estructural región-región REAL sobre HCP-MMP1.0 (Rosen BQ,
Halgren E (2021), "A Whole-Cortex Probabilistic Diffusion Tractography
Connectome", eNeuro, 8(1):ENEURO.0416-20.2020, DOI 10.1523/ENEURO.0416-20.2020).

Contexto (decisión de la usuaria, 01/09/2026, tras revisar en detalle el
estado real del proyecto): NeuroGraph solo tenía conectividad región-región
real para Brainnetome (30 135 pares, decisión 5) -- HCP-MMP1.0, el único
atlas con redes funcionales de Cole-Anticevic cargadas (incluida "Lenguaje"),
solo tenía Yeh et al. (2022) tracto->región (decisión 9), que NO es una
matriz región-región. Es decir: el atlas con redes con sentido cognitivo no
tenía ninguna conexión propia, y el atlas con conexiones (Brainnetome) no
tiene ninguna red funcional (decisión 25, descartado explícitamente).

Investigado por un subagente de búsqueda real antes de escribir nada (ver
conversación con la usuaria, 01/09/2026): Rosen & Halgren (2021) es el único
dataset verificado con una matriz región-región real sobre las 360 áreas
EXACTAS de HCP-MMP1.0 (no un atlas derivado ni una variante), por
tractografía probabilística de difusión sobre N=1065 sujetos del HCP S1200 --
la misma cohorte que ya sustenta Yeh et al. 2022. Publicado en Zenodo (DOI
10.5281/zenodo.4060485), licencia CC BY 4.0, verificado directamente en el
listado real de archivos del propio registro Zenodo antes de pedir su
descarga.

Correspondencia de índices verificada empíricamente, no asumida: el archivo
`allTables.xlsx` (hoja "table 2") declara el nombre de parcela de los índices
1-180 (hemisferio izquierdo implícito, sin prefijo) y la hoja "figure 8-3"
declara los índices 181-360 con el mismo nombre de parcela prefijado "R_".
`read_parcel_order()` comprueba, para los 180 pares (idx, idx+180), que el
nombre base coincide -- sin ninguna excepción -- antes de construir ningún
identificador, y lanza `ValueError` si no. Los 360 identificadores
resultantes (`region.human.hcp-mmp1.<hemisferio>_<parcela>`, en minúsculas,
mismo esquema que `hcp_mmp1.py`) se verificaron uno a uno contra las 360
regiones ya cargadas de HCP-MMP1.0 (grep directo sobre `salida_mmp1.sql`):
coinciden exactamente, sin ninguna región nueva ni ninguna huérfana.

Transformación de peso -- determinista, reversible, documentada, nunca una
invención: `averageConnectivity_Fpt.csv` publica el valor en log10. "Fpt"
("fraction of the total") es, según el propio método del artículo, la
fracción de streamlines entre la parcela A y la B sobre el total de
streamlines que tocan A o B, promediada en crudo entre sujetos y
transformada a log10 después porque el valor crudo cubre varios órdenes de
magnitud (verificado contra el texto del propio artículo). Para mantener la
misma convención 0-1 que el resto de conectividad estructural del proyecto
(Brainnetome, decisión 5; Yeh 2022, decisión 9), aquí se deshace la
transformación (`peso = 10 ** valor_log10`) -- no es un umbral ni una
reinterpretación: es la operación inversa exacta de la que aplicaron los
propios autores, documentada en `METHOD`.

Matriz simétrica y sin umbral, comprobado empíricamente antes de escribir
este módulo: diagonal siempre NaN, simetría exacta, 129 240 = 360x359
valores finitos (ningún hueco). Se registra UNA fila `Connection` por cada
par no ordenado (360x359/2 = 64620), mismo criterio que Brainnetome
(decisión 5: 246x245/2 pares) -- nunca dos filas duplicadas A->B y B->A para
un dato sin direccionalidad real. El par se ordena de forma determinista por
orden alfabético de `region_id` (source = el menor) -- una convención
estable entre ejecuciones, no una elección arbitraria.

`evidence_level='indirect'` (mismo criterio que el resto de conectividad
estructural por tractografía probabilística del proyecto: agregada sobre
1065 sujetos reales, pero no es trazado de vías confirmado).
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from backend.ontology.schema import EntityType, build_id, parse_id

METHOD = (
    "peso_igual_a_10_elevado_al_valor_log10_fpt_publicado_por_rosen_"
    "halgren_2021_sobre_1065_sujetos_hcp_s1200_matriz_de_grupo_simetrica_"
    "sin_umbral"
)

MATRIX_SIZE = 360
EXPECTED_CONNECTION_COUNT = MATRIX_SIZE * (MATRIX_SIZE - 1) // 2

_TABLE2_SHEET = "table 2"
_FIGURE83_SHEET = "figure 8-3"
_IDX_COLUMN_OFFSETS = (0, 4, 8)


@dataclass(frozen=True)
class RegionRegionConnection:
    id: str
    source_id: str
    target_id: str
    weight: float


def _extract_idx_parcel(worksheet, idx_offsets: tuple[int, ...]) -> dict[int, str]:
    out: dict[int, str] = {}
    for row in worksheet.iter_rows(min_row=2, values_only=True):
        for offset in idx_offsets:
            idx = row[offset]
            parcel = row[offset + 1]
            if idx is not None and parcel is not None:
                out[int(idx)] = str(parcel)
    return out


def read_parcel_order(all_tables_xlsx_path: Path) -> dict[int, str]:
    """Índice de matriz (1-360) -> `region_id` de HCP-MMP1.0 ya cargado.

    Cruza "table 2" (índices 1-180, hemisferio izquierdo implícito) con
    "figure 8-3" (índices 181-360, mismo nombre con prefijo "R_") y exige
    que coincidan exactamente -- lanza `ValueError` ante cualquier hueco
    o discrepancia, en vez de asumir la simetría en silencio."""
    import openpyxl

    workbook = openpyxl.load_workbook(str(all_tables_xlsx_path), read_only=True, data_only=True)
    try:
        left = _extract_idx_parcel(workbook[_TABLE2_SHEET], _IDX_COLUMN_OFFSETS)
        right = _extract_idx_parcel(workbook[_FIGURE83_SHEET], _IDX_COLUMN_OFFSETS)
    finally:
        workbook.close()

    if set(left) != set(range(1, 181)):
        raise ValueError(f"'{_TABLE2_SHEET}' no cubre exactamente los índices 1-180")
    if set(right) != set(range(181, 361)):
        raise ValueError(f"'{_FIGURE83_SHEET}' no cubre exactamente los índices 181-360")

    parcel_order: dict[int, str] = {}
    for idx in range(1, 181):
        name = left[idx]
        right_name = right[idx + 180]
        stripped = right_name.removeprefix("R_")
        if stripped != name:
            raise ValueError(
                f"parcela {idx} ('{name}') no coincide con su homóloga "
                f"{idx + 180} ('{right_name}')"
            )
        parcel_order[idx] = build_id(EntityType.REGION, "human", "hcp-mmp1", f"l_{name}")
        parcel_order[idx + 180] = build_id(EntityType.REGION, "human", "hcp-mmp1", f"r_{name}")
    return parcel_order


def _parse_cell(raw: str) -> float | None:
    value = raw.strip()
    if value.lower() == "nan":
        return None
    return float(value)


def read_connectivity_matrix(csv_path: Path) -> list[list[float | None]]:
    """Matriz 360x360 (log10 Fpt, diagonal `None`/NaN). Valida forma,
    diagonal y simetría exacta antes de devolver nada -- nunca se asume
    que el archivo tiene la forma esperada."""
    import csv as csv_module

    with open(csv_path, newline="") as f:
        rows = [[_parse_cell(cell) for cell in row] for row in csv_module.reader(f)]

    if len(rows) != MATRIX_SIZE or any(len(row) != MATRIX_SIZE for row in rows):
        raise ValueError(
            f"se esperaba una matriz {MATRIX_SIZE}x{MATRIX_SIZE}, "
            f"se encontraron {len(rows)} filas"
        )
    for i in range(MATRIX_SIZE):
        if rows[i][i] is not None:
            raise ValueError(f"la diagonal debería ser NaN, la fila {i} no lo es")
        for j in range(MATRIX_SIZE):
            if i == j:
                continue
            a, b = rows[i][j], rows[j][i]
            if (a is None) != (b is None):
                raise ValueError(f"asimetría de huecos entre ({i},{j}) y ({j},{i})")
            if a is not None and b is not None and abs(a - b) > 1e-6:
                raise ValueError(f"matriz no simétrica en ({i},{j}): {a} != {b}")
    return rows


def region_region_connections(
    parcel_order: dict[int, str], matrix: list[list[float | None]]
) -> list[RegionRegionConnection]:
    """Una fila `Connection` por cada par no ordenado (i<j) con valor
    real -- 360x359/2 = 64620 pares, nunca ambas direcciones para un
    dato sin direccionalidad propia. El source/target de cada fila se
    ordena por orden alfabético de `region_id` (convención estable)."""
    connections: list[RegionRegionConnection] = []
    for i in range(1, MATRIX_SIZE + 1):
        for j in range(i + 1, MATRIX_SIZE + 1):
            value = matrix[i - 1][j - 1]
            if value is None:
                continue
            region_a = parcel_order[i]
            region_b = parcel_order[j]
            source_id, target_id = sorted((region_a, region_b))
            local_a = parse_id(source_id)["local_code"]
            local_b = parse_id(target_id)["local_code"]
            conn_id = build_id(
                EntityType.CONNECTION,
                "human",
                "rosen-halgren2021",
                f"{local_a}__{local_b}",
            )
            connections.append(
                RegionRegionConnection(
                    id=conn_id,
                    source_id=source_id,
                    target_id=target_id,
                    weight=10.0**value,
                )
            )
    return connections
