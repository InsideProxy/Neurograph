# Pruebas de escritorio.ps1 (paso 9, bloque A, B3 y B6 del diseno, H11).
$LIBS = @('sistema', 'docker', 'puertos', 'imagenes', 'base', 'tractografia', 'mcp', 'ias', 'escritorio')
$ENTORNO = Join-Path $env:NEUROGRAPH_PRUEBA_HKCU 'Environment'

function prueba_los_archivos_y_las_instrucciones_con_las_rutas_reales {
  config_con "NG_API_PUERTO=8421`n"
  igual 0 (con_lib "`$script:NG_RAIZ = '$env:NG_RAIZ'; instalar_archivos" $LIBS) 'sale con 0'
  $d = Join-Path $env:LOCALAPPDATA 'neurograph-app'
  foreach ($f in 'bin\neurograph.cmd', 'bin\neurograph-mcp.cmd', 'neurograph.ps1', 'desinstalar.ps1', 'lib\comun.ps1', 'lib\escritorio.ps1', 'neurograph.ico') {
    igual $true (Test-Path -LiteralPath (Join-Path $d $f)) "instalado: $f"
  }
  $t = [IO.File]::ReadAllText((Join-Path $d 'conectar-ia.md'))
  contiene "cmd.exe /c `"$d\bin\neurograph-mcp.cmd`"" $t 'la ruta del conector'
  contiene ($d.Replace('\', '\\') + '\\bin\\neurograph-mcp.cmd') $t 'y en JSON, con las barras escapadas'
  contiene '127.0.0.1:8421/render' $t 'el puerto real de la API'
  no_contiene '@NG_' $t 'sin marcadores sin sustituir'
}

# lib\*.ps1 con -Path tomaria [] de la ruta por comodines y encajaria con
# x.ps1x por su nombre corto 8.3: se copian por la extension.
function prueba_se_copian_los_ps1_de_lib_con_corchetes_en_la_ruta {
  $r = Join-Path $env:USERPROFILE 'proyecto [1]'
  foreach ($d in 'instalacion', 'frontend\src-tauri\icons') { [void][IO.Directory]::CreateDirectory((Join-Path $r $d)) }
  Copy-Item -LiteralPath (Join-Path $env:NG_RAIZ 'instalacion\windows') -Destination (Join-Path $r 'instalacion\windows') -Recurse
  Copy-Item -LiteralPath (Join-Path $env:NG_RAIZ 'frontend\src-tauri\icons\icon.ico') -Destination (Join-Path $r 'frontend\src-tauri\icons\icon.ico')
  [IO.File]::WriteAllText((Join-Path $r 'instalacion\windows\lib\otra.ps1x'), 'no es un .ps1')
  igual 0 (con_lib "`$script:NG_RAIZ = '$r'; instalar_archivos" $LIBS) 'sale con 0'
  $lib = Join-Path $env:LOCALAPPDATA 'neurograph-app\lib'
  igual $true (Test-Path -LiteralPath (Join-Path $lib 'comun.ps1')) 'los .ps1, copiados'
  igual $false (Test-Path -LiteralPath (Join-Path $lib 'otra.ps1x')) 'y solo ellos'
}

function prueba_el_path_del_usuario_gana_bin_sin_expandir_lo_demas {
  [void](New-Item -Path $ENTORNO -Force)
  New-ItemProperty -LiteralPath $ENTORNO -Name Path -Value '%USERPROFILE%\herramientas;C:\otra' -PropertyType ExpandString | Out-Null
  [void](con_lib 'anadir_al_path; anadir_al_path' $LIBS)
  $bin = Join-Path $env:LOCALAPPDATA 'neurograph-app\bin'
  $k = Get-Item -LiteralPath $ENTORNO
  igual "%USERPROFILE%\herramientas;C:\otra;$bin" $k.GetValue('Path', '', 'DoNotExpandEnvironmentNames') 'las demás sin expandir, y bin una sola vez'
  igual 'ExpandString' $k.GetValueKind('Path') 'sigue siendo expandible'
  [void](con_lib 'quitar_del_path' $LIBS)
  igual '%USERPROFILE%\herramientas;C:\otra' (Get-Item -LiteralPath $ENTORNO).GetValue('Path', '', 'DoNotExpandEnvironmentNames') 'al quitarla, como estaba'
}

function prueba_sin_path_del_usuario_se_crea {
  [void](con_lib 'anadir_al_path' $LIBS)
  igual (Join-Path $env:LOCALAPPDATA 'neurograph-app\bin') (Get-Item -LiteralPath $ENTORNO).GetValue('Path', '', 'DoNotExpandEnvironmentNames') 'solo bin'
}

function prueba_los_accesos_del_menu_inicio_sin_ventana {
  [void](con_lib 'instalar_accesos' $LIBS)
  $menu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\NeuroGraph'
  $shell = New-Object -ComObject WScript.Shell
  foreach ($caso in @('NeuroGraph|abrir', 'Apagar NeuroGraph|apagar')) {
    $nombre, $orden = $caso -split '\|'
    $a = $shell.CreateShortcut((Join-Path $menu "$nombre.lnk"))
    contiene 'conhost.exe' $a.TargetPath "${nombre}: con conhost"
    contiene '--headless powershell.exe' $a.Arguments "${nombre}: sin ventana"
    contiene ("`"$env:LOCALAPPDATA\neurograph-app\neurograph.ps1`" $orden --escritorio") $a.Arguments "${nombre}: la orden, desde el acceso"
  }
}

# Docker, curl y MCP de una instalacion que responde bien.
function todo_responde([string]$web = '<div id="root"></div>') {
  config_con "NG_WEB_PUERTO=5173`nNG_API_PUERTO=8420`n"
  simular_tabla docker @('[%NG_PRUEBA_CAJA%\contada]exec -i neurograph-app-api python|0||104115', 'exec -i neurograph-app-api python|0|marca:%NG_PRUEBA_CAJA%\contada|1172', '*|0||')
  simular_tabla curl @("-sf http://127.0.0.1:5173/|0||$web", '*|0||')
  return (mcp_falso '12')
}

function prueba_la_comprobacion_final_y_la_pantalla_final {
  $e = todo_responde
  estado_con "NG_TRACTOGRAFIA=instalada`n"
  igual 0 (con_lib 'comprobacion_final; $script:NG_IAS_RESUMEN = "Claude Code: conectado"; pantalla_final' $LIBS -Entorno $e) 'sale con 0'
  contiene 'NeuroGraph está instalado y encendido.' (pantalla) 'el título'
  contiene '1172 regiones · 104115 conexiones · tractografía: 41 tractos, 176 nodos' (pantalla) 'los datos, de la API'
  contiene 'neurograph abrir  ->  http://127.0.0.1:5173' (pantalla) 'cómo abrirlo'
  contiene 'IAs:      Claude Code: conectado' (pantalla) 'las IAs'
}

function prueba_la_comprobacion_final_para_si_algo_no_responde {
  $e = todo_responde '<html>otra cosa</html>'
  igual 1 (con_lib 'comprobacion_final' $LIBS -Entorno $e) 'una web sin la aplicación'
  contiene 'La web no responde en http://127.0.0.1:5173' (pantalla) 'su frase'
  $e = todo_responde
  igual 1 (con_lib '$script:NG_ESPERADO_HERRAMIENTAS_MCP = "13"; comprobacion_final' $LIBS -Entorno $e) 'otro número de herramientas'
  contiene 'lista 12 herramientas y se esperaban 13' (pantalla) 'su frase'
}

function prueba_la_pantalla_final_con_la_tractografia_pendiente {
  estado_con "NG_TRACTOGRAFIA=pendiente`nNG_TRACTOGRAFIA_MOTIVO=memoria insuficiente (hacen falta 4096 MB libres y hay 3000 MB)`n"
  [void](con_lib 'avisar "un aviso"; pantalla_final' $LIBS)
  contiene 'tractografía: pendiente - memoria insuficiente (hacen falta 4096 MB libres y hay 3000 MB); repite con: neurograph tractografia' (pantalla) 'dice cómo repetirla'
  contiene '  ! un aviso' (pantalla) 'y los avisos, con marca ASCII'
}
