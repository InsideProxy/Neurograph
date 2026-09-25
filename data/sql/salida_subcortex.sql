-- Alta del atlas de segmentación subcortical estándar de los
-- grayordinates del HCP (Glasser et al., 2013, NeuroImage, DOI
-- 10.1016/j.neuroimage.2013.04.127): 19 regiones (9 pares + tronco
-- del encéfalo) y sus coordenadas reales. Generado por
-- scripts/register_hcp_subcortical_structures.py.

INSERT INTO atlases (id, name, species_id, version) VALUES (
  'atlas.human.hcp.subcortex_grayordinates', 'Segmentación subcortical estándar de los grayordinates del HCP (Glasser et al., 2013, NeuroImage)', 'species.human.ncbi-taxonomy.9606', NULL
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO regions (id, name, abbreviation, species_id, atlas_id, synonyms, hemisphere) VALUES
  ('region.human.hcp-subcortex.brainstem', 'BrainStem', 'brainstem', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_BRAIN_STEM'], NULL),
  ('region.human.hcp-subcortex.l_amygdala', 'Amygdala (hemisferio izquierdo)', 'l_amygdala', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_AMYGDALA_LEFT'], 'L'),
  ('region.human.hcp-subcortex.r_amygdala', 'Amygdala (hemisferio derecho)', 'r_amygdala', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_AMYGDALA_RIGHT'], 'R'),
  ('region.human.hcp-subcortex.l_hippocampus', 'Hippocampus (hemisferio izquierdo)', 'l_hippocampus', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_HIPPOCAMPUS_LEFT'], 'L'),
  ('region.human.hcp-subcortex.r_hippocampus', 'Hippocampus (hemisferio derecho)', 'r_hippocampus', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_HIPPOCAMPUS_RIGHT'], 'R'),
  ('region.human.hcp-subcortex.l_accumbens', 'Accumbens (hemisferio izquierdo)', 'l_accumbens', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_ACCUMBENS_LEFT'], 'L'),
  ('region.human.hcp-subcortex.r_accumbens', 'Accumbens (hemisferio derecho)', 'r_accumbens', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_ACCUMBENS_RIGHT'], 'R'),
  ('region.human.hcp-subcortex.l_caudate', 'Caudate (hemisferio izquierdo)', 'l_caudate', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_CAUDATE_LEFT'], 'L'),
  ('region.human.hcp-subcortex.r_caudate', 'Caudate (hemisferio derecho)', 'r_caudate', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_CAUDATE_RIGHT'], 'R'),
  ('region.human.hcp-subcortex.l_pallidum', 'Pallidum (hemisferio izquierdo)', 'l_pallidum', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_PALLIDUM_LEFT'], 'L'),
  ('region.human.hcp-subcortex.r_pallidum', 'Pallidum (hemisferio derecho)', 'r_pallidum', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_PALLIDUM_RIGHT'], 'R'),
  ('region.human.hcp-subcortex.l_putamen', 'Putamen (hemisferio izquierdo)', 'l_putamen', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_PUTAMEN_LEFT'], 'L'),
  ('region.human.hcp-subcortex.r_putamen', 'Putamen (hemisferio derecho)', 'r_putamen', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_PUTAMEN_RIGHT'], 'R'),
  ('region.human.hcp-subcortex.l_thalamus', 'Thalamus (hemisferio izquierdo)', 'l_thalamus', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_THALAMUS_LEFT'], 'L'),
  ('region.human.hcp-subcortex.r_thalamus', 'Thalamus (hemisferio derecho)', 'r_thalamus', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_THALAMUS_RIGHT'], 'R'),
  ('region.human.hcp-subcortex.l_ventraldiencephalon', 'VentralDiencephalon (hemisferio izquierdo)', 'l_ventraldiencephalon', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_DIENCEPHALON_VENTRAL_LEFT'], 'L'),
  ('region.human.hcp-subcortex.r_ventraldiencephalon', 'VentralDiencephalon (hemisferio derecho)', 'r_ventraldiencephalon', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_DIENCEPHALON_VENTRAL_RIGHT'], 'R'),
  ('region.human.hcp-subcortex.l_cerebellum', 'Cerebellum (hemisferio izquierdo)', 'l_cerebellum', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_CEREBELLUM_LEFT'], 'L'),
  ('region.human.hcp-subcortex.r_cerebellum', 'Cerebellum (hemisferio derecho)', 'r_cerebellum', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_CEREBELLUM_RIGHT'], 'R')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, abbreviation = EXCLUDED.abbreviation, atlas_id = EXCLUDED.atlas_id, synonyms = EXCLUDED.synonyms, hemisphere = EXCLUDED.hemisphere;

INSERT INTO coordinates (id, entity_id, x, y, z, reference_space) VALUES
  ('coordinate.human.hcp-subcortex.brainstem', 'region.human.hcp-subcortex.brainstem', 0.0, -30.0, -32.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.l_amygdala', 'region.human.hcp-subcortex.l_amygdala', -24.0, -4.0, -20.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.r_amygdala', 'region.human.hcp-subcortex.r_amygdala', 24.0, -4.0, -20.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.l_hippocampus', 'region.human.hcp-subcortex.l_hippocampus', -24.0, -22.0, -14.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.r_hippocampus', 'region.human.hcp-subcortex.r_hippocampus', 26.0, -22.0, -14.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.l_accumbens', 'region.human.hcp-subcortex.l_accumbens', -8.0, 10.0, -8.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.r_accumbens', 'region.human.hcp-subcortex.r_accumbens', 8.0, 10.0, -8.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.l_caudate', 'region.human.hcp-subcortex.l_caudate', -12.0, 8.0, 10.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.r_caudate', 'region.human.hcp-subcortex.r_caudate', 14.0, 8.0, 10.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.l_pallidum', 'region.human.hcp-subcortex.l_pallidum', -20.0, -4.0, -2.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.r_pallidum', 'region.human.hcp-subcortex.r_pallidum', 20.0, -4.0, -2.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.l_putamen', 'region.human.hcp-subcortex.l_putamen', -26.0, 0.0, 0.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.r_putamen', 'region.human.hcp-subcortex.r_putamen', 26.0, 2.0, -2.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.l_thalamus', 'region.human.hcp-subcortex.l_thalamus', -10.0, -20.0, 6.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.r_thalamus', 'region.human.hcp-subcortex.r_thalamus', 12.0, -18.0, 6.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.l_ventraldiencephalon', 'region.human.hcp-subcortex.l_ventraldiencephalon', -10.0, -16.0, -10.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.r_ventraldiencephalon', 'region.human.hcp-subcortex.r_ventraldiencephalon', 12.0, -14.0, -10.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.l_cerebellum', 'region.human.hcp-subcortex.l_cerebellum', -24.0, -62.0, -34.0, 'MNI152_FSL_2mm'),
  ('coordinate.human.hcp-subcortex.r_cerebellum', 'region.human.hcp-subcortex.r_cerebellum', 24.0, -62.0, -34.0, 'MNI152_FSL_2mm')
ON CONFLICT (id) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, z = EXCLUDED.z, reference_space = EXCLUDED.reference_space;
