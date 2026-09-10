<#
.SINOPSIS
    Reconstruye el backend empaquetado (PyInstaller, modo "one-folder",
    decision 54) y lo vuelve a copiar a
    frontend\src-tauri\resources\backend\ -- el paso que faltaba tras
    cualquier cambio en el codigo Python del backend.

.DESCRIPCION
    Hallazgo real, 09/09/2026 (decision 65): la app empaquetada NUNCA
    ejecuta backend/ directamente -- backend.rs arranca siempre el
    ejecutable ya construido en
    frontend/src-tauri/resources/backend/neurograph-backend/
    neurograph-backend.exe (ver scripts/packaging/backend.spec). Cualquier
    cambio en el codigo Python (por ejemplo, el campo `reference_space`
    anadido a TractSummary/TractGeometryOut en
    backend/api/services/tractography_service.py para la decision 63) no
    llega nunca a la app mientras ese .exe no se reconstruya a mano --
    `npm run tauri dev` solo relanza el frontend (`beforeDevCommand: npm
    run dev`, vite), nunca reconstruye el backend empaquetado.

    Comprobado con hechos, no adivinado: el .exe en disco tenia fecha
    08/09/2026 10:29 y tractography_service.py, 08/09/2026 10:58 -- 29
    minutos MAS TARDE. Ese desfase es la causa real, verificada, de que
    la malla de fondo de Tractography3D.tsx (decision 63) no apareciera:
    el backend en marcha respondia sin el campo `reference_space`, asi
    que `resolveMeshUrl()` (Tractography3D.tsx) no encontraba ninguna
    entrada valida y no dibujaba nada -- sin ningun error, a proposito
    (mismo criterio ya usado en Brain3D.tsx: mejor no mostrar nada que
    una aproximacion no verificada).

    IMPORTANTE, en sentido CONTRARIO a apply_migration_embedded.ps1: la
    app tiene que estar CERRADA antes de ejecutar esto. El .exe que se
    va a reemplazar esta bloqueado por Windows mientras el proceso esta
    en marcha -- este script lo comprueba y se detiene si sigue abierto,
    en vez de fallar a medias dejando la carpeta de recursos en un estado
    mixto (mitad exe viejo, mitad archivos nuevos).

.PARAMETRO SinLimpiarDist
    Si se indica, no borra dist\backend\ antes de reconstruir (por
    defecto SI se borra, --clean de PyInstaller, para no arrastrar nunca
    restos de un build anterior).

.EJEMPLO
    .\scripts\rebuild_backend.ps1
#>

param(
    [switch]$SinLimpiarDist
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $repoRoot

Write-Host "Raiz del repositorio: $repoRoot" -ForegroundColor Cyan

# 1. La app tiene que estar CERRADA -- el .exe que vamos a reemplazar
#    esta bloqueado por Windows mientras el proceso sigue vivo.
$procesoActivo = Get-Process -Name "neurograph-backend" -ErrorAction SilentlyContinue
if ($procesoActivo) {
    Write-Host "El proceso 'neurograph-backend.exe' sigue en marcha (PID $($procesoActivo.Id -join ', '))." -ForegroundColor Red
    Write-Host "Cierra la app de NeuroGraph por completo (no basta con minimizarla) y vuelve a ejecutar este script." -ForegroundColor Red
    exit 1
}

# 2. PyInstaller tiene que estar instalado en este entorno de Python.
if (-not (Get-Command pyinstaller -ErrorAction SilentlyContinue)) {
    Write-Host "No se encuentra 'pyinstaller' en el PATH de este entorno de Python." -ForegroundColor Red
    Write-Host "Instalalo con: pip install pyinstaller" -ForegroundColor Yellow
    exit 1
}

# 3. Reconstruir. --clean (por defecto) para no arrastrar nunca restos
#    de un build anterior en dist\backend\.
$argumentosPyinstaller = @(
    "scripts\packaging\backend.spec",
    "--distpath", "dist\backend"
)
if (-not $SinLimpiarDist) {
    $argumentosPyinstaller += "--clean"
}

Write-Host "Ejecutando: pyinstaller $($argumentosPyinstaller -join ' ')" -ForegroundColor Cyan
Write-Host "Esto puede tardar varios minutos -- PyInstaller analiza todas las importaciones reales del backend." -ForegroundColor Yellow

& pyinstaller @argumentosPyinstaller
$codigoPyinstaller = $LASTEXITCODE

if ($codigoPyinstaller -ne 0) {
    Write-Host "PyInstaller devolvio un error (codigo $codigoPyinstaller) -- revisa el mensaje de arriba." -ForegroundColor Red
    Write-Host "Si el error es 'ModuleNotFoundError' senalando un submodulo de uvicorn, anade ese nombre exacto a 'hiddenimports' en scripts\packaging\backend.spec y reintenta (ver el comentario de cabecera de ese archivo) -- avisame del nombre real para documentarlo." -ForegroundColor Yellow
    exit 1
}

$exeNuevo = "dist\backend\neurograph-backend\neurograph-backend.exe"
if (-not (Test-Path $exeNuevo)) {
    Write-Host "PyInstaller termino sin error pero no encuentro '$exeNuevo' -- no se toca la carpeta de recursos actual." -ForegroundColor Red
    exit 1
}

# 4. Solo ahora, con el build nuevo confirmado en disco, se reemplaza la
#    carpeta de recursos real -- nunca se borra la version anterior antes
#    de tener la nueva ya construida con exito.
$destino = "frontend\src-tauri\resources\backend\neurograph-backend"

Write-Host "Build nuevo confirmado en '$exeNuevo'. Reemplazando '$destino'..." -ForegroundColor Cyan

if (Test-Path $destino) {
    Remove-Item -Recurse -Force $destino
}
Copy-Item -Recurse "dist\backend\neurograph-backend" $destino

Write-Host "Backend reconstruido y copiado correctamente a $destino" -ForegroundColor Green
Write-Host "Ya puedes abrir la app (npm run tauri dev, o el ejecutable instalado)." -ForegroundColor Green
