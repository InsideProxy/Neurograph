"""Correspondencia SÍNTESIS (no de un único estudio) entre el complejo de
área motora suplementaria humano (HCP-MMP1.0: `6ma`, `6mp`, `SCEF`) y el
área SMA del macaco ya cargada (Wang et al. 2017: `SMA`) -- decisión de
la usuaria, 01/09/2026, tras investigar honestamente que NO existe
ningún estudio único, con una sola metodología, que declare una tabla
región-a-región para corteza motora/premotora entre estas dos
parcelaciones (a diferencia del IPL de Cheng et al. 2021, que sí lo
hace -- ver `cheng2021_ipl_cross_species.py`).

Cuatro fuentes reales, cada una verificada por separado (búsqueda web
real, no de memoria), NINGUNA de las cuales declara por sí sola la
correspondencia completa que se registra aquí -- por eso
`status="uncertain_correspondence"`, nunca `candidate_homology`:

1. Glasser MF et al. (2016), "A multi-modal parcellation of human
   cerebral cortex", Nature, DOI 10.1038/nature18933 (mismo estudio ya
   citado para `atlas.human.hcp.mmp1_0`, decisión 6 de
   `docs/analisis-arquitectura.md`). El material suplementario del
   propio equipo agrupa sus tres etiquetas `6mp`, `6ma` y `SCEF` bajo el
   epígrafe "supplementary motor areas" (sección S1.7) -- pero, tras una
   búsqueda real en varias fuentes accesibles, NO se encontró ningún
   pasaje que diga cuál de `6ma`/`6mp` es específicamente la "SMA-proper"
   clásica y cuál la "pre-SMA": el propio material fuente no resuelve esa
   distinción con la precisión que exigiría una fila de homología
   región-a-región exacta.
2. Luppino G, Matelli M, Camarda R, Rizzolatti G (1993), "Corticocortical
   connections of area F3 (SMA-proper) and area F6 (pre-SMA) in the
   macaque monkey", Journal of Comparative Neurology, PMID 7507940 --
   define, en macaco, área F3 = SMA-proper y área F6 = pre-SMA (linaje
   citoarquitectónico Barbas & Pandya 1987 / Matelli-Luppino-Rizzolatti
   del que deriva la etiqueta "SMA" que ya usa Wang et al. 2017 para su
   atlas de macaco, verificado que cita a Barbas & Pandya 1987 para el
   área 6).
3. Zilles K, Schlaug G, Matelli M, Luppino G, Schleicher A, Qü M,
   Dabringhaus A, Seitz R, Roland PE (1995), "Mapping of human and
   macaque sensorimotor areas by integrating architectonic, transmitter
   receptor, MRI and PET data", Journal of Anatomy, 187:515-537, PMID
   8586553 -- correspondencia multimodal (citoarquitectura + receptores +
   MRI/PET) entre áreas sensomotoras humanas y de macaco, concluyendo
   explícitamente que pueden definirse "áreas sensomotoras homólogas en
   ambas especies sobre la base de características arquitectónicas
   comunes" -- para SMA/áreas motoras cingulares específicamente.
4. Mars RB et al. (2018), "Whole brain comparative anatomy using
   connectivity blueprints", eLife, DOI 10.7554/eLife.35237 --
   validación cuantitativa (perfil de conectividad de sustancia blanca)
   de que la pre-SMA humana corresponde al área F6 del macaco.

Combinando estas cuatro fuentes reales, NeuroGraph enlaza el SMA del
macaco (única región de este complejo que Wang et al. 2017 tiene
cargada -- ningún F6/pre-SMA de macaco está cargado todavía) con las
TRES regiones humanas que el propio Glasser et al. 2016 agrupa como
"áreas motoras suplementarias", sin distinguir SMA-proper de pre-SMA
dentro de ese grupo (esa distinción no está resuelta en las fuentes
accesibles) -- por eso `confidence=None` y `status="uncertain_correspondence"`,
nunca `candidate_homology` (reservado para cuando un único estudio
declara la correspondencia con una sola metodología, como en Cheng et
al. 2021).

Aviso aparte, explícito en el propio `method` de cada fila: `SCEF`
("supplementary and cingulate eye field") es, por su propio nombre, un
área OCULOMOTORA, no de movimiento de extremidades -- se incluye aquí
solo porque el propio Glasser et al. 2016 la agrupa junto a `6ma`/`6mp`,
no porque haya evidencia propia verificada de que participe en circuitos
de memoria procedimental de extremidades.

Emparejado por hemisferio (L con L, R con R) -- nunca cruzado entre
hemisferios distintos.
"""
from __future__ import annotations

from dataclasses import dataclass

from backend.ontology.schema import EntityType, build_id

_HEMISPHERES = ("L", "R")

# Las tres etiquetas humanas reales que Glasser et al. 2016 agrupa como
# "supplementary motor areas" (verificado en su material suplementario,
# sección S1.7) -- IDs ya existentes en `regions` (HCP-MMP1.0, decisión
# 6), nunca regiones nuevas.
_HUMAN_LOCAL_CODES = ("6ma", "6mp", "scef")

# El único macaco de este complejo que Wang et al. 2017 tiene cargado
# (id ya existente en `regions`).
_MACAQUE_LOCAL_CODE = "sma"

_METHOD_DESCRIPTION = (
    "sintesis de NeuroGraph combinando cuatro fuentes reales, ninguna de "
    "las cuales declara por si sola esta correspondencia completa (nunca "
    "candidate_homology, reservado para una tabla region-a-region de un "
    "unico estudio, como Cheng et al. 2021): (1) Glasser et al. 2016 "
    "(Nature, DOI 10.1038/nature18933) agrupa 6ma/6mp/SCEF como 'areas "
    "motoras suplementarias' sin distinguir SMA-proper de pre-SMA dentro "
    "del grupo; (2) Luppino, Matelli, Camarda y Rizzolatti (1993, J Comp "
    "Neurol, PMID 7507940) definen en macaco area F3=SMA-proper y "
    "F6=pre-SMA, linaje citoarquitectonico del que deriva la etiqueta "
    "SMA de Wang et al. 2017 (cita a Barbas y Pandya 1987); (3) Zilles "
    "et al. (1995, J Anat 187:515-537, PMID 8586553) establecen "
    "correspondencia multimodal humano-macaco para SMA/areas motoras "
    "cingulares; (4) Mars et al. (2018, eLife, DOI 10.7554/eLife.35237) "
    "validan cuantitativamente (conectividad) que la pre-SMA humana "
    "corresponde al area F6 del macaco. Wang et al. 2017 no tiene "
    "cargada ninguna region F6/pre-SMA de macaco todavia, asi que la "
    "correspondencia se enlaza solo con su SMA. Aviso aparte: SCEF "
    "('supplementary and cingulate eye field') es, por su propio nombre, "
    "un area oculomotora, no de movimiento de extremidades -- se incluye "
    "solo porque el propio Glasser et al. 2016 la agrupa junto a "
    "6ma/6mp, sin evidencia propia verificada de participacion en "
    "circuitos procedimentales de extremidades."
)


@dataclass(frozen=True)
class MotorSmaHomology:
    id: str
    source_id: str
    target_id: str
    status: str
    method: str


def build_homologies() -> list[MotorSmaHomology]:
    """Una fila por (hemisferio, región humana del grupo SMA), enlazada
    con el SMA del macaco del mismo hemisferio -- 3 regiones humanas x 2
    hemisferios = 6 filas."""
    homologies: list[MotorSmaHomology] = []
    for hemi in _HEMISPHERES:
        hemi_lower = hemi.lower()
        macaque_id = build_id(
            EntityType.REGION, "macaque", "wang2017", f"{hemi_lower}_{_MACAQUE_LOCAL_CODE}"
        )
        for human_code in _HUMAN_LOCAL_CODES:
            human_id = build_id(
                EntityType.REGION, "human", "hcp-mmp1", f"{hemi_lower}_{human_code}"
            )
            homology_id = build_id(
                EntityType.HOMOLOGY,
                "human_macaque",
                "motor_sma_synthesis",
                f"{hemi_lower}_{human_code}_sma",
            )
            homologies.append(
                MotorSmaHomology(
                    id=homology_id,
                    source_id=human_id,
                    target_id=macaque_id,
                    status="uncertain_correspondence",
                    method=_METHOD_DESCRIPTION,
                )
            )
    return homologies
