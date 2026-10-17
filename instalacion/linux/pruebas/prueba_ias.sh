# shellcheck shell=bash
# Pruebas de ias.sh (B5 del diseno, H10).

ia_simulada() {  # nombre salida_de_list
  simular "$1" "echo \"\$PWD|\$*\" >> '$NG_PRUEBA_LLAMADAS/$1'
case \"\$*\" in 'mcp list'*) printf '%b' '${2:-}' ;; esac"
}

prueba_claude_quita_y_anade_desde_home() {
  ia_simulada claude
  con_lib 'NEUROGRAPH_PRUEBA_SIN_PROGRAMAS="codex gemini" registrar_ia claude' sistema ias || return 1
  local l; l="$(llamadas claude)"
  igual "$HOME|mcp remove neurograph -s user" "$(sed -n 1p <<< "$l")" "primero quita, desde ~" || return 1
  igual "$HOME|mcp add --transport stdio --scope user neurograph -- $HOME/.local/bin/neurograph-mcp" "$(sed -n 2p <<< "$l")" "despues anade, ambito usuario, ruta absoluta" || return 1
}

prueba_codex_y_gemini_con_sus_ordenes() {
  ia_simulada codex; ia_simulada gemini
  con_lib 'registrar_ia codex; registrar_ia gemini' sistema ias || return 1
  contiene "|mcp add neurograph -- $HOME/.local/bin/neurograph-mcp" "$(llamadas codex)" "codex" || return 1
  contiene "|mcp remove --scope user neurograph" "$(llamadas gemini)" "gemini quita con ambito" || return 1
  contiene "|mcp add --scope user neurograph $HOME/.local/bin/neurograph-mcp" "$(llamadas gemini)" "gemini" || return 1
}

prueba_comprobar_distingue_estados() {
  ia_simulada claude 'neurograph: /x/neurograph-mcp  - ✓ Connected\n'
  con_lib 'decir "C=$(comprobar_ia claude)"' sistema ias || return 1
  contiene "C=conectado" "$(pantalla)" "claude conectado" || return 1
  ia_simulada claude 'neurograph: /x/neurograph-mcp  - ✗ Failed to connect\n'
  con_lib 'decir "C=$(comprobar_ia claude)"' sistema ias || return 1
  contiene "C=fallo" "$(pantalla)" "claude falla" || return 1
  ia_simulada gemini '✗ neurograph: /x/neurograph-mcp (stdio) - Disconnected\n'
  con_lib 'decir "G=$(comprobar_ia gemini)"' sistema ias || return 1
  contiene "G=fallo" "$(pantalla)" "Disconnected no es Connected" || return 1
  ia_simulada codex
  con_lib 'decir "X=$(comprobar_ia codex)"' sistema ias || return 1
  contiene "X=registrado" "$(pantalla)" "codex solo confirma el registro" || return 1
}

prueba_respuesta_no_no_toca_nada() {
  ia_simulada claude
  simular docker 'exit 0'  # nunca el Docker real
  con_lib 'NEUROGRAPH_PRUEBA_SIN_PROGRAMAS="codex gemini" NEUROGRAPH_PRUEBA_RESPUESTA=n conectar_ias; decir "$NG_IAS_RESUMEN"' sistema docker ias || return 1
  igual "" "$(llamadas claude)" "no se ejecuta nada" || return 1
  contiene "neurograph conectar-ia" "$(pantalla)" "dice como hacerlo despues" || return 1
}

prueba_sin_terminal_no_pregunta_ni_toca() {
  ia_simulada claude
  simular docker 'exit 0'  # nunca el Docker real
  setsid bash -c "$(declare -f con_lib); HOME='$HOME' NG_LIB='$NG_LIB' con_lib 'NEUROGRAPH_PRUEBA_SIN_PROGRAMAS=\"codex gemini\" conectar_ias' sistema docker ias" < /dev/null || return 1
  igual "" "$(llamadas claude)" "sin terminal no se registra" || return 1
}

prueba_si_registra_comprueba_y_anota() {
  ia_simulada claude 'neurograph: /x/neurograph-mcp  - ✓ Connected\n'
  simular docker 'case "$1" in inspect) echo true;; esac'
  con_lib 'NEUROGRAPH_PRUEBA_SIN_PROGRAMAS="codex gemini" NEUROGRAPH_PRUEBA_RESPUESTA=s conectar_ias; decir "$NG_IAS_RESUMEN"' sistema docker ias || return 1
  contiene "Claude Code ✔ conectado" "$(pantalla)" "resumen" || return 1
  igual claude "$(leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" NG_IAS_REGISTRADAS)" "anotada" || return 1
}

prueba_registro_que_falla_no_se_anota() {
  simular claude "echo \"\$PWD|\$*\" >> '$NG_PRUEBA_LLAMADAS/claude'; case \"\$*\" in 'mcp add'*) exit 1 ;; esac"
  simular docker 'case "$1" in inspect) echo true;; esac'
  con_lib 'NEUROGRAPH_PRUEBA_SIN_PROGRAMAS="codex gemini" NEUROGRAPH_PRUEBA_RESPUESTA=s conectar_ias; decir "$NG_IAS_RESUMEN"' sistema docker ias || return 1
  contiene "Claude Code ✘ no se pudo registrar" "$(pantalla)" "lo dice" || return 1
  contiene "Gemini CLI: no encontrado" "$(pantalla)" "y las que no estan (B6)" || return 1
  igual "" "$(leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" NG_IAS_REGISTRADAS)" "no se anota" || return 1
}

prueba_ninguna_ia() {
  con_lib 'NEUROGRAPH_PRUEBA_SIN_PROGRAMAS="claude codex gemini" conectar_ias; decir "$NG_IAS_RESUMEN"' sistema docker ias || return 1
  contiene "no se encontró ninguna IA de terminal" "$(pantalla)" "resumen" || return 1
}

prueba_lo_que_deja_vivo_una_ia_no_retiene_el_bloqueo_ni_la_pantalla() {
  # Las IAs arrancan los MCP de la persona, que pueden sobrevivir (B1).
  simular claude "sleep 30 > /dev/null 2>&1 & echo \$! >> '$HOME/pids'
case \"\$*\" in 'mcp list'*) echo 'neurograph: /x - ✓ Connected' ;; esac"
  simular codex "sleep 30 > /dev/null 2>&1 & echo \$! >> '$HOME/pids'"
  con_lib 'tomar_bloqueo; registrar_ia claude; quitar_ia claude; comprobar_ia claude > /dev/null; comprobar_ia codex > /dev/null' sistema ias || return 1
  local n; n="$(wc -l < "$HOME/pids")"
  sin_bloqueo_ni_pantalla_heredados || return 1
  igual 5 "$n" "quitar y anadir, quitar y dos comprobaciones dejan su proceso" || return 1
}

prueba_una_ia_registrada_antes_que_ya_no_esta_sigue_anotada() {
  # La desinstalacion debe poder quitarla si vuelve a estar (B5).
  mkdir -p "$HOME/.local/share/neurograph"
  printf 'NG_IAS_REGISTRADAS=codex\n' > "$HOME/.local/share/neurograph/estado.env"
  ia_simulada claude 'neurograph: /x/neurograph-mcp  - ✓ Connected\n'
  simular docker 'case "$1" in inspect) echo true;; esac'
  con_lib 'NEUROGRAPH_PRUEBA_SIN_PROGRAMAS="codex gemini" NEUROGRAPH_PRUEBA_RESPUESTA=s conectar_ias' sistema docker ias || return 1
  local l; l="$(leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" NG_IAS_REGISTRADAS)"
  contiene "claude" "$l" "la de ahora" || return 1
  contiene "codex" "$l" "y la de antes" || return 1
}
