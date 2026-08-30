BEGIN;

-- Running upgrade 0007 -> 0008

ALTER TABLE regions ADD COLUMN hemisphere VARCHAR;

UPDATE alembic_version SET version_num='0008' WHERE alembic_version.version_num = '0007';

COMMIT;
