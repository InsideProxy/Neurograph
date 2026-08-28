"""Lectura de mapas de etiquetas CIFTI (`.dlabel.nii`): el formato en el
que vienen la mayoría de parcelaciones corticales modernas (HCP-MMP1.0,
Gordon333, Brodmann...). No sabe nada de la ontología de NeuroGraph: solo
extrae la tabla de etiquetas tal cual está en el archivo.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import nibabel as nib


@dataclass(frozen=True)
class CiftiLabel:
    index: int
    name: str
    rgba: tuple[float, float, float, float]


def read_cifti_labels(path: Path, map_index: int = 0) -> list[CiftiLabel]:
    """Lee la tabla de etiquetas del mapa `map_index` de un archivo
    `.dlabel.nii`. No filtra nada: incluye también la etiqueta de fondo
    (típicamente índice 0, `"???"`), que quien llama decide si excluir.
    """
    img = nib.load(str(path))
    label_axis = img.header.get_axis(0)
    labels = label_axis.label[map_index]
    return [
        CiftiLabel(index=idx, name=name, rgba=tuple(rgba))
        for idx, (name, rgba) in labels.items()
    ]
