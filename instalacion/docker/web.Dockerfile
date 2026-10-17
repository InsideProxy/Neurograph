# Web de NeuroGraph para el instalador Linux (H10, B3 del diseno). Se
# compila con npm ci (respetando frontend/.npmrc, H9) y se sirve con nginx,
# solo archivos estaticos. La web compilada se guarda intacta aparte: el
# arranque la copia y escribe el puerto de la API (web-entrypoint.sh).
# nginx en su rama estable (minor par), que recibe actualizaciones.
FROM node:22-bookworm-slim AS compilacion
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:1.30-alpine
COPY instalacion/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/frontend/dist /usr/share/neurograph/web-original
# --chmod (BuildKit): ejecutable aunque la copia del proyecto haya perdido los permisos.
COPY --chmod=0755 instalacion/docker/web-entrypoint.sh /usr/local/bin/neurograph-web-entrypoint.sh
# Un clon de Git para Windows convierte los saltos de linea a CRLF, y el
# script no arrancaria: se quita el CR al copiarlo (H11).
RUN sed -i "s/$(printf '\r')\$//" /usr/local/bin/neurograph-web-entrypoint.sh \
    && chmod 0755 /usr/local/bin/neurograph-web-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/neurograph-web-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
