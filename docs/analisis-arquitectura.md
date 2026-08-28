---
title: NeuroGraph — Análisis de la especificación y propuesta de arquitectura
status: propuesta pendiente de confirmación
fecha: 2026-08-28
---

# NeuroGraph — Análisis de la especificación y propuesta de arquitectura

La propia especificación maestra (secciones 29 y 30) pide que, antes de escribir código, se analice el documento, se señalen inconsistencias y ambigüedades, se propongan las decisiones arquitectónicas pendientes y se espere confirmación. Este documento sigue ese orden. No se ha creado repositorio ni código todavía.

## 1. Resumen del sistema

NeuroGraph es un instrumento científico computacional para neuroinformática: permite consultar, analizar y visualizar redes cerebrales (regiones, tractos, conectividad, literatura, homologías entre especies) a partir de una "biblioteca" de datos portátil (SSD externo). La IA (Claude u otro modelo) actúa como intérprete y planificador de consultas, nunca como motor científico. Hay un motor científico en Python, una base de datos relacional (PostgreSQL + pgvector), una API propia independiente de la IA, una capa MCP que envuelve esa API, y un motor de visualización que produce dos vistas sincronizadas: un connectograma 2D (diagrama de cuerdas) y un cerebro 3D con tractografía.

## 2. Inconsistencias y ambigüedades detectadas

1. **No se especifica la tecnología de interfaz gráfica.** La sección 22 pide una interfaz que funcione sin IA, y la 5.2/21 hablan de escenas 3D en formato GLB con rotación, zoom, selección y sincronización fina con el connectograma — pero no se indica si es una app de escritorio nativa en Python o una app web/Electron. Es la decisión más importante pendiente (ver §4.1).
2. **Alcance real de "procesamiento de tractografía" (§9).** El texto pide que el motor científico "procese tractografía" y evalúa DIPY/MRtrix/FSL como bibliotecas. Eso puede significar dos cosas muy distintas: (a) *importar* tractogramas ya calculados (.trk/.tck) generados fuera de NeuroGraph, o (b) *ejecutar* pipelines completos de difusión (dMRI → reconstrucción → tractografía), que requieren binarios externos, mucho cómputo y no aparecen en las fases 1–10. Recomiendo (a) para el MVP y dejar (b) como extensión futura explícita.
3. **"Mapas funcionales" (§20) no aparece en ninguna fase del desarrollo (§28).** Es una pieza de alcance considerable (overlays estadísticos sobre superficie cortical, formato GIFTI funcional). Debe declararse fase propia o quedar fuera del alcance inicial explícitamente.
4. **Falta un módulo explícito para la "biblioteca SSD"** (detección, integridad, montaje, reconstrucción de índices — sección 2 y 26) en el árbol de directorios propuesto en la sección 25. Es un componente central del sistema y no tiene carpeta propia.
5. **Formato del marcador de biblioteca no definido.** La sección 26 exige poder "detectar una biblioteca NeuroGraph" en un SSD, pero no se especifica qué archivo o manifiesto lo identifica. Ver propuesta en §4.5.
6. **Coste de reindexado no contemplado como riesgo.** Los datos originales viven en el SSD, pero los índices derivados (embeddings, tablas Postgres) probablemente vivan en el ordenador local. Si el SSD viaja a otro ordenador, "reconstruir los índices" (§26) puede implicar rehacer embeddings de toda la literatura — coste no trivial que conviene anticipar.
7. **Sistema de coordenadas no está en el modelo de la entidad `Coordinate`.** Distintos atlas usan espacios distintos (MNI, Talairach, nativo de cada especie); si no se registra el sistema de referencia junto a cada coordenada, comparar posiciones entre atlas o especies será incorrecto sin que nada lo señale.
8. **No se define transporte de la API (§15).** "Crear una API independiente del proveedor de IA" es compatible con una librería Python interna, un servicio HTTP (FastAPI) o ambas. Propongo HTTP local + capa de servicio compartida (ver §4.4), para que MCP y la interfaz gráfica usen exactamente la misma lógica sin duplicarla.

## 3. Requisitos ambiguos o de alcance no acotado

- "Grafos ponderados", "análisis de redes" y todo el bloque de análisis matemático (§10) son estándar y viables con NetworkX/SciPy; no hay riesgo técnico ahí.
- La comparación evolutiva (§11) es conceptualmente clara pero operativamente abierta: no se define qué "similitud" cuantitativa se usará entre estructuras de especies distintas más allá de que debe declararse el método. Se resolverá caso por caso en la Fase 7; no bloquea la arquitectura.
- "Ejecutar análisis" e "inspeccionar evidencia" desde la interfaz gráfica (§22) implica que el propio motor científico debe exponerse también sin depender del servidor de API en marcha, o que la GUI arranca ese servidor localmente de forma transparente. Lo doy por resuelto en la propuesta de arquitectura (la GUI siempre habla con la API local, que arranca junto con la aplicación).

## 4. Arquitectura propuesta

### 4.1 Interfaz gráfica y visualización — decisión pendiente

**Opción A — Web local (recomendada):** aplicación de escritorio (Tauri o Electron) con frontend en TypeScript/React; **D3.js** para el connectograma y **Three.js** (vía react-three-fiber) para el cerebro 3D y la tractografía, consumiendo mallas GLB/glTF y streamlines como geometría de líneas. La sincronización entre ambas vistas (§5.3) se implementa con un store de selección compartido (p. ej. Zustand) que ambas visualizaciones escuchan.
*Ventajas:* D3 y Three.js son los estándares de facto para diagramas de cuerdas interactivos y escenas 3D navegables respectivamente; hay ejemplos maduros de "linked brushing" entre vistas 2D/3D en web. *Coste:* añade un stack de frontend (Node/TypeScript) separado del núcleo Python.

**Opción B — Python nativo:** PySide6/Qt como shell de escritorio, VTK o PyVista para el cerebro 3D, y un widget propio (Matplotlib o QGraphicsView) para el diagrama de cuerdas.
*Ventajas:* todo en un único lenguaje, más simple de mantener para un equipo sin frontend web. *Coste:* la interacción fina y la sincronización entre las dos vistas es notablemente más laboriosa de construir y de pulir visualmente en Qt/VTK que en D3+Three.js.

En ambos casos, el "motor de visualización" (§20-21) del backend **no dibuja nada**: produce descriptores de escena estructurados (nodos con coordenadas, aristas con referencia a geometría de tracto, IDs científicos asociados a cada objeto visual) y es la capa de presentación (web o Qt) la que renderiza. Esto respeta la separación exigida en la sección 21 (todo objeto visual debe tener un ID científico trazable hasta la base de datos y su evidencia).

### 4.2 Motor científico

Python puro, organizado en módulos independientes y testeables tal como pide la sección 10: `neuroimaging`, `connectome`, `graph` (adyacencia, grados, Laplaciano, autovalores/autovectores), `spectral`, `evolution`, `neuropsychology`. Bibliotecas: NumPy, SciPy, pandas, NiBabel, NetworkX, scikit-learn; DIPY se usa solo para leer/escribir formatos de tractograma (.trk/.tck), no para ejecutar pipelines de difusión en el MVP (ver inconsistencia §2.2). PyTorch queda como dependencia opcional, solo si algún análisis futuro lo requiere (embeddings de literatura, por ejemplo).

### 4.3 Biblioteca SSD

Cada biblioteca lleva en su raíz un manifiesto `.neurograph_library.yaml` con: `library_id` (UUID estable, no depende de la ruta), fecha de creación, versión del esquema de índices, y un manifiesto de integridad (checksums SHA-256 por archivo o por lote). Al conectar un SSD: se detecta el marcador → se verifica integridad → se monta apuntando la configuración a esa ruta → se reconstruyen o actualizan los índices en la base de datos local, indexados por `library_id` (así pueden convivir varias bibliotecas sin colisión). Desconectar solo desmonta la ruta; los índices ya calculados quedan en caché local hasta la próxima verificación. Reubicar la biblioteca a otro ordenador es seguro porque el `library_id` y los checksums, no la ruta, son lo que identifica los datos.

### 4.4 API y MCP

La API es un servicio FastAPI local que expone una capa de servicio (`backend/api/services/`) con las operaciones de la sección 15, devolviendo siempre un sobre estructurado: `{status, data, evidence, provenance, warnings}`. La capa MCP (sección 16) no reimplementa lógica: cada herramienta MCP llama exactamente a la misma capa de servicio que usa la API HTTP, garantizando que la IA y la interfaz gráfica vean siempre los mismos datos y las mismas reglas. Cada llamada MCP queda registrada (tabla de auditoría) para la reproducibilidad exigida en la sección 23.

### 4.5 Base de datos y ontología

PostgreSQL + pgvector, sin base de datos de grafos adicional (tal y como pide la sección 14): las relaciones del Knowledge Graph se representan como tablas de entidades (`regions`, `tracts`, `nuclei`, `networks`, `functions`, `phenotypes`, `lesions`, `species`, `studies`, `atlases`, `datasets`) y una tabla de aristas/afirmaciones (`connections` / `claims`) con `source_id`, `target_id`, `relation`, `type` (structural/functional/effective), `weight`, `evidence[]`, `confidence`, `species`, `method`, `study_id`. Los identificadores siguen el esquema `<tipo>.<especie>.<atlas_o_fuente>.<código_local>` (p. ej. `region.human.hcp-mmp1.area44`), estables y no dependientes del nombre textual, con una tabla de sinónimos aparte. Cada dataset importado lleva su propio manifiesto `dataset.yaml` (id, nombre, fuente, especie, atlas, formato, versión, licencia, checksum, y si es derivado: origen, algoritmo, parámetros, versión del software) — esto resuelve el requisito de reproducibilidad de la sección 4 y 23.

### 4.6 Estructura de repositorio propuesta (revisión de la sección 25)

```
NeuroGraph/
├── backend/
│   ├── core/
│   │   ├── neuroimaging/
│   │   ├── connectome/
│   │   ├── graph/
│   │   ├── spectral/
│   │   ├── evolution/
│   │   └── neuropsychology/
│   ├── library/            (nuevo: gestión de biblioteca SSD)
│   ├── ingestion/
│   │   ├── literature/
│   │   ├── neuroimaging/
│   │   └── datasets/
│   ├── ontology/
│   ├── database/
│   │   ├── models/
│   │   ├── migrations/
│   │   └── repositories/
│   ├── api/
│   ├── mcp/
│   ├── ai/
│   │   ├── providers/
│   │   └── query_planner/
│   ├── visualization/      (produce descriptores de escena, no renderiza)
│   ├── tests/
│   └── config/
├── frontend/                (si se elige la opción A del §4.1)
├── docs/
└── scripts/
```

## 5. Plan de desarrollo (ajustes sobre la sección 28)

Se mantienen las diez fases de la especificación, con dos añadidos:

- **Fase 0 — Entorno**, antes de la Fase 1: inicializar repositorio, entorno Python (venv/poetry), PostgreSQL vía Docker, framework de tests y linters. No estaba explícita en el documento y hace falta para poder "ejecutar tests" desde la primera fase, como pide la sección 29.
- **Fase 1** debe incluir también la decisión de §4.1 (stack de interfaz) y el diseño del módulo `library/`, ausente del árbol original.
- "Mapas funcionales" (§20) se deja fuera de las fases 1–10 explícitamente, como extensión futura, salvo que se indique lo contrario.

## 6. Riesgos científicos y técnicos

1. **Alcance de tractografía real.** Ejecutar pipelines de difusión completos es un proyecto en sí mismo (requiere FSL/MRtrix, cómputo intensivo, control de calidad de imagen). Recomiendo limitar el MVP a importar tractogramas ya calculados.
2. **Licencias de literatura científica.** Ingerir PDFs de artículos plantea restricciones de derechos de autor; el uso debe quedar limitado a la biblioteca personal/institucional del usuario, sin redistribución.
3. **Coste de reindexado al mover el SSD** (ver §2.6): puede ser caro si la biblioteca es grande. Conviene decidir pronto si los índices derivados costosos (embeddings) se guardan también en el propio SSD como caché, aunque sean "reconstruibles" en teoría.
4. **Disciplina en la distinción observado/inferido/hipótesis (§24).** El modelo de datos lo permite, pero es un riesgo de proceso: cualquier futura función de análisis o cualquier prompt de IA que "redondee" una similitud a una homología confirmada rompe el principio central del proyecto. Debe imponerse a nivel de esquema (campos obligatorios `method` y `confidence`, nunca opcionales) y de interfaz (nunca fusionar visualmente lo confirmado con lo hipotético).
5. **Sistemas de coordenadas mixtos** entre atlas y especies (ver §2.7): sin un campo de sistema de referencia explícito, las comparaciones espaciales entre especies serán silenciosamente incorrectas.
6. **Complejidad de la sincronización 2D/3D** (§5.3): es la pieza de ingeniería de interfaz más laboriosa del proyecto; no tiene atajos razonables en ningún stack.
7. **Corrupción de acentos al cargar datos vía PowerShell (confirmado empíricamente el 28/08/2026).** Pasar un archivo con `Get-Content ... | docker exec -i ... psql` corrompe cualquier tilde o eñe ("Área" llega como "??rea"), porque PowerShell reencodea el texto al pasar por la tubería. Esto es grave para un proyecto en español con nombres de regiones, estudios y evidencia llenos de caracteres acentuados. La forma correcta, verificada, es `docker cp` (copia el archivo en bruto) seguido de `psql -f` dentro del contenedor — nunca tuberías de texto de PowerShell hacia procesos que esperan UTF-8. Cualquier script de ingesta futuro (Fase 2 y siguientes) debe seguir este mismo patrón, o mejor aún, insertar los datos con una biblioteca (psycopg) que controle la codificación explícitamente en vez de depender de la shell.
8. **Escritura lenta y con límite de tiempo hacia el SSD montado en red (confirmado el 28/08/2026).** El entorno de desarrollo no escribe directamente en `E:\`: pasa por un punto de montaje de red hacia el ordenador de la usuaria, con un rendimiento de escritura de solo ~5-6 MB/s y cada operación limitada a 45 segundos. Descomprimir un solo archivo grande (p. ej. 1,7 GB) directamente ahí falla o queda a medias una y otra vez. La solución adoptada: descomprimir siempre primero en almacenamiento local (rápido, sin límite práctico — 1,7 GB en ~19 s), y después sincronizar al SSD con `rsync -a --partial --append-verify`, que puede repetirse tantas veces como haga falta sin perder el progreso ni corromper archivos a medio escribir (verifica cada bloque). Nunca descomprimir ni escribir archivos grandes directamente sobre la ruta de red en un solo paso.
9. **Prioridad de configuración: el YAML tapaba las variables de entorno (confirmado el 28/08/2026).** `Settings.load()` pasaba el contenido de `default.yaml` como argumentos explícitos al construir `Settings(...)` (`cls(**raw)`). En pydantic-settings, un valor pasado al construir el objeto tiene siempre la prioridad más alta — por encima de las variables de entorno — así que cualquier clave presente en el YAML (incluida `database.host: localhost`) ganaba siempre, aunque se definiera `NEUROGRAPH_DATABASE__HOST=postgres` en el entorno. Esto pasó desapercibido mientras el backend corría fuera de Docker (ahí `localhost` era correcto) y solo se manifestó al dockerizar la API: el contenedor `neurograph-api` intentaba conectar a `127.0.0.1:5432` en vez de al contenedor `postgres`, y `GET /regions` devolvía `Internal Server Error` (`psycopg.OperationalError: connection ... Connection refused`). La corrección: el YAML se registra ahora como una fuente de configuración de baja prioridad mediante `settings_customise_sources` (una `PydanticBaseSettingsSource` propia), en vez de pasarse como argumentos del constructor, así que el orden real queda variables de entorno > `.env` > `default.yaml` > valores por defecto de los campos. Cubierto por `backend/tests/test_config_settings.py`, que fija por prueba que una variable de entorno gana siempre al YAML.

10. **Connectograma ilegible a escala real: 360 etiquetas simultáneas sobre un fondo heredado del sistema operativo (confirmado el 28/08/2026, con captura de la usuaria).** Con los 8 nodos de demostración, dibujar siempre las 360 etiquetas de texto alrededor del círculo no daba problemas; con las 360 regiones reales del HCP-MMP1.0, se solapaban hasta volverse ilegibles. A eso se sumó un segundo fallo independiente: `frontend/src/index.css` (plantilla de arranque del proyecto, no diseño propio de NeuroGraph) dejaba `color-scheme: light dark`, así que en cualquier ordenador con el sistema operativo en modo oscuro el fondo pasaba a un tono casi negro (`#16171d`) mientras el texto del connectograma seguía siendo oscuro (`#333`) — casi invisible. Juntos, ambos fallos se veían como ruido de píxeles en vez de un círculo con etiquetas. Corregido: el connectograma ahora solo dibuja la etiqueta del nodo seleccionado o con el ratón encima (con halo blanco para legibilidad en cualquier fondo), reduce el tamaño de los puntos cuando hay muchos nodos, y `color-scheme` queda fijado a `light` — la app no tiene todavía un diseño para modo oscuro, así que depender del ajuste del sistema operativo del usuario era el error real, no solo un detalle estético.

## 7. Decisiones confirmadas por la usuaria

1. **Stack de interfaz gráfica — Opción A**: web local (Tauri/Electron pendiente de Rust + Three.js + D3), corriendo como servidor Vite de desarrollo mientras tanto.
2. **Alcance de tractografía — ambos modos, a elección del usuario final.** El modelo de datos de conectividad es el mismo para los dos casos, así que no compromete la arquitectura. Se prioriza primero *importar* tractogramas ya calculados (más simple, cubre el caso de uso inmediato); *ejecutar* pipelines completos de dMRI queda como fase posterior explícita, no como parte del MVP.
3. **Ubicación del proyecto — carpeta del ordenador de la usuaria**: `E:\Neurograph` (código) separado de `E:\NeuroData` (biblioteca de datos), en el mismo disco por elección explícita de la usuaria.
4. **Datos de partida — sintéticos primero, ahora datos reales.** Se empezó con datos sintéticos/demo etiquetados explícitamente; a partir de la Fase 2 se están incorporando datos reales (HCP S1200 Group Average vía BALSA, catalogado; Brainnetome, en descarga).
5. **Nueva tabla `region_network_memberships` y tipo de entidad `membership` (28/08/2026).** El esquema inicial tenía una entidad `networks` pero ninguna forma de decir qué región pertenece a qué red: hacía falta para cargar la clasificación funcional real de Cole-Anticevic sobre HCP-MMP1.0. Se añadió como una relación con su propio identificador (igual que `Homology` o `Connection`), con `confidence` y `method` obligatorios — nunca opcionales en un dato derivado (riesgo 4). El tipo de entidad se llama `membership` (sin guión bajo): el patrón de identificador (`build_id`) no admite `_` en el primer tramo, y un sustantivo compuesto como `region_network_membership` lo violaba.
