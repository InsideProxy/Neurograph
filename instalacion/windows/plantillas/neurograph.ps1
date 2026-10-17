# Comando diario de NeuroGraph instalado (B3 del diseno, H11). No necesita la
# carpeta del proyecto: usa la copia de lib\, compose.yml y config.env de
# %LOCALAPPDATA%\neurograph-app. Lo lanzan neurograph.cmd y los accesos del menu
# Inicio (con --escritorio: sin consola; avisa con notificaciones y, si
# falla, con un cuadro de mensaje). Como instalacion/linux/plantillas/neurograph.
#   neurograph abrir | apagar | estado | tractografia | conectar-ia | desinstalar [--borrar-datos]
$ErrorActionPreference = 'Stop'
$dir_lib = Join-Path $PSScriptRoot 'lib'
# Desde el proyecto (pruebas), la lib del proyecto, si no hay copia instalada.
if (-not (Test-Path -LiteralPath $dir_lib)) { $dir_lib = Join-Path $PSScriptRoot '..\lib' }
foreach ($l in 'comun', 'sistema', 'docker', 'puertos', 'imagenes', 'base', 'tractografia', 'mcp', 'ias', 'escritorio') {
  . (Join-Path $dir_lib "$l.ps1")
}
$guardado = leer_valor $NG_CONFIG NG_PROYECTO
if ($guardado) { $NG_PROYECTO = $guardado }
$uso = 'Uso: neurograph abrir | apagar | estado | tractografia | conectar-ia | desinstalar [--borrar-datos]'
$orden = if ($args.Count -gt 0) { [string]$args[0] } else { 'ayuda' }
$resto = @($args | Select-Object -Skip 1)
if ($resto -contains '--escritorio') {
  $NG_MODO_ESCRITORIO = $true
  $resto = @($resto | Where-Object { $_ -ne '--escritorio' })
}
$NG_REPETIR = "neurograph $orden"

function al_salir_extra([int]$codigo) {
  parar_tractografia_en_curso
  if ($codigo -ne 0 -and $script:NG_MODO_ESCRITORIO) { notificar_fallo }
}

# Una ventana abierta antes de instalar Docker Desktop no tiene su carpeta en
# el PATH: se anade antes de preguntar a docker (como asegurar_docker).
function docker_disponible {
  $dd = docker_desktop_instalado
  if ($dd) { usar_docker_del_path $dd }
  return ((resolver_programa docker) -and (docker_responde))
}

function cmd_abrir {
  if (-not (docker_disponible)) { notificar 'Arrancando Docker Desktop...' }
  asegurar_docker
  if ((contenedor_en_marcha "$NG_PROYECTO-web") -and (responde_url "http://127.0.0.1:$(leer_valor $NG_CONFIG NG_WEB_PUERTO)/")) {
    abrir_navegador
    return
  }
  notificar 'Encendiendo NeuroGraph...'
  decir 'Encendiendo NeuroGraph...'
  elegir_puertos
  mostrar_avisos
  encender
  abrir_navegador
  notificar 'NeuroGraph está listo.'
}

function cmd_apagar {
  # Con Docker Desktop cerrado, NeuroGraph ya esta apagado.
  if (docker_disponible) {
    $r = ejecutar_programa docker (args_compose @('stop')) -TiempoMax 300
    if ($r.Codigo -ne 0) { throw "docker compose stop: código $($r.Codigo)" }
  }
  decir 'NeuroGraph apagado. Tus datos se conservan.'
  notificar 'NeuroGraph apagado.'
}

function cmd_estado {
  $web = leer_valor $NG_CONFIG NG_WEB_PUERTO
  $api = leer_valor $NG_CONFIG NG_API_PUERTO
  if ((docker_disponible) -and (contenedor_en_marcha "$NG_PROYECTO-web")) {
    decir "NeuroGraph: encendido en http://127.0.0.1:$web (API en el $api)"
    decir "Datos: $(ng_psql 'select count(*) from regions') regiones, $(ng_psql 'select count(*) from connections') conexiones"
  } else {
    decir "NeuroGraph: apagado (puertos guardados: web $web, API $api)"
  }
  $tracto = leer_valor $NG_ESTADO NG_TRACTOGRAFIA
  $motivo = leer_valor $NG_ESTADO NG_TRACTOGRAFIA_MOTIVO
  decir "Tractografía: $(if ($tracto) { $tracto } else { 'sin instalar' })$(if ($motivo) { " - $motivo" })"
  $ias = (@((leer_valor $NG_ESTADO NG_IAS_REGISTRADAS) -split ' ' | Where-Object { $_ }) | ForEach-Object { ia_nombre $_ }) -join ', '
  # Registradas: si de verdad conectan, solo lo dice su comprobacion (B5).
  decir "IAs registradas por el instalador: $(if ($ias) { $ias } else { 'ninguna' })"
  decir "Biblioteca: $(leer_valor $NG_CONFIG NG_BIBLIOTECA)"
  $ultimo = Get-ChildItem -LiteralPath (Join-Path $NG_DIR 'registro') -Filter 'instalar-*.log' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | Select-Object -Last 1
  decir "Último registro de instalación: $(if ($ultimo) { $ultimo.FullName })"
}

function cmd_tractografia {
  asegurar_docker
  $script:NG_BIBLIOTECA_ELEGIDA = leer_valor $NG_CONFIG NG_BIBLIOTECA
  # Sin la imagen, docker run la buscaria en Docker Hub con ese nombre (B1).
  if (-not (existe_imagen "$NG_PROYECTO-herramientas")) { fallar imagenes }
  # El disco de la biblioteca puede estar desconectado: lo dice su frase (B2).
  $u = [IO.Path]::GetPathRoot($script:NG_BIBLIOTECA_ELEGIDA)
  if ($u -and -not (Test-Path -LiteralPath $u)) { fallar biblioteca_sin_permiso $script:NG_BIBLIOTECA_ELEGIDA }
  # Solo lo que necesita la tractografia: las imagenes ya estan construidas.
  comprobar_recursos_tracto
  mostrar_avisos  # ahora: si no, saldrian en el siguiente «neurograph abrir»
  $encendida_aqui = $false
  if (-not (contenedor_en_marcha "$NG_PROYECTO-postgres")) {
    comprobar_imagenes
    ejecutar_clasificado -Generico encender -Dato 'la base de datos' -Programa docker -Argumentos (args_compose @('up', '-d', 'postgres'))
    esperar_postgres
    $encendida_aqui = $true
  }
  # Sin salto de linea: los puntos del latido siguen en ella.
  Write-Host -NoNewline 'Instalando la tractografía (unos 500 MB; puede tardar)...'
  registrar '[pantalla] Instalando la tractografía (unos 500 MB; puede tardar)...'
  $script:NG_LINEA = 1
  $script:NG_LATIDO_ACTIVO = $true
  $script:NG_LATIDO_ULTIMO = [DateTime]::Now
  $instalada = paso_tractografia
  $script:NG_LATIDO_ACTIVO = $false
  interrumpir_linea
  $script:NG_LINEA = 0
  # Solo se apaga la base que encendio esta orden, y solo si la API no esta
  # en marcha: si mientras tanto se abrio NeuroGraph, la necesita (B3).
  if ($encendida_aqui -and -not (contenedor_en_marcha "$NG_PROYECTO-api")) {
    [void](ejecutar_programa docker (args_compose @('stop', 'postgres')) -Capturar)
  }
  if ($instalada) { decir "OK  Tractografía: $($script:NG_RESUMEN)"; return }
  mostrar_fallo "AVISO  Tractografía: $($script:NG_RESUMEN)"
  throw 'NG:fallo'
}

function cmd_conectar_ia {
  # Una ventana abierta antes de instalar Docker Desktop: su docker, al PATH
  # (comprobar la conexion pregunta a Docker si NeuroGraph esta encendido).
  [void](docker_disponible)
  conectar_ias
  decir "IAs: $($script:NG_IAS_RESUMEN)"
  decir "Instrucciones: $(Join-Path $NG_DIR 'conectar-ia.md')"
}

# Desde una copia temporal (B7): asi puede borrar bin\, lib\ y este comando.
# Comparte la consola: pregunta, y la persona contesta. Por eso no va por
# ejecutar_programa, que redirige la entrada y la salida (prueba_archivos.ps1
# lo admite aqui, como lanzar_elevado).
function cmd_desinstalar {
  $copia = Join-Path $env:TEMP ('neurograph-desinstalar-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
  [void](New-Item -ItemType Directory -Force -Path (Join-Path $copia 'lib'))
  Copy-Item -LiteralPath (Join-Path $NG_DIR 'desinstalar.ps1') -Destination $copia
  # Por la extension y con -LiteralPath, como instalar_archivos.
  foreach ($f in Get-ChildItem -LiteralPath $dir_lib -File | Where-Object { $_.Extension -eq '.ps1' }) {
    Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $copia 'lib')
  }
  $argumentos = '-NoProfile -ExecutionPolicy Bypass -File ' + (citar_argumento (Join-Path $copia 'desinstalar.ps1'))
  foreach ($a in $resto) { $argumentos += ' ' + (citar_argumento $a) }
  try {
    # En esta misma consola (sin redirigir: pregunta y escribe aqui) y con
    # Process.Start: Start-Process -Wait -PassThru de 5.1 puede dar un
    # ExitCode vacio. Handle antes de esperar, para que el codigo se conserve.
    $psi = New-Object Diagnostics.ProcessStartInfo (Join-Path $PSHOME 'powershell.exe'), $argumentos
    $psi.UseShellExecute = $false
    $p = [Diagnostics.Process]::Start($psi)
    $null = $p.Handle
    $p.WaitForExit()
    return $p.ExitCode
  } finally { Remove-Item -LiteralPath $copia -Recurse -Force -ErrorAction SilentlyContinue }
}

switch ($orden) {
  'desinstalar' { exit (cmd_desinstalar) }
  { $_ -in 'ayuda', '-h', '--help', '--ayuda' } { Write-Host $uso; exit 0 }
}
ejecutar_principal $orden {
  switch ($orden) {
    'abrir' { cmd_abrir }
    'apagar' { cmd_apagar }
    'estado' { cmd_estado }
    'tractografia' { tomar_bloqueo; cmd_tractografia }
    'conectar-ia' { cmd_conectar_ia }
    default { decir "Orden desconocida: $orden"; decir $uso; $script:NG_FALLO_MOSTRADO = $true; throw 'NG:fallo' }
  }
}
exit $NG_CODIGO_SALIDA
