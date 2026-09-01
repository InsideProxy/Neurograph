"""Genera las mallas de fondo del cerebro 3D (petición de la usuaria, 30/08/2026:
"falta una malla que simule el cerebro... las áreas no pueden aparecer 'en el aire'").

Script de un solo uso (mismo patrón que scripts/register_*.py): se ejecuta una vez
contra los archivos reales de la biblioteca (E:\\NeuroData) y escribe el resultado
como activo estático versionado en frontend/public/meshes/ -- nunca se ejecuta en
tiempo de ejecución del backend, exactamente igual que register_*.py genera SQL
para revisión manual en vez de escribir directo a la base de datos real.

Genera DOS mallas, nunca una sola, porque los cuatro atlas de NeuroGraph usan DOS
espacios de referencia genuinamente distintos (riesgo 5 de docs/analisis-arquitectura.md,
decisiones 21-22): mezclar todos los nodos sobre una única malla sería precisamente
el error silencioso de sistemas de coordenadas que la sección 24 prohíbe.

1. `fslr32k_midthickness.glb` -- HCP-MMP1.0 y Gordon 333 (espacio
   "fsLR_32k_S1200_groupavg_midthickness_MSMAll"). Fuente: la superficie
   "midthickness" real de S1200 (Van Essen et al.) -- el MISMO archivo que
   `backend/ingestion/neuroimaging/hcp_mmp1.py::read_mmp1_coordinates` ya usa
   para calcular las coordenadas de cada región (`surf_coords[hemisferio][vértice]`),
   así que la malla y las coordenadas de los nodos están garantizadas en el mismo
   espacio sin ninguna transformación adicional. Las dos superficies GIFTI
   (izquierda + derecha) se combinan en una única malla (los índices de la derecha
   se desplazan por el número de vértices de la izquierda).

2. `mni152_fsl_2mm_brain.glb` -- Brainnetome y el subcórtex del HCP (espacio
   "MNI152_FSL_2mm"). Fuente: MNI152_T1_2mm_brain_mask_dil.nii.gz, la máscara
   cerebral REAL del pipeline oficial de HCP (Washington-University/HCPpipelines,
   global/templates/) -- verificado contra la rejilla real esperada (91x109x91,
   2mm isotrópico, affine con origen en (90,-126,-72): la firma exacta y bien
   conocida del espacio estándar de FSL) antes de usarla, precisamente porque la
   plantilla ICBM152 2009a que ya estaba en la biblioteca NO es la misma rejilla
   (verificado por separado con fuentes de FSL/Lead-DBS, decisión 22). Isosuperficie
   calculada con marching cubes (`skimage.measure.marching_cubes`, algoritmo
   estándar, sin ningún umbral arbitrario propio: el umbral es 0.5 sobre una
   máscara binaria ya publicada, no un valor inventado aquí) y las coordenadas de
   vóxel se convierten a milímetros reales aplicando el affine real del propio
   archivo NIfTI (`nib.affines.apply_affine`) -- el mismo tipo de transformación
   ya establecida, nunca una inventada para esta tarea. Se usa deliberadamente la
   máscara "dilatada" (_dil, la única máscara binaria de 2mm distribuida en ese
   repositorio) en vez de derivar un umbral de intensidad propio sobre la imagen
   T1 -- eso sí sería un umbral arbitrario, prohibido por la sección 24.

Reproducible: `pip install nibabel scikit-image pygltflib numpy` y ejecutar este
script con las rutas reales de origen como argumentos.
"""
from __future__ import annotations

import argparse
import struct
from pathlib import Path

import numpy as np


def _write_glb(path: Path, vertices: np.ndarray, faces: np.ndarray, name: str) -> None:
    """Escribe un .glb mínimo (un único mesh, una sola malla triangular, sin
    material ni textura -- el color/sombreado real lo decide Brain3D.tsx en
    tiempo de ejecución, igual que ya hace con el resto de la escena). Vértices
    en float32 (POSITION), índices en uint32 (triángulos)."""
    from pygltflib import (
        ARRAY_BUFFER,
        ELEMENT_ARRAY_BUFFER,
        FLOAT,
        UNSIGNED_INT,
        Accessor,
        Asset,
        Buffer,
        BufferView,
        GLTF2,
        Mesh,
        Node,
        Primitive,
        Scene,
    )

    vertices = vertices.astype(np.float32, copy=False)
    faces = faces.astype(np.uint32, copy=False)

    vertex_bytes = vertices.tobytes()
    index_bytes = faces.tobytes()
    # Relleno a múltiplo de 4 bytes (glTF exige que cada bufferView empiece
    # alineado) entre el bloque de vértices y el de índices.
    pad = (-len(vertex_bytes)) % 4
    binary_blob = vertex_bytes + b"\x00" * pad + index_bytes

    mins = vertices.min(axis=0).tolist()
    maxs = vertices.max(axis=0).tolist()

    gltf = GLTF2(
        asset=Asset(generator="NeuroGraph generate_brain_meshes.py"),
        scene=0,
        scenes=[Scene(nodes=[0])],
        nodes=[Node(mesh=0, name=name)],
        meshes=[Mesh(primitives=[Primitive(attributes={"POSITION": 0}, indices=1)], name=name)],
        accessors=[
            Accessor(
                bufferView=0,
                componentType=FLOAT,
                count=len(vertices),
                type="VEC3",
                min=mins,
                max=maxs,
            ),
            Accessor(
                bufferView=1,
                componentType=UNSIGNED_INT,
                count=faces.size,
                type="SCALAR",
            ),
        ],
        bufferViews=[
            BufferView(buffer=0, byteOffset=0, byteLength=len(vertex_bytes), target=ARRAY_BUFFER),
            BufferView(
                buffer=0,
                byteOffset=len(vertex_bytes) + pad,
                byteLength=len(index_bytes),
                target=ELEMENT_ARRAY_BUFFER,
            ),
        ],
        buffers=[Buffer(byteLength=len(binary_blob))],
    )
    gltf.set_binary_blob(binary_blob)
    gltf.save(str(path))


def build_fslr_mesh(surf_left: Path, surf_right: Path, out_path: Path) -> None:
    import nibabel as nib

    left = nib.load(str(surf_left))
    right = nib.load(str(surf_right))
    v_left = left.darrays[0].data
    f_left = left.darrays[1].data
    v_right = right.darrays[0].data
    f_right = right.darrays[1].data

    vertices = np.concatenate([v_left, v_right], axis=0)
    faces = np.concatenate([f_left, f_right + len(v_left)], axis=0)

    print(f"fsLR: {len(vertices)} vértices, {len(faces)} triángulos "
          f"({len(v_left)}+{len(v_right)} vértices, {len(f_left)}+{len(f_right)} caras)")
    _write_glb(out_path, vertices, faces, "fslr32k_midthickness")


def build_mni152_mesh(mask_path: Path, out_path: Path) -> None:
    import nibabel as nib
    from skimage import measure

    img = nib.load(str(mask_path))
    data = img.get_fdata()
    shape = tuple(int(s) for s in data.shape)
    if shape != (91, 109, 91):
        raise ValueError(
            f"La máscara no tiene la rejilla esperada de MNI152_FSL_2mm (91,109,91): {shape}. "
            "No se genera la malla -- comprobar el archivo de origen antes de continuar."
        )
    zooms = tuple(round(float(z), 3) for z in img.header.get_zooms())
    if zooms != (2.0, 2.0, 2.0):
        raise ValueError(f"Voxel esperado 2mm isotrópico, encontrado {zooms}. No se genera la malla.")

    # Umbral 0.5 sobre una máscara ya binaria (0/1) -- no es un umbral de
    # intensidad inventado, solo separa "dentro" de "fuera" de una máscara que
    # ya viene publicada como binaria.
    verts_voxel, faces, _normals, _values = measure.marching_cubes(data, level=0.5)

    # Vóxel -> milímetros reales del espacio MNI152_FSL_2mm, con el affine real
    # del propio archivo NIfTI (no un affine recalculado ni supuesto).
    vertices_mm = nib.affines.apply_affine(img.affine, verts_voxel)

    print(f"MNI152: {len(vertices_mm)} vértices, {len(faces)} triángulos "
          f"(marching cubes sobre máscara {shape} a {zooms}mm)")
    _write_glb(out_path, vertices_mm, faces, "mni152_fsl_2mm_brain")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--surf-left", type=Path, required=True)
    parser.add_argument("--surf-right", type=Path, required=True)
    parser.add_argument("--mni-mask", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    build_fslr_mesh(args.surf_left, args.surf_right, args.out_dir / "fslr32k_midthickness.glb")
    build_mni152_mesh(args.mni_mask, args.out_dir / "mni152_fsl_2mm_brain.glb")


if __name__ == "__main__":
    main()
