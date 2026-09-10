BEGIN;

-- Running upgrade 0012 -> 0013

CREATE TABLE genes (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    species_id VARCHAR NOT NULL, 
    symbol VARCHAR NOT NULL, 
    entrez_id VARCHAR, 
    PRIMARY KEY (id), 
    FOREIGN KEY(species_id) REFERENCES species (id)
);

CREATE TABLE expressions (
    id VARCHAR NOT NULL, 
    region_id VARCHAR NOT NULL, 
    gene_id VARCHAR NOT NULL, 
    value FLOAT NOT NULL, 
    method VARCHAR NOT NULL, 
    donor_count INTEGER NOT NULL, 
    source_dataset_id VARCHAR, 
    algorithm VARCHAR, 
    software_version VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(region_id) REFERENCES regions (id), 
    FOREIGN KEY(gene_id) REFERENCES genes (id)
);

UPDATE alembic_version SET version_num='0013' WHERE alembic_version.version_num = '0012';

COMMIT;

