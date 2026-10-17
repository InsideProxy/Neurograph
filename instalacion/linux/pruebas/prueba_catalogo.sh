# shellcheck shell=bash
# Pruebas del catalogo de fallos (B1 del diseno, H10).
source "$NG_LIB/catalogo.sh" || return 1

prueba_las_senales_de_script_son_las_de_b1() {
  igual "descarga espacio_script ficha md5 python recuentos" \
    "$(printf '%s\n' "${!NG_SENAL_SCRIPT[@]}" | sort | xargs)" "senales de los scripts" || return 1
  igual "$(printf '%s\n' "${NG_ORDEN_SENALES_SCRIPT[@]}" | sort | xargs)" \
    "$(printf '%s\n' "${!NG_SENAL_SCRIPT[@]}" | sort | xargs)" "el orden de busqueda de los scripts no pierde ninguna" || return 1
  igual "$(printf '%s\n' "${NG_ORDEN_SENALES_SISTEMA[@]}" | sort | xargs)" \
    "$(printf '%s\n' "${!NG_SENAL_SISTEMA[@]}" | sort | xargs)" "el orden de busqueda del sistema no pierde ninguna" || return 1
  igual "espacio puerto red" "$(printf '%s\n' "${!NG_SENAL_SISTEMA[@]}" | sort | xargs)" "senales del sistema" || return 1
}

prueba_cada_senal_de_script_existe_en_los_scripts_reales() {
  local codigo texto ok=0
  for codigo in "${!NG_SENAL_SCRIPT[@]}"; do
    texto="${NG_SENAL_SCRIPT[$codigo]}"
    if ! grep -qiF -- "$texto" "$NG_RAIZ/scripts/install_tractography.sh" "$NG_RAIZ/scripts/rebuild_db_from_sql.sh"; then
      echo "    FALLA: la senal '$codigo' ('$texto') ya no esta en los scripts"
      ok=1
    fi
  done
  return $ok
}

prueba_cada_senal_tiene_su_frase() {
  local codigo ok=0
  for codigo in "${!NG_SENAL_SCRIPT[@]}" "${!NG_SENAL_SISTEMA[@]}"; do
    [ -n "${NG_FRASE[$codigo]:-}" ] || { echo "    FALLA: '$codigo' sin frase"; ok=1; }
  done
  return $ok
}

prueba_clasificar_reconoce_cada_senal_con_su_detalle() {
  declare -F clasificar_salida > /dev/null || return 1
  local codigo f="$HOME/salida"
  for codigo in "${NG_ORDEN_SENALES_SCRIPT[@]}"; do
    printf 'linea previa\nERROR: %s (con: algo): a.zip\n' "${NG_SENAL_SCRIPT[$codigo]}" > "$f"
    igual "$codigo" "$(clasificar_salida "$f")" "senal de script $codigo" || return 1
    igual "a.zip" "$(detalle_senal "$codigo" "$f")" "el dato de $codigo, tras el ultimo «: »" || return 1
  done
  printf 'write /var/lib/docker/x: no space left on device\n' > "$f"
  igual espacio "$(clasificar_salida "$f")" "sin espacio" || return 1
  printf 'Bind for 127.0.0.1:8420 failed: port is already allocated\n' > "$f"
  igual puerto "$(clasificar_salida "$f")" "puerto de otro contenedor" || return 1
  printf 'dial tcp: lookup registry-1.docker.io: i/o timeout\n' > "$f"
  igual red "$(clasificar_salida "$f")" "red cortada durante la construccion" || return 1
}

prueba_clasificar_no_inventa() {
  declare -F clasificar_salida > /dev/null || return 1
  printf 'todo fue bien\n' > "$HOME/salida"
  igual "" "$(clasificar_salida "$HOME/salida")" "sin senal no hay codigo" || return 1
}

prueba_frases_con_su_dato_y_sin_repetirse() {
  igual "$(frase en_marcha)" "${NG_FRASE[en_marcha]}" "una frase sin %s sale tal cual" || return 1
  igual "El puerto 5173 está ocupado. Cierra el programa que lo usa o vuelve a ejecutar el instalador, que buscará otro." \
    "$(frase puerto 5173)" "la frase lleva el dato" || return 1
  igual "$(frase puerto 5173)" "$(frase puerto 5173 sobra)" "un dato de mas no repite la frase" || return 1
  contiene "docker volume rm neurograph-app-datos" "$(frase volumen_desconocido neurograph-app-datos)" "el comando sale completo" || return 1
  contiene "(a.zip)" "$(frase md5 a.zip)" "md5 nombra el archivo" || return 1
  contiene "(/x/dataset.yaml)" "$(frase ficha /x/dataset.yaml)" "ficha nombra el archivo" || return 1
  igual "$(frase inesperado)" "$(frase codigo_que_no_existe)" "un codigo desconocido da la generica" || return 1
  igual "$(frase inesperado)" "$(frase "")" "un codigo vacio (sin senal reconocida) tambien" || return 1
}

prueba_todos_los_codigos_usados_en_lib_existen() {
  local codigo ok=0 usados
  # Sin los comentarios, que tambien dicen "fallar" o "frase" en prosa. Tambien
  # los ejecutables (instalar.sh...) y las plantillas, aunque aun no existan.
  usados="$(sed 's/#.*$//' "$NG_LIB"/*.sh "$NG_LIB"/../*.sh "$NG_LIB"/../plantillas/* 2> /dev/null | grep -ohE '\b(fallar|frase) [a-z_]+' | awk '{print $2}' | sort -u)"
  # Si la extraccion no encuentra ni uno que sabemos que existe, esta rota.
  [[ $'\n'"$usados"$'\n' == *$'\nen_marcha\n'* ]] || { echo "    FALLA: la extraccion no encuentra ni 'en_marcha': esta rota"; return 1; }
  for codigo in $usados; do
    [ -n "${NG_FRASE[$codigo]:-}" ] || { echo "    FALLA: '$codigo' se usa en lib/ y no esta en NG_FRASE"; ok=1; }
  done
  return $ok
}

prueba_detalle_senal_sin_codigo_no_falla_y_las_de_script_son_literales() {
  igual "" "$(detalle_senal "" "$HOME/no-existe")" "sin codigo no hay detalle ni error" || return 1
  local f="$HOME/salida" original="${NG_SENAL_SCRIPT[md5]}"
  NG_SENAL_SCRIPT[md5]='a(b.c'
  printf 'ERROR: x a(b.c fin\nERROR: y aXb.c\n' > "$f"
  igual "x a(b.c fin" "$(detalle_senal md5 "$f")" "una senal de script es texto, no expresion regular" || return 1
  NG_SENAL_SCRIPT[md5]="$original"
}

prueba_frase_con_datos_de_menos_lo_anota_en_la_salida_de_errores() {
  igual "$(frase puerto "")" "$(frase puerto 2> /dev/null)" "devuelve lo mismo que con el dato vacio" || return 1
  contiene "frase: faltan datos para puerto" "$(frase puerto 2>&1 > /dev/null)" "lo anota" || return 1
  igual "" "$(frase en_marcha 2>&1 > /dev/null)" "sin %s no hay queja" || return 1
  igual "" "$(frase puerto 5173 2>&1 > /dev/null)" "con su dato tampoco" || return 1
}
