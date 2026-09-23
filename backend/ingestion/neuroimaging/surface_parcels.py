"""Mapa real vértice -> región de las parcelaciones de superficie fs_LR 32k
(HCP-MMP1.0 y Gordon 333) -- decisión 72 de docs/analisis-arquitectura.md,
23/09/2026.

Motivo: hasta ahora el cerebro 3D dibujaba cada región como una esfera en
un único punto (el vértice representativo de `hcp_mmp1.representative_point`).
Eso dice DÓNDE cae el centro de una región, pero no QUÉ TERRITORIO de la
corteza ocupa -- justo lo que hace falta para "identificar visualmente la
localización de una red" (petición de la usuaria, 23/09/2026). Los propios
`.dlabel.nii` ya asignan una etiqueta a cada vértice real de la superficie;
este módulo solo traduce esa asignación a los MISMOS identificadores de
región que ya tiene la base de datos, sin inventar ni interpolar nada.

Tres garantías, todas comprobadas (nunca supuestas):

1. Orden de vértices: el índice GLOBAL que usa este módulo es "primero los
   32 492 vértices del hemisferio izquierdo, luego los del derecho" --
   exactamente el orden de `scripts/generate_brain_meshes.py::build_fslr_mesh`
   (verificado el 23/09/2026 comparando byte a byte las posiciones del
   `.glb` ya distribuido con la concatenación de las dos superficies GIFTI
   reales: idénticas).
2. Identificadores: los `region_id` se construyen con las MISMAS funciones
   que la ingesta real (`hcp_mmp1._region_local_code`,
   `gordon333.local_code`), y el script generador comprueba que el conjunto
   resultante coincide exactamente con el de `read_mmp1_regions` /
   `read_gordon333_regions`.
3. Vértice ancla: para cada región se guarda el índice del vértice
   representativo, calculado con el mismo criterio exacto que
   `hcp_mmp1.representative_point` (el vértice real más cercano al
   centroide). El generador comprueba que su coordenada midthickness es
   idéntica a la coordenada que ya guarda la base de datos -- así, en las
   superficies infladas (misma topología, otra geometría), la esfera de una
   región se puede colocar sobre ESE MISMO vértice sin ninguna aproximación.

Vértices sin región (pared medial, que el CIFTI ni siquiera incluye como
grayordinate, o etiqueta de fondo "???") quedan con `NO_REGION` -- nunca se
les asigna la región más cercana.
"""
from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from backend.ingestion.neuroimaging import gordon333, hcp_mmp1
from backend.ontology.schema import EntityType, build_id

NO_REGION = -1

CORTEX_STRUCTURES: dict[str, str] = {
    "L": "CIFTI_STRUCTURE_CORTEX_LEFT",
    "R": "CIFTI_STRUCTURE_CORTEX_RIGHT",
}
_BACKGROUND_LABEL = "???"


@dataclass(frozen=True)
class SurfaceParcelMap:
    atlas_id: str
    reference_space: str
    n_vertices_left: int
    n_vertices_right: int
    # Índice de región -> id real de la región (mismo id que la base de datos).
    region_ids: tuple[str, ...]
    # Índice de región -> índice GLOBAL del vértice ancla (izquierda primero).
    anchor_vertices: tuple[int, ...]
    # Vértice GLOBAL -> índice de región, o NO_REGION.
    vertex_region_index: np.ndarray


def representative_vertex_index(points: np.ndarray) -> int:
    """Índice (dentro de `points`) del vértice real más cercano al
    centroide -- mismo cálculo exacto que `hcp_mmp1.representative_point`,
    que devuelve la coordenada; aquí hace falta el índice para poder
    reutilizar ese mismo vértice en otra superficie con la misma
    topología."""
    if len(points) == 0:
        raise ValueError("no hay puntos de los que calcular un representante")
    centroid = points.mean(axis=0)
    distances = np.linalg.norm(points - centroid, axis=1)
    return int(np.argmin(distances))


def build_surface_parcel_map(
    *,
    atlas_id: str,
    reference_space: str,
    label_per_grayordinate: np.ndarray,
    label_names: Mapping[int, str],
    structure_per_grayordinate: np.ndarray,
    vertex_per_grayordinate: np.ndarray,
    surf_coords: Mapping[str, np.ndarray],
    region_id_for_label: Callable[[str], str],
    hemisphere_for_label: Callable[[str], str],
) -> SurfaceParcelMap:
    """Traducción pura (sin archivos) de un mapa de etiquetas CIFTI a un
    `SurfaceParcelMap`. Lanza `ValueError` ante cualquier cosa que no
    encaje -- nunca la ignora en silencio (sección 24):

    - una etiqueta no de fondo en un grayordinate que no es corteza;
    - una región con vértices fuera del hemisferio que dice su etiqueta;
    - un vértice asignado dos veces;
    - un valor de etiqueta que no está en la tabla de etiquetas.
    """
    n_left = len(surf_coords["L"])
    n_right = len(surf_coords["R"])
    offsets = {"L": 0, "R": n_left}

    labels = np.asarray(label_per_grayordinate).astype(np.int64)
    structures = np.asarray(structure_per_grayordinate)
    vertices = np.asarray(vertex_per_grayordinate)
    is_cortex = np.isin(structures, list(CORTEX_STRUCTURES.values()))

    background_values = {idx for idx, name in label_names.items() if name == _BACKGROUND_LABEL}
    for value in np.unique(labels[~is_cortex]):
        if int(value) not in background_values:
            raise ValueError(
                f"Etiqueta {label_names.get(int(value), value)!r} asignada a grayordinates "
                "que no son corteza: este mapa no es solo de superficie, no se puede pintar"
            )

    vertex_region_index = np.full(n_left + n_right, NO_REGION, dtype=np.int32)
    region_ids: list[str] = []
    anchor_vertices: list[int] = []

    for value in sorted(int(v) for v in np.unique(labels[is_cortex])):
        if value in background_values:
            continue
        if value not in label_names:
            raise ValueError(f"Valor de etiqueta {value} ausente de la tabla de etiquetas")
        raw_label = label_names[value]
        hemisphere = hemisphere_for_label(raw_label)
        expected_structure = CORTEX_STRUCTURES[hemisphere]

        mask = labels == value
        present = set(structures[mask].tolist())
        if present != {expected_structure}:
            raise ValueError(
                f"La región {raw_label!r} (hemisferio {hemisphere}) tiene vértices fuera de "
                f"{expected_structure}: {present}"
            )

        local_vertices = vertices[mask]
        global_vertices = local_vertices + offsets[hemisphere]
        if np.any(vertex_region_index[global_vertices] != NO_REGION):
            raise ValueError(f"La región {raw_label!r} comparte vértices con otra región")

        region_index = len(region_ids)
        vertex_region_index[global_vertices] = region_index
        region_ids.append(region_id_for_label(raw_label))

        points = surf_coords[hemisphere][local_vertices]
        anchor_vertices.append(int(global_vertices[representative_vertex_index(points)]))

    if len(set(region_ids)) != len(region_ids):
        raise ValueError("Dos etiquetas distintas producen el mismo region_id")

    return SurfaceParcelMap(
        atlas_id=atlas_id,
        reference_space=reference_space,
        n_vertices_left=n_left,
        n_vertices_right=n_right,
        region_ids=tuple(region_ids),
        anchor_vertices=tuple(anchor_vertices),
        vertex_region_index=vertex_region_index,
    )


def _mmp1_region_id(raw_label: str) -> str:
    return build_id(EntityType.REGION, "human", "hcp-mmp1", hcp_mmp1._region_local_code(raw_label))


def _mmp1_hemisphere(raw_label: str) -> str:
    return hcp_mmp1._region_local_code(raw_label)[0]


def _gordon_region_id(raw_label: str) -> str:
    gordon333.parse_cortical_label(raw_label)  # ValueError ante cualquier etiqueta no cortical
    return build_id(EntityType.REGION, "human", "gordon333", gordon333.local_code(raw_label))


def _gordon_hemisphere(raw_label: str) -> str:
    return gordon333.parse_cortical_label(raw_label).hemisphere


# Atlas de superficie soportados: solo los dos que ya tienen ingesta real
# sobre fs_LR 32k. Nunca se añade uno sin su lector real (mismo criterio
# que SUPPORTED_FORMATS, decisión 44).
SURFACE_ATLASES: dict[str, tuple[str, Callable[[str], str], Callable[[str], str]]] = {
    "hcp_mmp1": (hcp_mmp1.ATLAS_ID, _mmp1_region_id, _mmp1_hemisphere),
    "gordon333": (gordon333.ATLAS_ID, _gordon_region_id, _gordon_hemisphere),
}


def load_surfaces(surf_left_path: Path, surf_right_path: Path) -> dict[str, np.ndarray]:
    import nibabel as nib

    return {
        "L": nib.load(str(surf_left_path)).darrays[0].data,
        "R": nib.load(str(surf_right_path)).darrays[0].data,
    }


def read_surface_parcel_map(
    atlas_key: str, dlabel_path: Path, surf_left_path: Path, surf_right_path: Path
) -> SurfaceParcelMap:
    """Lee el `.dlabel.nii` real y las dos superficies midthickness reales
    (las mismas que usa la ingesta para las coordenadas) y construye el
    mapa vértice -> región."""
    import nibabel as nib

    if atlas_key not in SURFACE_ATLASES:
        raise ValueError(
            f"Atlas de superficie no soportado: {atlas_key!r} (soportados: {sorted(SURFACE_ATLASES)})"
        )
    atlas_id, region_id_for_label, hemisphere_for_label = SURFACE_ATLASES[atlas_key]

    img = nib.load(str(dlabel_path))
    label_axis = img.header.get_axis(0)
    brain_model = img.header.get_axis(1)
    return build_surface_parcel_map(
        atlas_id=atlas_id,
        reference_space=hcp_mmp1.REFERENCE_SPACE,
        label_per_grayordinate=img.get_fdata()[0],
        label_names={idx: name for idx, (name, _rgba) in label_axis.label[0].items()},
        structure_per_grayordinate=np.asarray(brain_model.name),
        vertex_per_grayordinate=np.asarray(brain_model.vertex),
        surf_coords=load_surfaces(surf_left_path, surf_right_path),
        region_id_for_label=region_id_for_label,
        hemisphere_for_label=hemisphere_for_label,
    )


def sulc_hull_correlation(surface_vertices: np.ndarray, sulc: np.ndarray) -> float:
    """Correlación entre la profundidad de surco de cada vértice y su
    distancia al casco convexo de la superficie (0 en la corona de los
    giros, grande en el fondo de los surcos). Sirve para comprobar el
    SIGNO del mapa de surcos con los propios datos en vez de suponerlo:
    los convenios difieren entre programas (FreeSurfer: positivo = surco;
    el archivo S1200 del HCP resultó ser el contrario, decisión 72). Una
    correlación negativa significa "mayor valor = giro"."""
    from scipy.spatial import ConvexHull

    points = np.asarray(surface_vertices, dtype=np.float64)
    hull = ConvexHull(points)
    # Cada fila de `equations` es (a, b, c, d) con a·x + b·y + c·z + d <= 0
    # dentro del casco; -(...) es la distancia a ese plano.
    distance_to_hull = np.min(-(points @ hull.equations[:, :3].T + hull.equations[:, 3]), axis=1)
    valid = np.isfinite(sulc)
    return float(np.corrcoef(sulc[valid], distance_to_hull[valid])[0, 1])


def read_surface_scalar(dscalar_path: Path, n_vertices_left: int, n_vertices_right: int) -> np.ndarray:
    """Un mapa escalar real por vértice (p. ej. profundidad de surco del
    promedio de grupo S1200) en el mismo orden global izquierda-luego-
    derecha. Los vértices que el CIFTI no incluye (pared medial) quedan
    en NaN -- nunca rellenados con un valor inventado."""
    import nibabel as nib

    img = nib.load(str(dscalar_path))
    values = img.get_fdata()[0]
    brain_model = img.header.get_axis(1)
    structures = np.asarray(brain_model.name)
    vertices = np.asarray(brain_model.vertex)

    out = np.full(n_vertices_left + n_vertices_right, np.nan, dtype=np.float64)
    for hemisphere, offset in (("L", 0), ("R", n_vertices_left)):
        mask = structures == CORTEX_STRUCTURES[hemisphere]
        out[vertices[mask] + offset] = values[mask]
    return out
