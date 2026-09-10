"""Capa de servicio de las tres imágenes reales de comparación entre
especies (Fase 10, sección 16/20-21, herramienta MCP `compare_species_
images` -- decisión de la usuaria, 31/08/2026: un connectograma circular
de homología entre las dos especies + dos esquemas interhemisféricos,
uno por especie, en vez de intentar dibujar ambas especies juntas en un
único cerebro 3D, que no tendría sentido porque cada especie tiene su
propia anatomía y su propio espacio de referencia (decisión 29).

Reutiliza íntegramente `species_service.compare_species` (nunca
reimplementa la consulta de homologías, el filtrado al par de especies
ni el resumen cuantitativo) y `regions_service.list_regions_by_ids`
(decisión 37).
"""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.api.services import regions_service, species_service
from backend.core.graph.from_connections import edges_from_connections
from backend.database.models.entities import Connection, Region
from backend.visualization import colors
from backend.visualization.hemisphere_render import render_hemisphere_schematic_image
from backend.visualization.species_render import render_homology_connectogram_image


@dataclass(frozen=True)
class SpeciesComparisonImages:
    homology_connectogram_png: bytes
    species_a_hemisphere_png: bytes
    species_b_hemisphere_png: bytes


def _all_region_ids_for_species(db: Session, species_id: str) -> list[str]:
    return sorted(db.execute(select(Region.id).where(Region.species_id == species_id)).scalars().all())


def _connection_edges(db: Session, region_ids: list[str], connection_type: str, min_weight: float):
    if not region_ids:
        return []
    rows = list(
        db.execute(
            select(Connection).where(
                Connection.type == connection_type,
                Connection.source_id.in_(region_ids),
                Connection.target_id.in_(region_ids),
            )
        ).scalars().all()
    )
    return edges_from_connections(rows, min_weight=min_weight)


def render_species_comparison_images(
    db: Session,
    species_a_id: str,
    species_b_id: str,
    connection_type: str = "structural",
    min_weight: float = 0.0,
) -> SpeciesComparisonImages:
    """Las tres imágenes reales de una comparación entre especies.
    Lanza `ValueError` (propagado desde `species_service.compare_species`)
    si alguna de las dos especies no existe, o si existen pero no
    comparten ninguna homología real -- en ese caso no hay nada honesto
    que dibujar en ninguna de las tres imágenes, nunca se generan vacías
    o con un aviso fabricado dentro del propio PNG."""
    comparison = species_service.compare_species(db, species_a_id, species_b_id)
    if not comparison.homologies:
        raise ValueError(
            f"{species_a_id!r} y {species_b_id!r} no comparten ninguna homología real: "
            "no hay nada que comparar visualmente entre ellas"
        )

    species_a_all_ids = _all_region_ids_for_species(db, species_a_id)
    species_b_all_ids = _all_region_ids_for_species(db, species_b_id)
    shared_region_ids = {
        region_id for match in comparison.homologies for region_id in (match.source.id, match.target.id)
    }
    homology_arcs = [(match.source.id, match.target.id) for match in comparison.homologies]

    connectogram_png = render_homology_connectogram_image(
        species_a_all_ids,
        species_b_all_ids,
        shared_region_ids,
        homology_arcs,
        species_a_label=comparison.species_a.scientific_name,
        species_b_label=comparison.species_b.scientific_name,
        title=f"Homología real -- {comparison.species_a.scientific_name} vs. {comparison.species_b.scientific_name}",
    )

    # Por construcción, cada fila de `comparison.homologies` aporta
    # exactamente una región a cada lado (el par ya está filtrado a
    # source/target de especies distintas dentro de este par concreto),
    # así que estos dos conjuntos nunca quedan vacíos si `comparison.
    # homologies` no lo está.
    shared_a_ids = sorted(
        {m.source.id if m.source.species_id == species_a_id else m.target.id for m in comparison.homologies}
    )
    shared_b_ids = sorted(
        {m.source.id if m.source.species_id == species_b_id else m.target.id for m in comparison.homologies}
    )

    nodes_a = regions_service.list_regions_by_ids(db, shared_a_ids)
    nodes_b = regions_service.list_regions_by_ids(db, shared_b_ids)
    edges_a = _connection_edges(db, shared_a_ids, connection_type, min_weight)
    edges_b = _connection_edges(db, shared_b_ids, connection_type, min_weight)

    # Un color por PAR homólogo real (no por especie): las dos regiones
    # de una misma fila `Homology` reciben el mismo color en las dos
    # imágenes, para que se pueda ver de un vistazo qué región de una
    # especie corresponde a cuál de la otra (decisión 38, 01/09/2026 --
    # ver docstring de `hemisphere_render.py`).
    pair_color_by_homology_id = colors.homology_pair_color_map([m.id for m in comparison.homologies])
    pair_color_by_region_id: dict[str, str] = {}
    for match in comparison.homologies:
        pair_color = pair_color_by_homology_id[match.id]
        pair_color_by_region_id[match.source.id] = pair_color
        pair_color_by_region_id[match.target.id] = pair_color

    hemisphere_a_png = render_hemisphere_schematic_image(
        nodes_a,
        edges_a,
        pair_color_by_region_id,
        title=f"Esquema interhemisférico real -- {comparison.species_a.scientific_name}",
    )
    hemisphere_b_png = render_hemisphere_schematic_image(
        nodes_b,
        edges_b,
        pair_color_by_region_id,
        title=f"Esquema interhemisférico real -- {comparison.species_b.scientific_name}",
    )

    return SpeciesComparisonImages(
        homology_connectogram_png=connectogram_png,
        species_a_hemisphere_png=hemisphere_a_png,
        species_b_hemisphere_png=hemisphere_b_png,
    )
