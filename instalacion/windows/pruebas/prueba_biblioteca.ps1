# Pruebas de la eleccion de la biblioteca (paso 1, B2 del diseno, H11).
$LIBS = @('sistema')
$ELEGIR = 'elegir_biblioteca; comprobar_biblioteca $script:NG_BIBLIOTECA_ELEGIDA; decir "ELEGIDA=$($script:NG_BIBLIOTECA_ELEGIDA)"'

# Dos «unidades» de la caja; en la primera, una biblioteca con su manifiesto.
function unidades {
  $u1 = Join-Path $env:NG_PRUEBA_CAJA 'u1'
  $u2 = Join-Path $env:NG_PRUEBA_CAJA 'u2'
  [void](New-Item -ItemType Directory -Force -Path "$u1\NeuroData\original", "$u2\NeuroData")
  [IO.File]::WriteAllText("$u1\NeuroData\.neurograph_library.yaml", 'library_id: x')
  [IO.File]::WriteAllBytes("$u1\NeuroData\original\a.bin", (New-Object byte[] 3145728))
  return @{ NEUROGRAPH_PRUEBA_UNIDADES = "$u1\;$u2\" }
}

function prueba_con_opcion_o_guardada_no_se_pregunta {
  $e = unidades
  [void](con_lib ("`$script:NG_BIBLIOTECA_ELEGIDA = '$env:USERPROFILE\Otra'; " + $ELEGIR) $LIBS -Entorno $e)
  contiene "ELEGIDA=$env:USERPROFILE\Otra" (pantalla) 'la de --biblioteca o config.env'
  no_contiene 'Usar esta carpeta' (registro) 'sin preguntar'
}

function prueba_se_encuentran_solo_las_bibliotecas_con_manifiesto {
  $e = unidades
  [void](New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\NeuroData")
  [IO.File]::WriteAllText("$env:USERPROFILE\NeuroData\.neurograph_library.yaml", 'library_id: y')
  [void](con_lib 'decir "HALLADAS=$((bibliotecas_existentes) -join "|")"' $LIBS -Entorno $e)
  contiene "HALLADAS=$env:USERPROFILE\NeuroData|$env:NG_PRUEBA_CAJA\u1\NeuroData" (pantalla) 'primero la del perfil, como en Linux, y la de la unidad 1; la de la unidad 2 no tiene manifiesto'
}

function prueba_con_ninguna_o_varias_bibliotecas_la_lista_no_se_anida {
  $u = Join-Path $env:NG_PRUEBA_CAJA 'vacia'
  [void](New-Item -ItemType Directory -Force -Path $u)
  [void](con_lib 'decir "CUANTAS=$(@(bibliotecas_existentes).Count)"' $LIBS -Entorno @{ NEUROGRAPH_PRUEBA_UNIDADES = "$u\" })
  contiene 'CUANTAS=0' (pantalla) 'ninguna: 0, no una lista vacía dentro de otra'
  $e = unidades
  [void](New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\NeuroData")
  [IO.File]::WriteAllText("$env:USERPROFILE\NeuroData\.neurograph_library.yaml", 'library_id: y')
  [void](con_lib 'decir "CUANTAS=$(@(bibliotecas_existentes).Count)"' $LIBS -Entorno $e)
  contiene 'CUANTAS=2' (pantalla) 'dos: 2'
  $e['NEUROGRAPH_PRUEBA_RESPUESTA'] = 's'
  [void](con_lib $ELEGIR $LIBS -Entorno $e)
  contiene "Hay una biblioteca de NeuroGraph en $env:USERPROFILE\NeuroData" (pantalla) 'con dos, propone la del perfil'
  contiene "Hay más: $env:NG_PRUEBA_CAJA\u1\NeuroData." (pantalla) 'y nombra la otra'
}

function prueba_se_propone_la_existente_con_su_tamano_y_un_si_la_guarda {
  $e = (unidades) + @{ NEUROGRAPH_PRUEBA_RESPUESTA = 's' }
  igual 0 (con_lib ($ELEGIR + '; guardar_valor $NG_CONFIG NG_BIBLIOTECA $script:NG_BIBLIOTECA_ELEGIDA') $LIBS -Entorno $e) 'sale con 0'
  contiene "Hay una biblioteca de NeuroGraph en $env:NG_PRUEBA_CAJA\u1\NeuroData (3 MB)." (pantalla) 'la propone, con su tamaño'
  contiene 'pregunta: ¿Usar esta carpeta? -> s' (registro) 'y pregunta'
  contiene "ELEGIDA=$env:NG_PRUEBA_CAJA\u1\NeuroData" (pantalla) 'con un sí, esa'
  contiene "Biblioteca de datos: $env:NG_PRUEBA_CAJA\u1\NeuroData" (pantalla) 'y lo dice'
}

function prueba_sin_ninguna_se_propone_la_del_perfil {
  $u = Join-Path $env:NG_PRUEBA_CAJA 'vacia'
  [void](New-Item -ItemType Directory -Force -Path $u)
  [void](con_lib $ELEGIR $LIBS -Entorno @{ NEUROGRAPH_PRUEBA_UNIDADES = "$u\"; NEUROGRAPH_PRUEBA_RESPUESTA = 's' })
  contiene "La biblioteca de datos (unos 630 MB) irá en $env:USERPROFILE\NeuroData." (pantalla) 'la del perfil, con lo que ocupará'
  contiene "ELEGIDA=$env:USERPROFILE\NeuroData" (pantalla) 'elegida'
}

function prueba_un_no_abre_el_selector_y_se_comprueba_lo_elegido {
  $e = (unidades) + @{ NEUROGRAPH_PRUEBA_RESPUESTA = 'n' }
  $otra = Join-Path $env:USERPROFILE 'Datos NG'
  $e['NEUROGRAPH_PRUEBA_CARPETA_ELEGIDA'] = $otra
  igual 0 (con_lib $ELEGIR $LIBS -Entorno $e) 'una carpeta nueva vale'
  contiene 'abriendo el selector de carpetas' (registro) 'abre el selector'
  contiene "ELEGIDA=$otra" (pantalla) 'y usa la elegida'
  $e['NEUROGRAPH_PRUEBA_CARPETA_ELEGIDA'] = "$env:NG_PRUEBA_CAJA\u2\"
  [void](con_lib $ELEGIR $LIBS -Entorno $e)
  contiene "ELEGIDA=$env:NG_PRUEBA_CAJA\u2\NeuroData" (pantalla) 'una unidad entera: su carpeta NeuroData'
  [void](New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\Fotos")
  [IO.File]::WriteAllText("$env:USERPROFILE\Fotos\a.jpg", 'x')
  $e['NEUROGRAPH_PRUEBA_CARPETA_ELEGIDA'] = "$env:USERPROFILE\Fotos"
  igual 1 (con_lib $ELEGIR $LIBS -Entorno $e) 'una carpeta ajena se rechaza'
  contiene 'no parece una biblioteca de NeuroGraph' (pantalla) 'con su frase'
  $e['NEUROGRAPH_PRUEBA_CARPETA_ELEGIDA'] = 'cancelar'
  igual 1 (con_lib $ELEGIR $LIBS -Entorno $e) 'cancelar el selector para'
  contiene 'No has elegido ninguna carpeta para la biblioteca' (pantalla) 'con su frase'
}

function prueba_sin_consola_se_usa_la_propuesta {
  [void](con_lib $ELEGIR $LIBS -Entorno (unidades))
  contiene "ELEGIDA=$env:NG_PRUEBA_CAJA\u1\NeuroData" (pantalla) 'la propuesta'
  contiene 'sin consola: se usa la biblioteca propuesta' (registro) 'sin preguntar, y lo anota'
}

function prueba_una_biblioteca_en_un_disco_desconectado_se_rechaza {
  $libre = [char[]](70..90) | Where-Object { -not (Test-Path "$($_):\") } | Select-Object -Last 1
  igual 1 (con_lib "comprobar_biblioteca '${libre}:\NeuroData'" $LIBS) 'para'
  contiene '¿es un disco desconectado?' (pantalla) 'y dice qué puede pasar'
}
