BEGIN;

-- Running upgrade 0005 -> 0006

ALTER TABLE datasets ADD COLUMN study_id VARCHAR;

ALTER TABLE datasets ADD FOREIGN KEY(study_id) REFERENCES studies (id);

UPDATE alembic_version SET version_num='0006' WHERE alembic_version.version_num = '0005';

COMMIT;
