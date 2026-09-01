# Plan de desarrollo por fases

Basado en la sección 28 de la especificación maestra, con los ajustes
señalados en `docs/analisis-arquitectura.md` (sección 5).

- **Fase 0 — Entorno.** Repositorio, estructura de módulos, base de datos,
  ontología inicial, sistema de biblioteca SSD, configuración. **(hecho)**
- **Fase 1 — Arquitectura (hecho).** Stack de interfaz confirmado (web
  local, Tauri pendiente de Rust); esquema de PostgreSQL definitivo,
  aplicado en la base de datos real del usuario y comprobado
  funcionalmente (relaciones, JSONB, arrays, integridad referencial).
- **Fase 2 — Biblioteca de datos (en curso).** Modelo `Library`, manifiesto
  de dataset (`dataset.yaml`), escaneo de biblioteca (`scan_library_datasets`)
  y tabla `libraries` (migración 0002) hechos y probados. Biblioteca real
  creada en `E:\NeuroData` (separada del código) con `initialize_library()`
  y SQL de alta generado en `backend/database/seed/register_library_neurodata.sql`.
  Migración 0002 y alta de la biblioteca ya aplicadas y confirmadas en la
  base de datos real (28/08/2026). Primer dataset real catalogado:
  `dataset.human.hcp.s1200_groupavg` (HCP S1200 Group Average, vía BALSA),
  con `dataset.yaml`, checksum SHA-256 verificado y alta generada en
  `backend/database/seed/register_dataset_hcp_s1200_groupavg.sql`. Además,
  descomprimido en `derived/extracted/hcp_s1200_groupavg/` (ver
  `backend/library/extraction.py` y `docs/portabilidad.md` §"¿Zip o
  descomprimido?"), registrado como dataset derivado enlazado
  (`dataset.human.hcp.s1200_groupavg_extracted`) con su propia alta en
  `backend/database/seed/register_dataset_hcp_s1200_groupavg_extracted.sql`.
  Nota de diseño: la tabla `datasets` guarda solo identidad/formato/
  licencia/checksum/procedencia (consultable); la narrativa completa vive
  en `dataset.yaml`, fuente de verdad para reproducibilidad. Pendiente:
  atlas Brainnetome (en descarga), y dar de alta cada parcelación del
  paquete HCP como entidad `atlas` propia en la Fase 3.
- **Fase 3 — Neuroimagen (en curso).** Lector genérico de etiquetas CIFTI
  (`backend/ingestion/neuroimaging/cifti_labels.py`) y primer atlas real
  cargado: HCP-MMP1.0 (Glasser et al., 2016) — especie `Homo sapiens`,
  atlas, sus 360 regiones corticales (180 por hemisferio, cada una su
  propia entidad) y sus 360 coordenadas reales (vértice de la superficie
  "midthickness" más cercano al centroide de cada región — nunca un punto
  interpolado). Espacio de referencia registrado explícitamente como
  `fsLR_32k_S1200_groupavg_midthickness_MSMAll`, no "MNI" ni "Talairach"
  (el .surf.gii dice "talairach" en sus metadatos, pero es una convención
  genérica de HCP, no coordenadas Talairach reales — ver riesgo 5 del
  análisis de arquitectura). 36 pruebas, incluidas dos contra los archivos
  reales (con comprobación de que cada hemisferio cae en el signo de x
  esperado). Alta generada en `backend/database/seed/register_atlas_hcp_mmp1.sql`.
  Interfaz ya conectada: `GET /regions` (backend/api/routers/regions.py),
  API dockerizada (`docker compose up -d` levanta Postgres y la API
  juntos, sin necesitar Python instalado) y el frontend cae a datos
  reales automáticamente cuando la API responde, sin mezclarlos nunca
  con los sintéticos (aviso verde "DATOS REALES" / amarillo "DATOS
  SINTÉTICOS", nunca ambos a la vez). Clasificación funcional real:
  las 360 regiones de HCP-MMP1.0 están clasificadas en las 12 redes de
  Cole-Anticevic (Ji et al., 2019), calculada por voto mayoritario de
  vértices sobre la partición original
  (`backend/ingestion/neuroimaging/cole_anticevic_networks.py`), con
  confidence y method registrados por región (nueva tabla
  `region_network_memberships`, migración 0003) — nunca una etiqueta
  inventada. Confianza real entre 0,74 y 1,0 (media ~0,95). El enlace
  estructurado atlas→cita bibliográfica que quedaba pendiente aquí se
  cerró junto con la Fase 4 (ver más abajo). Otra parcelación del
  mismo paquete HCP (Gordon 333) ya está cargada también, ver el
  párrafo siguiente.
  Segunda parcelación del mismo paquete HCP ya cargada (28/08/2026):
  Gordon 333 (Gordon et al., 2016, Cerebral Cortex, DOI
  10.1093/cercor/bhu239), solo corteza — 333 regiones reales y sus 12
  redes propias del atlas (no las de Cole-Anticevic: son dos
  clasificaciones distintas, aunque coincidan en algunos nombres como
  "Default" o "Visual" -- ver riesgo 13). El mismo archivo declara 19
  etiquetas subcorticales sin ningún dato real detrás (comprobado
  empíricamente, ver sección 7.7 del análisis de arquitectura): se
  excluyeron de Gordon 333 y, en su lugar, se dio de alta por
  separado la segmentación subcortical real que sí trae el espacio de
  grayordinates del HCP (19 estructuras: amígdala, hipocampo,
  tálamo... por hemisferio, más cerebelo y tronco del encéfalo), como
  su propio atlas (`atlas.human.hcp.subcortex_grayordinates`),
  citando a quien de verdad la define: Glasser et al. (2013),
  NeuroImage, DOI 10.1016/j.neuroimage.2013.04.127. Riesgo 13
  corregido el mismo día: el color/nombre de cada red en el frontend
  ya se resuelve por `<fuente>.<red>` (p. ej. `gordon333.default`),
  no solo por el nombre corto de la red, para que dos redes de
  distinta procedencia con el mismo nombre nunca compartan color sin
  aviso (`backend/api/routers/regions.py`,
  `frontend/src/theme/networks.ts`).
- **Fase 4 — Conectividad (en curso).** Atlas Brainnetome (Fan et al.,
  2016) dado de alta: 246 regiones y coordenadas reales (mismo patrón que
  HCP-MMP1.0, pero volumétrico: vóxel real más cercano al centroide, en
  espacio `MNI152_FSL_2mm`, verificado con la matriz affine real, no
  asumido). Conectividad estructural real derivada de `BNA_SC_4D.nii.gz`
  (246 mapas de probabilidad de tractografía): 30 135 conexiones
  (media simetrizada, sin umbral — decisión de la usuaria, ver
  `docs/analisis-arquitectura.md` sección 7.5), cada una con
  `evidence_level = indirect` explícito (nueva columna obligatoria en
  `connections`, migración 0004 — nunca se asumía "direct" por
  omisión). Nuevo endpoint `GET /connections`. El dataset Brainnetome se
  organizó en su propia carpeta (`original/atlases/brainnetome/`, antes
  suelto junto a otros atlas) y se registró con un checksum combinado
  (`backend/library/dataset_registration.py`, no un único archivo
  contenedor como el paquete HCP). El frontend ahora tiene un selector
  de atlas: HCP-MMP1.0 (redes, sin conexiones) o Brainnetome
  (conexiones, sin redes todavía) — nunca los dos mezclados, porque
  ocupan el mismo espacio físico dos veces. Pendiente: ejecutar
  pipelines completos de dMRI (fuera del alcance salvo decisión en
  contra, sección 6).

  **Cole-Anticevic sobre Brainnetome: investigado de verdad y decidido
  que NO se implementa (30/08/2026, decisión 25).** La duda quedaba
  abierta desde la decisión 6. Se comprobó contra los archivos reales
  (no de memoria): el eje subcortical de Cole-Anticevic y el volumen de
  Brainnetome comparten exactamente la misma rejilla de vóxeles (mismo
  affine, misma forma 91×109×91) — permitiría mapear sin proyección ni
  interpolación las 36 regiones subcorticales de Brainnetome (cobertura
  real 14,3%–96,3%, media 79,8%, patrones anatómicamente coherentes).
  Las 210 regiones corticales (85% del atlas) siguen sin ninguna
  correspondencia válida — la parte cortical de Cole-Anticevic vive en
  una malla de superficie, sin relación de vóxel con el volumen de
  Brainnetome — confirma la razón original de la decisión 6, ya no solo
  asumida. Presentado el hallazgo completo a la usuaria: decidió no
  implementarlo, un 15% de cobertura del atlas (36/246) no compensa.
  Detalle completo en la decisión 25 de `docs/analisis-arquitectura.md`.
  Sin cambios de código.
  Cierre de cabos sueltos de las Fases 3/4 (28/08/2026): cada atlas ya
  cargado enlaza ahora de forma estructurada con el `Study` que lo
  define (columna `atlases.study_id`, migración 0005), en vez de solo
  llevar la cita como texto suelto en su nombre — DOI verificados
  directamente en la web del editor (nature.com, academic.oup.com), no
  adivinados. Ver `docs/analisis-arquitectura.md` sección 7.6.
- **Fase 5 — Matemática (en curso, conectada a datos reales el
  28/08/2026).** El motor (`backend/core/graph/`: Laplaciano explícito,
  descomposición espectral, embedding espectral, centralidad de grado/
  intermediación/autovector, comunidades por modularidad, coeficiente de
  participación, rich-club) ya existía desde antes con datos de ejemplo;
  ahora tiene un adaptador real
  (`backend/core/graph/from_connections.py`) y un endpoint
  (`GET /graph-metrics?atlas_id=...`) que lo alimenta con las regiones y
  conexiones reales de un atlas. Un par con `weight` exactamente 0 se
  excluye del grafo, no se cuenta como arista débil (sobre todo relevante
  para Brainnetome: casi la mitad de sus 30 135 pares vale 0 exacto, ver
  sección 7.8 del análisis de arquitectura); un umbral mayor es parámetro
  explícito de la consulta (`min_weight`), nunca fijo. Probado con la
  conectividad real de Brainnetome (246 nodos, 15 803 aristas): tarda
  ~3 s, encuentra 3 comunidades (modularidad 0,38) y sitúa el tálamo
  como la estructura más central por grado y por intermediación —
  coherente con su papel de centro de relevo en la literatura, no un
  número sin sentido. Se encontró y corrigió de paso un error real en
  `betweenness_centrality()` (riesgo 14): interpretaba el peso de cada
  conexión como una distancia en vez de como fuerza, invirtiendo qué
  caminos contaban como "más cortos" — nunca detectado porque las
  pruebas anteriores solo usaban pesos uniformes. Gordon 333 todavía no
  tiene ninguna conexión cargada: el endpoint responde igual (grafo sin
  aristas, cada región su propia comunidad), pero no aporta nada hasta
  que haya conectividad real que analizar ahí.

  **Conectividad tracto-región sobre HCP-MMP1.0 (29/08/2026).** Tras
  verificar contra el manual oficial de HCP S1200 que el paquete
  "Structural Preprocessed" (descargado primero) es solo datos
  anatómicos, no un connectome, se cargó en su lugar el connectome
  tracto-región de Yeh FC (2022, *Nature Communications*, DOI
  10.1038/s41467-022-32595-4): probabilidad poblacional (1065 sujetos)
  de que cada uno de 26 tractos nombrados atraviese cada una de las 180
  áreas de HCP-MMP1.0, por hemisferio. No es una matriz región-región;
  decidido con la usuaria no derivarla por co-ocurrencia (sería un dato
  inferido por NeuroGraph, no observado por el estudio) — se cargó tal
  cual, con el tracto como entidad `Tract` propia (52 = 26 x 2
  hemisferios) y conexiones tracto -> región (9360, sin umbral). Se
  encontró y corrigió una discrepancia real de nomenclatura entre la
  matriz y la tabla de abreviaturas del mismo paper ("PTAT"/"C_R" en la
  matriz frente a "TPAT"/"C_PR" en la tabla — riesgo 15). Se añadió
  `datasets.study_id` (migración 0006), mismo criterio que
  `atlases.study_id`.
- **Fase 6 — Literatura (en curso, iniciada 30/08/2026).** Ingesta de
  artículos, extracción estructurada, evidencia, referencias, Knowledge
  Graph.

  **Esquema de `studies`/`evidence`, sin cargar ningún artículo real
  todavía (decisión 20 de `docs/analisis-arquitectura.md`).** La usuaria
  eligió esta fase (de entre las cuatro sin trabajo empezado) y, dentro
  de ella, empezar solo por el esquema -- con el objetivo final
  confirmado de que la extracción de evidencia sea algún día automática
  (NLP/IA), pero sin implementar ese pipeline todavía. Migración 0009:
  `studies` gana `authors`/`journal`/`abstract` (nullable, sin backfillar
  los 5 estudios ya cargados -- eso sería cargar datos, y la usuaria
  pidió no hacerlo aún); `evidence` gana `quote` y `extraction_method`
  como **NOT NULL desde el primer día** (la tabla no tenía ninguna fila
  real, así que no hizo falta backfill). Disciplina explícita, mismo
  principio que la decisión 17: una fila `extraction_method="ai_assisted"`
  es siempre una propuesta para revisión humana, nunca una escritura
  automática a la base de datos real -- el valor ya existe en el esquema
  para cuando llegue ese pipeline, pero ningún código lo produce todavía.
  Nuevo módulo `backend/ingestion/literature/` (`study_metadata.py`,
  `evidence.py`), mismo patrón que el resto de scripts de registro del
  proyecto (genera SQL para revisión y aplicación manual, nunca escribe
  directo a la base de datos real). 15 pruebas nuevas en verde. El SQL
  generado (`database/migrations/generated/0009_...sql`) se obtuvo con
  una ejecución real de `alembic upgrade 0008:0009 --sql`, no a mano.
  Detalle completo en la decisión 20 de `docs/analisis-arquitectura.md`.

  Pendiente explícito, deliberadamente fuera de esta ronda: backfillear
  `authors`/`journal`/`abstract` de los 5 estudios ya citados; decidir si
  se activa la búsqueda semántica sobre resúmenes (pgvector ya está
  habilitado desde la migración 0001, sin usar todavía); y construir el
  propio pipeline de extracción NLP/IA -- a la espera de que la usuaria
  decida el siguiente paso concreto dentro de esta fase.

  **Primer `Study` real, extraído de la biblioteca de Zotero de la
  usuaria como prueba del pipeline (31/08/2026, decisión 26).** Sin
  conector MCP de Zotero disponible, se accedió leyendo directamente
  `zotero.sqlite.bak` (copia de seguridad, no el archivo en vivo) desde
  su carpeta local, con permiso explícito. De los 54 artículos de
  revista de su biblioteca (organizada en diez colecciones sobre
  sistemas de memoria), se eligió el único con "connectome" en el
  título: Kerezoudis et al. (2026), *PNAS*, DOI
  10.1073/pnas.2517734123. Todos los metadatos (título, 9 autores,
  revista, volumen, número, páginas, ISSN, resumen) verificados contra
  Crossref antes de darlos de alta, nunca copiados sin comprobar de
  Zotero -- coincidencia exacta salvo una discrepancia de fecha real y
  explicada (print vs. online), no un error. Identificador
  `study.human.zotero.kerezoudis_2026` -- "zotero" como segmento de
  fuente, decidido con la usuaria porque fija el criterio para los
  próximos `Study` de esta fase. SQL generado con la función real ya
  existente (`study_insert_sql()`, sin cambios de código),
  `salida_zotero_kerezoudis_2026.sql`. Verificado con `pytest
  backend/tests/ingestion/test_study_metadata.py` (5 pruebas en verde).
  Detalle completo en la decisión 26 de `docs/analisis-arquitectura.md`.
  Pendiente: que la usuaria aplique el SQL contra su base de datos real.
- **Fase 7 — Evolución (en curso, iniciada 31/08/2026).** Especies,
  correspondencias, homologías, comparación interespecífica. Revisada la
  biblioteca real de la usuaria antes de buscar datos nuevos: dos
  conjuntos entre-especies nunca usados (atlas de corteza de macaco de
  Wang et al. 2017, y homología IPL humano/chimpancé/macaco de Cheng
  et al. 2021). Decisión de la usuaria: "las dos, en ese orden" -- el
  atlas de macaco primero.

  Primera parte completada, 31/08/2026 (decisión 28 de
  `docs/analisis-arquitectura.md`, detalle completo ahí): Macaque Cortex
  Atlas LR160 (Wang et al., 2017, *Brain Topography*) cargado como
  primera especie no humana del proyecto (`Macaca mulatta`, NCBI taxid
  9544) -- 1 `Species`, 1 `Study`, 1 `Atlas`, 160 `Region` (80 áreas x 2
  hemisferios, Tabla 1 del artículo transcrita y verificada dos veces
  contra el NIfTI real y contra el resumen del propio artículo) y 160
  `Coordinate`. Resuelta antes de calcular ninguna coordenada la duda
  del espacio de referencia (INIA19 vs "NeuroMaps atlas (Rohlfing et al.
  2012)" citado en el artículo): son el mismo recurso, verificado contra
  la propia publicación de Rohlfing et al. (2012) -- `REFERENCE_SPACE =
  "INIA19"` queda verificado, no supuesto. SQL generado con
  `scripts/register_macaque_cortex_wang2017.py`,
  `salida_macaque_wang2017.sql`. Verificado con `pytest` (96 pruebas en
  verde + 12 omitidas por requerir la biblioteca real) y `ruff check`
  (sin avisos). Pendiente: que la usuaria descomprima
  `Macaque_cortex_atlas_WangJJ-2017-BT.zip` en
  `E:\NeuroData\original\atlases\macaque_cortex_wang2017\` y aplique el
  SQL contra su base de datos real.

  Segunda parte completada, 31/08/2026 (decisión 29 de
  `docs/analisis-arquitectura.md`, detalle completo ahí): parcelación
  cruzada del IPL humano/chimpancé/macaco (Cheng et al., 2021, *eLife*) --
  primera entidad `Homology` real del proyecto. Metodología completa del
  artículo leída antes de escribir ninguna fila: los autores NO calculan
  ningún índice cuantitativo de correspondencia entre especies (ellos
  mismos: con solo 3 especies no pueden usar estadística comparativa
  filogenética) -- la correspondencia es un juicio de los propios autores
  por consistencia topológica + precedente citoarquitectónico, verificable
  en los propios datos (mismo nombre/color de etiqueta GIFTI en las tres
  especies). Presentado el hallazgo antes de decidir: **decisión de la
  usuaria: `status="candidate_homology"`, `confidence=NULL`** en las 54
  filas, y **cargar las tres granularidades completas** (2/3/4
  subregiones), no solo la de 4. Primera especie chimpancé del proyecto
  (*Pan troglodytes*, NCBI taxid 9598). 3 `Species`, 1 `Study`, 1
  `Dataset`, 3 `Atlas`, 54 `Region`, 54 `Coordinate`, 54 `Homology`, en
  tres espacios de referencia de superficie distintos (uno por especie,
  nunca mezclados entre sí ni con el atlas volumétrico de macaco de la
  primera parte). SQL generado con
  `scripts/register_cheng2021_ipl_cross_species.py`,
  `salida_cheng2021_ipl.sql`. Nuevo subpaquete `backend/ingestion/evolution/`.
  Verificado con `pytest` (100 pruebas en verde + 13 omitidas) y
  `ruff check` (sin avisos). Pendiente: que la usuaria descomprima
  `IPL_cross_species_parcellation.zip` en
  `E:\NeuroData\original\atlases\ipl_cross_species_parcellation\` y
  aplique el SQL contra su base de datos real.

  Con esto, las dos partes acordadas de la Fase 7 quedan completas.
  Pendiente, no iniciado: comparación interespecífica más allá de estas
  54 homologías puntuales (p. ej. una vista dedicada en el frontend), y
  cualquier otro par de especies/atlas que la usuaria quiera añadir.
- **Fase 8 — Neuropsicología (aparcada por falta de datos reales,
  31/08/2026 -- decisión 31 de `docs/analisis-arquitectura.md`).**
  Lesiones, funciones, fenotipos, asociaciones clínicas. Investigado el
  código (`Lesion`/`Phenotype` son stubs desnudos, sin ingesta ni lógica
  MCP) y, sobre todo, la biblioteca real: `original/lesions`,
  `original/datasets`, `original/imaging` y `original/literature` están
  las cuatro completamente vacías (comprobado, no solo listadas). A
  diferencia de las Fases 6 y 7, aquí no hay ningún dato real esperando
  transcripción, así que no se propuso ningún alcance ni se escribió
  código -- consultada, la usuaria eligió aparcar esta fase y conectar
  primero el cliente MCP real (Fase 10). Retomar cuando haya una fuente
  real concreta (aportada por la usuaria o investigada y verificada antes
  de usarla).
- **Fase 9 — Visualizador avanzado.** Connectograma y cerebro 3D completos
  y sincronizados (secciones 5.1, 5.2, 5.3). Tamaño de paneles corregido
  el 29/08/2026 (adelantado, a petición de la usuaria, en vez de esperar
  a esta fase): `#root` tenía un ancho fijo de 1126px heredado de la
  plantilla de arranque de Vite, `.canvas-wrap` una altura fija de
  420px, y el propio `Connectogram` un tamaño interno fijo de 420px que
  ignoraba el espacio real del panel -- los tres, heredados de cuando
  solo había 8 nodos de demostración. Ahora `#root` usa el ancho
  disponible (máx. 1800px), `.canvas-wrap` crece con la ventana
  (`min(70vh, 760px)`), y `Connectogram` mide su contenedor real con
  `ResizeObserver` (acotado entre 320 y 720px).

  **Corrección de estado (30/08/2026): la "sincronización 2D/3D completa"
  señalada aquí como pendiente ya estaba hecha.** Revisión de código a
  petición de la usuaria tras confirmar visualmente las decisiones 21-24:
  las decisiones 14 y 16 (mismo día) ya habían implementado exactamente
  este mecanismo, sin que se corrigiera esta frase entonces. Confirmado
  leyendo los tres componentes: `Connectogram.tsx`, `Hemisferios.tsx` y
  `Brain3D.tsx` leen y escriben el mismo `useSelectionStore`
  (`frontend/src/state/selection.ts`) -- un clic en un nodo o una
  conexión en cualquiera de las tres vistas actualiza el mismo estado, y
  las tres reaccionan con su propio resaltado (`isSelected` calculado a
  partir de `selectedNodeIds.has(...)`/`selectedConnectionId`, sin
  ninguna copia local). Los filtros siguen el mismo patrón: los tres
  paneles comparten `useFiltersStore` (`frontend/src/state/filters.ts`) y
  aplican `filterGraph()` con la misma lógica, así que ocultar una red,
  un tipo de conectividad o subir el umbral de peso mínimo afecta a los
  tres dibujos a la vez. Dos cosas quedan deliberadamente fuera de esta
  sincronización, ninguna un descuido: el hover es estado local de cada
  panel (una afordancia transitoria, no selección real), y desde la
  decisión 23 la cámara del cerebro 3D ya NO se recentra automáticamente
  al seleccionar algo en otra vista (antes sí) -- efecto secundario ya
  señalado a la usuaria en su momento y que sigue vigente. Sin cambios de
  código en esta revisión: fue una comprobación, no una corrección de
  bug.

  **Diseño de interfaz (en curso, iniciado 30/08/2026).** Punto de
  partida confirmado con la usuaria (para no perder el hilo entre
  sesiones): NeuroGraph es un instrumento científico de neuroinformática,
  no una demo visual — cada elemento visual con ID científico trazable
  hasta su estudio/método/confianza de origen, en apoyo a la
  investigación sobre homologías cognición-cerebro entre especies. Se
  construyó un boceto interactivo (herramienta de diseño de Claude, no
  código de `frontend/` todavía) para decidir la disposición antes de
  implementar. Decisión de la usuaria sobre la disposición: TRES paneles
  visuales, no dos -- (1) connectograma circular, (2) una vista 2D de
  hemisferios separados (se mantiene explícitamente, es útil para mostrar
  especialización hemisférica -- ya no es un simple sustituto del 3D),
  y (3) un panel de cerebro 3D navegable, del doble de tamaño que los
  otros dos, que muestra en cada momento SOLO la red de conectividad del
  nodo o la conexión seleccionados (no el grafo completo) -- una vista de
  foco, no de conjunto. En el connectograma circular, el nombre de la
  región ya no aparece flotando junto al nodo (se salía del recuadro con
  180-360 regiones reales): vive en un recuadro de lectura fijo debajo
  del diagrama.

  **Los tres paneles y la vista de foco del 3D, completos en código real
  (30/08/2026, decisión 16 de `docs/analisis-arquitectura.md`).**
  `Brain3D.tsx` reescrito: ya no dibuja el grafo filtrado completo, sino
  solo el subgrafo que decide una función pura nueva (`computeFocus`) a
  partir de la selección compartida -- la red de un salto de un nodo
  seleccionado, los dos extremos de una conexión seleccionada, o la
  conectividad real entre una selección múltiple; sin nada seleccionado,
  un aviso explícito en vez del grafo completo (esa vista "de conjunto"
  ya la cubren el connectograma y Hemisferios). Layout de `App.tsx`:
  connectograma + Hemisferios apilados en una columna propia, junto al
  cerebro 3D con el doble de peso de reparto de espacio. 104 pruebas de
  backend en verde (sin cambios de backend en esta tarea); `npx tsc -b
  --force` limpio. Mismo riesgo abierto que el resto de esta sesión de
  diseño: sin confirmar visualmente por la usuaria todavía.

  **Exportación a JPEG (implementado en código real, 30/08/2026, no solo
  en el boceto).** A petición explícita de la usuaria -- necesita poder
  exportar cada visualización en color sobre fondo blanco para usarla
  como figura de paper o de la tesis --, se implementó de verdad en
  `frontend/src/logic/exportImage.ts` y se conectó a `Connectogram.tsx` y
  `Brain3D.tsx` (ver decisión 11 de `docs/analisis-arquitectura.md` para
  el detalle técnico). Cuando se construyan los paneles nuevos de
  hemisferios y de foco 3D, deben reutilizar las mismas funciones en vez
  de reimplementar la exportación.

  **Implementación real de abreviaturas, selección múltiple, tractos
  con literatura y panel de hemisferios (30/08/2026, completa salvo un
  pendiente explícito).**
  Petición de la usuaria: "es un programa de investigación, no de
  ilustración o divulgación". Backend completo y verificado (decisiones
  12 y 13 de `docs/analisis-arquitectura.md`): columna `abbreviation` en
  `regions`/`tracts` (migración 0007) con backfill vía los propios
  scripts de registro re-ejecutados; `RegionNode.abbreviation` expuesto
  en `GET /regions`; endpoint `GET /connectivity/induced` (conexiones
  región-región entre la selección + tractos de Yeh 2022 que tocan dos o
  más regiones seleccionadas, cada uno con su cita real). Frontend
  completo también (decisión 14): `frontend/src/state/selection.ts` con
  selección múltiple real (`Set<string>`, clic normal añade/quita);
  `Connectogram.tsx` y `Brain3D.tsx` muestran solo la conectividad
  inducida ENTRE las regiones elegidas en cuanto hay dos o más
  seleccionadas (`frontend/src/logic/induced.ts`, calculado en el propio
  frontend, sin petición nueva); la abreviatura se dibuja de forma
  permanente en los dos paneles (en el 3D, con un `<sprite>` de textura
  cacheada, `frontend/src/logic/textSprite.ts`) y el nombre completo
  vive en un recuadro de lectura fijo bajo el connectograma, nunca
  flotando; `DetailPanel.tsx` tiene un modo de selección múltiple con
  leyenda exportable a JPEG (reutiliza `exportImage.ts`), la lista de
  conectividad real entre las regiones elegidas, y los tractos con
  nombre + su cita real (o un aviso explícito de que no hay cita
  todavía, nunca una inventada) vía `GET /connectivity/induced` -- solo
  con datos reales, nunca en modo demostración.

  **Panel `Hemisferios.tsx` (decisión 15 de `docs/analisis-arquitectura.md`).**
  Petición explícita de la usuaria de continuación a esta misma tarea:
  "ha de ilustrar sobre todo la diferencia entre la conectividad inter
  hemisferial e intrahemisferial". Columna `regions.hemisphere`
  (migración 0008, mismo patrón de backfill que `abbreviation`, `NULL`
  tanto para lo todavía no backfillado como para estructuras reales sin
  lateralidad -- el tronco del encéfalo del subcórtex del HCP); vista
  axial esquemática (dos elipses IZQUIERDO/DERECHO, eje anteroposterior
  en vertical) con la posición dentro de cada elipse calculada a partir
  de coordenadas reales (x para medial-lateral, y para anteroposterior,
  ambas normalizadas contra el rango real de los datos cargados, nunca
  un rango inventado); color verde/rojo para intra/inter-hemisférica
  como codificación principal, con una estadística de recuento
  destacada, superpuesto sobre el trazo discontinuo (evidencia no
  directa) y la flecha (conectividad efectiva) ya obligatorios en el
  resto de la aplicación. Añadido como tercer panel dentro del layout
  existente de `App.tsx`, sin abordar todavía la restructuración a un
  layout de tres paneles con cerebro 3D grande centrado en la selección.

  104 tests de backend en verde (`pytest`, 3 nuevos de esta continuación:
  dos en `test_regions.py`, uno en `test_hcp_subcortical_structures.py`);
  frontend verificado con `npx tsc -b --force` (limpio, cero errores) --
  `vitest`/`vite build` siguen sin poder ejecutarse en este entorno
  (limitación de plataforma ya documentada).

  Pendiente explícito, señalado como riesgo abierto en la decisión 14:
  la usuaria todavía no ha visto ni confirmado visualmente ninguno de
  estos cambios (no se pudo verificar con `vitest`/`vite build`); y las
  etiquetas 3D permanentes podrían afectar al rendimiento con un atlas
  grande (360 regiones) -- si pasa, la solución más simple es mostrar
  las etiquetas del cerebro 3D solo en selección/hover, como ya hacía el
  connectograma antes de esta tarea. La restructuración a un layout de
  tres paneles con un cerebro 3D grande centrado en la selección
  (acordada el 30/08/2026 sobre el diseño) sigue sin abordarse -- el
  panel `Hemisferios` ya existe como componente real, pero se añadió
  dentro del layout de dos columnas ya existente, no como parte de ese
  rediseño mayor.

  **Migraciones 0007/0008 y backfill aplicados por la usuaria (30/08/2026).**
  Las dos migraciones y los cuatro scripts de registro de regiones se
  ejecutaron contra la base de datos real, confirmado con consultas de
  recuento por atlas (360/360 HCP-MMP1.0, 246/246 Brainnetome, 333/333
  Gordon 333, 18/19 subcórtex del HCP -- el 19 restante es el tronco del
  encéfalo, sin lateralidad real, correcto que quede `NULL`) y con
  `docker compose up -d --build api` para que la API sirva ambos campos.
  En el proceso se encontró y corrigió un bug real (riesgo 17 de
  `docs/analisis-arquitectura.md`): `register_gordon333.py` falló una
  vez por un guion largo en `ATLAS_NAME` que PowerShell escribió con la
  página de códigos del sistema en vez de UTF-8 -- corregido en los diez
  `scripts/register_*.py` con `sys.stdout.reconfigure(encoding="utf-8")`,
  no solo en el que falló.

  **Tema oscuro real + colores "intermedios" (30/08/2026, decisión 18).**
  Al verificar visualmente por primera vez los tres paneles, la usuaria
  reportó fondo blanco (no oscuro) y conexiones difíciles de ver -- no
  era una regresión, sino el tema oscuro deliberadamente deshabilitado
  desde el 28/08/2026 hasta que se diseñara "de verdad" (comentario real
  en `frontend/src/index.css`). `index.css`/`App.css` pasan a un tema
  oscuro real; los tres paneles exportables (Connectogram, Hemisferios,
  Brain3D) y la leyenda de `DetailPanel` dejaron de fijar su fondo en
  blanco de forma inline (se clonaba también al exportar) y ahora lo
  toman de fuera, así que la exportación en blanco (decisión 11) sigue
  intacta -- se corrigió de paso un bug real en `ExportBridge`
  (`scene.background` no se restauraba a blanco al exportar, solo el
  color de "clear"). Nueva paleta "intermedia" en `theme/networks.ts`
  (`NEUTRAL_COLOR`, `ACCENT_SELECTED_COLOR`,
  `INTRA_HEMISPHERE_COLOR`/`INTER_HEMISPHERE_COLOR`), calculada por
  contraste WCAG real (script de búsqueda, no a ojo): >=3.85:1 contra
  blanco Y contra el panel oscuro a la vez. Los `NETWORK_COLORS` reales
  (extraídos de cada atlas) no se tocaron; el riesgo de un color de red
  extremo (p. ej. negro puro) desapareciendo contra un fondo también
  oscuro se resolvió con un halo/contorno neutro por nodo, no cambiando
  el dato. Verificado en un entorno propio (no en el de la usuaria):
  `npm install` limpio + `npx tsc -b --force`, `npx vitest run` (11
  pruebas) y `npx vite build`, las tres en verde -- corrige el supuesto
  de sesiones anteriores de que esas herramientas no podían ejecutarse
  aquí (el límite real era reutilizar el `node_modules` ya compilado en
  Windows, no instalar limpio en Linux). Pendiente: confirmación visual
  real de la usuaria, esta vez con un motivo concreto para revisar.

  **Seis ajustes de interfaz tras esa primera revisión visual (30/08/2026,
  decisión 19).** Al confirmar visualmente el tema oscuro, la usuaria
  reportó seis problemas de ajuste fino, todos corregidos: (a) las
  etiquetas del connectograma quedaban pegadas al nodo arriba/abajo del
  círculo -- ahora se desplazan en la dirección radial real, no con un
  offset horizontal fijo; (b) el recuadro de lectura y la leyenda del
  panel de detalle mostraban la abreviatura dos veces -- causa real
  encontrada en la propia ingesta de HCP-MMP1.0 (su `name` se construye a
  partir del mismo código que `abbreviation`, sin nombre anatómico
  distinto disponible todavía en los archivos ingeridos), corregido con
  un nuevo módulo `frontend/src/logic/regionLabel.ts` que compara el dato
  real de cada región en vez de asumir una lista fija de atlas afectados;
  (c) nodos demasiado grandes en el cerebro 3D y en Hemisferios -- radios
  reducidos en ambos; (d) abreviaturas pegadas a la esfera en el cerebro
  3D -- separación aumentada (Hemisferios nunca dibuja abreviatura
  permanente junto al nodo, por diseño ya documentado en la decisión 15;
  pendiente de confirmar con la usuaria si ese diseño sigue siendo lo que
  quiere); (e) botones "marcar todas"/"desmarcar todas" añadidos al panel
  de filtros, actuando sobre redes y tipos de conectividad a la vez
  (interpretación a confirmar); (f) tipografía más compacta en los dos
  paneles laterales (tamaño, interlineado, alineación a la izquierda).
  Detalle completo en la decisión 19 de `docs/analisis-arquitectura.md`.
  Verificado con `npm install` limpio + `npx tsc -b --force`, `npx vitest
  run` (11 pruebas) y `npx vite build`, las tres en verde. Pendiente:
  confirmación visual real de la usuaria, con los dos puntos señalados
  arriba (d y e) para confirmar explícitamente, no solo revisar.

  **Respuesta de la usuaria, mismo día:** (d) sí quiere abreviatura
  permanente en Hemisferios -- implementado con el mismo principio
  direccional que el connectograma, adaptado a dos elipses en vez de un
  círculo, y con nodos/letra escalados por cantidad (igual que el
  connectograma) para mitigar el riesgo de solape que motivó no hacerlo
  antes; de paso, nodos aún más pequeños en Hemisferios y en el cerebro
  3D. (e) confirmado que "marcar/desmarcar todas" NO debe tocar "Tipo de
  conectividad" -- corregido, los botones ahora solo afectan a redes y
  viven dentro de ese propio bloque del panel. Detalle completo al cierre
  de la decisión 19 de `docs/analisis-arquitectura.md`. Reverificado con
  `tsc -b --force`, `vitest run` y `vite build`, las tres en verde.

  **Bug real corregido el mismo día: texto del cerebro 3D recortado.**
  El `<canvas>` de cada etiqueta de abreviatura (`textSprite.ts`) tenía
  ancho fijo (160px) con fuente fija (44px) -- cualquier abreviatura algo
  larga ("9-46d", "l_default_12"...) no cabía y se recortaba por el
  propio borde del canvas. Corregido midiendo el texto real antes de
  dimensionar el canvas, y ajustando el ancho del `<sprite>` en
  `Brain3D.tsx` a la proporción real resultante en vez de a una escala
  fija. Detalle completo al cierre de la decisión 19 de
  `docs/analisis-arquitectura.md`. Verificado con `tsc -b --force`,
  `vitest run` y `vite build`, las tres en verde.

  **Bug real corregido el mismo día: líneas de conexión de Hemisferios
  demasiado gruesas (decisión 21).** Causa: el `<svg>` de `Hemisferios.tsx`
  declaraba un `viewBox` fijo de 460x340 con `width="100%"` y sin `height`
  explícito -- en cuanto el panel se renderizaba más ancho que ese
  `viewBox` (lo habitual con el layout real de la app), el navegador
  escalaba todo el sistema de coordenadas interno, ampliando en la misma
  proporción el grosor de línea, el radio de nodo y el tamaño de letra sin
  que ningún valor del propio código lo pidiera. Corregido con el mismo
  patrón que `Connectogram.tsx`: se mide el ancho real del contenedor con
  `ResizeObserver` y el `<svg>` fija `width`/`height` en píxeles exactos
  iguales a su `viewBox`, de forma que 1 unidad de viewBox = 1 píxel CSS
  siempre; la disposición interna se reescala en proporción para seguir
  aprovechando el ancho disponible, pero el grosor/radio/tamaño de letra
  se quedan en valores absolutos fijos. Detalle completo en la decisión 21
  de `docs/analisis-arquitectura.md`. Verificado con `tsc -b --force`,
  `vitest run` (11 pruebas) y `vite build`, las tres en verde. Pendiente:
  confirmación visual real de la usuaria.

  **Malla de fondo del cerebro 3D, en dos espacios de referencia (decisión
  22).** La usuaria pidió una malla que evite que las regiones aparezcan
  "en el aire" en el cerebro 3D. Como los cuatro atlas de NeuroGraph viven
  en dos espacios de referencia genuinamente distintos (fsLR para
  HCP-MMP1.0/Gordon 333, MNI152_FSL_2mm para Brainnetome/subcórtex del
  HCP), se generaron DOS mallas reales, nunca una genérica descargada sin
  verificar: `fslr32k_midthickness.glb` a partir de la superficie GIFTI
  real ya usada para calcular las coordenadas de HCP-MMP1.0, y
  `mni152_fsl_2mm_brain.glb` por marching cubes sobre la máscara cerebral
  real de la plantilla oficial de FSL (descargada de
  Washington-University/HCPpipelines tras verificar que la plantilla
  ICBM152 2009a que ya había en la biblioteca NO era la misma rejilla de
  coordenadas -- verificado con fuentes de FSL y Lead-DBS). Nuevo script
  `scripts/generate_brain_meshes.py`; `Brain3D.tsx` elige la malla a
  partir del espacio de referencia REAL de cada nodo (`GraphNode.
  referenceSpace`, dato que ya devolvía la API y antes se descartaba en el
  frontend), nunca del atlas seleccionado en la interfaz -- los datos de
  demostración (sintéticos) nunca llevan malla anatómica real de fondo.
  Detalle completo, incluida la verificación por triplicado de los
  archivos `.glb` generados, en la decisión 22 de
  `docs/analisis-arquitectura.md`. Verificado con `tsc -b --force`,
  `vitest run` (11 pruebas) y `vite build`, las tres en verde, más la
  carga real de ambos `.glb` con el propio `GLTFLoader` de three.js.
  Pendiente: confirmación visual de la usuaria, y aplicar
  `salida_mni152_meshes.sql` (alta de los dos datasets nuevos) cuando lo
  considere oportuno.

  **Tres correcciones tras la primera revisión visual de las decisiones
  21/22 (decisión 23).** (a) `Hemisferios.tsx` había quedado más pequeño
  de lo que era antes -- el tope de tamaño añadido al corregir las líneas
  gruesas (decisión 21) era nuevo respecto al comportamiento anterior de
  ese panel (que nunca tuvo tope); quitado el tope superior, solo queda un
  suelo mínimo. (b) la leyenda de una conexión seleccionada (Connectogram,
  Hemisferios, y el listado de conectividad inducida de DetailPanel)
  mostraba solo la abreviatura -- la decisión 19 ya había corregido esto
  para un nodo único, pero no llegó a estos tres sitios; corregido
  reutilizando el mismo componente/función ya existente. (c) girar el
  cerebro 3D resultaba incómodo y no se podía encuadrar una vista lateral
  -- el eje de giro se recalculaba en cada selección a partir de un
  puñado de nodos en foco, casi nunca cerca del centro real del cerebro;
  ahora el eje de giro es el centroide de TODOS los nodos del atlas
  actual, fijo y estable. Efecto secundario deliberado: la cámara ya no
  se recentra automáticamente al seleccionar algo (antes sí). Detalle
  completo en la decisión 23 de `docs/analisis-arquitectura.md`.
  Verificado con `tsc -b --force`, `vitest run` (11 pruebas) y
  `vite build`, las tres en verde. Pendiente: confirmación visual de la
  usuaria.

  **El punto (c) de la decisión 23 arreglaba el PUNTO de giro pero no el
  EJE (decisión 24).** La usuaria insistió: seguía siendo incómodo mover
  el cerebro, y nombró la causa con precisión anatómica -- "el eje
  fronto-occipital debe ser cambiado por un eje sagital". Causa real:
  `position3d` usa la convención de neuroimagen (Y = eje
  posterior-anterior/fronto-occipital), nunca remapeada a la convención
  "Y arriba" de three.js; `OrbitControls` gira siempre alrededor de
  `camera.up` (por defecto (0,1,0)), que coincidía exactamente con ese
  eje Y de los datos -- por eso cada giro pivotaba sobre el eje
  fronto-occipital en vez del superoinferior real. Corregido de forma
  quirúrgica en `Brain3D.tsx`, sin tocar ninguna coordenada de nodo,
  conexión ni malla: `camera.up.set(0, 0, 1)` (el eje Z real,
  superoinferior, pasa a ser el polo de giro) y la posición inicial de
  cámara movida de `[0, 0, 6]` (quedaba justo sobre el nuevo polo, vista
  degenerada) a `[6, 0, 0]` (eje X, da una vista lateral/sagital limpia
  de partida). Detalle completo, incluido el análisis de por qué un
  intercambio de ejes sería una reflexión inaceptable (determinante −1,
  invertiría izquierda/derecha), en la decisión 24 de
  `docs/analisis-arquitectura.md`. Verificado con `tsc -b --force`,
  `vitest run` (11 pruebas) y `vite build`, las tres en verde. Único
  archivo modificado: `Brain3D.tsx`. Pendiente: confirmación visual de
  la usuaria.
- **Fase 10 — IA (en curso, iniciada 31/08/2026).** AIProvider, Claude,
  otros proveedores, MCP, query planner. Alcance ampliado el 30/08/2026
  (decisión 17 de `docs/analisis-arquitectura.md`, dirección de diseño,
  sin código todavía): la capa MCP no serviría solo para consultar datos
  ya cargados, sino también para que la IA del propio usuario proponga
  la ingesta de repositorios de neuroimagen nuevos (p. ej. ConnectomeDB),
  escribiendo el módulo lector y el script de alta bajo el mismo
  contrato de rigor del resto del proyecto -- nunca sin revisión humana
  antes de tocar la base de datos real (esta parte, la de ingesta
  propuesta por IA, sigue sin código: no entraba en el alcance acordado
  para esta primera entrega).

  Primera implementación real, 31/08/2026 (decisión 27 de
  `docs/analisis-arquitectura.md`, detalle completo ahí): antes,
  `backend/mcp/server.py` era un esqueleto sin ninguna herramienta
  registrada. Investigadas las 11 herramientas previstas en la sección
  16 contra el código real: 4 ya tenían lógica real detrás
  (`search_region`, `get_connectivity`, y las dos mitades del análisis
  espectral de `GraphMetrics`), 1 estaba a medias (`search_tract`,
  mezclada dentro de `/connectivity/induced`), y 6 no tenían ninguna
  lógica en `backend/core/` todavía (`find_path`, `find_homologues`,
  `compare_species`, `render_brain`, `render_network`, `render_lesion`).
  Decisión de la usuaria: "MVP + search_tract" -- construir las 5 con
  lógica real o casi real, dejar las 6 restantes para cuando exista su
  lógica correspondiente. Construido de verdad: capa de servicio nueva
  (`backend/api/services/`, antes vacía) que ahora usan tanto los 4
  routers HTTP existentes (refactor sin cambio de comportamiento, 90
  pruebas siguen en verde) como el servidor MCP; `search_tract`
  construido como pieza nueva (con su propio endpoint `GET /tracts`
  además de su herramienta MCP); auditoría de cada llamada MCP en una
  tabla de PostgreSQL nueva (`mcp_call_log`, migración 0010, decisión
  explícita de la usuaria de tabla frente a archivo de log). Servidor
  implementado con el SDK oficial (`mcp`, `FastMCP`, transporte stdio),
  verificado de extremo a extremo sin base de datos real disponible en
  este entorno (registro de las 5 herramientas con su esquema correcto,
  y una llamada real que falla limpiamente por falta de conexión, tal
  como se espera aquí).

  **Migración 0010 aplicada, 31/08/2026 (decisión 30 de
  `docs/analisis-arquitectura.md`, detalle completo ahí).** Al aplicarla
  se descubrió que la base de datos real de la usuaria estaba en la
  migración 0008 (no en la 0009, nunca aplicada tampoco pese a existir
  generada desde la decisión 20) y que la tabla `mcp_call_log` ya existía
  con la estructura exacta de la 0010 sin que Alembic lo supiera --
  causa no confirmada, documentada como discrepancia real, no
  investigada más a fondo. Corregido aplicando primero la 0009 de verdad
  y luego sincronizando `alembic_version` a 0010 sin recrear la tabla
  (ya coincidía exactamente, verificado columna a columna antes de
  tocar nada). Verificado al cierre: `alembic_version` = `0010`.

  Las cuatro salidas SQL pendientes (`salida_zotero_kerezoudis_2026.sql`,
  `salida_mni152_meshes.sql`, `salida_macaque_wang2017.sql`,
  `salida_cheng2021_ipl.sql`) ya están aplicadas contra la base de datos
  real, cada una verificada con la usuaria contra su recuento de filas
  esperado. Verificación final cruzada: 3 `Species`, 54 `Homology`, 178
  `Region` con prefijo `species.macaque` (160 de Wang2017 + 18 de
  Cheng2021, ambos legítimos y coexistentes) y 18 con prefijo
  `species.chimp`.

  **Bug real corregido al investigar la conexión con un cliente MCP,
  31/08/2026 (decisión 31 de `docs/analisis-arquitectura.md`, detalle
  completo ahí).** `Settings` nunca leía de verdad ningún archivo `.env`
  (faltaba `env_file` en su `SettingsConfigDict`, pese a que la
  documentación del propio módulo y `.env.example` daban por hecho desde
  la Fase 0 que sí) -- sin efecto mientras todo corría dentro de Docker
  (ahí la contraseña llega por variable de entorno directa del propio
  `docker-compose.yml`), pero sí habría afectado a `python -m
  backend.mcp.server`, que un cliente MCP arranca fuera de Docker.
  Corregido con una ruta absoluta a la raíz del repositorio (nunca
  relativa, para no depender del directorio de trabajo de quien arranque
  el proceso). Nueva prueba de regresión más las 3 ya existentes, suite
  completa 104 en verde + 13 omitidas, `ruff check` sin avisos.

  Pendiente explícito: conectar el servidor a un cliente MCP de verdad
  (p. ej. Claude Desktop) para la primera prueba con datos reales
  (siguiente paso, con las instrucciones ya dadas a la usuaria); decidir
  cuándo abordar las 6 herramientas restantes.

**Empaquetado y distribución para otras personas (pendiente, señalado por
la usuaria el 30/08/2026).** Al explicarle la arquitectura completa, surgió
una pregunta que la especificación original ya anticipaba pero nunca se
llegó a resolver: hoy NeuroGraph solo corre en el ordenador de la
usuaria, levantado a mano (`docker compose up`, servidor Vite de
desarrollo) -- no hay forma de que otra persona lo instale y lo abra sin
repetir todos esos pasos técnicos. Dos requisitos explícitos que hay que
abordar, no necesariamente en una fase concreta ya numerada del plan:

1. Empaquetar la aplicación para distribuirla (un instalador o
   equivalente), en vez de exigir clonar el repositorio y levantar Docker
   a mano.
2. Una interfaz que no dependa de abrir un navegador -- la decisión 1 de
   `docs/analisis-arquitectura.md` ya elegía Tauri para esto desde el
   principio (frente a Electron, por ser más ligero), pero quedó
   "pendiente de Rust" y nunca se retomó: el frontend sigue siendo un
   servidor Vite de desarrollo que se abre en el navegador.

No se ha decidido todavía en qué momento del plan abordar esto (podría
ir después de completar la Fase 9, o convivir con fases posteriores) --
queda anotado aquí para no perder el hilo entre sesiones, tal como pidió
la usuaria, sin comprometerse todavía a una fecha.

Extensión futura explícita (fuera del alcance de las fases 1-10 salvo
decisión en contra): ejecución de pipelines completos de dMRI→tractografía,
y mapas funcionales (overlays estadísticos sobre superficie cortical).
