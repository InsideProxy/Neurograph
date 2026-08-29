"""Enlace estructurado dataset -> estudio (sección 6), mismo criterio que
0005_atlas_study_link.py: antes la cita bibliográfica de un dataset solo
podía vivir como texto suelto dentro de su nombre.

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-29

"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "datasets",
        sa.Column("study_id", sa.String(), sa.ForeignKey("studies.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("datasets", "study_id")
