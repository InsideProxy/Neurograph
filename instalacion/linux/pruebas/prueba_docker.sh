# shellcheck shell=bash
# Pruebas de docker.sh (pasos 2 y 3, B1 del diseno, H10).
OSR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/os-release"

docker_simulado() {  # opciones: version, compose(0/1), buildx(0/1), info_opciones, host
  simular docker "case \"\$1 \${2:-}\" in
  '--version '*) echo '${1:-Docker version 28.5.1, build e180ab8}' ;;
  'compose version') exit ${2:-0} ;;
  'buildx version') exit ${3:-0} ;;
  'info -f') echo '${4:-[name=apparmor name=seccomp,profile=builtin]}' ;;
  'info ') exit 0 ;;
  'context inspect') echo '${5:-unix:///var/run/docker.sock}' ;;
esac"
}

prueba_podman_no_es_compatible() {
  docker_simulado "podman version 4.9.3"
  ! con_lib 'comprobar_cliente_docker' sistema docker || return 1
  contiene "Podman" "$(pantalla)" "motivo" || return 1
}

prueba_sin_compose_dice_el_paquete() {
  docker_simulado "" 1
  simular dpkg 'exit 1'  # que falta_plugin no llame al dpkg real
  ! con_lib 'NG_OS_RELEASE="'"$OSR"'/ubuntu" comprobar_cliente_docker' sistema docker || return 1
  contiene "docker-compose-v2" "$(pantalla)" "nombra el paquete de Ubuntu" || return 1
}

prueba_rootless_no_es_compatible() {
  docker_simulado "" 0 0 "[name=seccomp,profile=default name=rootless]"
  ! con_lib 'comprobar_daemon_docker' sistema docker || return 1
  contiene "rootless" "$(pantalla)" "motivo" || return 1
}

prueba_otro_socket_no_es_compatible() {
  # No necesita el demonio: se comprueba en el paso 2, antes de pedir permiso (B1).
  docker_simulado "" 0 0 "" "unix:///run/user/1000/docker.sock"
  simular_anotando sudo
  ! con_lib 'comprobar_cliente_docker' sistema docker || return 1
  contiene "/var/run/docker.sock" "$(pantalla)" "motivo" || return 1
  igual "" "$(llamadas sudo)" "sin sudo" || return 1
}

prueba_instalar_docker_en_mint_usa_ubuntu_y_noble() {
  simular sudo "echo \"\$*\" >> '$NG_PRUEBA_LLAMADAS/sudo'; if [ \"\$1\" = tee ]; then cat > '$NG_PRUEBA_LLAMADAS/fuente'; fi"
  simular dpkg 'echo amd64'
  simular_anotando curl
  con_lib 'NG_OS_RELEASE="'"$OSR"'/mint" instalar_docker' sistema docker || return 1
  local f; f="$(cat "$NG_PRUEBA_LLAMADAS/fuente")"
  contiene "URIs: https://download.docker.com/linux/ubuntu" "$f" "repositorio de Ubuntu" || return 1
  contiene "dists/noble/Release" "$(llamadas curl)" "comprueba que Docker publica ese nombre en clave" || return 1
  contiene "Suites: noble" "$f" "UBUNTU_CODENAME, no el de Mint" || return 1
  contiene "Signed-By: /etc/apt/keyrings/docker.asc" "$f" "clave firmada" || return 1
  contiene "apt-get -o DPkg::Lock::Timeout=300 update" "$(llamadas sudo)" "update espera el bloqueo de apt" || return 1
  contiene "apt-get -o DPkg::Lock::Timeout=300 install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin" "$(llamadas sudo)" "paquetes oficiales" || return 1
}

prueba_docker_sin_repositorio_para_esta_version_no_pide_sudo() {
  simular_anotando sudo
  simular curl 'case "$*" in *dists/*/Release*) exit 22 ;; esac'
  ! con_lib 'NG_OS_RELEASE="'"$OSR"'/ubuntu" instalar_docker' sistema docker || return 1
  contiene "Docker no publica paquetes para esta versión (noble)" "$(pantalla)" "dice la version" || return 1
  contiene "https://docs.docker.com/engine/install/" "$(pantalla)" "y el enlace oficial" || return 1
  igual "" "$(llamadas sudo)" "sin sudo antes de saber que hay repositorio" || return 1
}

prueba_otra_distro_no_instala_docker() {
  simular_anotando sudo
  ! con_lib 'NG_OS_RELEASE="'"$OSR"'/fedora" NEUROGRAPH_PRUEBA_SIN_PROGRAMAS=docker paso_docker' sistema docker || return 1
  contiene "docs.docker.com/engine/install" "$(pantalla)" "enlace oficial" || return 1
  contiene "no es Ubuntu, una derivada de Ubuntu ni Debian" "$(pantalla)" "dice que familias valen" || return 1
  igual "" "$(llamadas sudo)" "sin sudo" || return 1
}

prueba_permiso_sin_grupo_pide_usermod_y_prepara_relanzar() {
  simular docker 'echo "permission denied while trying to connect to the docker API" >&2; exit 1'
  simular id 'case "$*" in "-un") echo demo ;; "-nG demo") echo "demo adm" ;; "-nG") echo "demo adm" ;; *) /usr/bin/id "$@" ;; esac'
  simular_anotando sudo
  simular getent 'echo "docker:x:999:"'
  con_lib 'paso_permiso; decir "RELANZAR=$NG_RELANZAR"' sistema docker || return 1
  contiene "usermod -aG docker demo" "$(llamadas sudo)" "anade al grupo" || return 1
  contiene "equivale a tener permisos de administrador" "$(pantalla)" "avisa de lo que supone" || return 1
  contiene "RELANZAR=1" "$(pantalla)" "relanzar con sg" || return 1
}

prueba_sin_grupo_docker_no_intenta_usermod() {
  # Pasa con el Docker de snap: no crea el grupo «docker» (B1).
  simular docker 'echo "permission denied" >&2; exit 1'
  simular id 'case "$*" in "-un") echo demo ;; "-nG demo") echo "demo adm" ;; "-nG") echo "demo adm" ;; *) /usr/bin/id "$@" ;; esac'
  simular getent 'exit 2'
  simular_anotando sudo
  ! con_lib 'paso_permiso' sistema docker || return 1
  contiene "No existe el grupo «docker»" "$(pantalla)" "lo dice" || return 1
  contiene "https://docs.docker.com/engine/install/" "$(pantalla)" "con el enlace oficial" || return 1
  igual "" "$(llamadas sudo)" "sin usermod" || return 1
}

prueba_docker_parado_arranca_la_unidad_de_su_instalacion() {
  # Unidad de snap supuesta: snap.docker.dockerd. Se verifica en la maquina virtual (B8.6).
  simular_anotando systemctl 'case "$1" in is-active) exit 3 ;; esac'
  simular sudo 'exec "$@"'
  con_lib 'arrancar_docker_si_parado' sistema docker || return 1
  contiene "start docker" "$(llamadas systemctl)" "unidad normal" || return 1
  no_contiene "snap.docker.dockerd" "$(llamadas systemctl)" "no la de snap" || return 1
  rm -f "$NG_PRUEBA_LLAMADAS/systemctl"
  con_lib 'docker_es_snap() { true; }; arrancar_docker_si_parado' sistema docker || return 1
  contiene "is-active --quiet snap.docker.dockerd" "$(llamadas systemctl)" "mira la unidad de snap" || return 1
  contiene "start snap.docker.dockerd" "$(llamadas systemctl)" "arranca la unidad de snap" || return 1
}

prueba_asegurar_grupo_mira_la_unidad_de_snap() {
  simular docker 'echo "permission denied" >&2; exit 1'
  simular id 'case "$*" in "-un") echo demo ;; "-nG demo") echo "demo docker" ;; "-nG") echo demo ;; *) /usr/bin/id "$@" ;; esac'
  simular_anotando systemctl 'case "$1" in is-active) exit 3 ;; esac'
  ! con_lib 'docker_es_snap() { true; }; NG_EJECUTABLE=/x; NEUROGRAPH_CON_GRUPO_DOCKER=1 asegurar_grupo_docker' sistema docker || return 1
  contiene "is-active --quiet snap.docker.dockerd" "$(llamadas systemctl)" "mira la unidad de snap" || return 1
  contiene "Docker no está en marcha" "$(pantalla)" "y lo dice" || return 1
}

prueba_falta_plugin_segun_el_origen_del_docker() {
  # dpkg y apt-cache simulados: ninguna rama llama a los reales.
  simular docker 'echo ok'
  simular dpkg 'echo "docker-ce-cli: /usr/bin/docker"'
  simular apt-cache 'exit 1'
  contiene "sudo apt install docker-compose-plugin" "$(bash -c 'source "$NG_LIB/comun.sh"; source "$NG_LIB/sistema.sh"; source "$NG_LIB/docker.sh"; falta_plugin compose' 2>&1)" "origen oficial: compose" || return 1
  contiene "sudo apt install docker-buildx-plugin" "$(bash -c 'source "$NG_LIB/comun.sh"; source "$NG_LIB/sistema.sh"; source "$NG_LIB/docker.sh"; falta_plugin buildx' 2>&1)" "origen oficial: buildx" || return 1
  simular dpkg 'exit 1'
  contiene "sudo apt install docker-compose-v2" "$(NG_OS_RELEASE="$OSR/ubuntu" bash -c 'source "$NG_LIB/comun.sh"; source "$NG_LIB/sistema.sh"; source "$NG_LIB/docker.sh"; falta_plugin compose' 2>&1)" "Ubuntu: compose" || return 1
  contiene "sudo apt install docker-buildx" "$(NG_OS_RELEASE="$OSR/ubuntu" bash -c 'source "$NG_LIB/comun.sh"; source "$NG_LIB/sistema.sh"; source "$NG_LIB/docker.sh"; falta_plugin buildx' 2>&1)" "Ubuntu: buildx" || return 1
}

prueba_falta_plugin_en_debian_solo_da_paquetes_que_existen() {
  simular docker 'echo ok'
  simular dpkg 'exit 1'
  local cargar='source "$NG_LIB/comun.sh"; source "$NG_LIB/sistema.sh"; source "$NG_LIB/docker.sh"'
  # bookworm: docker-compose es el 1.x (Python) y no hay docker-buildx.
  # Como el de verdad: traducido salvo con LC_ALL=C ("Candidato:" en castellano).
  simular apt-cache 'case "$1" in policy) e=Candidato; [ "${LC_ALL:-}" = C ] && e=Candidate; printf "docker-compose:\n  Installed: (none)\n  %s: 1.29.2-3\n" "$e" ;; show) exit 100 ;; esac'
  local c b
  c="$(NG_OS_RELEASE="$OSR/debian" bash -c "$cargar; falta_plugin compose" 2>&1)"
  b="$(NG_OS_RELEASE="$OSR/debian" bash -c "$cargar; falta_plugin buildx" 2>&1)"
  no_contiene "apt install" "$c" "un compose 1.x no vale como plugin" || return 1
  contiene "docs.docker.com/engine/install" "$c" "da el enlace generico (compose)" || return 1
  no_contiene "apt install" "$b" "sin paquete docker-buildx en el repositorio" || return 1
  contiene "docs.docker.com/engine/install" "$b" "da el enlace generico (buildx)" || return 1
  # trixie: docker-compose 2.x y docker-buildx existen.
  # Como el de verdad: traducido salvo con LC_ALL=C ("Candidato:" en castellano).
  simular apt-cache 'case "$1" in policy) e=Candidato; [ "${LC_ALL:-}" = C ] && e=Candidate; printf "docker-compose:\n  Installed: (none)\n  %s: 2.26.1-4\n" "$e" ;; show) exit 0 ;; esac'
  c="$(NG_OS_RELEASE="$OSR/debian" bash -c "$cargar; falta_plugin compose" 2>&1)"
  b="$(NG_OS_RELEASE="$OSR/debian" bash -c "$cargar; falta_plugin buildx" 2>&1)"
  contiene "sudo apt install docker-compose" "$c" "compose 2.x si" || return 1
  contiene "sudo apt install docker-buildx" "$b" "buildx si existe" || return 1
}

prueba_snap_avisa() {
  # El enlace real (/snap/bin/docker -> /usr/bin/snap) no se puede crear sin
  # root: se prueba el aviso y que la ruta /snap/... cuenta como snap.
  docker_simulado
  con_lib 'docker_es_snap() { true; }; comprobar_cliente_docker' sistema docker || return 1
  contiene "snap" "$(cat "$HOME/.local/share/neurograph/.avisos")" "aviso de snap" || return 1
  igual 0 "$(bash -c 'source "$NG_LIB/docker.sh"; command() { echo /snap/bin/docker; }; docker_es_snap && echo 0 || echo 1')" "una ruta /snap/bin cuenta como snap" || return 1
}

prueba_docker_host_para_antes_de_pedir_permiso() {
  docker_simulado
  simular_anotando sudo
  ! con_lib 'DOCKER_HOST=tcp://otro:2375 comprobar_cliente_docker' sistema docker || return 1
  contiene "DOCKER_HOST" "$(pantalla)" "motivo" || return 1
  igual "" "$(llamadas sudo)" "sin sudo" || return 1
}

prueba_relanzado_con_sg_continua_en_el_paso_4() {
  # sg simulado: ejecuta la orden como sg (con sh -c), sin cambiar de grupo.
  # Hace fork, como el sg real con dash: el proceso original sigue vivo con el
  # descriptor 9, asi que sin NEUROGRAPH_BLOQUEO_HEREDADO el relanzado no
  # podria tomar el bloqueo (con exec, esta prueba no podia fallar).
  simular sg '/bin/sh -c "$3"'
  # La cuenta tiene el grupo; la sesion solo tras relanzar.
  simular id 'case "$*" in "-un") echo demo ;; "-nG demo") echo "demo docker" ;; "-nG") if [ -n "${NEUROGRAPH_CON_GRUPO_DOCKER:-}" ]; then echo "demo docker"; else echo demo; fi ;; *) /usr/bin/id "$@" ;; esac'
  simular docker 'case "$1" in info) [ -n "${NEUROGRAPH_CON_GRUPO_DOCKER:-}" ] && exit 0; echo "permission denied" >&2; exit 1 ;; context) echo unix:///var/run/docker.sock ;; esac'
  cat > "$HOME/mini.sh" << EOF
#!/usr/bin/env bash
set -Eeuo pipefail
NG_EJECUTABLE="\$(readlink -f "\${BASH_SOURCE[0]}")"
source "$NG_LIB/comun.sh"; source "$NG_LIB/sistema.sh"; source "$NG_LIB/docker.sh"
NG_ARGS="\$*"
iniciar_registro prueba; instalar_trampas; tomar_bloqueo
uno() { NG_RESUMEN=uno; }
cuatro() { NG_RESUMEN="cuatro \$NG_ARGS"; }
paso 1 "Uno" uno
paso 3 "Permiso" paso_permiso
if [ "\$NG_RELANZAR" = 1 ]; then relanzar_con_grupo_docker 4 "\$@"; fi
paso 4 "Cuatro" cuatro
EOF
  chmod +x "$HOME/mini.sh"
  # LC_ALL=C: printf %q daria $'...' (que dash no entiende) con tabuladores o tildes.
  LC_ALL=C "$HOME/mini.sh" "con espacio" "y tíldé" $'con\ttabulador' > "$HOME/pantalla" 2>&1 || { cat "$HOME/pantalla"; return 1; }
  igual 1 "$(grep -c '\[1/9\]' "$HOME/pantalla")" "el paso 1 sale una vez" || return 1
  igual 1 "$(grep -c '\[4/9\]' "$HOME/pantalla")" "el paso 4 sale una vez" || return 1
  contiene $'cuatro con espacio y tíldé con\ttabulador' "$(pantalla)" "los argumentos llegan intactos" || return 1
  igual 1 "$(find "$HOME/.local/share/neurograph/registro" -name 'prueba-*.log' | wc -l)" "un solo registro" || return 1
  contiene "continua tras relanzar" "$(registro)" "el relanzado sigue en el mismo registro" || return 1
  no_contiene "Ya hay otro" "$(pantalla)" "el bloqueo heredado vale" || return 1
}

prueba_sin_bucle_de_relanzados() {
  simular_anotando sg
  simular docker 'echo "permission denied" >&2; exit 1'
  simular id 'case "$*" in "-un") echo demo ;; "-nG demo") echo "demo docker" ;; "-nG") echo demo ;; *) /usr/bin/id "$@" ;; esac'
  simular systemctl 'exit 0'
  ! con_lib 'NG_EJECUTABLE=/x; NEUROGRAPH_CON_GRUPO_DOCKER=1 asegurar_grupo_docker' sistema docker || return 1
  igual "" "$(llamadas sg)" "ya relanzado: no vuelve a relanzar" || return 1
  contiene "no tiene permiso para usar Docker" "$(pantalla)" "y lo dice" || return 1
}

prueba_permiso_ya_relanzado_no_vuelve_a_relanzar() {
  simular docker 'echo "permission denied" >&2; exit 1'
  simular id 'case "$*" in "-un") echo demo ;; "-nG demo") echo "demo docker" ;; "-nG") echo "demo" ;; *) /usr/bin/id "$@" ;; esac'
  simular_anotando sudo
  ! con_lib 'NEUROGRAPH_CON_GRUPO_DOCKER=1; paso_permiso; decir "RELANZAR=$NG_RELANZAR"' sistema docker || return 1
  no_contiene "RELANZAR=1" "$(pantalla)" "no relanza dos veces" || return 1
  contiene "no tiene permiso para usar Docker" "$(pantalla)" "dice el motivo" || return 1
}

prueba_permiso_ya_en_grupo_no_pide_usermod() {
  simular docker 'echo "permission denied" >&2; exit 1'
  simular id 'case "$*" in "-un") echo demo ;; "-nG demo") echo "demo docker" ;; "-nG") echo "demo" ;; *) /usr/bin/id "$@" ;; esac'
  simular_anotando sudo
  con_lib 'paso_permiso; decir "RELANZAR=$NG_RELANZAR"' sistema docker || return 1
  igual "" "$(llamadas sudo)" "no hace falta usermod" || return 1
  contiene "RELANZAR=1" "$(pantalla)" "pero la sesion aun no tiene el grupo" || return 1
}
