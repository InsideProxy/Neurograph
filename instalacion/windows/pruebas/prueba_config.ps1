# Pruebas de config.ps1 (bloque A del diseno, H11).
. "$env:NG_LIB\config.ps1"

function prueba_guardar_y_leer {
  $f = Join-Path $env:USERPROFILE 'c.env'
  guardar_valor $f NG_WEB_PUERTO 5173
  guardar_valor $f NG_API_PUERTO 8420
  guardar_valor $f NG_WEB_PUERTO 5174
  igual 5174 (leer_valor $f NG_WEB_PUERTO) 'el último valor manda'
  igual 8420 (leer_valor $f NG_API_PUERTO) 'otra clave no se pisa'
  igual 2 ([IO.File]::ReadAllLines($f).Count) 'una línea por clave'
}

function prueba_sin_bom_y_con_lf_para_compose {
  $f = Join-Path $env:USERPROFILE 'c.env'
  guardar_valor $f NG_CONTRASENA_BASE abc
  $b = [IO.File]::ReadAllBytes($f)
  igual 'NG_CONTRASENA_BASE=abc' ([Text.Encoding]::ASCII.GetString($b, 0, 22)) 'empieza por la clave, sin BOM'
  igual 10 $b[$b.Length - 1] 'termina en LF'
  igual -1 ([Array]::IndexOf($b, [byte]13)) 'sin CR'
}

function prueba_leer_lo_que_no_existe_da_vacio {
  igual '' (leer_valor (Join-Path $env:USERPROFILE 'no.env') NG_X) 'archivo inexistente'
  $f = Join-Path $env:USERPROFILE 'c.env'
  guardar_valor $f NG_A 1
  igual '' (leer_valor $f NG_B) 'clave inexistente'
}

function prueba_borrar_valor {
  $f = Join-Path $env:USERPROFILE 'c.env'
  guardar_valor $f NG_BASE_CARGADA 2026-10-10
  guardar_valor $f NG_OTRA x
  borrar_valor $f NG_BASE_CARGADA
  igual '' (leer_valor $f NG_BASE_CARGADA) 'la marca se borra'
  igual x (leer_valor $f NG_OTRA) 'las demás se quedan'
}

function prueba_una_clave_no_coincide_con_otra_que_empieza_igual {
  $f = Join-Path $env:USERPROFILE 'c.env'
  guardar_valor $f NG_IAS_REGISTRADAS claude
  guardar_valor $f NG_IAS x
  igual claude (leer_valor $f NG_IAS_REGISTRADAS) 'NG_IAS no pisa NG_IAS_REGISTRADAS'
  igual x (leer_valor $f NG_IAS) 'y se lee la suya'
}

function prueba_valor_con_salto_de_linea_se_rechaza {
  $f = Join-Path $env:USERPROFILE 'c.env'
  $rechazado = $false
  try { guardar_valor $f NG_MALO "a`nb" } catch { $rechazado = $true }
  igual $true $rechazado 'se rechaza'
  igual '' (leer_valor $f NG_MALO) 'no se escribe'
}

function prueba_si_la_escritura_falla_no_se_pierden_las_claves {
  $f = Join-Path $env:USERPROFILE 'c.env'
  guardar_valor $f NG_A 1
  guardar_valor $f NG_B 2
  Set-ItemProperty -LiteralPath $f -Name IsReadOnly -Value $true
  $fallo = $false
  try { guardar_valor $f NG_C 3 } catch { $fallo = $true }
  Set-ItemProperty -LiteralPath $f -Name IsReadOnly -Value $false
  igual $true $fallo 'un archivo de solo lectura no se pisa, y se dice'
  igual '' (leer_valor $f NG_C) 'NG_C no se escribió'
  igual 1 (leer_valor $f NG_A) 'NG_A sigue'
  igual 2 (leer_valor $f NG_B) 'NG_B sigue'
  # -like y no -Filter: con los comodines de Win32, 'c.env.*' encaja tambien con c.env.
  igual 0 @(Get-ChildItem -LiteralPath $env:USERPROFILE | Where-Object { $_.Name -like 'c.env.*' }).Count 'sin temporales'
}

function prueba_un_fallo_a_medias_de_replacefile_no_pierde_el_archivo {
  $f = Join-Path $env:USERPROFILE 'c.env'
  guardar_valor $f NG_CONTRASENA_BASE secreta
  # 1177: el original queda con el nombre de la copia y el nuevo, con el suyo.
  function reemplazar_archivo([string]$nuevo, [string]$archivo, [string]$copia) {
    if (-not $copia) { [IO.File]::Delete($archivo) } else { [IO.File]::Move($archivo, $copia) }
    throw (New-Object IO.IOException 'simulado: ReplaceFile 1177')
  }
  $fallo = $false
  try { guardar_valor $f NG_A 1 } catch { $fallo = $true }
  igual $true $fallo 'la escritura falla, y se dice'
  igual secreta (leer_valor $f NG_CONTRASENA_BASE) 'el archivo sigue, con lo que tenía'
  igual 0 @(Get-ChildItem -LiteralPath $env:USERPROFILE | Where-Object { $_.Name -like 'c.env.*' }).Count 'sin temporales ni copias'
  # 1176 sin copia: el original ya no existe y solo queda el temporal.
  function reemplazar_archivo([string]$nuevo, [string]$archivo, [string]$copia) {
    [IO.File]::Delete($archivo)
    throw (New-Object IO.IOException 'simulado: ReplaceFile 1176')
  }
  $fallo = $false
  try { guardar_valor $f NG_B 2 } catch { $fallo = $true }
  igual $true $fallo 'falla otra vez'
  igual secreta (leer_valor $f NG_CONTRASENA_BASE) 'el único ejemplar no se borra: queda el temporal en su sitio'
}

function prueba_una_copia_anterior_que_sobro_no_impide_escribir {
  $f = Join-Path $env:USERPROFILE 'c.env'
  guardar_valor $f NG_A 1
  [IO.File]::WriteAllText("$f.anterior", "NG_A=viejo`n")
  guardar_valor $f NG_A 2
  igual 2 (leer_valor $f NG_A) 'se escribe'
  igual $false (Test-Path -LiteralPath "$f.anterior") 'y la copia se borra'
}

function prueba_lee_un_archivo_del_bloc_de_notas {
  $f = Join-Path $env:USERPROFILE 'c.env'
  [IO.File]::WriteAllText($f, "NG_A=1`r`nNG_B=dos`r`n", (New-Object Text.UTF8Encoding($true)))
  igual 1 (leer_valor $f NG_A) 'con BOM, la primera clave se lee'
  igual dos (leer_valor $f NG_B) 'con CRLF, sin el CR'
}
