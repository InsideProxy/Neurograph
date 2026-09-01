"""Afirmaciones de evidencia extraídas de un estudio (secciones 6, 12 y
24; inicio de la Fase 6 -- Literatura, 30/08/2026).

Cada `Evidence` vive siempre atada a la cita textual real que la respalda
(`quote`) y a cómo se obtuvo (`extraction_method`, migración 0009) --
nunca una afirmación sin ninguna de las dos cosas: sin `quote` no es
verificable, y sin saber si la transcribió una persona o la propuso un
pipeline de NLP/IA no se le puede aplicar el mismo criterio de confianza
que al resto del proyecto (sección 24, nunca mezclar lo observado con lo
inferido sin decirlo). La tabla `evidence` no tenía ninguna fila real
todavía cuando se añadieron estas dos columnas, así que se exigen desde
el primer día (`NOT NULL`, sin backfill pendiente) -- ver migración 0009.

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
es solo el esquema, sin cargar ni proponer ningún artículo real.
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
        "INSERT INTO evidence (id, name, study_id, kind, quote, extraction_method, detail) VALUES (\n"
        f"  '{_escape(evidence.id)}', '{_escape(evidence.name)}', '{_escape(evidence.study_id)}',\n"
        f"  '{_escape(evidence.kind)}', '{_escape(evidence.quote)}', "
        f"'{_escape(evidence.extraction_method)}', {detail_sql}\n"
        ")\n"
        "ON CONFLICT (id) DO UPDATE SET\n"
        "  name = EXCLUDED.name,\n"
        "  study_id = EXCLUDED.study_id,\n"
        "  kind = EXCLUDED.kind,\n"
        "  quote = EXCLUDED.quote,\n"
        "  extraction_method = EXCLUDED.extraction_method,\n"
        "  detail = EXCLUDED.detail;\n"
    )
