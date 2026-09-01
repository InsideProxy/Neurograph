"""Auditoría de llamadas MCP (sección 23, Fase 10 -- interfaz IA-usuario-
programa). Tabla nueva `mcp_call_log`: no es una entidad científica de
la ontología (sección 6), es telemetría operativa sobre el uso de las
herramientas MCP -- por eso usa una clave autoincremental (`id`
bigserial) en vez del esquema `<tipo>.<especie>.<fuente>.<código>` de
`build_id`.

Decisión de la usuaria, 31/08/2026: registrar cada llamada en una tabla
de PostgreSQL (consultable con SQL, coherente con "PostgreSQL como única
fuente de verdad" del resto del proyecto), no en un archivo de log
local. Ver decisión 27 de docs/analisis-arquitectura.md para el
razonamiento completo del alcance de esta fase (qué herramientas se
construyen primero y por qué).

`result_summary` guarda un resumen real del resultado (recuento + una
muestra de sus primeros elementos reales), nunca el resultado completo
ni un valor inventado -- ver docstring de `backend/mcp/audit.py`.

Revision ID: 0010
Revises: 0009
Create Date: 2026-08-31

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mcp_call_log",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "called_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("tool_name", sa.String(), nullable=False),
        sa.Column("arguments", postgresql.JSONB(), nullable=False),
        # ok | error
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("result_summary", postgresql.JSONB(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Float(), nullable=False),
    )
    # Consulta esperada más habitual (sección 23: reproducibilidad):
    # "qué llamó esta herramienta, en orden" -- índice compuesto en vez
    # de uno solo por tool_name, para que también sirva ordenado por
    # fecha sin un sort aparte.
    op.create_index("ix_mcp_call_log_tool_name_called_at", "mcp_call_log", ["tool_name", "called_at"])


def downgrade() -> None:
    op.drop_index("ix_mcp_call_log_tool_name_called_at", table_name="mcp_call_log")
    op.drop_table("mcp_call_log")
