# shellcheck shell=bash
# Ayudas de las pruebas de funciones del instalador (B8.2 del diseno, H10).
# Se carga con source desde ejecutar.sh, dentro de un subshell por prueba.

# Ejecutables falsos: van delante en el PATH de cada prueba.
simular() {  # orden cuerpo_bash
  printf '#!/usr/bin/env bash\n%s\n' "$2" > "$NG_PRUEBA_BIN/$1"
  chmod +x "$NG_PRUEBA_BIN/$1"
}

# Simula un programa que anota sus argumentos (una linea por llamada).
simular_anotando() {  # orden [cuerpo_extra]
  simular "$1" "echo \"\$*\" >> '$NG_PRUEBA_LLAMADAS/$1'
${2:-}"
}

llamadas() {  # orden -> las llamadas anotadas
  cat "$NG_PRUEBA_LLAMADAS/$1" 2> /dev/null || true
}

igual() {  # esperado obtenido descripcion
  if [ "$1" != "$2" ]; then
    printf '    FALLA: %s\n      esperado: %s\n      obtenido: %s\n' "$3" "$1" "$2"
    return 1
  fi
}

contiene() {  # texto_buscado texto descripcion
  if [[ "$2" != *"$1"* ]]; then
    printf '    FALLA: %s\n      no contiene: %s\n      texto: %s\n' "$3" "$1" "$2"
    return 1
  fi
}

no_contiene() {  # texto_buscado texto descripcion
  if [[ "$2" == *"$1"* ]]; then
    printf '    FALLA: %s\n      contiene (y no deberia): %s\n' "$3" "$1"
    return 1
  fi
}

# Ejecuta un trozo de bash como lo haria un ejecutable del instalador:
# comun.sh y las bibliotecas pedidas cargadas, registro abierto y trampas
# puestas. Pantalla en $HOME/pantalla; devuelve el codigo de salida.
con_lib() {  # cuerpo [biblioteca...]
  local cuerpo="$1" lib cargas=""
  shift
  for lib in "$@"; do cargas+="source \"$NG_LIB/$lib.sh\""$'\n'; done
  cat > "$HOME/s.sh" << EOF
set -Eeuo pipefail
shopt -s inherit_errexit
source "$NG_LIB/comun.sh"
$cargas
iniciar_registro prueba
instalar_trampas
$cuerpo
EOF
  bash "$HOME/s.sh" > "$HOME/pantalla" 2>&1
}
pantalla() { cat "$HOME/pantalla"; }
registro() { cat "$HOME"/.local/share/neurograph/registro/prueba-*.log; }
leer_valor_archivo() {  # archivo clave (sin cargar config.sh en la prueba)
  [ -f "$1" ] || return 0
  sed -n "s/^$2=//p" "$1" | tail -1
}

# Comprueba que los procesos anotados en $HOME/pids (lo que deja vivo un
# programa simulado) no retienen el bloqueo ni la pantalla, y los termina.
sin_bloqueo_ni_pantalla_heredados() {
  local pid ok=0
  exec 8> "$HOME/.local/share/neurograph/.bloqueo"
  flock -n 8 || { echo "    FALLA: el bloqueo sigue tomado tras salir"; ok=1; }
  exec 8>&-
  [ -s "$HOME/pids" ] || { echo "    FALLA: el programa simulado no dejo ningun proceso"; ok=1; }
  for pid in $(cat "$HOME/pids" 2> /dev/null); do
    if [ -e "/proc/$pid/fd/3" ] || [ -e "/proc/$pid/fd/9" ]; then
      echo "    FALLA: el proceso que sobrevive ($pid) conserva el descriptor 3 o el 9"; ok=1
    fi
    kill "$pid" 2> /dev/null || true
  done
  return $ok
}

# curl simulado que respeta -o: lo que imprime el cuerpo va a ese archivo,
# salvo con -w, cuya salida va a la estandar (como en curl).
simular_curl() {  # cuerpo (ve los argumentos de curl en "$@")
  simular curl "o=''; p=''; for a in \"\$@\"; do [ \"\$p\" = -o ] && o=\"\$a\"; [ \"\$a\" = -w ] && o=''; p=\"\$a\"; done
cuerpo() { $1
}
if [ -n \"\$o\" ]; then cuerpo \"\$@\" > \"\$o\"; else cuerpo \"\$@\"; fi"
}
