# Instalador Linux de NeuroGraph — diseño

**Estado, 03/10/2026:** implementado, con las pruebas B8.1-B8.5 (H10). Pendiente: la prueba en una máquina virtual Ubuntu limpia (B8.6), con Codex CLI y Gemini CLI de verdad si se pueden instalar allí, y el vídeo (B9).

## Objetivo

Que una persona no técnica, con el proyecto ya descargado, instale y use
NeuroGraph en Linux con un solo comando. Y que pueda conectar su IA de
terminal (Claude Code, Codex CLI, Gemini CLI…) al MCP local del proyecto,
para aprovechar los datos en informes y papers.

## Principios

- **Apoyo auxiliar, nada de cambios en lo existente.** El instalador no toca
  el código ni la arquitectura del desarrollador principal, incluidos el MCP
  y sus imágenes. Todo lo nuevo va en `instalacion/`, y se reutilizan tal
  cual `backend/Dockerfile`, `scripts/rebuild_db_from_sql.sh` (H1) y
  `scripts/install_tractography.sh` (H4, H8). El único cambio fuera de
  `instalacion/` es en este último, que es nuestro (ver «Cambios fuera de
  `instalacion/`»).
- **Complementa el instalador de Windows, no lo sustituye.** La app de
  escritorio Tauri (decisiones 54-70) sigue siendo el instalador de Windows.
  Una versión AppImage para Linux queda para más adelante.
- **Se verifica el resultado real, no el mensaje de éxito** (principio 21):
  cada paso comprueba recuentos o respuestas reales antes de darse por bueno.
- **Nada falla en silencio** (principios 9 y 10): todo fallo da una frase con
  lo que ha pasado, qué hacer y dónde está el registro.
- **Nunca se borran datos que se hayan podido usar:** ni un volumen con la
  marca `NG_BASE_CARGADA`, ni uno de origen desconocido, ni la biblioteca.
  Solo se rehace un volumen que creó este instalador y que una instalación
  cortada dejó sin cargar (bloque A).

## Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Cómo se lanza | Un comando en la terminal (`./instalar.sh`), con mensajes claros en español. Pide la contraseña de administrador solo si hace falta: para instalar Docker o `curl`, para dar permiso de Docker o para arrancar Docker si está parado. |
| Distribuciones | Instala Docker por sí solo en Ubuntu y sus derivadas (Mint, Pop!_OS, Zorin…) y en Debian, desde el repositorio oficial de Docker. Otras derivadas de Debian (LMDE, Kali…), cuyo nombre en clave no es el de Debian, se tratan como otra distribución. En otras distribuciones muestra un enlace a la guía oficial y se detiene. Si Docker ya está instalado, vale cualquier distribución, con los requisitos de B1. Solo se prueba en Ubuntu 24.04; el resto queda como «sin probar». |
| Uso diario | Un icono "NeuroGraph" enciende la aplicación si está apagada y abre el navegador. Otro icono, "Apagar NeuroGraph", la apaga. El instalador la deja encendida al terminar. No arranca sola al encender el ordenador. |
| Alcance de la v1 | Instalar, cargar los datos iniciales (orden de la H1), instalar la tractografía y desinstalar (por defecto conserva los datos). Quedan fuera: actualizar sin perder datos, y el selector de archivos del navegador para "Importar síntesis de IA" (ese botón usa el diálogo nativo de Tauri y no funciona en el navegador). |
| Web y API | Igual que en desarrollo: la web en el puerto 5173 y la API en el 8420 por defecto, las dos solo en `127.0.0.1`. Si un puerto está ocupado, al instalar o al abrir, se usa el siguiente libre y se avisa. El puerto de la API se escribe en la web compilada al arrancar su contenedor, no al construir la imagen, así que se puede cambiar sin el repositorio. El código fuente no se toca. Postgres no expone ningún puerto en el ordenador. |
| Tractografía | Dentro de un contenedor temporal de herramientas, que ejecuta `scripts/install_tractography.sh`. No pide Python ni nada más al ordenador. Si la memoria o el espacio no llegan para ella, NeuroGraph se instala sin tractografía y queda «pendiente» con el motivo. |
| Biblioteca | Puede ir en otra carpeta o disco, como un SSD (`docs/portabilidad.md`). La primera vez, sin `--biblioteca RUTA`, se pregunta: se propone una biblioteca que ya exista (`~/NeuroData` o la `NeuroData` de un disco montado, con su manifiesto) o `~/NeuroData`, y se puede escribir o arrastrar otra carpeta. Se guarda y no se vuelve a preguntar. Si ya es una biblioteca de NeuroGraph, se reutiliza. Nunca se borra sola. |
| MCP | Conector local para IAs de terminal. `neurograph-mcp` ejecuta el MCP dentro del contenedor de la API. **Si NeuroGraph está apagado, no lo enciende:** sale al momento con un mensaje, para que abrir una IA en cualquier carpeta no gaste memoria. No cambia nada del MCP. |
| IAs | Detecta Claude Code, Codex CLI y Gemini CLI y pregunta una vez si conectarlas. Deja siempre un archivo de instrucciones. |
| Vídeo | Una toma limpia en una máquina virtual Ubuntu recién instalada, con las esperas aceleradas y rotuladas, para compartir. |

## Bloque A: qué se instala y cómo

**En el repositorio:**

```
instalacion/
├── README.md                    instrucciones para personas no técnicas
├── CLAUDE.md                    reglas y comandos de verificación de esta parte
├── docker/
│   ├── compose.yml              postgres + api + web, solo con imágenes ya construidas
│   ├── web.Dockerfile           compila la web y la sirve con nginx
│   ├── web.Dockerfile.dockerignore
│   ├── web-entrypoint.sh        escribe el puerto de la API en la web compilada
│   ├── nginx.conf               solo la web (archivos estáticos)
│   └── herramientas.Dockerfile  imagen de la API + cliente de Docker + scripts/
└── linux/
    ├── instalar.sh
    ├── desinstalar.sh
    ├── lib/                     funciones comunes (pasos, mensajes, registro, Docker, puertos, IAs, cifras esperadas)
    ├── plantillas/              lo que se copia al ordenador (comandos, iconos, instrucciones)
    └── pruebas/                 pruebas de las funciones y de los fallos provocados
```

**En el ordenador** (después se puede borrar la carpeta descargada):

- `~/.local/share/neurograph/`:
  - `config.env` (permisos `600`): puertos, ruta de la biblioteca y una
    contraseña aleatoria para la base de datos;
  - `estado.env`: pasos hechos, estado de la tractografía con su motivo,
    imágenes que descargó el instalador e IAs que registró;
  - `compose.yml`, una copia de `instalacion/docker/compose.yml`;
  - el icono (PNG de `frontend/src-tauri/icons/`), una copia de
    `desinstalar.sh` y de `lib/`, el archivo de conexión con IAs y la
    carpeta `registro/`.
  
  Los dos `.env` son `CLAVE=valor`, uno por línea, y los leen todas las
  piezas (instalador, `neurograph`, `neurograph-mcp`, desinstalador).
- `~/.local/bin/`: los comandos `neurograph` y `neurograph-mcp`.
- En el menú de aplicaciones: los iconos "NeuroGraph" y "Apagar NeuroGraph".
- En Docker, con el proyecto `neurograph-app` (no choca con el entorno de
  desarrollo):
  - contenedores `neurograph-app-postgres`, `neurograph-app-api` y
    `neurograph-app-web`, sin política de reinicio;
  - imágenes `neurograph-app-api` (de `backend/Dockerfile`),
    `neurograph-app-web` y `neurograph-app-herramientas`, construidas con
    `docker build` en el paso 5. El compose solo las usa, no las construye;
  - un volumen con los datos.
  
  Postgres usa `POSTGRES_USER` y `POSTGRES_DB` = `neurograph`, como
  esperan los dos scripts que se reutilizan. La web se construye con la raíz
  del repositorio como contexto y su propio `web.Dockerfile.dockerignore`,
  que repite las reglas del `.dockerignore` de la raíz (entre ellas,
  `frontend/node_modules`, que no sirve de una plataforma a otra) y excluye
  además `frontend/src-tauri/target`.
- `~/NeuroData`: la biblioteca, con los originales de la tractografía, su SQL
  y sus fichas (H8).

**Pasos que ve la persona:**

```
[1/9] Comprobando el ordenador ............ ✔  Linux, programas, internet, espacio, memoria
[2/9] Docker .............................. ✔  si falta: pide la contraseña y lo instala
[3/9] Permiso para usar Docker ............ ✔  sin reiniciar sesión
[4/9] Comprobando puertos ................. ✔  web 5173 · API 8420 (si están ocupados: el siguiente libre, con aviso)
[5/9] Preparando NeuroGraph ............... ✔  5-10 min la primera vez
[6/9] Encendiendo ......................... ✔
[7/9] Cargando datos (24 archivos) ........ ✔  1172 regiones, 104115 conexiones
[8/9] Tractografía (unos 500 MB) .......... ✔  41 tractos, 176 nodos y 5176 aristas (se puede repetir si falla)
[9/9] Iconos, comandos y conexión con IAs . ✔
```

- La salida técnica va al registro, no a la pantalla.
- Si se vuelve a ejecutar sobre una instalación que ya existe, comprueba que
  todo esté en marcha y rehace los iconos y los comandos, sin tocar los datos.
  Reutiliza los puertos guardados.
- **El paso 3** explica que el permiso de Docker equivale a ser administrador
  del ordenador. Desde ese momento, toda llamada a Docker de las piezas del
  instalador pasa por una función que, si el proceso aún no tiene el grupo
  (sesión anterior al permiso), se relanza con `sg docker`. Vale para el
  propio instalador, `neurograph`, los iconos y `neurograph-mcp`.
- **El paso 7** ejecuta `rebuild_db_from_sql.sh neurograph-app-postgres` en
  el ordenador, desde la carpeta del proyecto, cuando Postgres ya acepta
  conexiones por TCP (`pg_isready -h 127.0.0.1`: en la primera arrancada la
  imagen levanta un servidor provisional solo por socket). El script solo
  imprime los recuentos, así que el instalador los compara él mismo con las
  cifras de la H1 (1172 regiones, 104 115 conexiones) y exige 0 en las
  comprobaciones de huérfanas, regiones sin abreviatura y atlas sin estudio.
- **Dos marcas en `config.env` describen el volumen** (precisado el
  02/10/2026): `NG_VOLUMEN_PROPIO`, que se escribe al crearlo, y
  `NG_BASE_CARGADA`, que se escribe solo cuando el paso 7 termina y sus
  recuentos cuadran. Van junto a la contraseña: se conservan juntas al
  desinstalar y se borran juntas con `--borrar-datos`. No se decide por si
  existía `config.env`, porque el paso 4 ya lo crea y una segunda ejecución
  borraría un volumen ajeno. Si el volumen no existe (también si se borró
  fuera del instalador, por ejemplo con `docker system prune --volumes`), las
  marcas se descartan y el paso 7 se aplica. Si el volumen ya existe:
  - **con `NG_BASE_CARGADA`** (instalación anterior conservada): el paso 7 no
    se aplica. Se muestran los recuentos reales y, si no coinciden con los de
    esta versión, se avisa de que actualizar está fuera de la v1. No es un
    error;
  - **con `NG_VOLUMEN_PROPIO` y sin `NG_BASE_CARGADA`** (una instalación de
    este instalador cortada en el paso 7, también por un apagón o un `kill`,
    que no pasan por la trampa): nunca llegó a usarse, así que se borra y se
    vuelve a crear. No se reintenta encima, porque `rebuild_db_from_sql.sh` no
    vuelve a aplicar las migraciones si ya existe `alembic_version`, y una
    migración a medias dejaría la base rota;
  - **sin ninguna de las dos** (origen desconocido): nunca se borra. Primero
    se mira, por el socket local del contenedor, si tiene el esquema completo
    (`alembic_version` 0015) y regiones. Si los tiene, se le pone la
    contraseña de `config.env` y se trata como conservado; si no, no se toca
    nada: el instalador se para, lo explica y da el comando para borrarlo a
    mano.
- **Las cifras esperadas** (1172, 104 115, 41, 176, 5176 y las 12
  herramientas del MCP) viven en un solo archivo de `lib/` y salen de la H1,
  la H4 y el MCP. Si el desarrollador principal añade datos o herramientas,
  se actualizan ahí.

## Bloque B: funcionamiento

### B1. Detección de errores

**Cada paso** pasa por la misma función, que:

1. comprueba si ya está hecho y, si lo está, lo salta;
2. lo ejecuta, con la salida técnica al registro;
3. verifica el resultado real: recuentos de la base, que la web y la API
   respondan, que el MCP liste sus herramientas.

**Antes de empezar (paso 1)** se comprueba, diciendo exactamente qué falta:

- **los programas del ordenador**, lo primero: bash 4 o posterior,
  coreutils, `flock`, `ss`, `sg` y `curl`. Si falta `curl` en la familia
  Debian, se instala con `apt` en ese momento (pide la contraseña), antes de
  comprobar la conexión, que lo necesita; si `apt` no llega a sus
  repositorios, se dice así. En otra distribución, se para. `notify-send` y
  `xdg-open` son opcionales (ver B3). Qué trae de verdad un Ubuntu de
  escritorio limpio se comprueba en la máquina virtual;
- **la conexión con cada sitio del que se descarga:** Docker Hub
  (`registry-1.docker.io`, `auth.docker.io`,
  `production.cloudflare.docker.com`), `deb.debian.org` (paquetes de las
  imágenes), `pypi.org` y `files.pythonhosted.org`, `registry.npmjs.org`,
  `zenodo.org` y, si hay que instalar Docker, `download.docker.com`. Si una
  red bloquea uno, el mensaje lo nombra;
- **el espacio libre**, por separado donde Docker guarda sus datos y en la
  biblioteca;
- **la memoria disponible.** Si no llega ni para la base, se para. Si llega
  para la base pero no para la tractografía (pico medido), se instala sin
  ella y queda «pendiente: memoria insuficiente (hace falta X, hay Y)». Igual
  con el espacio;
- **la arquitectura:** se prueba en x86_64; en otra (ARM) se avisa de que no
  está probada;
- **la biblioteca:** que sea de NeuroGraph o esté vacía (ver B2).

**Docker, si ya estaba instalado**, tiene que cumplir:

- `docker compose` (versión 2) y `docker buildx`. Si faltan, se para con el
  paquete exacto que hay que instalar en Ubuntu y en Debian, comprobado en
  packages.ubuntu.com y packages.debian.org al implementarlo;
- no ser Docker sin root (rootless) ni Podman haciéndose pasar por Docker: no
  son compatibles en la v1 y se para con ese mensaje;
- si es el de snap, que limita qué carpetas se pueden montar, se avisa;
- si está parado, se arranca con `systemctl start docker` (pide la
  contraseña). No se cambia si arranca con el ordenador.

**Al instalar Docker** en derivadas de Ubuntu (Mint, Pop!_OS, Zorin), el
repositorio oficial se elige con `UBUNTU_CODENAME` de `/etc/os-release`, no
con `VERSION_CODENAME`.

**Durante la instalación:** `set -Eeuo pipefail` y una trampa de errores; el
registro guarda el comando que falló, el paso y la línea. Cada fallo conocido
tiene una señal concreta y una frase:

| Fallo | Cómo se detecta | Qué dice |
|---|---|---|
| Sin conexión con un sitio | Paso 1: una petición HTTPS a cada sitio | Qué sitio no responde y que puede ser un cortafuegos |
| Sin espacio | Paso 1 con `df`; después, `no space left on device` en el registro | Dónde falta y cuánto hace falta |
| Sin memoria en la tractografía | `State.OOMKilled` del contenedor con nombre, o el evento `oom` de `docker events`; la prueba B8.3 decide cuál es fiable | Que faltó memoria, que se cierren programas y `neurograph tractografia` |
| md5 que no coincide | Texto de `install_tractography.sh`: «el md5 no coincide» | Que el archivo de Zenodo llegó dañado y se borró; repetir |
| Descarga fallida | «no se pudo descargar» | Qué archivo y que se reanuda al repetir |
| Recuentos de la generación | «los recuentos no coinciden» | Que el SQL generado no cuadra y no se cargó |
| Dependencias de Python | «no se pudieron instalar las dependencias de Python» (nuevo, ver «Cambios») | Que falló la descarga desde PyPI |
| Ficha que no cuadra | «no corresponde a sus archivos» | Qué archivo de la biblioteca no cuadra con su ficha; nunca se sobrescribe |
| Carga de datos | `rebuild_db_from_sql.sh` sale con `ERROR` y el archivo | Qué archivo falló |
| Puerto ocupado | Antes de arrancar, `ss -ltn` (IPv4 e IPv6) y los puertos que publican los demás contenedores (`docker ps`), porque sin `userland-proxy` `ss` no los ve; al arrancar, `address already in use` o `port is already allocated` | Qué puerto y cuál se usa en su lugar |
| Espera agotada | Tiempo máximo de `pg_isready`, `/health` o la web | Qué pieza no arrancó y su registro |
| Docker parado o sin permiso | `docker info` sin respuesta o `permission denied` en el socket | Cómo arrancarlo o que se vuelva a ejecutar el instalador |
| Imágenes borradas (p. ej. `docker system prune`) | `docker image inspect` falla | Que se vuelva a ejecutar `./instalar.sh` desde el proyecto |
| Docker no compatible | Requisitos de arriba | Qué falta o qué no es compatible |

Un fallo fuera del catálogo da un mensaje genérico con la ruta del registro.
Una prueba busca cada texto del catálogo en los scripts reales, para que, si
cambia su redacción, la prueba falle.

**Ctrl+C o un corte** dejan la instalación marcada como incompleta, con el
mensaje de que basta con volver a ejecutar `./instalar.sh`. **Dos
instalaciones a la vez** se impiden con un bloqueo (`flock`). **Las descargas
cortadas se reanudan.**

**Qué se borra si algo falla:** solo lo incompleto, y solo si falla antes de
terminar el paso 7: los contenedores e imágenes creados en esa ejecución y un
volumen propio sin la marca `NG_BASE_CARGADA` (ver el bloque A). Un volumen con la
marca, o de origen desconocido, nunca se borra. Si falla la tractografía
(paso 8), NeuroGraph queda instalado y funcionando sin ella; la pantalla
final dice «Tractografía: pendiente» con el motivo, y `neurograph
tractografia` la repite.

**El registro** va en `~/.local/share/neurograph/registro/instalar-AAAAMMDD-HHMMSS.log`:
versiones del sistema y de Docker, cada comando con su salida y la hora. La
contraseña de la base nunca aparece.

**Comprobación final de principio a fin:** la web responde en su URL;
`neurograph-mcp` responde a `initialize` y lista sus 12 herramientas (salen
de la imagen, no del volumen); la API da 1172 regiones y 104 115 conexiones,
y la base tiene 41 tractos, 176 nodos y 5176 aristas de tractografía. Con un
volumen conservado de otra versión, los recuentos no se exigen exactos: se
muestran, se avisa si difieren y solo se exige que la API responda con datos
y que las comprobaciones de huérfanas den 0.

### B2. Tractografía y biblioteca

**Dónde va la biblioteca.** Si no se da `--biblioteca RUTA` y no hay una
guardada en `config.env`, al empezar:

1. Se buscan bibliotecas que ya existan: `~/NeuroData` y la carpeta
   `NeuroData` de cada disco montado (`/media/<usuario>/*`,
   `/run/media/<usuario>/*` y `/mnt/*`), si llevan el manifiesto
   `.neurograph_library.yaml`.
2. Se propone la primera, o `~/NeuroData`: «¿Guardar la biblioteca de datos
   (unos 630 MB) en …? [S/n]».
3. Con un no, se escribe la carpeta o se arrastra desde el gestor de archivos
   (las comillas que pone la terminal se quitan).
4. Sin terminal, se usa la propuesta sin preguntar, y se anota.

La elegida pasa a los argumentos, para que el relanzado con `sg` no vuelva a
preguntar, y se comprueba como cualquier otra.

**La imagen de herramientas** (`herramientas.Dockerfile`) parte de la imagen
de la API ya construida en el paso 5 (Python 3.10, numpy, nibabel y el
backend) y añade el cliente de Docker (copiado de la imagen oficial
`docker:cli`), `curl` y `scripts/`. Como lleva los scripts dentro,
`neurograph tractografia` funciona aunque se borre la carpeta del proyecto.

**Se ejecuta** como un contenedor con nombre fijo,
`neurograph-app-tractografia`, con `install_tractography.sh neurograph-app-postgres`:

- `--user` con el usuario y el grupo de la persona (más el grupo del socket
  de Docker): los archivos de la biblioteca quedan a su nombre;
- el socket de Docker montado: el script sigue usando `docker cp` + `psql -f`,
  nunca una tubería (riesgo 7);
- la biblioteca montada en la misma ruta que en el ordenador, para que los
  mensajes y el registro muestren rutas reales, y `NEUROGRAPH_LIBRARY__PATH`
  apuntando a ella;
- `--memory` con el pico medido más un margen y sin swap. Sustituye al
  `systemd-run` del script, que dentro del contenedor no existe;
- sin `--rm`: al terminar, el instalador lee su código de salida y
  `State.OOMKilled`, y después lo borra.

**Interrupciones:** `docker run` solo pasa las señales al primer proceso del
contenedor, no al generador ni a `psql`. Por eso la trampa de Ctrl+C del
instalador hace `docker kill` y `docker rm` de `neurograph-app-tractografia`.
Antes de empezar el paso 8, si existe un contenedor con ese nombre: si está
en marcha, se para con el mensaje «ya hay una instalación de la tractografía
en marcha»; si está parado, se borra. El `flock` protege el ordenador y el
nombre fijo protege Docker.

**Estados de la tractografía** (en `estado.env` y en la pantalla final):
instalada; pendiente, con el motivo; o cargada con una ficha en conflicto,
cuando la base ya la tiene pero una ficha de la biblioteca no cuadra (el
script falla después de cargar).

**La biblioteca:**

- `~/NeuroData` por defecto; `--biblioteca RUTA` para otra (por ejemplo, un
  disco externo). La ruta queda en `config.env`.
- Si tiene `.neurograph_library.yaml`, se reutiliza y lo ya descargado o
  generado no se repite. Si una ficha no cuadra con su archivo, el script se
  para (H8) y el mensaje nombra el archivo. Nunca se sobrescribe.
- Si existe, no está vacía y no tiene ni manifiesto ni `original/`, el
  instalador se para y pide otra ruta: nunca escribe en una carpeta ajena.
- Solo se usa al instalar la tractografía. NeuroGraph funciona a diario sin
  ella, así que un disco externo desconectado no rompe nada.

### B3. Uso diario

**El comando `neurograph`** usa `~/.local/share/neurograph/compose.yml` y
`config.env`; no necesita la carpeta del proyecto.

| Orden | Qué hace |
|---|---|
| `abrir` | Si NeuroGraph ya está encendido y responde, solo abre el navegador. Si está apagado: comprueba los puertos guardados, sin contar sus propios contenedores (si uno está ocupado, elige el siguiente libre, lo guarda y avisa), lo enciende, espera a que la base, la API (`/health`) y la web respondan, con un tiempo máximo, y abre el navegador. Si Docker no está en marcha, explica cómo arrancarlo. Si faltan las imágenes, pide volver a ejecutar el instalador. |
| `apagar` | Para los contenedores. Los datos quedan en el volumen. |
| `estado` | Encendido o apagado, URL y puertos, recuentos de la base, tractografía (con su estado), IAs registradas, biblioteca y último registro. |
| `tractografia` | Repite el paso 8. |
| `conectar-ia` | Vuelve a detectar las IAs y a preguntar. |
| `desinstalar` | Ver B7. |

- Si los contenedores se borraron (p. ej. con `docker container prune`),
  `abrir` los vuelve a crear desde las imágenes y la configuración.
- **En el equipo de desarrollo**, los dos NeuroGraph comparten los puertos por
  defecto: Vite usa `strictPort` en el 5173 y el compose de desarrollo
  publica el 8420. El que arranca segundo no puede usarlos: NeuroGraph
  instalado elige otro y avisa, pero `npm run dev` falla. Se explica en el
  README.
- Si `~/.local/bin` aún no está en el PATH de esa sesión, la pantalla final lo
  dice. Los iconos y las IAs usan siempre la ruta completa.

**Los iconos** avisan con notificaciones del escritorio (`notify-send`):
«Encendiendo NeuroGraph…» y, si algo falla, la frase y la ruta del registro.
Sin notificaciones, se abre el registro con `xdg-open`.

**La web** escucha solo en `127.0.0.1`. La imagen guarda la web compilada
intacta en una carpeta aparte. En cada arranque (también tras `apagar` y
`abrir`, que reutilizan el mismo contenedor), `web-entrypoint.sh` la copia
de nuevo a la carpeta que sirve nginx y escribe en la copia el puerto de la
API (de `config.env`), en lugar de la constante `http://127.0.0.1:8420` de
`frontend/src/data/api.ts`. Comprueba que la ha sustituido exactamente una
vez; si no, el contenedor no arranca y lo dice.

### B4. `neurograph-mcp`

- Por la salida estándar solo sale el protocolo MCP. Todo lo demás va a la
  salida de errores y a `registro/mcp.log`.
- Si la sesión aún no tiene el permiso de Docker, se relanza con `sg docker`.
- **Si NeuroGraph está apagado, no lo enciende:** sale al momento con «NeuroGraph
  está apagado: ábrelo con el icono o con `neurograph abrir`, y vuelve a
  conectar (en Claude Code, `/mcp`)». La IA lo muestra como no conectado y no
  se gasta memoria.
- Si está encendido, ejecuta
  `docker exec -i neurograph-app-api python -m backend.mcp.server`.
- **Tiempo de arranque.** Codex espera 10 s por defecto
  (`startup_timeout_sec`). En la decisión 32, un primer intento dio
  `CONNECTION_CLOSED` y la hipótesis más plausible fue un arranque en frío.
  Se mide cuánto tarda el MCP en responder con NeuroGraph ya encendido. Si
  pasa de 10 s, las instrucciones explican cómo subir el tiempo de Codex; su
  `mcp add` no tiene opción para eso, así que su configuración no se edita a
  mano.

### B5. Conexión con IAs

- Busca `claude`, `codex` y `gemini` en el PATH (y `~/.local/bin/claude`) y,
  si encuentra alguna, pregunta una vez: «¿Conectar NeuroGraph con …? [S/n]».
- En cada una, primero quita un `neurograph` anterior de usuario (sin parar
  si no existe) y después lo añade; así se puede repetir. Todo se ejecuta
  desde la carpeta personal (`~`), nunca desde la del proyecto (ver
  «Precedencia»):

| IA | Quitar | Añadir (ámbito de usuario) | Comprobar |
|---|---|---|---|
| Claude Code | `claude mcp remove neurograph -s user` | `claude mcp add --transport stdio --scope user neurograph -- ~/.local/bin/neurograph-mcp` (en `~/.claude.json`) | `claude mcp list` da «Connected»: **conectado** |
| Codex CLI | `codex mcp remove neurograph` | `codex mcp add neurograph -- ~/.local/bin/neurograph-mcp` (en `~/.codex/config.toml`; no tiene ámbitos) | `codex mcp get neurograph`: solo confirma que está **registrado** |
| Gemini CLI | `gemini mcp remove --scope user neurograph` | `gemini mcp add --scope user neurograph ~/.local/bin/neurograph-mcp` (en `~/.gemini/settings.json`) | `gemini mcp list` muestra su estado de conexión: **conectado** |

  `~/.local/bin` se escribe como ruta absoluta. Sin `--trust` en Gemini:
  saltarse las confirmaciones lo decide la persona. La comprobación se hace
  con NeuroGraph encendido, como queda al final del paso 9.
- Se guarda en `estado.env` qué IAs registró el instalador, para que la
  desinstalación quite solo esas.
- **Precedencia en Claude Code:** local > proyecto > usuario. Dentro de la
  carpeta del repositorio, su `.mcp.json` (también llamado `neurograph`, con
  la ruta de Windows del desarrollador principal) tapa al de usuario. No se
  toca; las comprobaciones se hacen desde `~` y las instrucciones lo
  explican.
- **El archivo de instrucciones** (`~/.local/share/neurograph/conectar-ia.md`)
  trae los comandos de las tres, el JSON genérico
  (`{"mcpServers": {"neurograph": {"command": "…/neurograph-mcp", "args": []}}}`),
  el TOML de Codex (`[mcp_servers.neurograph]`), que NeuroGraph tiene que
  estar encendido para usarlo, cómo bajar las figuras como PNG desde
  `/render/*` de la API, el tiempo de arranque de Codex y el aviso del
  `.mcp.json`.

### B6. Pantalla final

```
NeuroGraph está instalado y encendido.
  Abrir:    icono «NeuroGraph» o  neurograph abrir   →  http://127.0.0.1:5174
  Apagar:   icono «Apagar NeuroGraph» o  neurograph apagar
  Datos:    1172 regiones · 104115 conexiones · tractografía: 41 tractos, 176 nodos
            (o «tractografía: pendiente — <motivo>», que dice cómo repetirla con: neurograph tractografia)
  IAs:      Claude Code ✔ conectado · Codex CLI ✔ registrado · Gemini CLI: no encontrado
            (las IAs solo ven NeuroGraph mientras está encendido)
  Avisos:
  ⚠ La web usa el puerto 5174 (el 5173 estaba ocupado).
  Ayuda:    ~/.local/share/neurograph/conectar-ia.md · registro: ~/.local/share/neurograph/registro/…
```

### B7. Desinstalar

`neurograph desinstalar` (copia de `desinstalar.sh`; no necesita la carpeta
del proyecto).

- **Por defecto conserva los datos.** Quita los contenedores, las tres
  imágenes propias, los iconos, los comandos, el archivo de instrucciones y la
  conexión con las IAs que registró el instalador. De las imágenes
  base, quita solo pgvector, si la descargó el instalador (anotada en
  `estado.env`) y ningún contenedor la usa: las de las construcciones (node,
  python, nginx, docker:cli) no quedan como imágenes con BuildKit, sino en su
  caché de construcción, que se informa y no se borra (comprobado al
  construir, 02/10/2026). Conserva el volumen de la base, `config.env` (con la contraseña: sin
  ella, una reinstalación no podría usar el volumen), los registros y la
  biblioteca. Al terminar dice qué ha quedado y cuánto ocupa, incluida la
  caché de construcción de Docker, que no se borra porque es común a todos
  los proyectos.
- **`--borrar-datos`** borra además el volumen y la configuración, tras
  escribir `BORRAR`.
- **La biblioteca nunca se borra sola:** puede compartirla el entorno de
  desarrollo y guarda originales con su procedencia (principio 15). Se dan su
  ruta y su tamaño para borrarla a mano.
- Docker no se desinstala.
- **Reinstalar** reutiliza el volumen y la configuración conservados, con su
  marca `NG_BASE_CARGADA`. Si falta la configuración, se sigue la regla del
  volumen de origen desconocido del bloque A.

### B8. Pruebas

De menos a más pesadas:

1. **Estáticas:** `bash -n` y shellcheck desde su imagen de Docker, sin
   instalarlo.
2. **Funciones** (`instalacion/linux/pruebas/`, en bash): comprueban la
   intención.
   - Con un puerto ocupado, al instalar y al abrir, elige el siguiente y avisa.
   - Una carpeta ajena como biblioteca para el instalador.
   - La desinstalación nunca toca la biblioteca ni un volumen anterior.
   - Un fallo antes del paso 7 borra solo lo creado en esa ejecución.
   - Las tres situaciones de un volumen que ya existe (con carga, propio sin carga,
     desconocido) hacen lo del bloque A, también al repetir la instalación.
   - `abrir` con NeuroGraph ya encendido no cambia de puerto.
   - `neurograph-mcp` con NeuroGraph apagado sale al momento, sin nada por la
     salida estándar.
   - Cada texto del catálogo existe en los scripts reales.
   - La web compilada sustituye la constante de la API exactamente una vez,
     también en el segundo arranque del mismo contenedor con un puerto
     distinto del 8420.
3. **Fallos provocados**, uno a uno, comprobando el mensaje, que el estado
   queda coherente y que volver a ejecutar lo arregla: sin red, md5 que no
   cuadra, poco espacio, falta de memoria (tope bajo forzado: decide si
   `State.OOMKilled` o `docker events` es la señal fiable), Ctrl+C a mitad de
   los pasos 5 y 8 (el contenedor de la tractografía tiene que quedar
   parado), un `kill -9` a mitad del paso 7 (la siguiente ejecución rehace el
   volumen sin marca), un puerto ocupado por otro contenedor, dos
   instalaciones a la vez, una ficha de la biblioteca alterada,
   un servidor que no acepta reanudar descargas. Se provocan con variables
   `NEUROGRAPH_PRUEBA_*`, documentadas en las propias pruebas y sin efecto si
   no se definen.
4. **En el equipo de desarrollo:** el aviso de puertos de verdad (desarrollo
   ocupa 5173 y 8420), sin tocar `neurograph-postgres` ni `neurograph-api`, y
   la conexión con Claude Code con un `HOME` temporal, sin cambiar la
   configuración real.
5. **Mediciones**, descargando de cero en una biblioteca de prueba en disco
   (no en `/tmp`, que es un tmpfs de 4 GB): pico de memoria y tiempo de la
   tractografía, espacio temporal dentro de Docker, lo que crece la base, y
   lo que tarda el MCP en responder con NeuroGraph encendido. Con estas cifras
   se fijan los umbrales del paso 1, el `--memory` y la memoria de la máquina
   virtual.
6. **Máquina virtual Ubuntu 24.04 limpia** (pendiente): qué programas trae
   (`curl`), instalación completa con Docker desde cero, iconos, abrir y
   apagar en la misma sesión (con `sg docker`) y tras volver a iniciarla,
   Codex y Gemini si se pueden instalar allí, desinstalar y reinstalar
   conservando los datos.

Las pruebas 4 a 6 consumen mucha memoria y CPU: solo con permiso del usuario,
con el equipo libre, con `nice -n 19` y de una en una. Los comandos de
verificación de `instalacion/` van en su CLAUDE.md.

### B9. Vídeo

- **Máquina virtual:** Ubuntu 24.04 LTS de escritorio en castellano, usuario
  genérico `demo`, 4 núcleos, 30 GB de disco (en disco) y la memoria que
  pidan las mediciones de B8.5 (en principio, 8 GB). La imagen ISO se
  comprueba con su SHA256 y su firma oficial. Tras instalar Ubuntu se guarda
  una instantánea «limpia»: las pruebas de B8.6 parten de ella y la toma buena
  vuelve a ella.
- **Orden:** implementar, probar en el equipo, probar en la máquina virtual,
  corregir, volver a la instantánea, grabar una toma sin cortes y montar.
- **Se ve:** la terminal en la carpeta del proyecto ya descargado y
  `./instalar.sh`; los 9 pasos, incluida la instalación de Docker; la pantalla
  final; el icono en el menú y NeuroGraph en el navegador con los datos
  reales; y Claude Code, abierto en la carpeta personal y no en la del
  proyecto, respondiendo una pregunta comprobable (conexiones entre V1, V2 y
  MT: 3 de Rosen & Halgren 2021 y 9 tractos de Yeh 2022).
- **La respuesta de la IA nunca se edita.** Si falla o se equivoca, se repite
  la toma. El inicio de sesión lo hace el usuario y ese tramo se corta.
- **Grabación** desde fuera de la máquina virtual, con ffmpeg sobre su
  ventana (virt-viewer por XWayland). Si en Wayland no funciona, el grabador
  de GNOME, que arranca el usuario.
- **Montaje con ffmpeg:** las esperas aceleradas con un rótulo visible
  («×10» o el factor de cada tramo), un título al principio y un MP4 en
  1080p en `~/Vídeos/`, fuera del repositorio. El usuario lo revisa antes de
  compartirlo.
- **Al terminar:** se cierra la sesión de Claude Code en la máquina virtual y,
  con el visto bueno del usuario, se borran la máquina y su disco.

## Cambios fuera de `instalacion/`

- `scripts/install_tractography.sh` (nuestro, H4 y H8):
  - reanudar las descargas cortadas (`curl -C -` sobre el `.part`). Si el
    servidor no acepta reanudar (código 33 de `curl`), se borra el `.part` y
    se descarga de cero una vez. Si el md5 no cuadra, el `.part` se borra como
    ahora;
  - un mensaje propio cuando falla la instalación de las dependencias de
    Python (`crear_entorno`), que hoy sale por `set -e` sin explicar nada.
- `docs/decisiones-herramientas.md`: entrada H10.
- `docs/criterios-herramientas.md`: se reescribe «Entornos», que hoy dice que
  en Linux solo existe la base de desarrollo, y se añade el criterio del
  instalador Linux.
- `CLAUDE.md` raíz: la descripción de este documento y la fila de
  `instalacion/` en el mapa (por su CLAUDE.md propio).

## Datos verificados

**24/09/2026:**

- Con NeuroGraph encendido: unos 550 MB de RAM (API 460 MB, Postgres 90 MB),
  unos 1,4 GB de imágenes y 170 MB de datos.
- El MCP funciona dentro del contenedor de la API
  (`docker exec -i <api> python -m backend.mcp.server`): responde a
  `initialize` y lista sus 12 herramientas, sin Python en el ordenador ni
  puerto de Postgres. Una llamada real, `get_connectivity` con V1, V2 y MT,
  devolvió 3 conexiones de Rosen & Halgren 2021 y 9 tractos con su cita y DOI
  (Yeh 2022), y quedó registrada en `mcp_call_log`.
- El `.mcp.json` del repositorio define `neurograph` con una ruta de Windows
  (`E:\Neurograph\.venv\Scripts\python.exe`) y por eso falla en Linux. No se
  toca: es configuración del desarrollador principal.

**02/10/2026:**

- La API acepta peticiones desde cualquier puerto de `localhost` o
  `127.0.0.1` (`allow_origin_regex` en `backend/api/main.py`): que la web
  cambie de puerto no rompe CORS. `API_BASE_URL` es una sola constante,
  `"http://127.0.0.1:8420"`, en `frontend/src/data/api.ts`.
- `npm run build` ejecuta `scripts/prepare.mjs`, `tsc -b` y `vite build`; con
  `npm ci` y el `.npmrc` del proyecto (H9) no se ejecuta ningún script de
  instalación de las dependencias. El `.dockerignore` de la raíz excluye
  `frontend/node_modules` y `frontend/dist`.
- `scripts/generate_org_tractography_geometry.py` y lo que importa del backend
  para las fichas solo usan la biblioteca estándar (se importa con
  `python3 -S`, sin paquetes instalados): el Python del sistema de la imagen
  basta para ese paso.
- Las dependencias de la generación (numpy 2.2.6, nibabel 5.4.2, vtk 9.7.0)
  tienen ruedas para Python 3.10 en x86_64 (PyPI): la imagen de la API sirve
  de base para la de herramientas.
- Vite usa `strictPort` en el 5173 (`frontend/vite.config.ts`).
- Comandos `mcp add` comprobados en la documentación oficial:
  https://code.claude.com/docs/en/mcp (Claude Code: `add` falla si el nombre
  ya existe en ese ámbito; el ámbito por defecto es `local`),
  https://learn.chatgpt.com/docs/extend/mcp?surface=cli (Codex: siempre en
  `~/.codex/config.toml`, `startup_timeout_sec` de 10 s por defecto) y
  https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md
  (Gemini: el ámbito por defecto es `project`). Que Codex y Gemini
  sobrescriben sin error un nombre repetido solo consta en su código fuente;
  por eso se quita antes de añadir.

**03/10/2026** (instalación real en este equipo, Ubuntu 26.04 y Docker 28.5.1, con los puertos 5173 y 8420 ocupados; las cifras de los umbrales, en `instalacion/linux/lib/esperado.sh`):

- Tiempos: la instalación completa tardó 4 min 38 s, con Docker ya instalado. De ellos, el paso 5 (construir las imágenes) llevó 57 s y la tractografía 3 min 20 s. Una segunda ejecución, sin cambios, tarda unos 10 s.
  - En el paso 5 se construyeron de cero las capas propias: antes se borró de la caché lo de las pruebas anteriores, y la memoria de cada `RUN` se midió.
  - Sin embargo, la imagen de Postgres ya estaba en el equipo, y la caché del entorno de desarrollo podía tener alguna imagen base.
  - En un ordenador nuevo el paso 5 tarda más. Lo medirá la máquina virtual (B8.6).
- Memoria:
  - con NeuroGraph encendido, 448 MB entre los tres contenedores;
  - el paso más pesado de la construcción es el `pip install` de la API, con 947 MB;
  - la tractografía tiene un pico de 2075 MB (`memory.peak` de su cgroup).
- Espacio:
  - la carpeta de Docker creció 2233 MB, más los 418 MB de la imagen de Postgres;
  - la capa del contenedor de la tractografía llega a 1040 MB (el entorno de Python);
  - la biblioteca ocupa 628 MB;
  - el volumen de la base, con la tractografía, ocupa 396 MB.
- La web solo escucha en IPv4 (`127.0.0.1`), así que la URL que se muestra es `http://127.0.0.1:<puerto>` y no `localhost`, que puede resolver a IPv6.
- Falta de memoria: con un tope de 300 MB, Docker 28.5.1 marca `OOMKilled=true` y emite el evento `oom`, aunque el proceso que muere no sea el PID 1 del contenedor. El instalador escucha las dos señales.

## Fuera de alcance

- Actualizar una instalación sin perder datos.
- «Importar síntesis de IA» en el navegador: toca el código del desarrollador
  principal y se le propone aparte.
- Docker sin root, Podman y arquitecturas distintas de x86_64.
- Huecos del MCP para papers, también para proponer aparte:
  1. Las conexiones no traen la cita de su estudio, y las regiones no traen la
     de su atlas.
  2. No hay herramienta para ver qué atlas, especies o redes están cargados,
     ni para buscar una región por nombre.
  3. La bibliografía del proyecto (tablas `studies` y `evidence`) no se puede
     consultar desde el MCP.
  4. `propose_dataset_ingestion` necesita la carpeta de la biblioteca de
     datos, que no está montada en el contenedor de la API.
