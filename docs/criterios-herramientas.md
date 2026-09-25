# NeuroGraph — Criterios de herramientas

Reglas vigentes para instalar, poner en marcha, cargar datos, empaquetar y mantener NeuroGraph. Entre paréntesis va la entrada del log de la que sale cada criterio (números: §7 de `docs/analisis-arquitectura.md`, «riesgo N» es su §6; H: `docs/decisiones-herramientas.md`).

## Entornos

- **Hay dos bases de datos distintas:**
  - la de **desarrollo**: Docker (`neurograph-postgres`, pgvector sobre PostgreSQL 16) más la API en el contenedor `neurograph-api` y Vite en el 5173;
  - la del **ejecutable**: un Postgres embebido en el puerto 5433 (`trust`, solo loopback) con el backend empaquetado.

  Todo SQL nuevo se aplica en las dos. (54, 64)
- **Configuración** (`backend/config/settings.py`):
  - prioridad: variables de entorno > `.env` > `default.yaml` > valores por defecto;
  - `.env` se busca en una ruta absoluta de la raíz del repositorio;
  - en Docker se usa `NEUROGRAPH_DATABASE__HOST=postgres`;
  - los tests usan un `.env` temporal, nunca el real.

  (riesgo 9, 31, 32)
- **Python:**
  - el entorno virtual se crea en la raíz, donde está `pyproject.toml`, con `pip install -e ".[dev]"`;
  - las dependencias de los scripts de un solo uso (`vtk`, `scikit-image`, `pygltflib`, `trimesh`) no entran en `pyproject.toml` y se importan de forma perezosa.

  (27, 31, 49, 63)
- **Cliente MCP:** `.mcp.json` en la raíz, con el Python del entorno virtual, `-m backend.mcp.server` y la contraseña por variable de entorno. (32)
- **`node_modules` no sirve de una plataforma a otra.** En Windows y en Linux se instala por separado. (18)

## Carga de SQL y codificación

- **Carga:**
  - siempre con `docker cp` + `psql -f` (`scripts/apply_sql.ps1` en Windows, `scripts/rebuild_db_from_sql.sh` en Linux);
  - nunca por una tubería de PowerShell, que corrompe las tildes y las eñes;
  - cada archivo va en una transacción.

  (riesgo 7, 41, H1)
- **Generar SQL desde PowerShell:**
  - nunca con `>`, porque escribe UTF-16 y `psql` falla;
  - se escribe en UTF-8 sin BOM, o deja que la herramienta escriba su propio archivo (`pg_dump -f`);
  - antes de aplicar un SQL grande se comprueban sus primeros bytes.

  (66, 67)
- **Codificación de los scripts:**
  - los scripts de Python que generan SQL lo escriben en UTF-8: si lo imprimen, la primera línea de `main()` es `sys.stdout.reconfigure(encoding="utf-8")`; si lo escriben en un archivo, con `encoding="utf-8"`;
  - los `.ps1` con tildes se guardan en UTF-8 con BOM.

  (riesgo 17, 53)

## Ingesta

- **Cómo se ingiere un dato:**
  - un módulo lector puro en `backend/ingestion/`, sin base de datos ni SQL;
  - un script `scripts/register_*.py` o `generate_*.py` que genera SQL idempotente (`INSERT … ON CONFLICT (id) DO UPDATE`) sin conectarse a ninguna base.

  La salida `salida_*.sql` va en la raíz y se sube a git si pesa menos de 100 MB. (12, 40, 46, 69)
- **El SQL de alta lo escriben funciones del proyecto** (`study_insert_sql`, `dataset_insert_sql`, `evidence_insert_sql`), nunca una persona a mano. (20, 22)
- **Un backfill reutiliza la misma función de la ingesta real** y genera un `UPDATE` para revisar. Si una columna nueva va en una tabla con filas, se crea NULLable y se rellena con un backfill explícito, nunca con un valor por defecto silencioso. (12, 15, 51, 63)
- **Formatos nuevos:** se siguen los pasos de `docs/protocolo-ingesta-ia.md`. (46)
- **Cada SQL nuevo se prueba en un Postgres desechable**, aplicándolo dos veces para comprobar que es idempotente. Nunca se prueba contra la base real. (73, H1)

## Migraciones

- **Se generan con Alembic y sin conexión** (`alembic upgrade --sql`) en `backend/database/migrations/generated/`:
  - antes de escribir una, se comprueban el head real y `alembic_version`;
  - primero se aplican las migraciones y después los datos;
  - los `*_verify.sql` no son migraciones.

  (15, 20, 47, 55)
- **Si el objeto ya existe y es idéntico**, se sincroniza `alembic_version`; nunca se hace DROP ni se recrea. (30)
- **Ejecutable:**
  - cada migración nueva se copia a `frontend/src-tauri/resources/migrations/`;
  - el Postgres embebido solo migra en el primer arranque;
  - en una instalación existente se aplica con `scripts/apply_migration_embedded.ps1`, con la aplicación abierta.

  (64, 66)

## Reconstruir la base y volcados

- **Con volcado,** se carga el volcado. **Sin volcado,** `scripts/rebuild_db_from_sql.sh` aplica las migraciones y los `.sql` del repositorio en orden de dependencias (ver `backend/database/migrations/README.md`). (53, H1)
- **Lo que la reconstrucción no incluye:** los tractos ORG, sus geometrías y los nodos y aristas de tractografía. Se regeneran con `scripts/generate_org_tractography_geometry.py` y `scripts/generate_hybrid_tractography_nodes.py` a partir de los originales, publicados en Zenodo:
  - `ORG-800FiberClusters.zip`: registro 2648292, md5 `ee5f73e15d28f177e65ba38dbb6c8a7a`;
  - `100HCP-population-mean-wmparc.nii.gz`: registro 8082481, md5 `b8bec868a3cc878dcfc62c704ba15e4b`.

  (H1)
- **La instantánea del instalador** (`neurograph_snapshot.sql`):
  - sale solo del Postgres embebido, con `scripts/export_snapshot_embedded.ps1`;
  - excluye `alembic_version` y `mcp_call_log`;
  - se valida contando las filas de los bloques `COPY`.

  (53, 67)

## Ejecutable (Tauri)

- **Estructura:**
  - Tauri v2, con el identificador `com.neurograph.desktop`;
  - los datos van en `app_data_dir()`: `pgdata/`, `logs/` y el marcador `.setup_complete`.

  (54)
- **Primer arranque:**
  - por orden: `initdb`, crear la base, migraciones, volcado, backend y comprobar `/health`;
  - el marcador solo se escribe si todo acaba bien;
  - si algo falla, se escribe `setup_error.log` y la aplicación se cierra.

  (54, 55)
- **Al cerrar,** primero se para el backend y después Postgres. (54, 55)
- **`resources/`:**
  - contiene `postgres/` (con pgvector, sin pgAdmin, StackBuilder, `doc/` ni `include/`), `migrations/`, `backend/` y el volcado;
  - se puebla siguiendo `resources/README.md` y está fuera de git.

  (55, 58, 70)
- **Instalador:**
  - solo NSIS, sin MSI;
  - `resources/` debe pesar menos de unos 2 GB;
  - solo se distribuye el instalador firmado, nunca la carpeta del proyecto.

  (70)
- **Backend empaquetado:**
  - todo cambio en `backend/` exige ejecutar `scripts/rebuild_backend.ps1`, con la aplicación cerrada;
  - `backend.spec` excluye Qt, Jupyter y `dipy`;
  - escucha en 127.0.0.1.

  (56, 65, 70)
- **Docker:** tras cambiar el backend, `docker compose up -d --build`. (38)
- **Firma:**
  - es autofirmada, con SHA-256 y sello de tiempo;
  - SmartScreen sigue avisando, porque eso solo se evita con un certificado de pago.

  (68)

## Publicación y licencia

- **Repositorio:**
  - `github.com/InsideProxy/Neurograph`, rama `master`;
  - los archivos de más de 100 MB se quedan fuera de git;
  - no se fabrica historial.

  (69)
- **Licencia:** CC BY-SA 4.0 para todo el proyecto. Los datos de terceros conservan su licencia original. (68)

## Pruebas y convenciones de código

- **Backend:**
  - se prueba con `pytest` y `ruff check`;
  - las pruebas usan datos sintéticos (`tmp_path`);
  - las que necesitan la biblioteca real se saltan si no está montada.

  (28, 46, 49)
- **Frontend:**
  - se prueba con `npx tsc -b`, `npm test` (vitest), `npm run lint` (oxlint) y `npm run build`;
  - solo la lógica pura de `src/logic/` lleva tests;
  - los componentes se comprueban visualmente.

  (42, 43, 50)
- **Avisos aceptados:** `ruff` B008 (`Depends` como valor por defecto) y el `set-state-in-effect` de oxlint al marcar «cargando». (27, 50)
- **Lógica pura separada** de React, three.js y los endpoints, para probarla sin base ni render. Cada criterio tiene una sola implementación, que se reutiliza (`exportSvgAsJpeg`, `regionDisplayText`, `DISPLAY_SCALE`, `ReferenceMesh`, `_mesh_io`). (13, 14, 22, 63)
- **React:**
  - lo que tiene efectos secundarios (por ejemplo `OrbitControls`) se crea en `useEffect`, con su `dispose()`, y nunca en `useMemo`, porque `StrictMode` duplica las factorías;
  - los elementos `threeXxx` de react-three-fiber se registran con `extend`.

  (riesgo 12, riesgo 16)
- **Motivos en el código:** las exclusiones y las constantes no obvias llevan escrito su motivo en el propio código. (55, 56, 60)
- **Mallas:**
  - las generan scripts de un solo uso con marching cubes (nivel 0,5 sobre la máscara) y el affine real;
  - se verifican antes de escribirlas;
  - `frontend/public/meshes/` no se edita a mano.

  (22, 63, 72)
- **Documentación:** tras tocar criterios, logs o un CLAUDE.md, `python3 scripts/check_docs.py` debe dar OK. (H2)
