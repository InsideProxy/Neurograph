# Pruebas de neurograph-mcp.cmd y mcp.ps1 (B4 del diseno, H11).
$MCP = Join-Path $env:NG_RAIZ 'instalacion\windows\plantillas\neurograph-mcp.cmd'
function lanzar_mcp([hashtable]$Entorno = @{}, [string]$Entrada = '') {
  return lanzar_prueba (Join-Path $env:SystemRoot 'System32\cmd.exe') "/d /s /c `"`"$MCP`"`"" $Entorno $Entrada
}

function prueba_apagado_sale_sin_encender_y_sin_salida_estandar {
  simular_tabla docker @('info|0||', 'inspect|0||false')
  $r = lanzar_mcp
  igual 1 $r.Codigo 'sale con 1'
  igual '' $r.Salida.Trim() 'nada por la salida estándar'
  contiene 'NeuroGraph apagado' $r.Error 'el mensaje, por la de errores'
  contiene 'NeuroGraph apagado' ([IO.File]::ReadAllText((Join-Path $env:LOCALAPPDATA 'neurograph-app\registro\mcp.log'))) 'y al registro'
  no_contiene 'compose' (llamadas docker) 'nunca lo enciende'
  no_contiene 'start' (llamadas docker) 'de ninguna forma'
}

function prueba_sin_docker_lo_dice {
  simular_tabla docker @('info|1||')
  $r = lanzar_mcp
  igual 1 $r.Codigo 'sale con 1'
  contiene 'No se puede usar Docker' $r.Error 'su mensaje'
}

function prueba_encendido_solo_sale_el_protocolo_y_el_proyecto_es_el_de_config {
  config_con "NG_PROYECTO=neurograph-prueba`nNG_CONTRASENA_BASE=x`n"
  simular_tabla docker @('info|0||info ruidosa', 'inspect|0||true', 'exec -i|0|entrada|{"jsonrpc":"2.0","id":1}')
  $peticion = '{"jsonrpc":"2.0","id":1,"method":"initialize"}' + "`n"
  $r = lanzar_mcp -Entrada $peticion
  igual '{"jsonrpc":"2.0","id":1}' $r.Salida.Trim() 'solo el protocolo'
  igual $peticion ([IO.File]::ReadAllText((Join-Path $env:NG_PRUEBA_LLAMADAS 'docker.entrada'))) 'lo que manda la IA llega entero a docker exec -i'
  contiene 'inspect -f {{.State.Running}} neurograph-prueba-api' (llamadas docker) 'el proyecto de config.env'
  contiene 'exec -i neurograph-prueba-api python -m backend.mcp.server' (llamadas docker) 'el servidor MCP, en la API'
}

# Una IA abierta antes de instalar Docker Desktop no tiene su carpeta en el
# PATH: el conector la busca donde la instala Docker Desktop.
function prueba_sin_docker_en_el_path_usa_el_de_docker_desktop {
  $bin = Join-Path $env:NEUROGRAPH_PRUEBA_PROGRAMFILES 'Docker\Docker\resources\bin'
  [void](New-Item -ItemType Directory -Force -Path $bin)
  Copy-Item -LiteralPath (Join-Path $env:NG_PRUEBA_HERRAMIENTAS 'falso.exe') -Destination (Join-Path $bin 'docker.exe')
  [IO.File]::WriteAllLines((Join-Path $bin 'docker.tabla'), @('info|0||', 'inspect|0||true', 'exec -i|0||{"jsonrpc":"2.0","id":1}'), $NG_UTF8_PRUEBA)
  $r = lanzar_mcp @{ PATH = (Join-Path $env:SystemRoot 'System32') }
  igual 0 $r.Codigo 'sale con 0'
  igual '{"jsonrpc":"2.0","id":1}' $r.Salida.Trim() 'con el docker de Docker Desktop'
  contiene 'exec -i neurograph-app-api python -m backend.mcp.server' (llamadas docker) 'el servidor MCP, en la API'
}

function prueba_la_comprobacion_cuenta_las_herramientas {
  igual 0 (con_lib 'comprobar_mcp; decir "H=$($script:NG_MCP_HERRAMIENTAS)"' mcp -Entorno (mcp_falso '12')) 'sale con 0'
  contiene 'H=12' (pantalla) 'doce herramientas'
}

function prueba_no_responder_cerrarse_y_no_traer_la_lista_son_fallos_distintos {
  igual 1 (con_lib '$script:NG_ESPERA_MCP = 3; comprobar_mcp' mcp -Entorno (mcp_falso 'calla')) 'no responde'
  contiene 'no responde a initialize en 3 s' (pantalla) 'lo dice'
  igual 1 (con_lib 'comprobar_mcp' mcp -Entorno (mcp_falso 'cierra')) 'se cierra'
  contiene 'el conector se cerró sin responder a initialize' (pantalla) 'lo dice'
  igual 1 (con_lib 'comprobar_mcp' mcp -Entorno (mcp_falso 'sin_lista')) 'sin la lista'
  contiene 'no trae la lista de herramientas' (pantalla) 'lo dice'
}
