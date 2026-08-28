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
PostgreSQL local, así que el SQL de cada migración se genera sin conexión
(`alembic upgrade head --sql`) y se guarda en `generated/`, para
aplicarlo dentro del contenedor de Docker con `docker cp` + `psql -f`:

```powershell
docker cp .\backend\database\migrations\generated\0001_initial_schema.sql neurograph-postgres:/tmp/apply.sql
docker exec -i neurograph-postgres psql -U neurograph -d neurograph -f /tmp/apply.sql
```

**Importante — usar siempre `docker cp` + `psql -f`, nunca
`Get-Content ... | docker exec ...`.** PowerShell corrompe los acentos y
la ñ al pasar el archivo por la tubería (`|`): "Área" llega como "??rea".
`docker cp` copia el archivo en bruto, sin tocar su codificación, así que
es la única forma segura de cargar cualquier dato en español. Se
comprobó y confirmó este comportamiento el 28 de agosto de 2026 —
ver `generated/0001_verify.sql`.

`generated/` es un volcado de cada migración concreta, no la fuente de
verdad — la fuente de verdad son los archivos en `versions/`. Si cambias
los modelos en `backend/database/models/`, la migración siguiente se crea
con `alembic revision --autogenerate -m "descripción"` desde un entorno
con conexión a la base de datos.
