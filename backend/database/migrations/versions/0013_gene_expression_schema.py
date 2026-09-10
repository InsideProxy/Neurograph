"""Esquema para expresión génica del Allen Human Brain Atlas (AHBA) --
SOLO el esquema, sin cargar ningún microarray real todavía. Decisión
explícita de la usuaria, 02/09/2026: "diseñar el esquema ahora, sin
cargar datos", mismo criterio ya usado en la decisión 47 para
`Evidence.entity_id` (infraestructura primero, sin consumidor todavía).

Investigación previa real (verificada contra los 6 zips reales de
donantes en `E:\\NeuroData\\original\\atlases\\`, ~1,68GB, y contra la
práctica estándar del campo): el AHBA (6 donantes, 3702 muestras reales
en total, cada una con coordenadas MNI reales y ~58 693 sondas de
microarray) NO es un atlas visualizable por sí solo -- es una nube de
muestras dispersas por el cerebro, con cobertura muy desigual entre
donantes y entre regiones (algunas estructuras subcorticales solo
tienen muestra real en 1-2 de los 6 donantes). La práctica estándar del
campo (verificada vía `abagen`, Markello et al. 2021, *eLife*, DOI-
respaldado) es MAPEAR/AGREGAR la expresión de cada sonda sobre las
regiones de un atlas YA EXISTENTE (p. ej. HCP-MMP1.0), produciendo una
matriz región × gen -- exactamente la forma que este esquema modela.

Dos entidades nuevas, siguiendo el patrón ya establecido en el proyecto:

1. `genes` (entidad científica real, como `regions`/`tracts`): un gen es
   una estructura biológica real e independiente del atlas de expresión
   que se use para mapearla, así que usa `IdentifiedMixin` igual que el
   resto de entidades observadas (nunca `ProvenanceMixin` a secas, que
   es para datos DERIVADOS). `symbol` (código corto real, p. ej.
   "SLC6A4", como viene en `Probes.csv` del propio AHBA) es NOT NULL --
   siempre está presente en los datos reales, a diferencia de
   `entrez_id` (identificador cruzado con NCBI Gene, no siempre mapeado
   para cada sonda del AHBA, nullable).

2. `expressions`: el valor de expresión agregado de un gen sobre una
   región de un atlas YA existente -- es un dato DERIVADO (como
   `region_network_memberships`, riesgo 4 del análisis de arquitectura),
   nunca una afirmación directa del atlas de origen: exige `method`
   NOT NULL (qué agregación/selección de sondas/normalización se usó --
   nunca "a ojo") y `donor_count` NOT NULL (cuántos de los 6 donantes
   del AHBA aportaron de verdad una muestra real a ese valor -- la
   cobertura del AHBA es real y desigual, y ocultar ese número sería
   ocultar un dato real, prohibido por la sección 24: una región con
   `donor_count=1` es un dato mucho más débil que una con `donor_count=6`,
   y quien consuma esta tabla necesita poder distinguirlo, no solo ver
   un promedio ciego).

`gene_id`/`region_id` como `ForeignKey` reales (a diferencia de
`Evidence.entity_id`, decisión 47): aquí `region_id` apunta siempre a
`regions.id`, nunca a `networks`/`connections`, así que no hace falta el
mecanismo polimórfico de esa decisión -- una FK simple y verificable
basta, mismo criterio que `RegionNetworkMembership.region_id`.

Deliberadamente NO construido en esta migración (queda para cuando la
usuaria decida avanzar más allá del esquema, mismo criterio que la
decisión 47 con `Evidence.entity_id`): ningún módulo de ingesta que lea
los zips reales del AHBA, ningún mapeo real sonda -> gen -> región,
ninguna fila real en `genes`/`expressions`. Construir eso exigiría
además decidir explícitamente varios parámetros metodológicos con la
usuaria (qué atlas usar como destino del mapeo, qué método de selección
de sonda representativa cuando varias sondas miden el mismo gen --
`abagen` usa "differential stability" por defecto, no el único método
publicado --, qué umbral de intensidad de señal aplicar) que no se
deciden aquí sin ella.

Revision ID: 0013
Revises: 0012
Create Date: 2026-09-02

"""
import sqlalchemy as sa
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "genes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("species_id", sa.String(), sa.ForeignKey("species.id"), nullable=False),
        sa.Column("symbol", sa.String(), nullable=False),
        sa.Column("entrez_id", sa.String(), nullable=True),
    )
    op.create_table(
        "expressions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("region_id", sa.String(), sa.ForeignKey("regions.id"), nullable=False),
        sa.Column("gene_id", sa.String(), sa.ForeignKey("genes.id"), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("method", sa.String(), nullable=False),
        sa.Column("donor_count", sa.Integer(), nullable=False),
        sa.Column("source_dataset_id", sa.String(), nullable=True),
        sa.Column("algorithm", sa.String(), nullable=True),
        sa.Column("software_version", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


def downgrade() -> None:
    op.drop_table("expressions")
    op.drop_table("genes")
