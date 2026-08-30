"""Endpoints de regiones (sección 15: versión mínima de SEARCH_REGION).
Cada región real que se devuelve viene siempre acompañada de su
coordenada y del espacio de referencia en el que está expresada — nunca
una posición desnuda sin saber en qué sistema vive (sección 2.7 / riesgo
5 de docs/analisis-arquitectura.md).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database.models.entities import Coordinate, Network, Region, RegionNetworkMembership
from backend.database.session import get_db
from backend.ontology.schema import parse_id

router = APIRouter(prefix="/regions", tags=["regions"])


class RegionNode(BaseModel):
    id: str
    label: str
    abbreviation: str | None
    # "L", "R" o None -- migración 0008. None cuando la ingesta de este
    # atlas todavía no lo tiene backfillado, o cuando la propia región no
    # tiene lateralidad real (p. ej. el tronco del encéfalo): nunca se
    # infiere del signo de la coordenada x (ver region_to_node).
    hemisphere: str | None
    network: str
    position3d: tuple[float, float, float]
    reference_space: str


def region_to_node(region: Region, coordinate: Coordinate, network: Network | None) -> RegionNode:
    """Traducción pura (sin base de datos) de una `Region` + su
    `Coordinate` (+ opcionalmente su `Network`, vía
    `region_network_memberships`) a la forma que consume el frontend.
    Separada del endpoint para poder probarla sin una base de datos real.

    "unclassified" es un valor explícito para "todavía no hay una
    pertenencia a red calculada para esta región" (p. ej. otros atlas sin
    clasificación Cole-Anticevic todavía) — nunca se inventa una red.

    El slug incluye la fuente de la red (`<fuente>.<código_local>`, p. ej.
    `cole-anticevic.default`), no solo el código local: varias
    parcelaciones tienen redes con el mismo nombre pero distinto método
    (Cole-Anticevic y Gordon 333 tienen las dos una red "Default"). Usar
    solo el código local colapsaría dos redes distintas en una misma
    clave de color/leyenda en el frontend sin ningún aviso — ver riesgo
    13 de docs/analisis-arquitectura.md.
    """
    if network is None:
        network_slug = "unclassified"
    else:
        parsed = parse_id(network.id)
        network_slug = f"{parsed['source']}.{parsed['local_code']}"
    return RegionNode(
        id=region.id,
        label=region.name,
        # None cuando la ingesta de este atlas todavia no calcula/registra
        # abreviatura (migracion 0007) -- nunca se inventa una a partir
        # del nombre completo.
        abbreviation=region.abbreviation,
        # Igual criterio que abbreviation, pero migracion 0008: None
        # puede significar "todavia no backfillado" o "esta region no
        # tiene lateralidad real" -- en ningun caso se adivina a partir
        # de la coordenada.
        hemisphere=region.hemisphere,
        network=network_slug,
        position3d=(coordinate.x, coordinate.y, coordinate.z),
        reference_space=coordinate.reference_space,
    )


@router.get("", response_model=list[RegionNode])
def list_regions(atlas_id: str | None = None, db: Session = Depends(get_db)) -> list[RegionNode]:
    """Devuelve las regiones que tienen coordenada registrada (una región
    sin coordenada no se puede colocar en el cerebro 3D, así que se
    excluye en vez de mandarse con una posición inventada). La red
    funcional es opcional (LEFT JOIN): una región sin pertenencia
    calculada todavía se devuelve igual, marcada "unclassified".
    """
    query = (
        select(Region, Coordinate, Network)
        .join(Coordinate, Coordinate.entity_id == Region.id)
        .outerjoin(RegionNetworkMembership, RegionNetworkMembership.region_id == Region.id)
        .outerjoin(Network, Network.id == RegionNetworkMembership.network_id)
    )
    if atlas_id is not None:
        query = query.where(Region.atlas_id == atlas_id)
    rows = db.execute(query).all()
    return [region_to_node(region, coordinate, network) for region, coordinate, network in rows]
