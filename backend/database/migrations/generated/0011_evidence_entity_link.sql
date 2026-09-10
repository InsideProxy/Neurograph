BEGIN;

-- Running upgrade 0010 -> 0011

ALTER TABLE evidence ADD COLUMN entity_id VARCHAR NOT NULL;

UPDATE alembic_version SET version_num='0011' WHERE alembic_version.version_num = '0010';

COMMIT;

