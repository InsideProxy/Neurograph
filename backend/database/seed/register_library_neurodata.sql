INSERT INTO libraries (id, last_known_path, index_schema_version, created_at, last_verified_at)
VALUES ('b5f2da87-38a7-49c6-88dd-824b5d9c00b0', 'E:\NeuroData', 1, '2026-08-28T06:29:47.866675+00:00', now())
ON CONFLICT (id) DO UPDATE SET
  last_known_path = EXCLUDED.last_known_path,
  last_verified_at = now();

