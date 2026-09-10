"""Escritura de mallas .glb mínimas -- extraído de generate_brain_meshes.py
el 08/09/2026 (decisión 63) al añadir generate_org_atlas_mesh.py, que
necesita exactamente la misma función: nunca una segunda copia que
pudiera desincronizarse (p. ej. si un día se corrige un bug de
alineación de buffer, se corregiría en un solo sitio). Sin cambios de
comportamiento respecto al original -- solo de ubicación.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np


def write_glb(path: Path, vertices: np.ndarray, faces: np.ndarray, name: str) -> None:
    """Escribe un .glb mínimo (un único mesh, una sola malla triangular, sin
    material ni textura -- el color/sombreado real lo decide el componente
    de React que la carga en tiempo de ejecución, igual que ya hace con el
    resto de la escena). Vértices en float32 (POSITION), índices en
    uint32 (triángulos)."""
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
        asset=Asset(generator="NeuroGraph mesh generator"),
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
