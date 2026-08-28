"""Conectividad estructural derivada de los mapas de probabilidad de
conectividad de Brainnetome (`BNA_SC_4D.nii.gz`: 246 volúmenes, uno por
región semilla, cada uno la probabilidad de que la tractografía
probabilística llegue a cada vóxel del cerebro desde esa semilla).

Esos mapas NO son una matriz región-región: hay que decidir un método de
agregación. El adoptado (decidido con la usuaria el 28/08/2026, ver
docs/analisis-arquitectura.md): para cada par de regiones (i, j), tomar
el valor medio del mapa de probabilidad de i dentro de la máscara de j, y
promediarlo con el valor medio del mapa de j dentro de la máscara de i
(la relación no es simétrica en los datos crudos, por cómo funciona la
tractografía probabilística sembrada). No se aplica ningún umbral al
guardar los datos: se guarda la matriz completa con su peso real, y es la
interfaz (el filtro de peso mínimo ya existente) la que decide qué se ve
— nunca se descarta nada al cargar los datos.

Verificado empíricamente (no asumido) que el índice k del volumen 4D
corresponde a la etiqueta k+1 del atlas: el mapa k tiene una media
~1.0 dentro de su propia máscara (probabilidad trivial de una semilla
respecto a sí misma) y mucho menor en máscaras ajenas al azar.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from backend.ingestion.neuroimaging.brainnetome import read_region_definitions
from backend.ontology.schema import EntityType, build_id

METHOD = (
    "media_simetrizada_de_mapas_de_probabilidad_de_tractografia_"
    "brainnetome_bna_sc_sin_umbral"
)


@dataclass(frozen=True)
class StructuralConnection:
    id: str
    source_id: str
    target_id: str
    weight: float
    # Los dos valores crudos (i->j y j->i) antes de simetrizar, para quien
    # quiera auditar el cálculo sin repetirlo.
    raw_forward: float
    raw_backward: float


def region_voxel_indices(atlas_data: np.ndarray) -> dict[int, np.ndarray]:
    """Índices de vóxel (no en mm) de cada etiqueta 1..246 presente en el
    volumen, para indexar rápido los mapas de probabilidad."""
    labels = sorted(int(v) for v in np.unique(atlas_data) if v != 0)
    return {label: np.argwhere(atlas_data == label) for label in labels}


def structural_connections(
    atlas_nii_path: Path, sc_4d_nii_path: Path, xlsx_path: Path
) -> list[StructuralConnection]:
    import nibabel as nib

    atlas_img = nib.load(str(atlas_nii_path))
    atlas_data = np.asarray(atlas_img.dataobj)
    sc_img = nib.load(str(sc_4d_nii_path))
    sc_data = np.asarray(sc_img.dataobj)

    if sc_data.shape[:3] != atlas_data.shape:
        raise ValueError(
            "El volumen de conectividad y el de etiquetas no comparten "
            f"rejilla: {sc_data.shape[:3]} vs {atlas_data.shape}"
        )

    voxels = region_voxel_indices(atlas_data)
    labels = sorted(voxels.keys())
    if labels != list(range(1, 247)):
        raise ValueError(f"Se esperaban las etiquetas 1..246, se encontraron {labels}")

    local_code_by_label = {
        d.label_id: d.local_code for d in read_region_definitions(xlsx_path)
    }

    def region_id(label: int) -> str:
        return build_id(EntityType.REGION, "human", "brainnetome", local_code_by_label[label])

    # value_forward[i][j] = media del mapa de probabilidad de i dentro de
    # la máscara de j (i, j en 1..246, i != j).
    connections: list[StructuralConnection] = []
    for i in range(1, 247):
        map_i = sc_data[..., i - 1]
        for j in range(i + 1, 247):
            map_j = sc_data[..., j - 1]
            v_i = voxels[i]
            v_j = voxels[j]
            forward = float(map_i[v_j[:, 0], v_j[:, 1], v_j[:, 2]].mean())  # i -> j
            backward = float(map_j[v_i[:, 0], v_i[:, 1], v_i[:, 2]].mean())  # j -> i
            weight = (forward + backward) / 2.0

            conn_id = build_id(
                EntityType.CONNECTION, "human", "brainnetome",
                f"{local_code_by_label[i]}__{local_code_by_label[j]}",
            )
            connections.append(
                StructuralConnection(
                    id=conn_id,
                    source_id=region_id(i),
                    target_id=region_id(j),
                    weight=weight,
                    raw_forward=forward,
                    raw_backward=backward,
                )
            )
    return connections
