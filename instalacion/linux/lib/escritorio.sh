# shellcheck shell=bash disable=SC2034  # NG_RESUMEN lo lee comun.sh
# Paso 9 del instalador Linux y utilidades del escritorio (B3 del diseno,
# H10): comandos, biblioteca, iconos, instrucciones, notificaciones y
# navegador.

NG_MODO_ESCRITORIO=0  # 1 cuando se lanza desde un icono (sin terminal)

# Texto listo para el reemplazo de s#...#...# de sed: \ & y # van escapados (B3).
escapar_sed() { printf '%s' "$1" | sed -e 's/[\\&#]/\\&/g'; }

# Una ruta como argumento de Exec= de un .desktop, entre comillas segun la
# especificacion Desktop Entry: %% por los codigos de campo, \ delante de
# " ` $ y \ y, despues, el escape de cadena, que dobla cada \ (B3).
exec_desktop() {  # ruta
  printf '"%s"' "$(printf '%s' "$1" | sed -e 's/%/%%/g' -e 's/[\\"`$]/\\&/g' -e 's/\\/\\\\/g')"
}

sustituir_marcadores() {  # origen destino
  local bin dir api exe
  bin="$(escapar_sed "$NG_BIN")"
  dir="$(escapar_sed "$NG_DIR")"
  api="$(escapar_sed "$(leer_valor "$NG_CONFIG" NG_API_PUERTO)")"
  exe="$(escapar_sed "$(exec_desktop "$NG_BIN/neurograph")")"
  sed -e "s#@NG_BIN@#$bin#g" -e "s#@NG_DIR@#$dir#g" -e "s#@NG_API_PUERTO@#$api#g" \
      -e "s#@NG_EXEC_NEUROGRAPH@#$exe#g" "$1" > "$2"
}

instalar_archivos() {
  local d="$NG_RAIZ/instalacion/linux"
  mkdir -p "$NG_BIN" "$NG_DIR/lib" "$HOME/.local/share/applications"
  cp "$d"/lib/*.sh "$NG_DIR/lib/"
  install -m 755 "$d/plantillas/neurograph" "$NG_BIN/neurograph"
  install -m 755 "$d/plantillas/neurograph-mcp" "$NG_BIN/neurograph-mcp"
  install -m 755 "$d/desinstalar.sh" "$NG_DIR/desinstalar.sh"
  cp "$NG_RAIZ/frontend/src-tauri/icons/128x128.png" "$NG_DIR/neurograph.png"
  sustituir_marcadores "$d/plantillas/conectar-ia.md" "$NG_DIR/conectar-ia.md"
}

instalar_iconos() {
  local p
  for p in neurograph neurograph-apagar; do
    sustituir_marcadores "$NG_RAIZ/instalacion/linux/plantillas/$p.desktop" "$HOME/.local/share/applications/$p.desktop"
  done
  if command -v update-desktop-database > /dev/null 2>&1; then
    update-desktop-database "$HOME/.local/share/applications" || true
  fi
}

paso_escritorio() {
  instalar_archivos
  instalar_iconos
  conectar_ias
  NG_RESUMEN="iconos y comandos listos · IAs: $NG_IAS_RESUMEN"
  [[ ":$PATH:" == *":$NG_BIN:"* ]] || avisar "La carpeta $NG_BIN aún no está en el PATH de esta sesión: «neurograph» funcionará sin la ruta completa cuando cierres sesión y vuelvas a entrar; mientras, usa la ruta completa ($NG_BIN/neurograph)."
}

notificar() {  # texto
  echo "[notificacion] $*"
  [ "$NG_MODO_ESCRITORIO" = 1 ] || return 0
  if command -v notify-send > /dev/null 2>&1; then notify-send -i "$NG_DIR/neurograph.png" NeuroGraph "$*" || true; fi
}

# Desde un icono no hay terminal: el fallo se notifica; sin notificaciones,
# se abre el registro (B3).
notificar_fallo() {
  local texto="${NG_ULTIMA_FRASE:-$(frase inesperado)} Registro: $NG_REGISTRO"
  if command -v notify-send > /dev/null 2>&1; then
    notify-send -u critical -i "$NG_DIR/neurograph.png" NeuroGraph "$texto" || true
  elif command -v xdg-open > /dev/null 2>&1; then
    xdg-open "$NG_REGISTRO" > /dev/null 2>&1 9>&- 3>&- &
  fi
}

mostrar_avisos() {  # los avisos guardados, en pantalla (y como notificacion), y se vacian
  [ -s "$NG_AVISOS_ARCHIVO" ] || return 0
  local aviso
  while IFS= read -r aviso; do decir "  ⚠ $aviso"; notificar "$aviso"; done < "$NG_AVISOS_ARCHIVO"
  rm -f "$NG_AVISOS_ARCHIVO"
}

abrir_navegador() {
  local url
  url="http://127.0.0.1:$(leer_valor "$NG_CONFIG" NG_WEB_PUERTO)"
  decir "NeuroGraph: $url"
  # 9>&- y 3>&-: el navegador puede seguir abierto horas y no debe retener
  # el bloqueo ni la pantalla (B1).
  if command -v xdg-open > /dev/null 2>&1; then (xdg-open "$url" > /dev/null 2>&1 9>&- 3>&- &); fi
}

# Por separado la respuesta y su lectura: que la API no responda y que no
# de JSON son fallos distintos, y ninguno es inesperado (B1).
NG_CUENTA=""
contar_api() {  # ruta -> NG_CUENTA: elementos de la lista JSON que devuelve la API
  local f
  f="$(mktemp)"
  if ! curl -sf -o "$f" "http://127.0.0.1:$(leer_valor "$NG_CONFIG" NG_API_PUERTO)$1"; then
    rm -f "$f"; fallar api "no responde en $1"
  fi
  # Se cuenta con el Python del contenedor de la API: el ordenador puede no tenerlo.
  if ! NG_CUENTA="$(docker exec -i "$NG_PROYECTO-api" python -c 'import json,sys; print(len(json.load(sys.stdin)))' < "$f")"; then
    rm -f "$f"; fallar api "$1 no devuelve una lista JSON"
  fi
  rm -f "$f"
}

NG_FINAL_REGIONES=""
NG_FINAL_CONEXIONES=""
comprobacion_final() {
  local web
  web="$(leer_valor "$NG_CONFIG" NG_WEB_PUERTO)"
  [ "$(curl -sf "http://127.0.0.1:$web/" | grep -c 'id="root"' || true)" -ge 1 ] || fallar web "http://127.0.0.1:$web"
  comprobar_mcp
  [ "$NG_MCP_HERRAMIENTAS" = "$NG_ESPERADO_HERRAMIENTAS_MCP" ] \
    || fallar mcp "lista $NG_MCP_HERRAMIENTAS herramientas y se esperaban $NG_ESPERADO_HERRAMIENTAS_MCP"
  contar_api /regions; NG_FINAL_REGIONES="$NG_CUENTA"
  contar_api /connections; NG_FINAL_CONEXIONES="$NG_CUENTA"
  if [ "$NG_SALTAR_CARGA" = 1 ]; then
    [ "${NG_FINAL_REGIONES:-0}" -gt 0 ] || fallar api "no devuelve regiones"
    comprobar_recuentos NG_ESPERADO_HUERFANAS || fallar recuentos_base "$NG_RECUENTO_FALLIDO"
  elif [ "$NG_FINAL_REGIONES" != "$NG_ESPERADO_REGIONES" ] || [ "$NG_FINAL_CONEXIONES" != "$NG_ESPERADO_CONEXIONES" ]; then
    fallar api "da $NG_FINAL_REGIONES regiones y $NG_FINAL_CONEXIONES conexiones; se esperaban $NG_ESPERADO_REGIONES y $NG_ESPERADO_CONEXIONES"
  fi
}

pantalla_final() {
  local web tracto motivo linea_tracto
  web="$(leer_valor "$NG_CONFIG" NG_WEB_PUERTO)"
  tracto="$(leer_valor "$NG_ESTADO" NG_TRACTOGRAFIA)"
  motivo="$(leer_valor "$NG_ESTADO" NG_TRACTOGRAFIA_MOTIVO)"
  # shellcheck disable=SC2086  # set -- parte a proposito la cadena en tres numeros
  case "$tracto" in
    instalada) set -- $NG_ESPERADO_TRACTOGRAFIA; linea_tracto="tractografía: $1 tractos, $2 nodos" ;;
    ficha_en_conflicto) linea_tracto="tractografía: cargada, pero ${motivo,}" ;;
    *) linea_tracto="tractografía: pendiente — ${motivo:-sin motivo}"
       # Como repetirla, solo si el motivo no lo dice ya (B6).
       if [[ "$linea_tracto" != *"neurograph tractografia"* ]]; then
         if [[ "$linea_tracto" == *. ]]; then linea_tracto+=" Repite con: neurograph tractografia"
         else linea_tracto+="; repite con: neurograph tractografia"; fi
       fi ;;
  esac
  decir ""
  decir "NeuroGraph está instalado y encendido."
  decir "  Abrir:    icono «NeuroGraph» o  neurograph abrir   →  http://127.0.0.1:$web"
  decir "  Apagar:   icono «Apagar NeuroGraph» o  neurograph apagar"
  decir "  Datos:    $NG_FINAL_REGIONES regiones · $NG_FINAL_CONEXIONES conexiones · $linea_tracto"
  decir "  IAs:      $NG_IAS_RESUMEN"
  decir "            (las IAs solo ven NeuroGraph mientras está encendido)"
  [ -s "$NG_AVISOS_ARCHIVO" ] && { decir "  Avisos:"; mostrar_avisos; }
  decir "  Ayuda:    $NG_DIR/conectar-ia.md · registro: $NG_REGISTRO"
}
