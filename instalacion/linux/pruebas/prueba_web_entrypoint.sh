# shellcheck shell=bash
# Pruebas de web-entrypoint.sh (B3 del diseno, H10). Se ejecuta con sh,
# como en la imagen (busybox de alpine), con carpetas temporales.
ENTRADA="$NG_RAIZ/instalacion/docker/web-entrypoint.sh"

web_compilada() {  # numero_de_veces_que_aparece_la_constante
  mkdir -p "$HOME/orig/assets"
  echo '<html></html>' > "$HOME/orig/index.html"
  : > "$HOME/orig/assets/index-abc.js"
  local i
  for i in $(seq 1 "$1"); do printf 'const A%s="http://127.0.0.1:8420";\n' "$i" >> "$HOME/orig/assets/index-abc.js"; done
}
arrancar() {  # puerto
  NG_WEB_ORIGEN="$HOME/orig" NG_WEB_DESTINO="$HOME/html" NG_WEB_SIGUIENTE=true NG_API_PUERTO="$1" sh "$ENTRADA" 2> "$HOME/err"
}

prueba_escribe_el_puerto_en_la_copia() {
  web_compilada 1
  arrancar 8421 || return 1
  contiene 'http://127.0.0.1:8421' "$(cat "$HOME/html/assets/index-abc.js")" "puerto escrito" || return 1
  contiene 'http://127.0.0.1:8420' "$(cat "$HOME/orig/assets/index-abc.js")" "el original queda intacto" || return 1
}

prueba_segundo_arranque_con_otro_puerto() {
  web_compilada 1
  arrancar 8421 || return 1
  arrancar 8422 || return 1
  contiene 'http://127.0.0.1:8422' "$(cat "$HOME/html/assets/index-abc.js")" "segundo puerto" || return 1
  no_contiene '8421' "$(cat "$HOME/html/assets/index-abc.js")" "sin restos del primero" || return 1
}

prueba_puerto_por_defecto_no_cambia_nada() {
  web_compilada 1
  arrancar 8420 || return 1
  igual "$(cat "$HOME/orig/assets/index-abc.js")" "$(cat "$HOME/html/assets/index-abc.js")" "copia identica" || return 1
}

prueba_constante_repetida_no_arranca() {
  web_compilada 2
  ! arrancar 8421 || return 1
  contiene "aparece 2 veces" "$(cat "$HOME/err")" "explica por que" || return 1
}

prueba_constante_ausente_no_arranca() {
  web_compilada 0
  ! arrancar 8421 || return 1
  contiene "aparece 0 veces" "$(cat "$HOME/err")" "explica por que" || return 1
}

prueba_puerto_no_numerico_no_arranca() {
  web_compilada 1
  ! arrancar "84;rm" || return 1
  contiene "no es un puerto" "$(cat "$HOME/err")" "motivo" || return 1
}

prueba_puerto_fuera_de_rango_no_arranca() {
  web_compilada 1
  local p
  for p in 0 65536 99999999999999999999 08420; do
    ! arrancar "$p" || { echo "    FALLA: arranca con el puerto $p"; return 1; }
    contiene "no es un puerto" "$(cat "$HOME/err")" "motivo ($p)" || return 1
  done
  arrancar 65535 || { echo "    FALLA: 65535 es un puerto"; return 1; }
  arrancar 1 || { echo "    FALLA: 1 es un puerto"; return 1; }
}

prueba_nginx_no_deja_cachear_la_web() {
  # El arranque reescribe el JS sin cambiarle el nombre: con cache, el
  # navegador podria hablar con otra API (la de desarrollo) (B3).
  contiene 'add_header Cache-Control "no-cache" always;' "$(cat "$NG_RAIZ/instalacion/docker/nginx.conf")" "sin cache" || return 1
}
