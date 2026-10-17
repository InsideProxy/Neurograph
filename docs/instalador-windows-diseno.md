# Instalador Windows de NeuroGraph — diseño

**Estado, 11/10/2026:** implementado y probado en una máquina virtual de pruebas con Windows 11 Enterprise LTSC 24H2 y 12 GB: la instalación completa desde su copia limpia, Claude Code y cinco escenarios («Datos verificados»). Pendiente: el vídeo en una máquina virtual limpia (B9), Windows 10, Windows Terminal, una cuenta con espacio y tilde, Codex CLI y Gemini CLI de verdad, el resto de fallos provocados y lo que sigue en «Por comprobar». Para Mac no hay instalador todavía. Registro en la H11.

## Objetivo

Lo mismo que el instalador de Linux (`docs/instalador-linux-diseno.md`), pero en Windows. Una persona no técnica, con el proyecto ya descargado, instala NeuroGraph con un doble clic y lo usa en el navegador. Tiene la tractografía, y su IA de terminal se conecta al MCP local.

## Principios

- **Los mismos del instalador de Linux:**
  - apoyo auxiliar, sin cambios en el código del desarrollador principal;
  - se verifica el resultado real, no el mensaje de éxito;
  - nada falla en silencio;
  - nunca se borran datos que se hayan podido usar.
- **Una alternativa a la app Tauri, no su sustituta.** La app de escritorio (decisiones 54-70) sigue siendo el instalador de Windows del desarrollador principal. Este es para quien usa NeuroGraph en el navegador y quiere la tractografía y las IAs. Se le propone en el PR, y él decide.
- **Nunca se instala una distribución de Linux.** Docker Desktop trae su propia máquina Linux interna, oculta. El instalador activa el componente WSL2 de Windows, pero no instala Ubuntu ni ninguna otra distribución. Lo decidió el usuario el 10/10/2026.
- **Simétrico al de Linux.** Comparte con él:
  - las imágenes y el compose (`instalacion/docker/`);
  - los pasos y las cifras esperadas;
  - la lógica del volumen y sus marcas;
  - los puertos, la tractografía, el MCP y las IAs.

  Cambia la plataforma: PowerShell 5.1 en lugar de bash, y Docker Desktop en lugar de Docker Engine.

## Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Cómo se lanza | Doble clic en `instalacion\windows\instalar.cmd`, que abre una ventana de consola. El `.cmd` lanza `instalar.ps1` con Windows PowerShell 5.1, que viene en todo Windows, saltándose la política de ejecución solo para ese proceso. Las opciones son las de Linux (`--biblioteca RUTA`). Al terminar, bien o mal, la ventana espera a que se pulse Intro, para que la pantalla final o la frase del fallo no se pierdan. Pide permiso de administrador (UAC) solo si hace falta. |
| Windows admitidos | Los que admite Docker Desktop: Windows 10 22H2 (build 19045) y Windows 11 23H2 (build 22631) o posteriores, de 64 bits y x86_64. Por debajo de esas builds se para. La edición Home no está en la lista de requisitos de Docker, aunque una frase de su documentación la menciona: se avisa de que no está probada y se sigue. |
| Docker Desktop | Si falta, se descarga de desktop.docker.com y se instala sin preguntas para todos los usuarios (`install --quiet --accept-license`), que es la instalación por defecto de Docker. Si ya estaba, se usa si es compatible (B1). |
| Licencia de Docker | Antes de instalarlo, se enseñan las condiciones de uso de Docker Desktop (gratis para uso personal, educación y empresas de menos de 250 empleados y 10 M$; de pago para el resto y para la administración pública) con el enlace a la licencia, y se pregunta. Solo con un sí se pasa `--accept-license`: aceptar por la persona no sería correcto. La respuesta se guarda para no repetir la pregunta tras un reinicio. |
| WSL2 | Si falta o es anterior a la 2.1.5 (lo que exige Docker), el instalador lo activa o lo actualiza sin distribución. Nunca se decide por el texto de `wsl.exe`, que va traducido: la versión sale del propio archivo `%ProgramFiles%\WSL\wsl.exe`, y si hay que reiniciar lo dice el estado de los componentes de Windows. Qué vía funciona en cada Windows se comprueba en la primera ejecución (bloque A, paso 2). |
| Reinicio | Si activar WSL2 obliga a reiniciar, el instalador se apunta para continuar al iniciar sesión (`RunOnce` del usuario), pide reiniciar y, al volver, la ventana reaparece y sigue donde lo dejó. |
| Arranque de Docker Desktop | Por defecto Docker Desktop no arranca al iniciar sesión, según su documentación. Si lo instaló este instalador, lo que se anota en `estado.env`, se comprueba tras su primer arranque que siga así, y si no, se desactiva. Si ya estaba instalado, su configuración no se toca. `neurograph abrir` arranca Docker Desktop cuando hace falta. |
| Permiso de Docker | No hay paso de permiso: con contenedores Linux sobre WSL2, el grupo `docker-users` no hace falta, según la documentación de Docker. El paso 3 de Linux («Permiso para usar Docker») pasa a ser «Docker en marcha». |
| Memoria | Igual que en Linux, se mide la memoria libre, no la total. En el paso 1 se comprueba la de la base y la de la tractografía, y esta última se vuelve a comprobar en el paso 8, con NeuroGraph encendido. En Windows cuentan dos memorias libres: la de Windows y la del Linux interno de Docker (bloque B, B2). No se toca `.wslconfig`, que es la configuración de WSL de toda la máquina, pero la frase de «pendiente» dice cómo dar más memoria a Docker. |
| Scripts de bash | La carga de la H1 (`rebuild_db_from_sql.sh`) y la tractografía (`install_tractography.sh`) se ejecutan dentro del contenedor de herramientas, con el socket de Docker. Windows no necesita bash ni Python. |
| Uso diario | Accesos «NeuroGraph» y «Apagar NeuroGraph» en el menú Inicio, y el comando `neurograph`, con las mismas órdenes que en Linux. El instalador deja NeuroGraph encendido; no arranca solo al iniciar sesión. |
| Web y API | Igual que en Linux: la web en el 5173 y la API en el 8420, solo en `127.0.0.1`. Si un puerto no se puede usar, se usa el siguiente y se avisa. Postgres no expone ningún puerto. |
| Biblioteca | Puede ir en otra carpeta o unidad, por ejemplo un SSD, como plantea `docs/portabilidad.md`. Si no hay una guardada ni se da `--biblioteca RUTA`, el paso 1 busca bibliotecas existentes, propone una (o `%USERPROFILE%\NeuroData`) y deja elegir otra con el selector de carpetas de Windows. Nunca se borra sola. Lo pidió el usuario el 10/10/2026, también para Linux. |
| MCP | `neurograph-mcp` ejecuta el MCP dentro del contenedor de la API y, como en Linux, no enciende NeuroGraph si está apagado. |
| IAs | Detecta Claude Code, Codex CLI y Gemini CLI y pregunta una vez. Las registra a nivel de usuario a través de `cmd.exe /c`, un ejecutable real, porque Node no lanza un `.cmd` directamente. |
| Desinstalar | `neurograph desinstalar`, igual que en Linux: conserva los datos por defecto, y `--borrar-datos` pide escribir BORRAR. Docker Desktop y WSL2 se quedan instalados. |
| Alcance de la v1 | El de Linux. Fuera: actualizar sin perder datos, «Importar síntesis de IA» en el navegador, Windows en ARM, Windows Server, el motor Hyper-V elegido a propósito y los contenedores de Windows. |

## Bloque A: qué se instala y cómo

### Archivos

En la carpeta del proyecto, todo en `instalacion/windows/`:

- `instalar.cmd`: el doble clic. Es ASCII, porque cmd lee los `.cmd` en la página de códigos OEM.
- `instalar.ps1` y `desinstalar.ps1`.
- `lib/*.ps1`: las funciones, una parte por archivo, como `instalacion/linux/lib/`. Incluye su propio `esperado.ps1`, con las mismas cifras que `esperado.sh` (ver «Código común»).
- `plantillas/`: `neurograph.cmd`, `neurograph.ps1`, `neurograph-mcp.cmd` y `conectar-ia.md`, este con los comandos de Windows.
- `pruebas/`.

Los `.ps1` se guardan en UTF-8 con BOM, como los `.ps1` de `scripts/`, porque Windows PowerShell 5.1 lee sin BOM como ANSI.

En el ordenador:

- `%LOCALAPPDATA%\neurograph-app\`:
  - `config.env` y `estado.env`, en UTF-8 sin BOM, con el mismo formato `CLAVE=valor` y las mismas claves que en Linux, y además las de Windows (`NG_DOCKER_INSTALADO_AQUI` y `NG_LICENCIA_DOCKER`);
  - `registro\`;
  - una copia de `lib\`, del compose y de las plantillas, para que el comando diario funcione sin la carpeta del proyecto.

  La carpeta hereda los permisos de `%LOCALAPPDATA%`, que solo son del usuario. Se llama `neurograph-app`, como el proyecto de Docker, y no `NeuroGraph`: la aplicación de escritorio se instala en `%LOCALAPPDATA%\neurograph`, y Windows no distingue mayúsculas (ver «Datos verificados»).
- `%LOCALAPPDATA%\neurograph-app\bin\`: `neurograph.cmd` y `neurograph-mcp.cmd`.
  - Esta carpeta se añade al `PATH` del usuario escribiendo directamente en el registro (`HKCU\Environment`), como valor expandible. Así no se expanden las variables de las demás entradas, que es lo que haría `[Environment]::SetEnvironmentVariable`.
  - Después se avisa a Windows del cambio, para que las terminales nuevas la vean.
- En el menú Inicio, la carpeta `NeuroGraph`, con «NeuroGraph» y «Apagar NeuroGraph».
- En Docker, como en Linux: el proyecto `neurograph-app`, sus imágenes, el volumen `neurograph-app-datos` y su red.
- La biblioteca, `%USERPROFILE%\NeuroData`.

### Pasos

1. **Comprobando el ordenador.** Comprueba:
   - Que PowerShell puede ejecutar el instalador. Si una directiva lo pone en modo de lenguaje restringido (Smart App Control o WDAC), o si una directiva de grupo anula la política de ejecución, se para con su frase. Con una directiva de grupo `RemoteSigned` o `Unrestricted`, se para si los `.ps1` del proyecto llevan la marca de internet de un ZIP descargado, que esa directiva bloquearía o haría preguntar.
   - La build de Windows y los 64 bits x86_64. En edición Home, avisa.
   - La virtualización activa en el firmware, y el servicio LanmanServer en automático, que Docker exige.
   - Los saltos de línea del proyecto. Si algún `.sql` de `init/`, `backend/database/seed/` o `backend/database/migrations/generated/` lleva retornos de carro (CR), se para, con una frase que dice que se descargue el proyecto como ZIP o se clone sin convertir los saltos de línea.
     - `rebuild_db_from_sql.sh` reconoce los archivos que abren su propia transacción buscando una línea exacta `BEGIN;`, y con un CR al final cambiaría su comportamiento.
     - Se comprueba aquí y no en el paso 7, para no construir las imágenes en balde.
   - La memoria:
     - al menos 8 GB instalados, sumando los módulos (`Win32_PhysicalMemory`), porque lo que Windows informa como visible queda por debajo de lo instalado: el hardware y la gráfica integrada reservan una parte;
     - la memoria libre para la base, con el umbral de Linux, más lo que necesita Docker Desktop medido, solo si Docker Desktop no está ya encendido;
     - la de la tractografía, como en Linux. Si no llega, se anota el motivo en `NG_TRACTO_SIN_RECURSOS`, que el paso 8 respeta y que `neurograph tractografia` vuelve a evaluar. La memoria del Linux interno de Docker todavía no se puede medir si Docker no existe, así que se mide en el paso 8.
   - El espacio libre en el disco donde Docker Desktop guarda su disco virtual: el que diga su configuración si ya está instalado, o el de `%LOCALAPPDATA%` si no. Los umbrales se miden en Windows. Si falta Docker Desktop, se suma su tamaño.
   - La conexión con los sitios de Linux, más desktop.docker.com y github.com (de este último sale la actualización de WSL).
   - La biblioteca (B2):
     - si hay una guardada en `config.env` o se da `--biblioteca RUTA`, se usa esa, sin preguntar;
     - si no, se elige como dice B2;
     - en los dos casos se comprueba el espacio libre, que Docker la pueda montar y los permisos.
2. **Docker.** El orden de los estados es este:
   1. **Sin elevar:** se detecta qué falta, comprobando WSL (la versión del archivo `%ProgramFiles%\WSL\wsl.exe`, ≥ 2.1.5) y Docker Desktop.
   2. **Sin elevar:** si falta Docker Desktop, se enseña la licencia y se pregunta. La respuesta se guarda en `estado.env`, y un no para con su frase. Después se descarga el instalador de Docker.
   3. **Una sola elevación UAC**, con un proceso de PowerShell aparte (`Start-Process -Verb RunAs -Wait`), hace todo lo que necesita administrador:
      1. Copia el instalador a `%ProgramFiles%\neurograph-app\instalador-docker`, una carpeta en la que solo pueden escribir los administradores (ver «Seguridad»).
      2. Comprueba allí su firma: que es una firma Authenticode del propio archivo (no la de un catálogo de Windows), válida, que su cadena llega a una raíz de confianza y que el firmante es Docker Inc, comparado campo a campo y distinguiendo mayúsculas.
      3. Activa WSL2 sin distribución. Primero prueba `wsl --install --no-distribution --web-download`; si no funciona, activa los componentes de Windows.
      4. Instala Docker Desktop: la misma copia cuya firma ha comprobado. Si WSL2 quedó pendiente de reinicio y Docker Desktop no se instala, devuelve 3010 en lugar de un fallo: se reinicia, el instalador descargado se conserva y, al volver, se instala otra vez.

      Ese proceso escribe su propio archivo de registro en la carpeta de NeuroGraph del usuario, con la ruta absoluta que se le pasa, y devuelve un código de salida. Ese código dice qué falló, o si hay que reiniciar (3010), lo que el proceso elevado sabe por el estado de los componentes de Windows (`Get-WindowsOptionalFeature`, que necesita administrador). Al terminar, sus líneas se copian también al registro principal, que es el que se envía si algo falla.
   4. **Sin elevar:** se anota `NG_DOCKER_INSTALADO_AQUI` en `estado.env`. Si hay que reiniciar, se apunta `RunOnce` en el `HKCU` del usuario, se pide reiniciar y se termina.

      El resto de lo que es del usuario (`RunOnce` en el registro de Windows, `estado.env` y la configuración de Docker) se escribe siempre desde el proceso sin elevar. Si quien aprueba el UAC es otra cuenta de administrador, el proceso elevado es esa cuenta, con su propio `HKCU`, `%APPDATA%` y `%LOCALAPPDATA%`.
   5. **Al volver,** el instalador sigue en este paso. Si WSL quedó por debajo de la 2.1.5, que pasa si se activó con los componentes de Windows, hace falta una segunda elevación para `wsl --update --web-download`, y se dice.
   6. **Al final del paso,** la carpeta de Docker se añade al `PATH` de este mismo proceso, para usar el `docker` recién instalado.
3. **Docker en marcha.**
   - Si Docker Desktop está cerrado, lo arranca y espera a que `docker info` responda, con un tiempo máximo.
   - La primera vez, Docker Desktop abre su propia ventana. Si propone iniciar sesión, se puede saltar, y el instalador lo dice.
   - Comprueba que el Docker es compatible (B1).
   - Si lo instaló este instalador, comprueba que no arranque al iniciar sesión. Si estuviera activado, cierra Docker Desktop, lo desactiva y lo vuelve a arrancar (B3).
4. **Comprobando puertos.**
   - Un puerto se da por libre si se puede abrir de verdad en `127.0.0.1`. No basta con que nadie esté escuchando, porque Windows reserva rangos de puertos para Hyper-V y WSL que no aparecen como ocupados.
   - Si no, se usa el siguiente, como en Linux.
   - Los errores de Docker al publicar un puerto en Windows («access permissions») se añaden a las señales del catálogo.
5. **Preparando NeuroGraph:** construye las tres imágenes con el compose de `instalacion/docker/`.
6. **Encendiendo**, como en Linux.
7. **Cargando datos.**
   - `rebuild_db_from_sql.sh` se ejecuta en el contenedor de herramientas, con el socket de Docker y la carpeta `init/` del proyecto montada en solo lectura en `/app/init`. El script calcula la raíz del proyecto a partir de su propia ruta (`/app/scripts`).
   - Las semillas y las migraciones son las que ya lleva la imagen (`/app/backend`).
   - Se verifica con las mismas cifras esperadas que en Linux.
8. **Tractografía**, como en Linux. Usa el contenedor de herramientas, con la biblioteca montada (B2), el socket y el tope de memoria. No lleva `--user`: en Windows, los archivos los escribe Docker Desktop a nombre del usuario.
9. **Accesos, comandos y conexión con IAs.**

El volumen y sus marcas (`NG_VOLUMEN_PROPIO` y `NG_BASE_CARGADA`) funcionan exactamente como en el bloque A de Linux.

### Lanzar programas desde PowerShell

PowerShell 5.1 no se para cuando un programa externo falla, decodifica su salida con la página OEM y no tiene `tee` en UTF-8 ni procesos en segundo plano baratos. Por eso todo programa externo (docker, wsl, el instalador de Docker, las IAs) se lanza con **una única función**, basada en `System.Diagnostics.Process`:

- lee la salida estándar y la de errores de forma asíncrona y la escribe en el registro y, si se pide, en pantalla;
- la decodifica con la codificación de cada programa: UTF-8 por defecto, y en `wsl.exe` también, pero solo pasándole `WSL_UTF8=1`, porque si no escribe en UTF-16;
- la lectura asíncrona se hace con `ReadLineAsync` y sondeo, o con una clase pequeña en C# (`Add-Type`). Nunca con un bloque de PowerShell como manejador de eventos, que en PowerShell 5.1 se ejecuta en un hilo sin espacio de ejecución y tumba el proceso;
- devuelve el código de salida, que siempre se comprueba;
- tiene un tiempo máximo, y se puede cancelar con Ctrl+C;
- tiene un modo que no espera a que el programa termine, para lo que corre en paralelo, como `docker events` durante la tractografía.

Con eso se hace lo mismo que en Linux con `ejecutar_clasificado`, el latido de los pasos largos, `docker events` y la comprobación del MCP con tiempo máximo. Al escribir en la entrada de un programa, la codificación de la consola va sin BOM, porque .NET Framework lo enviaría y rompería el primer mensaje JSON del MCP. Nunca se usa `$ErrorActionPreference = 'Stop'` con programas externos.

## Bloque B: lo que cambia respecto a Linux

### B1. Detección de errores

- **El modelo es el de Linux:** cada fallo conocido tiene su frase (qué ha pasado y qué hacer) y la ruta del registro, y la contraseña nunca va al registro.
- **El registro** va en `%LOCALAPPDATA%\neurograph-app\registro\`.
- **El bloqueo** es un archivo abierto en exclusiva: un segundo instalador, desinstalador o tractografía se para con su frase.
- **Frases propias de Windows:**
  - PowerShell restringido;
  - build no admitida;
  - virtualización desactivada y LanmanServer;
  - licencia de Docker no aceptada;
  - permiso de administrador denegado;
  - descarga de Docker Desktop fallida o con la firma incorrecta;
  - instalación de Docker Desktop fallida;
  - WSL2 que no se activa o no se actualiza;
  - Docker Desktop que no arranca a tiempo;
  - Docker incompatible;
  - `init/` con saltos de línea de Windows;
  - reinicio pendiente.
- **Docker compatible.** Igual que Linux rechaza un Docker que no sirve, en Windows se para con su frase si:
  - Docker está en modo de contenedores de Windows (`docker info`, `OSType`), y la frase dice cómo pasar a Linux;
  - el `docker` del `PATH` no es el de Docker Desktop (Rancher Desktop o Podman Desktop), hay un `DOCKER_HOST` definido o el contexto de Docker no es el local, como en Linux;
  - el aislamiento reforzado de contenedores (Enhanced Container Isolation) impide montar el socket.
- **Ctrl+C:**
  - La limpieza va en bloques `finally`, que PowerShell ejecuta también al pulsar Ctrl+C. Se limpia lo mismo que en Linux: los contenedores y el volumen sin marca de esta ejecución, y la tractografía en curso.
  - Mientras se limpia, un segundo Ctrl+C no la corta (`[Console]::TreatControlCAsInput`).
  - El `.cmd` no debe preguntar «¿Desea terminar el trabajo por lotes?».
- **Cerrar la ventana con la X** no es Ctrl+C: Windows da unos segundos y mata el proceso, y la limpieza puede no terminar. Queda lo mismo que tras un corte de luz en Linux, y la siguiente ejecución lo recupera igual:
  - rehace un volumen propio sin la marca de carga;
  - quita el contenedor de tractografía si está parado;
  - si la tractografía sigue en marcha dentro de Docker, porque solo murió la ventana, lo dice y pide esperar a que termine, como en Linux.

  La ayuda lo explica.

### B2. Memoria, biblioteca y tractografía

- **Memoria libre en dos sitios.**
  - El Linux interno de Docker tiene un tope (por defecto, la mitad de la RAM) y toma la memoria de Windows a medida que la necesita, hasta ese tope.
  - Para la tractografía, con NeuroGraph encendido:
    - dentro de Docker, 4096 MB libres (como en Linux: el pico medido por 1,5, en GB), según el `MemAvailable` de `/proc/meminfo` leído en el contenedor de Postgres;
    - en Windows, lo que la máquina virtual de WSL aún puede tomar (su tope, que es la memoria total de su Linux más la que Linux no deja ver, menos lo que ya ocupa `vmmemWSL`; como mucho, esos 4096 MB), más lo que gasta el propio Windows mientras tanto (1200 MB, medido). Con Docker Desktop parado no se puede saber, porque su máquina virtual aún no ha crecido: en el paso 1 no se pide y se mira en el paso 8.
  - Pedir los 4096 MB también en Windows contaba dos veces la memoria: medido con 12 GB, tras construir las imágenes la máquina virtual ya ocupa su tope, y la tractografía usa la caché de su Linux sin tomar nada más de Windows («Datos verificados»).
  - Si no llegan, queda pendiente. Si falta dentro de Docker, el motivo dice cuánta memoria tiene Docker y cómo dársela:
    - la opción `memory` de `%USERPROFILE%\.wslconfig`, con la cifra calculada (la que tiene, más la que le falta y la que Linux no deja ver, en GB) y el enlace a la documentación de Microsoft;
    - reiniciar Docker Desktop (o `wsl --shutdown`), porque el cambio no se aplica antes;
    - y después, `neurograph tractografia`.

    Si con esa cifra a Windows no le quedaría la memoria que usa (medida con NeuroGraph encendido, por 1,5), dice que en ese ordenador no cabe, sin proponer cifra.
  - Si la tractografía ya está cargada en la base, la falta de memoria no la rebaja a pendiente: sigue instalada y se dice que no se repite.
  - Con 8 GB en Windows, el Linux interno no pasa de unos 4 GB y la tractografía queda pendiente: se dice al instalar.
- **La biblioteca** se monta en una ruta fija del contenedor, `/biblioteca`, y `NEUROGRAPH_LIBRARY__PATH` apunta ahí.
  - Los datos que muestran las frases (el «: dato» de las líneas de fallo de `install_tractography.sh`) se traducen de `/biblioteca/…` a la ruta de Windows antes de enseñarse.
- **Rutas que se rechazan:**
  - los mismos caracteres que en Linux;
  - las unidades de red, que Docker Desktop no monta.
- **Dónde va la biblioteca.** La primera vez, si no se ha dado `--biblioteca RUTA`:
  1. Se buscan bibliotecas de NeuroGraph que ya existan, en el orden de Linux: primero `%USERPROFILE%\NeuroData`, y después una carpeta `NeuroData` con el manifiesto `.neurograph_library.yaml` en la raíz de cada unidad local (fija o extraíble). Así se «conecta» una biblioteca ya hecha, como dice `docs/portabilidad.md`.
  2. Se propone la primera que haya, o `%USERPROFILE%\NeuroData` si no hay ninguna, con su tamaño aproximado (unos 630 MB): «¿Usar esta carpeta? [S/n]».
  3. Con un no, se abre el selector de carpetas de Windows (`FolderBrowserDialog`), y la persona elige una carpeta o una unidad, sin escribir rutas.
  4. La elegida se comprueba como cualquier otra: una carpeta que no está vacía y no es una biblioteca se rechaza, igual que en Linux.

  La elección se guarda en `config.env` y no se vuelve a preguntar, ni al continuar tras un reinicio ni desde los accesos. Para cambiarla: `instalar.cmd --biblioteca RUTA`.
- **Si el disco de la biblioteca se desconecta,** NeuroGraph sigue funcionando: la tractografía ya cargada está en la base. Solo hace falta conectarlo para volver a instalarla con `neurograph tractografia`, que, si no encuentra la carpeta, lo dice con su frase.
- **Un disco externo** conectado después de arrancar Docker Desktop puede no verse desde su Linux interno. Si la carpeta no se ve dentro del contenedor, la frase dice que se reinicie Docker Desktop.

### B3. Uso diario

- **Los accesos del menú Inicio** ejecutan `neurograph abrir` y `neurograph apagar` sin ventana de consola, como `--escritorio` en Linux.
  - Se lanzan con `conhost.exe --headless`, para que no aparezca ninguna ventana. Si eso no funciona en alguna versión de Windows, con `-WindowStyle Hidden`, que deja ver un parpadeo. No se usa VBScript, que Microsoft está retirando.
  - En ese modo nunca se pregunta nada, porque una pregunta sin ventana dejaría el proceso colgado sin que se viera.
  - El progreso («Encendiendo NeuroGraph…») se avisa con una notificación de Windows, si se puede.
  - Un fallo se avisa siempre con un cuadro de mensaje, que el modo «No molestar» no silencia, con la frase y un botón para abrir el registro.
- **`neurograph abrir`** arranca Docker Desktop si está cerrado, espera a que responda, enciende NeuroGraph y abre el navegador.
- **Arranque de Docker Desktop al iniciar sesión.** Si lo instaló este instalador y aparece activado, se desactiva. Se mira la clave `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` y la opción de `settings-store.json`.
  - Docker Desktop reescribe ese archivo mientras está abierto. Por eso, en el paso 3, se cierra, se edita el archivo en UTF-8 sin BOM, conservando todo su contenido, y se vuelve a arrancar.
  - Lo normal es que no haga falta, porque viene desactivado. Se comprueba en la primera ejecución.
- **En pantalla** se usan marcas ASCII en lugar de ✔ ✘ ⚠, que la consola clásica de Windows 10 no muestra.

### B4. `neurograph-mcp`

- `neurograph-mcp.cmd` empieza con `@echo off`. Si NeuroGraph está encendido, ejecuta `docker exec -i <proyecto>-api python -m backend.mcp.server`.
- Si está apagado, sale al momento, con su mensaje por la salida de errores.
- Por la salida estándar solo va el protocolo. PowerShell no interviene: lo reenvía cmd.

### B5. Conexión con IAs

- **Se detectan** con `Get-Command`, porque pueden ser `.exe`, `.cmd` o `.ps1`.
- **Se registran a nivel de usuario,** quitando antes el registro anterior, igual que en Linux. El comando es `cmd.exe /c "<bin>\neurograph-mcp.cmd"`.
- **Se verifica** con el `mcp list` de cada IA.
- **Se prueba en las tres IAs,** con una cuenta de Windows cuyo nombre lleva un espacio y una tilde, porque Node y Rust entrecomillan los argumentos de forma distinta.

### B6. Pantalla final

Es la de Linux, con las rutas de Windows y marcas ASCII. La ayuda va en `%LOCALAPPDATA%\neurograph-app\conectar-ia.md`.

### B7. Desinstalar

- **Se quita lo mismo que en Linux:** contenedores, imágenes, red, accesos, comandos, la entrada del `PATH` y los registros de las IAs.
- **Se conservan**, como en Linux:
  - el volumen y su `config.env`, salvo con `--borrar-datos`;
  - la biblioteca;
  - la caché de construcción;
  - los registros.
- **El desinstalador se ejecuta desde una copia temporal,** para poder borrar `bin\` sin borrarse a sí mismo mientras corre.
- **Docker Desktop y WSL2 se quedan** y se dice: se quitan aparte, desde la configuración de Windows.
- **El espacio no vuelve a Windows** solo con borrar las imágenes, porque el disco virtual de Docker no encoge. También se dice.

### B8. Pruebas

1. **Pruebas de funciones**, en PowerShell 5.1:
   - Un ejecutor propio, como `ejecutar.sh`.
   - Los programas externos se simulan como en Linux: programas falsos (`docker.cmd`, `wsl.cmd`…) en una carpeta al principio del `PATH`, porque las funciones de PowerShell no llegan a los procesos hijos ni a las llamadas .NET.
   - Se ejecutan en cualquier Windows admitido, sin administrador, desde la raíz de un checkout entero del proyecto (leen `init\`, `backend\database\`, `scripts\` y el icono de `frontend\`), sin convertir los saltos de línea: `powershell -NoProfile -ExecutionPolicy Bypass -File instalacion\windows\pruebas\ejecutar.ps1`, o con las rutas de las `prueba_*.ps1` que se quieran detrás. Una de ellas lee los datos reales de ese Windows, que debe tener la virtualización activa.
   - Nunca usan Docker, WSL, `claude`, `codex` ni `gemini` de verdad.
2. **Integración**, con un arnés interno que no forma parte del repositorio:
   - En la máquina virtual de pruebas, partiendo cada vez de su copia limpia, que nunca se modifica.
   - Después, Windows 10, en otra máquina virtual de pruebas.
   - Los escenarios de Linux (completa desde cero, idempotente, diario, desinstalar y reinstalar, y fallos provocados adaptados).
   - Además, los de Windows: el reinicio con continuación, la licencia rechazada, el UAC denegado, Docker Desktop cerrado, Docker con 4 GB, `init/` con CRLF, el cierre con la X, una cuenta con espacio y tilde en el nombre, y la marca de internet de un proyecto descargado como ZIP (se observa y se explica en el README; la marca no se quita).
   - Con Windows Terminal como terminal por defecto, instalado en la máquina virtual como dato de prueba, se repiten el Ctrl+C, el cierre con la X y la tecla final. Si no se puede instalar, se dice que no está probado con Windows Terminal.
   - Node y las tres IAs se instalan en la máquina virtual como datos de prueba, sin iniciar sesión en ninguna.
3. **Sesión interactiva.** Docker Desktop, el UAC y el reinicio necesitan una sesión de escritorio, así que las ejecuciones reales se lanzan dentro de la sesión iniciada, y el UAC se contesta con el teclado, para que el flujo sea el real.
4. **Grabación:** cada ejecución real se graba entera, en tiempo real, con el registro de texto al lado.

### B9. Vídeo

Como en Linux: una toma limpia en una máquina virtual recién instalada, con las esperas aceleradas y rotuladas. Está pendiente.

## Seguridad

- **Qué protege la firma y qué no.** Comprobar la firma del instalador de Docker Desktop protege la descarga: lo que se ejecuta como administrador es lo que publicó Docker Inc., sin cambios por el camino. No protege frente a algo que ya corre con la cuenta de la persona. El proceso elevado carga `elevado.ps1` y `lib\` de la carpeta del proyecto, que esa cuenta puede cambiar, como `sudo` con un script de `$HOME` en Linux: el UAC que aprueba la misma cuenta no es una frontera de seguridad entre esa cuenta y el administrador, y el instalador no pretende serlo.
- **El instalador de Docker** se copia y se verifica dentro del proceso elevado, en `%ProgramFiles%\neurograph-app\instalador-docker`, y se instala esa misma copia. Así no hay hueco entre la comprobación y la ejecución.
  - La ruta sale de la carpeta de Archivos de programa de Windows (`[Environment]::GetFolderPath`), no de una variable de entorno: no depende de lo que traiga el entorno del proceso.
  - La carpeta se crea con permisos explícitos y sin heredar: solo Administradores y SYSTEM, por su SID (`S-1-5-32-544` y `S-1-5-18`), porque los nombres van traducidos. Si ella o la de encima es un punto de reanálisis (un enlace o una unión), no se usa, y al limpiar nunca se borra a través de uno.
  - Se llama `neurograph-app` y no `NeuroGraph`: la aplicación de escritorio (Tauri) instalada para todos los usuarios iría en `%ProgramFiles%\neurograph`, y Windows no distingue mayúsculas.
- **El socket de Docker** que se monta en el contenedor de herramientas da acceso a todo lo que Docker Desktop comparte con su Linux interno, que es el disco `C:\` entero. No es un riesgo nuevo respecto a Linux, donde el grupo `docker` equivale a administrador, y se dice igual.
- **La contraseña de la base** va en `config.env`, en una carpeta que solo es del usuario, como en Linux, y nunca va al registro.

## Código común con el instalador de Linux

- **`instalacion/docker/` tal cual,** salvo una cosa. Los Dockerfiles de la web y de herramientas quitan el retorno de carro de sus scripts al copiarlos (`sed -i 's/\r$//'`). Si alguien clona con Git para Windows, que convierte los saltos de línea a CRLF, los `.sh` romperían las imágenes. Los `.sql` no se tocan: si llevan CR, el paso 1 se para.
- **Las cifras esperadas** (recuentos, consultas de verificación, herramientas del MCP, esquema y tractografía):
  - Cada instalador lleva su copia (`esperado.sh` y `esperado.ps1`), porque el comando diario de cada uno funciona sin la carpeta del proyecto.
  - `esperado.ps1` usa un formato sencillo: una cifra o una consulta por línea, entre comillas simples.
  - Una prueba de funciones de Linux lo lee con `grep` y comprueba que las dos copias coinciden. Así, un cambio en `init/`, en las migraciones o en el MCP no puede quedar solo en una.
  - Los umbrales de memoria y de disco no se comparten: los de Windows se miden en Windows.
- **Las frases de los fallos** siguen siendo de cada instalador, porque casi todas dicen qué hacer en cada sistema. Las que son iguales se copian.

## Cambios fuera de `instalacion/windows/`

- `instalacion/docker/web.Dockerfile` y `herramientas.Dockerfile`: los saltos de línea.
- `instalacion/linux/pruebas/`: la prueba que compara las cifras esperadas.
- `instalacion/README.md` e `instalacion/CLAUDE.md`: la parte de Windows.
- `docs/decisiones-herramientas.md` (su entrada H), `docs/criterios-herramientas.md` (el criterio del instalador y «Entornos») y el mapa de `CLAUDE.md`.

Nada del código del desarrollador principal. Del instalador de Linux cambiaron, además de esa prueba, dos cosas que se aplican a los dos instaladores (H10):
- la biblioteca se elige o se detecta al instalar;
- sin recursos, una tractografía ya cargada no pasa a pendiente (`instalacion/linux/lib/sistema.sh` y `tractografia.sh`).

## Datos verificados

**10/10/2026:**

- **Documentación de Docker Desktop para Windows** (docs.docker.com/desktop/setup/install/windows-install/):
  - motores: WSL 2 (por defecto) y Hyper-V;
  - requisitos: WSL 2.1.5 o posterior; Windows 10 22H2 (19045) o 11 23H2 (22631) Pro, Enterprise o Education; CPU con SLAT; 8 GB de RAM; virtualización activa; y el servicio LanmanServer en automático. Home no está en la lista, pero una frase dice que Home solo ejecuta contenedores Linux;
  - opciones del instalador: `--quiet`, `--accept-license` (acepta la licencia al instalar en lugar de al abrir), `--user` (para un solo usuario, sin administrador) y `--backend=wsl-2` (el de por defecto);
  - activar WSL 2 por primera vez necesita administrador, una vez por ordenador, y puede pedir reiniciar; la página no dice que el instalador de Docker lo active;
  - con WSL 2 y contenedores Linux, el grupo `docker-users` no hace falta.
- **Configuración de Docker Desktop:** se guarda en `%APPDATA%\Docker\settings-store.json`. «Start Docker Desktop when you sign in» viene desactivado por defecto. Con WSL 2, la memoria se configura en la WSL de toda la máquina, no en Docker Desktop.
- **Licencia de Docker Desktop:** gratis para empresas pequeñas (menos de 250 empleados y menos de 10 M$ al año), uso personal, educación y proyectos de código abierto no comerciales. De pago para empresas mayores y para la administración pública. Se acepta al descargar e instalar.
- **Documentación de WSL** (learn.microsoft.com/windows/wsl/basic-commands): `wsl --install` instala Ubuntu por defecto. Si WSL no está instalado, admite `--no-distribution` (no instala distribución) e `--inbox` (usa el componente de Windows), además de `--web-download`. `wsl --update --web-download` actualiza desde GitHub.
- **Carga en el contenedor de herramientas.** La imagen lleva `/app/scripts` y `/app/backend`, con las semillas y las migraciones generadas (`instalacion/docker/herramientas.Dockerfile`, `backend/Dockerfile`, sus `.dockerignore`). `rebuild_db_from_sql.sh` saca la raíz del proyecto de su propia ruta. De los archivos, solo falta `init/`; que la carga funcione ahí dentro está por comprobar (abajo).
- **Máquina virtual de pruebas:**
  - Windows 11 Enterprise LTSC 24H2 de evaluación (build 26100), en español;
  - 4 núcleos, virtualización y SLAT visibles dentro, PowerShell 5.1;
  - sin WSL, Docker, git ni winget.

  Se le subió la memoria de 8 a 12 GB para las pruebas. Hay copia limpia del disco.

  Lanzado por SSH, el `wsl.exe` de serie respondió a `wsl --install --no-distribution` con «El Subsistema de Windows para Linux no está instalado. Para instalar, ejecute wsl.exe --install», y no cambió nada. Hay que repetirlo en una sesión de escritorio y con `--web-download`.

- **Carpeta de la aplicación de escritorio:**
  - `frontend/src-tauri/tauri.conf.json`: `productName` es `neurograph` y el empaquetado es NSIS, sin `installMode` (Tauri 2.11, en `frontend/src-tauri/Cargo.toml`);
  - la referencia de configuración de Tauri 2 (v2.tauri.app/reference/config): `installMode` vale por defecto `currentUser`, que instala sin administrador;
  - la plantilla NSIS de Tauri (`crates/tauri-bundler/src/bundle/windows/nsis/installer.nsi`): con `currentUser`, `StrCpy $INSTDIR "$LOCALAPPDATA\${PRODUCTNAME}"`.

  La aplicación queda en `%LOCALAPPDATA%\neurograph`, y como Windows no distingue mayúsculas, `%LOCALAPPDATA%\NeuroGraph` sería esa misma carpeta: la del instalador es `%LOCALAPPDATA%\neurograph-app`.

**10/10/2026, instalación completa en la máquina virtual de pruebas** (desde la copia limpia, sin IAs; grabación `20261010-140053-windows-completa`):

- **WSL2:**
  - El `wsl.exe` de serie (`System32`, 10.0.26100.8162) solo trae `--install`, `--update`, `--status` y `--help`. Si su entrada estándar no es una consola (por SSH, o redirigida a una tubería o a `NUL`), se niega al momento a `--install` y `--update` con «El Subsistema de Windows para Linux no está instalado...» (código 1), un aviso que sale en UTF-16 aunque reciba `WSL_UTF8=1`. Con la entrada en una consola funciona, aunque su salida vaya a un archivo. Por eso el instalador lo lanza con `ejecutar_programa -EntradaConsola`.
  - La vía fue `wsl --install --no-distribution --web-download`, en el proceso elevado: activó VirtualMachinePlatform con DISM («los cambios se aplicarán una vez que se reinicie el sistema») e instaló WSL 3.0.1 desde GitHub, en 69 s y con código 0. Los componentes de Windows no hicieron falta. Activados con ellos (primer intento) y tras reiniciar, `wsl --update --web-download` también instala WSL 3.0.1, con la entrada en una consola.
  - Recién activado, Windows da VirtualMachinePlatform y Microsoft-Windows-Subsystem-Linux por `Enabled` («Restart Required: Possible»), no por `EnablePending`, aunque falta reiniciar (existe `RebootPending` de CBS). Si los activa el proceso elevado, devuelve 3010.
  - Quedó WSL 3.0.1.0 (núcleo 6.18.40.1-1). La versión del archivo `%ProgramFiles%\WSL\wsl.exe` es la de `wsl --version`.
  - Hizo falta reiniciar. Al volver, `RunOnce` siguió solo, sin segunda elevación, y WSL abrió su ventana de bienvenida.
- **Docker Desktop 4.94.0** (motor 29.8.2, Compose v5.5.1, buildx 0.37.2):
  - El instalador ocupa 635 493 296 bytes y se descargó en 6 s.
  - Su firma es Authenticode y válida, de `CN=Docker Inc, O=Docker Inc, L=Palo Alto, S=California, C=US, SERIALNUMBER=4817464, OID.2.5.4.15=Private Organization, OID.1.3.6.1.4.1.311.60.2.1.2=Delaware, OID.1.3.6.1.4.1.311.60.2.1.3=US` (huella `B6BD29272B07AD4D0F1322A739499D67CA3BAC3F`). El instalador compara CN, O, L, S y C.
  - `install --quiet --accept-license` sale con 0 en unos 33 s, con WSL2 aún pendiente de reinicio. El código del proceso elevado llega con `Process.Start` y el verbo `runas` (3010).
  - Su entrada de desinstalación está en `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop`, con `InstallLocation` `C:\Program Files\Docker\Docker`.
  - Contextos: `default` (`npipe:////./pipe/docker_engine`) y `desktop-linux`, el activo (`npipe:////./pipe/dockerDesktopLinuxEngine`).
  - Arranque al iniciar sesión: `settings-store.json` trae `"AutoStart": false`, pero el instalador de Docker Desktop apunta «Docker Desktop» en la clave `Run` del usuario. Tras el reinicio arrancó solo al iniciar sesión, el paso 3 quitó esa entrada (B3) y en el inicio de sesión siguiente ya no arrancó.
  - La primera vez abre su ventana con «Welcome to Docker» (iniciar sesión, con «Skip»). El motor arranca con ella abierta, sin pulsar nada; respondió unos 2 min después de iniciar sesión.
  - Mientras el motor no responde, `docker info` no falla al momento: agota su tiempo máximo (30 s) en cada consulta.
- **Memoria con 12 GB** (módulos 12 288 MB; Windows ve 12 268), con NeuroGraph encendido: Docker tiene 5919 MB (`docker info` da `MemTotal` 6 206 787 584, la mitad), de los que quedan unos 4670 MB disponibles dentro; `vmmemWSL` ocupa unos 5,9 GB y Windows se queda con unos 2,9 a 3,1 GB disponibles.
- **Espacio:** la instalación, sin la tractografía, gastó 11 474 MB de `C:` (de 29 377 a 17 903 MB libres): el disco virtual de Docker (`%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx`) ocupa 6,1 GB, de ellos 2,5 GB de caché de construcción; `%ProgramFiles%\Docker`, 4,0 GB, y `%ProgramFiles%\WSL`, 1,2 GB.
- **Carga de la H1 en el contenedor de herramientas:** funciona. Cargó los 24 archivos en unos 40 s, con todos los recuentos esperados (1172 regiones, 104 115 conexiones). `init/salida_mmp1.sql` no es UTF-8 válido, así que pasó por la conversión desde cp1252 con el `iconv` del contenedor.
- **Tractografía:** con 12 GB queda pendiente: «memoria insuficiente ahora (hacen falta 4096 MB libres y hay 2959 MB)». Esa es la memoria disponible de Windows con NeuroGraph encendido; dentro de Docker había unos 4670 MB. (Con el criterio de entonces: los 4096 MB también en Windows.)
- **MCP:** `initialize` en 2 s, con 12 herramientas.
- **Accesos del menú Inicio:** con `conhost.exe --headless`, «NeuroGraph» (con Docker Desktop cerrado: lo arranca, enciende y abre el navegador) y «Apagar NeuroGraph» no abren ninguna ventana de consola. El progreso sale como notificación de «Windows PowerShell».
- **UAC:** en español, con «Sí» y «No» y el foco en «No»; `Alt+S` acepta.
- **Tiempos**, del doble clic a la pantalla final, 11 min 17 s: paso 1, 18 s (con la pregunta de la biblioteca); paso 2, 2 min 26 s (descarga, 6 s; `wsl --install`, 69 s; instalador de Docker Desktop, 32 s); reinicio e inicio de sesión hasta que sigue el instalador, 1 min 40 s; paso 3, 1 min 40 s; paso 4, 3 s; paso 5, 4 min 6 s; paso 6, 8 s; paso 7, 39 s; paso 8, 2 s (pendiente), y paso 9 con la comprobación final, 11 s.
- **Microsoft Defender:** ninguna amenaza detectada tras la instalación.
- **La máquina virtual:**
  - apaga la pantalla a los 5 min sin teclado (plan Equilibrado), y el arnés lo desactiva para grabar;
  - no tiene GPU: la web de NeuroGraph abierta en Edge por el acceso «NeuroGraph» ocupa casi toda la CPU mientras sigue abierta, y con ella las pruebas de funciones se alargan hasta agotar su tiempo;
  - con el hipervisor de Windows en marcha (WSL2 activo), reiniciarla desde dentro la dejó colgada, sin pantalla ni disco y con una vCPU al 100 %, y reiniciarla desde fuera no la sacó; apagarla y encenderla funciona. El reinicio del instalador funcionó en las dos ejecuciones: el hipervisor aún no estaba en marcha.

**10/10/2026, memoria de la tractografía en la máquina virtual de pruebas** (12 GB; desde la copia limpia, con `NEUROGRAPH_PRUEBA_SIN_MEMORIA_TRACTO=1`, que solo salta la comprobación de memoria, y la memoria anotada cada 2-3 s; grabación y mediciones `20261010-204034-windows-medicion`):

- **Antes de la tractografía** (paso 8, con NeuroGraph encendido): Windows tenía 2866 MB disponibles; `vmmemWSL`, 5926 MB de conjunto de trabajo (6135 MB confirmados); el Linux de Docker, `MemTotal` 5919 MB y `MemAvailable` 4943 MB. Windows, sin la máquina virtual, usaba 12 268 − 5926 − 2866 = 3476 MB.
- **Durante** (167 muestras, de 20:50:37 a 20:58:21):
  - el contenedor llegó a 1940 MB (`memory.peak` de su cgroup; `memory.current`, 1805 MB como máximo), sin `OOMKilled` ni eventos `oom`;
  - dentro de Docker, el `MemAvailable` bajó hasta 3245 MB;
  - `vmmemWSL` no pasó de 5978 MB (5980 de pico en toda su vida; 6141 MB confirmados), y la disponible de Windows no bajó de 2760 MB.

  La máquina virtual ya ocupaba su tope desde el paso 5 (al construir las imágenes creció de 3076 a unos 5935 MB, y la disponible de Windows bajó de 5651 a unos 2832 MB): la tractografía usó la caché de su Linux sin tomar memoria de Windows.
- **Resultado:** 41 tractos, 176 nodos y 5176 aristas. El paso 8 tardó 7 min 49 s, con la descarga de Zenodo y la biblioteca en `%USERPROFILE%\NeuroData`.
- **Espacio:** la instalación completa, con la tractografía, gastó 13 185 MB de `C:` (de 28 622 a 15 437 MB libres). Con estas cifras y las del primer intento se fijan los umbrales de espacio de `esperado.ps1` (lo medido × 1,3, como en Linux): 8000 MB para lo que crece el disco virtual de Docker, 7000 MB para Docker Desktop y WSL si faltan, y los 1650 MB de la tractografía y los 1000 MB de la biblioteca.
- **Segunda medición**, en la instalación completa sin el gancho (con la misma anotación de la memoria; grabación `20261010-214136-windows-completa`): el contenedor llegó a 1945 MB; dentro de Docker, de 4942 a 3279 MB libres; `vmmemWSL`, de 5929 a 6013 MB. La disponible de Windows, que partía de 2914 MB, bajó a 2164 durante unos 20 s mientras se descargaba a la biblioteca, sin que creciera `vmmemWSL`: es memoria que gasta el propio Windows. El paso 8 tardó 6 min 13 s.
- **Umbrales que salen de aquí** (`instalacion/windows/lib/esperado.ps1`):
  - dentro de Docker, 4096 MB y el tope `4g`: el pico mayor de los medidos (2075 MB en Linux, H10; 1940 y 1945 aquí, con el mismo contenedor) por 1,5 = 3113 MB, redondeado hacia arriba a GB;
  - en Windows, lo que la máquina virtual aún puede tomar (aquí, 5919 + 256 − 5926 = 249 MB), como mucho 4096, más lo que gasta Windows: 750 × 1,5 = 1125, redondeado a 1200 MB;
  - la memoria que usa Windows, para la frase que propone `memory`: 3476 × 1,5 = 5214, redondeado a 5300 MB.

**11/10/2026, Claude Code y cinco escenarios en la máquina virtual de pruebas** (instalación con Claude Code, repetir, desinstalar y reinstalar, Docker con 4 GB y licencia rechazada, todos con 0 fallos en sus comprobaciones; grabaciones `20261011-*`):

- **Node y Claude Code**, como datos de prueba, sin iniciar sesión en Claude:
  - Node v24.21.0, la LTS de `nodejs.org/dist/index.json`, con el sha256 del MSI igual al publicado. Trae npm 11.19.0. El MSI pone `%APPDATA%\npm` en el PATH de la cuenta que lo instala.
  - Claude Code 2.1.296, la `latest` de npm (la `stable` era la 2.1.287), con `npm install -g`. El paquete instala un `claude.exe` nativo de 260 MB, y npm crea `claude.cmd`. npm avisa de que el `postinstall` del paquete no está en `allowScripts`; aun así, `claude.exe` funciona.
  - Sin iniciar sesión y sin Git Bash funcionan `claude --version`, `mcp list`, `mcp add`, `mcp remove` y `mcp get`.
- **Registro con `cmd.exe /c` en Claude Code:** conecta. El paso 9 dice «Claude Code: conectado». En la sesión de la cuenta, en una ventana nueva y con el PATH nuevo, `claude mcp list` da `neurograph: cmd.exe /c C:\Users\demo\AppData\Local\neurograph-app\bin\neurograph-mcp.cmd - √ Connected` (en Windows, Claude Code escribe `√`).
- **`neurograph-mcp` con NeuroGraph apagado:** sale con 1 en 0,47 s. Por la salida de errores escribe «neurograph-mcp: NeuroGraph apagado: para usarlo, abre NeuroGraph (con su acceso o con: neurograph abrir) y vuelve a conectar (en Claude Code, con /mcp).», y por la estándar, nada.
- **Instalación completa con Claude Code** (`20261011-011756-windows-ias`): 17 min 25 s del doble clic a la pantalla final, con el paso 8 en 5 min 45 s. Gastó 10 709 MB de `C:`, sin contar Node ni Claude Code.
- **Reinicio:** `RunOnce` sigue solo, sin segunda elevación: en los registros hay una sola línea «pidiendo permiso de administrador». Se ve en el minuto 4:28 del vídeo en tiempo real de `20261011-011756-windows-ias`: «Continuando la instalación de NeuroGraph tras el reinicio.», sin UAC.
- **Repetir la instalación** (`20261011-013717-windows-repetir`): 1 min 23 s según el registro, sin preguntar la biblioteca ni la licencia y sin elevar. El paso 2 dice «ya estaba», el 7 «base conservada: 1172 regiones, 104115 conexiones» y el 8, en 14 s, «La tractografia ya esta instalada». `estado.env` sigue con la tractografía `instalada`.
- **Licencia rechazada** (`20261011-015534-windows-licencia_rechazada`, desde la copia limpia): sale con 1 en el paso 2, con «Sin aceptar las condiciones de Docker Desktop no se puede instalar. Si cambias de idea, vuelve a ejecutar el instalador.». No hay UAC, ni descarga de Docker Desktop (ni carpeta `descargas`), ni entrada en `RunOnce`. `estado.env` queda con `NG_LICENCIA_DOCKER=rechazada`.
- **Desinstalar y reinstalar** (`20261011-013924-windows-desinstalar` y `20261011-014022-windows-reinstalar`):
  - `neurograph desinstalar` tarda 14 s, con la pregunta. Quita los contenedores, las imágenes, los accesos, `bin\`, la entrada del PATH y el registro en Claude Code. Conserva el volumen (363 MB), `config.env`, la biblioteca (628 MB) y la caché de construcción (2,6 GB), y Docker Desktop sigue respondiendo.
  - Reinstalar tarda 1 min 34 s, sin preguntar la biblioteca: recupera la base («base conservada»), con la tractografía instalada y Claude Code conectado.
- **Docker con 4 GB** (`20261011-014438-windows-memoria_4gb`): con `memory=4GB` en `%USERPROFILE%\.wslconfig`, la WSL apagada (`wsl --shutdown`) y Docker Desktop otra vez, Docker tiene 3919 MB (`MemTotal`; con la memoria por defecto, 5919). De los 4096 MB configurados, Linux no deja ver 177.
  - La instalación principal ya tiene la tractografía cargada, y entonces la falta de memoria no la rebaja a pendiente (B2). Por eso se instaló un proyecto de prueba aparte, con su `LOCALAPPDATA`, su `APPDATA` y su clave del registro de Windows; la instalación principal no cambió.
  - Esa instalación termina con la tractografía pendiente: dentro de Docker había 2973 MB libres, y la frase propone `memory=6GB`, que es (3919 + 4096 − 2973 + 256) / 1024 = 5,2, hacia arriba. `neurograph tractografia` sale con 1 y la deja pendiente con la misma frase (con 2644 MB libres).
  - Sin la `.wslconfig`, Docker vuelve a 5919 MB.
- **La máquina virtual:** una vez, `Stop-Computer -Force` por SSH no la apagó (con Docker Desktop en marcha), y la misma orden, repetida, sí. El arnés la repite cada minuto.

## Por comprobar en la primera ejecución

- Qué vía activa WSL2 sin distribución en Windows 10, qué versión de WSL queda y si obliga a reiniciar (en Windows 11, en «Datos verificados»).
- Que, tras activar WSL2 sin reiniciar, Docker Desktop no arranca y la marca de reinicio pendiente lo explica: el paso 3 solo la mira cuando Docker no arranca a tiempo, porque la de Windows Update puede durar días.
- La memoria del Linux interno de Docker con 8 GB en Windows, y la de Docker Desktop en reposo.
- Que `OOMKilled` y el evento `oom` funcionan igual en Docker Desktop.
- Los umbrales de espacio de la tractografía medidos en Windows (lo que crece el disco virtual de Docker en el paso 8, y la biblioteca).
- Que `df` dentro del contenedor da el espacio real de la unidad de Windows montada.
- Dónde guarda Docker Desktop la ubicación de su disco virtual cuando se ha movido.
- Que el registro con `cmd.exe /c` conecta en Codex CLI y Gemini CLI (en Claude Code, en «Datos verificados»).
- Que `conhost.exe --headless` lanza los accesos sin ventana en Windows 10 (en Windows 11, en «Datos verificados»).
- La edición y la versión del Windows 10 en el que se pruebe.
- Qué enseña Windows al hacer doble clic en `instalar.cmd` de un proyecto descargado como ZIP (la marca de internet).
