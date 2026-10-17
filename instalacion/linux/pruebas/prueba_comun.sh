# shellcheck shell=bash
# Pruebas de comun.sh (B1 del diseno, H10).

prueba_pantalla_y_registro_separados() {
  con_lib 'decir "hola persona"; echo "detalle tecnico"' || return 1
  contiene "hola persona" "$(pantalla)" "la frase sale en pantalla" || return 1
  no_contiene "detalle tecnico" "$(pantalla)" "lo tecnico no sale en pantalla" || return 1
  contiene "detalle tecnico" "$(registro)" "lo tecnico va al registro" || return 1
}

prueba_paso_correcto_muestra_resumen() {
  con_lib 'uno() { NG_RESUMEN="todo bien"; }; paso 1 "Primero" uno' || return 1
  contiene "[1/9] Primero" "$(pantalla)" "numero y titulo" || return 1
  contiene "✔  todo bien" "$(pantalla)" "marca y resumen" || return 1
}

prueba_mensaje_a_mitad_de_paso_no_rompe_la_linea() {
  con_lib 'uno() { decir "te pedirá la contraseña"; NG_RESUMEN=hecho; }; paso 2 "Docker" uno' || return 1
  contiene $'[2/9] Docker' "$(pantalla)" "titulo" || return 1
  contiene $'\n      te pedirá la contraseña\n' "$(pantalla)" "el mensaje va en su propia linea, sangrado" || return 1
  contiene $'\n      ✔  hecho' "$(pantalla)" "la marca va despues, sangrada" || return 1
}

prueba_fallo_conocido_dice_frase_y_registro() {
  con_lib 'uno() { fallar puerto 5173; }; paso 4 "Puertos" uno'
  igual 1 "$?" "sale con estado 1" || return 1
  contiene "✘" "$(pantalla)" "marca de fallo" || return 1
  contiene "El puerto 5173 está ocupado." "$(pantalla)" "frase del catalogo" || return 1
  contiene "/registro/prueba-" "$(pantalla)" "ruta del registro" || return 1
  no_contiene "Algo ha fallado" "$(pantalla)" "un fallo conocido no se anuncia como inesperado" || return 1
}

prueba_fallo_inesperado_da_mensaje_generico() {
  ! con_lib 'uno() { false; }; paso 2 "Algo" uno' || return 1
  contiene "Algo ha fallado de forma inesperada." "$(pantalla)" "mensaje generico" || return 1
  contiene "en el paso 2" "$(registro)" "el registro dice el paso" || return 1
  contiene "en la linea" "$(registro)" "la linea" || return 1
  contiene ": false" "$(registro)" "y la orden" || return 1
  igual 1 "$(registro | grep -c '^ERROR: ')" "se anota una sola vez" || return 1
}

prueba_fallo_dentro_de_sustitucion_no_contamina_ni_asusta() {
  con_lib 'uno() { local x; x="$(set +e; false; echo sigue)"; NG_RESUMEN="$x"; }; paso 1 "Uno" uno' || return 1
  no_contiene "Algo ha fallado" "$(pantalla)" "un fallo dentro de \$(...) no da mensaje" || return 1
  no_contiene "ERROR" "$(pantalla)" "la trampa no se cuela en el valor capturado" || return 1
  contiene "✔  sigue" "$(pantalla)" "el paso sigue con su valor limpio" || return 1
  contiene "ERROR: estado 1" "$(registro)" "pero queda en el registro" || return 1
}

prueba_la_contrasena_no_llega_al_registro() {
  ! con_lib 'NG_CONTRASENA_BASE=supersecreta123; uno() { test "$NG_CONTRASENA_BASE" = otra; }; paso 1 "X" uno' || return 1
  contiene 'test "$NG_CONTRASENA_BASE" = otra' "$(registro)" "el registro anota la orden sin expandir" || return 1
  no_contiene "supersecreta123" "$(registro)" "sin contrasena en el registro" || return 1
}

prueba_bloqueo_deja_la_primera_e_impide_la_segunda() {
  con_lib 'tomar_bloqueo; decir BLOQUEADO' || return 1
  contiene BLOQUEADO "$(pantalla)" "sin otra en marcha, se toma" || return 1
  mkdir -p "$HOME/.local/share/neurograph"
  exec 8> "$HOME/.local/share/neurograph/.bloqueo"
  flock -n 8 || return 1
  ! con_lib 'tomar_bloqueo' || return 1
  contiene "Ya hay otro instalador" "$(pantalla)" "mensaje de bloqueo" || return 1
}

prueba_ctrl_c_marca_el_paso_y_dice_como_seguir() {
  con_lib 'NG_REPETIR="./instalar.sh"; al_salir_extra() { echo "limpieza hecha"; }; cinco() { kill -INT $$; sleep 5; }; paso 5 "Preparando" cinco'
  igual 130 "$?" "sale con 130" || return 1
  contiene "✘" "$(pantalla)" "el paso queda marcado" || return 1
  contiene "Puedes volver a ejecutar ./instalar.sh" "$(pantalla)" "dice que repetir" || return 1
  no_contiene "Algo ha fallado" "$(pantalla)" "no es un fallo inesperado" || return 1
  contiene "limpieza hecha" "$(registro)" "la limpieza se hace" || return 1
}

prueba_la_limpieza_no_se_corta_ni_asusta() {
  con_lib 'al_salir_extra() { kill -INT $$; false; echo "limpieza completa"; }; uno() { NG_RESUMEN=ok; }; paso 1 "Uno" uno'
  igual 0 "$?" "una instalacion correcta sale con 0" || return 1
  no_contiene "Algo ha fallado" "$(pantalla)" "un fallo de la limpieza no da mensaje falso" || return 1
  contiene "limpieza completa" "$(registro)" "un Ctrl+C durante la limpieza no la corta" || return 1
}

prueba_relanzado_no_repite_pasos_en_pantalla() {
  con_lib 'NEUROGRAPH_CONTINUAR_EN=4; uno() { echo HECHO_UNO; }; cuatro() { NG_RESUMEN=ok; }; paso 1 "Uno" uno; paso 4 "Cuatro" cuatro' || return 1
  no_contiene "[1/9]" "$(pantalla)" "el paso 1 no se repite" || return 1
  contiene "[4/9] Cuatro" "$(pantalla)" "el 4 si" || return 1
  no_contiene "HECHO_UNO" "$(registro)" "el 1 no se ejecuta" || return 1
}

prueba_el_bloqueo_se_libera_al_salir_aunque_quede_un_proceso_hijo() {
  # El latido (sleep 20) huerfano heredaba el descriptor 9 y retenia el bloqueo (B1).
  con_lib 'largo() { sleep 0.5; NG_RESUMEN=ok; }; tomar_bloqueo; paso 8 "Largo" largo largo' || return 1
  exec 8> "$HOME/.local/share/neurograph/.bloqueo"
  flock -n 8 || { echo "    FALLA: el bloqueo sigue tomado tras salir"; return 1; }
}

prueba_una_salida_sin_mensaje_no_deja_a_la_persona_a_oscuras() {
  # set -u o un exit directo no pasan por fallar ni por la trampa ERR (B1).
  ! con_lib 'uno() { echo "$NO_EXISTE"; }; paso 3 "Docker" uno' || return 1
  contiene "✘" "$(pantalla)" "el paso queda marcado" || return 1
  contiene "Algo ha fallado" "$(pantalla)" "mensaje generico" || return 1
  contiene "/registro/prueba-" "$(pantalla)" "ruta del registro" || return 1
  ! con_lib 'uno() { exit 7; }; paso 3 "Docker" uno' || return 1
  contiene "Algo ha fallado" "$(pantalla)" "tambien con exit directo" || return 1
}

prueba_una_salida_correcta_o_ya_mostrada_no_repite_mensaje() {
  con_lib 'uno() { NG_RESUMEN=ok; }; paso 1 "Uno" uno' || return 1
  no_contiene "Algo ha fallado" "$(pantalla)" "una salida correcta no avisa" || return 1
  ! con_lib 'uno() { fallar puerto 1; }; paso 1 "Uno" uno' || return 1
  igual 1 "$(grep -c 'Registro:' "$HOME/pantalla")" "un fallo ya mostrado no se muestra dos veces" || return 1
}

prueba_sin_flock_dice_el_programa_que_falta() {
  # PATH sin flock: solo los programas basicos que usa el script, enlazados.
  local sin="$HOME/sin" p
  mkdir -p "$sin"
  for p in bash mkdir date uname dirname cat sleep kill sed awk grep tr; do
    ln -s "$(command -v "$p")" "$sin/$p" 2> /dev/null || true
  done
  cat > "$HOME/s2.sh" << EOF
set -Eeuo pipefail
source "$NG_LIB/comun.sh"
iniciar_registro prueba
instalar_trampas
PATH="$sin"
tomar_bloqueo
EOF
  ! "$sin/bash" "$HOME/s2.sh" > "$HOME/pantalla" 2>&1 || return 1
  contiene "Falta el programa «flock»" "$(pantalla)" "nombra flock" || return 1
}

prueba_el_bloqueo_heredado_solo_vale_si_el_descriptor_lo_tiene() {
  # Una variable heredada sin el descriptor 9 con el bloqueo no debe saltarse el bloqueo (B1).
  mkdir -p "$HOME/.local/share/neurograph"
  exec 8> "$HOME/.local/share/neurograph/.bloqueo"
  flock -n 8 || return 1
  ! con_lib 'NEUROGRAPH_BLOQUEO_HEREDADO=1; tomar_bloqueo' || { echo "    FALLA: dio por bueno un bloqueo que no tenia"; return 1; }
  contiene "Ya hay otro instalador" "$(pantalla)" "mensaje de bloqueo" || return 1
}

prueba_la_variable_de_continuar_no_se_hereda_a_los_hijos() {
  mkdir -p "$HOME/.local/share/neurograph/registro"
  : > "$HOME/r.log"
  cat > "$HOME/s3.sh" << EOF
set -Eeuo pipefail
source "$NG_LIB/comun.sh"
export NEUROGRAPH_REGISTRO="$HOME/r.log" NEUROGRAPH_CONTINUAR_EN=4
iniciar_registro prueba
echo "hijo=\$(bash -c 'echo "\${NEUROGRAPH_CONTINUAR_EN:-vacia}"')"
echo "propia=\$NEUROGRAPH_CONTINUAR_EN"
EOF
  bash "$HOME/s3.sh" 3>&1 > /dev/null 2>&1 || return 1
  grep -q '^hijo=vacia$' "$HOME/r.log" || { echo "    FALLA: un hijo hereda NEUROGRAPH_CONTINUAR_EN"; cat "$HOME/r.log"; return 1; }
  grep -q '^propia=4$' "$HOME/r.log" || { echo "    FALLA: el propio proceso pierde NEUROGRAPH_CONTINUAR_EN"; return 1; }
}
