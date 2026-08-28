BEGIN;

-- Running upgrade 0001 -> 0002

CREATE TABLE libraries (
    id VARCHAR NOT NULL, 
    last_known_path VARCHAR, 
    index_schema_version INTEGER NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    last_verified_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id)
);

UPDATE alembic_version SET version_num='0002' WHERE alembic_version.version_num = '0001';

COMMIT;

