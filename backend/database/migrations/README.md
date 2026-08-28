# Migraciones (Alembic)

El esquema de la base de datos se versiona aquí con Alembic. Cada cambio
de esquema es una migración nueva, nunca una edición manual de una tabla
(sección 23: reproducibilidad).

## Aplicar el esquema

**Forma normal** (cuando tengas un entorno Python que pueda conectarse a
la base de datos, p. ej. tu propio ordenador con el entorno de
`backend/` instalado):

```bash
alembic upgrade head
```

**Forma usada para la primera puesta en marcha de este proyecto**: el
entorno donde se desarrolló NeuroGraph no tenía conexión directa a tu
PostgreSQL local, así que el SQL de la migración inicial se generó sin
conexión (`alembic upgrade head --sql`) y se guardó en
`generated/0001_initial_schema.sql`, para aplicarlo directamente con
`psql` dentro del contenedor de Docker:

```powershell
Get-Content .\backend\database\migrations\generated\0001_initial_schema.sql | docker exec -i neurograph-postgres psql -U neurograph -d neurograph
```

`generated/` es un volcado de una migración concreta, no la fuente de
verdad — la fuente de verdad son los archivos en `versions/`. Si cambias
los modelos en `backend/database/models/`, la migración siguiente se crea
con `alembic revision --autogenerate -m "descripción"` desde un entorno
con conexión a la base de datos.
