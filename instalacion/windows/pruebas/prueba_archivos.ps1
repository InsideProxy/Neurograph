# Comprobaciones de los archivos del instalador Windows (bloque A y
# lanzar programas, del diseno; H11).
$W = Join-Path $env:NG_RAIZ 'instalacion\windows'

function arbol_de([string]$archivo) {  # -> el arbol sintactico (y falla si no carga)
  $t = $null
  $e = $null
  $a = [Management.Automation.Language.Parser]::ParseFile($archivo, [ref]$t, [ref]$e)
  if ($e) { throw "FALLA: $archivo no carga: $($e[0].Message)" }
  return $a
}
# Lo que se ejecuta en el ordenador de la persona (no las pruebas).
function codigo_del_instalador {
  return @(Get-ChildItem -LiteralPath $W -Recurse -Filter '*.ps1' | Where-Object { $_.FullName -notlike '*\pruebas\*' })
}

function prueba_todo_ps1_lleva_bom_y_carga {
  $malos = @()
  foreach ($f in Get-ChildItem -LiteralPath $W -Recurse -Filter '*.ps1') {
    $b = [IO.File]::ReadAllBytes($f.FullName)
    if ($b.Length -lt 3 -or $b[0] -ne 0xEF -or $b[1] -ne 0xBB -or $b[2] -ne 0xBF) { $malos += "$($f.Name): sin BOM" }
    $t = $null
    $e = $null
    [void][Management.Automation.Language.Parser]::ParseFile($f.FullName, [ref]$t, [ref]$e)
    foreach ($x in @($e)) { if ($x) { $malos += "$($f.Name):$($x.Extent.StartLineNumber): $($x.Message)" } }
  }
  igual '' ($malos -join '; ') 'todos con BOM (PowerShell 5.1 lee sin BOM como ANSI) y sin errores de sintaxis'
}

function prueba_todo_cmd_es_ascii_y_con_crlf {
  $malos = @()
  foreach ($f in Get-ChildItem -LiteralPath $W -Recurse -Filter '*.cmd') {
    $b = [IO.File]::ReadAllBytes($f.FullName)
    for ($i = 0; $i -lt $b.Length; $i++) {
      if ($b[$i] -gt 127) { $malos += "$($f.Name): no es ASCII (byte $i)"; break }
      if ($b[$i] -eq 10 -and ($i -eq 0 -or $b[$i - 1] -ne 13)) { $malos += "$($f.Name): salto sin CR (byte $i)"; break }
    }
  }
  igual '' ($malos -join '; ') 'cmd lee los .cmd en la página OEM, y con LF falla al buscar etiquetas'
}

# Llamadas a programas que no van por ejecutar_programa («Lanzar programas»
# del diseno): por su nombre (docker, & docker), con & y cualquier cosa que no
# sea un bloque (& $exe, & "$env:ProgramFiles\Docker\docker.exe"), y con
# Process.Start o Start-Process. Las excepciones, justificadas: comun.ps1,
# que es quien lanza (ejecutar_programa, detener_arbol, lanzar_aplicacion);
# lanzar_elevado, que eleva con el verbo runas; y el & de paso y de
# ejecutar_principal, que llaman a la funcion del paso y al cuerpo del
# ejecutable, y el de esperar_hasta, que llama a la prueba que recibe como
# bloque ([scriptblock]; con .Invoke() un NG:interrumpido llegaria envuelto).
$PERMITIDO_AMPERSAND = @('comun.ps1:paso', 'comun.ps1:ejecutar_principal', 'base.ps1:esperar_hasta')
# cmd_desinstalar lanza el desinstalador en la consola de la persona, sin
# redirigir, porque pregunta: no puede ir por ejecutar_programa.
$PERMITIDO_PROCESO = @('comun.ps1:*', 'docker.ps1:lanzar_elevado', 'neurograph.ps1:cmd_desinstalar')

function funcion_de($nodo) {  # la funcion que contiene el nodo ('' fuera de una)
  for ($p = $nodo.Parent; $p; $p = $p.Parent) {
    if ($p -is [Management.Automation.Language.FunctionDefinitionAst]) { return $p.Name }
  }
  return ''
}
function permitido([string]$donde, [string[]]$lista) { return [bool]($lista | Where-Object { $donde -like $_ }) }

function llamadas_externas([string[]]$archivos) {  # -> 'archivo:linea: que'
  $externos = '^(docker|wsl|curl|claude|codex|gemini|taskkill|schtasks|shutdown|tar|cmd|powershell|msiexec|notepad|explorer|ping)(\.exe)?$'
  $malos = @()
  foreach ($ruta in $archivos) {
    $archivo = Split-Path -Leaf $ruta
    $a = arbol_de $ruta
    foreach ($c in $a.FindAll({ param($n) $n -is [Management.Automation.Language.CommandAst] }, $true)) {
      $donde = "${archivo}:$(funcion_de $c)"
      $linea = "${archivo}:$($c.Extent.StartLineNumber)"
      $primero = $c.CommandElements[0]
      if ($c.InvocationOperator -eq 'Ampersand' -and $primero -isnot [Management.Automation.Language.ScriptBlockExpressionAst]) {
        if (-not (permitido $donde $PERMITIDO_AMPERSAND)) { $malos += "${linea}: & $($primero.Extent.Text)" }
        continue
      }
      $n = $c.GetCommandName()
      if (-not $n) { continue }
      if ($n -in 'Start-Process', 'start', 'saps') {
        if (-not (permitido $donde $PERMITIDO_PROCESO)) { $malos += "${linea}: $n" }
        continue
      }
      # La lista, y cualquier otro nombre que Windows resuelva a un programa
      # (where, sc, findstr...), salvo si PowerShell lo toma por un cmdlet o
      # un alias, que tienen preferencia (sort es Sort-Object).
      $programa = Get-Command -Name $n -CommandType Application -ErrorAction SilentlyContinue
      $propio = Get-Command -Name $n -CommandType Cmdlet, Alias -ErrorAction SilentlyContinue
      if ($n -match $externos -or ($programa -and -not $propio)) { $malos += "${linea}: $n" }
    }
    $inicios = $a.FindAll({ param($n)
        $n -is [Management.Automation.Language.InvokeMemberExpressionAst] -and $n.Static -and "$($n.Member)" -eq 'Start' -and
        $n.Expression -is [Management.Automation.Language.TypeExpressionAst] -and $n.Expression.TypeName.FullName -match '(^|\.)Process$' }, $true)
    foreach ($m in $inicios) {
      if (-not (permitido "${archivo}:$(funcion_de $m)" $PERMITIDO_PROCESO)) { $malos += "${archivo}:$($m.Extent.StartLineNumber): $($m.Extent.Text)" }
    }
  }
  return $malos
}

function prueba_ningun_programa_externo_se_llama_directamente {
  # Lanzar programas (diseno): todos con ejecutar_programa, que comprueba el
  # codigo, tiene tiempo maximo, Ctrl+C y la salida al registro.
  igual '' (@(llamadas_externas @(codigo_del_instalador | ForEach-Object { $_.FullName })) -join '; ') 'ningún programa externo se llama directamente'
}

function prueba_la_comprobacion_de_programas_ve_cada_forma {
  $f = Join-Path $env:USERPROFILE 'lanza.ps1'
  escribir_ps1 $f "function f {`n  & `$exe info`n  & `"`$env:ProgramFiles\Docker\docker.exe`" info`n  [Diagnostics.Process]::Start('x')`n  Start-Process x`n  docker info`n  & { 'un bloque vale' }`n}`n"
  igual "lanza.ps1:2: & `$exe; lanza.ps1:3: & `"`$env:ProgramFiles\Docker\docker.exe`"; lanza.ps1:5: Start-Process; lanza.ps1:6: docker; lanza.ps1:4: [Diagnostics.Process]::Start('x')" (@(llamadas_externas @($f)) -join '; ') 'las cinco, y el bloque no'
}

# Escrituras que cambian la codificacion: en PowerShell 5.1, > y Out-File
# escriben UTF-16, y Set-Content, Add-Content y Tee-Object (y sus alias sc,
# ac y tee) ponen BOM o UTF-16: compose y cmd no los leerian. > $null no
# escribe nada.
function escrituras_con_otra_codificacion([string[]]$archivos) {  # -> 'archivo:linea: que'
  $malos = @()
  foreach ($ruta in $archivos) {
    $archivo = Split-Path -Leaf $ruta
    $a = arbol_de $ruta
    foreach ($c in $a.FindAll({ param($n) $n -is [Management.Automation.Language.CommandAst] }, $true)) {
      if ($c.GetCommandName() -in 'Out-File', 'Set-Content', 'Add-Content', 'Tee-Object', 'sc', 'ac', 'tee') { $malos += "${archivo}:$($c.Extent.StartLineNumber): $($c.GetCommandName())" }
    }
    foreach ($r in $a.FindAll({ param($n) $n -is [Management.Automation.Language.FileRedirectionAst] }, $true)) {
      if ($r.Location -is [Management.Automation.Language.VariableExpressionAst] -and $r.Location.VariablePath.UserPath -eq 'null') { continue }
      $malos += "${archivo}:$($r.Extent.StartLineNumber): redirección a archivo"
    }
  }
  return $malos
}

function prueba_sin_escrituras_que_cambian_la_codificacion {
  igual '' (@(escrituras_con_otra_codificacion @(codigo_del_instalador | ForEach-Object { $_.FullName })) -join '; ') 'los archivos se escriben con [IO.File] y UTF-8 sin BOM'
}

function prueba_la_comprobacion_de_escrituras_ve_los_alias {
  $f = Join-Path $env:USERPROFILE 'escribe.ps1'
  escribir_ps1 $f "function f {`n  sc a b`n  ac a b`n  'x' | tee a`n  'x' | Tee-Object -FilePath a`n  'x' > a`n  'x' > `$null`n  'x' 2> `$null`n}`n"
  igual 'escribe.ps1:2: sc; escribe.ps1:3: ac; escribe.ps1:4: tee; escribe.ps1:5: Tee-Object; escribe.ps1:6: redirección a archivo' (@(escrituras_con_otra_codificacion @($f)) -join '; ') 'las cinco, y > $null no'
}
