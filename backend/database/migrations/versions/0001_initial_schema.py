"""Esquema inicial: entidades de la ontología (sección 6) y conexiones.

Revision ID: 0001
Revises:
Create Date: 2026-08-28

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # pgvector se activa ya aunque todavía no haya columnas vector: se
    # necesitará en cuanto la Fase 6 (literatura) añada embeddings.
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "species",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("scientific_name", sa.String(), nullable=False),
    )

    op.create_table(
        "atlases",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("species_id", sa.String(), sa.ForeignKey("species.id"), nullable=False),
        sa.Column("version", sa.String(), nullable=True),
    )

    op.create_table(
        "regions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("species_id", sa.String(), sa.ForeignKey("species.id"), nullable=False),
        sa.Column("atlas_id", sa.String(), sa.ForeignKey("atlases.id"), nullable=True),
        sa.Column("synonyms", postgresql.ARRAY(sa.String()), nullable=True),
    )

    op.create_table(
        "tracts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("species_id", sa.String(), sa.ForeignKey("species.id"), nullable=False),
    )

    op.create_table(
        "networks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
    )

    op.create_table(
        "functions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
    )

    op.create_table(
        "studies",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("doi", sa.String(), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
    )

    op.create_table(
        "evidence",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("study_id", sa.String(), sa.ForeignKey("studies.id"), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("detail", postgresql.JSONB(), nullable=True),
    )

    op.create_table(
        "lesions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
    )

    op.create_table(
        "phenotypes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
    )

    op.create_table(
        "coordinates",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("entity_id", sa.String(), nullable=False),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.Column("z", sa.Float(), nullable=False),
        # Sistema de referencia explícito (MNI152, Talairach, nativo de la
        # especie...): ver riesgo señalado en docs/analisis-arquitectura.md.
        sa.Column("reference_space", sa.String(), nullable=False),
    )

    op.create_table(
        "datasets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("format", sa.String(), nullable=False),
        sa.Column("license", sa.String(), nullable=True),
        sa.Column("checksum_sha256", sa.String(), nullable=True),
        sa.Column("source_dataset_id", sa.String(), nullable=True),
        sa.Column("algorithm", sa.String(), nullable=True),
        sa.Column("software_version", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "connections",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("source_id", sa.String(), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        # No mezclar tipos de conectividad (sección 8): structural/functional/effective.
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("tract_id", sa.String(), sa.ForeignKey("tracts.id"), nullable=True),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.Column("evidence_ids", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("source_dataset_id", sa.String(), nullable=True),
        sa.Column("algorithm", sa.String(), nullable=True),
        sa.Column("software_version", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "homologies",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("source_id", sa.String(), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        # confirmed_homology / candidate_homology / analogy / similarity /
        # functional_correspondence / uncertain_correspondence (sección 11):
        # nunca se colapsan en una única categoría de "relación".
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("method", sa.String(), nullable=True),
        sa.Column("evidence_ids", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("source_dataset_id", sa.String(), nullable=True),
        sa.Column("algorithm", sa.String(), nullable=True),
        sa.Column("software_version", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("homologies")
    op.drop_table("connections")
    op.drop_table("datasets")
    op.drop_table("coordinates")
    op.drop_table("phenotypes")
    op.drop_table("lesions")
    op.drop_table("evidence")
    op.drop_table("studies")
    op.drop_table("functions")
    op.drop_table("networks")
    op.drop_table("tracts")
    op.drop_table("regions")
    op.drop_table("atlases")
    op.drop_table("species")
