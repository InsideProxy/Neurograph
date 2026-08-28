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
  SINTÉTICOS", nunca ambos a la vez). Pendiente: otras parcelaciones del
  mismo paquete HCP (Gordon333, Cole-Anticevic), y enlace estructurado
  atlas→cita bibliográfica (hueco de esquema anotado, no resuelto
  todavía).
- **Fase 4 — Conectividad.** Importación de tractografía ya calculada,
  matrices, grafos, conectomas.
- **Fase 5 — Matemática.** Laplacianos, espectro, comunidades, centralidad,
  análisis de redes.
- **Fase 6 — Literatura.** Ingesta de artículos, extracción estructurada,
  evidencia, referencias, Knowledge Graph.
- **Fase 7 — Evolución.** Especies, correspondencias, homologías,
  comparación interespecífica.
- **Fase 8 — Neuropsicología.** Lesiones, funciones, fenotipos,
  asociaciones clínicas.
- **Fase 9 — Visualizador avanzado.** Connectograma y cerebro 3D completos
  y sincronizados (secciones 5.1, 5.2, 5.3). Pendiente señalado por la
  usuaria el 28/08/2026: los paneles del connectograma y del cerebro 3D
  son demasiado pequeños (tamaño fijo heredado de cuando solo había 8
  nodos de demostración); ampliarlos es trabajo de diseño de interfaz,
  pospuesto a esta fase a propósito en vez de parchearlo ahora.
- **Fase 10 — IA.** AIProvider, Claude, otros proveedores, MCP, query
  planner.

Extensión futura explícita (fuera del alcance de las fases 1-10 salvo
decisión en contra): ejecución de pipelines completos de dMRI→tractografía,
y mapas funcionales (overlays estadísticos sobre superficie cortical).
