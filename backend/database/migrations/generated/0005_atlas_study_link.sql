BEGIN;

-- Running upgrade 0004 -> 0005

ALTER TABLE atlases ADD COLUMN study_id VARCHAR;

ALTER TABLE atlases ADD FOREIGN KEY(study_id) REFERENCES studies (id);

UPDATE alembic_version SET version_num='0005' WHERE alembic_version.version_num = '0004';

COMMIT;

