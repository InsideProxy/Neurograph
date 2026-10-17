# config.env y estado.env del instalador Windows (bloque A del diseno, H11).
# Mismo formato que en Linux: CLAVE=valor, una por linea, en UTF-8 sin BOM
# y con LF (compose lee config.env con --env-file, asi que los valores no
# llevan saltos de linea). La carpeta hereda los permisos de %LOCALAPPDATA%,
# que solo son del usuario.
#
# config.env: NG_PROYECTO, NG_WEB_PUERTO, NG_API_PUERTO, NG_BIBLIOTECA,
#   NG_CONTRASENA_BASE y las marcas del volumen, NG_VOLUMEN_PROPIO y
#   NG_BASE_CARGADA (junto a la contrasena: las tres describen el volumen).
# estado.env: las claves de Linux (NG_INSTALACION, NG_TRACTOGRAFIA,
#   NG_TRACTOGRAFIA_MOTIVO, NG_TRACTO_SIN_RECURSOS, NG_IMAGENES_DESCARGADAS,
#   NG_IAS_REGISTRADAS) y las de Windows: NG_DOCKER_INSTALADO_AQUI (fecha) y
#   NG_LICENCIA_DOCKER (aceptada|rechazada y la fecha).

$NG_UTF8 = New-Object Text.UTF8Encoding($false)

function leer_valor([string]$archivo, [string]$clave) {  # -> valor (vacio si no hay)
  if (-not (Test-Path -LiteralPath $archivo -PathType Leaf)) { return '' }
  $valor = ''
  # ReadAllLines salta el BOM y parte tambien por CRLF (un archivo del Bloc de notas).
  foreach ($l in [IO.File]::ReadAllLines($archivo, $NG_UTF8)) {
    if ($l.StartsWith("$clave=", [StringComparison]::Ordinal)) { $valor = $l.Substring($clave.Length + 1) }
  }
  return $valor
}

# File.Replace (ReplaceFile de Windows); las pruebas la redefinen para
# simular sus fallos 1176 y 1177, que no se pueden provocar a voluntad.
function reemplazar_archivo([string]$nuevo, [string]$archivo, [string]$copia) { [IO.File]::Replace($nuevo, $archivo, $copia) }

# Se escribe entero en un temporal y se cambia por el original con
# File.Replace, que lo cambia de una vez y respeta el solo lectura
# (Move-Item -Force lo quitaria, y no es atomico): una escritura cortada no
# deja el archivo a medias. Siempre con copia (.anterior): si ReplaceFile
# falla a medias (1176, 1177), el original puede quedar solo con otro nombre
# o, sin copia, no quedar; nunca se borra el unico ejemplar (la contrasena
# y las marcas del volumen van aqui).
function escribir_lineas([string]$archivo, $lineas) {
  $tmp = "$archivo." + [guid]::NewGuid().ToString('N').Substring(0, 8)
  $anterior = "$archivo.anterior"
  try {
    $texto = ''
    foreach ($l in $lineas) { $texto += "$l`n" }
    [IO.File]::WriteAllText($tmp, $texto, $NG_UTF8)
    if ([IO.File]::Exists($archivo)) {
      reemplazar_archivo $tmp $archivo $anterior
      # Ya escrito: si la copia no se puede borrar, se queda (la siguiente escritura la pisa).
      try { [IO.File]::Delete($anterior) } catch { }
    } else { [IO.File]::Move($tmp, $archivo) }
  } catch {
    if (-not [IO.File]::Exists($archivo)) {
      # Primero el original (la escritura falla y lo dice); si no esta, el nuevo.
      if ([IO.File]::Exists($anterior)) { [IO.File]::Move($anterior, $archivo) }
      elseif ([IO.File]::Exists($tmp)) { [IO.File]::Move($tmp, $archivo) }
    }
    if ([IO.File]::Exists($archivo)) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
    throw
  }
}

function lineas_sin([string]$archivo, [string]$clave) {
  $r = New-Object Collections.Generic.List[string]
  if (Test-Path -LiteralPath $archivo -PathType Leaf) {
    foreach ($l in [IO.File]::ReadAllLines($archivo, $NG_UTF8)) {
      if (-not $l.StartsWith("$clave=", [StringComparison]::Ordinal)) { $r.Add($l) }
    }
  }
  return ,$r
}

function guardar_valor([string]$archivo, [string]$clave, [string]$valor) {
  if ($valor -match "[`r`n]") { throw "guardar_valor: el valor de $clave lleva un salto de linea" }
  [void](New-Item -ItemType Directory -Force -Path (Split-Path -Parent $archivo))
  $lineas = lineas_sin $archivo $clave
  $lineas.Add("$clave=$valor")
  escribir_lineas $archivo $lineas
}

function borrar_valor([string]$archivo, [string]$clave) {
  if (-not (Test-Path -LiteralPath $archivo -PathType Leaf)) { return }
  escribir_lineas $archivo (lineas_sin $archivo $clave)
}
