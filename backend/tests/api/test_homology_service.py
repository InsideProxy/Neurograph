from dataclasses import dataclass

from backend.api.services.homology_service import compute_homology_matches


@dataclass
class _FakeHomology:
    id: str
    source_id: str
    target_id: str
    status: str
    confidence: float | None
    method: str | None
    source_dataset_id: str | None


@dataclass
class _FakeRegion:
    id: str
    name: str
    species_id: str


@dataclass
class _FakeSpecies:
    id: str
    scientific_name: str


@dataclass
class _FakeDataset:
    id: str
    study_id: str | None


@dataclass
class _FakeStudy:
    id: str
    name: str
    doi: str | None
    year: int | None


def test_compute_homology_matches_includes_the_real_region_and_species_of_each_side():
    rows = [
        _FakeHomology(
            id="homology.chimp_human.cheng2021.L_g4_1",
            source_id="region.chimp.cheng2021.L_g4_1",
            target_id="region.human.cheng2021.L_g4_1",
            status="candidate_homology",
            confidence=None,
            method="correspondencia asignada por los autores",
            source_dataset_id=None,
        ),
    ]
    regions_by_id = {
        "region.chimp.cheng2021.L_g4_1": _FakeRegion(
            id="region.chimp.cheng2021.L_g4_1", name="IPL chimpancé 1/4", species_id="species.chimp.ncbi-taxonomy.9598"
        ),
        "region.human.cheng2021.L_g4_1": _FakeRegion(
            id="region.human.cheng2021.L_g4_1", name="IPL humano 1/4", species_id="species.human.ncbi-taxonomy.9606"
        ),
    }
    species_by_id = {
        "species.chimp.ncbi-taxonomy.9598": _FakeSpecies(id="species.chimp.ncbi-taxonomy.9598", scientific_name="Pan troglodytes"),
        "species.human.ncbi-taxonomy.9606": _FakeSpecies(id="species.human.ncbi-taxonomy.9606", scientific_name="Homo sapiens"),
    }

    matches = compute_homology_matches(rows, regions_by_id, species_by_id, {}, {})

    assert len(matches) == 1
    assert matches[0].source.species_scientific_name == "Pan troglodytes"
    assert matches[0].target.species_scientific_name == "Homo sapiens"
    assert matches[0].status == "candidate_homology"
    assert matches[0].confidence is None


def test_compute_homology_matches_never_fabricates_a_citation_without_a_linked_study():
    rows = [
        _FakeHomology(
            id="homology.chimp_human.cheng2021.L_g4_1",
            source_id="A", target_id="B",
            status="candidate_homology", confidence=None, method=None,
            source_dataset_id=None,
        ),
    ]
    regions_by_id = {
        "A": _FakeRegion(id="A", name="A", species_id="species.chimp"),
        "B": _FakeRegion(id="B", name="B", species_id="species.human"),
    }
    species_by_id = {
        "species.chimp": _FakeSpecies(id="species.chimp", scientific_name="Pan troglodytes"),
        "species.human": _FakeSpecies(id="species.human", scientific_name="Homo sapiens"),
    }

    matches = compute_homology_matches(rows, regions_by_id, species_by_id, {}, {})

    assert matches[0].studies == []


def test_compute_homology_matches_includes_the_real_citation_when_the_dataset_has_a_linked_study():
    rows = [
        _FakeHomology(
            id="homology.chimp_human.cheng2021.L_g4_1",
            source_id="A", target_id="B",
            status="candidate_homology", confidence=None, method=None,
            source_dataset_id="dataset.multi.cheng2021.ipl",
        ),
    ]
    regions_by_id = {
        "A": _FakeRegion(id="A", name="A", species_id="species.chimp"),
        "B": _FakeRegion(id="B", name="B", species_id="species.human"),
    }
    species_by_id = {
        "species.chimp": _FakeSpecies(id="species.chimp", scientific_name="Pan troglodytes"),
        "species.human": _FakeSpecies(id="species.human", scientific_name="Homo sapiens"),
    }
    datasets_by_id = {
        "dataset.multi.cheng2021.ipl": _FakeDataset(id="dataset.multi.cheng2021.ipl", study_id="study.multi.cheng2021.cheng_2021"),
    }
    studies_by_id = {
        "study.multi.cheng2021.cheng_2021": _FakeStudy(
            id="study.multi.cheng2021.cheng_2021", name="Cheng et al. 2021", doi="10.7554/eLife.67600", year=2021
        ),
    }

    matches = compute_homology_matches(rows, regions_by_id, species_by_id, datasets_by_id, studies_by_id)

    assert len(matches[0].studies) == 1
    assert matches[0].studies[0].doi == "10.7554/eLife.67600"


def test_compute_homology_matches_skips_a_row_whose_region_is_not_loaded():
    # No debería pasar en la práctica (viene de la propia tabla de
    # homologías), pero si pasa, se descarta en vez de construir una
    # entrada a medias con una región inventada.
    rows = [
        _FakeHomology(
            id="homology.x", source_id="no-existe", target_id="B",
            status="candidate_homology", confidence=None, method=None,
            source_dataset_id=None,
        ),
    ]
    regions_by_id = {"B": _FakeRegion(id="B", name="B", species_id="species.human")}
    species_by_id = {"species.human": _FakeSpecies(id="species.human", scientific_name="Homo sapiens")}

    matches = compute_homology_matches(rows, regions_by_id, species_by_id, {}, {})

    assert matches == []


def test_compute_homology_matches_orders_results_by_homology_id():
    rows = [
        _FakeHomology(id="homology.z", source_id="A", target_id="B", status="candidate_homology", confidence=None, method=None, source_dataset_id=None),
        _FakeHomology(id="homology.a", source_id="A", target_id="B", status="candidate_homology", confidence=None, method=None, source_dataset_id=None),
    ]
    regions_by_id = {
        "A": _FakeRegion(id="A", name="A", species_id="species.chimp"),
        "B": _FakeRegion(id="B", name="B", species_id="species.human"),
    }
    species_by_id = {
        "species.chimp": _FakeSpecies(id="species.chimp", scientific_name="Pan troglodytes"),
        "species.human": _FakeSpecies(id="species.human", scientific_name="Homo sapiens"),
    }

    matches = compute_homology_matches(rows, regions_by_id, species_by_id, {}, {})

    assert [m.id for m in matches] == ["homology.a", "homology.z"]
