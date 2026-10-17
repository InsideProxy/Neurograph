# shellcheck shell=bash
# shellcheck disable=SC2034  # NG_RESUMEN lo lee comun.sh
# Paso 5 del instalador Linux: construir las tres imagenes propias (bloque
# A del diseno, H10) y anotar las imagenes base que descargo el
# instalador, para que la desinstalacion quite solo esas (B7).

NG_IMAGENES_NUEVAS=""  # propias creadas en esta ejecucion (limpieza, B1)

anotar_imagenes_descargadas() {  # imagen...
  local lista img
  lista=" $(leer_valor "$NG_ESTADO" NG_IMAGENES_DESCARGADAS) "
  for img in "$@"; do
    [[ "$lista" == *" $img "* ]] || lista+="$img "
  done
  # shellcheck disable=SC2086  # se parte a proposito: normaliza los espacios
  lista="$(echo $lista)"
  guardar_valor "$NG_ESTADO" NG_IMAGENES_DESCARGADAS "$lista"
}

construir() {  # descripcion etiqueta dockerfile [argumentos de build...]
  local descripcion="$1" etiqueta="$2" dockerfile="$3"
  shift 3
  docker image inspect "$etiqueta" > /dev/null 2>&1 || NG_IMAGENES_NUEVAS+="$etiqueta "
  ejecutar_clasificado construccion "$descripcion" -- \
    docker build --builder default --progress plain -t "$etiqueta" -f "$NG_RAIZ/$dockerfile" "$@" "$NG_RAIZ"
}

paso_imagenes() {
  local img faltan=()
  for img in "${NG_IMAGENES_BASE[@]}"; do
    docker image inspect "$img" > /dev/null 2>&1 || faltan+=("$img")
  done
  anotar_imagenes_descargadas "${faltan[@]}"
  docker image inspect pgvector/pgvector:pg16 > /dev/null 2>&1 \
    || ejecutar_clasificado construccion "la base de datos" -- docker pull pgvector/pgvector:pg16
  construir "la API" "$NG_PROYECTO-api" backend/Dockerfile
  construir "la web" "$NG_PROYECTO-web" instalacion/docker/web.Dockerfile
  construir "las herramientas" "$NG_PROYECTO-herramientas" instalacion/docker/herramientas.Dockerfile \
    --build-arg "IMAGEN_API=$NG_PROYECTO-api"
  NG_RESUMEN="imágenes de la API, la web y las herramientas listas"
}
