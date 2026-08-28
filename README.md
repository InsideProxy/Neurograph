# NeuroGraph

Instrumento científico computacional de neuroinformática: permite
consultar, analizar y visualizar redes cerebrales (regiones, tractos,
conectividad, literatura, homologías entre especies) a partir de una
biblioteca de datos portátil. La IA (Claude u otro modelo) es su
intérprete, nunca su motor científico — ver
`docs/analisis-arquitectura.md` para el razonamiento completo y las
decisiones tomadas.

## Estado del proyecto

**Fase 0 — Entorno (hecho).** Repositorio, estructura de módulos, base de
datos, ontología inicial, sistema de biblioteca SSD y API mínima están
esqueletizados y probados.

**Fase 1 — Arquitectura (en marcha).** El frontend (Vite + React +
TypeScript + Three.js + D3) renderiza el connectograma y el cerebro 3D con
datos sintéticos, con filtros (red / tipo de conectividad / peso), panel
de detalle y codificación visual de nivel de evidencia y dirección
(secciones 5.1, 5.3, 24), todo sincronizado entre las dos vistas. Falta:
esquema definitivo de PostgreSQL con Alembic (pendiente de que actives
Docker), y decidir el empaquetado de escritorio (Tauri) cuando haya Rust
disponible.

**Fase 5 — Matemática (adelantada).** `backend/core/graph/` ya calcula,
con NetworkX/NumPy/SciPy y sin depender de la base de datos: matriz de
adyacencia, matriz de grados, Laplaciano (explícito), autovalores/
autovectores, embedding espectral, detección de comunidades, modularidad,
centralidad (grado/intermediación/autovector), coeficiente de
participación, rich-club y caminos mínimos. 12 pruebas, todas en verde.

Todavía no hay datos científicos reales conectados a estos módulos: eso
llega cuando la biblioteca de datos (Fase 2) y la base de datos alimenten
al motor con conexiones reales.

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
