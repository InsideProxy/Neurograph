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
  contra, sección 6), y decidir si merece la pena mapear las redes de
  Cole-Anticevic también sobre Brainnetome.
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
- **Fase 6 — Literatura.** Ingesta de artículos, extracción estructurada,
  evidencia, referencias, Knowledge Graph.
- **Fase 7 — Evolución.** Especies, correspondencias, homologías,
  comparación interespecífica.
- **Fase 8 — Neuropsicología.** Lesiones, funciones, fenotipos,
  asociaciones clínicas.
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
  `ResizeObserver` (acotado entre 320 y 720px). Queda pendiente de esta
  fase el resto: sincronización 2D/3D completa y demás trabajo de
  interfaz avanzado.

  **Próxima sesión (acordado con la usuaria, 29/08/2026): pasar a diseñar
  la interfaz.** Punto de partida confirmado en esa conversación (para no
  perder el hilo entre sesiones): NeuroGraph es un instrumento científico
  de neuroinformática, no una demo visual — cerebro 3D con tractografía y
  connectograma 2D sincronizados, cada elemento visual con ID científico
  trazable hasta su estudio/método/confianza de origen, en apoyo a la
  investigación sobre homologías cognición-cerebro entre especies. El
  diseño de interfaz debe partir de ahí: explorar disposición y paneles
  (posiblemente como mockup visual antes de tocar código de
  `frontend/`), sin perder la separación exigida en la sección 21 (todo
  objeto visual debe poder trazarse hasta su evidencia).
- **Fase 10 — IA.** AIProvider, Claude, otros proveedores, MCP, query
  planner.

Extensión futura explícita (fuera del alcance de las fases 1-10 salvo
decisión en contra): ejecución de pipelines completos de dMRI→tractografía,
y mapas funcionales (overlays estadísticos sobre superficie cortical).
