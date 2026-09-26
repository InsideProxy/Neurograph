<#
.SINOPSIS
    Aplica un archivo .sql generado por NeuroGraph (migración o
    scripts/register_*.py) contra la base de datos real, en un solo
    comando en vez de los dos de siempre.

.DESCRIPCION
    Hace exactamente lo mismo que el procedimiento manual documentado en
    backend/database/migrations/README.md -- docker cp seguido de
    psql -f dentro del contenedor -- solo que en una sola llamada, con
    comprobaciones y mensajes de error claros en cada paso.

    Usa siempre docker cp (nunca una tubería de PowerShell) porque
    PowerShell corrompe los acentos y la ñ al pasar el archivo por
    Get-Content | docker exec (confirmado en el riesgo 7 de
    docs/analisis-arquitectura.md) -- este script no cambia esa forma de
    cargar los datos, solo evita que haya que teclearla a mano cada vez.

    Este script NO decide por ti qué aplicar ni te oculta el SQL: si
    quieres verlo antes de aplicarlo, ábrelo tú misma (por ejemplo con
    notepad .\nombre.sql) antes de ejecutar este script -- eso sigue
    siendo tu revisión, este script solo automatiza la mecánica de
    aplicarlo una vez que ya decidiste hacerlo.

.PARAMETRO Archivo
    Ruta al archivo .sql a aplicar (obligatorio).

.PARAMETRO Contenedor
    Nombre del contenedor Docker de PostgreSQL. Por defecto
    "neurograph-postgres" (el nombre real usado en todo el proyecto).

.PARAMETRO Usuario
    Usuario de PostgreSQL. Por defecto "neurograph".

.PARAMETRO BaseDatos
    Base de datos de PostgreSQL. Por defecto "neurograph".

.EJEMPLO
    .\scripts\apply_sql.ps1 -Archivo .\init\salida_rosen_halgren2021_mmp1_connectome_part1of2.sql
    .\scripts\apply_sql.ps1 -Archivo .\init\salida_rosen_halgren2021_mmp1_connectome_part2of2.sql
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Archivo,

    [string]$Contenedor = "neurograph-postgres",
    [string]$Usuario = "neurograph",
    [string]$BaseDatos = "neurograph"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Archivo)) {
    Write-Host "No se encuentra el archivo: $Archivo" -ForegroundColor Red
    exit 1
}

$rutaCompleta = (Resolve-Path $Archivo).Path
$nombreArchivo = Split-Path $rutaCompleta -Leaf
$rutaTemporal = "/tmp/neurograph_apply_$([guid]::NewGuid().ToString('N')).sql"

Write-Host "Aplicando '$nombreArchivo' contra '$Contenedor' (base de datos '$BaseDatos')..." -ForegroundColor Cyan

docker cp $rutaCompleta "${Contenedor}:${rutaTemporal}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "'docker cp' falló -- ¿está levantado el contenedor? (docker compose up -d)" -ForegroundColor Red
    exit 1
}

# Cada archivo en su propia transacción, y psql se para en el primer error:
# sin ON_ERROR_STOP sigue tras un error y sale con 0, y este script daría el
# archivo por aplicado. Los que traen su propio BEGIN/COMMIT (las migraciones
# generadas) no se envuelven en otra. Mismo criterio que
# scripts/rebuild_db_from_sql.sh (H1, H7).
if (Select-String -LiteralPath $rutaCompleta -Pattern '^BEGIN;$' -Quiet) {
    docker exec -i $Contenedor psql -U $Usuario -d $BaseDatos -v ON_ERROR_STOP=1 -f $rutaTemporal
} else {
    docker exec -i $Contenedor psql -U $Usuario -d $BaseDatos -1 -v ON_ERROR_STOP=1 -f $rutaTemporal
}
$codigoPsql = $LASTEXITCODE

docker exec $Contenedor rm -f $rutaTemporal | Out-Null

if ($codigoPsql -ne 0) {
    Write-Host "psql devolvió un error al aplicar '$nombreArchivo' -- revisa el mensaje de arriba, nada se confirma como aplicado hasta que psql termine sin error." -ForegroundColor Red
    exit 1
}

Write-Host "Aplicado correctamente: $nombreArchivo" -ForegroundColor Green
