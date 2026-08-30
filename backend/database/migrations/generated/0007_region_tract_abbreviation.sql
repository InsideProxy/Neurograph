BEGIN;

-- Running upgrade 0006 -> 0007

ALTER TABLE regions ADD COLUMN abbreviation VARCHAR;

ALTER TABLE tracts ADD COLUMN abbreviation VARCHAR;

UPDATE alembic_version SET version_num='0007' WHERE alembic_version.version_num = '0006';

COMMIT;
