# shellcheck shell=bash
# Pruebas de desinstalar.sh (B7 del diseno, H10).
DES="$NG_RAIZ/instalacion/linux/desinstalar.sh"

instalacion_simulada() {  # [rm_falla: docker volume rm no quita el volumen]
  local d="$HOME/.local/share/neurograph"
  mkdir -p "$d/registro" "$d/lib" "$HOME/.local/bin" "$HOME/.local/share/applications" "$HOME/NeuroData/original"
  printf 'NG_PROYECTO=neurograph-app\nNG_CONTRASENA_BASE=x\nNG_BASE_CARGADA=2026-10-02\nNG_BIBLIOTECA=%s\n' "$HOME/NeuroData" > "$d/config.env"
  printf 'NG_IAS_REGISTRADAS=claude\nNG_IMAGENES_DESCARGADAS=python:3.10-slim pgvector/pgvector:pg16\n' > "$d/estado.env"
  touch "$d/registro/instalar-1.log" "$d/compose.yml" "$d/conectar-ia.md" "$HOME/NeuroData/original/zip" "$d/lib/comun.sh"
  install -m 755 /dev/null "$d/desinstalar.sh"
  touch "$HOME/.local/bin/neurograph" "$HOME/.local/bin/neurograph-mcp"
  touch "$HOME/.local/share/applications/neurograph.desktop" "$HOME/.local/share/applications/neurograph-apagar.desktop"
  # docker simulado: pgvector la usa otro contenedor (el desarrollo). El
  # volumen sigue en la lista hasta que volume rm lo quita (B7).
  simular docker "echo \"\$*\" >> '$NG_PRUEBA_LLAMADAS/docker'
case \"\$*\" in
  info*) exit 0 ;;
  'ps -a --filter ancestor=pgvector/pgvector:pg16'*) echo abc123 ;;
  'ps -a --filter ancestor='*) ;;
  'volume rm '*) [ '${1:-}' = rm_falla ] && { echo 'Error response from daemon: remove neurograph-app-datos: volume is in use' >&2; exit 1; }; touch '$HOME/volumen-borrado' ;;
  'volume ls'*) echo otro; [ -e '$HOME/volumen-borrado' ] || echo neurograph-app-datos ;;
esac
exit 0"
  simular claude "echo \"\$PWD|\$*\" >> '$NG_PRUEBA_LLAMADAS/claude'"
}
# Docker instalado que no responde (parado o sin permiso), con una cuenta
# fuera del grupo docker: no hay relanzado con sg.
docker_que_no_responde() {  # mensaje_de_docker_info
  simular docker "echo \"\$*\" >> '$NG_PRUEBA_LLAMADAS/docker'; echo '$1' >&2; exit 1"
  simular id 'case "$*" in "-un") echo demo ;; "-nG demo"|"-nG") echo demo ;; *) /usr/bin/id "$@" ;; esac'
}
desinstalar() { NEUROGRAPH_PRUEBA_SIN_PROGRAMAS="codex gemini" bash "$DES" "$@" > "$HOME/pantalla" 2>&1; }

prueba_por_defecto_conserva_los_datos() {
  instalacion_simulada
  NEUROGRAPH_PRUEBA_RESPUESTA=s desinstalar || { cat "$HOME/pantalla"; return 1; }
  no_contiene "volume rm" "$(llamadas docker)" "el volumen se conserva" || return 1
  [ -f "$HOME/.local/share/neurograph/config.env" ] || { echo "    FALLA: config.env borrado"; return 1; }
  [ -f "$HOME/.local/share/neurograph/registro/instalar-1.log" ] || { echo "    FALLA: registros borrados"; return 1; }
  [ -f "$HOME/NeuroData/original/zip" ] || { echo "    FALLA: biblioteca tocada"; return 1; }
  [ ! -e "$HOME/.local/bin/neurograph" ] && [ ! -e "$HOME/.local/share/applications/neurograph.desktop" ] || { echo "    FALLA: quedan comandos o iconos"; return 1; }
  contiene "rmi neurograph-app-api" "$(llamadas docker)" "imagenes propias fuera" || return 1
  contiene "rmi python:3.10-slim" "$(llamadas docker)" "la descargada y sin uso, fuera" || return 1
  no_contiene "rmi pgvector/pgvector:pg16" "$(llamadas docker)" "la que usa otro contenedor se queda" || return 1
  contiene "$HOME|mcp remove neurograph -s user" "$(llamadas claude)" "quita la IA registrada" || return 1
  contiene "Se conservan" "$(cat "$HOME/pantalla")" "dice lo que queda" || return 1
  local bib; bib="$(grep -F "la biblioteca $HOME/NeuroData (" "$HOME/pantalla" || true)"
  [[ "$bib" =~ \(([0-9][^\)]*)\):\ no\ se\ borra\ sola ]]     || { echo "    FALLA: la biblioteca sin su ruta y su tamaño: $bib"; return 1; }
  contiene "network rm neurograph-app_default" "$(llamadas docker)" "quita la red del proyecto (B7)" || return 1
  contiene "la imagen pgvector/pgvector:pg16, que usa otro contenedor" "$(cat "$HOME/pantalla")" "dice que imagen se conserva y por que" || return 1
}

prueba_relanzado_con_sg_sigue_en_la_terminal() {
  instalacion_simulada
  simular sg 'exec /bin/sh -c "$3"'
  simular id 'case "$*" in "-un") echo demo ;; "-nG demo") echo "demo docker" ;; "-nG") if [ -n "${NEUROGRAPH_CON_GRUPO_DOCKER:-}" ]; then echo "demo docker"; else echo demo; fi ;; *) /usr/bin/id "$@" ;; esac'
  simular docker "echo \"\$*\" >> '$NG_PRUEBA_LLAMADAS/docker'
case \"\$1\" in info) [ -n \"\${NEUROGRAPH_CON_GRUPO_DOCKER:-}\" ] && exit 0; echo 'permission denied' >&2; exit 1 ;; esac
exit 0"
  NEUROGRAPH_PRUEBA_RESPUESTA=s desinstalar || { cat "$HOME/pantalla"; return 1; }
  contiene "NeuroGraph desinstalado." "$(cat "$HOME/pantalla")" "el relanzado habla en la terminal" || return 1
  no_contiene "Ya hay otro" "$(cat "$HOME/pantalla")" "y hereda el bloqueo" || return 1
}

prueba_no_quita_ias_que_no_registro() {
  instalacion_simulada
  printf 'NG_IAS_REGISTRADAS=\n' > "$HOME/.local/share/neurograph/estado.env"
  NEUROGRAPH_PRUEBA_RESPUESTA=s desinstalar || return 1
  igual "" "$(llamadas claude)" "no toca una IA que no registro el instalador" || return 1
}

prueba_respuesta_no_no_hace_nada() {
  instalacion_simulada
  NEUROGRAPH_PRUEBA_RESPUESTA=n desinstalar || return 1
  [ -e "$HOME/.local/bin/neurograph" ] || { echo "    FALLA: borro algo"; return 1; }
  no_contiene "rm" "$(llamadas docker)" "nada en Docker" || return 1
}

prueba_borrar_datos_exige_borrar() {
  instalacion_simulada
  NEUROGRAPH_PRUEBA_RESPUESTA=si desinstalar --borrar-datos || return 1
  no_contiene "volume rm" "$(llamadas docker)" "sin escribir BORRAR no se borra" || return 1
  [ -e "$HOME/.local/bin/neurograph" ] || { echo "    FALLA: tampoco debe desinstalar"; return 1; }
}

prueba_borrar_datos_con_borrar() {
  instalacion_simulada
  NEUROGRAPH_PRUEBA_RESPUESTA=BORRAR desinstalar --borrar-datos || { cat "$HOME/pantalla"; return 1; }
  contiene "volume rm neurograph-app-datos" "$(llamadas docker)" "volumen fuera" || return 1
  contiene "La base de datos se ha borrado." "$(cat "$HOME/pantalla")" "lo dice, comprobado" || return 1
  contiene $'La base de datos se ha borrado.\nSe conservan:\n' "$(cat "$HOME/pantalla")" "lo que queda, con su encabezado (B7)" || return 1
  [ ! -e "$HOME/.local/share/neurograph/config.env" ] || { echo "    FALLA: config.env sigue"; return 1; }
  [ ! -e "$HOME/.local/share/neurograph/desinstalar.sh" ] || { echo "    FALLA: queda el desinstalador"; return 1; }
  [ -f "$HOME/NeuroData/original/zip" ] || { echo "    FALLA: la biblioteca nunca se borra"; return 1; }
  contiene "$HOME/NeuroData" "$(cat "$HOME/pantalla")" "dice donde esta la biblioteca" || return 1
}

prueba_borrar_datos_que_docker_no_borra_no_se_da_por_borrada() {
  # Si el volumen sigue, no se dice que se ha borrado ni se borra config.env:
  # una reinstalacion lo adoptaria sin su contrasena (B7).
  instalacion_simulada rm_falla
  ! NEUROGRAPH_PRUEBA_RESPUESTA=BORRAR desinstalar --borrar-datos || return 1
  local p; p="$(cat "$HOME/pantalla")"
  no_contiene "se ha borrado." "$p" "no se da por borrada" || return 1
  contiene "La base de datos no se ha borrado" "$p" "dice que no" || return 1
  contiene "$HOME/.local/share/neurograph/desinstalar.sh --borrar-datos" "$p" "y como repetirlo" || return 1
  [ -f "$HOME/.local/share/neurograph/config.env" ] || { echo "    FALLA: config.env borrado"; return 1; }
  [ -x "$HOME/.local/share/neurograph/desinstalar.sh" ] || { echo "    FALLA: sin desinstalador para repetir"; return 1; }
  no_contiene "Algo ha fallado" "$p" "no es un fallo inesperado" || return 1
}

prueba_borrar_datos_sin_docker_no_pregunta_ni_toca_nada() {
  instalacion_simulada
  docker_que_no_responde 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?'
  ! NEUROGRAPH_PRUEBA_RESPUESTA=BORRAR desinstalar --borrar-datos || return 1
  contiene "No se puede borrar la base de datos: Docker no está en marcha" "$(cat "$HOME/pantalla")" "dice por que" || return 1
  no_contiene "volume rm" "$(llamadas docker)" "no intenta nada" || return 1
  [ -f "$HOME/.local/share/neurograph/config.env" ] && [ -e "$HOME/.local/bin/neurograph" ] || { echo "    FALLA: ha tocado la instalacion"; return 1; }
}

prueba_sin_docker_conserva_el_desinstalador_y_dice_por_que() {
  # Si dice que se vuelva a ejecutar el desinstalador, el desinstalador y lo
  # que necesita (lib/, estado.env con las imagenes descargadas) se quedan (B7).
  instalacion_simulada
  docker_que_no_responde 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?'
  NEUROGRAPH_PRUEBA_RESPUESTA=s desinstalar || { cat "$HOME/pantalla"; return 1; }
  local d="$HOME/.local/share/neurograph" p; p="$(cat "$HOME/pantalla")"
  contiene "Docker no está en marcha" "$p" "motivo" || return 1
  no_contiene "permiso" "$p" "no lo confunde con el permiso" || return 1
  contiene "$d/desinstalar.sh" "$p" "ruta completa del desinstalador" || return 1
  [ -x "$d/desinstalar.sh" ] && [ -f "$d/lib/comun.sh" ] || { echo "    FALLA: desinstalador o lib/ borrados"; return 1; }
  contiene "NG_IMAGENES_DESCARGADAS=python:3.10-slim" "$(cat "$d/estado.env" 2> /dev/null)" "estado.env con las imagenes" || return 1
  no_contiene "NG_IAS_REGISTRADAS=claude" "$(cat "$d/estado.env" 2> /dev/null)" "las IAs ya quitadas no se vuelven a quitar al repetir" || return 1
  [ ! -e "$HOME/.local/bin/neurograph" ] || { echo "    FALLA: lo demas no se desinstala"; return 1; }
}

prueba_sin_permiso_para_docker_lo_distingue() {
  instalacion_simulada
  docker_que_no_responde 'permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock'
  NEUROGRAPH_PRUEBA_RESPUESTA=s desinstalar || { cat "$HOME/pantalla"; return 1; }
  contiene "Esta cuenta no tiene permiso para usar Docker" "$(cat "$HOME/pantalla")" "motivo" || return 1
  no_contiene "no está en marcha" "$(cat "$HOME/pantalla")" "no lo confunde con Docker parado" || return 1
}

prueba_el_desinstalador_no_necesita_la_tractografia() {
  # Solo carga lo que usa (B7): una copia sin tractografia.sh funciona.
  instalacion_simulada
  mkdir -p "$HOME/copia/lib"
  cp "$DES" "$HOME/copia/"; cp "$NG_LIB"/*.sh "$HOME/copia/lib/"; rm "$HOME/copia/lib/tractografia.sh"
  NEUROGRAPH_PRUEBA_RESPUESTA=s NEUROGRAPH_PRUEBA_SIN_PROGRAMAS="codex gemini" bash "$HOME/copia/desinstalar.sh" > "$HOME/pantalla" 2>&1 \
    || { cat "$HOME/pantalla"; return 1; }
  contiene "NeuroGraph desinstalado." "$(cat "$HOME/pantalla")" "desinstala" || return 1
}
