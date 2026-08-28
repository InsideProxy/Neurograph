"""Modelos de las entidades científicas de la ontología (sección 6).

Estos modelos son deliberadamente mínimos en esta fase: definen la forma
de los datos y las claves foráneas, no la lógica científica. Los campos
se irán ampliando fase a fase (neuroimagen, conectividad, evolución,
neuropsicología) según lo previsto en el plan de desarrollo.
"""
from __future__ import annotations

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.models.base import Base, IdentifiedMixin, ProvenanceMixin


class Species(Base, IdentifiedMixin):
    __tablename__ = "species"
    scientific_name: Mapped[str] = mapped_column(String, nullable=False)


class Atlas(Base, IdentifiedMixin):
    __tablename__ = "atlases"
    species_id: Mapped[str] = mapped_column(ForeignKey("species.id"))
    version: Mapped[str | None] = mapped_column(String, nullable=True)


class Region(Base, IdentifiedMixin):
    __tablename__ = "regions"
    species_id: Mapped[str] = mapped_column(ForeignKey("species.id"))
    atlas_id: Mapped[str | None] = mapped_column(ForeignKey("atlases.id"), nullable=True)
    synonyms: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)


class Tract(Base, IdentifiedMixin):
    __tablename__ = "tracts"
    species_id: Mapped[str] = mapped_column(ForeignKey("species.id"))


class Network(Base, IdentifiedMixin):
    __tablename__ = "networks"


class Function(Base, IdentifiedMixin):
    __tablename__ = "functions"


class Study(Base, IdentifiedMixin):
    __tablename__ = "studies"
    doi: Mapped[str | None] = mapped_column(String, nullable=True)
    year: Mapped[int | None] = mapped_column(nullable=True)


class Evidence(Base, IdentifiedMixin):
    __tablename__ = "evidence"
    study_id: Mapped[str] = mapped_column(ForeignKey("studies.id"))
    kind: Mapped[str] = mapped_column(String, nullable=False)
    # correlation | association | lesion_evidence | causal_evidence |
    # experimental_evidence | clinical_evidence  (sección 12)
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class Connection(Base, ProvenanceMixin):
    """Una afirmación de conectividad entre dos entidades (sección 7-8).

    No mezclar tipos de conectividad: `type` distingue explícitamente
    structural / functional / effective. Tampoco se mezcla lo observado
    con lo inferido (sección 24): `evidence_level` es obligatorio y
    distingue direct / indirect / hypothetical, igual que en el resto de
    entidades derivadas del proyecto (riesgo 4) — nunca se asume "direct"
    por omisión.
    """

    __tablename__ = "connections"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    source_id: Mapped[str] = mapped_column(String, nullable=False)
    target_id: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)  # structural|functional|effective
    evidence_level: Mapped[str] = mapped_column(String, nullable=False)  # direct|indirect|hypothetical
    tract_id: Mapped[str | None] = mapped_column(ForeignKey("tracts.id"), nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    evidence_ids: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)


class Lesion(Base, IdentifiedMixin):
    __tablename__ = "lesions"


class Phenotype(Base, IdentifiedMixin):
    __tablename__ = "phenotypes"


class Homology(Base, ProvenanceMixin):
    """Relación evolutiva entre estructuras de especies distintas (sección 11).

    `status` distingue explícitamente confirmed_homology / candidate_homology /
    analogy / similarity / functional_correspondence / uncertain_correspondence:
    nunca se colapsan en una sola categoría de "relación".
    """

    __tablename__ = "homologies"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    source_id: Mapped[str] = mapped_column(String, nullable=False)
    target_id: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    method: Mapped[str | None] = mapped_column(String, nullable=True)
    evidence_ids: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)


class Coordinate(Base):
    __tablename__ = "coordinates"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    entity_id: Mapped[str] = mapped_column(String, nullable=False)
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)
    z: Mapped[float] = mapped_column(Float, nullable=False)
    # Sistema de referencia explícito: MNI152, Talairach, nativo-de-especie, etc.
    # (ver riesgo señalado en el análisis de arquitectura, sección 2.7)
    reference_space: Mapped[str] = mapped_column(String, nullable=False)


class Dataset(Base, IdentifiedMixin, ProvenanceMixin):
    __tablename__ = "datasets"
    format: Mapped[str] = mapped_column(String, nullable=False)
    license: Mapped[str | None] = mapped_column(String, nullable=True)
    checksum_sha256: Mapped[str | None] = mapped_column(String, nullable=True)


class RegionNetworkMembership(Base, ProvenanceMixin):
    """Pertenencia derivada de una región a una red funcional (p. ej. una
    de las 12 redes de Cole-Anticevic). No es una afirmación del atlas de
    origen, sino el resultado de aplicar un método explícito de agregación
    sobre una parcelación de vértices distinta — por eso `confidence` y
    `method` son obligatorios (riesgo 4 del análisis de arquitectura), no
    opcionales como en `Homology`: aquí siempre hay un método concreto que
    documentar, nunca una asignación "a ojo".
    """

    __tablename__ = "region_network_memberships"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"), nullable=False)
    network_id: Mapped[str] = mapped_column(ForeignKey("networks.id"), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    method: Mapped[str] = mapped_column(String, nullable=False)
