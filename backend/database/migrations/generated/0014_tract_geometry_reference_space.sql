BEGIN;

-- Running upgrade 0013 -> 0014

ALTER TABLE tract_geometries ADD COLUMN reference_space VARCHAR;

UPDATE tract_geometries SET reference_space = 'ORG_800FC_100HCP_groupwise' WHERE reference_space IS NULL;

ALTER TABLE tract_geometries ALTER COLUMN reference_space SET NOT NULL;

UPDATE alembic_version SET version_num='0014' WHERE alembic_version.version_num = '0013';

COMMIT;
