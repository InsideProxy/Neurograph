# NeuroGraph

Instrumento científico computacional de neuroinformática: permite
consultar, analizar y visualizar redes cerebrales (regiones, tractos,
conectividad, literatura, homologías entre especies) a partir de una
biblioteca de datos portátil. La IA (Claude u otro modelo) es su
intérprete, nunca su motor científico — ver
`docs/analisis-arquitectura.md` para el razonamiento completo y las
decisiones tomadas.

<img width="1046" height="657" alt="image" src="https://github.com/user-attachments/assets/a3e95195-5064-474f-bfaf-5fae878cd3a2" />

<img width="1349" height="866" alt="image" src="https://github.com/user-attachments/assets/d133299a-e3f2-41a0-ba80-619c86aff0f1" />

<img width="1359" height="786" alt="image" src="https://github.com/user-attachments/assets/992c16b9-b619-4079-969f-e5c357a86b7a" />


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
mismo gris. Segundo atlas cortical cargado: Gordon 333 (Gordon et
al., 2016, DOI 10.1093/cercor/bhu239) — 333 regiones y sus propias
12 redes (no las de Cole-Anticevic: son dos clasificaciones
distintas, aunque coincidan en algún nombre — ver el riesgo anotado
en `docs/analisis-arquitectura.md`). El mismo archivo declaraba 19
estructuras subcorticales sin ningún dato real detrás (comprobado,
no asumido); en su lugar se dio de alta la segmentación subcortical
real que sí trae el espacio de grayordinates del HCP (19
estructuras: amígdala, hipocampo, tálamo... más cerebelo y tronco
del encéfalo) como su propio atlas, citando a quien de verdad la
define (Glasser et al., 2013, DOI 10.1016/j.neuroimage.2013.04.127),
no a Gordon et al. El color de cada red en la interfaz ya se resuelve
por `<fuente>.<red>` (no solo por el nombre corto): dos redes de
atlas distintos con el mismo nombre ("Default", "Visual"...) nunca
comparten color sin aviso.

**Fase 4 — Conectividad (en curso).** Segundo atlas real: Brainnetome
(246 regiones, coordenadas volumétricas reales en MNI152). Conectividad
estructural real derivada de sus mapas de probabilidad de tractografía
(30 135 conexiones, media simetrizada sin umbral — decisión tomada con
la usuaria; cada una con `evidence_level=indirect` explícito, nunca
asumido). Nuevo `GET /connections` y un selector de atlas en el
frontend (HCP-MMP1.0 con redes, o Brainnetome con conectividad — nunca
los dos a la vez).

Cierre de cabos sueltos de las Fases 3/4: cada atlas ya cargado enlaza
ahora de forma estructurada con la publicación que lo define
(`atlases.study_id`), en vez de solo llevar la cita como texto suelto en
su nombre — DOI verificados directamente en la web del editor, no
adivinados.

**Fase 5 — Matemática (en curso).** `backend/core/graph/` calcula, con
NetworkX/NumPy/SciPy: matriz de adyacencia, matriz de grados, Laplaciano
(explícito), autovalores/autovectores, embedding espectral, detección de
comunidades, modularidad, centralidad (grado/intermediación/autovector),
coeficiente de participación, rich-club y caminos mínimos. Desde el
28/08/2026 ya está conectado a datos reales: `GET /graph-metrics?atlas_id=...`
construye el grafo con las regiones y conexiones reales de un atlas (un
par con peso exactamente 0 se excluye, nunca cuenta como conexión débil)
y devuelve sus métricas. Probado con la conectividad real de Brainnetome
(246 nodos, 15 803 aristas, ~3 s): encuentra 3 comunidades y sitúa el
tálamo como la estructura más central, coherente con la literatura. De
paso se encontró y corrigió un error real en la centralidad de
intermediación, que invertía conexiones fuertes y débiles (nunca
detectado antes porque las pruebas solo usaban pesos uniformes). Total:
21 pruebas del motor matemático, todas en verde. Gordon 333 no tiene
ninguna conexión cargada todavía, así que ahí el endpoint responde
pero no aporta nada útil hasta que haya conectividad real que
analizar.

**Conectividad tracto-región sobre HCP-MMP1.0 (29/08/2026).** Yeh FC
(2022, *Nature Communications*, DOI 10.1038/s41467-022-32595-4):
probabilidad poblacional (1065 sujetos) de que cada uno de 26 tractos
de sustancia blanca nombrados atraviese cada una de las 180 áreas de
HCP-MMP1.0, por hemisferio. No es una conexión región-región — se
decidió con la usuaria no inferirla — así que el tracto es su propia
entidad `Tract` en el grafo (52 = 26 x 2 hemisferios), con conexiones
tracto -> región (9360, sin umbral, incluido el 75,3% en probabilidad
exactamente 0.0).

**Cerebelo — distribución de redes, sin voto mayoritario único (29/08/2026).** El tálamo ya estaba cubierto (Brainnetome + tractos corticotalámicos de Yeh); el cerebelo no tenía ninguna conexión. Sin descargar nada nuevo: el archivo de Cole-Anticevic ya usado para las redes de HCP-MMP1.0 trae también redes reales para el cerebelo (100% de sus 17 853 grayordinates). Forzar un único ganador (como se hace para HCP-MMP1.0) sería engañoso aquí — la red mayoritaria del cerebelo apenas llega al 30% — así que se registra la distribución completa (10 de 12 redes por hemisferio, confianzas que suman 1.0).

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
python -m venv .venv             # desde la raíz del repositorio, NUNCA
                                  # desde dentro de backend/ -- pyproject.toml
                                  # vive en la raíz, no en backend/
source .venv/bin/activate        # En Windows: .venv\Scripts\activate
pip install -e ".[dev]"
pytest
```

**4. Conectar un cliente MCP real** (p. ej. Claude Desktop) al servidor
de `backend/mcp/server.py` -- necesita el paso 1 (Postgres arrancado) y el
paso 3 (entorno virtual con `pip install -e ".[dev]"` ya hecho):

Edita `%APPDATA%\Claude\claude_desktop_config.json` (Windows; en macOS es
`~/Library/Application Support/Claude/claude_desktop_config.json`) y
añade una entrada bajo `mcpServers`, usando el `python.exe` del propio
entorno virtual (nunca `python` a secas: así no depende de qué `PATH`
tenga el proceso que lo arranca) y la contraseña real de tu Postgres
(la misma que pusiste en `.env`) por variable de entorno explícita, para
no depender de si `.env` se carga o no:

```json
{
  "mcpServers": {
    "neurograph": {
      "command": "E:\\Neurograph\\.venv\\Scripts\\python.exe",
      "args": ["-m", "backend.mcp.server"],
      "env": {
        "NEUROGRAPH_DATABASE__PASSWORD": "tu-contraseña-real-de-postgres"
      }
    }
  }
}
```

Guarda, cierra Claude Desktop del todo y vuelve a abrirlo. Si el servidor
no aparece, revisa `%APPDATA%\Claude\logs\mcp-server-neurograph.log`.

## Principios que gobiernan el diseño

- Los datos originales nunca se modifican; toda transformación genera un
  artefacto derivado con procedencia registrada (sección 3).
- Conectividad estructural, funcional y efectiva nunca se mezclan
  (sección 8).
- Dato observado, inferencia comparativa e hipótesis de homología se
  distinguen siempre explícitamente (sección 11, sección 24).
- La IA nunca inventa conexiones, homologías ni evidencia (sección 1).

Ver `docs/analisis-arquitectura.md` para el detalle completo.

## Licencia

NeuroGraph (código, documentación, esquema de base de datos y activos
visuales) es de Juan Boza ("Proxy") — Instituto Dédalus, y se distribuye
bajo **Creative Commons Reconocimiento-CompartirIgual 4.0 Internacional
(CC BY-SA 4.0)** — ver el archivo [`LICENSE`](./LICENSE) para el texto
completo y el resumen en lenguaje llano.

Esto NO cubre los datos científicos de terceros que NeuroGraph consulta
o carga (atlas, tractografía, estudios publicados) — cada uno conserva
la licencia/términos de su propia fuente original, citada en
`docs/analisis-arquitectura.md` junto a cada dataset.
