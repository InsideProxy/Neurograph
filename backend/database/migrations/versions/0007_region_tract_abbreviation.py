"""Abreviatura propia de `regions` y `tracts` (sección 20; petición de la
usuaria, 30/08/2026, durante la sesión de diseño de interfaz): la
interfaz necesita distinguir el código corto que se dibuja junto a cada
nodo (p. ej. "V1", "44", "L_SFG_7_1") del nombre completo que se muestra
en el recuadro de detalle (`name`, ya existente) -- hasta ahora ambos
vivían fusionados en un único campo `name`. No es un campo nuevo de la
ontología: cada módulo de ingesta ya calculaba este código para construir
el identificador (`local_code`/`area_code`/`header_code`); esta migración
solo le da una columna propia en vez de descartarlo tras usarlo para el
id. Nullable porque las filas ya cargadas antes de esta migración no
tienen valor todavía -- se rellenan volviendo a ejecutar los propios
`scripts/register_*.py` de cada atlas (ya usan `INSERT ... ON CONFLICT
DO UPDATE` contra los mismos archivos de origen reales), no con esta
migración (una migración de esquema no debe además calcular datos
derivados de archivos externos). Corregido el 30/08/2026: esta nota
mencionaba antes un script `backfill_region_and_tract_abbreviations.py`
que nunca llegó a crearse -- el backfill real, documentado en la
decisión 12 de `docs/analisis-arquitectura.md`, siempre fue reejecutar
los scripts de registro existentes.

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-30

"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("regions", sa.Column("abbreviation", sa.String(), nullable=True))
    op.add_column("tracts", sa.Column("abbreviation", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("tracts", "abbreviation")
    op.drop_column("regions", "abbreviation")
