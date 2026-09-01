-- dataset.human.mni152_fsl_2mm
INSERT INTO datasets (id, name, format, license, checksum_sha256, created_at)
VALUES (
  'dataset.human.mni152_fsl_2mm', 'MNI152_T1_2mm (plantilla estandar de FSL, 6th Generation no lineal, version asimetrica)', 'NIfTI (T1 y mascara cerebral binaria dilatada), rejilla 91x109x91 a 2mm isotropico',
  'terminos de HCPpipelines/FSL (uso academico/investigacion), redistribuida sin modificar', 'c0bb0ac4d94110972cc78017ac96e744389449b0a6d3bb9abb5ad31f365d8c08', now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  format = EXCLUDED.format,
  license = EXCLUDED.license,
  checksum_sha256 = EXCLUDED.checksum_sha256;

-- dataset.human.brain_meshes_3d
INSERT INTO datasets (id, name, format, license, checksum_sha256, created_at)
VALUES (
  'dataset.human.brain_meshes_3d', 'Mallas de fondo del cerebro 3D (fsLR + MNI152_FSL_2mm)', 'gLTF binario (.glb), un unico mesh triangular por archivo',
  'derivado; hereda las licencias de sus fuentes (S1200 HCP + MNI152_FSL_2mm)', '32ebc0bd2cba60dbf5830f2d5b8453f0a8a32aeb162e1f68bb6db679efcc1ac2', now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  format = EXCLUDED.format,
  license = EXCLUDED.license,
  checksum_sha256 = EXCLUDED.checksum_sha256;

