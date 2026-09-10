"""Afirmaciones de evidencia extraídas de un estudio (secciones 6, 12 y
24; inicio de la Fase 6 -- Literatura, 30/08/2026; enlace a entidad
concreta añadido 02/09/2026).

Cada `Evidence` vive siempre atada a la cita textual real que la respalda
(`quote`), a cómo se obtuvo (`extraction_method`, migración 0009) y ahora
también a la entidad concreta del grafo que respalda (`entity_id`,
migración 0011) -- nunca una afirmación sin las tres cosas: sin `quote`
no es verificable, sin saber si la transcribió una persona o la propuso
un pipeline de NLP/IA no se le puede aplicar el mismo criterio de
confianza que al resto del proyecto (sección 24, nunca mezclar lo
observado con lo inferido sin decirlo), y sin `entity_id` la evidencia
queda flotando sin conectarse a ninguna región/red/conexión real del
grafo -- justo el hueco que tenía el esquema hasta esta decisión. La
tabla `evidence` no tenía ninguna fila real todavía cuando se añadieron
estos tres campos, así que se exigen desde el primer día (`NOT NULL`, sin
backfill pendiente) -- ver migraciones 0009 y 0011.

`entity_id` no tiene `ForeignKey` propia: puede apuntar a `regions.id`,
`networks.id` o `connections.id` -- tres tablas distintas, ninguna FK de
Postgres cubre eso sola. Mismo criterio ya aplicado a
`Connection.source_id`/`target_id` (decisión 13): a qué tabla pertenece
un `entity_id` concreto se resuelve siempre consultando cada tabla
candidata, nunca asumiendo un prefijo del identificador como si fuera
parte del contrato de datos. Este módulo no resuelve ni valida esa
pertenencia -- es una función pura sin conexión a base de datos, mismo
patrón que `study_metadata.py` -- eso queda para la capa de servicio que
construya quien vaya a proponer evidencia real (todavía no existe
ninguna, ver más abajo).

Disciplina no negociable, mismo principio ya establecido en la decisión
17 (ingesta de atlas nuevos asistida por IA): una fila con
`extraction_method="ai_assisted"` es SIEMPRE una propuesta para revisión
humana. El SQL que genera `evidence_insert_sql` nunca se aplica a la base
de datos real solo porque una IA lo haya escrito -- exactamente igual que
el resto de scripts de este proyecto (revisión manual + `docker cp` +
`psql -f`, nunca una escritura automática). "ai_assisted" existe ya en
`EXTRACTION_METHODS` para no necesitar otra migración cuando llegue el
pipeline de extracción automática (dirección de diseño confirmada por la
usuaria el 30/08/2026, ver decisión 20 de docs/analisis-arquitectura.md),
pero ningún código de este repositorio lo escribe todavía -- esta tarea
sigue siendo solo el esquema (ahora con el enlace a entidad incluido),
sin cargar ni proponer ningún artículo real (decisión de la usuaria,
02/09/2026: construir primero solo la infraestructura).
"""
from __future__ import annotations

import json
from dataclasses import dataclass

# Sección 12: categorías de evidencia reconocidas -- nunca una categoría
# inventada fuera de esta lista.
EVIDENCE_KINDS = frozenset(
    {
        "correlation",
        "association",
        "lesion_evidence",
        "causal_evidence",
        "experimental_evidence",
        "clinical_evidence",
    }
)

# Cómo se obtuvo la afirmación -- ver el docstring del módulo para el
# porqué de incluir ya "ai_assisted" sin implementar todavía el pipeline
# que lo produciría.
EXTRACTION_METHODS = frozenset({"manual_transcription", "ai_assisted"})


@dataclass(frozen=True)
class EvidenceRecord:
    id: str
    name: str
    study_id: str
    kind: str
    # Región, red o conexión concreta del grafo que esta evidencia
    # respalda (migración 0011) -- el propio id real de esa fila
    # (`regions.id`, `networks.id` o `connections.id`), nunca un valor
    # inventado ni un texto libre. Este dataclass no comprueba a qué
    # tabla pertenece (no tiene conexión a base de datos, ver el
    # docstring del módulo): solo exige que no esté vacío, igual que
    # `study_id`.
    entity_id: str
    quote: str
    extraction_method: str
    detail: dict | None = None

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("EvidenceRecord.id no puede estar vacío")
        if not self.name:
            raise ValueError("EvidenceRecord.name no puede estar vacío")
        if not self.study_id:
            raise ValueError("EvidenceRecord.study_id no puede estar vacío")
        if not self.entity_id:
            raise ValueError(
                "EvidenceRecord.entity_id no puede estar vacío -- una evidencia sin la "
                "región/red/conexión concreta a la que respalda no está enlazada al grafo"
            )
        if self.kind not in EVIDENCE_KINDS:
            raise ValueError(
                f"kind {self.kind!r} no reconocido -- debe ser uno de {sorted(EVIDENCE_KINDS)}"
            )
        if not self.quote or not self.quote.strip():
            raise ValueError(
                "EvidenceRecord.quote no puede estar vacío -- una afirmación sin la cita "
                "textual que la respalda no es verificable (sección 24)"
            )
        if self.extraction_method not in EXTRACTION_METHODS:
            raise ValueError(
                f"extraction_method {self.extraction_method!r} no reconocido -- debe ser "
                f"uno de {sorted(EXTRACTION_METHODS)}"
            )


def _escape(value: str) -> str:
    return value.replace("'", "''")


def evidence_insert_sql(evidence: EvidenceRecord) -> str:
    """SQL de alta/actualización de una `Evidence` en la tabla
    `evidence`, mismo patrón `INSERT ... ON CONFLICT (id) DO UPDATE` que
    el resto de scripts de registro del proyecto. `detail` se serializa
    con `json.dumps` (nunca interpolando un dict directamente en el
    texto SQL) y se convierte explícitamente con `::jsonb`.
    """
    detail_sql = (
        "NULL"
        if evidence.detail is None
        else f"'{_escape(json.dumps(evidence.detail))}'::jsonb"
    )
    return (
        "INSERT INTO evidence (id, name, study_id, kind, entity_id, quote, extraction_method, detail) VALUES (\n"
        f"  '{_escape(evidence.id)}', '{_escape(evidence.name)}', '{_escape(evidence.study_id)}',\n"
        f"  '{_escape(evidence.kind)}', '{_escape(evidence.entity_id)}', '{_escape(evidence.quote)}',\n"
        f"  '{_escape(evidence.extraction_method)}', {detail_sql}\n"
        ")\n"
        "ON CONFLICT (id) DO UPDATE SET\n"
        "  name = EXCLUDED.name,\n"
        "  study_id = EXCLUDED.study_id,\n"
        "  kind = EXCLUDED.kind,\n"
        "  entity_id = EXCLUDED.entity_id,\n"
        "  quote = EXCLUDED.quote,\n"
        "  extraction_method = EXCLUDED.extraction_method,\n"
        "  detail = EXCLUDED.detail;\n"
    )
