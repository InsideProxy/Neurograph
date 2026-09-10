BEGIN;

-- Running upgrade 0011 -> 0012

ALTER TABLE tracts ADD COLUMN study_id VARCHAR;

ALTER TABLE tracts ADD FOREIGN KEY(study_id) REFERENCES studies (id);

CREATE TABLE tract_geometries (
    tract_id VARCHAR NOT NULL, 
    streamlines JSONB NOT NULL, 
    streamline_count_real INTEGER NOT NULL, 
    streamline_count_shown INTEGER NOT NULL, 
    PRIMARY KEY (tract_id), 
    FOREIGN KEY(tract_id) REFERENCES tracts (id)
);

UPDATE alembic_version SET version_num='0012' WHERE alembic_version.version_num = '0011';

COMMIT;

