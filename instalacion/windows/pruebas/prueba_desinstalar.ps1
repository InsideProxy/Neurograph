# Pruebas de desinstalar.ps1 (B7 del diseno, H11). Se lanza como la persona:
# «neurograph.cmd desinstalar», del comando instalado.
$LIBS = @('sistema', 'docker', 'puertos', 'imagenes', 'base', 'tractografia', 'mcp', 'ias', 'escritorio')
$D = Join-Path $env:LOCALAPPDATA 'neurograph-app'

function instalado {  # comandos, lib\, PATH, accesos y una IA registrada
  config_con "NG_PROYECTO=neurograph-app`nNG_BIBLIOTECA=$env:USERPROFILE\NeuroData`nNG_CONTRASENA_BASE=x`nNG_BASE_CARGADA=2026-10-10`n"
  estado_con "NG_IAS_REGISTRADAS=claude`nNG_IMAGENES_DESCARGADAS=pgvector/pgvector:pg16`n"
  [void](con_lib "`$script:NG_RAIZ = '$env:NG_RAIZ'; instalar_archivos; anadir_al_path; instalar_accesos" $LIBS)
  simular_anotando claude
}
function desinstalar([string]$opciones, [hashtable]$e) {
  $e['NEUROGRAPH_PRUEBA_SIN_PROGRAMAS'] = 'codex gemini'
  $r = lanzar_prueba (Join-Path $env:SystemRoot 'System32\cmd.exe') "/d /c `"$D\bin\neurograph.cmd`" desinstalar $opciones" $e
  [IO.File]::WriteAllText((Join-Path $env:USERPROFILE 'pantalla.txt'), $r.Salida + $r.Error)
  return $r.Codigo
}
$VOLUMEN = 'volume ls|0||neurograph-app-datos'
function existe([string]$f) { return (Test-Path -LiteralPath (Join-Path $D $f)) }
# Lo que dijo el desinstalador: de su registro (las lineas [pantalla]), que
# se conserva; su salida va a la consola sin redirigir y no se depende de ella.
function dijo { return (Get-ChildItem -LiteralPath (Join-Path $D 'registro') -Filter 'desinstalar-*.log' | ForEach-Object { leer_compartido $_.FullName }) -join "`n" }

function prueba_por_defecto_conserva_los_datos_y_quita_lo_demas {
  instalado
  $e = docker_desktop_simulado ($NG_DOCKER_SANO + @('ps -a --filter ancestor|0||', $VOLUMEN, '*|0||'))
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 's'
  igual 0 (desinstalar '' $e) 'sale con 0'
  $l = llamadas docker
  contiene 'rm -f neurograph-app-postgres neurograph-app-api neurograph-app-web neurograph-app-tractografia neurograph-app-carga' $l 'contenedores'
  contiene 'rmi neurograph-app-herramientas' $l 'imágenes propias'
  contiene 'rmi pgvector/pgvector:pg16' $l 'y la base que descargó el instalador'
  contiene 'network rm neurograph-app_default' $l 'y la red'
  no_contiene 'volume rm' $l 'el volumen se conserva'
  igual $true (existe 'config.env') 'y su configuración'
  contiene 'mcp remove neurograph -s user' (llamadas claude) 'la IA, quitada'
  foreach ($f in 'bin', 'lib', 'estado.env', 'desinstalar.ps1', 'neurograph.ps1', 'conectar-ia.md') { igual $false (existe $f) "quitado: $f" }
  igual $false (Test-Path -LiteralPath (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\NeuroGraph')) 'los accesos'
  no_contiene "$D\bin" ([string](Get-Item -LiteralPath (Join-Path $env:NEUROGRAPH_PRUEBA_HKCU 'Environment')).GetValue('Path', '', 'DoNotExpandEnvironmentNames')) 'y la entrada del PATH'
  contiene 'la base de datos (volumen neurograph-app-datos' (dijo) 'dice qué conserva'
  contiene 'Docker Desktop y WSL2' (dijo) 'y que Docker Desktop y WSL2 se quedan'
}

function prueba_con_un_no_no_se_toca_nada {
  instalado
  $e = docker_desktop_simulado ($NG_DOCKER_SANO + @('*|0||'))
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 'n'
  igual 0 (desinstalar '' $e) 'sale con 0'
  contiene 'No se ha desinstalado nada.' (dijo) 'lo dice'
  igual $true (existe 'bin\neurograph.cmd') 'todo sigue'
  no_contiene 'rm -f' (llamadas docker) 'ni Docker se toca'
}

function prueba_borrar_datos_con_borrar_borra_la_base_y_su_configuracion {
  instalado
  $e = docker_desktop_simulado ($NG_DOCKER_SANO + @('[%NG_PRUEBA_CAJA%\vol-borrado]volume ls|0||', 'volume rm|0|marca:%NG_PRUEBA_CAJA%\vol-borrado|', 'ps -a --filter ancestor|0||', $VOLUMEN, '*|0||'))
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 'BORRAR'
  igual 0 (desinstalar '--borrar-datos' $e) 'sale con 0'
  contiene 'volume rm neurograph-app-datos' (llamadas docker) 'borra el volumen'
  igual $false (existe 'config.env') 'y su configuración'
  contiene 'La base de datos se ha borrado.' (dijo) 'lo dice'
}

function prueba_otro_volumen_que_solo_cambia_en_mayusculas_no_impide_dar_la_base_por_borrada {
  instalado
  $e = docker_desktop_simulado ($NG_DOCKER_SANO + @('[%NG_PRUEBA_CAJA%\vol-borrado]volume ls|0||NEUROGRAPH-APP-DATOS', 'volume rm|0|marca:%NG_PRUEBA_CAJA%\vol-borrado|', 'ps -a --filter ancestor|0||', $VOLUMEN, '*|0||'))
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 'BORRAR'
  igual 0 (desinstalar '--borrar-datos' $e) 'sale con 0'
  contiene 'La base de datos se ha borrado.' (dijo) 'el volumen de otro nombre no es el nuestro'
}

# Lo que no se puede borrar (un archivo abierto en otro programa) se dice:
# no se da por desinstalado en silencio (B7).
function prueba_lo_que_no_se_puede_quitar_se_dice {
  instalado
  $e = docker_desktop_simulado ($NG_DOCKER_SANO + @('ps -a --filter ancestor|0||', $VOLUMEN, '*|0||'))
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 's'
  $abierto = [IO.File]::Open((Join-Path $D 'conectar-ia.md'), 'Open', 'Read', 'Read')
  try { igual 0 (desinstalar '' $e) 'sale con 0' } finally { $abierto.Dispose() }
  contiene "No se pudo quitar: $D\conectar-ia.md" (dijo) 'nombra lo que queda'
  igual $false (existe 'bin') 'lo demás se quita'
}

function prueba_borrar_datos_sin_escribir_borrar_no_borra_nada {
  instalado
  $e = docker_desktop_simulado ($NG_DOCKER_SANO + @($VOLUMEN, '*|0||'))
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 'borrar'
  igual 0 (desinstalar '--borrar-datos' $e) 'sale con 0'
  contiene 'No se ha borrado nada.' (dijo) 'lo dice'
  no_contiene 'volume rm' (llamadas docker) 'no borra'
}

function prueba_un_volumen_que_no_se_borra_se_dice_y_conserva_la_configuracion {
  instalado
  $e = docker_desktop_simulado ($NG_DOCKER_SANO + @('volume rm|1||Error response from daemon: remove neurograph-app-datos: volume is in use', 'ps -a --filter ancestor|0||', $VOLUMEN, '*|0||'))
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 'BORRAR'
  igual 1 (desinstalar '--borrar-datos' $e) 'sale con 1'
  contiene 'La base de datos no se ha borrado' (dijo) 'su frase'
  contiene 'desinstalar.ps1" --borrar-datos' (dijo) 'con la orden para repetirlo'
  igual $true (existe 'config.env') 'conserva la configuración'
  igual $true (existe 'desinstalar.ps1') 'y el desinstalador'
}

function prueba_con_docker_desktop_cerrado_se_quita_lo_demas_y_queda_el_desinstalador {
  instalado
  $e = docker_desktop_simulado (@('info|1||') + $NG_DOCKER_SANO)
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 's'
  igual 0 (desinstalar '' $e) 'sale con 0'
  contiene 'Docker Desktop no está en marcha' (dijo) 'lo dice'
  contiene 'vuelve a ejecutar' (dijo) 'y cómo terminar después'
  igual $false (existe 'bin') 'los comandos se quitan'
  igual $true (existe 'desinstalar.ps1') 'el desinstalador se queda'
  igual $true (existe 'lib\comun.ps1') 'con su lib'
  igual 'pgvector/pgvector:pg16' (valor_estado NG_IMAGENES_DESCARGADAS) 'y lo que hay que quitar de Docker'
  # Sin bin\, se repite con el desinstalador que se quedó, como dice la frase.
  $r = lanzar_prueba (Join-Path $PSHOME 'powershell.exe') "-NoProfile -ExecutionPolicy Bypass -File `"$D\desinstalar.ps1`" --borrar-datos" $e
  igual 1 $r.Codigo 'borrar los datos sin Docker para'
  contiene 'No se puede borrar la base de datos: Docker Desktop no está en marcha' (dijo) 'antes de preguntar'
}

function prueba_una_imagen_descargada_que_usa_otro_contenedor_se_conserva {
  instalado
  $e = docker_desktop_simulado ($NG_DOCKER_SANO + @('ps -a --filter ancestor=pgvector/pgvector:pg16|0||abc123', $VOLUMEN, '*|0||'))
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 's'
  igual 0 (desinstalar '' $e) 'sale con 0'
  no_contiene 'rmi pgvector' (llamadas docker) 'no se quita'
  contiene 'la imagen pgvector/pgvector:pg16, que usa otro contenedor' (dijo) 'y se dice'
}

function prueba_quita_un_runonce_pendiente {
  instalado
  $ro = $env:NEUROGRAPH_PRUEBA_HKCU + 'Software\Microsoft\Windows\CurrentVersion\RunOnce'
  [void](New-Item -Path $ro -Force)
  Set-ItemProperty -LiteralPath $ro -Name NeuroGraph -Value '"C:\x\instalar.cmd" --tras-reinicio'
  $e = docker_desktop_simulado ($NG_DOCKER_SANO + @('ps -a --filter ancestor|0||', $VOLUMEN, '*|0||'))
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 's'
  [void](desinstalar '' $e)
  igual $null (Get-ItemProperty -LiteralPath $ro -Name NeuroGraph -ErrorAction SilentlyContinue) 'quitado'
}
