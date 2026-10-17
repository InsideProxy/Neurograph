# CLAUDE.md — instalacion

Reglas para trabajar en `instalacion/`. Las generales están en el CLAUDE.md de la raíz; el diseño, en `docs/instalador-linux-diseno.md` y `docs/instalador-windows-diseno.md`, y el criterio, en `docs/criterios-herramientas.md` («Instalador Linux» e «Instalador Windows»).

## Reglas

- **Nada fuera de `instalacion/`.** Los instaladores no cambian el código del desarrollador principal: reutilizan `backend/Dockerfile` y `scripts/rebuild_db_from_sql.sh` tal cual. La única excepción es `scripts/install_tractography.sh`, que es nuestro (H4, H8); el de Windows no lo toca (H11). La H10 lo cambió en cinco cosas:
  - reanuda las descargas;
  - explica un fallo de PyPI;
  - instala solo ruedas, para que ningún `setup.py` se ejecute con el socket de Docker montado;
  - da nombre a su `psql` (`PGAPPNAME`), para poder pararlo;
  - sus líneas de fallo terminan en «: dato», que es lo que muestra el instalador, y llama «espacio de Docker» a su temporal.
- **Comprobar, hacer y verificar.** Cada paso verifica el resultado real (recuentos, respuestas). Las cifras esperadas se definen en `linux/lib/esperado.sh` y tienen una copia en `windows/lib/esperado.ps1`, porque el comando diario de cada uno funciona sin la carpeta del proyecto; `linux/pruebas/prueba_esperado_windows.sh` falla si no coinciden. Si cambian `init/`, las migraciones, la tractografía o las herramientas del MCP, se actualizan en los dos, en las pruebas que las repiten y en el título del paso 7 («24 archivos») de los dos.
- **Todo fallo conocido tiene su frase** en `linux/lib/catalogo.sh` o `windows/lib/catalogo.ps1`: qué ha pasado y qué hacer. La contraseña de la base nunca va al registro.
- **El instalador nunca borra** un volumen con la marca `NG_BASE_CARGADA` ni uno de origen desconocido. La base solo se borra con `--borrar-datos` al desinstalar, después de que la persona escriba BORRAR. La biblioteca no la borra nada, y en Windows tampoco se desinstalan Docker Desktop ni WSL2.
- **Las pruebas nunca tocan** Docker de verdad (las de funciones), la configuración real de las IAs ni el entorno de desarrollo (las de integración usan un `HOME` de prueba y proyectos `neurograph-prueba*`). En Windows, las de funciones corren con programas falsos (`NEUROGRAPH_PRUEBA_SOLO_SIMULADOS`), sin elevar ni tocar el `HKCU` real.
- **Windows (`windows/`, H11)** sigue el modelo de Linux en Windows PowerShell 5.1, con los mismos nombres de funciones, y comparte `docker/` con él. Nunca instala una distribución de Linux ni acepta por la persona la licencia de Docker Desktop.
- **En Windows, todo programa externo se lanza con `ejecutar_programa`** (`windows/lib/comun.ps1`): comprueba el código, tiene tiempo máximo y Ctrl+C, y escribe la salida en el registro. Los programas de ventana van con `lanzar_aplicacion`, y el proceso elevado, con `lanzar_elevado`. `windows/pruebas/prueba_archivos.ps1` lo exige.
- **Codificación en Windows:** los `.ps1` en UTF-8 con BOM; los `.cmd` en ASCII y con CRLF (`windows/.gitattributes`). Las herramientas de edición escriben sin BOM y con LF: tras crear o editar uno, `windows/pruebas/normalizar.sh`. Lo que ve la persona, solo con caracteres de la página 850 (las marcas son `OK`, `AVISO` y `FALLO`).
- **Los umbrales de Windows se miden en Windows** y van en `windows/lib/esperado.ps1` con de dónde salen. Los que llevan PROVISIONAL (espacio de Docker y de la tractografía, Docker Desktop instalado y en reposo, y su primer arranque) aún no se han medido.

## Trampas de bash que el código evita

- Con `pipefail`, `orden | grep -q` puede fallar aunque encuentre el texto (SIGPIPE): se captura la salida y se compara, o se usa `grep -c`.
- Una función llamada desde `if`, `||`, `&&` o `!` se ejecuta sin `set -e`.
- `fallar` nunca va dentro de `$(...)` ni de un subshell.
- Con `set -E`, la trampa de errores también salta en subshells: `al_error` solo anota allí, y siempre en la salida de errores.
- Todo proceso que pueda sobrevivir al script se lanza con `9>&-`, para que no retenga el bloqueo.
- Los ejecutables con `set -e` llevan `shopt -s inherit_errexit`.
- Para relanzar con `sg`, `citar_sh` y no `printf %q`: el `sh` de `sg` puede ser dash.
- Un `coproc` es un bash aparte: su PID no es el del programa que lanza (por eso `exec` dentro) y bash cierra sus descriptores al terminar.
- Un script arranca con SIGINT ignorado lo que manda a segundo plano, y bash no deja atrapar una señal que ya venía ignorada. Por eso las pruebas que simulan Ctrl+C lanzan el instalador con `setsid env --default-signal=INT`.

## Trampas de PowerShell y de Windows que el código evita

Las que de verdad fallaron, en una máquina virtual de pruebas con Windows 11 Enterprise LTSC 24H2 y 12 GB o en la revisión del código.

- El `wsl.exe` de serie (el de `System32`) se niega a `--install` y `--update` si su entrada no es una consola (por SSH o redirigida), con un aviso en UTF-16 aunque lleve `WSL_UTF8=1`: `ejecutar_programa -EntradaConsola`.
- Recién activado WSL2, Windows da `VirtualMachinePlatform` por `Enabled`, no por `EnablePending`, aunque falta reiniciar: si lo activa el proceso elevado, devuelve 3010.
- Una ventana abierta antes de instalar Docker Desktop no tiene `docker` en el `PATH`: el comando diario y `neurograph-mcp.cmd` añaden su carpeta.
- Un `.cmd` se lanza con `cmd.exe /d /v:off /s /c ""ruta" args"`, y cmd expande `%VAR%` y `!VAR!` también entre comillas: `citar_argumento -ParaCmd` rechaza `"`, `%` y `!`. Por eso el paso 1 rechaza una cuenta cuya carpeta lleve `%` o `!`.
- `taskkill` y `shutdown` escriben en la página OEM (850): `-Codificacion oem`.
- Escribir la entrada estándar de un programa que no la lee bloquea en cuanto se llena la tubería: se escribe en un hilo aparte. Y una excepción en un hilo de .NET tumba el proceso: el registro y la lectura de la salida nunca relanzan.
- Los comodines de Win32: `Get-ChildItem -Filter *.sql` encuentra `b.sqlx` por su nombre corto 8.3, y `Copy-Item -Path` toma los `[]` de una ruta por comodines. Se lista con `-LiteralPath` y se filtra con `$_.Extension -eq`.
- `%ProgramFiles%` no se puede cambiar en el entorno de un proceso hijo: Windows lo rehace al arrancarlo. Las pruebas usan `NEUROGRAPH_PRUEBA_PROGRAMFILES` (una prueba antigua escribía, sin saberlo, en el `C:\Program Files` de la máquina virtual de pruebas).
- Ni las comparaciones (`-eq`, `-contains`, `switch`) ni los nombres de variable distinguen mayúsculas: `-ceq` y `-cnotcontains` donde importan (BORRAR, los nombres de los volúmenes), y dentro de una función con `[switch]$Instala`, `$instala = ''` escribe en el parámetro.
- `Move-Item -Force` pisa un archivo de solo lectura y no es atómico: `[IO.File]::Replace`, siempre con copia (`.anterior`), y `[Management.Automation.Language.NullString]::Value` donde .NET distingue `$null` de `''`.
- Un `.cmd` que se borra a sí mismo (`neurograph.cmd` al desinstalar) va en una sola línea que empieza por `(goto) 2>nul &`: con `& exit /b` al final sale con 0 y cmd vuelve a buscar el archivo.
- `Remove-Item` sin `-Recurse` sobre una carpeta con algo dentro pregunta, y en una ventana oculta (el proceso elevado) se queda esperando; `Get-ChildItem` sin `-Force` no ve lo oculto y la da por vacía.
- Un `[scriptblock]` llamado con `.Invoke()` envuelve la excepción, y un `NG:interrumpido` acabaría como fallo inesperado: se llama con `&`.
- Una directiva de grupo manda sobre `-ExecutionPolicy Bypass`: con `RemoteSigned` o `Unrestricted`, un `.ps1` con la marca de internet se bloquea o pregunta. `instalar.cmd` lo mira antes, con `-Command`.

## Comprobación

- Pruebas de funciones: `instalacion/linux/pruebas/ejecutar.sh`.
- shellcheck: `docker run --rm -v "$PWD:/mnt:ro" -w /mnt koalaman/shellcheck:stable -x -P SCRIPTDIR -S warning instalacion/linux/*.sh instalacion/linux/lib/*.sh instalacion/linux/pruebas/*.sh instalacion/linux/plantillas/neurograph instalacion/linux/plantillas/neurograph-mcp` y `-s sh instalacion/docker/web-entrypoint.sh`.
- Con Docker real, `instalacion/linux/pruebas/integracion.sh ESCENARIO`, y `limpiar` al terminar. Son pruebas pesadas: hacen falta el permiso del usuario y el equipo libre.
- Toda ejecución real del instalador se graba entera, con `grabar`: el `.cast` en tiempo real más un GIF y un MP4, en `~/Vídeos/neurograph-pruebas/`. Solo las interrupciones (Ctrl+C, `kill -9`) van sin grabar, porque `script` se interpondría en la señal.
- Windows, pruebas de funciones, en cualquier Windows admitido (B8.1): desde la raíz de un checkout entero del proyecto, sin convertir los saltos de línea, `powershell -NoProfile -ExecutionPolicy Bypass -File instalacion\windows\pruebas\ejecutar.ps1`, o con las rutas de las `prueba_*.ps1` que se quieran detrás. No necesitan administrador, Docker, WSL ni IAs (usan programas falsos), pero sí el proyecto entero, porque leen `init\`, `backend\database\`, `scripts\` y el icono de `frontend\`, y una de ellas lee los datos reales de ese Windows, que debe tener la virtualización activa. Termina con «N pruebas, 0 fallos».
- Windows, codificación: `instalacion/windows/pruebas/normalizar.sh` no debe cambiar nada.
- Windows, shellcheck: la orden de arriba con `instalacion/windows/pruebas/normalizar.sh`.
- Windows, ejecuciones reales (H11): se hicieron en la máquina virtual de pruebas, que es interna, partiendo de su copia limpia, con un arnés que no forma parte del repositorio, y cada una se grabó entera.
