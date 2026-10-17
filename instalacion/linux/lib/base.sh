# shellcheck shell=bash disable=SC2034  # NG_RESUMEN y NG_MARCA los lee comun.sh
# Pasos 6 y 7 del instalador Linux: encender, volumen y carga de datos
# (bloque A y B1 del diseno, H10).
#
# Marcas de config.env sobre el volumen: NG_VOLUMEN_PROPIO (lo creo este
# instalador) y NG_BASE_CARGADA (carga completa y verificada). Solo se
# rehace un volumen propio sin carga, que dejo una instalacion cortada y
# nunca llego a usarse; uno con carga o de origen desconocido nunca se borra.

NG_VOLUMEN_NUEVO=0
NG_SALTAR_CARGA=0
NG_VOLUMEN_DESCONOCIDO=0
NG_RECUENTO_FALLIDO=""

ng_volumen() { echo "$NG_PROYECTO-datos"; }

ng_compose() {
  docker compose -p "$NG_PROYECTO" -f "$NG_DIR/compose.yml" --env-file "$NG_CONFIG" "$@"
}

ng_psql() {  # consulta (por el socket local del contenedor: no necesita contrasena)
  docker exec "$NG_PROYECTO-postgres" psql -U neurograph -d neurograph -Atc "$1"
}

contrasena_nueva() {  # 32 caracteres alfanumericos; sin tuberias que puedan dar SIGPIPE
  local c
  c="$(head -c 48 /dev/urandom | base64 -w0 | tr -d '/+=')"
  echo "${c:0:32}"
}

preparar_configuracion() {  # usa NG_RAIZ y NG_BIBLIOTECA_ELEGIDA
  mkdir -p "$NG_DIR"
  cp "$NG_RAIZ/instalacion/docker/compose.yml" "$NG_DIR/compose.yml"
  guardar_valor "$NG_CONFIG" NG_PROYECTO "$NG_PROYECTO"
  guardar_valor "$NG_CONFIG" NG_BIBLIOTECA "$NG_BIBLIOTECA_ELEGIDA"
  [ -n "$(leer_valor "$NG_CONFIG" NG_CONTRASENA_BASE)" ] \
    || guardar_valor "$NG_CONFIG" NG_CONTRASENA_BASE "$(contrasena_nueva)"
}

decidir_volumen() {
  local vol volumenes
  vol="$(ng_volumen)"
  # Con la lista, no con "volume inspect": un fallo pasajero de Docker (el
  # demonio reiniciandose) no es "el volumen no existe", que borraria las
  # marcas y despues el volumen cargado. Si Docker no responde, se para aqui
  # sin tocar nada (bloque A).
  volumenes="$(docker volume ls -q)" || fallar docker_parado
  if ! grep -qxF -- "$vol" <<< "$volumenes"; then
    borrar_valor "$NG_CONFIG" NG_BASE_CARGADA
    guardar_valor "$NG_CONFIG" NG_VOLUMEN_PROPIO "$(date +%F)"
    NG_VOLUMEN_NUEVO=1
    return 0
  fi
  if [ -n "$(leer_valor "$NG_CONFIG" NG_BASE_CARGADA)" ]; then
    NG_SALTAR_CARGA=1
    return 0
  fi
  if [ -n "$(leer_valor "$NG_CONFIG" NG_VOLUMEN_PROPIO)" ]; then
    echo "Volumen $vol propio y sin NG_BASE_CARGADA: instalacion cortada en el paso 7; se rehace"
    docker rm -f "$NG_PROYECTO-postgres" "$NG_PROYECTO-api" "$NG_PROYECTO-web" > /dev/null 2>&1 || true
    docker volume rm "$vol"
    NG_VOLUMEN_NUEVO=1
    return 0
  fi
  NG_VOLUMEN_DESCONOCIDO=1
}

# Volumen de origen desconocido: primero se mira, por el socket local, si
# tiene el esquema completo y datos. Solo entonces se le pone la contrasena
# de config.env (por la entrada estandar, para que no aparezca en la linea
# de ordenes: es una linea ASCII, no un archivo de datos; el riesgo 7 es de
# acentos). Si no, no se toca nada.
adoptar_volumen_desconocido() {
  local vol version regiones
  vol="$(ng_volumen)"
  version="$(ng_psql 'select version_num from alembic_version' 2> /dev/null || true)"
  regiones="$(ng_psql 'select count(*) from regions' 2> /dev/null || true)"
  echo "Volumen $vol de origen desconocido: alembic_version=${version:-ninguna}, regiones=${regiones:-0}"
  if [ "$version" != "$NG_ESPERADO_ESQUEMA" ] || [ "${regiones:-0}" -le 0 ]; then
    fallar volumen_desconocido "$vol"
  fi
  printf "ALTER ROLE neurograph PASSWORD '%s';\n" "$(leer_valor "$NG_CONFIG" NG_CONTRASENA_BASE)" \
    | docker exec -i "$NG_PROYECTO-postgres" psql -U neurograph -d neurograph -q -v ON_ERROR_STOP=1
  echo "Volumen $vol adoptado: contrasena nueva puesta"
  guardar_valor "$NG_CONFIG" NG_BASE_CARGADA "$(date +%F) (adoptada)"
  NG_SALTAR_CARGA=1
}

esperar_hasta() {  # segundos descripcion contenedor orden...
  local limite=$(( SECONDS + $1 )) descripcion="$2" contenedor="$3"
  shift 3
  until "$@" > /dev/null 2>&1; do
    if [ "$SECONDS" -ge "$limite" ]; then
      # Al registro, en que estado quedo cada pieza y lo ultimo que dijo la
      # que se esperaba: si no, la frase no dice por que (B1).
      echo "Espera agotada ($descripcion). Contenedores del proyecto:"
      docker ps -a --filter "name=^$NG_PROYECTO-" || true
      echo "Ultimas lineas de $contenedor:"
      docker logs --tail 100 "$contenedor" 2>&1 || true
      fallar espera "$descripcion"
    fi
    sleep 2
  done
}

esperar_postgres() {  # por TCP: en el primer arranque hay un servidor provisional solo por socket
  esperar_hasta "$NG_ESPERA_POSTGRES" "La base de datos" "$NG_PROYECTO-postgres" \
    docker exec "$NG_PROYECTO-postgres" pg_isready -h 127.0.0.1 -U neurograph -d neurograph
}
esperar_api() {
  esperar_hasta "$NG_ESPERA_API" "La API" "$NG_PROYECTO-api" \
    curl -sf "http://127.0.0.1:$(leer_valor "$NG_CONFIG" NG_API_PUERTO)/health"
}
esperar_web() {
  esperar_hasta "$NG_ESPERA_WEB" "La web" "$NG_PROYECTO-web" \
    curl -sf -o /dev/null "http://127.0.0.1:$(leer_valor "$NG_CONFIG" NG_WEB_PUERTO)/"
}

comprobar_imagenes() {
  local img
  for img in "$NG_PROYECTO-api" "$NG_PROYECTO-web" pgvector/pgvector:pg16; do
    docker image inspect "$img" > /dev/null 2>&1 || fallar imagenes
  done
}

encender() {  # postgres primero (un volumen desconocido se resuelve antes de la API)
  comprobar_imagenes
  ejecutar_clasificado encender "la base de datos" -- ng_compose up -d postgres
  esperar_postgres
  if [ "$NG_VOLUMEN_DESCONOCIDO" = 1 ]; then adoptar_volumen_desconocido; fi
  ejecutar_clasificado encender "NeuroGraph" -- ng_compose up -d
  esperar_api
  esperar_web
}

paso_encender() {
  preparar_configuracion
  decidir_volumen
  encender
  NG_RESUMEN="base, API y web respondiendo"
}

comprobar_recuentos() {  # nombre_de_la_lista (consulta|valor)
  local -n lista="$1"
  local linea consulta esperado obtenido
  for linea in "${lista[@]}"; do
    consulta="${linea%|*}"
    esperado="${linea##*|}"
    obtenido="$(ng_psql "$consulta")"
    echo "recuento: $consulta -> $obtenido (esperado $esperado)"
    if [ "$obtenido" != "$esperado" ]; then
      NG_RECUENTO_FALLIDO="$consulta da $obtenido y se esperaba $esperado"
      return 1
    fi
  done
}

paso_cargar() {
  local salida archivo regiones conexiones
  if [ "$NG_SALTAR_CARGA" = 1 ]; then
    regiones="$(ng_psql 'select count(*) from regions')"
    conexiones="$(ng_psql 'select count(*) from connections')"
    if [ "$regiones" != "$NG_ESPERADO_REGIONES" ] || [ "$conexiones" != "$NG_ESPERADO_CONEXIONES" ]; then
      avisar "La base conservada tiene $regiones regiones y $conexiones conexiones; esta versión espera $NG_ESPERADO_REGIONES y $NG_ESPERADO_CONEXIONES. Actualizar está fuera de esta versión del instalador."
      NG_MARCA="⚠"
    fi
    NG_RESUMEN="base conservada: $regiones regiones, $conexiones conexiones"
    return 0
  fi
  salida="$(mktemp)"
  # La salida va al registro en directo y a un archivo, para buscar el que falla.
  if ! "$NG_RAIZ/scripts/rebuild_db_from_sql.sh" "$NG_PROYECTO-postgres" 2>&1 | tee "$salida"; then
    # awk y no grep: sin linea ERROR, grep fallaria con pipefail y se perderia la frase.
    archivo="$(awk '/ ERROR$/ { print $1; exit }' "$salida")"
    rm -f "$salida"
    fallar carga "${archivo:-un archivo (ver el registro)}"
  fi
  rm -f "$salida"
  comprobar_recuentos NG_ESPERADO_CARGA || fallar recuentos_base "$NG_RECUENTO_FALLIDO"
  guardar_valor "$NG_CONFIG" NG_BASE_CARGADA "$(date +%F)"
  NG_RESUMEN="$NG_ESPERADO_REGIONES regiones, $NG_ESPERADO_CONEXIONES conexiones"
}

# Si la instalacion falla antes de terminar el paso 7 (B1): se quitan los
# contenedores y las imagenes propias creadas en esta ejecucion, y el
# volumen si es nuevo y no tiene la carga. Con la carga hecha no se quita
# nada: NeuroGraph ya es usable (los contenedores se recrean al abrir).
limpiar_lo_incompleto() {
  [ -n "$(leer_valor "$NG_CONFIG" NG_BASE_CARGADA)" ] && return 0
  docker rm -f "$NG_PROYECTO-postgres" "$NG_PROYECTO-api" "$NG_PROYECTO-web" > /dev/null 2>&1 || true
  if [ "$NG_VOLUMEN_NUEVO" = 1 ]; then docker volume rm "$(ng_volumen)" > /dev/null 2>&1 || true; fi
  local img
  for img in ${NG_IMAGENES_NUEVAS:-}; do docker rmi "$img" > /dev/null 2>&1 || true; done
  echo "Limpieza de lo incompleto hecha (volumen nuevo: $NG_VOLUMEN_NUEVO)"
}
