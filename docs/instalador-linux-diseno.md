# Instalador Linux de NeuroGraph — diseño (borrador)

**Estado, 24/09/2026:** el bloque A está aprobado y el bloque B aún no se ha presentado. No hay código todavía.

## Objetivo

Que una persona no técnica, con el proyecto ya descargado, instale y use
NeuroGraph en Linux con un solo comando. Y que pueda conectar su IA de
terminal (Claude Code, Codex CLI, Gemini CLI…) al MCP local del proyecto,
para aprovechar los datos en informes y papers.

## Principios

- **Apoyo auxiliar, nada de cambios en lo existente.** El instalador no toca
  el código ni la arquitectura del desarrollador principal, incluidos el MCP
  y sus imágenes. Todo lo nuevo va en `instalacion/`, y se reutilizan tal
  cual `backend/Dockerfile` y `scripts/rebuild_db_from_sql.sh` (decisión 75).
- **Complementa el instalador de Windows, no lo sustituye.** La app de
  escritorio Tauri (decisiones 54-70) sigue siendo el instalador de Windows.
  Una versión AppImage para Linux queda para más adelante.

## Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Cómo se lanza | Un comando en la terminal (`./instalar.sh`), con mensajes claros en español. Pide la contraseña de administrador solo si hay que instalar Docker. |
| Distribuciones | Instala Docker por sí solo en la familia Ubuntu/Debian (Ubuntu, Mint, Pop!_OS, Zorin, Debian…), desde el repositorio oficial de Docker. En otras distribuciones muestra un enlace a la guía oficial y se detiene. Si Docker ya está instalado, funciona en cualquier distribución. |
| Uso diario | Un icono "NeuroGraph" enciende la aplicación si está apagada y abre el navegador. Otro icono, "Apagar NeuroGraph", la apaga. El instalador la deja encendida al terminar. |
| Alcance de la v1 | Instalar, cargar los datos iniciales (orden de la decisión 75) y desinstalar (por defecto conserva los datos). Quedan fuera: actualizar sin perder datos, y el selector de archivos del navegador para "Importar síntesis de IA" (ese botón usa el diálogo nativo de Tauri y no funciona en el navegador). |
| Web y API | Igual que en desarrollo. La web se sirve con nginx (solo archivos estáticos) en el puerto 5173 por defecto. La API escucha en `127.0.0.1:8420` por defecto. Si un puerto está ocupado, se usa el siguiente libre y se avisa. Si la API no queda en el 8420, el número se ajusta solo en la copia compilada de la web dentro de la imagen, con verificación; el código fuente no se toca. Postgres no expone ningún puerto en el ordenador. |
| MCP | Conector local para IAs de terminal. Un comando `neurograph-mcp` enciende NeuroGraph si hace falta y ejecuta el MCP dentro del contenedor de la API. No cambia nada del MCP. |
| Al terminar | El script explica cómo abrir y apagar NeuroGraph, da la URL y explica cómo conectar el MCP. También deja un archivo con instrucciones para Claude Code, Codex CLI (OpenAI), Gemini CLI y un JSON genérico para otros clientes. |

## Bloque A (aprobado): qué se instala y cómo

**En el repositorio:**

```
instalacion/
├── README.md             instrucciones para personas no técnicas
├── docker/
│   ├── compose.yml       postgres + api + web
│   ├── web.Dockerfile    compila la web y la sirve con nginx
│   └── nginx.conf        solo la web (archivos estáticos)
└── linux/
    ├── instalar.sh
    ├── desinstalar.sh
    ├── lib/              funciones comunes (mensajes, Docker, puertos)
    └── plantillas/       lo que se copia al ordenador
```

**En el ordenador** (después se puede borrar la carpeta descargada):

- `~/.local/share/neurograph/`: la configuración (puertos y una contraseña
  aleatoria para la base de datos), el registro de la instalación y el
  archivo de conexión con IAs.
- `~/.local/bin/`: los comandos `neurograph abrir | apagar | estado | desinstalar`
  y `neurograph-mcp`.
- En el menú de aplicaciones: los iconos "NeuroGraph" y "Apagar NeuroGraph".
- En Docker: tres imágenes y un volumen con los datos. El proyecto usa un
  nombre propio (`neurograph-app`), así que no choca con el entorno de
  desarrollo.

**Pasos que ve la persona:**

```
[1/8] Comprobando el ordenador ............ ✔  Linux, internet, espacio, memoria
[2/8] Docker .............................. ✔  si falta: pide la contraseña y lo instala
[3/8] Permiso para usar Docker ............ ✔  sin reiniciar sesión
[4/8] Comprobando puertos ................. ✔  web 5173 · API 8420 (si están ocupados: el siguiente libre, con aviso)
[5/8] Preparando NeuroGraph ............... ✔  5-10 min la primera vez
[6/8] Encendiendo ......................... ✔
[7/8] Cargando datos (24 archivos) ........ ✔  1172 regiones, 104115 conexiones
[8/8] Iconos, comandos y conexión con IAs . ✔
```

- La salida técnica va al registro, no a la pantalla. Si algo falla, se
  muestra una frase con lo que ha pasado, qué hacer y dónde está el registro
  para enviarlo.
- Si se vuelve a ejecutar sobre una instalación que ya existe, comprueba que
  todo esté en marcha y rehace los iconos y los comandos, sin tocar los datos.
  Reutiliza los puertos guardados.
- Si una instalación anterior falló a medias, borra lo incompleto y empieza
  de cero. En ese punto todavía no hay datos de la persona que perder.

## Bloque B (pendiente de presentar)

- **Uso diario:** los comandos `neurograph abrir`, `apagar`, `estado` y
  `desinstalar`, los iconos y los avisos del escritorio (notify-send).
- **`neurograph-mcp`:** por la salida estándar solo puede salir el protocolo
  MCP, así que cualquier mensaje va a la salida de errores. También tiene que
  funcionar antes de volver a iniciar sesión, con `sg docker`.
- **Conexión con IAs:** falta decidir si registrar el conector
  automáticamente en las IAs que se detecten. El archivo de instrucciones
  cubrirá Claude Code, Codex CLI, Gemini CLI y un JSON genérico. Antes de
  escribirlos hay que verificar los comandos `mcp add` de cada una en su
  documentación oficial.
  - El MCP devuelve las figuras a la IA, tal como está diseñado. Si se
    necesita el PNG como archivo, ya existen los endpoints `/render/*` de la
    API: solo hay que explicarlo en las instrucciones.
- **Pantalla final:** la URL, cómo abrir y apagar NeuroGraph, y el estado de
  la conexión con IAs.
- **Desinstalar:** conserva los datos salvo que se pida lo contrario.
- **Errores y registro.**
- **Pruebas:**
  - En este equipo, que ya tiene Docker y los puertos 5173 y 8420 ocupados
    por el entorno de desarrollo: sirve para probar de verdad el aviso de
    puertos.
  - En una máquina virtual Ubuntu limpia (qemu/virsh disponibles), para la
    instalación de Docker.
  - El MCP, con `initialize`/`tools/list` y `claude mcp list`.

## Datos verificados (24/09/2026)

- Con NeuroGraph encendido: unos 550 MB de RAM (API 460 MB, Postgres 90 MB),
  unos 1,4 GB de imágenes y 170 MB de datos.
- El MCP funciona dentro del contenedor de la API
  (`docker exec -i <api> python -m backend.mcp.server`): responde a
  `initialize` y lista sus 12 herramientas, sin Python en el ordenador ni
  puerto de Postgres.
  - Una llamada real, `get_connectivity` con V1, V2 y MT, devolvió 3
    conexiones de Rosen & Halgren 2021 y 9 tractos con su cita y DOI
    (Yeh 2022). La llamada quedó registrada en `mcp_call_log`.
- El `.mcp.json` del repositorio apunta a una ruta de Windows
  (`E:\Neurograph\.venv\Scripts\python.exe`) y por eso falla en Linux. No se
  toca: es configuración del desarrollador principal.

## Fuera de alcance: huecos del MCP para papers

Se proponen aparte al desarrollador principal. No forman parte del instalador.

1. Las conexiones no traen la cita de su estudio, y las regiones no traen la
   de su atlas.
2. No hay herramienta para ver qué atlas, especies o redes están cargados, ni
   para buscar una región por nombre.
3. La bibliografía del proyecto (tablas `studies` y `evidence`) no se puede
   consultar desde el MCP.
4. `propose_dataset_ingestion` necesita la carpeta de la biblioteca de datos,
   que no existe dentro de Docker.
