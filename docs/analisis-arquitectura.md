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

## 7. Decisiones que requieren confirmación del usuario antes de implementar

1. Stack de interfaz gráfica: Opción A (web local, Tauri/Electron + Three.js + D3) vs Opción B (Python nativo, Qt + VTK/PyVista).
2. Alcance de tractografía en el MVP: solo importar tractogramas ya calculados vs. ejecutar pipelines completos de dMRI.
3. Dónde vive el proyecto: en este espacio de trabajo en la nube, o en una carpeta del ordenador del usuario (para poder seguir desarrollándolo fuera de estas sesiones).
4. Datos de partida: empezar con datos sintéticos/de demostración etiquetados explícitamente (`DEMO`/`SYNTHETIC`), o conectar ya un atlas real (p. ej. HCP-MMP) desde el principio.
