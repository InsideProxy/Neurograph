# Paso 9 del instalador Windows y lo que comparte con el comando diario
# (bloque A, B3, B5 y B6 del diseno, H11): archivos y comandos, bin\ en el
# PATH del usuario, los accesos del menu Inicio, las instrucciones para las
# IAs, notificaciones y cuadros de mensaje, el navegador, y la comprobacion
# y la pantalla finales. Como instalacion/linux/lib/escritorio.sh.

# El identificador de aplicacion de PowerShell, con el que Windows muestra sus notificaciones.
$NG_APP_ID = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
$NG_MENU = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\NeuroGraph'
$NG_FINAL_REGIONES = ''
$NG_FINAL_CONEXIONES = ''
$NG_CUENTA = ''

function sustituir_marcadores([string]$origen, [string]$destino) {
  $t = [IO.File]::ReadAllText($origen, $NG_UTF8)
  $t = $t.Replace('@NG_BIN_JSON@', $NG_BIN.Replace('\', '\\')).Replace('@NG_BIN@', $NG_BIN).Replace('@NG_DIR@', $NG_DIR)
  $t = $t.Replace('@NG_API_PUERTO@', (leer_valor $NG_CONFIG NG_API_PUERTO))
  [IO.File]::WriteAllText($destino, $t, $NG_UTF8)
}

# Una copia de lib\, las plantillas y el desinstalador: el comando diario
# funciona sin la carpeta del proyecto (bloque A). compose.yml lo copia el paso 6.
function instalar_archivos {
  $w = Join-Path $NG_RAIZ 'instalacion\windows'
  foreach ($d in $NG_BIN, (Join-Path $NG_DIR 'lib')) { [void](New-Item -ItemType Directory -Force -Path $d) }
  # Por la extension y con -LiteralPath: -Path tomaria los [] de la ruta por
  # comodines, y *.ps1 encajaria con x.ps1x por su nombre corto 8.3.
  foreach ($f in Get-ChildItem -LiteralPath (Join-Path $w 'lib') -File | Where-Object { $_.Extension -eq '.ps1' }) {
    Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $NG_DIR 'lib') -Force
  }
  Copy-Item -LiteralPath (Join-Path $w 'plantillas\neurograph.cmd'), (Join-Path $w 'plantillas\neurograph-mcp.cmd') -Destination $NG_BIN -Force
  Copy-Item -LiteralPath (Join-Path $w 'plantillas\neurograph.ps1'), (Join-Path $w 'desinstalar.ps1') -Destination $NG_DIR -Force
  Copy-Item -LiteralPath (Join-Path $NG_RAIZ 'frontend\src-tauri\icons\icon.ico') -Destination (Join-Path $NG_DIR 'neurograph.ico') -Force
  sustituir_marcadores (Join-Path $w 'plantillas\conectar-ia.md') (Join-Path $NG_DIR 'conectar-ia.md')
}

# bin\ al PATH del usuario, escribiendo directamente en HKCU\Environment como
# valor expandible: asi no se expanden las variables de las demas entradas,
# que es lo que haria SetEnvironmentVariable. Despues se avisa a Windows
# para que las terminales nuevas la vean (bloque A).
function clave_entorno { return (raiz_hkcu) + 'Environment' }
function path_del_usuario {  # -> el valor sin expandir ('' si no hay)
  $k = clave_entorno
  if (-not (Test-Path -LiteralPath $k)) { return '' }
  return [string](Get-Item -LiteralPath $k).GetValue('Path', '', 'DoNotExpandEnvironmentNames')
}
function avisar_cambio_de_entorno {
  try { [NeuroGraph.Entorno]::Avisar() } catch { registrar "aviso del cambio de entorno: $($_.Exception.Message)" }
}
function anadir_al_path {
  $actual = path_del_usuario
  if (@($actual -split ';') -contains $NG_BIN) { return }
  $nuevo = if ($actual) { $actual.TrimEnd(';') + ";$NG_BIN" } else { $NG_BIN }
  $k = clave_entorno
  if (-not (Test-Path -LiteralPath $k)) { [void](New-Item -Path $k -Force) }
  Set-ItemProperty -LiteralPath $k -Name Path -Value $nuevo -Type ExpandString
  registrar "PATH del usuario: con $NG_BIN"
  avisar_cambio_de_entorno
}
function quitar_del_path {
  $actual = path_del_usuario
  $todas = @($actual -split ';' | Where-Object { $_ })
  $resto = @($todas | Where-Object { $_ -ne $NG_BIN })
  if ($resto.Count -eq $todas.Count) { return }
  Set-ItemProperty -LiteralPath (clave_entorno) -Name Path -Value ($resto -join ';') -Type ExpandString
  avisar_cambio_de_entorno
}

# Accesos del menu Inicio (B3): conhost.exe --headless lanza PowerShell sin
# ninguna ventana; -WindowStyle Hidden, por si alguna version de Windows no lo
# admite (dejaria ver un parpadeo). Se comprueba en Windows 10 y 11 (Tareas
# 23 y 25). Nunca VBScript, que Microsoft esta retirando.
function crear_acceso([string]$nombre, [string]$orden, [string]$descripcion) {
  $a = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $NG_MENU "$nombre.lnk"))
  $a.TargetPath = Join-Path $env:SystemRoot 'System32\conhost.exe'
  $a.Arguments = '--headless powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $NG_DIR 'neurograph.ps1') + "`" $orden --escritorio"
  $a.WorkingDirectory = $env:USERPROFILE
  $a.IconLocation = (Join-Path $NG_DIR 'neurograph.ico') + ',0'
  $a.Description = $descripcion
  $a.Save()
}
function instalar_accesos {
  [void](New-Item -ItemType Directory -Force -Path $NG_MENU)
  crear_acceso 'NeuroGraph' 'abrir' 'Abre NeuroGraph en el navegador'
  crear_acceso 'Apagar NeuroGraph' 'apagar' 'Apaga NeuroGraph (los datos se conservan)'
}

function paso_escritorio {
  instalar_archivos
  anadir_al_path
  instalar_accesos
  conectar_ias
  $script:NG_RESUMEN = "accesos y comandos listos · IAs: $($script:NG_IAS_RESUMEN)"
  # Las terminales abiertas antes del cambio no ven el PATH nuevo.
  if (@($env:PATH -split ';') -notcontains $NG_BIN) {
    avisar "El comando «neurograph» funciona en las terminales que abras a partir de ahora; en las que ya estaban abiertas, usa la ruta completa: $(Join-Path $NG_BIN 'neurograph.cmd')."
  }
}

# Desde un acceso no hay consola: el progreso va como notificacion de Windows
# (si se puede) y un fallo como cuadro de mensaje, que el modo «No molestar»
# no silencia (B3). En las pruebas se anotan en el registro.
function notificar([string]$texto) {
  registrar "[notificacion] $texto"
  if (-not $script:NG_MODO_ESCRITORIO -or $env:NEUROGRAPH_PRUEBA_SOLO_SIMULADOS) { return }
  try {
    [void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
    $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $t = $xml.GetElementsByTagName('text')
    [void]$t.Item(0).AppendChild($xml.CreateTextNode('NeuroGraph'))
    [void]$t.Item(1).AppendChild($xml.CreateTextNode($texto))
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($NG_APP_ID).Show([Windows.UI.Notifications.ToastNotification]::new($xml))
  } catch { registrar "notificación no mostrada: $($_.Exception.Message)" }
}

function notificar_fallo {
  $texto = if ($script:NG_ULTIMA_FRASE) { $script:NG_ULTIMA_FRASE } else { frase inesperado }
  registrar "[cuadro de mensaje] $texto"
  if ($env:NEUROGRAPH_PRUEBA_SOLO_SIMULADOS) { return }
  try {
    Add-Type -AssemblyName System.Windows.Forms
    $r = [Windows.Forms.MessageBox]::Show("$texto`n`n¿Abrir el registro?", 'NeuroGraph', 'YesNo', 'Error')
    if ("$r" -eq 'Yes') { lanzar_aplicacion (Join-Path $env:SystemRoot 'System32\notepad.exe') ('"' + $script:NG_REGISTRO + '"') }
  } catch { registrar "cuadro de mensaje no mostrado: $($_.Exception.Message)" }
}

function mostrar_avisos {  # los avisos guardados, en pantalla (y como notificacion), y se vacian
  if (-not (Test-Path -LiteralPath $NG_AVISOS_ARCHIVO)) { return }
  foreach ($a in [IO.File]::ReadAllLines($NG_AVISOS_ARCHIVO, $NG_UTF8)) {
    if ($a) { decir "  ! $a"; notificar $a }
  }
  Remove-Item -LiteralPath $NG_AVISOS_ARCHIVO -Force
}

function abrir_navegador {
  $url = "http://127.0.0.1:$(leer_valor $NG_CONFIG NG_WEB_PUERTO)"
  decir "NeuroGraph: $url"
  lanzar_aplicacion $url
}

# Por separado la respuesta y su lectura: que la API no responda y que no de
# JSON son fallos distintos. Se cuenta con el Python del contenedor de la API,
# como en Linux. El archivo se crea antes, como mktemp en Linux: la entrada
# de docker exec es siempre un archivo que existe.
function contar_api([string]$ruta) {  # -> NG_CUENTA: elementos de la lista JSON
  $f = Join-Path $env:TEMP ('neurograph-api-' + [guid]::NewGuid().ToString('N') + '.json')
  try {
    [IO.File]::WriteAllText($f, '')
    if ((ejecutar_programa curl @('-sf', '-o', $f, "http://127.0.0.1:$(leer_valor $NG_CONFIG NG_API_PUERTO)$ruta") -TiempoMax 120).Codigo -ne 0) { fallar api "no responde en $ruta" }
    $c = ejecutar_programa docker @('exec', '-i', "$NG_PROYECTO-api", 'python', '-c', 'import json,sys; print(len(json.load(sys.stdin)))') -EntradaArchivo $f -Capturar -TiempoMax 120
    if ($c.Codigo -ne 0) { fallar api "$ruta no devuelve una lista JSON" }
    $script:NG_CUENTA = ($c.Salida -join '').Trim()
  } finally { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue }
}

function comprobacion_final {
  $web = leer_valor $NG_CONFIG NG_WEB_PUERTO
  $r = ejecutar_programa curl @('-sf', "http://127.0.0.1:$web/") -Capturar -TiempoMax 60
  if ($r.Codigo -ne 0 -or -not (($r.Salida -join "`n").Contains('id="root"'))) { fallar web "http://127.0.0.1:$web" }
  comprobar_mcp
  if ($script:NG_MCP_HERRAMIENTAS -ne $NG_ESPERADO_HERRAMIENTAS_MCP) {
    fallar mcp "lista $($script:NG_MCP_HERRAMIENTAS) herramientas y se esperaban $NG_ESPERADO_HERRAMIENTAS_MCP"
  }
  contar_api '/regions'
  $script:NG_FINAL_REGIONES = $script:NG_CUENTA
  contar_api '/connections'
  $script:NG_FINAL_CONEXIONES = $script:NG_CUENTA
  if ($script:NG_SALTAR_CARGA) {
    if ([int]("0" + $script:NG_FINAL_REGIONES) -le 0) { fallar api 'no devuelve regiones' }
    if (-not (comprobar_recuentos $NG_ESPERADO_HUERFANAS)) { fallar recuentos_base $script:NG_RECUENTO_FALLIDO }
  } elseif ($script:NG_FINAL_REGIONES -ne $NG_ESPERADO_REGIONES -or $script:NG_FINAL_CONEXIONES -ne $NG_ESPERADO_CONEXIONES) {
    fallar api "da $($script:NG_FINAL_REGIONES) regiones y $($script:NG_FINAL_CONEXIONES) conexiones; se esperaban $NG_ESPERADO_REGIONES y $NG_ESPERADO_CONEXIONES"
  }
}

function pantalla_final {
  $web = leer_valor $NG_CONFIG NG_WEB_PUERTO
  $motivo = leer_valor $NG_ESTADO NG_TRACTOGRAFIA_MOTIVO
  switch (leer_valor $NG_ESTADO NG_TRACTOGRAFIA) {
    'instalada' { $n = $NG_ESPERADO_TRACTOGRAFIA -split ' '; $tracto = "tractografía: $($n[0]) tractos, $($n[1]) nodos" }
    'ficha_en_conflicto' { $tracto = "tractografía: cargada, pero $(primera_minuscula $motivo)" }
    default {
      $tracto = "tractografía: pendiente - $(if ($motivo) { $motivo } else { 'sin motivo' })"
      # Como repetirla, solo si el motivo no lo dice ya (B6).
      if (-not $tracto.Contains('neurograph tractografia')) {
        if ($tracto.EndsWith('.')) { $tracto += ' Repite con: neurograph tractografia' } else { $tracto += '; repite con: neurograph tractografia' }
      }
    }
  }
  decir ''
  decir 'NeuroGraph está instalado y encendido.'
  decir "  Abrir:    acceso «NeuroGraph» del menú Inicio o  neurograph abrir  ->  http://127.0.0.1:$web"
  decir '  Apagar:   acceso «Apagar NeuroGraph» o  neurograph apagar'
  decir "  Datos:    $($script:NG_FINAL_REGIONES) regiones · $($script:NG_FINAL_CONEXIONES) conexiones · $tracto"
  decir "  IAs:      $($script:NG_IAS_RESUMEN)"
  decir '            (las IAs solo ven NeuroGraph mientras está encendido)'
  if ((Test-Path -LiteralPath $NG_AVISOS_ARCHIVO) -and (Get-Item -LiteralPath $NG_AVISOS_ARCHIVO).Length -gt 0) { decir '  Avisos:'; mostrar_avisos }
  decir "  Ayuda:    $(Join-Path $NG_DIR 'conectar-ia.md') · registro: $($script:NG_REGISTRO)"
}
