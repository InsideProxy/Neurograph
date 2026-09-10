"""Genera el SQL de la cuarta pestaña de tractografía: nodos y aristas
reales derivados de ORG-800FC-100HCP + el wmparc de referencia
(decisión 66, 09/09/2026 -- petición de la usuaria: "hagamos una cuarta
pestaña con nodos derivados de tractografía... se seleccionan nodos y
el programa devuelve la tractografía que los une").

Uso:
    python scripts/generate_hybrid_tractography_nodes.py \\
        --wmparc E:\\NeuroData\\original\\tractography\\100HCP-population-mean-wmparc.nii.gz \\
        --tract-zip E:\\NeuroData\\original\\tractography\\ORG-800FiberClusters.zip \\
        > salida.sql

No requiere conexión a la base de datos: solo imprime el SQL, que se
aplica siguiendo el patrón de `backend/database/migrations/README.md`
(en el Postgres embebido del ejecutable, `scripts/
apply_migration_embedded.ps1`, una vez aplicada la migración 0015 --
mismo orden ya usado para 0012+`generate_org_tractography_geometry.py`).
Requiere la migración 0015 (`tractography_nodes_and_edges`).

Reproducible: `pip install vtk` (nibabel/numpy ya son dependencias del
backend, pyproject.toml) y ejecutar este script con las rutas reales de
los dos archivos de la usuaria. Tarda del orden de un minuto (recorre
las 523696 streamlines reales, resolución completa, de los 41 tractos)
-- normal, no es un error.

Toda la lectura/decodificación y el cálculo real (centroides de nodo,
asignación de extremo a etiqueta, muestreo determinista por reserva de
cada arista) viven en `backend.ingestion.tractography.hybrid_nodes`
(módulo puro, sin SQL); este script solo serializa el resultado a SQL,
mismo reparto de responsabilidades que
`scripts/generate_org_tractography_geometry.py`.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from backend.ingestion.tractography.hybrid_nodes import (
    HybridEdgeDefinition,
    HybridNodeDefinition,
    compute_hybrid_graph,
)


def _escape(value: str) -> str:
    return value.replace("'", "''")


def _pg_array(values: tuple[str, ...]) -> str:
    """`ARRAY['a','b']::text[]` real -- nunca una cadena separada por
    comas (eso rompería con un código de tracto que algún día trajera
    una coma, aunque hoy ninguno la tiene)."""
    items = ", ".join(f"'{_escape(v)}'" for v in values)
    return f"ARRAY[{items}]::text[]"


def _nodes_sql(nodes: list[HybridNodeDefinition]) -> list[str]:
    lines: list[str] = []
    lines.append(
        f"-- {len(nodes)} nodos reales (etiquetas del wmparc con nombre "
        "verificado, decisión 66)."
    )
    lines.append(
        "INSERT INTO tractography_nodes "
        "(id, name, wmparc_label, x, y, z, reference_space, method) VALUES"
    )
    values = [
        f"  ('{n.id}', '{_escape(n.name)}', {n.wmparc_label}, "
        f"{n.x!r}, {n.y!r}, {n.z!r}, '{_escape(n.reference_space)}', "
        f"'{_escape(n.method)}')"
        for n in nodes
    ]
    lines.append(",\n".join(values))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET\n"
        "  name = EXCLUDED.name, wmparc_label = EXCLUDED.wmparc_label,\n"
        "  x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z,\n"
        "  reference_space = EXCLUDED.reference_space, method = EXCLUDED.method;"
    )
    lines.append("")
    return lines


def _edges_sql(edges: list[HybridEdgeDefinition]) -> list[str]:
    lines: list[str] = []
    total_shown = sum(e.streamline_count_shown for e in edges)
    total_real = sum(e.streamline_count_real for e in edges)
    lines.append(
        f"-- {len(edges)} aristas reales ({total_shown} streamlines "
        f"mostradas de {total_real} reales que cumplen la condición -- "
        "ver diagnostics en la salida de stderr de este script)."
    )
    lines.append(
        "INSERT INTO tractography_edges "
        "(node_a_id, node_b_id, tract_codes, streamlines, "
        "streamline_count_real, streamline_count_shown, reference_space, method) VALUES"
    )
    values = [
        f"  ('{e.node_a_id}', '{e.node_b_id}', {_pg_array(e.tract_codes)}, "
        f"'{_escape(json.dumps(e.streamlines))}'::jsonb, "
        f"{e.streamline_count_real}, {e.streamline_count_shown}, "
        f"'{_escape(e.reference_space)}', '{_escape(e.method)}')"
        for e in edges
    ]
    lines.append(",\n".join(values))
    lines.append(
        "ON CONFLICT (node_a_id, node_b_id) DO UPDATE SET\n"
        "  tract_codes = EXCLUDED.tract_codes,\n"
        "  streamlines = EXCLUDED.streamlines,\n"
        "  streamline_count_real = EXCLUDED.streamline_count_real,\n"
        "  streamline_count_shown = EXCLUDED.streamline_count_shown,\n"
        "  reference_space = EXCLUDED.reference_space,\n"
        "  method = EXCLUDED.method;"
    )
    lines.append("")
    return lines


def main(argv: list[str]) -> int:
    # Fuerza UTF-8 en stdout aunque se redirija a un archivo en Windows
    # -- mismo bug real ya documentado en generate_org_tractography_geometry.py.
    sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wmparc", required=True, type=Path)
    parser.add_argument("--tract-zip", required=True, type=Path)
    args = parser.parse_args(argv)

    if not args.wmparc.is_file():
        print(f"error: no existe el archivo {args.wmparc}", file=sys.stderr)
        return 1
    if not args.tract_zip.is_file():
        print(f"error: no existe el archivo {args.tract_zip}", file=sys.stderr)
        return 1

    print(f"leyendo {args.wmparc} y {args.tract_zip} ...", file=sys.stderr)
    result = compute_hybrid_graph(args.wmparc, args.tract_zip)
    d = result.diagnostics

    print(
        f"nodos: {len(result.nodes)}, aristas: {len(result.edges)}, "
        f"streamlines de origen: {d.streamlines_real_total}",
        file=sys.stderr,
    )
    print(
        f"extremos reales: {d.endpoints_real_total} -- en etiqueta nombrada: "
        f"{d.endpoints_in_named_label}, en fondo: {d.endpoints_background}, "
        f"en etiqueta excluida (unknown): {d.endpoints_in_excluded_label}",
        file=sys.stderr,
    )
    print(
        f"streamlines con los dos extremos en el mismo nodo (bucle, excluidas "
        f"de aristas): {d.streamlines_dropped_self_loop}",
        file=sys.stderr,
    )
    print(
        f"vóxeles reales en etiquetas excluidas: {d.excluded_label_voxel_counts}",
        file=sys.stderr,
    )

    lines: list[str] = []
    lines.append(
        "-- Grafo híbrido tractografía+parcelación (decisión 66, "
        "org2018_wmparc). Generado por "
        "scripts/generate_hybrid_tractography_nodes.py."
    )
    lines.append("")
    lines.extend(_nodes_sql(result.nodes))
    lines.extend(_edges_sql(result.edges))

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
