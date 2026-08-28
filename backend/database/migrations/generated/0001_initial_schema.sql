BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 0001

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE species (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    scientific_name VARCHAR NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TABLE atlases (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    species_id VARCHAR NOT NULL, 
    version VARCHAR, 
    PRIMARY KEY (id), 
    FOREIGN KEY(species_id) REFERENCES species (id)
);

CREATE TABLE regions (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    species_id VARCHAR NOT NULL, 
    atlas_id VARCHAR, 
    synonyms VARCHAR[], 
    PRIMARY KEY (id), 
    FOREIGN KEY(species_id) REFERENCES species (id), 
    FOREIGN KEY(atlas_id) REFERENCES atlases (id)
);

CREATE TABLE tracts (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    species_id VARCHAR NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(species_id) REFERENCES species (id)
);

CREATE TABLE networks (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TABLE functions (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TABLE studies (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    doi VARCHAR, 
    year INTEGER, 
    PRIMARY KEY (id)
);

CREATE TABLE evidence (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    study_id VARCHAR NOT NULL, 
    kind VARCHAR NOT NULL, 
    detail JSONB, 
    PRIMARY KEY (id), 
    FOREIGN KEY(study_id) REFERENCES studies (id)
);

CREATE TABLE lesions (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TABLE phenotypes (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TABLE coordinates (
    id VARCHAR NOT NULL, 
    entity_id VARCHAR NOT NULL, 
    x FLOAT NOT NULL, 
    y FLOAT NOT NULL, 
    z FLOAT NOT NULL, 
    reference_space VARCHAR NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TABLE datasets (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    format VARCHAR NOT NULL, 
    license VARCHAR, 
    checksum_sha256 VARCHAR, 
    source_dataset_id VARCHAR, 
    algorithm VARCHAR, 
    software_version VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TABLE connections (
    id VARCHAR NOT NULL, 
    source_id VARCHAR NOT NULL, 
    target_id VARCHAR NOT NULL, 
    type VARCHAR NOT NULL, 
    tract_id VARCHAR, 
    weight FLOAT, 
    evidence_ids VARCHAR[], 
    source_dataset_id VARCHAR, 
    algorithm VARCHAR, 
    software_version VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(tract_id) REFERENCES tracts (id)
);

CREATE TABLE homologies (
    id VARCHAR NOT NULL, 
    source_id VARCHAR NOT NULL, 
    target_id VARCHAR NOT NULL, 
    status VARCHAR NOT NULL, 
    confidence FLOAT, 
    method VARCHAR, 
    evidence_ids VARCHAR[], 
    source_dataset_id VARCHAR, 
    algorithm VARCHAR, 
    software_version VARCHAR, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id)
);

INSERT INTO alembic_version (version_num) VALUES ('0001') RETURNING alembic_version.version_num;

COMMIT;

