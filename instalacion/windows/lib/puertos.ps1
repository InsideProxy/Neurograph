# Paso 4 y abrir: puertos de la web y la API (B1 del diseno, H11). Ocupado:
# alguien escucha en el (en cualquier direccion), o no se puede abrir de
# verdad en 127.0.0.1, porque Windows reserva rangos de puertos para Hyper-V
# y WSL que no aparecen como ocupados. Los contenedores de este NeuroGraph
# no cuentan: con NeuroGraph en marcha no se cambia nada.
# Como instalacion/linux/lib/puertos.sh.
# Variable de prueba: NEUROGRAPH_PRUEBA_PUERTOS_ESCUCHANDO (puertos en los
# que alguien escucha, o «ninguno»).

function puerto_escuchando([int]$p) {
  if ($env:NEUROGRAPH_PRUEBA_PUERTOS_ESCUCHANDO) { return (" $env:NEUROGRAPH_PRUEBA_PUERTOS_ESCUCHANDO " -like "* $p *") }
  return [bool](Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue)
}

function puerto_se_puede_abrir([int]$p) {
  $l = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $p)
  try { $l.Start(); return $true } catch { return $false } finally { $l.Stop() }
}

function puerto_de_neurograph([int]$p) {  # lo publica un contenedor de este NeuroGraph
  foreach ($l in ((docker_valor @('ps', '--format', '{{.Names}}|{{.Ports}}')) -split "`n")) {
    if ($l.StartsWith("$NG_PROYECTO-") -and $l -match "[\]:]$p->") { return $true }
  }
  return $false
}

function puerto_ocupado([int]$p) {
  if (puerto_de_neurograph $p) { return $false }
  return ((puerto_escuchando $p) -or -not (puerto_se_puede_abrir $p))
}

function primer_puerto_libre([int]$desde, [int]$salvo = 0) {  # -> puerto, o 0 si no hay en 50
  for ($p = $desde; $p -le $desde + 50; $p++) {
    if ($p -ne $salvo -and -not (puerto_ocupado $p)) { return $p }
  }
  return 0
}

function elegir_puertos {
  $web = leer_valor $NG_CONFIG NG_WEB_PUERTO
  if (-not $web) { $web = '5173' }
  $api = leer_valor $NG_CONFIG NG_API_PUERTO
  if (-not $api) { $api = '8420' }
  if (contenedor_en_marcha "$NG_PROYECTO-web") {
    $script:NG_RESUMEN = "web $web · API $api"
    return
  }
  if (puerto_ocupado $web) {
    $nuevo = primer_puerto_libre $web $api
    if (-not $nuevo) { fallar sin_puerto $web }
    avisar "La web usa el puerto $nuevo (el $web estaba ocupado)."
    $web = [string]$nuevo
  }
  if ($api -eq $web -or (puerto_ocupado $api)) {
    $nuevo = primer_puerto_libre $api $web
    if (-not $nuevo) { fallar sin_puerto $api }
    if ($api -ne $web) { avisar "La API usa el puerto $nuevo (el $api estaba ocupado)." }
    $api = [string]$nuevo
  }
  guardar_valor $NG_CONFIG NG_WEB_PUERTO $web
  guardar_valor $NG_CONFIG NG_API_PUERTO $api
  $script:NG_RESUMEN = "web $web · API $api"
}
