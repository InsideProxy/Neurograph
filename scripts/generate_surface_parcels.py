"""Genera los activos estáticos para pintar las regiones reales sobre la
corteza en el cerebro 3D (decisión 72 de docs/analisis-arquitectura.md,
23/09/2026). Script de un solo uso, mismo patrón que
scripts/generate_brain_meshes.py: se ejecuta una vez contra los archivos
reales de la biblioteca y escribe el resultado en frontend/public/ --
nunca en tiempo de ejecución del backend.

Escribe:

- `meshes/fslr32k_inflated.glb` y `meshes/fslr32k_very_inflated.glb`:
  superficies infladas del promedio de grupo S1200 (misma topología que la
  midthickness ya distribuida -- se comprueba cara a cara antes de
  escribir nada). Son solo otra FORMA de ver la misma superficie: los
  surcos se abren y se ve lo que queda oculto en la midthickness. Las
  coordenadas científicas de las regiones siguen siendo siempre las de la
  midthickness (las de la base de datos); en las vistas infladas, la
  esfera de cada región se coloca sobre su mismo vértice ancla.
- `parcels/hcp_mmp1_0.fslr32k.json` y `parcels/gordon333.fslr32k.json`:
  región real de cada vértice (ver backend/ingestion/neuroimaging/
  surface_parcels.py).
- `parcels/fslr32k_sulc.json`: profundidad de surco real del promedio de
  grupo S1200, por vértice, solo para sombrear (gris claro en giros,
  oscuro en surcos). Signo comprobado empíricamente el 23/09/2026, no
  supuesto: en este archivo del HCP, un valor MAYOR corresponde a la
  corona de los giros (correlación -0,75 entre el valor y la distancia de
  cada vértice al casco convexo del hemisferio, midthickness izquierda) --
  el signo contrario al convenio de FreeSurfer.

Verificaciones que abortan el script (nunca escribe nada a medias):
mismo conjunto de region_id que la ingesta real, y coordenada del vértice
ancla idéntica a la coordenada que ya guarda la base de datos, para las
360 regiones de HCP-MMP1.0 y las 333 de Gordon 333.

Uso (desde la raíz del repositorio):

    python scripts/generate_surface_parcels.py ^
        --hcp-dir "E:\\NeuroData\\derived\\extracted\\hcp_s1200_groupavg\\HCP_S1200_Atlas_Z4_pkXDZ" ^
        --out-public frontend\\public
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from generate_brain_meshes import build_fslr_mesh  # noqa: E402

from backend.ingestion.neuroimaging import gordon333, hcp_mmp1, surface_parcels  # noqa: E402

MMP1_DLABEL = "Q1-Q6_RelatedValidation210.CorticalAreas_dil_Final_Final_Areas_Group_Colors.32k_fs_LR.dlabel.nii"
GORDON_DLABEL = "Gordon333.32k_fs_LR.dlabel.nii"
SULC_DSCALAR = "S1200.sulc_MSMAll.32k_fs_LR.dscalar.nii"
SURFACE = "S1200.{hemi}.{kind}.32k_fs_LR.surf.gii"

INFLATED_KINDS = {
    "inflated_MSMAll": "fslr32k_inflated",
    "very_inflated_MSMAll": "fslr32k_very_inflated",
}


def _check_same_topology(hcp_dir: Path, kind: str) -> None:
    import nibabel as nib

    for hemi in ("L", "R"):
        mid = nib.load(str(hcp_dir / SURFACE.format(hemi=hemi, kind="midthickness_MSMAll")))
        other = nib.load(str(hcp_dir / SURFACE.format(hemi=hemi, kind=kind)))
        if other.darrays[0].data.shape != mid.darrays[0].data.shape:
            raise ValueError(f"{kind} {hemi}: número de vértices distinto de la midthickness")
        if not np.array_equal(other.darrays[1].data, mid.darrays[1].data):
            raise ValueError(f"{kind} {hemi}: triángulos distintos de la midthickness -- no es la misma topología")


def _verify_against_ingestion(
    parcel_map: surface_parcels.SurfaceParcelMap,
    expected_region_ids: set[str],
    expected_coords: dict[str, tuple[float, float, float]],
    all_vertices: np.ndarray,
) -> None:
    if set(parcel_map.region_ids) != expected_region_ids:
        missing = expected_region_ids - set(parcel_map.region_ids)
        extra = set(parcel_map.region_ids) - expected_region_ids
        raise ValueError(f"{parcel_map.atlas_id}: region_id distintos de la ingesta (faltan {missing}, sobran {extra})")
    for region_id, anchor in zip(parcel_map.region_ids, parcel_map.anchor_vertices, strict=True):
        coord = tuple(float(x) for x in all_vertices[anchor])
        if coord != expected_coords[region_id]:
            raise ValueError(
                f"{region_id}: el vértice ancla {anchor} {coord} no coincide con la coordenada "
                f"de la ingesta {expected_coords[region_id]}"
            )


def _parcel_json(parcel_map: surface_parcels.SurfaceParcelMap, source_file: str) -> dict:
    return {
        "schemaVersion": 1,
        "atlasId": parcel_map.atlas_id,
        "referenceSpace": parcel_map.reference_space,
        "surfaceVertexCount": {"left": parcel_map.n_vertices_left, "right": parcel_map.n_vertices_right},
        "vertexOrder": "left_then_right",
        "source": source_file,
        "generatedBy": "scripts/generate_surface_parcels.py (decisión 72)",
        "regionIds": list(parcel_map.region_ids),
        "anchorVertices": list(parcel_map.anchor_vertices),
        "vertexRegionIndex": parcel_map.vertex_region_index.astype(int).tolist(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--hcp-dir", type=Path, required=True)
    parser.add_argument("--out-public", type=Path, required=True)
    args = parser.parse_args()

    hcp_dir: Path = args.hcp_dir
    surf_left = hcp_dir / SURFACE.format(hemi="L", kind="midthickness_MSMAll")
    surf_right = hcp_dir / SURFACE.format(hemi="R", kind="midthickness_MSMAll")
    surfaces = surface_parcels.load_surfaces(surf_left, surf_right)
    all_vertices = np.concatenate([surfaces["L"], surfaces["R"]])
    n_left, n_right = len(surfaces["L"]), len(surfaces["R"])

    # 1. Todas las comprobaciones primero; nada se escribe si alguna falla.
    for kind in INFLATED_KINDS:
        _check_same_topology(hcp_dir, kind)

    mmp_path = hcp_dir / MMP1_DLABEL
    mmp_map = surface_parcels.read_surface_parcel_map("hcp_mmp1", mmp_path, surf_left, surf_right)
    _verify_against_ingestion(
        mmp_map,
        {r.id for r in hcp_mmp1.read_mmp1_regions(mmp_path)},
        {c.entity_id: (c.x, c.y, c.z) for c in hcp_mmp1.read_mmp1_coordinates(mmp_path, surf_left, surf_right)},
        all_vertices,
    )

    gordon_path = hcp_dir / GORDON_DLABEL
    gordon_map = surface_parcels.read_surface_parcel_map("gordon333", gordon_path, surf_left, surf_right)
    _verify_against_ingestion(
        gordon_map,
        {r.id for r in gordon333.read_gordon333_regions(gordon_path)},
        {c.entity_id: (c.x, c.y, c.z) for c in gordon333.read_gordon333_coordinates(gordon_path, surf_left, surf_right)},
        all_vertices,
    )

    sulc = surface_parcels.read_surface_scalar(hcp_dir / SULC_DSCALAR, n_left, n_right)
    for hemi, block in (("L", slice(0, n_left)), ("R", slice(n_left, n_left + n_right))):
        corr = surface_parcels.sulc_hull_correlation(surfaces[hemi], sulc[block])
        print(f"Signo del surco ({hemi}): correlación con la distancia al casco convexo = {corr:.3f}")
        if corr >= 0:
            raise ValueError(
                f"Signo del mapa de surcos inesperado en {hemi} (correlación {corr:.3f} >= 0): "
                "el frontend asume 'mayor = giro' -- no se escribe nada"
            )

    # 2. Escritura.
    meshes_dir = args.out_public / "meshes"
    parcels_dir = args.out_public / "parcels"
    meshes_dir.mkdir(parents=True, exist_ok=True)
    parcels_dir.mkdir(parents=True, exist_ok=True)

    for kind, name in INFLATED_KINDS.items():
        build_fslr_mesh(
            hcp_dir / SURFACE.format(hemi="L", kind=kind),
            hcp_dir / SURFACE.format(hemi="R", kind=kind),
            meshes_dir / f"{name}.glb",
            name=name,
        )

    for parcel_map, source, filename in (
        (mmp_map, MMP1_DLABEL, "hcp_mmp1_0.fslr32k.json"),
        (gordon_map, GORDON_DLABEL, "gordon333.fslr32k.json"),
    ):
        (parcels_dir / filename).write_text(json.dumps(_parcel_json(parcel_map, source)), encoding="utf-8")
        labelled = int((parcel_map.vertex_region_index >= 0).sum())
        print(
            f"{filename}: {len(parcel_map.region_ids)} regiones, {labelled} de {n_left + n_right} "
            "vértices con región (el resto: pared medial o sin etiqueta en el atlas)"
        )

    sulc_json = {
        "schemaVersion": 1,
        "referenceSpace": hcp_mmp1.REFERENCE_SPACE,
        "surfaceVertexCount": {"left": n_left, "right": n_right},
        "vertexOrder": "left_then_right",
        "source": SULC_DSCALAR,
        "signConvention": "mayor = corona de giro (convenio HCP, comprobado empíricamente, decisión 72)",
        "values": [None if not np.isfinite(v) else round(float(v), 3) for v in sulc],
    }
    (parcels_dir / "fslr32k_sulc.json").write_text(json.dumps(sulc_json), encoding="utf-8")
    print(f"fslr32k_sulc.json: {int(np.isfinite(sulc).sum())} vértices con valor real")


if __name__ == "__main__":
    main()
