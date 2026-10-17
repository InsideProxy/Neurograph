# shellcheck shell=bash
# Pruebas de imagenes.sh (paso 5, B1 y B7 del diseno, H10).

docker_con_imagenes() {  # imagenes_presentes ; build_salida ; build_codigo
  simular docker "case \"\$1 \$2\" in
  'image inspect') case \" $1 \" in *\" \$3 \"*) exit 0;; *) exit 1;; esac ;;
  'pull '*) exit 0 ;;
  'build '*) printf '%s\n' '${2:-ok}'; exit ${3:-0} ;;
esac"
}

prueba_anota_solo_la_que_descarga_y_no_estaba() {
  # Las de FROM (node, python, nginx, docker:cli) no quedan en «docker image
  # ls» con BuildKit: anotadas, nunca se podrian quitar (B7).
  docker_con_imagenes ""
  con_lib 'paso_imagenes' sistema docker imagenes || return 1
  local l; l="$(leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" NG_IMAGENES_DESCARGADAS)"
  igual "pgvector/pgvector:pg16" "$l" "solo la que baja docker pull" || return 1
  docker_con_imagenes "pgvector/pgvector:pg16"
  rm -f "$HOME/.local/share/neurograph/estado.env"
  con_lib 'paso_imagenes' sistema docker imagenes || return 1
  igual "" "$(leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" NG_IMAGENES_DESCARGADAS)" "pgvector ya estaba (la usa el desarrollo)" || return 1
}

prueba_no_pierde_la_lista_anterior() {
  mkdir -p "$HOME/.local/share/neurograph"
  echo "NG_IMAGENES_DESCARGADAS=python:3.10-slim" > "$HOME/.local/share/neurograph/estado.env"
  docker_con_imagenes ""
  con_lib 'paso_imagenes' sistema docker imagenes || return 1
  local l; l="$(leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" NG_IMAGENES_DESCARGADAS)"
  contiene "python:3.10-slim" "$l" "la anterior sigue" || return 1
  contiene "pgvector/pgvector:pg16" "$l" "y se suma la nueva" || return 1
}

prueba_sin_espacio_al_construir() {
  docker_con_imagenes "pgvector/pgvector:pg16" "write /var/lib/docker/tmp: no space left on device" 1
  ! con_lib 'paso_imagenes' sistema docker imagenes || return 1
  contiene "No hay espacio suficiente" "$(pantalla)" "frase de espacio" || return 1
}

prueba_red_cortada_al_construir() {
  docker_con_imagenes "pgvector/pgvector:pg16" "failed to resolve source metadata for docker.io/library/node: i/o timeout" 1
  ! con_lib 'paso_imagenes' sistema docker imagenes || return 1
  contiene "Se cortó la conexión" "$(pantalla)" "frase de red" || return 1
}

prueba_otro_fallo_dice_que_imagen() {
  docker_con_imagenes "pgvector/pgvector:pg16" "error TS2307: Cannot find module" 1
  ! con_lib 'paso_imagenes' sistema docker imagenes || return 1
  contiene "Falló la preparación de la API." "$(pantalla)" "nombra la imagen" || return 1
  contiene "Cannot find module" "$(registro)" "el detalle va al registro" || return 1
}
