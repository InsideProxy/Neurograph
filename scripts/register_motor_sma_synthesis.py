"""Genera el SQL para dar de alta 6 filas `Homology` (`status=
"uncertain_correspondence"`) entre el complejo de área motora suplementaria
humano (HCP-MMP1.0: `6ma`/`6mp`/`SCEF`, ya cargado) y el SMA de macaco
(Wang et al. 2017, ya cargado) -- ver el docstring de
`backend.ingestion.evolution.motor_sma_synthesis` para las cuatro fuentes
reales combinadas y por qué esto NO es `candidate_homology` (decisión de
la usuaria, 01/09/2026).

No crea ninguna `Region`/`Coordinate`/`Atlas`/`Species` nueva -- las seis
regiones que enlaza (3 humanas x 2 hemisferios, más el SMA de macaco x 2
hemisferios) ya existen en la base de datos real desde las decisiones 6
(HCP-MMP1.0) y 28 (Wang et al. 2017). Tampoco crea ningún `Dataset`:
a diferencia de Cheng et al. 2021, esta correspondencia no viene de un
único paquete de datos descargable -- es una síntesis de NeuroGraph sobre
cuatro citas reales, así que `source_dataset_id` queda explícitamente NULL
(apuntar a un Dataset inventado sería fingir una procedencia que no
existe).

Uso:
    python scripts/register_motor_sma_synthesis.py > salida.sql

No requiere conexión a la base de datos ni ningún archivo de entrada: solo
imprime el SQL, que se aplica siguiendo el patrón de
`backend/database/migrations/README.md` (docker cp + psql -f) -- y solo
tiene sentido aplicarlo DESPUÉS de que ya estén cargadas las regiones de
HCP-MMP1.0 y de Wang et al. 2017 (ambas ya aplicadas contra la base de
datos real de la usuaria).
"""
from __future__ import annotations

import sys


def _escape(value: str) -> str:
    return value.replace("'", "''")


def main(argv: list[str]) -> int:
    # Fuerza UTF-8 en stdout (mismo criterio que el resto de scripts de
    # registro -- riesgo 17 de docs/analisis-arquitectura.md).
    sys.stdout.reconfigure(encoding="utf-8")
    if argv:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.evolution.motor_sma_synthesis import build_homologies

    homologies = build_homologies()
    if len(homologies) != 6:
        print(f"aviso: se esperaban 6 homologías, se generaron {len(homologies)}", file=sys.stderr)
    print(f"homologías: {len(homologies)}", file=sys.stderr)

    lines: list[str] = []
    lines.append(
        "-- Síntesis de NeuroGraph (no de un único estudio): complejo SMA "
        "humano (6ma/6mp/SCEF, HCP-MMP1.0) <-> SMA de macaco (Wang et al. "
        "2017). status='uncertain_correspondence', confidence NULL, "
        "source_dataset_id NULL (no hay un dataset único de origen -- ver "
        "docstring de backend/ingestion/evolution/motor_sma_synthesis.py "
        "para las cuatro fuentes reales combinadas). Generado por "
        "scripts/register_motor_sma_synthesis.py."
    )
    lines.append(
        "INSERT INTO homologies "
        "(id, source_id, target_id, status, confidence, method, "
        "source_dataset_id, created_at) VALUES"
    )
    homology_values = [
        f"  ('{h.id}', '{h.source_id}', '{h.target_id}', '{h.status}', NULL, "
        f"'{_escape(h.method)}', NULL, now())"
        for h in homologies
    ]
    lines.append(",\n".join(homology_values))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, "
        "confidence = EXCLUDED.confidence, method = EXCLUDED.method, "
        "source_dataset_id = EXCLUDED.source_dataset_id;"
    )

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
