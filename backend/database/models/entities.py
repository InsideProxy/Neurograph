"""Modelos de las entidades científicas de la ontología (sección 6).

Estos modelos son deliberadamente mínimos en esta fase: definen la forma
de los datos y las claves foráneas, no la lógica científica. Los campos
se irán ampliando fase a fase (neuroimagen, conectividad, evolución,
neuropsicología) según lo previsto en el plan de desarrollo.
"""
from __future__ import annotations

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

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
    # Enlace estructurado a la publicación que define el tracto
    # (migración 0012), mismo criterio que Atlas.study_id/Dataset.study_id
    # -- nullable y sin backfill: los 52 tractos de Yeh 2022 quedan NULL
    # hasta que alguien decida enlazarlos explícitamente.
    study_id: Mapped[str | None] = mapped_column(ForeignKey("studies.id"), nullable=True)


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
    # Enlace explícito a la entidad concreta del grafo que esta evidencia
    # respalda -- región, red o conexión (migración 0011, decisión de la
    # usuaria 02/09/2026: "nuevo enlace explícito", frente a dejarlo sin
    # enlazar o reutilizar `Connection.evidence_ids`/`Homology.evidence_ids`
    # como único mecanismo). Sin `ForeignKey` propia a propósito, mismo
    # criterio ya aplicado a `Connection.source_id`/`target_id` (decisión
    # 13): puede apuntar a `regions.id`, `networks.id` o `connections.id`
    # -- tres tablas distintas, ninguna FK de Postgres cubre eso sola. A
    # qué tabla pertenece un `entity_id` concreto se resuelve siempre
    # consultando cada tabla candidata (mismo patrón que
    # `Connection.source_id.in_(select(Tract.id))`), nunca asumiendo un
    # prefijo del identificador como si fuera parte del contrato de datos.
    # NOT NULL desde el primer día, sin backfill pendiente: la tabla
    # `evidence` sigue sin ninguna fila real todavía (decisión 20, Fase 6
    # sigue siendo solo esquema) -- misma oportunidad ya aprovechada en la
    # migración 0009 para `quote`/`extraction_method`.
    entity_id: Mapped[str] = mapped_column(String, nullable=False)
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


class TractGeometry(Base):
    """Geometría real (streamlines) de un tracto de un atlas de
    tractografía -- migración 0012. Vive en su propia tabla, 1:1 con
    `Tract` (no una columna más de `Tract`, ni filas de `Coordinate`:
    un tracto real trae miles de puntos, un volumen de datos distinto
    al resto del proyecto). `streamline_count_real` es el total real
    antes de cualquier reducción para hacerlo manejable en un navegador;
    `streamline_count_shown` es cuántas de esas streamlines reales trae
    de verdad `streamlines` -- nunca se reduce sin dejar constancia del
    total real, mismo principio que `MAX_RENDERED_CONNECTIONS` del
    frontend (decisión 42), pero registrado aquí en la propia base de
    datos, no solo en un comentario de código."""

    __tablename__ = "tract_geometries"

    tract_id: Mapped[str] = mapped_column(ForeignKey("tracts.id"), primary_key=True)
    streamlines: Mapped[list] = mapped_column(JSONB, nullable=False)
    streamline_count_real: Mapped[int] = mapped_column(nullable=False)
    streamline_count_shown: Mapped[int] = mapped_column(nullable=False)
    # Espacio de referencia real de estas streamlines (migración 0014,
    # decisión 63) -- mismo criterio que Coordinate.reference_space:
    # nunca se asume un único espacio posible, aunque hoy solo exista
    # un atlas de tractografía cargado (ORG-800FC-100HCP, valor real
    # "ORG_800FC_100HCP_groupwise", ver org_atlas.REFERENCE_SPACE).
    reference_space: Mapped[str] = mapped_column(String, nullable=False)


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


class Gene(Base, IdentifiedMixin):
    """Entidad científica real (migración 0013, esquema para expresión
    génica del Allen Human Brain Atlas -- decisión de la usuaria,
    02/09/2026: diseñar el esquema ahora, sin cargar ningún dato real
    todavía). Un gen existe independientemente del atlas de expresión
    que se use para mapearlo, por eso usa `IdentifiedMixin` como
    `Region`/`Tract`, nunca `ProvenanceMixin` a secas (esa es para datos
    DERIVADOS, ver `Expression` más abajo)."""

    __tablename__ = "genes"

    species_id: Mapped[str] = mapped_column(ForeignKey("species.id"), nullable=False)
    # Código corto real (p. ej. "SLC6A4"), tal como viene en Probes.csv
    # del propio AHBA -- siempre presente en los datos reales, a
    # diferencia de entrez_id.
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    entrez_id: Mapped[str | None] = mapped_column(String, nullable=True)


class Expression(Base, ProvenanceMixin):
    """Valor de expresión de un gen agregado sobre una región de un
    atlas ya existente (p. ej. HCP-MMP1.0) -- SÍ es un dato derivado
    (como `RegionNetworkMembership`, riesgo 4): `method` describe cómo
    se agregó (selección de sonda representativa, normalización, atlas
    de destino), nunca opcional. `donor_count` es igualmente obligatorio
    y nunca se oculta: la cobertura real del AHBA entre sus 6 donantes
    es muy desigual entre regiones (sección 24 -- nunca esconder un dato
    real), así que un valor con `donor_count=1` debe poder distinguirse
    de uno con `donor_count=6` por quien lo consuma."""

    __tablename__ = "expressions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"), nullable=False)
    gene_id: Mapped[str] = mapped_column(ForeignKey("genes.id"), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    method: Mapped[str] = mapped_column(String, nullable=False)
    donor_count: Mapped[int] = mapped_column(nullable=False)


class TractographyNode(Base):
    """Nodo del grafo híbrido tractografía+parcelación (migración 0015,
    decisión 66) -- petición de la usuaria, 09/09/2026: "una cuarta
    pestaña con nodos derivados de tractografía... se seleccionan nodos
    y el programa devuelve la tractografía que los une". Vive en su
    propia tabla, no en `regions`: comparte el patrón de identificador
    (`region.human.org2018_wmparc.<etiqueta>`, `backend/ontology/
    schema.py`) pero NUNCA se mezcla con las regiones de otros atlas
    (`regions`/`coordinates`, en espacio MNI152) -- exactamente el mismo
    motivo que ya separó `tract_geometries` de `coordinates` en la
    migración 0012: el espacio real de este atlas es propio
    (`org_atlas.REFERENCE_SPACE`), no MNI152, y mezclarlo sin verificar
    el registro real sería el mismo error que la decisión 49 ya evitó.

    `x`/`y`/`z` son el centroide real del vóxel de esa etiqueta en el
    wmparc (`100HCP-population-mean-wmparc.nii.gz`, ya verificado en el
    mismo espacio real que las streamlines, decisión 63), transformado
    con el affine real del NIfTI -- un dato DERIVADO (nunca publicado
    directamente por el atlas como coordenada), por eso `method` es
    obligatorio (riesgo 4, mismo criterio que `RegionNetworkMembership`/
    `Expression`). `wmparc_label` conserva el código entero real de la
    etiqueta de origen, sin tocar -- mismo principio que
    `Tract.abbreviation`."""

    __tablename__ = "tractography_nodes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    wmparc_label: Mapped[int] = mapped_column(nullable=False)
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)
    z: Mapped[float] = mapped_column(Float, nullable=False)
    reference_space: Mapped[str] = mapped_column(String, nullable=False)
    method: Mapped[str] = mapped_column(String, nullable=False)


class TractographyEdge(Base):
    """Arista real del grafo híbrido (migración 0015, decisión 66):
    conecta dos `TractographyNode` distintos (nunca el mismo dos veces
    -- un bucle no informa de conectividad ENTRE nodos, mismo criterio
    estructural que ya exige `compute_induced_connectivity`, decisión
    12) cuando al menos una streamline real de ORG-800FC-100HCP tiene
    sus DOS extremos reales dentro de esos dos nodos. Clave primaria
    compuesta (`node_a_id`, `node_b_id`, siempre `node_a_id < node_b_id`
    -- orden canónico, nunca una fila duplicada para el mismo par en el
    otro sentido), mismo estilo de clave natural ya usado en
    `TractGeometry` (`tract_id` como PK, sin id sintético aparte).

    `tract_codes` son los códigos reales (`org_atlas.TRACT_NAMES`) de los
    tractos que de verdad contribuyen streamlines reales a esta arista
    -- un mismo par de nodos puede recibir contribuciones de varios
    tractos a la vez (p. ej. un segmento del cuerpo calloso y el
    cíngulo), nunca se elige uno solo. `streamline_count_real`/`_shown`
    y `streamlines` siguen el mismo principio de transparencia que
    `TractGeometry` (decisión 49/62): el recuento real de streamlines
    que cumplen la condición nunca se oculta, aunque `streamlines` solo
    guarde una muestra determinista reducida para dibujar. `method`
    documenta cómo se asignó cada extremo a un nodo (dato DERIVADO,
    riesgo 4) -- ver `backend/ingestion/tractography/hybrid_nodes.py`."""

    __tablename__ = "tractography_edges"

    node_a_id: Mapped[str] = mapped_column(
        ForeignKey("tractography_nodes.id"), primary_key=True
    )
    node_b_id: Mapped[str] = mapped_column(
        ForeignKey("tractography_nodes.id"), primary_key=True
    )
    tract_codes: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    streamlines: Mapped[list] = mapped_column(JSONB, nullable=False)
    streamline_count_real: Mapped[int] = mapped_column(nullable=False)
    streamline_count_shown: Mapped[int] = mapped_column(nullable=False)
    reference_space: Mapped[str] = mapped_column(String, nullable=False)
    method: Mapped[str] = mapped_column(String, nullable=False)
