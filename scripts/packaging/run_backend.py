"""Punto de entrada del backend empaquetado con PyInstaller (decisión 54
de docs/analisis-arquitectura.md).

A diferencia del contenedor Docker (backend/Dockerfile, que enlaza a
0.0.0.0:8420 porque necesita aceptar conexiones desde fuera del propio
contenedor), el backend empaquetado solo necesita responder al propio
proceso de Tauri, en la misma máquina -- por defecto se enlaza a
127.0.0.1, nunca a 0.0.0.0, mismo criterio de aislamiento ya aplicado al
Postgres embebido (puerto/host configurables por variable de entorno para
poder probarlo a mano sin recompilar nada).

Importa `app` directamente (en vez de pasarle a uvicorn la cadena
"backend.api.main:app", que es como arranca hoy en Docker) a propósito:
así el análisis estático de PyInstaller VE la importación real y arrastra
consigo todo lo que backend.api.main importa de verdad (los routers, los
servicios, backend.core, etc.) -- una cadena de módulo:atributo dinámica
no se puede seguir de la misma forma al construir el ejecutable.
"""
from __future__ import annotations

import os

import uvicorn

from backend.api.main import app


def main() -> None:
    host = os.environ.get("NEUROGRAPH_BACKEND_HOST", "127.0.0.1")
    port = int(os.environ.get("NEUROGRAPH_BACKEND_PORT", "8420"))
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
