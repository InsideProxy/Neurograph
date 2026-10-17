@echo off
rem Instalador de NeuroGraph para Windows (H11): el doble clic. Lanza
rem instalar.ps1 con Windows PowerShell 5.1, sin la politica de ejecucion
rem solo para ese proceso, y al terminar, bien o mal, espera a una tecla
rem para que no se pierda la pantalla final ni la frase del fallo (bloque A).
rem ASCII y con CRLF: cmd lee los .cmd en la pagina de codigos OEM.
setlocal
set "NG_PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
rem Desde un cmd de 32 bits, System32 seria el de 32 bits: se pide el de 64.
if exist "%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe" set "NG_PS=%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
rem Con PowerShell restringido o una directiva que solo deja scripts firmados,
rem instalar.ps1 ni siquiera se ejecutaria: se mira antes con -Command, que
rem la politica de ejecucion no bloquea (B1). Una directiva
rem de grupo manda sobre -ExecutionPolicy Bypass: con RemoteSigned o
rem Unrestricted, un .ps1 con la marca de internet (un ZIP descargado) se
rem bloquea o pregunta. La carpeta va por el entorno: entre comillas de
rem PowerShell, una ruta con ' romperia la orden.
set "NG_DIR_INSTALADOR=%~dp0"
"%NG_PS%" -NoProfile -ExecutionPolicy Bypass -Command "if ($ExecutionContext.SessionState.LanguageMode -ne 'FullLanguage') { exit 2 }; $d = Get-ExecutionPolicy; if ($d -in 'Restricted', 'AllSigned') { exit 3 }; if ($d -in 'RemoteSigned', 'Unrestricted') { foreach ($f in Get-ChildItem -LiteralPath $env:NG_DIR_INSTALADOR -Recurse -File) { if ($f.Extension -eq '.ps1' -and ((Get-Content -LiteralPath $f.FullName -Stream Zone.Identifier -ErrorAction SilentlyContinue) -match '^ZoneId=[34]')) { exit 3 } } }; exit 0"
set "NG_CODIGO=%ERRORLEVEL%"
if "%NG_CODIGO%"=="2" goto restringido
if "%NG_CODIGO%"=="3" goto directiva
if not "%NG_CODIGO%"=="0" goto sin_powershell
"%NG_PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1" %*
set "NG_CODIGO=%ERRORLEVEL%"
goto fin
:restringido
echo.
echo No se puede ejecutar el instalador: Windows tiene PowerShell en modo restringido (lo ponen Smart App Control o una directiva del administrador). Pide ayuda al administrador del ordenador.
set "NG_CODIGO=1"
goto fin
:directiva
echo.
echo No se puede ejecutar el instalador: una directiva de este ordenador no deja ejecutar sus scripts de PowerShell (solo deja los firmados, o no deja los descargados de internet). Pide ayuda al administrador del ordenador.
set "NG_CODIGO=1"
goto fin
:sin_powershell
echo.
echo No se puede ejecutar el instalador: Windows PowerShell no responde en este ordenador. Pide ayuda al administrador del ordenador.
set "NG_CODIGO=1"
:fin
echo.
if not defined NEUROGRAPH_PRUEBA_SIN_PAUSA pause
exit /b %NG_CODIGO%
