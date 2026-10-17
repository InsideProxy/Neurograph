# Pruebas del paso 3 (B1 y B3 del diseno, H11).
$PASO_3 = "paso 3 'Docker en marcha' paso_docker_en_marcha"
# En las pruebas, «abrir» Docker Desktop deja la marca abierto-Docker Desktop.exe
# (lanzar_aplicacion): las filas del docker falso que empiezan por ella solo
# valen despues.
$ABIERTO = '[%NG_PRUEBA_CAJA%\abierto-Docker Desktop.exe]'

function prueba_un_reinicio_pendiente_solo_para_si_docker_no_arranca {
  # El de Windows Update puede durar dias: con Docker en marcha, no para.
  $e = docker_desktop_simulado $NG_DOCKER_SANO @{ NEUROGRAPH_PRUEBA_REINICIO_PENDIENTE = 'si' }
  igual 0 (con_lib $PASO_3 sistema, docker -Entorno $e) 'un reinicio pendiente cualquiera no para'
  $e = docker_desktop_simulado (@('info --format {{.ServerVersion}}|1||stderr:error during connect') + $NG_DOCKER_SANO) @{ NEUROGRAPH_PRUEBA_REINICIO_PENDIENTE = 'si' }
  igual 1 (con_lib ("`$script:NG_ESPERA_DOCKER_DESKTOP = 4`n" + $PASO_3) sistema, docker -Entorno $e) 'Docker no arranca'
  contiene 'Falta reiniciar Windows para terminar de activar WSL2' (pantalla) 'y la frase es la del reinicio, no la de la espera'
}

function prueba_tras_actualizar_wsl_sin_reiniciar_un_reinicio_pendiente_no_para {
  # El paso 2 eleva para actualizar WSL (wsl --update, sin reinicio) y queda
  # la marca de Windows Update: con Docker en marcha, el paso 3 sigue.
  $e = docker_desktop_simulado $NG_DOCKER_SANO @{ NEUROGRAPH_PRUEBA_REINICIO_PENDIENTE = 'si' }
  [IO.File]::WriteAllText($e.NEUROGRAPH_PRUEBA_VERSION_WSL, '2.0.0')
  simular_tabla elevado @("*|0|escribe:$($e.NEUROGRAPH_PRUEBA_VERSION_WSL)=2.4.13|")
  $e['NEUROGRAPH_PRUEBA_ELEVADO'] = Join-Path $env:NG_PRUEBA_BIN 'elevado.exe'
  igual 0 (con_lib ("`$script:NG_RAIZ = '$env:NG_RAIZ'; paso 2 'Docker' paso_docker`n" + $PASO_3) sistema, docker -Entorno $e) 'sale con 0'
  contiene '-Wsl asegurar' (llamadas elevado) 'el paso 2 actualizó WSL'
  contiene '[3/9] Docker en marcha' (pantalla) 'y el paso 3 termina'
}

function prueba_un_docker_que_no_es_el_de_docker_desktop_para {
  $e = docker_desktop_simulado $NG_DOCKER_SANO
  simular_tabla docker $NG_DOCKER_SANO  # otro docker.exe, antes en el PATH
  $e['PATH'] = "$env:NG_PRUEBA_BIN;" + $e['PATH']
  igual 1 (con_lib $PASO_3 sistema, docker -Entorno $e) 'sale con 1'
  contiene 'no es el de Docker Desktop' (pantalla) 'su frase'
  $e = docker_desktop_simulado $NG_DOCKER_SANO
  $e['DOCKER_HOST'] = 'tcp://otro:2375'
  igual 1 (con_lib $PASO_3 sistema, docker -Entorno $e) 'con DOCKER_HOST, también'
  contiene 'Está definida DOCKER_HOST' (pantalla) 'y lo dice'
}

function prueba_con_docker_desktop_cerrado_se_abre_y_se_espera {
  $e = docker_desktop_simulado (@("${ABIERTO}info --format {{.ServerVersion}}|0||27.3.1", 'info --format {{.ServerVersion}}|1||stderr:error during connect') + $NG_DOCKER_SANO)
  igual 0 (con_lib $PASO_3 sistema, docker -Entorno $e) 'sale con 0'
  contiene 'Docker Desktop.exe' (registro) 'abre Docker Desktop'
  contiene 'arrancado (27.3.1)' (pantalla) 'y espera a que responda'
}

function prueba_si_no_responde_a_tiempo_para {
  $e = docker_desktop_simulado (@('info --format {{.ServerVersion}}|1||stderr:error during connect') + $NG_DOCKER_SANO)
  igual 1 (con_lib ("`$script:NG_ESPERA_DOCKER_DESKTOP = 4`n" + $PASO_3) sistema, docker -Entorno $e) 'sale con 1'
  contiene 'Docker Desktop no arrancó en 4 s' (pantalla) 'su frase'
}

function prueba_un_motor_que_no_sirve_para {
  $e = docker_desktop_simulado (@('compose version|1||stderr:unknown command') + $NG_DOCKER_SANO)
  igual 1 (con_lib $PASO_3 sistema, docker -Entorno $e) 'sin docker compose'
  contiene 'no tiene «docker compose»' (pantalla) 'lo dice'
  $e = docker_desktop_simulado (@('info --format {{.OSType}}|0||windows') + $NG_DOCKER_SANO)
  igual 1 (con_lib $PASO_3 sistema, docker -Entorno $e) 'contenedores de Windows'
  contiene 'Switch to Linux containers' (pantalla) 'dice cómo pasar a los de Linux'
  $e = docker_desktop_simulado (@('context inspect|0||tcp://remoto:2376') + $NG_DOCKER_SANO)
  igual 1 (con_lib $PASO_3 sistema, docker -Entorno $e) 'un contexto remoto'
  contiene 'tcp://remoto:2376' (pantalla) 'lo nombra'
  $e = docker_desktop_simulado $NG_DOCKER_SANO
  [void](New-Item -ItemType Directory -Force -Path (Join-Path $env:ProgramData 'DockerDesktop'))
  [IO.File]::WriteAllText((Join-Path $env:ProgramData 'DockerDesktop\admin-settings.json'), '{"enhancedContainerIsolation":{"locked":true,"value":true}}')
  igual 1 (con_lib $PASO_3 sistema, docker -Entorno $e) 'con el aislamiento reforzado'
  contiene 'Enhanced Container Isolation' (pantalla) 'lo dice'
}

function prueba_el_arranque_al_iniciar_sesion_se_desactiva_si_lo_instalo_este {
  $ajustes = Join-Path $env:APPDATA 'Docker\settings-store.json'
  [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ajustes))
  $original = "{`n  `"AutoStart`": true,`n  `"DisplayedOnboarding`": true,`n  `"Otra`": [1, 2]`n}`n"
  [IO.File]::WriteAllText($ajustes, $original)
  $run = $env:NEUROGRAPH_PRUEBA_HKCU + 'Software\Microsoft\Windows\CurrentVersion\Run'
  [void](New-Item -Path $run -Force)
  Set-ItemProperty -LiteralPath $run -Name 'Docker Desktop' -Value 'C:\dd\Docker Desktop.exe -Autostart'
  estado_con "NG_DOCKER_INSTALADO_AQUI=2026-10-10`n"
  $e = docker_desktop_simulado $NG_DOCKER_SANO
  igual 0 (con_lib $PASO_3 sistema, docker -Entorno $e) 'sale con 0'
  igual ($original -replace '"AutoStart": true', '"AutoStart": false') ([IO.File]::ReadAllText($ajustes)) 'solo cambia AutoStart'
  contiene 'desktop stop' (llamadas docker) 'cierra Docker Desktop antes de editar'
  contiene 'Docker Desktop.exe' (registro) 'y lo vuelve a abrir'
  igual $null (Get-ItemProperty -LiteralPath $run -Name 'Docker Desktop' -ErrorAction SilentlyContinue) 'quita Docker Desktop de Run'
}

function prueba_si_ya_estaba_su_configuracion_no_se_toca {
  $ajustes = Join-Path $env:APPDATA 'Docker\settings-store.json'
  [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ajustes))
  [IO.File]::WriteAllText($ajustes, "{`"AutoStart`": true}")
  $e = docker_desktop_simulado $NG_DOCKER_SANO
  igual 0 (con_lib $PASO_3 sistema, docker -Entorno $e) 'sale con 0'
  igual "{`"AutoStart`": true}" ([IO.File]::ReadAllText($ajustes)) 'sin NG_DOCKER_INSTALADO_AQUI, ni se mira'
  no_contiene 'desktop stop' (llamadas docker) 'ni se cierra'
}

function prueba_asegurar_docker_para_el_uso_diario {
  $e = docker_desktop_simulado (@("${ABIERTO}info --format {{.ServerVersion}}|0||27.3.1", 'info --format {{.ServerVersion}}|1||') + $NG_DOCKER_SANO)
  igual 0 (con_lib 'asegurar_docker' sistema, docker -Entorno $e) 'abre Docker Desktop y espera'
  [IO.File]::WriteAllText($e.NEUROGRAPH_PRUEBA_DOCKER_DESKTOP, 'ninguno')
  Remove-Item -LiteralPath (Join-Path $env:NG_PRUEBA_CAJA 'abierto-Docker Desktop.exe')
  igual 1 (con_lib 'asegurar_docker' sistema, docker -Entorno $e) 'sin Docker Desktop, para'
  contiene 'Docker Desktop no está en marcha' (pantalla) 'con su frase'
}
