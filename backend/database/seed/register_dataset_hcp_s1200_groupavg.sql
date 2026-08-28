-- Alta del dataset HCP S1200 Group Average (Fase 2).
-- La ficha completa de procedencia vive en
-- E:\NeuroData\original\atlases\hcp_s1200_groupavg\dataset.yaml — esta fila
-- es solo el índice estructurado/consultable (identidad, formato, licencia,
-- checksum); el relato de procedencia completo queda en el yaml, que es la
-- fuente de verdad para reproducibilidad (sección 23).
INSERT INTO datasets (id, name, format, license, checksum_sha256, created_at)
VALUES (
  'dataset.human.hcp.s1200_groupavg',
  'HCP S1200 Group Average Data Release',
  'Paquete mixto CIFTI/GIFTI/NIfTI (.dscalar.nii, .dlabel.nii, .surf.gii, .nii.gz, .border, .scene)',
  'HCP Data Use Terms (aceptados por la investigadora al registrarse en BALSA)',
  'b6e9bc1c2942479a28344b2dd5ee79e4849fb66e69ccebae42fbd29a543d7b12',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  format = EXCLUDED.format,
  license = EXCLUDED.license,
  checksum_sha256 = EXCLUDED.checksum_sha256;
