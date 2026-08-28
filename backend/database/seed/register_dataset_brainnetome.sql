-- Alta del dataset Brainnetome Atlas (Fase 2/4).
-- La ficha completa de procedencia, con el checksum de cada archivo por
-- separado, vive en
-- E:\NeuroData\original\atlases\brainnetome\dataset.yaml -- esta fila es
-- solo el indice estructurado/consultable. checksum_sha256 aqui es un
-- checksum COMBINADO (ver backend/library/dataset_registration.py):
-- no hay un unico archivo contenedor como en el paquete HCP.
INSERT INTO datasets (id, name, format, license, checksum_sha256, created_at)
VALUES (
  'dataset.human.brainnetome.bna_246', 'Brainnetome Atlas (BN_Atlas)', 'Volumenes NIfTI de etiquetas (1/2/3mm), mapas de probabilidad de conectividad (BNA_SC, BNA_PM) y tabla de nombres anatomicos (xlsx)',
  'uso academico/investigacion segun los terminos de descarga del Brainnetome Center (sin identificador de licencia formal publicado)', '658dc6305a751887b1e0b3697db9a0874b7e2c1c602e654f367225a60cbf92f0', now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  format = EXCLUDED.format,
  license = EXCLUDED.license,
  checksum_sha256 = EXCLUDED.checksum_sha256;

