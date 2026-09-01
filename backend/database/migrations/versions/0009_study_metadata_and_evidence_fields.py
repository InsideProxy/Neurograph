"""Metadatos estructurados de `studies` (autores, revista, resumen) y
campos propios de `evidence` para trazabilidad real (secciones 6/12/24,
inicio de la Fase 6 -- Literatura). Petición explícita de la usuaria,
30/08/2026: diseñar el esquema de esta fase sin cargar todavía ningún
artículo real.

`studies.name` sigue siendo la cita completa ya usada hasta ahora (p. ej.
"Glasser MF, Coalson TS... Nature, 536(7615), 171-178", decisiones 6/9 de
docs/analisis-arquitectura.md) -- no se toca ni se sustituye. `authors`/
`journal` son una descomposición estructurada NUEVA de esa misma cita
(consultable por separado, p. ej. "todos los estudios de un autor"), y
`abstract` es un campo genuinamente nuevo. Los tres nullable: los 5
`Study` ya cargados quedan con estos tres campos vacíos hasta que se
verifiquen y se rellenen explícitamente contra la fuente real (Crossref o
la propia web del editor) -- no se adivinan aquí, mismo criterio que el
backfill de `abbreviation`/`hemisphere` en `Region` (migraciones 0007/
0008).

`evidence.quote` y `evidence.extraction_method` se añaden como NOT NULL,
sin `server_default` (a diferencia de la migración 0004): la tabla
`evidence` no tiene ninguna fila real todavía -- la Fase 6 nunca ha
llegado a cargar nada en ella --, así que no hace falta backfill para
poder exigir ambos campos desde el primer día. Una oportunidad que
`regions`/`tracts`/`connections` ya no tenían en sus propias migraciones
(0004, 0007, 0008), porque esas tablas ya llevaban filas reales cuando se
añadieron sus columnas nuevas.

`quote`: el fragmento de texto real del estudio que respalda la
afirmación -- una fila de Evidence sin la cita textual que la sostiene no
es verificable (sección 24), así que es obligatoria, no opcional.
`extraction_method`: cómo se obtuvo esa afirmación -- "manual_transcription"
(una persona la transcribió leyendo el artículo) o "ai_assisted" (la
propuso un pipeline de NLP/IA). Ninguna fila con
`extraction_method='ai_assisted'` se aplica jamás a la base de datos real
sin revisión humana explícita antes -- mismo principio ya establecido en
la decisión 17 para la ingesta de atlas nuevos vía IA: la IA puede
proponer, nunca escribir sin que alguien lo confirme primero. Validado en
`backend/ingestion/literature/evidence.py`, no con un CHECK de base de
datos (mismo criterio que `connections.type`/`evidence_level`, sin
restricción a nivel de esquema).

Revision ID: 0009
Revises: 0008
Create Date: 2026-08-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("studies", sa.Column("authors", postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column("studies", sa.Column("journal", sa.String(), nullable=True))
    op.add_column("studies", sa.Column("abstract", sa.Text(), nullable=True))
    op.add_column("evidence", sa.Column("quote", sa.Text(), nullable=False))
    op.add_column("evidence", sa.Column("extraction_method", sa.String(), nullable=False))


def downgrade() -> None:
    op.drop_column("evidence", "extraction_method")
    op.drop_column("evidence", "quote")
    op.drop_column("studies", "abstract")
    op.drop_column("studies", "journal")
    op.drop_column("studies", "authors")
