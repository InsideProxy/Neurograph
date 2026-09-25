#!/usr/bin/env bash
# Reconstruye la base de datos de NeuroGraph desde cero a partir de los
# archivos .sql del repositorio (migraciones + seeds + init/salida_*.sql), en
# el orden de dependencias establecido en la H1 (antes decision 75)
# de docs/decisiones-herramientas.md y documentado en
# backend/database/migrations/README.md.
#
# Solo para cuando NO hay volcado (scripts/export_snapshot.ps1, decision
# 53). Con volcado disponible, cargarlo es siempre preferible: es la
# base de datos real, no una reconstruccion. La tractografia ORG no esta
# en la carga inicial: se instala despues con
# scripts/install_tractography.sh (H4 de docs/decisiones-herramientas.md).
#
# Mismo procedimiento que scripts/apply_sql.ps1: docker cp + psql -f
# dentro del contenedor, nunca una tuberia (riesgo 7: acentos/n).
#
# Uso:   scripts/rebuild_db_from_sql.sh [contenedor]
#        (por defecto: neurograph-postgres; requiere docker compose up -d)
#
# Se puede repetir sin riesgo: las migraciones solo se aplican si la
# base esta vacia, y todos los archivos de datos son idempotentes
# (INSERT ... ON CONFLICT DO UPDATE o UPDATE por id).

set -euo pipefail

CONTENEDOR="${1:-neurograph-postgres}"
USUARIO=neurograph
BASE=neurograph
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
SEED=backend/database/seed
INIT=init
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"; docker exec "$CONTENEDOR" rm -f /tmp/neurograph_rebuild.sql >/dev/null 2>&1 || true' EXIT

MIGRACIONES=(
  backend/database/migrations/generated/0001_initial_schema.sql
  backend/database/migrations/generated/0002_libraries.sql
  backend/database/migrations/generated/0003_region_network_memberships.sql
  backend/database/migrations/generated/0004_connection_evidence_level.sql
  backend/database/migrations/generated/0005_atlas_study_link.sql
  backend/database/migrations/generated/0006_dataset_study_link.sql
  backend/database/migrations/generated/0007_region_tract_abbreviation.sql
  backend/database/migrations/generated/0008_region_hemisphere.sql
  backend/database/migrations/generated/0009_study_metadata_and_evidence_fields.sql
  backend/database/migrations/generated/0010_mcp_call_log.sql
  backend/database/migrations/generated/0011_evidence_entity_link.sql
  backend/database/migrations/generated/0012_tract_study_link_and_geometry.sql
  backend/database/migrations/generated/0013_gene_expression_schema.sql
  backend/database/migrations/generated/0014_tract_geometry_reference_space.sql
  backend/database/migrations/generated/0015_tractography_nodes_and_edges.sql
)

# Orden de dependencias (H1 de docs/decisiones-herramientas.md). Los seeds register_atlas_hcp_mmp1,
# register_atlas_brainnetome, register_gordon333 y
# register_hcp_subcortical_structures NO se aplican: sus salida_*
# equivalentes tienen las mismas filas mas abbreviation/hemisphere
# (migraciones 0007/0008), que los seeds dejarian en NULL (decision 53a).
DATOS=(
  # 1. Biblioteca y datasets
  $SEED/register_library_neurodata.sql
  $SEED/register_dataset_hcp_s1200_groupavg.sql
  $SEED/register_dataset_hcp_s1200_groupavg_extracted.sql
  $SEED/register_dataset_brainnetome.sql
  $INIT/salida_mni152_meshes.sql
  # 2. Atlas, regiones y coordenadas (mmp1 da de alta la especie humana)
  $INIT/salida_mmp1.sql
  $INIT/salida_subcortex.sql
  $INIT/salida_gordon333.sql
  $INIT/salida_brainnetome.sql
  $INIT/salida_macaque_wang2017.sql
  $INIT/salida_cheng2021_ipl.sql
  # 3. Estudios: register_atlas_studies ANTES de los backfills (si no,
  #    su ON CONFLICT volveria a escribir name/doi/year)
  $SEED/register_atlas_studies.sql
  $INIT/salida_backfill_atlas_study_metadata.sql
  $INIT/salida_backfill_zhang2018_study_metadata.sql
  $INIT/salida_zotero_kerezoudis_2026.sql
  # 4. Nombres largos de HCP-MMP1.0: despues de todo lo que escribe esas regiones
  $INIT/salida_backfill_hcp_mmp1_names.sql
  # 5. Redes y pertenencias
  $SEED/register_cole_anticevic_networks.sql
  $SEED/register_cerebellum_network_distribution.sql
  $INIT/salida_rsn_networks.sql
  # 6. Conexiones
  $SEED/register_connections_brainnetome.sql
  $SEED/register_yeh2022_tract_region.sql
  $INIT/salida_rosen_halgren2021_mmp1_connectome_part1of2.sql
  $INIT/salida_rosen_halgren2021_mmp1_connectome_part2of2.sql
  # 7. Homologias (necesitan regiones humanas y de macaco)
  $INIT/salida_motor_sma_synthesis.sql
)

psql_c() { docker exec "$CONTENEDOR" psql -U "$USUARIO" -d "$BASE" -Atc "$1"; }

aplicar() {
  local archivo="$RAIZ/$1" fuente transaccion=-1
  [ -f "$archivo" ] || { echo "No se encuentra: $1" >&2; exit 1; }
  fuente="$archivo"
  # salida_mmp1.sql lleva un byte cp1252 (un guion largo en un comentario):
  # se convierte en una copia temporal, el archivo original no se toca.
  if ! iconv -f utf-8 -t utf-8 "$archivo" >/dev/null 2>&1; then
    fuente="$TMP/$(basename "$archivo")"
    iconv -f cp1252 -t utf-8 "$archivo" > "$fuente"
  fi
  # Los archivos con su propio BEGIN/COMMIT no se envuelven en otra transaccion.
  grep -qx 'BEGIN;' "$archivo" && transaccion=
  printf '  %-64s ' "$1"
  docker cp "$fuente" "$CONTENEDOR:/tmp/neurograph_rebuild.sql"
  if docker exec "$CONTENEDOR" psql $transaccion -v ON_ERROR_STOP=1 -q \
       -U "$USUARIO" -d "$BASE" -f /tmp/neurograph_rebuild.sql >/dev/null 2>"$TMP/err"; then
    echo OK
  else
    echo ERROR; cat "$TMP/err" >&2; exit 1
  fi
}

cd "$RAIZ"
psql_c 'select 1' >/dev/null || { echo "No hay conexion con '$CONTENEDOR' -- ¿docker compose up -d?" >&2; exit 1; }

if [ "$(psql_c "select to_regclass('public.alembic_version') is not null")" = t ]; then
  echo "Esquema ya presente (alembic_version $(psql_c 'select version_num from alembic_version')): no se aplican migraciones."
else
  echo "Migraciones:"
  for f in "${MIGRACIONES[@]}"; do aplicar "$f"; done
fi

echo "Datos:"
for f in "${DATOS[@]}"; do aplicar "$f"; done

echo "Verificacion:"
psql_c "
select '  species', count(*) from species union all
select '  atlases', count(*) from atlases union all
select '  regions', count(*) from regions union all
select '  coordinates', count(*) from coordinates union all
select '  networks', count(*) from networks union all
select '  region_network_memberships', count(*) from region_network_memberships union all
select '  connections', count(*) from connections union all
select '  tracts', count(*) from tracts union all
select '  tract_geometries (0 hasta instalar la tractografia)', count(*) from tract_geometries union all
select '  tractography_nodes', count(*) from tractography_nodes union all
select '  tractography_edges', count(*) from tractography_edges union all
select '  homologies', count(*) from homologies union all
select '  studies', count(*) from studies union all
select '  datasets', count(*) from datasets union all
select '  regiones sin abbreviation (debe ser 0)', count(*) from regions where abbreviation is null union all
select '  atlas sin estudio (debe ser 0)', count(*) from atlases where study_id is null union all
select '  coordenadas huerfanas (debe ser 0)', count(*) from coordinates c
  where not exists (select 1 from regions r where r.id = c.entity_id) union all
select '  conexiones huerfanas (debe ser 0)', count(*) from connections c
  where not exists (select 1 from regions r where r.id = c.target_id)
     or not exists (select 1 from regions r where r.id = c.source_id union all
                    select 1 from tracts t where t.id = c.source_id) union all
select '  homologias huerfanas (debe ser 0)', count(*) from homologies h
  where not exists (select 1 from regions where id = h.source_id)
     or not exists (select 1 from regions where id = h.target_id)" | tr '|' '\t'
