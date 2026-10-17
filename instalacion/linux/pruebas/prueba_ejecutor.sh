# shellcheck shell=bash
# Pruebas del ejecutor de pruebas (H10).

prueba_home_temporal_y_simulados_delante() {
  simular docker 'echo simulado'
  igual "simulado" "$(docker)" "el docker simulado va delante en el PATH" || return 1
  contiene "/caja." "$HOME" "el HOME es la caja temporal" || return 1
  local t; t="$(mktemp)"
  contiene "/caja." "$t" "los temporales tambien van a la caja, no a /tmp" || return 1
}

prueba_una_afirmacion_que_falla_se_detecta() {
  ! igual "a" "b" "debe fallar" > /dev/null
}

prueba_un_archivo_que_no_carga_muestra_por_que() {
  printf 'prueba_x() { echo ok; }\nif then\n' > "$HOME/prueba_rota.sh"
  local salida
  salida="$("$NG_LIB/../pruebas/ejecutar.sh" "$HOME/prueba_rota.sh" 2>&1 || true)"
  contiene "FALLA" "$salida" "se cuenta como fallo" || return 1
  contiene $'\n      ' "$salida" "el error de carga sale, sangrado" || return 1
  contiene "prueba_rota.sh" "$salida" "y dice de que archivo" || return 1
  # La linea erronea sale igual en cualquier idioma; "error de sintaxis" no.
  contiene "if then" "$salida" "con el motivo real" || return 1
}

prueba_el_ejecutor_funciona_con_cdpath_exportado() {
  # Con CDPATH, "cd" imprime la ruta y rompia las rutas calculadas con $(cd ... && pwd).
  mkdir -p "$HOME/cdp"
  ln -s "$(cd "$NG_LIB/../pruebas" && pwd)" "$HOME/cdp/pruebas"
  printf 'prueba_x() { igual a a "usa las ayudas"; }\n' > "$HOME/prueba_ok.sh"
  local salida
  salida="$(cd "$NG_LIB/.." && CDPATH="$HOME/cdp" bash pruebas/ejecutar.sh "$HOME/prueba_ok.sh" 2>&1)" \
    || { echo "    FALLA: no funciona con CDPATH"; echo "$salida"; return 1; }
  contiene "ok    prueba_x" "$salida" "la prueba corre" || return 1
}
