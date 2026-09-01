"""Motor y sesiones de SQLAlchemy: único punto de entrada para conectar
con la base de datos desde código que sí necesita una conexión viva (la
API, sobre todo). `backend/config/settings.py` sigue siendo el único
punto de entrada para *leer* la configuración; este módulo solo la usa
para construir el motor.
"""
from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager

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


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """Una sesión con el mismo ciclo de vida que `get_db` (se abre, se
    entrega, se cierra siempre al terminar), pero utilizable con `with`
    fuera de una petición HTTP -- lo necesitan, por ejemplo, las
    herramientas MCP (Fase 10) y su auditoría (`backend/mcp/audit.py`),
    que no pasan por el sistema de dependencias de FastAPI. `get_db` se
    define ahora en términos de esta función para no duplicar el mismo
    try/finally en dos sitios (sección 15: nunca reimplementar lógica ya
    existente)."""
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    """Dependencia de FastAPI: una sesión por petición, cerrada siempre
    al terminar (haya ido bien o no)."""
    with session_scope() as session:
        yield session
