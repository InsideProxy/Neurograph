"""Genera la malla de fondo de ORG-800FC-100HCP para Tractography3D.tsx
(decisión 63, 08/09/2026 -- petición de la usuaria: "falta construir una
malla o descargar un cerebro para ponerlo en la parte de tractografía,
así puede identificarse cada tracto en su posición absoluta y relativa
en el encéfalo"). Mismo patrón de script de un solo uso que
generate_brain_meshes.py (decisión 22): se ejecuta una vez contra un
archivo real de la biblioteca y escribe el resultado como activo
estático versionado en frontend/public/meshes/ -- nunca en tiempo de
ejecución del backend.

Fuente real (nunca una plantilla ajena a este atlas -- ver "Espacio de
referencia" en backend/ingestion/tractography/org_atlas.py, y la
decisión 49 sobre no mezclar espacios de referencia sin verificar):
`100HCP-population-mean-wmparc.nii.gz`, distribuido por los propios
autores del atlas (O'Donnell Research Group / SlicerDMRI) -- pero en un
registro de Zenodo DISTINTO al de `ORG-800FC-100HCP.zip`
(10.5281/zenodo.8082481, no 10.5281/zenodo.2648292: error real
cometido y corregido el 09/09/2026, ver decisión 63 de
docs/analisis-arquitectura.md -- verificado dos veces contra el texto
literal de github.com/SlicerDMRI/ORG-Atlases/blob/master/README.md,
que enlaza el T1/T2/b0 al primer registro y el wmparc al segundo). "For
anatomical reference, we provide the atlas population mean T1/T2/b0
images" -- calculadas transformando los T1/T2/b0/wmparc de los 100
sujetos HCP del propio atlas AL espacio del propio atlas, el mismo
proceso de registro groupwise que generó las streamlines. Se usa
`wmparc` (parcelación real, no intensidad T1) para evitar exactamente
el mismo tipo de umbral arbitrario que ya se evitó en
generate_brain_meshes.py con la máscara MNI152 "_dil": la superficie se
calcula sobre `etiqueta > 0` (dentro/fuera de una segmentación real ya
publicada), nunca sobre un percentil de intensidad inventado aquí
(sección 24).

Verificación real antes de aceptar el resultado (nunca solo confiar en
la documentación del atlas): compara la caja delimitadora en milímetros
de la malla generada contra la caja delimitadora empírica de las
coordenadas de streamlines YA CARGADAS (leídas directamente del SQL
generado por generate_org_tractography_geometry.py -- nunca de la base
de datos en vivo). Si no hay solape real entre ambas cajas, o si una
cubre un rango muchísimo mayor que la otra (orden de magnitud
distinto), el script se detiene con un error explícito en vez de
escribir una malla que podría estar en un espacio distinto sin que
nadie se diera cuenta.

Uso:
    python scripts/generate_org_atlas_mesh.py \\
        --wmparc E:\\NeuroData\\original\\tractography\\100HCP-population-mean-wmparc.nii.gz \\
        --tract-sql E:\\NeuroData\\derived\\tractograms\\org_800fc_2018.sql \\
        --out frontend/public/meshes/org_800fc_100hcp_wmparc_brain.glb

Reproducible: `pip install nibabel scikit-image pygltflib numpy trimesh
fast_simplification` -- igual que generate_brain_meshes.py, estas
librerías no están en las dependencias del backend (pyproject.toml)
porque solo hacen falta para este script de un solo uso. `trimesh`/
`fast_simplification` son nuevas en esta decisión (63), solo para el
paso de simplificación de ingeniería (ver DEFAULT_TARGET_FACES).
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _mesh_io import write_glb  # noqa: E402

# Mismo valor real que backend/ingestion/tractography/org_atlas.REFERENCE_SPACE
# -- duplicado aquí a propósito (este script no importa el backend, para
# no arrastrar sus dependencias de base de datos a una tarea que no la
# usa), nunca debe divergir del valor real allí.
REFERENCE_SPACE = "ORG_800FC_100HCP_groupwise"

# Tope de INGENIERÍA, nunca científico (mismo criterio que
# DEFAULT_MAX_STREAMLINES_PER_TRACT en org_atlas.py o
# MAX_RENDERED_CONNECTIONS en el frontend): el wmparc real es de 0.7mm
# isotrópico (260x311x260), mucho más fino que la rejilla de 2mm que ya
# usaba generate_brain_meshes.py para MNI152 -- marching cubes sobre él
# da ~685000 triángulos, 8-10x más pesado que las dos mallas de fondo ya
# existentes (fslr32k: 2.3MB, mni152: 1.2MB) sin aportar ningún detalle
# anatómico que de verdad se aproveche en una malla de fondo translúcida.
# Se reduce con `trimesh.simplify_quadric_decimation` (algoritmo estándar
# de simplificación por error cuadrático, no un recorte a ciegas) DESPUÉS
# de la verificación real de caja delimitadora -- la verificación compara
# siempre la geometría real sin reducir, nunca la ya simplificada.
DEFAULT_TARGET_FACES = 80_000

_FLOAT = r"-?\d+\.?\d*(?:[eE][+-]?\d+)?"
_POINT_RE = re.compile(rf"\[\s*({_FLOAT})\s*,\s*({_FLOAT})\s*,\s*({_FLOAT})\s*\]")


def empirical_streamline_bbox(sql_path: Path) -> tuple[np.ndarray, np.ndarray, int]:
    """Caja delimitadora real (mm) de TODOS los puntos [x, y, z] de
    streamlines ya presentes en el SQL real generado por
    generate_org_tractography_geometry.py -- nunca una consulta a la
    base de datos en vivo (regla de la usuaria). El propio formato del
    archivo (INSERT INTO tract_geometries ... streamlines jsonb) hace
    que el único patrón real `[num, num, num]` en todo el archivo sean
    los puntos 3D: los otros INSERT (tracts) no tienen ternas numéricas
    entre corchetes."""
    text = sql_path.read_text(encoding="utf-8")
    mins = np.array([np.inf, np.inf, np.inf])
    maxs = np.array([-np.inf, -np.inf, -np.inf])
    count = 0
    for m in _POINT_RE.finditer(text):
        pt = np.array([float(m.group(1)), float(m.group(2)), float(m.group(3))])
        mins = np.minimum(mins, pt)
        maxs = np.maximum(maxs, pt)
        count += 1
    if count == 0:
        raise ValueError(
            f"{sql_path}: no se encontró ningún punto [x, y, z] real -- "
            "¿es de verdad el SQL generado por generate_org_tractography_geometry.py?"
        )
    return mins, maxs, count


def build_org_atlas_mesh(
    wmparc_path: Path,
    tract_sql_path: Path,
    out_path: Path,
    target_faces: int = DEFAULT_TARGET_FACES,
) -> None:
    import nibabel as nib
    import trimesh
    from skimage import measure

    img = nib.load(str(wmparc_path))
    data = np.asarray(img.dataobj)
    labels, label_counts = np.unique(data, return_counts=True)
    print(f"wmparc: forma {data.shape}, affine=\n{img.affine}")
    print(f"wmparc: {len(labels)} etiquetas reales distintas, fondo (0) = "
          f"{label_counts[labels == 0][0] if 0 in labels else 0} vóxeles de {data.size}")

    mask = data > 0
    voxels_on = int(mask.sum())
    if voxels_on == 0:
        raise ValueError("La máscara (etiqueta > 0) está vacía -- archivo equivocado o corrupto.")
    if voxels_on == data.size:
        raise ValueError(
            "La máscara (etiqueta > 0) cubre TODO el volumen -- no hay fondo real, "
            "revisar si este es de verdad un wmparc (parcelación) y no otra cosa."
        )
    print(f"wmparc: {voxels_on} vóxeles reales dentro de la máscara "
          f"({100 * voxels_on / data.size:.1f}% del volumen)")

    # Umbral 0.5 sobre una máscara ya binaria (etiqueta > 0, segmentación
    # real ya publicada) -- no es un umbral de intensidad inventado aquí,
    # mismo criterio ya usado en generate_brain_meshes.py para MNI152.
    verts_voxel, faces, _normals, _values = measure.marching_cubes(
        mask.astype(np.float32), level=0.5
    )
    vertices_mm = nib.affines.apply_affine(img.affine, verts_voxel)

    mesh_min = vertices_mm.min(axis=0)
    mesh_max = vertices_mm.max(axis=0)
    print(f"Malla real: {len(vertices_mm)} vértices, {len(faces)} triángulos")
    print(f"Malla real: caja delimitadora (mm) = {mesh_min.tolist()} .. {mesh_max.tolist()}")

    # Verificación real contra las streamlines YA CARGADAS -- nunca solo
    # confiar en que la documentación del atlas dice "misma anatomía de
    # referencia". Ver docstring del módulo.
    sl_min, sl_max, sl_count = empirical_streamline_bbox(tract_sql_path)
    print(f"Streamlines reales ({sl_count} puntos, {tract_sql_path.name}): "
          f"caja delimitadora (mm) = {sl_min.tolist()} .. {sl_max.tolist()}")

    overlap_min = np.maximum(mesh_min, sl_min)
    overlap_max = np.minimum(mesh_max, sl_max)
    has_overlap = bool(np.all(overlap_max > overlap_min))
    mesh_span = mesh_max - mesh_min
    sl_span = sl_max - sl_min
    span_ratio = mesh_span / np.where(sl_span == 0, np.nan, sl_span)
    print(f"Solape real entre ambas cajas: {has_overlap}")
    print(f"Razón de escala malla/streamlines por eje: {span_ratio.tolist()}")

    if not has_overlap:
        raise ValueError(
            "La caja delimitadora de la malla NO solapa con la de las streamlines "
            "ya cargadas -- no se escribe la malla. Esto significaría que, pese a "
            "lo que documenta el atlas, este wmparc NO está en el mismo espacio "
            "real que las streamlines ya verificadas: hace falta investigar antes "
            "de seguir, nunca asumir que 'debería' coincidir."
        )
    if np.any(span_ratio > 3) or np.any(span_ratio < 1 / 3):
        raise ValueError(
            f"La malla y las streamlines difieren en más de 3x de escala en algún eje "
            f"(razones {span_ratio.tolist()}) -- demasiado grande para ser solo redondeo "
            "o recorte de campo de visión; no se escribe la malla sin investigar más."
        )

    # Reducción de INGENIERÍA (nunca científica: ver DEFAULT_TARGET_FACES,
    # más arriba) -- SIEMPRE después de la verificación real de caja
    # delimitadora, que ya se hizo contra la geometría completa sin
    # reducir. Se deja constancia real del recuento antes/después, mismo
    # principio que streamline_count_real/_shown.
    real_vertex_count, real_face_count = len(vertices_mm), len(faces)
    if real_face_count > target_faces:
        mesh = trimesh.Trimesh(vertices=vertices_mm, faces=faces, process=False)
        mesh = mesh.simplify_quadric_decimation(face_count=target_faces)
        vertices_mm, faces = np.asarray(mesh.vertices), np.asarray(mesh.faces)
        print(f"Simplificada (ingeniería, trimesh.simplify_quadric_decimation): "
              f"{real_vertex_count} -> {len(vertices_mm)} vértices, "
              f"{real_face_count} -> {len(faces)} triángulos")
        simplified_min, simplified_max = vertices_mm.min(axis=0), vertices_mm.max(axis=0)
        print(f"Caja delimitadora tras simplificar (mm) = "
              f"{simplified_min.tolist()} .. {simplified_max.tolist()} "
              "(comparar a mano contra la caja real de arriba: debe ser casi idéntica)")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    write_glb(out_path, vertices_mm, faces, "org_800fc_100hcp_wmparc_brain")
    print(f"Escrito: {out_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wmparc", type=Path, required=True)
    parser.add_argument("--tract-sql", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--target-faces", type=int, default=DEFAULT_TARGET_FACES)
    args = parser.parse_args()
    build_org_atlas_mesh(args.wmparc, args.tract_sql, args.out, args.target_faces)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
