# shellcheck shell=bash
# Pruebas de puertos.sh (paso 4 y abrir, B1 y B3 del diseno, H10).

# ss simulado: OCUPADOS es la lista de puertos con algo escuchando.
ss_simulado() {  # "5173 8420"
  simular ss "for p in $1; do case \"\$2\" in *\":\$p\") echo \"LISTEN 0 511 127.0.0.1:\$p 0.0.0.0:*\";; esac; done"
}
# docker simulado: ps devuelve PS; inspect del contenedor web devuelve EN_MARCHA.
docker_ps_simulado() {  # "lineas de ps" en_marcha(true/false)
  simular docker "case \"\$1\" in
  ps) printf '%b' '$1' ;;
  inspect) echo ${2:-false} ;;
esac"
}

prueba_puerto_ocupado_por_programa_pasa_al_siguiente_y_avisa() {
  ss_simulado "5173"; docker_ps_simulado ""
  con_lib 'elegir_puertos; decir "$NG_RESUMEN"' docker puertos || return 1
  contiene "web 5174 · API 8420" "$(pantalla)" "resumen" || return 1
  contiene "La web usa el puerto 5174 (el 5173 estaba ocupado)." "$(cat "$HOME/.local/share/neurograph/.avisos")" "aviso" || return 1
  igual 5174 "$(leer_valor_archivo "$HOME/.local/share/neurograph/config.env" NG_WEB_PUERTO)" "se guarda" || return 1
}

prueba_puerto_de_otro_contenedor_cuenta_como_ocupado() {
  ss_simulado ""; docker_ps_simulado 'neurograph-api|0.0.0.0:8420->8420/tcp, [::]:8420->8420/tcp\n'
  con_lib 'elegir_puertos; decir "$NG_RESUMEN"' docker puertos || return 1
  contiene "API 8421" "$(pantalla)" "el 8420 lo publica el desarrollo" || return 1
}

prueba_con_neurograph_en_marcha_no_cambia_nada() {
  mkdir -p "$HOME/.local/share/neurograph"
  printf 'NG_WEB_PUERTO=5173\nNG_API_PUERTO=8420\n' > "$HOME/.local/share/neurograph/config.env"
  ss_simulado "5173 8420"; docker_ps_simulado 'neurograph-app-web|127.0.0.1:5173->80/tcp\n' true
  con_lib 'elegir_puertos; decir "$NG_RESUMEN"' docker puertos || return 1
  contiene "web 5173 · API 8420" "$(pantalla)" "sus propios puertos no cuentan" || return 1
  [ ! -s "$HOME/.local/share/neurograph/.avisos" ] || { echo "    FALLA: no debe avisar"; return 1; }
}

prueba_contenedor_propio_no_cuenta_como_ocupado() {
  mkdir -p "$HOME/.local/share/neurograph"
  printf 'NG_WEB_PUERTO=5173\nNG_API_PUERTO=8420\n' > "$HOME/.local/share/neurograph/config.env"
  ss_simulado ""; docker_ps_simulado 'neurograph-app-api|127.0.0.1:8420->8420/tcp\n' false
  con_lib 'elegir_puertos; decir "$NG_RESUMEN"' docker puertos || return 1
  contiene "API 8420" "$(pantalla)" "su propia API (a medias) no le quita el puerto" || return 1
  # Con userland-proxy, ss tambien ve ese puerto (docker-proxy): sigue siendo suyo.
  ss_simulado "8420"
  con_lib 'elegir_puertos; decir "$NG_RESUMEN"' docker puertos || return 1
  contiene "API 8420" "$(pantalla)" "tampoco cuando ss lo ve" || return 1
  [ ! -s "$HOME/.local/share/neurograph/.avisos" ] || { echo "    FALLA: aviso falso de puerto"; return 1; }
}

prueba_respeta_los_puertos_guardados() {
  mkdir -p "$HOME/.local/share/neurograph"
  printf 'NG_WEB_PUERTO=5180\nNG_API_PUERTO=8430\n' > "$HOME/.local/share/neurograph/config.env"
  ss_simulado ""; docker_ps_simulado ""
  con_lib 'elegir_puertos; decir "$NG_RESUMEN"' docker puertos || return 1
  contiene "web 5180 · API 8430" "$(pantalla)" "guardados" || return 1
}

prueba_web_y_api_nunca_coinciden() {
  mkdir -p "$HOME/.local/share/neurograph"
  printf 'NG_WEB_PUERTO=8420\nNG_API_PUERTO=8420\n' > "$HOME/.local/share/neurograph/config.env"
  ss_simulado ""; docker_ps_simulado ""
  con_lib 'elegir_puertos; decir "$NG_RESUMEN"' docker puertos || return 1
  contiene "web 8420 · API 8421" "$(pantalla)" "la API se aparta" || return 1
}

prueba_sin_puertos_libres_para() {
  local todos; todos="$(seq 5173 5240 | tr '\n' ' ')"
  ss_simulado "$todos"; docker_ps_simulado ""
  ! con_lib 'elegir_puertos' docker puertos || return 1
  contiene "No hay ningún puerto libre cerca del 5173." "$(pantalla)" "frase" || return 1
}

prueba_la_busqueda_de_la_web_no_se_queda_con_el_puerto_de_la_api() {
  mkdir -p "$HOME/.local/share/neurograph"
  printf 'NG_WEB_PUERTO=8419\nNG_API_PUERTO=8420\n' > "$HOME/.local/share/neurograph/config.env"
  ss_simulado "8419"; docker_ps_simulado ""
  con_lib 'elegir_puertos; decir "$NG_RESUMEN"' docker puertos || return 1
  contiene "web 8421 · API 8420" "$(pantalla)" "la web salta el de la API y esta no cambia" || return 1
  no_contiene "La API usa" "$(cat "$HOME/.local/share/neurograph/.avisos")" "sin aviso de cambio de la API" || return 1
}
