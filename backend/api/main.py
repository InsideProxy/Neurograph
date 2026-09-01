"""API científica de NeuroGraph (sección 15).

Esta API es la interfaz real entre el motor científico y cualquier agente
externo (interfaz gráfica, MCP, u otro). Es independiente del proveedor de
IA: debe poder usarse por completo sin ningún modelo de lenguaje de por
medio (sección 22).

Fase 0/1: solo un endpoint de estado. Fase 3: `GET /regions` (versión
mínima de SEARCH_REGION). Fase 4: `GET /connections`
(FIND_CONNECTIONS). `GET /connectivity/induced` (30/08/2026) responde a
la selección múltiple de la interfaz: conexiones inducidas entre varias
regiones a la vez y, si las hay, los tractos con nombre que las
conectan (con su cita real). Fase 5: `GET /graph-metrics`, que conecta el
motor matemático de `backend/core/graph/` a las regiones y
conexiones reales (BUILD_CONNECTOME empieza aquí a devolver algo
más que la lista de aristas). `GET /tracts` (Fase 10, 31/08/2026):
versión mínima de SEARCH_TRACT, antes solo disponible de forma
incidental dentro de `/connectivity/induced`. El resto de operaciones de
la sección 15 (RENDER_BRAIN, ...) se irán añadiendo fase a fase, cada
una respaldada por su módulo correspondiente en backend/core/ y su
propio router en backend/api/routers/, nunca improvisadas aquí.

Desde la Fase 10, cada endpoint delega en
`backend/api/services/*_service.py`: las herramientas MCP
(`backend/mcp/server.py`) llaman a esos mismos servicios, nunca a una
lógica paralela (ver docstring de `backend/mcp/server.py`).
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routers.connections import router as connections_router
from backend.api.routers.connectivity import router as connectivity_router
from backend.api.routers.graph_metrics import router as graph_metrics_router
from backend.api.routers.regions import router as regions_router
from backend.api.routers.tracts import router as tracts_router
from backend.config.settings import get_settings

app = FastAPI(
    title="NeuroGraph API",
    description="Interfaz científica de NeuroGraph. Ver especificación maestra, sección 15.",
    version="0.1.0",
)

# CORS abierto a los orígenes de desarrollo local del frontend (Vite).
# Esta API solo escucha en localhost (ver backend/config/default.yaml,
# api.host = 127.0.0.1): no hay riesgo de exponer esto a la red.
#
# Un puerto fijo (antes solo 5173) se demostró frágil el 28/08/2026: si
# el proceso de "npm run dev" anterior no libera el puerto a tiempo (p.
# ej. al cerrar la ventana de PowerShell sin Ctrl+C), Vite arranca en el
# siguiente puerto libre (5174, 5175...) sin avisar de forma llamativa, y
# el navegador bloquea la petición por CORS con un error que no tiene
# nada que ver con la causa real. Con localhost/127.0.0.1 en cualquier
# puerto basta, porque el origen ya está acotado a la propia máquina.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(regions_router)
app.include_router(connections_router)
app.include_router(connectivity_router)
app.include_router(graph_metrics_router)
app.include_router(tracts_router)


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "ai_provider": settings.ai.provider,
        "library_configured": settings.library.path is not None,
    }
