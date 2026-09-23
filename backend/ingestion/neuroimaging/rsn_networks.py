"""Redes de reposo de Yeo et al. (2011) -- 7 y 17 redes -- y comunidades
de Power et al. (2011), sobre la superficie fs_LR 32k (decisión 73 de
docs/analisis-arquitectura.md, 23/09/2026).

Fuente: `RSN-networks.32k_fs_LR.dlabel.nii`, dentro del paquete S1200
Group Average del HCP que la usuaria ya tenía en su biblioteca (catalogado
en BALSA, "Human Cortical Parcellations", https://balsa.wustl.edu/file/kN65N).
El remuestreo a fs_LR lo hizo el equipo del HCP, NO los autores originales
(Yeo et al. publican fsaverage5 y MNI152; Power et al., coordenadas y
volumen) -- el método de ese remuestreo no está documentado en BALSA. Se
usa sabiéndolo y dejándolo escrito, igual que cualquier otra procedencia
de segunda mano del proyecto.

Hallazgos reales al leer el archivo (23/09/2026), todos comprobados:

1. Es CIFTI-1 (2013), no CIFTI-2: nibabel se niega a abrirlo. Este módulo
   lee a mano la cabecera NIfTI-2 y el XML CIFTI-1. El mapa de "brain
   models" no trae `VertexIndices`: los 32 492 vértices de cada
   hemisferio, en orden, sin excluir la pared medial.
2. Orden de los datos en disco: la dimensión de MAPAS varía más rápido
   (matriz vértices x mapas). Se comprobó empíricamente: leída así, cada
   uno de los cuatro mapas contiene SOLO etiquetas de su propia familia
   (7 redes, 17 redes, Power); leída al revés, los cuatro mapas salían
   mezclados -- prueba directa de cuál es el orden correcto.
3. Una sola tabla de etiquetas de 63 entradas compartida por los cuatro
   mapas. Yeo: etiquetas `7Networks_k` / `17Networks_k`, más
   `FreeSurfer_Defined_Medial_Wall`. Power: `aN_Nombre` (comunidad con
   nombre, color saturado) y `uN_Nombre` (colores grises); nueve
   nombres de Power aparecen repetidos con dos claves distintas e
   idéntico color (p. ej. 4 y 28, `a4_"Hand"_somatosensory-motor`), que
   se tratan como la misma comunidad (mismo nombre real).
4. Nombres de las redes de Yeo: el archivo solo trae números. Los
   nombres salen de la tabla de colores oficial del propio laboratorio de
   los autores (repositorio CBIG, Yeo_JNeurophysiol11_SplitLabels, p. ej.
   `7Networks_LH_Vis 120 18 134`). La correspondencia número -> nombre se
   verificó por identidad de color: cada red del archivo coincide con
   exactamente una red base de CBIG con diferencia <= 1 por canal
   (redondeo de 0-1 a 0-255), y la segunda más cercana está siempre a
   >= 46 -- sin ninguna ambigüedad. Ver YEO7_NAMES / YEO17_NAMES.
5. Power: se usa el mapa "RSN consensus communities" SIN rellenar
   huecos. El mapa "holes filled" asigna comunidades dentro de la pared
   medial (4 478 vértices de fondo frente a ~5 600 de pared medial), y
   Timothy Coalson (HCP) señaló en la lista hcp-users que ese es
   precisamente el mapa de este archivo con un problema de construcción.
   Las etiquetas `u` (grises en el archivo, igual que el gris que Power
   et al. 2011 usan para nodos "uncertain") y `u1_Unassigned` no se
   tratan como redes: nunca se asigna una región a una comunidad incierta.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from backend.ontology.schema import EntityType, build_id

N_VERTICES_PER_HEMISPHERE = 32492

# Índices de mapa dentro del archivo (verificados por su <MapName>).
MAP_YEO7 = 0
MAP_YEO17 = 1
MAP_POWER_HOLES_FILLED = 2
MAP_POWER = 3

EXPECTED_MAP_NAMES = {
    MAP_YEO7: "7 RSN Networks (YKS11 - Yeo et al., JNP, 2011)",
    MAP_YEO17: "17 RSN Networks (YKS11 - Yeo et al., JNP, 2011)",
    MAP_POWER_HOLES_FILLED: "RSN consensus communities (holes filled) - PCN11 (Power_Neuron11)",
    MAP_POWER: "RSN consensus communities - PCN11 (Power_Neuron11)",
}

# Nombres de CBIG (laboratorio de Yeo), ver punto 4 del docstring. Clave =
# número de red del archivo del HCP.
YEO7_NAMES: dict[int, str] = {
    1: "Vis",
    2: "SomMot",
    3: "DorsAttn",
    4: "SalVentAttn",
    5: "Limbic",
    6: "Cont",
    7: "Default",
}
YEO17_NAMES: dict[int, str] = {
    1: "VisCent",
    2: "VisPeri",
    3: "SomMotA",
    4: "SomMotB",
    5: "DorsAttnA",
    6: "DorsAttnB",
    7: "SalVentAttnA",
    8: "SalVentAttnB",
    9: "LimbicA",
    10: "LimbicB",
    11: "ContC",
    12: "ContA",
    13: "ContB",
    14: "TempPar",
    15: "DefaultC",
    16: "DefaultA",
    17: "DefaultB",
}

# Colores base oficiales de CBIG (RGB 0-255) de cada red, para la
# comprobación de la correspondencia número -> nombre (punto 4).
CBIG_YEO7_COLORS: dict[str, tuple[int, int, int]] = {
    "Vis": (120, 18, 134),
    "SomMot": (70, 130, 180),
    "DorsAttn": (0, 118, 14),
    "SalVentAttn": (196, 58, 250),
    "Limbic": (220, 248, 164),
    "Cont": (230, 148, 34),
    "Default": (205, 62, 78),
}
CBIG_YEO17_COLORS: dict[str, tuple[int, int, int]] = {
    "VisCent": (120, 18, 134),
    "VisPeri": (255, 0, 0),
    "SomMotA": (70, 130, 180),
    "SomMotB": (42, 204, 164),
    "DorsAttnA": (74, 155, 60),
    "DorsAttnB": (0, 118, 14),
    "SalVentAttnA": (196, 58, 250),
    "SalVentAttnB": (255, 152, 213),
    "LimbicA": (220, 248, 164),
    "LimbicB": (122, 135, 50),
    "ContA": (230, 148, 34),
    "ContB": (135, 50, 74),
    "ContC": (119, 140, 176),
    "DefaultA": (255, 255, 0),
    "DefaultB": (205, 62, 78),
    "DefaultC": (0, 0, 130),
    "TempPar": (12, 48, 255),
}

# Fuente (primer tramo del slug `<fuente>.<red>`, ver riesgo 13).
SOURCE_YEO7 = "yeo2011-7"
SOURCE_YEO17 = "yeo2011-17"
SOURCE_POWER = "power2011"

_MEDIAL_WALL_LABEL = "FreeSurfer_Defined_Medial_Wall"
_BACKGROUND_LABEL = "???"


@dataclass(frozen=True)
class LabelEntry:
    key: int
    name: str
    rgb: tuple[int, int, int]


@dataclass(frozen=True)
class Cifti1LabelMap:
    name: str
    labels: dict[int, LabelEntry]
    values: np.ndarray  # una clave de etiqueta por vértice global (izquierda primero)


@dataclass(frozen=True)
class RsnNetwork:
    id: str
    slug: str  # "<fuente>.<código>", la misma clave que usa el frontend
    name: str
    rgb: tuple[int, int, int]


@dataclass(frozen=True)
class VertexNetworkMap:
    source: str
    networks: tuple[RsnNetwork, ...]
    # Vértice global -> índice en `networks`, o -1 (pared medial / fondo /
    # comunidad incierta).
    vertex_network_index: np.ndarray


@dataclass(frozen=True)
class RsnMembership:
    id: str
    region_id: str
    network_id: str
    confidence: float
    method: str
    n_region_vertices: int
    n_majority_vertices: int


def read_cifti1_dense_labels(path: Path) -> list[Cifti1LabelMap]:
    """Lee un `.dlabel.nii` CIFTI-1 de superficie completa (sin
    VertexIndices). Lanza ValueError ante cualquier forma que no sea
    exactamente la verificada para el archivo RSN del HCP."""
    import nibabel as nib

    raw = Path(path).read_bytes()
    with open(path, "rb") as fh:
        header = nib.Nifti2Header.from_fileobj(fh, check=False)
    start = raw.find(b"<CIFTI")
    end = raw.find(b"</CIFTI>")
    if start < 0 or end < 0:
        raise ValueError(f"{path}: no contiene XML CIFTI")
    root = ET.fromstring(raw[start : end + len(b"</CIFTI>")].decode("utf-8"))
    if root.attrib.get("Version") != "1":
        raise ValueError(f"{path}: se esperaba CIFTI versión 1, no {root.attrib.get('Version')!r}")

    models = list(root.iter("BrainModel"))
    structures = [(m.attrib["BrainStructure"], int(m.attrib["IndexOffset"]), int(m.attrib["IndexCount"])) for m in models]
    expected = [
        ("CIFTI_STRUCTURE_CORTEX_LEFT", 0, N_VERTICES_PER_HEMISPHERE),
        ("CIFTI_STRUCTURE_CORTEX_RIGHT", N_VERTICES_PER_HEMISPHERE, N_VERTICES_PER_HEMISPHERE),
    ]
    if structures != expected or any(m.find("VertexIndices") is not None for m in models):
        raise ValueError(f"{path}: modelos de cerebro inesperados {structures}")

    named_maps = list(root.iter("NamedMap"))
    n_vertices = 2 * N_VERTICES_PER_HEMISPHERE
    n_maps = len(named_maps)
    dims = [int(d) for d in header["dim"][: header["dim"][0] + 1]]
    if dims[5] != n_vertices or dims[6] != n_maps:
        raise ValueError(f"{path}: dimensiones {dims} no casan con {n_vertices} vértices x {n_maps} mapas")

    # Punto 2 del docstring: la dimensión de mapas varía más rápido.
    flat = np.frombuffer(
        raw, dtype=header.get_data_dtype(), count=n_vertices * n_maps, offset=int(header["vox_offset"])
    )
    matrix = flat.reshape((n_vertices, n_maps))

    maps: list[Cifti1LabelMap] = []
    for i, named_map in enumerate(named_maps):
        labels: dict[int, LabelEntry] = {}
        for label in named_map.iter("Label"):
            key = int(label.attrib["Key"])
            rgb = tuple(int(round(float(label.attrib[c]) * 255)) for c in ("Red", "Green", "Blue"))
            labels[key] = LabelEntry(key=key, name=(label.text or "").strip(), rgb=rgb)  # type: ignore[arg-type]
        values = matrix[:, i]
        if not np.all(values == np.round(values)):
            raise ValueError(f"{path}: el mapa {i} tiene valores no enteros")
        values = values.astype(np.int64)
        unknown = set(np.unique(values).tolist()) - set(labels)
        if unknown:
            raise ValueError(f"{path}: el mapa {i} usa claves ausentes de su tabla: {sorted(unknown)}")
        maps.append(Cifti1LabelMap(name=(named_map.find("MapName").text or "").strip(), labels=labels, values=values))
    return maps


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    if not slug:
        raise ValueError(f"no se puede construir un código a partir de {text!r}")
    return slug


def _check_map_name(label_map: Cifti1LabelMap, index: int) -> None:
    if label_map.name != EXPECTED_MAP_NAMES[index]:
        raise ValueError(f"mapa {index}: nombre {label_map.name!r}, se esperaba {EXPECTED_MAP_NAMES[index]!r}")


def yeo_vertex_network_map(label_map: Cifti1LabelMap, n_networks: int) -> VertexNetworkMap:
    """Mapa vértice -> red de Yeo (7 o 17). Comprueba la correspondencia
    número -> nombre por color frente a la tabla oficial de CBIG."""
    names = YEO7_NAMES if n_networks == 7 else YEO17_NAMES
    cbig = CBIG_YEO7_COLORS if n_networks == 7 else CBIG_YEO17_COLORS
    source = SOURCE_YEO7 if n_networks == 7 else SOURCE_YEO17
    pattern = re.compile(rf"^{n_networks}Networks_(\d+)$")

    key_to_number: dict[int, int] = {}
    rgb_by_number: dict[int, tuple[int, int, int]] = {}
    for key in sorted(set(label_map.values.tolist())):
        entry = label_map.labels[key]
        if entry.name in (_MEDIAL_WALL_LABEL, _BACKGROUND_LABEL):
            continue
        match = pattern.match(entry.name)
        if not match:
            raise ValueError(f"etiqueta inesperada en el mapa de {n_networks} redes: {entry.name!r}")
        number = int(match.group(1))
        name = names[number]
        distance = max(abs(a - b) for a, b in zip(entry.rgb, cbig[name], strict=True))
        if distance > 1:
            raise ValueError(
                f"{entry.name}: color {entry.rgb} no coincide con el de CBIG para {name} {cbig[name]}"
            )
        if number in rgb_by_number and rgb_by_number[number] != entry.rgb:
            raise ValueError(f"la red {number} aparece con dos colores distintos")
        rgb_by_number[number] = entry.rgb
        key_to_number[key] = number
    if sorted(rgb_by_number) != list(range(1, n_networks + 1)):
        raise ValueError(f"se esperaban las redes 1..{n_networks} de Yeo, hay {sorted(rgb_by_number)}")

    # Orden de las redes = numeración original de Yeo et al. (1..N).
    networks: list[RsnNetwork] = []
    for number in range(1, n_networks + 1):
        slug_code = _slugify(names[number])
        networks.append(
            RsnNetwork(
                id=build_id(EntityType.NETWORK, "human", source, slug_code),
                slug=f"{source}.{slug_code}",
                name=f"{names[number]} (Yeo 2011, {n_networks} redes)",
                rgb=rgb_by_number[number],
            )
        )
    key_to_index = {key: number - 1 for key, number in key_to_number.items()}
    return VertexNetworkMap(source=source, networks=tuple(networks), vertex_network_index=_index_vertices(label_map, key_to_index))


_POWER_LABEL = re.compile(r'^([au])(\d+)_(.+)$')


def power_vertex_network_map(label_map: Cifti1LabelMap) -> VertexNetworkMap:
    """Mapa vértice -> comunidad de Power (solo las `a`, ver punto 5)."""
    networks: list[RsnNetwork] = []
    name_to_index: dict[str, int] = {}
    key_to_index: dict[int, int] = {}
    for key in sorted(set(label_map.values.tolist())):
        entry = label_map.labels[key]
        if entry.name == _BACKGROUND_LABEL:
            continue
        match = _POWER_LABEL.match(entry.name)
        if not match:
            raise ValueError(f"etiqueta de Power inesperada: {entry.name!r}")
        kind, _number, raw_name = match.groups()
        if kind == "u":
            continue  # comunidad incierta o sin asignar: nunca una red
        name = raw_name.replace('"', "").replace("_", " ").strip()
        if name not in name_to_index:
            name_to_index[name] = len(networks)
            slug_code = _slugify(name)
            networks.append(
                RsnNetwork(
                    id=build_id(EntityType.NETWORK, "human", SOURCE_POWER, slug_code),
                    slug=f"{SOURCE_POWER}.{slug_code}",
                    name=f"{name} (Power 2011)",
                    rgb=entry.rgb,
                )
            )
        elif networks[name_to_index[name]].rgb != entry.rgb:
            raise ValueError(f"'{name}' aparece con dos colores distintos: no se fusiona sin comprobar")
        key_to_index[key] = name_to_index[name]
    return VertexNetworkMap(source=SOURCE_POWER, networks=tuple(networks), vertex_network_index=_index_vertices(label_map, key_to_index))


def _index_vertices(label_map: Cifti1LabelMap, key_to_index: dict[int, int]) -> np.ndarray:
    lookup = np.full(int(label_map.values.max()) + 1, -1, dtype=np.int32)
    for key, index in key_to_index.items():
        lookup[key] = index
    return lookup[label_map.values]


def read_rsn_vertex_maps(path: Path) -> dict[str, VertexNetworkMap]:
    """Los tres mapas usados (Yeo 7, Yeo 17, Power sin rellenar)."""
    maps = read_cifti1_dense_labels(path)
    if len(maps) != 4:
        raise ValueError(f"{path}: se esperaban 4 mapas, hay {len(maps)}")
    for index in EXPECTED_MAP_NAMES:
        _check_map_name(maps[index], index)
    return {
        SOURCE_YEO7: yeo_vertex_network_map(maps[MAP_YEO7], 7),
        SOURCE_YEO17: yeo_vertex_network_map(maps[MAP_YEO17], 17),
        SOURCE_POWER: power_vertex_network_map(maps[MAP_POWER]),
    }


def majority_vote_memberships(
    network_map: VertexNetworkMap,
    region_ids: tuple[str, ...],
    vertex_region_index: np.ndarray,
    method: str,
) -> list[RsnMembership]:
    """Pertenencia de cada región a la red que ocupa la mayoría de sus
    vértices con red asignada -- mismo criterio exacto que Cole-Anticevic
    (decisión 3, `region_network_assignments`): los vértices sin red no
    votan, y una región sin ningún vértice con red se queda sin
    pertenencia (nunca se fuerza una). Empate: la red con menor índice,
    determinista (Counter.most_common conserva el orden de inserción, y
    se inserta en orden de índice de red)."""
    if len(vertex_region_index) != len(network_map.vertex_network_index):
        raise ValueError("mapa de regiones y mapa de redes con distinto número de vértices")
    memberships: list[RsnMembership] = []
    for region_index, region_id in enumerate(region_ids):
        vertices = np.flatnonzero(vertex_region_index == region_index)
        votes = network_map.vertex_network_index[vertices]
        votes = votes[votes >= 0]
        if len(votes) == 0:
            continue
        counts = Counter(sorted(votes.tolist()))
        winner, n_majority = counts.most_common(1)[0]
        network = network_map.networks[winner]
        local_code = region_id.rsplit(".", 1)[1]
        memberships.append(
            RsnMembership(
                id=build_id(EntityType.MEMBERSHIP, "human", network_map.source, local_code),
                region_id=region_id,
                network_id=network.id,
                confidence=n_majority / len(votes),
                method=method,
                n_region_vertices=len(vertices),
                n_majority_vertices=n_majority,
            )
        )
    return memberships
