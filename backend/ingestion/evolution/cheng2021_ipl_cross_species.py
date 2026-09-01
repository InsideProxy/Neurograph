"""Parcelación cruzada del lóbulo parietal inferior (IPL) en humano,
chimpancé y macaco (Cheng L, Zhang Y, Li G, Wang J, Sherwood C, Gong G,
Fan L, Jiang T, 2021, *eLife*, "Connectional asymmetry of the inferior
parietal lobule shapes hemispheric specialization in humans, chimpanzees,
and rhesus macaques", DOI 10.7554/eLife.67600): segunda parte de la Fase 7
(Evolución) y primera entidad `Homology` real del proyecto.

Metodología real verificada contra el propio artículo (31/08/2026, texto
completo de Métodos leído, no solo el resumen) antes de escribir ninguna
fila `Homology`: los autores parcelan el IPL de cada especie por separado
mediante clustering espectral sobre su propia matriz de conectividad
(soluciones de 2 a 12 clusters exploradas; se liberan aquí las de 2, 3 y 4
subregiones por hemisferio), y establecen la correspondencia ENTRE
especies "identificando el número óptimo de subregiones que mostrara una
organización topológica coherente en todas las especies, equilibrado con
el número mínimo de subregiones identificable por sus definiciones
citoarquitectónicas" (Métodos) -- es decir, un criterio de consistencia
topológica rostro-caudal más precedente de la literatura citoarquitectónica,
NO una medida cuantitativa. El propio artículo lo reconoce explícitamente:
"with only three species in the sample, our dataset does not allow us to
use phylogenetic comparative statistical methods". Por eso cada `Homology`
generada aquí lleva `status="candidate_homology"` y `confidence=None`
(decisión de la usuaria, 31/08/2026, tras presentarle este hallazgo) --
nunca "confirmed_homology" ni un número de confianza inventado.

La correspondencia entre subregiones de especies distintas SÍ es
verificable en los propios datos, no solo en el texto: las tres tablas de
etiquetas GIFTI (humano/chimpancé/macaco) usan exactamente el mismo
nombre y el mismo color por índice de etiqueta, en las tres especies, en
las tres granularidades -- la codificación visual que los propios autores
usan en sus figuras para mostrar qué subregión de una especie corresponde
a cuál de otra. Comprobado con `nibabel` (`labeltable.get_labels_as_dict`
+ el RGBA de cada `GiftiLabel`): tabla de 6 nombres/colores fija e
IDÉNTICA en los 3×2×3 = 18 archivos `.label.gii`, aunque cada archivo solo
puebla 2, 3 o 4 de esas 6 etiquetas según su granularidad -- el "6" del
nombre ("IPL_6_1"..."IPL_6_6") es solo el tamaño de esa leyenda fija de
color, NO un recuento de clusters por archivo (comprobado: el archivo de
granularidad 2 solo puebla los índices 1 y 2, nunca los 6). Por eso este
módulo NO usa `IPL_6_<n>` como abreviatura (induciría a error): construye
`IPL_<granularidad>_<n>` en su lugar.

Tres espacios de referencia DISTINTOS, nunca mezclados: cada especie tiene
su propia malla `.surf.gii` (verificado con `nibabel`: 32492 vértices y
misma topología `Conte69.L.32k_fs_LR.topo.gii` en las tres -- una
convención de remuestreo de formato, NO un registro anatómico compartido;
el propio Métodos del artículo lo confirma: "cada especie se registra a su
propia plantilla estándar", sin espacio común entre especies). Las
coordenadas reales (bounding box comprobado con `nibabel`) son
completamente distintas en magnitud entre especies -- humano ~65-102mm,
chimpancé ~43-68mm, macaco ~29-46mm -- confirmando que NO son la misma
geometría física pese a compartir número de vértices. Nota aparte, para no
confundir con la primera parte de esta fase: el macaco YA tiene un atlas
cargado (`macaque_cortex_wang2017`, espacio volumétrico INIA19) -- este es
un atlas de macaco DISTINTO, de superficie, en el espacio
`MacaqueYerkes19_v1.2_32k_fsLR_midthickness`; ambos son legítimos y
coexisten (misma `Species`, `Atlas`/`Coordinate` distintos), nunca se
mezclan sus coordenadas.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from backend.ingestion.neuroimaging.hcp_mmp1 import representative_point
from backend.ontology.schema import EntityType, build_id

_HEMISPHERE_NAMES = {"L": "izquierdo", "R": "derecho"}
_GRANULARITIES = (2, 3, 4)
_HEMISPHERES = ("L", "R")

# (slug, id, name, scientific_name, nombre_común, archivo_de_superficie,
# espacio_de_referencia). El id de macaco coincide, a propósito, con el ya
# usado en `macaque_cortex_wang2017.py` (misma especie real, NCBI taxid
# 9544) -- reutilizado vía ON CONFLICT DO UPDATE, nunca duplicado.
SPECIES = {
    "human": {
        "id": build_id(EntityType.SPECIES, "human", "ncbi-taxonomy", "9606"),
        "name": "Ser humano",
        "scientific_name": "Homo sapiens",
        "common_name": "ser humano",
        "surf_filename": "S1200.{hemi}.midthickness_MSMAll.32k_fs_LR.surf.gii",
        # Mismo archivo (nombre y convención HCP S1200 group average
        # MSMAll) que ya usa `hcp_mmp1.read_mmp1_coordinates` -- mismo
        # REFERENCE_SPACE que ese módulo, no uno nuevo.
        "reference_space": "fsLR_32k_S1200_groupavg_midthickness_MSMAll",
    },
    "chimp": {
        "id": build_id(EntityType.SPECIES, "chimp", "ncbi-taxonomy", "9598"),
        "name": "Chimpancé",
        "scientific_name": "Pan troglodytes",
        "common_name": "chimpancé",
        "surf_filename": "ChimpYerkes29_v1.2.{hemi}.midthickness.32k_fs_LR.surf.gii",
        "reference_space": "ChimpYerkes29_v1.2_32k_fsLR_midthickness",
    },
    "macaque": {
        "id": build_id(EntityType.SPECIES, "macaque", "ncbi-taxonomy", "9544"),
        "name": "Macaco rhesus",
        "scientific_name": "Macaca mulatta",
        "common_name": "macaco rhesus",
        "surf_filename": "MacaqueYerkes19_v1.2.{hemi}.midthickness.32k_fs_LR.surf.gii",
        "reference_space": "MacaqueYerkes19_v1.2_32k_fsLR_midthickness",
    },
}

_SPECIES_DIR = {"human": "human", "chimp": "chimp", "macaque": "macaque"}
_LABEL_FILENAME = "{species_dir}.IPL.{hemi}.{gran}.32k.label.gii"


@dataclass(frozen=True)
class IplRegion:
    id: str
    name: str
    abbreviation: str
    species_slug: str
    species_id: str
    hemisphere: str
    granularity: int
    label: int


@dataclass(frozen=True)
class IplCoordinate:
    id: str
    entity_id: str
    x: float
    y: float
    z: float
    reference_space: str


@dataclass(frozen=True)
class IplHomology:
    id: str
    source_id: str
    target_id: str
    status: str
    method: str


def regions_for_species(species_slug: str) -> list[IplRegion]:
    """Las regiones de una especie: una por (hemisferio, granularidad,
    etiqueta), sin leer ningún archivo -- la lista de etiquetas pobladas
    por granularidad es siempre 1..granularidad (comprobado contra los 18
    archivos `.label.gii` reales el 31/08/2026, nunca falta ninguna)."""
    info = SPECIES[species_slug]
    regions: list[IplRegion] = []
    for hemi in _HEMISPHERES:
        for gran in _GRANULARITIES:
            for label in range(1, gran + 1):
                local_code = f"{hemi}_g{gran}_{label}"
                abbreviation = f"IPL_{gran}_{label}"
                name = (
                    f"Lóbulo parietal inferior, subregión {label}/{gran} -- "
                    f"{info['common_name']} (hemisferio {_HEMISPHERE_NAMES[hemi]})"
                )
                regions.append(
                    IplRegion(
                        id=build_id(EntityType.REGION, species_slug, "cheng2021", local_code),
                        name=name,
                        abbreviation=abbreviation,
                        species_slug=species_slug,
                        species_id=info["id"],
                        hemisphere=hemi,
                        granularity=gran,
                        label=label,
                    )
                )
    return regions


def read_ipl_coordinates(species_slug: str, root: Path) -> list[IplCoordinate]:
    """Coordenada real de cada región: el vértice real más cercano al
    centroide de los vértices que llevan esa etiqueta, sobre la malla
    "midthickness" propia de la especie (nunca una de otra especie, pese
    a compartir número de vértices -- ver docstring del módulo)."""
    import nibabel as nib

    info = SPECIES[species_slug]
    species_dir = root / _SPECIES_DIR[species_slug]
    reference_space = info["reference_space"]

    surf_by_hemi = {}
    for hemi in _HEMISPHERES:
        surf_path = species_dir / info["surf_filename"].format(hemi=hemi)
        surf_by_hemi[hemi] = nib.load(str(surf_path)).darrays[0].data

    coordinates: list[IplCoordinate] = []
    for hemi in _HEMISPHERES:
        vertex_coords = surf_by_hemi[hemi]
        for gran in _GRANULARITIES:
            label_path = species_dir / _LABEL_FILENAME.format(
                species_dir=_SPECIES_DIR[species_slug], hemi=hemi, gran=gran
            )
            label_img = nib.load(str(label_path))
            label_data = label_img.darrays[0].data
            for label in range(1, gran + 1):
                vertex_mask = label_data == label
                if not vertex_mask.any():
                    raise ValueError(
                        f"{species_slug}/{hemi}/g{gran}: la etiqueta {label} no tiene "
                        "ningún vértice en el archivo real"
                    )
                points = vertex_coords[vertex_mask]
                x, y, z = representative_point(points)
                local_code = f"{hemi}_g{gran}_{label}"
                region_id = build_id(EntityType.REGION, species_slug, "cheng2021", local_code)
                coordinates.append(
                    IplCoordinate(
                        id=build_id(EntityType.COORDINATE, species_slug, "cheng2021", local_code),
                        entity_id=region_id,
                        x=float(x), y=float(y), z=float(z),
                        reference_space=reference_space,
                    )
                )
    return coordinates


_METHOD_DESCRIPTION = (
    "correspondencia de subregion asignada por los propios autores "
    "(mismo indice de etiqueta y color en las tres especies, dentro de la "
    "misma granularidad), basada en consistencia topologica rostro-caudal "
    "mas precedente citoarquitectonico de la literatura (Cheng et al. "
    "2021, Metodos) -- no es una medida cuantitativa de similitud entre "
    "especies: los propios autores declaran que con solo 3 especies no "
    "pueden aplicar estadistica comparativa filogenetica."
)


def build_homologies(regions_by_species: dict[str, list[IplRegion]]) -> list[IplHomology]:
    """Una `Homology` por cada par de especies, dentro de la misma
    granularidad, hemisferio y etiqueta -- nunca comparando etiquetas de
    granularidades distintas entre sí (serían particiones distintas del
    mismo clustering espectral, no la misma subregión)."""
    index: dict[tuple[str, int, int], dict[str, IplRegion]] = {}
    for species_slug, regions in regions_by_species.items():
        for region in regions:
            key = (region.hemisphere, region.granularity, region.label)
            index.setdefault(key, {})[species_slug] = region

    homologies: list[IplHomology] = []
    species_slugs = sorted(regions_by_species)  # ['chimp', 'human', 'macaque']
    for key, by_species in sorted(index.items()):
        hemi, gran, label = key
        present = [s for s in species_slugs if s in by_species]
        for i, species_a in enumerate(present):
            for species_b in present[i + 1:]:
                region_a, region_b = by_species[species_a], by_species[species_b]
                local_code = f"{hemi}_g{gran}_{label}"
                homology_id = build_id(
                    EntityType.HOMOLOGY, f"{species_a}_{species_b}", "cheng2021", local_code
                )
                homologies.append(
                    IplHomology(
                        id=homology_id,
                        source_id=region_a.id,
                        target_id=region_b.id,
                        status="candidate_homology",
                        method=_METHOD_DESCRIPTION,
                    )
                )
    return homologies
