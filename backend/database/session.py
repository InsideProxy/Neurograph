"""Motor y sesiones de SQLAlchemy: único punto de entrada para conectar
con la base de datos desde código que sí necesita una conexión viva (la
API, sobre todo). `backend/config/settings.py` sigue siendo el único
punto de entrada para *leer* la configuración; este módulo solo la usa
para construir el motor.
"""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.config.settings import get_settings

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(get_settings().database.dsn)
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine())
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    """Dependencia de FastAPI: una sesión por petición, cerrada siempre
    al terminar (haya ido bien o no)."""
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()
