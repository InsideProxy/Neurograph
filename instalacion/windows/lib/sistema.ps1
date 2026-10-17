# Paso 1 del instalador Windows: comprobar el ordenador (B1 y B2 del diseno,
# H11), y la deteccion de WSL y Docker Desktop que usan los pasos 1 a 3.
# Variables de prueba (sin efecto si no se definen):
#   NEUROGRAPH_PRUEBA_WINDOWS         "compilacion edicion arquitectura tipo"
#   NEUROGRAPH_PRUEBA_VIRTUALIZACION  si | no
#   NEUROGRAPH_PRUEBA_LANMANSERVER    tipo de inicio (Automatic, Manual, Disabled)
#   NEUROGRAPH_PRUEBA_MEMORIA_MB      memoria libre de Windows
#   NEUROGRAPH_PRUEBA_RAM_MB          memoria instalada
#   NEUROGRAPH_PRUEBA_ESPACIO_MB      espacio libre (en todo disco)
#   NEUROGRAPH_PRUEBA_SITIOS          lista de sitios en lugar de NG_SITIOS
#   NEUROGRAPH_PRUEBA_DD_EN_MARCHA    si | no
#   NEUROGRAPH_PRUEBA_VERSION_WSL     archivo con la version de WSL (o "ninguna")
#   NEUROGRAPH_PRUEBA_DOCKER_DESKTOP  archivo con la carpeta de Docker Desktop (o "ninguno")
#   NEUROGRAPH_PRUEBA_UNIDADES        raices de las unidades locales, separadas por ";"
#   NEUROGRAPH_PRUEBA_CARPETA_ELEGIDA lo que devuelve el selector de carpetas (o "cancelar")
#   NEUROGRAPH_PRUEBA_SIN_MEMORIA_TRACTO  1: no se pide memoria para la tractografia (para medirla)
#   NEUROGRAPH_PRUEBA_VMMEM_MB        lo que ocupa vmmemWSL (o "ninguno")

# Sitios de los que se descarga algo (los de Linux: Docker Hub, paquetes de
# las imagenes, PyPI, npm y Zenodo). desktop.docker.com y github.com se
# anaden si faltan Docker Desktop o WSL.
$NG_SITIOS = @('registry-1.docker.io', 'auth.docker.io', 'production.cloudflare.docker.com',
  'deb.debian.org', 'pypi.org', 'files.pythonhosted.org', 'registry.npmjs.org', 'zenodo.org')
$NG_CARPETAS_SQL = @('init', 'backend\database\seed', 'backend\database\migrations\generated')

# --- Deteccion (pasos 1 a 3)

# La version del WSL instalado, del propio archivo de %ProgramFiles%\WSL:
# nunca del texto de wsl.exe, que va traducido (paso 2 del diseno).
function version_wsl {  # -> [version] o $null
  if ($env:NEUROGRAPH_PRUEBA_VERSION_WSL) {
    $v = ([IO.File]::ReadAllText($env:NEUROGRAPH_PRUEBA_VERSION_WSL)).Trim()
    if ($v -eq 'ninguna') { return $null }
    return [version]$v
  }
  $f = Join-Path $env:ProgramFiles 'WSL\wsl.exe'
  if (-not (Test-Path -LiteralPath $f -PathType Leaf)) { return $null }
  $i = (Get-Item -LiteralPath $f).VersionInfo
  return New-Object Version($i.FileMajorPart, $i.FileMinorPart, $i.FileBuildPart)
}
function wsl_valido { $v = version_wsl; return ($null -ne $v -and $v -ge [version]$NG_WSL_MINIMA) }

# Docker Desktop instalado, por su entrada de desinstalacion (para todos los
# usuarios o, con --user, solo para uno). La clave y su InstallLocation,
# en «Datos verificados» del diseno.
function docker_desktop_instalado {  # -> @{ Dir; Version } o $null
  if ($env:NEUROGRAPH_PRUEBA_DOCKER_DESKTOP) {
    $d = ([IO.File]::ReadAllText($env:NEUROGRAPH_PRUEBA_DOCKER_DESKTOP)).Trim()
    if ($d -eq 'ninguno') { return $null }
    return @{ Dir = $d; Version = 'prueba' }
  }
  foreach ($k in 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop') {
    $e = Get-ItemProperty -LiteralPath $k -ErrorAction SilentlyContinue
    if ($e -and $e.InstallLocation -and (Test-Path -LiteralPath (Join-Path $e.InstallLocation 'Docker Desktop.exe'))) {
      return @{ Dir = ([string]$e.InstallLocation).TrimEnd('\'); Version = [string]$e.DisplayVersion }
    }
  }
  return $null
}

function docker_desktop_en_marcha {
  if ($env:NEUROGRAPH_PRUEBA_DD_EN_MARCHA) { return $env:NEUROGRAPH_PRUEBA_DD_EN_MARCHA -eq 'si' }
  return [bool](Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue)
}

# Donde guarda Docker Desktop su disco virtual: lo que diga su configuracion
# si ya esta instalado, o su carpeta por defecto. La clave de una ubicacion
# movida esta por comprobar («Por comprobar» del diseno).
function dir_disco_docker {
  $ajustes = Join-Path $env:APPDATA 'Docker\settings-store.json'
  if (Test-Path -LiteralPath $ajustes) {
    try {
      $j = [IO.File]::ReadAllText($ajustes, $NG_UTF8) | ConvertFrom-Json
      if ($j.CustomWslDistroDir) { return [string]$j.CustomWslDistroDir }
    } catch { registrar "settings-store.json no se pudo leer: $($_.Exception.Message)" }
  }
  return (Join-Path $env:LOCALAPPDATA 'Docker\wsl')
}

# --- Windows

function datos_windows {  # -> Compilacion, Edicion, Arquitectura, Tipo y Nombre
  if ($env:NEUROGRAPH_PRUEBA_WINDOWS) {
    $c = $env:NEUROGRAPH_PRUEBA_WINDOWS -split ' '
    return @{ Compilacion = [int]$c[0]; Edicion = $c[1]; Arquitectura = $c[2]; Tipo = $c[3]; Nombre = "compilación $($c[0]), $($c[2])" }
  }
  $v = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
  # Un proceso de 32 bits en un Windows de 64 ve x86 aqui y AMD64 en PROCESSOR_ARCHITEW6432.
  $arq = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
  # ProductName dice «Windows 10» tambien en Windows 11: la compilacion es lo que vale.
  return @{ Compilacion = [int]$v.CurrentBuildNumber; Edicion = [string]$v.EditionID; Arquitectura = $arq
    Tipo = [string]$v.InstallationType; Nombre = "compilación $($v.CurrentBuildNumber), $arq" }
}

# Los que admite Docker Desktop: Windows 10 22H2 (19045) y Windows 11 23H2
# (22631) o posteriores, de 64 bits y x86_64; ni Server ni ARM (alcance).
function comprobar_windows {  # -> los datos de Windows
  $w = datos_windows
  registrar "windows: compilación $($w.Compilacion), $($w.Edicion), $($w.Arquitectura), $($w.Tipo)"
  $compilacion = ($w.Compilacion -ge $NG_BUILD_MINIMA_10 -and $w.Compilacion -lt $NG_BUILD_PRIMERA_11) -or $w.Compilacion -ge $NG_BUILD_MINIMA_11
  if (-not $compilacion -or $w.Arquitectura -ne 'AMD64' -or $w.Tipo -like 'Server*') { fallar windows_no_admitido $w.Nombre }
  # Home no esta en la lista de requisitos de Docker, aunque una frase de su documentacion la menciona.
  if ($w.Edicion -like 'Core*') { avisar 'Windows Home no está en la lista de requisitos de Docker Desktop: NeuroGraph no se ha probado en él.' }
  return $w
}

function virtualizacion_activa {
  if ($env:NEUROGRAPH_PRUEBA_VIRTUALIZACION) { return $env:NEUROGRAPH_PRUEBA_VIRTUALIZACION -eq 'si' }
  # Con un hipervisor ya en marcha (WSL2 activo), Win32_Processor dice que no: manda el hipervisor.
  if ((Get-CimInstance Win32_ComputerSystem).HypervisorPresent) { return $true }
  $cpu = @(Get-CimInstance Win32_Processor)[0]
  return [bool]($cpu.VirtualizationFirmwareEnabled -and $cpu.SecondLevelAddressTranslationExtensions)
}
function comprobar_virtualizacion { if (-not (virtualizacion_activa)) { fallar virtualizacion } }

function comprobar_lanmanserver {  # Docker Desktop lo exige en automatico
  $t = if ($env:NEUROGRAPH_PRUEBA_LANMANSERVER) { $env:NEUROGRAPH_PRUEBA_LANMANSERVER } else { [string](Get-Service -Name LanmanServer).StartType }
  registrar "LanmanServer: $t"
  if ($t -ne 'Automatic') {
    $nombre = switch ($t) { 'Manual' { 'Manual' } 'Disabled' { 'Deshabilitado' } default { $t } }
    fallar lanmanserver $nombre
  }
}

# Un .sql con CR (un clon de Git para Windows) cambiaria lo que hace
# rebuild_db_from_sql.sh: busca la linea exacta «BEGIN;». Se mira en el paso
# 1 para no construir las imagenes en balde.
function archivos_con_cr {  # -> los .sql del proyecto con algun retorno de carro
  $con = @()
  $buf = New-Object byte[] 1048576
  foreach ($c in $NG_CARPETAS_SQL) {
    $dir = Join-Path $NG_RAIZ $c
    if (-not (Test-Path -LiteralPath $dir -PathType Container)) { fallar proyecto_incompleto $c }
    # Por la extension y no con -Filter '*.sql': los comodines de Win32
    # encajan tambien con el nombre corto 8.3 (b.sqlx es B~1.SQL).
    foreach ($f in Get-ChildItem -LiteralPath $dir -File | Where-Object { $_.Extension -eq '.sql' }) {
      $s = [IO.File]::OpenRead($f.FullName)
      try {
        while (($n = $s.Read($buf, 0, $buf.Length)) -gt 0) {
          if ([Array]::IndexOf($buf, [byte]13, 0, $n) -ge 0) { $con += "$c\$($f.Name)"; break }
        }
      } finally { $s.Dispose() }
    }
  }
  # Sin coma delante: quien llama la recoge con @() (con las dos, 5.1 la
  # anida y la cuenta seria siempre 1).
  return $con
}
# init\ del proyecto se monta en el contenedor de herramientas con --mount
# (paso 7): una coma o unas comillas en su ruta lo romperian, y Docker
# Desktop no monta unidades de red (B2).
function comprobar_ruta_del_proyecto {
  if ($NG_RAIZ.StartsWith('\\') -or (es_unidad_de_red $NG_RAIZ)) { fallar proyecto_red $NG_RAIZ }
  if ($NG_RAIZ -match '[,"]') { fallar proyecto_ruta $NG_RAIZ }
}

# Los programas se lanzan desde la carpeta de la cuenta (bin\neurograph-mcp.cmd,
# con cmd.exe /c): cmd expande %VAR% (y !VAR!) tambien en una ruta, y
# ejecutar_programa no lanza un .cmd con % o ! en la suya.
function comprobar_ruta_de_la_cuenta {
  foreach ($d in $env:USERPROFILE, $NG_DIR) { if ($d -match '[%!]') { fallar cuenta_ruta $d } }
}

function comprobar_saltos_de_linea {
  $con = @(archivos_con_cr)
  registrar "saltos de línea: $($con.Count) archivos .sql con CR"
  if ($con.Count -gt 0) { fallar crlf $con[0] }
}

# --- Memoria y espacio (B2)

# La disponible de Windows (libre, en espera y a cero), como MemAvailable,
# del contador de rendimiento (las pruebas lo redefinen).
function memoria_del_contador { return (Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory -ErrorAction Stop).AvailableMBytes }

function memoria_libre_mb {
  if ($env:NEUROGRAPH_PRUEBA_MEMORIA_MB) { return [int]$env:NEUROGRAPH_PRUEBA_MEMORIA_MB }
  $mb = $null
  try { $mb = memoria_del_contador } catch { relanzar_si_ng $_; registrar "memoria libre: el contador de rendimiento no responde ($($_.Exception.Message))" }
  if ($mb) { return [int]$mb }
  # Con los contadores de rendimiento rotos o desactivados (no darian nada, y
  # 0 pararia el paso 1): la libre de Win32_OperatingSystem, en KB, que no
  # cuenta la memoria en espera y queda por debajo de la disponible.
  registrar 'memoria libre: sin el contador de rendimiento; se usa FreePhysicalMemory de Win32_OperatingSystem'
  return [int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1024)
}

# Sumando los modulos: la que Windows da por visible queda por debajo de la
# instalada (lo que reservan el hardware y la grafica integrada). Si los
# modulos no se pueden leer (alguna maquina virtual), la visible, y se anota.
function ram_instalada_mb {
  if ($env:NEUROGRAPH_PRUEBA_RAM_MB) { return [int]$env:NEUROGRAPH_PRUEBA_RAM_MB }
  $suma = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum
  if ($suma) { return [int]($suma / 1MB) }
  registrar 'memoria instalada: sin módulos en Win32_PhysicalMemory; se usa la visible'
  return [int]((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1MB)
}

function unidad_de([string]$ruta) { return [IO.Path]::GetPathRoot([IO.Path]::GetFullPath($ruta)).ToUpperInvariant() }

function espacio_libre_mb([string]$ruta) {  # en el disco de esa ruta (0 si no esta)
  if ($env:NEUROGRAPH_PRUEBA_ESPACIO_MB) { return [int]$env:NEUROGRAPH_PRUEBA_ESPACIO_MB }
  try { return [int][Math]::Floor((New-Object IO.DriveInfo (unidad_de $ruta)).AvailableFreeSpace / 1MB) }
  catch { registrar "espacio libre de ${ruta}: $($_.Exception.Message)"; return 0 }
}

function espacio_pedido {  # -> @{ unidad = MB } para Docker, y Docker Desktop si falta
  $pedido = @{}
  $pedido[(unidad_de (dir_disco_docker))] = $NG_MIN_ESPACIO_DOCKER_MB
  if (-not (docker_desktop_instalado)) {
    $u = unidad_de $env:ProgramFiles
    $pedido[$u] = [int]$pedido[$u] + $NG_ESPACIO_DOCKER_DESKTOP_MB
  }
  return $pedido
}

# Si no llega para la base, se para; si no llega para la tractografia, se
# anota el motivo y el paso 8 la deja pendiente (como en Linux).
function comprobar_recursos {  # usa NG_BIBLIOTECA_ELEGIDA
  $ram = ram_instalada_mb
  if ($ram -lt $NG_MIN_RAM_INSTALADA_MB) { fallar ram_instalada "$([Math]::Round($ram / 1024, 1)) GB" }
  $mem = memoria_libre_mb
  $necesaria = $NG_MIN_MEMORIA_BASE_MB
  # Docker Desktop toma su memoria al arrancar: si aun no esta encendido, se suma.
  if (-not (docker_desktop_en_marcha)) { $necesaria += $NG_MIN_MEMORIA_DOCKER_DESKTOP_MB }
  registrar "recursos: memoria instalada $ram MB, libre $mem MB (hacen falta $necesaria MB)"
  if ($mem -lt $necesaria) { fallar memoria_base "$necesaria MB (hay $mem MB)" }
  $pedido = espacio_pedido
  foreach ($u in @($pedido.Keys)) {
    $libre = espacio_libre_mb $u
    registrar "espacio en ${u}: $libre MB (hacen falta $($pedido[$u]) MB)"
    if ($libre -lt $pedido[$u]) { fallar espacio "en $u para Docker: hacen falta $($pedido[$u]) MB y hay $libre MB" }
  }
  comprobar_recursos_tracto $NG_MIN_ESPACIO_DOCKER_MB
}

# Para medir la memoria que usa de verdad la tractografia
# (B2): con NEUROGRAPH_PRUEBA_SIN_MEMORIA_TRACTO=1 no se le pide memoria, ni
# en Windows ni dentro de Docker; lo demas (espacio, tope del contenedor) no
# cambia. Se anota. Sin efecto si no se define.
function sin_pedir_memoria_tracto {
  if ($env:NEUROGRAPH_PRUEBA_SIN_MEMORIA_TRACTO -ne '1') { return $false }
  registrar '(prueba) NEUROGRAPH_PRUEBA_SIN_MEMORIA_TRACTO: no se pide memoria para la tractografía'
  return $true
}

# Lo que ocupa la maquina virtual de WSL en Windows (el conjunto de trabajo
# de vmmemWSL; vmmem en versiones anteriores de WSL), o $null si no corre.
function vmmem_mb {
  if ($env:NEUROGRAPH_PRUEBA_VMMEM_MB) {
    if ($env:NEUROGRAPH_PRUEBA_VMMEM_MB -eq 'ninguno') { return $null }
    return [int]$env:NEUROGRAPH_PRUEBA_VMMEM_MB
  }
  $p = Get-Process -Name vmmemWSL, vmmem -ErrorAction SilentlyContinue | Sort-Object WorkingSet64 -Descending | Select-Object -First 1
  if (-not $p) { return $null }
  return [int][Math]::Floor($p.WorkingSet64 / 1MB)
}

# La memoria total del Linux de Docker (MB), si Docker Desktop esta en
# marcha; si no, 0 (su maquina virtual aun no ha tomado nada de Windows). En
# el paso 1, su docker aun puede no estar en el PATH: el de su carpeta.
function memoria_total_docker_mb {
  if (-not (docker_desktop_en_marcha)) { return 0 }
  $docker = 'docker'
  $dd = docker_desktop_instalado
  if ($dd -and -not (resolver_programa docker)) { $docker = Join-Path $dd.Dir 'resources\bin\docker.exe' }
  if (-not (resolver_programa $docker)) { return 0 }
  $r = ejecutar_programa $docker @('info', '--format', '{{.MemTotal}}') -Capturar -TiempoMax 30
  $b = 0L
  if ($r.Codigo -ne 0 -or -not [long]::TryParse((($r.Salida -join '').Trim()), [ref]$b)) { return 0 }
  return [int][Math]::Floor($b / 1MB)
}

# La memoria libre que la tractografia pide a Windows (B2): lo que la
# maquina virtual de WSL aun puede tomar de Windows hasta su tope (la memoria
# total de su Linux mas la que Linux no deja ver), como mucho lo que se pide
# dentro de Docker, mas lo que gasta el propio Windows mientras tanto
# (NG_MEMORIA_WINDOWS_TRACTO_MB). Con la maquina virtual ya llena (tras
# construir las imagenes en el paso 5), solo lo de Windows (datos
# verificados del diseno). Sin vmmemWSL, toda la de dentro de Docker. Con
# Docker Desktop parado no se puede saber: -> $null, y se mira en el paso 8.
function memoria_windows_para_tracto([int]$total_docker_mb) {
  if ($total_docker_mb -le 0) {
    registrar 'memoria de la tractografía en Windows: Docker Desktop parado; se mira con NeuroGraph encendido'
    return $null
  }
  $vm = vmmem_mb
  if ($null -eq $vm) {
    $puede = $NG_MIN_MEMORIA_TRACTO_MB
    registrar 'memoria de la tractografía en Windows: sin vmmemWSL, la máquina virtual de WSL puede crecer todo lo de dentro de Docker'
  } else {
    $puede = [int][Math]::Min([Math]::Max(0, $total_docker_mb + $NG_MEMORIA_OCULTA_WSL_MB - $vm), $NG_MIN_MEMORIA_TRACTO_MB)
  }
  $necesaria = $puede + $NG_MEMORIA_WINDOWS_TRACTO_MB
  registrar "memoria de la tractografía en Windows: WSL ocupa $vm MB de $($total_docker_mb + $NG_MEMORIA_OCULTA_WSL_MB) y puede tomar $puede; con lo de Windows, hacen falta $necesaria MB"
  return $necesaria
}

# Lo que necesita la tractografia en Windows. La memoria del Linux interno de
# Docker aun no se puede medir (Docker quiza ni existe): se mide en el paso 8
# (B2). Tambien lo usa «neurograph tractografia», sin espacio reservado.
function comprobar_recursos_tracto([int]$reservado = 0) {  # usa NG_BIBLIOTECA_ELEGIDA
  $mem = memoria_libre_mb
  $disco = dir_disco_docker
  $dock = espacio_libre_mb $disco
  $bib = espacio_libre_mb $script:NG_BIBLIOTECA_ELEGIDA
  registrar "recursos de la tractografía: memoria $mem MB, docker ($disco) $dock MB, biblioteca $bib MB"
  $motivo = ''
  $necesaria = memoria_windows_para_tracto (memoria_total_docker_mb)
  if ($null -ne $necesaria -and $mem -lt $necesaria -and -not (sin_pedir_memoria_tracto)) {
    $motivo = "memoria insuficiente (hacen falta $necesaria MB libres y hay $mem MB)"
  } elseif ($dock -lt $reservado + $NG_MIN_ESPACIO_DOCKER_TRACTO_MB) {
    $motivo = "espacio insuficiente para Docker en $(unidad_de $disco) (hacen falta $($reservado + $NG_MIN_ESPACIO_DOCKER_TRACTO_MB) MB y hay $dock MB)"
  } elseif ($bib -lt $NG_MIN_ESPACIO_BIBLIOTECA_TRACTO_MB) {
    $motivo = "espacio insuficiente en la biblioteca (hacen falta $NG_MIN_ESPACIO_BIBLIOTECA_TRACTO_MB MB y hay $bib MB)"
  }
  if ($motivo) {
    guardar_valor $NG_ESTADO NG_TRACTO_SIN_RECURSOS $motivo
    avisar "La tractografía no se instalará ahora: $motivo."
  } else {
    borrar_valor $NG_ESTADO NG_TRACTO_SIN_RECURSOS
  }
}

# --- Conexion y biblioteca

function comprobar_conexion([string[]]$extra = @()) {
  $sitios = if ($env:NEUROGRAPH_PRUEBA_SITIOS) { $env:NEUROGRAPH_PRUEBA_SITIOS -split ' ' } else { $NG_SITIOS + $extra }
  foreach ($s in $sitios) {
    $r = ejecutar_programa curl @('-s', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '20', "https://$s/") -Capturar -TiempoMax 40
    $codigo = ($r.Salida -join '').Trim()
    registrar "conexion ${s}: $(if ($codigo) { $codigo } else { 'sin respuesta' })"
    if (-not $codigo -or $codigo -eq '000') { fallar conexion $s }
  }
}

function es_unidad_de_red([string]$d) {
  $u = [IO.Path]::GetPathRoot($d)
  if (-not $u) { return $false }
  try { return (New-Object IO.DriveInfo $u).DriveType -eq [IO.DriveType]::Network } catch { return $false }
}

# Nunca se escribe en una carpeta ajena (B2): vale si no existe, si esta
# vacia, si tiene el manifiesto o si tiene original\ (anterior a la H8).
function comprobar_biblioteca([string]$d) {
  # Una coma o unas comillas romperian el --mount de docker run (paso 8); un
  # salto de linea, config.env; y «: » cortaria la ruta en los mensajes.
  if ($d -match '[,"\r\n]' -or $d.Contains(': ')) { fallar biblioteca_ruta $d }
  # Docker Desktop no monta unidades de red (B2).
  if ($d.StartsWith('\\') -or (es_unidad_de_red $d)) { fallar biblioteca_red $d }
  # Un disco desconectado (B2): su unidad no existe. La frase pregunta si es eso.
  $u = [IO.Path]::GetPathRoot($d)
  if ($u -and -not (Test-Path -LiteralPath $u)) { fallar biblioteca_sin_permiso $d }
  if (-not (Test-Path -LiteralPath $d -PathType Container)) { return }
  $prueba = Join-Path $d ('.neurograph-prueba-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
  try { [IO.File]::WriteAllText($prueba, ''); Remove-Item -LiteralPath $prueba -Force }
  catch { fallar biblioteca_sin_permiso $d }
  if (Test-Path -LiteralPath (Join-Path $d '.neurograph_library.yaml') -PathType Leaf) { return }
  if (Test-Path -LiteralPath (Join-Path $d 'original') -PathType Container) { return }
  if (-not (Get-ChildItem -LiteralPath $d -Force | Select-Object -First 1)) { return }
  fallar biblioteca_ajena $d
}

# --- Donde va la biblioteca (B2): la de --biblioteca o la guardada; si no,
# se buscan bibliotecas que ya existan, se propone una (o la del perfil) y se
# deja elegir otra con el selector de carpetas de Windows. La decision va
# aparte de la ventana, para probarla sin ella.

function unidades_locales {  # -> las raices de las unidades fijas y extraibles listas
  if ($env:NEUROGRAPH_PRUEBA_UNIDADES) { return @($env:NEUROGRAPH_PRUEBA_UNIDADES -split ';' | Where-Object { $_ }) }
  return @([IO.DriveInfo]::GetDrives() | Where-Object { $_.IsReady -and $_.DriveType -in 'Fixed', 'Removable' } | ForEach-Object { $_.RootDirectory.FullName })
}

function es_biblioteca([string]$d) { return (Test-Path -LiteralPath (Join-Path $d '.neurograph_library.yaml') -PathType Leaf) }

# La del perfil y una carpeta NeuroData con su manifiesto en la raiz de cada
# unidad, en ese orden, como en Linux (primero la de $HOME): asi se «conecta»
# una biblioteca ya hecha (docs/portabilidad.md). Se recoge con @().
function bibliotecas_existentes {
  $r = @()
  $perfil = Join-Path $env:USERPROFILE 'NeuroData'
  if (es_biblioteca $perfil) { $r += $perfil }
  foreach ($u in unidades_locales) {
    $d = Join-Path $u 'NeuroData'
    if ((es_biblioteca $d) -and $r -notcontains $d) { $r += $d }
  }
  return $r
}

function tamano_mb([string]$d) {
  $b = (Get-ChildItem -LiteralPath $d -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  return [int][Math]::Round([double]$b / 1MB)
}

function es_raiz_de_unidad([string]$d) {
  $d = $d.TrimEnd('\') + '\'
  if ($env:NEUROGRAPH_PRUEBA_UNIDADES) { return (@(unidades_locales | ForEach-Object { $_.TrimEnd('\') + '\' }) -contains $d) }
  return ([IO.Path]::GetPathRoot($d) -eq $d)
}

# El selector de carpetas de Windows, sin escribir rutas (B2). Es lo unico
# que abre una ventana: en las pruebas lo sustituye NEUROGRAPH_PRUEBA_CARPETA_ELEGIDA.
function elegir_carpeta_con_selector {  # -> la ruta elegida, o '' si se cancela
  if ($env:NEUROGRAPH_PRUEBA_SOLO_SIMULADOS) {
    $c = $env:NEUROGRAPH_PRUEBA_CARPETA_ELEGIDA
    registrar "(prueba) selector de carpetas: $c"
    if ($c -eq 'cancelar') { return '' }
    return $c
  }
  Add-Type -AssemblyName System.Windows.Forms
  # Un dueño siempre delante: si no, el dialogo puede quedar detras de la consola.
  $dueno = New-Object Windows.Forms.Form -Property @{ TopMost = $true }
  $d = New-Object Windows.Forms.FolderBrowserDialog
  $d.Description = 'Elige la carpeta o la unidad para la biblioteca de NeuroGraph'
  $d.RootFolder = [Environment+SpecialFolder]::MyComputer
  $d.ShowNewFolderButton = $true
  try {
    if ($d.ShowDialog($dueno) -eq [Windows.Forms.DialogResult]::OK) { return $d.SelectedPath }
    return ''
  } finally { $d.Dispose(); $dueno.Dispose() }
}

function elegir_biblioteca {  # deja la ruta completa en NG_BIBLIOTECA_ELEGIDA
  if ($script:NG_BIBLIOTECA_ELEGIDA) { return }  # --biblioteca RUTA o la guardada: sin preguntar
  $existentes = @(bibliotecas_existentes)
  if ($existentes.Count -gt 0) {
    $propuesta = $existentes[0]
    decir "Hay una biblioteca de NeuroGraph en $propuesta ($(tamano_mb $propuesta) MB)."
    if ($existentes.Count -gt 1) { decir "Hay más: $(@($existentes | Select-Object -Skip 1) -join ', ')." }
  } else {
    $propuesta = Join-Path $env:USERPROFILE 'NeuroData'
    decir "La biblioteca de datos (unos $NG_TAMANO_BIBLIOTECA_MB MB) irá en $propuesta."
  }
  $elegida = $propuesta
  if (-not (hay_quien_responda) -and -not $env:NEUROGRAPH_PRUEBA_RESPUESTA) {
    # Sin consola delante, la respuesta por defecto (B3: nunca se pregunta sin ventana).
    registrar "sin consola: se usa la biblioteca propuesta, $propuesta"
  } elseif (-not (preguntar_si '¿Usar esta carpeta?')) {
    # El arnes de integracion espera esta linea para cerrar el selector.
    registrar 'abriendo el selector de carpetas'
    $elegida = elegir_carpeta_con_selector
    if (-not $elegida) { fallar biblioteca_sin_elegir }
    # Una unidad entera: la biblioteca va en su carpeta NeuroData, como las que se buscan.
    if (es_raiz_de_unidad $elegida) { $elegida = Join-Path $elegida 'NeuroData' }
  }
  $script:NG_BIBLIOTECA_ELEGIDA = [IO.Path]::GetFullPath($elegida)
  decir "Biblioteca de datos: $($script:NG_BIBLIOTECA_ELEGIDA)"
}

function paso_comprobar {
  $w = comprobar_windows
  comprobar_virtualizacion
  comprobar_lanmanserver
  comprobar_ruta_del_proyecto
  comprobar_ruta_de_la_cuenta
  comprobar_saltos_de_linea
  # La biblioteca, antes que los recursos: el espacio de la tractografia se
  # mide en su disco. Se guarda ya: no se vuelve a preguntar (B2).
  elegir_biblioteca
  comprobar_biblioteca $script:NG_BIBLIOTECA_ELEGIDA
  guardar_valor $NG_CONFIG NG_BIBLIOTECA $script:NG_BIBLIOTECA_ELEGIDA
  comprobar_recursos
  $extra = @()
  if (-not (docker_desktop_instalado)) { $extra += 'desktop.docker.com' }
  # De github.com sale la actualizacion de WSL (wsl --update --web-download).
  if (-not (wsl_valido)) { $extra += 'github.com' }
  comprobar_conexion $extra
  $script:NG_RESUMEN = "Windows (compilación $($w.Compilacion)), biblioteca, memoria, espacio, internet"
}
