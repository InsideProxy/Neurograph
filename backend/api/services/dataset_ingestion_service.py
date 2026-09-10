"""Servicio de propuesta de ingesta por manifiesto (decisión 46): cierra
el ciclo manifiesto real -> lector real -> SQL de alta que la decisión 44
dejó preparado pero sin ningún flujo que lo recorriera de principio a fin
(decisión 45 corrigió, de paso, una regresión real que ese mismo catálogo
introdujo contra los seis `dataset.yaml` ya existentes en la biblioteca
de la usuaria -- ver esa decisión en `docs/analisis-arquitectura.md`).

Solo funciona para uno de los formatos YA soportados (con lector real
integrado, `backend/ingestion/datasets/formats.py::SUPPORTED_FORMATS`)
-- nunca para un formato nuevo, que sigue necesitando su propio
adaptador (ver `docs/protocolo-ingesta-ia.md`). El manifiesto debe traer
un mapa `files` (rol -> ruta relativa dentro de la propia carpeta del
dataset) que cubra todos los roles que ese formato necesita.

Factorizada aquí, en vez de vivir solo dentro de
`scripts/register_from_manifest.py`, para que el script de línea de
comandos y la herramienta MCP `propose_dataset_ingestion`
(`backend/mcp/server.py`) llamen exactamente al mismo código -- mismo
principio que ya sigue el resto de `backend/api/services/` frente a sus
routers HTTP y sus herramientas MCP correspondientes (`backend/mcp/
server.py`, docstring del módulo).

Deliberadamente SIN router HTTP propio en `backend/api/routers/`, a
diferencia de todos los demás servicios de este paquete: esta función
lee archivos arbitrarios del sistema de archivos local a partir de una
ruta que decide quien llama (`dataset_dir`) -- exponerla por HTTP abriría
una lectura de archivos local arbitraria a cualquier cliente de la API,
un riesgo que ninguna otra herramienta de NeuroGraph tiene hoy. Solo se
expone por MCP (mismo modelo de confianza que el resto de herramientas
MCP: quien las invoca ya tiene acceso al proceso del servidor en la
propia máquina donde vive la biblioteca, sección 23) y por el script de
consola, ambos ejecutados localmente por quien ya tiene acceso directo a
esos mismos archivos de todas formas.

Nunca toca la base de datos real: genera y devuelve el SQL de alta para
que una persona lo revise antes de aplicarlo (`docker cp` + `psql -f`, o
`scripts/apply_sql.ps1`, decisión 41) -- mismo principio que rige todos
los `scripts/register_*.py` desde el diseño original del proyecto
(decisión 17): ninguna automatización de este protocolo sustituye esa
revisión humana.
"""
from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel

from backend.ingestion.datasets.formats import (
    UNSUPPORTED_FORMAT_LABEL,
    get_format_adapter,
    read_dataset,
)
from backend.ingestion.datasets.manifest import read_dataset_manifest
from backend.ingestion.datasets.sql_generation import StudyInfo, generate_ingestion_sql


class DatasetIngestionProposal(BaseModel):
    """SQL de alta propuesto para un dataset real, sin aplicar todavía.
    `sql` puede ser largo para un atlas de cientos de regiones -- lo
    guarda íntegro quien recibe la respuesta MCP en vivo; la auditoría
    (`backend/mcp/audit.py`) solo registra su longitud real, nunca el
    texto completo (mismo criterio que ya aplica a los bytes de una
    imagen)."""

    dataset_id: str
    dataset_dir: str
    format: str
    region_count: int
    coordinate_count: int
    network_count: int
    membership_count: int
    sql: str


def propose_dataset_ingestion(
    dataset_dir: str,
    *,
    study: StudyInfo | None = None,
) -> DatasetIngestionProposal:
    """Lee el `dataset.yaml` real de `dataset_dir`, despacha al lector
    real de su formato y devuelve el SQL de alta propuesto -- nunca
    aplicado, nunca conectado a ninguna base de datos. Lanza `ValueError`
    con un mensaje accionable (nunca en silencio) si: no hay manifiesto,
    su formato es `UNSUPPORTED_FORMAT_LABEL` (sin lector todavía), le
    faltan roles de archivo en `files`, o alguno de esos archivos no
    existe de verdad en disco."""
    path = Path(dataset_dir)
    manifest = read_dataset_manifest(path)
    if manifest is None:
        raise ValueError(f"No hay dataset.yaml en {dataset_dir!r}")

    if manifest.format == UNSUPPORTED_FORMAT_LABEL:
        raise ValueError(
            f"El manifiesto {manifest.id!r} tiene format={UNSUPPORTED_FORMAT_LABEL!r} -- "
            "este dataset no tiene lector automático todavía. Hace falta escribir y "
            "verificar su propio adaptador antes de poder proponer SQL con esta "
            "herramienta (ver docs/protocolo-ingesta-ia.md)."
        )

    adapter = get_format_adapter(manifest.format)
    manifest_files = manifest.files or {}
    missing_roles = [role for role in adapter.required_files if role not in manifest_files]
    if missing_roles:
        raise ValueError(
            f"El manifiesto {manifest.id!r} (format={manifest.format!r}) no declara "
            f"todos los archivos que este formato necesita. Roles requeridos: "
            f"{adapter.required_files}. Faltan en `files`: {missing_roles}."
        )

    paths = {role: path / relative for role, relative in manifest_files.items()}
    missing_files = [str(p) for p in paths.values() if not p.exists()]
    if missing_files:
        raise ValueError(
            "Los siguientes archivos declarados en el manifiesto no existen en disco: "
            f"{missing_files}"
        )

    result = read_dataset(manifest.format, paths)
    sql = generate_ingestion_sql(
        manifest.format,
        result,
        study=study,
        header_comment=(
            f"Propuesto a partir de {dataset_dir} (manifiesto {manifest.id!r}, "
            f"formato {manifest.format!r})."
        ),
    )
    return DatasetIngestionProposal(
        dataset_id=manifest.id,
        dataset_dir=dataset_dir,
        format=manifest.format,
        region_count=len(result.regions),
        coordinate_count=len(result.coordinates),
        network_count=len(result.networks),
        membership_count=len(result.memberships),
        sql=sql,
    )
