from dataclasses import dataclass

from backend.api.services.homology_service import HomologyMatch, HomologyRegion
from backend.api.services.species_service import compute_species_comparison


@dataclass
class _FakeSpecies:
    id: str
    scientific_name: str


def _match(match_id: str, source_species: str, target_species: str, status: str = "candidate_homology") -> HomologyMatch:
    return HomologyMatch(
        id=match_id,
        status=status,
        confidence=None,
        method="correspondencia asignada por los autores",
        source=HomologyRegion(id=f"{match_id}.source", name="fuente", species_id=source_species, species_scientific_name="X"),
        target=HomologyRegion(id=f"{match_id}.target", name="destino", species_id=target_species, species_scientific_name="Y"),
        studies=[],
    )


def test_compute_species_comparison_keeps_only_homologies_between_the_requested_pair():
    species_a = _FakeSpecies(id="species.chimp", scientific_name="Pan troglodytes")
    species_b = _FakeSpecies(id="species.human", scientific_name="Homo sapiens")
    matches = [
        _match("homology.1", "species.chimp", "species.human"),
        _match("homology.2", "species.macaque", "species.human"),  # otro par, debe excluirse
    ]

    result = compute_species_comparison(species_a, species_b, region_count_a=18, region_count_b=360, all_homology_matches=matches)

    assert result.homology_count == 1
    assert [m.id for m in result.homologies] == ["homology.1"]


def test_compute_species_comparison_counts_regions_participating_on_each_side():
    species_a = _FakeSpecies(id="species.chimp", scientific_name="Pan troglodytes")
    species_b = _FakeSpecies(id="species.human", scientific_name="Homo sapiens")
    matches = [
        _match("homology.1", "species.chimp", "species.human"),
        _match("homology.2", "species.chimp", "species.human"),
    ]

    result = compute_species_comparison(species_a, species_b, region_count_a=18, region_count_b=360, all_homology_matches=matches)

    # Dos homologías distintas -> dos regiones distintas de cada especie (nunca la misma región repetida)
    assert result.species_a.regions_in_shared_homologies == 2
    assert result.species_b.regions_in_shared_homologies == 2
    # El recuento total de regiones de cada especie es el real de la base de datos, no el de homologías
    assert result.species_a.region_count == 18
    assert result.species_b.region_count == 360


def test_compute_species_comparison_matches_regardless_of_which_side_is_source():
    # Una fila Homology real solo registra un orden concreto de sus dos
    # extremos (p. ej. siempre chimpancé->humano); comparar humano vs
    # chimpancé debe encontrarla igual.
    species_a = _FakeSpecies(id="species.human", scientific_name="Homo sapiens")
    species_b = _FakeSpecies(id="species.chimp", scientific_name="Pan troglodytes")
    matches = [_match("homology.1", "species.chimp", "species.human")]

    result = compute_species_comparison(species_a, species_b, region_count_a=360, region_count_b=18, all_homology_matches=matches)

    assert result.homology_count == 1


def test_compute_species_comparison_counts_by_status_honestly():
    species_a = _FakeSpecies(id="species.chimp", scientific_name="Pan troglodytes")
    species_b = _FakeSpecies(id="species.human", scientific_name="Homo sapiens")
    matches = [
        _match("homology.1", "species.chimp", "species.human", status="candidate_homology"),
        _match("homology.2", "species.chimp", "species.human", status="candidate_homology"),
        _match("homology.3", "species.chimp", "species.human", status="uncertain_correspondence"),
    ]

    result = compute_species_comparison(species_a, species_b, region_count_a=18, region_count_b=360, all_homology_matches=matches)

    assert result.homologies_by_status == {"candidate_homology": 2, "uncertain_correspondence": 1}


def test_compute_species_comparison_is_empty_when_the_pair_has_no_real_homology():
    species_a = _FakeSpecies(id="species.macaque", scientific_name="Macaca mulatta")
    species_b = _FakeSpecies(id="species.chimp", scientific_name="Pan troglodytes")
    matches = [_match("homology.1", "species.chimp", "species.human")]

    result = compute_species_comparison(species_a, species_b, region_count_a=178, region_count_b=18, all_homology_matches=matches)

    assert result.homology_count == 0
    assert result.homologies == []
    assert result.homologies_by_status == {}
