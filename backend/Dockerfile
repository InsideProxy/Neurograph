# Imagen de la API de NeuroGraph (sección 15). Se construye y ejecuta con
# `docker compose up -d` junto a la base de datos — no requiere tener
# Python instalado en el ordenador de la usuaria, solo Docker Desktop.
FROM python:3.10-slim

WORKDIR /app

# build-essential: por si numpy/scipy/psycopg necesitan compilar algo en
# vez de usar una rueda binaria para esta plataforma.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY backend ./backend

RUN pip install --no-cache-dir .

EXPOSE 8420

CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8420"]
