"""Genera el SQL para dar de alta las 12 redes funcionales de la
parcelación Cole-Anticevic y la pertenencia (derivada) de cada región de
HCP-MMP1.0 a la red que domina la mayoría de sus vértices — todo calculado
a partir del archivo real de la partición (.dlabel.nii) y del archivo real
de HCP-MMP1.0 (para saber qué vértices pertenecen a cada región).

Uso:
    python scripts/register_cole_anticevic_networks.py <mmp.dlabel.nii> <ca_netassignments.dlabel.nii> > salida.sql

No requiere conexión a la base de datos: solo imprime el SQL, que se
aplica siguiendo el patrón de `backend/database/migrations/README.md`
(docker cp + psql -f). Requiere que la migración 0003
(region_network_memberships) ya esté aplicada.
"""
from __future__ import annotations

import datetime as dt
import sys
from pathlib import Path


def _escape(value: str) -> str:
    return value.replace("'", "''")


def main(argv: list[str]) -> int:
    # Fuerza UTF-8 en stdout aunque se redirija a un archivo en Windows
    # (bug real, encontrado el 30/08/2026: sin esto, Python usa la
    # página de códigos del sistema -- cp1252 en el caso de la usuaria --
    # y un carácter como el guion largo "—" se escribe como un byte que
    # PostgreSQL luego rechaza con "invalid byte sequence for encoding
    # \"UTF8\": 0x97" al aplicar el SQL -- ver riesgo 17 de
    # docs/analisis-arquitectura.md). No depender de que quien ejecute el
    # script recuerde poner $env:PYTHONUTF8=1 antes.
    sys.stdout.reconfigure(encoding="utf-8")
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.neuroimaging.cole_anticevic_networks import (
        read_networks,
        region_network_assignments,
    )

    mmp_path, ca_path = (Path(a) for a in argv)
    networks = read_networks(ca_path)
    assignments = region_network_assignments(mmp_path, ca_path)

    if len(networks) != 12:
        print(f"aviso: se esperaban 12 redes, se leyeron {len(networks)}", file=sys.stderr)
    print(
        f"aviso: {len(assignments)} de 360 regiones obtuvieron una red "
        "(el resto queda sin pertenencia, no forzada)",
        file=sys.stderr,
    )

    now = dt.datetime.now(dt.timezone.utc).isoformat()

    lines = [
        "-- Alta de las 12 redes funcionales de Cole-Anticevic (Ji et al., 2019,",
        "-- NeuroImage) y la pertenencia derivada de cada región de HCP-MMP1.0 a",
        "-- su red mayoritaria. Generado por scripts/register_cole_anticevic_networks.py",
        "-- a partir de los archivos .dlabel.nii reales (Fase 9 / clasificación de nodos).",
        "-- Requiere la migración 0003 (region_network_memberships) ya aplicada.",
        "",
        "INSERT INTO networks (id, name) VALUES",
    ]
    network_value_lines = [
        f"  ('{net.id}', '{_escape(net.name)}')" for net in networks
    ]
    lines.append(",\n".join(network_value_lines))
    lines.append("ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;")

    lines += [
        "",
        "INSERT INTO region_network_memberships "
        "(id, region_id, network_id, confidence, method, source_dataset_id, "
        "algorithm, created_at) VALUES",
    ]
    membership_value_lines = []
    for a in assignments:
        membership_value_lines.append(
            f"  ('{a.id}', '{a.region_id}', '{a.network_id}', {a.confidence!r}, "
            f"'{_escape(a.method)}', 'dataset.human.hcp.s1200_groupavg_extracted', "
            f"'majority_vote', '{now}')"
        )
    lines.append(",\n".join(membership_value_lines))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET network_id = EXCLUDED.network_id, "
        "confidence = EXCLUDED.confidence, method = EXCLUDED.method;"
    )

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
