# Ejecuta las pruebas de funciones del instalador Windows (B8.1 del diseno,
# H11), en Windows PowerShell 5.1. Cada prueba (funcion prueba_*) corre en su
# propio proceso de PowerShell, con una caja aparte: USERPROFILE,
# LOCALAPPDATA, APPDATA, ProgramData y TEMP propios (ProgramFiles no: Windows
# lo rehace al arrancar cada proceso; lo que escribe alli el proceso elevado
# va a NEUROGRAPH_PRUEBA_PROGRAMFILES), el registro de Windows
# del usuario bajo HKCU:\Software\NeuroGraphPruebas y los programas falsos
# delante en el PATH. Nunca toca la configuracion real ni Docker, WSL o las
# IAs de verdad (NEUROGRAPH_PRUEBA_SOLO_SIMULADOS).
#
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File ejecutar.ps1 [prueba_x.ps1...]
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = New-Object Text.UTF8Encoding($false) } catch { }
$DIR_PRUEBAS = $PSScriptRoot
# GetFullPath y no Resolve-Path: no falla si lib\ no existe.
$NG_LIB = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\lib'))
$NG_RAIZ = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..')).Path
$BASE = Join-Path $env:TEMP 'neurograph-pruebas'
$HERRAMIENTAS = Join-Path $BASE 'herramientas'
$CLAVES = 'HKCU:\Software\NeuroGraphPruebas'
$utf8 = New-Object Text.UTF8Encoding($false)

# Los programas de las pruebas se compilan una vez por ejecucion.
if (Test-Path -LiteralPath $HERRAMIENTAS) { Remove-Item -LiteralPath $HERRAMIENTAS -Recurse -Force }
[void](New-Item -ItemType Directory -Force -Path $HERRAMIENTAS)
foreach ($n in 'falso', 'eco') {
  Add-Type -Path (Join-Path $DIR_PRUEBAS "$n.cs") -OutputAssembly (Join-Path $HERRAMIENTAS "$n.exe") -OutputType ConsoleApplication
}

$archivos = @()
if ($args.Count -gt 0) { foreach ($a in $args) { $archivos += [IO.Path]::GetFullPath($a) } }
else { $archivos = @(Get-ChildItem -LiteralPath $DIR_PRUEBAS -Filter 'prueba_*.ps1' | Sort-Object Name | ForEach-Object { $_.FullName }) }

$total = 0
$fallos = 0
foreach ($archivo in $archivos) {
  $pruebas = @()
  $errores = $null
  $tokens = $null
  if (Test-Path -LiteralPath $archivo -PathType Leaf) {
    $ast = [Management.Automation.Language.Parser]::ParseFile($archivo, [ref]$tokens, [ref]$errores)
    if (-not $errores) {
      $pruebas = @($ast.FindAll({ param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -like 'prueba_*' }, $false) | ForEach-Object { $_.Name })
    }
  }
  if ($pruebas.Count -eq 0) {
    # Un archivo que no existe, no carga o no tiene pruebas es un fallo, no un exito vacio.
    $total++
    $fallos++
    Write-Output "FALLA ${archivo}: no existe, no carga o no tiene pruebas"
    foreach ($e in @($errores)) { if ($e) { Write-Output "      $($e.Extent.StartLineNumber): $($e.Message)" } }
    continue
  }
  foreach ($prueba in $pruebas) {
    $total++
    $caja = Join-Path $BASE ('caja.' + [guid]::NewGuid().ToString('N').Substring(0, 8))
    foreach ($d in 'perfil', 'local', 'roaming', 'pf', 'pd', 'bin', 'llamadas', 'tmp') {
      [void](New-Item -ItemType Directory -Force -Path (Join-Path $caja $d))
    }
    $clave = Join-Path $CLAVES (Split-Path -Leaf $caja)
    $psi = New-Object Diagnostics.ProcessStartInfo (Join-Path $PSHOME 'powershell.exe'), ('-NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $DIR_PRUEBAS 'arranque.ps1') + '" -Archivo "' + $archivo + '" -Prueba ' + $prueba)
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.StandardOutputEncoding = $utf8
    $psi.StandardErrorEncoding = $utf8
    $psi.WorkingDirectory = Join-Path $caja 'perfil'
    $entorno = @{
      USERPROFILE = (Join-Path $caja 'perfil'); LOCALAPPDATA = (Join-Path $caja 'local'); APPDATA = (Join-Path $caja 'roaming')
      ProgramData = (Join-Path $caja 'pd'); TEMP = (Join-Path $caja 'tmp'); TMP = (Join-Path $caja 'tmp')
      PATH = (Join-Path $caja 'bin') + ';' + $env:PATH
      NG_PRUEBA_CAJA = $caja; NG_PRUEBA_BIN = (Join-Path $caja 'bin'); NG_PRUEBA_LLAMADAS = (Join-Path $caja 'llamadas')
      NG_PRUEBA_HERRAMIENTAS = $HERRAMIENTAS; NG_LIB = $NG_LIB; NG_RAIZ = $NG_RAIZ
      NEUROGRAPH_PRUEBA_HKCU = "$clave\"; NEUROGRAPH_PRUEBA_SOLO_SIMULADOS = $caja
      # La carpeta de Archivos de programa del proceso elevado (Seguridad del diseno).
      NEUROGRAPH_PRUEBA_PROGRAMFILES = (Join-Path $caja 'pf')
    }
    # Ninguna variable de prueba heredada de la cuenta (una medicion puede
    # dejar una en ella): solo las de cada prueba.
    foreach ($k in @($psi.EnvironmentVariables.Keys)) { if ($k -like 'NEUROGRAPH_PRUEBA_*') { $psi.EnvironmentVariables.Remove($k) } }
    foreach ($k in $entorno.Keys) { $psi.EnvironmentVariables[$k] = $entorno[$k] }
    $p = [Diagnostics.Process]::Start($psi)
    $p.StandardInput.Close()
    $salida = $p.StandardOutput.ReadToEndAsync()
    $errorp = $p.StandardError.ReadToEndAsync()
    $colgada = -not $p.WaitForExit(300000)
    if ($colgada) { & (Join-Path $env:SystemRoot 'System32\taskkill.exe') /T /F /PID $p.Id | Out-Null }
    $p.WaitForExit()
    if ($p.ExitCode -eq 0 -and -not $colgada) {
      Write-Output "ok    $prueba"
    } else {
      $fallos++
      Write-Output ("FALLA $prueba" + $(if ($colgada) { ' (colgada: más de 300 s)' } else { '' }))
      (($salida.Result + $errorp.Result) -split "`r?`n") | Where-Object { $_ } | ForEach-Object { Write-Output "      $_" }
    }
    Remove-Item -LiteralPath $caja -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $clave) { Remove-Item -LiteralPath $clave -Recurse -Force }
  }
}
Write-Output ''
Write-Output "$total pruebas, $fallos fallos"
# Sin restos: ni herramientas, ni cajas, ni claves de pruebas.
Remove-Item -LiteralPath $HERRAMIENTAS -Recurse -Force -ErrorAction SilentlyContinue
if ((Test-Path -LiteralPath $CLAVES) -and -not (Get-ChildItem -LiteralPath $CLAVES)) { Remove-Item -LiteralPath $CLAVES }
if ((Test-Path -LiteralPath $BASE) -and -not (Get-ChildItem -LiteralPath $BASE)) { Remove-Item -LiteralPath $BASE }
if ($fallos -gt 0) { exit 1 }
exit 0
