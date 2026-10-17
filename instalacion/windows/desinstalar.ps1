# Desinstalador de NeuroGraph para Windows (B7 del diseno, H11). Lo lanza
# «neurograph desinstalar» desde una copia temporal, para poder borrar bin\,
# lib\ y el comando diario. Por defecto conserva los datos: el volumen de la
# base, config.env (con la contrasena y la marca NG_BASE_CARGADA, sin las que
# una reinstalacion no podria usar el volumen), los registros y la
# biblioteca. Con --borrar-datos borra tambien el volumen y config.env, tras
# escribir BORRAR. La biblioteca nunca se borra sola (principio 15). Docker
# Desktop y WSL2 se quedan. Como instalacion/linux/desinstalar.sh.
# Uso: neurograph desinstalar [--borrar-datos]
$ErrorActionPreference = 'Stop'
foreach ($l in 'comun', 'sistema', 'docker', 'puertos', 'imagenes', 'base', 'tractografia', 'mcp', 'ias', 'escritorio') {
  . (Join-Path $PSScriptRoot "lib\$l.ps1")
}
$NG_REPETIR = 'el desinstalador'
$guardado = leer_valor $NG_CONFIG NG_PROYECTO
if ($guardado) { $NG_PROYECTO = $guardado }
$borrar_datos = $false
if ($args.Count -gt 0) {
  if ($args.Count -eq 1 -and $args[0] -ceq '--borrar-datos') { $borrar_datos = $true }
  else { Write-Host 'Uso: neurograph desinstalar [--borrar-datos]'; exit 1 }
}
# Con Docker Desktop cerrado, el desinstalador se queda en su carpeta para repetirlo.
$repetir = 'powershell -ExecutionPolicy Bypass -File "' + (Join-Path $NG_DIR 'desinstalar.ps1') + '"'

function tamano_de([string]$d) {
  $b = (Get-ChildItem -LiteralPath $d -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  return "$([int]($b / 1MB)) MB"
}

ejecutar_principal 'desinstalar' {
  tomar_bloqueo
  # Con Docker Desktop cerrado, se desinstala lo demas y se conservan el
  # desinstalador, lib\ y estado.env (con las imagenes descargadas), para
  # quitar despues lo de Docker: no se para todo por eso (B7).
  $dd = docker_desktop_instalado
  if ($dd) { usar_docker_del_path $dd }
  $hay_docker = $false
  $docker_pendiente = $false
  $sin_docker = ''
  if (-not (resolver_programa docker)) { $sin_docker = 'Docker Desktop no está instalado' }
  elseif (docker_responde) { $hay_docker = $true }
  else { $docker_pendiente = $true; $sin_docker = 'Docker Desktop no está en marcha (ábrelo desde el menú Inicio)' }
  $bib = leer_valor $NG_CONFIG NG_BIBLIOTECA
  $vol = "$NG_PROYECTO-datos"

  if ($borrar_datos) {
    # Sin Docker no se puede borrar ni comprobar el volumen: se para antes de preguntar (B7).
    if (-not $hay_docker) { fallar borrar_sin_docker $sin_docker }
    decir "Se desinstalará NeuroGraph y se borrará su base de datos. La biblioteca ($(if ($bib) { $bib } else { '%USERPROFILE%\NeuroData' })) no se toca."
    if ((pedir_texto 'Escribe BORRAR para confirmarlo:') -cne 'BORRAR') { decir 'No se ha borrado nada.'; return }
  } else {
    if ($docker_pendiente) { decir "${sin_docker}: se desinstala lo demás, pero los contenedores y las imágenes de NeuroGraph quedan en Docker." }
    if (-not (preguntar_si '¿Desinstalar NeuroGraph? Tus datos se conservan.' 'n')) { decir 'No se ha desinstalado nada.'; return }
  }

  $base_borrada = $false
  $en_uso = @()
  if ($hay_docker) {
    [void](ejecutar_programa docker @('rm', '-f', "$NG_PROYECTO-postgres", "$NG_PROYECTO-api", "$NG_PROYECTO-web", "$NG_PROYECTO-tractografia", "$NG_PROYECTO-carga") -Capturar)
    foreach ($i in "$NG_PROYECTO-herramientas", "$NG_PROYECTO-web", "$NG_PROYECTO-api") { [void](ejecutar_programa docker @('rmi', $i) -Capturar) }
    foreach ($i in @((leer_valor $NG_ESTADO NG_IMAGENES_DESCARGADAS) -split ' ' | Where-Object { $_ })) {
      if (docker_valor @('ps', '-a', '--filter', "ancestor=$i", '-q')) { registrar "imagen $i en uso por otro contenedor: se conserva"; $en_uso += $i }
      else { [void](ejecutar_programa docker @('rmi', $i) -Capturar) }
    }
    [void](ejecutar_programa docker @('network', 'rm', "${NG_PROYECTO}_default") -Capturar)
    if ($borrar_datos) {
      [void](ejecutar_programa docker @('volume', 'rm', $vol))
      # Solo se da por borrado si ya no esta en la lista: un volume rm fallido
      # no se oculta, y config.env se conserva con su contrasena (B7).
      $r = ejecutar_programa docker @('volume', 'ls', '-q') -Capturar
      if ($r.Codigo -eq 0 -and $r.Salida -cnotcontains $vol) { $base_borrada = $true }
    }
  }
  foreach ($ia in @((leer_valor $NG_ESTADO NG_IAS_REGISTRADAS) -split ' ' | Where-Object { $_ })) { quitar_ia $ia }
  # Ya quitadas: si estado.env se conserva para repetir, no se vuelven a quitar.
  borrar_valor $NG_ESTADO NG_IAS_REGISTRADAS
  quitar_del_path
  $quitar = @($NG_BIN, $NG_MENU, (Join-Path $NG_DIR 'descargas'))
  foreach ($f in 'compose.yml', 'conectar-ia.md', 'neurograph.ico', 'neurograph.ps1', '.avisos') { $quitar += Join-Path $NG_DIR $f }
  # Un reinicio del paso 2 que no llego a hacerse.
  $runonce = (raiz_hkcu) + 'Software\Microsoft\Windows\CurrentVersion\RunOnce'
  if (Test-Path -LiteralPath $runonce) { Remove-ItemProperty -LiteralPath $runonce -Name NeuroGraph -ErrorAction SilentlyContinue }
  # Si queda algo por quitar en Docker, el desinstalador se queda para repetirlo (B7).
  if (-not $docker_pendiente -and (-not $borrar_datos -or $base_borrada)) {
    $quitar += (Join-Path $NG_DIR 'lib'), $NG_ESTADO, (Join-Path $NG_DIR 'desinstalar.ps1')
  }
  foreach ($q in $quitar) { Remove-Item -LiteralPath $q -Recurse -Force -ErrorAction SilentlyContinue }
  # Lo que no se pudo quitar (un archivo abierto en otro programa) se dice,
  # no se da por quitado en silencio (B7).
  $quedan = @($quitar | Where-Object { Test-Path -LiteralPath $_ })

  decir 'NeuroGraph desinstalado.'
  if ($quedan.Count -gt 0) {
    registrar "no se pudo quitar: $($quedan -join ', ')"
    decir "No se pudo quitar: $($quedan -join ', '). Si está abierto en otro programa, ciérralo y bórralo a mano."
  }
  if ($base_borrada) { Remove-Item -LiteralPath $NG_CONFIG -Force; decir 'La base de datos se ha borrado.' }
  decir 'Se conservan:'
  if (-not $base_borrada) {
    $tam = ''
    if ($hay_docker) {
      foreach ($l in ((docker_valor @('system', 'df', '-v')) -split "`n")) {
        if ($l -match "^$([regex]::Escape($vol))\s") { $tam = ', ' + ($l -split '\s+')[-1] }
      }
    }
    decir "  la base de datos (volumen $vol$tam) y su configuración: si reinstalas, se recuperan;"
  }
  foreach ($i in $en_uso) { decir "  la imagen $i, que usa otro contenedor;" }
  if ($bib -and (Test-Path -LiteralPath $bib)) { decir "  la biblioteca $bib ($(tamano_de $bib)): no se borra sola; si no la quieres, bórrala a mano;" }
  if ($hay_docker) {
    $cache = ((docker_valor @('system', 'df', '--format', '{{.Type}} {{.Size}}')) -split "`n" | Where-Object { $_ -like 'Build Cache *' }) -replace '^Build Cache ', ''
    decir "  la caché de construcción de Docker ($cache): es común a todos los proyectos (docker builder prune);"
  }
  decir "  los registros, en $(Join-Path $NG_DIR 'registro');"
  decir '  Docker Desktop y WSL2, que se quitan aparte, desde Configuración > Aplicaciones, si no los usas para nada más.'
  if ($hay_docker) { decir 'El espacio de las imágenes no vuelve a Windows al borrarlas: el disco virtual de Docker no encoge solo.' }
  if ($docker_pendiente) { decir "Para quitar lo que queda en Docker, abre Docker Desktop y vuelve a ejecutar: $repetir" }
  if ($borrar_datos -and -not $base_borrada) { fallar base_no_borrada $vol $repetir }
}
exit $NG_CODIGO_SALIDA
