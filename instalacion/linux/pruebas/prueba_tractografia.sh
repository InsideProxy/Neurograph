# shellcheck shell=bash
# Pruebas de tractografia.sh (paso 8, B2 del diseno, H10).

# docker simulado. run: imprime RUN_SALIDA y sale con RUN_CODIGO (tras
# ESPERA segundos); inspect: OOM para OOMKilled, RUNNING para Running
# (vacio = no existe); exec: TRACTO; events: EVENTOS. Con $HOME/sin-imagen,
# falta la imagen de herramientas.
docker_tracto() {  # run_codigo run_salida [oom] [running] [tracto] [eventos] [espera]
  simular docker "echo \"\$*\" >> '$NG_PRUEBA_LLAMADAS/docker'
case \"\$1\" in
  image) [ ! -e '$HOME/sin-imagen' ]; exit ;;
  run) sleep ${7:-0}; printf '%s\\n' '$2'; exit $1 ;;
  inspect) case \"\$*\" in *OOMKilled*) echo '${3:-false}' ;; *Running*) [ -n '${4:-}' ] && echo '${4:-}' || exit 1 ;; *) echo id123 ;; esac ;;
  exec) echo '${5:-41 176 5176}' ;;
  events) printf '%s' '${6:-}' ;;
esac
exit 0"
}
preparar_tracto() {
  mkdir -p "$HOME/.local/share/neurograph" "$HOME/NeuroData"
  printf 'NG_BIBLIOTECA=%s\n' "$HOME/NeuroData" > "$HOME/.local/share/neurograph/config.env"
  export NEUROGRAPH_PRUEBA_MEMORIA_MB=40000
}
estado_tracto() { leer_valor_archivo "$HOME/.local/share/neurograph/estado.env" "$1"; }
LIBS="sistema docker base tractografia"

prueba_sin_recursos_no_se_intenta() {
  preparar_tracto
  echo "NG_TRACTO_SIN_RECURSOS=memoria insuficiente (hacen falta 8192 MB libres y hay 4000 MB)" > "$HOME/.local/share/neurograph/estado.env"
  docker_tracto 0 "" false "" "0 0 0"
  con_lib 'paso_tractografia && decir DEVUELVE_0 || decir DEVUELVE_1; decir "$NG_MARCA $NG_RESUMEN"' $LIBS || return 1
  contiene "DEVUELVE_1" "$(pantalla)" "no quedo instalada: devuelve 1" || return 1
  contiene "⚠ pendiente — memoria insuficiente" "$(pantalla)" "pendiente con el motivo" || return 1
  no_contiene "run" "$(llamadas docker)" "ni se intenta" || return 1
  igual pendiente "$(estado_tracto NG_TRACTOGRAFIA)" "estado" || return 1
}

prueba_sin_memoria_en_el_momento_no_se_intenta() {
  preparar_tracto; export NEUROGRAPH_PRUEBA_MEMORIA_MB=1000
  docker_tracto 0 "" false "" "0 0 0"
  con_lib 'paso_tractografia || true' $LIBS || return 1
  contiene "memoria insuficiente ahora" "$(estado_tracto NG_TRACTOGRAFIA_MOTIVO)" "se mira otra vez antes del paso 8" || return 1
  no_contiene "run" "$(llamadas docker)" "ni se intenta" || return 1
}

# Al repetir la instalacion con poca memoria, una tractografia ya cargada no
# pasa a pendiente: con los datos en la base, seria falso (B2).
prueba_sin_recursos_una_tractografia_ya_cargada_sigue_instalada() {
  local caso
  for caso in motivo memoria; do
    preparar_tracto
    : > "$NG_PRUEBA_LLAMADAS/docker"
    if [ "$caso" = motivo ]; then
      printf 'NG_TRACTOGRAFIA=instalada\nNG_TRACTO_SIN_RECURSOS=memoria insuficiente (hacen falta 8192 MB libres y hay 4000 MB)\n' > "$HOME/.local/share/neurograph/estado.env"
    else
      printf 'NG_TRACTOGRAFIA=instalada\n' > "$HOME/.local/share/neurograph/estado.env"
      export NEUROGRAPH_PRUEBA_MEMORIA_MB=1000
    fi
    docker_tracto 0 ""
    con_lib 'paso_tractografia && decir DEVUELVE_0 || decir DEVUELVE_1; decir "$NG_MARCA $NG_RESUMEN"' $LIBS || return 1
    contiene "DEVUELVE_0" "$(pantalla)" "$caso: sigue instalada, devuelve 0" || return 1
    contiene "✔ ya instalada (41 tractos, 176 nodos y 5176 aristas); no se repite: memoria insuficiente" "$(pantalla)" "$caso: lo dice, con el motivo" || return 1
    igual instalada "$(estado_tracto NG_TRACTOGRAFIA)" "$caso: estado" || return 1
    no_contiene "run" "$(llamadas docker)" "$caso: sin lanzarla" || return 1
  done
}

prueba_biblioteca_que_no_se_puede_escribir() {
  preparar_tracto
  mkdir -p "$HOME/solo-lectura" && chmod 555 "$HOME/solo-lectura"
  printf 'NG_BIBLIOTECA=%s\n' "$HOME/solo-lectura/NeuroData" > "$HOME/.local/share/neurograph/config.env"
  docker_tracto 0 ""
  con_lib 'paso_tractografia || true' $LIBS || { chmod 755 "$HOME/solo-lectura"; return 1; }
  chmod 755 "$HOME/solo-lectura"
  contiene "disco desconectado" "$(estado_tracto NG_TRACTOGRAFIA_MOTIVO)" "motivo" || return 1
  no_contiene "run" "$(llamadas docker)" "no se intenta" || return 1
}

prueba_contenedor_en_marcha_para() {
  preparar_tracto; docker_tracto 0 "" false true
  ! con_lib 'paso_tractografia' $LIBS || return 1
  contiene "Ya hay una instalación de la tractografía en marcha." "$(pantalla)" "frase" || return 1
}

prueba_contenedor_parado_de_antes_se_borra() {
  preparar_tracto; docker_tracto 0 "Tractografia instalada." false false
  con_lib 'paso_tractografia' $LIBS || return 1
  contiene "rm -f neurograph-app-tractografia" "$(llamadas docker | head -3)" "se borra antes de empezar" || return 1
}

prueba_ejecucion_lleva_usuario_socket_biblioteca_y_tope() {
  preparar_tracto; docker_tracto 0 "Tractografia instalada."
  con_lib 'paso_tractografia; decir "$NG_MARCA $NG_RESUMEN"' $LIBS || return 1
  local run tope
  run="$(llamadas docker | grep '^run ')"
  tope="$(bash -c "source '$NG_LIB/esperado.sh'; echo \$NG_TOPE_MEMORIA_TRACTO")"
  contiene "--name neurograph-app-tractografia" "$run" "nombre fijo" || return 1
  no_contiene "--rm" "$run" "sin --rm, para leer OOMKilled" || return 1
  contiene "--user $(id -u):$(id -g)" "$run" "usuario de la persona" || return 1
  contiene "--mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock" "$run" "socket" || return 1
  contiene "--mount type=bind,src=$HOME/NeuroData,dst=$HOME/NeuroData" "$run" "biblioteca en la misma ruta (falla si no existe)" || return 1
  contiene "--memory $tope --memory-swap $tope" "$run" "tope sin swap" || return 1
  contiene "--pull never" "$run" "nunca busca la imagen en Docker Hub" || return 1
  contiene "-e NEUROGRAPH_LIBRARY__PATH=$HOME/NeuroData" "$run" "el script usa la biblioteca montada" || return 1
  contiene "--group-add $(stat -c %g /var/run/docker.sock 2> /dev/null)" "$run" "con el grupo del socket, para usar Docker" || return 1
  contiene "neurograph-app-herramientas bash /app/scripts/install_tractography.sh neurograph-app-postgres" "$run" "el script tal cual, con bash" || return 1
  contiene "✔ 41 tractos, 176 nodos y 5176 aristas" "$(pantalla)" "resumen con recuentos" || return 1
  igual instalada "$(estado_tracto NG_TRACTOGRAFIA)" "estado" || return 1
  contiene "Tractografia instalada." "$(registro)" "la salida del contenedor va al registro" || return 1
}

prueba_falta_de_memoria_por_oomkilled() {
  preparar_tracto; docker_tracto 1 "Killed" true
  con_lib 'paso_tractografia || decir DEVUELVE_1; decir "$NG_MARCA"' $LIBS || return 1
  contiene "DEVUELVE_1" "$(pantalla)" "devuelve 1" || return 1
  contiene "⚠" "$(pantalla)" "no para la instalacion" || return 1
  contiene "Faltó memoria" "$(estado_tracto NG_TRACTOGRAFIA_MOTIVO)" "motivo" || return 1
}

prueba_falta_de_memoria_por_evento_oom() {
  preparar_tracto; docker_tracto 1 "Killed" false "" "0 0 0" "oom"
  con_lib 'paso_tractografia || true' $LIBS || return 1
  contiene "Faltó memoria" "$(estado_tracto NG_TRACTOGRAFIA_MOTIVO)" "el evento oom tambien vale" || return 1
}

prueba_md5_queda_pendiente_con_su_frase_y_detalle() {
  preparar_tracto; docker_tracto 1 "ERROR: el md5 no coincide con el publicado en Zenodo (x): ORG-800FiberClusters.zip"
  con_lib 'paso_tractografia || true' $LIBS || return 1
  contiene "llegó dañado" "$(estado_tracto NG_TRACTOGRAFIA_MOTIVO)" "frase del md5" || return 1
  contiene "ORG-800FiberClusters.zip" "$(estado_tracto NG_TRACTOGRAFIA_MOTIVO)" "nombra el archivo" || return 1
}

prueba_ficha_que_choca_tras_cargar_se_distingue() {
  preparar_tracto; docker_tracto 1 "ERROR: la ficha no corresponde a sus archivos (checksum distinto): /x/dataset.yaml" false "" "41 176 5176"
  con_lib 'paso_tractografia || true' $LIBS || return 1
  igual ficha_en_conflicto "$(estado_tracto NG_TRACTOGRAFIA)" "cargada, ficha en conflicto" || return 1
}

prueba_fallo_desconocido_queda_pendiente_generico() {
  preparar_tracto; docker_tracto 1 "algo raro" false "" "0 0 0"
  con_lib 'paso_tractografia || true' $LIBS || return 1
  igual pendiente "$(estado_tracto NG_TRACTOGRAFIA)" "estado" || return 1
  contiene "Algo ha fallado" "$(estado_tracto NG_TRACTOGRAFIA_MOTIVO)" "frase generica" || return 1
}

prueba_ctrl_c_para_el_contenedor_en_el_momento() {
  preparar_tracto; docker_tracto 0 "FIN_DEL_RUN" false "" "41 176 5176" "" 6
  local inicio=$SECONDS
  con_lib 'al_salir_extra() { parar_tractografia_en_curso; }; ( sleep 1; kill -INT $$ ) & paso_tractografia' $LIBS
  igual 130 "$?" "sale con 130" || return 1
  [ $(( SECONDS - inicio )) -lt 5 ] || { echo "    FALLA: espero a que terminara el contenedor ($(( SECONDS - inicio )) s)"; return 1; }
  contiene "kill neurograph-app-tractografia" "$(llamadas docker)" "kill" || return 1
  contiene "rm -f neurograph-app-tractografia" "$(llamadas docker)" "rm" || return 1
  igual pendiente "$(estado_tracto NG_TRACTOGRAFIA)" "queda pendiente" || return 1
  contiene "Interrumpida" "$(estado_tracto NG_TRACTOGRAFIA_MOTIVO)" "con el motivo" || return 1
}

prueba_ctrl_c_para_tambien_la_carga_en_postgres_y_borra_los_temporales() {
  # docker kill no termina el psql que corre por docker exec en Postgres (B2).
  preparar_tracto; docker_tracto 0 "FIN_DEL_RUN" false "" "41 176 5176" "" 3
  con_lib 'al_salir_extra() { parar_tractografia_en_curso; }; ( sleep 1; kill -INT $$ ) & paso_tractografia' $LIBS
  igual 130 "$?" "sale con 130" || return 1
  local l; l="$(llamadas docker)"
  contiene "exec neurograph-app-postgres psql -U neurograph -d neurograph -Atc select pg_terminate_backend(pid) from pg_stat_activity where application_name='neurograph_tractografia'" "$l" "termina la carga en curso" || return 1
  contiene "exec neurograph-app-postgres rm -f /tmp/neurograph_tractografia.sql" "$l" "y borra el SQL copiado" || return 1
  # Primero el contenedor: si no, el script podria lanzar la carga siguiente.
  [ "$(grep -n '^kill ' <<< "$l" | cut -d: -f1)" -lt "$(grep -n 'pg_terminate_backend' <<< "$l" | cut -d: -f1)" ] \
    || { echo "    FALLA: termina la carga antes de parar el contenedor"; return 1; }
  sleep 3  # el run simulado termina y escribe su codigo: tampoco debe dejar restos
  igual "" "$(ls -A "$TMPDIR")" "sin temporales" || return 1
}

prueba_sin_la_imagen_de_herramientas_queda_pendiente_sin_buscarla_fuera() {
  # docker run la buscaria en Docker Hub con ese nombre (B1).
  preparar_tracto; docker_tracto 0 "Tractografia instalada."; touch "$HOME/sin-imagen"
  con_lib 'paso_tractografia || decir DEVUELVE_1' $LIBS || return 1
  contiene "DEVUELVE_1" "$(pantalla)" "no quedo instalada" || return 1
  contiene "Faltan las imágenes de NeuroGraph" "$(estado_tracto NG_TRACTOGRAFIA_MOTIVO)" "motivo" || return 1
  igual "" "$(llamadas docker | grep '^run ' || true)" "no se ejecuta" || return 1
}

prueba_otra_tractografia_en_marcha_se_mira_antes_que_la_memoria() {
  # Con otra en marcha falta memoria justo por ella: no se deja pendiente encima (B2).
  preparar_tracto; export NEUROGRAPH_PRUEBA_MEMORIA_MB=1000
  docker_tracto 0 "" false true
  ! con_lib 'paso_tractografia' $LIBS || return 1
  contiene "Ya hay una instalación de la tractografía en marcha." "$(pantalla)" "frase" || return 1
  igual "" "$(estado_tracto NG_TRACTOGRAFIA)" "no toca el estado" || return 1
}

prueba_si_no_se_puede_guardar_el_estado_no_se_da_por_instalada() {
  # paso_tractografia corre sin errexit: una escritura fallida no se nota sola (B2).
  preparar_tracto; docker_tracto 0 "Tractografia instalada."
  mkdir -p "$HOME/.local/share/neurograph/registro"
  chmod 555 "$HOME/.local/share/neurograph"
  con_lib 'paso_tractografia || true' $LIBS; local r=$?
  chmod 755 "$HOME/.local/share/neurograph"
  igual 1 "$r" "sale con error" || return 1
  contiene "No se pudo guardar el estado de NeuroGraph" "$(pantalla)" "lo dice" || return 1
}

prueba_fallos_del_sistema_en_la_tractografia_dan_frases_de_la_tractografia() {
  # Las frases de espacio y red del catalogo hablan del instalador (B6).
  preparar_tracto; docker_tracto 1 "write /tmp/x: no space left on device" false "" "0 0 0"
  con_lib 'paso_tractografia || true' $LIBS || return 1
  local m; m="$(estado_tracto NG_TRACTOGRAFIA_MOTIVO)"
  contiene "No hay espacio suficiente para la tractografía" "$m" "espacio de la tractografia" || return 1
  no_contiene "vuelve a ejecutar el instalador" "$m" "no manda repetir el instalador" || return 1
  docker_tracto 1 "dial tcp: lookup zenodo.org: i/o timeout" false "" "0 0 0"
  con_lib 'paso_tractografia || true' $LIBS || return 1
  contiene "No se pudo descargar un archivo de Zenodo" "$(estado_tracto NG_TRACTOGRAFIA_MOTIVO)" "red: la descarga" || return 1
}

# La linea de fallo que escribe de verdad scripts/install_tractography.sh
# (B6): se ejecutan sus funciones con curl, python y el generador simulados.
linea_real() {  # md5 | descarga | python | recuentos | ficha | espacio_script
  local s="$NG_RAIZ/scripts/install_tractography.sh"
  (
    falla() { echo "ERROR: $1" >&2; exit 1; }
    # shellcheck disable=SC1090  # las funciones reales del script, extraidas con sed
    cargar() { source <(sed -n "/^$1() {/,/^}/p" "$s"); }
    eval "$(grep '^DEPENDENCIAS=' "$s")"
    TMP="$HOME/t-script"; mkdir -p "$TMP" "$HOME/d"
    case "$1" in
      md5|descarga)
        simular curl "while [ \$# -gt 0 ]; do [ \"\$1\" = -o ] && o=\"\$2\"; shift; done; [ '$1' = descarga ] && exit 56; printf basura > \"\$o\""
        cargar descargar
        descargar "$HOME/d" ORG-800FiberClusters.zip https://zenodo.org/api/records/2648292/files/ORG-800FiberClusters.zip/content ee5f73e15d28f177e65ba38dbb6c8a7a ;;
      python)
        simular python3 'exit 1'
        cargar crear_entorno
        PATH="$NG_PRUEBA_BIN:/usr/bin:/bin" crear_entorno ;;
      recuentos)
        mkdir -p "$TMP/venv/bin"; printf '#!/bin/sh\necho "tractos: 40"\n' > "$TMP/venv/bin/python"; chmod +x "$TMP/venv/bin/python"
        crear_entorno() { :; }; con_limite() { "$@"; }
        # shellcheck disable=SC2034  # la usa generar
        RAIZ="$HOME"
        cargar generar
        generar "$HOME/d/org_800fc_2018.sql" "tractos: 41, streamlines reales: 523696" x.py ;;
      ficha)
        echo "ERROR: $(sed -n 's/.*sys\.exit(f"ERROR: \(.*\)").*/\1/p' "$s" | sed "s#{ruta}#$HOME/NeuroData/x/dataset.yaml#")" >&2 ;;
      espacio_script)
        # shellcheck disable=SC2034  # las usa la linea del script, con eval
        dir="$HOME/NeuroData" donde="$HOME/NeuroData" libre=12
        eval "falla \"$(sed -n 's/.*falla "\(hacen falta al menos[^"]*\)".*/\1/p' "$s")\"" ;;
    esac
  ) 2>&1 | grep '^ERROR: ' | tail -1
}

prueba_los_motivos_reales_no_repiten_el_detalle_ni_como_repetir() {
  # Pantalla final con la linea que de verdad escribe el script (B6).
  source "$NG_LIB/catalogo.sh"
  local codigo linea datos dato
  for codigo in md5 descarga python recuentos ficha espacio_script; do
    linea="$(linea_real "$codigo")"
    [ -n "$linea" ] || { echo "    FALLA: el script no escribe la linea de $codigo"; return 1; }
    rm -rf "$HOME/.local/share/neurograph"
    preparar_tracto; docker_tracto 1 "$linea" false "" "0 0 0"
    con_lib 'paso_tractografia || true; NG_FINAL_REGIONES=1; NG_FINAL_CONEXIONES=2; NG_IAS_RESUMEN=x; pantalla_final' $LIBS escritorio || return 1
    datos="$(grep 'Datos:' "$HOME/pantalla")"
    case "$codigo" in
      md5|descarga) dato="(ORG-800FiberClusters.zip)" ;;
      python) dato="(numpy==" ;;
      recuentos) dato="(org_800fc_2018.sql)" ;;
      ficha) dato="($HOME/NeuroData/x/dataset.yaml)" ;;
      espacio_script) dato="hay 12 MB" ;;
    esac
    contiene "$dato" "$datos" "$codigo: el dato, solo" || return 1
    igual 1 "$(grep -oi 'repite con' <<< "$datos" | wc -l)" "$codigo: «repite con» una sola vez en: $datos" || return 1
    no_contiene ".;" "$datos" "$codigo: sin «.;»" || return 1
    [ "$(grep -oiF -- "${NG_SENAL_SCRIPT[$codigo]}" <<< "$datos" | wc -l)" -le 1 ] \
      || { echo "    FALLA: $codigo repite el detalle: $datos"; return 1; }
    [ "$(grep -oi 'donde se qued' <<< "$datos" | wc -l)" -le 1 ] \
      || { echo "    FALLA: $codigo repite que la descarga sigue: $datos"; return 1; }
  done
}

prueba_codigo_cero_sin_los_recuentos_no_es_instalada() {
  # Se da por instalada por lo que hay en la base, no por el codigo de salida (principio 21).
  preparar_tracto; docker_tracto 0 "Tractografia instalada." false "" "0 0 0"
  con_lib 'paso_tractografia || decir DEVUELVE_1' $LIBS || return 1
  contiene "DEVUELVE_1" "$(pantalla)" "no quedo instalada" || return 1
  igual pendiente "$(estado_tracto NG_TRACTOGRAFIA)" "estado" || return 1
}
