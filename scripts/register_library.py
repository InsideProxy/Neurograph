"""Genera el SQL para dar de alta (o actualizar) una biblioteca NeuroGraph
en la base de datos.

Uso:
    python scripts/register_library.py <ruta_para_leer_el_manifiesto> \
        [--record-path <ruta_a_registrar_en_la_bd>]

`<ruta_para_leer_el_manifiesto>` es la ruta desde la que este script puede
leer `.neurograph_library.yaml` (p. ej. `~/mnt/NeuroData` si se ejecuta
desde el entorno de desarrollo). `--record-path` es la ruta real tal como
la conoce el usuario en su propio sistema (p. ej. `E:\\NeuroData`); si se
omite, se usa la misma ruta de lectura.

No requiere conexión a la base de datos: solo imprime el SQL, que se
aplica siguiendo el patrón documentado en
`backend/database/migrations/README.md` (docker cp + psql -f).
"""
from __future__ import annotations

import sys
from pathlib import Path

from backend.library.manifest import detect_library
from backend.library.registration import library_insert_sql


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
    if len(argv) < 1:
        print(__doc__, file=sys.stderr)
        return 1

    read_path = Path(argv[0])
    record_path = argv[0]
    if len(argv) >= 3 and argv[1] == "--record-path":
        record_path = argv[2]

    manifest = detect_library(read_path)
    if manifest is None:
        print(f"No es una biblioteca NeuroGraph: {read_path}", file=sys.stderr)
        return 1

    print(library_insert_sql(manifest, record_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
