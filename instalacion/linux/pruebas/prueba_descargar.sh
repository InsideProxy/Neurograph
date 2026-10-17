# shellcheck shell=bash
# Pruebas de descargar() y crear_entorno() de scripts/install_tractography.sh
# (H4, H10). Se cargan las funciones reales del script.
cargar_funcion() {  # nombre
  # shellcheck disable=SC1090
  source <(sed -n "/^$1() {/,/^}/p" "$NG_RAIZ/scripts/install_tractography.sh")
}
preparar() {
  falla() { echo "ERROR: $1" >&2; exit 1; }
  cargar_funcion descargar
  CONTENIDO="contenido completo del archivo"
  MD5="$(printf '%s' "$CONTENIDO" | md5sum | cut -d' ' -f1)"
  mkdir -p "$HOME/d"
}
# curl simulado: con -C anota "reanuda", y se comporta segun MODO.
curl_simulado() {  # modo: completa_resto | sin_rango | rango_416 | error_503 | corte | basura
  simular curl "salida=''; reanuda=0
while [ \$# -gt 0 ]; do case \"\$1\" in -o) salida=\"\$2\"; shift;; -C) reanuda=1; shift;; esac; shift; done
echo \"llamada reanuda=\$reanuda\" >> '$NG_PRUEBA_LLAMADAS/curl'
case '$1' in
  completa_resto) printf '%s' 'archivo' >> \"\$salida\" ;;
  sin_rango) if [ \$reanuda = 1 ]; then exit 33; fi; printf '%s' 'contenido completo del archivo' > \"\$salida\" ;;
  rango_416) exit 0 ;;   # curl -C - --fail ante un 416 da 0 (lo toma por completo)
  error_503) exit 22 ;;
  corte) printf 'x' >> \"\$salida\"; exit 56 ;;
  basura) printf 'basura' > \"\$salida\" ;;
esac"
}

prueba_reanuda_donde_se_quedo() {
  preparar; curl_simulado completa_resto
  printf '%s' "contenido completo del " > "$HOME/d/a.zip.part"
  ( descargar "$HOME/d" a.zip URL "$MD5" ) || return 1
  igual "$CONTENIDO" "$(cat "$HOME/d/a.zip")" "archivo completo" || return 1
  contiene "reanuda=1" "$(llamadas curl)" "uso -C -" || return 1
}

prueba_sin_rango_descarga_de_cero_una_vez() {
  preparar; curl_simulado sin_rango
  printf 'trozo' > "$HOME/d/a.zip.part"
  ( descargar "$HOME/d" a.zip URL "$MD5" ) || return 1
  igual "$CONTENIDO" "$(cat "$HOME/d/a.zip")" "archivo completo" || return 1
  igual 2 "$(llamadas curl | wc -l | tr -d ' ')" "dos llamadas: reanudar y de cero" || return 1
}

prueba_part_ya_completo_vale() {
  preparar; curl_simulado rango_416
  printf '%s' "$CONTENIDO" > "$HOME/d/a.zip.part"
  ( descargar "$HOME/d" a.zip URL "$MD5" ) || return 1
  igual "$CONTENIDO" "$(cat "$HOME/d/a.zip")" "se acepta el .part completo" || return 1
}

prueba_corte_de_red_conserva_el_part() {
  preparar; curl_simulado corte
  printf 'trozo' > "$HOME/d/a.zip.part"
  ! ( descargar "$HOME/d" a.zip URL "$MD5" ) 2> "$HOME/err" || return 1
  contiene "no se pudo descargar" "$(cat "$HOME/err")" "senal del catalogo" || return 1
  [ -f "$HOME/d/a.zip.part" ] || { echo "    FALLA: el .part se ha perdido"; return 1; }
}

prueba_error_http_conserva_el_part() {
  preparar; curl_simulado error_503
  printf 'trozo' > "$HOME/d/a.zip.part"
  ! ( descargar "$HOME/d" a.zip URL "$MD5" ) 2> "$HOME/err" || return 1
  contiene "no se pudo descargar" "$(cat "$HOME/err")" "senal del catalogo" || return 1
  igual trozo "$(cat "$HOME/d/a.zip.part")" "un 503 no borra lo descargado: al repetir sigue" || return 1
}

prueba_md5_que_no_cuadra_borra_el_part() {
  preparar; curl_simulado basura
  ! ( descargar "$HOME/d" a.zip URL "$MD5" ) 2> "$HOME/err" || return 1
  contiene "el md5 no coincide" "$(cat "$HOME/err")" "senal del catalogo" || return 1
  [ ! -e "$HOME/d/a.zip.part" ] || { echo "    FALLA: el .part danado sigue"; return 1; }
}

prueba_fallo_de_pypi_tiene_mensaje_con_uv() {
  falla() { echo "ERROR: $1" >&2; exit 1; }
  cargar_funcion crear_entorno
  TMP="$HOME/t"; mkdir -p "$TMP"
  # shellcheck disable=SC2034  # la usa crear_entorno
  DEPENDENCIAS=("numpy==2.2.6")
  simular uv 'exit 1'
  simular python3 'exit 1'
  ! ( crear_entorno ) 2> "$HOME/err" || return 1
  contiene "no se pudieron instalar las dependencias de Python" "$(cat "$HOME/err")" "senal del catalogo" || return 1
}

prueba_fallo_de_pypi_tiene_mensaje_con_venv() {  # la rama de la imagen de herramientas, que no tiene uv
  falla() { echo "ERROR: $1" >&2; exit 1; }
  cargar_funcion crear_entorno
  TMP="$HOME/t"; mkdir -p "$TMP"
  # shellcheck disable=SC2034  # la usa crear_entorno
  DEPENDENCIAS=("numpy==2.2.6")
  simular python3 'exit 1'
  # Sin el uv real del ordenador en el PATH.
  ! ( PATH="$NG_PRUEBA_BIN:/usr/bin:/bin"; crear_entorno ) 2> "$HOME/err" || return 1
  contiene "no se pudieron instalar las dependencias de Python" "$(cat "$HOME/err")" "senal del catalogo" || return 1
}

prueba_la_carga_lleva_su_nombre_para_poder_pararla() {
  # Ctrl+C la termina con pg_terminate_backend por application_name (B2).
  falla() { echo "ERROR: $1" >&2; exit 1; }
  cargar_funcion aplicar
  # shellcheck disable=SC2034  # las usa aplicar
  CONTENEDOR=pg USUARIO=neurograph BASE=neurograph TMP="$HOME/t"
  mkdir -p "$TMP"
  simular_anotando docker
  echo "select 1;" > "$HOME/a.sql"
  ( aplicar "$HOME/a.sql" ) > /dev/null || return 1
  contiene "exec -e PGAPPNAME=neurograph_tractografia pg psql" "$(llamadas docker)" "nombre de la conexion" || return 1
}

prueba_dependencias_de_python_solo_en_ruedas() {
  # Con el socket de Docker montado, nada de ejecutar el setup.py de un
  # paquete de PyPI: solo ruedas ya construidas (H10).
  falla() { echo "ERROR: $1" >&2; exit 1; }
  cargar_funcion crear_entorno
  TMP="$HOME/t"; mkdir -p "$TMP"
  # shellcheck disable=SC2034  # la usa crear_entorno
  DEPENDENCIAS=("numpy==2.2.6")
  # python3 -m venv crea un pip que anota sus argumentos.
  cat > "$HOME/pip" <<EOF
#!/bin/sh
echo "\$*" >> "$NG_PRUEBA_LLAMADAS/pip"
EOF
  chmod +x "$HOME/pip"
  simular python3 "if [ \"\$1 \$2\" = '-m venv' ]; then mkdir -p \"\$3/bin\"; cp '$HOME/pip' \"\$3/bin/pip\"; fi"
  ( PATH="$NG_PRUEBA_BIN:/usr/bin:/bin"; crear_entorno ) || return 1
  contiene "install -q --only-binary=:all: numpy==2.2.6" "$(llamadas pip)" "con pip (la imagen de herramientas)" || return 1
  rm -rf "$TMP/venv"
  simular_anotando uv
  ( crear_entorno ) || return 1
  contiene "pip install -q --only-binary=:all: --python" "$(llamadas uv)" "y con uv" || return 1
}
