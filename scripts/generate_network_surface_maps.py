"""Genera los mapas ORIGINALES, vértice a vértice, de las redes de Yeo et
al. 2011 (7 y 17) y de las comunidades de Power et al. 2011 sobre la
superficie fs_LR 32k, para pintarlos en el cerebro 3D -- decisión 73 de
docs/analisis-arquitectura.md, 23/09/2026. Mismo patrón que
scripts/generate_surface_parcels.py (decisión 72): script de un solo uso
que escribe en frontend/public/, nunca en tiempo de ejecución.

Por qué además del voto por región (scripts/register_rsn_networks.py):
el voto mayoritario resume cada región de HCP-MMP1.0 en UNA red, y eso
esconde que muchas regiones caen a caballo de dos (15 regiones con
confianza < 0,5 en Yeo 7, 34 en Yeo 17, 33 en Power). El mapa vértice a
vértice es el dato tal y como viene en el archivo, sin ninguna
agregación: permite ver dónde pasa de verdad la frontera entre redes.

Escribe `parcels/networks/<fuente>.fslr32k.json` para cada fuente, con
la lista de redes (slug, nombre y color reales del archivo, los MISMOS
slugs que registra register_rsn_networks.py en la base de datos) y la red
de cada vértice (-1 = sin red: pared medial, fondo o comunidad incierta
de Power).

Uso (desde la raíz del repositorio):

    python scripts/generate_network_surface_maps.py ^
        --hcp-dir "E:\\NeuroData\\derived\\extracted\\hcp_s1200_groupavg\\HCP_S1200_Atlas_Z4_pkXDZ" ^
        --out-public frontend\\public
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from backend.ingestion.neuroimaging import rsn_networks  # noqa: E402

RSN_FILE = "RSN-networks.32k_fs_LR.dlabel.nii"
# Mitades izquierda/derecha de fs_LR 32k (32492 vértices cada una): la
# misma división que usan los demás archivos de parcels/, comprobada
# contra el número total de vértices del propio archivo.
N_VERTICES_PER_HEMISPHERE = 32492

PROVENANCE = (
    "RSN-networks.32k_fs_LR.dlabel.nii del paquete 'HCP S1200 Group Average' (BALSA, "
    "https://balsa.wustl.edu/file/kN65N). Remuestreo a fs_LR hecho por el equipo del HCP, no por "
    "los autores originales, y sin documentar el procedimiento exacto. Las redes originales no se "
    "definieron con el registro MSMAll de las superficies del HCP (Yeo 2011 se calculó sobre fsaverage "
    "con el registro de FreeSurfer)."
)


def _hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def network_map_json(network_map: rsn_networks.VertexNetworkMap) -> dict:
    n_total = len(network_map.vertex_network_index)
    if n_total != 2 * N_VERTICES_PER_HEMISPHERE:
        raise ValueError(f"{network_map.source}: {n_total} vértices, se esperaban {2 * N_VERTICES_PER_HEMISPHERE}")
    return {
        "schemaVersion": 1,
        "networkSource": network_map.source,
        "surfaceMesh": "fs_LR_32k",
        "surfaceVertexCount": {"left": N_VERTICES_PER_HEMISPHERE, "right": N_VERTICES_PER_HEMISPHERE},
        "vertexOrder": "left_then_right",
        "source": RSN_FILE,
        "provenance": PROVENANCE,
        "generatedBy": "scripts/generate_network_surface_maps.py (decisión 73)",
        "networks": [
            {"slug": n.slug, "name": n.name, "color": _hex(n.rgb)} for n in network_map.networks
        ],
        "vertexNetworkIndex": network_map.vertex_network_index.astype(int).tolist(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--hcp-dir", type=Path, required=True)
    parser.add_argument("--out-public", type=Path, required=True)
    args = parser.parse_args()

    vertex_maps = rsn_networks.read_rsn_vertex_maps(args.hcp_dir / RSN_FILE)
    # Todo se construye (y se valida) antes de escribir nada.
    payloads = {source: network_map_json(m) for source, m in vertex_maps.items()}

    out_dir = args.out_public / "parcels" / "networks"
    out_dir.mkdir(parents=True, exist_ok=True)
    for source, payload in payloads.items():
        path = out_dir / f"{source}.fslr32k.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        with_network = sum(1 for i in payload["vertexNetworkIndex"] if i >= 0)
        print(
            f"{path.name}: {len(payload['networks'])} redes, {with_network} de "
            f"{len(payload['vertexNetworkIndex'])} vértices con red"
        )


if __name__ == "__main__":
    main()
