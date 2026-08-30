"""Genera el SQL para dar de alta la conectividad estructural derivada de
Brainnetome: para cada par de las 246 regiones (sin la diagonal), el peso
calculado por el método documentado en
backend/ingestion/connectivity/brainnetome_sc.py (media simetrizada de
los mapas de probabilidad de tractografía, sin umbral -- se guarda la
matriz completa, sección 24: nunca se descarta un dato real al cargarlo).

Uso:
    python scripts/register_brainnetome_connections.py <BN_Atlas_246_2mm.nii.gz> <BNA_SC_4D.nii.gz> <BNA_subregions.xlsx> > salida.sql

No requiere conexión a la base de datos: solo imprime el SQL. Requiere
que las 246 regiones de Brainnetome ya estén dadas de alta
(register_brainnetome_atlas.sql).
"""
from __future__ import annotations

import sys
from pathlib import Path


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
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.connectivity.brainnetome_sc import METHOD, structural_connections

    atlas_path, sc_path, xlsx_path = (Path(a) for a in argv)
    connections = structural_connections(atlas_path, sc_path, xlsx_path)
    expected = 246 * 245 // 2
    if len(connections) != expected:
        print(
            f"aviso: se esperaban {expected} conexiones, se calcularon {len(connections)}",
            file=sys.stderr,
        )
    print(f"conexiones calculadas: {len(connections)}", file=sys.stderr)

    lines = [
        "-- Conectividad estructural de Brainnetome (Fase 4), derivada de",
        "-- BNA_SC_4D.nii.gz por media simetrizada de mapas de probabilidad de",
        "-- tractografia, sin umbral -- se guarda la matriz completa real.",
        "-- Generado por scripts/register_brainnetome_connections.py.",
        "-- Requiere las 246 regiones de Brainnetome ya dadas de alta.",
        "",
        "INSERT INTO connections "
        "(id, source_id, target_id, type, evidence_level, weight, "
        "source_dataset_id, algorithm, created_at) VALUES",
    ]
    value_lines = []
    for c in connections:
        value_lines.append(
            f"  ('{c.id}', '{c.source_id}', '{c.target_id}', 'structural', 'indirect', "
            f"{c.weight!r}, 'dataset.human.brainnetome.bna_246', '{METHOD}', now())"
        )
    lines.append(",\n".join(value_lines))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET weight = EXCLUDED.weight, "
        "evidence_level = EXCLUDED.evidence_level;"
    )

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
