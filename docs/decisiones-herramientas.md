---
title: NeuroGraph — Decisiones de instalación y herramientas auxiliares
fecha: 2026-09-24
---

# NeuroGraph — Decisiones de instalación y herramientas auxiliares

Documento hijo de `docs/analisis-arquitectura.md`. El principal recoge los criterios funcionales de la app: datos, criterio científico, API y MCP. Aquí se anotan las decisiones sobre cómo se instala, se pone en marcha y se mantiene: instaladores, Docker, reconstrucción de la base de datos, recuperación de datos y scripts auxiliares. Las de interfaz van en `docs/decisiones-diseno.md`.

**Numeración.** H1, H2… Las que vienen del principal llevan su número antiguo entre paréntesis. El principal conserva una línea con ese número que remite aquí, así que las referencias a "decisión 75" siguen llevando al sitio correcto. Un número sin letra (49, 53…) es una decisión del principal.

**Antecedentes.** Se quedan en el principal: la 52 y la 53 (volcado de la base de datos) y de la 54 a la 70 (ejecutable de Windows con Tauri y Postgres embebido, firma y publicación en GitHub).

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

**Pendiente real.** Faltan los 41 tractos del atlas ORG y sus 41 `tract_geometries`, además de `tractography_nodes`/`tractography_edges`. No hay SQL de ellos en el repositorio: salen de `generate_org_tractography_geometry.py` y `generate_hybrid_tractography_nodes.py`, que necesitan la biblioteca original (`E:\NeuroData`). La vista de tractografía queda sin esos datos hasta que se generen. No hay versión `.ps1` del script todavía: se escribió y probó en Linux.

**Actualización, 24/09/2026: de dónde recuperarlo.** Los dos archivos originales siguen publicados en Zenodo y se descargan desde Linux:
- `ORG-800FiberClusters.zip` (492 MB, md5 `ee5f73e15d28f177e65ba38dbb6c8a7a`), registro 2648292 (10.5281/zenodo.2648292). Tiene el mismo nombre y la misma carpeta raíz que espera `org_atlas.ZIP_ROOT`.
- `100HCP-population-mean-wmparc.nii.gz` (0,8 MB, md5 `b8bec868a3cc878dcfc62c704ba15e4b`), registro 8082481 (10.5281/zenodo.8082481). El md5 coincide con el anotado en la decisión 63.

Del zip no quedó ningún checksum en el repositorio. Para confirmar que son los mismos datos, al regenerar deben salir los recuentos de la decisión 49: 41 tractos, 523 696 streamlines reales y 12 300 mostradas. Los genes (`genes`, `expressions`) y `evidence` no forman parte de este pendiente: nunca tuvieron filas (migración 0013 y decisiones 20 y 47).
