# Imagen de herramientas del instalador Linux (H10, B2 del diseno): la de
# la API (Python 3.10, numpy, nibabel y el backend) mas el cliente de
# Docker, curl y scripts/, para ejecutar scripts/install_tractography.sh
# sin pedir nada al ordenador. Lleva scripts/ dentro para que
# "neurograph tractografia" funcione sin la carpeta del proyecto.
ARG IMAGEN_API=neurograph-app-api
FROM docker:28-cli AS cliente
FROM ${IMAGEN_API}
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=cliente /usr/local/bin/docker /usr/local/bin/docker
# --chmod (BuildKit): ejecutables aunque la copia del proyecto haya perdido
# los permisos; el paso 8 los lanza ademas con bash.
COPY --chmod=0755 scripts ./scripts
# Un clon de Git para Windows convierte los saltos de linea a CRLF, y bash
# no ejecutaria los scripts: se quita el CR al copiarlos (H11).
RUN sed -i 's/\r$//' scripts/*.sh
