# Pruebas del paso 2 y del proceso elevado (bloque A y B1 del diseno, H11).

# Proceso elevado falso (falso.exe, con la misma linea de ordenes en bruto
# que el PowerShell elevado): anota sus argumentos, y con -Instala deja
# Docker Desktop y WSL como si los hubiera instalado. Sale con el codigo pedido.
function elevado_falso([int]$codigo, [switch]$Instala, [string]$Acciones = '') {
  $dd = Join-Path $env:NG_PRUEBA_BIN 'dd'
  [void](New-Item -ItemType Directory -Force -Path (Join-Path $dd 'resources\bin'))
  $a = @()
  if ($Acciones) { $a += $Acciones }
  if ($Instala) { $a += "escribe:%NG_PRUEBA_CAJA%\docker-desktop=$dd", 'escribe:%NG_PRUEBA_CAJA%\version-wsl=2.4.13' }
  simular_tabla elevado @("*|$codigo|$($a -join ',')|")
  return (Join-Path $env:NG_PRUEBA_BIN 'elevado.exe')
}
function cuerpo_paso_2 { return "`$script:NG_RAIZ = '$env:NG_RAIZ'; `$script:NG_BIBLIOTECA_ELEGIDA = '$env:USERPROFILE\NeuroData'; paso 2 'Docker' paso_docker; if (`$script:NG_REINICIO) { pedir_reinicio }" }
function descarga_falsa { simular_tabla curl @('*|0|marca:%LOCALAPPDATA%\neurograph-app\descargas\Docker Desktop Installer.exe.part|') }
$DESCARGADO = Join-Path $env:LOCALAPPDATA 'neurograph-app\descargas\Docker Desktop Installer.exe'


function prueba_con_wsl_y_docker_desktop_no_se_eleva {
  $e = entorno_windows @{ NEUROGRAPH_PRUEBA_ELEVADO = (elevado_falso 0) }
  [IO.File]::WriteAllText($e.NEUROGRAPH_PRUEBA_VERSION_WSL, '2.4.13')
  [IO.File]::WriteAllText($e.NEUROGRAPH_PRUEBA_DOCKER_DESKTOP, (Join-Path $env:NG_PRUEBA_BIN 'dd'))
  igual 0 (con_lib (cuerpo_paso_2) sistema, docker -Entorno $e) 'sale con 0'
  contiene 'ya estaba' (pantalla) 'lo dice'
  igual '' (llamadas elevado) 'sin pedir permiso de administrador'
}

function prueba_licencia_rechazada_para_y_se_guarda {
  $e = entorno_windows @{ NEUROGRAPH_PRUEBA_ELEVADO = (elevado_falso 0); NEUROGRAPH_PRUEBA_RESPUESTA = 'n' }
  descarga_falsa
  igual 1 (con_lib (cuerpo_paso_2) sistema, docker -Entorno $e) 'sale con 1'
  contiene 'gratis para uso personal' (pantalla) 'enseña las condiciones'
  contiene 'docker-subscription-service-agreement' (pantalla) 'con el enlace a la licencia'
  contiene 'Sin aceptar las condiciones de Docker Desktop no se puede instalar' (pantalla) 'su frase'
  contiene 'rechazada' (valor_estado NG_LICENCIA_DOCKER) 'se guarda la respuesta'
  igual '' (llamadas curl) 'no descarga nada'
}

function prueba_una_sola_elevacion_con_todo_lo_que_falta {
  $e = entorno_windows @{ NEUROGRAPH_PRUEBA_ELEVADO = (elevado_falso 0 -Instala); NEUROGRAPH_PRUEBA_RESPUESTA = 's' }
  descarga_falsa
  igual 0 (con_lib (cuerpo_paso_2) sistema, docker -Entorno $e) 'sale con 0'
  $l = llamadas elevado
  igual 1 @($l.Trim() -split "`n").Count 'una sola elevación'
  contiene '-Wsl asegurar' $l 'activa WSL'
  contiene 'Docker Desktop Installer.exe' $l 'e instala Docker Desktop'
  contiene 'elevado.ps1' $l 'con el script del proceso elevado'
  contiene 'aceptada' (valor_estado NG_LICENCIA_DOCKER) 'la licencia queda aceptada'
  if (-not (valor_estado NG_DOCKER_INSTALADO_AQUI)) { throw 'FALLA: no anota que Docker Desktop lo instaló este instalador' }
  igual $false (Test-Path -LiteralPath $DESCARGADO) 'el instalador descargado se borra'
  contiene 'instalado (Docker Desktop' (pantalla) 'el resumen'
  contiene 'pidiendo permiso de administrador' (registro) 'la línea que espera el arnés'
  contiene 'descargado: ' (registro) 'anota el tamaño de lo descargado'
}

function prueba_el_proceso_elevado_recibe_cada_argumento_entero {
  # La linea en bruto de produccion, separada por un programa de verdad
  # (como lo haria powershell.exe), con rutas con espacios.
  $e = entorno_windows @{ NEUROGRAPH_PRUEBA_ELEVADO = (elevado_falso 0 -Instala); NEUROGRAPH_PRUEBA_RESPUESTA = 's' }
  descarga_falsa
  $raiz = 'C:\Carpeta con espacios\NeuroGraph'  # solo se pasa: el falso no ejecuta nada
  igual 0 (con_lib "`$script:NG_RAIZ = '$raiz'; `$script:NG_BIBLIOTECA_ELEGIDA = '$env:USERPROFILE\NeuroData'; paso 2 'Docker' paso_docker" sistema, docker -Entorno $e) 'sale con 0'
  $reg = [regex]::Match((registro), 'registro del proceso elevado: ([^\r\n]+)').Groups[1].Value
  $esperado = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "$raiz\instalacion\windows\elevado.ps1", '-Registro', $reg, '-Wsl', 'asegurar', '-Instalador', $DESCARGADO)
  igual (($esperado | ForEach-Object { "[$_]" }) -join "`n") (argumentos_de elevado) 'cada argumento, entero'
}

function prueba_las_lineas_del_proceso_elevado_van_al_registro_principal {
  $e = entorno_windows @{ NEUROGRAPH_PRUEBA_ELEVADO = (elevado_falso 13 -Acciones 'escribe-tras:-Registro=linea-del-elevado-123'); NEUROGRAPH_PRUEBA_RESPUESTA = 's' }
  descarga_falsa
  igual 1 (con_lib (cuerpo_paso_2) sistema, docker -Entorno $e) 'sale con 1'
  contiene 'linea-del-elevado-123' (registro) 'lo que anotó el proceso elevado, en el registro que se envía'
}

function prueba_tras_reiniciar_solo_falta_wsl_y_se_eleva_otra_vez_sin_el_instalador {
  # Paso 2.5: Docker Desktop instalado y WSL2 activado por los componentes de
  # Windows, sin el de GitHub. Sin respuesta ni consola: si preguntara la
  # licencia, la tomaria como no.
  $e = entorno_windows @{ NEUROGRAPH_PRUEBA_ELEVADO = (elevado_falso 0 -Instala) }
  [IO.File]::WriteAllText($e.NEUROGRAPH_PRUEBA_DOCKER_DESKTOP, (Join-Path $env:NG_PRUEBA_BIN 'dd'))
  [IO.File]::WriteAllText($e.NEUROGRAPH_PRUEBA_VERSION_WSL, '2.0.0')
  descarga_falsa
  igual 0 (con_lib ("`$script:NG_CONTINUAR_EN = 2; " + (cuerpo_paso_2)) sistema, docker -Entorno $e) 'sale con 0'
  no_contiene 'condiciones de uso' (pantalla) 'no pregunta la licencia'
  igual '' (llamadas curl) 'no descarga nada'
  $a = argumentos_de elevado
  contiene "[-Wsl]`n[asegurar]" $a 'activa o actualiza WSL'
  no_contiene '[-Instalador]' $a 'sin el instalador de Docker Desktop'
  contiene 'por segunda vez' (pantalla) 'y dice que es la segunda elevación'
}

function prueba_la_licencia_aceptada_no_se_vuelve_a_preguntar {
  estado_con "NG_LICENCIA_DOCKER=aceptada 2026-10-10`n"
  $e = entorno_windows @{ NEUROGRAPH_PRUEBA_ELEVADO = (elevado_falso 0 -Instala) }
  descarga_falsa
  igual 0 (con_lib (cuerpo_paso_2) sistema, docker -Entorno $e) 'sin respuesta y sin consola, sigue'
  no_contiene 'gratis para uso personal' (pantalla) 'no vuelve a enseñar las condiciones'
}

function prueba_cada_codigo_del_proceso_elevado_da_su_frase {
  foreach ($caso in @('10|no lleva la firma de Docker Inc.', '11|No se pudo activar WSL2', '12|No se pudo actualizar WSL2', '13|Falló la instalación de Docker Desktop', '1223|Windows no ha dado permiso de administrador')) {
    $codigo, $texto = $caso -split '\|'
    $e = entorno_windows @{ NEUROGRAPH_PRUEBA_ELEVADO = (elevado_falso ([int]$codigo)); NEUROGRAPH_PRUEBA_RESPUESTA = 's' }
    descarga_falsa
    igual 1 (con_lib (cuerpo_paso_2) sistema, docker -Entorno $e) "código ${codigo}: sale con 1"
    contiene $texto (pantalla) "código ${codigo}: su frase"
    # Con la firma mal, el descargado se borra (dice que se vuelva a
    # descargar); si falla la instalacion, se conserva para reintentar.
    if ($codigo -eq '10') { igual $false (Test-Path -LiteralPath $DESCARGADO) 'código 10: el instalador descargado se borra' }
    if ($codigo -eq '13') { igual $true (Test-Path -LiteralPath $DESCARGADO) 'código 13: el instalador descargado se conserva' }
  }
}

# El «No» de verdad del UAC (la excepcion de Process.Start) no se fabrica
# aqui: es de la integracion (B8), y aun no se ha probado.
function prueba_un_ctrl_c_durante_la_elevacion_espera_y_despues_para {
  $ctrl = Join-Path $env:NG_PRUEBA_CAJA 'ctrl-c'
  $fin = Join-Path $env:NG_PRUEBA_CAJA 'elevado-terminado'
  # El proceso elevado falso pulsa Ctrl+C y tarda un poco en terminar.
  $e = entorno_windows @{ NEUROGRAPH_PRUEBA_ELEVADO = (elevado_falso 0 -Acciones "marca:$ctrl,espera:2,marca:$fin"); NEUROGRAPH_PRUEBA_RESPUESTA = 's'; NEUROGRAPH_PRUEBA_CTRL_C = $ctrl }
  descarga_falsa
  igual 130 (con_lib (cuerpo_paso_2) sistema, docker -Entorno $e) 'sale como interrumpido'
  contiene 'no se puede interrumpir: se para cuando termine' (pantalla) 'lo dice'
  igual $true (Test-Path -LiteralPath $fin) 'después de que el proceso elevado termine, no antes'
}

function prueba_el_reinicio_apunta_runonce_y_sale_con_3010 {
  simular_tabla shutdown @('*|0||')
  $e = entorno_windows @{ NEUROGRAPH_PRUEBA_ELEVADO = (elevado_falso 3010 -Instala); NEUROGRAPH_PRUEBA_RESPUESTA = 's' }
  descarga_falsa
  igual 3010 (con_lib (cuerpo_paso_2) sistema, docker -Entorno $e) 'sale con 3010'
  contiene 'AVISO  falta reiniciar Windows' (pantalla) 'el paso queda en aviso'
  contiene 'el instalador seguirá solo' (pantalla) 'dice que seguirá solo'
  contiene '/r /t 15' (llamadas shutdown) 'reinicia, con la respuesta sí'
  $orden = (Get-ItemProperty -LiteralPath ($env:NEUROGRAPH_PRUEBA_HKCU + 'Software\Microsoft\Windows\CurrentVersion\RunOnce')).NeuroGraph
  contiene 'instalacion\windows\instalar.cmd" --tras-reinicio' $orden 'RunOnce del usuario'
  igual "$env:USERPROFILE\NeuroData" (valor_config NG_BIBLIOTECA) 'la biblioteca elegida se guarda antes de reiniciar'
}

function prueba_wsl_se_decide_por_los_componentes_y_la_version {
  $comp = archivo_con 'componentes' 'Disabled'
  $ver = archivo_con 'version-wsl' 'ninguna'
  $e = @{ NEUROGRAPH_PRUEBA_COMPONENTES = $comp; NEUROGRAPH_PRUEBA_VERSION_WSL = $ver }
  $cuerpo = "decir (`"asegurar=`" + (asegurar_wsl))"
  # 1. wsl --install deja VirtualMachinePlatform pendiente de reinicio.
  simular_tabla wsl @("--install|0|escribe:$comp=EnablePending|")
  [void](con_lib $cuerpo sistema, docker -Entorno $e)
  contiene 'asegurar=3010' (pantalla) 'activado con wsl --install: hay que reiniciar'
  contiene '--install --no-distribution --web-download' (llamadas wsl) 'sin distribución y desde GitHub'
  # 1b. Lo que se vio en la maquina virtual de pruebas: recien activado,
  # Windows ya dice
  # Enabled (y no EnablePending), aunque falta reiniciar; el WSL de GitHub
  # ya esta instalado.
  [IO.File]::WriteAllText($comp, 'Disabled')
  simular_tabla wsl @("--install|0|escribe:$comp=Enabled,escribe:$ver=3.0.1|")
  [void](con_lib $cuerpo sistema, docker -Entorno $e)
  contiene 'asegurar=3010' (pantalla) 'activado ahora, aunque diga Enabled: hay que reiniciar'
  [IO.File]::WriteAllText($ver, 'ninguna')
  # 2. wsl --install no hace nada: la segunda via, los componentes de Windows.
  [IO.File]::WriteAllText($comp, 'Disabled')
  simular_tabla wsl @('*|1||El Subsistema de Windows para Linux no está instalado')
  [void](con_lib "function script:activar_componentes { [IO.File]::WriteAllText('$comp', 'EnablePending') }`n$cuerpo" sistema, docker -Entorno $e)
  contiene 'asegurar=3010' (pantalla) 'con los componentes de Windows: hay que reiniciar'
  [IO.File]::WriteAllText($comp, 'Disabled')
  [void](con_lib "function script:activar_componentes { [IO.File]::WriteAllText('$comp', 'Enabled') }`n$cuerpo" sistema, docker -Entorno $e)
  contiene 'asegurar=3010' (pantalla) 'con los componentes, aunque Windows diga Enabled: hay que reiniciar'
  # 3. Nada funciona.
  [IO.File]::WriteAllText($comp, 'Disabled')
  [void](con_lib "function script:activar_componentes { throw 'no' }`n$cuerpo" sistema, docker -Entorno $e)
  contiene 'asegurar=11' (pantalla) 'WSL2 no se activa'
  # 4. Activado tras reiniciar pero sin el WSL de GitHub: wsl --update.
  [IO.File]::WriteAllText($comp, 'Enabled')
  simular_tabla wsl @("--update|0|escribe:$ver=2.4.13|")
  [void](con_lib $cuerpo sistema, docker -Entorno $e)
  contiene 'asegurar=0' (pantalla) 'actualizado'
  contiene '--update --web-download' (llamadas wsl) 'desde GitHub'
  # 5. La actualizacion no deja una version valida.
  [IO.File]::WriteAllText($ver, '2.0.0')
  simular_tabla wsl @('*|0||')
  [void](con_lib $cuerpo sistema, docker -Entorno $e)
  contiene 'asegurar=12' (pantalla) 'WSL2 no se actualiza'
  # 6. Otro estado sin activar (no solo Disabled): se activa como Disabled.
  [IO.File]::WriteAllText($comp, 'DisabledWithPayloadRemoved')
  [IO.File]::WriteAllText($ver, 'ninguna')
  Remove-Item -LiteralPath (Join-Path $env:NG_PRUEBA_LLAMADAS 'wsl')
  simular_tabla wsl @('*|1||')
  [void](con_lib "function script:activar_componentes { throw 'no' }`n$cuerpo" sistema, docker -Entorno $e)
  contiene '--install --no-distribution' (llamadas wsl) 'DisabledWithPayloadRemoved: prueba wsl --install'
  contiene 'asegurar=11' (pantalla) 'y sin activarse, no se activa'
}

function prueba_wsl_se_lanza_con_la_consola_como_entrada {
  # El WSL de serie se niega a --install y --update sin una consola como
  # entrada (visto el 10/10/2026): las dos llamadas llevan -EntradaConsola.
  $comp = archivo_con 'componentes' 'Disabled'
  $ver = archivo_con 'version-wsl' 'ninguna'
  $e = @{ NEUROGRAPH_PRUEBA_COMPONENTES = $comp; NEUROGRAPH_PRUEBA_VERSION_WSL = $ver }
  $espia = "function script:ejecutar_programa { param([string]`$Programa, [string[]]`$Argumentos, [hashtable]`$Entorno, [int]`$TiempoMax, [switch]`$EntradaConsola) registrar `"llamada: `$Programa `$(`$Argumentos -join ' ') consola=`$EntradaConsola`"; return [pscustomobject]@{ Codigo = 1; Salida = @(); TiempoAgotado = `$false } }"
  [void](con_lib "$espia`nfunction script:activar_componentes { throw 'no' }`ndecir (asegurar_wsl)" sistema, docker -Entorno $e)
  contiene 'llamada: wsl --install --no-distribution --web-download consola=True' (registro) 'wsl --install, con la consola'
  [IO.File]::WriteAllText($comp, 'Enabled')
  [void](con_lib "$espia`ndecir (asegurar_wsl)" sistema, docker -Entorno $e)
  contiene 'llamada: wsl --update --web-download consola=True' (registro) 'y wsl --update'
}

function prueba_con_wsl_pendiente_de_reinicio_un_docker_que_no_se_instala_espera_al_reinicio {
  $cuerpo = @'
function script:verificar_firma([string]$ruta) { return $true }
function script:asegurar_wsl { return 3010 }
function script:instalar_docker_desktop([string]$ruta) { return 13 }
decir "CODIGO=$(trabajo_elevado asegurar "$env:USERPROFILE\Docker Desktop Installer.exe" (carpeta_instalador_docker))"
'@
  [IO.File]::WriteAllText((Join-Path $env:USERPROFILE 'Docker Desktop Installer.exe'), 'instalador')
  igual 0 (con_lib $cuerpo sistema, docker) 'sale con 0'
  contiene 'CODIGO=3010' (pantalla) 'reiniciar, no «falló la instalación»: tras reiniciar se vuelve a intentar'
  contiene 'se intentará otra vez tras reiniciar' (registro) 'y se anota'
}

function prueba_se_instala_la_copia_verificada_en_la_carpeta_protegida {
  $instalador = Join-Path $env:USERPROFILE 'Docker Desktop Installer.exe'
  [IO.File]::WriteAllText($instalador, 'instalador')
  $cuerpo = @"
function script:verificar_firma([string]`$ruta) {
  decir "VERIFICADA=`$ruta"
  decir "PROTEGIDA=`$((Get-Acl -LiteralPath (Split-Path -Parent `$ruta)).AreAccessRulesProtected)"
  return `$true
}
function script:instalar_docker_desktop([string]`$ruta) { decir "INSTALADA=`$ruta"; return 0 }
decir "CODIGO=`$(trabajo_elevado nada '$instalador' (carpeta_instalador_docker))"
"@
  igual 0 (con_lib $cuerpo sistema, docker) 'sale con 0'
  $copia = Join-Path $env:NEUROGRAPH_PRUEBA_PROGRAMFILES 'neurograph-app\instalador-docker\Docker Desktop Installer.exe'
  contiene "VERIFICADA=$copia" (pantalla) 'la firma se comprueba en la copia de la carpeta protegida'
  contiene "INSTALADA=$copia" (pantalla) 'y se instala esa misma copia, no la descargada'
  contiene 'PROTEGIDA=True' (pantalla) 'con la carpeta ya protegida al comprobarla'
  contiene 'CODIGO=0' (pantalla) 'hecho'
}

function prueba_la_carpeta_del_instalador_de_docker_es_solo_de_administradores {
  $c = Join-Path $env:NEUROGRAPH_PRUEBA_PROGRAMFILES 'neurograph-app\instalador-docker'
  igual 0 (con_lib "carpeta_protegida '$c'; [IO.File]::WriteAllText('$c\viejo', 'x'); carpeta_protegida '$c'" sistema, docker) 'se crea, y se rehace'
  $acl = Get-Acl -LiteralPath $c
  igual $true $acl.AreAccessRulesProtected 'sin heredar permisos'
  $sids = @($acl.Access | ForEach-Object { $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value } | Sort-Object -Unique)
  igual 'S-1-5-18 S-1-5-32-544' ($sids -join ' ') 'solo SYSTEM y Administradores'
  igual $false (Test-Path -LiteralPath "$c\viejo") 'lo que hubiera se borra'
  # Un punto de reanalisis (aqui, una union a otra carpeta) no se usa.
  Remove-Item -LiteralPath $c -Recurse -Force
  $otra = Join-Path $env:USERPROFILE 'otra'
  [void](New-Item -ItemType Directory -Path $otra)
  [IO.File]::WriteAllText("$otra\dato", 'x')
  [void](New-Item -ItemType Junction -Path $c -Target $otra)
  igual 1 (con_lib "carpeta_protegida '$c'" sistema, docker) 'una unión se rechaza'
  contiene 'punto de reanálisis' (registro) 'y se dice por qué'
  igual $true (Test-Path -LiteralPath "$otra\dato") 'sin borrar nada a través de ella'
  [IO.Directory]::Delete($c)
}

function prueba_el_firmante_se_compara_entero_y_con_mayusculas {
  # Certificados hechos aqui, solo en memoria: el almacen de Windows no se toca.
  $cuerpo = @'
function cert([string]$sujeto) {
  $rsa = [Security.Cryptography.RSA]::Create(2048)
  $req = New-Object Security.Cryptography.X509Certificates.CertificateRequest($sujeto, $rsa, [Security.Cryptography.HashAlgorithmName]::SHA256, [Security.Cryptography.RSASignaturePadding]::Pkcs1)
  return $req.CreateSelfSigned([DateTimeOffset]::Now, [DateTimeOffset]::Now.AddDays(1))
}
$casos = @(
  'Valid|Authenticode|CN=Docker Inc, O=Docker Inc, L=Palo Alto, S=California, C=US|si'
  'Valid|Authenticode|CN=Docker Inc, O=Docker Inc, L=Palo Alto, S=California, C=US, SERIALNUMBER=4817464, OID.2.5.4.15=Private Organization|si'
  'Valid|Authenticode|CN=Docker Inc, O=Docker Inc|no'
  'Valid|Authenticode|CN=Docker Inc, O=Docker Inc, L=San Francisco, S=California, C=US|no'
  'Valid|Authenticode|CN=docker inc, O=Docker Inc|no'
  'Valid|Authenticode|CN=Docker Inc, O=Otra|no'
  'Valid|Authenticode|CN=Docker Inc|no'
  'Valid|Catalog|CN=Docker Inc, O=Docker Inc|no'
  'NotTrusted|Authenticode|CN=Docker Inc, O=Docker Inc|no'
)
foreach ($caso in $casos) {
  $estado, $tipo, $sujeto, $vale = $caso -split '\|'
  $f = [pscustomobject]@{ Status = $estado; SignatureType = $tipo; SignerCertificate = (cert $sujeto) }
  $obtenido = if (es_firma_de_docker $f) { 'si' } else { 'no' }
  if ($obtenido -ne $vale) { decir "MAL: $caso -> $obtenido" } else { decir "BIEN: $caso" }
}
'@
  igual 0 (con_lib $cuerpo sistema, docker) 'sale con 0'
  no_contiene 'MAL:' (pantalla) 'cada caso, como se espera'
  igual 9 ([regex]::Matches((pantalla), 'BIEN:').Count) 'los nueve'
}

function prueba_en_una_prueba_no_se_tocan_los_componentes_de_verdad {
  igual 1 (con_lib 'activar_componentes' sistema, docker) 'activar se niega'
  # El motivo, y no otro error (sin docker.ps1 tambien saldria con 1).
  contiene 'prueba: activar_componentes de verdad' (registro) 'por ser una prueba'
  igual 1 (con_lib 'estado_componente VirtualMachinePlatform' sistema, docker) 'y consultar, sin la variable de prueba'
  contiene 'prueba: estado_componente de verdad' (registro) 'tampoco'
}

function prueba_una_firma_que_no_es_de_docker_no_se_ejecuta {
  $instalador = Join-Path $env:USERPROFILE 'Docker Desktop Installer.exe'
  # Firmado (por catalogo) por Microsoft: valido, pero no de Docker Inc.
  Copy-Item -LiteralPath (Join-Path $PSHOME 'powershell.exe') -Destination $instalador
  $reg = Join-Path $env:USERPROFILE 'elevado.log'
  $elevado = Join-Path $env:NG_RAIZ 'instalacion\windows\elevado.ps1'
  $r = lanzar_prueba (Join-Path $PSHOME 'powershell.exe') "-NoProfile -ExecutionPolicy Bypass -File `"$elevado`" -Registro `"$reg`" -Wsl nada -Instalador `"$instalador`""
  igual 10 $r.Codigo 'sale con 10'
  $t = [IO.File]::ReadAllText($reg)
  contiene 'Valid' $t 'la firma es válida'
  contiene 'Microsoft' $t 'pero el firmante es otro'
  contiene 'tipo Catalog' $t 'y de un catálogo de Windows, no del archivo'
  igual $false (Test-Path -LiteralPath (Join-Path $env:NEUROGRAPH_PRUEBA_PROGRAMFILES 'neurograph-app')) 'la carpeta de administradores se borra'
  [IO.File]::WriteAllText($instalador, 'no firmado')
  # Algo oculto en la carpeta de encima: se ve (-Force) y no se borra, sin preguntar.
  $padre = Join-Path $env:NEUROGRAPH_PRUEBA_PROGRAMFILES 'neurograph-app'
  [void](New-Item -ItemType Directory -Path $padre)
  $oculto = Join-Path $padre 'oculto'
  [IO.File]::WriteAllText($oculto, 'x')
  (Get-Item -LiteralPath $oculto -Force).Attributes = 'Hidden'
  $r = lanzar_prueba (Join-Path $PSHOME 'powershell.exe') "-NoProfile -ExecutionPolicy Bypass -File `"$elevado`" -Registro `"$reg`" -Wsl nada -Instalador `"$instalador`""
  igual 10 $r.Codigo 'sin firma, también 10'
  igual $true (Test-Path -LiteralPath $oculto) 'la carpeta de encima, con algo oculto, se queda'
  igual $false (Test-Path -LiteralPath (Join-Path $padre 'instalador-docker')) 'la suya sí se borra'
  contiene 'fin del proceso elevado (código 10)' ([IO.File]::ReadAllText($reg)) 'y el registro termina'
}
