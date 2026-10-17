# shellcheck shell=bash
# Pruebas de neurograph-mcp y mcp.sh (B4 del diseno, H10).
MCP="$NG_RAIZ/instalacion/linux/plantillas/neurograph-mcp"

prueba_apagado_sale_sin_encender_y_sin_stdout() {
  simular docker 'echo "$*" >> '"'$NG_PRUEBA_LLAMADAS/docker'"'
case "$1" in info) exit 0;; inspect) echo false;; esac'
  local out; out="$(bash "$MCP" < /dev/null 2> "$HOME/err")" && return 1
  igual "" "$out" "nada por la salida estandar" || return 1
  contiene "NeuroGraph está apagado" "$(cat "$HOME/err")" "mensaje por la salida de errores" || return 1
  no_contiene "compose" "$(llamadas docker)" "nunca lo enciende" || return 1
  no_contiene "start" "$(llamadas docker)" "nunca lo enciende" || return 1
  contiene "NeuroGraph está apagado" "$(cat "$HOME/.local/share/neurograph/registro/mcp.log")" "y al registro" || return 1
}

prueba_encendido_solo_sale_el_mcp() {
  simular docker 'case "$1" in info) echo "info ruidosa";; inspect) echo true;; exec) echo "{\"jsonrpc\":\"2.0\",\"id\":1}";; esac'
  igual '{"jsonrpc":"2.0","id":1}' "$(bash "$MCP" < /dev/null 2> /dev/null)" "solo el protocolo" || return 1
}

prueba_sin_grupo_en_la_sesion_se_relanza_con_sg() {
  simular docker 'echo "permission denied" >&2; exit 1'
  simular id 'case "$*" in "-un") echo demo ;; "-nG demo") echo "demo docker" ;; "-nG") echo "demo" ;; *) /usr/bin/id "$@" ;; esac'
  simular_anotando sg
  bash "$MCP" < /dev/null 2> /dev/null || true
  contiene "docker -c" "$(llamadas sg)" "relanza con sg docker" || return 1
  contiene "neurograph-mcp" "$(llamadas sg)" "a si mismo" || return 1
}

# Servidor MCP simulado en el lugar de neurograph-mcp instalado.
mcp_simulado() {  # numero_de_herramientas (vacio = no responde)
  mkdir -p "$HOME/.local/bin"
  cat > "$HOME/.local/bin/neurograph-mcp" <<EOF
#!/usr/bin/env bash
[ -n "$1" ] || exec sleep 30
while IFS= read -r linea; do
  case "\$linea" in
    *'"id":1'*) echo '{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18"}}' ;;
    *'"id":2'*) printf '{"jsonrpc":"2.0","id":2,"result":{"tools":['; for i in \$(seq 1 $1); do [ \$i -gt 1 ] && printf ','; printf '{"name":"h%s"}' \$i; done; echo ']}}' ;;
  esac
done
EOF
  chmod +x "$HOME/.local/bin/neurograph-mcp"
  # docker exec -i ... python -c PROGRAMA: se usa el python3 del ordenador.
  simular docker 'if [ "$1" = exec ]; then exec python3 -c "${@: -1}"; fi'
}

prueba_comprobacion_cuenta_las_herramientas() {
  mcp_simulado 12
  con_lib 'comprobar_mcp; decir "H=$NG_MCP_HERRAMIENTAS"' mcp || return 1
  contiene "H=12" "$(pantalla)" "doce herramientas" || return 1
}

prueba_comprobacion_falla_si_no_responde() {
  mcp_simulado ""
  ! con_lib 'NG_ESPERA_MCP=2 comprobar_mcp' mcp || return 1
  contiene "El conector MCP no responde" "$(pantalla)" "frase" || return 1
}

prueba_lo_que_deja_vivo_el_conector_no_retiene_el_bloqueo_ni_la_pantalla() {
  mcp_simulado 12
  sed -i "2i sleep 30 > /dev/null 2>&1 & echo \$! >> '$HOME/pids'" "$HOME/.local/bin/neurograph-mcp"
  con_lib 'tomar_bloqueo; comprobar_mcp' mcp || return 1
  sin_bloqueo_ni_pantalla_heredados || return 1
}

prueba_conector_que_se_cierra_no_es_uno_que_no_responde() {
  # B9: ni «inesperado» ni la misma frase para los dos casos.
  printf '#!/usr/bin/env bash\necho "NeuroGraph está apagado" >&2\nexit 1\n' > "$HOME/cerrado"; chmod +x "$HOME/cerrado"
  ! con_lib 'NEUROGRAPH_PRUEBA_MCP="$HOME/cerrado" comprobar_mcp' mcp || return 1
  contiene "(el conector se cerró sin responder a initialize)" "$(pantalla)" "se cerro" || return 1
  no_contiene "Algo ha fallado" "$(pantalla)" "no es inesperado" || return 1
  mcp_simulado ""
  ! con_lib 'NG_ESPERA_MCP=1 comprobar_mcp' mcp || return 1
  contiene "(no responde a initialize en 1 s)" "$(pantalla)" "no responde a tiempo" || return 1
}

prueba_lista_de_herramientas_rota_no_es_inesperada() {
  mkdir -p "$HOME/.local/bin"
  cat > "$HOME/.local/bin/neurograph-mcp" <<'EOF'
#!/usr/bin/env bash
while IFS= read -r l; do case "$l" in *'"id":1'*) echo '{"jsonrpc":"2.0","id":1,"result":{}}';; *'"id":2'*) echo '{"jsonrpc":"2.0","id":2,"result":{"tools":[';; esac; done
EOF
  chmod +x "$HOME/.local/bin/neurograph-mcp"
  simular docker 'if [ "$1" = exec ]; then exec python3 -c "${@: -1}"; fi'
  ! con_lib 'comprobar_mcp' mcp || return 1
  contiene "El conector MCP no responde como se esperaba (su respuesta a tools/list no trae la lista de herramientas)" "$(pantalla)" "frase" || return 1
  no_contiene "Algo ha fallado" "$(pantalla)" "no es inesperado" || return 1
}

prueba_el_conector_que_no_responde_no_queda_vivo() {
  mcp_simulado ""
  sed -i "2i echo \$\$ > '$HOME/pid-mcp'" "$HOME/.local/bin/neurograph-mcp"
  ! con_lib 'NG_ESPERA_MCP=1 comprobar_mcp' mcp || return 1
  sleep 0.5
  local pid; pid="$(cat "$HOME/pid-mcp")"
  if kill -0 "$pid" 2> /dev/null; then
    kill "$pid"; echo "    FALLA: el conector sigue vivo tras la comprobacion"; return 1
  fi
}
