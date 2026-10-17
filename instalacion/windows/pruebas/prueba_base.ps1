# Pruebas de base.ps1 (pasos 6 y 7, bloque A y B1 del diseno, H11).
$LIBS = @('sistema', 'docker', 'imagenes', 'base')

function volumenes([string]$que) {  # 0 no existe, 1 existe, falla
  switch ($que) {
    'falla' { return @('volume ls|1||stderr:error during connect: this error may indicate that the docker daemon is not running') }
    '1' { return @('volume ls|0||otro-volumen\nneurograph-app-datos-copia\nneurograph-app-datos') }
    default { return @('volume ls|0||otro-volumen\nneurograph-app-datos-copia') }
  }
}

function prueba_sin_volumen_se_descartan_las_marcas_y_se_anota_el_propio {
  config_con "NG_BASE_CARGADA=2026-10-01`n"
  simular_tabla docker (volumenes 0)
  [void](con_lib 'decidir_volumen; decir "NUEVO=$($script:NG_VOLUMEN_NUEVO) SALTAR=$($script:NG_SALTAR_CARGA)"' $LIBS)
  contiene 'NUEVO=True SALTAR=False' (pantalla) 'se carga de nuevo'
  igual '' (valor_config NG_BASE_CARGADA) 'marca de carga descartada'
  if (-not (valor_config NG_VOLUMEN_PROPIO)) { throw 'FALLA: no anota que el volumen es suyo' }
}

# Los nombres de los volumenes de Docker distinguen mayusculas: otro que solo
# cambia en ellas no es el nuestro.
function prueba_un_volumen_que_solo_cambia_en_mayusculas_no_es_el_nuestro {
  simular_tabla docker @('volume ls|0||NEUROGRAPH-APP-DATOS')
  [void](con_lib 'decidir_volumen; decir "NUEVO=$($script:NG_VOLUMEN_NUEVO) DESCONOCIDO=$($script:NG_VOLUMEN_DESCONOCIDO)"' $LIBS)
  contiene 'NUEVO=True DESCONOCIDO=False' (pantalla) 'el nuestro no existe: se crea'
}

function prueba_docker_que_no_responde_no_es_un_volumen_que_no_existe {
  config_con "NG_VOLUMEN_PROPIO=2026-10-01`nNG_BASE_CARGADA=2026-10-01`n"
  simular_tabla docker (volumenes 'falla')
  igual 1 (con_lib 'decidir_volumen' $LIBS) 'para'
  contiene 'Docker Desktop no está en marcha' (pantalla) 'frase clara, no la genérica'
  igual 2026-10-01 (valor_config NG_BASE_CARGADA) 'la marca de carga sigue'
  simular_tabla docker (volumenes 1)
  [void](con_lib 'decidir_volumen; decir "SALTAR=$($script:NG_SALTAR_CARGA)"' $LIBS)
  contiene 'SALTAR=True' (pantalla) 'al repetir, no se recarga'
  no_contiene 'volume rm' (llamadas docker) 'y nunca se borra'
}

function prueba_volumen_propio_sin_carga_se_rehace_y_el_cargado_no {
  config_con "NG_VOLUMEN_PROPIO=2026-10-01`n"
  simular_tabla docker (volumenes 1)
  [void](con_lib 'decidir_volumen; decir "NUEVO=$($script:NG_VOLUMEN_NUEVO)"' $LIBS)
  contiene 'volume rm neurograph-app-datos' (llamadas docker) 'instalación cortada: se rehace'
  contiene 'NUEVO=True' (pantalla) 'y se carga'
  [IO.File]::WriteAllText((Join-Path $env:NG_PRUEBA_LLAMADAS 'docker'), '')
  config_con "NG_VOLUMEN_PROPIO=2026-10-01`nNG_BASE_CARGADA=2026-10-01`n"
  [void](con_lib 'decidir_volumen' $LIBS)
  no_contiene 'volume rm' (llamadas docker) 'con la marca de carga, nunca'
}

function prueba_volumen_desconocido_no_se_borra_ni_al_repetir {
  config_con "NG_CONTRASENA_BASE=abc`nNG_WEB_PUERTO=5173`n"
  simular_tabla docker (volumenes 1)
  foreach ($vez in 1, 2) {
    [void](con_lib 'decidir_volumen; decir "DESCONOCIDO=$($script:NG_VOLUMEN_DESCONOCIDO)"' $LIBS)
    contiene 'DESCONOCIDO=True' (pantalla) "vez ${vez}: desconocido"
  }
  no_contiene 'volume rm' (llamadas docker) 'nunca se borra'
}

function prueba_desconocido_completo_se_adopta_con_la_contrasena_por_la_entrada {
  config_con "NG_CONTRASENA_BASE=nueva123`n"
  simular_tabla docker @('version_num from alembic_version|0||0015', 'count(*) from regions|0||1172', 'exec -i neurograph-app-postgres psql|0|entrada|')
  [void](con_lib 'adoptar_volumen_desconocido; decir "SALTAR=$($script:NG_SALTAR_CARGA)"' $LIBS)
  contiene 'SALTAR=True' (pantalla) 'se usa sin recargar'
  contiene 'adoptada' (valor_config NG_BASE_CARGADA) 'marca escrita'
  igual "ALTER ROLE neurograph PASSWORD 'nueva123';" ([IO.File]::ReadAllText((Join-Path $env:NG_PRUEBA_LLAMADAS 'docker.entrada'))).Trim() 'la de config.env, por la entrada estándar y sin BOM'
  no_contiene 'nueva123' ((registro) + (llamadas docker)) 'ni en el registro ni en la línea de órdenes'
}

function prueba_desconocido_incompleto_para_sin_tocar {
  config_con "NG_CONTRASENA_BASE=nueva123`n"
  simular_tabla docker @('version_num from alembic_version|0||0012', 'count(*) from regions|0||1172')
  igual 1 (con_lib 'adoptar_volumen_desconocido' $LIBS) 'otro esquema: para'
  contiene 'docker volume rm neurograph-app-datos' (pantalla) 'da la orden para borrarlo a mano'
  no_contiene 'exec -i' (llamadas docker) 'pero no lo toca'
}

function prueba_la_carga_va_en_el_contenedor_de_herramientas_y_escribe_la_marca {
  simular_tabla docker (@('run --rm --name neurograph-app-carga|0||  init/salida_mmp1.sql   OK') + (filas_h1))
  [void](con_lib "`$script:NG_RAIZ = 'C:\proyecto'; paso_cargar; decir `$script:NG_RESUMEN" $LIBS)
  contiene '1172 regiones, 104115 conexiones' (pantalla) 'el resumen'
  if (-not (valor_config NG_BASE_CARGADA)) { throw 'FALLA: sin la marca de carga' }
  $l = llamadas docker
  contiene '--mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock' $l 'con el socket'
  contiene '--mount type=bind,src=C:\proyecto\init,dst=/app/init,readonly' $l 'init/ en solo lectura'
  contiene 'neurograph-app-herramientas bash /app/scripts/rebuild_db_from_sql.sh neurograph-app-postgres' $l 'el script tal cual'
}

function prueba_una_carga_que_falla_nombra_el_archivo_y_no_marca {
  simular_tabla docker (@('run --rm --name neurograph-app-carga|1||  init/salida_mmp1.sql   OK\n  init/salida_rsn_networks.sql   ERROR') + (filas_h1))
  igual 1 (con_lib "`$script:NG_RAIZ = 'C:\proyecto'; paso_cargar" $LIBS) 'sale con 1'
  contiene 'Falló la carga de los datos iniciales en init/salida_rsn_networks.sql.' (pantalla) 'nombra el archivo'
  igual '' (valor_config NG_BASE_CARGADA) 'sin marca'
}

function prueba_recuentos_distintos_no_marcan {
  simular_tabla docker (@('run --rm|0||ok', 'select count(*) from connections c where|0||0', 'select count(*) from connections|0||100') + (filas_h1))
  igual 1 (con_lib "`$script:NG_RAIZ = 'C:\proyecto'; paso_cargar" $LIBS) 'sale con 1'
  contiene 'connections da 100 y se esperaba 104115' (pantalla) 'dice cuál no cuadra'
  igual '' (valor_config NG_BASE_CARGADA) 'sin marca'
}

function prueba_base_conservada_distinta_avisa_sin_fallar {
  simular_tabla docker @('count(*) from regions|0||1000', 'count(*) from connections|0||90000')
  [void](con_lib '$script:NG_SALTAR_CARGA = $true; paso_cargar; decir "$($script:NG_MARCA) $($script:NG_RESUMEN)"' $LIBS)
  contiene 'AVISO base conservada: 1000 regiones, 90000 conexiones' (pantalla) 'avisa'
  contiene 'Actualizar está fuera' ([IO.File]::ReadAllText((Join-Path $env:LOCALAPPDATA 'neurograph-app\.avisos'))) 'y explica'
}

function prueba_la_limpieza_solo_quita_lo_incompleto {
  config_con "NG_VOLUMEN_PROPIO=2026-10-02`n"
  simular_tabla docker @('*|0||')
  [void](con_lib '$script:NG_VOLUMEN_NUEVO = $true; $script:NG_IMAGENES_NUEVAS = @("neurograph-app-web"); limpiar_lo_incompleto' $LIBS)
  $l = llamadas docker
  contiene 'volume rm neurograph-app-datos' $l 'volumen nuevo sin carga: se borra'
  contiene 'rmi neurograph-app-web' $l 'y la imagen creada en esta ejecución'
  contiene 'rm -f neurograph-app-postgres neurograph-app-api neurograph-app-web neurograph-app-carga' $l 'y los contenedores'
  [IO.File]::WriteAllText((Join-Path $env:NG_PRUEBA_LLAMADAS 'docker'), '')
  config_con "NG_VOLUMEN_PROPIO=2026-10-02`nNG_BASE_CARGADA=2026-10-02`n"
  [void](con_lib '$script:NG_VOLUMEN_NUEVO = $true; limpiar_lo_incompleto' $LIBS)
  igual '' (llamadas docker) 'con la carga hecha, nada'
}

function prueba_la_limpieza_no_se_cuelga_con_docker_colgado {
  # Docker colgado: cada orden de la limpieza tiene su tiempo maximo y la
  # ventana no se queda esperando (B1).
  config_con "NG_VOLUMEN_PROPIO=2026-10-02`n"
  simular_tabla docker @('*|0|espera:60|')
  $reloj = [Diagnostics.Stopwatch]::StartNew()
  [void](con_lib '$script:NG_ESPERA_LIMPIEZA = 2; $script:NG_VOLUMEN_NUEVO = $true; $script:NG_IMAGENES_NUEVAS = @("neurograph-app-web"); limpiar_lo_incompleto' $LIBS)
  if ($reloj.Elapsed.TotalSeconds -gt 40) { throw "FALLA: la limpieza tardó $([int]$reloj.Elapsed.TotalSeconds) s con Docker colgado" }
  igual 3 ([regex]::Matches((registro), [regex]::Escape('tiempo agotado (2 s): docker')).Count) 'contenedores, volumen e imagen, cada uno con su tiempo máximo'
}

function prueba_espera_agotada_deja_el_estado_y_los_mensajes_en_el_registro {
  simular_tabla docker @('pg_isready|1||', 'ps -a|0||neurograph-app-postgres   Exited (1) 3 seconds ago', 'logs --tail 100|0||FATAL:  data directory has wrong ownership')
  igual 1 (con_lib '$script:NG_ESPERA_POSTGRES = 3; esperar_postgres' $LIBS) 'para'
  contiene 'La base de datos no arrancó a tiempo.' (pantalla) 'con límite'
  contiene 'Exited (1)' (registro) 'el estado de los contenedores, al registro'
  contiene 'data directory has wrong ownership' (registro) 'y lo último que dijo'
  contiene 'pg_isready -h 127.0.0.1' (llamadas docker) 'por TCP: el primer arranque escucha antes solo en el socket'
}

function prueba_la_contrasena_se_conserva_y_si_falta_se_crea {
  $r = Join-Path $env:USERPROFILE 'raiz'
  [void](New-Item -ItemType Directory -Force -Path "$r\instalacion\docker")
  [IO.File]::WriteAllText("$r\instalacion\docker\compose.yml", 'services: {}')
  config_con "NG_CONTRASENA_BASE=fija123`n"
  $cuerpo = "`$script:NG_RAIZ = '$r'; `$script:NG_BIBLIOTECA_ELEGIDA = '$env:USERPROFILE\NeuroData'; preparar_configuracion"
  [void](con_lib $cuerpo $LIBS)
  igual fija123 (valor_config NG_CONTRASENA_BASE) 'se conserva'
  config_con ''
  [void](con_lib $cuerpo $LIBS)
  $c = valor_config NG_CONTRASENA_BASE
  igual 32 $c.Length 'sin ella, una de 32 caracteres'
  if ($c -notmatch '^[A-Za-z0-9]+$') { throw "FALLA: la contraseña nueva no es alfanumérica: $c" }
}

function prueba_un_volumen_desconocido_se_adopta_antes_de_arrancar_la_api {
  config_con "NG_CONTRASENA_BASE=nueva123`nNG_WEB_PUERTO=5173`nNG_API_PUERTO=8420`n"
  simular_tabla docker @('version_num from alembic_version|0||0015', 'count(*) from regions|0||1172', 'exec -i|0|entrada|', '*|0||')
  simular_tabla curl @('*|0||')
  [void](con_lib '$script:NG_VOLUMEN_DESCONOCIDO = $true; encender' $LIBS)
  $l = [string[]]@((llamadas docker) -split "`n")
  $base = [array]::FindIndex($l, [Predicate[string]] { param($x) $x -like '* up -d postgres' })
  $adopta = [array]::FindIndex($l, [Predicate[string]] { param($x) $x -like 'exec -i *' })
  $todo = [array]::FindIndex($l, [Predicate[string]] { param($x) $x -like '* up -d' })
  if (-not ($base -ge 0 -and $base -lt $adopta -and $adopta -lt $todo)) { throw "FALLA: orden: base $base, contraseña $adopta, todo $todo" }
}

function prueba_una_ruta_de_proyecto_con_coma_se_rechaza_en_el_paso_1 {
  # En el paso 1 y antes de mirar los .sql (la carpeta no existe: sin la
  # comprobacion, la frase seria la de un proyecto incompleto).
  igual 1 (con_lib "`$script:NG_RAIZ = 'C:\mis,cosas\Neurograph'; paso 1 'Comprobando el ordenador' paso_comprobar" $LIBS -Entorno (entorno_windows)) 'para'
  contiene 'La carpeta del proyecto (C:\mis,cosas\Neurograph)' (pantalla) 'con su frase'
}

function prueba_un_proyecto_en_la_red_se_rechaza_en_el_paso_1 {
  # Docker Desktop no monta init\ desde la red (paso 7): se dice en el paso 1,
  # antes de mirar los .sql (sin la comprobacion, la ruta UNC daria la frase
  # de un proyecto incompleto).
  igual 1 (con_lib "`$script:NG_RAIZ = '\\servidor\compartida\Neurograph'; paso 1 'Comprobando el ordenador' paso_comprobar" $LIBS -Entorno (entorno_windows)) 'una ruta UNC: para'
  contiene 'La carpeta del proyecto (\\servidor\compartida\Neurograph) está en una unidad de red' (pantalla) 'con su frase'
  # Una unidad de red asignada (Z:): DriveInfo la da por Network; aqui se simula.
  $r = raiz_falsa
  igual 1 (con_lib "function script:es_unidad_de_red([string]`$d) { return `$d.StartsWith('$r') }; `$script:NG_RAIZ = '$r'; paso 1 'Comprobando el ordenador' paso_comprobar" $LIBS -Entorno (entorno_windows)) 'una unidad de red: para'
  contiene "La carpeta del proyecto ($r) está en una unidad de red" (pantalla) 'con su frase'
}
