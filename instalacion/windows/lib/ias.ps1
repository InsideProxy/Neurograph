# Conexion de NeuroGraph con las IAs de terminal (B5 del diseno, H11). Las
# ordenes de Linux (comprobadas el 02/10/2026 en la documentacion oficial de
# Claude Code, Codex CLI y Gemini CLI), con el conector lanzado con
# «cmd.exe /c», un ejecutable real: Node no lanza un .cmd directamente.
# Siempre desde %USERPROFILE%: en la carpeta del proyecto, su .mcp.json (otro
# «neurograph») tapa al de usuario. Como instalacion/linux/lib/ias.sh.
# Variable de prueba: NEUROGRAPH_PRUEBA_SIN_PROGRAMAS (IAs que no se encuentran).

$NG_IAS = @('claude', 'codex', 'gemini')
$NG_IAS_RESUMEN = ''

function ia_nombre([string]$ia) {
  switch ($ia) { 'claude' { return 'Claude Code' } 'codex' { return 'Codex CLI' } 'gemini' { return 'Gemini CLI' } }
}

function ia_ejecutable([string]$ia) {  # -> ruta (.exe, .cmd o .ps1), o vacio si no esta
  if (" $env:NEUROGRAPH_PRUEBA_SIN_PROGRAMAS " -like "* $ia *") { return '' }
  $r = resolver_programa $ia
  if ($r) { return $r }
  # El instalador nativo de Claude Code lo deja en %USERPROFILE%\.local\bin, que puede no estar en el PATH.
  $c = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
  if ($ia -eq 'claude' -and (Test-Path -LiteralPath $c)) { return $c }
  return ''
}

function ejecutar_ia([string]$exe, [string[]]$a, [switch]$Capturar, [string]$Copia) {
  return (ejecutar_programa $exe $a -Directorio $env:USERPROFILE -TiempoMax 120 -Capturar:$Capturar -Copia $Copia)
}

# Las dos salidas de una orden, juntas (como «2>&1» en Linux): la lista de
# «mcp list» puede salir por la de errores.
function salida_completa_ia([string]$exe, [string[]]$a) {  # -> sus lineas
  $f = Join-Path $env:TEMP ('neurograph-ia-' + [guid]::NewGuid().ToString('N') + '.txt')
  try {
    [void](ejecutar_ia $exe $a -Copia $f)
    if (-not (Test-Path -LiteralPath $f)) { return @() }
    return @([IO.File]::ReadAllLines($f, $NG_UTF8))
  } finally { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue }
}

function registrar_ia([string]$ia) {  # -> $true si quedo registrada
  $exe = ia_ejecutable $ia
  if (-not $exe) { return $false }
  $mcp = Join-Path $NG_BIN 'neurograph-mcp.cmd'
  $r = $null
  switch ($ia) {
    'claude' {
      [void](ejecutar_ia $exe @('mcp', 'remove', 'neurograph', '-s', 'user'))
      $r = ejecutar_ia $exe @('mcp', 'add', '--transport', 'stdio', '--scope', 'user', 'neurograph', '--', 'cmd.exe', '/c', $mcp)
    }
    'codex' {
      [void](ejecutar_ia $exe @('mcp', 'remove', 'neurograph'))
      $r = ejecutar_ia $exe @('mcp', 'add', 'neurograph', '--', 'cmd.exe', '/c', $mcp)
    }
    'gemini' {
      [void](ejecutar_ia $exe @('mcp', 'remove', '--scope', 'user', 'neurograph'))
      $r = ejecutar_ia $exe @('mcp', 'add', '--scope', 'user', 'neurograph', 'cmd.exe', '/c', $mcp)
    }
  }
  return ($null -ne $r -and $r.Codigo -eq 0)
}

function quitar_ia([string]$ia) {  # solo las que registro el instalador
  $exe = ia_ejecutable $ia
  if (-not $exe) { return }
  switch ($ia) {
    'claude' { [void](ejecutar_ia $exe @('mcp', 'remove', 'neurograph', '-s', 'user')) }
    'codex' { [void](ejecutar_ia $exe @('mcp', 'remove', 'neurograph')) }
    'gemini' { [void](ejecutar_ia $exe @('mcp', 'remove', '--scope', 'user', 'neurograph')) }
  }
}

function comprobar_ia([string]$ia) {  # -> conectado | registrado | fallo
  $exe = ia_ejecutable $ia
  switch ($ia) {
    'claude' {
      $s = (@(salida_completa_ia $exe @('mcp', 'list')) | Where-Object { $_ -like 'neurograph:*' }) -join "`n"
      if ($s -like '*Connected*' -and $s -notlike '*Failed*') { return 'conectado' }
      return 'fallo'
    }
    'gemini' {
      $s = (@(salida_completa_ia $exe @('mcp', 'list')) | Where-Object { $_ -like '*neurograph*' }) -join "`n"
      if ($s -like '*Connected*' -and $s -notlike '*Disconnected*') { return 'conectado' }
      return 'fallo'
    }
    'codex' {
      if ((ejecutar_ia $exe @('mcp', 'get', 'neurograph') -Capturar).Codigo -eq 0) { return 'registrado' }
      return 'fallo'
    }
  }
}

function conectar_ias {
  $encontradas = @($NG_IAS | Where-Object { ia_ejecutable $_ })
  if ($encontradas.Count -eq 0) { $script:NG_IAS_RESUMEN = 'no se encontró ninguna IA de terminal'; return }
  $nombres = ($encontradas | ForEach-Object { ia_nombre $_ }) -join ', '
  if (-not (preguntar_si "¿Conectar NeuroGraph con ${nombres}?")) {
    $script:NG_IAS_RESUMEN = 'sin conectar (para hacerlo después: neurograph conectar-ia)'
    return
  }
  $registradas = @()
  $partes = @()
  foreach ($ia in $encontradas) {
    if (-not (registrar_ia $ia)) { $partes += "$(ia_nombre $ia): no se pudo registrar"; continue }
    $registradas += $ia
    $estado = if (contenedor_en_marcha "$NG_PROYECTO-api") { comprobar_ia $ia } else { 'registrado' }
    switch ($estado) {
      'conectado' { $partes += "$(ia_nombre $ia): conectado" }
      'registrado' { $partes += "$(ia_nombre $ia): registrado" }
      default {
        $partes += "$(ia_nombre $ia): no responde"
        avisar "$(ia_nombre $ia) no responde a NeuroGraph: mira $(Join-Path $NG_DIR 'conectar-ia.md')."
      }
    }
  }
  foreach ($ia in $NG_IAS) { if ($encontradas -notcontains $ia) { $partes += "$(ia_nombre $ia): no encontrado" } }
  foreach ($ia in @((leer_valor $NG_ESTADO NG_IAS_REGISTRADAS) -split ' ' | Where-Object { $_ })) {
    if ($registradas -notcontains $ia) { $registradas += $ia }
  }
  guardar_valor $NG_ESTADO NG_IAS_REGISTRADAS ($registradas -join ' ')
  $script:NG_IAS_RESUMEN = $partes -join ' · '
}
