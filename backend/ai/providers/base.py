"""Interfaz abstracta de proveedor de IA (sección 17).

El núcleo científico de NeuroGraph no debe depender de ningún proveedor
concreto. Cambiar de modelo es una operación de configuración
(ai.provider en backend/config/default.yaml), nunca un cambio de código
en el motor científico.

Un AIProvider solo transforma lenguaje natural en llamadas a la API
científica y explica los resultados: nunca calcula ni inventa datos
científicos por sí mismo (sección 1 / sección 18).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class AIProvider(ABC):
    @abstractmethod
    def interpret(self, natural_language_query: str) -> dict[str, Any]:
        """Traduce una petición en lenguaje natural a una operación formal
        de la API científica (ver sección 15 para el listado de operaciones).
        """

    @abstractmethod
    def explain(self, operation_result: dict[str, Any]) -> str:
        """Convierte el resultado estructurado de una operación científica
        en una explicación en lenguaje natural, sin añadir datos que no
        estén en `operation_result`.
        """


class NotConfiguredProvider(AIProvider):
    """Proveedor por defecto cuando ninguno está configurado todavía."""

    def interpret(self, natural_language_query: str) -> dict[str, Any]:
        raise NotImplementedError(
            "Ningún AIProvider configurado. Ver backend/config/default.yaml (ai.provider) "
            "y backend/ai/providers/ (Fase 10 del plan de desarrollo)."
        )

    def explain(self, operation_result: dict[str, Any]) -> str:
        raise NotImplementedError("Ningún AIProvider configurado.")
