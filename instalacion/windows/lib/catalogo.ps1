# Catalogo de fallos conocidos del instalador Windows (B1 del diseno, H11).
# Cada fallo tiene una frase para la persona: que ha pasado y que hacer. Las
# iguales a las de Linux se copian; las que dicen que hacer en cada sistema
# son propias. Solo caracteres de la pagina 850 (ASCII, tildes, ü, ñ, ¿, ¡,
# «, », ·): la consola clasica de Windows 10 no muestra mas (B3). Las senales
# de los scripts reutilizados se buscan en su salida; prueba_catalogo.ps1
# comprueba que siguen en los scripts. fallar esta en comun.ps1.

$NG_FRASE = @{
  conexion = 'No hay conexión con %s. Comprueba internet; en una red de empresa o universidad, puede que un cortafuegos lo bloquee.'
  red = 'Se cortó la conexión mientras se descargaba algo (Docker Hub o un repositorio de paquetes). Comprueba internet y vuelve a ejecutar el instalador.'
  programa = 'Falta el programa «%s». Vuelve a ejecutar el instalador; si se repite, envía el registro.'
  espacio = 'No hay espacio suficiente %s. Libera espacio y vuelve a ejecutar el instalador.'
  espacio_script = 'No hay espacio suficiente para la tractografía (%s). Libera espacio y repite con: neurograph tractografia'
  memoria_base = 'Hace falta al menos %s de memoria libre para NeuroGraph. Cierra otros programas y vuelve a ejecutar el instalador.'
  ram_instalada = 'Este ordenador tiene %s de memoria instalada, y Docker Desktop necesita al menos 8 GB.'
  memoria = 'Faltó memoria al generar la tractografía. Cierra otros programas y repite con: neurograph tractografia'
  md5 = 'Un archivo de Zenodo llegó dañado y se ha borrado (%s). Repite con: neurograph tractografia y se descargará de nuevo.'
  descarga = 'No se pudo descargar un archivo de Zenodo (%s). Comprueba internet y repite con: neurograph tractografia; la descarga sigue donde se quedó.'
  recuentos = 'El SQL de la tractografía no da los recuentos esperados y no se ha cargado (%s). Repite con: neurograph tractografia; si vuelve a pasar, envía el registro.'
  python = 'No se pudieron instalar las dependencias de Python desde PyPI (%s). Comprueba internet y repite con: neurograph tractografia'
  ficha = 'Un archivo de la biblioteca no cuadra con su ficha (%s). No se ha tocado nada: revisa ese archivo.'
  biblioteca_ajena = 'La carpeta %s no parece una biblioteca de NeuroGraph y no está vacía. Elige otra con: instalacion\windows\instalar.cmd --biblioteca RUTA'
  biblioteca_ruta = 'La ruta de la biblioteca (%s) lleva un carácter que Windows no admite en una ruta, o una coma, unas comillas dobles, un salto de línea o «: », que Docker no admite al montar una carpeta o que cortarían la ruta en los mensajes. Elige otra con: instalacion\windows\instalar.cmd --biblioteca RUTA'
  biblioteca_red = 'La biblioteca (%s) está en una unidad de red, que Docker Desktop no puede usar. Elige una carpeta de este ordenador o de un disco conectado a él: instalacion\windows\instalar.cmd --biblioteca RUTA'
  biblioteca_sin_permiso = 'No se puede leer o escribir en la carpeta %s (¿es un disco desconectado?). Conéctalo, o elige otra con: instalacion\windows\instalar.cmd --biblioteca RUTA'
  biblioteca_sin_elegir = 'No has elegido ninguna carpeta para la biblioteca. Vuelve a ejecutar el instalador y acepta la que propone o elige otra.'
  biblioteca_no_visible = 'Docker Desktop no ve la carpeta de la biblioteca (%s). Si es un disco externo conectado después de abrir Docker Desktop, reinicia Docker Desktop y repite con: neurograph tractografia'
  memoria_docker = 'la tractografía necesita %s libres dentro de Docker y hay %s (Docker tiene %s en total). Para darle más, añade una línea «memory=%sGB» en la sección [wsl2] de %s (ver %s), reinicia Docker Desktop y repite con: neurograph tractografia'
  memoria_docker_no_cabe = 'la tractografía necesita %s libres dentro de Docker y hay %s (Docker tiene %s en total). Este ordenador tiene %s de memoria: no se le puede dar más a Docker sin dejar a Windows sin la que necesita.'
  carga = 'Falló la carga de los datos iniciales en %s. Vuelve a ejecutar el instalador; si se repite, envía el registro.'
  recuentos_base = 'Los datos cargados no dan los recuentos esperados (%s). Envía el registro.'
  volumen_desconocido = 'Ya hay una base de datos de NeuroGraph que no se sabe de dónde viene y no está completa. No se ha tocado. Si no la quieres, bórrala con: docker volume rm %s'
  puerto = 'El puerto %s está ocupado. Cierra el programa que lo usa o vuelve a ejecutar el instalador, que buscará otro.'
  sin_puerto = 'No hay ningún puerto libre cerca del %s. Cierra algún programa que use puertos y vuelve a intentarlo.'
  espera = '%s no arrancó a tiempo. Vuelve a intentarlo; si se repite, envía el registro.'
  encender = 'No se pudo encender %s. Vuelve a intentarlo; si se repite, envía el registro.'
  docker_parado = 'Docker Desktop no está en marcha y no se pudo arrancar. Ábrelo desde el menú Inicio, espera a que diga que está listo y vuelve a intentarlo.'
  docker_no_arranca = 'Docker Desktop no arrancó en %s. Ábrelo desde el menú Inicio; si enseña un error, resuélvelo allí y vuelve a ejecutar el instalador.'
  docker_incompatible = '%s'
  imagenes = 'Faltan las imágenes de NeuroGraph (quizá por un «docker system prune»). Vuelve a ejecutar instalacion\windows\instalar.cmd desde la carpeta del proyecto.'
  construccion = 'Falló la preparación de %s. Vuelve a ejecutar el instalador; si se repite, envía el registro.'
  tracto_en_marcha = 'Ya hay una instalación de la tractografía en marcha. Espera a que termine.'
  en_marcha = 'Ya hay otro instalador, desinstalador o tractografía de NeuroGraph en marcha. Espera a que termine.'
  borrar_sin_docker = 'No se puede borrar la base de datos: %s. No se ha tocado nada.'
  base_no_borrada = 'La base de datos no se ha borrado: Docker no pudo quitar el volumen %s (el motivo está en el registro). Se conserva su configuración; para volver a intentarlo: %s --borrar-datos'
  estado = 'No se pudo guardar el estado de NeuroGraph en %s (¿falta espacio en el disco?). Vuelve a intentarlo; si se repite, envía el registro.'
  mcp = 'El conector MCP no responde como se esperaba (%s). Envía el registro.'
  web = 'La web no responde en %s. Vuelve a intentarlo con «neurograph abrir»; si se repite, envía el registro.'
  api = 'La API no da los datos esperados (%s). Envía el registro.'
  windows_no_admitido = 'Esta versión de Windows (%s) no es compatible con Docker Desktop: hace falta Windows 10 22H2 (compilación 19045) o Windows 11 23H2 (compilación 22631) o posterior, de 64 bits y con procesador Intel o AMD. Actualiza Windows y vuelve a ejecutar el instalador.'
  virtualizacion = 'La virtualización está desactivada en este ordenador, y Docker Desktop la necesita. Actívala en la configuración del firmware (BIOS o UEFI; suele llamarse «Intel VT-x», «AMD-V» o «SVM») y vuelve a ejecutar el instalador.'
  lanmanserver = 'Docker Desktop necesita que el servicio «Servidor» (LanmanServer) arranque solo, y su tipo de inicio es «%s». Ábrelo en «Servicios», pon su tipo de inicio en «Automático» y vuelve a ejecutar el instalador.'
  cuenta_ruta = 'La carpeta de tu cuenta de Windows (%s) lleva «%» o «!», que la consola de Windows interpreta: el conector de las IAs no funcionaría. NeuroGraph no se puede instalar en esta cuenta; usa otra cuyo nombre no los lleve.'
  proyecto_red = 'La carpeta del proyecto (%s) está en una unidad de red, que Docker Desktop no puede montar. Copia la carpeta de NeuroGraph a este ordenador (por ejemplo, a Documentos) y vuelve a ejecutar el instalador desde allí.'
  proyecto_ruta = 'La carpeta del proyecto (%s) lleva una coma o unas comillas dobles, que Docker no admite al montar una carpeta. Mueve la carpeta de NeuroGraph a otra ruta y vuelve a ejecutar el instalador desde allí.'
  crlf = 'Algunos archivos de datos del proyecto tienen saltos de línea de Windows (por ejemplo, %s), y la carga de datos fallaría. Descarga el proyecto como ZIP desde GitHub, o clónalo con «git clone --config core.autocrlf=false», y vuelve a ejecutar el instalador.'
  proyecto_incompleto = 'Falta %s en la carpeta del proyecto. Vuelve a descargarlo entero y ejecuta otra vez el instalador.'
  licencia_no = 'Sin aceptar las condiciones de Docker Desktop no se puede instalar. Si cambias de idea, vuelve a ejecutar el instalador.'
  uac_denegado = 'Windows no ha dado permiso de administrador, y hace falta para instalar WSL2 y Docker Desktop. Vuelve a ejecutar el instalador y responde «Sí» cuando Windows lo pida; si tu cuenta no es de administrador, pide ayuda a quien lo sea.'
  descarga_docker = 'No se pudo descargar Docker Desktop de desktop.docker.com. Comprueba internet y vuelve a ejecutar el instalador; la descarga sigue donde se quedó.'
  firma_docker = 'El instalador de Docker Desktop descargado no lleva la firma de Docker Inc. y no se ha ejecutado. Se ha borrado: vuelve a ejecutar el instalador para descargarlo de nuevo; si se repite, envía el registro.'
  instalacion_docker = 'Falló la instalación de Docker Desktop. Vuelve a ejecutar el instalador; si se repite, envía el registro.'
  wsl_activar = 'No se pudo activar WSL2, que Docker Desktop necesita. Vuelve a ejecutar el instalador; si se repite, envía el registro.'
  wsl_actualizar = 'No se pudo actualizar WSL2 a la versión que necesita Docker Desktop (2.1.5 o posterior). Comprueba que llegas a github.com y vuelve a ejecutar el instalador.'
  reinicio_pendiente = 'Falta reiniciar Windows para terminar de activar WSL2 o una actualización. Reinicia y vuelve a ejecutar el instalador.'
  inesperado = 'Algo ha fallado de forma inesperada.'
}

# Senales en la salida de scripts/install_tractography.sh y
# scripts/rebuild_db_from_sql.sh (sin distinguir mayusculas). Sus lineas de
# fallo terminan en ": dato", que es lo que se muestra.
$NG_SENAL_SCRIPT = @{
  md5 = 'el md5 no coincide'
  descarga = 'no se pudo descargar'
  recuentos = 'los recuentos no coinciden'
  python = 'no se pudieron instalar las dependencias de Python'
  ficha = 'no corresponde a sus archivos'
  espacio_script = 'hacen falta al menos'
}
# Orden fijo de busqueda (una tabla no lo tiene): una salida con dos senales da siempre lo mismo.
$NG_ORDEN_SENALES_SCRIPT = @('md5', 'descarga', 'recuentos', 'python', 'ficha', 'espacio_script')

# Senales de Docker y del sistema (expresiones regulares). En Windows, Docker
# Desktop no publica un puerto reservado por Hyper-V o WSL (paso 4, B1).
$NG_SENAL_SISTEMA = @{
  espacio = 'no space left on device'
  puerto = 'address already in use|port is already allocated|ports are not available|forbidden by its access permissions'
  red = 'i/o timeout|TLS handshake timeout|temporary failure in name resolution|failed to resolve source metadata|connection reset by peer'
}
$NG_ORDEN_SENALES_SISTEMA = @('espacio', 'puerto', 'red')

function frase {  # codigo [dato...] -> la frase con sus datos (ni mas ni menos que sus %s)
  param([Parameter(Position = 0)][string]$Codigo = 'inesperado', [Parameter(ValueFromRemainingArguments = $true)][string[]]$Datos)
  $plantilla = $NG_FRASE[$Codigo]
  # Un codigo que no esta en el catalogo es un error del instalador: se anota.
  if (-not $plantilla) { registrar "frase: código desconocido «$Codigo»"; $plantilla = $NG_FRASE['inesperado'] }
  $trozos = $plantilla -split '%s', 0, 'SimpleMatch'
  $datos = @($Datos)
  # Sin datos suficientes se rellena con vacios, pero se anota.
  if ($datos.Count -lt $trozos.Count - 1) { registrar "frase: faltan datos para $Codigo" }
  $r = $trozos[0]
  for ($i = 1; $i -lt $trozos.Count; $i++) {
    $d = if ($i - 1 -lt $datos.Count) { $datos[$i - 1] } else { '' }
    $r += $d + $trozos[$i]
  }
  return $r
}

function clasificar_salida([string]$archivo) {  # -> codigo del primer fallo reconocido (o nada)
  if (-not (Test-Path -LiteralPath $archivo)) { return '' }
  $texto = [IO.File]::ReadAllText($archivo, $NG_UTF8)
  foreach ($c in $NG_ORDEN_SENALES_SCRIPT) {
    if ($texto.IndexOf($NG_SENAL_SCRIPT[$c], [StringComparison]::OrdinalIgnoreCase) -ge 0) { return $c }
  }
  foreach ($c in $NG_ORDEN_SENALES_SISTEMA) { if ($texto -match $NG_SENAL_SISTEMA[$c]) { return $c } }
  return ''
}

function detalle_senal([string]$codigo, [string]$archivo) {  # -> lo que sigue al ultimo ": " de la linea de la senal
  if (-not $codigo -or -not (Test-Path -LiteralPath $archivo)) { return '' }
  foreach ($l in [IO.File]::ReadAllLines($archivo, $NG_UTF8)) {
    $esta = $false
    if ($NG_SENAL_SCRIPT.ContainsKey($codigo)) { $esta = $l.IndexOf($NG_SENAL_SCRIPT[$codigo], [StringComparison]::OrdinalIgnoreCase) -ge 0 }
    elseif ($NG_SENAL_SISTEMA.ContainsKey($codigo)) { $esta = $l -match $NG_SENAL_SISTEMA[$codigo] }
    if ($esta) {
      $i = $l.LastIndexOf(': ')
      if ($i -ge 0) { return $l.Substring($i + 2).TrimStart() }
      return $l.TrimStart()
    }
  }
  return ''
}

# Ejecuta un programa; si falla, lo clasifica por su salida y lanza el fallo
# del catalogo (espacio, red, puerto) o el generico que se indique.
function ejecutar_clasificado {
  param([string]$Generico, [string]$Dato, [string]$Programa, [string[]]$Argumentos, [int]$TiempoMax = 0)
  $salida = Join-Path $env:TEMP ('neurograph-salida-' + [guid]::NewGuid().ToString('N') + '.txt')
  $codigo = ''
  try {
    $r = ejecutar_programa $Programa $Argumentos -Copia $salida -TiempoMax $TiempoMax
    if ($r.Codigo -eq 0) { return }
    $codigo = clasificar_salida $salida
  } finally {
    Remove-Item -LiteralPath $salida -Force -ErrorAction SilentlyContinue
  }
  switch ($codigo) {
    'espacio' { fallar espacio 'para Docker' }
    'red' { fallar red }
    'puerto' { fallar puerto 'de la web o de la API' }
    default { fallar $Generico $Dato }
  }
}
