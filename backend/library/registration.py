"""Generación de SQL para registrar bibliotecas en la base de datos.

No ejecuta nada contra la base de datos directamente (el entorno de
desarrollo no tiene red hacia el Postgres real del usuario, ver
`backend/database/migrations/README.md`). En su lugar produce el SQL
que el usuario aplica con `docker cp` + `psql -f`, siguiendo el mismo
patrón que las migraciones de esquema.
"""
from __future__ import annotations

from backend.library.manifest import LibraryManifest


def library_insert_sql(manifest: LibraryManifest, recorded_path: str) -> str:
    """SQL de alta/actualización de una biblioteca en la tabla `libraries`.

    `recorded_path` es la ruta tal como la conoce el usuario en su propio
    sistema (p. ej. `E:\\NeuroData`), no necesariamente la ruta desde la
    que se lee el manifiesto (que puede estar montada en otro punto).
    Es idempotente: si el `library_id` ya existe, actualiza la ruta y
    marca la verificación como hecha ahora mismo.
    """
    escaped_path = recorded_path.replace("'", "''")
    return (
        "INSERT INTO libraries "
        "(id, last_known_path, index_schema_version, created_at, last_verified_at)\n"
        f"VALUES ('{manifest.library_id}', '{escaped_path}', "
        f"{manifest.index_schema_version}, '{manifest.created_at}', now())\n"
        "ON CONFLICT (id) DO UPDATE SET\n"
        "  last_known_path = EXCLUDED.last_known_path,\n"
        "  last_verified_at = now();\n"
    )
