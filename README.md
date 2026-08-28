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

**Fase 1 — Arquitectura (hecho).** El frontend (Vite + React +
TypeScript + Three.js + D3) renderiza el connectograma y el cerebro 3D,
con filtros (red / tipo de conectividad / peso), panel de detalle y
codificación visual de nivel de evidencia y dirección (secciones 5.1,
5.3, 24), todo sincronizado entre las dos vistas. El esquema de
PostgreSQL está aplicado en la base de datos real y comprobado
funcionalmente — ver `backend/database/migrations/`. Falta: decidir el
empaquetado de escritorio (Tauri) cuando haya Rust disponible.

**Fase 2 — Biblioteca de datos (en curso).** Manifiesto de biblioteca
(`.neurograph_library.yaml`), manifiesto de dataset (`dataset.yaml`) y
escaneo automático de una biblioteca (`scan_library_datasets`) hechos y
probados. Biblioteca real creada en `E:\NeuroData` (separada del
código, tal y como describe `docs/portabilidad.md`), con tabla `libraries`
en la base de datos (migración 0002) y su alta generada en
`backend/database/seed/register_library_neurodata.sql`. Falta: registrar
datasets concretos en la base de datos según se vayan incorporando datos
reales.

**Fase 3 — Neuroimagen (en curso).** Primer atlas real cargado:
HCP-MMP1.0 (Glasser et al., 2016) — especie, atlas, 360 regiones
corticales y sus 360 coordenadas reales (espacio de referencia
explícito: `fsLR_32k_S1200_groupavg_midthickness_MSMAll`, nunca
asumido como MNI/Talairach). El frontend ya las consume de verdad: si
`docker compose up -d` está corriendo, `GET /regions` las sirve y la
vista de desarrollo muestra el aviso verde "DATOS REALES" en vez del
amarillo "DATOS SINTÉTICOS" — nunca mezclados en la misma vista. Las
360 regiones ya están clasificadas en las 12 redes funcionales de
Cole-Anticevic (voto mayoritario de vértices, confidence y method
registrados por región — nunca inventado); el connectograma y el
cerebro 3D las colorean por red real en vez de mostrarlas todas del
mismo gris. Falta: conectividad real (Fase 4) para las líneas del
connectograma.

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

**1. Base de datos y API** (necesita Docker Desktop instalado):

```bash
cp .env.example .env             # y edita la contraseña
docker compose up -d
```

Esto levanta dos contenedores: Postgres (puerto 5432) y la API de
NeuroGraph (puerto 8420, `backend/Dockerfile`) — no hace falta tener
Python instalado para esto. Comprobar que responde:
`curl http://127.0.0.1:8420/health`.

**2. Frontend** (necesita Node.js instalado):

```bash
cd frontend
npm install
npm run dev
```

Abre la URL que imprima (normalmente `http://localhost:5173`). Si la API
del paso 1 está corriendo y tiene datos, verás el aviso verde "DATOS
REALES"; si no, cae automáticamente a datos sintéticos con aviso
amarillo — nunca los mezcla.

**3. Backend en desarrollo** (solo si vas a tocar código Python; para
solo usar la aplicación, el paso 1 ya es suficiente):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # En Windows: .venv\Scripts\activate
pip install -e ".[dev]"
pytest
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
