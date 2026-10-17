# shellcheck shell=bash
# Pruebas de base.sh (pasos 6 y 7, bloque A y B1 del diseno, H10).

# docker simulado: la lista de volumenes decide si existe (con otro de
# nombre parecido, que no cuenta); "falla" es un Docker que no responde
# (demonio reiniciandose). exec responde a las consultas con la tabla
# $HOME/tabla (lineas consulta|valor, como esperado.sh).
docker_base() {  # volumen: 0 no existe, 1 existe, falla
  simular docker "echo \"\$*\" >> '$NG_PRUEBA_LLAMADAS/docker'
case '$1' in falla) case \"\$1\" in volume|info|ps) echo 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?' >&2; exit 1 ;; esac ;; esac
case \"\$1 \${2:-}\" in
  'volume ls') echo otro-volumen; echo neurograph-app-datos-copia; [ '$1' = 1 ] && echo neurograph-app-datos ;;
  'exec -i') cat > '$HOME/entrada' ;;
  'exec '*) q=\"\${@: -1}\"; grep -F -- \"\$q|\" '$HOME/tabla' | head -1 | sed 's/.*|//' ;;
esac
exit 0"
}
tabla_h1() {  # escribe la tabla con las cifras de esperado.sh
  bash -c "source '$NG_LIB/esperado.sh'; printf '%s\n' \"\${NG_ESPERADO_CARGA[@]}\"" > "$HOME/tabla"
}
config_con() {  # lineas de config.env
  mkdir -p "$HOME/.local/share/neurograph"
  printf '%b' "$1" > "$HOME/.local/share/neurograph/config.env"
}
valor() { leer_valor_archivo "$HOME/.local/share/neurograph/config.env" "$1"; }

prueba_sin_volumen_se_descartan_las_marcas_y_se_anota_el_propio() {
  config_con 'NG_BASE_CARGADA=2026-10-01\n'
  docker_base 0
  con_lib 'decidir_volumen; decir "NUEVO=$NG_VOLUMEN_NUEVO SALTAR=$NG_SALTAR_CARGA"' docker base || return 1
  contiene "NUEVO=1 SALTAR=0" "$(pantalla)" "se carga de nuevo" || return 1
  igual "" "$(valor NG_BASE_CARGADA)" "marca de carga descartada" || return 1
  [ -n "$(valor NG_VOLUMEN_PROPIO)" ] || { echo "    FALLA: no anota que el volumen es suyo"; return 1; }
}

prueba_docker_que_no_responde_no_es_un_volumen_que_no_existe() {
  # Un fallo pasajero de Docker no es "el volumen no existe": se borrarian
  # las marcas y despues el volumen cargado (bloque A).
  config_con 'NG_CONTRASENA_BASE=abc\nNG_VOLUMEN_PROPIO=2026-10-01\nNG_BASE_CARGADA=2026-10-01\n'
  docker_base falla
  ! con_lib 'NG_VOLUMEN_NUEVO=0; al_salir_extra() { [ "$1" = 0 ] || limpiar_lo_incompleto; }; decidir_volumen' docker base || return 1
  contiene "Docker no está en marcha" "$(pantalla)" "frase clara, no la generica" || return 1
  igual 2026-10-01 "$(valor NG_BASE_CARGADA)" "la marca de carga sigue" || return 1
  # Al repetir con Docker ya en marcha, la base cargada se reconoce.
  docker_base 1
  con_lib 'decidir_volumen; decir "NUEVO=$NG_VOLUMEN_NUEVO SALTAR=$NG_SALTAR_CARGA"' docker base || return 1
  contiene "NUEVO=0 SALTAR=1" "$(pantalla)" "no se recarga" || return 1
  no_contiene "volume rm" "$(llamadas docker)" "nunca se borra" || return 1
}

prueba_volumen_con_marca_se_conserva() {
  config_con 'NG_VOLUMEN_PROPIO=2026-10-01\nNG_BASE_CARGADA=2026-10-01\n'
  docker_base 1
  con_lib 'decidir_volumen; decir "NUEVO=$NG_VOLUMEN_NUEVO SALTAR=$NG_SALTAR_CARGA"' docker base || return 1
  contiene "NUEVO=0 SALTAR=1" "$(pantalla)" "no se recarga" || return 1
  no_contiene "volume rm" "$(llamadas docker)" "nunca se borra" || return 1
}

prueba_volumen_propio_sin_carga_se_rehace() {
  config_con 'NG_CONTRASENA_BASE=abc\nNG_VOLUMEN_PROPIO=2026-10-01\n'
  docker_base 1
  con_lib 'decidir_volumen; decir "NUEVO=$NG_VOLUMEN_NUEVO"' docker base || return 1
  contiene "volume rm neurograph-app-datos" "$(llamadas docker)" "instalacion cortada: se rehace" || return 1
  contiene "NUEVO=1" "$(pantalla)" "y se carga" || return 1
}

prueba_volumen_desconocido_no_se_borra_ni_al_repetir() {
  docker_base 1
  # config.env ya existe (el paso 4 lo crea) pero sin ninguna marca: el volumen no es suyo.
  config_con 'NG_CONTRASENA_BASE=abc\nNG_WEB_PUERTO=5173\n'
  con_lib 'decidir_volumen; decir "DESCONOCIDO=$NG_VOLUMEN_DESCONOCIDO"' docker base || return 1
  contiene "DESCONOCIDO=1" "$(pantalla)" "primera ejecucion: desconocido" || return 1
  con_lib 'decidir_volumen; decir "DESCONOCIDO=$NG_VOLUMEN_DESCONOCIDO"' docker base || return 1
  contiene "DESCONOCIDO=1" "$(pantalla)" "segunda ejecucion: sigue siendo desconocido" || return 1
  no_contiene "volume rm" "$(llamadas docker)" "nunca se borra" || return 1
}

prueba_desconocido_completo_se_adopta() {
  config_con 'NG_CONTRASENA_BASE=nueva123\n'
  printf 'select version_num from alembic_version|0015\nselect count(*) from regions|1172\n' > "$HOME/tabla"
  docker_base 1
  con_lib 'adoptar_volumen_desconocido; decir "SALTAR=$NG_SALTAR_CARGA"' docker base || return 1
  contiene "SALTAR=1" "$(pantalla)" "se usa sin recargar" || return 1
  contiene "adoptada" "$(valor NG_BASE_CARGADA)" "marca escrita" || return 1
  contiene "exec -i neurograph-app-postgres psql" "$(llamadas docker)" "se le pone la contrasena" || return 1
  contiene "ALTER ROLE neurograph PASSWORD 'nueva123';" "$(cat "$HOME/entrada" 2> /dev/null)" "la de config.env, por la entrada estandar" || return 1
  no_contiene "nueva123" "$(registro)$(llamadas docker)" "la contrasena no va al registro ni a la linea de ordenes" || return 1
}

prueba_desconocido_con_otro_esquema_para_sin_tocar() {
  config_con 'NG_CONTRASENA_BASE=nueva123\n'
  printf 'select version_num from alembic_version|0012\nselect count(*) from regions|1172\n' > "$HOME/tabla"
  docker_base 1
  ! con_lib 'adoptar_volumen_desconocido' docker base || return 1
  contiene "docker volume rm neurograph-app-datos" "$(pantalla)" "da el comando para borrarlo a mano" || return 1
  no_contiene "volume rm" "$(llamadas docker)" "pero no lo borra" || return 1
  no_contiene "exec -i" "$(llamadas docker)" "ni le cambia la contrasena: no se ha tocado" || return 1
}

prueba_desconocido_vacio_para_sin_tocar() {
  config_con 'NG_CONTRASENA_BASE=nueva123\n'
  printf 'select count(*) from regions|0\n' > "$HOME/tabla"
  docker_base 1
  ! con_lib 'adoptar_volumen_desconocido' docker base || return 1
  contiene "docker volume rm neurograph-app-datos" "$(pantalla)" "da el comando" || return 1
  no_contiene "exec -i" "$(llamadas docker)" "no se toca" || return 1
}

# rebuild_db_from_sql.sh simulado en una raiz falsa.
raiz_falsa() {  # cuerpo_del_script
  mkdir -p "$HOME/raiz/scripts"
  printf '#!/usr/bin/env bash\n%s\n' "$1" > "$HOME/raiz/scripts/rebuild_db_from_sql.sh"
  chmod +x "$HOME/raiz/scripts/rebuild_db_from_sql.sh"
}

prueba_carga_correcta_escribe_la_marca() {
  raiz_falsa 'echo "  init/salida_mmp1.sql   OK"'
  tabla_h1; docker_base 1
  con_lib 'NG_RAIZ="$HOME/raiz" paso_cargar; decir "$NG_RESUMEN"' docker base || return 1
  contiene "1172 regiones" "$(pantalla)" "resumen" || return 1
  [ -n "$(valor NG_BASE_CARGADA)" ] || { echo "    FALLA: sin marca"; return 1; }
}

prueba_carga_que_falla_nombra_el_archivo_y_no_marca() {
  raiz_falsa 'printf "  %-64s OK\n" init/salida_mmp1.sql; printf "  %-64s ERROR\n" init/salida_rsn_networks.sql; echo "psql: error" >&2; exit 1'
  tabla_h1; docker_base 1
  ! con_lib 'NG_RAIZ="$HOME/raiz" paso_cargar' docker base || return 1
  contiene "Falló la carga de los datos iniciales en init/salida_rsn_networks.sql." "$(pantalla)" "nombra el archivo" || return 1
  igual "" "$(valor NG_BASE_CARGADA)" "sin marca" || return 1
}

prueba_carga_que_falla_sin_linea_error_da_su_frase() {
  raiz_falsa 'echo "No hay conexion con neurograph-app-postgres" >&2; exit 1'
  tabla_h1; docker_base 1
  ! con_lib 'NG_RAIZ="$HOME/raiz" paso_cargar' docker base || return 1
  contiene "Falló la carga de los datos iniciales" "$(pantalla)" "frase de carga, no la generica" || return 1
  no_contiene "Algo ha fallado" "$(pantalla)" "no es inesperado" || return 1
}

prueba_recuentos_distintos_no_marcan() {
  raiz_falsa 'echo ok'
  tabla_h1; sed -i 's/^select count(\*) from connections|104115$/select count(*) from connections|100/' "$HOME/tabla"
  docker_base 1
  ! con_lib 'NG_RAIZ="$HOME/raiz" paso_cargar' docker base || return 1
  contiene "connections da 100 y se esperaba 104115" "$(pantalla)" "dice cual no cuadra" || return 1
  igual "" "$(valor NG_BASE_CARGADA)" "sin marca" || return 1
}

prueba_base_conservada_distinta_avisa_sin_fallar() {
  printf 'select count(*) from regions|1000\nselect count(*) from connections|90000\n' > "$HOME/tabla"
  docker_base 1
  con_lib 'NG_SALTAR_CARGA=1 paso_cargar; decir "$NG_MARCA $NG_RESUMEN"' docker base || return 1
  contiene "⚠ base conservada: 1000 regiones, 90000 conexiones" "$(pantalla)" "avisa" || return 1
  contiene "Actualizar está fuera" "$(cat "$HOME/.local/share/neurograph/.avisos")" "explica" || return 1
}

prueba_limpieza_solo_borra_lo_incompleto() {
  config_con 'NG_CONTRASENA_BASE=abc\nNG_VOLUMEN_PROPIO=2026-10-02\n'
  docker_base 1
  con_lib 'NG_VOLUMEN_NUEVO=1 limpiar_lo_incompleto' docker base || return 1
  contiene "volume rm neurograph-app-datos" "$(llamadas docker)" "volumen nuevo sin carga: se borra" || return 1
  : > "$NG_PRUEBA_LLAMADAS/docker"
  config_con 'NG_CONTRASENA_BASE=abc\nNG_VOLUMEN_PROPIO=2026-10-02\nNG_BASE_CARGADA=2026-10-02\n'
  con_lib 'NG_VOLUMEN_NUEVO=1 limpiar_lo_incompleto' docker base || return 1
  no_contiene "volume rm" "$(llamadas docker)" "con la carga hecha nunca se borra" || return 1
}

prueba_espera_agotada_deja_en_el_registro_el_estado_y_los_mensajes() {
  # Sin esto, «no arrancó a tiempo» no dice por que (B1). El docker simulado
  # corta la prueba si la espera no tuviera limite.
  simular docker "echo \"\$*\" >> '$NG_PRUEBA_LLAMADAS/docker'
case \"\$1\" in
  exec) [ \"\$(grep -c pg_isready '$NG_PRUEBA_LLAMADAS/docker')\" -lt 10 ] || kill -TERM \$PPID; exit 1 ;;
  ps) echo 'neurograph-app-postgres   Exited (1) 3 seconds ago' ;;
  logs) echo 'FATAL:  data directory has wrong ownership' ;;
esac
exit 0"
  ! con_lib 'NG_ESPERA_POSTGRES=1 esperar_postgres' docker base || return 1
  contiene "La base de datos no arrancó a tiempo." "$(pantalla)" "frase de espera, con limite" || return 1
  contiene "Exited (1)" "$(registro)" "el estado de los contenedores va al registro" || return 1
  contiene "data directory has wrong ownership" "$(registro)" "y lo ultimo que dijo el contenedor" || return 1
  contiene "logs --tail 100 neurograph-app-postgres" "$(llamadas docker)" "del contenedor que se esperaba" || return 1
  contiene "ps -a --filter name=^neurograph-app-" "$(llamadas docker)" "solo los de este proyecto" || return 1
  contiene "pg_isready -h 127.0.0.1" "$(llamadas docker)" "por TCP: el primer arranque escucha antes solo en el socket" || return 1
}

prueba_la_contrasena_se_conserva_al_repetir() {
  # Sin ella, el volumen conservado no se podria usar (bloque A).
  mkdir -p "$HOME/raiz/instalacion/docker"; : > "$HOME/raiz/instalacion/docker/compose.yml"
  config_con 'NG_CONTRASENA_BASE=fija123\n'
  con_lib 'NG_RAIZ="$HOME/raiz" NG_BIBLIOTECA_ELEGIDA="$HOME/NeuroData" preparar_configuracion' docker base || return 1
  igual fija123 "$(valor NG_CONTRASENA_BASE)" "se conserva" || return 1
  config_con ''
  con_lib 'NG_RAIZ="$HOME/raiz" NG_BIBLIOTECA_ELEGIDA="$HOME/NeuroData" preparar_configuracion' docker base || return 1
  local c; c="$(valor NG_CONTRASENA_BASE)"
  igual 32 "${#c}" "sin ella, se genera una de 32 caracteres" || return 1
}

prueba_un_volumen_desconocido_se_adopta_antes_de_arrancar_la_api() {
  # La API arrancaria con una contrasena que la base aun no tiene (bloque A).
  config_con 'NG_CONTRASENA_BASE=nueva123\nNG_WEB_PUERTO=5173\nNG_API_PUERTO=8420\n'
  printf 'select version_num from alembic_version|0015\nselect count(*) from regions|1172\n' > "$HOME/tabla"
  docker_base 1; simular curl 'exit 0'
  con_lib 'NG_VOLUMEN_DESCONOCIDO=1 encender' docker base || return 1
  local l base adopta todo
  l="$(llamadas docker)"
  base="$(grep -n ' up -d postgres$' <<< "$l" | head -1 | cut -d: -f1)"
  adopta="$(grep -n '^exec -i ' <<< "$l" | head -1 | cut -d: -f1)"
  todo="$(grep -n ' up -d$' <<< "$l" | head -1 | cut -d: -f1)"
  [ -n "$base" ] && [ -n "$adopta" ] && [ -n "$todo" ] && [ "$base" -lt "$adopta" ] && [ "$adopta" -lt "$todo" ] \
    || { echo "    FALLA: orden: base ${base:-no}, contrasena ${adopta:-no}, todo ${todo:-no}"; return 1; }
}
