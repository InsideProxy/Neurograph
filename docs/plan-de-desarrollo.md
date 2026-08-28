# Plan de desarrollo por fases

Basado en la sección 28 de la especificación maestra, con los ajustes
señalados en `docs/analisis-arquitectura.md` (sección 5).

- **Fase 0 — Entorno.** Repositorio, estructura de módulos, base de datos,
  ontología inicial, sistema de biblioteca SSD, configuración. **(hecho)**
- **Fase 1 — Arquitectura.** Revisión y confirmación de las decisiones de
  `docs/analisis-arquitectura.md`: stack de interfaz, alcance de
  tractografía, esquema de PostgreSQL definitivo, API.
- **Fase 2 — Biblioteca de datos.** Registro del SSD, indexación,
  metadatos, detección de datasets, separación original/derivado.
- **Fase 3 — Neuroimagen.** NIfTI, atlas, regiones, coordenadas,
  visualización básica.
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
  y sincronizados (secciones 5.1, 5.2, 5.3).
- **Fase 10 — IA.** AIProvider, Claude, otros proveedores, MCP, query
  planner.

Extensión futura explícita (fuera del alcance de las fases 1-10 salvo
decisión en contra): ejecución de pipelines completos de dMRI→tractografía,
y mapas funcionales (overlays estadísticos sobre superficie cortical).
