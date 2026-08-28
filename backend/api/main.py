"""API científica de NeuroGraph (sección 15).

Esta API es la interfaz real entre el motor científico y cualquier agente
externo (interfaz gráfica, MCP, u otro). Es independiente del proveedor de
IA: debe poder usarse por completo sin ningún modelo de lenguaje de por
medio (sección 22).

En esta fase (Fase 0/1 — entorno y arquitectura) solo se expone un
endpoint de estado. Las operaciones de la sección 15 (SEARCH_REGION,
GET_REGION, FIND_CONNECTIONS, BUILD_CONNECTOME, RENDER_BRAIN, ...) se irán
añadiendo fase a fase, cada una respaldada por su módulo correspondiente
en backend/core/, nunca improvisadas aquí.
"""
from __future__ import annotations

from fastapi import FastAPI

from backend.config.settings import get_settings

app = FastAPI(
    title="NeuroGraph API",
    description="Interfaz científica de NeuroGraph. Ver especificación maestra, sección 15.",
    version="0.1.0",
)


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "ai_provider": settings.ai.provider,
        "library_configured": settings.library.path is not None,
    }
