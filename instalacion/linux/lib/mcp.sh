# shellcheck shell=bash
# Comprobacion del conector MCP instalado (B1 y B4 del diseno, H10): habla
# con ~/.local/bin/neurograph-mcp como lo haria una IA (initialize y
# tools/list) y cuenta las herramientas. Deja NG_MCP_HERRAMIENTAS y
# NG_MCP_SEGUNDOS (tiempo hasta responder a initialize, para B8.5).
# NEUROGRAPH_PRUEBA_MCP (solo pruebas): otro programa en lugar de neurograph-mcp.

NG_MCP_HERRAMIENTAS=""
NG_MCP_SEGUNDOS=""
NG_MCP_LINEA=""

# Lee del conector hasta la respuesta con ese id y la deja en NG_MCP_LINEA.
# Devuelve 1 si el conector se cerro y 2 si no responde en NG_ESPERA_MCP s:
# son fallos distintos (B1).
leer_respuesta_mcp() {  # descriptor id
  local linea
  NG_MCP_LINEA=""
  while true; do
    if IFS= read -r -t "$NG_ESPERA_MCP" linea <&"$1"; then
      if [[ "$linea" =~ \"id\":\ ?$2[,}] ]]; then NG_MCP_LINEA="$linea"; return 0; fi
    elif [ $? -gt 128 ]; then
      return 2
    else
      return 1
    fi
  done
}

# En un subshell: si el conector ya se cerro, el SIGPIPE solo lo mata a el
# (al proceso principal lo mataria sin mensaje). Lo dira la lectura.
enviar_mcp() {  # descriptor linea...
  ( printf '%s\n' "${@:2}" >&"$1" ) 2> /dev/null || true
}

comprobar_mcp() {
  local inicio pid lee escribe estado=0 fase=initialize
  inicio=$SECONDS
  # exec: el PID del coproc es el del conector, y el kill llega a el. 9>&- y
  # 3>&-: si algo sobrevive, no debe retener el bloqueo ni la pantalla (B1).
  coproc MCP { exec "${NEUROGRAPH_PRUEBA_MCP:-$NG_BIN/neurograph-mcp}" 2>> "$NG_REGISTRO" 9>&- 3>&-; }
  pid=$MCP_PID
  # Copias propias: bash cierra y borra MCP en cuanto el conector termina.
  exec {lee}<&"${MCP[0]:-}" {escribe}>&"${MCP[1]:-}" || fallar mcp "el conector se cerró nada más arrancar"
  enviar_mcp "$escribe" '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"instalador-neurograph","version":"1"}}}'
  leer_respuesta_mcp "$lee" 1 || estado=$?
  if [ "$estado" = 0 ]; then
    NG_MCP_SEGUNDOS=$(( SECONDS - inicio )); fase=tools/list
    enviar_mcp "$escribe" '{"jsonrpc":"2.0","method":"notifications/initialized"}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
    leer_respuesta_mcp "$lee" 2 || estado=$?
  fi
  exec {escribe}>&- {lee}<&-
  kill "$pid" 2> /dev/null || true
  case "$estado" in
    1) fallar mcp "el conector se cerró sin responder a $fase" ;;
    2) fallar mcp "no responde a $fase en $NG_ESPERA_MCP s" ;;
  esac
  # Se cuenta con el Python del contenedor de la API: el ordenador puede no tenerlo.
  NG_MCP_HERRAMIENTAS="$(printf '%s\n' "$NG_MCP_LINEA" | docker exec -i "$NG_PROYECTO-api" python -c 'import json,sys; print(len(json.loads(sys.stdin.read())["result"]["tools"]))')" \
    || fallar mcp "su respuesta a tools/list no trae la lista de herramientas"
  echo "mcp: initialize en $NG_MCP_SEGUNDOS s, $NG_MCP_HERRAMIENTAS herramientas"
}
