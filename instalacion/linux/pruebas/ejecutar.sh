#!/usr/bin/env bash
# Ejecuta las pruebas de funciones del instalador Linux (B8.2, H10).
# Cada prueba (funcion prueba_*) corre en su propio subshell, con un HOME
# temporal, su TMPDIR (ningun mktemp deja restos en /tmp) y los programas
# simulados delante en el PATH: nunca toca la configuracion real ni Docker
# de verdad.
#
# Uso: instalacion/linux/pruebas/ejecutar.sh [archivo_de_pruebas...]
set -uo pipefail

# cd con CDPATH exportado imprime la ruta: de ahi el > /dev/null.
DIR_PRUEBAS="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" > /dev/null && pwd)"
NG_LIB="$(cd -- "$DIR_PRUEBAS/.." > /dev/null && pwd)/lib"
NG_RAIZ="$(cd -- "$DIR_PRUEBAS/../../.." > /dev/null && pwd)"
export NG_LIB NG_RAIZ
BASE="$HOME/.cache/neurograph-pruebas/funciones"
mkdir -p "$BASE"

archivos=()
if [ $# -gt 0 ]; then
  for a in "$@"; do archivos+=("$(realpath -m -- "$a")"); done
else
  archivos=("$DIR_PRUEBAS"/prueba_*.sh)
fi

total=0; fallos=0
for archivo in "${archivos[@]}"; do
  # La salida de errores se conserva: si el archivo no carga, se muestra por que.
  carga="$(bash -c 'source "$1" && declare -F' _ "$archivo" 2>&1 || true)"
  pruebas="$(grep '^declare -f prueba_' <<< "$carga" | awk '{print $3}' || true)"
  if [ -z "$pruebas" ]; then
    # Un archivo que no existe, no carga o no tiene pruebas es un fallo, no un exito vacio.
    total=$((total + 1)); fallos=$((fallos + 1))
    printf 'FALLA %s: no existe, no carga o no tiene pruebas\n' "$archivo"
    if [ -n "$carga" ]; then sed 's/^/      /' <<< "$carga"; fi
    continue
  fi
  for prueba in $pruebas; do
    total=$((total + 1))
    # Otro ejecutor en paralelo puede haber hecho rmdir de BASE entre medias.
    caja=""
    for _ in 1 2 3; do
      mkdir -p "$BASE" && caja="$(mktemp -d "$BASE/caja.XXXXXX" 2> /dev/null)" && break
      caja=""
    done
    if [ -z "$caja" ]; then
      fallos=$((fallos + 1))
      printf 'FALLA %s: no se pudo crear la carpeta temporal en %s\n' "$prueba" "$BASE"
      continue
    fi
    mkdir -p "$caja/home" "$caja/bin" "$caja/llamadas" "$caja/tmp"
    if (
      export HOME="$caja/home" NG_PRUEBA_BIN="$caja/bin" NG_PRUEBA_LLAMADAS="$caja/llamadas" TMPDIR="$caja/tmp"
      export PATH="$caja/bin:$PATH"
      cd "$caja" || exit 1
      # shellcheck source=ayuda.sh
      source "$DIR_PRUEBAS/ayuda.sh"
      # shellcheck source=/dev/null
      source "$archivo"
      "$prueba"
    ) > "$caja/salida" 2>&1; then
      printf 'ok    %s\n' "$prueba"
    else
      fallos=$((fallos + 1))
      printf 'FALLA %s\n' "$prueba"
      sed 's/^/      /' "$caja/salida"
    fi
    rm -rf "$caja"
  done
done
printf '\n%s pruebas, %s fallos\n' "$total" "$fallos"
rmdir "$BASE" 2> /dev/null || true  # sin restos: cada caja se borra al terminar
[ "$fallos" -eq 0 ]
