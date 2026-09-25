# NeuroGraph — Criterios funcionales

Qué hace la aplicación y con qué reglas, por área. Solo recoge lo vigente; los principios transversales están en `docs/principios.md`. Entre paréntesis va la entrada del log de la que sale cada criterio (números: §7 de `docs/analisis-arquitectura.md`; D y H: `docs/decisiones-diseno.md` y `docs/decisiones-herramientas.md`).

## 1. Arquitectura

- **Componentes:**
  - motor científico en Python;
  - PostgreSQL con pgvector como única fuente de verdad, sin base de grafos aparte;
  - API FastAPI local en `127.0.0.1:8420`;
  - capa MCP;
  - frontend React/TypeScript: SVG para el connectograma y los hemisferios, three.js (react-three-fiber) para el 3D;
  - aplicación de escritorio Tauri v2, que orquesta un Postgres 16 embebido y el backend empaquetado con PyInstaller.

  (§1, §4.5, 1, 54)
- **Una sola lógica por consulta.** Vive en `backend/api/services/` y la usan los routers HTTP, las herramientas MCP y los scripts. Cada servicio separa una función pura, probada sin base de datos, de la función que solo añade la consulta. Un servicio nunca importa de un router. (27, 46, 62)
- **Todo pasa por la API.** El frontend no accede a los datos por otra vía. Si la API no responde, muestra datos de demostración etiquetados como tales. (38, 49)
- **El backend solo dibuja para el MCP y las imágenes de la API.** `backend/visualization/` genera PNG con matplotlib para los endpoints y herramientas `render_*`. El frontend dibuja sus propias vistas. (36)
- **Respuestas de la API:** cada endpoint devuelve su propio modelo. El sobre común `{status, data, evidence, provenance, warnings}` que proponía la §4.4 no se implementó.
- **Identificadores:**
  - forma `<tipo>.<especie>.<fuente>.<código>`, en minúsculas (`build_id`), estables e independientes del nombre;
  - el prefijo no es contrato de datos: a qué tabla pertenece un id se resuelve consultando las tablas.

  (§4.5, 13, 47, 51)
- **Claves foráneas e índices:**
  - hay FK de especie, atlas, estudio, tracto y de las pertenencias a red;
  - `connections`, `homologies` y `source_dataset_id` no tienen FK, y su integridad se comprueba con consultas;
  - los índices se crean cuando una consulta real los necesita.

  (47, H1)

## 2. Biblioteca y datasets

- **La biblioteca de datos va aparte de la instalación** (`docs/portabilidad.md`): `original/` guarda los archivos intactos, tal como se descargaron, y `derived/` los derivados. (22)
- **Cada carpeta lleva su `dataset.yaml`** (`DatasetManifest`) con:
  - formato: una etiqueta del catálogo cerrado o `unsupported_pending_adapter`;
  - archivos por rol;
  - checksums;
  - `derived_from`.

  (44, 45, 46, 50)
- **Catálogo cerrado de formatos** (`backend/ingestion/datasets/formats.py`). Un formato solo entra con un adaptador escrito y verificado; nunca hay un normalizador que adivine. Para un formato nuevo: `docs/protocolo-ingesta-ia.md`. (17, 44, 46)
- **Procedencia en la base:**
  - la fila `Dataset` guarda el checksum sha256 (combinado si hay varios archivos), el formato y la licencia;
  - `Connection` y `Homology` apuntan a ella con `source_dataset_id`;
  - `Region` y `Coordinate` no llevan dataset.

  (28, 29)
- **`propose_dataset_ingestion`** solo existe por MCP y por consola, sin endpoint HTTP, porque leería archivos locales. Devuelve el SQL para revisión y nunca toca la base. (46)

## 3. Atlas, regiones y coordenadas

- **Atlas cargados:**
  - HCP-MMP1.0, el atlas por defecto;
  - Gordon 333 (solo corteza);
  - Brainnetome;
  - subcórtex del HCP (19 estructuras);
  - macaco LR160 (Wang 2017);
  - IPL entre especies (Cheng 2021: humano, chimpancé y macaco).

  (6, 7, 19, 28, 29)
- **Espacios:**
  - HCP-MMP1.0 y Gordon 333 están en fsLR 32k;
  - Brainnetome y el subcórtex, en `MNI152_FSL_2mm`;
  - el macaco, en INIA19;
  - Cheng 2021, en el espacio de cada especie.

  La vista principal muestra un atlas a la vez. (22, 25, 28, 29)
- **Nombres:**
  - en HCP-MMP1.0, `name` es el nombre anatómico largo de Glasser 2016 (tomado de la tabla de Huang 2022) más el hemisferio;
  - Gordon 333 no tiene nombres anatómicos, porque no se han publicado;
  - `abbreviation` es el código corto real.

  (12, 51)
- **Hemisferio:** sale de la convención del atlas y nunca de la coordenada. Queda NULL en las estructuras sin lateralidad. (15, 28)
- **Coordenadas:**
  - cada región tiene la de su punto representativo, el vóxel o vértice real más cercano al centroide, con el affine del propio volumen de etiquetas;
  - `position3d` usa la convención de neuroimagen, sin remapear.

  (24, 28, 72)
- **Corteza pintada:**
  - solo existe para los atlas de superficie (HCP-MMP1.0 y Gordon 333) y con datos reales;
  - el mapa vértice→región usa los mismos índices que la malla fsLR (64 984 vértices);
  - la pared medial no pertenece a HCP-MMP1.0.

  (72)

## 4. Redes

- **Cada fuente es una clasificación aparte.** Las redes de atlas distintos no se juntan aunque compartan nombre: su clave es `<fuente>.<código>`. (riesgo 13, 41)
- **Pertenencias:**
  - llevan siempre `method`/`algorithm` y `confidence`;
  - Cole-Anticevic se asigna sobre HCP-MMP1.0 por voto mayoritario;
  - Gordon 333 trae sus 12 redes propias (confianza 1);
  - las estructuras distribuidas, como el cerebelo, guardan la distribución completa y nunca un ganador forzado.

  (5, 7, 10)
- **Brainnetome no tiene redes funcionales.** No hay ninguna asignación publicada, y las redes de Cole-Anticevic no se proyectan sobre él. (25, 41)
- **Yeo 2011 (7 y 17 redes) y Power 2011** son clasificaciones alternativas en HCP-MMP1.0:
  - por región, con el voto mayoritario de vértices (la confianza es la fracción real);
  - vértice a vértice sobre la corteza;
  - en Power se usa el mapa sin rellenar huecos y las etiquetas inciertas (`u…`) no cuentan;
  - se avisa de su procedencia: el HCP las remuestreó a fs_LR con el registro de FreeSurfer, no con MSMAll.

  (73)
- **Cambiar de clasificación:**
  - la clasificación por defecto es la original del atlas;
  - una región sin pertenencia en la clasificación elegida es `unclassified`;
  - el cambio se aplica a la vez en todas las vistas;
  - Cole-Anticevic y Gordon 333 no tienen mapa vértice a vértice.

  (73)

## 5. Conectividad

- **Tipos y evidencia:**
  - estructural, funcional y efectiva nunca se mezclan;
  - cada conexión conserva su `evidence_level`, y la tractografía probabilística es `indirect`;
  - los pesos estructurales van de 0 a 1 y un peso mayor es una conexión más fuerte;
  - los algoritmos de caminos invierten el peso para usarlo como distancia.

  (5, 9, 33, 41, riesgo 14)
- **Una sola `Connection` por par no ordenado** cuando el dato no tiene dirección. (41)
- **Fuentes:**
  - Brainnetome, conectividad estructural;
  - Rosen & Halgren 2021 sobre HCP-MMP1.0, con peso `10 ** log10_Fpt`;
  - Yeh 2022, tracto→región.

  Todas se cargan completas, con los ceros incluidos. (5, 9, 41)
- **El análisis parte del dato completo.** `GET /graph-metrics` solo excluye los pesos exactamente 0; cualquier otro umbral es un parámetro explícito. (8)
- **Conectividad inducida.** Con dos o más regiones seleccionadas, las vistas muestran solo las conexiones con los dos extremos dentro de la selección, y los tractos de Yeh que tocan al menos dos de esas regiones, con su cita. (12, 13, 14)
- **Peso mínimo:**
  - el deslizador es logarítmico, entre 1e-6 y 1;
  - la posición 0 equivale a no filtrar y es el valor inicial;
  - junto a él se muestra el peso real.

  (61)
- **Tope de dibujo.** Por encima de 10 000 conexiones visibles (`MAX_RENDERED_CONNECTIONS`) no se dibuja ninguna y se avisa. Los nodos y las estadísticas siguen visibles, y el recuento intra/inter cuenta siempre toda la conectividad real, no solo la dibujada. (42, 43, 60)

## 6. Tractografía

- **Yeh 2022** da la probabilidad tracto→región: 52 tractos sin geometría. (9, 48)
- **ORG-800FC-100HCP** (Zhang 2018) tiene su propia pestaña, en su espacio propio (groupwise) y sin mezclarse con otros atlas:
  - 41 tractos con nombre (510 clusters);
  - se excluyen siempre los clusters `FalsePositive` y los que no tienen etiqueta;
  - como máximo 300 streamlines por tracto, guardando el recuento real y el mostrado;
  - la malla de fondo sale del wmparc del mismo espacio.

  (49, 62, 63)
- **Nodos de tractografía:**
  - cada etiqueta con nombre verificado del wmparc es un nodo, situado en el centroide real de sus vóxeles;
  - una arista es una streamline real cuyos dos extremos caen en etiquetas distintas;
  - se guardan como máximo 20 streamlines por arista, en una muestra con semilla fija, junto con el recuento real.

  (66)
- **Solo se importan tractogramas ya calculados.** Ejecutar pipelines de dMRI queda fuera del alcance actual. (2)

## 7. Homologías y evolución

- **Especies:** verificadas en NCBI Taxonomy, cada una en su espacio. Dos especies nunca comparten un mismo cerebro 3D. (28, 29, 37)
- **Estados de una homología:**
  - `candidate_homology` solo si un único estudio declara la tabla completa con una sola metodología;
  - si la correspondencia combina varias fuentes, es `uncertain_correspondence` con `confidence` NULL;
  - nunca se marca como confirmada.

  (29, 40)
- **Cargadas:**
  - IPL (Cheng 2021): tres granularidades, y solo se compara dentro de la misma;
  - complejo SMA humano-macaco: emparejado por hemisferio (L con L y R con R).

  (29, 40)
- **Comparar especies:**
  - es una vista aparte;
  - una región es «compartida» solo si tiene una homología real con la otra especie de la comparación;
  - los recuentos se dan por `status`, nunca en un solo número.

  (35, 37, 39)
- **Resaltado en el cerebro 3D.** Al elegir una especie de comparación, las regiones con homología real hacia ella se pintan en `HOMOLOGY_HIGHLIGHT_COLOR`, que sustituye al color de la red. (50)

## 8. Literatura, evidencia y síntesis de IA

- **Estudios:**
  - `name` guarda la cita completa;
  - `authors`, `journal` y `abstract` van literales, verificados contra Crossref o el editor;
  - el id es `study.<especie>.<fuente>.<código>`, donde la fuente refleja la procedencia real (`zotero`, `hcp`…).

  (20, 26, 50)
- **Evidencia:**
  - toda fila exige `quote`, `extraction_method` y `entity_id` (una región, una red o una conexión);
  - `ai_assisted` es siempre una propuesta pendiente de revisión;
  - hoy la tabla está vacía.

  (20, 47)
- **Citas de los tractos:** salen de `Dataset.study_id → Study`. Si no hay estudio enlazado, la lista va vacía con un aviso, nunca con una cita genérica. (13)
- **Síntesis de IA:**
  - es un JSON con el formato de `docs/protocolo-sintesis-ia.md`, con `region_id` reales resueltos con `search_region`;
  - al importarlo se valida todo o nada contra el atlas activo;
  - se abre en una pestaña temporal aislada, que no comparte selección ni filtros;
  - no se guarda en la base.

  (71)
- **Genes:** `genes` y `expressions` tienen solo el esquema, sin datos; `method` y `donor_count` son obligatorios. (50)
- **PDFs:** se consultan de la biblioteca personal o institucional, sin redistribuirlos. (riesgo 2)

## 9. API y MCP

- **Acceso:** la API solo escucha en local, con CORS para cualquier puerto de localhost. (riesgo 11)
- **Errores:**
  - una entidad que no existe da 404, nunca una respuesta vacía;
  - pedir una clasificación que el atlas no tiene da 400.

  (27, 35, 62, 73)
- **Un filtro decide qué elementos aparecen**, nunca recorta lo que se cuenta de cada uno. (27, 34)
- **Herramientas MCP:**
  - `search_region`, `get_connectivity`, `search_tract`, `calculate_laplacian`, `calculate_spectrum`, `find_path`, `find_homologues`, `compare_species`, `render_network`, `render_brain`, `compare_species_images` y `propose_dataset_ingestion`;
  - todas usan la misma capa de servicios que la API.

  (27, 33-37, 46)
- **Auditoría:**
  - cada llamada MCP se registra en `mcp_call_log` antes de responder, con un resumen del resultado, nunca el resultado completo ni los bytes de las imágenes;
  - si la auditoría falla, la herramienta sigue funcionando;
  - `mcp_call_log` no es un dato científico y no se copia a otras instalaciones.

  (27, 36, 53)

## 10. Semántica visual

- **Color del nodo:**
  - es la red, con los colores de cada atlas (`NETWORK_COLORS`): son datos y no se cambian por estética;
  - es idéntico en todas las vistas;
  - lo no clasificado va en gris `#8a8a8a`.

  (18, 72, 73)
- **Líneas:**
  - el grosor es proporcional al peso;
  - el trazo discontinuo indica evidencia no directa o hipotética;
  - la flecha indica conectividad efectiva.

  (15, 16, 21, 71)
- **Hemisferios:**
  - verde para lo intrahemisférico, rojo para lo interhemisférico y gris si no se puede clasificar;
  - el lado sale de `hemisphere`, y las posiciones son |x| e y reales.

  (15)
- **Colores reservados:**
  - la selección usa el color de acento;
  - el amarillo `#ffd84a` queda para el resaltado al pasar el ratón y ninguna conexión lo usa.

  (18, D2c)
- **Tractos:** ORG no define colores propios, así que se reparten de forma determinista sobre la rueda de tono. (62)
- **Comparación de especies:**
  - el connectograma de homología tiene tres colores fijos: exclusiva de A, exclusiva de B y compartida, con una cuerda por homología real;
  - en los esquemas por especie, el color es el par homólogo y la forma del marcador, el hemisferio;
  - nunca van dos codificaciones en el mismo canal.

  (37, 39)
- **Cerebro 3D, vista de foco:**
  - un nodo seleccionado muestra su red a un salto;
  - una conexión, sus dos extremos;
  - dos o más nodos, la conectividad inducida;
  - sin selección, un aviso; con la corteza pintada, todo el atlas coloreado por red.

  (16, 72)
- **Etiqueta de datos:** «DATOS REALES», «DATOS SINTÉTICOS · SOLO ILUSTRATIVOS» o «SÍNTESIS DE IA — NO VERIFICADO», siempre visible. (71, D1)

## 11. Exportación

- **JPEG en color sobre fondo blanco**, sea cual sea el tema en pantalla, en todas las vistas. El JPEG no incluye la lupa ni el resaltado del ratón. Con selección múltiple, la leyenda abreviatura→nombre también se exporta. (11, 14, 18, D2)
