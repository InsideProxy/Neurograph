"""evidence_level obligatorio en connections (sección 24: nunca asumir
"direct" por omisión en un dato de conectividad).

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-28

"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "connections",
        sa.Column("evidence_level", sa.String(), nullable=False, server_default="indirect"),
    )
    # server_default solo hacía falta para poder añadir la columna sin
    # romper filas existentes; no se deja como comportamiento permanente
    # (sección 24: nunca un valor de evidencia por omisión silenciosa).
    op.alter_column("connections", "evidence_level", server_default=None)


def downgrade() -> None:
    op.drop_column("connections", "evidence_level")
