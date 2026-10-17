# NeuroGraph — Criterios de herramientas

Reglas vigentes para instalar, poner en marcha, cargar datos, empaquetar y mantener NeuroGraph. Entre paréntesis va la entrada del log de la que sale cada criterio (números: §7 de `docs/analisis-arquitectura.md`, «riesgo N» es su §6; H: `docs/decisiones-herramientas.md`).

## Entornos

- **Hay cuatro bases de datos distintas, que no se sincronizan:**
  - la de **desarrollo**: Docker (`neurograph-postgres`, pgvector sobre PostgreSQL 16) más la API en el contenedor `neurograph-api` y Vite en el 5173;
  - la del **ejecutable** (solo Windows): un Postgres embebido en el puerto 5433 (`trust`, solo loopback) con el backend empaquetado;
  - la del **instalador Linux**: Docker, con el proyecto `neurograph-app` y el volumen `neurograph-app-datos`; Postgres no expone ningún puerto en el ordenador;
  - la del **instalador Windows**: Docker Desktop, con el mismo proyecto y el mismo volumen que en Linux; Postgres tampoco expone ningún puerto.

  La embebida es la única fuente de la instantánea del instalador del ejecutable: lo que deba llegar a él se aplica en ella. En Linux existen la de desarrollo y la del instalador; en Windows pueden convivir la de desarrollo, la del ejecutable y la del instalador. (54, 64, 67, H4, H10, H11)
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
- **Cliente MCP:** `.mcp.json` en la raíz, con el Python del entorno virtual de Windows (`E:\Neurograph\.venv`), `-m backend.mcp.server` y la contraseña de desarrollo por defecto por variable de entorno. En Linux, con esa ruta, el servidor no arranca. (32, H6)
- **`node_modules` no sirve de una plataforma a otra.** En Windows y en Linux se instala por separado. (18)
- **Preparación antes de arrancar:** `npm run dev`, `npm run build` y `npm run tauri` ejecutan primero `frontend/scripts/prepare.mjs`, dentro del propio script para que valga con `ignore-scripts=true`; en `tauri`, antes de lanzar la CLI, que en Windows no se puede sustituir mientras corre. Sus pasos van en orden, callan si no hay nada que hacer y, si fallan, paran el arranque. El primero hace `npm install`, con la configuración de npm del usuario, si `node_modules` no tiene lo de `frontend/package-lock.json`; un opcional que falte no cuenta. (H5)
- **`frontend/.npmrc`:** `ignore-scripts=true` (no ejecuta los scripts de instalación de las dependencias, el vector de los ataques a la cadena de suministro de npm) y `min-release-age=3` (con npm >= 11.10, rechaza instalar una versión publicada hace menos de tres días; un npm más viejo lo ignora en silencio y el paso de preparación avisa entonces). No se desactiva. (H9)

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
  - los `.ps1` con caracteres no ASCII (tildes, eñes, «¿») se guardan en UTF-8 con BOM.

  (riesgo 17, 53)

## Ingesta

- **Cómo se ingiere un dato:**
  - un módulo lector puro en `backend/ingestion/`, sin base de datos ni SQL;
  - un script `scripts/register_*.py` o `generate_*.py` que genera SQL idempotente (`INSERT … ON CONFLICT (id) DO UPDATE`) sin conectarse a ninguna base.

  La salida `salida_*.sql` va en `init/`, la carga inicial de la base, que se sube a git. Nunca en `data/`: `.gitignore` la reserva para datos científicos locales (`docs/portabilidad.md`). (12, 40, 46, 69, H3)
- **`init/` solo lleva la carga inicial ligera.** Un SQL generado que pese más de unos 50 MB no va a `init/` ni a git: se genera durante la instalación a partir de sus originales, como la tractografía. GitHub avisa a partir de 50 MB y rechaza los archivos de más de 100 MB. (69, H4, H6)
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

- **Con volcado,** se aplican las migraciones y después el volcado, que solo lleva datos (de Docker, con `scripts/export_snapshot.ps1`; del embebido, con `scripts/export_snapshot_embedded.ps1`). **Sin volcado,** se aplican las migraciones y los 24 `.sql` de la carga inicial (15 de `init/` y 9 de `backend/database/seed/`) en orden de dependencias: en Linux, `scripts/rebuild_db_from_sql.sh` de una vez; en Windows, uno a uno con `scripts/apply_sql.ps1` (ver `backend/database/migrations/README.md`). (53, 67, H1)
- **Tractografía ORG:** no está en la carga inicial ni en git. La instala `scripts/install_tractography.sh` (solo Linux), después de la carga inicial:
  - descarga de Zenodo los originales a la biblioteca y comprueba su md5: `ORG-800FiberClusters.zip` (registro 2648292, md5 `ee5f73e15d28f177e65ba38dbb6c8a7a`) y `100HCP-population-mean-wmparc.nii.gz` (registro 8082481, md5 `b8bec868a3cc878dcfc62c704ba15e4b`). Una descarga cortada sigue donde se quedó; si el servidor no lo acepta, empieza de cero una vez;
  - genera el SQL en `derived/tractograms/` de la biblioteca, con `vtk` en un entorno temporal que solo instala ruedas de PyPI, nunca un `setup.py`;
  - no carga nada si los recuentos no son los del log: 41 tractos, 523 696 streamlines reales y 12 300 mostradas; 176 nodos y 5176 aristas;
  - cada dataset va en su carpeta con su ficha (`dataset.yaml`), y la biblioteca, con su manifiesto; la biblioteca es `NEUROGRAPH_LIBRARY__PATH`, o `~/NeuroData`.

  (49, 66, H1, H4, H8, H10)
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
  - por orden: `initdb`, arrancar Postgres, crear la base, migraciones y volcado; el marcador solo se escribe si todo eso acaba bien;
  - después arranca el backend y se comprueba `/health`;
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

  (55, 56, 65, 70)
- **Docker:** tras cambiar el backend, `docker compose up -d --build`. (39)
- **Firma:**
  - es autofirmada, con SHA-256 y sello de tiempo;
  - SmartScreen sigue avisando, porque eso solo se evita con un certificado de pago.

  (68)

## Instalador Linux

- **Todo va en `instalacion/`.** Reutiliza tal cual `backend/Dockerfile` y `scripts/rebuild_db_from_sql.sh`. Fuera de esa carpeta solo se toca `scripts/install_tractography.sh`, que es nuestro, y solo para lo que el instalador necesita. (H10)
- **Cada paso verifica con recuentos reales.** Las cifras esperadas se definen en `instalacion/linux/lib/esperado.sh`. Si cambian `init/`, las migraciones, la tractografía o las herramientas del MCP, se actualizan allí y en las pruebas que las repiten. (H10)
- **Todo fallo conocido da su frase**, con qué ha pasado y qué hacer, y la ruta del registro. La contraseña de la base nunca va al registro. (H10)
- **El instalador nunca borra** un volumen con la marca `NG_BASE_CARGADA` ni uno de origen desconocido. La base solo se borra con `neurograph desinstalar --borrar-datos`, tras escribir BORRAR. La biblioteca no se borra nunca. (H10)
- **La biblioteca** es la de `--biblioteca` o la guardada en `config.env`. Si no hay ninguna, la primera vez se propone una que ya exista (`~/NeuroData` o la `NeuroData` de un disco montado, con su manifiesto) o `~/NeuroData`, se puede escribir otra y la elegida se guarda. (H10)
- **La tractografía se instala en un contenedor de herramientas.** Si faltan recursos o falla, queda pendiente y no detiene la instalación; si faltan recursos pero sus datos ya están en la base, sigue instalada. (H10)
- **`neurograph-mcp` no enciende NeuroGraph:** si está apagado, sale al momento y lo dice. (H10)
- **Las pruebas de integración** usan un `HOME` de prueba y proyectos `neurograph-prueba*`, y nunca tocan el entorno de desarrollo. (H10)

## Instalador Windows

- **Todo va en `instalacion/windows/`**, en Windows PowerShell 5.1 y con los mismos nombres de funciones que en Linux. Reutiliza `instalacion/docker/`; fuera de su carpeta solo cambian los Dockerfiles de la web y de herramientas, que quitan el CR de sus scripts, y la prueba de Linux que compara las cifras esperadas. (H11)
- **Valen las reglas del instalador Linux:** cada paso verifica con recuentos reales, cada fallo conocido da su frase y la ruta del registro, nunca se borra un volumen cargado ni la biblioteca, la tractografía pendiente no detiene nada y `neurograph-mcp` no enciende NeuroGraph. (H11)
- **Nunca instala una distribución de Linux:** activa WSL2 sin distribución e instala Docker Desktop. La desinstalación deja Docker Desktop y WSL2. (H11)
- **La licencia de Docker Desktop la acepta la persona:** se enseñan sus condiciones y solo con un sí se pasa `--accept-license`; la respuesta se guarda. (H11)
- **Una sola elevación UAC**, en un proceso aparte, para lo que necesita administrador: comprobar la firma del instalador de Docker Desktop, activar WSL2 e instalar Docker Desktop. Una segunda solo si, tras reiniciar, WSL queda por debajo de la 2.1.5. Tras el reinicio, `RunOnce` sigue solo. (H11)
- **La carpeta del instalador es `%LOCALAPPDATA%\neurograph-app\`** (configuración, estado, registros y comandos), no `…\NeuroGraph`: Windows no distingue mayúsculas, y la app Tauri se instala en `%LOCALAPPDATA%\neurograph`. (H11)
- **La biblioteca** es la de `--biblioteca` o la guardada en `config.env`. Si no hay ninguna, el paso 1 propone una que ya exista o `%USERPROFILE%\NeuroData`, deja elegir otra con el selector de carpetas y guarda la elegida. (H11)
- **La memoria libre se mide en dos sitios:** dentro de Docker y en Windows (lo que aún puede tomar la máquina virtual de WSL más lo que gasta Windows), con los umbrales medidos de `instalacion/windows/lib/esperado.ps1`. `.wslconfig` no se toca: si falta memoria, la frase dice cómo darla. (H11)
- **Las cifras esperadas son las de Linux:** `esperado.ps1` lleva una copia, y `instalacion/linux/pruebas/prueba_esperado_windows.sh` falla si no coinciden con `esperado.sh`. (H11)
- **Todo programa externo se lanza con `ejecutar_programa`** (`instalacion/windows/lib/comun.ps1`), nunca directamente; una prueba lo exige. (H11)
- **Las pruebas de funciones** corren en cualquier Windows admitido con programas falsos, sin Docker, WSL ni IAs de verdad. **Las de integración** parten de la copia limpia de una máquina virtual de pruebas, que nunca se modifica, o de una instalación hecha desde ella, y se graban enteras; su arnés es interno y no forma parte del repositorio. (H11)

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
  - se prueba con `npx --no -- tsc -b` (el `--no` impide que `npx` descargue paquetes), `npm test` (vitest), `npm run lint` (oxlint) y `npm run build`;
  - la lógica pura lleva sus tests: la de la app, en `src/logic/` y `src/theme/`, los stores de `src/state/` y la de los scripts, junto a ellos en `frontend/scripts/`;
  - los componentes pueden llevar tests de marcado (`react-dom/server`) o de conexión (que leen su código) donde protejan una regla;
  - lo visual se comprueba en un navegador headless.

  (42, 43, 50, D4, H5)
- **Avisos aceptados:** `ruff` B008 (`Depends` como valor por defecto) y el `set-state-in-effect` de oxlint al marcar «cargando». (27, 50)
- **Lógica pura separada** de React, three.js y los endpoints, para probarla sin base ni render. Cada criterio tiene una sola implementación, que se reutiliza (`exportSvgAsJpeg`, `regionDisplayText`, `DISPLAY_SCALE`, `ReferenceMesh`, `_mesh_io`). (13, 14, 19, 22, 23, 63)
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
- **Documentación:** tras tocar criterios, logs o un CLAUDE.md, `python scripts/check_docs.py` (`python3` en Linux) debe dar OK. (H2)
- **Permisos de los agentes** (`.claude/settings.json`): solo comandos de verificación de solo lectura, en forma exacta, salvo `git check-ignore *`, que solo lee. Nunca intérpretes, `docker exec` ni comodines como `npm run *` o `npx *`, que equivalen a ejecutar cualquier código. (H2)
