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

from typing import NamedTuple

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
    # Cómo se decidió esa red (decisión 73): el `algorithm` y la
    # `confidence` REALES de la fila de `region_network_memberships`
    # elegida -- p. ej. "majority_vote" con 0,28 cuando solo el 28 % de los
    # vértices de la región caen en la red ganadora. None si la región no
    # tiene red en la clasificación pedida. Así la interfaz puede avisar de
    # una asignación débil en vez de presentarla igual que una segura.
    network_algorithm: str | None = None
    network_confidence: float | None = None
    position3d: tuple[float, float, float]
    reference_space: str


def region_to_node(
    region: Region,
    coordinate: Coordinate,
    network: Network | None,
    algorithm: str | None = None,
    confidence: float | None = None,
) -> RegionNode:
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
        network_algorithm=algorithm if network is not None else None,
        network_confidence=confidence if network is not None else None,
        position3d=(coordinate.x, coordinate.y, coordinate.z),
        reference_space=coordinate.reference_space,
    )


def _region_node_query():
    """Consulta base compartida por `list_regions` y `list_regions_by_ids`
    (Fase 10, 31/08/2026, decisión 37): Region + Coordinate (join real,
    una región sin coordenada no se puede colocar en ninguna vista, así
    que se excluye en vez de mandarse con una posición inventada) + Network
    (LEFT JOIN opcional -- una región sin pertenencia calculada todavía se
    devuelve igual, marcada "unclassified" por `region_to_node`). Separada
    para que ninguna de las dos funciones reimplemente el mismo join."""
    return (
        select(
            Region,
            Coordinate,
            Network,
            RegionNetworkMembership.algorithm,
            RegionNetworkMembership.confidence,
        )
        .join(Coordinate, Coordinate.entity_id == Region.id)
        .outerjoin(RegionNetworkMembership, RegionNetworkMembership.region_id == Region.id)
        .outerjoin(Network, Network.id == RegionNetworkMembership.network_id)
    )


# Varias clasificaciones de red por región (decisión 73, 23/09/2026):
# desde que HCP-MMP1.0 tiene pertenencias a Cole-Anticevic Y a Yeo 7/17 y
# Power, el LEFT JOIN de `_region_node_query` devuelve una fila por
# pertenencia -- sin elegir, cada región saldría repetida. La fuente de
# red (`<fuente>` en `network.<especie>.<fuente>.<código>`, la misma que
# ya usa `region_to_node` para el slug) la elige quien llama; si no elige
# ninguna, se usa la clasificación ORIGINAL de cada atlas, para que ningún
# consumidor ya existente (frontend, MCP, renderizado) cambie de
# comportamiento sin pedirlo.
#
# BUG REAL PREEXISTENTE encontrado al hacer esto (comprobado contra una
# copia local del volcado real de la usuaria): el cerebelo izquierdo y
# el derecho del subcórtex del HCP tienen 10 pertenencias cada uno a
# Cole-Anticevic -- la distribución completa de la decisión 10
# (`algorithm = 'full_distribution'`), que nunca eligió una red única a
# propósito. Con la consulta anterior, `GET /regions` devolvía esas dos
# regiones 10 veces cada una (37 nodos para 19 regiones reales). Ahora
# salen una sola vez y, fieles a la decisión 10, sin red única
# ("unclassified"): una distribución no se convierte en una asignación.
DEFAULT_NETWORK_SOURCE_BY_ATLAS: dict[str, str] = {
    "atlas.human.hcp.mmp1_0": "cole-anticevic",
    "atlas.human.gordon333.cortex": "gordon333",
    "atlas.human.hcp.subcortex_grayordinates": "cole-anticevic",
}
FULL_DISTRIBUTION_ALGORITHM = "full_distribution"


def network_source(network: Network) -> str:
    return parse_id(network.id)["source"]


class MembershipRow(NamedTuple):
    network: Network
    algorithm: str | None
    confidence: float | None


def choose_network(
    region: Region,
    memberships: list[MembershipRow],
    requested_source: str | None,
) -> MembershipRow | None:
    """Traducción pura: de todas las pertenencias `(red, algoritmo, confianza)` de
    una región, la de la fuente pedida (o la fuente por defecto de su
    atlas). `None` ("unclassified") si no tiene ninguna en esa fuente --
    nunca la red de otra clasificación -- o si lo que tiene en esa fuente
    es una distribución completa (decisión 10), nunca convertida aquí en
    una red única. Dos asignaciones únicas en la misma fuente serían un
    error, nunca se elige una al azar."""
    source = requested_source or DEFAULT_NETWORK_SOURCE_BY_ATLAS.get(region.atlas_id)
    candidates = (
        memberships if source is None else [m for m in memberships if network_source(m.network) == source]
    )
    if not candidates:
        return None
    if all(m.algorithm == FULL_DISTRIBUTION_ALGORITHM for m in candidates) and len(candidates) > 1:
        return None
    if len(candidates) > 1:
        raise ValueError(
            f"La región {region.id} tiene {len(candidates)} pertenencias en la fuente de red "
            f"{source!r}: no se elige una arbitrariamente"
        )
    return candidates[0]


def _rows_to_nodes(rows, requested_source: str | None) -> list[RegionNode]:
    grouped: dict[str, tuple[Region, Coordinate, list[MembershipRow]]] = {}
    for region, coordinate, network, algorithm, confidence in rows:
        entry = grouped.setdefault(region.id, (region, coordinate, []))
        if network is not None:
            entry[2].append(MembershipRow(network, algorithm, confidence))
    nodes = []
    for region, coordinate, memberships in grouped.values():
        chosen = choose_network(region, memberships, requested_source)
        if chosen is None:
            nodes.append(region_to_node(region, coordinate, None))
        else:
            nodes.append(
                region_to_node(region, coordinate, chosen.network, chosen.algorithm, chosen.confidence)
            )
    return nodes


def list_regions(
    db: Session, atlas_id: str | None = None, network_source: str | None = None
) -> list[RegionNode]:
    """Regiones con coordenada registrada. `atlas_id` filtra a un atlas
    concreto; sin él, todas las regiones cargadas. `network_source`
    (decisión 73) elige la clasificación de red (p. ej. "yeo2011-7");
    sin él, la original de cada atlas."""
    query = _region_node_query()
    if atlas_id is not None:
        query = query.where(Region.atlas_id == atlas_id)
    rows = db.execute(query).all()
    return _rows_to_nodes(rows, network_source)


def list_regions_by_ids(db: Session, region_ids: list[str]) -> list[RegionNode]:
    """Regiones reales por id explícito, sin importar a qué atlas
    pertenezcan (Fase 10, 31/08/2026, decisión 37: usada por la
    comparación visual entre especies, donde el conjunto de regiones a
    dibujar no es "todo un atlas" sino un subconjunto concreto -- las
    que participan en alguna homología real con otra especie). Vacío si
    `region_ids` está vacío, sin consultar nada. Siempre con la
    clasificación de red por defecto de cada atlas."""
    if not region_ids:
        return []
    query = _region_node_query().where(Region.id.in_(region_ids))
    rows = db.execute(query).all()
    return _rows_to_nodes(rows, None)


class NetworkSourceSummary(BaseModel):
    source: str
    region_count: int
    is_default: bool


def list_network_sources(db: Session, atlas_id: str) -> list[NetworkSourceSummary]:
    """Clasificaciones de red REALMENTE cargadas para un atlas (decisión
    73): de dónde saca la interfaz su selector, sin ninguna lista escrita
    a mano. Cuenta regiones distintas con pertenencia en cada fuente."""
    rows = db.execute(
        select(RegionNetworkMembership.region_id, Network)
        .join(Network, Network.id == RegionNetworkMembership.network_id)
        .join(Region, Region.id == RegionNetworkMembership.region_id)
        .where(Region.atlas_id == atlas_id)
    ).all()
    regions_by_source: dict[str, set[str]] = {}
    for region_id, network in rows:
        regions_by_source.setdefault(network_source(network), set()).add(region_id)
    default = DEFAULT_NETWORK_SOURCE_BY_ATLAS.get(atlas_id)
    return [
        NetworkSourceSummary(source=source, region_count=len(ids), is_default=source == default)
        for source, ids in sorted(regions_by_source.items(), key=lambda kv: (kv[0] != default, kv[0]))
    ]
