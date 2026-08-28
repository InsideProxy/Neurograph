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
