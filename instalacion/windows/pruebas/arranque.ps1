# Arranque de una prueba de funciones (B8.1 del diseno, H11): carga las
# ayudas y el archivo de pruebas, y ejecuta una prueba. Sale con 0 si la
# prueba no lanza ninguna excepcion.
param([string]$Archivo, [string]$Prueba)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = New-Object Text.UTF8Encoding($false) } catch { }
try {
  . (Join-Path $PSScriptRoot 'ayuda.ps1')
  . $Archivo
  & $Prueba | ForEach-Object { Write-Output "      (salida) $_" }
  exit 0
} catch {
  Write-Output "    $($_.Exception.Message)"
  if ($_.Exception.Message -notlike 'FALLA:*') {
    Write-Output $_.InvocationInfo.PositionMessage
    Write-Output $_.ScriptStackTrace
  }
  exit 1
}
