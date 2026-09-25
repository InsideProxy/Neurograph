# Migraciones (Alembic)

El esquema de la base de datos se versiona aquí con Alembic. Cada cambio
de esquema es una migración nueva, nunca una edición manual de una tabla
(sección 23: reproducibilidad).

## Aplicar el esquema

**Forma normal** (cuando tengas un entorno Python que pueda conectarse a
la base de datos, p. ej. tu propio ordenador con el entorno de
`backend/` instalado):

```bash
alembic upgrade head
```

**Forma usada para la primera puesta en marcha de este proyecto**: el
entorno donde se desarrolló NeuroGraph no tenía conexión directa a tu
PostgreSQL local, así que el SQL de cada migración se genera sin conexión
(`alembic upgrade head --sql`) y se guarda en `generated/`, para
aplicarlo dentro del contenedor de Docker con `docker cp` + `psql -f`:

```powershell
docker cp .\backend\database\migrations\generated\0001_initial_schema.sql neurograph-postgres:/tmp/apply.sql
docker exec -i neurograph-postgres psql -U neurograph -d neurograph -f /tmp/apply.sql
```

**Importante — usar siempre `docker cp` + `psql -f`, nunca
`Get-Content ... | docker exec ...`.** PowerShell corrompe los acentos y
la ñ al pasar el archivo por la tubería (`|`): "Área" llega como "??rea".
`docker cp` copia el archivo en bruto, sin tocar su codificación, así que
es la única forma segura de cargar cualquier dato en español. Se
comprobó y confirmó este comportamiento el 28 de agosto de 2026 —
ver `generated/0001_verify.sql`.

`generated/` es un volcado de cada migración concreta, no la fuente de
verdad — la fuente de verdad son los archivos en `versions/`. Si cambias
los modelos en `backend/database/models/`, la migración siguiente se crea
con `alembic revision --autogenerate -m "descripción"` desde un entorno
con conexión a la base de datos.

## Forma recomendada: `scripts/apply_sql.ps1`

Los dos comandos de arriba (`docker cp` + `docker exec ... psql -f`) se
pueden ejecutar de una sola vez con `scripts/apply_sql.ps1` — mismo
procedimiento exacto por dentro (incluida la copia con `docker cp` para
no corromper acentos/ñ, nunca una tubería de PowerShell), solo que en un
único comando en vez de dos, con comprobaciones y mensajes de error
claros:

```powershell
.\scripts\apply_sql.ps1 -Archivo .\backend\database\migrations\generated\0001_initial_schema.sql
```

Sirve tanto para migraciones de esquema como para cualquier
`salida_*.sql` generado por un `scripts/register_*.py`. No sustituye tu
revisión del archivo — si quieres ver el SQL antes de aplicarlo, ábrelo
tú misma (`notepad .\archivo.sql`) antes de ejecutar el script; el script
solo automatiza la mecánica de aplicarlo una vez que ya decidiste
hacerlo, nunca decide por ti qué aplicar.

## Reconstruir la base de datos desde cero sin volcado

Si tienes un volcado (`scripts/export_snapshot.ps1`, decisión 53),
úsalo: es la base de datos real. Si no lo tienes (instalación nueva,
otro ordenador), la base se puede reconstruir desde los `.sql` del
repositorio con un solo comando, con `docker compose up -d` ya en
marcha:

```bash
scripts/rebuild_db_from_sql.sh            # contenedor por defecto: neurograph-postgres
```

Aplica las migraciones de `generated/` (solo si la base está vacía) y
después los datos en el orden de abajo, y termina imprimiendo recuentos y
comprobaciones de huérfanos. Se puede repetir sin riesgo: todos los
archivos de datos son idempotentes (`ON CONFLICT DO UPDATE` o `UPDATE`
por id). El orden y su justificación están en la H1 de
`docs/decisiones-herramientas.md` (antes decisión 75).

**Orden de carga** (cada paso depende solo de los anteriores). Los
`salida_*` están en `data/sql/` y los `seed/…`, en `backend/database/seed/`:

| # | Archivos | Por qué va aquí |
|---|----------|-----------------|
| 1 | `seed/register_library_neurodata`, `seed/register_dataset_hcp_s1200_groupavg`, `seed/register_dataset_hcp_s1200_groupavg_extracted`, `seed/register_dataset_brainnetome`, `salida_mni152_meshes` | Datasets a los que apuntan los `source_dataset_id` posteriores. `_extracted` apunta al zip original. |
| 2 | `salida_mmp1`, `salida_subcortex`, `salida_gordon333`, `salida_brainnetome`, `salida_macaque_wang2017`, `salida_cheng2021_ipl` | Especies, atlas, regiones y coordenadas. `salida_mmp1` da de alta la especie humana que usan subcortex y Gordon. |
| 3 | `seed/register_atlas_studies`, `salida_backfill_atlas_study_metadata`, `salida_backfill_zhang2018_study_metadata`, `salida_zotero_kerezoudis_2026` | Estudios y enlace atlas→estudio. `register_atlas_studies` va **antes** de los backfills: si fuera después, su `ON CONFLICT` volvería a escribir name/doi/year. |
| 4 | `salida_backfill_hcp_mmp1_names` | Nombres largos de HCP-MMP1.0: después de todo lo que escribe esas regiones. |
| 5 | `seed/register_cole_anticevic_networks`, `seed/register_cerebellum_network_distribution`, `salida_rsn_networks` | Redes y pertenencias. El cerebelo usa las redes de Cole-Anticevic. |
| 6 | `seed/register_connections_brainnetome`, `seed/register_yeh2022_tract_region`, `salida_rosen_halgren2021_…_part1of2`, `…_part2of2` | Conexiones. La parte 2 usa el dataset que da de alta la parte 1. |
| 7 | `salida_motor_sma_synthesis` | Homologías humano↔macaco: necesita las regiones de ambos atlas. |

**No se aplican** `seed/register_atlas_hcp_mmp1`, `seed/register_atlas_brainnetome`,
`seed/register_gordon333` ni `seed/register_hcp_subcortical_structures`:
sus `salida_*` equivalentes tienen exactamente las mismas regiones,
nombres y coordenadas (comparado fila a fila), más `abbreviation` y
`hemisphere`, que los seeds dejarían en `NULL` (decisión 53a).

**Codificación:** `salida_mmp1.sql` tiene un único byte cp1252 (un guion
largo en un comentario). El script lo convierte a UTF-8 en una copia
temporal antes de aplicarlo; el archivo del repositorio no se toca.

**Lo que esta reconstrucción no incluye** (no hay SQL en el repositorio):
los 41 tractos del atlas ORG y sus geometrías (`tract_geometries`) y
`tractography_nodes`/`tractography_edges`. Salen de
`scripts/generate_org_tractography_geometry.py` y
`scripts/generate_hybrid_tractography_nodes.py`, que necesitan los datos
originales de la biblioteca (`E:\NeuroData`). Esos archivos siguen
publicados en Zenodo: enlaces y md5 en la H1 de
`docs/decisiones-herramientas.md`. Las tablas de genes (`genes`,
`expressions`) y `evidence` salen vacías porque nunca tuvieron datos.

**Al añadir un `salida_*.sql` nuevo:** guárdalo en `data/sql/` y añádelo a
la lista `DATOS` de `scripts/rebuild_db_from_sql.sh`, detrás de lo que
referencia, y a esta tabla.
