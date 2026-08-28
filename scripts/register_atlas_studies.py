"""Genera el SQL para dar de alta las publicaciones que definen cada
atlas ya cargado y enlazarlas de forma estructurada (`atlases.study_id`),
en vez de dejar la cita solo como texto suelto dentro del nombre del
atlas.

DOI verificados el 28/08/2026 directamente en la página del editor o en
el redirect oficial del DOI (nature.com para Glasser et al. 2016,
academic.oup.com para Fan et al. y para Gordon et al.,
linkinghub.elsevier.com vía doi.org para Glasser et al. 2013), no
adivinados.

Uso:
    python scripts/register_atlas_studies.py > salida.sql
"""
from __future__ import annotations

from backend.ontology.schema import EntityType, build_id

STUDIES = [
    {
        "id": build_id(EntityType.STUDY, "human", "hcp", "glasser_2016"),
        "name": (
            "Glasser MF, Coalson TS, Robinson EC, et al. (2016). "
            "A multi-modal parcellation of human cerebral cortex. "
            "Nature, 536(7615), 171-178."
        ),
        "doi": "10.1038/nature18933",
        "year": 2016,
        "atlas_id": "atlas.human.hcp.mmp1_0",
    },
    {
        "id": build_id(EntityType.STUDY, "human", "brainnetome", "fan_2016"),
        "name": (
            "Fan L, Li H, Zhuo J, et al. (2016). The Human Brainnetome "
            "Atlas: A New Brain Atlas Based on Connectional Architecture. "
            "Cerebral Cortex, 26(8), 3508-3526."
        ),
        "doi": "10.1093/cercor/bhw157",
        "year": 2016,
        "atlas_id": "atlas.human.brainnetome.bna_246",
    },
    {
        "id": build_id(EntityType.STUDY, "human", "gordon333", "gordon_2016"),
        "name": (
            "Gordon EM, Laumann TO, Adeyemo B, Huckins JF, Kelley WM, "
            "Petersen SE (2016). Generation and Evaluation of a Cortical "
            "Area Parcellation from Resting-State Correlations. Cerebral "
            "Cortex, 26(1), 288-303."
        ),
        "doi": "10.1093/cercor/bhu239",
        "year": 2016,
        "atlas_id": "atlas.human.gordon333.cortex",
    },
    {
        "id": build_id(EntityType.STUDY, "human", "hcp", "glasser_2013"),
        "name": (
            "Glasser MF, Sotiropoulos SN, Wilson JA, Coalson TS, Fischl B, "
            "Andersson JL, Xu J, Jbabdi S, Webster M, Polimeni JR, Van "
            "Essen DC, Jenkinson M (2013). The minimal preprocessing "
            "pipelines for the Human Connectome Project. NeuroImage, 80, "
            "105-124."
        ),
        "doi": "10.1016/j.neuroimage.2013.04.127",
        "year": 2013,
        "atlas_id": "atlas.human.hcp.subcortex_grayordinates",
    },
]


def _escape(value: str) -> str:
    return value.replace("'", "''")


def main() -> int:
    lines = [
        "-- Publicaciones que definen cada atlas ya cargado, enlazadas de",
        "-- forma estructurada (antes solo texto suelto en atlases.name).",
        "-- DOI verificados contra la web del editor / el redirect oficial del",
        "-- DOI el 28/08/2026, no adivinados.",
        "-- Generado por scripts/register_atlas_studies.py.",
        "",
        "INSERT INTO studies (id, name, doi, year) VALUES",
    ]
    lines.append(
        ",\n".join(
            f"  ('{s['id']}', '{_escape(s['name'])}', '{s['doi']}', {s['year']})"
            for s in STUDIES
        )
    )
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, doi = EXCLUDED.doi, "
        "year = EXCLUDED.year;"
    )
    lines.append("")
    for s in STUDIES:
        lines.append(
            f"UPDATE atlases SET study_id = '{s['id']}' WHERE id = '{s['atlas_id']}';"
        )

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
