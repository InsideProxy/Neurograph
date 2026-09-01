"""Auditoría de llamadas MCP (sección 23): cada llamada real a una
herramienta MCP se registra en la tabla `mcp_call_log`
(PostgreSQL, migración 0010) -- nunca solo en un archivo de texto que no
sea consultable como el resto de los datos del proyecto (decisión de la
usuaria, 31/08/2026, junto con el alcance de esta fase: ver decisión 27
en docs/analisis-arquitectura.md).

`McpCallLog` NO es una entidad científica de la ontología
(`backend/ontology/schema.py`): es telemetría operativa sobre el propio
programa (qué se le pidió a la IA, cuándo, con qué resultado), así que
usa una clave autoincremental en vez del esquema
`<tipo>.<especie>.<fuente>.<código>` que exige `build_id` -- no
describe una estructura del cerebro ni una relación entre estructuras,
describe el uso de la herramienta.

El resultado NUNCA se guarda completo: algunas herramientas (p. ej.
`search_region` sobre un atlas de cientos de regiones) devuelven listas
largas, y guardarlas enteras en cada llamada haría crecer la tabla de
auditoría sin límite. Se guarda un resumen real (recuento + una muestra
de ids/nombres reales, nunca inventados) -- suficiente para que una
persona compare después "¿esto es lo que la API habría devuelto en vivo
en ese momento?" sin duplicar todo el dato científico en una tabla que
no es la fuente de verdad de esos datos.
"""
from __future__ import annotations

import datetime as dt
import functools
import inspect
import time
from collections.abc import Callable
from typing import Any, ParamSpec, TypeVar

from pydantic import BaseModel
from sqlalchemy import BigInteger, DateTime, Float, String, Text, insert
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.models.base import Base
from backend.database.session import session_scope

P = ParamSpec("P")
T = TypeVar("T")


class McpCallLog(Base):
    __tablename__ = "mcp_call_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    called_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: dt.datetime.now(dt.timezone.utc), nullable=False
    )
    tool_name: Mapped[str] = mapped_column(String, nullable=False)
    arguments: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)  # ok | error
    # Presente solo cuando status='ok' -- nunca el resultado completo,
    # ver docstring del módulo.
    result_summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Presente solo cuando status='error'.
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[float] = mapped_column(Float, nullable=False)


def _summarize_result(result: Any) -> dict:
    """Resumen real del resultado (nunca inventado): para una lista, su
    longitud real y los primeros 5 elementos reales (su id, si lo
    tienen, o su representación); para un único modelo Pydantic, sus
    campos tal cual (son ya pequeños: una fila de métricas, no una lista
    de regiones)."""
    if isinstance(result, list):
        preview = []
        for item in result[:5]:
            if isinstance(item, BaseModel):
                data = item.model_dump(mode="json")
                preview.append(data.get("id") or data.get("name") or data)
            else:
                preview.append(item)
        return {"count": len(result), "preview": preview}
    if isinstance(result, BaseModel):
        return result.model_dump(mode="json")
    return {"value": result}


def _log_call(
    tool_name: str,
    arguments: dict[str, Any],
    status: str,
    result_summary: dict | None,
    error: str | None,
    duration_ms: float,
) -> None:
    # La propia auditoría nunca debe tumbar una llamada MCP real: si
    # escribir el registro falla (p. ej. la base de datos no está
    # arrancada), se deja constancia por stderr y se sigue -- sección 23
    # pide reproducibilidad, no que una herramienta deje de funcionar
    # por un problema de la propia auditoría.
    try:
        with session_scope() as session:
            session.execute(
                insert(McpCallLog).values(
                    tool_name=tool_name,
                    arguments=arguments,
                    status=status,
                    result_summary=result_summary,
                    error=error,
                    duration_ms=duration_ms,
                )
            )
            session.commit()
    except Exception as exc:  # noqa: BLE001 -- ver comentario de arriba
        import sys

        print(f"aviso: no se pudo escribir mcp_call_log para {tool_name!r}: {exc}", file=sys.stderr)


def audited_tool(tool_name: str) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """Decorador para las herramientas MCP (`backend/mcp/server.py`):
    registra cada llamada real -- argumentos, duración, éxito/error y un
    resumen del resultado -- antes de devolverlo o de relanzar el error,
    nunca después de forma diferida (sección 23: la auditoría no puede
    perderse si algo falla más adelante en la conversación).

    Captura los argumentos con `inspect.signature(...).bind_partial` en
    vez de leer solo `kwargs`: es robusto tanto si quien invoca la
    herramienta pasa argumentos por nombre (lo habitual con FastMCP)
    como si en el futuro algo los pasa posicionalmente.
    """

    def decorator(fn: Callable[P, T]) -> Callable[P, T]:
        signature = inspect.signature(fn)

        @functools.wraps(fn)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            bound = signature.bind_partial(*args, **kwargs)
            bound.apply_defaults()
            call_arguments = dict(bound.arguments)

            started = time.monotonic()
            try:
                result = fn(*args, **kwargs)
            except Exception as exc:
                elapsed_ms = (time.monotonic() - started) * 1000
                _log_call(tool_name, call_arguments, "error", None, str(exc), elapsed_ms)
                raise

            elapsed_ms = (time.monotonic() - started) * 1000
            _log_call(tool_name, call_arguments, "ok", _summarize_result(result), None, elapsed_ms)
            return result

        return wrapper

    return decorator
