"""Registro de bibliotecas de datos conectadas (secciones 2 y 26).

Separado de `entities.py` a propósito: una biblioteca (el SSD) es
infraestructura, no una entidad de la ontología científica. `id` aquí es
el `library_id` estable del manifiesto (`backend/library/manifest.py`),
no un identificador con el esquema `<tipo>.<especie>.<fuente>.<código>`.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.models.base import Base


class Library(Base):
    __tablename__ = "libraries"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # library_id del manifiesto
    last_known_path: Mapped[str | None] = mapped_column(String, nullable=True)
    index_schema_version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_verified_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
