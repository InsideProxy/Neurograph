#!/usr/bin/env bash
# Pruebas de integracion del instalador Linux con Docker real (B8.3-B8.5
# del diseno, H10). Cada proyecto de prueba (neurograph-prueba*) tiene su
# propio HOME en disco: no toca el entorno de desarrollo, ni una
# instalacion real, ni la configuracion de las IAs del usuario. Pesadas:
# pedir permiso, equipo libre, una cada vez.
#
# Uso: instalacion/linux/pruebas/integracion.sh ESCENARIO
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
T="$HOME/.cache/neurograph-pruebas/integracion"
REAL_HOME="$HOME"
mkdir -p "$T/stubs-navegador"
# El navegador nunca se abre de verdad en las pruebas.
printf '#!/usr/bin/env bash\necho "$*" >> "%s/navegador.log"\n' "$T" > "$T/stubs-navegador/xdg-open"
chmod +x "$T/stubs-navegador/xdg-open"
fallos=0

comprobar() {  # descripcion orden...
  if "${@:2}"; then echo "OK    $1"; else echo "FALLA $1"; fallos=$((fallos + 1)); fi
}
hogar() { echo "$T/home-$1"; }           # HOME de prueba de un proyecto
datos() { echo "$T/home-$1/.local/share/neurograph"; }
en_home() {  # proyecto orden... -> ejecuta con el HOME de prueba del proyecto
  local proyecto="$1"; shift
  mkdir -p "$(hogar "$proyecto")"
  # Sin CLAUDE_CONFIG_DIR ni CODEX_HOME: mandan sobre HOME y tocarian la configuracion real.
  env -u CLAUDE_CONFIG_DIR -u CODEX_HOME HOME="$(hogar "$proyecto")" DOCKER_CONFIG="$REAL_HOME/.docker" NEUROGRAPH_PRUEBA_PROYECTO="$proyecto" \
    PATH="$T/stubs-navegador:$(hogar "$proyecto")/.local/bin:$PATH" "$@"
}
# --- Grabacion (peticion del usuario, 02/10/2026): toda ejecucion real del
# instalador se graba entera. script (util-linux) guarda la terminal con sus
# tiempos; se convierte a asciicast y agg (asciinema, binario oficial con su
# sha256) la pasa a GIF, y ffmpeg a MP4. Los GIF recortan las pausas largas:
# la duracion real se imprime aparte y queda en el .cast.
HERRAMIENTAS="$REAL_HOME/.cache/neurograph-pruebas/herramientas"
VIDEOS="$(xdg-user-dir VIDEOS 2> /dev/null || echo "$REAL_HOME/Vídeos")/neurograph-pruebas"
AGG_URL=https://github.com/asciinema/agg/releases/download/v1.9.0/agg-x86_64-unknown-linux-musl
AGG_SHA256=ddcbf6ca044c8ac3a434dcb9ee89fb9e3be87209982b7c2adb55f782e8f0f390
ESCENARIO="${1:-}"

preparar_grabacion() {
  [ -x "$HERRAMIENTAS/agg" ] && return 0
  mkdir -p "$HERRAMIENTAS"
  if curl -fsSL -o "$HERRAMIENTAS/agg.part" "$AGG_URL" \
     && echo "$AGG_SHA256  $HERRAMIENTAS/agg.part" | sha256sum -c --quiet -; then
    chmod +x "$HERRAMIENTAS/agg.part" && mv "$HERRAMIENTAS/agg.part" "$HERRAMIENTAS/agg"
  else
    rm -f "$HERRAMIENTAS/agg.part"
    echo "AVISO: no se pudo preparar agg; se graba el .cast, sin GIF ni MP4" >&2
  fi
}

# asciicast v2 a partir de la salida y los tiempos de script (formato clasico:
# "segundos bytes" por trozo; la primera linea de la salida es la cabecera).
a_asciicast() {  # tiempos salida destino
  python3 -c '
import codecs, json, sys
tiempos, salida, destino = sys.argv[1:4]
datos = open(salida, "rb").read()
pos = datos.index(b"\n") + 1
dec = codecs.getincrementaldecoder("utf-8")("replace")
t = 0.0
with open(destino, "w", encoding="utf-8") as f:
    f.write(json.dumps({"version": 2, "width": 120, "height": 36}) + "\n")
    for linea in open(tiempos):
        espera, n = linea.split()
        t += float(espera)
        trozo = dec.decode(datos[pos:pos + int(n)])
        pos += int(n)
        if trozo:
            f.write(json.dumps([round(t, 6), "o", trozo], ensure_ascii=False) + "\n")
print(f"duracion real: {int(t // 60)} min {t % 60:.0f} s")
' "$1" "$2" "$3"
}

grabar() {  # nombre orden... -> codigo de la orden; pantalla en $T/pantalla; .cast, GIF y MP4
  local nombre="$1" g="$T/grabaciones" sello codigo
  shift
  sello="$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$g" "$VIDEOS"
  SHELL=/bin/bash script -q -e -m classic -T "$g/$nombre.tiempos" -O "$g/$nombre.salida" \
    -c "stty cols 120 rows 36 2> /dev/null; $(printf '%q ' "$@")" < /dev/null > /dev/null 2>&1
  codigo=$?
  tr -d '\r' < "$g/$nombre.salida" > "$T/pantalla"
  a_asciicast "$g/$nombre.tiempos" "$g/$nombre.salida" "$VIDEOS/$sello-$nombre.cast"
  if [ -x "$HERRAMIENTAS/agg" ]; then
    "$HERRAMIENTAS/agg" --no-loop --idle-time-limit 3 --font-size 16 "$VIDEOS/$sello-$nombre.cast" "$VIDEOS/$sello-$nombre.gif" > /dev/null 2>&1 \
      && ffmpeg -loglevel error -y -i "$VIDEOS/$sello-$nombre.gif" -movflags faststart -pix_fmt yuv420p \
           -vf "fps=10,scale=trunc(iw/2)*2:trunc(ih/2)*2" "$VIDEOS/$sello-$nombre.mp4" \
      && echo "grabacion: $VIDEOS/$sello-$nombre.{gif,mp4} (las pausas de mas de 3 s se recortan)"
  fi
  return "$codigo"
}

instalar() {  # proyecto [opciones del instalador] -> pantalla en $T/pantalla (y grabacion)
  local proyecto="$1"; shift
  mkdir -p "$(hogar "$proyecto")"
  grabar "${ESCENARIO:-instalar}-$proyecto" env -u CLAUDE_CONFIG_DIR -u CODEX_HOME \
    HOME="$(hogar "$proyecto")" DOCKER_CONFIG="$REAL_HOME/.docker" NEUROGRAPH_PRUEBA_PROYECTO="$proyecto" \
    PATH="$T/stubs-navegador:$(hogar "$proyecto")/.local/bin:$PATH" \
    nice -n 19 "$RAIZ/instalacion/linux/instalar.sh" "$@"
}

# Sin grabar: para los escenarios que interrumpen el instalador a proposito
# (Ctrl+C, kill -9), donde script se interpondria en las senales.
instalar_sin_grabar() {  # proyecto [opciones del instalador]
  local proyecto="$1"; shift
  en_home "$proyecto" nice -n 19 "$RAIZ/instalacion/linux/instalar.sh" "$@" > "$T/pantalla" 2>&1
}

# Como en_home, pero grabado: las ordenes en primer plano (neurograph
# tractografia, un segundo instalador) tambien se graban enteras.
grabar_en_home() {  # nombre proyecto orden... -> codigo de la orden; pantalla en $T/pantalla
  local nombre="$1" proyecto="$2"; shift 2
  mkdir -p "$(hogar "$proyecto")"
  grabar "$nombre" env -u CLAUDE_CONFIG_DIR -u CODEX_HOME \
    HOME="$(hogar "$proyecto")" DOCKER_CONFIG="$REAL_HOME/.docker" NEUROGRAPH_PRUEBA_PROYECTO="$proyecto" \
    PATH="$T/stubs-navegador:$(hogar "$proyecto")/.local/bin:$PATH" "$@"
}
pantalla_contiene() { grep -qF -- "$1" "$T/pantalla"; }
registro_de() { ls -t "$(datos "$1")"/registro/"$2"-*.log | head -1; }  # proyecto orden
psql_en() { docker exec "$1-postgres" psql -U neurograph -d neurograph -Atc "$2"; }
biblioteca_de() { sed -i "s#^NG_BIBLIOTECA=.*#NG_BIBLIOTECA=$2#" "$(datos "$1")/config.env"; }
ocupar_puertos() {  # el desarrollo suele tener 5173 y 8420: aqui se ocupan a proposito
  docker run -d --rm --name ng-prueba-ocupa-web -p 127.0.0.1:5173:80 nginx:1.27-alpine > /dev/null 2>&1 || true
  docker run -d --rm --name ng-prueba-ocupa-api -p 127.0.0.1:8420:80 nginx:1.27-alpine > /dev/null 2>&1 || true
}
liberar_puertos() { docker rm -f ng-prueba-ocupa-web ng-prueba-ocupa-api ng-prueba-ocupa-5174 > /dev/null 2>&1 || true; }
# Lanza el instalador en su propio grupo de procesos y espera a que su
# registro nuevo llegue a un paso; deja el pid (= grupo) en $NG_PID.
# Una orden en segundo plano de un script arranca con SIGINT ignorado, y
# bash no deja poner una trampa a una senal ignorada al arrancar: sin
# --default-signal, el Ctrl+C simulado nunca llegaria a la trampa del
# instalador (comprobado el 03/10/2026). En una terminal, Ctrl+C si llega.
lanzar_y_esperar_paso() {  # proyecto paso
  local marca="$T/marca" n=0 reg=""
  touch "$marca"; sleep 1
  setsid env --default-signal=INT bash -c "$(declare -f hogar en_home instalar_sin_grabar); T='$T' REAL_HOME='$REAL_HOME' RAIZ='$RAIZ' NEUROGRAPH_PRUEBA_RESPUESTA=n instalar_sin_grabar '$1' --biblioteca '$T/biblioteca'" &
  # shellcheck disable=SC2034  # lo leen los escenarios de interrupcion
  NG_PID=$!
  until [ -n "$reg" ] && grep -qs "== paso $2:" "$reg"; do
    reg="$(find "$(datos "$1")/registro" -name 'instalar-*.log' -newer "$marca" 2> /dev/null | head -1)"
    sleep 0.5; n=$((n + 1)); [ $n -lt 2400 ] || return 1
  done
}

# Vigila un contenedor: tamano maximo de su capa (espacio temporal dentro
# de Docker, B8.5). La tractografia usa la de su contenedor (entorno de
# Python temporal) y la de Postgres (el SQL se copia a su /tmp para cargarlo).
vigilar_capa() {  # contenedor archivo
  local tam
  while sleep 3; do
    tam="$(docker ps -s --filter "name=^$1\$" --format '{{.Size}}' 2> /dev/null || true)"
    [ -n "$tam" ] && echo "$(date +%T) $tam" >> "$2"
  done
}

# Memoria de la construccion de las imagenes (paso 5, B8.5): BuildKit corre
# cada RUN en su propio cgroup, que docker stats no ve. Con el controlador
# systemd de Docker es system.slice/system.slice:docker:ID (comprobado el
# 03/10/2026 con una construccion minima).
vigilar_construccion() {  # archivo -> "hora id MB" de cada RUN en marcha, cada segundo
  local f id
  while sleep 1; do
    for f in /sys/fs/cgroup/system.slice/system.slice:docker:*/memory.peak; do
      [ -r "$f" ] || continue
      id="${f%/memory.peak}"; id="${id##*:}"
      echo "$(date +%T) $id $(( $(cat "$f" 2> /dev/null || echo 0) / 1048576 ))" >> "$1"
    done
  done
}

escenario_completa() {  # B8.4 + B8.5: instalacion desde cero, con descarga y generacion
  local p=neurograph-prueba inicio codigo bib="$T/biblioteca" dd usado_antes vigilantes=()
  rm -rf "$bib" "$T/capa.log" "$T/capa-postgres.log" "$T/construccion.log"; ocupar_puertos; preparar_grabacion
  # Crecimiento de la carpeta de Docker (B8.5): df incluye lo que escriba
  # cualquier otro programa en ese disco; docker system df, solo Docker.
  dd="$(docker info -f '{{.DockerRootDir}}')"
  usado_antes="$(df --output=used -m "$dd" | tail -1 | tr -d ' ')"
  docker system df > "$T/docker-df-antes.txt"
  vigilar_capa "$p-tractografia" "$T/capa.log" & vigilantes+=($!)
  vigilar_capa "$p-postgres" "$T/capa-postgres.log" & vigilantes+=($!)
  vigilar_construccion "$T/construccion.log" & vigilantes+=($!)
  inicio=$SECONDS
  NEUROGRAPH_PRUEBA_MEDIR=1 NEUROGRAPH_PRUEBA_RESPUESTA=s instalar $p --biblioteca "$bib"
  codigo=$?
  kill "${vigilantes[@]}" 2> /dev/null
  echo "duracion total: $(( SECONDS - inicio )) s"
  comprobar "sale con 0" test "$codigo" = 0
  comprobar "aviso del puerto de la web" pantalla_contiene "La web usa el puerto 5174 (el 5173 estaba ocupado)."
  comprobar "aviso del puerto de la API" pantalla_contiene "La API usa el puerto 8421 (el 8420 estaba ocupado)."
  comprobar "datos en la pantalla final" pantalla_contiene "1172 regiones · 104115 conexiones"
  comprobar "tractografia instalada" pantalla_contiene "tractografía: 41 tractos, 176 nodos"
  comprobar "Claude Code conectado" pantalla_contiene "Claude Code ✔ conectado"
  comprobar "la contrasena no esta en ningun registro" \
    bash -c "! grep -rqF \"\$(sed -n 's/^NG_CONTRASENA_BASE=//p' '$(datos $p)/config.env')\" '$(datos $p)/registro'"
  comprobar "la biblioteca es del usuario, no de root" \
    test "$(stat -c %U "$bib/original/tractography/org2018_fiber_clusters_800/ORG-800FiberClusters.zip")" = "$(id -un)"
  comprobar "fichas escritas" test -f "$bib/derived/tractograms/org2018_fiber_clusters_800/dataset.yaml"
  comprobar "claude ve el MCP desde ~" bash -c "cd '$(hogar $p)' && env -u CLAUDE_CONFIG_DIR HOME='$(hogar $p)' claude mcp list 2>&1 | grep -E '^neurograph:' | grep -c Connected | grep -qx 1"
  echo "--- mediciones (B8.5) ---"
  grep -h 'medicion tractografia' "$(registro_de $p instalar)"
  grep -h '^mcp: initialize' "$(registro_de $p instalar)"
  # LC_ALL=C: docker escribe 43.5MB con punto, y en es_ES sort -h lo lee mal.
  echo "capa maxima del contenedor de la tractografia: $(LC_ALL=C sort -k2 -h "$T/capa.log" | tail -1)"
  echo "capa maxima del contenedor de Postgres: $(LC_ALL=C sort -k2 -h "$T/capa-postgres.log" | tail -1)"
  echo "construccion de las imagenes, pico de memoria de cada RUN (MB, inicio-fin, cgroup; los 6 mayores):"
  awk '{ if ($3 > m[$2]) m[$2] = $3; if (!($2 in a)) a[$2] = $1; b[$2] = $1 } END { for (i in m) print m[i], a[i] "-" b[i], i }' \
    "$T/construccion.log" 2> /dev/null | sort -rn | head -6
  echo "base con tractografia: $(psql_en $p "select pg_size_pretty(pg_database_size('neurograph'))")"
  echo "tablas de tractografia: $(psql_en $p "select pg_size_pretty(sum(pg_total_relation_size(c))) from unnest(array['tract_geometries','tractography_nodes','tractography_edges']::regclass[]) c")"
  echo "biblioteca: $(du -sh "$bib" | cut -f1)"
  echo "carpeta de Docker ($dd): +$(( $(df --output=used -m "$dd" | tail -1 | tr -d ' ') - usado_antes )) MB (df)"
  echo "docker system df antes:"; cat "$T/docker-df-antes.txt"
  echo "docker system df despues:"; docker system df
  docker system df -v | grep -E "$p|REPOSITORY|VOLUME NAME"
  docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' | grep "$p"
}

escenario_idempotente() {  # una segunda ejecucion no cambia nada
  local p=neurograph-prueba
  NEUROGRAPH_PRUEBA_RESPUESTA=n instalar $p --biblioteca "$T/biblioteca"
  comprobar "sale con 0" test $? = 0
  comprobar "la base no se recarga" pantalla_contiene "base conservada: 1172 regiones, 104115 conexiones"
  comprobar "sin aviso de version" bash -c "! grep -qF 'Actualizar está fuera' '$T/pantalla'"
  comprobar "la tractografia no se repite" grep -qF "La tractografia ya esta instalada" "$(registro_de $p instalar)"
}

escenario_diario() {  # B3: apagar, MCP apagado, abrir (mismo contenedor y con otro puerto), estado
  local p=neurograph-prueba id_antes
  en_home $p neurograph apagar > "$T/pantalla" 2>&1
  comprobar "apagado" test "$(docker inspect -f '{{.State.Running}}' $p-web)" = false
  comprobar "neurograph-mcp con NeuroGraph apagado sale sin stdout" \
    bash -c "out=\$(HOME='$(hogar $p)' '$(hogar $p)/.local/bin/neurograph-mcp' < /dev/null 2> /dev/null); test \$? = 1 && test -z \"\$out\""
  id_antes="$(docker inspect -f '{{.Id}}' $p-web)"
  en_home $p neurograph abrir > "$T/pantalla" 2>&1
  comprobar "segundo arranque del mismo contenedor" test "$(docker inspect -f '{{.Id}}' $p-web)" = "$id_antes"
  comprobar "la web sigue hablando con la API 8421" \
    bash -c "docker exec $p-web sh -c \"grep -rhoF 'http://127.0.0.1:8421' /usr/share/nginx/html | wc -l\" | grep -qx 1"
  en_home $p neurograph apagar > /dev/null 2>&1
  docker run -d --rm --name ng-prueba-ocupa-5174 -p 127.0.0.1:5174:80 nginx:1.27-alpine > /dev/null
  en_home $p neurograph abrir > "$T/pantalla" 2>&1
  comprobar "abre en otro puerto y avisa" pantalla_contiene "La web usa el puerto 5175"
  comprobar "la web responde en el nuevo puerto" bash -c "curl -sf http://127.0.0.1:5175/ | grep -c 'id=\"root\"' | grep -qx 1"
  sleep 1  # xdg-open va en segundo plano
  comprobar "el navegador se abre en la URL" grep -qF "http://127.0.0.1:5175" "$T/navegador.log"
  docker rm -f ng-prueba-ocupa-5174 > /dev/null
  en_home $p neurograph estado > "$T/pantalla" 2>&1
  comprobar "estado: encendido y tractografia" bash -c "grep -qF 'encendido' '$T/pantalla' && grep -qF 'Tractografía: instalada' '$T/pantalla'"
}

escenario_desinstalar_reinstalar() {  # B7
  local p=neurograph-prueba
  # Grabado aparte de la reinstalacion: cada grabacion muestra solo su orden.
  grabar "desinstalar-$p" env -u CLAUDE_CONFIG_DIR -u CODEX_HOME \
    HOME="$(hogar $p)" DOCKER_CONFIG="$REAL_HOME/.docker" NEUROGRAPH_PRUEBA_PROYECTO=$p NEUROGRAPH_PRUEBA_RESPUESTA=s \
    PATH="$T/stubs-navegador:$(hogar $p)/.local/bin:$PATH" \
    "$(hogar $p)/.local/bin/neurograph" desinstalar
  comprobar "desinstala" test $? = 0
  comprobar "sin contenedores" test -z "$(docker ps -aq --filter name=$p-)"
  comprobar "volumen conservado" bash -c "docker volume inspect $p-datos > /dev/null"
  comprobar "config.env conservado" test -f "$(datos $p)/config.env"
  comprobar "biblioteca intacta" test -f "$T/biblioteca/original/tractography/org2018_fiber_clusters_800/ORG-800FiberClusters.zip"
  comprobar "IA quitada" bash -c "cd '$(hogar $p)' && ! env -u CLAUDE_CONFIG_DIR HOME='$(hogar $p)' claude mcp get neurograph > /dev/null 2>&1"
  ESCENARIO=reinstalar NEUROGRAPH_PRUEBA_RESPUESTA=n instalar $p --biblioteca "$T/biblioteca"
  comprobar "reinstala" test $? = 0
  comprobar "recupera la base conservada" pantalla_contiene "base conservada: 1172 regiones"
}

escenario_limpiar() {  # deja el equipo como estaba
  local p
  for p in neurograph-prueba neurograph-prueba-c neurograph-prueba-k neurograph-prueba-t; do
    docker rm -f "$p-postgres" "$p-api" "$p-web" "$p-tractografia" > /dev/null 2>&1 || true
    docker rmi "$p-api" "$p-web" "$p-herramientas" > /dev/null 2>&1 || true
    docker volume rm "$p-datos" > /dev/null 2>&1 || true
    docker network rm "${p}_default" > /dev/null 2>&1 || true  # la crea compose, como en desinstalar.sh
  done
  liberar_puertos
  docker rmi ng-prueba-web ng-prueba-api ng-prueba-herramientas > /dev/null 2>&1 || true
  rm -rf "$T" "$HERRAMIENTAS"
  echo "limpio (las grabaciones quedan en $VIDEOS)"
}

# --- Fallos provocados (B8.3). Proyectos: neurograph-prueba (la instalacion
# completa), -t (sin tractografia, para sus fallos), -c (Ctrl+C) y -k
# (kill -9). Orden: sin_red, poco_espacio, sin_tracto, md5,
# sin_rango_y_memoria, ctrl_c_paso8, ficha_alterada, dos_a_la_vez,
# ctrl_c_paso5_y_7 y kill9_paso7.

escenario_sin_red() {
  local p=neurograph-prueba-t
  NEUROGRAPH_PRUEBA_SITIOS="zenodo.invalid" NEUROGRAPH_PRUEBA_RESPUESTA=s instalar $p
  comprobar "falla" test $? = 1
  comprobar "nombra el sitio" pantalla_contiene "No hay conexión con zenodo.invalid"
  comprobar "no crea nada" test -z "$(docker ps -aq --filter name=$p-)"
}

escenario_poco_espacio() {
  NEUROGRAPH_PRUEBA_ESPACIO_MB=100 NEUROGRAPH_PRUEBA_RESPUESTA=s instalar neurograph-prueba-t
  comprobar "falla" test $? = 1
  comprobar "dice donde falta" pantalla_contiene "No hay espacio suficiente para Docker"
}

# Instalacion sin tractografia (memoria simulada): base para los fallos de
# la tractografia, y prueba de verdad del caso "sin recursos".
escenario_sin_tracto() {
  local p=neurograph-prueba-t
  # Por debajo del umbral de la tractografia y por encima del de la base (esperado.sh).
  local mem; mem="$(bash -c "source '$RAIZ/instalacion/linux/lib/esperado.sh'; echo \$(( NG_MIN_MEMORIA_TRACTO_MB - 1 ))")"
  NEUROGRAPH_PRUEBA_MEMORIA_MB="$mem" NEUROGRAPH_PRUEBA_RESPUESTA=n instalar $p --biblioteca "$T/bib-t"
  comprobar "sale con 0" test $? = 0
  comprobar "pendiente con el motivo" pantalla_contiene "tractografía: pendiente — memoria insuficiente"
  comprobar "la base no tiene tractografia" test "$(psql_en $p 'select count(*) from tractography_nodes')" = 0
}

tractografia_t() {  # [variables...] -> neurograph tractografia en el proyecto t (grabada)
  grabar_en_home "$ESCENARIO-tractografia-neurograph-prueba-t" neurograph-prueba-t env "$@" neurograph tractografia
}

escenario_md5() {  # curl de Zenodo que entrega basura
  mkdir -p "$T/stubs-md5"
  cat > "$T/stubs-md5/curl" << 'EOF'
#!/usr/bin/env bash
salida=""; while [ $# -gt 0 ]; do [ "$1" = -o ] && salida="$2"; shift; done
[ -n "$salida" ] && printf 'basura' > "$salida"; exit 0
EOF
  chmod +x "$T/stubs-md5/curl"
  rm -rf "$T/bib-md5"; biblioteca_de neurograph-prueba-t "$T/bib-md5"
  tractografia_t NEUROGRAPH_PRUEBA_STUBS="$T/stubs-md5"
  comprobar "falla" test $? = 1
  comprobar "frase del md5" pantalla_contiene "llegó dañado"
  comprobar "sin .part danado" test -z "$(find "$T/bib-md5" -name '*.part')"
}

escenario_sin_rango_y_memoria() {  # servidor sin reanudar (33) + falta de memoria al generar
  local orig="$T/biblioteca/original/tractography" b="$T/bib-rango/original/tractography"
  # De cero: si no, al repetirlo el zip ya estaria y no se probaria el 33.
  rm -rf "$T/bib-rango"
  mkdir -p "$T/stubs-rango" "$b/org2018_fiber_clusters_800" "$b/org2018_wmparc_100hcp"
  ln -f "$orig/org2018_fiber_clusters_800/ORG-800FiberClusters.zip" "$T/stubs-rango/zip"
  ln -f "$orig/org2018_wmparc_100hcp/100HCP-population-mean-wmparc.nii.gz" "$T/stubs-rango/wmparc"
  head -c 1048576 "$T/stubs-rango/zip" > "$b/org2018_fiber_clusters_800/ORG-800FiberClusters.zip.part"
  cat > "$T/stubs-rango/curl" << 'EOF'
#!/usr/bin/env bash
salida=""; url=""; reanuda=0
while [ $# -gt 0 ]; do case "$1" in -o) salida="$2"; shift;; -C) reanuda=1; shift;; http*) url="$1";; esac; shift; done
[ "$reanuda" = 1 ] && exit 33
case "$url" in *wmparc*) cp /pruebas/bin/wmparc "$salida" ;; *) cp /pruebas/bin/zip "$salida" ;; esac
EOF
  chmod +x "$T/stubs-rango/curl"
  biblioteca_de neurograph-prueba-t "$T/bib-rango"
  tractografia_t NEUROGRAPH_PRUEBA_STUBS="$T/stubs-rango" NEUROGRAPH_PRUEBA_TOPE_MEMORIA=300m
  comprobar "falla por memoria" pantalla_contiene "Faltó memoria"
  comprobar "descargo de cero tras el 33 (md5 correcto)" test -f "$b/org2018_fiber_clusters_800/ORG-800FiberClusters.zip"
  echo "senal de memoria que salto:"; grep -h 'tractografia: codigo' "$(registro_de neurograph-prueba-t tractografia)"
}

escenario_ctrl_c_paso8() {
  local p=neurograph-prueba-t b="$T/bib-c8/original/tractography" n=0 codigo
  rm -rf "$T/bib-c8"; mkdir -p "$b/org2018_fiber_clusters_800" "$b/org2018_wmparc_100hcp"
  ln -f "$T/biblioteca/original/tractography/org2018_fiber_clusters_800/ORG-800FiberClusters.zip" "$b/org2018_fiber_clusters_800/"
  ln -f "$T/biblioteca/original/tractography/org2018_wmparc_100hcp/100HCP-population-mean-wmparc.nii.gz" "$b/org2018_wmparc_100hcp/"
  biblioteca_de $p "$T/bib-c8"
  # Sin grabar (script se interpondria en la senal) y con SIGINT restablecido, como en lanzar_y_esperar_paso.
  setsid env --default-signal=INT bash -c "$(declare -f hogar en_home); T='$T' REAL_HOME='$REAL_HOME' en_home $p neurograph tractografia > '$T/pantalla' 2>&1" &
  local pid=$!
  until [ -n "$(docker ps -q --filter name=$p-tractografia)" ] || [ $n -ge 120 ]; do sleep 1; n=$((n + 1)); done
  sleep 15
  kill -INT -- -"$pid"; wait "$pid"; codigo=$?
  comprobar "sale con 130" test "$codigo" = 130
  comprobar "el contenedor queda parado y borrado" test -z "$(docker ps -aq --filter name=$p-tractografia)"
  comprobar "dice que repetir" pantalla_contiene "Puedes volver a ejecutar neurograph tractografia"
  comprobar "estado pendiente" grep -qx "NG_TRACTOGRAFIA=pendiente" "$(datos $p)/estado.env"
}

escenario_ficha_alterada() {  # sobre la instalacion completa
  # La ficha del original tiene checksum_sha256: "..." (las del derivado, una lista checksums:).
  local p=neurograph-prueba f="$T/biblioteca/original/tractography/org2018_fiber_clusters_800/dataset.yaml"
  cp "$f" "$f.bak"; sed -i 's/^\(checksum_sha256: "\)./\1x/' "$f"
  comprobar "la ficha quedo alterada" bash -c "! cmp -s '$f' '$f.bak'"
  grabar_en_home "$ESCENARIO-tractografia-$p" $p neurograph tractografia
  comprobar "falla" test $? = 1
  comprobar "cargada con ficha en conflicto" grep -qx "NG_TRACTOGRAFIA=ficha_en_conflicto" "$(datos $p)/estado.env"
  comprobar "nombra la ficha" pantalla_contiene "dataset.yaml"
  mv "$f.bak" "$f"
}

escenario_dos_a_la_vez() {
  local p=neurograph-prueba
  NEUROGRAPH_PRUEBA_RESPUESTA=n instalar $p --biblioteca "$T/biblioteca" &
  local pid=$!
  sleep 3
  # La primera escribe su pantalla al terminar, mucho despues que esta.
  grabar_en_home "$ESCENARIO-segunda-$p" $p env NEUROGRAPH_PRUEBA_RESPUESTA=n "$RAIZ/instalacion/linux/instalar.sh"
  comprobar "la segunda se para" test $? = 1
  comprobar "dice por que" pantalla_contiene "Ya hay otro instalador"
  wait "$pid"
  comprobar "la primera termina" test $? = 0
}

escenario_ctrl_c_paso5_y_7() {  # Ctrl+C durante la preparacion (o la carga): se limpia lo de esta ejecucion
  local p=neurograph-prueba-c paso codigo
  for paso in 5 7; do
    lanzar_y_esperar_paso $p $paso || { comprobar "llega al paso $paso" false; continue; }
    # Con la cache de construccion el paso 5 dura 1-2 s: se interrumpe en
    # cuanto empieza. La comprobacion siguiente dice en que paso cayo.
    [ "$paso" = 5 ] || sleep 2
    kill -INT -- -"$NG_PID"; wait "$NG_PID"; codigo=$?
    comprobar "paso $paso: sale con 130" test "$codigo" = 130
    comprobar "paso $paso: el Ctrl+C cae en ese paso" \
      test "$(awk '/^== paso [0-9]+:/ { p = $3 } /Interrumpido por la persona/ { print p; exit }' "$(registro_de $p instalar)")" = "$paso:"
    comprobar "paso $paso: dice que repetir" pantalla_contiene "Puedes volver a ejecutar el instalador"
    comprobar "paso $paso: sin contenedores de esta ejecucion" test -z "$(docker ps -aq --filter name=$p-)"
    comprobar "paso $paso: sin volumen sin marca" bash -c "! docker volume inspect $p-datos > /dev/null 2>&1"
  done
  NEUROGRAPH_PRUEBA_RESPUESTA=n instalar $p --biblioteca "$T/biblioteca"
  comprobar "repetir termina la instalacion" test $? = 0
}

escenario_kill9_paso7() {  # un corte que no pasa por la trampa (apagon, kill -9)
  local p=neurograph-prueba-k
  lanzar_y_esperar_paso $p 7 || { comprobar "llega al paso 7" false; return; }
  sleep 5
  kill -9 -- -"$NG_PID"; wait "$NG_PID" 2> /dev/null
  NEUROGRAPH_PRUEBA_RESPUESTA=n instalar $p --biblioteca "$T/biblioteca"
  comprobar "la siguiente ejecucion termina" test $? = 0
  comprobar "rehace el volumen propio sin carga" grep -qF "propio y sin NG_BASE_CARGADA" "$(registro_de $p instalar)"
}

[ $# -eq 1 ] || { echo "Uso: $0 ESCENARIO   ($(declare -F | awk '{print $3}' | sed -n 's/^escenario_//p' | xargs))" >&2; exit 1; }
"escenario_$1"
[ "$fallos" -eq 0 ]
