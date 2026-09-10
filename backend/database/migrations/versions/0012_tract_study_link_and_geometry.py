"""Enlace estructurado tracto -> estudio y geometria real de tractografia
(seccion 6, Fase 7.5/Tractografia -- nueva seccion de interfaz pedida por
la usuaria, 02/09/2026).

`tracts.study_id` sigue exactamente el mismo criterio ya aplicado a
`atlases.study_id` (migracion 0005) y `datasets.study_id` (migracion
0006): antes la cita bibliografica de un tracto solo podia vivir como
texto suelto (los 52 tractos de Yeh et al. 2022 se citan hoy solo via
`datasets.study_id` del dataset que los cargo, sin enlace directo desde
el propio `Tract`). Nullable, sin backfill: los 52 tractos de Yeh 2022
ya cargados quedan `NULL` hasta que alguien decida enlazarlos
explicitamente (no se infiere aqui via su dataset de origen).

Tabla nueva `tract_geometries`: la forma real de un tracto (streamlines
reales de un atlas de tractografia, p. ej. ORG-800FC-100HCP de Zhang et
al. 2018) es un volumen de datos muy distinto al resto de entidades del
proyecto -- un solo tracto real puede traer decenas de miles de puntos
(ver docs/analisis-arquitectura.md, decision de esta tarea) -- asi que
vive en su propia tabla 1:1 con `tracts`, no como una columna mas de
`Tract` ni como filas de `Coordinate` (`Coordinate` es un punto por
entidad, no miles). `streamlines` es JSONB: una lista de streamlines,
cada una una lista de puntos [x, y, z] reales, mismo criterio de
serializacion ya usado para `evidence.detail`. `streamline_count_real`
y `streamline_count_shown` se guardan siempre juntos y por separado --
nunca se descarta silenciosamente una reduccion de datos reales sin
dejar constancia del total real, mismo principio ya aplicado en
`MAX_RENDERED_CONNECTIONS` del frontend (decision 42): aqui la reduccion
ocurre en la propia ingesta, asi que el conteo real tiene que quedar en
la base de datos, no solo en un comentario de codigo.

Revision ID: 0012
Revises: 0011
Create Date: 2026-09-02

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tracts", sa.Column("study_id", sa.String(), sa.ForeignKey("studies.id"), nullable=True))
    op.create_table(
        "tract_geometries",
        sa.Column("tract_id", sa.String(), sa.ForeignKey("tracts.id"), primary_key=True),
        sa.Column("streamlines", postgresql.JSONB(), nullable=False),
        sa.Column("streamline_count_real", sa.Integer(), nullable=False),
        sa.Column("streamline_count_shown", sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("tract_geometries")
    op.drop_column("tracts", "study_id")
