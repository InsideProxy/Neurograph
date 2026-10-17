# Pruebas de ejecutar_programa («Lanzar programas desde PowerShell» y B1 del diseno, H11).
. "$env:NG_LIB\comun.ps1"
iniciar_registro prueba
function registro_ahora { return leer_compartido $NG_REGISTRO }
function pings_vivos([string]$marca) {  # los ping.exe con esa linea de ordenes
  return @(Get-CimInstance Win32_Process -Filter "Name = 'PING.EXE'" | Where-Object { $_.CommandLine -like "*$marca*" }).Count
}

function prueba_codigo_y_las_dos_salidas_al_registro {
  simular dos 'echo uno-salida& echo dos-error 1>&2& exit /b 3'
  $r = ejecutar_programa dos
  igual 3 $r.Codigo 'el código de salida se devuelve'
  contiene 'uno-salida' (registro_ahora) 'la salida estándar va al registro'
  contiene 'dos-error' (registro_ahora) 'y la de errores'
}

function prueba_utf8_se_lee_bien {
  simular_tabla acentos @('*|0||días, ñandú y «comillas»')
  [void](ejecutar_programa acentos)
  contiene 'días, ñandú y «comillas»' (registro_ahora) 'UTF-8 por defecto'
}

function prueba_wsl_en_utf16_se_lee_con_wsl_utf8 {
  simular_tabla wsl @('*|0|utf16|Versión de WSL: 2.4.13')
  [void](ejecutar_programa wsl @('--version') -Entorno @{ WSL_UTF8 = '1' })
  contiene 'Versión de WSL: 2.4.13' (registro_ahora) 'con WSL_UTF8=1, wsl escribe UTF-8'
  [void](ejecutar_programa wsl @('--version') -Codificacion unicode)
  igual 2 ([regex]::Matches((registro_ahora), 'Versión de WSL: 2\.4\.13').Count) 'sin ella escribe UTF-16, que también se lee'
}

function prueba_los_argumentos_llegan_intactos {
  eco_en_bin eco
  $lista = @('simple', 'con espacio', 'comilla"dentro', 'barra\final\', 'C:\ruta con espacio\', '', 'días ñ', 'a\\"b', '{{.State.Running}}')
  $r = ejecutar_programa eco $lista -Capturar
  igual $lista.Count $r.Codigo 'el número de argumentos'
  igual (($lista | ForEach-Object { "[$_]" }) -join "`n") ($r.Salida -join "`n") 'cada argumento, tal cual'
}

function prueba_la_entrada_va_sin_bom {
  # Con la consola en UTF-8 con BOM (tras un chcp 65001), .NET Framework lo
  # mandaria delante de la entrada y romperia el MCP y el ALTER ROLE.
  try { [Console]::InputEncoding = [Text.Encoding]::UTF8 } catch { }
  # Si la consola no quedara asi, la prueba pasaria sin probar nada.
  if ([Console]::InputEncoding.GetPreamble().Length -eq 0) { throw 'FALLA: precondición: la entrada de la consola no quedó en UTF-8 con BOM' }
  eco_en_bin eco
  $r = ejecutar_programa eco @('--entrada') -Entrada '{"a":1}' -Capturar
  igual '7B2261223A317D' ($r.Salida -join '') 'solo los bytes del texto'
}

function prueba_capturar_devuelve_la_salida_sin_anotarla {
  simular_tabla valor @('*|0||valor-capturado-123')
  simular dos 'echo error-anotado-456 1>&2'
  $r = ejecutar_programa valor -Capturar
  igual 'valor-capturado-123' ($r.Salida -join '') 'la salida se devuelve'
  no_contiene 'valor-capturado-123' (registro_ahora) 'y no va al registro'
  [void](ejecutar_programa dos -Capturar)
  contiene 'error-anotado-456' (registro_ahora) 'la de errores sí va al registro'
}

function prueba_copia_de_la_salida_en_un_archivo {
  simular dos 'echo linea-uno& echo linea-dos 1>&2'
  $f = Join-Path $env:USERPROFILE 'copia.txt'
  [void](ejecutar_programa dos -Copia $f)
  $t = [IO.File]::ReadAllText($f)
  contiene 'linea-uno' $t 'la salida estándar'
  contiene 'linea-dos' $t 'y la de errores, para clasificarlas'
}

function prueba_el_tiempo_maximo_termina_el_programa_y_sus_hijos {
  simular lento 'ping -n 47 127.0.0.1 > nul'
  $reloj = [Diagnostics.Stopwatch]::StartNew()
  $r = ejecutar_programa lento -TiempoMax 2
  igual $true $r.TiempoAgotado 'se agota'
  igual -1 $r.Codigo 'con el código -1'
  if ($reloj.Elapsed.TotalSeconds -gt 20) { throw "FALLA: tardó $([int]$reloj.Elapsed.TotalSeconds) s en volver" }
  Start-Sleep -Seconds 1
  igual 0 (pings_vivos '-n 47 127.0.0.1') 'el ping (hijo del cmd) también termina'
}

function prueba_en_cada_carpeta_manda_el_exe_y_se_evita_el_ps1 {
  $otra = Join-Path $env:USERPROFILE 'otra'
  [void](New-Item -ItemType Directory -Path $otra)
  escribir_ps1 (Join-Path $env:NG_PRUEBA_BIN 'ia.ps1') "'ps1'"
  simular ia 'echo cmd'
  $env:PATH = "$env:NG_PRUEBA_BIN;$otra;$env:PATH"
  igual (Join-Path $env:NG_PRUEBA_BIN 'ia.cmd') (resolver_programa ia) 'el .cmd antes que el .ps1 (npm deja los dos)'
  Copy-Item -LiteralPath (Join-Path $env:NG_PRUEBA_HERRAMIENTAS 'eco.exe') -Destination (Join-Path $otra 'ia.exe')
  igual (Join-Path $env:NG_PRUEBA_BIN 'ia.cmd') (resolver_programa ia) 'la primera carpeta del PATH manda'
  eco_en_bin ia
  igual (Join-Path $env:NG_PRUEBA_BIN 'ia.exe') (resolver_programa ia) 'en la misma carpeta, el .exe'
  igual '' "$(resolver_programa no-existe)" 'lo que no está no da nada'
}

function prueba_un_cmd_en_una_ruta_con_espacios {
  $d = Join-Path $env:NG_PRUEBA_BIN 'con espacio'
  [void](New-Item -ItemType Directory -Path $d)
  [IO.File]::WriteAllText((Join-Path $d 'x.cmd'), "@echo off`r`necho [%~1] [%~2]`r`n", [Text.Encoding]::ASCII)
  $r = ejecutar_programa (Join-Path $d 'x.cmd') @('uno dos', 'tres') -Capturar
  igual '[uno dos] [tres]' ($r.Salida -join '').Trim() 'cmd recibe la ruta y los argumentos enteros'
}

function prueba_un_cmd_recibe_los_especiales_de_cmd_intactos {
  # Un .cmd que pasa sus argumentos a un programa, como los que deja npm.
  eco_en_bin eco
  [IO.File]::WriteAllText((Join-Path $env:NG_PRUEBA_BIN 'reenvia.cmd'), "@`"%~dp0eco.exe`" %*`r`n", [Text.Encoding]::ASCII)
  $lista = @('a&b', 'x^y', 'c|d', '<e>', '(f)', 'g;h', 'i=j', 'k,l', 'con espacio', 'C:\ruta con espacio\', '')
  $r = ejecutar_programa reenvia $lista -Capturar
  igual (($lista | ForEach-Object { "[$_]" }) -join "`n") ($r.Salida -join "`n") 'cada argumento llega entero a través de cmd'
  foreach ($malo in '50%', '%PATH%', 'a"b', '!x!', "a`nb") {
    $rechazado = $false
    try { [void](ejecutar_programa reenvia @($malo)) } catch { $rechazado = $_.Exception.Message -like '*no puede llevar*' }
    igual $true $rechazado "«$malo» se rechaza: cmd no lo pasaría tal cual"
  }
}

function prueba_una_entrada_que_nadie_lee_no_impide_el_tiempo_maximo {
  # El programa no lee su entrada: escribirla entera bloquearía la espera.
  simular lento 'ping -n 30 127.0.0.1 > nul'
  $reloj = [Diagnostics.Stopwatch]::StartNew()
  $r = ejecutar_programa lento -Entrada ('x' * 1048576) -TiempoMax 2
  igual $true $r.TiempoAgotado 'el tiempo máximo se cumple'
  if ($reloj.Elapsed.TotalSeconds -gt 20) { throw "FALLA: tardó $([int]$reloj.Elapsed.TotalSeconds) s en volver" }
}

function prueba_un_archivo_de_entrada_que_no_existe_no_lanza_el_programa {
  simular_anotando prog
  igual 1 (con_lib "ejecutar_programa prog -EntradaArchivo '$env:USERPROFILE\no-existe.txt'") 'sale con 1'
  igual '' (llamadas prog) 'el programa no llega a lanzarse'
  contiene 'no existe el archivo de entrada' (registro) 'y se dice por qué'
}

function prueba_si_el_registro_no_se_puede_escribir_se_avisa_y_sigue {
  # Una zona bloqueada del registro hace fallar cada escritura, como un disco
  # lleno; las de la salida de los programas, en sus hilos de lectura.
  simular dos 'echo uno-salida& echo dos-error 1>&2'
  $cuerpo = @'
$f = [IO.File]::Open($NG_REGISTRO, 'Open', 'ReadWrite', 'ReadWrite, Delete')
$f.Lock(0, 1073741824)
try {
  [void](ejecutar_programa dos)
  registrar 'desde PowerShell'
  decir 'sigue-despues'
} finally { $f.Unlock(0, 1073741824); $f.Dispose() }
'@
  igual 0 (con_lib $cuerpo) 'sale con 0: ni los hilos de lectura ni PowerShell se caen'
  contiene 'sigue-despues' (pantalla) 'y sigue'
  igual 1 ([regex]::Matches((pantalla), 'no se pudo escribir en el registro').Count) 'avisa una sola vez'
}

function prueba_la_salida_en_la_pagina_oem_se_lee_con_su_codificacion {
  # Como taskkill o shutdown, que escriben en la página OEM de su consola.
  simular_tabla viejo @('*|0|oem|Correcto: se envió la señal de terminación')
  [void](ejecutar_programa viejo -Codificacion oem)
  contiene 'Correcto: se envió la señal de terminación' (registro_ahora) 'con sus tildes'
}

function prueba_sin_esperar_y_detener {
  simular lento 'ping -n 53 127.0.0.1 > nul'
  $r = ejecutar_programa lento -SinEsperar
  Start-Sleep -Seconds 1
  igual $false $r.Proceso.P.HasExited 'sigue en marcha mientras se hace otra cosa'
  [void](detener_proceso $r)
  igual $true $r.Proceso.P.HasExited 'se detiene'
  Start-Sleep -Seconds 1
  igual 0 (pings_vivos '-n 53 127.0.0.1') 'con sus hijos'
}

function prueba_con_entrada_consola_el_programa_lee_la_consola_de_este_proceso {
  # El WSL de serie se niega a --install y --update si su entrada no es una
  # consola (visto el 10/10/2026). Como en el proceso elevado: un
  # PowerShell con su propia consola, oculta y sin nada redirigido, lanza un
  # programa que anota si su entrada esta redirigida, sin y con -EntradaConsola.
  $res = Join-Path $env:NG_PRUEBA_CAJA 'entrada-redirigida.txt'
  escribir_ps1 (Join-Path $env:NG_PRUEBA_BIN 'mira_entrada.ps1') "[IO.File]::AppendAllText('$res', [string][Console]::IsInputRedirected + ' ')"
  $guion = Join-Path $env:USERPROFILE 'con-consola.ps1'
  escribir_ps1 $guion (". '$env:NG_LIB\comun.ps1'`niniciar_registro prueba`n[void](ejecutar_programa mira_entrada)`n[void](ejecutar_programa mira_entrada -EntradaConsola)`n")
  $psi = New-Object Diagnostics.ProcessStartInfo (Join-Path $PSHOME 'powershell.exe'), "-NoProfile -ExecutionPolicy Bypass -File `"$guion`""
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $p = [Diagnostics.Process]::Start($psi)
  if (-not $p.WaitForExit(60000)) { $p.Kill(); throw 'FALLA: el PowerShell con consola no terminó' }
  igual 'True False' ([IO.File]::ReadAllText($res).Trim()) 'sin -EntradaConsola, una tubería; con ella, la consola del proceso'
  $lanzado = $true
  try { [void](ejecutar_programa mira_entrada -EntradaConsola -Entrada 'x') } catch { $lanzado = $false }
  igual $false $lanzado 'con -Entrada no se admite'
}

function prueba_en_las_pruebas_nunca_se_lanza_un_programa_de_verdad {
  $lanzado = $true
  try { [void](ejecutar_programa (Join-Path $env:SystemRoot 'System32\hostname.exe')) }
  catch { $lanzado = $false; contiene 'de verdad' $_.Exception.Message 'dice por qué' }
  igual $false $lanzado 'un programa fuera de la caja no se lanza'
}

function prueba_un_programa_que_no_existe_da_su_frase {
  igual 1 (con_lib 'ejecutar_programa no-existe') 'sale con 1'
  contiene 'Falta el programa «no-existe»' (pantalla) 'con su frase'
}

function prueba_ctrl_c_detiene_el_programa_limpia_y_sale_con_130 {
  $marca = Join-Path $env:USERPROFILE 'ctrl-c'
  simular lento "type nul > `"$marca`"`r`nping -n 59 127.0.0.1 > nul"
  $c = con_lib "function script:al_salir_extra(`$c) { registrar `"limpieza con `$c`" }`nejecutar_programa lento" -Entorno @{ NEUROGRAPH_PRUEBA_CTRL_C = $marca }
  igual 130 $c 'sale con 130'
  contiene 'Interrumpido. Puedes volver a ejecutar la prueba' (pantalla) 'dice qué repetir'
  contiene 'limpieza con 130' (registro) 'la limpieza corre'
  Start-Sleep -Seconds 1
  igual 0 (pings_vivos '-n 59 127.0.0.1') 'el programa no sigue solo'
}
