# CLAUDE.md — backend

Reglas para trabajar en `backend/`. Las generales están en el CLAUDE.md de la raíz.

## Leer antes de tocar

- Datos, API o MCP: `docs/criterios-funcionales.md`.
- Migraciones, ingesta o configuración: `docs/criterios-herramientas.md`.

## Reglas

- **Servicios.** La lógica de consulta vive en `api/services/`, dividida en una función pura, probada sin base de datos, y otra que solo añade la consulta. Los routers y las herramientas MCP (`mcp/server.py`) delegan en ella. Un servicio nunca importa de un router.
- **Errores.** Una entidad que no existe da 404 (`ValueError` en el servicio), nunca una respuesta vacía.
- **MCP.** Toda herramienta nueva lleva `audited_tool` (`mcp/audit.py`).
- **Ingesta.** El lector de `ingestion/` es puro: no toca la base de datos ni escribe SQL. Ante cualquier forma inesperada lanza un `ValueError` que la explica. El SQL lo genera un script de `scripts/`.
- **Esquema.** Solo cambia por migración de Alembic (`database/migrations/`), con el SQL generado sin conexión en `database/migrations/generated/`. Una columna nueva en una tabla con filas va NULLable y con un backfill explícito.

## Verificar (desde la raíz, con el entorno virtual)

- `pytest` y `ruff check`.
- Las pruebas usan datos sintéticos (`tmp_path`); las que necesitan la biblioteca real se saltan si no está montada.
- Tras cambiar el backend, reconstruir: `docker compose up -d --build` en desarrollo, y `scripts/rebuild_backend.ps1` para el ejecutable, con la aplicación cerrada.
