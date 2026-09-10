<#
.SINOPSIS
    Aplica un archivo .sql de migracion contra el Postgres EMBEBIDO del
    ejecutable empaquetado (decision 54) -- una base de datos real
    distinta de la de Docker (esa la cubre scripts/apply_sql.ps1).

.DESCRIPCION
    Hallazgo real, 09/09/2026 (decision 64): `start_existing()`
    (frontend/src-tauri/src/postgres.rs) arranca el Postgres embebido en
    cada apertura de la app DESPUES de la primera, pero nunca vuelve a
    llamar a `apply_migrations()` -- esa funcion solo se ejecuta una vez,
    dentro de `run_first_time_setup()`. Cualquier migracion nueva
    (backend/database/migrations/generated/NNNN_*.sql) creada DESPUES de
    que la usuaria ya abriera el ejecutable por primera vez nunca se
    aplica sola: hace falta este paso manual, contra el Postgres embebido
    ya en marcha, con el psql.exe real que trae empaquetado el propio
    ejecutable (mismo binario, mismo puerto, mismo usuario que usa
    `apply_migrations()` internamente -- ver postgres.rs).

    A diferencia de scripts/apply_sql.ps1 (Docker), aqui no hace falta
    ningun `docker cp`: psql.exe corre en la propia maquina de la
    usuaria y puede leer el archivo .sql directamente del disco.

    Requiere que la app YA este abierta (`npm run tauri dev` o el
    ejecutable instalado) -- el Postgres embebido solo escucha en el
    puerto 5433 mientras la app esta en marcha.

.PARAMETRO Archivo
    Ruta al archivo .sql de migracion a aplicar (obligatorio).

.EJEMPLO
    .\scripts\apply_migration_embedded.ps1 -Archivo .\backend\database\migrations\generated\0014_tract_geometry_reference_space.sql
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Archivo,

    [string]$PsqlPath = ".\frontend\src-tauri\resources\postgres\bin\psql.exe",
    [int]$Puerto = 5433,
    [string]$Usuario = "neurograph",
    [string]$BaseDatos = "neurograph"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Archivo)) {
    Write-Host "No se encuentra el archivo: $Archivo" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $PsqlPath)) {
    Write-Host "No se encuentra psql.exe en '$PsqlPath' -- ¿ejecutas esto desde E:\Neurograph? ¿ya se construyo el frontend al menos una vez?" -ForegroundColor Red
    exit 1
}

$rutaCompleta = (Resolve-Path $Archivo).Path
$nombreArchivo = Split-Path $rutaCompleta -Leaf

Write-Host "Aplicando '$nombreArchivo' contra el Postgres embebido (127.0.0.1:$Puerto, base de datos '$BaseDatos')..." -ForegroundColor Cyan
Write-Host "La app tiene que estar abierta ahora mismo, si no esta arrancado el Postgres embebido esto fallara." -ForegroundColor Yellow

& $PsqlPath -h 127.0.0.1 -p $Puerto -U $Usuario -d $BaseDatos -v ON_ERROR_STOP=1 -f $rutaCompleta
$codigoPsql = $LASTEXITCODE

if ($codigoPsql -ne 0) {
    Write-Host "psql devolvio un error al aplicar '$nombreArchivo' -- revisa el mensaje de arriba, nada se confirma como aplicado hasta que psql termine sin error." -ForegroundColor Red
    exit 1
}

Write-Host "Aplicado correctamente: $nombreArchivo" -ForegroundColor Green
