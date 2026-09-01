BEGIN;

-- Running upgrade 0009 -> 0010

CREATE TABLE mcp_call_log (
    id BIGSERIAL NOT NULL, 
    called_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    tool_name VARCHAR NOT NULL, 
    arguments JSONB NOT NULL, 
    status VARCHAR NOT NULL, 
    result_summary JSONB, 
    error TEXT, 
    duration_ms FLOAT NOT NULL, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_mcp_call_log_tool_name_called_at ON mcp_call_log (tool_name, called_at);

UPDATE alembic_version SET version_num='0010' WHERE alembic_version.version_num = '0009';

COMMIT;

