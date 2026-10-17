# Pruebas de sistema.ps1 (paso 1, B1 y B2 del diseno, H11).
. "$env:NG_LIB\esperado.ps1"  # los umbrales, para las cifras justas de las pruebas

function prueba_solo_las_compilaciones_que_admite_docker_desktop {
  foreach ($caso in @('19044 Professional AMD64 Client|no', '19045 Professional AMD64 Client|si', '22000 Professional AMD64 Client|no',
      '22621 Professional AMD64 Client|no', '22631 Professional AMD64 Client|si', '26100 EnterpriseS AMD64 Client|si',
      '26100 Professional ARM64 Client|no', '26100 ServerStandard AMD64 Server|no')) {
    $w, $vale = $caso -split '\|'
    $c = con_lib 'comprobar_windows | Out-Null; decir admitido' sistema -Entorno (entorno_windows @{ NEUROGRAPH_PRUEBA_WINDOWS = $w })
    if ($vale -eq 'si') { igual 0 $c "$w se admite" } else {
      igual 1 $c "$w no se admite"
      contiene 'no es compatible con Docker Desktop' (pantalla) "${w}: con su frase"
    }
  }
}

function prueba_home_avisa_y_sigue {
  igual 0 (con_lib 'comprobar_windows | Out-Null' sistema -Entorno (entorno_windows @{ NEUROGRAPH_PRUEBA_WINDOWS = '22631 Core AMD64 Client' })) 'sigue'
  contiene 'Windows Home no está en la lista' ([IO.File]::ReadAllText((Join-Path $env:LOCALAPPDATA 'neurograph-app\.avisos'))) 'y avisa'
}

function prueba_virtualizacion_y_lanmanserver_paran_con_su_frase {
  igual 1 (con_lib 'comprobar_virtualizacion' sistema -Entorno (entorno_windows @{ NEUROGRAPH_PRUEBA_VIRTUALIZACION = 'no' })) 'sin virtualización'
  contiene 'La virtualización está desactivada' (pantalla) 'su frase'
  igual 1 (con_lib 'comprobar_lanmanserver' sistema -Entorno (entorno_windows @{ NEUROGRAPH_PRUEBA_LANMANSERVER = 'Manual' })) 'LanmanServer en manual'
  contiene 'su tipo de inicio es «Manual»' (pantalla) 'dice cómo está'
}

function prueba_un_sql_con_cr_para_y_dice_cual {
  $r = raiz_falsa
  [IO.File]::WriteAllText((Join-Path $r 'backend\database\seed\b.sql'), "BEGIN;`r`nselect 1;`r`nCOMMIT;`r`n")
  igual 1 (con_lib "`$script:NG_RAIZ = '$r'; comprobar_saltos_de_linea" sistema) 'para'
  contiene 'por ejemplo, backend\database\seed\b.sql' (pantalla) 'y nombra el archivo'
  Remove-Item -LiteralPath (Join-Path $r 'backend\database\seed\b.sql')
  igual 0 (con_lib "`$script:NG_RAIZ = '$r'; comprobar_saltos_de_linea" sistema) 'sin CR, sigue'
  # Solo los .sql: un .sqlx encaja con *.sql por su nombre corto 8.3 (B~1.SQL).
  [IO.File]::WriteAllText((Join-Path $r 'backend\database\seed\b.sqlx'), "x`r`n")
  igual 0 (con_lib "`$script:NG_RAIZ = '$r'; comprobar_saltos_de_linea" sistema) 'un .sqlx con CR no cuenta'
  Remove-Item -LiteralPath (Join-Path $r 'init') -Recurse
  igual 1 (con_lib "`$script:NG_RAIZ = '$r'; comprobar_saltos_de_linea" sistema) 'sin init, para'
  contiene 'Falta init en la carpeta del proyecto' (pantalla) 'y lo dice'
}

# Con % o ! en la carpeta de la cuenta, cmd los interpretaria al lanzar el
# conector de las IAs (cmd.exe /c ...\neurograph-mcp.cmd): se dice en el paso 1.
function prueba_una_cuenta_con_porcentaje_o_exclamacion_para_en_el_paso_1 {
  $r = raiz_falsa
  foreach ($c in '%', '!') {
    $perfil = Join-Path $env:USERPROFILE "Iñaki${c}1"
    [void](New-Item -ItemType Directory -Force -Path $perfil)
    $e = entorno_windows @{ USERPROFILE = $perfil }
    igual 1 (con_lib "`$script:NG_RAIZ = '$r'; paso 1 'Comprobando el ordenador' paso_comprobar" sistema -Entorno $e) "con ${c}: para"
    contiene "La carpeta de tu cuenta de Windows ($perfil) lleva" (pantalla) "con ${c}: con su frase"
  }
}

function prueba_menos_de_8_gb_instalados_para {
  igual 1 (con_lib "`$script:NG_BIBLIOTECA_ELEGIDA = '$env:USERPROFILE\NeuroData'; comprobar_recursos" sistema -Entorno (entorno_windows @{ NEUROGRAPH_PRUEBA_RAM_MB = '6144' })) 'para'
  contiene 'tiene 6 GB de memoria instalada' (pantalla) 'con lo que hay'
}

function prueba_la_memoria_de_docker_desktop_se_suma_si_no_esta_encendido {
  $justa = [string]($NG_MIN_MEMORIA_BASE_MB + 1)
  $cuerpo = "`$script:NG_BIBLIOTECA_ELEGIDA = '$env:USERPROFILE\NeuroData'; comprobar_recursos"
  igual 1 (con_lib $cuerpo sistema -Entorno (entorno_windows @{ NEUROGRAPH_PRUEBA_MEMORIA_MB = $justa })) 'con Docker Desktop cerrado no llega'
  contiene 'Hace falta al menos' (pantalla) 'frase de memoria'
  # Encendido, se le pregunta su memoria (docker info): que no responda.
  simular_tabla docker @('*|1||')
  igual 0 (con_lib $cuerpo sistema -Entorno (entorno_windows @{ NEUROGRAPH_PRUEBA_MEMORIA_MB = $justa; NEUROGRAPH_PRUEBA_DD_EN_MARCHA = 'si' })) 'encendido, ya la tiene tomada'
}

# Docker Desktop en marcha con su maquina virtual pequena: puede crecer lo
# que se pide dentro de Docker (y Windows gasta lo suyo).
$WSL_PEQUENA = @{ NEUROGRAPH_PRUEBA_DD_EN_MARCHA = 'si'; NEUROGRAPH_PRUEBA_VMMEM_MB = '2000' }
function prueba_poca_memoria_para_la_tractografia_no_para {
  $cuerpo = "`$script:NG_BIBLIOTECA_ELEGIDA = '$env:USERPROFILE\NeuroData'; comprobar_recursos"
  simular_tabla docker @('info --format {{.MemTotal}}|0||6206787584')
  igual 0 (con_lib $cuerpo sistema -Entorno (entorno_windows ($WSL_PEQUENA + @{ NEUROGRAPH_PRUEBA_MEMORIA_MB = '4000' }))) 'la base sí cabe'
  contiene 'memoria insuficiente' (valor_estado NG_TRACTO_SIN_RECURSOS) 'queda el motivo para el paso 8'
  igual 0 (con_lib $cuerpo sistema -Entorno (entorno_windows)) 'con memoria'
  igual '' (valor_estado NG_TRACTO_SIN_RECURSOS) 'el motivo se borra'
}

# En el paso 1 (o en neurograph tractografia), con Docker Desktop en marcha,
# Windows tiene que poner lo que la maquina virtual de WSL aun puede tomar y
# lo que gasta el mismo; parado, no se puede saber y se mira en el paso 8 (B2).
function prueba_la_memoria_de_windows_cuenta_lo_que_wsl_ya_ocupa {
  $cuerpo = "`$script:NG_BIBLIOTECA_ELEGIDA = '$env:USERPROFILE\NeuroData'; comprobar_recursos_tracto"
  simular_tabla docker @('info --format {{.MemTotal}}|0||6206787584')
  $e = entorno_windows @{ NEUROGRAPH_PRUEBA_MEMORIA_MB = '2866'; NEUROGRAPH_PRUEBA_DD_EN_MARCHA = 'si'; NEUROGRAPH_PRUEBA_VMMEM_MB = '5926' }
  igual 0 (con_lib $cuerpo sistema -Entorno $e) 'sale con 0'
  igual '' (valor_estado NG_TRACTO_SIN_RECURSOS) 'con la máquina virtual llena, sin motivo'
  $e['NEUROGRAPH_PRUEBA_MEMORIA_MB'] = '1000'
  igual 0 (con_lib $cuerpo sistema -Entorno $e) 'sale con 0'
  contiene 'hacen falta 1449 MB libres y hay 1000 MB' (valor_estado NG_TRACTO_SIN_RECURSOS) 'sin lo que gasta Windows, no'
  $e['NEUROGRAPH_PRUEBA_DD_EN_MARCHA'] = 'no'
  igual 0 (con_lib $cuerpo sistema -Entorno $e) 'sale con 0'
  igual '' (valor_estado NG_TRACTO_SIN_RECURSOS) 'con Docker Desktop parado no se sabe: se mira en el paso 8'
  contiene 'Docker Desktop parado; se mira con NeuroGraph encendido' (registro) 'y lo anota'
}

# El gancho para medir la tractografia (B2) solo salta la memoria: el
# espacio se sigue pidiendo.
function prueba_sin_pedir_memoria_el_paso_1_no_la_mira_pero_si_el_espacio {
  $cuerpo = "`$script:NG_BIBLIOTECA_ELEGIDA = '$env:USERPROFILE\NeuroData'; comprobar_recursos"
  simular_tabla docker @('info --format {{.MemTotal}}|0||6206787584')
  $e = entorno_windows ($WSL_PEQUENA + @{ NEUROGRAPH_PRUEBA_MEMORIA_MB = '4000'; NEUROGRAPH_PRUEBA_SIN_MEMORIA_TRACTO = '1' })
  igual 0 (con_lib $cuerpo sistema -Entorno $e) 'sale con 0'
  igual '' (valor_estado NG_TRACTO_SIN_RECURSOS) 'sin motivo de memoria'
  contiene '(prueba) NEUROGRAPH_PRUEBA_SIN_MEMORIA_TRACTO' (registro) 'y lo anota'
  $e['NEUROGRAPH_PRUEBA_ESPACIO_MB'] = '500'
  igual 0 (con_lib '$script:NG_BIBLIOTECA_ELEGIDA = $env:USERPROFILE; comprobar_recursos_tracto' sistema -Entorno $e) 'poco espacio'
  contiene 'espacio insuficiente' (valor_estado NG_TRACTO_SIN_RECURSOS) 'el espacio se sigue pidiendo'
}

function prueba_si_falta_docker_desktop_se_suma_su_espacio {
  $cuerpo = "`$script:NG_BIBLIOTECA_ELEGIDA = '$env:USERPROFILE\NeuroData'; comprobar_recursos"
  $justo = [string]($NG_MIN_ESPACIO_DOCKER_MB + $NG_MIN_ESPACIO_DOCKER_TRACTO_MB + 1)
  igual 1 (con_lib $cuerpo sistema -Entorno (entorno_windows @{ NEUROGRAPH_PRUEBA_ESPACIO_MB = $justo })) 'sin Docker Desktop no llega'
  contiene 'para Docker: hacen falta' (pantalla) 'frase de espacio'
  $e = entorno_windows @{ NEUROGRAPH_PRUEBA_ESPACIO_MB = $justo }
  # Despues de entorno_windows, que deja ese archivo en «ninguno».
  [void](archivo_con 'docker-desktop' (Join-Path $env:NG_PRUEBA_BIN 'dd'))
  [void](New-Item -ItemType Directory -Force -Path (Join-Path $env:NG_PRUEBA_BIN 'dd'))
  igual 0 (con_lib $cuerpo sistema -Entorno $e) 'con Docker Desktop, sí'
}

function prueba_sitio_bloqueado_se_nombra_y_un_401_es_conexion {
  simular_tabla curl @('zenodo.org|7||000', '*|0||401')
  igual 1 (con_lib 'comprobar_conexion' sistema -Entorno @{ NEUROGRAPH_PRUEBA_SITIOS = 'pypi.org zenodo.org' }) 'para'
  contiene 'No hay conexión con zenodo.org' (pantalla) 'nombra el sitio'
  igual 0 (con_lib 'comprobar_conexion' sistema -Entorno @{ NEUROGRAPH_PRUEBA_SITIOS = 'pypi.org' }) 'un 401 también es conexión'
}

function prueba_sin_wsl_ni_docker_desktop_se_miran_sus_sitios {
  simular_tabla curl @('*|0||200')
  $c = con_lib "`$script:NG_RAIZ = '$(raiz_falsa)'; `$script:NG_BIBLIOTECA_ELEGIDA = '$env:USERPROFILE\NeuroData'; paso_comprobar; decir `$script:NG_RESUMEN" sistema -Entorno (entorno_windows)
  igual 0 $c 'el paso 1 pasa'
  contiene 'https://desktop.docker.com/' (llamadas curl) 'de donde se descarga Docker Desktop'
  contiene 'https://github.com/' (llamadas curl) 'y de donde se actualiza WSL'
  contiene 'compilación 26100' (pantalla) 'el resumen'
}

function prueba_rutas_de_biblioteca_que_no_valen {
  foreach ($d in "$env:USERPROFILE\con,coma", "$env:USERPROFILE\a: b") {
    igual 1 (con_lib "comprobar_biblioteca '$d'" sistema) "«$d» se rechaza"
    contiene 'Elige otra con: instalacion\windows\instalar.cmd --biblioteca RUTA' (pantalla) 'y dice cómo elegir otra'
  }
  igual 1 (con_lib "comprobar_biblioteca '\\servidor\datos\NeuroData'" sistema) 'una carpeta de red se rechaza'
  contiene 'unidad de red' (pantalla) 'con su frase'
}

function prueba_biblioteca_ajena_para_y_las_validas_no {
  $u = $env:USERPROFILE
  [void](New-Item -ItemType Directory -Path "$u\ajena", "$u\vacia", "$u\conmanifiesto", "$u\antigua\original")
  [IO.File]::WriteAllText("$u\ajena\foto.jpg", 'x')
  [IO.File]::WriteAllText("$u\conmanifiesto\.neurograph_library.yaml", 'x')
  igual 1 (con_lib "comprobar_biblioteca '$u\ajena'" sistema) 'una carpeta ajena para'
  contiene 'no parece una biblioteca de NeuroGraph' (pantalla) 'con su frase'
  igual 0 (con_lib "comprobar_biblioteca '$u\vacia'; comprobar_biblioteca '$u\conmanifiesto'; comprobar_biblioteca '$u\antigua'; comprobar_biblioteca '$u\no-existe'" sistema) 'las válidas pasan'
}

function prueba_sin_el_contador_de_rendimiento_la_memoria_sale_de_win32_operatingsystem {
  # Sin simular la memoria: solo lee. Con los contadores de rendimiento
  # rotos, el contador no da nada, y 0 pararia el paso 1.
  $c = con_lib "function script:memoria_del_contador { return `$null }`ndecir `"LIBRE=`$(memoria_libre_mb)`"" sistema
  igual 0 $c 'sale con 0'
  $m = [regex]::Match((pantalla), 'LIBRE=(\d+)')
  if (-not $m.Success -or [int]$m.Groups[1].Value -le 0) { throw "FALLA: memoria libre sin el contador: $(pantalla)" }
  contiene 'FreePhysicalMemory de Win32_OperatingSystem' (registro) 'y anota de dónde sale'
}

function prueba_los_datos_reales_de_este_windows {
  # Sin simular nada: las consultas solo leen el Windows en el que corren las
  # pruebas, que ha de ser uno admitido y con la virtualizacion activa (B8).
  . "$env:NG_LIB\comun.ps1"
  . "$env:NG_LIB\sistema.ps1"
  $w = datos_windows
  if ($w.Compilacion -lt 19045) { throw "FALLA: compilación leída $($w.Compilacion)" }
  igual 'AMD64' $w.Arquitectura 'arquitectura'
  if ((ram_instalada_mb) -lt 4096) { throw "FALLA: memoria instalada leída $(ram_instalada_mb) MB" }
  if ((memoria_libre_mb) -le 0) { throw 'FALLA: memoria libre leída 0' }
  if ((espacio_libre_mb $env:SystemRoot) -le 0) { throw 'FALLA: espacio libre leído 0' }
  igual $true (virtualizacion_activa) 'la VM tiene la virtualización activa'
}
