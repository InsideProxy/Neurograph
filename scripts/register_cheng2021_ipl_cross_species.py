"""Genera el SQL para dar de alta la parcelación cruzada del IPL de Cheng
et al. (2021, eLife): 3 `Species` (humano, chimpancé, macaco -- humano y
macaco ya existentes, reutilizados vía ON CONFLICT), 1 `Study`, 1
`Dataset`, 3 `Atlas` (uno por especie), 54 `Region`, 54 `Coordinate` y 54
`Homology` -- ver el docstring de
`backend.ingestion.evolution.cheng2021_ipl_cross_species` para la
metodología real verificada (correspondencia topológica + citoarquitectónica
de los propios autores, nunca una medida cuantitativa) y la decisión de la
usuaria sobre `status`/`confidence` (31/08/2026).

Uso:
    python scripts/register_cheng2021_ipl_cross_species.py \\
        <carpeta IPL_cross_species_parcellation extraída> > salida.sql

La carpeta debe contener `human/`, `chimp/` y `macaque/`, cada una con su
`.surf.gii` y sus 6 `.label.gii` (2/3/4 x L/R), tal como distribuye el
propio paquete de descarga. No requiere conexión a la base de datos: solo
imprime el SQL, que se aplica siguiendo el patrón de
`backend/database/migrations/README.md` (docker cp + psql -f).
"""
from __future__ import annotations

import sys
from pathlib import Path


def _escape(value: str) -> str:
    return value.replace("'", "''")


def _sha256_of(path: Path) -> str:
    import hashlib

    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main(argv: list[str]) -> int:
    # Fuerza UTF-8 en stdout (ver comentario idéntico en los otros
    # scripts de registro -- riesgo 17 de docs/analisis-arquitectura.md).
    sys.stdout.reconfigure(encoding="utf-8")
    if len(argv) != 1:
        print(__doc__, file=sys.stderr)
        return 1

    from backend.ingestion.evolution.cheng2021_ipl_cross_species import (
        SPECIES,
        build_homologies,
        read_ipl_coordinates,
        regions_for_species,
    )
    from backend.library.dataset_registration import combined_checksum
    from backend.ontology.schema import EntityType, build_id

    root = Path(argv[0])

    regions_by_species = {s: regions_for_species(s) for s in SPECIES}
    coordinates_by_species = {s: read_ipl_coordinates(s, root) for s in SPECIES}
    homologies = build_homologies(regions_by_species)

    total_regions = sum(len(r) for r in regions_by_species.values())
    total_coords = sum(len(c) for c in coordinates_by_species.values())
    if total_regions != 54:
        print(f"aviso: se esperaban 54 regiones, se generaron {total_regions}", file=sys.stderr)
    if total_coords != 54:
        print(f"aviso: se esperaban 54 coordenadas, se generaron {total_coords}", file=sys.stderr)
    if len(homologies) != 54:
        print(f"aviso: se esperaban 54 homologías, se generaron {len(homologies)}", file=sys.stderr)
    print(
        f"regiones: {total_regions}, coordenadas: {total_coords}, "
        f"homologías: {len(homologies)}",
        file=sys.stderr,
    )

    # Estudio: DOI y autores verificados contra Crossref el 31/08/2026
    # (10.7554/eLife.67600), resumen literal verificado contra la propia
    # web de eLife. "multi" como segmento especie del id: el estudio no
    # pertenece a una sola especie (mismo criterio ya razonado para
    # `Homology`, ver docstring del módulo de ingesta).
    study_id = "study.multi.cheng2021.cheng_2021"
    study_name = (
        "Cheng L, Zhang Y, Li G, Wang J, Sherwood C, Gong G, Fan L, Jiang T "
        "(2021). Connectional asymmetry of the inferior parietal lobule "
        "shapes hemispheric specialization in humans, chimpanzees, and "
        "rhesus macaques. eLife, 10, e67600."
    )
    study_doi = "10.7554/eLife.67600"
    study_year = 2021
    study_authors = [
        "Luqi Cheng", "Yuanchao Zhang", "Gang Li", "Jiaojian Wang",
        "Chet Sherwood", "Gaolang Gong", "Lingzhong Fan", "Tianzi Jiang",
    ]
    study_journal = "eLife"
    study_abstract = (
        "The inferior parietal lobule (IPL) is one of the most expanded "
        "cortical regions in humans relative to other primates. It is "
        "also among the most structurally and functionally asymmetric "
        "regions in the human cerebral cortex. Whether the structural and "
        "connectional asymmetries of IPL subdivisions differ across "
        "primate species and how this relates to functional asymmetries "
        "remain unclear. We identified IPL subregions that exhibited "
        "positive allometric in both hemispheres, scaling across rhesus "
        "macaque monkeys, chimpanzees, and humans. The patterns of IPL "
        "subregions asymmetry were similar in chimpanzees and humans, but "
        "no IPL asymmetries were evident in macaques. Among the "
        "comparative sample of primates, humans showed the most "
        "widespread asymmetric connections in the frontal, parietal, and "
        "temporal cortices, constituting leftward asymmetric networks "
        "that may provide an anatomical basis for language and tool use. "
        "Unique human asymmetric connectivity between the IPL and primary "
        "motor cortex might be related to handedness. These findings "
        "suggest that structural and connectional asymmetries may "
        "underlie hemispheric specialization of the human brain."
    )

    # Dataset multi-archivo (mismo criterio que
    # backend/library/dataset_registration.py: checksum combinado, sha256
    # de cada archivo real x nombre, orden alfabético).
    dataset_id = "dataset.multi.cheng2021.ipl_cross_species_parcellation"
    real_files = sorted(p for p in root.rglob("*") if p.is_file() and p.name != ".DS_Store")
    file_hashes = {str(p.relative_to(root)): _sha256_of(p) for p in real_files}
    checksum = combined_checksum(file_hashes)
    dataset_name = (
        "IPL cross-species parcellation (Cheng et al., 2021) -- mallas "
        "GIFTI midthickness + etiquetas de 2/3/4 subregiones (L/R), "
        "humano/chimpancé/macaco"
    )
    dataset_format = (
        f"{len(real_files)} archivos GIFTI reales (.surf.gii + .label.gii) "
        "más metadatos (README, .scene) en tres carpetas por especie"
    )
    dataset_license = (
        "eLife es una revista de acceso abierto (política declarada "
        "Creative Commons Attribution, CC BY 4.0) -- versión exacta de la "
        "licencia del propio paquete de datos descargable no verificada "
        "línea a línea (mismo criterio de honestidad ya aplicado en "
        "register_yeh2022_tract_region.py)."
    )

    lines: list[str] = []

    lines.append("-- Estudio: Cheng et al. (2021), eLife.")
    lines.append("-- Generado por scripts/register_cheng2021_ipl_cross_species.py.")
    lines.append(
        "INSERT INTO studies (id, name, doi, year, authors, journal, abstract) VALUES\n"
        f"  ('{study_id}', '{_escape(study_name)}', '{study_doi}', {study_year},\n"
        "   ARRAY[" + ",".join(f"'{_escape(a)}'" for a in study_authors) + "]::text[],\n"
        f"   '{_escape(study_journal)}', '{_escape(study_abstract)}')\n"
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, doi = EXCLUDED.doi, "
        "year = EXCLUDED.year, authors = EXCLUDED.authors, journal = EXCLUDED.journal, "
        "abstract = EXCLUDED.abstract;"
    )
    lines.append("")

    lines.append("-- 3 especies (humano y macaco ya existentes, reutilizadas).")
    lines.append("INSERT INTO species (id, name, scientific_name) VALUES")
    species_values = [
        f"  ('{info['id']}', '{_escape(info['name'])}', '{_escape(info['scientific_name'])}')"
        for info in SPECIES.values()
    ]
    lines.append(",\n".join(species_values))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "scientific_name = EXCLUDED.scientific_name;"
    )
    lines.append("")

    lines.append(f"-- Dataset multi-archivo ({len(real_files)} archivos reales, checksum combinado).")
    lines.append(
        "INSERT INTO datasets (id, name, format, license, checksum_sha256, study_id, created_at)\n"
        "VALUES (\n"
        f"  '{dataset_id}', '{_escape(dataset_name)}', '{_escape(dataset_format)}',\n"
        f"  '{_escape(dataset_license)}', '{checksum}', '{study_id}', now()\n"
        ")\n"
        "ON CONFLICT (id) DO UPDATE SET\n"
        "  name = EXCLUDED.name, format = EXCLUDED.format, license = EXCLUDED.license,\n"
        "  checksum_sha256 = EXCLUDED.checksum_sha256, study_id = EXCLUDED.study_id;"
    )
    lines.append("")

    lines.append("-- 3 atlas (uno por especie, mismo estudio y dataset de origen).")
    lines.append("INSERT INTO atlases (id, name, species_id, version, study_id) VALUES")
    atlas_values = []
    for species_slug, info in SPECIES.items():
        atlas_id = build_id(EntityType.ATLAS, species_slug, "cheng2021", "ipl")
        atlas_name = (
            f"IPL cross-species parcellation, {info['common_name']} "
            "(Cheng et al., 2021, eLife)"
        )
        atlas_values.append(
            f"  ('{atlas_id}', '{_escape(atlas_name)}', '{info['id']}', "
            f"'2/3/4 subregiones', '{study_id}')"
        )
    lines.append(",\n".join(atlas_values))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "version = EXCLUDED.version, study_id = EXCLUDED.study_id;"
    )
    lines.append("")

    lines.append("-- 54 regiones (3 especies x 2 hemisferios x (2+3+4) subregiones).")
    lines.append(
        "INSERT INTO regions (id, name, species_id, atlas_id, abbreviation, hemisphere) VALUES"
    )
    region_values = []
    for species_slug, regions in regions_by_species.items():
        atlas_id = build_id(EntityType.ATLAS, species_slug, "cheng2021", "ipl")
        for r in regions:
            region_values.append(
                f"  ('{r.id}', '{_escape(r.name)}', '{r.species_id}', '{atlas_id}', "
                f"'{_escape(r.abbreviation)}', '{r.hemisphere}')"
            )
    lines.append(",\n".join(region_values))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "abbreviation = EXCLUDED.abbreviation, hemisphere = EXCLUDED.hemisphere;"
    )
    lines.append("")

    lines.append("-- 54 coordenadas (vértice real más cercano al centroide, tres espacios distintos).")
    lines.append("INSERT INTO coordinates (id, entity_id, x, y, z, reference_space) VALUES")
    coord_values = []
    for coords in coordinates_by_species.values():
        for c in coords:
            coord_values.append(
                f"  ('{c.id}', '{c.entity_id}', {c.x!r}, {c.y!r}, {c.z!r}, '{c.reference_space}')"
            )
    lines.append(",\n".join(coord_values))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z, "
        "reference_space = EXCLUDED.reference_space;"
    )
    lines.append("")

    lines.append(
        "-- 54 homologías candidatas (status='candidate_homology', "
        "confidence NULL -- decisión de la usuaria, 31/08/2026, ver "
        "docstring del módulo de ingesta)."
    )
    lines.append(
        "INSERT INTO homologies "
        "(id, source_id, target_id, status, confidence, method, "
        "source_dataset_id, created_at) VALUES"
    )
    homology_values = [
        f"  ('{h.id}', '{h.source_id}', '{h.target_id}', '{h.status}', NULL, "
        f"'{_escape(h.method)}', '{dataset_id}', now())"
        for h in homologies
    ]
    lines.append(",\n".join(homology_values))
    lines.append(
        "ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, "
        "confidence = EXCLUDED.confidence, method = EXCLUDED.method, "
        "source_dataset_id = EXCLUDED.source_dataset_id;"
    )

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
