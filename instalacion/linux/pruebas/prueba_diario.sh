# shellcheck shell=bash
# Pruebas del comando diario y del paso 9 (B3 y B5 del diseno, H10).

instalar_libs() {  # la copia de lib/ que usa el comando instalado
  mkdir -p "$HOME/.local/share/neurograph/lib"
  cp "$NG_LIB"/*.sh "$HOME/.local/share/neurograph/lib/"
  printf 'NG_PROYECTO=neurograph-app\nNG_WEB_PUERTO=5173\nNG_API_PUERTO=8420\nNG_CONTRASENA_BASE=x\nNG_BIBLIOTECA=%s\n' "$HOME/NeuroData" > "$HOME/.local/share/neurograph/config.env"
  cp "$NG_RAIZ/instalacion/docker/compose.yml" "$HOME/.local/share/neurograph/compose.yml"
}
neurograph() { bash "$NG_RAIZ/instalacion/linux/plantillas/neurograph" "$@" > "$HOME/pantalla" 2>&1; }

prueba_abrir_en_marcha_solo_abre_el_navegador() {
  instalar_libs
  simular docker 'echo "$*" >> '"'$NG_PRUEBA_LLAMADAS/docker'"'; case "$1" in info) exit 0;; inspect) echo true;; esac'
  simular curl 'exit 0'
  simular_anotando xdg-open
  neurograph abrir || return 1
  no_contiene "compose" "$(llamadas docker)" "no enciende nada" || return 1
  sleep 1
  contiene "http://127.0.0.1:5173" "$(llamadas xdg-open)" "abre la URL guardada" || return 1
}

prueba_abrir_apagado_enciende_y_avisa_del_puerto() {
  instalar_libs
  simular docker 'echo "$*" >> '"'$NG_PRUEBA_LLAMADAS/docker'"'
case "$1" in info) exit 0;; inspect) echo false;; ps) ;; image) exit 0;; esac'
  simular ss 'case "$2" in *":5173") echo "LISTEN 0 1 127.0.0.1:5173 0.0.0.0:*";; esac'
  simular curl 'exit 0'
  simular_anotando xdg-open
  neurograph abrir || return 1
  contiene "compose -p neurograph-app" "$(llamadas docker)" "enciende con compose" || return 1
  contiene "La web usa el puerto 5174" "$(cat "$HOME/pantalla")" "avisa en el momento" || return 1
  igual 5174 "$(leer_valor_archivo "$HOME/.local/share/neurograph/config.env" NG_WEB_PUERTO)" "lo guarda" || return 1
}

prueba_fallo_desde_el_icono_se_notifica() {
  instalar_libs
  simular docker 'case "$1" in info) exit 0;; inspect) echo false;; ps) ;; image) exit 1;; esac'
  simular ss 'exit 0'
  simular_anotando notify-send
  ! neurograph abrir --escritorio || return 1
  contiene "Faltan las imágenes" "$(llamadas notify-send)" "la frase llega como notificacion" || return 1
}

prueba_relanzado_desde_el_icono_conserva_escritorio() {
  instalar_libs
  simular docker 'echo "permission denied" >&2; exit 1'
  simular id 'case "$*" in "-un") echo demo ;; "-nG demo") echo "demo docker" ;; "-nG") echo demo ;; *) /usr/bin/id "$@" ;; esac'
  simular_anotando sg
  neurograph abrir --escritorio || true
  contiene "'abrir' '--escritorio'" "$(llamadas sg)" "relanza con --escritorio" || return 1
}

prueba_relanzado_con_sg_sigue_en_la_terminal() {
  instalar_libs
  simular sg 'exec /bin/sh -c "$3"'
  simular id 'case "$*" in "-un") echo demo ;; "-nG demo") echo "demo docker" ;; "-nG") if [ -n "${NEUROGRAPH_CON_GRUPO_DOCKER:-}" ]; then echo "demo docker"; else echo demo; fi ;; *) /usr/bin/id "$@" ;; esac'
  simular docker 'case "$1" in info) [ -n "${NEUROGRAPH_CON_GRUPO_DOCKER:-}" ] && exit 0; echo "permission denied" >&2; exit 1 ;; inspect) echo false ;; esac; exit 0'
  neurograph estado || return 1
  contiene "NeuroGraph: apagado" "$(cat "$HOME/pantalla")" "lo que dice el relanzado llega a la terminal" || return 1
}

prueba_tractografia_que_falla_no_da_mensaje_inesperado() {
  instalar_libs
  printf 'NG_TRACTO_SIN_RECURSOS=memoria insuficiente\n' > "$HOME/.local/share/neurograph/estado.env"
  # La base en marcha; no hay otra tractografia en curso.
  simular docker 'case "$1" in info) exit 0;; inspect) case "$*" in *tractografia) exit 1;; *) echo true;; esac;; esac'
  # Sin recursos ahora mismo: comprobar_recursos_tracto vuelve a anotar el motivo.
  NEUROGRAPH_PRUEBA_MEMORIA_MB=10 neurograph tractografia && return 1
  contiene "⚠ Tractografía: pendiente — memoria insuficiente" "$(cat "$HOME/pantalla")" "dice por que" || return 1
  no_contiene "Algo ha fallado" "$(cat "$HOME/pantalla")" "sin mensaje inesperado" || return 1
  # El aviso se muestra ahora, no en el siguiente «neurograph abrir» (B3).
  contiene "⚠ La tractografía no se instalará" "$(cat "$HOME/pantalla")" "aviso en pantalla" || return 1
  [ ! -s "$HOME/.local/share/neurograph/.avisos" ] || { echo "    FALLA: el aviso queda guardado para despues"; return 1; }
}

prueba_ayuda_sale_una_vez() {
  igual 1 "$(bash "$NG_RAIZ/instalacion/linux/plantillas/neurograph" ayuda | grep -c 'Uso:')" "una sola linea de uso" || return 1
}

prueba_estado_muestra_lo_que_hay() {
  instalar_libs
  printf 'NG_TRACTOGRAFIA=pendiente\nNG_TRACTOGRAFIA_MOTIVO=memoria insuficiente\nNG_IAS_REGISTRADAS=claude\n' > "$HOME/.local/share/neurograph/estado.env"
  simular docker 'case "$1" in info) exit 0;; inspect) echo false;; esac'
  neurograph estado || return 1
  local p; p="$(cat "$HOME/pantalla")"
  contiene "apagado" "$p" "encendido o apagado" || return 1
  contiene "pendiente — memoria insuficiente" "$p" "tractografia con motivo" || return 1
  contiene "IAs registradas por el instalador: Claude Code" "$p" "registradas: conectadas solo lo dice la comprobacion (B3)" || return 1
  contiene "$HOME/NeuroData" "$p" "biblioteca" || return 1
}

prueba_paso_9_instala_comandos_iconos_e_instrucciones() {
  mkdir -p "$HOME/.local/share/neurograph"
  printf 'NG_API_PUERTO=8421\n' > "$HOME/.local/share/neurograph/config.env"
  con_lib 'NEUROGRAPH_PRUEBA_SIN_PROGRAMAS="claude codex gemini" paso_escritorio; decir "$NG_RESUMEN"' sistema docker ias escritorio || return 1
  [ -x "$HOME/.local/bin/neurograph" ] && [ -x "$HOME/.local/bin/neurograph-mcp" ] || { echo "    FALLA: faltan los comandos"; return 1; }
  [ -x "$HOME/.local/share/neurograph/desinstalar.sh" ] || { echo "    FALLA: falta el desinstalador"; return 1; }
  contiene "Exec=\"$HOME/.local/bin/neurograph\" abrir --escritorio" "$(cat "$HOME/.local/share/applications/neurograph.desktop")" "ruta absoluta, entre comillas" || return 1
  contiene "cuando cierres sesión y vuelvas a entrar; mientras, usa la ruta completa" "$(cat "$HOME/.local/share/neurograph/.avisos")" "aviso del PATH (B3)" || return 1
  contiene "neurograph estado" "$(cat "$HOME/.local/share/neurograph/conectar-ia.md")" "el puerto de la API se mira con neurograph estado (B5)" || return 1
  contiene "127.0.0.1:8421/render" "$(cat "$HOME/.local/share/neurograph/conectar-ia.md")" "puerto real en las instrucciones" || return 1
  no_contiene "@NG_" "$(cat "$HOME/.local/share/neurograph/conectar-ia.md" "$HOME/.local/share/applications/"*.desktop)" "sin marcadores sin sustituir" || return 1
}

prueba_el_navegador_no_retiene_el_bloqueo_ni_la_pantalla() {
  # El navegador que abre xdg-open puede seguir abierto horas (B1).
  mkdir -p "$HOME/.local/share/neurograph"
  printf 'NG_WEB_PUERTO=5173\n' > "$HOME/.local/share/neurograph/config.env"
  simular xdg-open "sleep 30 > /dev/null 2>&1 & echo \$! >> '$HOME/pids'"
  con_lib 'tomar_bloqueo; abrir_navegador; sleep 1' sistema escritorio || return 1
  sin_bloqueo_ni_pantalla_heredados || return 1
}

# docker de un «neurograph tractografia» que va bien. La API en marcha si
# existe $HOME/api-en-marcha; sin imagen de herramientas si $HOME/sin-imagen.
docker_tracto_diario() {
  simular docker "echo \"\$*\" >> '$NG_PRUEBA_LLAMADAS/docker'
case \"\$1\" in
  info) exit 0 ;;
  image) case \"\$*\" in *herramientas*) [ ! -e '$HOME/sin-imagen' ]; exit ;; esac ;;
  inspect) case \"\$*\" in *OOMKilled*) echo false ;; *neurograph-app-api) [ -e '$HOME/api-en-marcha' ] && echo true || echo false ;; *neurograph-app-postgres) echo false ;; *) exit 1 ;; esac ;;
  run) sleep \"\${RUN_ESPERA:-0}\"; echo 'Tractografia instalada.' ;;
  exec) echo '41 176 5176' ;;
esac
exit 0"
}
tractografia_diaria() { NEUROGRAPH_PRUEBA_MEMORIA_MB=40000 NEUROGRAPH_PRUEBA_ESPACIO_MB=99999 neurograph tractografia; }

prueba_tractografia_no_apaga_la_base_si_la_api_esta_en_marcha() {
  # Si mientras tanto se abrio NeuroGraph, apagar la base lo romperia (B3).
  instalar_libs; docker_tracto_diario; touch "$HOME/api-en-marcha"
  tractografia_diaria || { cat "$HOME/pantalla"; return 1; }
  contiene "up -d postgres" "$(llamadas docker)" "encendio la base" || return 1
  no_contiene "stop postgres" "$(llamadas docker)" "pero no la apaga: la usa la API" || return 1
  rm -f "$HOME/api-en-marcha" "$NG_PRUEBA_LLAMADAS/docker"
  tractografia_diaria || { cat "$HOME/pantalla"; return 1; }
  contiene "stop postgres" "$(llamadas docker)" "sin la API, apaga la base que encendio" || return 1
}

prueba_tractografia_no_pega_su_resultado_a_los_puntos() {
  instalar_libs; docker_tracto_diario
  RUN_ESPERA=3 NEUROGRAPH_PRUEBA_LATIDO_S=1 tractografia_diaria || { cat "$HOME/pantalla"; return 1; }
  contiene "." "$(grep 'Instalando la tractografía' "$HOME/pantalla")" "el latido ha puesto puntos" || return 1
  igual 1 "$(grep -c '^✔ Tractografía: 41 tractos' "$HOME/pantalla")" "el resultado empieza su linea (B3)" || return 1
}

prueba_tractografia_sin_su_imagen_lo_dice_sin_encender_nada() {
  # Con NeuroGraph encendido no se miraban las imagenes, y docker run la buscaria fuera (B1).
  instalar_libs; docker_tracto_diario; touch "$HOME/sin-imagen"
  tractografia_diaria && return 1
  contiene "Faltan las imágenes de NeuroGraph" "$(cat "$HOME/pantalla")" "frase" || return 1
  no_contiene "compose" "$(llamadas docker)" "no enciende la base" || return 1
}

prueba_iconos_y_marcadores_con_rutas_raras() {
  # Exec= entre comillas segun la especificacion de .desktop, y los
  # marcadores sustituidos tal cual aunque la ruta lleve # & \ $ % " ` (B3).
  local raro="$HOME/con espacio #1 & \\ \$x %d \"c\" \`b\`"
  mkdir -p "$raro/.local/share/neurograph"
  printf 'NG_API_PUERTO=8421\n' > "$raro/.local/share/neurograph/config.env"
  HOME="$raro" con_lib 'NEUROGRAPH_PRUEBA_SIN_PROGRAMAS="claude codex gemini" paso_escritorio' sistema docker ias escritorio || { cat "$raro/pantalla"; return 1; }
  local exec_linea
  exec_linea="$(grep '^Exec=' "$raro/.local/share/applications/neurograph.desktop")"
  # Se deshace como lo haria el escritorio: escape de cadena, comillas, %%.
  igual "$raro/.local/bin/neurograph|abrir|--escritorio" "$(python3 - "$exec_linea" <<'PYT'
import sys
v = sys.argv[1][len("Exec="):]
s = []; i = 0
while i < len(v):
    if v[i] == "\\" and i + 1 < len(v):
        s.append({"s": " ", "n": "\n", "t": "\t", "r": "\r", "\\": "\\"}.get(v[i + 1], "\\" + v[i + 1])); i += 2
    else:
        s.append(v[i]); i += 1
v = "".join(s)
args = []; actual = None; i = 0; comillas = False
while i < len(v):
    c = v[i]
    if comillas:
        if c == "\\" and v[i + 1] in '"`$\\':
            actual += v[i + 1]; i += 2; continue
        if c == '"':
            comillas = False
        else:
            actual += c
    elif c == '"':
        comillas = True; actual = actual or ""
    elif c == " ":
        if actual is not None: args.append(actual); actual = None
    else:
        actual = (actual or "") + c
    i += 1
if actual is not None: args.append(actual)
print("|".join(a.replace("%%", "%") for a in args))
PYT
)" "Exec= se deshace en la ruta real" || return 1
  contiene "$raro/.local/bin/neurograph-mcp" "$(cat "$raro/.local/share/neurograph/conectar-ia.md")" "marcadores tal cual" || return 1
}

prueba_pantalla_final_no_repite_como_repetir_la_tractografia() {
  mkdir -p "$HOME/.local/share/neurograph"
  printf 'NG_WEB_PUERTO=5173\n' > "$HOME/.local/share/neurograph/config.env"
  printf 'NG_TRACTOGRAFIA=pendiente\nNG_TRACTOGRAFIA_MOTIVO=Un archivo de Zenodo llegó dañado (x). Repite con: neurograph tractografia\n' \
    > "$HOME/.local/share/neurograph/estado.env"
  con_lib 'NG_FINAL_REGIONES=1; NG_FINAL_CONEXIONES=1; NG_IAS_RESUMEN=x; pantalla_final' sistema docker ias escritorio || return 1
  igual 1 "$(grep -o 'epite con: neurograph tractografia' "$HOME/pantalla" | wc -l | tr -d ' ')" "como repetirla, una sola vez" || return 1
}
