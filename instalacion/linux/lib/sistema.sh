# shellcheck shell=bash disable=SC2034  # NG_RESUMEN y NG_MARCA los lee comun.sh
# Paso 1 del instalador Linux: comprobar el ordenador (B1 del diseno, H10).
# Variables de prueba (sin efecto si no se definen):
#   NEUROGRAPH_PRUEBA_SITIOS        lista de sitios en lugar de NG_SITIOS
#   NEUROGRAPH_PRUEBA_MEMORIA_MB    memoria libre simulada
#   NEUROGRAPH_PRUEBA_ESPACIO_MB    espacio libre simulado (en todo disco)
#   NEUROGRAPH_PRUEBA_SIN_PROGRAMAS programas que se dan por ausentes
#   NG_OS_RELEASE                   otro /etc/os-release

NG_OS_RELEASE="${NG_OS_RELEASE:-/etc/os-release}"

# Sitios de los que se descarga algo (B1): Docker Hub, paquetes de las
# imagenes, PyPI, npm y Zenodo. download.docker.com se anade si hay que
# instalar Docker.
NG_SITIOS=(registry-1.docker.io auth.docker.io production.cloudflare.docker.com
  deb.debian.org pypi.org files.pythonhosted.org registry.npmjs.org zenodo.org)


familia_distro() {  # -> ubuntu | debian | otra
  local id like
  # shellcheck source=/dev/null
  id="$( (. "$NG_OS_RELEASE" 2> /dev/null && echo "${ID:-}") || true)"
  # shellcheck source=/dev/null
  like="$( (. "$NG_OS_RELEASE" 2> /dev/null && echo "${ID_LIKE:-}") || true)"
  case " $id $like " in
    *" ubuntu "*) echo ubuntu ;;
    *) if [ "$id" = debian ]; then echo debian; else echo otra; fi ;;
  esac
}

codename_docker() {  # nombre en clave para el repositorio de Docker (B1)
  if [ "$(familia_distro)" = ubuntu ]; then
    # shellcheck source=/dev/null
    (. "$NG_OS_RELEASE" && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
  else
    # shellcheck source=/dev/null
    (. "$NG_OS_RELEASE" && echo "$VERSION_CODENAME")
  fi
}

existe_programa() {  # programa
  case " ${NEUROGRAPH_PRUEBA_SIN_PROGRAMAS:-} " in *" $1 "*) return 1 ;; esac
  command -v "$1" >/dev/null 2>&1
}

apt_instalar() {  # paquete... (pide la contrasena)
  decir "Hace falta instalar $*; te pedirá la contraseña de administrador."
  # DPkg::Lock::Timeout: espera si otro apt tiene el bloqueo. En la maquina
  # virtual (B8.6) se comprueba si "update" tambien espera.
  sudo apt-get -o DPkg::Lock::Timeout=300 update || fallar apt "$*"
  sudo apt-get -o DPkg::Lock::Timeout=300 install -y "$@" || fallar apt "$*"
}

# flock, ss y sg vienen en cualquier sistema de escritorio, pero su paquete
# cambia de una version a otra (sg: login en Ubuntu 24.04, util-linux-extra
# en 26.04): si faltan, se pide instalarlos. curl es el que falta de verdad
# en un Ubuntu limpio y se instala solo en la familia Debian.
comprobar_programas() {  # bash >= 4.4 lo comprueba cada ejecutable antes de cargar nada
  local p
  for p in flock ss sg; do existe_programa "$p" || fallar programa "$p"; done
  existe_programa curl && return 0
  case "$(familia_distro)" in
    ubuntu|debian) apt_instalar curl; existe_programa curl || fallar programa curl ;;
    *) fallar programa curl ;;
  esac
}

comprobar_conexion() {  # [sitio_extra...]
  local sitio codigo sitios=()
  if [ -n "${NEUROGRAPH_PRUEBA_SITIOS:-}" ]; then
    read -ra sitios <<< "$NEUROGRAPH_PRUEBA_SITIOS"
  else
    sitios=("${NG_SITIOS[@]}" "$@")
  fi
  for sitio in "${sitios[@]}"; do
    codigo="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://$sitio/" || true)"
    echo "conexion $sitio: ${codigo:-sin respuesta}"
    if [ -z "$codigo" ] || [ "$codigo" = 000 ]; then fallar conexion "$sitio"; fi
  done
}

espacio_libre_mb() {  # ruta (si no existe, la carpeta existente mas cercana)
  if [ -n "${NEUROGRAPH_PRUEBA_ESPACIO_MB:-}" ]; then echo "$NEUROGRAPH_PRUEBA_ESPACIO_MB"; return 0; fi
  local d="$1"
  while [ ! -d "$d" ] && [ "$d" != / ]; do d="$(dirname "$d")"; done
  df --output=avail -m "$d" | tail -1 | tr -d ' '
}

memoria_libre_mb() {
  if [ -n "${NEUROGRAPH_PRUEBA_MEMORIA_MB:-}" ]; then echo "$NEUROGRAPH_PRUEBA_MEMORIA_MB"; return 0; fi
  awk '/^MemAvailable:/ { print int($2 / 1024) }' /proc/meminfo
}

dir_docker() {  # donde guarda Docker sus datos
  local d=""
  if existe_programa docker; then d="$(docker info -f '{{.DockerRootDir}}' 2>/dev/null || true)"; fi
  echo "${d:-/var/lib/docker}"
}

# Si no llega para la base, se para; si no llega para la tractografia, se
# anota el motivo y el paso 8 la deja pendiente (B1, decision del 02/10).
comprobar_recursos() {  # paso 1; usa NG_BIBLIOTECA_ELEGIDA
  local mem dd dock
  mem="$(memoria_libre_mb)"
  dd="$(dir_docker)"
  dock="$(espacio_libre_mb "$dd")"
  echo "recursos: memoria $mem MB, docker ($dd) $dock MB"
  [ "$mem" -ge "$NG_MIN_MEMORIA_BASE_MB" ] || fallar memoria_base "$NG_MIN_MEMORIA_BASE_MB MB (hay $mem MB)"
  [ "$dock" -ge "$NG_MIN_ESPACIO_DOCKER_MB" ] \
    || fallar espacio "para Docker en $dd: hacen falta $NG_MIN_ESPACIO_DOCKER_MB MB y hay $dock MB"
  comprobar_recursos_tracto "$NG_MIN_ESPACIO_DOCKER_MB"
}

# Lo que necesita la tractografia. Tambien lo usa "neurograph tractografia",
# que no construye nada (sin espacio reservado para las imagenes): asi un
# motivo anotado al instalar no la bloquea para siempre.
comprobar_recursos_tracto() {  # [MB de Docker ya reservados para lo demas]; usa NG_BIBLIOTECA_ELEGIDA
  local reservado="${1:-0}" mem dd dock bib motivo=""
  mem="$(memoria_libre_mb)"
  dd="$(dir_docker)"
  dock="$(espacio_libre_mb "$dd")"
  bib="$(espacio_libre_mb "$NG_BIBLIOTECA_ELEGIDA")"
  echo "recursos de la tractografia: memoria $mem MB, docker $dock MB, biblioteca $bib MB"
  if [ "$mem" -lt "$NG_MIN_MEMORIA_TRACTO_MB" ]; then
    motivo="memoria insuficiente (hacen falta $NG_MIN_MEMORIA_TRACTO_MB MB libres y hay $mem MB)"
  elif [ "$dock" -lt $((reservado + NG_MIN_ESPACIO_DOCKER_TRACTO_MB)) ]; then
    motivo="espacio insuficiente para Docker en $dd (hacen falta $((reservado + NG_MIN_ESPACIO_DOCKER_TRACTO_MB)) MB y hay $dock MB)"
  elif [ "$bib" -lt "$NG_MIN_ESPACIO_BIBLIOTECA_TRACTO_MB" ]; then
    motivo="espacio insuficiente en la biblioteca (hacen falta $NG_MIN_ESPACIO_BIBLIOTECA_TRACTO_MB MB y hay $bib MB)"
  fi
  if [ -n "$motivo" ]; then
    guardar_valor "$NG_ESTADO" NG_TRACTO_SIN_RECURSOS "$motivo"
    avisar "La tractografía no se instalará ahora: $motivo."
  else
    borrar_valor "$NG_ESTADO" NG_TRACTO_SIN_RECURSOS
  fi
}

comprobar_arquitectura() {
  [ "$(uname -m)" = x86_64 ] || avisar "Este ordenador es $(uname -m): NeuroGraph solo se ha probado en x86_64."
}

# Nunca se escribe en una carpeta ajena (B2): vale si no existe, si esta
# vacia, si tiene el manifiesto o si tiene original/ (biblioteca anterior a la H8).
# Discos donde se buscan bibliotecas que ya existen: la biblioteca puede ir
# en otro disco, como un SSD (docs/portabilidad.md).
NG_DISCOS_BIBLIOTECA="${NG_DISCOS_BIBLIOTECA:-/media/$(id -un)/* /run/media/$(id -un)/* /mnt/*}"

bibliotecas_existentes() {  # -> una ruta por linea: ~/NeuroData y la NeuroData de cada disco, si llevan su manifiesto
  local d
  # shellcheck disable=SC2086  # los comodines de NG_DISCOS_BIBLIOTECA se expanden a proposito
  for d in "$HOME" $NG_DISCOS_BIBLIOTECA; do
    if [ -f "$d/NeuroData/.neurograph_library.yaml" ]; then echo "$d/NeuroData"; fi
  done
}

# La biblioteca de la primera instalacion, sin --biblioteca (B2): se propone
# una que ya exista, o ~/NeuroData, y se puede escribir o arrastrar otra.
elegir_biblioteca() {  # -> NG_BIBLIOTECA_ELEGIDA
  local encontradas propuesta r
  mapfile -t encontradas < <(bibliotecas_existentes)
  propuesta="${encontradas[0]:-$HOME/NeuroData}"
  if [ -z "${NEUROGRAPH_PRUEBA_RESPUESTA:-}" ] && ! hay_terminal; then
    echo "sin terminal: biblioteca propuesta, sin preguntar: $propuesta"
    NG_BIBLIOTECA_ELEGIDA="$propuesta"
    return 0
  fi
  if [ "${#encontradas[@]}" -gt 1 ]; then
    decir "      Hay bibliotecas de NeuroGraph en: $(printf '%s, ' "${encontradas[@]}" | sed 's/, $//')"
  fi
  if preguntar_si "¿Guardar la biblioteca de datos (unos 630 MB) en $propuesta?"; then
    NG_BIBLIOTECA_ELEGIDA="$propuesta"
    return 0
  fi
  r="${NEUROGRAPH_PRUEBA_BIBLIOTECA:-}"
  if [ -z "$r" ] && hay_terminal; then
    interrumpir_linea
    printf '      Escribe la carpeta (o arrástrala aquí desde el gestor de archivos) y pulsa Intro: ' >&3
    read -r r < /dev/tty || r=""
  fi
  # Al arrastrar una carpeta, la terminal la escribe entre comillas y con un espacio detras.
  r="${r#"${r%%[![:space:]]*}"}"
  r="${r%"${r##*[![:space:]]}"}"
  case "$r" in \'*\'|\"*\") r="${r:1:${#r}-2}" ;; esac
  # shellcheck disable=SC2088  # la tilde escrita se sustituye a mano por $HOME
  case "$r" in '~') r="$HOME" ;; '~/'*) r="$HOME/${r#'~/'}" ;; esac
  echo "biblioteca escrita: ${r:-(ninguna)}"
  [ -n "$r" ] || fallar biblioteca_no_elegida
  NG_BIBLIOTECA_ELEGIDA="$(realpath -m -- "$r")"
}

comprobar_biblioteca() {  # ruta
  local d="$1"
  # Una coma o unas comillas romperian el --mount de docker run (paso 8), y
  # un salto de linea, config.env (B2).
  # ": " cortaria la ruta en los mensajes (el detalle va tras el ultimo ": ").
  case "$d" in *,*|*\"*|*$'\n'*|*': '*) fallar biblioteca_ruta "$d" ;; esac
  [ -d "$d" ] || return 0
  [ -r "$d" ] && [ -w "$d" ] || fallar biblioteca_sin_permiso "$d"
  [ -f "$d/.neurograph_library.yaml" ] && return 0
  [ -d "$d/original" ] && return 0
  [ -z "$(ls -A "$d")" ] && return 0
  fallar biblioteca_ajena "$d"
}

paso_comprobar() {
  comprobar_programas
  local extra=()
  if ! existe_programa docker && [ "$(familia_distro)" != otra ]; then extra=(download.docker.com); fi
  comprobar_conexion "${extra[@]}"
  comprobar_recursos
  comprobar_arquitectura
  comprobar_biblioteca "$NG_BIBLIOTECA_ELEGIDA"
  NG_RESUMEN="Linux, programas, internet, espacio, memoria"
}
