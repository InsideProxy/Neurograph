"""Pruebas de `backend/mcp/audit.py` que no requieren una base de datos
real: el resumen del resultado (`_summarize_result`) y la captura de
argumentos + éxito/error del decorador `audited_tool`, sustituyendo
`_log_call` por un registrador falso -- mismo criterio que el resto del
proyecto (las funciones puras se prueban directamente; lo que sí toca la
base de datos, aquí `_log_call`, no se prueba contra una base de datos
real, se sustituye)."""
from __future__ import annotations

from pydantic import BaseModel

from backend.mcp import audit


class _FakeResult(BaseModel):
    id: str
    label: str


def test_summarize_result_of_a_list_keeps_the_real_count_and_a_preview_of_real_ids():
    items = [_FakeResult(id=f"region.{i}", label=f"Región {i}") for i in range(8)]

    summary = audit._summarize_result(items)

    assert summary["count"] == 8
    assert len(summary["preview"]) == 5
    assert summary["preview"][0] == "region.0"


def test_summarize_result_of_a_single_model_keeps_its_real_fields():
    result = _FakeResult(id="region.v1", label="V1")

    summary = audit._summarize_result(result)

    assert summary == {"id": "region.v1", "label": "V1"}


def test_summarize_result_of_a_plain_value_is_not_fabricated():
    summary = audit._summarize_result(None)

    assert summary == {"value": None}


def test_summarize_result_of_an_image_keeps_only_its_mime_type_and_size():
    # render_network/render_brain devuelven un mcp.server.fastmcp.Image
    # real; se sustituye aquí por un objeto mínimo con el mismo método
    # `to_image_content()` para no depender del SDK de mcp en esta
    # prueba (mismo criterio que el resto de pruebas puras del proyecto).
    class _FakeImageContent:
        mimeType = "image/png"
        data = "QQ=="  # base64 de 2 bytes reales

    class _FakeImage:
        def to_image_content(self):
            return _FakeImageContent()

    summary = audit._summarize_result(_FakeImage())

    assert summary == {"type": "image", "mime_type": "image/png", "base64_length": 4}


def test_summarize_result_of_a_list_of_images_summarizes_each_one():
    # compare_species_images devuelve las tres imágenes reales a la vez
    # en una lista -- cada una debe resumirse igual que una imagen suelta,
    # nunca con sus bytes crudos dentro del recuento/preview.
    class _FakeImageContent:
        mimeType = "image/png"
        data = "QQ=="

    class _FakeImage:
        def to_image_content(self):
            return _FakeImageContent()

    summary = audit._summarize_result([_FakeImage(), _FakeImage(), _FakeImage()])

    assert summary["count"] == 3
    assert summary["preview"] == [{"type": "image", "mime_type": "image/png", "base64_length": 4}] * 3


def test_summarize_result_with_a_sql_field_keeps_only_its_real_length():
    # propose_dataset_ingestion (decisión 46) puede devolver un SQL de
    # varias decenas de miles de caracteres para un atlas grande -- se
    # guarda su longitud real, nunca el texto completo, mismo criterio
    # que ya aplica a los bytes de una imagen.
    class _FakeProposal(BaseModel):
        dataset_id: str
        sql: str

    summary = audit._summarize_result(_FakeProposal(dataset_id="dataset.x", sql="INSERT INTO x VALUES (1);"))

    assert summary["dataset_id"] == "dataset.x"
    assert summary["sql"] is None
    assert summary["sql_length"] == len("INSERT INTO x VALUES (1);")


def test_audited_tool_logs_the_real_arguments_and_result_on_success(monkeypatch):
    calls = []
    monkeypatch.setattr(audit, "_log_call", lambda *a: calls.append(a))

    @audit.audited_tool("search_region")
    def fake_search_region(atlas_id: str | None = None) -> list[_FakeResult]:
        return [_FakeResult(id="region.v1", label="V1")]

    result = fake_search_region(atlas_id="atlas.human.hcp.mmp1_0")

    assert len(result) == 1
    assert len(calls) == 1
    tool_name, arguments, status, result_summary, error, duration_ms = calls[0]
    assert tool_name == "search_region"
    assert arguments == {"atlas_id": "atlas.human.hcp.mmp1_0"}
    assert status == "ok"
    assert result_summary["count"] == 1
    assert error is None
    assert duration_ms >= 0


def test_audited_tool_logs_the_real_error_and_reraises_it(monkeypatch):
    calls = []
    monkeypatch.setattr(audit, "_log_call", lambda *a: calls.append(a))

    @audit.audited_tool("get_connectivity")
    def fake_get_connectivity(region_ids: list[str]) -> list[_FakeResult]:
        raise RuntimeError("fallo real de conexión a la base de datos")

    try:
        fake_get_connectivity(region_ids=["A"])
        assert False, "debía relanzar la excepción"
    except RuntimeError:
        pass

    assert len(calls) == 1
    tool_name, arguments, status, result_summary, error, duration_ms = calls[0]
    assert status == "error"
    assert result_summary is None
    assert error == "fallo real de conexión a la base de datos"
    assert arguments == {"region_ids": ["A"]}
