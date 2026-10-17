# shellcheck shell=bash disable=SC2034  # NG_RESUMEN y NG_MARCA los lee comun.sh
# Paso 8 del instalador Linux: la tractografia en el contenedor de
# herramientas (B2 del diseno, H10). Si falla, NeuroGraph queda instalado
# sin ella y el estado dice por que (pendiente); nunca detiene la
# instalacion. Devuelve 1 si no quedo instalada.
#
# Variables de prueba (sin efecto si no se definen):
#   NEUROGRAPH_PRUEBA_TOPE_MEMORIA  otro --memory (p. ej. 300m)
#   NEUROGRAPH_PRUEBA_STUBS         carpeta de programas simulados, delante del PATH del contenedor
#   NEUROGRAPH_PRUEBA_MEDIR=1       anota en el registro el pico de memoria y la duracion (B8.5)

NG_TRACTO_EN_CURSO=0
NG_EVENTOS_PID=""
NG_MEDIR_PID=""
NG_TRACTO_TEMPORAL=""  # carpeta de los temporales del paso 8: la borra tambien la trampa

nombre_contenedor_tracto() { echo "$NG_PROYECTO-tractografia"; }

marcar_tractografia() {  # estado [motivo] -> 1 si no se pudo guardar
  # Corre sin errexit (paso_8 llama con ||): cada escritura se comprueba (B2).
  guardar_valor "$NG_ESTADO" NG_TRACTOGRAFIA "$1" || return 1
  if [ -n "${2:-}" ]; then guardar_valor "$NG_ESTADO" NG_TRACTOGRAFIA_MOTIVO "$2"
  else borrar_valor "$NG_ESTADO" NG_TRACTOGRAFIA_MOTIVO; fi
}

dejar_pendiente() {  # motivo -> estado, marca y resumen (quien llama devuelve 1)
  marcar_tractografia pendiente "$1" || fallar estado "$NG_ESTADO"
  NG_MARCA="⚠"; NG_RESUMEN="pendiente — $1"
}

# Sin recursos para lanzarla ahora: pendiente, salvo que la tractografia ya
# este cargada (al repetir la instalacion con poca memoria). Con los datos en
# la base, «pendiente» seria falso: sigue instalada y se dice que no se repite (B2).
sin_recursos_para_lanzarla() {  # motivo -> 0 si ya estaba cargada (quien llama lo devuelve)
  if [ "$(ng_psql "$NG_CONSULTA_TRACTOGRAFIA" 2> /dev/null || true)" != "$NG_ESPERADO_TRACTOGRAFIA" ]; then
    dejar_pendiente "$1"
    return 1
  fi
  marcar_tractografia instalada || fallar estado "$NG_ESTADO"
  local n
  # shellcheck disable=SC2206  # se parte a proposito en tres numeros
  n=($NG_ESPERADO_TRACTOGRAFIA)
  NG_RESUMEN="ya instalada (${n[0]} tractos, ${n[1]} nodos y ${n[2]} aristas); no se repite: $1"
}

# docker run solo pasa las senales al primer proceso del contenedor: la
# trampa de Ctrl+C lo para con kill (B2). Primero el contenedor, para que el
# script no lance la carga siguiente.
parar_tractografia_en_curso() {
  [ "$NG_TRACTO_EN_CURSO" = 1 ] || return 0
  local c
  c="$(nombre_contenedor_tracto)"
  docker kill "$c" > /dev/null 2>&1 || true
  docker rm -f "$c" > /dev/null 2>&1 || true
  # docker kill no llega al psql que la carga corre con docker exec en
  # Postgres: se termina por su nombre (el PGAPPNAME del script) y se borra
  # el SQL copiado.
  ng_psql "select pg_terminate_backend(pid) from pg_stat_activity where application_name='neurograph_tractografia'" > /dev/null 2>&1 || true
  docker exec "$NG_PROYECTO-postgres" rm -f /tmp/neurograph_tractografia.sql > /dev/null 2>&1 || true
  if [ -n "$NG_EVENTOS_PID" ]; then kill "$NG_EVENTOS_PID" 2> /dev/null || true; fi
  if [ -n "$NG_MEDIR_PID" ]; then kill "$NG_MEDIR_PID" 2> /dev/null || true; fi
  # La carpeta entera: lo que escriba despues el docker run que muere no la recrea.
  if [ -n "$NG_TRACTO_TEMPORAL" ]; then rm -rf "$NG_TRACTO_TEMPORAL"; NG_TRACTO_TEMPORAL=""; fi
  NG_TRACTO_EN_CURSO=0
  marcar_tractografia pendiente "Interrumpida; repite con: neurograph tractografia" \
    || echo "No se pudo anotar la interrupcion en $NG_ESTADO"
  echo "Contenedor de la tractografia parado"
}

# B8.5: el pico de memoria se lee del cgroup del contenedor mientras corre
# (al terminar, el cgroup desaparece). memory.peak solo crece.
medir_pico() {  # contenedor archivo_destino
  local id f
  sleep 2
  id="$(docker inspect -f '{{.Id}}' "$1" 2> /dev/null || true)"
  for f in "/sys/fs/cgroup/system.slice/docker-$id.scope/memory.peak" "/sys/fs/cgroup/docker/$id/memory.peak"; do
    [ -r "$f" ] || continue
    while [ -r "$f" ]; do cat "$f" > "$2" 2> /dev/null || true; sleep 2; done
    return 0
  done
}

paso_tractografia() {
  local motivo mem c bib tope salida eventos pico codigo_f codigo oom codigo_fallo detalle frase_motivo inicio p extra=()
  # Primero, si hay otra en marcha: falta memoria justo por ella, y su estado
  # no se toca (B2).
  c="$(nombre_contenedor_tracto)"
  case "$(docker inspect -f '{{.State.Running}}' "$c" 2> /dev/null || true)" in
    true) fallar tracto_en_marcha ;;
    false) docker rm -f "$c" > /dev/null ;;
  esac
  motivo="$(leer_valor "$NG_ESTADO" NG_TRACTO_SIN_RECURSOS)"
  if [ -n "$motivo" ]; then sin_recursos_para_lanzarla "$motivo"; return; fi
  # La memoria se mira otra vez: en el paso 1, NeuroGraph aun no estaba encendido.
  mem="$(memoria_libre_mb)"
  if [ "$mem" -lt "$NG_MIN_MEMORIA_TRACTO_MB" ]; then
    sin_recursos_para_lanzarla "memoria insuficiente ahora (hacen falta $NG_MIN_MEMORIA_TRACTO_MB MB libres y hay $mem MB)"
    return
  fi
  bib="$(leer_valor "$NG_CONFIG" NG_BIBLIOTECA)"
  if ! mkdir -p "$bib" 2> /dev/null || [ ! -w "$bib" ]; then
    dejar_pendiente "$(frase biblioteca_sin_permiso "$bib")"
    return 1
  fi
  # Sin la imagen, docker run la buscaria en Docker Hub con ese nombre (B1).
  if ! docker image inspect "$NG_PROYECTO-herramientas" > /dev/null 2>&1; then
    dejar_pendiente "$(frase imagenes)"
    return 1
  fi
  tope="${NEUROGRAPH_PRUEBA_TOPE_MEMORIA:-$NG_TOPE_MEMORIA_TRACTO}"
  if [ -n "${NEUROGRAPH_PRUEBA_STUBS:-}" ]; then
    extra=(--mount "type=bind,src=$NEUROGRAPH_PRUEBA_STUBS,dst=/pruebas/bin,readonly"
      -e "PATH=/pruebas/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin")
  fi
  # En curso antes de crear nada: un Ctrl+C a partir de aqui lo limpia todo.
  NG_TRACTO_EN_CURSO=1
  NG_TRACTO_TEMPORAL="$(mktemp -d)"
  salida="$NG_TRACTO_TEMPORAL/salida"; eventos="$NG_TRACTO_TEMPORAL/eventos"
  pico="$NG_TRACTO_TEMPORAL/pico"; codigo_f="$NG_TRACTO_TEMPORAL/codigo"
  docker events --filter "container=$c" --filter event=oom --format '{{.Action}}' > "$eventos" 2> /dev/null 9>&- &
  NG_EVENTOS_PID=$!
  if [ "${NEUROGRAPH_PRUEBA_MEDIR:-}" = 1 ]; then medir_pico "$c" "$pico" 9>&- & NG_MEDIR_PID=$!; fi
  inicio=$SECONDS
  # En segundo plano y con wait: asi la trampa de Ctrl+C actua en el momento
  # (bash aplaza las trampas mientras espera una orden en primer plano). La
  # salida va al registro en directo (tee) y a un archivo para clasificarla.
  # La tuberia conserva el descriptor 9 a proposito: si el instalador muere
  # sin pasar por la trampa (kill -9), el bloqueo sigue mientras corre el
  # contenedor y nadie lanza otra tractografia encima (B2).
  {
    set +e
    docker run --name "$c" --pull never \
      --user "$(id -u):$(id -g)" --group-add "$(stat -c %g /var/run/docker.sock)" \
      -e HOME=/tmp -e PYTHONDONTWRITEBYTECODE=1 -e "NEUROGRAPH_LIBRARY__PATH=$bib" \
      --mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock \
      --mount "type=bind,src=$bib,dst=$bib" \
      --memory "$tope" --memory-swap "$tope" \
      "${extra[@]}" \
      "$NG_PROYECTO-herramientas" bash /app/scripts/install_tractography.sh "$NG_PROYECTO-postgres"
    echo "$?" > "$codigo_f"
  } 2>&1 | tee "$salida" &
  wait $! || true
  codigo="$(cat "$codigo_f" 2> /dev/null || true)"
  codigo="${codigo:-1}"
  oom="$(docker inspect -f '{{.State.OOMKilled}}' "$c" 2> /dev/null || true)"
  if [ "${NEUROGRAPH_PRUEBA_MEDIR:-}" = 1 ]; then
    p="$(cat "$pico" 2> /dev/null || true)"
    echo "medicion tractografia: pico $(( ${p:-0} / 1048576 )) MB, duracion $(( SECONDS - inicio )) s"
  fi
  docker rm -f "$c" > /dev/null 2>&1 || true
  sleep 1
  kill "$NG_EVENTOS_PID" 2> /dev/null || true
  if [ -n "$NG_MEDIR_PID" ]; then kill "$NG_MEDIR_PID" 2> /dev/null || true; fi
  NG_TRACTO_EN_CURSO=0
  echo "tractografia: codigo $codigo, OOMKilled=$oom, eventos oom: $(tr '\n' ' ' < "$eventos")"

  if [ "$codigo" = 0 ] && [ "$(ng_psql "$NG_CONSULTA_TRACTOGRAFIA" 2> /dev/null || true)" = "$NG_ESPERADO_TRACTOGRAFIA" ]; then
    # Primero se borran los temporales: fallar no vuelve y la trampa ya no los limpia.
    rm -rf "$NG_TRACTO_TEMPORAL"; NG_TRACTO_TEMPORAL=""
    marcar_tractografia instalada || fallar estado "$NG_ESTADO"
    # shellcheck disable=SC2086  # se parte a proposito en tres numeros
    set -- $NG_ESPERADO_TRACTOGRAFIA
    NG_RESUMEN="$1 tractos, $2 nodos y $3 aristas"
    return 0
  fi
  if [ "$oom" = true ] || grep -q oom "$eventos"; then
    codigo_fallo=memoria
  else
    codigo_fallo="$(clasificar_salida "$salida")"
  fi
  detalle="$(detalle_senal "$codigo_fallo" "$salida")"
  # Las frases de espacio y red del catalogo mandan repetir el instalador:
  # aqui se repite la tractografia (B6).
  case "$codigo_fallo" in espacio) codigo_fallo=espacio_script ;; red) codigo_fallo=descarga ;; esac
  frase_motivo="$(frase "$codigo_fallo" "$detalle")"
  rm -rf "$NG_TRACTO_TEMPORAL"; NG_TRACTO_TEMPORAL=""
  if [ "$codigo_fallo" = ficha ] && [ "$(ng_psql "$NG_CONSULTA_TRACTOGRAFIA" 2> /dev/null || true)" = "$NG_ESPERADO_TRACTOGRAFIA" ]; then
    marcar_tractografia ficha_en_conflicto "$frase_motivo" || fallar estado "$NG_ESTADO"
    NG_MARCA="⚠"; NG_RESUMEN="cargada, pero ${frase_motivo,}"
    return 1
  fi
  dejar_pendiente "$frase_motivo"
  return 1
}
