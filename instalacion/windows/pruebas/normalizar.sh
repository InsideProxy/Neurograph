#!/usr/bin/env bash
# Deja los archivos del instalador Windows como los necesita Windows (bloque A
# del diseno, H11): los .ps1 en UTF-8 con BOM (Windows PowerShell 5.1 lee sin
# BOM como ANSI) y los .cmd con CRLF (con LF, cmd falla al buscar etiquetas).
# Las herramientas de edicion escriben sin BOM y con LF: se ejecuta despues de
# crear o editar uno. Avisa, sin tocarlo, de un .cmd que no sea ASCII.
# Uso: instalacion/windows/pruebas/normalizar.sh
set -euo pipefail
W="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." > /dev/null && pwd)"
bom=$'\xef\xbb\xbf'
while IFS= read -r -d '' f; do
  if [ "$(head -c 3 "$f")" != "$bom" ]; then
    { printf '%s' "$bom"; cat "$f"; } > "$f.tmp" && mv "$f.tmp" "$f"
    echo "BOM puesto: ${f#"$W"/}"
  fi
done < <(find "$W" -name '*.ps1' -print0)
while IFS= read -r -d '' f; do
  if [ "$(awk '!/\r$/ { n++ } END { print n + 0 }' "$f")" -gt 0 ]; then
    sed -i 's/\r*$/\r/' "$f"
    echo "CRLF puesto: ${f#"$W"/}"
  fi
  if LC_ALL=C grep -q '[^[:print:][:space:]]' "$f"; then
    echo "AVISO: ${f#"$W"/} no es ASCII (cmd lo leería en la página de códigos OEM)" >&2
  fi
done < <(find "$W" -name '*.cmd' -print0)
