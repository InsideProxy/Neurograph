---
title: NeuroGraph — Decisiones de instalación y herramientas auxiliares
fecha: 2026-09-24
---

# NeuroGraph — Decisiones de instalación y herramientas auxiliares

Log de las decisiones sobre cómo se instala, se pone en marcha y se mantiene NeuroGraph: instaladores, Docker, reconstrucción de la base de datos, recuperación de datos y scripts auxiliares. Cada entrada cuenta qué se decidió, por qué y cómo se verificó. Las reglas vigentes que salen de aquí están resumidas en `docs/criterios-herramientas.md`.

**Numeración.** H1, H2… La H1 empezó en el log general (`docs/analisis-arquitectura.md`) como 75 y lleva ese número entre paréntesis: las referencias a «decisión 75» se encuentran buscándolo aquí. Un número sin letra (49, 53…) es una entrada del log general.

**Antecedentes.** Están en el log general: la 52 y la 53 (volcado de la base de datos) y de la 54 a la 70 (ejecutable de Windows con Tauri y Postgres embebido, firma y publicación en GitHub).

**Diseños en curso.** `docs/instalador-linux-diseno.md`: instalador para Linux basado en Docker (borrador).

## H1. Reconstrucción de la base de datos desde los `.sql` del repositorio, con orden de dependencias verificado (antes decisión 75) -- 24/09/2026

**Contexto.** Primera puesta en marcha en otro ordenador (Linux), sin el volcado de la decisión 53. `docker compose up -d` levanta Postgres vacío: sin tablas, `/regions` responde 500. La decisión 53 descartó reconstruir la base reproduciendo el historial cronológico de seeds y `salida_*.sql`. Aquí no se reproduce el historial: se establece un orden de carga a partir de lo que cada archivo define y referencia, y se comprueba contra la base resultante.

**Método.**
- Por cada archivo se extrajeron los IDs que define (primer valor de cada fila insertada) y los que referencia. Todas las referencias se resuelven dentro del conjunto: no falta ningún archivo intermedio.
- Las FKs reales del esquema solo cubren especie, atlas, estudio, tracto y red/región en las pertenencias. `connections`, `homologies` y `source_dataset_id` no tienen FK, así que su integridad se comprueba con consultas al final.
- Los cuatro `salida_*` de atlas (`mmp1`, `brainnetome`, `gordon333`, `subcortex`) se compararon fila a fila con sus seeds: mismas regiones, nombres y coordenadas, más `abbreviation` y `hemisphere`. Resuelve el punto a) de la decisión 53: se aplican los `salida_*` y no los seeds.
- `register_atlas_studies` va antes de los backfills de metadatos de estudios; si fuera después, su `ON CONFLICT` volvería a escribir name/doi/year. `salida_backfill_hcp_mmp1_names` va después de todo lo que escribe regiones de HCP-MMP1.0.
- `salida_mmp1.sql` tiene un byte cp1252 (un guion largo en un comentario). Se convierte a UTF-8 en una copia temporal; el archivo no se modifica.

**Entregado.** `scripts/rebuild_db_from_sql.sh`: migraciones (solo si la base está vacía), los 24 archivos de datos en orden y recuentos de verificación. Mismo mecanismo que `scripts/apply_sql.ps1` (`docker cp` + `psql -f`, riesgo 7), cada archivo en su propia transacción. El orden y su justificación están en `backend/database/migrations/README.md`.

**Verificación.** Probado dos veces seguidas contra un Postgres desechable: 15 migraciones y 24 archivos sin error, y la segunda pasada no cambia ningún recuento. Resultado: 3 especies, 8 atlas (todos con estudio), 1172 regiones (ninguna sin `abbreviation`), 1172 coordenadas, 65 redes, 1744 pertenencias, 104115 conexiones, 52 tractos, 60 homologías, 10 estudios, 8 datasets. Cero coordenadas, conexiones u homologías huérfanas. Contra el volcado de la decisión 53 coincide todo salvo lo añadido después (41 redes y 1078 pertenencias de la decisión 73) y lo que no tiene SQL en el repositorio.

**Pendiente real.** Faltan los 41 tractos del atlas ORG y sus 41 `tract_geometries`, además de `tractography_nodes`/`tractography_edges`. No hay SQL de ellos en el repositorio: salen de `generate_org_tractography_geometry.py` y `generate_hybrid_tractography_nodes.py`, que necesitan la biblioteca original (`E:\NeuroData`). La vista de tractografía queda sin esos datos hasta que se generen. No hay versión `.ps1` del script todavía: se escribió y probó en Linux. **Resuelto en Linux por la H4;** en Windows la tractografía sigue sin script.

**Actualización, 24/09/2026: de dónde recuperarlo.** Los dos archivos originales siguen publicados en Zenodo y se descargan desde Linux:
- `ORG-800FiberClusters.zip` (492 MB, md5 `ee5f73e15d28f177e65ba38dbb6c8a7a`), registro 2648292 (10.5281/zenodo.2648292). Tiene el mismo nombre y la misma carpeta raíz que espera `org_atlas.ZIP_ROOT`.
- `100HCP-population-mean-wmparc.nii.gz` (0,8 MB, md5 `b8bec868a3cc878dcfc62c704ba15e4b`), registro 8082481 (10.5281/zenodo.8082481). El md5 coincide con el anotado en la decisión 63.

Del zip no quedó ningún checksum en el repositorio. Para confirmar que son los mismos datos, al regenerar deben salir los recuentos de la decisión 49: 41 tractos, 523 696 streamlines reales y 12 300 mostradas. Los genes (`genes`, `expressions`) y `evidence` no forman parte de este pendiente: nunca tuvieron filas (migración 0013 y decisiones 20 y 47).

## H2. Documentación para agentes: criterios vigentes aparte de los logs, CLAUDE.md y comprobación de coherencia -- 25/09/2026

**Qué.** Los criterios vigentes pasan a `docs/principios.md` y a `docs/criterios-funcionales.md`, `docs/criterios-diseno.md` y `docs/criterios-herramientas.md`, cada uno con la entrada del log de la que sale. Los logs (general, D y H) quedan como historia. Hay un `CLAUDE.md` en la raíz, que importa los principios y fija dónde se escribe cada cosa, y otro en `frontend/`, `backend/` y `scripts/`. `scripts/check_docs.py` comprueba fuentes, rutas, redirecciones y el mapa de documentos. `.claude/settings.json` permite sin preguntar cinco comandos de verificación de solo lectura, sacados de las sesiones anteriores.

**Por qué.** El log general mezclaba en ~400 KB criterios, historia y conversación: para conocer una regla vigente había que leerlo entero y averiguar qué decisión corregía a cuál. Los criterios suman ~40 KB y cada agente carga solo los de su área.

**Verificación.** Los criterios se extrajeron del log completo, y los valores que cambiaron a lo largo de él se contrastaron con el código. `check_docs.py` da OK y detecta cada tipo de error en una prueba con errores inyectados. Las tres ramas del rediseño se fusionan sin conflictos (`git merge-tree`).

## H3. Los `salida_*.sql` pasan de la raíz a `init/` -- 25/09/2026

**Qué.** Los 15 `salida_*.sql` se mueven a `init/`, la carga inicial de la base, con el mismo nombre. Se corrigen las rutas de `scripts/rebuild_db_from_sql.sh` (variable `INIT`, junto a `SEED`), los ejemplos de uso de `apply_sql.ps1`, `register_rsn_networks.py` y los dos `backfill_*.py`, el README de migraciones, los criterios y `scripts/CLAUDE.md`. La convención de la decisión 69 cambia solo en el lugar: siguen en git si pesan menos de 100 MB.

**Por qué.** La raíz tenía 15 archivos de datos generados mezclados con la configuración del proyecto.

**Verificación.** `scripts/rebuild_db_from_sql.sh` completo contra un Postgres desechable con las rutas nuevas, y `check_docs.py`. Ninguna de las tres ramas del rediseño toca ni cita estos archivos. `init/` no está ignorada por git; `data/`, la primera ubicación probada, sí lo está, porque `.gitignore` la reserva para datos científicos locales.

## H4. Tractografía ORG: paso de instalación aparte, desde Zenodo -- 25/09/2026

**Qué.** `scripts/install_tractography.sh` (solo Linux) instala la tractografía después de la carga inicial:
- descarga de Zenodo los dos originales a la biblioteca y comprueba su md5;
- genera el SQL en `derived/tractograms/`, con `vtk` en un entorno temporal;
- comprueba los recuentos y lo aplica con `docker cp` + `psql -f`.

Cada paso ya hecho se salta. El SQL no va a `init/` ni a git.

**Por qué.** La reconstrucción de la H1 dejaba vacía la tractografía. Su SQL pesa unos 160 MB (el de nodos y aristas, 117 MB, supera el límite de 100 MB de GitHub). Subirlo habría multiplicado por siete el tamaño del repositorio. En el diseño original, el SQL de tractografía también vivía en la biblioteca y no en el repositorio.

**Verificación.** Los originales descargados tienen los md5 publicados. Los generadores dan los recuentos de las decisiones 49 y 66: 41 tractos, 523 696 streamlines reales y 12 300 mostradas; 176 nodos, 5176 aristas y 30 153 bucles descartados. El script completo se probó contra un Postgres desechable tras la carga inicial; una segunda ejecución no hace nada. El sha256 del zip (en la fila `Dataset`) es `8f880d53103b2847b6610d15f94bb47cb14afe178a641dbaa5349d7d7d788a43`.

## H5. Paso de preparación dentro de dev, build y tauri: instala las dependencias de npm que falten -- 26/09/2026

**Qué.** `npm run dev`, `npm run build` y `npm run tauri` ejecutan primero `frontend/scripts/prepare.mjs` (`node scripts/prepare.mjs && vite`), que recorre en orden su lista de pasos: cada uno calla si no hay nada que hacer, dice una línea si actúa y, si falla, para el arranque. Un paso nuevo es una entrada más en la lista. El primero, `frontend/scripts/npm-deps.mjs`, compara `package-lock.json` con el lockfile oculto de npm (`node_modules/.package-lock.json`) y, si falta un paquete o cambian su versión, su `resolved` o su `integrity`, ejecuta `npm install --no-audit --no-fund` con la configuración de npm del usuario: con `ignore-scripts=true`, los paquetes siguen sin ejecutar sus scripts de instalación. Un opcional que falte no cuenta: npm deja fuera los de otras plataformas y los que fallan, y el lockfile no guarda todo lo que usa para decidirlo (en Linux con glibc faltaba `@tauri-apps/cli-linux-x64-musl` y estaban las otras variantes musl). Nota para el desarrollador principal: cambian sus líneas `dev`, `build` y `tauri` de `frontend/package.json`, con la aprobación del usuario.
**Por qué.** El usuario decidió que, tras un pull, arrancar la app instale sola las dependencias de npm que falten, sin notarse si no falta nada, y que se puedan añadir pasos. Va dentro de los scripts, y no en `predev` y `prebuild`, porque npm se salta estos con `ignore-scripts=true`, como en el equipo del usuario. En `tauri` va antes de lanzar la CLI, porque en Windows npm no puede sustituirla mientras corre: un pull que sube `@tauri-apps/cli` se instala antes, y la preparación de `beforeDevCommand` ya no tiene nada que hacer.
**Verificación.** 16 pruebas nuevas, y cada cambio de la regla, del recorrido o de los tres scripts hace fallar alguna. En Linux, con `ignore-scripts=true`: `npm run build` no imprime nada más y compila; el paso añade unos 20 ms, y `npm run tauri` pasa sus argumentos a la CLI. En una copia sin red: un clon sin `node_modules` instala y arranca con un solo `npm run dev`; un pull que sube un paquete y añade dos se instala, y la vez siguiente no hace nada; si sube la herramienta que lanza `npm run tauri`, se instala antes de lanzarla; un `postinstall` no se ejecuta (sí con los scripts permitidos); un opcional de Windows no hace reinstalar, y con el lockfile roto o si npm falla, no arranca. En Windows no se ha probado: se razona con lo que hace npm, que ejecuta los scripts con `cmd /d /s /c`, donde `&&` solo sigue si lo anterior acaba bien. `npx tauri` se salta los scripts, y con ellos la preparación antes de la CLI. Tras `npm install --package-lock-only`, que reescribe también el lockfile oculto, el paso no ve lo que falta.

## H6. Reglas que chocaban, resueltas en la revisión de la documentación -- 26/09/2026

**Qué.** Se resuelven cuatro reglas que chocaban. El principio 19 recoge su excepción: los pasos de instalación (`rebuild_db_from_sql.sh`, `install_tractography.sh`) aplican SQL sin revisarlo antes, porque ya está revisado en git o se regenera de sus originales con md5, y lo verifican con recuentos. Un SQL generado de más de unos 50 MB no va a `init/` ni a git, en lugar del corte de 100 MB de la H3. La contraseña de desarrollo por defecto (`neurograph_dev`, en `.mcp.json` y `docker-compose.yml`) no cuenta como credencial. Y en desarrollo, Docker publica la API y Postgres en todas las interfaces del equipo, algo que se acepta en una red local de confianza.
**Por qué.** Se contradecían entre sí o con lo que ya hacían los scripts y la configuración. En las dos primeras manda la más reciente (regla 7 de `CLAUDE.md`): la H4 sobre el principio 19, y el criterio escrito con la H4 sobre la H3. En las otras dos decidió el usuario no tocar nada: la configuración es del desarrollador principal, el proyecto está en su fase inicial y la red local es segura.
**Verificación.** `check_docs.py` OK. Cada regla se contrastó con los scripts, `backend/config/settings.py`, `.mcp.json`, `docker-compose.yml` y los puertos que escuchan (`0.0.0.0:8420` y el de Postgres).

## H7. `apply_sql.ps1`: cada archivo en una transacción, y se para en el primer error -- 26/09/2026

**Qué.** `scripts/apply_sql.ps1` lanza `psql` con `-1 -v ON_ERROR_STOP=1`, salvo en los archivos que traen su propio `BEGIN;`, que solo llevan `ON_ERROR_STOP`: el mismo criterio que `rebuild_db_from_sql.sh` (H1).
**Por qué.** Sin `ON_ERROR_STOP`, `psql` sigue tras un error y sale con 0, así que el script daba por «Aplicado correctamente» un archivo aplicado a medias, contra la regla de que cada archivo va en una transacción (riesgo 7, 41, H1).
**Verificación.** En el contenedor, con archivos de solo `SELECT`: sin el cambio, un error sigue ejecutando y sale con 0; con él, sale con 3, con o sin `BEGIN;` propio, y el script trata todo lo que no sea 0 como fallo. El `.ps1` conserva su BOM. No se ha ejecutado en Windows: en este equipo no hay PowerShell.

## H8. La tractografía deja su ficha en la biblioteca -- 26/09/2026

**Qué.** `scripts/install_tractography.sh` pone cada dataset en su carpeta: `original/tractography/org2018_fiber_clusters_800/`, `original/tractography/org2018_wmparc_100hcp/` y `derived/tractograms/org2018_fiber_clusters_800/`. Mueve ahí los archivos de una instalación anterior sin tocar su contenido y escribe la ficha (`dataset.yaml`) de cada uno, con su checksum, fuente, versión, licencia y, en el derivado, `derived_from`. También escribe el manifiesto de la biblioteca si falta. Lo hace aunque la base ya tenga la tractografía; una ficha existente no se reescribe, pero su checksum tiene que cuadrar con el archivo o el script se para. Lee primero la variable del backend, `NEUROGRAPH_LIBRARY__PATH`.
**Por qué.** La biblioteca de Linux no se describía sola, contra el criterio funcional 2 y el principio 15: la procedencia solo estaba en la base. Los datos del ZIP salen de las mismas constantes con las que el generador crea su fila `Dataset`. Zenodo declara cc-by-4.0 en los dos registros, y la ficha del ZIP lo anota junto a la licencia de 3D Slicer que ya registraba la base.
**Verificación.** Sobre una copia de la biblioteca con la disposición antigua: mueve los cuatro archivos y escribe las fichas; el código del backend (`scan_library_datasets`, `detect_library` y `verify_integrity`) las lee y cuadra los checksums. El del ZIP es el de su fila `Dataset`. Una segunda ejecución no cambia nada, y una ficha con el checksum alterado para el script. No se probó una instalación desde cero, porque exige descargar y generar todo otra vez.
