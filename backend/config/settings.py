"""Carga de configuración de NeuroGraph.

La configuración combina un YAML por defecto (backend/config/default.yaml)
con variables de entorno (prefijo NEUROGRAPH_). Este módulo es el único
punto de entrada para leer configuración: ningún otro módulo debe leer
YAML o variables de entorno directamente, para que cambiar de proveedor
de IA o de base de datos sea siempre una operación de configuración
(sección 17 de la especificación) y no un cambio de código.
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_CONFIG_PATH = Path(__file__).parent / "default.yaml"


class LibrarySettings(BaseModel):
    path: str | None = None


class DatabaseSettings(BaseModel):
    host: str = "localhost"
    port: int = 5432
    name: str = "neurograph"
    user: str = "neurograph"
    password: str = ""

    @property
    def dsn(self) -> str:
        return (
            f"postgresql+psycopg://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.name}"
        )


class AISettings(BaseModel):
    provider: Literal["claude", "openai", "local", "generic"] = "claude"


class APISettings(BaseModel):
    host: str = "127.0.0.1"
    port: int = 8420


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NEUROGRAPH_", env_nested_delimiter="__")

    library: LibrarySettings = LibrarySettings()
    database: DatabaseSettings = DatabaseSettings()
    ai: AISettings = AISettings()
    api: APISettings = APISettings()

    @classmethod
    def load(cls, yaml_path: Path = DEFAULT_CONFIG_PATH) -> "Settings":
        raw: dict = {}
        if yaml_path.exists():
            raw = yaml.safe_load(yaml_path.read_text()) or {}
        return cls(**raw)


def get_settings() -> Settings:
    return Settings.load()
