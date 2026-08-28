-- Comprobación funcional del esquema inicial: inserta datos de PRUEBA
-- relacionados entre sí (especie -> región -> estudio -> evidencia ->
-- conexión), verifica que las relaciones y los tipos de datos especiales
-- (JSONB, arrays) funcionan con una consulta real, y deshace todo al
-- final (ROLLBACK) para no dejar nada guardado en la base de datos.
BEGIN;

INSERT INTO species (id, name, scientific_name) VALUES
  ('species.human', 'Humano', 'Homo sapiens');

INSERT INTO regions (id, name, species_id, synonyms) VALUES
  ('region.human.demo.area44', 'Área 44', 'species.human', ARRAY['Pars opercularis', 'Broca area 44']);

INSERT INTO studies (id, name, doi, year) VALUES
  ('study.demo.001', 'Estudio de prueba', '10.0000/demo', 2020);

INSERT INTO evidence (id, name, study_id, kind, detail) VALUES
  ('evidence.demo.001', 'Evidencia de prueba', 'study.demo.001', 'experimental_evidence', '{"sample_size": 20, "methodology": "fMRI"}');

INSERT INTO regions (id, name, species_id) VALUES
  ('region.human.demo.area22', 'Área 22', 'species.human');

INSERT INTO connections (id, source_id, target_id, type, weight, evidence_ids, created_at) VALUES
  ('conn.demo.verify', 'region.human.demo.area44', 'region.human.demo.area22', 'structural', 0.73, ARRAY['evidence.demo.001'], now());

-- Consulta de verificación: une región -> conexión -> evidencia -> estudio.
SELECT
  r.name AS region,
  r.synonyms,
  c.type AS connection_type,
  c.weight,
  e.kind AS evidence_kind,
  e.detail,
  s.name AS study
FROM connections c
JOIN regions r ON r.id = c.source_id
JOIN evidence e ON e.id = ANY(c.evidence_ids)
JOIN studies s ON s.id = e.study_id
WHERE c.id = 'conn.demo.verify';

-- Comprobación negativa: esto DEBE fallar (viola la clave foránea), lo
-- que confirma que la integridad referencial está realmente activa y no
-- solo declarada. Si no falla, algo está mal.
INSERT INTO regions (id, name, species_id) VALUES ('region.invalida', 'No debería poder crearse', 'species.que.no.existe');

ROLLBACK;
