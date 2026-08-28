-- Publicaciones que definen cada atlas ya cargado, enlazadas de
-- forma estructurada (antes solo texto suelto en atlases.name).
-- DOI verificados en la web del editor el 28/08/2026, no adivinados.
-- Generado por scripts/register_atlas_studies.py.

INSERT INTO studies (id, name, doi, year) VALUES
  ('study.human.hcp.glasser_2016', 'Glasser MF, Coalson TS, Robinson EC, et al. (2016). A multi-modal parcellation of human cerebral cortex. Nature, 536(7615), 171-178.', '10.1038/nature18933', 2016),
  ('study.human.brainnetome.fan_2016', 'Fan L, Li H, Zhuo J, et al. (2016). The Human Brainnetome Atlas: A New Brain Atlas Based on Connectional Architecture. Cerebral Cortex, 26(8), 3508-3526.', '10.1093/cercor/bhw157', 2016)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, doi = EXCLUDED.doi, year = EXCLUDED.year;

UPDATE atlases SET study_id = 'study.human.hcp.glasser_2016' WHERE id = 'atlas.human.hcp.mmp1_0';
UPDATE atlases SET study_id = 'study.human.brainnetome.fan_2016' WHERE id = 'atlas.human.brainnetome.bna_246';
