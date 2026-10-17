# shellcheck shell=bash disable=SC2034  # NG_RESUMEN, NG_MARCA y NG_RELANZAR los leen comun.sh e instalar.sh
# Pasos 2 y 3 del instalador Linux: Docker y su permiso (B1 del diseno, H10).

contenedor_en_marcha() {  # nombre
  [ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null || true)" = true ]
}

docker_es_snap() {  # /snap/bin/docker es un enlace a /usr/bin/snap: se mira la ruta, no su destino
  [[ "$(command -v docker)" == /snap/* ]]
}

# Paquetes comprobados en packages.ubuntu.com y packages.debian.org (Paso 1).
# En Debian solo se nombra un paquete que de verdad sirve: docker-compose es
# el 1.x (Python) en bookworm y docker-buildx no existe en todas las versiones.
falta_plugin() {  # compose|buildx -> frase con lo que hay que instalar
  local oficial="docker-compose-plugin" ubuntu="docker-compose-v2" debian="docker-compose" paquete="" candidato
  [ "$1" = buildx ] && { oficial="docker-buildx-plugin"; ubuntu="docker-buildx"; debian="docker-buildx"; }
  if [[ "$(dpkg -S "$(readlink -f "$(command -v docker)")" 2> /dev/null || true)" == docker-ce-cli:* ]]; then
    paquete="$oficial"
  else
    case "$(familia_distro)" in
      ubuntu) paquete="$ubuntu" ;;
      debian)
        if [ "$1" = compose ]; then
          candidato="$(LC_ALL=C apt-cache policy "$debian" 2> /dev/null | awk '/Candidate:/ { print $2 }' || true)"
          if [[ "$candidato" == 2.* ]]; then paquete="$debian"; fi
        elif apt-cache show "$debian" > /dev/null 2>&1; then
          paquete="$debian"
        fi
        ;;
    esac
  fi
  if [ -n "$paquete" ]; then
    echo "Falta «docker $1». Instálalo con: sudo apt install $paquete"
  else
    echo "Falta «docker $1». Instálalo siguiendo https://docs.docker.com/engine/install/"
  fi
}

comprobar_cliente_docker() {  # sin hablar con el demonio (paso 2)
  local version host
  # Antes del permiso: con otro DOCKER_HOST, el paso 3 pediria sudo para nada.
  [ -z "${DOCKER_HOST:-}" ] || fallar docker_incompatible "Está definida DOCKER_HOST ($DOCKER_HOST); esta versión del instalador necesita el Docker local por /var/run/docker.sock."
  version="$(docker --version 2>&1 || true)"
  echo "docker --version: $version"
  case "$version" in
    *[Pp]odman*) fallar docker_incompatible "«docker» es Podman, que no es compatible con esta versión del instalador: hace falta Docker Engine." ;;
  esac
  docker compose version >/dev/null 2>&1 || fallar docker_incompatible "$(falta_plugin compose)"
  docker buildx version >/dev/null 2>&1 || fallar docker_incompatible "$(falta_plugin buildx)"
  # No necesita el demonio, asi que va antes de pedir permiso (el paso 3).
  host="$(docker context inspect -f '{{.Endpoints.docker.Host}}' 2>/dev/null || true)"
  [ "$host" = unix:///var/run/docker.sock ] \
    || fallar docker_incompatible "Docker no usa /var/run/docker.sock (usa «$host»), y esta versión del instalador lo necesita."
  if docker_es_snap; then
    avisar "Docker está instalado con snap, que limita las carpetas que puede usar. Si la tractografía falla, instala Docker desde su repositorio oficial."
  fi
}

comprobar_daemon_docker() {  # ya con acceso (paso 3)
  local opciones
  opciones="$(docker info -f '{{.SecurityOptions}}' 2>/dev/null || true)"
  [[ "$opciones" != *rootless* ]] || fallar docker_incompatible "Docker funciona sin root (rootless), que no es compatible con esta versión del instalador."
}

instalar_docker() {  # en la familia Ubuntu/Debian, con el repositorio oficial
  local url codename
  if [ "$(familia_distro)" = ubuntu ]; then url=https://download.docker.com/linux/ubuntu
  else url=https://download.docker.com/linux/debian; fi
  codename="$(codename_docker)"
  # Antes del primer sudo: si Docker no publica paquetes para esta version, no
  # se toca el sistema (B1).
  [ -n "$codename" ] && curl -fsI "$url/dists/$codename/Release" > /dev/null \
    || fallar docker_incompatible "Docker no publica paquetes para esta versión (${codename:-sin nombre}): instálalo siguiendo https://docs.docker.com/engine/install/"
  decir "Hace falta instalar Docker; te pedirá la contraseña de administrador."
  # DPkg::Lock::Timeout: espera si otro apt tiene el bloqueo. En la maquina
  # virtual (B8.6) se comprueba si "update" tambien espera.
  sudo apt-get -o DPkg::Lock::Timeout=300 update || fallar apt Docker
  sudo apt-get -o DPkg::Lock::Timeout=300 install -y ca-certificates curl || fallar apt Docker
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL "$url/gpg" -o /etc/apt/keyrings/docker.asc || fallar conexion download.docker.com
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  printf 'Types: deb\nURIs: %s\nSuites: %s\nComponents: stable\nArchitectures: %s\nSigned-By: /etc/apt/keyrings/docker.asc\n' \
    "$url" "$codename" "$(dpkg --print-architecture)" | sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null
  sudo apt-get -o DPkg::Lock::Timeout=300 update || fallar apt Docker
  sudo apt-get -o DPkg::Lock::Timeout=300 install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin || fallar apt Docker
}

# Si esta parado, se arranca, sin cambiar si arranca con el ordenador (B1).
arrancar_docker_si_parado() {
  local unidad=docker
  command -v systemctl >/dev/null 2>&1 || return 0
  # El nombre de la unidad de snap es el supuesto (snap.docker.dockerd): se
  # verifica en la maquina virtual (B8.6).
  if docker_es_snap; then unidad=snap.docker.dockerd; fi
  systemctl is-active --quiet "$unidad" && return 0
  decir "Docker está parado; para arrancarlo te pedirá la contraseña de administrador."
  sudo systemctl start "$unidad" || fallar docker_parado
}

paso_docker() {
  local nuevo=0
  if ! existe_programa docker; then
    case "$(familia_distro)" in
      ubuntu|debian) instalar_docker; nuevo=1 ;;
      *) fallar docker_otra_distro ;;
    esac
  fi
  comprobar_cliente_docker
  arrancar_docker_si_parado
  if [ "$nuevo" = 1 ]; then NG_RESUMEN="instalado ($(docker --version))"
  else NG_RESUMEN="ya estaba ($(docker --version))"; fi
}

# Sin "| grep -q": con pipefail, el SIGPIPE puede dar un falso negativo.
cuenta_en_grupo_docker() { [[ " $(id -nG "$(id -un)") " == *" docker "* ]]; }
proceso_con_grupo_docker() { [[ " $(id -nG) " == *" docker "* ]]; }

NG_RELANZAR=0
paso_permiso() {
  if docker info > /dev/null 2>&1; then
    comprobar_daemon_docker
    NG_RESUMEN="ya tenías permiso"
    return 0
  fi
  if ! cuenta_en_grupo_docker; then
    # El Docker de snap no crea el grupo: usermod fallaria (o seria inutil).
    getent group docker > /dev/null \
      || fallar docker_incompatible "No existe el grupo «docker» (pasa con el Docker de snap). Instala Docker desde su repositorio oficial: https://docs.docker.com/engine/install/"
    decir "Tu usuario entra en el grupo «docker» para usar Docker sin ser administrador. Ese grupo equivale a tener permisos de administrador en este ordenador."
    sudo usermod -aG docker "$(id -un)" || fallar docker_permiso
  fi
  if ! proceso_con_grupo_docker && [ -z "${NEUROGRAPH_CON_GRUPO_DOCKER:-}" ]; then
    NG_RELANZAR=1   # instalar.sh relanza con sg al cerrar el paso 3
    NG_RESUMEN="permiso dado (sin reiniciar sesión)"
    return 0
  fi
  docker info > /dev/null 2>&1 || fallar docker_permiso
  comprobar_daemon_docker
  NG_RESUMEN="permiso dado"
}

# Comillas simples POSIX: el sh de sg puede ser dash, que no entiende el $'...' de printf %q (B1).
citar_sh() { local a; for a in "$@"; do printf "'%s' " "${a//\'/\'\\\'\'}"; done; }

# Relanza el ejecutable con el grupo docker (sg), sin reiniciar sesion
# (B1). Los descriptores 3 (pantalla) y 9 (bloqueo) se heredan; el
# registro sigue en el mismo archivo y los pasos ya hechos no se repiten.
relanzar_con_grupo_docker() {  # continuar_en argumentos_originales...
  local continuar="$1"
  shift
  echo "Relanzando con sg docker desde el paso $continuar"
  trap - EXIT
  # Solo el proceso relanzado recibe estas variables. comun.sh quita
  # NEUROGRAPH_REGISTRO y NEUROGRAPH_BLOQUEO_HEREDADO al leerlas, y deja
  # NEUROGRAPH_CONTINUAR_EN sin heredar a los hijos. NEUROGRAPH_CON_GRUPO_DOCKER
  # se queda en el entorno a proposito: es lo que evita un segundo relanzado.
  export NEUROGRAPH_CON_GRUPO_DOCKER=1 NEUROGRAPH_CONTINUAR_EN="$continuar" \
    NEUROGRAPH_REGISTRO="$NG_REGISTRO" NEUROGRAPH_BLOQUEO_HEREDADO=1
  # "exec" dentro: el sh de algunos sg (dash) haria fork y el padre se
  # quedaria con el bloqueo.
  exec sg docker -c "exec $(citar_sh "$NG_EJECUTABLE" "$@")"
}

# El comando neurograph llama a esto tras iniciar_registro: si la cuenta ya
# esta en el grupo pero la sesion no, se relanza. El registro se hereda: si
# no, el relanzado tomaria por terminal la salida estandar, que ya es el
# registro, y la persona no veria nada.
asegurar_grupo_docker() {  # argumentos_originales...
  docker info > /dev/null 2>&1 && return 0
  if cuenta_en_grupo_docker && ! proceso_con_grupo_docker && [ -z "${NEUROGRAPH_CON_GRUPO_DOCKER:-}" ]; then
    export NEUROGRAPH_CON_GRUPO_DOCKER=1 NEUROGRAPH_REGISTRO="$NG_REGISTRO"
    exec sg docker -c "exec $(citar_sh "$NG_EJECUTABLE" "$@")"
  fi
  local unidad=docker
  if docker_es_snap; then unidad=snap.docker.dockerd; fi
  if command -v systemctl >/dev/null 2>&1 && ! systemctl is-active --quiet "$unidad"; then fallar docker_parado; fi
  fallar docker_permiso
}
