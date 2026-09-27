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
#   5. Deja la ficha (dataset.yaml) de cada dataset, cada uno en su carpeta,
#      y el manifiesto de la biblioteca si no lo tiene (H8). Si la base ya
#      tiene la tractografia, solo hace este paso.
#
# Uso:   scripts/install_tractography.sh [contenedor]
#        (por defecto: neurograph-postgres; requiere docker compose up -d)
#        Biblioteca: $NEUROGRAPH_LIBRARY__PATH (la del backend), si no
#        $NEUROGRAPH_LIBRARY, y si no ~/NeuroData.
#
# Requiere la carga inicial ya aplicada (scripts/rebuild_db_from_sql.sh),
# python3 >= 3.10 con uv o con el modulo venv, curl, ~1,5 GB libres y
# conexion con zenodo.org.

set -euo pipefail

CONTENEDOR="${1:-neurograph-postgres}"
USUARIO=neurograph
BASE=neurograph
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
BIBLIOTECA="${NEUROGRAPH_LIBRARY__PATH:-${NEUROGRAPH_LIBRARY:-$HOME/NeuroData}}"
# Cada dataset en su carpeta, con su ficha (criterio funcional 2, principio
# 15, H8). Antes de la H8 los archivos iban sueltos en estas dos:
ANTES_ORIGINALES="$BIBLIOTECA/original/tractography"
ANTES_DERIVADOS="$BIBLIOTECA/derived/tractograms"
ZIP_DIR="$ANTES_ORIGINALES/org2018_fiber_clusters_800"
WMPARC_DIR="$ANTES_ORIGINALES/org2018_wmparc_100hcp"
DERIVADOS="$ANTES_DERIVADOS/org2018_fiber_clusters_800"

# Originales en Zenodo, con el md5 y la version que publica cada registro
# (licencia en Zenodo: cc-by-4.0 en los dos, consultado el 26/09/2026).
ZIP=ORG-800FiberClusters.zip
ZIP_URL=https://zenodo.org/api/records/2648292/files/ORG-800FiberClusters.zip/content
ZIP_MD5=ee5f73e15d28f177e65ba38dbb6c8a7a
ZIP_DOI=10.5281/zenodo.2648292
ZIP_VERSION=v1.1.1
WMPARC=100HCP-population-mean-wmparc.nii.gz
WMPARC_URL=https://zenodo.org/api/records/8082481/files/100HCP-population-mean-wmparc.nii.gz/content
WMPARC_MD5=b8bec868a3cc878dcfc62c704ba15e4b
WMPARC_DOI=10.5281/zenodo.8082481
WMPARC_VERSION=v1.4
WMPARC_ID=dataset.human.org2018.wmparc_100hcp
SQL_ID=dataset.human.org2018.fiber_clusters_800_sql

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

descargar() {  # carpeta archivo url md5
  local destino="$1/$2"
  if [ -f "$destino" ] && [ "$(md5sum "$destino" | cut -d' ' -f1)" = "$4" ]; then
    echo "  $2: ya descargado (md5 correcto)"
    return
  fi
  echo "  $2: descargando de Zenodo ..."
  curl -sS -L --fail --retry 3 -o "$destino.part" "$3" || falla "no se pudo descargar $2 de $3"
  if [ "$(md5sum "$destino.part" | cut -d' ' -f1)" != "$4" ]; then
    rm -f "$destino.part"
    falla "$2: el md5 no coincide con el publicado en Zenodo ($4)"
  fi
  mv "$destino.part" "$destino"
  echo "  $2: descargado (md5 correcto)"
}

# Una instalacion anterior a la H8 los dejo sueltos: se mueven a su carpeta,
# sin tocar su contenido. Si ya hay uno con ese nombre alli, no se toca nada.
mover_a_su_carpeta() {  # archivo_suelto carpeta
  local nuevo
  nuevo="$2/$(basename "$1")"
  [ -f "$1" ] || return 0
  if [ -e "$nuevo" ]; then
    echo "  AVISO: $(basename "$1") esta a la vez suelto y en $2; no se mueve" >&2
    return 0
  fi
  mv "$1" "$nuevo"
  echo "  $(basename "$1"): movido a $2"
}

# Fichas de la biblioteca (H8). Los datos del zip salen de las mismas
# constantes con las que el generador da de alta su fila Dataset en la base.
# Una ficha que ya existe no se reescribe: solo se comprueba que su checksum
# sea el del archivo. Sin PyYAML: cada valor se escribe entre comillas JSON,
# que YAML lee igual.
escribir_fichas() {
  echo "5. Fichas de la biblioteca:"
  (cd "$RAIZ" && env PYTHONPATH="$RAIZ" BIBLIOTECA="$BIBLIOTECA" ZIP_DIR="$ZIP_DIR" ZIP="$ZIP" \
     ZIP_DOI="$ZIP_DOI" ZIP_VERSION="$ZIP_VERSION" WMPARC_DIR="$WMPARC_DIR" WMPARC="$WMPARC" \
     WMPARC_DOI="$WMPARC_DOI" WMPARC_VERSION="$WMPARC_VERSION" WMPARC_ID="$WMPARC_ID" \
     DERIVADOS="$DERIVADOS" SQL_ID="$SQL_ID" SQL_TRACTOS="$SQL_TRACTOS" SQL_NODOS="$SQL_NODOS" \
     RECUENTOS="$ESPERADO_TRACTOS; $ESPERADO_NODOS" DEPENDENCIAS="${DEPENDENCIAS[*]}" \
     python3 - <<'PY'
import datetime as dt
import hashlib
import json
import os
import sys
import uuid
from pathlib import Path

from scripts.generate_org_tractography_geometry import DATASET_ID, DATASET_LICENSE, DATASET_NAME

e = os.environ
hoy = dt.date.today().isoformat()
formato = "unsupported_pending_adapter"  # ningun lector del catalogo cerrado (decision 44)


def sha256(ruta):
    h = hashlib.sha256()
    with open(ruta, "rb") as f:
        for trozo in iter(lambda: f.read(1 << 20), b""):
            h.update(trozo)
    return h.hexdigest()


def q(valor):
    return json.dumps(valor, ensure_ascii=False)


def yaml(datos):
    lineas = []
    for clave, valor in datos.items():
        if isinstance(valor, dict):
            if not valor:
                lineas.append(f"{clave}: {{}}")
                continue
            lineas.append(f"{clave}:")
            lineas += [f"  {q(k)}: {q(v)}" for k, v in valor.items()]
        elif isinstance(valor, list):
            lineas.append(f"{clave}:")
            lineas += [f"- {q(v)}" for v in valor]
        else:
            lineas.append(f"{clave}: {q(valor)}")
    return "\n".join(lineas) + "\n"


def ficha(carpeta, archivos, datos):
    """Escribe dataset.yaml si falta; si ya existe, exige los checksums."""
    carpeta = Path(carpeta)
    if not all((carpeta / a).is_file() for a in archivos):
        print(f"  {carpeta.name}: sin sus archivos todavia, sin ficha")
        return
    sumas = {a: sha256(carpeta / a) for a in archivos}
    ruta = carpeta / "dataset.yaml"
    if ruta.exists():
        texto = ruta.read_text(encoding="utf-8")
        if not all(s in texto for s in sumas.values()):
            sys.exit(f"ERROR: {ruta} no corresponde a sus archivos (checksum distinto)")
        print(f"  {carpeta.name}: ya tiene ficha (checksums correctos)")
        return
    if len(archivos) == 1:
        datos["checksum_sha256"] = sumas[archivos[0]]
    else:
        datos["checksums"] = sumas
    ruta.write_text(yaml(datos), encoding="utf-8")
    print(f"  {carpeta.name}: ficha escrita")


biblioteca = Path(e["BIBLIOTECA"])
manifiesto = biblioteca / ".neurograph_library.yaml"
if manifiesto.exists():
    print("  biblioteca: ya tiene manifiesto")
else:
    # El mismo que crea backend/library/manifest.py::initialize_library, con
    # los checksums de los originales que ya estan (relativos a original/).
    originales = {}
    for carpeta, archivo in ((e["ZIP_DIR"], e["ZIP"]), (e["WMPARC_DIR"], e["WMPARC"])):
        ruta = Path(carpeta) / archivo
        if ruta.is_file():
            originales[ruta.relative_to(biblioteca / "original").as_posix()] = sha256(ruta)
    manifiesto.write_text(yaml({
        "library_id": str(uuid.uuid4()),
        "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "index_schema_version": 1,
        "checksums": originales,
    }), encoding="utf-8")
    print("  biblioteca: manifiesto escrito")

ficha(e["ZIP_DIR"], [e["ZIP"]], {
    "id": DATASET_ID,
    "name": DATASET_NAME,
    "source": f"Zenodo, DOI {e['ZIP_DOI']}",
    "format": formato,
    "date_added": hoy,
    "version": e["ZIP_VERSION"],
    "license": DATASET_LICENSE,
    "description": "El registro de Zenodo declara la licencia cc-by-4.0 (consultado el 26/09/2026).",
})
ficha(e["WMPARC_DIR"], [e["WMPARC"]], {
    "id": e["WMPARC_ID"],
    "name": f"O'Donnell Research Group (ORG) Fiber Clustering White Matter Atlas: {e['WMPARC']}",
    "source": f"Zenodo, DOI {e['WMPARC_DOI']}",
    "format": formato,
    "date_added": hoy,
    "version": e["WMPARC_VERSION"],
    "license": "cc-by-4.0 (segun el registro de Zenodo, consultado el 26/09/2026)",
    "description": "wmparc medio de la poblacion de 100 sujetos del HCP, en el espacio del atlas ORG: "
                   "da la malla de fondo (decision 63) y los nodos de tractografia (decision 66).",
})
ficha(e["DERIVADOS"], [Path(e["SQL_TRACTOS"]).name, Path(e["SQL_NODOS"]).name], {
    "id": e["SQL_ID"],
    "name": "SQL de la tractografia ORG para la base de NeuroGraph (tractos, geometrias, nodos y aristas)",
    "source": "scripts/install_tractography.sh (H4)",
    "format": formato,
    "date_added": hoy,
    "description": f"Recuentos comprobados al generarlo: {e['RECUENTOS']}.",
    "derived_from": [DATASET_ID, e["WMPARC_ID"]],
    "algorithm": "scripts/generate_org_tractography_geometry.py (decision 49) y "
                 "scripts/generate_hybrid_tractography_nodes.py (decision 66)",
    "software_version": e["DEPENDENCIAS"],
})
PY
  ) || falla "no se pudieron escribir las fichas de la biblioteca"
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
mkdir -p "$ZIP_DIR" "$WMPARC_DIR" "$DERIVADOS"
for dir in "$BIBLIOTECA" "$TMP"; do
  libre=$(df --output=avail -m "$dir" | tail -1 | tr -d ' ')
  [ "$libre" -ge 1000 ] || falla "hacen falta al menos 1000 MB libres en $dir (hay $libre MB)"
done
echo "  OK (biblioteca: $BIBLIOTECA)"
mover_a_su_carpeta "$ANTES_ORIGINALES/$ZIP" "$ZIP_DIR"
mover_a_su_carpeta "$ANTES_ORIGINALES/$WMPARC" "$WMPARC_DIR"
mover_a_su_carpeta "$ANTES_DERIVADOS/$(basename "$SQL_TRACTOS")" "$DERIVADOS"
mover_a_su_carpeta "$ANTES_DERIVADOS/$(basename "$SQL_NODOS")" "$DERIVADOS"

if [ "$(estado_base)" = "$ESPERADO_BASE" ]; then
  echo "La tractografia ya esta instalada en '$CONTENEDOR'."
  escribir_fichas
  exit 0
fi

echo "1. Originales (Zenodo):"
descargar "$WMPARC_DIR" "$WMPARC" "$WMPARC_URL" "$WMPARC_MD5"
descargar "$ZIP_DIR" "$ZIP" "$ZIP_URL" "$ZIP_MD5"

echo "2-3. SQL de la tractografia:"
generar "$SQL_TRACTOS" "$ESPERADO_TRACTOS" \
  scripts/generate_org_tractography_geometry.py "$ZIP_DIR/$ZIP"
generar "$SQL_NODOS" "$ESPERADO_NODOS" \
  scripts/generate_hybrid_tractography_nodes.py \
  --wmparc "$WMPARC_DIR/$WMPARC" --tract-zip "$ZIP_DIR/$ZIP"

echo "4. Carga en '$CONTENEDOR' (tractos y geometrias, despues nodos y aristas):"
aplicar "$SQL_TRACTOS"
aplicar "$SQL_NODOS"

estado="$(estado_base)"
echo "Verificacion (tractos ORG, geometrias, streamlines reales, mostradas, nodos, aristas):"
echo "  $estado"
[ "$estado" = "$ESPERADO_BASE" ] || falla "la base no tiene lo esperado ($ESPERADO_BASE)"
escribir_fichas
echo "Tractografia instalada."
