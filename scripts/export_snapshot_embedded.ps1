<#
.SINOPSIS
    Genera la instantánea real de datos (`neurograph_snapshot.sql`) que
    aplica el primer arranque del ejecutable empaquetado, tomándola
    directamente del Postgres EMBEBIDO -- no de la base de datos de
    Docker (decisión 67 de docs/analisis-arquitectura.md).

.DESCRIPCION
    Hallazgo real, 10/09/2026: `scripts/export_snapshot.ps1` (decisión 53)
    vuelca la base de datos de Docker (`neurograph-postgres`), pero desde
    que existe el empaquetado (decisión 54 en adelante) los datos nuevos
    -- en concreto, los 176 nodos y 5176 aristas de tractografía de la
    decisión 66 -- se han aplicado solo contra el Postgres EMBEBIDO del
    ejecutable ya instalado (`scripts/apply_migration_embedded.ps1`,
    puerto 5433), nunca contra Docker. Las dos bases de datos llevaban
    tiempo divergiendo en silencio: cualquier instalador nuevo generado
    con la instantánea antigua habría llegado sin esos datos, aunque el
    esquema (migración 0015, ya copiada a `resources/migrations/`)
    existiera.

    En vez de mantener sincronizadas dos bases de datos a partir de ahora
    (Docker para poder exportar, embebida para lo que de verdad usa la
    app empaquetada), este script hace del Postgres embebido la única
    fuente real de la instantánea: usa el mismo `pg_dump.exe` que ya trae
    empaquetado el propio ejecutable
    (`frontend/src-tauri/resources/postgres/bin/`), contra el mismo
    127.0.0.1:5433 con el que ya habla `apply_migration_embedded.ps1` --
    mismo criterio de "un solo backend real, no dos" que motivó ese
    script en la decisión 64. `pg_dump.exe` escribe el archivo de salida
    él mismo (`-f`), nunca a través de una tubería de PowerShell -- no
    hay ningún riesgo de repetir aquí el bug de codificación de la
    decisión 66 (UTF-16 con BOM por `>`).

    Requiere que la app YA esté abierta -- el Postgres embebido solo
    escucha mientras la app está en marcha (igual que
    apply_migration_embedded.ps1, al revés que rebuild_backend.ps1).

    Mismas dos tablas excluidas a propósito que `export_snapshot.ps1`,
    por el mismo motivo (nunca por omisión silenciosa):
    - alembic_version: la fija cada migración al aplicarse.
    - mcp_call_log: historial personal de auditoría, no dato científico.

.PARAMETRO Salida
    Ruta del archivo .sql de salida. Por defecto
    ".\neurograph_snapshot.sql" en el directorio actual -- cópialo tú
    misma después a `frontend\src-tauri\resources\neurograph_snapshot.sql`
    (el que de verdad empaqueta el instalador) una vez confirmes que el
    volcado nuevo es correcto; este script nunca sobrescribe ese archivo
    directamente, para que puedas comparar tamaños antes de reemplazarlo.

.PARAMETRO PgDumpPath
    Ruta a pg_dump.exe. Por defecto
    ".\frontend\src-tauri\resources\postgres\bin\pg_dump.exe".

.PARAMETRO Puerto
    Puerto del Postgres embebido. Por defecto 5433.

.PARAMETRO Usuario
    Usuario de PostgreSQL. Por defecto "neurograph".

.PARAMETRO BaseDatos
    Base de datos de PostgreSQL. Por defecto "neurograph".

.EJEMPLO
    .\scripts\export_snapshot_embedded.ps1
#>

param(
    [string]$Salida = ".\neurograph_snapshot.sql",

    [string]$PgDumpPath = ".\frontend\src-tauri\resources\postgres\bin\pg_dump.exe",
    [int]$Puerto = 5433,
    [string]$Usuario = "neurograph",
    [string]$BaseDatos = "neurograph"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PgDumpPath)) {
    Write-Host "No se encuentra pg_dump.exe en '$PgDumpPath' -- ¿ejecutas esto desde E:\Neurograph?" -ForegroundColor Red
    exit 1
}

Write-Host "Generando el volcado desde el Postgres embebido (127.0.0.1:$Puerto, base de datos '$BaseDatos')..." -ForegroundColor Cyan
Write-Host "La app tiene que estar abierta ahora mismo, si no esta arrancado el Postgres embebido esto fallara." -ForegroundColor Yellow

& $PgDumpPath `
    -h 127.0.0.1 `
    -p $Puerto `
    -U $Usuario `
    -d $BaseDatos `
    --data-only `
    --exclude-table=alembic_version `
    --exclude-table=mcp_call_log `
    -f $Salida

if ($LASTEXITCODE -ne 0) {
    Write-Host "'pg_dump' devolvió un error -- revisa el mensaje de arriba. Nada se ha sobrescrito en '$Salida' si pg_dump no llegó a escribir el archivo." -ForegroundColor Red
    exit 1
}

$tamano = (Get-Item $Salida).Length
$tamanoMB = [math]::Round($tamano / 1MB, 1)

Write-Host "Volcado generado correctamente: $Salida ($tamanoMB MB)" -ForegroundColor Green
Write-Host "Revisalo (tamaño, y que incluya las filas de tractography_nodes/tractography_edges) y luego cópialo a frontend\src-tauri\resources\neurograph_snapshot.sql para que el próximo instalador lo use." -ForegroundColor Green
