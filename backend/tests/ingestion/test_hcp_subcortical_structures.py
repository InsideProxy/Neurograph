from pathlib import Path

import pytest

from backend.ingestion.neuroimaging.hcp_subcortical_structures import (
    ATLAS_ID,
    SPECIES_ID,
    known_structures,
    local_code,
    read_hcp_subcortical_regions,
    region_name,
)


def test_known_structures_has_19_entries_9_pairs_plus_brainstem():
    structures = known_structures()
    assert len(structures) == 19
    paired = [s for s in structures if s.hemisphere is not None]
    unpaired = [s for s in structures if s.hemisphere is None]
    assert len(paired) == 18
    assert len(unpaired) == 1
    assert unpaired[0].word == "BrainStem"


def test_local_code_includes_hemisphere_for_paired_structures():
    structures = {s.word: s for s in known_structures() if s.hemisphere == "L"}
    assert local_code(structures["Amygdala"]) == "l_amygdala"


def test_local_code_has_no_hemisphere_for_brainstem():
    brainstem = next(s for s in known_structures() if s.word == "BrainStem")
    assert local_code(brainstem) == "brainstem"


def test_region_name_mentions_hemisphere_only_when_relevant():
    brainstem = next(s for s in known_structures() if s.word == "BrainStem")
    assert "hemisferio" not in region_name(brainstem)
    left_amygdala = next(s for s in known_structures() if s.word == "Amygdala" and s.hemisphere == "L")
    assert "izquierdo" in region_name(left_amygdala)


def test_read_hcp_subcortical_regions_builds_stable_ontology_ids():
    regions = read_hcp_subcortical_regions()
    assert len(regions) == 19
    assert len({r.id for r in regions}) == 19
    assert "region.human.hcp-subcortex.l_amygdala" in {r.id for r in regions}
    assert "region.human.hcp-subcortex.brainstem" in {r.id for r in regions}


def test_atlas_and_species_ids_follow_ontology_scheme():
    assert SPECIES_ID == "species.human.ncbi-taxonomy.9606"
    assert ATLAS_ID == "atlas.human.hcp.subcortex_grayordinates"


_HCP_DIR = (
    Path.home() / "mnt" / "NeuroData" / "derived" / "extracted" / "hcp_s1200_groupavg"
    / "HCP_S1200_Atlas_Z4_pkXDZ"
)
_GORDON_DLABEL = _HCP_DIR / "Gordon333.32k_fs_LR.dlabel.nii"
# HCP-MMP1.0 no sirve para esta comprobación: su .dlabel.nii solo tiene
# 59412 grayordinates (corteza), sin eje subcortical alguno (comprobado
# el 28/08/2026) — se usa en su lugar el archivo de Cole-Anticevic, que sí
# trae el espacio completo de 91282 grayordinates.
_CA_DLABEL = (
    _HCP_DIR / "CortexSubcortex_ColeAnticevic_NetPartition_wSubcorGSR_netassignments_LR.dlabel.nii"
)

_REQUIRES_REAL_DATA = pytest.mark.skipif(
    not (_GORDON_DLABEL.exists() and _CA_DLABEL.exists()),
    reason="requiere la biblioteca de datos real (E:\\NeuroData) montada",
)


@_REQUIRES_REAL_DATA
def test_read_hcp_subcortical_coordinates_against_real_file():
    from backend.ingestion.neuroimaging.hcp_subcortical_structures import (
        read_hcp_subcortical_coordinates,
    )

    coords = read_hcp_subcortical_coordinates(_GORDON_DLABEL)
    assert len(coords) == 19
    assert len({c.id for c in coords}) == 19
    assert all(c.reference_space == "MNI152_FSL_2mm" for c in coords)

    left_amygdala = next(c for c in coords if c.id.endswith(".l_amygdala"))
    right_amygdala = next(c for c in coords if c.id.endswith(".r_amygdala"))
    assert left_amygdala.x < 0
    assert right_amygdala.x > 0

    brainstem = next(c for c in coords if c.id.endswith(".brainstem"))
    # el tronco del encéfalo es una estructura de la línea media
    assert abs(brainstem.x) < 5


@_REQUIRES_REAL_DATA
def test_spatial_axis_is_identical_across_different_cifti_files_of_the_same_package():
    """No se asume que el eje espacial es el mismo en cualquier archivo
    del paquete: se comprueba leyéndolo de dos archivos distintos
    (Gordon333 y Cole-Anticevic) y verificando que dan la misma
    coordenada."""
    from backend.ingestion.neuroimaging.hcp_subcortical_structures import (
        read_hcp_subcortical_coordinates,
    )

    coords_from_gordon = {c.id: (c.x, c.y, c.z) for c in read_hcp_subcortical_coordinates(_GORDON_DLABEL)}
    coords_from_ca = {c.id: (c.x, c.y, c.z) for c in read_hcp_subcortical_coordinates(_CA_DLABEL)}
    assert coords_from_gordon == coords_from_ca
