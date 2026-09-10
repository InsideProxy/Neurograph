BEGIN;

-- Running upgrade 0014 -> 0015

CREATE TABLE tractography_nodes (
    id VARCHAR NOT NULL, 
    name VARCHAR NOT NULL, 
    wmparc_label INTEGER NOT NULL, 
    x FLOAT NOT NULL, 
    y FLOAT NOT NULL, 
    z FLOAT NOT NULL, 
    reference_space VARCHAR NOT NULL, 
    method VARCHAR NOT NULL, 
    PRIMARY KEY (id)
);

CREATE TABLE tractography_edges (
    node_a_id VARCHAR NOT NULL, 
    node_b_id VARCHAR NOT NULL, 
    tract_codes VARCHAR[] NOT NULL, 
    streamlines JSONB NOT NULL, 
    streamline_count_real INTEGER NOT NULL, 
    streamline_count_shown INTEGER NOT NULL, 
    reference_space VARCHAR NOT NULL, 
    method VARCHAR NOT NULL, 
    PRIMARY KEY (node_a_id, node_b_id), 
    FOREIGN KEY(node_a_id) REFERENCES tractography_nodes (id), 
    FOREIGN KEY(node_b_id) REFERENCES tractography_nodes (id)
);

UPDATE alembic_version SET version_num='0015' WHERE alembic_version.version_num = '0014';

COMMIT;

