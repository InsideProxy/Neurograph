"""Enlace explícito de `evidence` a la entidad concreta del grafo que
respalda -- región, red o conexión (sección 6/12/24, continuación de la
Fase 6 -- Literatura). Decisión de la usuaria, 02/09/2026: "nuevo enlace
explícito", en respuesta a que hoy `evidence` no tiene ningún enlace real
a ninguna región/red/conexión concreta -- solo `study_id`, `kind`, `quote`
y un `detail` (JSONB libre, sin garantía de integridad).

`entity_id` es una columna `String` simple, sin `ForeignKey` propia:
puede apuntar a `regions.id`, `networks.id` o `connections.id` -- tres
tablas distintas, ninguna FK de Postgres cubre eso sola. Mismo criterio
exacto ya aplicado a `Connection.source_id`/`target_id` (decisión 13,
`docs/analisis-arquitectura.md`): a qué tabla pertenece un `entity_id`
concreto se resuelve siempre consultando cada tabla candidata (p. ej.
`select(Region.id).where(Region.id == entity_id)`), nunca asumiendo un
prefijo del identificador (`region.`, `network.`, `connection.`) como si
fuera parte del contrato de datos -- ese prefijo es una convención de
legibilidad del proyecto, no una garantía verificada.

`entity_id` se añade como NOT NULL, sin `server_default` (mismo criterio
que `evidence.quote`/`evidence.extraction_method` en la migración 0009):
la tabla `evidence` sigue sin ninguna fila real todavía -- la Fase 6
sigue siendo solo esquema, decisión 20 -- así que no hace falta backfill
para exigir esta columna desde el primer día.

Sin índice nuevo: ninguna otra columna de este esquema lo tiene todavía
(ni siquiera `Connection.source_id`/`target_id`, que se consultan con la
misma frecuencia), así que añadir uno aquí sería una decisión de
rendimiento aislada sin la misma consideración aplicada al resto del
esquema -- se deja para cuando haya una consulta real que lo necesite.

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-02

"""
import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("evidence", sa.Column("entity_id", sa.String(), nullable=False))


def downgrade() -> None:
    op.drop_column("evidence", "entity_id")
