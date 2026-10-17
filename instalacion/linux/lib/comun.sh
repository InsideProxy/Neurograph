# shellcheck shell=bash
# Funciones comunes del instalador Linux (H10): constantes, registro,
# pantalla, pasos, preguntas, fallar, bloqueo y trampas. Lo que ve la
# persona va al descriptor 3; la salida tecnica, al registro (B1 del diseno).
# Variables de prueba (sin efecto si no se definen):
#   NEUROGRAPH_PRUEBA_RESPUESTA  respuesta a las preguntas (preguntar_si y el BORRAR del desinstalador)
#   NEUROGRAPH_PRUEBA_SIN_TERMINAL=1  se comporta como si no hubiera terminal
#   NEUROGRAPH_PRUEBA_BIBLIOTECA la carpeta que se escribe al elegir la biblioteca (sistema.sh)
#   NEUROGRAPH_PRUEBA_LATIDO_S   segundos entre los puntos del latido (20)

# cd con CDPATH exportado imprime la ruta: de ahi el > /dev/null.
NG_LIB_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" > /dev/null && pwd)"
# shellcheck source=catalogo.sh
source "$NG_LIB_DIR/catalogo.sh"
# shellcheck source=config.sh
source "$NG_LIB_DIR/config.sh"
# shellcheck source=esperado.sh
source "$NG_LIB_DIR/esperado.sh"

# shellcheck disable=SC2034  # constantes que usan las demas bibliotecas
{
NG_PROYECTO="${NEUROGRAPH_PRUEBA_PROYECTO:-neurograph-app}"
NG_DIR="$HOME/.local/share/neurograph"
NG_BIN="$HOME/.local/bin"
NG_CONFIG="$NG_DIR/config.env"
NG_ESTADO="$NG_DIR/estado.env"
NG_AVISOS_ARCHIVO="$NG_DIR/.avisos"
}
NG_TOTAL=9
NG_REGISTRO=""
NG_PASO=""
NG_RESUMEN=""
NG_MARCA="✔"
NG_REPETIR="${NG_REPETIR:-la misma orden}"
NG_ULTIMA_FRASE=""
NG_FALLO_MOSTRADO=0
NG_ERROR_ANOTADO=0
# Linea del paso en pantalla: 0 cerrada, 1 abierta esperando su marca,
# 2 interrumpida por un mensaje (la marca ira sangrada en otra linea).
NG_LINEA=0
NG_LATIDO_PID=""
NG_PID_PRINCIPAL=$$

iniciar_registro() {  # nombre (instalar, desinstalar, abrir...)
  mkdir -p "$NG_DIR/registro"
  # Tras relanzar con sg (paso 3), el descriptor 3 heredado ya es la
  # terminal y se sigue en el mismo registro: no se rehace nada.
  if [ -n "${NEUROGRAPH_REGISTRO:-}" ] && { true >&3; } 2> /dev/null; then
    NG_REGISTRO="$NEUROGRAPH_REGISTRO"
    unset NEUROGRAPH_REGISTRO
    # Sigue como variable del shell (la lee paso) pero ya no se hereda a los hijos.
    export -n NEUROGRAPH_CONTINUAR_EN
    exec >> "$NG_REGISTRO" 2>&1
    echo "== $(date -Is) $1 continua tras relanzar (pid $$) =="
    return 0
  fi
  NG_REGISTRO="$NG_DIR/registro/$1-$(date +%Y%m%d-%H%M%S).log"
  exec 3>&1
  exec >> "$NG_REGISTRO" 2>&1
  echo "== $(date -Is) $1 (pid $$) =="
  echo "sistema: $(uname -srm); $( (. /etc/os-release 2> /dev/null && echo "${PRETTY_NAME:-}") || true)"
}

interrumpir_linea() {  # si la linea de un paso esta abierta, salta a otra
  if [ "$NG_LINEA" = 1 ]; then printf '\n' >&3; NG_LINEA=2; fi
}

decir() {  # texto -> pantalla (sangrado si va a mitad de un paso) y registro
  interrumpir_linea
  if [ "$NG_LINEA" = 2 ]; then printf '      %s\n' "$*" >&3; else printf '%s\n' "$*" >&3; fi
  echo "[pantalla] $*"
}

avisar() {  # texto -> se guarda para mostrarlo despues (pantalla final o abrir)
  mkdir -p "$NG_DIR"
  printf '%s\n' "$*" >> "$NG_AVISOS_ARCHIVO"
  echo "[aviso] $*"
}

latido_empezar() {  # un punto cada 20 s en pasos largos, para que no parezca colgado
  # Sin el descriptor 9: un sleep huerfano retendria el bloqueo tras salir (B1).
  ( trap - ERR; exec 9>&-; while sleep "${NEUROGRAPH_PRUEBA_LATIDO_S:-20}"; do printf '.' >&3; done ) &
  NG_LATIDO_PID=$!
}

latido_parar() {
  if [ -n "$NG_LATIDO_PID" ]; then
    kill "$NG_LATIDO_PID" 2> /dev/null || true
    wait "$NG_LATIDO_PID" 2> /dev/null || true
    NG_LATIDO_PID=""
  fi
}

marca_de_paso() {  # marca resumen
  if [ "$NG_LINEA" = 2 ]; then printf '      %s  %s\n' "$1" "$2" >&3; else printf ' %s  %s\n' "$1" "$2" >&3; fi
  NG_LINEA=0
}

paso() {  # numero titulo funcion [largo]
  local puntos
  # Tras relanzar con sg (paso 3), los pasos ya hechos no se repiten.
  if [ "$1" -lt "${NEUROGRAPH_CONTINUAR_EN:-0}" ]; then return 0; fi
  NG_PASO="$1"; NG_RESUMEN=""; NG_MARCA="✔"
  printf -v puntos '%*s' $(( 42 - ${#2} > 2 ? 42 - ${#2} : 2 )) ''
  printf '[%s/%s] %s %s' "$1" "$NG_TOTAL" "$2" "${puntos// /.}" >&3
  NG_LINEA=1
  echo "== paso $1: $2 ($(date +%T)) =="
  if [ "${4:-}" = largo ]; then latido_empezar; fi
  "$3"
  latido_parar
  marca_de_paso "$NG_MARCA" "$NG_RESUMEN"
  echo "== paso $1 hecho: $NG_MARCA $NG_RESUMEN =="
}

cerrar_linea_de_paso() {  # si un paso quedo a medias, lo marca con ✘
  latido_parar
  if [ "$NG_LINEA" != 0 ]; then marca_de_paso "✘" ""; fi
}

# Si se puede preguntar a la persona: hay una terminal de la que leer.
hay_terminal() {
  [ -z "${NEUROGRAPH_PRUEBA_SIN_TERMINAL:-}" ] && { : < /dev/tty; } 2> /dev/null
}

preguntar_si() {  # pregunta [s|n por defecto] -> 0 si la respuesta es si
  local r defecto="${2:-s}"
  if [ -n "${NEUROGRAPH_PRUEBA_RESPUESTA:-}" ]; then
    r="$NEUROGRAPH_PRUEBA_RESPUESTA"
  elif hay_terminal; then
    interrumpir_linea
    if [ "$defecto" = s ]; then printf '      %s [S/n] ' "$1" >&3; else printf '      %s [s/N] ' "$1" >&3; fi
    read -r r < /dev/tty || r=""
  else
    echo "sin terminal: no se pregunta «$1» y se toma como no"
    return 1
  fi
  echo "pregunta: $1 -> ${r:-(intro)}"
  r="${r,,}"
  [ -n "$r" ] || r="$defecto"
  case "$r" in s|si|sí|y|yes) return 0 ;; *) return 1 ;; esac
}

mostrar_fallo() {  # frase
  # shellcheck disable=SC2034  # la lee notificar_fallo (escritorio.sh), desde un icono
  NG_ULTIMA_FRASE="$1"
  cerrar_linea_de_paso
  decir ""
  decir "$1"
  decir "Registro: $NG_REGISTRO"
  NG_FALLO_MOSTRADO=1
}

fallar() {  # codigo [dato...] -> frase, registro y salida 1 (solo en el proceso principal)
  local texto
  texto="$(frase "$@")"
  echo "FALLO [$1] en el paso ${NG_PASO:-?}: $texto"
  mostrar_fallo "$texto"
  exit 1
}

# Trampa de errores: un fallo que no esta en el catalogo. Escribe en la
# salida de errores (que va al registro), nunca en la estandar: dentro de
# $(...) se colaria en el valor capturado. BASH_COMMAND es el texto de la
# orden sin expandir, asi que una variable con la contrasena no llega al
# registro. Con set -E la trampa tambien salta en subshells: ahi solo se
# anota, y el proceso principal decide.
al_error() {
  local estado=$? linea="${BASH_LINENO[0]}" origen="${BASH_SOURCE[1]:-?}" orden="$BASH_COMMAND"
  if [ "$BASHPID" != "$NG_PID_PRINCIPAL" ]; then
    echo "ERROR: estado $estado en un subshell, en la linea $linea de $origen: $orden" >&2
    return 0
  fi
  [ "$NG_ERROR_ANOTADO" = 1 ] && return 0
  NG_ERROR_ANOTADO=1
  echo "ERROR: estado $estado en el paso ${NG_PASO:-?}, en la linea $linea de $origen: $orden" >&2
  [ "$NG_FALLO_MOSTRADO" = 1 ] || mostrar_fallo "$(frase inesperado)"
}

al_interrumpir() {
  trap '' INT TERM  # un segundo Ctrl+C no corta la limpieza
  echo "Interrumpido por la persona (señal)."
  mostrar_fallo "Interrumpido. Puedes volver a ejecutar $NG_REPETIR: seguirá donde haga falta."
  exit 130
}

# Cada ejecutable define al_salir_extra (su limpieza) si la necesita.
al_salir() {
  local estado=$?
  set +e
  trap - ERR        # un fallo de la limpieza no es un fallo de la instalacion
  trap '' INT TERM  # y un Ctrl+C no la corta
  latido_parar
  # set -u o un exit directo no pasan por fallar ni por la trampa ERR: sin
  # esto la persona vería la salida cortada sin una palabra (B1).
  if [ "$estado" != 0 ] && [ "$NG_FALLO_MOSTRADO" != 1 ] && { true >&3; } 2> /dev/null; then
    echo "ERROR: salida con estado $estado sin mensaje para la persona"
    mostrar_fallo "$(frase inesperado)"
  fi
  if declare -F al_salir_extra > /dev/null; then al_salir_extra "$estado"; fi
  echo "== fin (estado $estado) $(date -Is) =="
  exit "$estado"
}

instalar_trampas() {
  trap al_error ERR
  trap al_interrumpir INT TERM
  trap al_salir EXIT
}

tomar_bloqueo() {
  command -v flock > /dev/null || fallar programa flock
  # Tras relanzar con sg, el descriptor 9 heredado ya tiene el bloqueo; solo
  # se confia en la variable si el descriptor de verdad lo tiene.
  if [ -n "${NEUROGRAPH_BLOQUEO_HEREDADO:-}" ]; then
    unset NEUROGRAPH_BLOQUEO_HEREDADO
    if flock -n 9 2> /dev/null; then return 0; fi
  fi
  mkdir -p "$NG_DIR"
  exec 9> "$NG_DIR/.bloqueo"
  flock -n 9 || fallar en_marcha
}
