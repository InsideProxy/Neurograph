# shellcheck shell=bash
# Conexion de NeuroGraph con las IAs de terminal (B5 del diseno, H10).
# Ordenes comprobadas el 02/10/2026 en la documentacion oficial de Claude
# Code, Codex CLI y Gemini CLI. Siempre desde ~: en la carpeta del
# proyecto, su .mcp.json (otro "neurograph") tapa al de usuario. Siempre
# sin los descriptores 9 (bloqueo) y 3 (pantalla): las IAs arrancan los MCP
# de la persona, que pueden sobrevivir y retenerlos (B1).

NG_IAS=(claude codex gemini)
NG_IAS_RESUMEN=""

ia_nombre() {
  case "$1" in claude) echo "Claude Code" ;; codex) echo "Codex CLI" ;; gemini) echo "Gemini CLI" ;; esac
}

ia_ejecutable() {  # ia -> ruta (o nada si no esta)
  if existe_programa "$1"; then command -v "$1"; return 0; fi
  # Claude Code se instala en ~/.local/bin, que puede no estar en el PATH.
  if [ "$1" = claude ] && [ -x "$HOME/.local/bin/claude" ] \
     && [[ " ${NEUROGRAPH_PRUEBA_SIN_PROGRAMAS:-} " != *" claude "* ]]; then
    echo "$HOME/.local/bin/claude"
  fi
}

registrar_ia() {  # ia
  local exe mcp="$NG_BIN/neurograph-mcp"
  exe="$(ia_ejecutable "$1")"
  [ -n "$exe" ] || return 1
  (
    cd "$HOME" || exit 1
    case "$1" in
      claude)
        "$exe" mcp remove neurograph -s user || true
        "$exe" mcp add --transport stdio --scope user neurograph -- "$mcp" ;;
      codex)
        "$exe" mcp remove neurograph || true
        "$exe" mcp add neurograph -- "$mcp" ;;
      gemini)
        "$exe" mcp remove --scope user neurograph || true
        "$exe" mcp add --scope user neurograph "$mcp" ;;
    esac
  ) 9>&- 3>&-
}

quitar_ia() {  # ia (solo las que registro el instalador)
  local exe
  exe="$(ia_ejecutable "$1")"
  [ -n "$exe" ] || return 0
  (
    cd "$HOME" || exit 1
    case "$1" in
      claude) "$exe" mcp remove neurograph -s user ;;
      codex) "$exe" mcp remove neurograph ;;
      gemini) "$exe" mcp remove --scope user neurograph ;;
    esac
  ) 9>&- 3>&- || true
}

comprobar_ia() {  # ia -> conectado | registrado | fallo
  local exe salida
  exe="$(ia_ejecutable "$1")"
  case "$1" in
    claude) salida="$(cd "$HOME" && "$exe" mcp list 2>&1 9>&- 3>&- || true)"
      salida="$(grep -E '^neurograph:' <<< "$salida" || true)"
      if [[ "$salida" == *Connected* ]] && [[ "$salida" != *Failed* ]]; then echo conectado; else echo fallo; fi ;;
    gemini) salida="$(cd "$HOME" && "$exe" mcp list 2>&1 9>&- 3>&- || true)"
      salida="$(grep -F 'neurograph' <<< "$salida" || true)"
      if [[ "$salida" == *Connected* ]] && [[ "$salida" != *Disconnected* ]]; then echo conectado; else echo fallo; fi ;;
    codex) if (cd "$HOME" && "$exe" mcp get neurograph > /dev/null 2>&1 9>&- 3>&-); then echo registrado; else echo fallo; fi ;;
  esac
}

conectar_ias() {
  local ia encontradas=() registradas=() nombres="" estado partes=() anteriores
  for ia in "${NG_IAS[@]}"; do [ -n "$(ia_ejecutable "$ia")" ] && encontradas+=("$ia"); done
  if [ ${#encontradas[@]} -eq 0 ]; then
    NG_IAS_RESUMEN="no se encontró ninguna IA de terminal"
    return 0
  fi
  for ia in "${encontradas[@]}"; do nombres+="${nombres:+, }$(ia_nombre "$ia")"; done
  if ! preguntar_si "¿Conectar NeuroGraph con $nombres?"; then
    NG_IAS_RESUMEN="sin conectar (para hacerlo después: neurograph conectar-ia)"
    return 0
  fi
  for ia in "${encontradas[@]}"; do
    if ! registrar_ia "$ia"; then
      partes+=("$(ia_nombre "$ia") ✘ no se pudo registrar")
      continue
    fi
    registradas+=("$ia")
    if contenedor_en_marcha "$NG_PROYECTO-api"; then estado="$(comprobar_ia "$ia")"; else estado=registrado; fi
    case "$estado" in
      conectado) partes+=("$(ia_nombre "$ia") ✔ conectado") ;;
      registrado) partes+=("$(ia_nombre "$ia") ✔ registrado") ;;
      *) partes+=("$(ia_nombre "$ia") ✘ no responde")
         avisar "$(ia_nombre "$ia") no responde a NeuroGraph: mira $NG_DIR/conectar-ia.md." ;;
    esac
  done
  for ia in "${NG_IAS[@]}"; do
    [[ " ${encontradas[*]} " == *" $ia "* ]] || partes+=("$(ia_nombre "$ia"): no encontrado")
  done
  anteriores="$(leer_valor "$NG_ESTADO" NG_IAS_REGISTRADAS)"
  for ia in $anteriores; do [[ " ${registradas[*]} " == *" $ia "* ]] || registradas+=("$ia"); done
  guardar_valor "$NG_ESTADO" NG_IAS_REGISTRADAS "${registradas[*]}"
  NG_IAS_RESUMEN="$(printf '%s · ' "${partes[@]}")"
  NG_IAS_RESUMEN="${NG_IAS_RESUMEN% · }"
}
