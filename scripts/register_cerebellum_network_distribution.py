"""Genera el SQL para dar de alta la distribución COMPLETA de redes de
Cole-Anticevic sobre el cerebelo (ambos hemisferios) -- no un único
ganador por voto mayoritario, a diferencia de
`register_cole_anticevic_networks.py` (regiones de HCP-MMP1.0). Ver el
docstring de `subcortical_network_distribution()` en
`backend/ingestion/neuroimaging/cole_anticevic_networks.py` para la
justificación: el cerebelo es una estructura funcionalmente distribuida,
forzar un único ganador ocultaría la mayor parte de la señal real.

Uso:
    python scripts/register_cerebellum_network_distribution.py <ca_netassignments.dlabel.nii> > salida.sql

No requiere conexión a la base de datos: solo imprime el SQL. Requiere
que las 12 redes de Cole-Anticevic y las 19 regiones subcorticales del
HCP (incluido el cerebelo, `register_hcp_subcortical_structures.sql`)
ya estén dadas de alta.
"""
from __future__ import annotations

import sys
from pathlib import Path


def _escape(value: str) -> str:
    return value.replace("'", "''")


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.neuroimaging.cole_anticevic_networks import (
        subcortical_network_distribution,
    )

    (ca_path,) = (Path(a) for a in argv)

    structures = [
        ("CIFTI_STRUCTURE_CEREBELLUM_LEFT", "region.human.hcp-subcortex.l_cerebellum"),
        ("CIFTI_STRUCTURE_CEREBELLUM_RIGHT", "region.human.hcp-subcortex.r_cerebellum"),
    ]

    all_assignments = []
    for cifti_name, region_id in structures:
        assignments = subcortical_network_distribution(ca_path, cifti_name, region_id)
        print(
            f"aviso: {region_id} -> {len(assignments)} redes con presencia real "
            f"(suma de confianzas: {sum(a.confidence for a in assignments):.4f})",
            file=sys.stderr,
        )
        all_assignments.extend(assignments)

    lines = [
        "-- Distribución completa (no voto mayoritario único) de redes de",
        "-- Cole-Anticevic sobre el cerebelo (ambos hemisferios). Generado por",
        "-- scripts/register_cerebellum_network_distribution.py. Ver decisión",
        "-- del 29/08/2026 en docs/analisis-arquitectura.md.",
        "",
        "INSERT INTO region_network_memberships "
        "(id, region_id, network_id, confidence, method, source_dataset_id, "
        "algorithm, created_at) VALUES",
    ]
    value_lines = [
        f"  ('{a.id}', '{a.region_id}', '{a.network_id}', {a.confidence!r}, "
        f"'{_escape(a.method)}', 'dataset.human.hcp.s1200_groupavg_extracted', "
        f"'full_distribution', now())"
        for a in all_assignments
    ]
    lines.append(",\n".join(value_lines))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET confidence = EXCLUDED.confidence, "
        "method = EXCLUDED.method;"
    )

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
