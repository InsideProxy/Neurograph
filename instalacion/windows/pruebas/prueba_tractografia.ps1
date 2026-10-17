# Pruebas de tractografia.ps1 (paso 8, B2 del diseno, H11).
. "$env:NG_LIB\esperado.ps1"
$LIBS = @('sistema', 'docker', 'imagenes', 'base', 'tractografia')
$CUERPO = 'paso 8 "Tractografía" paso_tractografia_paso'
# Lo que responde un Docker en el que todo va bien.
function docker_tracto([string[]]$antes = @()) {
  simular_tabla docker ($antes + @(
    'inspect -f {{.State.Running}} neurograph-app-tractografia|1||'
    'cat /proc/meminfo|0||MemTotal:        6000000 kB\nMemAvailable:    5000000 kB'
    'image inspect|0||'
    'test -d /biblioteca|0||'
    'events|0||'
    'install_tractography.sh|0||Tractografia instalada.'
    'inspect -f {{.State.OOMKilled}}|0||false'
    'tractography_edges|0||41 176 5176'
    '*|0||'))
}
function preparar_biblioteca {
  config_con "NG_BIBLIOTECA=$env:USERPROFILE\Mi biblioteca`n"
  return (entorno_windows @{ NEUROGRAPH_PRUEBA_MEMORIA_MB = '9000' })
}
# La base sin la tractografia cargada (la consulta da otros recuentos).
$SIN_CARGAR = 'tractography_edges|0||0 0 0'
# El paso, con la funcion envuelta (paso_tractografia devuelve si quedo instalada).
$ENVOLVER = "function script:paso_tractografia_paso { [void](paso_tractografia) }`n"

function prueba_instalada_sin_user_con_la_biblioteca_y_el_socket {
  docker_tracto
  $e = preparar_biblioteca
  igual 0 (con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno $e) 'sale con 0'
  contiene 'OK  41 tractos, 176 nodos y 5176 aristas' (pantalla) 'el resumen'
  igual instalada (valor_estado NG_TRACTOGRAFIA) 'estado instalada'
  $l = llamadas docker
  contiene "--mount type=bind,src=$env:USERPROFILE\Mi biblioteca,dst=/biblioteca" $l 'la biblioteca, en /biblioteca'
  contiene '-e NEUROGRAPH_LIBRARY__PATH=/biblioteca' $l 'y el script la busca allí'
  contiene '--mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock' $l 'con el socket'
  contiene '--memory 4g --memory-swap 4g' $l 'con el tope de memoria'
  no_contiene '--user' $l 'sin --user: los archivos los escribe Docker Desktop a nombre de la persona'
}

function prueba_otra_en_marcha_para_sin_tocar_su_estado {
  estado_con "NG_TRACTOGRAFIA=pendiente`nNG_TRACTOGRAFIA_MOTIVO=Interrumpida; repite con: neurograph tractografia`n"
  docker_tracto @('inspect -f {{.State.Running}} neurograph-app-tractografia|0||true')
  igual 1 (con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno (preparar_biblioteca)) 'sale con 1'
  contiene 'Ya hay una instalación de la tractografía en marcha' (pantalla) 'su frase'
  no_contiene 'install_tractography.sh' (llamadas docker) 'no lanza otra'
  igual pendiente (valor_estado NG_TRACTOGRAFIA) 'su estado no se toca'
  igual 'Interrumpida; repite con: neurograph tractografia' (valor_estado NG_TRACTOGRAFIA_MOTIVO) 'ni su motivo'
}

function prueba_un_motivo_de_recursos_la_deja_pendiente_sin_lanzarla {
  estado_con "NG_TRACTO_SIN_RECURSOS=memoria insuficiente (hacen falta 4096 MB libres y hay 3000 MB)`n"
  docker_tracto @($SIN_CARGAR)
  igual 0 (con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno (preparar_biblioteca)) 'no detiene la instalación'
  contiene 'AVISO  pendiente - memoria insuficiente' (pantalla) 'marca y motivo'
  igual pendiente (valor_estado NG_TRACTOGRAFIA) 'estado pendiente'
  no_contiene 'install_tractography.sh' (llamadas docker) 'sin lanzarla'
}

# Al repetir la instalacion con poca memoria, una tractografia ya cargada no
# pasa a pendiente: con los datos en la base, seria falso (B2).
function prueba_sin_recursos_una_tractografia_ya_cargada_sigue_instalada {
  $casos = [ordered]@{
    'el motivo del paso 1' = @{ Estado = "NG_TRACTOGRAFIA=instalada`nNG_TRACTO_SIN_RECURSOS=memoria insuficiente (hacen falta 4096 MB libres y hay 3000 MB)`n"; Docker = @(); Motivo = 'memoria insuficiente (hacen falta' }
    'la memoria de Windows ahora' = @{ Estado = "NG_TRACTOGRAFIA=instalada`n"; Docker = @(); Memoria = '1000'; Motivo = 'memoria insuficiente ahora' }
    'la memoria dentro de Docker' = @{ Estado = "NG_TRACTOGRAFIA=instalada`n"; Docker = @('cat /proc/meminfo|0||MemTotal:        4000000 kB\nMemAvailable:    3000000 kB'); Motivo = 'libres dentro de Docker' }
  }
  foreach ($caso in $casos.Keys) {
    $c = $casos[$caso]
    estado_con $c.Estado
    [IO.File]::WriteAllText((Join-Path $env:NG_PRUEBA_LLAMADAS 'docker'), '')
    docker_tracto $c.Docker
    $e = preparar_biblioteca
    if ($c.Memoria) { $e['NEUROGRAPH_PRUEBA_MEMORIA_MB'] = $c.Memoria }
    igual 0 (con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno $e) "${caso}: sale con 0"
    igual instalada (valor_estado NG_TRACTOGRAFIA) "${caso}: sigue instalada"
    contiene 'OK  ya instalada (41 tractos, 176 nodos y 5176 aristas); no se repite:' (pantalla) "${caso}: lo dice"
    contiene $c.Motivo (pantalla) "${caso}: con el motivo"
    no_contiene 'install_tractography.sh' (llamadas docker) "${caso}: sin lanzarla"
  }
}

function prueba_la_memoria_de_docker_cuenta_aunque_windows_tenga_de_sobra {
  docker_tracto @($SIN_CARGAR, 'cat /proc/meminfo|0||MemTotal:        4000000 kB\nMemAvailable:    3000000 kB')
  [void](con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno (preparar_biblioteca))
  $m = valor_estado NG_TRACTOGRAFIA_MOTIVO
  contiene 'necesita 4096 MB libres dentro de Docker y hay 2929 MB (Docker tiene 3906 MB en total)' $m 'cuánta hay'
  # 3906 MB + (4096 - 2929) + lo que Linux no deja ver: 5,2 GB, hacia arriba.
  contiene "memory=6GB» en la sección [wsl2] de $env:USERPROFILE\.wslconfig" $m 'cuánta darle, calculada'
  contiene 'reinicia Docker Desktop y repite con: neurograph tractografia' $m 'y qué hacer después'
  no_contiene 'install_tractography.sh' (llamadas docker) 'sin lanzarla'
}

function prueba_si_a_windows_no_le_quedaria_la_suya_no_se_propone_mas_memoria {
  docker_tracto @($SIN_CARGAR, 'cat /proc/meminfo|0||MemTotal:        4000000 kB\nMemAvailable:    3000000 kB')
  $e = preparar_biblioteca
  $e['NEUROGRAPH_PRUEBA_RAM_MB'] = '8192'
  [void](con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno $e)
  $m = valor_estado NG_TRACTOGRAFIA_MOTIVO
  contiene 'Este ordenador tiene 8 GB de memoria: no se le puede dar más a Docker' $m 'no cabe, y lo dice'
  no_contiene 'memory=' $m 'sin proponer una cifra'
}

# Medido el 10/10/2026 en la maquina virtual de pruebas, con 12 GB: tras el
# paso 5, la maquina
# virtual de WSL ya ocupa su tope, y la tractografia no toma mas memoria de
# Windows. En Windows se pide solo lo que esa maquina virtual aun puede tomar.
function prueba_en_windows_se_pide_lo_que_aun_puede_tomar_la_maquina_virtual {
  docker_tracto @('cat /proc/meminfo|0||MemTotal:        6061316 kB\nMemAvailable:    5061632 kB')
  $e = preparar_biblioteca
  $e['NEUROGRAPH_PRUEBA_MEMORIA_MB'] = '2866'
  $e['NEUROGRAPH_PRUEBA_VMMEM_MB'] = '5926'
  igual 0 (con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno $e) 'sale con 0'
  contiene 'install_tractography.sh' (llamadas docker) 'con la máquina virtual llena, la lanza'
  contiene 'WSL ocupa 5926 MB de 6175 y puede tomar 249; con lo de Windows, hacen falta 1449 MB' (registro) 'lo que le falta hasta su tope y lo que gasta Windows'
  igual instalada (valor_estado NG_TRACTOGRAFIA) 'y queda instalada'
  # Con la maquina virtual pequena (Docker Desktop recien arrancado), puede
  # crecer hasta lo que se pide dentro de Docker.
  [IO.File]::WriteAllText((Join-Path $env:NG_PRUEBA_LLAMADAS 'docker'), '')
  docker_tracto @($SIN_CARGAR, 'cat /proc/meminfo|0||MemTotal:        6061316 kB\nMemAvailable:    5061632 kB')
  $e['NEUROGRAPH_PRUEBA_MEMORIA_MB'] = '3000'
  $e['NEUROGRAPH_PRUEBA_VMMEM_MB'] = '2000'
  igual 0 (con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno $e) 'no detiene la instalación'
  contiene 'memoria insuficiente ahora (hacen falta 5296 MB libres y hay 3000 MB)' (valor_estado NG_TRACTOGRAFIA_MOTIVO) 'queda pendiente, con lo que falta'
  no_contiene 'install_tractography.sh' (llamadas docker) 'sin lanzarla'
}

# Para medir la memoria de verdad (B2): el gancho de prueba solo salta
# la memoria; el tope del contenedor sigue.
function prueba_sin_pedir_memoria_la_lanza_con_su_tope {
  docker_tracto @($SIN_CARGAR, 'cat /proc/meminfo|0||MemTotal:        4000000 kB\nMemAvailable:    1000000 kB')
  $e = preparar_biblioteca
  $e['NEUROGRAPH_PRUEBA_MEMORIA_MB'] = '1000'
  $e['NEUROGRAPH_PRUEBA_SIN_MEMORIA_TRACTO'] = '1'
  igual 0 (con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno $e) 'sale con 0'
  contiene 'install_tractography.sh' (llamadas docker) 'la lanza, con poca memoria en Windows y en Docker'
  contiene '--memory 4g --memory-swap 4g' (llamadas docker) 'con el tope de siempre'
  contiene '(prueba) NEUROGRAPH_PRUEBA_SIN_MEMORIA_TRACTO' (registro) 'y lo anota'
}

function prueba_si_no_se_lee_la_memoria_de_docker_lo_dice_y_no_la_da_por_cero {
  docker_tracto @($SIN_CARGAR, 'cat /proc/meminfo|1||stderr:Error response from daemon: container is not running')
  [void](con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno (preparar_biblioteca))
  contiene 'no se pudo leer la memoria dentro de Docker' (valor_estado NG_TRACTOGRAFIA_MOTIVO) 'pendiente, con lo que pasó'
  no_contiene 'hay 0 MB' (valor_estado NG_TRACTOGRAFIA_MOTIVO) 'y no como si hubiera 0 MB'
  no_contiene 'install_tractography.sh' (llamadas docker) 'sin lanzarla'
}

function prueba_una_carpeta_que_docker_no_ve_queda_pendiente {
  docker_tracto @('test -d /biblioteca|125||docker: Error response from daemon: invalid mount config')
  [void](con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno (preparar_biblioteca))
  contiene 'Docker Desktop no ve la carpeta de la biblioteca' (valor_estado NG_TRACTOGRAFIA_MOTIVO) 'con su frase'
}

function prueba_sin_memoria_y_con_el_dato_en_la_ruta_de_windows {
  docker_tracto @('install_tractography.sh|137||Killed', 'inspect -f {{.State.OOMKilled}}|0||true')
  [void](con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno (preparar_biblioteca))
  contiene 'Faltó memoria al generar la tractografía' (valor_estado NG_TRACTOGRAFIA_MOTIVO) 'OOMKilled: falta de memoria'
  docker_tracto @('install_tractography.sh|1||ERROR: el md5 no coincide con el publicado en Zenodo (ee5f): /biblioteca/original/tractography/org2018_fiber_clusters_800/ORG-800FiberClusters.zip')
  [void](con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno (preparar_biblioteca))
  contiene "($env:USERPROFILE\Mi biblioteca\original\tractography\org2018_fiber_clusters_800\ORG-800FiberClusters.zip)" (valor_estado NG_TRACTOGRAFIA_MOTIVO) 'el archivo, con la ruta de Windows'
}

function prueba_un_fallo_sin_senal_conocida_da_la_frase_generica {
  docker_tracto @('install_tractography.sh|1||algo que no se reconoce')
  [void](con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno (preparar_biblioteca))
  igual pendiente (valor_estado NG_TRACTOGRAFIA) 'pendiente'
  contiene 'Algo ha fallado de forma inesperada.' (valor_estado NG_TRACTOGRAFIA_MOTIVO) 'con la frase genérica'
  no_contiene 'código desconocido' (registro) 'sin anotarlo como un error del instalador'
}

function prueba_ficha_en_conflicto_con_la_carga_hecha {
  docker_tracto @('install_tractography.sh|1||ERROR: la ficha no corresponde a sus archivos (checksum distinto): /biblioteca/original/tractography/org2018_fiber_clusters_800/dataset.yaml')
  igual 0 (con_lib ($ENVOLVER + $CUERPO) $LIBS -Entorno (preparar_biblioteca)) 'no detiene la instalación'
  igual ficha_en_conflicto (valor_estado NG_TRACTOGRAFIA) 'cargada, con la ficha en conflicto'
  contiene 'cargada, pero un archivo de la biblioteca no cuadra' (pantalla) 'y lo dice'
}

function prueba_ctrl_c_para_el_contenedor_y_la_deja_pendiente {
  $marca = Join-Path $env:USERPROFILE 'ctrl-c'
  docker_tracto @("install_tractography.sh|0|marca:$marca,espera:30|")
  $c = con_lib ($ENVOLVER + "function script:al_salir_extra(`$c) { parar_tractografia_en_curso }`n" + $CUERPO) $LIBS -Entorno ((preparar_biblioteca) + @{ NEUROGRAPH_PRUEBA_CTRL_C = $marca })
  igual 130 $c 'sale con 130'
  $l = llamadas docker
  contiene 'kill neurograph-app-tractografia' $l 'para el contenedor'
  contiene "pg_terminate_backend(pid) from pg_stat_activity where application_name='neurograph_tractografia'" $l 'y el psql de la carga'
  contiene 'Interrumpida' (valor_estado NG_TRACTOGRAFIA_MOTIVO) 'queda pendiente'
}

function prueba_parar_la_tractografia_no_se_cuelga_con_docker_colgado {
  simular_tabla docker @('*|0|espera:60|')
  $reloj = [Diagnostics.Stopwatch]::StartNew()
  [void](con_lib '$script:NG_ESPERA_LIMPIEZA = 2; $script:NG_TRACTO_EN_CURSO = $true; parar_tractografia_en_curso' $LIBS)
  if ($reloj.Elapsed.TotalSeconds -gt 40) { throw "FALLA: parar la tractografía tardó $([int]$reloj.Elapsed.TotalSeconds) s con Docker colgado" }
  igual 4 ([regex]::Matches((registro), [regex]::Escape('tiempo agotado (2 s): docker')).Count) 'kill, rm, psql y el SQL copiado, cada uno con su tiempo máximo'
  contiene 'Interrumpida' (valor_estado NG_TRACTOGRAFIA_MOTIVO) 'y queda pendiente'
}
