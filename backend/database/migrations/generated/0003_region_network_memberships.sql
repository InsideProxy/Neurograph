BEGIN;

-- Running upgrade 0002 -> 0003

CREATE TABLE region_network_memberships (
    id VARCHAR NOT NULL, 
    region_id VARCHAR NOT NULL, 
    network_id VARCHAR NOT NULL, 
    confidence FLOAT NOT NULL, 
    method VARCHAR NOT NULL, 
    source_dataset_id VARCHAR, 
    algorithm VARCHAR, 
    software_version VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(region_id) REFERENCES regions (id), 
    FOREIGN KEY(network_id) REFERENCES networks (id)
);

UPDATE alembic_version SET version_num='0003' WHERE alembic_version.version_num = '0002';

COMMIT;

