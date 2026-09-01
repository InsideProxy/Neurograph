"""Configuración de Alembic para NeuroGraph.

Nota de reproducibilidad (sección 23): las migraciones son la única forma
autorizada de cambiar el esquema de la base de datos. Nunca se debe editar
una tabla a mano en producción; cualquier cambio de esquema se expresa
como una migración nueva, versionada aquí.
"""
from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Importar todos los modelos para que se registren en Base.metadata antes
# de que Alembic compare el esquema (autogenerate) o genere el SQL inicial.
from backend.database.models.base import Base
from backend.database.models import entities  # noqa: F401  (registra las tablas)
from backend.database.models import library  # noqa: F401
from backend.mcp import audit  # noqa: F401  (mcp_call_log, Fase 10)
from backend.config.settings import get_settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# La URL real de conexión viene de la configuración de NeuroGraph
# (backend/config/settings.py), no se duplica aquí a mano.
try:
    settings = get_settings()
    config.set_main_option("sqlalchemy.url", settings.database.dsn)
except Exception:
    # En modo --sql (generación offline) no hace falta que la configuración
    # de entorno esté completa: se usa la URL de alembic.ini tal cual.
    pass

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
