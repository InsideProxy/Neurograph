"""Carga de configuración de NeuroGraph.

La configuración combina un YAML por defecto (backend/config/default.yaml)
con variables de entorno (prefijo NEUROGRAPH_). Este módulo es el único
punto de entrada para leer configuración: ningún otro módulo debe leer
YAML o variables de entorno directamente, para que cambiar de proveedor
de IA o de base de datos sea siempre una operación de configuración
(sección 17 de la especificación) y no un cambio de código.

Prioridad, de más a menos: valores pasados explícitamente al construir
`Settings(...)` > variables de entorno > archivo `.env` > `default.yaml`
> valores por defecto de los propios campos. El YAML se registra como una
fuente de baja prioridad (`settings_customise_sources`) en vez de pasarse
como argumentos al constructor: pasarlo como argumentos (la implementación
original) hacía que CUALQUIER clave presente en el YAML tapara
silenciosamente la variable de entorno equivalente, porque un valor
pasado al constructor siempre gana — ver riesgo 9 en
docs/analisis-arquitectura.md, descubierto el 28/08/2026 al no poder la
API dentro de Docker conectar con `NEUROGRAPH_DATABASE__HOST=postgres`
(seguía intentando `localhost`, el valor de `default.yaml`).

El archivo `.env` se lee de una ruta absoluta (`ENV_FILE_PATH`, la raíz
del repositorio calculada desde este propio archivo), nunca de una ruta
relativa al directorio de trabajo del proceso que arranca: comprobado el
31/08/2026 (decisión 31) que, sin fijar `env_file` explícitamente en
`SettingsConfigDict`, `pydantic-settings` NO carga ningún `.env` pese a
que este docstring y `.env.example` llevaban desde la Fase 0 dando por
hecho que sí -- un `.env` real en la raíz del repositorio no tenía efecto
alguno. Se detectó al investigar cómo conectar `backend/mcp/server.py`
(Fase 10) a un cliente MCP real: ese proceso lo arranca el cliente MCP
(p. ej. Claude Desktop) con un directorio de trabajo que no es
necesariamente la raíz del repositorio, así que una ruta relativa como
`env_file=".env"` habría dependido de quién lo arranque -- de ahí la ruta
absoluta.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)

DEFAULT_CONFIG_PATH = Path(__file__).parent / "default.yaml"
# Raíz del repositorio: backend/config/settings.py -> backend/config -> backend -> raíz.
ENV_FILE_PATH = Path(__file__).resolve().parent.parent.parent / ".env"


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


class _YamlConfigSettingsSource(PydanticBaseSettingsSource):
    """Fuente de configuración de baja prioridad: `default.yaml`. Las
    variables de entorno (o cualquier valor explícito al construir
    `Settings`) siempre ganan sobre esto — si no fuera así, un valor
    puesto en el YAML (aunque coincidiera con el valor por defecto del
    propio campo, como pasaba con `database.host`) taparía en silencio
    cualquier variable de entorno equivalente.
    """

    def get_field_value(self, field: Any, field_name: str) -> tuple[Any, str, bool]:
        # No se usa: __call__ ya devuelve el diccionario completo de una
        # vez, no campo a campo.
        return None, field_name, False

    def __call__(self) -> dict[str, Any]:
        if not DEFAULT_CONFIG_PATH.exists():
            return {}
        return yaml.safe_load(DEFAULT_CONFIG_PATH.read_text()) or {}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="NEUROGRAPH_",
        env_nested_delimiter="__",
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
    )

    library: LibrarySettings = LibrarySettings()
    database: DatabaseSettings = DatabaseSettings()
    ai: AISettings = AISettings()
    api: APISettings = APISettings()

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            _YamlConfigSettingsSource(settings_cls),
            file_secret_settings,
        )

    @classmethod
    def load(cls) -> Settings:
        """Mantenido por compatibilidad con el resto del código (que
        llama a `Settings.load()`); ahora es equivalente a `Settings()`,
        porque el YAML ya se lee como una fuente más a través de
        `settings_customise_sources`, no como argumentos explícitos que
        taparían las variables de entorno."""
        return cls()


def get_settings() -> Settings:
    return Settings.load()
