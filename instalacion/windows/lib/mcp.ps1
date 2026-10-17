# Comprobacion del conector MCP instalado (B1 y B4 del diseno, H11): habla
# con neurograph-mcp.cmd como lo haria una IA (initialize y tools/list) y
# cuenta las herramientas. Deja NG_MCP_HERRAMIENTAS y NG_MCP_SEGUNDOS.
# Como instalacion/linux/lib/mcp.sh.
# Variable de prueba: NEUROGRAPH_PRUEBA_MCP (otro programa en lugar de neurograph-mcp.cmd).

$NG_MCP_HERRAMIENTAS = ''
$NG_MCP_SEGUNDOS = ''
$NG_MCP_LINEA = ''

# Lee del conector hasta la respuesta con ese id y la deja en NG_MCP_LINEA.
# -> 0; 1 si el conector se cerro; 2 si no responde en NG_ESPERA_MCP s: son
# fallos distintos (B1).
function leer_respuesta_mcp($p, [int]$id) {
  $limite = [DateTime]::Now.AddSeconds($NG_ESPERA_MCP)
  $linea = $null
  while ($true) {
    while ($p.Salida.TryDequeue([ref]$linea)) {
      if ($linea -match "`"id`":\s?$id[,}]") { $script:NG_MCP_LINEA = $linea; return 0 }
    }
    if ($p.P.HasExited) {
      [void]$p.EsperarSalida(2000)
      if ($p.Salida.IsEmpty) { return 1 }
      continue
    }
    if ([DateTime]::Now -ge $limite) { return 2 }
    Start-Sleep -Milliseconds 100
    comprobar_interrupcion
  }
}

function enviar_mcp($p, [string]$linea) {  # si el conector ya se cerro, lo dira la lectura
  try { $p.EscribirLinea($linea) } catch { registrar "mcp: no se pudo escribir (el conector se cerró): $($_.Exception.Message)" }
}

function comprobar_mcp {
  $mcp = if ($env:NEUROGRAPH_PRUEBA_MCP) { $env:NEUROGRAPH_PRUEBA_MCP } else { Join-Path $NG_BIN 'neurograph-mcp.cmd' }
  $reloj = [Diagnostics.Stopwatch]::StartNew()
  $r = ejecutar_programa $mcp -Capturar -SinEsperar
  $p = $r.Proceso
  $fase = 'initialize'
  $estado = 0
  try {
    enviar_mcp $p '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"instalador-neurograph","version":"1"}}}'
    $estado = leer_respuesta_mcp $p 1
    if ($estado -eq 0) {
      $script:NG_MCP_SEGUNDOS = [int]$reloj.Elapsed.TotalSeconds
      $fase = 'tools/list'
      enviar_mcp $p '{"jsonrpc":"2.0","method":"notifications/initialized"}'
      enviar_mcp $p '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
      $estado = leer_respuesta_mcp $p 2
    }
  } finally {
    $p.CerrarEntrada()
    [void](detener_proceso $r)
  }
  if ($estado -eq 1) { fallar mcp "el conector se cerró sin responder a $fase" }
  if ($estado -eq 2) { fallar mcp "no responde a $fase en $NG_ESPERA_MCP s" }
  $n = $null
  try {
    $j = $script:NG_MCP_LINEA | ConvertFrom-Json
    if ($j.result -and $null -ne $j.result.tools) { $n = @($j.result.tools).Count }
  } catch { relanzar_si_ng $_ }
  if ($null -eq $n) { fallar mcp 'su respuesta a tools/list no trae la lista de herramientas' }
  $script:NG_MCP_HERRAMIENTAS = [string]$n
  registrar "mcp: initialize en $($script:NG_MCP_SEGUNDOS) s, $n herramientas"
}
