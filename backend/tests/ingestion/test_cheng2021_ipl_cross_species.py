from pathlib import Path

import pytest

from backend.ingestion.evolution.cheng2021_ipl_cross_species import (
    SPECIES,
    build_homologies,
    read_ipl_coordinates,
    regions_for_species,
)


def test_species_ids_follow_ontology_scheme():
    assert SPECIES["human"]["id"] == "species.human.ncbi-taxonomy.9606"
    assert SPECIES["chimp"]["id"] == "species.chimp.ncbi-taxonomy.9598"
    # Coincide a propósito con macaque_cortex_wang2017.SPECIES_ID: misma
    # especie real, distinto atlas/espacio de referencia.
    assert SPECIES["macaque"]["id"] == "species.macaque.ncbi-taxonomy.9544"


def test_regions_for_species_has_one_region_per_hemisphere_granularity_label():
    regions = regions_for_species("human")
    # 2 hemisferios x (2+3+4) etiquetas = 18 regiones.
    assert len(regions) == 18
    assert len({r.id for r in regions}) == 18

    g2 = [r for r in regions if r.granularity == 2]
    g3 = [r for r in regions if r.granularity == 3]
    g4 = [r for r in regions if r.granularity == 4]
    assert len(g2) == 4  # 2 etiquetas x 2 hemisferios
    assert len(g3) == 6
    assert len(g4) == 8


def test_region_abbreviation_uses_granularity_not_the_fixed_six_slot_legend():
    regions = regions_for_species("chimp")
    region = next(r for r in regions if r.hemisphere == "L" and r.granularity == 2 and r.label == 1)
    assert region.abbreviation == "IPL_2_1"
    assert region.id == "region.chimp.cheng2021.l_g2_1"


def test_build_homologies_covers_every_species_pair_per_slot():
    regions_by_species = {
        "human": regions_for_species("human"),
        "chimp": regions_for_species("chimp"),
        "macaque": regions_for_species("macaque"),
    }
    homologies = build_homologies(regions_by_species)
    # 2 hemisferios x (2+3+4) etiquetas x 3 pares de especies = 54.
    assert len(homologies) == 54
    assert len({h.id for h in homologies}) == 54
    assert all(h.status == "candidate_homology" for h in homologies)

    pair_slugs = {h.id.split(".")[1] for h in homologies}
    assert pair_slugs == {"chimp_human", "chimp_macaque", "human_macaque"}

    one = next(h for h in homologies if h.id == "homology.chimp_human.cheng2021.l_g2_1")
    assert one.source_id == "region.chimp.cheng2021.l_g2_1"
    assert one.target_id == "region.human.cheng2021.l_g2_1"


_ROOT = Path.home() / "mnt" / "NeuroData" / "original" / "atlases" / "ipl_cross_species_parcellation"

_REQUIRES_REAL_DATA = pytest.mark.skipif(
    not _ROOT.exists(),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada, "
           "con el zip ya descomprimido en ipl_cross_species_parcellation/",
)


@_REQUIRES_REAL_DATA
def test_read_ipl_coordinates_against_real_files():
    for species_slug in ("human", "chimp", "macaque"):
        coords = read_ipl_coordinates(species_slug, _ROOT)
        assert len(coords) == 18
        assert len({c.id for c in coords}) == 18
        assert all(c.reference_space == SPECIES[species_slug]["reference_space"] for c in coords)
