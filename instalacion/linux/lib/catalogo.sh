# shellcheck shell=bash
# Catalogo de fallos conocidos del instalador Linux (B1 del diseno, H10).
# Cada fallo tiene una frase para la persona: que ha pasado y que hacer.
# Las senales de los scripts reutilizados se buscan en su salida; la prueba
# prueba_catalogo.sh comprueba que esos textos siguen en los scripts. La
# funcion fallar esta en comun.sh.

declare -gA NG_FRASE=(
  [conexion]="No hay conexión con %s. Comprueba internet; en una red de empresa o universidad, puede que un cortafuegos lo bloquee."
  [red]="Se cortó la conexión mientras se descargaba algo (Docker Hub o un repositorio de paquetes). Comprueba internet y vuelve a ejecutar el instalador."
  [apt]="No se pudo instalar %s con apt: no llega a los repositorios de paquetes del sistema. Comprueba internet y vuelve a ejecutar el instalador."
  [programa]="Falta el programa «%s». Instálalo y vuelve a ejecutar el instalador."
  [espacio]="No hay espacio suficiente %s. Libera espacio y vuelve a ejecutar el instalador."
  [espacio_script]="No hay espacio suficiente para la tractografía (%s). Libera espacio y repite con: neurograph tractografia"
  [memoria_base]="Hace falta al menos %s de memoria libre para NeuroGraph. Cierra otros programas y vuelve a ejecutar el instalador."
  [memoria]="Faltó memoria al generar la tractografía. Cierra otros programas y repite con: neurograph tractografia"
  [md5]="Un archivo de Zenodo llegó dañado y se ha borrado (%s). Repite con: neurograph tractografia y se descargará de nuevo."
  [descarga]="No se pudo descargar un archivo de Zenodo (%s). Comprueba internet y repite con: neurograph tractografia; la descarga sigue donde se quedó."
  [recuentos]="El SQL de la tractografía no da los recuentos esperados y no se ha cargado (%s). Repite con: neurograph tractografia; si vuelve a pasar, envía el registro."
  [python]="No se pudieron instalar las dependencias de Python desde PyPI (%s). Comprueba internet y repite con: neurograph tractografia"
  [ficha]="Un archivo de la biblioteca no cuadra con su ficha (%s). No se ha tocado nada: revisa ese archivo."
  [biblioteca_ajena]="La carpeta %s no parece una biblioteca de NeuroGraph y no está vacía. Elige otra con: instalacion/linux/instalar.sh --biblioteca RUTA"
  [biblioteca_ruta]="La ruta de la biblioteca (%s) lleva una coma, unas comillas dobles, un salto de línea o «: », que Docker no admite al montar una carpeta o que cortarían la ruta en los mensajes. Elige otra con: instalacion/linux/instalar.sh --biblioteca RUTA"
  [biblioteca_no_elegida]="No se ha elegido ninguna carpeta para la biblioteca. Vuelve a ejecutar el instalador y acepta la que propone o escribe otra."
  [biblioteca_sin_permiso]="No se puede leer o escribir en la carpeta %s (¿es un disco desconectado?). Conéctalo, o elige otra con: instalacion/linux/instalar.sh --biblioteca RUTA"
  [carga]="Falló la carga de los datos iniciales en %s. Vuelve a ejecutar el instalador; si se repite, envía el registro."
  [recuentos_base]="Los datos cargados no dan los recuentos esperados (%s). Envía el registro."
  [volumen_desconocido]="Ya hay una base de datos de NeuroGraph que no se sabe de dónde viene y no está completa. No se ha tocado. Si no la quieres, bórrala con: docker volume rm %s"
  [puerto]="El puerto %s está ocupado. Cierra el programa que lo usa o vuelve a ejecutar el instalador, que buscará otro."
  [sin_puerto]="No hay ningún puerto libre cerca del %s. Cierra algún programa que use puertos y vuelve a intentarlo."
  [espera]="%s no arrancó a tiempo. Vuelve a intentarlo; si se repite, envía el registro."
  [encender]="No se pudo encender %s. Vuelve a intentarlo; si se repite, envía el registro."
  [docker_parado]="Docker no está en marcha. Arráncalo con: sudo systemctl start docker"
  [docker_permiso]="Esta sesión no tiene permiso para usar Docker. Vuelve a ejecutar el instalador."
  [docker_otra_distro]="Esta distribución no es Ubuntu, una derivada de Ubuntu ni Debian: instala Docker siguiendo https://docs.docker.com/engine/install/ y vuelve a ejecutar el instalador."
  [docker_incompatible]="%s"
  [imagenes]="Faltan las imágenes de NeuroGraph (quizá por un «docker system prune»). Vuelve a ejecutar instalacion/linux/instalar.sh desde la carpeta del proyecto."
  [construccion]="Falló la preparación de %s. Vuelve a ejecutar el instalador; si se repite, envía el registro."
  [tracto_en_marcha]="Ya hay una instalación de la tractografía en marcha. Espera a que termine."
  [en_marcha]="Ya hay otro instalador, desinstalador o tractografía de NeuroGraph en marcha. Espera a que termine."
  [borrar_sin_docker]="No se puede borrar la base de datos: %s. No se ha tocado nada."
  [base_no_borrada]="La base de datos no se ha borrado: Docker no pudo quitar el volumen %s (el motivo está en el registro). Se conserva su configuración; para volver a intentarlo: %s --borrar-datos"
  [estado]="No se pudo guardar el estado de NeuroGraph en %s (¿falta espacio en el disco?). Vuelve a intentarlo; si se repite, envía el registro."
  [mcp]="El conector MCP no responde como se esperaba (%s). Envía el registro."
  [web]="La web no responde en %s. Vuelve a intentarlo con «neurograph abrir»; si se repite, envía el registro."
  [api]="La API no da los datos esperados (%s). Envía el registro."
  [inesperado]="Algo ha fallado de forma inesperada."
)

# Senales en la salida de scripts/install_tractography.sh y
# scripts/rebuild_db_from_sql.sh (sin distinguir mayusculas). Sus lineas de
# fallo terminan en ": dato" (el archivo, la ficha...), que es lo que se
# muestra: la frase ya dice lo demas (B6).
declare -gA NG_SENAL_SCRIPT=(
  [md5]="el md5 no coincide"
  [descarga]="no se pudo descargar"
  [recuentos]="los recuentos no coinciden"
  [python]="no se pudieron instalar las dependencias de Python"
  [ficha]="no corresponde a sus archivos"
  [espacio_script]="hacen falta al menos"
)
# Orden fijo en que se buscan (bash no garantiza el de la tabla): una salida
# con dos senales da siempre el mismo resultado.
NG_ORDEN_SENALES_SCRIPT=(md5 descarga recuentos python ficha espacio_script)

# Senales de Docker y del sistema (expresiones regulares extendidas).
declare -gA NG_SENAL_SISTEMA=(
  [espacio]="no space left on device"
  [puerto]="address already in use|port is already allocated"
  [red]="i/o timeout|TLS handshake timeout|temporary failure in name resolution|failed to resolve source metadata|connection reset by peer"
)
NG_ORDEN_SENALES_SISTEMA=(espacio puerto red)

frase() {  # codigo [dato...] -> la frase con sus datos (ni mas ni menos que sus %s)
  local codigo="${1:-inesperado}" plantilla huecos
  plantilla="${NG_FRASE[$codigo]:-${NG_FRASE[inesperado]}}"
  shift || true
  # Se cuentan los %s en bash puro: un grep sin coincidencias fallaria con pipefail.
  local sin_huecos="${plantilla//%s/}"
  huecos=$(( (${#plantilla} - ${#sin_huecos}) / 2 ))
  # Sin datos suficientes se rellena con vacios, pero se anota (va al registro).
  [ $# -ge "$huecos" ] || echo "frase: faltan datos para $codigo" >&2
  set -- "${@:1:$huecos}"
  while [ $# -lt "$huecos" ]; do set -- "$@" ""; done
  # shellcheck disable=SC2059  # la plantilla es nuestra, del catalogo
  printf "$plantilla" "$@"
}

clasificar_salida() {  # archivo -> codigo del primer fallo reconocido (o nada)
  local codigo
  for codigo in "${NG_ORDEN_SENALES_SCRIPT[@]}"; do
    if grep -qiF -- "${NG_SENAL_SCRIPT[$codigo]}" "$1"; then echo "$codigo"; return 0; fi
  done
  for codigo in "${NG_ORDEN_SENALES_SISTEMA[@]}"; do
    if grep -qiE -- "${NG_SENAL_SISTEMA[$codigo]}" "$1"; then echo "$codigo"; return 0; fi
  done
  return 0
}

detalle_senal() {  # codigo archivo -> el dato de la linea que dio la senal: lo que sigue a su ultimo ": "
  [ -n "${1:-}" ] || return 0
  # Las de script son texto literal (-F); las de sistema, expresiones (-E).
  if [ -n "${NG_SENAL_SCRIPT[$1]:-}" ]; then
    grep -iF -m1 -- "${NG_SENAL_SCRIPT[$1]}" "$2" | sed -e 's/^.*: //' -e 's/^ *//' || true
  elif [ -n "${NG_SENAL_SISTEMA[$1]:-}" ]; then
    grep -iE -m1 -- "${NG_SENAL_SISTEMA[$1]}" "$2" | sed -e 's/^.*: //' -e 's/^ *//' || true
  fi
}

# Ejecuta una orden; si falla, la clasifica por su salida y lanza el fallo
# del catalogo (espacio, red, puerto...) o el generico que se indique.
ejecutar_clasificado() {  # codigo_si_no_se_reconoce dato -- orden...
  local generico="$1" dato="$2" salida codigo
  shift 3
  salida="$(mktemp)"
  # La salida va al registro en directo (tee) y a un archivo para
  # clasificarla; con pipefail, el codigo es el de la orden.
  if "$@" 2>&1 | tee "$salida"; then rm -f "$salida"; return 0; fi
  codigo="$(clasificar_salida "$salida")"
  rm -f "$salida"
  case "$codigo" in
    espacio) fallar espacio "para Docker" ;;
    red) fallar red ;;
    puerto) fallar puerto "de la web o de la API" ;;
    *) fallar "$generico" "$dato" ;;
  esac
}
