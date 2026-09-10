"""Espacio de referencia real de la geometria de tractografia (decision
63, 08/09/2026): la usuaria pidio una malla de fondo anatomica para la
vista de Tractografia 3D ("construir una malla o descargar un cerebro
para ponerlo en la parte de tractografia"). Antes de anadir esa malla,
esta migracion cierra una inconsistencia real de arquitectura: cada
`Coordinate` (region) ya declara su `reference_space` explicito desde
el primer dia (migracion 0001), pero `tract_geometries` (migracion
0012) nunca lo hizo -- el espacio de ORG-800FC-100HCP solo vivia como
comentario en el docstring de `backend/ingestion/tractography/
org_atlas.py`, nunca como dato verificable en la propia base de datos.

Backfill real, no un DEFAULT de esquema silencioso: las 41 filas ya
cargadas son, todas, del mismo atlas (Zhang et al. 2018,
ORG-800FC-100HCP) -- se rellenan aqui con su valor real y verificado
("ORG_800FC_100HCP_groupwise", ver org_atlas.REFERENCE_SPACE), nunca
con un valor generico. `scripts/generate_org_tractography_geometry.py`
ya se actualizo para declarar este mismo valor en cualquier carga
futura, asi que un NOT NULL sin DEFAULT es seguro desde ya: nunca
volvera a faltar.

Revision ID: 0014
Revises: 0013
Create Date: 2026-09-08

"""
import sqlalchemy as sa
from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None

REFERENCE_SPACE = "ORG_800FC_100HCP_groupwise"


def upgrade() -> None:
    op.add_column("tract_geometries", sa.Column("reference_space", sa.String(), nullable=True))
    op.execute(
        sa.text("UPDATE tract_geometries SET reference_space = :space WHERE reference_space IS NULL")
        .bindparams(space=REFERENCE_SPACE)
    )
    op.alter_column("tract_geometries", "reference_space", nullable=False)


def downgrade() -> None:
    op.drop_column("tract_geometries", "reference_space")
