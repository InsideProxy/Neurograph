"""Grafo híbrido tractografía+parcelación: nodos y aristas reales
derivados de ORG-800FC-100HCP (decisión 66, 09/09/2026).

Cuarta pestaña de la sección de tractografía, pedida explícitamente por
la usuaria: "hagamos una cuarta pestaña con nodos derivados de
tractografía, pues, nos vale para lo que queremos que es ubicar redes...
se seleccionan nodos y el programa devuelve la tractografía que los
une." Investigado antes de construir nada (ver docs/analisis-
arquitectura.md, decisión 66): NO existe ningún registro espacial
verificado entre el espacio propio de ORG-800FC-100HCP y MNI152/fsLR32k
-- así que un "atlas híbrido" mezclando nodos del connectograma (MNI152)
con streamlines reales habría repetido el error que la decisión 49 ya
evitó. La alternativa elegida, sin ese problema: derivar los nodos
DENTRO del propio espacio de la tractografía, a partir de
`100HCP-population-mean-wmparc.nii.gz` -- la misma parcelación real que
la decisión 63 ya verificó en el mismo espacio real que las streamlines
(solape empírico casi 1:1).

Dos tablas nuevas, deliberadamente separadas de `regions`/`coordinates`
(mismo motivo que ya separó `tract_geometries` de `coordinates` en la
migración 0012 -- nunca mezclar espacios de referencia sin verificar):

- `tractography_nodes`: un nodo por cada etiqueta real y con nombre
  verificado del wmparc (176 nodos reales -- excluye siempre la
  etiqueta de fondo y "ctx-lh/rh-unknown", ver `backend/ingestion/
  tractography/wmparc_labels.EXCLUDED_LABELS`). `x`/`y`/`z` son el
  centroide real del vóxel de esa etiqueta, transformado con el affine
  real del NIfTI -- un dato DERIVADO, por eso `method` es obligatorio
  (riesgo 4, mismo criterio que `region_network_memberships`).

- `tractography_edges`: conecta dos nodos distintos (PK compuesta
  `node_a_id`/`node_b_id`, siempre `node_a_id < node_b_id`) cuando al
  menos una streamline real de los 41 tractos tiene sus DOS extremos
  reales dentro de esos dos nodos (nunca un bucle, nunca un extremo en
  fondo o en una etiqueta excluida). `streamline_count_real`/`_shown`
  siguen el mismo principio de transparencia que `tract_geometries`
  (decisión 49/62): el recuento real nunca se oculta, aunque
  `streamlines` solo guarde una muestra determinista reducida
  (`DEFAULT_MAX_STREAMLINES_PER_EDGE = 20`, tope de INGENIERÍA, nunca
  científico) para dibujar. `tract_codes` guarda TODOS los tractos
  reales que contribuyen (puede ser más de uno).

Generado y verificado exhaustivamente contra los dos archivos reales de
la usuaria antes de escribir esta migración (09/09/2026, ver decisión
66 y `backend/ingestion/tractography/hybrid_nodes.py`): 176 nodos reales,
5176 aristas reales, 523696 streamlines de origen (resolución completa,
nunca la muestra de 300/tracto ya recortada en `tract_geometries` --
usar esa habría sesgado la conectividad hacia lo que ya se decidió
mostrar). Disclosure honesto de lo que NO se convirtió en arista: de
1047392 extremos reales, 587284 caen en una etiqueta nombrada, 460052 en
fondo, 56 en una etiqueta excluida ("unknown"), y 30153 streamlines
tienen sus dos extremos en el mismo nodo (bucle, excluido de aristas
mismo criterio que un tracto que solo toca una región, decisión 12).

El SQL real de estas dos tablas lo genera
`scripts/generate_hybrid_tractography_nodes.py`, mismo patrón exacto
que `scripts/generate_org_tractography_geometry.py` -- ninguna conexión
directa a la base de datos real de la usuaria (regla explícita de la
usuaria), esta migración solo declara el esquema.

Revision ID: 0015
Revises: 0014
Create Date: 2026-09-09

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tractography_nodes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("wmparc_label", sa.Integer(), nullable=False),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.Column("z", sa.Float(), nullable=False),
        sa.Column("reference_space", sa.String(), nullable=False),
        sa.Column("method", sa.String(), nullable=False),
    )
    op.create_table(
        "tractography_edges",
        sa.Column("node_a_id", sa.String(), sa.ForeignKey("tractography_nodes.id"), primary_key=True),
        sa.Column("node_b_id", sa.String(), sa.ForeignKey("tractography_nodes.id"), primary_key=True),
        sa.Column("tract_codes", postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column("streamlines", postgresql.JSONB(), nullable=False),
        sa.Column("streamline_count_real", sa.Integer(), nullable=False),
        sa.Column("streamline_count_shown", sa.Integer(), nullable=False),
        sa.Column("reference_space", sa.String(), nullable=False),
        sa.Column("method", sa.String(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("tractography_edges")
    op.drop_table("tractography_nodes")
