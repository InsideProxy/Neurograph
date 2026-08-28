"""Prueba de regresión del fallo real del 28/08/2026 (riesgo 12 en
docs/analisis-arquitectura.md): con un origen CORS fijo a un solo puerto
(5173), reiniciar el servidor de desarrollo del frontend en cualquier
otro puerto (p. ej. 5174, cuando 5173 seguía ocupado por un proceso
anterior que no había liberado el puerto) hacía que el navegador
bloqueara todas las peticiones a la API por CORS -- un error que en la
consola no se parecía en nada a su causa real.
"""
from fastapi.testclient import TestClient

from backend.api.main import app


def test_cors_allows_any_localhost_dev_port():
    client = TestClient(app)
    for port in (5173, 5174, 5175, 41231):
        response = client.get("/health", headers={"Origin": f"http://localhost:{port}"})
        assert response.headers.get("access-control-allow-origin") == f"http://localhost:{port}"


def test_cors_allows_127_0_0_1_too():
    client = TestClient(app)
    response = client.get("/health", headers={"Origin": "http://127.0.0.1:5174"})
    assert response.headers.get("access-control-allow-origin") == "http://127.0.0.1:5174"


def test_cors_rejects_non_localhost_origin():
    client = TestClient(app)
    response = client.get("/health", headers={"Origin": "http://example.com"})
    assert response.headers.get("access-control-allow-origin") is None
