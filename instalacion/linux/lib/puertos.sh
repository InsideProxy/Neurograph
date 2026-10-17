# shellcheck shell=bash disable=SC2034  # NG_RESUMEN lo lee comun.sh
# Paso 4 y abrir: puertos de la web y la API (B1 y B3 del diseno, H10).
# Ocupado = algo escucha (ss, IPv4 e IPv6) o lo publica otro contenedor
# (docker ps; sin userland-proxy, ss no lo ve). Los contenedores de este
# NeuroGraph no cuentan: con NeuroGraph en marcha no se cambia nada.

puerto_ocupado() {  # puerto
  local p="$1" publicados
  publicados="$(docker ps --format '{{.Names}}|{{.Ports}}' 2> /dev/null || true)"
  # grep -c y no -q: con pipefail, -q puede dar un falso negativo (SIGPIPE).
  # Primero los contenedores propios: con userland-proxy, ss ve su puerto
  # (docker-proxy) y lo daria por ocupado.
  [ "$(grep "^$NG_PROYECTO-" <<< "$publicados" | grep -cE "[]:]$p->" || true)" -gt 0 ] && return 1
  [ -n "$(ss -Hltn "sport = :$p" 2> /dev/null || true)" ] && return 0
  [ "$(grep -v "^$NG_PROYECTO-" <<< "$publicados" | grep -cE "[]:]$p->" || true)" -gt 0 ]
}

primer_puerto_libre() {  # desde [salvo] -> puerto (falla si no hay en 50)
  local p="$1" salvo="${2:-}"
  while [ "$p" -le $(( $1 + 50 )) ]; do
    if [ "$p" != "$salvo" ] && ! puerto_ocupado "$p"; then echo "$p"; return 0; fi
    p=$((p + 1))
  done
  return 1
}

elegir_puertos() {
  local web api nuevo
  web="$(leer_valor "$NG_CONFIG" NG_WEB_PUERTO)"; web="${web:-5173}"
  api="$(leer_valor "$NG_CONFIG" NG_API_PUERTO)"; api="${api:-8420}"
  if contenedor_en_marcha "$NG_PROYECTO-web"; then
    NG_RESUMEN="web $web · API $api"
    return 0
  fi
  if puerto_ocupado "$web"; then
    nuevo="$(primer_puerto_libre "$web" "$api")" || fallar sin_puerto "$web"
    avisar "La web usa el puerto $nuevo (el $web estaba ocupado)."
    web="$nuevo"
  fi
  if [ "$api" = "$web" ] || puerto_ocupado "$api"; then
    nuevo="$(primer_puerto_libre "$api" "$web")" || fallar sin_puerto "$api"
    [ "$api" = "$web" ] || avisar "La API usa el puerto $nuevo (el $api estaba ocupado)."
    api="$nuevo"
  fi
  guardar_valor "$NG_CONFIG" NG_WEB_PUERTO "$web"
  guardar_valor "$NG_CONFIG" NG_API_PUERTO "$api"
  NG_RESUMEN="web $web · API $api"
}
