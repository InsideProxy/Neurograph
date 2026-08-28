"""Tabla de bibliotecas de datos conectadas (secciones 2 y 26).

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-28

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "libraries",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("last_known_path", sa.String(), nullable=True),
        sa.Column("index_schema_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("libraries")
