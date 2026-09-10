"""Catálogo cerrado de formatos de dataset con lector real ya integrado
(decisión 17, ampliada en las decisiones 44 y 45): el campo `format` de
`DatasetManifest` deja de ser texto libre descriptivo para pasar a ser
una etiqueta CONTROLADA que despacha directamente al lector real de
`backend/ingestion/neuroimaging/` correspondiente -- nunca el programa
"adivinando" un formato por el contenido o el nombre de un archivo
(eso es justo lo que la decisión 17 descartó explícitamente).

Este catálogo cubre hoy los cuatro adaptadores que ya existían antes de
esta decisión (HCP-MMP1.0, Gordon 333, Brainnetome, la segmentación
subcortical del HCP) -- los mismos cuatro que decisión 17 llama "los
cuatro adaptadores actuales". Un formato genuinamente nuevo sigue
necesitando el mismo trabajo de traducción de siempre (examinar el
archivo real, escribir el módulo lector, verificarlo con `pytest`) antes
de poder añadirse aquí como una entrada más de `SUPPORTED_FORMATS` --
nunca aceptado por el simple hecho de que alguien escriba su nombre en
un `dataset.yaml`.

Para un dataset real cuyo formato todavía no tiene lector (la inmensa
mayoría de los que ya están cargados en el proyecto: Yeh 2022, Rosen &
Halgren 2021, Wang 2017, Cheng 2021... ninguno pasó nunca por este
`dataset.yaml`, se cargaron con su propio `scripts/register_*.py` y una
fila `Dataset` en la base de datos), `format` no puede ser un valor
inventado -- pero tampoco tiene sentido bloquear por completo la
catalogación de un dataset real solo porque su lector automático no
existe todavía. Para ese caso existe `UNSUPPORTED_FORMAT_LABEL`: un
único valor centinela, explícito y sin ambigüedad, que dice honestamente
"este dataset existe, está descrito en `description`, pero este catálogo
todavía no sabe despacharlo a ningún lector real" -- nunca un lector que
finge funcionar.
"""
from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from backend.ingestion.neuroimaging import brainnetome, gordon333, hcp_mmp1
from backend.ingestion.neuroimaging import hcp_subcortical_structures as hcp_subcortex

UNSUPPORTED_FORMAT_LABEL = "unsupported_pending_adapter"


@dataclass(frozen=True)
class FormatReadResult:
    """Bolsa normalizada de lo que devuelve un adaptador. Los tipos reales
    de cada elemento (p. ej. `MmpRegion` frente a `GordonRegion`) siguen
    siendo los ya definidos en cada módulo de `neuroimaging/` -- este
    envoltorio solo homogeneiza CUÁNTAS listas hay y con qué nombre, para
    que quien despacha no necesite conocer el detalle de cada atlas.
    `networks`/`memberships` quedan vacíos para los formatos que no los
    producen (nunca `None`: una lista vacía real, no la ausencia de dato).
    """

    regions: list[Any]
    coordinates: list[Any]
    networks: list[Any] = field(default_factory=list)
    memberships: list[Any] = field(default_factory=list)


@dataclass(frozen=True)
class AtlasMetadata:
    """Identidad de especie/atlas fija de cada formato -- decisión 45,
    para que el generador de SQL (`sql_generation.py`) no tenga que
    volver a escribir ni adivinar estos valores: son exactamente las
    mismas constantes `SPECIES_ID`/`ATLAS_ID`/... que cada módulo de
    `neuroimaging/` ya declaraba desde que se cargó ese atlas por primera
    vez (decisiones 2-10), reexportadas aquí, nunca reescritas a mano.
    `atlas_version` es `None` para los tres formatos cuyo módulo nunca
    declaró una versión propia (solo HCP-MMP1.0 la tiene) -- la columna
    `atlases.version` ya es nullable para exactamente este caso.
    """

    species_id: str
    species_name: str
    species_scientific_name: str
    atlas_id: str
    atlas_name: str
    atlas_version: str | None = None


@dataclass(frozen=True)
class FormatAdapter:
    label: str
    description: str
    # Nombres de "rol" de cada archivo real que el adaptador necesita
    # (p. ej. "dlabel", "surf_left") -- nunca un nombre de archivo fijo
    # adivinado: quien llama a `read_dataset` es quien decide, para el
    # dataset concreto que tiene delante, qué archivo real cumple cada
    # rol (mismo criterio de no adivinar que ya rige el resto del
    # proyecto -- una biblioteca real puede nombrar sus archivos de forma
    # distinta a la del paquete de descarga original).
    required_files: tuple[str, ...]
    read: Callable[[Mapping[str, Path]], FormatReadResult]
    atlas_metadata: AtlasMetadata


def _read_hcp_mmp1(paths: Mapping[str, Path]) -> FormatReadResult:
    dlabel = paths["dlabel"]
    regions = hcp_mmp1.read_mmp1_regions(dlabel)
    coordinates = hcp_mmp1.read_mmp1_coordinates(dlabel, paths["surf_left"], paths["surf_right"])
    return FormatReadResult(regions=regions, coordinates=coordinates)


def _read_gordon333(paths: Mapping[str, Path]) -> FormatReadResult:
    dlabel = paths["dlabel"]
    regions = gordon333.read_gordon333_regions(dlabel)
    coordinates = gordon333.read_gordon333_coordinates(dlabel, paths["surf_left"], paths["surf_right"])
    networks = gordon333.read_gordon333_networks(dlabel)
    memberships = gordon333.region_network_memberships(dlabel)
    return FormatReadResult(regions=regions, coordinates=coordinates, networks=networks, memberships=memberships)


def _read_brainnetome(paths: Mapping[str, Path]) -> FormatReadResult:
    xlsx = paths["regions_xlsx"]
    regions = brainnetome.read_brainnetome_regions(xlsx)
    coordinates = brainnetome.read_brainnetome_coordinates(paths["atlas_nii"], xlsx)
    return FormatReadResult(regions=regions, coordinates=coordinates)


def _read_hcp_subcortex(paths: Mapping[str, Path]) -> FormatReadResult:
    regions = hcp_subcortex.read_hcp_subcortical_regions()
    coordinates = hcp_subcortex.read_hcp_subcortical_coordinates(paths["any_grayordinate_cifti"])
    return FormatReadResult(regions=regions, coordinates=coordinates)


SUPPORTED_FORMATS: dict[str, FormatAdapter] = {
    adapter.label: adapter
    for adapter in (
        FormatAdapter(
            label="hcp_mmp1_cifti_dlabel",
            description=(
                "HCP-MMP1.0 (Glasser et al. 2016, Nature) -- mapa de etiquetas "
                "CIFTI (.dlabel.nii, 360 áreas) más las dos superficies GIFTI "
                "fs_LR 32k midthickness (S1200 group average) de las que se "
                "calcula la coordenada representativa de cada región."
            ),
            required_files=("dlabel", "surf_left", "surf_right"),
            read=_read_hcp_mmp1,
            atlas_metadata=AtlasMetadata(
                species_id=hcp_mmp1.SPECIES_ID,
                species_name=hcp_mmp1.SPECIES_NAME,
                species_scientific_name=hcp_mmp1.SPECIES_SCIENTIFIC_NAME,
                atlas_id=hcp_mmp1.ATLAS_ID,
                atlas_name=hcp_mmp1.ATLAS_NAME,
                atlas_version=hcp_mmp1.ATLAS_VERSION,
            ),
        ),
        FormatAdapter(
            label="gordon333_cifti_dlabel",
            description=(
                "Gordon 333 (Gordon et al. 2016, Cerebral Cortex) -- mismo tipo "
                "de archivo que HCP-MMP1.0 (CIFTI .dlabel.nii + dos superficies "
                "GIFTI fs_LR 32k), pero con las 333 parcelas y las 12 redes "
                "propias de este atlas -- nunca las 19 etiquetas subcorticales "
                "sin datos reales que el mismo archivo también declara."
            ),
            required_files=("dlabel", "surf_left", "surf_right"),
            read=_read_gordon333,
            atlas_metadata=AtlasMetadata(
                species_id=gordon333.SPECIES_ID,
                species_name=gordon333.SPECIES_NAME,
                species_scientific_name=gordon333.SPECIES_SCIENTIFIC_NAME,
                atlas_id=gordon333.ATLAS_ID,
                atlas_name=gordon333.ATLAS_NAME,
            ),
        ),
        FormatAdapter(
            label="brainnetome_nifti_xlsx",
            description=(
                "Brainnetome Atlas (Fan et al. 2016, Cerebral Cortex) -- "
                "volumen NIfTI de etiquetas en espacio MNI152 (rejilla FSL "
                "2mm) más la tabla `BNA_subregions.xlsx` con el nombre "
                "anatómico y el id de etiqueta izquierdo/derecho de cada una "
                "de las 246 regiones."
            ),
            required_files=("atlas_nii", "regions_xlsx"),
            read=_read_brainnetome,
            atlas_metadata=AtlasMetadata(
                species_id=brainnetome.SPECIES_ID,
                species_name=brainnetome.SPECIES_NAME,
                species_scientific_name=brainnetome.SPECIES_SCIENTIFIC_NAME,
                atlas_id=brainnetome.ATLAS_ID,
                atlas_name=brainnetome.ATLAS_NAME,
            ),
        ),
        FormatAdapter(
            label="hcp_subcortex_grayordinates",
            description=(
                "Segmentación subcortical estándar del espacio de "
                "grayordinates del HCP (Glasser et al. 2013, NeuroImage) -- "
                "no es un archivo descargado aparte: las 19 estructuras están "
                "definidas en el propio eje espacial de CUALQUIER archivo "
                ".dlabel.nii/.dscalar.nii del paquete S1200, así que basta con "
                "uno solo (p. ej. el mismo dlabel ya usado para HCP-MMP1.0 o "
                "Gordon 333)."
            ),
            required_files=("any_grayordinate_cifti",),
            read=_read_hcp_subcortex,
            atlas_metadata=AtlasMetadata(
                species_id=hcp_subcortex.SPECIES_ID,
                species_name=hcp_subcortex.SPECIES_NAME,
                species_scientific_name=hcp_subcortex.SPECIES_SCIENTIFIC_NAME,
                atlas_id=hcp_subcortex.ATLAS_ID,
                atlas_name=hcp_subcortex.ATLAS_NAME,
            ),
        ),
    )
}


def get_format_adapter(label: str) -> FormatAdapter:
    """Devuelve el adaptador real de `label`. Nunca adivina ni acepta un
    valor parecido: un formato que no está literalmente en el catálogo
    lanza `ValueError` listando los que sí lo están, para que el error
    sea accionable (añadir el adaptador que falta, o corregir una errata)
    en vez de fallar en silencio más adelante contra un archivo real."""
    adapter = SUPPORTED_FORMATS.get(label)
    if adapter is None:
        known = ", ".join(sorted(SUPPORTED_FORMATS))
        raise ValueError(
            f"Formato de dataset no soportado: {label!r}. "
            f"Formatos con lector real ya integrado: {known}. "
            f"Para un dataset real sin lector todavía, usa "
            f"format={UNSUPPORTED_FORMAT_LABEL!r} y describe el formato real "
            f"en el campo `description` del manifiesto."
        )
    return adapter


def read_dataset(format_label: str, paths: Mapping[str, Path]) -> FormatReadResult:
    """Despacha al lector real del formato indicado. `paths` es un mapa
    rol -> ruta real (los roles de cada formato están en
    `FormatAdapter.required_files`) -- quien llama es quien decide qué
    archivo real de SU biblioteca cumple cada rol, nunca este módulo
    adivinándolo por nombre."""
    adapter = get_format_adapter(format_label)
    missing = [role for role in adapter.required_files if role not in paths]
    if missing:
        raise ValueError(
            f"Formato {format_label!r} necesita los archivos {adapter.required_files}; "
            f"faltan en `paths`: {missing}"
        )
    return adapter.read(paths)
