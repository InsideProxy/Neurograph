#!/usr/bin/env bash
# Instalador de NeuroGraph para Linux (H10). Diseno completo en
# docs/instalador-linux-diseno.md. Uso: ./instalar.sh [--biblioteca RUTA]
# shellcheck disable=SC2034  # NG_RAIZ y NG_REPETIR los leen las bibliotecas de lib/
set -Eeuo pipefail
shopt -s inherit_errexit 2> /dev/null || true  # bash < 4.4 no lo tiene: lo para la comprobacion siguiente
if [ "${BASH_VERSINFO[0]}" -lt 4 ] || { [ "${BASH_VERSINFO[0]}" -eq 4 ] && [ "${BASH_VERSINFO[1]}" -lt 4 ]; }; then
  echo "Hace falta bash 4.4 o posterior. Actualiza el sistema e inténtalo de nuevo." >&2; exit 1
fi
NG_EJECUTABLE="$(readlink -f "${BASH_SOURCE[0]}")"
NG_RAIZ="$(cd "$(dirname "$NG_EJECUTABLE")/../.." && pwd)"
for l in comun sistema docker puertos imagenes base tractografia mcp ias escritorio; do
  # shellcheck source=/dev/null
  source "$(dirname "$NG_EJECUTABLE")/lib/$l.sh"
done
NG_REPETIR="el instalador ($NG_EJECUTABLE)"

NG_ARGS=("$@")
NG_ARG_BIBLIOTECA=""
while [ $# -gt 0 ]; do
  case "$1" in
    --biblioteca) NG_ARG_BIBLIOTECA="${2:-}"; [ -n "$NG_ARG_BIBLIOTECA" ] || { echo "Falta la ruta tras --biblioteca." >&2; exit 1; }; shift 2 ;;
    -h|--ayuda|--help) echo "Uso: ./instalar.sh [--biblioteca RUTA]   (sin la opción, la primera vez se pregunta; se propone ~/NeuroData o una biblioteca que ya exista)"; exit 0 ;;
    *) echo "Opción desconocida: $1. Uso: ./instalar.sh [--biblioteca RUTA]" >&2; exit 1 ;;
  esac
done

# La biblioteca: la opcion, la guardada o, en la primera instalacion, la que
# se elija al empezar (B2).
NG_BIBLIOTECA_ELEGIDA="${NG_ARG_BIBLIOTECA:-$(leer_valor "$NG_CONFIG" NG_BIBLIOTECA)}"
NG_BIBLIOTECA_POR_ELEGIR=0
[ -n "$NG_BIBLIOTECA_ELEGIDA" ] || NG_BIBLIOTECA_POR_ELEGIR=1
NG_BIBLIOTECA_ELEGIDA="$(realpath -m "${NG_BIBLIOTECA_ELEGIDA:-$HOME/NeuroData}")"

NG_CARGA_TERMINADA=0
NG_BLOQUEO_TOMADO=0
al_salir_extra() {
  # Sin el bloqueo, lo que hay es de otra ejecucion en marcha: no se toca (B1).
  [ "$NG_BLOQUEO_TOMADO" = 1 ] || return 0
  parar_tractografia_en_curso
  [ "$1" = 0 ] && return 0
  [ "$NG_CARGA_TERMINADA" = 1 ] || limpiar_lo_incompleto
  guardar_valor "$NG_ESTADO" NG_INSTALACION incompleta
}

iniciar_registro instalar
instalar_trampas
tomar_bloqueo
NG_BLOQUEO_TOMADO=1
if [ -z "${NEUROGRAPH_CONTINUAR_EN:-}" ]; then
  rm -f "$NG_AVISOS_ARCHIVO"
  guardar_valor "$NG_ESTADO" NG_INSTALACION incompleta
  if [ "$NG_BIBLIOTECA_POR_ELEGIR" = 1 ]; then
    decir "Instalando NeuroGraph."
    elegir_biblioteca
    NG_ARGS+=(--biblioteca "$NG_BIBLIOTECA_ELEGIDA")  # el relanzado con sg no vuelve a preguntar
    decir "Biblioteca de datos: $NG_BIBLIOTECA_ELEGIDA"
  else
    decir "Instalando NeuroGraph. Biblioteca de datos: $NG_BIBLIOTECA_ELEGIDA"
  fi
  decir ""
fi

paso_8() { paso_tractografia || true; }

paso 1 "Comprobando el ordenador" paso_comprobar
paso 2 "Docker" paso_docker
paso 3 "Permiso para usar Docker" paso_permiso
if [ "$NG_RELANZAR" = 1 ]; then relanzar_con_grupo_docker 4 "${NG_ARGS[@]}"; fi
if [ "${NEUROGRAPH_CONTINUAR_EN:-0}" -ge 4 ]; then
  docker info > /dev/null 2>&1 || fallar docker_permiso
  comprobar_daemon_docker
fi
paso 4 "Comprobando puertos" elegir_puertos
paso 5 "Preparando NeuroGraph (5-10 min la primera vez)" paso_imagenes largo
paso 6 "Encendiendo" paso_encender
paso 7 "Cargando datos (24 archivos)" paso_cargar
NG_CARGA_TERMINADA=1
paso 8 "Tractografía (unos 500 MB)" paso_8 largo
paso 9 "Iconos, comandos y conexión con IAs" paso_escritorio

comprobacion_final
guardar_valor "$NG_ESTADO" NG_INSTALACION completa
pantalla_final
