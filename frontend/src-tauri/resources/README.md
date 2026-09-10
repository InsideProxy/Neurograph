# `resources/` — contenido real que necesita cada carpeta

Esta carpeta no está pensada para vivir vacía en el repositorio: `tauri.conf.json`
(`bundle.resources`) la empaqueta entera dentro del instalador, así que cada
subcarpeta de aquí abajo tiene que tener contenido real antes de ejecutar
`npm run tauri build` (o `npm run tauri dev`, si quieres probar la
orquestación sin empaquetar todavía). Ver la decisión 54 de
`docs/analisis-arquitectura.md` para el diseño completo, y la siguiente
decisión (implementación) para el código que lee estas rutas
(`src/postgres.rs`, `src/backend.rs`).

Nada de esto se genera solo — son cuatro pasos manuales, uno por
subcarpeta, descritos abajo con instrucciones paso a paso.

## `resources/postgres/`

Los binarios reales de PostgreSQL 16.15 para Windows x86-64 (versión elegida
porque coincide con la que ya usa tu Docker, `pgvector/pgvector:pg16` —
decisión 54). Se descargan del sitio oficial de EDB, **no** se compilan aquí.

Pasos:

1. Abre `https://www.enterprisedb.com/download-postgresql-binaries` en el
   navegador.
2. Descarga el paquete **"Windows x86-64"** de la versión **16.15** (es un
   `.zip`, no un instalador — el nombre suele ser parecido a
   `postgresql-16.15-1-windows-x64-binaries.zip`).
3. Descomprime el `.zip` en algún sitio temporal. Dentro vas a encontrar una
   carpeta `pgsql/` con subcarpetas `bin/`, `lib/`, `share/`, etc.
4. Copia el **contenido completo** de esa carpeta `pgsql/` (no solo `bin/`)
   a `frontend/src-tauri/resources/postgres/` en tu repositorio, de forma
   que quede:
   ```
   frontend/src-tauri/resources/postgres/bin/initdb.exe
   frontend/src-tauri/resources/postgres/bin/pg_ctl.exe
   frontend/src-tauri/resources/postgres/bin/postgres.exe
   frontend/src-tauri/resources/postgres/bin/createdb.exe
   frontend/src-tauri/resources/postgres/bin/psql.exe
   frontend/src-tauri/resources/postgres/lib/...
   frontend/src-tauri/resources/postgres/share/...
   ```
   El código (`postgres.rs`) solo llama directamente a `initdb.exe`,
   `pg_ctl.exe`, `createdb.exe` y `psql.exe` dentro de `bin/`, pero esos
   binarios necesitan `lib/` y `share/` al lado para funcionar (son
   dependencias suyas, no del proyecto) — cópialos también, no solo `bin/`.
5. **Borra estas cuatro carpetas después de copiar** (hallazgo real,
   decisión 71, 10/09/2026: el primer `npm run tauri build` real falló por
   superar el límite de 2GB de NSIS/MSI, y estas cuatro sumaban 715MB sin
   aportar nada en tiempo de ejecución):
   - `pgAdmin 4/` (686MB -- aplicación gráfica de administración, esta app
     nunca abre ninguna interfaz de administración de bases de datos)
   - `StackBuilder/` (gestor de extensiones adicionales de EDB, sin uso aquí)
   - `doc/` (documentación de PostgreSQL, no hace falta en tiempo de ejecución)
   - `include/` (cabeceras C para compilar extensiones contra libpq/postgres,
     no para ejecutar el servidor ya compilado)

## `resources/migrations/`

Copia literal de las 13 migraciones ya generadas del proyecto — el código
(`postgres.rs::apply_migrations`) las aplica todas, en orden alfabético/
numérico, así que los nombres de archivo tienen que conservar el prefijo
numérico que ya tienen.

Pasos:

1. Localiza la carpeta real de migraciones generadas en tu repositorio:
   `backend/database/migrations/generated/`.
2. Copia **todos** los `.sql` de ahí (deberían ser 13 archivos) a
   `frontend/src-tauri/resources/migrations/`, manteniendo sus nombres
   exactos (por ejemplo `0001_...sql`, `0002_...sql`, etc.).
3. No copies nada más de esa carpeta (si hay algún `.py` u otro archivo
   auxiliar, el código solo busca `*.sql`, así que no hace falta excluirlo
   a mano, pero es más limpio copiar solo los `.sql`).

## `resources/neurograph_snapshot.sql`

El volcado real generado con `scripts/export_snapshot.ps1` (decisión 53),
ya verificado tabla por tabla. Un solo archivo, no una carpeta.

Pasos:

1. Copia `neurograph_snapshot.sql` (el que ya tienes en la raíz del
   repositorio, `E:\Neurograph\neurograph_snapshot.sql`) a
   `frontend/src-tauri/resources/neurograph_snapshot.sql`.
2. Si en algún momento vuelves a exportar un volcado más reciente (por
   ejemplo tras cargar más estudios), repite este paso para mantenerlo al
   día — el ejecutable empaquetado solo carga los datos que tenga este
   archivo en el momento de compilarse, no se actualiza solo.

## `resources/backend/`

La salida real de PyInstaller, modo "one-folder" (decisión 54): toda una
carpeta, no solo el `.exe`.

Pasos:

1. Asegúrate de tener instaladas las dependencias del proyecto y
   PyInstaller en tu entorno Windows:
   ```
   pip install -e ".[dev]"
   pip install pyinstaller
   ```
2. Desde la raíz del repositorio (`E:\Neurograph`), ejecuta:
   ```
   pyinstaller scripts\packaging\backend.spec --distpath dist\backend --clean
   ```
3. Esto genera `dist\backend\neurograph-backend\` (una carpeta completa,
   con el `.exe` y muchos archivos más al lado — así funciona el modo
   "one-folder", ver el comentario al principio de `backend.spec`).
4. Copia esa carpeta **completa** (`neurograph-backend/`, con todo su
   contenido) a `frontend/src-tauri/resources/backend/`, de forma que
   quede:
   ```
   frontend/src-tauri/resources/backend/neurograph-backend/neurograph-backend.exe
   frontend/src-tauri/resources/backend/neurograph-backend/... (el resto de archivos que genera PyInstaller)
   ```

**Advertencia honesta** (ya está también en la cabecera de
`backend.spec`): nadie ha construido esto todavía contra un Windows real.
Es razonablemente probable que el primer intento falle con un
`ModuleNotFoundError` señalando algún submódulo de `uvicorn` que falta en
la lista `hiddenimports` del `.spec` — si pasa eso, no es un fallo del
diseño, es exactamente el tipo de cosa que PyInstaller solo puede
descubrir en un build real. La solución es añadir el nombre exacto que
indique el error a `hiddenimports` en `backend.spec` y reintentar. Avísame
del error real si aparece, para documentarlo como una decisión nueva con
el nombre concreto que hiciera falta añadir — no lo adivinamos de
antemano.

## Después de las cuatro carpetas

Con las cuatro subcarpetas pobladas, ya se puede intentar un primer arranque
real:

```
npm run tauri dev
```

(o `npm run tauri build` para generar el instalador final). La primera vez
que arranque va a ejecutar el flujo completo de `setup::ensure_running`:
`initdb` → arrancar Postgres → crear la base → aplicar las 13 migraciones →
cargar `neurograph_snapshot.sql` → arrancar el backend empaquetado → esperar
a que `/health` responda. Si algo falla, el mensaje de error (visible en la
consola y en `setup_error.log`, dentro de la carpeta de datos de la
aplicación) va a decir exactamente en qué paso se detuvo — nunca hace falta
adivinar.

Nota: `resources/postgres/`, `resources/migrations/`, `resources/backend/`
y `neurograph_snapshot.sql` no deberían entrar al control de versiones
(son binarios y datos, no código) — si `.gitignore` no los excluye ya,
conviene añadirlos ahí.
