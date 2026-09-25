# CLAUDE.md — scripts

Reglas para trabajar en `scripts/`. Las generales están en el CLAUDE.md de la raíz; el detalle, en `docs/criterios-herramientas.md`.

## Scripts que generan SQL (`register_*.py`, `backfill_*.py` y los `generate_*.py` de tractografía)

- **Sin conexión.** Generan el SQL y nunca se conectan a una base de datos.
- **Codificación.** El SQL sale en UTF-8 por una de dos vías:
  - por la salida estándar, con `sys.stdout.reconfigure(encoding="utf-8")` como primera línea de `main()`;
  - escrito directamente en un archivo con `encoding="utf-8"`.
- **Idempotencia.** El SQL es `INSERT … ON CONFLICT (id) DO UPDATE`, o `UPDATE` por id en los backfills.
- **Reutilización.** La lectura de los datos se toma de `backend/ingestion/`; no se reescribe.
- **Salida.** Un `salida_*.sql` en `data/sql/`:
  - se prueba en un Postgres desechable, aplicándolo dos veces;
  - aplicarlo a una base real lo decide el usuario tras revisarlo;
  - si es nuevo, se añade a la lista de `rebuild_db_from_sql.sh` y a la tabla de `backend/database/migrations/README.md`, detrás de lo que referencia.

## Scripts de PowerShell (`*.ps1`)

- Se guardan en UTF-8 con BOM.
- El SQL nunca se redirige con `>`, que escribe UTF-16, ni se pasa por tubería a `docker exec`. Se copia con `docker cp` y se aplica con `psql -f`.

## Scripts de un solo uso

- Sus dependencias pesadas (`vtk`, `scikit-image`, `pygltflib`, `trimesh`) no van en `pyproject.toml` y se importan de forma perezosa.
- Verifican su resultado antes de escribir nada; por ejemplo, las mallas comprueban el solape de las cajas delimitadoras.
