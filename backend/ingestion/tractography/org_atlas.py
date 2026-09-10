"""Tractos reales del atlas ORG-800FC-100HCP (Zhang et al., 2018,
*NeuroImage*, "An anatomically curated fiber clustering white matter
atlas for consistent white matter tract parcellation across the
lifespan", DOI 10.1016/j.neuroimage.2018.06.027) -- primera pieza de la
sección de tractografía pedida por la usuaria el 02/09/2026: "tractografía
es una vista propia... ha de tener su propia pestaña de interfaz, como
la de homologías".

El zip real (`ORG-800FiberClusters.zip`, descargado por la usuaria en
`E:\\NeuroData\\original\\tractography\\`) trae 800 clusters de fibra
numerados (`cluster_NNNNN.vtp`, formato VTK PolyData real, streamlines
agrupadas de hasta ~100 sujetos del HCP) más 42 archivos de agrupación
anatómica (`T_<código>.mrml`). Verificado línea a línea contra el propio
archivo (02/09/2026), no contra el resumen del paper (que habla de "58
tractos profundos + 198 clusters superficiales" a nivel de método
completo -- una discrepancia real con lo que trae este release concreto,
señalada aquí, no explicada por invención):

- 510 de los 800 clusters pertenecen a 41 grupos con nombre anatómico
  real (los 42 archivos `T_*.mrml` menos `T_FalsePositive.mrml`).
- 150 clusters están marcados por los propios autores como
  `FalsePositive` -- se excluyen siempre, nunca se cargan como si
  fueran un tracto real.
- 140 clusters no tienen ninguna etiqueta anatómica en este release --
  se excluyen también: cargarlos sin nombre verificado sería inventar
  una identidad que el propio atlas no da.

`TRACT_NAMES` (código -> nombre completo) está verificado contra la
documentación oficial del propio atlas
(`SlicerDMRI/ORG-Atlases/Tracts-in-ORG-800FC-100HCP.md`), nunca
adivinado a partir del código.

Espacio de referencia: el paper registra los 100 sujetos entre sí
("groupwise whole-brain tractography registration") -- un espacio
propio construido para este atlas, NO MNI152 ni ningún espacio ya usado
por el resto de atlas de NeuroGraph. Por eso esta sección se construye
como una vista propia, sin mezclar con las regiones de otros atlas
(decisión de la usuaria, 02/09/2026) -- mezclarlos sin verificar el
registro real sería el mismo tipo de error que ya se evitó con cuidado
en las decisiones 6, 25 y 28.

Volumen real de datos: las 510 streamlines reales de los 41 tractos
suman 523 696 streamlines y 26 293 928 puntos 3D (contado exhaustivamente
contra el archivo real de la usuaria, 02/09/2026) -- inviable de dibujar
entero en un navegador. `DEFAULT_MAX_STREAMLINES_PER_TRACT` es un tope de
INGENIERÍA (cuántas streamlines dibuja un navegador con fluidez), nunca
un umbral científico (sección 24): se reduce con una muestra determinista
(semilla fija, `random.Random(seed).sample`, nunca al azar de verdad ni
truncando las primeras N) y el recuento REAL siempre se guarda junto al
recuento mostrado (`TractGeometry.streamline_count_real`/`_shown`,
migración 0012) -- mismo principio que `MAX_RENDERED_CONNECTIONS` del
frontend (decisión 42), pero registrado en la propia base de datos, no
solo en un comentario de código.

Un único código real (`Intra-CBLM-I&P`) trae un `&` que el patrón de
identificador de `backend/ontology/schema.py` no admite -- descubierto al
ejecutar este módulo contra el zip real, no anticipado en el diseño.
`_sanitize_code_for_id()` lo convierte a `and` solo para construir el
identificador interno; `TractGeometryDefinition.abbreviation` conserva
siempre el código real del atlas sin tocar.

Módulo puro de lectura -- no genera SQL ni conoce la cita completa/DOI/
año del estudio como texto (mismo reparto de responsabilidades que
`backend/ingestion/connectivity/yeh2022_tract_region.py`, que tampoco
genera SQL): la generación de SQL, el alta del `Dataset` del propio
.zip (checksum real, formato, licencia) y el registro completo del
estudio viven en `scripts/generate_org_tractography_geometry.py`,
siguiendo el mismo patrón que `scripts/register_yeh2022_tract_region.py`.

`iter_full_streamlines_by_tract()` (09/09/2026, decisión 66): generador
de bajo nivel extraído de `read_org_atlas` al construir la sección de
"nodos derivados de tractografía" -- esa sección necesita las
streamlines COMPLETAS de cada tracto (para asignar cada extremo real a
una etiqueta anatómica del wmparc, antes de reducir nada), mismo dato
exacto que ya leía `read_org_atlas` antes de recortarlo con
`downsample_streamlines`. Se extrae aquí, no se reimplementa en
`backend/ingestion/tractography/hybrid_nodes.py`, para no duplicar la
decodificación VTK real (mismo criterio de "nunca reimplementar" ya
aplicado en `backend/api/routers/tracts.py`). `read_org_atlas` ahora
delega en este generador; su resultado y sus pruebas no cambian.
"""
from __future__ import annotations

import random
import re
import tempfile
import zipfile
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

from backend.ontology.schema import EntityType, build_id

SPECIES_ID = build_id(EntityType.SPECIES, "human", "ncbi-taxonomy", "9606")

STUDY_ID = build_id(EntityType.STUDY, "human", "zhang2018", "zhang_2018")

ZIP_ROOT = "ORG-800FiberClusters"

# Tope de ingeniería, no científico -- ver docstring del módulo.
DEFAULT_MAX_STREAMLINES_PER_TRACT = 300
DEFAULT_RNG_SEED = 0

# Espacio de referencia real de este atlas (migración 0014, decisión 63):
# registro groupwise propio de los 100 sujetos HCP, NO MNI152 ni el de
# ningún otro atlas de NeuroGraph -- ver "Espacio de referencia" en el
# docstring del módulo. Duplicado deliberadamente en
# scripts/generate_org_atlas_mesh.py (ese script no importa el backend a
# propósito); nunca debe divergir de ese valor.
REFERENCE_SPACE = "ORG_800FC_100HCP_groupwise"

# Categoría propia de control de calidad del propio atlas -- nunca un
# tracto real, se excluye siempre.
FALSE_POSITIVE_CODE = "FalsePositive"

# Verificado contra SlicerDMRI/ORG-Atlases/Tracts-in-ORG-800FC-100HCP.md
# (02/09/2026) -- nunca adivinado a partir del código de dos/tres letras.
TRACT_NAMES: dict[str, str] = {
    "AF": "Arcuate Fasciculus",
    "CB": "Cingulum Bundle",
    "CC1": "Corpus Callosum 1",
    "CC2": "Corpus Callosum 2",
    "CC3": "Corpus Callosum 3",
    "CC4": "Corpus Callosum 4",
    "CC5": "Corpus Callosum 5",
    "CC6": "Corpus Callosum 6",
    "CC7": "Corpus Callosum 7",
    "CPC": "Cortico-Ponto-Cerebellar Tract",
    "CR-F": "Corona Radiata, Frontal",
    "CR-P": "Corona Radiata, Parietal",
    "CST": "Corticospinal Tract",
    "EC": "External Capsule",
    "EmC": "Extreme Capsule",
    "ICP": "Inferior Cerebellar Peduncle",
    "ILF": "Inferior Longitudinal Fasciculus",
    "IOFF": "Inferior Occipito-Frontal Fasciculus",
    "Intra-CBLM-I&P": "Intracerebellar Input and Purkinje Tract",
    "Intra-CBLM-PaT": "Intracerebellar Parallel Tract",
    "MCP": "Middle Cerebellar Peduncle",
    "MdLF": "Middle Longitudinal Fasciculus",
    "PLIC": "Posterior Limb of Internal Capsule",
    "SF": "Striato-Frontal Tract",
    "SLF-I": "Superior Longitudinal Fasciculus I",
    "SLF-II": "Superior Longitudinal Fasciculus II",
    "SLF-III": "Superior Longitudinal Fasciculus III",
    "SO": "Striato-Occipital Tract",
    "SP": "Striato-Parietal Tract",
    "Sup-F": "Superficial Frontal Tract",
    "Sup-FP": "Superficial Frontal-Parietal Tract",
    "Sup-O": "Superficial Occipital Tract",
    "Sup-OT": "Superficial Occipital-Temporal Tract",
    "Sup-P": "Superficial Parietal Tract",
    "Sup-PO": "Superficial Parietal-Occipital Tract",
    "Sup-PT": "Superficial Parietal-Temporal Tract",
    "Sup-T": "Superficial Temporal Tract",
    "TF": "Thalamo-Frontal Tract",
    "TO": "Thalamo-Occipital Tract",
    "TP": "Thalamo-Parietal Tract",
    "UF": "Uncinate Fasciculus",
}

Point = tuple[float, float, float]


@dataclass(frozen=True)
class TractGeometryDefinition:
    id: str
    name: str
    abbreviation: str
    species_id: str
    study_id: str
    streamlines: tuple[tuple[Point, ...], ...]
    streamline_count_real: int
    streamline_count_shown: int
    reference_space: str

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("TractGeometryDefinition.id no puede estar vacío")
        if not self.streamlines and self.streamline_count_real:
            raise ValueError(
                "streamlines vacío pero streamline_count_real > 0 -- "
                "inconsistencia real, nunca silenciosa"
            )
        if self.streamline_count_shown != len(self.streamlines):
            raise ValueError(
                "streamline_count_shown no coincide con len(streamlines) -- "
                "el recuento mostrado debe ser siempre el recuento real de lo "
                "que se guarda, nunca un número aparte sin verificar"
            )
        if self.streamline_count_shown > self.streamline_count_real:
            raise ValueError(
                "streamline_count_shown no puede superar streamline_count_real"
            )


def _sanitize_code_for_id(code: str) -> str:
    """Convierte un código real del atlas (p. ej. `Intra-CBLM-I&P`) en la
    forma que exige `build_id` (sección final del patrón: solo
    `[a-z0-9_-]`, ver `backend/ontology/schema.py`). Solo se usa para
    construir el identificador interno -- `TractGeometryDefinition.
    abbreviation` conserva siempre el código real tal cual lo da el
    atlas (incluido el `&`), nunca esta versión saneada.

    Único carácter real que aparece en los 41 códigos de este release y
    que el patrón de id no admite: `&` (en `Intra-CBLM-I&P`). Se
    sustituye por `and`, deletreado y no adivinado (el propio nombre
    completo verificado en TRACT_NAMES es "...Input and Purkinje
    Tract"), nunca se elimina en silencio."""
    return code.replace("&", "and")


def parse_cluster_filenames(mrml_text: str) -> list[str]:
    """Extrae, de un archivo `T_<código>.mrml` real, los nombres de los
    `cluster_NNNNN.vtp` que agrupa -- únicos y ordenados, nunca
    duplicados por aparecer en más de un nodo de la escena."""
    return sorted(set(re.findall(r"cluster_\d+\.vtp", mrml_text)))


def downsample_streamlines(
    streamlines: list[list[Point]], max_count: int, seed: int = DEFAULT_RNG_SEED
) -> list[list[Point]]:
    """Reduce a `max_count` streamlines reales mediante una muestra
    determinista (semilla fija) -- nunca las primeras N (eso sesgaría
    hacia un único cluster/sujeto de origen) ni una selección sin
    semilla (dejaría de ser reproducible). Si ya hay `max_count` o
    menos, se devuelven todas, sin tocar el orden."""
    if len(streamlines) <= max_count:
        return list(streamlines)
    return random.Random(seed).sample(streamlines, max_count)


def read_streamlines_from_vtp_bytes(data: bytes) -> list[list[Point]]:
    """Decodifica un `.vtp` real (VTK PolyData, binario+zlib o ascii) y
    devuelve sus streamlines como listas de puntos (x, y, z) reales.
    Requiere la librería `vtk` -- no hay forma fiable de leer el
    formato binario comprimido sin ella (probado: no es XML plano)."""
    import vtk  # import perezoso: módulo pesado (~140MB), solo se paga si se usa de verdad

    with tempfile.NamedTemporaryFile(suffix=".vtp", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    try:
        reader = vtk.vtkXMLPolyDataReader()
        reader.SetFileName(tmp_path)
        reader.Update()
        poly = reader.GetOutput()
        points = poly.GetPoints()
        lines = poly.GetLines()
        if points is None or lines is None:
            return []
        streamlines: list[list[Point]] = []
        lines.InitTraversal()
        id_list = vtk.vtkIdList()
        while lines.GetNextCell(id_list):
            streamlines.append(
                [points.GetPoint(id_list.GetId(i)) for i in range(id_list.GetNumberOfIds())]
            )
        return streamlines
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def iter_full_streamlines_by_tract(zip_path: Path) -> Iterator[tuple[str, list[list[Point]]]]:
    """Generador de bajo nivel (decisión 66): recorre los 41 tractos
    reales en el mismo orden que `read_org_atlas` (alfabético por
    código) y da, para cada uno, sus streamlines COMPLETAS (sin
    reducir) -- mismo dato exacto que `read_org_atlas` leía antes de
    pasarlo por `downsample_streamlines`. Extraído para que
    `backend/ingestion/tractography/hybrid_nodes.py` (que necesita la
    geometría completa para asignar cada extremo real a una etiqueta
    del wmparc) reutilice la misma decodificación VTK real, sin
    duplicarla. No excluye ni reordena tractos; el mismo error si falta
    un `T_<código>.mrml` real en el zip."""
    with zipfile.ZipFile(zip_path) as zf:
        names = set(zf.namelist())
        for code in sorted(TRACT_NAMES):
            mrml_name = f"{ZIP_ROOT}/T_{code}.mrml"
            if mrml_name not in names:
                raise ValueError(
                    f"{mrml_name!r} no está en el zip -- TRACT_NAMES tiene un "
                    f"código que no existe en este release del atlas"
                )
            mrml_text = zf.read(mrml_name).decode("utf-8", errors="replace")
            cluster_files = parse_cluster_filenames(mrml_text)

            streamlines_real: list[list[Point]] = []
            for cluster_file in cluster_files:
                member = f"{ZIP_ROOT}/{cluster_file}"
                streamlines_real.extend(read_streamlines_from_vtp_bytes(zf.read(member)))

            yield code, streamlines_real


def read_org_atlas(
    zip_path: Path,
    max_streamlines_per_tract: int = DEFAULT_MAX_STREAMLINES_PER_TRACT,
    seed: int = DEFAULT_RNG_SEED,
) -> list[TractGeometryDefinition]:
    """Lee el zip real `ORG-800FiberClusters.zip` y devuelve los 41
    tractos con nombre real (nunca `FalsePositive` ni clusters sin
    etiqueta) con su geometría real, reducida a `max_streamlines_per_tract`
    de forma determinista. No toca ninguna base de datos."""
    definitions: list[TractGeometryDefinition] = []
    for code, streamlines_real in iter_full_streamlines_by_tract(zip_path):
        shown = downsample_streamlines(streamlines_real, max_streamlines_per_tract, seed)

        definitions.append(
            TractGeometryDefinition(
                id=build_id(
                    EntityType.TRACT, "human", "org2018", _sanitize_code_for_id(code)
                ),
                name=TRACT_NAMES[code],
                abbreviation=code,
                species_id=SPECIES_ID,
                study_id=STUDY_ID,
                streamlines=tuple(tuple(pt for pt in s) for s in shown),
                streamline_count_real=len(streamlines_real),
                streamline_count_shown=len(shown),
                reference_space=REFERENCE_SPACE,
            )
        )
    return definitions
