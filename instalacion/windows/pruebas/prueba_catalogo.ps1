# Pruebas del catalogo de fallos (B1 del diseno, H11).
. "$env:NG_LIB\comun.ps1"

function prueba_las_senales_de_script_son_las_de_linux {
  # Leidas de la tabla de Linux, no de una lista a mano: una señal nueva alli falla aqui.
  $sh = [IO.File]::ReadAllText((Join-Path $env:NG_RAIZ 'instalacion\linux\lib\catalogo.sh'))
  $tabla = [regex]::Match($sh, '(?s)declare -gA NG_SENAL_SCRIPT=\((.*?)\n\)').Groups[1].Value
  $linux = @{}
  foreach ($m in [regex]::Matches($tabla, '\[(\w+)\]="([^"]*)"')) { $linux[$m.Groups[1].Value] = $m.Groups[2].Value }
  if ($linux.Count -eq 0) { throw 'FALLA: no se pudo leer NG_SENAL_SCRIPT de instalacion/linux/lib/catalogo.sh' }
  igual (($linux.Keys | Sort-Object) -join ' ') (($NG_SENAL_SCRIPT.Keys | Sort-Object) -join ' ') 'las mismas señales que en Linux'
  foreach ($c in $linux.Keys) { igual $linux[$c] $NG_SENAL_SCRIPT[$c] "el mismo texto en $c" }
  igual (($NG_SENAL_SCRIPT.Keys | Sort-Object) -join ' ') (($NG_ORDEN_SENALES_SCRIPT | Sort-Object) -join ' ') 'el orden de búsqueda no pierde ninguna'
  igual (($NG_SENAL_SISTEMA.Keys | Sort-Object) -join ' ') (($NG_ORDEN_SENALES_SISTEMA | Sort-Object) -join ' ') 'ni en las del sistema'
}

function prueba_cada_senal_de_script_existe_en_los_scripts_reales {
  $scripts = [IO.File]::ReadAllText((Join-Path $env:NG_RAIZ 'scripts\install_tractography.sh')) + [IO.File]::ReadAllText((Join-Path $env:NG_RAIZ 'scripts\rebuild_db_from_sql.sh'))
  foreach ($c in $NG_SENAL_SCRIPT.Keys) {
    if ($scripts.IndexOf($NG_SENAL_SCRIPT[$c], [StringComparison]::OrdinalIgnoreCase) -lt 0) { throw "FALLA: la señal '$c' ya no está en los scripts" }
  }
}

function prueba_cada_senal_tiene_su_frase {
  foreach ($c in @($NG_SENAL_SCRIPT.Keys) + @($NG_SENAL_SISTEMA.Keys)) {
    if (-not $NG_FRASE.ContainsKey($c)) { throw "FALLA: '$c' sin frase" }
  }
}

function prueba_clasificar_reconoce_cada_senal_con_su_detalle {
  $f = Join-Path $env:USERPROFILE 'salida'
  foreach ($c in $NG_ORDEN_SENALES_SCRIPT) {
    [IO.File]::WriteAllText($f, "linea previa`nERROR: $($NG_SENAL_SCRIPT[$c]) (con: algo): a.zip`n")
    igual $c (clasificar_salida $f) "señal de script $c"
    igual 'a.zip' (detalle_senal $c $f) "el dato de $c, tras el último «: »"
  }
  [IO.File]::WriteAllText($f, "write /var/lib/docker/x: no space left on device`n")
  igual espacio (clasificar_salida $f) 'sin espacio'
  [IO.File]::WriteAllText($f, "Bind for 127.0.0.1:8420 failed: port is already allocated`n")
  igual puerto (clasificar_salida $f) 'puerto de otro contenedor'
  [IO.File]::WriteAllText($f, "Error response from daemon: Ports are not available: exposing port TCP 127.0.0.1:5173 -> 0.0.0.0:0: listen tcp 127.0.0.1:5173: bind: An attempt was made to access a socket in a way forbidden by its access permissions.`n")
  igual puerto (clasificar_salida $f) 'puerto reservado por Windows (Hyper-V o WSL)'
  [IO.File]::WriteAllText($f, "dial tcp: lookup registry-1.docker.io: i/o timeout`n")
  igual red (clasificar_salida $f) 'red cortada'
}

function prueba_clasificar_no_inventa {
  $f = Join-Path $env:USERPROFILE 'salida'
  [IO.File]::WriteAllText($f, "todo fue bien`n")
  igual '' (clasificar_salida $f) 'sin señal no hay código'
}

function prueba_frases_con_su_dato_y_sin_repetirse {
  igual $NG_FRASE['en_marcha'] (frase en_marcha) 'una frase sin %s sale tal cual'
  igual 'El puerto 5173 está ocupado. Cierra el programa que lo usa o vuelve a ejecutar el instalador, que buscará otro.' (frase puerto 5173) 'la frase lleva el dato'
  igual $NG_FRASE['inesperado'] (frase no_existe) 'un código desconocido da la genérica'
  no_contiene '%s' (frase espacio) 'sin dato, el hueco queda vacío'
}

function prueba_las_frases_se_ven_en_la_consola_de_windows_10 {
  # Pagina 850: ASCII, vocales con tilde, u con dieresis, n, ¿, ¡, «, » y · (B3).
  foreach ($c in $NG_FRASE.Keys) {
    if ($NG_FRASE[$c] -cmatch '[^\x20-\x7E\u00E1\u00E9\u00ED\u00F3\u00FA\u00C1\u00C9\u00CD\u00D3\u00DA\u00FC\u00DC\u00F1\u00D1\u00BF\u00A1\u00AB\u00BB\u00B7]') {
      throw "FALLA: la frase '$c' lleva «$($Matches[0])», que la consola de Windows 10 no muestra"
    }
  }
}

# Los codigos de fallar, frase y ejecutar_clasificado -Generico que no estan
# en el catalogo: 'archivo:linea: codigo'.
function codigos_desconocidos([string[]]$archivos) {
  $malos = @()
  foreach ($ruta in $archivos) {
    $t = $null
    $e = $null
    $a = [Management.Automation.Language.Parser]::ParseFile($ruta, [ref]$t, [ref]$e)
    foreach ($c in $a.FindAll({ param($n) $n -is [Management.Automation.Language.CommandAst] }, $true)) {
      $usados = @()
      $el = $c.CommandElements
      if ($c.GetCommandName() -in 'fallar', 'frase' -and $el.Count -gt 1) { $usados += $el[1] }
      if ($c.GetCommandName() -eq 'ejecutar_clasificado') {
        for ($i = 1; $i -lt $el.Count; $i++) {
          if ($el[$i] -is [Management.Automation.Language.CommandParameterAst] -and $el[$i].ParameterName -eq 'Generico') {
            if ($el[$i].Argument) { $usados += $el[$i].Argument } elseif ($i + 1 -lt $el.Count) { $usados += $el[$i + 1] }
          }
        }
      }
      foreach ($arg in $usados) {
        if ($arg -is [Management.Automation.Language.StringConstantExpressionAst] -and -not $NG_FRASE.ContainsKey($arg.Value)) {
          $malos += "$(Split-Path -Leaf $ruta):$($c.Extent.StartLineNumber): $($arg.Value)"
        }
      }
    }
  }
  return $malos
}

function prueba_cada_codigo_que_se_usa_existe {
  $W = Join-Path $env:NG_RAIZ 'instalacion\windows'
  $archivos = @(Get-ChildItem -LiteralPath $W -Recurse -Filter '*.ps1' | Where-Object { $_.FullName -notlike '*\pruebas\*' } | ForEach-Object { $_.FullName })
  igual '' (@(codigos_desconocidos $archivos) -join '; ') 'todo código de fallar, frase y ejecutar_clasificado -Generico está en el catálogo'
}

function prueba_la_comprobacion_de_codigos_ve_cada_forma {
  $f = Join-Path $env:USERPROFILE 'codigos.ps1'
  escribir_ps1 $f "function f {`n  fallar no_existe_1`n  frase no_existe_2`n  ejecutar_clasificado -Generico no_existe_3 -Programa docker`n  ejecutar_clasificado -Programa docker -Generico:no_existe_4`n  fallar puerto 5173`n}`n"
  igual 'codigos.ps1:2: no_existe_1; codigos.ps1:3: no_existe_2; codigos.ps1:4: no_existe_3; codigos.ps1:5: no_existe_4' (@(codigos_desconocidos @($f)) -join '; ') 'las cuatro, y el código que existe no'
}

function prueba_un_codigo_desconocido_se_anota {
  [void](con_lib 'decir (frase no_existe)')
  contiene 'Algo ha fallado de forma inesperada.' (pantalla) 'da la genérica'
  contiene 'frase: código desconocido «no_existe»' (registro) 'y se anota: es un error del instalador'
}
