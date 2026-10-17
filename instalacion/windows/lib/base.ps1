# Pasos 6 y 7 del instalador Windows: encender, volumen y carga de datos
# (bloque A y B1 del diseno, H11). Como instalacion/linux/lib/base.sh.
#
# Marcas de config.env sobre el volumen: NG_VOLUMEN_PROPIO (lo creo este
# instalador) y NG_BASE_CARGADA (carga completa y verificada). Solo se rehace
# un volumen propio sin carga, que dejo una instalacion cortada y nunca llego
# a usarse; uno con carga o de origen desconocido nunca se borra.

$NG_VOLUMEN_NUEVO = $false
$NG_SALTAR_CARGA = $false
$NG_VOLUMEN_DESCONOCIDO = $false
$NG_RECUENTO_FALLIDO = ''

function ng_volumen { return "$NG_PROYECTO-datos" }

function args_compose([string[]]$a) {
  return @('compose', '-p', $NG_PROYECTO, '-f', (Join-Path $NG_DIR 'compose.yml'), '--env-file', $NG_CONFIG) + $a
}

# Por el socket local del contenedor: no necesita contrasena.
function ng_psql([string]$consulta, [switch]$Tolerante, [int]$TiempoMax = 300) {
  $r = ejecutar_programa docker @('exec', "$NG_PROYECTO-postgres", 'psql', '-U', 'neurograph', '-d', 'neurograph', '-Atc', $consulta) -Capturar -TiempoMax $TiempoMax
  if ($r.Codigo -ne 0) {
    if ($Tolerante) { return '' }
    throw "psql: código $($r.Codigo) en la consulta «$consulta»"
  }
  return ($r.Salida -join "`n").Trim()
}

function contrasena_nueva {  # 32 caracteres alfanumericos, de un generador criptografico
  $b = New-Object byte[] 48
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  return ([Convert]::ToBase64String($b) -replace '[+/=]', '').Substring(0, 32)
}

function preparar_configuracion {  # usa NG_RAIZ y NG_BIBLIOTECA_ELEGIDA
  [void](New-Item -ItemType Directory -Force -Path $NG_DIR)
  Copy-Item -LiteralPath (Join-Path $NG_RAIZ 'instalacion\docker\compose.yml') -Destination (Join-Path $NG_DIR 'compose.yml') -Force
  guardar_valor $NG_CONFIG NG_PROYECTO $NG_PROYECTO
  guardar_valor $NG_CONFIG NG_BIBLIOTECA $script:NG_BIBLIOTECA_ELEGIDA
  if (-not (leer_valor $NG_CONFIG NG_CONTRASENA_BASE)) { guardar_valor $NG_CONFIG NG_CONTRASENA_BASE (contrasena_nueva) }
}

function quitar_contenedores {
  [void](ejecutar_programa docker @('rm', '-f', "$NG_PROYECTO-postgres", "$NG_PROYECTO-api", "$NG_PROYECTO-web", "$NG_PROYECTO-carga") -Capturar -TiempoMax $NG_ESPERA_LIMPIEZA)
}

function decidir_volumen {
  $vol = ng_volumen
  # Con la lista y no con «volume inspect»: un fallo pasajero de Docker no es
  # «el volumen no existe», que borraria las marcas y despues el volumen
  # cargado. Si Docker no responde, se para sin tocar nada.
  $r = ejecutar_programa docker @('volume', 'ls', '-q') -Capturar -TiempoMax 60
  if ($r.Codigo -ne 0) { fallar docker_parado }
  # Los nombres de los volumenes distinguen mayusculas.
  if ($r.Salida -cnotcontains $vol) {
    borrar_valor $NG_CONFIG NG_BASE_CARGADA
    guardar_valor $NG_CONFIG NG_VOLUMEN_PROPIO (fecha_corta)
    $script:NG_VOLUMEN_NUEVO = $true
    return
  }
  if (leer_valor $NG_CONFIG NG_BASE_CARGADA) { $script:NG_SALTAR_CARGA = $true; return }
  if (leer_valor $NG_CONFIG NG_VOLUMEN_PROPIO) {
    registrar "Volumen $vol propio y sin NG_BASE_CARGADA: instalación cortada en el paso 7; se rehace"
    quitar_contenedores
    if ((ejecutar_programa docker @('volume', 'rm', $vol)).Codigo -ne 0) { throw "no se pudo quitar el volumen $vol" }
    $script:NG_VOLUMEN_NUEVO = $true
    return
  }
  $script:NG_VOLUMEN_DESCONOCIDO = $true
}

# Volumen de origen desconocido: primero se mira, por el socket local, si
# tiene el esquema completo y datos. Solo entonces se le pone la contrasena
# de config.env, por la entrada estandar (no en la linea de ordenes: es una
# linea ASCII, no un archivo de datos; el riesgo 7 es de acentos). Si no, no se toca.
function adoptar_volumen_desconocido {
  $vol = ng_volumen
  $version = ng_psql 'select version_num from alembic_version' -Tolerante
  $regiones = ng_psql 'select count(*) from regions' -Tolerante
  registrar "Volumen $vol de origen desconocido: alembic_version=$(if ($version) { $version } else { 'ninguna' }), regiones=$(if ($regiones) { $regiones } else { 0 })"
  if ($version -ne $NG_ESPERADO_ESQUEMA -or [int]("0$regiones") -le 0) { fallar volumen_desconocido $vol }
  $sql = "ALTER ROLE neurograph PASSWORD '" + (leer_valor $NG_CONFIG NG_CONTRASENA_BASE) + "';`n"
  $r = ejecutar_programa docker @('exec', '-i', "$NG_PROYECTO-postgres", 'psql', '-U', 'neurograph', '-d', 'neurograph', '-q', '-v', 'ON_ERROR_STOP=1') -Entrada $sql
  if ($r.Codigo -ne 0) { throw 'no se pudo poner la contraseña al volumen adoptado' }
  registrar "Volumen $vol adoptado: contraseña nueva puesta"
  guardar_valor $NG_CONFIG NG_BASE_CARGADA "$(fecha_corta) (adoptada)"
  $script:NG_SALTAR_CARGA = $true
}

# La prueba es un bloque que se llama con & (no es un programa externo:
# prueba_archivos.ps1 lo admite aqui).
function esperar_hasta([int]$segundos, [string]$descripcion, [string]$contenedor, [scriptblock]$prueba) {
  $limite = [DateTime]::Now.AddSeconds($segundos)
  while (-not (& $prueba)) {
    if ([DateTime]::Now -ge $limite) {
      # Al registro, en que estado quedo cada pieza y lo ultimo que dijo la
      # que se esperaba: si no, la frase no dice por que (B1).
      registrar "Espera agotada ($descripcion). Contenedores del proyecto:"
      [void](ejecutar_programa docker @('ps', '-a', '--filter', "name=^$NG_PROYECTO-"))
      registrar "Últimas líneas de ${contenedor}:"
      [void](ejecutar_programa docker @('logs', '--tail', '100', $contenedor))
      fallar espera $descripcion
    }
    esperar_segundos 2
  }
}

function responde_url([string]$url) { return ((ejecutar_programa curl @('-sf', '-o', 'NUL', '--max-time', '10', $url) -TiempoMax 20).Codigo -eq 0) }

function esperar_postgres {  # por TCP: en el primer arranque hay un servidor provisional solo por socket
  esperar_hasta $NG_ESPERA_POSTGRES 'La base de datos' "$NG_PROYECTO-postgres" {
    (ejecutar_programa docker @('exec', "$NG_PROYECTO-postgres", 'pg_isready', '-h', '127.0.0.1', '-U', 'neurograph', '-d', 'neurograph') -Capturar -TiempoMax 30).Codigo -eq 0
  }
}
function esperar_api { esperar_hasta $NG_ESPERA_API 'La API' "$NG_PROYECTO-api" { responde_url "http://127.0.0.1:$(leer_valor $NG_CONFIG NG_API_PUERTO)/health" } }
function esperar_web { esperar_hasta $NG_ESPERA_WEB 'La web' "$NG_PROYECTO-web" { responde_url "http://127.0.0.1:$(leer_valor $NG_CONFIG NG_WEB_PUERTO)/" } }

function comprobar_imagenes {
  foreach ($i in "$NG_PROYECTO-api", "$NG_PROYECTO-web", 'pgvector/pgvector:pg16') {
    if (-not (existe_imagen $i)) { fallar imagenes }
  }
}

function encender {  # postgres primero (un volumen desconocido se resuelve antes de la API)
  comprobar_imagenes
  ejecutar_clasificado -Generico encender -Dato 'la base de datos' -Programa docker -Argumentos (args_compose @('up', '-d', 'postgres'))
  esperar_postgres
  if ($script:NG_VOLUMEN_DESCONOCIDO) { adoptar_volumen_desconocido }
  ejecutar_clasificado -Generico encender -Dato 'NeuroGraph' -Programa docker -Argumentos (args_compose @('up', '-d'))
  esperar_api
  esperar_web
}

function paso_encender {
  preparar_configuracion
  decidir_volumen
  encender
  $script:NG_RESUMEN = 'base, API y web respondiendo'
}

function comprobar_recuentos([string[]]$lista) {  # consulta|valor -> $true; si no, NG_RECUENTO_FALLIDO
  foreach ($l in $lista) {
    $i = $l.LastIndexOf('|')
    $consulta = $l.Substring(0, $i)
    $esperado = $l.Substring($i + 1)
    $obtenido = ng_psql $consulta
    registrar "recuento: $consulta -> $obtenido (esperado $esperado)"
    if ($obtenido -ne $esperado) {
      $script:NG_RECUENTO_FALLIDO = "$consulta da $obtenido y se esperaba $esperado"
      return $false
    }
  }
  return $true
}

# Paso 7: rebuild_db_from_sql.sh tal cual, dentro del contenedor de
# herramientas (Windows no necesita bash ni Python). La imagen lleva
# /app/scripts y /app/backend (semillas y migraciones); init\ del proyecto
# se monta en solo lectura en /app/init (el script saca la raiz de su ruta).
function paso_cargar {
  if ($script:NG_SALTAR_CARGA) {
    $regiones = ng_psql 'select count(*) from regions'
    $conexiones = ng_psql 'select count(*) from connections'
    if ($regiones -ne $NG_ESPERADO_REGIONES -or $conexiones -ne $NG_ESPERADO_CONEXIONES) {
      avisar "La base conservada tiene $regiones regiones y $conexiones conexiones; esta versión espera $NG_ESPERADO_REGIONES y $NG_ESPERADO_CONEXIONES. Actualizar está fuera de esta versión del instalador."
      $script:NG_MARCA = $NG_MARCA_AVISO
    }
    $script:NG_RESUMEN = "base conservada: $regiones regiones, $conexiones conexiones"
    return
  }
  $salida = Join-Path $env:TEMP ('neurograph-carga-' + [guid]::NewGuid().ToString('N') + '.txt')
  try {
    $r = ejecutar_programa docker @('run', '--rm', '--name', "$NG_PROYECTO-carga", '--pull', 'never',
      '--mount', 'type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock',
      '--mount', "type=bind,src=$(Join-Path $NG_RAIZ 'init'),dst=/app/init,readonly",
      "$NG_PROYECTO-herramientas", 'bash', '/app/scripts/rebuild_db_from_sql.sh', "$NG_PROYECTO-postgres") -Copia $salida
    if ($r.Codigo -ne 0) {
      # Sus lineas son «  init/archivo.sql   OK|ERROR»: se nombra el que fallo.
      $archivo = ''
      foreach ($l in [IO.File]::ReadAllLines($salida, $NG_UTF8)) { if ($l -match '^\s*(\S+)\s+ERROR\s*$') { $archivo = $Matches[1]; break } }
      fallar carga $(if ($archivo) { $archivo } else { 'un archivo (ver el registro)' })
    }
  } finally { Remove-Item -LiteralPath $salida -Force -ErrorAction SilentlyContinue }
  if (-not (comprobar_recuentos $NG_ESPERADO_CARGA)) { fallar recuentos_base $script:NG_RECUENTO_FALLIDO }
  guardar_valor $NG_CONFIG NG_BASE_CARGADA (fecha_corta)
  $script:NG_RESUMEN = "$NG_ESPERADO_REGIONES regiones, $NG_ESPERADO_CONEXIONES conexiones"
}

# Si la instalacion falla antes de terminar el paso 7 (B1): se quitan los
# contenedores y las imagenes propias creadas en esta ejecucion, y el volumen
# si es nuevo y no tiene la carga. Con la carga hecha no se quita nada:
# NeuroGraph ya es usable. Sin Docker todavia (pasos 1 a 3), no hay nada que quitar.
function limpiar_lo_incompleto {
  if (leer_valor $NG_CONFIG NG_BASE_CARGADA) { return }
  if (-not (resolver_programa docker)) { return }
  quitar_contenedores
  if ($script:NG_VOLUMEN_NUEVO) { [void](ejecutar_programa docker @('volume', 'rm', (ng_volumen)) -Capturar -TiempoMax $NG_ESPERA_LIMPIEZA) }
  foreach ($i in $script:NG_IMAGENES_NUEVAS) { [void](ejecutar_programa docker @('rmi', $i) -Capturar -TiempoMax $NG_ESPERA_LIMPIEZA) }
  registrar "Limpieza de lo incompleto hecha (volumen nuevo: $($script:NG_VOLUMEN_NUEVO))"
}
