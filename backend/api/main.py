"""API científica de NeuroGraph (sección 15).

Esta API es la interfaz real entre el motor científico y cualquier agente
externo (interfaz gráfica, MCP, u otro). Es independiente del proveedor de
IA: debe poder usarse por completo sin ningún modelo de lenguaje de por
medio (sección 22).

Fase 0/1: solo un endpoint de estado. Fase 3: `GET /regions` (versión
mínima de SEARCH_REGION). El resto de operaciones de la sección 15
(FIND_CONNECTIONS, BUILD_CONNECTOME, RENDER_BRAIN, ...) se irán añadiendo
fase a fase, cada una respaldada por su módulo correspondiente en
backend/core/ y su propio router en backend/api/routers/, nunca
improvisadas aquí.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routers.regions import router as regions_router
from backend.config.settings import get_settings

app = FastAPI(
    title="NeuroGraph API",
    description="Interfaz científica de NeuroGraph. Ver especificación maestra, sección 15.",
    version="0.1.0",
)

# CORS abierto a los orígenes de desarrollo local del frontend (Vite).
# Esta API solo escucha en localhost (ver backend/config/default.yaml,
# api.host = 127.0.0.1): no hay riesgo de exponer esto a la red.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(regions_router)


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "ai_provider": settings.ai.provider,
        "library_configured": settings.library.path is not None,
    }
