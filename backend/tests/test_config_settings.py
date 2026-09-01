"""Prueba de regresión del bug real encontrado el 28/08/2026 (riesgo 9 en
docs/analisis-arquitectura.md): una variable de entorno como
`NEUROGRAPH_DATABASE__HOST` debe ganar siempre a lo que diga
`default.yaml`, nunca al revés. Antes de la corrección, `Settings.load()`
pasaba el YAML entero como argumentos al constructor, y eso hacía que
`database.host: localhost` (presente en el YAML) tapara silenciosamente
cualquier variable de entorno equivalente — exactamente lo que le pasó a
la API dentro de Docker, que seguía intentando conectar a `localhost` en
vez de al contenedor `postgres`.
"""
from backend.config.settings import Settings


def test_env_file_is_actually_loaded(tmp_path, monkeypatch):
    # Bug real descubierto el 31/08/2026 (decisión 31): sin `env_file`
    # fijado explícitamente en `SettingsConfigDict`, pydantic-settings NO
    # lee ningún `.env`, pese a que el docstring del módulo y
    # `.env.example` daban por hecho que sí desde la Fase 0 -- un `.env`
    # real en la raíz del repositorio no tenía ningún efecto. Se
    # construye aquí un `Settings` propio apuntando a un `.env` temporal
    # (nunca al de la propia usuaria) para no depender de si existe un
    # `.env` real en este entorno de pruebas.
    env_file = tmp_path / ".env"
    env_file.write_text("NEUROGRAPH_DATABASE__PASSWORD=clave_de_prueba\n", encoding="utf-8")
    monkeypatch.delenv("NEUROGRAPH_DATABASE__PASSWORD", raising=False)

    class SettingsWithTempEnvFile(Settings):
        model_config = Settings.model_config | {"env_file": env_file}

    settings = SettingsWithTempEnvFile()
    assert settings.database.password == "clave_de_prueba"


def test_env_var_overrides_yaml_default(monkeypatch):
    # default.yaml declara database.host: localhost — igual que el valor
    # por defecto del propio campo, así que este caso es precisamente el
    # que ocultaba el bug: antes de la corrección, ambas fuentes decían
    # "localhost" y la variable de entorno nunca se notaba ausente.
    monkeypatch.setenv("NEUROGRAPH_DATABASE__HOST", "postgres")
    settings = Settings()
    assert settings.database.host == "postgres"


def test_env_var_overrides_yaml_even_when_yaml_differs(monkeypatch):
    # Caso más exigente: el YAML no coincide con el valor por defecto del
    # campo (name), y aun así la variable de entorno debe ganar.
    monkeypatch.setenv("NEUROGRAPH_DATABASE__NAME", "otra_bd")
    settings = Settings()
    assert settings.database.name == "otra_bd"


def test_yaml_still_applies_without_env_override(monkeypatch):
    # Sin variable de entorno, el valor de default.yaml debe seguir
    # aplicándose (no queremos "arreglar" el bug rompiendo la carga
    # normal del YAML).
    monkeypatch.delenv("NEUROGRAPH_DATABASE__HOST", raising=False)
    settings = Settings()
    assert settings.database.host == "localhost"
