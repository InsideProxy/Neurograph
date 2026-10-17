# Instalador de NeuroGraph para Windows (H11). Diseno completo en
# docs/instalador-windows-diseno.md. Se lanza con instalar.cmd (doble clic).
# Uso: instalar.cmd [--biblioteca RUTA]
# Variable de prueba: NEUROGRAPH_PRUEBA_SOLO_ARGUMENTOS (dice lo que entendio y sale).
$ErrorActionPreference = 'Stop'
# instalar.cmd ya lo comprueba; esto es para quien lance el .ps1 directamente.
if ($ExecutionContext.SessionState.LanguageMode -ne 'FullLanguage') {
  Write-Host 'No se puede ejecutar el instalador: Windows tiene PowerShell en modo restringido (lo ponen Smart App Control o una directiva del administrador). Pide ayuda al administrador del ordenador.'
  exit 1
}
$NG_RAIZ = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
foreach ($l in 'comun', 'sistema', 'docker', 'puertos', 'imagenes', 'base', 'tractografia', 'mcp', 'ias', 'escritorio') { . (Join-Path $PSScriptRoot "lib\$l.ps1") }
$NG_REPETIR = "el instalador ($(Join-Path $PSScriptRoot 'instalar.cmd'))"

$NG_ARG_BIBLIOTECA = ''
$NG_TRAS_REINICIO = $false
$uso = 'Uso: instalar.cmd [--biblioteca RUTA]   (por defecto, %USERPROFILE%\NeuroData)'
for ($i = 0; $i -lt $args.Count; $i++) {
  switch -CaseSensitive ($args[$i]) {
    '--biblioteca' {
      $i++
      if ($i -ge $args.Count -or -not $args[$i]) { Write-Host 'Falta la ruta tras --biblioteca.'; exit 1 }
      $NG_ARG_BIBLIOTECA = $args[$i]
      break
    }
    '--tras-reinicio' { $NG_TRAS_REINICIO = $true; break }  # interna: la pone RunOnce (paso 2)
    { $_ -in '-h', '--ayuda', '--help' } { Write-Host $uso; exit 0 }
    default { Write-Host "Opción desconocida: $($args[$i]). $uso"; exit 1 }
  }
}

# La biblioteca: la de --biblioteca o la guardada en config.env, con la ruta
# completa respecto a la carpeta actual de PowerShell. Si no hay ninguna, se
# elige en el paso 1 (B2).
$NG_BIBLIOTECA_ELEGIDA = $NG_ARG_BIBLIOTECA
if (-not $NG_BIBLIOTECA_ELEGIDA) { $NG_BIBLIOTECA_ELEGIDA = leer_valor $NG_CONFIG NG_BIBLIOTECA }
# GetFullPath y no GetUnresolvedProviderPathFromPSPath, que lanza
# DriveNotFoundException con un disco desconectado: eso lo dice el paso 1
# con su frase (B2). Una ruta que Windows no admite (| < > o : a mitad)
# lanza aqui, antes del registro: se dice con su frase.
if ($NG_BIBLIOTECA_ELEGIDA) {
  try { $NG_BIBLIOTECA_ELEGIDA = [IO.Path]::GetFullPath([IO.Path]::Combine((Get-Location -PSProvider FileSystem).ProviderPath, $NG_BIBLIOTECA_ELEGIDA)) }
  catch { Write-Host (frase biblioteca_ruta $NG_BIBLIOTECA_ELEGIDA); exit 1 }
}
if ($env:NEUROGRAPH_PRUEBA_SOLO_ARGUMENTOS) { Write-Host "biblioteca=$NG_BIBLIOTECA_ELEGIDA tras-reinicio=$NG_TRAS_REINICIO"; exit 0 }

$NG_CARGA_TERMINADA = $false
function al_salir_extra([int]$codigo) {
  # Sin el bloqueo, lo que hay es de otra ejecucion en marcha: no se toca (B1).
  if (-not $script:NG_BLOQUEO) { return }
  parar_tractografia_en_curso
  if ($codigo -eq 0 -or $codigo -eq 3010) { return }
  # Si falla o se interrumpe antes de terminar el paso 7, se quita lo de esta
  # ejecucion (B1).
  if (-not $script:NG_CARGA_TERMINADA) { limpiar_lo_incompleto }
  guardar_valor $NG_ESTADO NG_INSTALACION incompleta
}

# El paso 8 nunca detiene la instalacion: si falla, queda pendiente (B2).
function paso_8 { [void](paso_tractografia) }

ejecutar_principal 'instalar' {
  tomar_bloqueo
  if ($NG_TRAS_REINICIO) {
    $script:NG_CONTINUAR_EN = 2
    decir 'Continuando la instalación de NeuroGraph tras el reinicio.'
  } else {
    Remove-Item -LiteralPath $NG_AVISOS_ARCHIVO -Force -ErrorAction SilentlyContinue
    if ($NG_BIBLIOTECA_ELEGIDA) { decir "Instalando NeuroGraph. Biblioteca de datos: $NG_BIBLIOTECA_ELEGIDA" }
    else { decir 'Instalando NeuroGraph.' }
  }
  guardar_valor $NG_ESTADO NG_INSTALACION incompleta
  decir ''
  paso 1 'Comprobando el ordenador' paso_comprobar
  paso 2 'Docker' paso_docker -Largo
  if ($script:NG_REINICIO) { pedir_reinicio }
  paso 3 'Docker en marcha' paso_docker_en_marcha -Largo
  paso 4 'Comprobando puertos' elegir_puertos
  paso 5 'Preparando NeuroGraph (5-10 min la primera vez)' paso_imagenes -Largo
  paso 6 'Encendiendo' paso_encender
  paso 7 'Cargando datos (24 archivos)' paso_cargar -Largo
  $script:NG_CARGA_TERMINADA = $true
  paso 8 'Tractografía (unos 500 MB)' paso_8 -Largo
  paso 9 'Accesos, comandos y conexión con IAs' paso_escritorio
  comprobacion_final
  guardar_valor $NG_ESTADO NG_INSTALACION completa
  pantalla_final
}
exit $NG_CODIGO_SALIDA
