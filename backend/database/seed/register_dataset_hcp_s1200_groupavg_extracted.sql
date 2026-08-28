-- Alta del dataset derivado "HCP S1200 Group Average (descomprimido)" (Fase 2).
-- Es 100% regenerable a partir de dataset.human.hcp.s1200_groupavg (el zip
-- original, intacto en original/atlases/hcp_s1200_groupavg/); por eso no
-- lleva checksum propio ni licencia distinta a la del original. Ficha
-- completa en E:\NeuroData\derived\extracted\hcp_s1200_groupavg\dataset.yaml.
INSERT INTO datasets (id, name, format, license, checksum_sha256, source_dataset_id, algorithm, software_version, created_at)
VALUES (
  'dataset.human.hcp.s1200_groupavg_extracted',
  'HCP S1200 Group Average Data Release (descomprimido)',
  'CIFTI/GIFTI/NIfTI sueltos (sin comprimir), extraídos de dataset.human.hcp.s1200_groupavg',
  'HCP Data Use Terms (aceptados por la investigadora al registrarse en BALSA)',
  NULL,
  'dataset.human.hcp.s1200_groupavg',
  'descompresión (unzip + rsync --append-verify)',
  'unzip 6.0 / rsync 3.2.7',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  format = EXCLUDED.format,
  license = EXCLUDED.license,
  source_dataset_id = EXCLUDED.source_dataset_id,
  algorithm = EXCLUDED.algorithm,
  software_version = EXCLUDED.software_version;
