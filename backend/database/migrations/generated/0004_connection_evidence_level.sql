BEGIN;

-- Running upgrade 0003 -> 0004

ALTER TABLE connections ADD COLUMN evidence_level VARCHAR DEFAULT 'indirect' NOT NULL;

ALTER TABLE connections ALTER COLUMN evidence_level DROP DEFAULT;

UPDATE alembic_version SET version_num='0004' WHERE alembic_version.version_num = '0003';

COMMIT;

