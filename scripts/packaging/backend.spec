# -*- mode: python ; coding: utf-8 -*-
# .spec de PyInstaller para el backend de NeuroGraph, modo "one-folder"
# (decisión 54 de docs/analisis-arquitectura.md: un "one-file" re-extrae
# numpy/scipy/pandas/nibabel/matplotlib/scikit-learn a una carpeta
# temporal EN CADA arranque -- varios segundos de espera cada vez que se
# abra el programa. "one-folder" paga ese coste una sola vez, al
# instalar, no en cada apertura).
#
# Construir desde la raíz del repositorio (E:\Neurograph), en un entorno
# Windows real con las dependencias del proyecto ya instaladas
# (pip install -e ".[dev]") más pyinstaller (pip install pyinstaller):
#
#     pyinstaller scripts\packaging\backend.spec --distpath dist\backend --clean
#
# El resultado real queda en dist\backend\neurograph-backend\ -- esa
# carpeta completa (no solo el .exe) es la que se copia a
# frontend\src-tauri\resources\backend\ (ver decisión 54 y
# frontend/src-tauri/resources/README.md).
#
# ADVERTENCIA HONESTA, no una promesa de que esto funciona sin ajustes:
# ninguna sesión de este proyecto ha podido construir esto contra un
# Windows real todavía -- el análisis estático de PyInstaller sigue las
# importaciones reales desde run_backend.py, lo que cubre bien el código
# propio del proyecto (importa `app` directamente, no una cadena
# "módulo:atributo", precisamente para que PyInstaller pueda seguirla).
# uvicorn, en cambio, elige algunas piezas en tiempo de ejecución según lo
# que hay instalado (protocolo HTTP, bucle de eventos) -- la lista de
# hiddenimports de abajo es un punto de partida razonable, no una lista
# verificada. El primer intento real probablemente falle con un
# 'ModuleNotFoundError' que señale exactamente qué falta: se añade ese
# nombre exacto a hiddenimports y se reintenta -- documentando el
# hallazgo real como una decisión nueva, igual que el resto de este
# proyecto (nunca asumir que ya funciona sin haberlo visto funcionar).
#
# PRIMER ERROR REAL ENCONTRADO (primer intento real, 06/09/2026, ver
# decisión 56 de docs/analisis-arquitectura.md): PyInstaller abortó con
# "attempt to collect multiple Qt bindings packages: ... 'PySide6' ...
# 'PyQt5' ...". El entorno de Python de la usuaria tiene instaladas AMBAS
# bibliotecas de interfaz gráfica (con toda probabilidad de Anaconda o de
# otra herramienta ajena a este proyecto, no de sus dependencias
# declaradas) -- probablemente arrastradas por el hook de matplotlib, que
# intenta detectar qué backends de interfaz gráfica hay disponibles.
# Este backend nunca abre ninguna ventana propia (la interfaz real es la
# de Tauri) y sirve la API en modo servidor -- ninguna interfaz gráfica de
# escritorio hace falta aquí. Corregido excluyendo explícitamente las
# cuatro variantes de Qt más comunes, para no arrastrar ninguna por
# accidente sea cual sea el entorno donde se construya.

from pathlib import Path

# PyInstaller ejecuta este .spec sin un __file__ real utilizable -- por
# eso se invoca desde la raíz del repositorio (ver el comando de arriba)
# y se usa el directorio de trabajo, nunca una ruta relativa al propio
# archivo .spec.
REPO_ROOT = Path.cwd()
ENTRYPOINT = REPO_ROOT / "scripts" / "packaging" / "run_backend.py"

hiddenimports = [
    # uvicorn elige el protocolo HTTP/websockets y el bucle de eventos en
    # tiempo de ejecución según lo que detecte instalado -- el análisis
    # estático de PyInstaller no sigue esa elección dinámica.
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.protocols.websockets.wsproto_impl",
    "uvicorn.lifespan.on",
    "uvicorn.loops.auto",
    "uvicorn.logging",
    # psycopg[binary]: el driver C se carga como paquete compilado, no
    # como una importación Python normal -- puede no detectarse solo.
    "psycopg_binary",
]

a = Analysis(
    [str(ENTRYPOINT)],
    pathex=[str(REPO_ROOT)],
    binaries=[],
    datas=[],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # dipy es una dependencia OPCIONAL del proyecto (pyproject.toml,
        # extra "tractography") -- no hace falta para servir la API.
        # Arrastrarla por defecto solo porque algo la importa de forma
        # perezosa en alguna parte inflaría el paquete sin necesidad; si
        # algún día el ejecutable necesita tractografía en vivo, se
        # quita de aquí explícitamente, nunca por arrastre implícito.
        "dipy",
        # Ninguna interfaz gráfica de escritorio hace falta en este
        # backend (ver la nota de la cabecera sobre el primer error real,
        # decisión 56) -- se excluyen las cuatro variantes de Qt que
        # PyInstaller podría intentar recoger, sea cual sea el entorno de
        # Python donde se construya.
        "PyQt5",
        "PyQt6",
        "PySide2",
        "PySide6",
        # SEGUNDO HALLAZGO DEL MISMO TIPO (decisión 70, 10/09/2026): el
        # primer intento real de `npm run tauri build` falló al generar
        # el instalador NSIS porque el paquete del backend arrastraba
        # entera la extensión de Jupyter Lab "Anaconda Assistant"
        # (share/jupyter/labextensions/...), con nombres de archivo
        # minificados tan largos que superan el límite de ruta de
        # Windows (260 caracteres) y rompen `makensis`. Ninguna
        # dependencia declarada en pyproject.toml usa Jupyter -- viene
        # del propio entorno de Python usado para construir (con toda
        # probabilidad de base Anaconda, mismo origen que el hallazgo de
        # Qt de la decisión 56), nunca de este proyecto. Se excluye el
        # árbol completo relacionado con Jupyter, no solo el archivo
        # puntual que hizo fallar la construcción.
        "jupyter",
        "jupyter_core",
        "jupyter_client",
        "jupyter_server",
        "jupyterlab",
        "jupyterlab_server",
        "notebook",
        "nbclassic",
        "nbconvert",
        "nbformat",
        "ipykernel",
        "ipywidgets",
        "IPython",
        "qtconsole",
    ],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="neurograph-backend",
    debug=False,
    strip=False,
    upx=False,
    # Subsistema de consola a propósito: backend.rs redirige stdout/stderr
    # a logs/backend.log de todas formas, y con la consola activa esa
    # redirección se comporta igual que cualquier proceso de línea de
    # comandos normal. El posible parpadeo de una ventana de consola al
    # arrancar se evita desde el lado de Rust (CREATE_NO_WINDOW en
    # backend.rs), no aquí.
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="neurograph-backend",
)
