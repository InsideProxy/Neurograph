# Pruebas de puertos.ps1 (paso 4, B1 del diseno, H11).

function prueba_ocupados_se_usa_el_siguiente_y_se_avisa {
  simular_tabla docker @('ps --format|0||', 'inspect|1||')
  $c = con_lib 'elegir_puertos; decir $script:NG_RESUMEN' sistema, docker, puertos -Entorno @{ NEUROGRAPH_PRUEBA_PUERTOS_ESCUCHANDO = '5173 8420' }
  igual 0 $c 'sale con 0'
  contiene 'web 5174 · API 8421' (pantalla) 'los siguientes'
  igual 5174 (valor_config NG_WEB_PUERTO) 'guardado'
  contiene 'La web usa el puerto 5174 (el 5173 estaba ocupado).' ([IO.File]::ReadAllText((Join-Path $env:LOCALAPPDATA 'neurograph-app\.avisos'))) 'avisa'
}

function prueba_la_api_no_coincide_con_la_web {
  simular_tabla docker @('ps --format|0||', 'inspect|1||')
  config_con "NG_WEB_PUERTO=8420`nNG_API_PUERTO=8420`n"
  [void](con_lib 'elegir_puertos' sistema, docker, puertos -Entorno @{ NEUROGRAPH_PRUEBA_PUERTOS_ESCUCHANDO = 'ninguno' })
  igual 8420 (valor_config NG_WEB_PUERTO) 'la web se queda'
  igual 8421 (valor_config NG_API_PUERTO) 'la API pasa al siguiente'
}

function prueba_los_puertos_propios_no_cuentan_y_en_marcha_no_se_cambia_nada {
  simular_tabla docker @('ps --format|0||neurograph-app-web|127.0.0.1:5173->80/tcp\nneurograph-app-api|127.0.0.1:8420->8420/tcp', 'inspect|0||false')
  [void](con_lib 'elegir_puertos' sistema, docker, puertos -Entorno @{ NEUROGRAPH_PRUEBA_PUERTOS_ESCUCHANDO = '5173 8420' })
  igual 5173 (valor_config NG_WEB_PUERTO) 'el de un contenedor propio no está ocupado'
  simular_tabla docker @('ps --format|0||', 'inspect|0||true')
  config_con "NG_WEB_PUERTO=5180`nNG_API_PUERTO=8425`n"
  [void](con_lib 'elegir_puertos; decir $script:NG_RESUMEN' sistema, docker, puertos -Entorno @{ NEUROGRAPH_PRUEBA_PUERTOS_ESCUCHANDO = '5180 8425' })
  contiene 'web 5180 · API 8425' (pantalla) 'con la web en marcha, los guardados'
}

function prueba_sin_puertos_libres_cerca_para {
  simular_tabla docker @('ps --format|0||', 'inspect|1||')
  $todos = (5173..5224 | ForEach-Object { $_ }) -join ' '
  igual 1 (con_lib 'elegir_puertos' sistema, docker, puertos -Entorno @{ NEUROGRAPH_PRUEBA_PUERTOS_ESCUCHANDO = $todos }) 'sale con 1'
  contiene 'No hay ningún puerto libre cerca del 5173' (pantalla) 'su frase'
}

function prueba_un_puerto_que_no_se_puede_abrir_esta_ocupado {
  # Un puerto abierto de verdad en 127.0.0.1 por otro proceso (esta prueba).
  $l = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 0)
  $l.Start()
  $p = $l.LocalEndpoint.Port
  try {
    simular_tabla docker @('ps --format|0||')
    [void](con_lib "decir (`"ocupado=`" + (puerto_ocupado $p))" sistema, docker, puertos -Entorno @{ NEUROGRAPH_PRUEBA_PUERTOS_ESCUCHANDO = 'ninguno' })
    contiene 'ocupado=True' (pantalla) 'no se puede abrir: ocupado'
  } finally { $l.Stop() }
  [void](con_lib "decir (`"ocupado=`" + (puerto_ocupado $p))" sistema, docker, puertos -Entorno @{ NEUROGRAPH_PRUEBA_PUERTOS_ESCUCHANDO = 'ninguno' })
  contiene 'ocupado=False' (pantalla) 'cerrado, libre'
}
