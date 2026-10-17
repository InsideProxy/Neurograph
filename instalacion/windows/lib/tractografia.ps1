# Paso 8 del instalador Windows: la tractografia en el contenedor de
# herramientas (B2 del diseno, H11). Si falla, NeuroGraph queda instalado sin
# ella y el estado dice por que (pendiente): nunca detiene la instalacion.
# Como instalacion/linux/lib/tractografia.sh, salvo que la memoria libre se
# pide en Windows y dentro de Docker; que la biblioteca se monta en
# /biblioteca y los datos de las frases se traducen a la ruta de Windows; y
# que no lleva --user: en Windows los archivos los escribe Docker Desktop a
# nombre de la persona (por comprobar en la primera ejecucion real).
# Variables de prueba: NEUROGRAPH_PRUEBA_TOPE_MEMORIA (otro --memory, p. ej.
# 300m) y NEUROGRAPH_PRUEBA_SIN_MEMORIA_TRACTO (sistema.ps1).

$NG_TRACTO_EN_CURSO = $false
$NG_EVENTOS = $null
$NG_TRACTO_TEMPORALES = @()  # su salida y sus eventos: los borra tambien parar_tractografia_en_curso

function nombre_contenedor_tracto { return "$NG_PROYECTO-tractografia" }

function marcar_tractografia([string]$estado, [string]$motivo = '') {  # -> $false si no se pudo guardar
  try {
    guardar_valor $NG_ESTADO NG_TRACTOGRAFIA $estado
    if ($motivo) { guardar_valor $NG_ESTADO NG_TRACTOGRAFIA_MOTIVO $motivo } else { borrar_valor $NG_ESTADO NG_TRACTOGRAFIA_MOTIVO }
    return $true
  } catch { relanzar_si_ng $_; registrar "estado de la tractografía: $($_.Exception.Message)"; return $false }
}

function dejar_pendiente([string]$motivo) {
  if (-not (marcar_tractografia pendiente $motivo)) { fallar estado $NG_ESTADO }
  $script:NG_MARCA = $NG_MARCA_AVISO
  $script:NG_RESUMEN = "pendiente - $motivo"
}

# Sin recursos para lanzarla ahora: pendiente, salvo que la tractografia ya
# este cargada (al repetir la instalacion con poca memoria). Con los datos en
# la base, «pendiente» seria falso: sigue instalada y se dice que no se repite (B2).
function sin_recursos_para_lanzarla([string]$motivo) {  # -> $true si ya estaba cargada
  if ((ng_psql $NG_CONSULTA_TRACTOGRAFIA -Tolerante) -ne $NG_ESPERADO_TRACTOGRAFIA) { dejar_pendiente $motivo; return $false }
  if (-not (marcar_tractografia instalada)) { fallar estado $NG_ESTADO }
  $n = $NG_ESPERADO_TRACTOGRAFIA -split ' '
  $script:NG_RESUMEN = "ya instalada ($($n[0]) tractos, $($n[1]) nodos y $($n[2]) aristas); no se repite: $motivo"
  return $true
}

function primera_minuscula([string]$s) { if ($s) { return $s.Substring(0, 1).ToLower() + $s.Substring(1) } return $s }

# La memoria del Linux interno de Docker: /proc/meminfo es de toda su maquina
# virtual; se lee en el contenedor de Postgres, encendido durante la tractografia (B2).
function memoria_docker_mb {  # -> @{ Libre; Total } en MB; $null si no se pudo leer (no es 0)
  $libre = $null
  $total = $null
  foreach ($l in ((docker_valor @('exec', "$NG_PROYECTO-postgres", 'cat', '/proc/meminfo')) -split "`n")) {
    if ($l -match '^MemAvailable:\s+(\d+)') { $libre = [int][Math]::Floor([long]$Matches[1] / 1024) }
    if ($l -match '^MemTotal:\s+(\d+)') { $total = [int][Math]::Floor([long]$Matches[1] / 1024) }
  }
  return @{ Libre = $libre; Total = $total }
}

# Lo que le falta a Docker, como la opcion memory de .wslconfig (B2): la que
# tiene ahora mas la que le falta a la tractografia, mas la que Linux no deja
# ver de lo configurado, en GB enteros hacia arriba. Si a Windows no le
# quedaria la suya, no cabe: la frase lo dice en lugar de dar una cifra.
function frase_memoria_docker($md) {
  $necesaria = "$NG_MIN_MEMORIA_TRACTO_MB MB"
  $gb = [int][Math]::Ceiling(($md.Total + $NG_MIN_MEMORIA_TRACTO_MB - $md.Libre + $NG_MEMORIA_OCULTA_WSL_MB) / 1024)
  $ram = ram_instalada_mb
  registrar "memoria para WSL: harían falta $gb GB; instalada $ram MB, Windows necesita $NG_MEMORIA_WINDOWS_MB MB"
  if ($gb * 1024 + $NG_MEMORIA_WINDOWS_MB -gt $ram) {
    return (frase memoria_docker_no_cabe $necesaria "$($md.Libre) MB" "$($md.Total) MB" "$([Math]::Round($ram / 1024, 1)) GB")
  }
  return (frase memoria_docker $necesaria "$($md.Libre) MB" "$($md.Total) MB" "$gb" (Join-Path $env:USERPROFILE '.wslconfig') $NG_URL_WSLCONFIG)
}

# Los datos de las frases del contenedor nombran /biblioteca/...: se
# traducen a la ruta de Windows antes de ensenarse (B2).
function ruta_de_windows([string]$texto) {
  $bib = leer_valor $NG_CONFIG NG_BIBLIOTECA
  $cambio = { param($m) $bib + $m.Groups[1].Value.Replace('/', '\') }.GetNewClosure()
  return [regex]::Replace($texto, '/biblioteca((?:/[^\s:()]*)?)', [Text.RegularExpressions.MatchEvaluator]$cambio)
}

# docker run solo pasa las senales al primer proceso del contenedor: se para
# con kill (B2). docker kill no llega al psql que la carga corre con docker
# exec en Postgres: se termina por su nombre (el PGAPPNAME del script) y se
# borra el SQL copiado.
function parar_tractografia_en_curso {
  if (-not $script:NG_TRACTO_EN_CURSO) { return }
  $c = nombre_contenedor_tracto
  [void](ejecutar_programa docker @('kill', $c) -Capturar -TiempoMax $NG_ESPERA_LIMPIEZA)
  [void](ejecutar_programa docker @('rm', '-f', $c) -Capturar -TiempoMax $NG_ESPERA_LIMPIEZA)
  [void](ng_psql "select pg_terminate_backend(pid) from pg_stat_activity where application_name='neurograph_tractografia'" -Tolerante -TiempoMax $NG_ESPERA_LIMPIEZA)
  [void](ejecutar_programa docker @('exec', "$NG_PROYECTO-postgres", 'rm', '-f', '/tmp/neurograph_tractografia.sql') -Capturar -TiempoMax $NG_ESPERA_LIMPIEZA)
  if ($script:NG_EVENTOS) { [void](detener_proceso $script:NG_EVENTOS); $script:NG_EVENTOS = $null }
  # Ya sin el proceso de los eventos, que tenia abierto su archivo: el
  # finally de paso_tractografia no lo pudo borrar.
  if ($script:NG_TRACTO_TEMPORALES) { Remove-Item -LiteralPath $script:NG_TRACTO_TEMPORALES -Force -ErrorAction SilentlyContinue; $script:NG_TRACTO_TEMPORALES = @() }
  $script:NG_TRACTO_EN_CURSO = $false
  if (-not (marcar_tractografia pendiente 'Interrumpida; repite con: neurograph tractografia')) { registrar 'No se pudo anotar la interrupción' }
  registrar 'Contenedor de la tractografía parado'
}

function paso_tractografia {  # -> $true si quedo instalada
  $c = nombre_contenedor_tracto
  # Primero, si hay otra en marcha (tambien la de una ventana cerrada con la
  # X, B1): falta memoria justo por ella, y su estado no se toca.
  switch (docker_valor @('inspect', '-f', '{{.State.Running}}', $c)) {
    'true' { fallar tracto_en_marcha }
    'false' { [void](ejecutar_programa docker @('rm', '-f', $c) -Capturar) }
  }
  $motivo = leer_valor $NG_ESTADO NG_TRACTO_SIN_RECURSOS
  if ($motivo) { return (sin_recursos_para_lanzarla $motivo) }
  # La memoria se mira otra vez, con NeuroGraph encendido: dentro de Docker
  # y, en Windows, la que aun puede tomar su maquina virtual (B2).
  $md = memoria_docker_mb
  if ($null -eq $md.Libre -or $null -eq $md.Total) {
    return (sin_recursos_para_lanzarla 'no se pudo leer la memoria dentro de Docker; repite con: neurograph tractografia')
  }
  registrar "memoria dentro de Docker: libre $($md.Libre) MB de $($md.Total) MB"
  if ($md.Libre -lt $NG_MIN_MEMORIA_TRACTO_MB -and -not (sin_pedir_memoria_tracto)) {
    return (sin_recursos_para_lanzarla (frase_memoria_docker $md))
  }
  $mem = memoria_libre_mb
  $necesaria = memoria_windows_para_tracto $md.Total
  if ($mem -lt $necesaria -and -not (sin_pedir_memoria_tracto)) {
    return (sin_recursos_para_lanzarla "memoria insuficiente ahora (hacen falta $necesaria MB libres y hay $mem MB)")
  }
  $bib = leer_valor $NG_CONFIG NG_BIBLIOTECA
  try { [void](New-Item -ItemType Directory -Force -Path $bib) } catch { relanzar_si_ng $_; dejar_pendiente (frase biblioteca_sin_permiso $bib); return $false }
  # Sin la imagen, docker run la buscaria en Docker Hub con ese nombre (B1).
  if (-not (existe_imagen "$NG_PROYECTO-herramientas")) { dejar_pendiente (frase imagenes); return $false }
  # Un disco conectado despues de abrir Docker Desktop puede no verse en su Linux interno (B2).
  $visible = ejecutar_programa docker @('run', '--rm', '--pull', 'never', '--mount', "type=bind,src=$bib,dst=/biblioteca", "$NG_PROYECTO-herramientas", 'test', '-d', '/biblioteca') -TiempoMax 120
  if ($visible.Codigo -ne 0) { dejar_pendiente (frase biblioteca_no_visible $bib); return $false }
  $tope = if ($env:NEUROGRAPH_PRUEBA_TOPE_MEMORIA) { $env:NEUROGRAPH_PRUEBA_TOPE_MEMORIA } else { $NG_TOPE_MEMORIA_TRACTO }
  $salida = Join-Path $env:TEMP ('neurograph-tracto-' + [guid]::NewGuid().ToString('N') + '.txt')
  $eventos = "$salida.eventos"
  # En curso antes de crear nada: un Ctrl+C a partir de aqui lo limpia todo.
  $script:NG_TRACTO_TEMPORALES = @($salida, $eventos)
  $script:NG_TRACTO_EN_CURSO = $true
  try {
    $script:NG_EVENTOS = ejecutar_programa docker @('events', '--filter', "container=$c", '--filter', 'event=oom', '--format', '{{.Action}}') -SinEsperar -Copia $eventos
    $r = ejecutar_programa docker @('run', '--name', $c, '--pull', 'never',
      '-e', 'PYTHONDONTWRITEBYTECODE=1', '-e', 'NEUROGRAPH_LIBRARY__PATH=/biblioteca',
      '--mount', 'type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock',
      '--mount', "type=bind,src=$bib,dst=/biblioteca",
      '--memory', $tope, '--memory-swap', $tope,
      "$NG_PROYECTO-herramientas", 'bash', '/app/scripts/install_tractography.sh', "$NG_PROYECTO-postgres") -Copia $salida
    $oom = docker_valor @('inspect', '-f', '{{.State.OOMKilled}}', $c)
    [void](ejecutar_programa docker @('rm', '-f', $c) -Capturar)
    esperar_segundos 1
    [void](detener_proceso $script:NG_EVENTOS)
    $script:NG_EVENTOS = $null
    $script:NG_TRACTO_EN_CURSO = $false
    $texto_eventos = ''
    if (Test-Path -LiteralPath $eventos) { $texto_eventos = [IO.File]::ReadAllText($eventos, $NG_UTF8).Trim() }
    registrar "tractografía: código $($r.Codigo), OOMKilled=$oom, eventos oom: $texto_eventos"
    if ($r.Codigo -eq 0 -and (ng_psql $NG_CONSULTA_TRACTOGRAFIA -Tolerante) -eq $NG_ESPERADO_TRACTOGRAFIA) {
      if (-not (marcar_tractografia instalada)) { fallar estado $NG_ESTADO }
      $n = $NG_ESPERADO_TRACTOGRAFIA -split ' '
      $script:NG_RESUMEN = "$($n[0]) tractos, $($n[1]) nodos y $($n[2]) aristas"
      return $true
    }
    $codigo_fallo = if ($oom -eq 'true' -or $texto_eventos -match 'oom') { 'memoria' } else { clasificar_salida $salida }
    # Sin senal conocida, la frase generica (como «${1:-inesperado}» en Linux).
    if (-not $codigo_fallo) { $codigo_fallo = 'inesperado' }
    $detalle = ruta_de_windows (detalle_senal $codigo_fallo $salida)
    # Las frases de espacio y red mandan repetir el instalador: aqui se repite la tractografia.
    if ($codigo_fallo -eq 'espacio') { $codigo_fallo = 'espacio_script' } elseif ($codigo_fallo -eq 'red') { $codigo_fallo = 'descarga' }
    $frase_motivo = frase $codigo_fallo $detalle
    if ($codigo_fallo -eq 'ficha' -and (ng_psql $NG_CONSULTA_TRACTOGRAFIA -Tolerante) -eq $NG_ESPERADO_TRACTOGRAFIA) {
      if (-not (marcar_tractografia ficha_en_conflicto $frase_motivo)) { fallar estado $NG_ESTADO }
      $script:NG_MARCA = $NG_MARCA_AVISO
      $script:NG_RESUMEN = "cargada, pero $(primera_minuscula $frase_motivo)"
      return $false
    }
    dejar_pendiente $frase_motivo
    return $false
  } finally {
    Remove-Item -LiteralPath $salida, $eventos -Force -ErrorAction SilentlyContinue
  }
}
