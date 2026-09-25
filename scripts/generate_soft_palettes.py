#!/usr/bin/env python3
"""Genera la paleta «suave» de las redes: frontend/src/theme/softPalettes.ts.

Fase 2 del rediseño de la interfaz (docs/rediseno-interfaz-diseno.md, 4.3).
Los colores de NETWORK_COLORS (frontend/src/theme/networks.ts) son datos de
cada atlas y no se tocan: la paleta suave es una capa de presentación
calculada a partir de ellos, con una columna por tema (Grafito, Noche y
Claro). El tema Original no tiene columna propia: con «Suaves» usa la de
Grafito (frontend/src/theme/colors.ts).

Método, en OKLCH, por grupo de claves: una clasificación por prefijo
(«cole-anticevic.», «gordon333.»...), más un grupo con las claves de
demostración, que no llevan prefijo.

1. Tono: se conserva el de cada red.
2. Luminosidad: se reparte linealmente del mínimo al máximo del grupo sobre la
   banda del tema. Los acromáticos (C < 0,02) no cuentan para el mínimo y el
   máximo, y el resultado se recorta a la banda.
3. Croma: el original por 0,85 (CHROMA_RATIO), como mucho el tope del tema.
   Al ser proporcional, conserva las diferencias de croma entre las redes: un
   rojo saturado y un marrón apagado siguen siéndolo. Si el color no cabe en
   sRGB, se recorta el croma sin mover L ni el tono.
4. Separación: mientras dos redes del grupo queden a menos del objetivo,
   ΔE_OK 0,11 (DELTA_E_TARGET), se sube 0,01 la L de la más clara y se baja
   0,01 la de la más oscura, hasta 400 pasadas. La L sale de la banda como
   mucho el margen del tema por abajo y por arriba: en Grafito y Noche, 0,02
   por abajo, para no bajar de 3:1 con el panel, y 0,06 por arriba; en Claro,
   0,06 por cada lado.
   El objetivo no es una garantía: dentro de esos márgenes, algún grupo no
   llega. Yeo 17 se queda en 0,097 en Grafito y Noche, y sus propios colores
   del atlas distan solo 0,065. Lo que se garantiza es un suelo más bajo,
   ΔE_OK 0,095 (DELTA_E_FLOOR): lo exigen la comprobación y las pruebas.
5. «Sin clasificar» (unclassified): un gris con L = centro de la banda - 0,02.

El orden de las claves dentro de un grupo es parte del método: el paso 4
recorre los pares en el orden de NETWORK_COLORS, y otro orden puede dar otros
colores. Un grupo necesita al menos dos redes.

Parte del prototipo con el que se hizo la maqueta aprobada (palette.py, en
rediseno-referencias/generadores, fuera del repositorio), con sus dos
correcciones: la luminosidad se reparte sobre el mínimo y el máximo reales de
cada grupo, y el recorte del croma es una bisección de verdad (en el primer
prototipo, un croma que no cabía acababa en 0, un gris).

Los pasos 3 y 4 y las bandas son los de la paleta «intermedia», que eligió el
usuario al compararla con la primera. Aquella (la de la maqueta) apretaba la
luminosidad en bandas más estrechas (0,60-0,90 y, en Claro, 0,46-0,76),
recortaba el croma al tope, de 0,13 a 0,145, sin reducirlo en proporción, y
separaba a ΔE_OK 0,085: las redes que el atlas distingue sobre todo por el
croma o la luminosidad se confundían, como el rojo de Por defecto, el marrón
de Multimodal posterior y el naranja de Multimodal ventral en Cole-Anticevic.

Antes de escribir, muestra la comprobación de cada tema y grupo: distancia
mínima entre redes, contraste mínimo con el panel (también el del tema
Original, que con «Suaves» usa la columna de Grafito), deriva del tono y
luminosidad. Exige el suelo de la distancia, un contraste de 3:1 en Grafito,
Noche y Original, que la L no salga de la banda más que los márgenes del tema,
el tope del croma, el tono y que no se deshaga ninguna de las dos
correcciones: ninguna red con color queda casi gris, y la más oscura y la más
clara de cada grupo quedan en los extremos de la banda. Si un grupo no cumple
lo que piden las pruebas (frontend/src/theme/softPalettes.test.ts y
themeCss.test.ts), no escribe nada y sale con código 1.

La tabla lleva al final una copia de NETWORK_COLORS (SOFT_PALETTE_SOURCE): así,
`npm test` avisa si está desfasada, sin tener que ejecutar --check.

Solo usa la biblioteca estándar (Python 3.10 o posterior).

Uso, desde la raíz del repositorio:

    python3 scripts/generate_soft_palettes.py          # comprueba y escribe la tabla
    python3 scripts/generate_soft_palettes.py --check  # solo dice si la tabla está al día
"""
from __future__ import annotations

import argparse
import math
import re
import sys
from itertools import combinations
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
NETWORKS_TS = REPO_ROOT / "frontend" / "src" / "theme" / "networks.ts"
OUTPUT_TS = REPO_ROOT / "frontend" / "src" / "theme" / "softPalettes.ts"

UNCLASSIFIED = "unclassified"
DEMO_GROUP = "demostración"
ACHROMATIC = 0.02  # croma por debajo del cual un color es un gris
CHROMA_RATIO = 0.85  # paso 3: el croma suave es el original por esta razón
# Paso 4. La separación apunta al objetivo, pero no todos los grupos llegan
# dentro de los márgenes (Yeo 17 se queda en 0,097 en Grafito y Noche). La
# comprobación y las pruebas exigen el suelo, que es lo que se garantiza.
DELTA_E_TARGET = 0.11
DELTA_E_FLOOR = 0.095
MAX_PASSES = 400
# Cuánto puede meter la separación hacia dentro de la banda a la red con color
# más oscura o a la más clara de un grupo (la segunda corrección, en check()).
# Pasa cuando otra red empieza a su misma L y ya no puede salir más de la
# banda: en Power, el negro de Saliencia, acromático, empieza al pie con
# Hipocampo y, con 0,02 de margen por abajo en Grafito y Noche, Hipocampo sube
# 0,070. Si los acromáticos contaran para el mínimo y el máximo de L, Gordon
# 333 se apartaría 0,118 o más.
MAX_INWARD_SHIFT = 0.09
MAX_HUE_DRIFT = 3.0  # grados
HUE_CHROMA_FLOOR = 0.04  # por debajo, el redondeo a 8 bits ya mueve el tono
MIN_CONTRAST_DARK = 3.0  # con el panel, en Grafito, Noche y Original
L_TOLERANCE = 0.005  # el redondeo a #rrggbb mueve algo la L
C_TOLERANCE = 0.003  # y también el croma (hoy, como mucho 0,0011 sobre el tope)

# De cada tema: la banda de luminosidad (L de OKLCH), el tope del croma y los
# márgenes, (por abajo, por arriba): cuánto puede sacar la separación la L de
# la banda. En Grafito y Noche, el de abajo es pequeño para que ninguna red
# baje de 3:1 con el panel. El panel es el --panel-bg de index.css (spec 4.1);
# solo sirve para la comprobación.
THEMES = {
    "grafito": {"band": (0.56, 0.92), "cmax": 0.18, "margins": (0.02, 0.06), "panel": "#16191e"},
    "noche": {"band": (0.56, 0.92), "cmax": 0.19, "margins": (0.02, 0.06), "panel": "#111726"},
    "claro": {"band": (0.40, 0.72), "cmax": 0.18, "margins": (0.06, 0.06), "panel": "#ffffff"},
}
DARK_THEMES = ("grafito", "noche")
# El tema Original no tiene columna propia: con «Suaves» usa la de Grafito
# sobre su propio panel (--panel-bg de Original en index.css).
ORIGINAL_COLUMN, ORIGINAL_PANEL = "grafito", "#1d1e26"


# -- Color: sRGB, OKLab y OKLCH (Björn Ottosson) ------------------------------


def srgb_to_lin(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin_to_srgb(c: float) -> float:
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def hex_to_rgb(color: str) -> tuple[float, float, float]:
    h = color.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))


def rgb_to_hex(rgb) -> str:
    return "#" + "".join(f"{max(0, min(255, round(c * 255))):02x}" for c in rgb)


def rgb_to_oklab(rgb) -> tuple[float, float, float]:
    r, g, b = (srgb_to_lin(c) for c in rgb)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = (math.copysign(abs(v) ** (1 / 3), v) for v in (l, m, s))
    return (
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    )


def oklab_to_lin(lab) -> tuple[float, float, float]:
    L, a, b = lab
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_**3, m_**3, s_**3
    return (
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )


def to_oklch(color: str) -> tuple[float, float, float]:
    """(L, C, h en radianes)."""
    L, a, b = rgb_to_oklab(hex_to_rgb(color))
    return L, math.hypot(a, b), math.atan2(b, a)


def oklch_to_rgb_clamped(L: float, C: float, h: float) -> tuple[float, float, float]:
    """sRGB de (L, C, h). Si no cabe, recorta el croma por bisección, con el
    mismo L y el mismo tono: `lo` es siempre un croma que cabe y `hi`, uno
    que no cabe."""

    def inside(c: float) -> bool:
        lin = oklab_to_lin((L, c * math.cos(h), c * math.sin(h)))
        return all(-1e-6 <= v <= 1 + 1e-6 for v in lin)

    if inside(C):
        c = C
    else:
        lo, hi = 0.0, C
        for _ in range(40):
            mid = (lo + hi) / 2
            if inside(mid):
                lo = mid
            else:
                hi = mid
        c = lo
    lin = oklab_to_lin((L, c * math.cos(h), c * math.sin(h)))
    return tuple(lin_to_srgb(min(1, max(0, v))) for v in lin)


def relative_luminance(color: str) -> float:
    r, g, b = (srgb_to_lin(c) for c in hex_to_rgb(color))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(first: str, second: str) -> float:
    hi, lo = sorted((relative_luminance(first), relative_luminance(second)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def delta_e(first: str, second: str) -> float:
    return math.dist(rgb_to_oklab(hex_to_rgb(first)), rgb_to_oklab(hex_to_rgb(second)))


def hue_drift(original: str, soft: str) -> float:
    """Diferencia de tono en grados, entre -180 y 180."""
    diff = math.degrees(to_oklch(soft)[2] - to_oklch(original)[2])
    return (diff + 180) % 360 - 180


# -- Entrada: NETWORK_COLORS de networks.ts -----------------------------------

OBJECT = re.compile(r"export const NETWORK_COLORS: Record<string, string> = \{\n(.*?)\n\};", re.S)
ENTRY = re.compile(r'^\s*"?([\w.-]+)"?\s*:\s*"(#[0-9a-fA-F]{6})",?\s*(//.*)?$')


def read_network_colors(source: str) -> dict[str, str]:
    """NETWORK_COLORS, en el orden del archivo. Se para si una línea del
    objeto no es ni una entrada ni un comentario: así nunca se pierde una
    red en silencio."""
    match = OBJECT.search(source)
    if not match:
        sys.exit(f"No encuentro NETWORK_COLORS en {NETWORKS_TS}")
    colors: dict[str, str] = {}
    for line in match.group(1).split("\n"):
        if not line.strip() or line.strip().startswith("//"):
            continue
        entry = ENTRY.match(line)
        if not entry:
            sys.exit(f"Línea de NETWORK_COLORS que no entiendo: {line.strip()!r}")
        # El valor, tal cual: la tabla lo copia en SOFT_PALETTE_SOURCE, que
        # la prueba compara con NETWORK_COLORS.
        key, value = entry.group(1), entry.group(2)
        if key in colors:
            sys.exit(f"Clave repetida en NETWORK_COLORS: {key}")
        colors[key] = value
    if UNCLASSIFIED not in colors:
        sys.exit(f"NETWORK_COLORS no tiene la clave {UNCLASSIFIED!r}")
    return colors


def group_of(key: str) -> str:
    return key.split(".", 1)[0] if "." in key else DEMO_GROUP


def groups_of(colors: dict[str, str]) -> dict[str, dict[str, str]]:
    groups: dict[str, dict[str, str]] = {}
    for key, value in colors.items():
        if key != UNCLASSIFIED:
            groups.setdefault(group_of(key), {})[key] = value
    for group, members in groups.items():
        if len(members) < 2:
            sys.exit(f"El grupo «{group}» tiene una sola red ({', '.join(members)}): el método "
                     "reparte la luminosidad entre las redes de un grupo y necesita al menos dos.")
    return groups


# -- Método (spec 4.3) --------------------------------------------------------


def soften(colors: dict[str, str], theme: dict) -> dict[str, str]:
    """Paleta suave de un grupo en un tema: clave -> #rrggbb."""
    lo, hi = theme["band"]
    cmax = theme["cmax"]
    # Hasta dónde puede llevar la separación (paso 4) la L, fuera de la banda.
    margin_down, margin_up = theme["margins"]
    floor, ceiling = lo - margin_down, hi + margin_up
    lch = {key: to_oklch(value) for key, value in colors.items()}
    # 2) Luminosidad: del mínimo al máximo del grupo, sin los acromáticos.
    chromatic = [L for L, C, _ in lch.values() if C > ACHROMATIC] or [0.0, 1.0]
    smin, smax = min(chromatic), max(chromatic)
    span = max(smax - smin, 1e-6)
    lightness = {
        key: min(hi, max(lo, lo + (L - smin) / span * (hi - lo))) for key, (L, _, _) in lch.items()
    }
    keys = list(colors)

    def build() -> dict[str, str]:
        out = {}
        for key in keys:
            _, C0, h = lch[key]
            C = min(C0 * CHROMA_RATIO, cmax) if C0 > ACHROMATIC else 0.0  # 1) y 3)
            out[key] = rgb_to_hex(oklch_to_rgb_clamped(lightness[key], C, h))
        return out

    # 4) Separación, hacia el objetivo. Un grupo que no llega se queda como
    # esté tras MAX_PASSES pasadas; el suelo lo exige check().
    out = build()
    for _ in range(MAX_PASSES):
        moved = False
        for a, b in combinations(keys, 2):
            if delta_e(out[a], out[b]) < DELTA_E_TARGET:
                up, down = (a, b) if lightness[a] >= lightness[b] else (b, a)
                lightness[up] = min(ceiling, lightness[up] + 0.01)
                lightness[down] = max(floor, lightness[down] - 0.01)
                moved = True
        if not moved:
            break
        out = build()
    return out


def unclassified_gray(theme: dict) -> str:
    """5) «Sin clasificar»: gris con L = centro de la banda - 0,02."""
    lo, hi = theme["band"]
    return rgb_to_hex(oklch_to_rgb_clamped((lo + hi) / 2 - 0.02, 0.0, 0.0))


def build_palettes(colors: dict[str, str]) -> dict[str, dict[str, str]]:
    """Tema -> clave -> color suave, con las claves en el orden de NETWORK_COLORS."""
    palettes = {}
    for name, theme in THEMES.items():
        soft: dict[str, str] = {UNCLASSIFIED: unclassified_gray(theme)}
        for group in groups_of(colors).values():
            soft.update(soften(group, theme))
        palettes[name] = {key: soft[key] for key in colors}
    return palettes


# -- Salida: softPalettes.ts ---------------------------------------------------


def header() -> str:
    themes = "".join(
        f"//   {name}: banda {t['band'][0]:.2f}-{t['band'][1]:.2f},"
        f" margen {t['margins'][0]} y {t['margins'][1]}, tope {t['cmax']}.\n"
        for name, t in THEMES.items()
    )
    return (
        "// GENERADO por scripts/generate_soft_palettes.py a partir de NETWORK_COLORS\n"
        "// (theme/networks.ts), que se copia al final (SOFT_PALETTE_SOURCE). No se\n"
        "// edita a mano: si cambia NETWORK_COLORS (una clave, un color o el orden),\n"
        "// se vuelve a generar con `python3 scripts/generate_soft_palettes.py` desde\n"
        "// la raíz del repositorio; con `--check`, el script dice si está al día.\n"
        "//\n"
        "// Paleta «suave» de las redes (docs/rediseno-interfaz-diseno.md, 4.3): el\n"
        "// tono de cada red, con la luminosidad (L de OKLCH) en la banda del tema y\n"
        "// el croma reducido. El tema Original no tiene columna propia: con «Suaves»\n"
        "// usa la de Grafito (theme/colors.ts).\n"
        f"// Croma: el original por {CHROMA_RATIO}, como mucho el tope del tema.\n"
        "// Por tema: banda de L, margen de la separación fuera de la banda (por abajo\n"
        "// y por arriba) y tope del croma.\n"
        f"{themes}"
        f"// Separación: objetivo ΔE_OK {DELTA_E_TARGET}; suelo garantizado {DELTA_E_FLOOR}.\n"
    )


def render_ts(colors: dict[str, str], palettes: dict[str, dict[str, str]]) -> str:
    names = ", ".join(f'"{name}"' for name in THEMES)
    table_type = "Readonly<Record<SoftPaletteTheme, Readonly<Record<string, string>>>>"
    lines = [
        header(),
        f"export const SOFT_PALETTE_THEMES = [{names}] as const;",
        "export type SoftPaletteTheme = (typeof SOFT_PALETTE_THEMES)[number];",
        "",
        f"export const SOFT_NETWORK_COLORS: {table_type} = {{",
    ]
    for name, palette in palettes.items():
        lines.append(f"  {name}: {{")
        lines.extend(f'    "{key}": "{value}",' for key, value in palette.items())
        lines.append("  },")
    lines.append("};")
    # El origen de la tabla. --check ve si está al día, pero nada lo ejecuta;
    # con esta copia, lo ve también `npm test` (softPalettes.test.ts).
    lines += [
        "",
        "// NETWORK_COLORS del que sale la tabla, en su orden: el de las claves de un",
        "// grupo es parte del método. softPalettes.test.ts lo compara con el",
        "// NETWORK_COLORS actual, así que una tabla desfasada no pasa las pruebas.",
        "export const SOFT_PALETTE_SOURCE: readonly (readonly [string, string])[] = [",
    ]
    lines.extend(f'  ["{key}", "{value}"],' for key, value in colors.items())
    lines.append("];")
    return "\n".join(lines) + "\n"


# -- Comprobación --------------------------------------------------------------


def check(colors: dict[str, str], palettes: dict[str, dict[str, str]]) -> list[str]:
    """Muestra la comprobación de cada tema y grupo; devuelve los fallos."""
    failures: list[str] = []
    groups = groups_of(colors)
    print(f"NETWORK_COLORS: {len(colors)} claves, {len(groups)} grupos y «{UNCLASSIFIED}».")
    print(
        f"ΔE_OK mínimo: se exige el suelo, {DELTA_E_FLOOR}; con *, el grupo no llega al"
        f" objetivo de la separación, {DELTA_E_TARGET}, y no es un fallo."
    )
    for name, theme in THEMES.items():
        lo, hi = theme["band"]
        down, up = theme["margins"]
        low, high = lo - down - L_TOLERANCE, hi + up + L_TOLERANCE
        soft, panel = palettes[name], theme["panel"]
        print(
            f"\n{name}: banda {lo:.2f}-{hi:.2f} (al separar, {down} por abajo y {up} por arriba),"
            f" croma <= {theme['cmax']}, panel {panel}"
        )
        print(
            "  grupo              n  ΔE mín orig -> suave"
            "  contraste orig -> suave  Δh máx  L suave"
        )
        for group, members in groups.items():
            keys = list(members)
            pairs = list(combinations(keys, 2))
            de_orig = min(delta_e(colors[a], colors[b]) for a, b in pairs)
            de_soft, pa, pb = min((delta_e(soft[a], soft[b]), a, b) for a, b in pairs)
            cr_orig = min(contrast(colors[k], panel) for k in keys)
            cr_soft = min(contrast(soft[k], panel) for k in keys)
            chromatic = [k for k in keys if to_oklch(colors[k])[1] >= ACHROMATIC]
            # Las dos correcciones del prototipo. Primera: una red con color
            # no puede quedar casi gris, como con el primer recorte del croma,
            # que dejaba en 0 el que no cabía en sRGB. Por debajo de ese
            # croma no se mira el tono.
            grayed = [
                k
                for k in chromatic
                if to_oklch(colors[k])[1] >= HUE_CHROMA_FLOOR and to_oklch(soft[k])[1] < HUE_CHROMA_FLOOR
            ]
            drift = max(
                (abs(hue_drift(colors[k], soft[k])) for k in chromatic if to_oklch(soft[k])[1] >= HUE_CHROMA_FLOOR),
                default=0.0,
            )
            # Segunda (paso 2): la luminosidad se reparte sobre el mínimo y el
            # máximo de las redes con color, así que la más oscura queda al pie
            # de la banda y la más clara, arriba. La separación (paso 4) puede
            # sacarlas de la banda como mucho el margen del tema, y meterlas
            # hacia dentro como mucho MAX_INWARD_SHIFT.
            by_l = sorted(chromatic, key=lambda k: to_oklch(colors[k])[0])
            dark_off = to_oklch(soft[by_l[0]])[0] - lo if len(by_l) >= 2 else 0.0
            light_off = to_oklch(soft[by_l[-1]])[0] - hi if len(by_l) >= 2 else 0.0
            ends_ok = (
                -(down + L_TOLERANCE) <= dark_off <= MAX_INWARD_SHIFT
                and -MAX_INWARD_SHIFT <= light_off <= up + L_TOLERANCE
            )
            ls = [to_oklch(soft[k])[0] for k in keys]
            over = max(to_oklch(soft[k])[1] for k in keys) - theme["cmax"]
            below_target = "*" if de_soft < DELTA_E_TARGET else " "
            print(
                f"  {group:<16}{len(keys):>3}  {de_orig:.3f} -> {de_soft:.3f}{below_target}"
                f"{cr_orig:>17.2f} -> {cr_soft:.2f}{drift:>13.1f}°  {min(ls):.2f}-{max(ls):.2f}"
            )
            where = f"{name}/{group}"
            if de_soft < DELTA_E_FLOOR:
                failures.append(f"{where}: ΔE_OK {de_soft:.4f} < {DELTA_E_FLOOR} ({pa} y {pb})")
            if grayed:
                failures.append(f"{where}: quedan casi grises (C < {HUE_CHROMA_FLOOR}): {', '.join(grayed)}")
            if not ends_ok:
                failures.append(
                    f"{where}: {by_l[0]} y {by_l[-1]} no quedan en los extremos de la banda"
                    f" (a {dark_off:+.3f} del pie y a {light_off:+.3f} del techo)"
                )
            if drift > MAX_HUE_DRIFT:
                failures.append(f"{where}: el tono se mueve {drift:.1f}° (máximo 3°)")
            if min(ls) < low or max(ls) > high:
                failures.append(
                    f"{where}: L {min(ls):.3f}-{max(ls):.3f} fuera de la banda y sus márgenes"
                )
            if over > C_TOLERANCE:
                failures.append(f"{where}: el croma pasa {over:.4f} del tope ({theme['cmax']})")
            if name in DARK_THEMES and cr_soft < MIN_CONTRAST_DARK:
                failures.append(f"{where}: contraste {cr_soft:.2f} con el panel (mínimo 3)")
        print(f"  {UNCLASSIFIED}: {soft[UNCLASSIFIED]}")
        if name == ORIGINAL_COLUMN:
            cr = min(contrast(soft[k], ORIGINAL_PANEL) for k in colors if k != UNCLASSIFIED)
            print(f"  tema Original con «Suaves» (panel {ORIGINAL_PANEL}): contraste mín. {cr:.2f}")
            if cr < MIN_CONTRAST_DARK:
                failures.append(f"original: contraste {cr:.2f} con el panel (mínimo 3)")
    return failures


def main() -> None:
    # Salida en UTF-8 aunque la consola sea otra: en Windows, con cp1252,
    # «ΔE» y «Δh» darían un error (mismo arreglo que
    # scripts/register_cole_anticevic_networks.py).
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--check", action="store_true", help="solo dice si la tabla está al día")
    args = parser.parse_args()

    colors = read_network_colors(NETWORKS_TS.read_text(encoding="utf-8"))
    palettes = build_palettes(colors)
    text = render_ts(colors, palettes)
    output = OUTPUT_TS.relative_to(REPO_ROOT)
    if args.check:
        current = OUTPUT_TS.read_text(encoding="utf-8") if OUTPUT_TS.exists() else ""
        if current != text:
            sys.exit(f"{output} no está al día: vuelve a generarlo.")
        print(f"{output} está al día.")
        return
    failures = check(colors, palettes)
    if failures:
        print("\nNo cumple la comprobación; no se escribe nada:", *failures, sep="\n  ")
        sys.exit(1)
    OUTPUT_TS.write_text(text, encoding="utf-8", newline="\n")
    print(f"\nComprobación correcta. Escrito {output}.")


if __name__ == "__main__":
    main()
