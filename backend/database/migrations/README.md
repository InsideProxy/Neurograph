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

## Forma recomendada: `scripts/apply_sql.ps1`

Los dos comandos de arriba (`docker cp` + `docker exec ... psql -f`) se
pueden ejecutar de una sola vez con `scripts/apply_sql.ps1` — mismo
procedimiento exacto por dentro (incluida la copia con `docker cp` para
no corromper acentos/ñ, nunca una tubería de PowerShell), solo que en un
único comando en vez de dos, con comprobaciones y mensajes de error
claros:

```powershell
.\scripts\apply_sql.ps1 -Archivo .\backend\database\migrations\generated\0001_initial_schema.sql
```

Sirve tanto para migraciones de esquema como para cualquier
`salida_*.sql` generado por un `scripts/register_*.py`. No sustituye tu
revisión del archivo — si quieres ver el SQL antes de aplicarlo, ábrelo
tú misma (`notepad .\archivo.sql`) antes de ejecutar el script; el script
solo automatiza la mecánica de aplicarlo una vez que ya decidiste
hacerlo, nunca decide por ti qué aplicar.
