"""Backfillea `regions.name` de las 360 regiones ya cargadas de
HCP-MMP1.0 (Glasser et al., 2016) para que muestren un nombre anatómico
real en vez del código de área crudo ("V1 (hemisferio izquierdo)" pasa a
"Primary Visual Cortex (hemisferio izquierdo)") -- petición explícita de
la usuaria, 02/09/2026: "la leyenda ha de contener los nombres reales de
las áreas cerebrales", tras señalar que una leyenda que repite dos veces
la misma abreviatura no tiene sentido.

Los 180 nombres reales verificados viven en
`backend/ingestion/neuroimaging/hcp_mmp1.py::REGION_LONG_NAMES` (fuente
única de verdad, con su cita completa en el propio módulo) -- este
script nunca repite ni reinventa esos nombres, solo genera el SQL de
actualización a partir de ellos.

No necesita leer el archivo `.dlabel.nii` real: el `id` y el nuevo
`name` de cada una de las 360 filas son enteramente una función del
código de área (180, ya verificado exhaustivamente contra el CIFTI real
al construir `REGION_LONG_NAMES`) y del hemisferio ("L"/"R", los únicos
dos que existen en este atlas cortical) -- se calculan aquí construyendo
etiquetas CIFTI sintéticas con el mismo formato exacto del archivo real
(`L_<code>_ROI` / `R_<code>_ROI`) y llamando a la misma
`regions_from_labels()` que usa la ingesta real, nunca reconstruyendo la
lógica de nombrado por separado -- así este script y la ingesta real no
pueden divergir silenciosamente.

`abbreviation`, `atlas_id`, `species_id`, `hemisphere` y el resto de
columnas de `regions` no se tocan: solo `name` cambia, y solo para las
360 filas de este atlas concreto (el `id` de cada fila ya identifica de
forma única `hcp-mmp1` + código + hemisferio, así que un `UPDATE ...
WHERE id = ...` no puede afectar a ninguna región de otro atlas).

Uso:
    python scripts/backfill_hcp_mmp1_region_names.py > salida_backfill_hcp_mmp1_names.sql

No requiere conexión a la base de datos: solo imprime el SQL (patrón
`docker cp` + `psql -f` / `scripts/apply_sql.ps1`, ver
`backend/database/migrations/README.md`) -- nunca una conexión directa a
la base de datos real desde este entorno.
"""
from __future__ import annotations

import sys

from backend.ingestion.neuroimaging.cifti_labels import CiftiLabel
from backend.ingestion.neuroimaging.hcp_mmp1 import REGION_LONG_NAMES, regions_from_labels


def _escape(value: str) -> str:
    return value.replace("'", "''")


def _synthetic_labels() -> list[CiftiLabel]:
    """Las 360 etiquetas CIFTI sintéticas (`L_<code>_ROI` / `R_<code>_ROI`)
    para los 180 códigos de área verificados en `REGION_LONG_NAMES`, en
    el mismo formato exacto que produce el archivo real. `index` y
    `rgba` son valores de relleno sin usar: `regions_from_labels()` solo
    lee `label.name`."""
    labels: list[CiftiLabel] = []
    for position, code in enumerate(sorted(REGION_LONG_NAMES)):
        labels.append(CiftiLabel(index=position * 2, name=f"L_{code}_ROI", rgba=(0.0, 0.0, 0.0, 0.0)))
        labels.append(
            CiftiLabel(index=position * 2 + 1, name=f"R_{code}_ROI", rgba=(0.0, 0.0, 0.0, 0.0))
        )
    return labels


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    regions = regions_from_labels(_synthetic_labels())
    if len(regions) != 360:
        raise AssertionError(
            f"se esperaban 360 regiones (180 códigos x 2 hemisferios), salieron {len(regions)}"
        )
    print(f"-- Backfill de regions.name para {len(regions)} regiones de HCP-MMP1.0.")
    print("-- Generado por scripts/backfill_hcp_mmp1_region_names.py.")
    print(
        "-- Nombres verificados en "
        "backend/ingestion/neuroimaging/hcp_mmp1.py::REGION_LONG_NAMES "
        "(decisión 51, docs/analisis-arquitectura.md)."
    )
    print()
    for region in sorted(regions, key=lambda r: r.id):
        print(f"UPDATE regions SET name = '{_escape(region.name)}' WHERE id = '{_escape(region.id)}';")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
