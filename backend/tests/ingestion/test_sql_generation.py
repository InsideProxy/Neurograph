import pytest

from backend.ingestion.datasets.formats import FormatReadResult
from backend.ingestion.datasets.sql_generation import StudyInfo, generate_ingestion_sql
from backend.ingestion.neuroimaging.gordon333 import GordonMembership, GordonNetworkDef
from backend.ingestion.neuroimaging.hcp_mmp1 import MmpCoordinate, MmpRegion


def _mmp_result(name="V1 (hemisferio izquierdo)"):
    region = MmpRegion(
        id="region.human.hcp-mmp1.L_V1",
        name=name,
        abbreviation="V1",
        raw_label="L_V1_ROI",
        hemisphere="L",
    )
    coordinate = MmpCoordinate(
        id="coordinate.human.hcp-mmp1.L_V1",
        entity_id="region.human.hcp-mmp1.L_V1",
        x=-10.5,
        y=-90.2,
        z=3.1,
        reference_space="fsLR_32k_S1200_groupavg_midthickness_MSMAll",
    )
    return FormatReadResult(regions=[region], coordinates=[coordinate])


def test_generates_species_atlas_regions_and_coordinates():
    sql = generate_ingestion_sql("hcp_mmp1_cifti_dlabel", _mmp_result())

    assert "INSERT INTO species" in sql
    assert "species.human.ncbi-taxonomy.9606" in sql
    assert "INSERT INTO atlases" in sql
    assert "atlas.human.hcp.mmp1_0" in sql
    assert "INSERT INTO regions" in sql
    assert "region.human.hcp-mmp1.L_V1" in sql
    assert "INSERT INTO coordinates" in sql
    assert "coordinate.human.hcp-mmp1.L_V1" in sql
    # Sin estudio aportado: nunca se escribe INSERT INTO studies, y el
    # atlas se da de alta con study_id en NULL (nunca inventado).
    assert "INSERT INTO studies" not in sql
    assert "NULL" in sql  # study_id


def test_single_quotes_are_escaped_never_break_the_sql():
    sql = generate_ingestion_sql("hcp_mmp1_cifti_dlabel", _mmp_result(name="O'Brien's area"))
    assert "O''Brien''s area" in sql
    assert "O'Brien's area" not in sql  # sin escapar no debe aparecer


def test_study_info_is_included_and_linked_when_provided():
    study = StudyInfo(
        id="study.human.hcp.glasser_2016",
        name="Glasser MF et al. (2016). Nature.",
        doi="10.1038/nature18933",
        year=2016,
        authors=["Matthew F. Glasser", "Timothy S. Coalson"],
        journal="Nature",
    )
    sql = generate_ingestion_sql("hcp_mmp1_cifti_dlabel", _mmp_result(), study=study)

    assert "INSERT INTO studies" in sql
    assert "study.human.hcp.glasser_2016" in sql
    assert "10.1038/nature18933" in sql
    assert "study.human.hcp.glasser_2016" in sql.split("INSERT INTO atlases")[1]


def test_networks_and_memberships_are_included_only_when_present():
    result = _mmp_result()
    sql_without = generate_ingestion_sql("hcp_mmp1_cifti_dlabel", result)
    assert "INSERT INTO networks" not in sql_without
    assert "INSERT INTO region_network_memberships" not in sql_without

    network = GordonNetworkDef(id="network.human.gordon333.default", name="Default", slug="default")
    membership = GordonMembership(
        id="membership.human.gordon333.l_default_1",
        region_id="region.human.gordon333.l_default_1",
        network_id="network.human.gordon333.default",
        confidence=1.0,
        method="etiqueta_intrinseca_de_la_parcelacion_de_gordon_et_al_2016_gordon333",
    )
    result_with_networks = FormatReadResult(
        regions=result.regions,
        coordinates=result.coordinates,
        networks=[network],
        memberships=[membership],
    )
    sql_with = generate_ingestion_sql("hcp_mmp1_cifti_dlabel", result_with_networks)
    assert "INSERT INTO networks" in sql_with
    assert "network.human.gordon333.default" in sql_with
    assert "INSERT INTO region_network_memberships" in sql_with
    assert "membership.human.gordon333.l_default_1" in sql_with


def test_rejects_empty_regions_or_coordinates_instead_of_emitting_empty_sql():
    with pytest.raises(ValueError, match="región"):
        generate_ingestion_sql("hcp_mmp1_cifti_dlabel", FormatReadResult(regions=[], coordinates=[]))

    with pytest.raises(ValueError, match="coordenada"):
        generate_ingestion_sql(
            "hcp_mmp1_cifti_dlabel",
            FormatReadResult(regions=_mmp_result().regions, coordinates=[]),
        )


def test_atlas_version_is_null_for_formats_without_one():
    sql = generate_ingestion_sql("brainnetome_nifti_xlsx", _mmp_result())
    atlas_block = sql.split("INSERT INTO atlases")[1].split(";")[0]
    assert "NULL" in atlas_block  # version real de Brainnetome: no declarada
