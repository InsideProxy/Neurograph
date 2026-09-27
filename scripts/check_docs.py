"""Comprueba la coherencia de la documentación (CLAUDE.md y docs/).

Qué comprueba:

1. Cada fuente citada en los criterios (`docs/principios.md`,
   `docs/criterios-*.md`) existe en su log: un número en la §7 de
   `docs/analisis-arquitectura.md`, «riesgo N» en su §6, «§N.N» en sus
   encabezados, Dn en `docs/decisiones-diseno.md` y Hn en
   `docs/decisiones-herramientas.md`.
2. Cada ruta citada entre comillas invertidas en esos documentos y en los
   CLAUDE.md existe, o está ignorada por git (p. ej.
   `frontend/src-tauri/resources/`, que se rellena al empaquetar).
3. No quedan líneas de redirección («Movida a …») en `docs/`, ni «la
   usuaria» en los criterios ni en los CLAUDE.md.
4. El mapa del CLAUDE.md raíz nombra todos los `docs/*.md` y todas las
   carpetas con CLAUDE.md propio.

Uso (desde la raíz del repositorio):

    python3 scripts/check_docs.py

Sale con código 1 si encuentra algún problema. Solo usa la biblioteca
estándar y no toca ningún archivo.
"""
from __future__ import annotations

import re
import subprocess
import sys
from fnmatch import fnmatchcase
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG = ROOT / "docs" / "analisis-arquitectura.md"
LOG_D = ROOT / "docs" / "decisiones-diseno.md"
LOG_H = ROOT / "docs" / "decisiones-herramientas.md"

TOKEN_PATTERNS = {
    "decision": re.compile(r"^\d+$"),
    "rango": re.compile(r"^(\d+)-(\d+)$"),
    "D": re.compile(r"^D\d+[a-z]?$"),
    "H": re.compile(r"^H\d+[a-z]?$"),
    "riesgo": re.compile(r"^riesgo (\d+)$"),
    "seccion_log": re.compile(r"^§(\d+(?:\.\d+)?)$"),
    # «sección N» remite a la especificación maestra, que no está en el repo.
    "especificacion": re.compile(r"^sección \d+$"),
}


def _section(lines: list[str], heading_prefix: str) -> list[str]:
    """Líneas de una sección `## N.` hasta la siguiente sección `## `."""
    start = next(i for i, line in enumerate(lines) if line.startswith(heading_prefix))
    end = next(
        (i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")),
        len(lines),
    )
    return lines[start + 1 : end]


def known_sources() -> dict[str, set[str]]:
    log_lines = LOG.read_text(encoding="utf-8").split("\n")
    numbered = re.compile(r"^ ?(\d+)\. ")
    decisions = {m.group(1) for line in _section(log_lines, "## 7.") if (m := numbered.match(line))}
    risks = {m.group(1) for line in _section(log_lines, "## 6.") if (m := numbered.match(line))}
    sections = {
        m.group(1)
        for line in log_lines
        if (m := re.match(r"^#{2,3} (\d+(?:\.\d+)?)[.\s]", line))
    }
    d_entries: set[str] = set()
    for line in LOG_D.read_text(encoding="utf-8").split("\n"):
        if m := re.match(r"^## (D\d+)\.", line):
            d_entries.add(m.group(1))
        if m := re.match(r"^\*\*(D\d+[a-z])\b", line):
            d_entries.add(m.group(1))
    h_entries = {
        m.group(1)
        for line in LOG_H.read_text(encoding="utf-8").split("\n")
        if (m := re.match(r"^## (H\d+)\.", line))
    }
    return {"decision": decisions, "riesgo": risks, "seccion_log": sections, "D": d_entries, "H": h_entries}


def _missing(token: str, kind: str, sources: dict[str, set[str]]) -> list[str]:
    """Las fuentes de `token` que no existen en su log (vacío si existen todas)."""
    if kind == "especificacion":
        return []  # la especificación maestra no está en el repositorio
    if kind == "rango":
        a, b = map(int, TOKEN_PATTERNS["rango"].match(token).groups())
        return [str(n) for n in range(a, b + 1) if str(n) not in sources["decision"]]
    if kind == "riesgo":
        key = TOKEN_PATTERNS["riesgo"].match(token).group(1)
    elif kind == "seccion_log":
        key = token[1:]
    else:
        key = token
    return [] if key in sources[kind] else [token]


def check_citations(doc: Path, sources: dict[str, set[str]]) -> list[str]:
    problems: list[str] = []
    for lineno, line in enumerate(doc.read_text(encoding="utf-8").split("\n"), start=1):
        for group in re.findall(r"\(([^()]*)\)", line):
            tokens = [t.strip() for t in group.split(",")]
            kinds = []
            for token in tokens:
                kind = next((k for k, p in TOKEN_PATTERNS.items() if p.match(token)), None)
                if kind is None:
                    break
                kinds.append(kind)
            else:
                # Todo el paréntesis es una lista de fuentes.
                for token, kind in zip(tokens, kinds):
                    problems += [
                        f"{doc.relative_to(ROOT)}:{lineno}: fuente inexistente «{m}»"
                        for m in _missing(token, kind, sources)
                    ]
    return problems


def _is_ignored(path: Path, is_dir: bool) -> bool:
    # La barra final importa: una regla `carpeta/` de .gitignore solo se
    # aplica a directorios, y git no sabe que lo es si no existe.
    relative = path.relative_to(ROOT).as_posix() + ("/" if is_dir else "")
    result = subprocess.run(
        ["git", "check-ignore", "-q", relative], cwd=ROOT, capture_output=True, check=False
    )
    return result.returncode == 0


def check_paths(doc: Path) -> list[str]:
    """Rutas entre comillas invertidas, relativas a la raíz o a la carpeta del documento."""
    bases = [ROOT] if doc.parent in (ROOT, ROOT / "docs") else [ROOT, doc.parent]
    entries = {base: {p.name for p in base.iterdir()} for base in bases}
    problems: list[str] = []
    for lineno, line in enumerate(doc.read_text(encoding="utf-8").split("\n"), start=1):
        for token in re.findall(r"`([^`\s]+)`", line):
            if any(c in token for c in "()<>=\\{}"):
                continue
            first = token.split("/")[0]
            if not first:
                continue  # rutas de la API, p. ej. `/health`
            candidates = [
                base
                for base in bases
                if any(fnmatchcase(name, first) for name in entries[base])
            ]
            if not candidates:
                continue  # no es una ruta del repositorio (p. ej. `pgdata/`, `trust`)
            ok = False
            for base in candidates:
                if "*" in token:
                    ok = ok or any(base.glob(token.rstrip("/")))
                else:
                    target = base / token
                    ok = ok or target.exists() or _is_ignored(target, token.endswith("/"))
            if not ok:
                problems.append(f"{doc.relative_to(ROOT)}:{lineno}: ruta inexistente `{token}`")
    return problems


def check_forbidden(docs_dir: Path, criteria: list[Path], claude_files: list[Path]) -> list[str]:
    problems: list[str] = []
    redirect = re.compile(r"^\s*\d+[a-z]?\. Movida a ")
    for doc in sorted(docs_dir.glob("*.md")):
        for lineno, line in enumerate(doc.read_text(encoding="utf-8").split("\n"), start=1):
            if redirect.match(line):
                problems.append(f"{doc.relative_to(ROOT)}:{lineno}: línea de redirección")
    usuaria = re.compile(r"(?<!«)\b[Ll]a usuaria\b")
    for doc in criteria + claude_files:
        for lineno, line in enumerate(doc.read_text(encoding="utf-8").split("\n"), start=1):
            if usuaria.search(line):
                problems.append(f"{doc.relative_to(ROOT)}:{lineno}: «la usuaria» (el usuario es él)")
    return problems


def check_map(claude_root: Path, claude_files: list[Path]) -> list[str]:
    text = claude_root.read_text(encoding="utf-8")
    problems = [
        f"CLAUDE.md: el mapa no nombra `docs/{doc.name}`"
        for doc in sorted((ROOT / "docs").glob("*.md"))
        if f"`docs/{doc.name}`" not in text
    ]
    for claude in claude_files:
        if claude.parent != ROOT and f"`{claude.parent.relative_to(ROOT)}/`" not in text:
            problems.append(f"CLAUDE.md: no nombra la carpeta `{claude.parent.relative_to(ROOT)}/`, que tiene CLAUDE.md propio")
    return problems


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    criteria = [ROOT / "docs" / "principios.md", *sorted((ROOT / "docs").glob("criterios-*.md"))]
    tracked = subprocess.run(
        ["git", "ls-files", "CLAUDE.md", "*/CLAUDE.md"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.split()
    claude_files = sorted({ROOT / "CLAUDE.md", *(ROOT / p for p in tracked)})
    sources = known_sources()

    problems: list[str] = []
    for doc in criteria:
        problems += check_citations(doc, sources)
    for doc in criteria + claude_files:
        problems += check_paths(doc)
    problems += check_forbidden(ROOT / "docs", criteria, claude_files)
    problems += check_map(ROOT / "CLAUDE.md", claude_files)

    for problem in problems:
        print(problem)
    if problems:
        print(f"\n{len(problems)} problema(s) en la documentación.")
        return 1
    print(
        f"OK: {len(criteria)} documentos de criterios y {len(claude_files)} CLAUDE.md coherentes "
        f"({len(sources['decision'])} decisiones, {len(sources['D'])} entradas D, {len(sources['H'])} entradas H)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
