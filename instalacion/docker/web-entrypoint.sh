#!/bin/sh
# Arranque de la imagen web del instalador Linux (H10, B3 del diseno). En
# cada arranque (tambien tras apagar y abrir, que reutilizan el contenedor)
# copia la web compilada intacta a la carpeta de nginx y escribe en la
# copia el puerto de la API en lugar de la constante de
# frontend/src/data/api.ts. Si la constante no aparece exactamente una
# vez, no arranca: la web no podria hablar con la API.
set -eu
ORIGEN="${NG_WEB_ORIGEN:-/usr/share/neurograph/web-original}"
DESTINO="${NG_WEB_DESTINO:-/usr/share/nginx/html}"
SIGUIENTE="${NG_WEB_SIGUIENTE:-/docker-entrypoint.sh}"
CONSTANTE='http://127.0.0.1:8420'
PUERTO="${NG_API_PUERTO:-8420}"

# Entre 1 y 65535 y sin ceros delante (va tal cual a la URL). Hasta cinco
# cifras antes de comparar: un numero enorme no cabe en la comparacion.
case "$PUERTO" in
  ''|*[!0-9]*|0*|??????*) echo "neurograph-web: NG_API_PUERTO no es un puerto: '$PUERTO'" >&2; exit 1 ;;
esac
if [ "$PUERTO" -gt 65535 ]; then
  echo "neurograph-web: NG_API_PUERTO no es un puerto: '$PUERTO'" >&2; exit 1
fi
case "$DESTINO" in
  /|'') echo "neurograph-web: carpeta de destino no valida: '$DESTINO'" >&2; exit 1 ;;
esac

rm -rf "$DESTINO"
mkdir -p "$DESTINO"
cp -R "$ORIGEN"/. "$DESTINO"/
veces=$(find "$DESTINO" -name '*.js' -exec grep -hoF "$CONSTANTE" {} + | wc -l)
if [ "$veces" -ne 1 ]; then
  echo "neurograph-web: la constante $CONSTANTE aparece $veces veces en la web compilada (se esperaba 1); no se arranca." >&2
  exit 1
fi
if [ "$PUERTO" != 8420 ]; then
  find "$DESTINO" -name '*.js' -exec grep -lF "$CONSTANTE" {} + | while read -r archivo; do
    sed -i "s#http://127\.0\.0\.1:8420#http://127.0.0.1:$PUERTO#g" "$archivo"
  done
fi
echo "neurograph-web: API en el puerto $PUERTO"
exec "$SIGUIENTE" "$@"
