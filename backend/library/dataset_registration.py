"""Generación de SQL para dar de alta un dataset en la tabla `datasets`
cuando no viene como un único archivo contenedor (un .zip), sino como
varios archivos sueltos — como el Brainnetome Atlas, a diferencia del
paquete HCP S1200 (un solo .zip con un checksum propio).

La tabla `datasets` solo tiene una columna `checksum_sha256` (un único
valor), así que para un dataset multi-archivo se usa un checksum
combinado: el sha256 de la concatenación, en orden alfabético de nombre
de archivo, de cada línea `"<nombre>:<sha256>\\n"` (con salto de línea
final incluido en la última línea también). Es una definición precisa y
reproducible con cualquier herramienta (no un hash "inventado"): quien
quiera verificar el dataset solo necesita repetir exactamente este
cálculo sobre los mismos archivos.
"""
from __future__ import annotations

import hashlib


def combined_checksum(file_hashes: dict[str, str]) -> str:
    """sha256 combinado de varios checksums de archivo, ver el docstring
    del módulo para la definición exacta."""
    lines = "".join(f"{name}:{digest}\n" for name, digest in sorted(file_hashes.items()))
    return hashlib.sha256(lines.encode("utf-8")).hexdigest()


def dataset_insert_sql(
    dataset_id: str,
    name: str,
    format_description: str,
    license_text: str,
    file_hashes: dict[str, str],
) -> str:
    """SQL de alta/actualización de un dataset multi-archivo en la tabla
    `datasets`, con su checksum combinado."""
    checksum = combined_checksum(file_hashes)

    def esc(value: str) -> str:
        return value.replace("'", "''")

    return (
        "INSERT INTO datasets (id, name, format, license, checksum_sha256, created_at)\n"
        "VALUES (\n"
        f"  '{esc(dataset_id)}', '{esc(name)}', '{esc(format_description)}',\n"
        f"  '{esc(license_text)}', '{checksum}', now()\n"
        ")\n"
        "ON CONFLICT (id) DO UPDATE SET\n"
        "  name = EXCLUDED.name,\n"
        "  format = EXCLUDED.format,\n"
        "  license = EXCLUDED.license,\n"
        "  checksum_sha256 = EXCLUDED.checksum_sha256;\n"
    )
