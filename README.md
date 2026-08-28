# NeuroGraph

Instrumento científico computacional de neuroinformática: permite
consultar, analizar y visualizar redes cerebrales (regiones, tractos,
conectividad, literatura, homologías entre especies) a partir de una
biblioteca de datos portátil. La IA (Claude u otro modelo) es su
intérprete, nunca su motor científico — ver
`docs/analisis-arquitectura.md` para el razonamiento completo y las
decisiones tomadas.

## Estado del proyecto

**Fase 0 — Entorno.** Repositorio, estructura de módulos, base de datos,
ontología inicial, sistema de biblioteca SSD y API mínima están
esqueletizados y probados. Todavía no hay lógica científica implementada:
eso llega en las fases siguientes (ver `docs/plan-de-desarrollo.md`).

## Estructura

```
backend/
├── core/            módulos científicos (neuroimagen, conectoma, grafos,
│                    espectral, evolución, neuropsicología)
├── library/         detección, integridad e indexación de la biblioteca SSD
├── ingestion/       importación de literatura, neuroimagen y datasets
├── ontology/        tipos de entidad y esquema de identificadores
├── database/        modelos SQLAlchemy, migraciones, repositorios
├── api/             API científica (FastAPI) — interfaz real e independiente de IA
├── mcp/             adaptador MCP sobre la API, para modelos de IA
├── ai/              proveedores de IA intercambiables (Claude, OpenAI, local...)
├── visualization/   produce descriptores de escena, no renderiza
├── tests/
└── config/          configuración (YAML + variables de entorno)

frontend/            (pendiente — Tauri + React + Three.js + D3, ver decisión de arquitectura)
docs/
scripts/
```

## Poner en marcha el entorno de desarrollo

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # En Windows: .venv\Scripts\activate
pip install -e ".[dev]"
pytest
```

Para la base de datos (necesita Docker Desktop instalado en tu ordenador):

```bash
cp .env.example .env             # y edita la contraseña
docker compose up -d
```

Para arrancar la API:

```bash
uvicorn backend.api.main:app --reload --port 8420
```

## Principios que gobiernan el diseño

- Los datos originales nunca se modifican; toda transformación genera un
  artefacto derivado con procedencia registrada (sección 3).
- Conectividad estructural, funcional y efectiva nunca se mezclan
  (sección 8).
- Dato observado, inferencia comparativa e hipótesis de homología se
  distinguen siempre explícitamente (sección 11, sección 24).
- La IA nunca inventa conexiones, homologías ni evidencia (sección 1).

Ver `docs/analisis-arquitectura.md` para el detalle completo.
