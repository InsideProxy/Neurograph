"""Genera el SQL de alta de un dataset a partir de su `dataset.yaml`
(decisión 46): línea de comandos sobre `backend/api/services/
dataset_ingestion_service.py::propose_dataset_ingestion`, la misma
función que usa la herramienta MCP `propose_dataset_ingestion`
(`backend/mcp/server.py`) -- nunca dos implementaciones paralelas del
mismo despacho manifiesto -> lector -> SQL.

Solo funciona para uno de los formatos YA soportados (con lector real
integrado, `backend/ingestion/datasets/formats.py::SUPPORTED_FORMATS`)
-- nunca para un formato nuevo, que sigue necesitando su propio
adaptador (ver `docs/protocolo-ingesta-ia.md`). El manifiesto debe traer
un mapa `files` (rol -> ruta relativa dentro de la propia carpeta del
dataset) que cubra todos los roles que ese formato necesita.

Uso:
    python scripts/register_from_manifest.py <carpeta_del_dataset> \\
        [--study-id ID --study-name "..." --study-doi ... \\
         --study-year 2016 --study-authors "Autor Uno;Autor Dos" \\
         --study-journal "..."] \\
        > salida.sql

No requiere conexión a la base de datos ni la toca: solo imprime SQL,
que se aplica siguiendo el mismo patrón manual de siempre (`docker cp` +
`psql -f`, o `scripts/apply_sql.ps1`) tras revisión humana -- ninguna
automatización de esta pieza sustituye esa revisión (mismo principio que
la decisión 17 fijó desde el principio para todo este protocolo).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "dataset_dir",
        type=Path,
        help="Carpeta que contiene el dataset.yaml (y, normalmente, los archivos reales).",
    )
    parser.add_argument("--study-id", default=None)
    parser.add_argument("--study-name", default=None)
    parser.add_argument("--study-doi", default=None)
    parser.add_argument("--study-year", type=int, default=None)
    parser.add_argument(
        "--study-authors",
        default=None,
        help="Autores separados por punto y coma, p. ej. 'Nombre Uno;Nombre Dos'.",
    )
    parser.add_argument("--study-journal", default=None)
    return parser


def main(argv: list[str]) -> int:
    # Fuerza UTF-8 en stdout (mismo riesgo 17 que el resto de scripts
    # register_*.py: acentos/ñ corrompidos en la consola de Windows si no
    # se fija explícitamente).
    sys.stdout.reconfigure(encoding="utf-8")

    args = _build_arg_parser().parse_args(argv)

    from backend.api.services.dataset_ingestion_service import propose_dataset_ingestion
    from backend.ingestion.datasets.sql_generation import StudyInfo

    study = None
    if args.study_id is not None:
        if args.study_name is None:
            print("error: --study-id requiere también --study-name", file=sys.stderr)
            return 1
        study = StudyInfo(
            id=args.study_id,
            name=args.study_name,
            doi=args.study_doi,
            year=args.study_year,
            authors=args.study_authors.split(";") if args.study_authors else None,
            journal=args.study_journal,
        )

    try:
        proposal = propose_dataset_ingestion(str(args.dataset_dir), study=study)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(
        f"regiones: {proposal.region_count}, coordenadas: {proposal.coordinate_count}, "
        f"redes: {proposal.network_count}, pertenencias: {proposal.membership_count}",
        file=sys.stderr,
    )
    print(proposal.sql)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
