@echo off
rem Conector MCP de NeuroGraph para IAs de terminal (H11, B4 del diseno).
rem Las IAs lo lanzan con cmd.exe /c: Node no lanza un .cmd directamente.
rem Por la salida estandar solo va el protocolo MCP, que reenvia cmd sin
rem PowerShell; todo mensaje va a la salida de errores y a registro\mcp.log.
rem Si NeuroGraph esta apagado, no lo enciende (decision del usuario del
rem 02/10/2026, como en Linux): sale al momento. Los docker van con call:
rem en las pruebas, docker puede ser un .cmd. ASCII y con CRLF.
setlocal
set "NG_DIR=%LOCALAPPDATA%\neurograph-app"
set "NG_PROYECTO=neurograph-app"
if exist "%NG_DIR%\config.env" for /f "usebackq tokens=1,* delims==" %%a in ("%NG_DIR%\config.env") do if "%%a"=="NG_PROYECTO" set "NG_PROYECTO=%%b"
rem Una IA abierta antes de instalar Docker Desktop no tiene su carpeta en el
rem PATH: se anade la de su instalacion (%ProgramFiles%\Docker\Docker, datos
rem verificados del diseno). En las pruebas, NEUROGRAPH_PRUEBA_PROGRAMFILES.
set "NG_DOCKER_BIN=%ProgramFiles%\Docker\Docker\resources\bin"
if defined NEUROGRAPH_PRUEBA_PROGRAMFILES set "NG_DOCKER_BIN=%NEUROGRAPH_PRUEBA_PROGRAMFILES%\Docker\Docker\resources\bin"
where docker >nul 2>&1 || set "PATH=%NG_DOCKER_BIN%;%PATH%"
call docker info >nul 2>&1
if errorlevel 1 goto sin_docker
set "NG_API="
for /f "usebackq delims=" %%e in (`call docker inspect -f "{{.State.Running}}" %NG_PROYECTO%-api 2^>nul`) do set "NG_API=%%e"
if not "%NG_API%"=="true" goto apagado
call :mensaje "conectando con %NG_PROYECTO%-api"
call docker exec -i %NG_PROYECTO%-api python -m backend.mcp.server
exit /b %ERRORLEVEL%

:sin_docker
call :mensaje "No se puede usar Docker. Abre NeuroGraph (con su acceso o con: neurograph abrir), que arranca Docker Desktop, y vuelve a conectar (en Claude Code, con /mcp)."
exit /b 1

:apagado
call :mensaje "NeuroGraph apagado: para usarlo, abre NeuroGraph (con su acceso o con: neurograph abrir) y vuelve a conectar (en Claude Code, con /mcp)."
exit /b 1

:mensaje
echo neurograph-mcp: %~1 1>&2
if not exist "%NG_DIR%\registro" mkdir "%NG_DIR%\registro" 2>nul
>>"%NG_DIR%\registro\mcp.log" echo %date% %time% %~1
exit /b 0
