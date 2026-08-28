-- Alta del atlas de segmentación subcortical estándar de los
-- grayordinates del HCP (Glasser et al., 2013, NeuroImage, DOI
-- 10.1016/j.neuroimage.2013.04.127): 19 regiones (9 pares + tronco
-- del encéfalo) y sus coordenadas reales. Generado por
-- scripts/register_hcp_subcortical_structures.py.

INSERT INTO atlases (id, name, species_id, version) VALUES (
  'atlas.human.hcp.subcortex_grayordinates', 'Segmentación subcortical estándar de los grayordinates del HCP (Glasser et al., 2013, NeuroImage)', 'species.human.ncbi-taxonomy.9606', NULL
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO regions (id, name, species_id, atlas_id, synonyms) VALUES
  ('region.human.hcp-subcortex.brainstem', 'BrainStem', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_BRAIN_STEM']),
  ('region.human.hcp-subcortex.l_amygdala', 'Amygdala (hemisferio izquierdo)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_AMYGDALA_LEFT']),
  ('region.human.hcp-subcortex.r_amygdala', 'Amygdala (hemisferio derecho)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_AMYGDALA_RIGHT']),
  ('region.human.hcp-subcortex.l_hippocampus', 'Hippocampus (hemisferio izquierdo)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_HIPPOCAMPUS_LEFT']),
  ('region.human.hcp-subcortex.r_hippocampus', 'Hippocampus (hemisferio derecho)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_HIPPOCAMPUS_RIGHT']),
  ('region.human.hcp-subcortex.l_accumbens', 'Accumbens (hemisferio izquierdo)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_ACCUMBENS_LEFT']),
  ('region.human.hcp-subcortex.r_accumbens', 'Accumbens (hemisferio derecho)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_ACCUMBENS_RIGHT']),
  ('region.human.hcp-subcortex.l_caudate', 'Caudate (hemisferio izquierdo)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_CAUDATE_LEFT']),
  ('region.human.hcp-subcortex.r_caudate', 'Caudate (hemisferio derecho)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_CAUDATE_RIGHT']),
  ('region.human.hcp-subcortex.l_pallidum', 'Pallidum (hemisferio izquierdo)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_PALLIDUM_LEFT']),
  ('region.human.hcp-subcortex.r_pallidum', 'Pallidum (hemisferio derecho)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_PALLIDUM_RIGHT']),
  ('region.human.hcp-subcortex.l_putamen', 'Putamen (hemisferio izquierdo)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_PUTAMEN_LEFT']),
  ('region.human.hcp-subcortex.r_putamen', 'Putamen (hemisferio derecho)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_PUTAMEN_RIGHT']),
  ('region.human.hcp-subcortex.l_thalamus', 'Thalamus (hemisferio izquierdo)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_THALAMUS_LEFT']),
  ('region.human.hcp-subcortex.r_thalamus', 'Thalamus (hemisferio derecho)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_THALAMUS_RIGHT']),
  ('region.human.hcp-subcortex.l_ventraldiencephalon', 'VentralDiencephalon (hemisferio izquierdo)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_DIENCEPHALON_VENTRAL_LEFT']),
  ('region.human.hcp-subcortex.r_ventraldiencephalon', 'VentralDiencephalon (hemisferio derecho)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_DIENCEPHALON_VENTRAL_RIGHT']),
  ('region.human.hcp-subcortex.l_cerebellum', 'Cerebellum (hemisferio izquierdo)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_CEREBELLUM_LEFT']),
  ('region.human.hcp-subcortex.r_cerebellum', 'Cerebellum (hemisferio derecho)', 'species.human.ncbi-taxonomy.9606', 'atlas.human.hcp.subcortex_grayordinates', ARRAY['CIFTI_STRUCTURE_CEREBELLUM_RIGHT'])
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, atlas_id = EXCLUDED.atlas_id, synonyms = EXCLUDED.synonyms;

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
