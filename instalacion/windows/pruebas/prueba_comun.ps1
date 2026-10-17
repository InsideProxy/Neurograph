# Pruebas de comun.ps1 (B1 y B3 del diseno, H11).

function prueba_paso_con_su_marca_y_resumen {
  $c = con_lib "function script:hacer { `$script:NG_RESUMEN = 'hecho bien' }`nfunction script:avisando { `$script:NG_MARCA = `$NG_MARCA_AVISO; `$script:NG_RESUMEN = 'con aviso' }`npaso 1 'Primero' hacer`npaso 2 'Segundo' avisando"
  igual 0 $c 'sale con 0'
  contiene '[1/9] Primero ' (pantalla) 'el título'
  contiene ' OK  hecho bien' (pantalla) 'la marca OK y el resumen'
  contiene ' AVISO  con aviso' (pantalla) 'la marca AVISO'
  contiene '== paso 2 hecho: AVISO con aviso ==' (registro) 'y en el registro'
}

function prueba_fallar_da_su_frase_el_registro_y_sale_con_1 {
  $c = con_lib "function script:rompe { fallar puerto 5173 }`npaso 4 'Puertos' rompe"
  igual 1 $c 'sale con 1'
  contiene ' FALLO' (pantalla) 'la línea del paso se cierra con FALLO'
  contiene 'El puerto 5173 está ocupado.' (pantalla) 'la frase'
  contiene 'Registro: ' (pantalla) 'y dónde está el registro'
  contiene 'FALLO [puerto] en el paso 4' (registro) 'el código, en el registro'
}

function prueba_un_error_inesperado_da_la_generica_y_su_rastro {
  $c = con_lib "function script:rompe { `$x = `$null; `$x.Metodo() }`npaso 3 'Algo' rompe"
  igual 1 $c 'sale con 1'
  contiene 'Algo ha fallado de forma inesperada.' (pantalla) 'la frase genérica'
  contiene 'ERROR inesperado en el paso 3' (registro) 'el paso'
  contiene 'rompe' (registro) 'y dónde, para quien lo arregle'
}

function prueba_lo_que_se_escapa_al_pipeline_va_al_registro {
  $c = con_lib "'texto-perdido-789'`ndecir 'visible'"
  igual 0 $c 'sale con 0'
  no_contiene 'texto-perdido-789' (pantalla) 'no sale en pantalla'
  contiene '(salida sin destino) texto-perdido-789' (registro) 'queda en el registro'
}

function prueba_un_segundo_proceso_no_toma_el_bloqueo {
  $d = Join-Path $env:LOCALAPPDATA 'neurograph-app'
  [void](New-Item -ItemType Directory -Force -Path $d)
  $f = [IO.File]::Open((Join-Path $d '.bloqueo'), 'OpenOrCreate', 'ReadWrite', 'None')
  try {
    igual 1 (con_lib 'tomar_bloqueo') 'con el bloqueo tomado, sale con 1'
    contiene 'Ya hay otro instalador' (pantalla) 'y dice por qué'
  } finally { $f.Dispose() }
  igual 0 (con_lib 'tomar_bloqueo') 'suelto, se toma'
}

function prueba_el_bloqueo_solo_dice_en_marcha_si_otro_lo_tiene {
  # Un .bloqueo que lleva a una carpeta que no existe: un error de E/S (3,
  # ruta no encontrada) que no es «otro lo tiene abierto».
  $d = Join-Path $env:LOCALAPPDATA 'neurograph-app'
  [void](New-Item -ItemType Directory -Force -Path $d)
  $r = lanzar_prueba (Join-Path $env:SystemRoot 'System32\cmd.exe') "/d /c mklink `"$d\.bloqueo`" `"$env:USERPROFILE\no-existe\bloqueo`""
  if ($r.Codigo -ne 0) { throw "FALLA: precondición: no se pudo crear el enlace ($($r.Salida)$($r.Error))" }
  igual 1 (con_lib 'tomar_bloqueo') 'sale con 1'
  no_contiene 'Ya hay otro instalador' (pantalla) 'sin decir que hay otro en marcha'
  contiene 'Algo ha fallado de forma inesperada' (pantalla) 'es un fallo inesperado, con su rastro en el registro'
}

function prueba_la_consola_queda_con_su_pagina_de_codigos {
  # Con la salida redirigida, comun.ps1 pone la consola en UTF-8; la consola
  # es tambien la del cmd que lo lanzo, y al terminar vuelve a la suya. La
  # pagina de salida la dice otro PowerShell en esa consola (chcp dice la de
  # entrada, que no cambia).
  $s = Join-Path $env:USERPROFILE 'consola.ps1'
  escribir_ps1 $s ". `"$env:NG_LIB\comun.ps1`"`nejecutar_principal 'prueba' { decir 'hola' }`nexit `$NG_CODIGO_SALIDA`n"
  $mira = Join-Path $env:USERPROFILE 'mira.ps1'
  escribir_ps1 $mira "'pagina=' + [Console]::OutputEncoding.CodePage"
  $ps = "`"$PSHOME\powershell.exe`" -NoProfile -ExecutionPolicy Bypass -File"
  $c = Join-Path $env:USERPROFILE 'consola.cmd'
  [IO.File]::WriteAllText($c, "@echo off`r`n$ps `"$mira`"`r`n$ps `"$s`"`r`n$ps `"$mira`"`r`n", [Text.Encoding]::ASCII)
  $r = lanzar_prueba (Join-Path $env:SystemRoot 'System32\cmd.exe') "/d /c `"$c`""
  $paginas = @([regex]::Matches($r.Salida, 'pagina=(\d+)') | ForEach-Object { $_.Groups[1].Value })
  igual 2 $paginas.Count "antes y después: $($r.Salida)"
  igual $paginas[0] $paginas[1] 'la misma página de salida que antes'
}

function prueba_preguntas_con_respuesta_y_sin_consola {
  $cuerpo = "if (preguntar_si '¿Seguir?') { decir 'dijo-si' } else { decir 'dijo-no' }"
  [void](con_lib $cuerpo -Entorno @{ NEUROGRAPH_PRUEBA_RESPUESTA = 's' })
  contiene 'dijo-si' (pantalla) 'con s es sí'
  [void](con_lib $cuerpo -Entorno @{ NEUROGRAPH_PRUEBA_RESPUESTA = 'n' })
  contiene 'dijo-no' (pantalla) 'con n es no'
  [void](con_lib $cuerpo)
  contiene 'dijo-no' (pantalla) 'sin consola delante, no'
  contiene 'sin consola: no se pregunta' (registro) 'y lo anota'
}

function prueba_el_latido_marca_los_pasos_largos {
  simular lento 'ping -n 4 127.0.0.1 > nul'
  [void](con_lib "function script:largo { [void](ejecutar_programa lento) }`npaso 5 'Largo' largo -Largo" -Entorno @{ NEUROGRAPH_PRUEBA_LATIDO_S = '1' })
  $linea = @((pantalla) -split "`r?`n" | Where-Object { $_ -like '`[5/9`]*' })[0]
  $puntos = @($linea.ToCharArray() | Where-Object { $_ -eq '.' }).Count
  # El titulo se rellena con 37 puntos (42 - «Largo»); el latido anade mas.
  if ($puntos -lt 39) { throw "FALLA: sin latido ($puntos puntos en «$linea»)" }
}

function prueba_avisar_lo_guarda_para_despues {
  [void](con_lib "avisar 'uno'; avisar 'dos'")
  igual "uno`ndos" ([IO.File]::ReadAllText((Join-Path $env:LOCALAPPDATA 'neurograph-app\.avisos'))).Trim() 'en orden, uno por línea'
}

function prueba_el_reinicio_no_es_un_fallo {
  igual 3010 (con_lib "throw 'NG:reiniciar'") 'sale con 3010'
  no_contiene 'Algo ha fallado' (pantalla) 'sin frase de fallo'
}
