# shellcheck shell=bash
# Las cifras esperadas del instalador Windows son las de Linux («Codigo
# comun» del diseno de Windows, H11): esperado.ps1 es una copia, porque el
# comando diario de cada instalador funciona sin la carpeta del proyecto.
source "$NG_LIB/esperado.sh" || return 1
PS1_ESPERADO="$NG_RAIZ/instalacion/windows/lib/esperado.ps1"

valor_ps1() {  # variable -> su valor entre comillas simples (en ellas, '' es una comilla)
  sed -n "s/^\\\$$1 = '\\(.*\\)'\$/\\1/p" "$PS1_ESPERADO" | sed "s/''/'/g"
}
lista_ps1() {  # variable -> los elementos de su lista @( ... ), uno por linea
  awk -v cabeza="\$$1 = @(" 'index($0, cabeza) == 1 { dentro = 1; next } dentro && /^\)/ { exit } dentro' "$PS1_ESPERADO" \
    | sed -n "s/^ *'\\(.*\\)' *\$/\\1/p" | sed "s/''/'/g"
}

prueba_las_cifras_de_windows_son_las_de_linux() {
  [ -f "$PS1_ESPERADO" ] || { echo "    FALLA: no existe $PS1_ESPERADO"; return 1; }
  igual "$NG_ESPERADO_REGIONES" "$(valor_ps1 NG_ESPERADO_REGIONES)" "regiones" || return 1
  igual "$NG_ESPERADO_CONEXIONES" "$(valor_ps1 NG_ESPERADO_CONEXIONES)" "conexiones" || return 1
  igual "$NG_ESPERADO_ESQUEMA" "$(valor_ps1 NG_ESPERADO_ESQUEMA)" "esquema" || return 1
  igual "$NG_ESPERADO_TRACTOGRAFIA" "$(valor_ps1 NG_ESPERADO_TRACTOGRAFIA)" "tractografia" || return 1
  igual "$NG_CONSULTA_TRACTOGRAFIA" "$(valor_ps1 NG_CONSULTA_TRACTOGRAFIA)" "consulta de la tractografia" || return 1
  igual "$NG_ESPERADO_HERRAMIENTAS_MCP" "$(valor_ps1 NG_ESPERADO_HERRAMIENTAS_MCP)" "herramientas del MCP" || return 1
}

prueba_las_consultas_de_windows_son_las_de_linux() {
  igual "$(printf '%s\n' "${NG_ESPERADO_HUERFANAS[@]}")" "$(lista_ps1 NG_ESPERADO_HUERFANAS)" "huerfanas" || return 1
  # En Linux las huerfanas van al final de la carga; en Windows, «+ $NG_ESPERADO_HUERFANAS».
  igual "$(printf '%s\n' "${NG_ESPERADO_CARGA[@]}")" "$(lista_ps1 NG_ESPERADO_CARGA; lista_ps1 NG_ESPERADO_HUERFANAS)" "carga de la H1" || return 1
  # Las que descarga el instalador y quita el desinstalador (B7).
  igual "$(printf '%s\n' "${NG_IMAGENES_BASE[@]}")" "$(lista_ps1 NG_IMAGENES_BASE)" "imagenes base" || return 1
}

prueba_la_comparacion_detecta_una_diferencia() {
  local copia="$HOME/esperado.ps1"
  # Sin el archivo, la copia saldria vacia y cualquier comparacion «detectaria» una diferencia.
  [ -f "$PS1_ESPERADO" ] || { echo "    FALLA: no existe $PS1_ESPERADO"; return 1; }
  sed "s/^\\\$NG_ESPERADO_REGIONES = '.*'\$/\$NG_ESPERADO_REGIONES = '999'/; s/from species|3'/from species|4'/; s|'pgvector/pgvector:pg16'|'pgvector/pgvector:pg17'|" "$PS1_ESPERADO" > "$copia"
  PS1_ESPERADO="$copia"
  ! igual "$NG_ESPERADO_REGIONES" "$(valor_ps1 NG_ESPERADO_REGIONES)" "x" > /dev/null || return 1
  ! igual "$(printf '%s\n' "${NG_ESPERADO_CARGA[@]}")" "$(lista_ps1 NG_ESPERADO_CARGA; lista_ps1 NG_ESPERADO_HUERFANAS)" "x" > /dev/null || return 1
  ! igual "$(printf '%s\n' "${NG_IMAGENES_BASE[@]}")" "$(lista_ps1 NG_IMAGENES_BASE)" "x" > /dev/null || return 1
}

prueba_el_titulo_del_paso_7_cuenta_los_mismos_archivos() {
  local l w
  l="$(grep -o 'Cargando datos ([0-9]* archivos)' "$NG_RAIZ/instalacion/linux/instalar.sh")"
  w="$(grep -o 'Cargando datos ([0-9]* archivos)' "$NG_RAIZ/instalacion/windows/instalar.ps1" || true)"
  igual "$l" "$w" "el titulo del paso 7" || return 1
}
