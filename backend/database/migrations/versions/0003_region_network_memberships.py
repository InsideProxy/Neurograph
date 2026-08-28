"""Pertenencia de región a red funcional (derivada, p. ej. Cole-Anticevic).

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-28

"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "region_network_memberships",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("region_id", sa.String(), sa.ForeignKey("regions.id"), nullable=False),
        sa.Column("network_id", sa.String(), sa.ForeignKey("networks.id"), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("method", sa.String(), nullable=False),
        sa.Column("source_dataset_id", sa.String(), nullable=True),
        sa.Column("algorithm", sa.String(), nullable=True),
        sa.Column("software_version", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("region_network_memberships")
