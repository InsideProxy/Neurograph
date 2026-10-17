# Lo que necesita administrador en el paso 2 del instalador Windows (bloque
# A del diseno, H11), en una sola elevacion UAC: copiar el instalador de
# Docker Desktop a una carpeta de administradores, comprobar alli su firma,
# activar WSL2 sin distribucion e instalar Docker Desktop. Escribe su
# registro en la ruta absoluta que se le pasa y sale con un codigo: 0 hecho,
# 3010 hay que reiniciar, 10 firma incorrecta, 11 WSL2 no se activa, 12 WSL2
# no se actualiza, 13 Docker Desktop no se instala, 1 otro fallo. Nada de lo
# que es del usuario (RunOnce, estado.env, la configuracion de Docker) se
# escribe aqui: si aprueba otra cuenta de administrador, este proceso es esa cuenta.
param([string]$Registro, [ValidateSet('nada', 'asegurar')][string]$Wsl = 'nada', [string]$Instalador = '')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\comun.ps1')
. (Join-Path $PSScriptRoot 'lib\sistema.ps1')
. (Join-Path $PSScriptRoot 'lib\docker.ps1')
[NeuroGraph.Registro]::Abrir($Registro)
$codigo = 1
$carpeta = ''
try {
  registrar "== $(fecha_iso) proceso elevado (pid $PID, cuenta $([Security.Principal.WindowsIdentity]::GetCurrent().Name), wsl $Wsl) =="
  $carpeta = carpeta_instalador_docker
  $codigo = trabajo_elevado $Wsl $Instalador $carpeta
} catch {
  registrar "ERROR inesperado en el proceso elevado: $($_.Exception.Message)"
  registrar $_.ScriptStackTrace
  $codigo = 1
} finally {
  # La limpieza no cambia el codigo ni corta el final del registro. Nunca se
  # borra a traves de un punto de reanalisis, y la carpeta de encima solo si
  # esta vacia (-Force: tambien cuenta lo oculto; con algo dentro, Remove-Item
  # sin -Recurse preguntaria, y esta ventana no se ve).
  try {
    if ($carpeta -and -not (es_punto_de_reanalisis $carpeta) -and (Test-Path -LiteralPath $carpeta)) { Remove-Item -LiteralPath $carpeta -Recurse -Force }
    $padre = if ($carpeta) { Split-Path -Parent $carpeta } else { '' }
    if ($padre -and (Test-Path -LiteralPath $padre) -and -not (es_punto_de_reanalisis $padre) -and -not (Get-ChildItem -LiteralPath $padre -Force)) { Remove-Item -LiteralPath $padre -Force }
  } catch { registrar "no se pudo borrar ${carpeta}: $($_.Exception.Message)" }
  registrar "== fin del proceso elevado (código $codigo) $(fecha_iso) =="
  [NeuroGraph.Registro]::Cerrar()
}
exit $codigo
