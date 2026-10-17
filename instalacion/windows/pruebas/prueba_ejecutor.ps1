# Pruebas del ejecutor de pruebas (B8.1 del diseno, H11).

function prueba_caja_propia_y_simulados_delante {
  simular docker 'echo simulado'
  # cmd resuelve docker por el PATH, como lo haria un .cmd del instalador.
  $r = lanzar_prueba (Join-Path $env:SystemRoot 'System32\cmd.exe') '/d /c docker'
  igual 'simulado' $r.Salida.Trim() 'el docker simulado va delante en el PATH'
  contiene 'caja.' $env:USERPROFILE 'el perfil es el de la caja'
  contiene 'caja.' $env:LOCALAPPDATA 'LOCALAPPDATA también'
  contiene 'caja.' $env:TEMP 'y los temporales'
  contiene 'NeuroGraphPruebas' $env:NEUROGRAPH_PRUEBA_HKCU 'el registro de Windows del usuario va a una clave de pruebas'
}

function prueba_una_afirmacion_que_falla_se_detecta {
  $detectada = $false
  try { igual 'a' 'b' 'debe fallar' } catch { $detectada = $_.Exception.Message -like 'FALLA:*' }
  if (-not $detectada) { throw 'FALLA: igual no detecta la diferencia' }
}

function prueba_un_archivo_que_no_carga_se_cuenta_como_fallo {
  $f = Join-Path $env:USERPROFILE 'prueba_rota.ps1'
  escribir_ps1 $f "function prueba_x { 'ok' }`nif ( {"
  $ejecutor = Join-Path $env:NG_RAIZ 'instalacion\windows\pruebas\ejecutar.ps1'
  $r = lanzar_prueba (Join-Path $PSHOME 'powershell.exe') "-NoProfile -ExecutionPolicy Bypass -File `"$ejecutor`" `"$f`""
  contiene 'FALLA' $r.Salida 'se cuenta como fallo'
  contiene 'prueba_rota.ps1' $r.Salida 'y dice de qué archivo'
  contiene '      2: ' $r.Salida 'con la línea que no carga'
  igual 1 $r.Codigo 'el ejecutor sale con 1'
}

function prueba_falso_responde_segun_su_tabla {
  simular_tabla docker @('volume ls|0||uno\ndos', 'info|1||stderr:no responde')
  $exe = Join-Path $env:NG_PRUEBA_BIN 'docker.exe'
  $r = lanzar_prueba $exe 'volume ls -q'
  igual "uno`ndos" ($r.Salida -replace "`r", '').Trim() 'la salida de la fila que coincide'
  $r = lanzar_prueba $exe 'info'
  igual 1 $r.Codigo 'el código de la fila'
  contiene 'no responde' $r.Error 'por la salida de errores'
  contiene 'volume ls -q' (llamadas docker) 'anota los argumentos'
}

function prueba_eco_devuelve_cada_argumento {
  eco_en_bin eco
  $r = lanzar_prueba (Join-Path $env:NG_PRUEBA_BIN 'eco.exe') '"a b" c'
  igual "[a b]`n[c]" ($r.Salida -replace "`r", '').Trim() 'un argumento por línea'
  igual 2 $r.Codigo 'sale con el número de argumentos'
}
