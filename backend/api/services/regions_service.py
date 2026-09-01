"""Capa de servicio de regiones (Fase 10, sección 16).

Dueña real de la traducción pura `Region` + `Coordinate` (+ `Network`)
-> `RegionNode` y de la consulta que las junta. Antes ambas vivían
dentro del endpoint `GET /regions`
(`backend/api/routers/regions.py`); se mueven aquí para que el router
HTTP y las herramientas MCP (`backend/mcp/server.py`) llamen exactamente
a la misma función -- nunca cada uno con su propia consulta, tal y como
exige el propio esqueleto de `backend/mcp/server.py` ("cada herramienta
MCP debe llamar a la misma capa de servicio que usa la API HTTP, nunca
reimplementar lógica propia"). `backend/api/routers/regions.py`
reexporta `RegionNode`/`region_to_node` para no romper
`backend/tests/api/test_regions.py`, que los importa desde ahí.
"""
from __future__ import annotations

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database.models.entities import Coordinate, Network, Region, RegionNetworkMembership
from backend.ontology.schema import parse_id


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
    Separada de la consulta para poder probarla sin una base de datos real.

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


def list_regions(db: Session, atlas_id: str | None = None) -> list[RegionNode]:
    """Regiones con coordenada registrada (una región sin coordenada no
    se puede colocar en el cerebro 3D, así que se excluye en vez de
    mandarse con una posición inventada). La red funcional es opcional
    (LEFT JOIN): una región sin pertenencia calculada todavía se
    devuelve igual, marcada "unclassified" por `region_to_node`."""
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
