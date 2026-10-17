# shellcheck shell=bash
# config.env y estado.env del instalador Linux (bloque A del diseno, H10).
# Formato: CLAVE=valor, una por linea; compose lee config.env con
# --env-file, asi que los valores no llevan comillas ni saltos de linea.
#
# config.env (permisos 600): NG_PROYECTO, NG_WEB_PUERTO, NG_API_PUERTO,
#   NG_BIBLIOTECA, NG_CONTRASENA_BASE y la marca NG_BASE_CARGADA (fecha).
#   La marca va junto a la contrasena porque las dos describen el volumen.
# estado.env: NG_INSTALACION (completa|incompleta), NG_TRACTOGRAFIA
#   (instalada|pendiente|ficha_en_conflicto), NG_TRACTOGRAFIA_MOTIVO,
#   NG_TRACTO_SIN_RECURSOS, NG_IMAGENES_DESCARGADAS e NG_IAS_REGISTRADAS
#   (listas separadas por espacios).

leer_valor() {  # archivo clave -> valor (vacio si no hay)
  [ -f "$1" ] || return 0
  awk -v clave="$2" 'index($0, clave "=") == 1 { valor = substr($0, length(clave) + 2) } END { printf "%s", valor }' "$1"
}

guardar_valor() {  # archivo clave valor
  local tmp
  if [[ "$3" == *$'\n'* ]]; then
    echo "guardar_valor: el valor de $2 lleva un salto de linea" >&2
    return 1
  fi
  mkdir -p "$(dirname "$1")"
  [ -f "$1" ] || { : > "$1"; chmod 600 "$1"; }
  tmp="$(mktemp "$1.XXXXXX")" || return 1
  chmod 600 "$tmp"
  # Cada paso se comprueba: llamada desde un if no hay errexit, y un awk
  # fallido dejaria el archivo solo con la clave nueva.
  if awk -v clave="$2" 'index($0, clave "=") != 1' "$1" > "$tmp" \
    && printf '%s=%s\n' "$2" "$3" >> "$tmp" && mv "$tmp" "$1"; then
    return 0
  fi
  rm -f "$tmp"
  echo "guardar_valor: no se pudo guardar $2 en $1" >&2
  return 1
}

borrar_valor() {  # archivo clave
  local tmp
  [ -f "$1" ] || return 0
  tmp="$(mktemp "$1.XXXXXX")" || return 1
  chmod 600 "$tmp"
  if awk -v clave="$2" 'index($0, clave "=") != 1' "$1" > "$tmp" && mv "$tmp" "$1"; then
    return 0
  fi
  rm -f "$tmp"
  echo "borrar_valor: no se pudo borrar $2 de $1" >&2
  return 1
}
