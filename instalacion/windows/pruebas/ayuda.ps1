# Ayudas de las pruebas de funciones del instalador Windows (B8.1 del
# diseno, H11). Se carga desde arranque.ps1, en el proceso propio de cada
# prueba. Una afirmacion que falla lanza una excepcion que empieza por FALLA:.
$NG_UTF8_PRUEBA = New-Object Text.UTF8Encoding($false)

function igual($esperado, $obtenido, [string]$descripcion) {
  if ("$esperado" -cne "$obtenido") {
    throw "FALLA: $descripcion`n      esperado: $esperado`n      obtenido: $obtenido"
  }
}
function contiene([string]$buscado, [string]$texto, [string]$descripcion) {
  if (-not $texto.Contains($buscado)) {
    throw "FALLA: $descripcion`n      no contiene: $buscado`n      texto: $texto"
  }
}
function no_contiene([string]$buscado, [string]$texto, [string]$descripcion) {
  if ($texto.Contains($buscado)) { throw "FALLA: $descripcion`n      contiene (y no debería): $buscado" }
}

function escribir_ps1([string]$ruta, [string]$texto) {  # UTF-8 con BOM, como todo .ps1
  [IO.File]::WriteAllText($ruta, $texto, (New-Object Text.UTF8Encoding($true)))
}
# Un archivo que otro proceso (el registro) tiene abierto para escribir.
function leer_compartido([string]$ruta) {
  $f = [IO.File]::Open($ruta, 'Open', 'Read', 'ReadWrite')
  try { return (New-Object IO.StreamReader($f, $NG_UTF8_PRUEBA)).ReadToEnd() } finally { $f.Dispose() }
}

# Programa falso en .cmd, delante en el PATH de la prueba.
function simular([string]$nombre, [string]$cuerpo) {
  $texto = "@echo off`r`n" + ($cuerpo -replace "`r?`n", "`r`n") + "`r`n"
  [IO.File]::WriteAllText((Join-Path $env:NG_PRUEBA_BIN "$nombre.cmd"), $texto, [Text.Encoding]::ASCII)
}
# Programa falso en .cmd que anota sus argumentos (la redireccion va delante:
# un numero al final de %* se tomaria por un descriptor).
function simular_anotando([string]$nombre, [string]$extra = '') {
  simular $nombre (">>`"$env:NG_PRUEBA_LLAMADAS\$nombre`" echo(%*`r`n" + $extra)
}
# Programa falso rapido (falso.exe, ver falso.cs) con su tabla.
function simular_tabla([string]$nombre, [string[]]$filas) {
  Copy-Item -LiteralPath (Join-Path $env:NG_PRUEBA_HERRAMIENTAS 'falso.exe') -Destination (Join-Path $env:NG_PRUEBA_BIN "$nombre.exe") -Force
  [IO.File]::WriteAllLines((Join-Path $env:NG_PRUEBA_BIN "$nombre.tabla"), $filas, $NG_UTF8_PRUEBA)
}
function eco_en_bin([string]$nombre) {
  Copy-Item -LiteralPath (Join-Path $env:NG_PRUEBA_HERRAMIENTAS 'eco.exe') -Destination (Join-Path $env:NG_PRUEBA_BIN "$nombre.exe") -Force
}
function llamadas([string]$nombre) {  # las llamadas anotadas de un programa falso
  $f = Join-Path $env:NG_PRUEBA_LLAMADAS $nombre
  if (Test-Path -LiteralPath $f) { return [IO.File]::ReadAllText($f, $NG_UTF8_PRUEBA) }
  return ''
}
# Los argumentos que recibio un programa falso de simular_tabla, como los
# separa la linea de ordenes de Windows: [uno] por linea, y una linea vacia
# entre llamadas.
function argumentos_de([string]$nombre) { return (llamadas "$nombre.argv").Trim() }

# Lanza un programa y espera: devuelve Codigo, Salida y Error. -Entrada: lo
# que recibe por la entrada estandar (en UTF-8, sin BOM), que despues se cierra.
function lanzar_prueba([string]$programa, [string]$argumentos = '', [hashtable]$Entorno = @{}, [string]$Entrada = '') {
  $psi = New-Object Diagnostics.ProcessStartInfo $programa, $argumentos
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.StandardOutputEncoding = $NG_UTF8_PRUEBA
  $psi.StandardErrorEncoding = $NG_UTF8_PRUEBA
  foreach ($k in $Entorno.Keys) { $psi.EnvironmentVariables[$k] = [string]$Entorno[$k] }
  $p = [Diagnostics.Process]::Start($psi)
  if ($Entrada) {
    $b = $NG_UTF8_PRUEBA.GetBytes($Entrada)
    $p.StandardInput.BaseStream.Write($b, 0, $b.Length)
  }
  $p.StandardInput.Close()
  $salida = $p.StandardOutput.ReadToEndAsync()
  $error_ = $p.StandardError.ReadToEndAsync()
  $p.WaitForExit()
  return [pscustomobject]@{ Codigo = $p.ExitCode; Salida = $salida.Result; Error = $error_.Result }
}

# Ejecuta un trozo de PowerShell como lo haria un ejecutable del instalador:
# comun.ps1 y las bibliotecas pedidas cargadas, dentro de ejecutar_principal
# (registro, Ctrl+C y errores). La pantalla queda en pantalla.txt, en el
# perfil de la caja; devuelve el codigo de salida.
function con_lib {
  param([string]$Cuerpo, [string[]]$Libs = @(), [hashtable]$Entorno = @{})
  $cargas = ($Libs | ForEach-Object { ". `"$env:NG_LIB\$_.ps1`"" }) -join "`n"
  $guion = @"
`$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = New-Object Text.UTF8Encoding(`$false) } catch { }
. "$env:NG_LIB\comun.ps1"
$cargas
`$NG_REPETIR = 'la prueba'
ejecutar_principal 'prueba' {
$Cuerpo
}
exit `$NG_CODIGO_SALIDA
"@
  $s = Join-Path $env:USERPROFILE 's.ps1'
  escribir_ps1 $s $guion
  $r = lanzar_prueba (Join-Path $PSHOME 'powershell.exe') "-NoProfile -ExecutionPolicy Bypass -File `"$s`"" $Entorno
  [IO.File]::WriteAllText((Join-Path $env:USERPROFILE 'pantalla.txt'), $r.Salida + $r.Error, $NG_UTF8_PRUEBA)
  return $r.Codigo
}
function pantalla { return [IO.File]::ReadAllText((Join-Path $env:USERPROFILE 'pantalla.txt'), $NG_UTF8_PRUEBA) }
function registro {  # los registros de con_lib (prueba-*.log), juntos
  $d = Join-Path $env:LOCALAPPDATA 'neurograph-app\registro'
  if (-not (Test-Path -LiteralPath $d)) { return '' }
  return (Get-ChildItem -LiteralPath $d -Filter 'prueba-*.log' | ForEach-Object { leer_compartido $_.FullName }) -join "`n"
}
function leer_valor_archivo([string]$archivo, [string]$clave) {  # sin cargar config.ps1
  if (-not (Test-Path -LiteralPath $archivo)) { return '' }
  $v = ''
  foreach ($l in [IO.File]::ReadAllLines($archivo, $NG_UTF8_PRUEBA)) { if ($l.StartsWith("$clave=")) { $v = $l.Substring($clave.Length + 1) } }
  return $v
}
function config_con([string]$texto) {  # escribe config.env (lineas con `n)
  $d = Join-Path $env:LOCALAPPDATA 'neurograph-app'
  [void](New-Item -ItemType Directory -Force -Path $d)
  [IO.File]::WriteAllText((Join-Path $d 'config.env'), $texto, $NG_UTF8_PRUEBA)
}
function estado_con([string]$texto) {
  $d = Join-Path $env:LOCALAPPDATA 'neurograph-app'
  [void](New-Item -ItemType Directory -Force -Path $d)
  [IO.File]::WriteAllText((Join-Path $d 'estado.env'), $texto, $NG_UTF8_PRUEBA)
}
function valor_config([string]$clave) { return leer_valor_archivo (Join-Path $env:LOCALAPPDATA 'neurograph-app\config.env') $clave }
function valor_estado([string]$clave) { return leer_valor_archivo (Join-Path $env:LOCALAPPDATA 'neurograph-app\estado.env') $clave }

# Un archivo de la caja con ese texto (para las variables de prueba que leen un archivo).
function archivo_con([string]$nombre, [string]$texto) {
  $f = Join-Path $env:NG_PRUEBA_CAJA $nombre
  [IO.File]::WriteAllText($f, $texto)
  return $f
}
# Un Windows que cumple todo lo del paso 1, sin WSL ni Docker Desktop; los
# cambios sustituyen a lo que se indique. Sin unidades (una carpeta vacia de
# la caja): las bibliotecas de las unidades de verdad no cuentan.
function entorno_windows([hashtable]$cambios = @{}) {
  $sin_unidades = Join-Path $env:NG_PRUEBA_CAJA 'sin-unidades'
  [void](New-Item -ItemType Directory -Force -Path $sin_unidades)
  $e = @{
    NEUROGRAPH_PRUEBA_UNIDADES = "$sin_unidades\"
    NEUROGRAPH_PRUEBA_WINDOWS = '26100 EnterpriseS AMD64 Client'; NEUROGRAPH_PRUEBA_VIRTUALIZACION = 'si'
    NEUROGRAPH_PRUEBA_LANMANSERVER = 'Automatic'; NEUROGRAPH_PRUEBA_MEMORIA_MB = '9000'; NEUROGRAPH_PRUEBA_RAM_MB = '12288'
    NEUROGRAPH_PRUEBA_ESPACIO_MB = '999999'; NEUROGRAPH_PRUEBA_DD_EN_MARCHA = 'no'; NEUROGRAPH_PRUEBA_REINICIO_PENDIENTE = 'no'
    NEUROGRAPH_PRUEBA_VERSION_WSL = (archivo_con 'version-wsl' 'ninguna')
    NEUROGRAPH_PRUEBA_DOCKER_DESKTOP = (archivo_con 'docker-desktop' 'ninguno')
    NEUROGRAPH_PRUEBA_VMMEM_MB = 'ninguno'
  }
  foreach ($k in $cambios.Keys) { $e[$k] = $cambios[$k] }
  return $e
}
# Un proyecto falso con las carpetas de .sql del paso 1 (LF, sin CR).
function raiz_falsa {
  $r = Join-Path $env:USERPROFILE 'raiz'
  foreach ($c in 'init', 'backend\database\seed', 'backend\database\migrations\generated') {
    [void](New-Item -ItemType Directory -Force -Path (Join-Path $r $c))
    [IO.File]::WriteAllText((Join-Path $r "$c\a.sql"), "BEGIN;`nselect 1;`nCOMMIT;`n")
  }
  return $r
}

# Un Docker Desktop simulado: su carpeta, con un docker.exe falso (la tabla
# que se pase) en resources\bin, delante en el PATH. Devuelve el entorno de
# entorno_windows con WSL valido y ese Docker Desktop.
function docker_desktop_simulado([string[]]$filas, [hashtable]$cambios = @{}) {
  $dd = Join-Path $env:NG_PRUEBA_BIN 'dd'
  $bin = Join-Path $dd 'resources\bin'
  [void](New-Item -ItemType Directory -Force -Path $bin)
  [IO.File]::WriteAllText((Join-Path $dd 'Docker Desktop.exe'), '')
  Copy-Item -LiteralPath (Join-Path $env:NG_PRUEBA_HERRAMIENTAS 'falso.exe') -Destination (Join-Path $bin 'docker.exe') -Force
  [IO.File]::WriteAllLines((Join-Path $bin 'docker.tabla'), $filas, $NG_UTF8_PRUEBA)
  $e = entorno_windows $cambios
  [IO.File]::WriteAllText($e.NEUROGRAPH_PRUEBA_VERSION_WSL, '2.4.13')
  [IO.File]::WriteAllText($e.NEUROGRAPH_PRUEBA_DOCKER_DESKTOP, $dd)
  $e['PATH'] = "$bin;$env:PATH"
  return $e
}
# Lo que responde un Docker Desktop sano.
$NG_DOCKER_SANO = @(
  'info --format {{.ServerVersion}}|0||27.3.1'
  'info --format {{.OSType}}|0||linux'
  'context inspect|0||npipe:////./pipe/dockerDesktopLinuxEngine'
  'version --format|0||27.3.1'
  'compose version|0||Docker Compose version v2.29.7-desktop.1'
  'buildx version|0||github.com/docker/buildx v0.17.1-desktop.1'
  'desktop stop|0||'
)

# Servidor MCP falso: responde a initialize y a tools/list con NG_MCP_FALSO
# herramientas; «calla» no responde, «cierra» sale, «sin_lista» no trae tools.
$MCP_FALSO = @'
$modo = $env:NG_MCP_FALSO
if ($modo -eq 'calla') { Start-Sleep -Seconds 60; exit 0 }
if ($modo -eq 'cierra') { exit 0 }
while ($null -ne ($l = [Console]::In.ReadLine())) {
  if ($l -match '"id":1[,}]') { [Console]::Out.WriteLine('{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18"}}') }
  elseif ($l -match '"id":2[,}]') {
    if ($modo -eq 'sin_lista') { [Console]::Out.WriteLine('{"jsonrpc":"2.0","id":2,"result":{}}') }
    else {
      $t = (1..[int]$modo | ForEach-Object { '{"name":"h' + $_ + '"}' }) -join ','
      [Console]::Out.WriteLine('{"jsonrpc":"2.0","id":2,"result":{"tools":[' + $t + ']}}')
    }
  }
  [Console]::Out.Flush()
}
'@
function mcp_falso([string]$modo) {  # -> el entorno que lo usa en lugar de neurograph-mcp.cmd
  $f = Join-Path $env:NG_PRUEBA_BIN 'mcp-falso.ps1'
  escribir_ps1 $f $MCP_FALSO
  return @{ NEUROGRAPH_PRUEBA_MCP = $f; NG_MCP_FALSO = $modo }
}

# Filas del docker falso con los recuentos de la H1 (las consultas mas largas
# primero: una mas corta puede ser parte de otra).
function filas_h1 {
  . "$env:NG_LIB\esperado.ps1"
  return @($NG_ESPERADO_CARGA | Sort-Object { -$_.Length } | ForEach-Object { $i = $_.LastIndexOf('|'); "$($_.Substring(0, $i))|0||$($_.Substring($i + 1))" })
}
# Un Docker en el que toda la instalacion va bien (pasos 3 a 9). Las filas
# «antes» mandan sobre estas. La de la tractografia va antes que las de la
# H1: su consulta contiene «select count(*) from tracts».
function docker_completo([string[]]$antes = @()) {
  return $antes + $NG_DOCKER_SANO + @(
    'context show|0||desktop-linux'
    'inspect -f {{.State.Running}}|1||'
    'ps --format|0||'
    'volume ls|0||otro'
    'run --rm --name neurograph-app-carga|0||  init/salida_mmp1.sql   OK'
    'tractography_edges|0||41 176 5176'
  ) + (filas_h1) + @(
    'cat /proc/meminfo|0||MemTotal:        6000000 kB\nMemAvailable:    5000000 kB'
    'test -d /biblioteca|0||'
    'install_tractography.sh|0||Tractografia instalada.'
    'inspect -f {{.State.OOMKilled}}|0||false'
    '[%NG_PRUEBA_CAJA%\contada]exec -i neurograph-app-api python|0||104115'
    'exec -i neurograph-app-api python|0|marca:%NG_PRUEBA_CAJA%\contada|1172'
    '*|0||'
  )
}
