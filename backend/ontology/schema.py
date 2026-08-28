"""Ontología interna de NeuroGraph (sección 6 de la especificación).

Define los tipos de entidad reconocidos y el esquema de identificadores
estables. Un identificador NUNCA depende únicamente del nombre textual de
una estructura (dos nombres distintos no implican automáticamente
estructuras distintas, ni al revés): se construye a partir del tipo de
entidad, la especie, el atlas/fuente y un código local.

Esquema:  <tipo>.<especie>.<atlas_o_fuente>.<codigo_local>
Ejemplo:  region.human.hcp-mmp1.area44
"""
from __future__ import annotations

import re
from enum import Enum


class EntityType(str, Enum):
    REGION = "region"
    TRACT = "tract"
    NUCLEUS = "nucleus"
    NETWORK = "network"
    CONNECTION = "connection"
    FUNCTION = "function"
    PHENOTYPE = "phenotype"
    LESION = "lesion"
    SPECIES = "species"
    STUDY = "study"
    EVIDENCE = "evidence"
    HOMOLOGY = "homology"
    COORDINATE = "coordinate"
    ATLAS = "atlas"
    DATASET = "dataset"


_ID_PATTERN = re.compile(r"^[a-z]+\.[a-z0-9_]+\.[a-z0-9_\-\.]+\.[a-z0-9_\-]+$")


def build_id(entity_type: EntityType, species: str, source: str, local_code: str) -> str:
    """Construye un identificador estable a partir de sus componentes.

    No usar el nombre de la estructura como identificador: el nombre puede
    cambiar de forma (sinónimos, traducciones) sin que cambie la entidad.
    """
    parts = [entity_type.value, species.lower(), source.lower(), local_code.lower()]
    entity_id = ".".join(p.replace(" ", "_") for p in parts)
    if not _ID_PATTERN.match(entity_id):
        raise ValueError(f"Identificador mal formado: {entity_id!r}")
    return entity_id


def parse_id(entity_id: str) -> dict[str, str]:
    """Descompone un identificador en sus componentes (tipo, especie, fuente, código)."""
    if not _ID_PATTERN.match(entity_id):
        raise ValueError(f"Identificador mal formado: {entity_id!r}")
    entity_type, species, *rest = entity_id.split(".")
    *source_parts, local_code = rest
    return {
        "type": entity_type,
        "species": species,
        "source": ".".join(source_parts),
        "local_code": local_code,
    }
