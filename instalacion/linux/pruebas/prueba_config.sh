# shellcheck shell=bash
# Pruebas de config.sh (bloque A del diseno, H10).
source "$NG_LIB/config.sh" || return 1

prueba_guardar_y_leer() {
  local f="$HOME/c.env"
  guardar_valor "$f" NG_WEB_PUERTO 5173
  guardar_valor "$f" NG_API_PUERTO 8420
  guardar_valor "$f" NG_WEB_PUERTO 5174
  igual 5174 "$(leer_valor "$f" NG_WEB_PUERTO)" "el ultimo valor manda" || return 1
  igual 8420 "$(leer_valor "$f" NG_API_PUERTO)" "otra clave no se pisa" || return 1
  igual 2 "$(wc -l < "$f" | tr -d ' ')" "una linea por clave" || return 1
}

prueba_permisos_600_porque_guarda_la_contrasena() {
  local f="$HOME/c.env"
  guardar_valor "$f" NG_CONTRASENA_BASE abc
  igual abc "$(leer_valor "$f" NG_CONTRASENA_BASE)" "se guarda" || return 1
  igual 600 "$(stat -c %a "$f")" "config.env solo lo lee su dueno" || return 1
  guardar_valor "$f" NG_CONTRASENA_BASE otra
  igual 600 "$(stat -c %a "$f")" "tambien tras reescribir una clave" || return 1
}

prueba_leer_lo_que_no_existe_da_vacio() {
  igual "" "$(leer_valor "$HOME/no-existe.env" NG_X)" "archivo inexistente" || return 1
  guardar_valor "$HOME/c.env" NG_A 1
  igual 1 "$(leer_valor "$HOME/c.env" NG_A)" "la que existe se lee" || return 1
  igual "" "$(leer_valor "$HOME/c.env" NG_B)" "clave inexistente" || return 1
}

prueba_borrar_valor() {
  local f="$HOME/c.env"
  guardar_valor "$f" NG_BASE_CARGADA 2026-10-02
  guardar_valor "$f" NG_OTRA x
  igual 2026-10-02 "$(leer_valor "$f" NG_BASE_CARGADA)" "la marca se guarda" || return 1
  borrar_valor "$f" NG_BASE_CARGADA
  igual "" "$(leer_valor "$f" NG_BASE_CARGADA)" "la marca se borra" || return 1
  igual x "$(leer_valor "$f" NG_OTRA)" "las demas se quedan" || return 1
}

prueba_una_clave_no_coincide_con_otra_que_empieza_igual() {
  local f="$HOME/c.env"
  guardar_valor "$f" NG_IAS_REGISTRADAS "claude"
  guardar_valor "$f" NG_IAS "x"
  igual claude "$(leer_valor "$f" NG_IAS_REGISTRADAS)" "NG_IAS no pisa NG_IAS_REGISTRADAS" || return 1
  igual x "$(leer_valor "$f" NG_IAS)" "y se lee la suya" || return 1
}

prueba_valor_con_salto_de_linea_se_rechaza() {
  local f="$HOME/c.env"
  guardar_valor "$f" NG_MALO "$(printf 'a\nb')" 2> /dev/null
  igual 1 "$?" "se rechaza" || return 1
  igual "" "$(leer_valor "$f" NG_MALO)" "no se escribe" || return 1
}

prueba_si_un_paso_falla_no_se_pierden_las_claves_anteriores() {
  # Llamadas desde un if (sin errexit): un awk fallido no debe dejar el archivo con solo la clave nueva.
  local f="$HOME/c.env"
  guardar_valor "$f" NG_A 1
  guardar_valor "$f" NG_B 2
  chmod 000 "$f"
  if guardar_valor "$f" NG_C 3 2> /dev/null; then chmod 600 "$f"; echo "    FALLA: guardar_valor dio por buena una escritura fallida"; return 1; fi
  if borrar_valor "$f" NG_A 2> /dev/null; then chmod 600 "$f"; echo "    FALLA: borrar_valor dio por buena una escritura fallida"; return 1; fi
  chmod 600 "$f"
  igual 1 "$(leer_valor "$f" NG_A)" "NG_A sigue" || return 1
  igual 2 "$(leer_valor "$f" NG_B)" "NG_B sigue" || return 1
  igual "" "$(find "$HOME" -name 'c.env.*' | head -1)" "ni temporales con el sufijo aleatorio" || return 1
}
