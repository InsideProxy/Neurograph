# Pasos 2 y 3 del instalador Windows: WSL2 y Docker Desktop, y Docker en
# marcha (bloque A, B1 y B3 del diseno, H11); y las funciones del proceso
# elevado (elevado.ps1), que hace en una sola elevacion UAC todo lo que
# necesita administrador.
# Variables de prueba (sin efecto si no se definen), ademas de las de deteccion de sistema.ps1:
#   NEUROGRAPH_PRUEBA_ELEVADO              .exe que hace de proceso elevado, con la misma linea (1223 = «No» del UAC)
#   NEUROGRAPH_PRUEBA_COMPONENTES          archivo con el estado de VirtualMachinePlatform
#   NEUROGRAPH_PRUEBA_REINICIO_PENDIENTE   si | no
#   NEUROGRAPH_PRUEBA_PROGRAMFILES         carpeta en lugar de la de Archivos de programa (proceso elevado)

$NG_REINICIO = $false
$NG_SEGUIRA_SOLO = $false

# --- Paso 2, sin elevar

# Antes de instalarlo, las condiciones de Docker Desktop. Aceptar por la
# persona no seria correcto: solo con un si se pasa --accept-license. La
# respuesta se guarda para no repetir la pregunta tras un reinicio.
function aceptar_licencia_docker {
  if ((leer_valor $NG_ESTADO NG_LICENCIA_DOCKER) -like 'aceptada*') { return }
  decir 'Para usar NeuroGraph hace falta Docker Desktop, que no está instalado. Sus condiciones de uso:'
  decir '  - es gratis para uso personal, educación, proyectos de código abierto no comerciales y empresas de menos de 250 empleados y menos de 10 millones de dólares de facturación al año;'
  decir '  - es de pago para las demás empresas y para la administración pública.'
  decir "  Licencia: $NG_URL_LICENCIA_DOCKER"
  if (preguntar_si '¿Aceptas las condiciones de Docker Desktop?' 'n') {
    guardar_valor $NG_ESTADO NG_LICENCIA_DOCKER "aceptada $(fecha_corta)"
    return
  }
  guardar_valor $NG_ESTADO NG_LICENCIA_DOCKER "rechazada $(fecha_corta)"
  fallar licencia_no
}

# Se descarga sin elevar; la firma se comprueba en el proceso elevado.
function descargar_docker_desktop {  # -> la ruta del instalador descargado
  $dir = Join-Path $NG_DIR 'descargas'
  [void](New-Item -ItemType Directory -Force -Path $dir)
  $destino = Join-Path $dir 'Docker Desktop Installer.exe'
  if (Test-Path -LiteralPath $destino) { registrar 'instalador de Docker Desktop ya descargado'; return $destino }
  decir 'Descargando Docker Desktop (puede tardar unos minutos)...'
  # -C -: una descarga cortada sigue donde se quedo; si el servidor no deja
  # reanudar (33), se empieza de cero una vez (como install_tractography.sh).
  $r = ejecutar_programa curl @('-fL', '--retry', '3', '-C', '-', '-o', "$destino.part", $NG_URL_DOCKER_DESKTOP) -TiempoMax $NG_ESPERA_DESCARGA
  if ($r.Codigo -eq 33) {
    Remove-Item -LiteralPath "$destino.part" -Force -ErrorAction SilentlyContinue
    $r = ejecutar_programa curl @('-fL', '--retry', '3', '-o', "$destino.part", $NG_URL_DOCKER_DESKTOP) -TiempoMax $NG_ESPERA_DESCARGA
  }
  if ($r.Codigo -ne 0 -or -not (Test-Path -LiteralPath "$destino.part")) { fallar descarga_docker }
  Move-Item -LiteralPath "$destino.part" -Destination $destino -Force
  registrar "descargado: $((Get-Item -LiteralPath $destino).Length) bytes"
  return $destino
}

function es_cancelacion_uac($e) {  # el «No» del UAC llega como Win32Exception 1223 (ERROR_CANCELLED)
  $x = $e.Exception
  while ($x) {
    if ($x -is [ComponentModel.Win32Exception] -and $x.NativeErrorCode -eq 1223) { return $true }
    $x = $x.InnerException
  }
  return $false
}

# Un PowerShell aparte, elevado con el verbo runas de Process.Start: el
# Start-Process de 5.1 envuelve el «No» del UAC sin el Win32Exception 1223
# dentro. En las pruebas nunca se eleva: lo hace un .exe falso, con la misma
# linea de ordenes en bruto y por el mismo bucle de espera, que sale con 1223
# en lugar del «No».
function lanzar_elevado([string]$argumentos) {  # -> codigo de salida del proceso elevado
  # El arnes de integracion espera esta linea para contestar el UAC.
  registrar "pidiendo permiso de administrador: powershell.exe $argumentos"
  $psi = New-Object Diagnostics.ProcessStartInfo (Join-Path $PSHOME 'powershell.exe'), $argumentos
  if ($env:NEUROGRAPH_PRUEBA_SOLO_SIMULADOS) {
    comprobar_simulado $env:NEUROGRAPH_PRUEBA_ELEVADO
    $psi.FileName = $env:NEUROGRAPH_PRUEBA_ELEVADO
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
  } else {
    $psi.UseShellExecute = $true
    $psi.Verb = 'runas'
    $psi.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
  }
  try { $p = [Diagnostics.Process]::Start($psi) } catch {
    registrar "elevación: $($_.Exception.Message)"
    if (es_cancelacion_uac $_) { fallar uac_denegado }
    throw
  }
  # Una ventana sin elevar no puede parar un proceso de administrador: un
  # Ctrl+C se dice, se espera a que termine y despues se para.
  $interrumpido = $false
  while (-not $p.WaitForExit(200)) {
    latido_tic
    try { comprobar_interrupcion } catch {
      if ("$($_.Exception.Message)" -ne 'NG:interrumpido') { throw }
      if (-not $interrumpido) { decir 'Esta parte, con permiso de administrador, no se puede interrumpir: se para cuando termine.'; $interrumpido = $true }
    }
  }
  registrar "proceso elevado: código $($p.ExitCode)"
  if ($p.ExitCode -eq 1223) { fallar uac_denegado }
  if ($interrumpido) { throw 'NG:interrumpido' }
  return $p.ExitCode
}

# El proceso elevado escribe su registro en la carpeta de NeuroGraph de esta
# cuenta (la ruta absoluta se le pasa: si aprueba otra cuenta de
# administrador, el proceso elevado es esa cuenta, con su propio perfil). Al
# terminar, sus lineas pasan tambien al registro principal, que es el que se envia.
function elevar([string]$wsl, [string]$instalador) {  # -> codigo del proceso elevado
  $reg = Join-Path $NG_DIR ('registro\elevado-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
  $argumentos = '-NoProfile -ExecutionPolicy Bypass -File ' + (citar_argumento (Join-Path $NG_RAIZ 'instalacion\windows\elevado.ps1')) +
    ' -Registro ' + (citar_argumento $reg) + ' -Wsl ' + $wsl
  if ($instalador) { $argumentos += ' -Instalador ' + (citar_argumento $instalador) }
  registrar "registro del proceso elevado: $reg"
  try { return (lanzar_elevado $argumentos) }
  finally {
    if (Test-Path -LiteralPath $reg) {
      registrar '--- registro del proceso elevado:'
      try { foreach ($l in [IO.File]::ReadAllLines($reg, $NG_UTF8)) { registrar "  $l" } }
      catch { registrar "  (no se pudo leer: $($_.Exception.Message))" }
      registrar '--- fin del registro del proceso elevado'
    }
  }
}

# Paso 2.6: si aun no hay docker en el PATH de este proceso (recien
# instalado), se anade la carpeta de Docker Desktop. Si ya hay uno, no se
# toca: el paso 3 comprueba que sea el de Docker Desktop.
function usar_docker_del_path($dd) {
  if (resolver_programa docker) { return }
  $bin = Join-Path $dd.Dir 'resources\bin'
  $env:PATH = "$bin;$env:PATH"
  registrar "PATH de este proceso: con $bin"
}

function paso_docker {
  $dd = docker_desktop_instalado
  if ((wsl_valido) -and $dd) {
    usar_docker_del_path $dd
    $script:NG_RESUMEN = "ya estaba (Docker Desktop $($dd.Version), WSL $(version_wsl))"
    return
  }
  $instalador = ''
  if (-not $dd) {
    aceptar_licencia_docker
    $instalador = descargar_docker_desktop
  }
  $wsl = if (wsl_valido) { 'nada' } else { 'asegurar' }
  # Paso 2.5: tras el reinicio, el WSL2 que activaron los componentes de
  # Windows queda sin el de GitHub: segunda elevacion, sin el instalador.
  if (-not $dd) { decir 'Hace falta instalar o activar WSL2 y Docker Desktop: Windows te pedirá permiso de administrador.' }
  elseif ($script:NG_CONTINUAR_EN -ge 2) { decir 'Falta actualizar WSL2, que se activó antes del reinicio: Windows te pedirá permiso de administrador por segunda vez.' }
  else { decir 'Falta activar o actualizar WSL2, que necesita Docker Desktop: Windows te pedirá permiso de administrador.' }
  $codigo = elevar $wsl $instalador
  if ($instalador -and (docker_desktop_instalado)) {
    guardar_valor $NG_ESTADO NG_DOCKER_INSTALADO_AQUI (fecha_corta)
    Remove-Item -LiteralPath $instalador -Force -ErrorAction SilentlyContinue
  }
  switch ($codigo) {
    0 { break }
    3010 { break }
    10 { Remove-Item -LiteralPath $instalador -Force -ErrorAction SilentlyContinue; fallar firma_docker }
    11 { fallar wsl_activar }
    12 { fallar wsl_actualizar }
    13 { fallar instalacion_docker }
    default { fallar inesperado }
  }
  if ($codigo -eq 3010) {
    $script:NG_REINICIO = $true
    $script:NG_MARCA = $NG_MARCA_AVISO
    $script:NG_RESUMEN = 'falta reiniciar Windows'
    return
  }
  $dd = docker_desktop_instalado
  if (-not $dd) { fallar instalacion_docker }
  if (-not (wsl_valido)) { fallar wsl_actualizar }
  usar_docker_del_path $dd
  $script:NG_RESUMEN = "instalado (Docker Desktop $($dd.Version), WSL $(version_wsl))"
}

# Paso 2.4, sin elevar: RunOnce del usuario para seguir al iniciar sesion.
# RunOnce admite unos 260 caracteres: la entrada solo lleva el .cmd y
# --tras-reinicio; la biblioteca ya esta en config.env desde el paso 1 (y se
# guarda otra vez aqui, por si se llego sin el).
function preparar_reinicio {
  if ($script:NG_BIBLIOTECA_ELEGIDA) { guardar_valor $NG_CONFIG NG_BIBLIOTECA $script:NG_BIBLIOTECA_ELEGIDA }
  $orden = '"' + (Join-Path $NG_RAIZ 'instalacion\windows\instalar.cmd') + '" --tras-reinicio'
  $clave = (raiz_hkcu) + 'Software\Microsoft\Windows\CurrentVersion\RunOnce'
  if (-not (Test-Path -LiteralPath $clave)) { [void](New-Item -Path $clave -Force) }
  $script:NG_SEGUIRA_SOLO = $orden.Length -le 260
  if ($script:NG_SEGUIRA_SOLO) {
    Set-ItemProperty -LiteralPath $clave -Name 'NeuroGraph' -Value $orden
    registrar "RunOnce: $orden"
  } else {
    registrar "RunOnce: la orden pasa de 260 caracteres ($($orden.Length)): no se apunta"
  }
}

function pedir_reinicio {  # tras el paso 2 -> NG:reiniciar (codigo 3010)
  preparar_reinicio
  decir ''
  decir 'Hay que reiniciar Windows para terminar de activar WSL2.'
  if ($script:NG_SEGUIRA_SOLO) { decir 'Al volver a entrar en tu sesión, el instalador seguirá solo donde lo dejó.' }
  else { decir "Al volver a entrar, abre otra vez $(Join-Path $NG_RAIZ 'instalacion\windows\instalar.cmd')." }
  if (preguntar_si '¿Reiniciar ahora?') {
    decir 'Windows se reiniciará en 15 segundos.'
    [void](ejecutar_programa shutdown @('/r', '/t', '15', '/c', 'NeuroGraph: reinicio para terminar de activar WSL2') -Codificacion oem)
  } else {
    decir 'Reinicia cuando puedas.'
  }
  throw 'NG:reiniciar'
}

# --- Proceso elevado (elevado.ps1). Devuelven codigos de salida, no frases:
# este proceso no tiene pantalla; el que lo lanzo da la frase.

function estado_componente([string]$nombre) {  # Disabled | EnablePending | Enabled (necesita administrador)
  if ($env:NEUROGRAPH_PRUEBA_COMPONENTES) { return ([IO.File]::ReadAllText($env:NEUROGRAPH_PRUEBA_COMPONENTES)).Trim() }
  if ($env:NEUROGRAPH_PRUEBA_SOLO_SIMULADOS) { throw 'prueba: estado_componente de verdad; simúlalo con NEUROGRAPH_PRUEBA_COMPONENTES' }
  return [string](Get-WindowsOptionalFeature -Online -FeatureName $nombre).State
}

function activar_componentes {  # la segunda via del paso 2.3.3 (las pruebas la redefinen)
  if ($env:NEUROGRAPH_PRUEBA_SOLO_SIMULADOS) { throw 'prueba: activar_componentes de verdad' }
  [void](Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform, Microsoft-Windows-Subsystem-Linux -All -NoRestart)
}

# Paso 2.3.3: WSL2 sin distribucion. Primero wsl --install --no-distribution
# --web-download; si VirtualMachinePlatform sigue sin activar, los
# componentes de Windows. Activado ya, falta el WSL de GitHub si no esta o es
# anterior a la 2.1.5 (paso 2.5). Se decide por el estado de los componentes
# y la version del archivo, nunca por el texto de wsl.exe. Cualquier estado
# que no sea activado o pendiente de reinicio (Disabled, DisablePending,
# DisabledWithPayloadRemoved...) cuenta como sin activar. Si se activa en
# este proceso, hay que reiniciar: Windows lo da ya por Enabled, no por
# EnablePending (visto el 10/10/2026). wsl, con la consola como entrada:
# el de serie se niega sin ella (Datos verificados del diseno). -> 0, 3010, 11 o 12.
function asegurar_wsl {
  if (wsl_valido) { registrar "WSL $(version_wsl): vale"; return 0 }
  $activo = 'Enabled', 'EnablePending'
  $vmp = estado_componente VirtualMachinePlatform
  $vmp_antes = $vmp
  registrar "WSL: versión «$(version_wsl)», VirtualMachinePlatform $vmp"
  if ($vmp -notin $activo) {
    [void](ejecutar_programa wsl @('--install', '--no-distribution', '--web-download') -Entorno @{ WSL_UTF8 = '1' } -TiempoMax $NG_ESPERA_WSL -EntradaConsola)
    $vmp = estado_componente VirtualMachinePlatform
    registrar "tras wsl --install: VirtualMachinePlatform $vmp, WSL «$(version_wsl)»"
  }
  if ($vmp -notin $activo) {
    try { activar_componentes } catch { relanzar_si_ng $_; registrar "activar los componentes: $($_.Exception.Message)" }
    $vmp = estado_componente VirtualMachinePlatform
    registrar "tras activar los componentes: VirtualMachinePlatform $vmp"
  }
  if ($vmp -notin $activo) { return 11 }
  if ($vmp -eq 'EnablePending' -or $vmp_antes -notin $activo) { return 3010 }
  if (wsl_valido) { return 0 }
  [void](ejecutar_programa wsl @('--update', '--web-download') -Entorno @{ WSL_UTF8 = '1' } -TiempoMax $NG_ESPERA_WSL -EntradaConsola)
  if (wsl_valido) { return 0 }
  return 12
}

# Paso 2.3.2: firma Authenticode valida (cadena hasta una raiz de confianza;
# no la de un catalogo de Windows) y de Docker Inc. El firmante se compara
# campo a campo y distinguiendo mayusculas, con el Subject del certificado de
# Docker Desktop 4.x visto el 10/10/2026 (Datos verificados del
# diseno): CN, O, L, S y C.
$NG_FIRMANTE_DOCKER = @{ CN = 'Docker Inc'; O = 'Docker Inc'; L = 'Palo Alto'; S = 'California'; C = 'US' }
function es_firma_de_docker($f) {  # el resultado de Get-AuthenticodeSignature -> $true si vale
  if ("$($f.Status)" -cne 'Valid' -or "$($f.SignatureType)" -cne 'Authenticode' -or -not $f.SignerCertificate) { return $false }
  $campos = @{}
  $sujeto = $f.SignerCertificate.SubjectName.Decode([Security.Cryptography.X509Certificates.X500DistinguishedNameFlags]'UseNewLines, DoNotUseQuotes')
  foreach ($l in ($sujeto -split "`r?`n")) {
    $i = $l.IndexOf('=')
    if ($i -gt 0) { $campos[$l.Substring(0, $i).Trim()] = $l.Substring($i + 1).Trim() }
  }
  foreach ($k in $NG_FIRMANTE_DOCKER.Keys) { if ($campos[$k] -cne $NG_FIRMANTE_DOCKER[$k]) { return $false } }
  return $true
}

function verificar_firma([string]$ruta) {  # -> $true si se puede ejecutar
  $f = Get-AuthenticodeSignature -LiteralPath $ruta
  $sujeto = ''
  $huella = ''
  if ($f.SignerCertificate) {
    $sujeto = $f.SignerCertificate.Subject
    $huella = $f.SignerCertificate.Thumbprint
  }
  registrar "firma de $(Split-Path -Leaf $ruta): $($f.Status), tipo $($f.SignatureType), firmante «$sujeto», huella $huella"
  return (es_firma_de_docker $f)
}

function instalar_docker_desktop([string]$ruta) {  # -> 0, 3010 o 13
  # Sin preguntas y para todos los usuarios (la instalacion por defecto de
  # Docker); --accept-license porque la persona dijo que si.
  $r = ejecutar_programa $ruta @('install', '--quiet', '--accept-license') -TiempoMax $NG_ESPERA_INSTALADOR_DOCKER
  if ($r.Codigo -eq 0 -or $r.Codigo -eq 3010) { return $r.Codigo }
  $log = Get-ChildItem -Path (Join-Path $env:ProgramData 'DockerDesktop') -Filter 'install-log*.txt' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime | Select-Object -Last 1
  if ($log) {
    registrar "--- últimas líneas de $($log.FullName):"
    Get-Content -LiteralPath $log.FullName -Tail 50 | ForEach-Object { registrar $_ }
  }
  return 13
}

# La carpeta de Archivos de programa de Windows, no de una variable de
# entorno: no depende de lo que traiga el entorno del proceso (Seguridad, en
# el diseno). Windows rehace %ProgramFiles% al arrancar cada proceso
# (comprobado en la maquina virtual de pruebas), asi que las pruebas
# tampoco lo pueden cambiar
# por la carpeta de su caja: NEUROGRAPH_PRUEBA_PROGRAMFILES. Nunca la de verdad en una prueba.
function dir_archivos_de_programa {
  if ($env:NEUROGRAPH_PRUEBA_PROGRAMFILES) { return $env:NEUROGRAPH_PRUEBA_PROGRAMFILES }
  if ($env:NEUROGRAPH_PRUEBA_SOLO_SIMULADOS) { throw 'prueba: la carpeta de Archivos de programa de verdad; simúlala con NEUROGRAPH_PRUEBA_PROGRAMFILES' }
  return [Environment]::GetFolderPath('ProgramFiles')
}
# neurograph-app y no NeuroGraph: una aplicacion de escritorio (Tauri)
# instalada para todos los usuarios iria en %ProgramFiles%\neurograph, y
# Windows no distingue mayusculas (Seguridad, en el diseno).
function carpeta_instalador_docker { return (Join-Path (dir_archivos_de_programa) 'neurograph-app\instalador-docker') }

function es_punto_de_reanalisis([string]$d) {  # un enlace o una union: llevaria a otra carpeta
  return ((Test-Path -LiteralPath $d) -and [bool]((Get-Item -LiteralPath $d -Force).Attributes -band [IO.FileAttributes]::ReparsePoint))
}

# Paso 2.3.1: una carpeta en la que solo pueden escribir los administradores
# y SYSTEM (por SID: los nombres van traducidos), creada asi desde el
# principio y sin heredar permisos. Si ella o la de encima es un punto de
# reanalisis, no se usa. Lo que hubiera de antes se borra.
function carpeta_protegida([string]$carpeta) {
  foreach ($d in (Split-Path -Parent $carpeta), $carpeta) {
    if (es_punto_de_reanalisis $d) { throw "la carpeta $d es un punto de reanálisis (un enlace o una unión): no se usa" }
  }
  if (Test-Path -LiteralPath $carpeta) { Remove-Item -LiteralPath $carpeta -Recurse -Force }
  $acl = New-Object Security.AccessControl.DirectorySecurity
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($sid in 'S-1-5-32-544', 'S-1-5-18') {
    $quien = New-Object Security.Principal.SecurityIdentifier $sid
    $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($quien, 'FullControl', 'ContainerInherit, ObjectInherit', 'None', 'Allow')))
  }
  [void][IO.Directory]::CreateDirectory($carpeta, $acl)
}

function trabajo_elevado([string]$wsl, [string]$instalador, [string]$carpeta) {  # -> codigo de elevado.ps1
  $copia = ''
  if ($instalador) {
    # Paso 2.3.1: la firma se comprueba en la copia de la carpeta protegida, y
    # se instala esa misma copia: sin hueco entre comprobar y ejecutar.
    carpeta_protegida $carpeta
    $copia = Join-Path $carpeta 'Docker Desktop Installer.exe'
    Copy-Item -LiteralPath $instalador -Destination $copia
    if (-not (verificar_firma $copia)) { return 10 }
  }
  $reiniciar = $false
  if ($wsl -eq 'asegurar') {
    $c = asegurar_wsl
    if ($c -eq 3010) { $reiniciar = $true } elseif ($c -ne 0) { return $c }
  }
  if ($copia) {
    $c = instalar_docker_desktop $copia
    if ($c -eq 3010) { $reiniciar = $true }
    elseif ($c -ne 0) {
      # Con WSL2 pendiente de reinicio, se reinicia igual: el instalador
      # descargado se conserva y, al volver, se instala otra vez.
      if ($reiniciar) { registrar "Docker Desktop no se instaló (código $c) con WSL2 pendiente de reinicio: se intentará otra vez tras reiniciar"; return 3010 }
      return 13
    }
  }
  if ($reiniciar) { return 3010 }
  return 0
}

# --- Docker (pasos 3 a 9 y uso diario)

function docker_responde { return ((ejecutar_programa docker @('info', '--format', '{{.ServerVersion}}') -Capturar -TiempoMax 30).Codigo -eq 0) }

function docker_valor([string[]]$a) {  # -> la salida de una consulta a Docker (vacia si falla)
  $r = ejecutar_programa docker $a -Capturar -TiempoMax 60
  if ($r.Codigo -ne 0) { return '' }
  return ($r.Salida -join "`n").Trim()
}

function contenedor_en_marcha([string]$nombre) { return (docker_valor @('inspect', '-f', '{{.State.Running}}', $nombre)) -eq 'true' }

# Tras activar WSL2 sin reiniciar, Docker Desktop no arrancaria: se sabe sin
# administrador por la marca de reinicio pendiente de los componentes de
# Windows (por comprobar, como dice el diseno). Windows Update la deja tambien,
# a veces durante dias: solo se mira si Docker no arranca, para elegir la frase.
function reinicio_pendiente {
  if ($env:NEUROGRAPH_PRUEBA_REINICIO_PENDIENTE) { return $env:NEUROGRAPH_PRUEBA_REINICIO_PENDIENTE -eq 'si' }
  return (Test-Path -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending')
}

# Sin hablar con el motor (antes de arrancar nada): el docker del PATH es el
# de Docker Desktop y no hay DOCKER_HOST (B1).
function comprobar_cliente_docker($dd) {
  if ($env:DOCKER_HOST) { fallar docker_incompatible "Está definida DOCKER_HOST ($env:DOCKER_HOST); esta versión del instalador necesita el Docker local de Docker Desktop." }
  $ruta = resolver_programa docker
  $suyo = Join-Path $dd.Dir 'resources\bin'
  registrar "docker: $ruta"
  if (-not $ruta -or -not $ruta.StartsWith($suyo, [StringComparison]::OrdinalIgnoreCase)) {
    fallar docker_incompatible "El programa «docker» que encuentra Windows ($ruta) no es el de Docker Desktop (quizá es de Rancher Desktop o de Podman Desktop). Quítalo del PATH o desinstálalo, y vuelve a ejecutar el instalador."
  }
}

function arrancar_docker_desktop($dd) { lanzar_aplicacion (Join-Path $dd.Dir 'Docker Desktop.exe') }

function esperar_docker([int]$segundos, [switch]$MirarReinicio) {
  $limite = [DateTime]::Now.AddSeconds($segundos)
  while (-not (docker_responde)) {
    if ([DateTime]::Now -ge $limite) {
      if ($MirarReinicio -and (reinicio_pendiente)) { fallar reinicio_pendiente }
      fallar docker_no_arranca "$segundos s"
    }
    esperar_segundos 3
  }
}

# Ya con el motor en marcha (B1): contenedores Linux, el Docker local de
# Docker Desktop y sin el aislamiento reforzado, que impide montar el socket.
function comprobar_motor_docker {
  $so = docker_valor @('info', '--format', '{{.OSType}}')
  if ($so -ne 'linux') {
    fallar docker_incompatible 'Docker Desktop está usando contenedores de Windows, y NeuroGraph necesita los de Linux. Haz clic con el botón derecho en el icono de Docker (junto al reloj), elige «Switch to Linux containers...» y vuelve a ejecutar el instalador.'
  }
  $extremo = docker_valor @('context', 'inspect', '--format', '{{.Endpoints.docker.Host}}')
  registrar "contexto de Docker: $extremo"
  # Los dos de Docker Desktop (Datos verificados del diseno).
  if ($extremo -notin 'npipe:////./pipe/docker_engine', 'npipe:////./pipe/dockerDesktopLinuxEngine') {
    fallar docker_incompatible "Docker no usa el Docker local de Docker Desktop (usa «$extremo»), y esta versión del instalador lo necesita."
  }
  # compose y buildx, que usan los pasos 4 a 9: vienen con Docker Desktop.
  foreach ($sub in 'compose', 'buildx') {
    if ((ejecutar_programa docker @($sub, 'version') -Capturar -TiempoMax 60).Codigo -ne 0) {
      fallar docker_incompatible "Este Docker no tiene «docker $sub», que viene con Docker Desktop. Reinstala Docker Desktop y vuelve a ejecutar el instalador."
    }
  }
  $admin = Join-Path $env:ProgramData 'DockerDesktop\admin-settings.json'
  if (Test-Path -LiteralPath $admin) {
    $j = [IO.File]::ReadAllText($admin, $NG_UTF8) | ConvertFrom-Json
    if ($j.enhancedContainerIsolation -and $j.enhancedContainerIsolation.value -eq $true) {
      fallar docker_incompatible 'Docker Desktop tiene activado el aislamiento reforzado de contenedores (Enhanced Container Isolation), que no deja a NeuroGraph usar Docker desde un contenedor. Pide a quien administra Docker Desktop que lo desactive, y vuelve a ejecutar el instalador.'
    }
  }
}

function cerrar_docker_desktop {
  $r = ejecutar_programa docker @('desktop', 'stop') -TiempoMax 120
  if ($r.Codigo -ne 0 -and -not $env:NEUROGRAPH_PRUEBA_SOLO_SIMULADOS) {
    registrar 'docker desktop stop no funcionó: se cierra su proceso'
    Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue | Stop-Process -Force
  }
  $limite = [DateTime]::Now.AddSeconds(60)
  while ((docker_desktop_en_marcha) -and [DateTime]::Now -lt $limite) { esperar_segundos 2 }
}

# B3: si lo instalo este instalador, Docker Desktop no arranca al iniciar
# sesion. Se mira la clave Run del usuario y la opcion AutoStart de
# settings-store.json, que Docker Desktop reescribe mientras esta abierto:
# se cierra, se cambia solo esa opcion (UTF-8 sin BOM) y se vuelve a abrir.
function asegurar_sin_arranque_automatico($dd) {
  $run = (raiz_hkcu) + 'Software\Microsoft\Windows\CurrentVersion\Run'
  if ((Test-Path -LiteralPath $run) -and $null -ne (Get-ItemProperty -LiteralPath $run -Name 'Docker Desktop' -ErrorAction SilentlyContinue)) {
    Remove-ItemProperty -LiteralPath $run -Name 'Docker Desktop'
    registrar 'Docker Desktop estaba en la clave Run del usuario: quitado (B3)'
  }
  $ajustes = Join-Path $env:APPDATA 'Docker\settings-store.json'
  $patron = '"AutoStart"\s*:\s*true'
  if (-not (Test-Path -LiteralPath $ajustes) -or -not ([IO.File]::ReadAllText($ajustes, $NG_UTF8) -match $patron)) { return }
  registrar 'Docker Desktop arranca al iniciar sesión: se desactiva (B3)'
  cerrar_docker_desktop
  $texto = [IO.File]::ReadAllText($ajustes, $NG_UTF8)
  if ([regex]::Matches($texto, $patron).Count -eq 1) {
    [IO.File]::WriteAllText($ajustes, [regex]::Replace($texto, $patron, '"AutoStart": false'), $NG_UTF8)
    registrar 'settings-store.json: AutoStart a false, el resto igual'
  } else {
    avisar 'No se pudo desactivar que Docker Desktop arranque al iniciar sesión: hazlo en su configuración («Start Docker Desktop when you sign in»).'
  }
  arrancar_docker_desktop $dd
  esperar_docker $NG_ESPERA_DOCKER_DESKTOP
}

# Un reinicio pendiente solo se mira si Docker no arranca a tiempo
# (-MirarReinicio): la marca de Windows Update puede durar dias, y tras
# activar WSL2 sin reiniciar Docker no deberia arrancar (por confirmar,
# como dice el diseno).
function paso_docker_en_marcha {
  $dd = docker_desktop_instalado
  if (-not $dd) { fallar instalacion_docker }
  usar_docker_del_path $dd
  comprobar_cliente_docker $dd
  $estado = 'ya estaba en marcha'
  if (-not (docker_responde)) {
    arrancar_docker_desktop $dd
    if (leer_valor $NG_ESTADO NG_DOCKER_INSTALADO_AQUI) {
      decir 'La primera vez, Docker Desktop abre su ventana y puede proponer iniciar sesión o responder unas preguntas: no hace falta; puedes saltarlo o cerrar esa ventana.'
    }
    esperar_docker $NG_ESPERA_DOCKER_DESKTOP -MirarReinicio
    $estado = 'arrancado'
  }
  comprobar_motor_docker
  if (leer_valor $NG_ESTADO NG_DOCKER_INSTALADO_AQUI) { asegurar_sin_arranque_automatico $dd }
  $script:NG_RESUMEN = "$estado ($(docker_valor @('version', '--format', '{{.Server.Version}}')))"
}

# Uso diario (B3): si Docker no responde, se abre Docker Desktop y se espera.
function asegurar_docker {
  # La carpeta de Docker Desktop en el PATH antes de preguntar a docker: en
  # una ventana abierta antes de instalarlo, docker aun no esta en el PATH.
  $dd = docker_desktop_instalado
  if ($dd) { usar_docker_del_path $dd }
  if ((resolver_programa docker) -and (docker_responde)) { return }
  if (-not $dd) { fallar docker_parado }
  decir 'Arrancando Docker Desktop...'
  arrancar_docker_desktop $dd
  esperar_docker $NG_ESPERA_DOCKER_DESKTOP
}
