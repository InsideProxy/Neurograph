"""Genera el SQL de alta de las redes de Yeo et al. 2011 (7 y 17) y de las
comunidades de Power et al. 2011, y la pertenencia (derivada, por voto
mayoritario de vértices) de cada región de HCP-MMP1.0 a cada una de las
tres clasificaciones -- decisión 73 de docs/analisis-arquitectura.md.

Mismo criterio exacto que scripts/register_cole_anticevic_networks.py
(decisión 3): los vértices sin red no votan, una región sin ningún
vértice con red se queda sin pertenencia, y `confidence` es la fracción
real de vértices que votan a la red ganadora. Las pertenencias nuevas NO
sustituyen a las de Cole-Anticevic: conviven con ellas, y el backend
elige cuál mostrar según la clasificación que pida la interfaz
(`GET /regions?network_source=...`).

No se conecta a ninguna base de datos: escribe el SQL en un archivo (en
UTF-8 sin BOM, directamente -- nunca con `>` de PowerShell, que lo
guardaría en UTF-16, ver decisión 66), para revisarlo y aplicarlo con
scripts/apply_sql.ps1 (Docker) y scripts/apply_migration_embedded.ps1
(Postgres embebido).

Uso (desde la raíz del repositorio):

    python scripts/register_rsn_networks.py ^
        --hcp-dir "E:\\NeuroData\\derived\\extracted\\hcp_s1200_groupavg\\HCP_S1200_Atlas_Z4_pkXDZ" ^
        --out data\\sql\\salida_rsn_networks.sql
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from backend.ingestion.neuroimaging import rsn_networks, surface_parcels  # noqa: E402

RSN_FILE = "RSN-networks.32k_fs_LR.dlabel.nii"
MMP1_DLABEL = "Q1-Q6_RelatedValidation210.CorticalAreas_dil_Final_Final_Areas_Group_Colors.32k_fs_LR.dlabel.nii"
SURF = "S1200.{hemi}.midthickness_MSMAll.32k_fs_LR.surf.gii"
SOURCE_DATASET_ID = "dataset.human.hcp.s1200_groupavg_extracted"

METHODS = {
    rsn_networks.SOURCE_YEO7: "voto_mayoritario_de_vertices_hcp_mmp1_sobre_rsn_networks_hcp_yeo2011_7redes_excluyendo_pared_medial",
    rsn_networks.SOURCE_YEO17: "voto_mayoritario_de_vertices_hcp_mmp1_sobre_rsn_networks_hcp_yeo2011_17redes_excluyendo_pared_medial",
    rsn_networks.SOURCE_POWER: (
        "voto_mayoritario_de_vertices_hcp_mmp1_sobre_rsn_networks_hcp_power2011_sin_rellenar_huecos_"
        "excluyendo_fondo_y_comunidades_inciertas"
    ),
}


def _escape(value: str) -> str:
    return value.replace("'", "''")


def build_sql(hcp_dir: Path) -> tuple[str, list[str]]:
    vertex_maps = rsn_networks.read_rsn_vertex_maps(hcp_dir / RSN_FILE)
    mmp = surface_parcels.read_surface_parcel_map(
        "hcp_mmp1",
        hcp_dir / MMP1_DLABEL,
        hcp_dir / SURF.format(hemi="L"),
        hcp_dir / SURF.format(hemi="R"),
    )
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    lines = [
        "-- Redes de Yeo et al. 2011 (7 y 17) y comunidades de Power et al. 2011 sobre",
        "-- fs_LR 32k (archivo RSN-networks del paquete S1200 del HCP), y la pertenencia",
        "-- derivada de cada región de HCP-MMP1.0 a cada clasificación por voto mayoritario",
        "-- de vértices. Generado por scripts/register_rsn_networks.py (decisión 73).",
        "-- Idempotente (ON CONFLICT). No toca las pertenencias de Cole-Anticevic.",
        "",
        "BEGIN;",
    ]
    report: list[str] = []
    for source, network_map in vertex_maps.items():
        memberships = rsn_networks.majority_vote_memberships(
            network_map, mmp.region_ids, mmp.vertex_region_index, METHODS[source]
        )
        low = sum(1 for m in memberships if m.confidence < 0.5)
        report.append(
            f"{source}: {len(network_map.networks)} redes, {len(memberships)} de {len(mmp.region_ids)} "
            f"regiones con pertenencia ({low} con confianza < 0,5 -- se cargan igual, con su confianza real)"
        )
        lines.append("")
        lines.append(f"-- {source}")
        lines.append("INSERT INTO networks (id, name) VALUES")
        lines.append(",\n".join(f"  ('{n.id}', '{_escape(n.name)}')" for n in network_map.networks))
        lines.append("ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;")
        lines.append(
            "INSERT INTO region_network_memberships "
            "(id, region_id, network_id, confidence, method, source_dataset_id, algorithm, created_at) VALUES"
        )
        lines.append(
            ",\n".join(
                f"  ('{m.id}', '{m.region_id}', '{m.network_id}', {m.confidence!r}, '{_escape(m.method)}', "
                f"'{SOURCE_DATASET_ID}', 'majority_vote', '{now}')"
                for m in memberships
            )
        )
        lines.append(
            "ON CONFLICT (id) DO UPDATE SET network_id = EXCLUDED.network_id, "
            "confidence = EXCLUDED.confidence, method = EXCLUDED.method;"
        )
    lines += ["", "COMMIT;", ""]
    return "\n".join(lines), report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--hcp-dir", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    sql, report = build_sql(args.hcp_dir)
    args.out.write_text(sql, encoding="utf-8")
    for line in report:
        print(line)
    print(f"SQL escrito en {args.out} (UTF-8 sin BOM)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
