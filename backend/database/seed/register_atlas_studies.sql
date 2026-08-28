-- Publicaciones que definen cada atlas ya cargado, enlazadas de
-- forma estructurada (antes solo texto suelto en atlases.name).
-- DOI verificados contra la web del editor / el redirect oficial del
-- DOI el 28/08/2026, no adivinados.
-- Generado por scripts/register_atlas_studies.py.

INSERT INTO studies (id, name, doi, year) VALUES
  ('study.human.hcp.glasser_2016', 'Glasser MF, Coalson TS, Robinson EC, et al. (2016). A multi-modal parcellation of human cerebral cortex. Nature, 536(7615), 171-178.', '10.1038/nature18933', 2016),
  ('study.human.brainnetome.fan_2016', 'Fan L, Li H, Zhuo J, et al. (2016). The Human Brainnetome Atlas: A New Brain Atlas Based on Connectional Architecture. Cerebral Cortex, 26(8), 3508-3526.', '10.1093/cercor/bhw157', 2016),
  ('study.human.gordon333.gordon_2016', 'Gordon EM, Laumann TO, Adeyemo B, Huckins JF, Kelley WM, Petersen SE (2016). Generation and Evaluation of a Cortical Area Parcellation from Resting-State Correlations. Cerebral Cortex, 26(1), 288-303.', '10.1093/cercor/bhu239', 2016),
  ('study.human.hcp.glasser_2013', 'Glasser MF, Sotiropoulos SN, Wilson JA, Coalson TS, Fischl B, Andersson JL, Xu J, Jbabdi S, Webster M, Polimeni JR, Van Essen DC, Jenkinson M (2013). The minimal preprocessing pipelines for the Human Connectome Project. NeuroImage, 80, 105-124.', '10.1016/j.neuroimage.2013.04.127', 2013)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, doi = EXCLUDED.doi, year = EXCLUDED.year;

UPDATE atlases SET study_id = 'study.human.hcp.glasser_2016' WHERE id = 'atlas.human.hcp.mmp1_0';
UPDATE atlases SET study_id = 'study.human.brainnetome.fan_2016' WHERE id = 'atlas.human.brainnetome.bna_246';
UPDATE atlases SET study_id = 'study.human.gordon333.gordon_2016' WHERE id = 'atlas.human.gordon333.cortex';
UPDATE atlases SET study_id = 'study.human.hcp.glasser_2013' WHERE id = 'atlas.human.hcp.subcortex_grayordinates';
