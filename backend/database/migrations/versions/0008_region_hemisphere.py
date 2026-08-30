"""Hemisferio real de `regions` (sección 20; petición de la usuaria,
30/08/2026: panel "Hemisferios 2D" para ilustrar la diferencia entre
conectividad inter- e intra-hemisférica). No es un dato nuevo de la
ontología: las cuatro ingestas de neuroimagen ya calculan qué hemisferio
es cada región (para construir su `local_code`/`area_code`, p. ej. el
prefijo "L_"/"R_"), pero antes ese valor se descartaba tras usarlo. Esta
migración solo le da una columna propia, igual que hizo la 0007 con
`abbreviation`.

Nullable por dos motivos distintos: las filas ya cargadas antes de esta
migración quedan `NULL` hasta el backfill; y, por separado, existen
estructuras reales legítimamente sin lateralidad (el tronco del
encéfalo, en el subcórtex del HCP) -- para esas, `NULL` es el valor
correcto para siempre, no un valor pendiente de rellenar.

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-30

"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("regions", sa.Column("hemisphere", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("regions", "hemisphere")
