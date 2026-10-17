# Pruebas del comando diario (B3 del diseno, H11).
$PS1 = Join-Path $env:NG_RAIZ 'instalacion\windows\plantillas\neurograph.ps1'
function neurograph([string]$argumentos, [hashtable]$e = @{}) {
  $r = lanzar_prueba (Join-Path $PSHOME 'powershell.exe') "-NoProfile -ExecutionPolicy Bypass -File `"$PS1`" $argumentos" $e
  [IO.File]::WriteAllText((Join-Path $env:USERPROFILE 'pantalla.txt'), $r.Salida + $r.Error)
  return $r.Codigo
}
function registro_de([string]$orden) {
  return (Get-ChildItem -LiteralPath (Join-Path $env:LOCALAPPDATA 'neurograph-app\registro') -Filter "$orden-*.log" | ForEach-Object { leer_compartido $_.FullName }) -join "`n"
}
$ESCUCHA = @{ NEUROGRAPH_PRUEBA_PUERTOS_ESCUCHANDO = 'ninguno' }
# El PATH de una ventana abierta antes de instalar Docker Desktop: el de la
# prueba sin ninguna carpeta con un docker.exe (en una VM con Docker Desktop
# instalado de verdad, el suyo esta en el PATH del sistema).
function path_sin_docker { return (@($env:PATH -split ';' | Where-Object { $_ -and -not (Test-Path -LiteralPath (Join-Path $_ 'docker.exe')) }) -join ';') }
# Con una consola de entrada (oculta, sin redirigir nada), como la que tendria
# delante: si preguntara, se quedaria esperando una tecla. A los 60 s se para
# y cuenta como fallo. Lo que dijo, en su registro.
function neurograph_con_consola([string]$argumentos, [hashtable]$e) {
  $psi = New-Object Diagnostics.ProcessStartInfo (Join-Path $PSHOME 'powershell.exe'), "-NoProfile -ExecutionPolicy Bypass -File `"$PS1`" $argumentos"
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  foreach ($k in $e.Keys) { $psi.EnvironmentVariables[$k] = [string]$e[$k] }
  $p = [Diagnostics.Process]::Start($psi)
  if (-not $p.WaitForExit(60000)) {
    & (Join-Path $env:SystemRoot 'System32\taskkill.exe') /T /F /PID $p.Id | Out-Null
    throw "FALLA: neurograph $argumentos se quedó esperando una respuesta"
  }
  return $p.ExitCode
}

function prueba_sin_orden_el_uso_y_una_desconocida_sale_con_1 {
  igual 0 (neurograph '') 'sin orden, sale con 0'
  contiene 'Uso: neurograph abrir | apagar | estado | tractografia | conectar-ia | desinstalar' (pantalla) 'el uso'
  igual 1 (neurograph 'otra') 'una desconocida, con 1'
  contiene 'Orden desconocida: otra' (pantalla) 'y lo dice'
}

function prueba_abrir_en_marcha_solo_abre_el_navegador {
  config_con "NG_WEB_PUERTO=5174`nNG_API_PUERTO=8421`n"
  $e = docker_desktop_simulado (@('inspect -f {{.State.Running}} neurograph-app-web|0||true') + $NG_DOCKER_SANO)
  simular_tabla curl @('*|0||')
  igual 0 (neurograph 'abrir' $e) 'sale con 0'
  contiene 'http://127.0.0.1:5174' (llamadas aplicaciones) 'abre el navegador en su puerto'
  no_contiene 'compose' (llamadas docker) 'sin encender nada'
}

function prueba_abrir_apagado_lo_enciende {
  config_con "NG_WEB_PUERTO=5173`nNG_API_PUERTO=8420`n"
  $e = (docker_desktop_simulado (@('inspect -f {{.State.Running}}|0||false', 'ps --format|0||') + $NG_DOCKER_SANO + @('*|0||'))) + $ESCUCHA
  simular_tabla curl @('*|0||')
  igual 0 (neurograph 'abrir' $e) 'sale con 0'
  contiene 'up -d postgres' (llamadas docker) 'enciende la base'
  contiene 'http://127.0.0.1:5173' (llamadas aplicaciones) 'y abre el navegador'
}

function prueba_abrir_con_docker_desktop_cerrado_lo_abre_y_espera {
  config_con "NG_WEB_PUERTO=5173`nNG_API_PUERTO=8420`n"
  $abierto = '[%NG_PRUEBA_CAJA%\abierto-Docker Desktop.exe]'
  $e = (docker_desktop_simulado (@("${abierto}info --format {{.ServerVersion}}|0||27.3.1", 'info --format {{.ServerVersion}}|1||', 'inspect -f {{.State.Running}}|0||false', 'ps --format|0||') + $NG_DOCKER_SANO + @('*|0||'))) + $ESCUCHA
  simular_tabla curl @('*|0||')
  igual 0 (neurograph 'abrir' $e) 'sale con 0'
  contiene 'Docker Desktop.exe' (llamadas aplicaciones) 'abre Docker Desktop'
  contiene 'http://127.0.0.1:5173' (llamadas aplicaciones) 'y después NeuroGraph'
}

function prueba_apagar_para_los_contenedores {
  $e = docker_desktop_simulado ($NG_DOCKER_SANO + @('*|0||'))
  igual 0 (neurograph 'apagar' $e) 'sale con 0'
  contiene ' stop' (llamadas docker) 'compose stop'
  contiene 'NeuroGraph apagado. Tus datos se conservan.' (pantalla) 'lo dice'
}

function prueba_una_ventana_sin_docker_en_el_path_lo_encuentra {
  # Abierta antes de instalar Docker Desktop: su carpeta no esta en el PATH.
  $e = docker_desktop_simulado ($NG_DOCKER_SANO + @('*|0||'))
  $e['PATH'] = path_sin_docker
  igual 0 (neurograph 'apagar' $e) 'sale con 0'
  contiene ' stop' (llamadas docker) 'con el docker de Docker Desktop'
}

function prueba_tractografia_con_el_disco_de_la_biblioteca_desconectado {
  $libre = [char[]](70..90) | Where-Object { -not (Test-Path "$($_):\") } | Select-Object -Last 1
  config_con "NG_BIBLIOTECA=${libre}:\NeuroData`n"
  $e = docker_desktop_simulado ($NG_DOCKER_SANO + @('*|0||'))
  igual 1 (neurograph 'tractografia' $e) 'sale con 1'
  contiene '¿es un disco desconectado?' (pantalla) 'lo dice con su frase (B2)'
  no_contiene 'install_tractography.sh' (llamadas docker) 'sin lanzarla'
}

function prueba_desde_un_acceso_no_se_pregunta_y_un_fallo_sale_en_un_cuadro {
  $e = entorno_windows  # sin Docker Desktop
  simular_tabla docker @('*|1||')
  igual 1 (neurograph_con_consola 'abrir --escritorio' $e) 'sale con 1'
  contiene '[cuadro de mensaje] Docker Desktop no está en marcha' (registro_de 'abrir') 'el fallo, en un cuadro de mensaje'
  # Una orden que pregunta: con --escritorio no lo hace, ni con una consola delante (B3).
  simular_tabla claude @('*|0||')
  igual 0 (neurograph_con_consola 'conectar-ia --escritorio' ($e + @{ NEUROGRAPH_PRUEBA_SIN_PROGRAMAS = 'codex gemini' })) 'sale con 0'
  contiene 'sin consola: no se pregunta «¿Conectar NeuroGraph con Claude Code?»' (registro_de 'conectar-ia') 'no pregunta'
  no_contiene 'esperando respuesta' ((registro_de 'abrir') + (registro_de 'conectar-ia')) 'ni espera una respuesta'
}

# Una ventana abierta antes de instalar Docker Desktop: conectar-ia
# encuentra su docker, como abrir y apagar.
function prueba_conectar_ia_sin_docker_en_el_path_lo_encuentra {
  $e = docker_desktop_simulado (@('inspect -f {{.State.Running}} neurograph-app-api|0||true') + $NG_DOCKER_SANO + @('*|0||'))
  $e['PATH'] = path_sin_docker
  $e['NEUROGRAPH_PRUEBA_SIN_PROGRAMAS'] = 'codex gemini'
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 's'
  simular_tabla claude @('mcp list|0||neurograph: cmd.exe /c x - ✓ Connected', '*|0||')
  igual 0 (neurograph 'conectar-ia' $e) 'sale con 0'
  contiene 'IAs: Claude Code: conectado' (pantalla) 'comprueba la conexión con el docker de Docker Desktop'
}

function prueba_el_cmd_no_se_rompe_si_la_orden_lo_borra {
  # neurograph.cmd en bin\ y, en la carpeta de arriba, un neurograph.ps1 que
  # sale con 3: primero sin borrar el .cmd y despues borrandolo.
  $raiz = Join-Path $env:USERPROFILE 'ng'
  [void](New-Item -ItemType Directory -Force -Path "$raiz\bin")
  Copy-Item -LiteralPath (Join-Path $env:NG_RAIZ 'instalacion\windows\plantillas\neurograph.cmd') -Destination "$raiz\bin\neurograph.cmd"
  escribir_ps1 "$raiz\neurograph.ps1" 'exit 3'
  $r = lanzar_prueba (Join-Path $env:SystemRoot 'System32\cmd.exe') "/d /c `"$raiz\bin\neurograph.cmd`" estado"
  igual 3 $r.Codigo 'sin borrarse, también el código de PowerShell'
  escribir_ps1 "$raiz\neurograph.ps1" "Remove-Item -LiteralPath '$raiz\bin\neurograph.cmd'; exit 3"
  $r = lanzar_prueba (Join-Path $env:SystemRoot 'System32\cmd.exe') "/d /c `"$raiz\bin\neurograph.cmd`" desinstalar"
  igual 3 $r.Codigo 'devuelve el código de PowerShell'
  igual $false (Test-Path "$raiz\bin\neurograph.cmd") 'el .cmd se borró'
  igual '' ($r.Salida + $r.Error).Trim() 'sin «no se encuentra el archivo por lotes»'
}
