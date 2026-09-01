"""Modelos de las entidades científicas de la ontología (sección 6).

Estos modelos son deliberadamente mínimos en esta fase: definen la forma
de los datos y las claves foráneas, no la lógica científica. Los campos
se irán ampliando fase a fase (neuroimagen, conectividad, evolución,
neuropsicología) según lo previsto en el plan de desarrollo.
"""
from __future__ import annotations

from sqlalchemy import Float, ForeignKey, String, Text
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
    # Enlace estructurado a la publicación que define el atlas (sección 6):
    # antes solo vivía como texto suelto dentro de `name`
    # ("... (Glasser et al., 2016, Nature)"), sin poder consultarse ni
    # reutilizarse cuando la Fase 6 (literatura) empiece a enlazar más
    # evidencia al mismo estudio.
    study_id: Mapped[str | None] = mapped_column(ForeignKey("studies.id"), nullable=True)


class Region(Base, IdentifiedMixin):
    __tablename__ = "regions"
    species_id: Mapped[str] = mapped_column(ForeignKey("species.id"))
    atlas_id: Mapped[str | None] = mapped_column(ForeignKey("atlases.id"), nullable=True)
    synonyms: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    # Código corto para dibujar junto al nodo en las visualizaciones (p.
    # ej. "V1", "44", "L_SFG_7_1"), distinto de `name` (el nombre
    # completo que se muestra en el recuadro de detalle) -- migración
    # 0007. Nullable: las regiones cargadas antes de esa migración lo
    # tienen `NULL` hasta ejecutar el backfill correspondiente.
    abbreviation: Mapped[str | None] = mapped_column(String, nullable=True)
    # Hemisferio real de la region ("L"/"R"), migracion 0008 (petición
    # de la usuaria, 30/08/2026: panel "Hemisferios 2D" para ilustrar la
    # conectividad inter/intra-hemisferica). Nullable a proposito, por dos
    # motivos distintos: (a) las filas cargadas antes de esta migracion no
    # tienen valor todavia hasta el backfill, y (b) hay estructuras reales
    # legitimamente NO lateralizadas (p. ej. el tronco del encefalo en el
    # subcortex del HCP) -- NULL no es "todavia no se sabe" en ese caso,
    # es "no aplica", y ambos casos deben poder distinguirse de un valor
    # inventado. Se rellena siempre desde un campo ya calculado por la
    # propia ingesta de cada atlas (nunca se infiere del signo de la
    # coordenada x: un error de lateralidad silencioso seria mucho mas
    # grave que dejar el campo vacio).
    hemisphere: Mapped[str | None] = mapped_column(String, nullable=True)


class Tract(Base, IdentifiedMixin):
    __tablename__ = "tracts"
    species_id: Mapped[str] = mapped_column(ForeignKey("species.id"))
    # Mismo criterio que Region.abbreviation (migración 0007): el código
    # corto del tracto (p. ej. "AF", "CST"), ya calculado por la ingesta
    # de Yeh (2022) pero antes descartado tras construir el id.
    abbreviation: Mapped[str | None] = mapped_column(String, nullable=True)


class Network(Base, IdentifiedMixin):
    __tablename__ = "networks"


class Function(Base, IdentifiedMixin):
    __tablename__ = "functions"


class Study(Base, IdentifiedMixin):
    __tablename__ = "studies"
    doi: Mapped[str | None] = mapped_column(String, nullable=True)
    year: Mapped[int | None] = mapped_column(nullable=True)
    # Descomposición estructurada de la cita (migración 0009, inicio de
    # la Fase 6 -- Literatura, 30/08/2026): `name` sigue siendo la cita
    # completa ya usada hasta ahora (p. ej. "Glasser MF, Coalson TS...
    # Nature, 536(7615), 171-178", decisiones 6/9) -- estos tres campos
    # no la sustituyen, permiten consultar por separado (autor, revista,
    # resumen). Nullable: los 5 `Study` ya cargados quedan sin estos
    # datos hasta que alguien los verifique y los rellene explícitamente
    # (mismo patrón de backfill que `abbreviation`/`hemisphere` en
    # `Region`), nunca inventados aquí.
    authors: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    journal: Mapped[str | None] = mapped_column(String, nullable=True)
    abstract: Mapped[str | None] = mapped_column(Text, nullable=True)


class Evidence(Base, IdentifiedMixin):
    __tablename__ = "evidence"
    study_id: Mapped[str] = mapped_column(ForeignKey("studies.id"))
    kind: Mapped[str] = mapped_column(String, nullable=False)
    # correlation | association | lesion_evidence | causal_evidence |
    # experimental_evidence | clinical_evidence  (sección 12)
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Migración 0009 (inicio de la Fase 6 -- Literatura, 30/08/2026): la
    # tabla `evidence` no tenía ninguna fila real todavía, así que estos
    # dos campos se exigen desde el primer día (NOT NULL, sin backfill
    # pendiente) -- ver `backend/ingestion/literature/evidence.py` para
    # la disciplina completa (nunca aplicar a la base de datos real una
    # fila con extraction_method="ai_assisted" sin revisión humana antes,
    # mismo principio que la decisión 17).
    quote: Mapped[str] = mapped_column(Text, nullable=False)
    extraction_method: Mapped[str] = mapped_column(String, nullable=False)


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
    # Enlace estructurado a la publicación que distribuye el dataset
    # (mismo criterio ya aplicado a `Atlas.study_id`, 28/08/2026): antes
    # la cita solo podia vivir como texto suelto dentro de `name`, sin
    # poder consultarse ni reutilizarse desde la entidad `Study`.
    study_id: Mapped[str | None] = mapped_column(ForeignKey("studies.id"), nullable=True)


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
