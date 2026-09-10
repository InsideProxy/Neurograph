from backend.ingestion.evolution.motor_sma_synthesis import build_homologies


def test_build_homologies_covers_both_hemispheres_and_all_three_human_regions():
    homologies = build_homologies()
    # 2 hemisferios x 3 regiones humanas (6ma, 6mp, SCEF) = 6.
    assert len(homologies) == 6
    assert len({h.id for h in homologies}) == 6


def test_every_homology_is_uncertain_correspondence_never_candidate():
    homologies = build_homologies()
    # Nunca candidate_homology: ninguna fuente real declara por sí sola
    # esta correspondencia completa (a diferencia de Cheng et al. 2021).
    assert all(h.status == "uncertain_correspondence" for h in homologies)


def test_source_regions_are_the_three_real_human_supplementary_motor_areas():
    homologies = build_homologies()
    human_local_codes = {h.source_id.split(".")[-1].split("_", 1)[1] for h in homologies}
    assert human_local_codes == {"6ma", "6mp", "scef"}


def test_target_is_always_the_real_macaque_sma_of_the_same_hemisphere():
    homologies = build_homologies()
    for h in homologies:
        source_hemi = h.source_id.split(".")[-1].split("_")[0]
        target_hemi = h.target_id.split(".")[-1].split("_")[0]
        assert source_hemi == target_hemi
        assert h.target_id == f"region.macaque.wang2017.{target_hemi}_sma"


def test_known_region_ids_match_the_real_ids_already_loaded():
    homologies = build_homologies()
    one = next(h for h in homologies if h.id == "homology.human_macaque.motor_sma_synthesis.l_6ma_sma")
    assert one.source_id == "region.human.hcp-mmp1.l_6ma"
    assert one.target_id == "region.macaque.wang2017.l_sma"


def test_method_text_flags_scef_as_oculomotor_not_limb_movement():
    homologies = build_homologies()
    scef_row = next(h for h in homologies if h.source_id.endswith("_scef"))
    assert "oculomotora" in scef_row.method
