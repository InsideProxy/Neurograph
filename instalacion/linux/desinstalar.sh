#!/usr/bin/env bash
# Desinstalador de NeuroGraph para Linux (H10, B7 del diseno).
# Por defecto conserva los datos: el volumen de la base, config.env (con
# la contrasena y la marca NG_BASE_CARGADA, sin las que una reinstalacion
# no podria usar el volumen), los registros y la biblioteca. Con
# --borrar-datos borra tambien el volumen y config.env, tras escribir
# BORRAR. La biblioteca nunca se borra sola (principio 15).
# Uso: desinstalar.sh [--borrar-datos]
# shellcheck disable=SC2034  # NG_REPETIR lo lee comun.sh
set -Eeuo pipefail
shopt -s inherit_errexit 2> /dev/null || true  # bash < 4.4 no lo tiene: lo para la comprobacion siguiente
if [ "${BASH_VERSINFO[0]}" -lt 4 ] || { [ "${BASH_VERSINFO[0]}" -eq 4 ] && [ "${BASH_VERSINFO[1]}" -lt 4 ]; }; then
  echo "Hace falta bash 4.4 o posterior. Actualiza el sistema e inténtalo de nuevo." >&2; exit 1
fi
NG_EJECUTABLE="$(readlink -f "${BASH_SOURCE[0]}")"
for l in comun sistema docker ias; do
  # shellcheck source=/dev/null
  source "$(dirname "$NG_EJECUTABLE")/lib/$l.sh"
done
NG_REPETIR="el desinstalador"
NG_PROYECTO="$(leer_valor "$NG_CONFIG" NG_PROYECTO)"
NG_PROYECTO="${NG_PROYECTO:-neurograph-app}"

borrar_datos=0
case "${1:-}" in
  --borrar-datos) borrar_datos=1 ;;
  '') ;;
  *) echo "Uso: desinstalar.sh [--borrar-datos]" >&2; exit 1 ;;
esac

iniciar_registro desinstalar
instalar_trampas
tomar_bloqueo

# Con Docker instalado pero parado o sin permiso, se desinstala lo demas y
# se conservan el desinstalador, lib/ y estado.env (con las imagenes
# descargadas), para quitar despues lo de Docker: no se para todo por eso (B7).
hay_docker=0
docker_pendiente=0
sin_docker=""  # por que no se puede usar Docker
if ! command -v docker > /dev/null 2>&1; then
  sin_docker="Docker no está instalado"
elif docker info > /dev/null 2>&1; then
  hay_docker=1
elif cuenta_en_grupo_docker && ! proceso_con_grupo_docker && [ -z "${NEUROGRAPH_CON_GRUPO_DOCKER:-}" ]; then
  # Hereda el registro (si no, perderia la terminal) y el bloqueo ya tomado.
  export NEUROGRAPH_CON_GRUPO_DOCKER=1 NEUROGRAPH_REGISTRO="$NG_REGISTRO" NEUROGRAPH_BLOQUEO_HEREDADO=1
  exec sg docker -c "exec $(citar_sh "$NG_EJECUTABLE" "$@")"
else
  docker_pendiente=1
  # El texto del error distingue un socket sin permiso de un demonio parado (B1).
  if [[ "$(docker info 2>&1 || true)" == *"permission denied"* ]]; then
    sin_docker="esta cuenta no tiene permiso para usar Docker"
  else
    sin_docker="Docker no está en marcha (arráncalo con: sudo systemctl start docker)"
  fi
fi
bib="$(leer_valor "$NG_CONFIG" NG_BIBLIOTECA)"
vol="$NG_PROYECTO-datos"

if [ "$borrar_datos" = 1 ]; then
  # Sin Docker no se puede borrar ni comprobar el volumen: se para antes de preguntar (B7).
  [ "$hay_docker" = 1 ] || fallar borrar_sin_docker "$sin_docker"
  decir "Se desinstalará NeuroGraph y se borrará su base de datos. La biblioteca (${bib:-~/NeuroData}) no se toca."
  respuesta="${NEUROGRAPH_PRUEBA_RESPUESTA:-}"
  if [ -z "$respuesta" ] && { : < /dev/tty; } 2> /dev/null; then
    printf 'Escribe BORRAR para confirmarlo: ' >&3; read -r respuesta < /dev/tty || respuesta=""
  fi
  if [ "$respuesta" != BORRAR ]; then decir "No se ha borrado nada."; exit 0; fi
else
  if [ "$docker_pendiente" = 1 ]; then
    decir "${sin_docker^}: se desinstala lo demás, pero los contenedores y las imágenes de NeuroGraph quedan en Docker."
  fi
  preguntar_si "¿Desinstalar NeuroGraph? Tus datos se conservan." n || { decir "No se ha desinstalado nada."; exit 0; }
fi

base_borrada=0
en_uso=()  # imagenes descargadas que se conservan porque las usa otro contenedor
if [ "$hay_docker" = 1 ]; then
  docker rm -f "$NG_PROYECTO-postgres" "$NG_PROYECTO-api" "$NG_PROYECTO-web" "$NG_PROYECTO-tractografia" > /dev/null 2>&1 || true
  for img in "$NG_PROYECTO-herramientas" "$NG_PROYECTO-web" "$NG_PROYECTO-api"; do docker rmi "$img" > /dev/null 2>&1 || true; done
  for img in $(leer_valor "$NG_ESTADO" NG_IMAGENES_DESCARGADAS); do
    if [ -z "$(docker ps -a --filter "ancestor=$img" -q 2> /dev/null || true)" ]; then
      docker rmi "$img" > /dev/null 2>&1 || true
    else
      echo "imagen $img en uso por otro contenedor: se conserva"
      en_uso+=("$img")
    fi
  done
  docker network rm "${NG_PROYECTO}_default" > /dev/null 2>&1 || true
  if [ "$borrar_datos" = 1 ]; then
    docker volume rm "$vol" || true
    # Solo se da por borrado si ya no esta en la lista: un volume rm fallido
    # no se oculta, y config.env se conserva con su contrasena (B7).
    if volumenes="$(docker volume ls -q)" && ! grep -qxF -- "$vol" <<< "$volumenes"; then base_borrada=1; fi
  fi
fi
for ia in $(leer_valor "$NG_ESTADO" NG_IAS_REGISTRADAS); do quitar_ia "$ia"; done
# Ya quitadas: si estado.env se conserva para repetir, no se vuelven a quitar
# (la persona podria haber anadido su propio "neurograph" entretanto).
borrar_valor "$NG_ESTADO" NG_IAS_REGISTRADAS
rm -f "$NG_BIN/neurograph" "$NG_BIN/neurograph-mcp" \
  "$HOME/.local/share/applications/neurograph.desktop" "$HOME/.local/share/applications/neurograph-apagar.desktop"
rm -f "$NG_DIR/compose.yml" "$NG_DIR/conectar-ia.md" "$NG_DIR/neurograph.png" "$NG_AVISOS_ARCHIVO"
# Si queda algo por quitar en Docker, el desinstalador se queda para repetirlo (B7).
if [ "$docker_pendiente" = 0 ] && { [ "$borrar_datos" = 0 ] || [ "$base_borrada" = 1 ]; }; then
  rm -rf "${NG_DIR:?}/lib"
  rm -f "$NG_DIR/estado.env" "$NG_DIR/desinstalar.sh"
fi

decir "NeuroGraph desinstalado."
if [ "$base_borrada" = 1 ]; then
  rm -f "$NG_CONFIG"
  decir "La base de datos se ha borrado."
fi
decir "Se conservan:"
if [ "$base_borrada" = 0 ]; then
  vol_tam=""
  [ "$hay_docker" = 1 ] && vol_tam="$(docker system df -v 2> /dev/null | awk -v n="$vol" '$1 == n { print $NF }' || true)"
  decir "  la base de datos (volumen $vol${vol_tam:+, $vol_tam}) y su configuración: si reinstalas, se recuperan;"
fi
for img in "${en_uso[@]}"; do decir "  la imagen $img, que usa otro contenedor;"; done
[ -n "$bib" ] && [ -d "$bib" ] && decir "  la biblioteca $bib ($(du -sh "$bib" 2> /dev/null | cut -f1)): no se borra sola; si no la quieres, bórrala a mano;"
[ "$hay_docker" = 1 ] && decir "  la caché de construcción de Docker ($(docker system df --format '{{.Type}} {{.Size}}' 2> /dev/null | sed -n 's/^Build Cache //p')): es común a todos los proyectos (docker builder prune);"
decir "  los registros, en $NG_DIR/registro."
if [ "$docker_pendiente" = 1 ]; then
  decir "Para quitar lo que queda en Docker, vuelve a ejecutar $NG_DIR/desinstalar.sh cuando Docker responda."
fi
if [ "$borrar_datos" = 1 ] && [ "$base_borrada" = 0 ]; then fallar base_no_borrada "$vol" "$NG_DIR/desinstalar.sh"; fi
