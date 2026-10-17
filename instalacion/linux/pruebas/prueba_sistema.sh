# shellcheck shell=bash
# Pruebas de sistema.sh (paso 1, B1 del diseno, H10).
OSR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/os-release"

prueba_familia_y_nombre_en_clave() {
  source "$NG_LIB/sistema.sh"
  local d
  for d in "ubuntu ubuntu noble" "mint ubuntu noble" "debian debian trixie" "lmde otra -" "fedora otra -"; do
    set -- $d
    igual "$2" "$(NG_OS_RELEASE="$OSR/$1" familia_distro)" "familia de $1" || return 1
    if [ "$3" != - ]; then
      igual "$3" "$(NG_OS_RELEASE="$OSR/$1" codename_docker)" "nombre en clave de $1" || return 1
    fi
  done
}

prueba_sitio_bloqueado_se_nombra() {
  simular curl 'for a in "$@"; do case "$a" in https://zenodo.org/) printf 000; exit 7;; esac; done; printf 200'
  ! con_lib 'NEUROGRAPH_PRUEBA_SITIOS="pypi.org zenodo.org" comprobar_conexion' sistema || return 1
  contiene "No hay conexión con zenodo.org" "$(pantalla)" "nombra el sitio" || return 1
}

prueba_todos_los_sitios_responden() {
  simular curl 'printf 401'
  con_lib 'comprobar_conexion; decir HECHO' sistema || return 1
  contiene HECHO "$(pantalla)" "un 401 tambien es conexion" || return 1
}

prueba_poca_memoria_para_la_base_para() {
  simular docker 'echo /var/lib/docker'  # dir_docker no debe llamar al Docker real
  ! con_lib 'NEUROGRAPH_PRUEBA_MEMORIA_MB=$(( NG_MIN_MEMORIA_BASE_MB - 1 )) NEUROGRAPH_PRUEBA_ESPACIO_MB=999999 NG_BIBLIOTECA_ELEGIDA="$HOME/NeuroData" comprobar_recursos' sistema || return 1
  contiene "Hace falta al menos" "$(pantalla)" "frase de memoria" || return 1
}

prueba_poca_memoria_para_la_tractografia_no_para() {
  simular docker 'echo /var/lib/docker'  # dir_docker no debe llamar al Docker real
  con_lib 'NEUROGRAPH_PRUEBA_MEMORIA_MB=$(( NG_MIN_MEMORIA_TRACTO_MB - 1 )) NEUROGRAPH_PRUEBA_ESPACIO_MB=999999 NG_BIBLIOTECA_ELEGIDA="$HOME/NeuroData" comprobar_recursos' sistema || return 1
  contiene "memoria insuficiente" "$(leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" NG_TRACTO_SIN_RECURSOS)" "queda el motivo" || return 1
  con_lib 'NEUROGRAPH_PRUEBA_MEMORIA_MB=$(( NG_MIN_MEMORIA_TRACTO_MB + 1 )) NEUROGRAPH_PRUEBA_ESPACIO_MB=999999 NG_BIBLIOTECA_ELEGIDA="$HOME/NeuroData" comprobar_recursos' sistema || return 1
  igual "" "$(leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" NG_TRACTO_SIN_RECURSOS)" "con memoria, el motivo se borra" || return 1
}

prueba_tractografia_diaria_no_pide_el_espacio_de_construir() {
  simular docker 'echo /var/lib/docker'
  con_lib 'NEUROGRAPH_PRUEBA_MEMORIA_MB=$(( NG_MIN_MEMORIA_TRACTO_MB + 1 )) NEUROGRAPH_PRUEBA_ESPACIO_MB=$(( NG_MIN_ESPACIO_DOCKER_TRACTO_MB + NG_MIN_ESPACIO_BIBLIOTECA_TRACTO_MB )) NG_BIBLIOTECA_ELEGIDA="$HOME/NeuroData" comprobar_recursos_tracto' sistema || return 1
  igual "" "$(leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" NG_TRACTO_SIN_RECURSOS)" "con espacio para ella, no queda pendiente" || return 1
}

prueba_poco_espacio_para_docker_para() {
  simular docker 'echo /var/lib/docker'  # dir_docker no debe llamar al Docker real
  ! con_lib 'NEUROGRAPH_PRUEBA_MEMORIA_MB=$(( NG_MIN_MEMORIA_TRACTO_MB + 1 )) NEUROGRAPH_PRUEBA_ESPACIO_MB=100 NG_BIBLIOTECA_ELEGIDA="$HOME/NeuroData" comprobar_recursos' sistema || return 1
  contiene "No hay espacio suficiente para Docker" "$(pantalla)" "frase de espacio" || return 1
}

prueba_biblioteca_ajena_para_y_las_validas_no() {
  mkdir -p "$HOME/ajena" && touch "$HOME/ajena/foto.jpg"
  ! con_lib 'comprobar_biblioteca "$HOME/ajena"' sistema || return 1
  contiene "no parece una biblioteca de NeuroGraph" "$(pantalla)" "frase de biblioteca ajena" || return 1
  mkdir -p "$HOME/vacia" "$HOME/conmanifiesto" "$HOME/antigua/original"
  touch "$HOME/conmanifiesto/.neurograph_library.yaml"
  con_lib 'comprobar_biblioteca "$HOME/vacia"; comprobar_biblioteca "$HOME/conmanifiesto"; comprobar_biblioteca "$HOME/antigua"; comprobar_biblioteca "$HOME/no-existe"' sistema || return 1
}

prueba_falta_curl_en_debian_se_instala_con_apt() {
  # sudo simulado que "instala" curl: tras apt, curl existe.
  simular sudo "echo \"\$*\" >> '$NG_PRUEBA_LLAMADAS/sudo'"
  con_lib 'NG_OS_RELEASE="'"$OSR"'/debian" NEUROGRAPH_PRUEBA_SIN_PROGRAMAS=curl; apt_instalar() { echo "apt $*" >> "'"$NG_PRUEBA_LLAMADAS"'/apt"; NEUROGRAPH_PRUEBA_SIN_PROGRAMAS=""; }; comprobar_programas' sistema || return 1
  contiene "apt curl" "$(llamadas apt)" "instala curl con apt" || return 1
}

prueba_curl_que_no_llega_a_instalarse_para() {
  simular_anotando sudo
  ! con_lib 'NG_OS_RELEASE="'"$OSR"'/debian" NEUROGRAPH_PRUEBA_SIN_PROGRAMAS=curl comprobar_programas' sistema || return 1
  contiene "Falta el programa «curl»" "$(pantalla)" "tras apt se vuelve a comprobar" || return 1
}

prueba_falta_sg_para_con_su_nombre() {
  simular_anotando sudo
  ! con_lib 'NG_OS_RELEASE="'"$OSR"'/ubuntu" NEUROGRAPH_PRUEBA_SIN_PROGRAMAS=sg comprobar_programas' sistema || return 1
  contiene "Falta el programa «sg»" "$(pantalla)" "nombra el programa" || return 1
  igual "" "$(llamadas sudo)" "no adivina su paquete" || return 1
}

prueba_biblioteca_sin_permiso_para() {
  mkdir -p "$HOME/cerrada" && touch "$HOME/cerrada/x" && chmod 000 "$HOME/cerrada"
  ! con_lib 'comprobar_biblioteca "$HOME/cerrada"' sistema || { chmod 755 "$HOME/cerrada"; return 1; }
  chmod 755 "$HOME/cerrada"
  contiene "No se puede leer o escribir en la carpeta" "$(pantalla)" "frase" || return 1
}

prueba_falta_curl_en_otra_distro_para_sin_apt() {
  simular_anotando sudo
  ! con_lib 'NG_OS_RELEASE="'"$OSR"'/fedora" NEUROGRAPH_PRUEBA_SIN_PROGRAMAS=curl comprobar_programas' sistema || return 1
  contiene "Falta el programa «curl»" "$(pantalla)" "frase de programa" || return 1
  igual "" "$(llamadas sudo)" "nunca intenta apt fuera de la familia Debian" || return 1
}

prueba_el_espacio_de_la_biblioteca_se_mide_en_su_ruta() {
  simular docker 'echo /var/lib/docker'
  # Mucho espacio en Docker y poco en la biblioteca: solo la tractografia queda pendiente.
  con_lib 'espacio_libre_mb() { case "$1" in "$HOME/NeuroData") echo $(( NG_MIN_ESPACIO_BIBLIOTECA_TRACTO_MB - 1 )) ;; *) echo 999999 ;; esac; }
    NEUROGRAPH_PRUEBA_MEMORIA_MB=999999 NG_BIBLIOTECA_ELEGIDA="$HOME/NeuroData" comprobar_recursos' sistema || return 1
  contiene "espacio insuficiente en la biblioteca" "$(leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" NG_TRACTO_SIN_RECURSOS)" "queda el motivo" || return 1
  # Y al reves: poco en Docker (donde Docker guarda sus datos) para.
  ! con_lib 'espacio_libre_mb() { case "$1" in /var/lib/docker) echo 100 ;; *) echo 999999 ;; esac; }
    NEUROGRAPH_PRUEBA_MEMORIA_MB=999999 NG_BIBLIOTECA_ELEGIDA="$HOME/NeuroData" comprobar_recursos' sistema || return 1
  contiene "No hay espacio suficiente para Docker en /var/lib/docker" "$(pantalla)" "mide la ruta de Docker" || return 1
}

prueba_apt_instalar_usa_sudo_apt_get_y_su_frase_si_falla() {
  simular_anotando sudo
  con_lib 'apt_instalar curl' sistema || return 1
  contiene "apt-get -o DPkg::Lock::Timeout=300 update" "$(llamadas sudo)" "actualiza esperando el bloqueo de apt" || return 1
  contiene "apt-get -o DPkg::Lock::Timeout=300 install -y curl" "$(llamadas sudo)" "instala esperando el bloqueo de apt" || return 1
  simular sudo 'case "$*" in *install*) exit 100 ;; esac'
  ! con_lib 'apt_instalar curl' sistema || return 1
  contiene "No se pudo instalar curl con apt" "$(pantalla)" "frase de apt" || return 1
}

prueba_download_docker_com_solo_se_comprueba_si_falta_docker() {
  simular docker 'echo /var/lib/docker'
  simular_anotando curl 'printf 200'
  local cuerpo='NEUROGRAPH_PRUEBA_MEMORIA_MB=999999 NEUROGRAPH_PRUEBA_ESPACIO_MB=999999 NG_BIBLIOTECA_ELEGIDA="$HOME/NeuroData"'
  con_lib "NG_OS_RELEASE=\"$OSR/ubuntu\" $cuerpo paso_comprobar" sistema || return 1
  no_contiene "download.docker.com" "$(llamadas curl)" "con Docker instalado no hace falta" || return 1
  rm -f "$NG_PRUEBA_LLAMADAS/curl"
  con_lib "NG_OS_RELEASE=\"$OSR/ubuntu\" NEUROGRAPH_PRUEBA_SIN_PROGRAMAS=docker $cuerpo paso_comprobar" sistema || return 1
  contiene "https://download.docker.com/" "$(llamadas curl)" "sin Docker, hay que descargarlo de ahi" || return 1
}

prueba_biblioteca_con_coma_comillas_o_salto_de_linea_se_rechaza() {
  # Romperian el --mount de docker run (coma, comillas) o config.env (salto) (B2).
  local r
  for r in "$HOME/con,coma" "$HOME/con\"comillas" "$HOME/con"$'\n'"salto" "$HOME/Copia: octubre"; do
    ! RUTA="$r" con_lib 'comprobar_biblioteca "$RUTA"' sistema || { echo "    FALLA: acepta $r"; return 1; }
    contiene "lleva una coma, unas comillas dobles, un salto de línea o «: »" "$(pantalla)" "frase clara" || return 1
    no_contiene "Algo ha fallado" "$(pantalla)" "no es inesperado" || return 1
  done
}

# --- Dónde va la biblioteca en la primera instalación (B2, docs/portabilidad.md)

prueba_bibliotecas_existentes_son_las_que_llevan_manifiesto() {
  mkdir -p "$HOME/NeuroData" "$HOME/discos/ssd/NeuroData" "$HOME/discos/usb/NeuroData"
  touch "$HOME/discos/ssd/NeuroData/.neurograph_library.yaml"
  igual "$HOME/discos/ssd/NeuroData" "$(source "$NG_LIB/comun.sh"; source "$NG_LIB/sistema.sh"; NG_DISCOS_BIBLIOTECA="$HOME/discos/*" bibliotecas_existentes)" \
    "solo la del manifiesto (una carpeta NeuroData sin él no cuenta)" || return 1
  touch "$HOME/NeuroData/.neurograph_library.yaml"
  igual "$HOME/NeuroData $HOME/discos/ssd/NeuroData" "$(source "$NG_LIB/comun.sh"; source "$NG_LIB/sistema.sh"; NG_DISCOS_BIBLIOTECA="$HOME/discos/*" bibliotecas_existentes | xargs)" \
    "la de casa primero, después las de los discos" || return 1
}

prueba_elegir_biblioteca_propone_la_que_ya_existe() {
  mkdir -p "$HOME/discos/ssd/NeuroData"; touch "$HOME/discos/ssd/NeuroData/.neurograph_library.yaml"
  con_lib 'NG_DISCOS_BIBLIOTECA="$HOME/discos/*" NEUROGRAPH_PRUEBA_RESPUESTA=s elegir_biblioteca; decir "elegida=$NG_BIBLIOTECA_ELEGIDA"' sistema || { pantalla; return 1; }
  contiene "elegida=$HOME/discos/ssd/NeuroData" "$(pantalla)" "usa la biblioteca del disco" || return 1
  contiene "$HOME/discos/ssd/NeuroData" "$(registro)" "la pregunta nombra la carpeta" || return 1
}

prueba_elegir_biblioteca_sin_ninguna_propone_neurodata_de_casa() {
  con_lib 'NG_DISCOS_BIBLIOTECA="$HOME/discos/*" NEUROGRAPH_PRUEBA_RESPUESTA=s elegir_biblioteca; decir "elegida=$NG_BIBLIOTECA_ELEGIDA"' sistema || { pantalla; return 1; }
  contiene "elegida=$HOME/NeuroData" "$(pantalla)" "propone ~/NeuroData" || return 1
}

prueba_elegir_biblioteca_otra_carpeta_escrita_o_arrastrada() {
  # Al arrastrar una carpeta, la terminal la escribe entre comillas simples y con un espacio detrás.
  RUTA="'$HOME/mi disco/datos' " con_lib 'NG_DISCOS_BIBLIOTECA="$HOME/discos/*" NEUROGRAPH_PRUEBA_RESPUESTA=n NEUROGRAPH_PRUEBA_BIBLIOTECA="$RUTA" elegir_biblioteca; decir "elegida=$NG_BIBLIOTECA_ELEGIDA"' sistema || { pantalla; return 1; }
  contiene "elegida=$HOME/mi disco/datos" "$(pantalla)" "quita las comillas y el espacio" || return 1
  # shellcheck disable=SC2088  # la tilde es literal: es lo que escribe la persona
  RUTA="~/Datos" con_lib 'NG_DISCOS_BIBLIOTECA="$HOME/discos/*" NEUROGRAPH_PRUEBA_RESPUESTA=n NEUROGRAPH_PRUEBA_BIBLIOTECA="$RUTA" elegir_biblioteca; decir "elegida=$NG_BIBLIOTECA_ELEGIDA"' sistema || { pantalla; return 1; }
  contiene "elegida=$HOME/Datos" "$(pantalla)" "expande ~" || return 1
}

prueba_elegir_biblioteca_sin_carpeta_para_con_su_frase() {
  ! con_lib 'NG_DISCOS_BIBLIOTECA="$HOME/discos/*" NEUROGRAPH_PRUEBA_RESPUESTA=n NEUROGRAPH_PRUEBA_SIN_TERMINAL=1 elegir_biblioteca' sistema || return 1
  contiene "No se ha elegido ninguna carpeta para la biblioteca" "$(pantalla)" "frase" || return 1
}

prueba_elegir_biblioteca_sin_terminal_usa_la_propuesta_sin_preguntar() {
  con_lib 'NG_DISCOS_BIBLIOTECA="$HOME/discos/*" NEUROGRAPH_PRUEBA_SIN_TERMINAL=1 elegir_biblioteca; decir "elegida=$NG_BIBLIOTECA_ELEGIDA"' sistema || { pantalla; return 1; }
  contiene "elegida=$HOME/NeuroData" "$(pantalla)" "la propuesta" || return 1
  contiene "sin terminal" "$(registro)" "lo anota en el registro" || return 1
}
