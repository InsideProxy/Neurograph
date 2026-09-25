#!/usr/bin/env bash
# Instala la tractografia ORG-800FC-100HCP en la base de datos de NeuroGraph
# (solo Linux, de momento). Es un paso de instalacion aparte de la carga
# inicial (init/): su SQL pesa unos 160 MB, no se sube a git y se genera
# aqui desde los originales publicados en Zenodo (H4 de
# docs/decisiones-herramientas.md).
#
# Pasos (los que ya estan hechos se saltan; se puede repetir sin riesgo):
#   1. Descarga los dos originales a la biblioteca y comprueba su md5.
#   2. Crea un entorno de Python temporal con numpy, nibabel y vtk (vtk no
#      es dependencia del proyecto). El entorno se borra al terminar.
#   3. Genera el SQL en la biblioteca (derived/tractograms/) y comprueba los
#      recuentos de las decisiones 49 y 66 antes de darlo por bueno.
#   4. Lo aplica con docker cp + psql -f (riesgo 7: nunca una tuberia) y
#      comprueba la base.
#
# Uso:   scripts/install_tractography.sh [contenedor]
#        (por defecto: neurograph-postgres; requiere docker compose up -d)
#        Biblioteca: $NEUROGRAPH_LIBRARY, o ~/NeuroData si no esta definida.
#
# Requiere la carga inicial ya aplicada (scripts/rebuild_db_from_sql.sh),
# python3 >= 3.10 con uv o con el modulo venv, curl, ~1,5 GB libres y
# conexion con zenodo.org.

set -euo pipefail

CONTENEDOR="${1:-neurograph-postgres}"
USUARIO=neurograph
BASE=neurograph
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
BIBLIOTECA="${NEUROGRAPH_LIBRARY:-$HOME/NeuroData}"
ORIGINALES="$BIBLIOTECA/original/tractography"
DERIVADOS="$BIBLIOTECA/derived/tractograms"

# Originales en Zenodo, con el md5 que publica cada registro.
ZIP=ORG-800FiberClusters.zip
ZIP_URL=https://zenodo.org/api/records/2648292/files/ORG-800FiberClusters.zip/content
ZIP_MD5=ee5f73e15d28f177e65ba38dbb6c8a7a
WMPARC=100HCP-population-mean-wmparc.nii.gz
WMPARC_URL=https://zenodo.org/api/records/8082481/files/100HCP-population-mean-wmparc.nii.gz/content
WMPARC_MD5=b8bec868a3cc878dcfc62c704ba15e4b

SQL_TRACTOS="$DERIVADOS/org_800fc_2018.sql"
SQL_NODOS="$DERIVADOS/org_800fc_2018_nodos_aristas.sql"

# Lo que deben dar los generadores (decisiones 49 y 66) y la base despues.
ESPERADO_TRACTOS="tractos: 41, streamlines reales: 523696, streamlines mostradas: 12300"
ESPERADO_NODOS="nodos: 176, aristas: 5176, streamlines de origen: 523696"
ESPERADO_BASE="41 41 523696 12300 176 5176"

# Versiones con las que se verifico la generacion (H4).
DEPENDENCIAS=("numpy==2.2.6" "nibabel==5.4.2" "vtk==9.7.0")

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"; docker exec "$CONTENEDOR" rm -f /tmp/neurograph_tractografia.sql >/dev/null 2>&1 || true' EXIT

falla() { echo "ERROR: $1" >&2; exit 1; }
psql_c() { docker exec "$CONTENEDOR" psql -U "$USUARIO" -d "$BASE" -Atc "$1"; }

estado_base() {
  psql_c "select (select count(*) from tracts where id like 'tract.human.org2018.%')
           || ' ' || (select count(*) from tract_geometries)
           || ' ' || coalesce((select sum(streamline_count_real) from tract_geometries), 0)
           || ' ' || coalesce((select sum(streamline_count_shown) from tract_geometries), 0)
           || ' ' || (select count(*) from tractography_nodes)
           || ' ' || (select count(*) from tractography_edges)"
}

# Tope de memoria (8 GB) para que un fallo no deje sin memoria el escritorio:
# si se pasa, muere solo este proceso. Sin systemd de usuario, sin tope.
con_limite() {
  if systemd-run --user --scope -q -p MemoryMax=8G true >/dev/null 2>&1; then
    systemd-run --user --scope -q -p MemoryMax=8G -p MemorySwapMax=0 "$@"
  else
    "$@"
  fi
}

descargar() {  # archivo url md5
  local destino="$ORIGINALES/$1"
  if [ -f "$destino" ] && [ "$(md5sum "$destino" | cut -d' ' -f1)" = "$3" ]; then
    echo "  $1: ya descargado (md5 correcto)"
    return
  fi
  echo "  $1: descargando de Zenodo ..."
  curl -sS -L --fail --retry 3 -o "$destino.part" "$2" || falla "no se pudo descargar $1 de $2"
  if [ "$(md5sum "$destino.part" | cut -d' ' -f1)" != "$3" ]; then
    rm -f "$destino.part"
    falla "$1: el md5 no coincide con el publicado en Zenodo ($3)"
  fi
  mv "$destino.part" "$destino"
  echo "  $1: descargado (md5 correcto)"
}

crear_entorno() {
  [ -x "$TMP/venv/bin/python" ] && return
  echo "  creando un entorno de Python temporal con ${DEPENDENCIAS[*]} ..."
  if command -v uv >/dev/null; then
    uv venv -q --python "$(command -v python3)" "$TMP/venv"
    uv pip install -q --python "$TMP/venv/bin/python" "${DEPENDENCIAS[@]}"
  else
    python3 -m venv "$TMP/venv"
    "$TMP/venv/bin/pip" install -q "${DEPENDENCIAS[@]}"
  fi
}

generar() {  # destino texto_esperado script argumentos...
  local destino="$1" esperado="$2" nombre
  nombre="$(basename "$destino")"
  shift 2
  if [ -f "$destino" ]; then
    echo "  $nombre: ya generado"
    return
  fi
  crear_entorno
  echo "  $nombre: generando ..."
  if ! (cd "$RAIZ" && con_limite env PYTHONPATH="$RAIZ" "$TMP/venv/bin/python" "$@") \
       > "$destino.part" 2> "$TMP/log"; then
    cat "$TMP/log" >&2
    rm -f "$destino.part"
    falla "fallo al generar $nombre"
  fi
  if ! grep -qF "$esperado" "$TMP/log"; then
    cat "$TMP/log" >&2
    rm -f "$destino.part"
    falla "$nombre: los recuentos no coinciden con los del log (se esperaba: $esperado)"
  fi
  mv "$destino.part" "$destino"
  echo "  $nombre: generado ($(du -m "$destino" | cut -f1) MB; $esperado)"
}

aplicar() {
  printf '  %-36s ' "$(basename "$1")"
  docker cp "$1" "$CONTENEDOR:/tmp/neurograph_tractografia.sql"
  if docker exec "$CONTENEDOR" psql -1 -v ON_ERROR_STOP=1 -q \
       -U "$USUARIO" -d "$BASE" -f /tmp/neurograph_tractografia.sql >/dev/null 2>"$TMP/err"; then
    echo OK
  else
    echo ERROR
    cat "$TMP/err" >&2
    exit 1
  fi
}

echo "Comprobaciones:"
for programa in docker curl md5sum python3; do
  command -v "$programa" >/dev/null || falla "falta $programa"
done
python3 -c 'import sys; sys.exit(sys.version_info < (3, 10))' || falla "hace falta python3 >= 3.10"
psql_c 'select 1' >/dev/null 2>&1 || falla "no hay conexion con '$CONTENEDOR' -- ¿docker compose up -d?"
[ "$(psql_c "select to_regclass('public.tractography_edges') is not null")" = t ] \
  || falla "faltan las migraciones de tractografia (0012-0015): aplica antes la carga inicial"
[ "$(psql_c "select count(*) from species where id = 'species.human.ncbi-taxonomy.9606'")" = 1 ] \
  || falla "falta la carga inicial: ejecuta antes scripts/rebuild_db_from_sql.sh"
mkdir -p "$ORIGINALES" "$DERIVADOS"
for dir in "$BIBLIOTECA" "$TMP"; do
  libre=$(df --output=avail -m "$dir" | tail -1 | tr -d ' ')
  [ "$libre" -ge 1000 ] || falla "hacen falta al menos 1000 MB libres en $dir (hay $libre MB)"
done
echo "  OK (biblioteca: $BIBLIOTECA)"

if [ "$(estado_base)" = "$ESPERADO_BASE" ]; then
  echo "La tractografia ya esta instalada en '$CONTENEDOR': nada que hacer."
  exit 0
fi

echo "1. Originales (Zenodo):"
descargar "$WMPARC" "$WMPARC_URL" "$WMPARC_MD5"
descargar "$ZIP" "$ZIP_URL" "$ZIP_MD5"

echo "2-3. SQL de la tractografia:"
generar "$SQL_TRACTOS" "$ESPERADO_TRACTOS" \
  scripts/generate_org_tractography_geometry.py "$ORIGINALES/$ZIP"
generar "$SQL_NODOS" "$ESPERADO_NODOS" \
  scripts/generate_hybrid_tractography_nodes.py \
  --wmparc "$ORIGINALES/$WMPARC" --tract-zip "$ORIGINALES/$ZIP"

echo "4. Carga en '$CONTENEDOR' (tractos y geometrias, despues nodos y aristas):"
aplicar "$SQL_TRACTOS"
aplicar "$SQL_NODOS"

estado="$(estado_base)"
echo "Verificacion (tractos ORG, geometrias, streamlines reales, mostradas, nodos, aristas):"
echo "  $estado"
[ "$estado" = "$ESPERADO_BASE" ] || falla "la base no tiene lo esperado ($ESPERADO_BASE)"
echo "Tractografia instalada."
