<#
.SINOPSIS
    Genera un volcado real (solo datos) de la base de datos de NeuroGraph,
    para servir de instantánea de reconstrucción del futuro ejecutable
    empaquetado (decisión 53 de docs/analisis-arquitectura.md).

.DESCRIPCION
    Sustituye el plan original de "reconstruir el historial reproduciendo
    cada salida_*.sql/seed en el orden en que se aplicó" (decisión 52) --
    ese plan resultó ser más frágil de lo necesario: al menos un dato real
    (las conexiones de Brainnetome) tuvo, por un tiempo, su código de
    ingesta perdido del repositorio (corregido en la decisión 50c), y
    reconstruir a mano el orden exacto de ~40 pasos históricos habría
    exigido volver a asumir cosas -- justo lo que la sección 24 de este
    proyecto prohíbe. En su lugar: un volcado real de tu base de datos ya
    verificada "al día con todo lo generado" (decisión 52) es la
    instantánea exacta, sin ningún paso de reconstrucción narrativa de
    por medio.

    Usa `pg_dump --data-only` DENTRO del contenedor (nunca una tubería de
    PowerShell hacia fuera) y después `docker cp` para traer el archivo
    -- mismo criterio de siempre contra la corrupción de acentos/ñ que ya
    usa scripts/apply_sql.ps1 (riesgo 7).

    Se excluyen dos tablas a propósito, nunca por omisión silenciosa:
    - alembic_version: la fija cada migración al aplicarse, no un dato
      científico -- incluirla aquí chocaría con las migraciones que el
      propio ejecutable aplica antes de cargar este volcado.
    - mcp_call_log: tu historial personal de auditoría de llamadas MCP,
      no un dato que tenga sentido replicar en la primera instalación de
      otra persona (ni en la tuya, si reinstalas limpio).

.PARAMETRO Salida
    Ruta del archivo .sql de salida. Por defecto
    ".\neurograph_snapshot.sql" en el directorio actual.

.PARAMETRO Contenedor
    Nombre del contenedor Docker de PostgreSQL. Por defecto
    "neurograph-postgres" (el nombre real usado en todo el proyecto).

.PARAMETRO Usuario
    Usuario de PostgreSQL. Por defecto "neurograph".

.PARAMETRO BaseDatos
    Base de datos de PostgreSQL. Por defecto "neurograph".

.EJEMPLO
    .\scripts\export_snapshot.ps1
#>

param(
    [string]$Salida = ".\neurograph_snapshot.sql",

    [string]$Contenedor = "neurograph-postgres",
    [string]$Usuario = "neurograph",
    [string]$BaseDatos = "neurograph"
)

$ErrorActionPreference = "Stop"

$rutaTemporal = "/tmp/neurograph_snapshot_$([guid]::NewGuid().ToString('N')).sql"

Write-Host "Generando el volcado dentro de '$Contenedor' (base de datos '$BaseDatos')..." -ForegroundColor Cyan

docker exec $Contenedor pg_dump `
    -U $Usuario `
    -d $BaseDatos `
    --data-only `
    --exclude-table=alembic_version `
    --exclude-table=mcp_call_log `
    -f $rutaTemporal

if ($LASTEXITCODE -ne 0) {
    Write-Host "'pg_dump' falló -- ¿está levantado el contenedor? (docker compose up -d)" -ForegroundColor Red
    exit 1
}

Write-Host "Copiando el volcado a '$Salida'..." -ForegroundColor Cyan

docker cp "${Contenedor}:${rutaTemporal}" $Salida
$codigoCopy = $LASTEXITCODE

docker exec $Contenedor rm -f $rutaTemporal | Out-Null

if ($codigoCopy -ne 0) {
    Write-Host "'docker cp' falló al traer el volcado -- nada se ha sobrescrito en '$Salida'." -ForegroundColor Red
    exit 1
}

$tamano = (Get-Item $Salida).Length
$tamanoMB = [math]::Round($tamano / 1MB, 1)

Write-Host "Volcado generado correctamente: $Salida ($tamanoMB MB)" -ForegroundColor Green
Write-Host "Guárdalo -- es la instantánea real que usará el primer arranque del futuro ejecutable." -ForegroundColor Green
