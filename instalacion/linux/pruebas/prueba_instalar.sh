# shellcheck shell=bash
# Pruebas de instalar.sh con todo simulado (B1 y B6 del diseno, H10).

# Raiz falsa con el instalador real y un rebuild simulado.
raiz_con_instalador() {
  mkdir -p "$HOME/raiz/scripts" "$HOME/raiz/frontend/src-tauri/icons"
  cp -r "$NG_RAIZ/instalacion" "$HOME/raiz/"
  printf '#!/usr/bin/env bash\necho "  init/x.sql   OK"\n' > "$HOME/raiz/scripts/rebuild_db_from_sql.sh"
  chmod +x "$HOME/raiz/scripts/rebuild_db_from_sql.sh"
  printf 'png' > "$HOME/raiz/frontend/src-tauri/icons/128x128.png"
  bash -c "source '$NG_LIB/esperado.sh'; printf '%s\n' \"\${NG_ESPERADO_CARGA[@]}\"" > "$HOME/tabla"
  printf '%s|%s\n' "select (select count(*) from tracts where id like 'tract.human.org2018.%') || ' ' || (select count(*) from tractography_nodes) || ' ' || (select count(*) from tractography_edges)" "41 176 5176" >> "$HOME/tabla"
}
# docker simulado de una instalacion que va bien; TRACTO_CODIGO para run.
docker_instalacion() {  # [codigo_run_tractografia]
  simular docker "echo \"\$*\" >> '$NG_PRUEBA_LLAMADAS/docker'
case \"\$1 \${2:-}\" in
  '--version '*) echo 'Docker version 28.5.1' ;;
  'info -f') echo '[name=seccomp]' ;;
  'context inspect') echo 'unix:///var/run/docker.sock' ;;
  'volume ls') ;;
  'image inspect') case \"\$3\" in neurograph-app-*) [ -f '$HOME/construida-'\"\$3\" ] ;; *) exit 0 ;; esac; exit ;;
  'build '*) t=''; while [ \$# -gt 0 ]; do [ \"\$1\" = -t ] && t=\"\$2\"; shift; done; touch '$HOME/construida-'\"\$t\" ;;
  'inspect '*) case \"\$*\" in *Running*) exit 1 ;; *OOMKilled*) echo false ;; esac ;;
  'run '*) exit ${1:-0} ;;
  'exec -i') exec python3 -c \"\${@: -1}\" ;;
  'exec '*) q=\"\${@: -1}\"; grep -F -- \"\$q|\" '$HOME/tabla' | head -1 | sed 's/.*|//' ;;
esac
exit 0"
  simular_curl 'case "$*" in *"/regions"*) printf "[%s1]" "$(printf "1,%.0s" $(seq 1 1171))" ;; *"/connections"*) python3 -c "print([1]*104115)" | tr -d " " ;; *-w*) printf 200 ;; *) echo "<div id=\"root\"></div>" ;; esac'
  simular ss 'exit 0'
  simular_anotando sudo
  simular systemctl 'exit 0'
  mkdir -p "$HOME/.local/bin"
  cat > "$HOME/.local/bin/neurograph-mcp-simulado" <<'EOF'
#!/usr/bin/env bash
while IFS= read -r l; do case "$l" in *'"id":1'*) echo '{"jsonrpc":"2.0","id":1,"result":{}}';; *'"id":2'*) printf '{"jsonrpc":"2.0","id":2,"result":{"tools":['; for i in $(seq 1 12); do [ $i -gt 1 ] && printf ,; printf '{"name":"h%s"}' $i; done; echo ']}}';; esac; done
EOF
  chmod +x "$HOME/.local/bin/neurograph-mcp-simulado"
}
instalar() { NEUROGRAPH_PRUEBA_SIN_TERMINAL=1 NEUROGRAPH_PRUEBA_SIN_PROGRAMAS="claude codex gemini" NEUROGRAPH_PRUEBA_MEMORIA_MB=40000 NEUROGRAPH_PRUEBA_ESPACIO_MB=99999 NEUROGRAPH_PRUEBA_SITIOS=x NEUROGRAPH_PRUEBA_MCP="$HOME/.local/bin/neurograph-mcp-simulado" bash "$HOME/raiz/instalacion/linux/instalar.sh" "$@" > "$HOME/pantalla" 2>&1; }

prueba_instalacion_completa_simulada() {
  raiz_con_instalador; docker_instalacion
  instalar || { cat "$HOME/pantalla"; return 1; }
  local p; p="$(cat "$HOME/pantalla")"
  local n; for n in 1 2 3 4 5 6 7 8 9; do contiene "[$n/9]" "$p" "paso $n" || return 1; done
  contiene "NeuroGraph está instalado y encendido." "$p" "pantalla final" || return 1
  contiene "1172 regiones · 104115 conexiones" "$p" "datos" || return 1
  contiene "tractografía: 41 tractos" "$p" "tractografia" || return 1
  igual completa "$(leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" NG_INSTALACION)" "estado" || return 1
}

prueba_fallo_de_la_tractografia_no_detiene() {
  raiz_con_instalador; docker_instalacion 1
  sed -i "s/^select (select count(\*) from tracts.*$//" "$HOME/tabla"
  instalar || { cat "$HOME/pantalla"; return 1; }
  contiene "tractografía: pendiente" "$(cat "$HOME/pantalla")" "pendiente en la pantalla final" || return 1
  contiene "neurograph tractografia" "$(cat "$HOME/pantalla")" "como repetirla" || return 1
}

prueba_fallo_antes_del_paso_7_limpia_lo_de_esta_ejecucion() {
  raiz_con_instalador; docker_instalacion
  printf '#!/usr/bin/env bash\nprintf "  %%-64s ERROR\\n" init/x.sql; exit 1\n' > "$HOME/raiz/scripts/rebuild_db_from_sql.sh"
  ! instalar || return 1
  contiene "Falló la carga de los datos iniciales en init/x.sql." "$(cat "$HOME/pantalla")" "frase" || return 1
  contiene "volume rm neurograph-app-datos" "$(llamadas docker)" "volumen nuevo sin carga: fuera" || return 1
  igual incompleta "$(leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" NG_INSTALACION)" "estado" || return 1
}

prueba_imagenes_propias_de_antes_no_se_borran() {
  raiz_con_instalador; docker_instalacion
  touch "$HOME/construida-neurograph-app-api" "$HOME/construida-neurograph-app-web" "$HOME/construida-neurograph-app-herramientas"
  printf '#!/usr/bin/env bash\nprintf "  %%-64s ERROR\\n" init/x.sql; exit 1\n' > "$HOME/raiz/scripts/rebuild_db_from_sql.sh"
  ! instalar || return 1
  contiene "Falló la carga de los datos iniciales" "$(cat "$HOME/pantalla")" "falla en el paso 7" || return 1
  no_contiene "rmi neurograph-app-api" "$(llamadas docker)" "ya estaban antes: no son de esta ejecucion" || return 1
}

prueba_imagenes_propias_nuevas_se_borran_si_falla() {
  raiz_con_instalador; docker_instalacion
  printf '#!/usr/bin/env bash\nprintf "  %%-64s ERROR\\n" init/x.sql; exit 1\n' > "$HOME/raiz/scripts/rebuild_db_from_sql.sh"
  ! instalar || return 1
  contiene "rmi neurograph-app-api" "$(llamadas docker)" "creadas en esta ejecucion: fuera" || return 1
}

prueba_segunda_instalacion_bloqueada_no_toca_nada() {
  raiz_con_instalador; docker_instalacion
  mkdir -p "$HOME/.local/share/neurograph"
  printf 'NG_INSTALACION=incompleta\n' > "$HOME/.local/share/neurograph/estado.env"
  exec 8> "$HOME/.local/share/neurograph/.bloqueo"; flock -n 8
  ! instalar || return 1
  contiene "Ya hay otro instalador" "$(cat "$HOME/pantalla")" "se para" || return 1
  no_contiene "rm -f" "$(llamadas docker)" "no borra los contenedores de la que esta en marcha" || return 1
  igual "NG_INSTALACION=incompleta" "$(cat "$HOME/.local/share/neurograph/estado.env")" "ni toca su estado" || return 1
}

prueba_api_con_otros_datos_no_da_por_buena_la_instalacion() {
  raiz_con_instalador; docker_instalacion
  simular_curl 'case "$*" in *"/regions"*) echo "[1,2,3]" ;; *"/connections"*) echo "[1]" ;; *-w*) printf 200 ;; *) echo "<div id=\"root\"></div>" ;; esac'
  ! instalar || return 1
  contiene "La API no da los datos esperados" "$(cat "$HOME/pantalla")" "la comprobacion final exige las cifras" || return 1
}

prueba_mcp_con_otras_herramientas_no_da_por_buena_la_instalacion() {
  raiz_con_instalador; docker_instalacion
  sed -i 's/seq 1 12/seq 1 11/' "$HOME/.local/bin/neurograph-mcp-simulado"
  ! instalar || return 1
  contiene "lista 11 herramientas y se esperaban 12" "$(cat "$HOME/pantalla")" "la comprobacion final habla con el MCP" || return 1
}

prueba_biblioteca_elegida_se_guarda() {
  raiz_con_instalador; docker_instalacion
  instalar --biblioteca "$HOME/Datos con espacio" || { cat "$HOME/pantalla"; return 1; }
  igual "$HOME/Datos con espacio" "$(leer_valor_archivo "$HOME/.local/share/neurograph/config.env" NG_BIBLIOTECA)" "ruta guardada" || return 1
}

prueba_opcion_desconocida_no_toca_nada() {
  raiz_con_instalador; docker_instalacion
  ! instalar --lo-que-sea || return 1
  contiene "Opción desconocida: --lo-que-sea" "$(cat "$HOME/pantalla")" "dice por que" || return 1
  [ ! -d "$HOME/.local/share/neurograph" ] || { echo "    FALLA: creo archivos"; return 1; }
}

# Comprobacion final sola (B1): NeuroGraph encendido y el conector con sus 12 herramientas.
comprobacion_simulada() {  # cuerpo_de_curl
  mkdir -p "$HOME/.local/share/neurograph" "$HOME/.local/bin"
  printf 'NG_WEB_PUERTO=5173\nNG_API_PUERTO=8420\n' > "$HOME/.local/share/neurograph/config.env"
  simular_curl "$1"
  simular docker 'if [ "$1" = exec ]; then exec python3 -c "${@: -1}"; fi'
  cat > "$HOME/.local/bin/neurograph-mcp" <<'EOF'
#!/usr/bin/env bash
while IFS= read -r l; do case "$l" in *'"id":1'*) echo '{"jsonrpc":"2.0","id":1,"result":{}}';; *'"id":2'*) printf '{"jsonrpc":"2.0","id":2,"result":{"tools":['; for i in $(seq 1 12); do [ $i -gt 1 ] && printf ,; printf '{"name":"h%s"}' $i; done; echo ']}}';; esac; done
EOF
  chmod +x "$HOME/.local/bin/neurograph-mcp"
}
LIBS_FINAL="sistema docker base mcp ias escritorio"

prueba_api_que_no_responde_en_la_comprobacion_final_lo_dice() {
  # B9: ni «inesperado» ni una cuenta de una respuesta vacia.
  comprobacion_simulada 'case "$*" in *"/regions"*) exit 7 ;; *) echo "<div id=\"root\"></div>" ;; esac'
  ! con_lib 'comprobacion_final' $LIBS_FINAL || return 1
  contiene "La API no da los datos esperados (no responde en /regions)" "$(pantalla)" "frase de la API" || return 1
  no_contiene "Algo ha fallado" "$(pantalla)" "no es inesperado" || return 1
}

prueba_api_que_no_da_json_en_la_comprobacion_final_lo_dice() {
  comprobacion_simulada 'case "$*" in *"/regions"*) echo "<html>502</html>" ;; *) echo "<div id=\"root\"></div>" ;; esac'
  ! con_lib 'comprobacion_final' $LIBS_FINAL || return 1
  contiene "La API no da los datos esperados (/regions no devuelve una lista JSON)" "$(pantalla)" "frase de la API" || return 1
  no_contiene "Algo ha fallado" "$(pantalla)" "no es inesperado" || return 1
}

prueba_web_que_no_responde_en_la_comprobacion_final() {
  comprobacion_simulada 'case "$*" in *"/regions"*|*"/connections"*) echo "[1]" ;; *) exit 7 ;; esac'
  ! con_lib 'comprobacion_final' $LIBS_FINAL || return 1
  contiene "La web no responde en http://127.0.0.1:5173." "$(pantalla)" "la web se comprueba (B1)" || return 1
}

prueba_la_pantalla_final_muestra_los_avisos() {
  mkdir -p "$HOME/.local/share/neurograph"
  printf 'NG_WEB_PUERTO=5174\n' > "$HOME/.local/share/neurograph/config.env"
  printf 'La web usa el puerto 5174 (el 5173 estaba ocupado).\n' > "$HOME/.local/share/neurograph/.avisos"
  con_lib 'NG_FINAL_REGIONES=1; NG_FINAL_CONEXIONES=2; NG_IAS_RESUMEN=x; pantalla_final' $LIBS_FINAL || return 1
  contiene $'  Avisos:\n  ⚠ La web usa el puerto 5174 (el 5173 estaba ocupado).' "$(pantalla)" "los avisos, con su encabezado (B6)" || return 1
  [ ! -s "$HOME/.local/share/neurograph/.avisos" ] || { echo "    FALLA: los avisos mostrados siguen guardados"; return 1; }
}

prueba_primera_instalacion_sin_opcion_pregunta_y_guarda_la_biblioteca() {
  raiz_con_instalador; docker_instalacion
  NEUROGRAPH_PRUEBA_RESPUESTA=n NEUROGRAPH_PRUEBA_BIBLIOTECA="$HOME/SSD/NeuroData" instalar || { cat "$HOME/pantalla"; return 1; }
  igual "$HOME/SSD/NeuroData" "$(leer_valor_archivo "$HOME/.local/share/neurograph/config.env" NG_BIBLIOTECA)" "guarda la elegida" || return 1
  contiene "Biblioteca de datos: $HOME/SSD/NeuroData" "$(cat "$HOME/pantalla")" "la dice al empezar" || return 1
  # La segunda vez no pregunta: usa la guardada aunque la respuesta sea otra.
  NEUROGRAPH_PRUEBA_RESPUESTA=n NEUROGRAPH_PRUEBA_BIBLIOTECA="$HOME/otra" instalar || { cat "$HOME/pantalla"; return 1; }
  igual "$HOME/SSD/NeuroData" "$(leer_valor_archivo "$HOME/.local/share/neurograph/config.env" NG_BIBLIOTECA)" "no vuelve a preguntar" || return 1
}
