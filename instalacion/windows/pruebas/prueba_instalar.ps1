# Pruebas de instalar.cmd e instalar.ps1 (bloque A del diseno, H11).
$CMD = Join-Path $env:NG_RAIZ 'instalacion\windows\instalar.cmd'
$PS1 = Join-Path $env:NG_RAIZ 'instalacion\windows\instalar.ps1'
function por_cmd([string]$argumentos, [hashtable]$e = @{}) {
  $e['NEUROGRAPH_PRUEBA_SIN_PAUSA'] = '1'
  return lanzar_prueba (Join-Path $env:SystemRoot 'System32\cmd.exe') "/d /s /c `"`"$CMD`" $argumentos`"" $e
}
function por_ps1([hashtable]$e, [string]$argumentos = '') {
  $r = lanzar_prueba (Join-Path $PSHOME 'powershell.exe') "-NoProfile -ExecutionPolicy Bypass -File `"$PS1`" $argumentos" $e
  [IO.File]::WriteAllText((Join-Path $env:USERPROFILE 'pantalla.txt'), $r.Salida + $r.Error)
  return $r.Codigo
}

function prueba_los_argumentos_llegan_por_cmd_y_powershell {
  $r = por_cmd '--biblioteca "C:\Mis datos\Neuro Data"' @{ NEUROGRAPH_PRUEBA_SOLO_ARGUMENTOS = '1' }
  igual 0 $r.Codigo 'sale con 0'
  contiene 'biblioteca=C:\Mis datos\Neuro Data tras-reinicio=False' $r.Salida 'la ruta con espacios, entera'
  $r = por_cmd '--tras-reinicio' @{ NEUROGRAPH_PRUEBA_SOLO_ARGUMENTOS = '1' }
  contiene 'tras-reinicio=True' $r.Salida 'la opción interna del reinicio'
  $libre = [char[]](70..90) | Where-Object { -not (Test-Path "$($_):\") } | Select-Object -Last 1
  $r = por_cmd "--biblioteca ${libre}:\NeuroData" @{ NEUROGRAPH_PRUEBA_SOLO_ARGUMENTOS = '1' }
  contiene "biblioteca=${libre}:\NeuroData tras-reinicio" $r.Salida 'un disco desconectado no rompe al leer la opción'
}

function prueba_una_biblioteca_con_caracteres_no_validos_da_su_frase {
  igual 1 (por_ps1 @{} '--biblioteca "C:\Datos\a|b"') 'sale con 1'
  contiene 'La ruta de la biblioteca (C:\Datos\a|b) lleva un carácter que Windows no admite' (pantalla) 'con su frase, no un error de PowerShell'
}

function prueba_una_directiva_de_grupo_y_la_marca_de_internet_paran_con_su_frase {
  # Una directiva de grupo de verdad (la del usuario), solo durante la prueba:
  # manda sobre -ExecutionPolicy Bypass, y RemoteSigned no deja ejecutar los
  # .ps1 con la marca de internet de un ZIP descargado. Sobre una copia de
  # instalacion\windows, para no marcar el proyecto.
  $claves = 'HKCU:\Software\Policies\Microsoft', 'HKCU:\Software\Policies\Microsoft\Windows', 'HKCU:\Software\Policies\Microsoft\Windows\PowerShell'
  if (Test-Path -LiteralPath $claves[2]) { throw "FALLA: precondición: ya hay una directiva de PowerShell en $($claves[2]); no se toca" }
  $nuevas = @($claves | Where-Object { -not (Test-Path -LiteralPath $_) })
  $copia = Join-Path $env:USERPROFILE 'windows'
  Copy-Item -LiteralPath (Join-Path $env:NG_RAIZ 'instalacion\windows') -Destination $copia -Recurse
  $ps1 = @(Get-ChildItem -LiteralPath $copia -Recurse -File | Where-Object { $_.Extension -eq '.ps1' })
  foreach ($f in $ps1) { Set-Content -LiteralPath $f.FullName -Stream Zone.Identifier -Value "[ZoneTransfer]`r`nZoneId=3" }
  $lanzar = { lanzar_prueba (Join-Path $env:SystemRoot 'System32\cmd.exe') "/d /s /c `"`"$copia\instalar.cmd`" --ayuda`"" @{ NEUROGRAPH_PRUEBA_SIN_PAUSA = '1' } }
  igual 0 (& $lanzar).Codigo 'sin directiva, la marca no para: -ExecutionPolicy Bypass'
  try {
    [void](New-Item -Path $claves[2] -Force)
    Set-ItemProperty -LiteralPath $claves[2] -Name EnableScripts -Value 1 -Type DWord
    Set-ItemProperty -LiteralPath $claves[2] -Name ExecutionPolicy -Value RemoteSigned
    $r = & $lanzar
    igual 1 $r.Codigo 'con la directiva y la marca, para'
    contiene 'no deja los descargados de internet' $r.Salida 'con su frase'
    foreach ($f in $ps1) { Remove-Item -LiteralPath $f.FullName -Stream Zone.Identifier }
    igual 0 (& $lanzar).Codigo 'con la directiva y sin la marca, sigue'
  } finally {
    # Sin restos: la directiva y las claves que no estaban.
    for ($i = $nuevas.Count - 1; $i -ge 0; $i--) { Remove-Item -LiteralPath $nuevas[$i] -Recurse -Force -ErrorAction SilentlyContinue }
  }
  igual $false (Test-Path -LiteralPath $claves[2]) 'la directiva de la prueba se quita'
}

function prueba_opciones_desconocidas_y_ayuda {
  $r = por_cmd '--otra'
  igual 1 $r.Codigo 'una opción desconocida sale con 1'
  # Con su tilde: con la salida redirigida, comun.ps1 escribe en UTF-8.
  contiene 'Opción desconocida: --otra' $r.Salida 'y lo dice'
  $r = por_cmd '--ayuda'
  igual 0 $r.Codigo 'la ayuda sale con 0'
  contiene 'Uso: instalar.cmd [--biblioteca RUTA]' $r.Salida 'con el uso'
}

function prueba_la_biblioteca_guardada_se_usa_sin_opcion {
  config_con "NG_BIBLIOTECA=D:\Guardada`n"
  $r = por_cmd '' @{ NEUROGRAPH_PRUEBA_SOLO_ARGUMENTOS = '1' }
  contiene 'biblioteca=D:\Guardada' $r.Salida 'la de config.env'
  config_con ''
  $r = por_cmd '' @{ NEUROGRAPH_PRUEBA_SOLO_ARGUMENTOS = '1' }
  contiene 'biblioteca= tras-reinicio' $r.Salida 'y si no hay, ninguna todavía: se elige en el paso 1'
}

# Una instalacion en la que todo responde (pasos 1 a 9), sin IAs. Con el
# proyecto entero: el paso 1 lee los .sql reales del proyecto (init\ y
# backend\database\).
function entorno_completo([string[]]$antes = @()) {
  simular_tabla curl @('-w|0||200', '-sf http://127.0.0.1:5173/|0||<div id="root"></div>', '*|0||')
  $e = (docker_desktop_simulado (docker_completo $antes)) + (mcp_falso '12')
  $e['NEUROGRAPH_PRUEBA_PUERTOS_ESCUCHANDO'] = 'ninguno'
  $e['NEUROGRAPH_PRUEBA_SIN_PROGRAMAS'] = 'claude codex gemini'
  return $e
}

function prueba_la_instalacion_completa_con_todo_simulado {
  igual 0 (por_ps1 (entorno_completo)) 'sale con 0'
  foreach ($n in 1..9) { contiene "[$n/9]" (pantalla) "paso $n" }
  contiene '[7/9] Cargando datos (24 archivos)' (pantalla) 'el título del paso 7'
  contiene 'NeuroGraph está instalado y encendido.' (pantalla) 'la pantalla final'
  contiene '1172 regiones · 104115 conexiones · tractografía: 41 tractos, 176 nodos' (pantalla) 'con los datos'
  igual completa (valor_estado NG_INSTALACION) 'estado completo'
  igual $true (Test-Path (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\NeuroGraph\NeuroGraph.lnk')) 'con sus accesos'
}

function prueba_ctrl_c_en_el_paso_5_quita_lo_de_esta_ejecucion {
  $marca = Join-Path $env:USERPROFILE 'ctrl-c'
  $e = entorno_completo @('image inspect neurograph-app-api|1||', "build --builder desktop-linux --progress plain -t neurograph-app-web|0|marca:$marca,espera:30|")
  $e['NEUROGRAPH_PRUEBA_CTRL_C'] = $marca
  igual 130 (por_ps1 $e) 'sale con 130'
  contiene 'Interrumpido. Puedes volver a ejecutar el instalador' (pantalla) 'dice qué repetir'
  $l = llamadas docker
  contiene 'rmi neurograph-app-api' $l 'quita la imagen nueva de esta ejecución'
  no_contiene 'rmi neurograph-app-web' $l 'y no las que ya estaban'
  igual incompleta (valor_estado NG_INSTALACION) 'queda incompleta'
}

# Con el instalador entero (su al_salir_extra) y no con la funcion sola: la
# limpieza de la tractografia tiene que estar enganchada a la salida.
function prueba_ctrl_c_en_el_paso_8_para_la_tractografia_y_conserva_la_base {
  $marca = Join-Path $env:USERPROFILE 'ctrl-c'
  $e = entorno_completo @("install_tractography.sh|0|marca:$marca,espera:30|")
  $e['NEUROGRAPH_PRUEBA_CTRL_C'] = $marca
  igual 130 (por_ps1 $e) 'sale con 130'
  contiene 'Interrumpido. Puedes volver a ejecutar el instalador' (pantalla) 'dice qué repetir'
  $l = llamadas docker
  contiene 'kill neurograph-app-tractografia' $l 'para el contenedor de la tractografía'
  contiene "pg_terminate_backend(pid) from pg_stat_activity where application_name='neurograph_tractografia'" $l 'y el psql de la carga'
  igual pendiente (valor_estado NG_TRACTOGRAFIA) 'la tractografía queda pendiente'
  contiene 'Interrumpida' (valor_estado NG_TRACTOGRAFIA_MOTIVO) 'con su motivo'
  no_contiene 'volume rm' $l 'con la carga hecha, la base se conserva'
  no_contiene 'rmi ' $l 'y las imágenes'
  igual incompleta (valor_estado NG_INSTALACION) 'la instalación queda incompleta'
  igual 0 @(Get-ChildItem -LiteralPath $env:TEMP -Force | Where-Object { $_.Name -like 'neurograph-tracto-*' }).Count 'sin temporales de la tractografía (su salida y sus eventos)'
}

function prueba_un_fallo_en_el_paso_7_quita_el_volumen_nuevo {
  $e = entorno_completo @('run --rm --name neurograph-app-carga|1||  init/salida_mmp1.sql   ERROR')
  igual 1 (por_ps1 $e) 'sale con 1'
  contiene 'Falló la carga de los datos iniciales en init/salida_mmp1.sql' (pantalla) 'su frase'
  contiene 'volume rm neurograph-app-datos' (llamadas docker) 'el volumen nuevo y sin carga se quita'
}

function prueba_una_tractografia_que_falla_no_detiene_la_instalacion {
  $e = entorno_completo @('install_tractography.sh|1||ERROR: no se pudo descargar de https://zenodo.org/x (curl 6; al repetir, sigue donde se quedo): ORG-800FiberClusters.zip')
  igual 0 (por_ps1 $e) 'sale con 0'
  contiene 'tractografía: pendiente - No se pudo descargar un archivo de Zenodo (ORG-800FiberClusters.zip)' (pantalla) 'pendiente, con su motivo'
  no_contiene 'volume rm' (llamadas docker) 'con la carga hecha, nada se quita'
}

# Lee los .sql reales del proyecto en el paso 1, como la anterior.
function prueba_el_reinicio_sale_con_3010_y_despues_sigue_en_el_paso_2 {
  simular_tabla shutdown @('*|0||')
  $e = entorno_completo
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 's'
  # Sin WSL ni Docker Desktop: el proceso elevado falso los deja y pide reiniciar.
  [IO.File]::WriteAllText($e.NEUROGRAPH_PRUEBA_VERSION_WSL, 'ninguna')
  [IO.File]::WriteAllText($e.NEUROGRAPH_PRUEBA_DOCKER_DESKTOP, 'ninguno')
  $dd = Join-Path $env:NG_PRUEBA_BIN 'dd'
  simular_tabla elevado @("*|3010|escribe:$($e.NEUROGRAPH_PRUEBA_DOCKER_DESKTOP)=$dd,escribe:$($e.NEUROGRAPH_PRUEBA_VERSION_WSL)=2.4.13|")
  $e['NEUROGRAPH_PRUEBA_ELEVADO'] = Join-Path $env:NG_PRUEBA_BIN 'elevado.exe'
  simular_tabla curl @('desktop.docker.com/win|0|marca:%LOCALAPPDATA%\neurograph-app\descargas\Docker Desktop Installer.exe.part|', '-w|0||200', '-sf http://127.0.0.1:5173/|0||<div id="root"></div>', '*|0||')
  igual 3010 (por_ps1 $e) 'sale con 3010'
  no_contiene '[3/9]' (pantalla) 'sin seguir con el paso 3'
  $orden = (Get-ItemProperty -LiteralPath ($env:NEUROGRAPH_PRUEBA_HKCU + 'Software\Microsoft\Windows\CurrentVersion\RunOnce')).NeuroGraph
  contiene '--tras-reinicio' $orden 'RunOnce apuntado'
  # Tras el reinicio: lo que lanza RunOnce.
  igual 0 (por_ps1 $e '--tras-reinicio') 'tras el reinicio, termina'
  contiene 'Continuando la instalación de NeuroGraph tras el reinicio' (pantalla) 'lo dice'
  no_contiene '[1/9]' (pantalla) 'sin repetir el paso 1'
  contiene 'NeuroGraph está instalado y encendido.' (pantalla) 'y llega al final'
  # Con NEUROGRAPH_PRUEBA_RESPUESTA, preguntar_si solo anota «pregunta: ... -> s».
  igual 1 ([regex]::Matches((registro_de_instalar), 'pregunta: ¿Usar esta carpeta\? ->').Count) 'la biblioteca se preguntó una sola vez'
}
function registro_de_instalar {
  return (Get-ChildItem -LiteralPath (Join-Path $env:LOCALAPPDATA 'neurograph-app\registro') -Filter 'instalar-*.log' | ForEach-Object { leer_compartido $_.FullName }) -join "`n"
}
