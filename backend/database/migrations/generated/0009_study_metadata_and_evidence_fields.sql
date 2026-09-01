BEGIN;

-- Running upgrade 0008 -> 0009

ALTER TABLE studies ADD COLUMN authors VARCHAR[];

ALTER TABLE studies ADD COLUMN journal VARCHAR;

ALTER TABLE studies ADD COLUMN abstract TEXT;

ALTER TABLE evidence ADD COLUMN quote TEXT NOT NULL;

ALTER TABLE evidence ADD COLUMN extraction_method VARCHAR NOT NULL;

UPDATE alembic_version SET version_num='0009' WHERE alembic_version.version_num = '0008';

COMMIT;
