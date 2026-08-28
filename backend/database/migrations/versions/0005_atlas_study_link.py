"""Enlace estructurado atlas -> estudio (sección 6): antes la cita
bibliográfica de un atlas solo vivía como texto suelto dentro de su
nombre.

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-28

"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "atlases",
        sa.Column("study_id", sa.String(), sa.ForeignKey("studies.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("atlases", "study_id")
