"""Base declarativa y mixins comunes para los modelos de NeuroGraph."""
from __future__ import annotations

import datetime as dt

from sqlalchemy import DateTime, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class IdentifiedMixin:
    """Toda entidad científica tiene un identificador estable (sección 6)."""

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)


class ProvenanceMixin:
    """Metadatos de procedencia exigidos por las secciones 3 y 23:
    de dónde viene un dato derivado y con qué se generó.
    """

    source_dataset_id: Mapped[str | None] = mapped_column(String, nullable=True)
    algorithm: Mapped[str | None] = mapped_column(String, nullable=True)
    software_version: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: dt.datetime.now(dt.timezone.utc)
    )
