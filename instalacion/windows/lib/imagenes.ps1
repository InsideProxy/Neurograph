# Paso 5 del instalador Windows: construir las tres imagenes con los
# Dockerfiles de instalacion/docker/ (bloque A del diseno, H11) y anotar las
# imagenes base que descargo el instalador, para que la desinstalacion quite
# solo esas (B7). Como instalacion/linux/lib/imagenes.sh.
$NG_IMAGENES_NUEVAS = @()  # propias creadas en esta ejecucion (limpieza, B1)
$NG_CONSTRUCTOR = ''

function existe_imagen([string]$i) { return ((ejecutar_programa docker @('image', 'inspect', $i) -Capturar).Codigo -eq 0) }

function anotar_imagenes_descargadas([string[]]$imagenes) {
  $lista = @((leer_valor $NG_ESTADO NG_IMAGENES_DESCARGADAS) -split ' ' | Where-Object { $_ })
  foreach ($i in $imagenes) { if ($i -and $lista -notcontains $i) { $lista += $i } }
  guardar_valor $NG_ESTADO NG_IMAGENES_DESCARGADAS ($lista -join ' ')
}

# El constructor del contexto actual: en Docker Desktop, «desktop-linux», el
# del motor, que deja la imagen en «docker image ls» (como --builder default
# en Linux). Por comprobar con docker buildx ls en la primera ejecucion real.
function constructor_de_docker {
  $c = docker_valor @('context', 'show')
  if ($c) { return $c }
  return 'default'
}

function construir([string]$descripcion, [string]$etiqueta, [string]$dockerfile, [string[]]$extra = @()) {
  if (-not (existe_imagen $etiqueta)) { $script:NG_IMAGENES_NUEVAS += $etiqueta }
  ejecutar_clasificado -Generico construccion -Dato $descripcion -Programa docker -Argumentos (@('build', '--builder', $script:NG_CONSTRUCTOR, '--progress', 'plain', '-t', $etiqueta, '-f', (Join-Path $NG_RAIZ $dockerfile)) + $extra + @($NG_RAIZ))
}

function paso_imagenes {
  $faltan = @($NG_IMAGENES_BASE | Where-Object { -not (existe_imagen $_) })
  anotar_imagenes_descargadas $faltan
  if ($faltan -contains 'pgvector/pgvector:pg16') {
    ejecutar_clasificado -Generico construccion -Dato 'la base de datos' -Programa docker -Argumentos @('pull', 'pgvector/pgvector:pg16')
  }
  $script:NG_CONSTRUCTOR = constructor_de_docker
  construir 'la API' "$NG_PROYECTO-api" 'backend\Dockerfile'
  construir 'la web' "$NG_PROYECTO-web" 'instalacion\docker\web.Dockerfile'
  construir 'las herramientas' "$NG_PROYECTO-herramientas" 'instalacion\docker\herramientas.Dockerfile' @('--build-arg', "IMAGEN_API=$NG_PROYECTO-api")
  $script:NG_RESUMEN = 'imágenes de la API, la web y las herramientas listas'
}
