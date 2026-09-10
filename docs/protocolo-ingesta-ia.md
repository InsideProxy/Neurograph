# Protocolo de ingesta de formatos nuevos asistido por IA

Este documento formaliza, como checklist reutilizable, el proceso que ya se ha seguido a mano en cada una de las ingestas reales del proyecto (decisiones 2-10, 26, 28-29, 40-41 de `docs/analisis-arquitectura.md`). No introduce ningún criterio nuevo: es la misma disciplina de siempre, escrita una vez para que la IA de la usuaria (yo, otra sesión, o cualquier otro asistente) la siga sin tener que redescubrirla en cada dataset.

**Cuándo se usa este protocolo**: solo cuando el formato del dataset NO es ninguna de las etiquetas ya cerradas de `backend/ingestion/datasets/formats.py::SUPPORTED_FORMATS`. Si el formato ya tiene lector real, no hace falta nada de esto — basta con un `dataset.yaml` con `format=<etiqueta ya soportada>` y su mapa `files`, despachado con `scripts/register_from_manifest.py` o la herramienta MCP `propose_dataset_ingestion` (decisión 46). Este protocolo es, precisamente, el paso previo que hace falta la PRIMERA vez que aparece un formato genuinamente nuevo.

**Regla de fondo, la misma en todo el proyecto desde la decisión 17**: ninguna automatización de este protocolo sustituye la revisión humana antes de aplicar SQL a la base de datos real. Cada paso de abajo termina en SQL propuesto para revisión, nunca en una escritura directa contra Postgres.

## 1. Examinar el archivo real antes de escribir ningún código

Nunca se adivina la estructura de un archivo por su extensión, su nombre, o lo que "suele" traer un formato con ese nombre. Se abre el archivo real con la herramienta correcta (`nibabel` para NIfTI/CIFTI/GIFTI, `openpyxl`/`pandas` para Excel, `pdfplumber` para tablas dentro de un PDF, lectura directa para CSV/YAML/JSON) y se inspecciona su forma real: dimensiones, ejes, tablas de etiquetas, encabezados de columna, rango real de valores. Precedente: la decisión 25 verificó con `nibabel` que dos volúmenes compartían la misma rejilla de vóxeles en vez de asumirlo; la decisión 41 recalculó en Python la distribución real de pesos de un archivo antes de decidir nada sobre él.

## 2. Verificar contra la fuente primaria, nunca de memoria

Toda convención que el archivo por sí solo no demuestra (espacio de referencia, qué especie/atlas real corresponde, unidades, qué representa cada columna) se verifica contra la publicación original o la documentación oficial del propio repositorio — nunca se asume por el nombre de un archivo o carpeta. Precedente: la decisión 6/28 verificó un espacio de referencia (`INIA19`) contra la publicación real de Rohlfing et al. (2012) en vez de asumirlo por el nombre del `.nii` que traía el paquete de descarga; la decisión 23 (dataset.yaml de `mni152_fsl_2mm`) descartó una plantilla ya disponible por no ser la rejilla real que otros módulos ya declaraban, verificado con `nibabel` antes de descargar nada.

## 3. Escribir el módulo lector

Un módulo nuevo bajo el subpaquete que corresponda (`backend/ingestion/neuroimaging/` para atlas de regiones/coordenadas, `backend/ingestion/connectivity/` para conectividad, `backend/ingestion/evolution/` para homologías entre especies, `backend/ingestion/literature/` para metadatos de estudios), con:

- Dataclasses de región/coordenada/red/pertenencia cuyos nombres de atributo coincidan exactamente con las columnas reales del esquema (`id`, `name`, `abbreviation`, `hemisphere` / `id`, `entity_id`, `x`, `y`, `z`, `reference_space`, ...) — es lo que permite que `backend/ingestion/datasets/sql_generation.py` genere el SQL con `getattr` genérico, sin un caso especial por formato (ver el docstring de ese módulo).
- Constantes reales `SPECIES_ID`/`SPECIES_NAME`/`SPECIES_SCIENTIFIC_NAME`/`ATLAS_ID`/`ATLAS_NAME`/`ATLAS_VERSION` (esta última solo si el atlas de verdad declara una versión) — nunca un valor de relleno, son las que después reexporta `AtlasMetadata` en `formats.py` (decisión 45).
- Una función que lanza `ValueError` explícito ante cualquier forma inesperada del archivo (una tabla con menos columnas de las que hace falta, una etiqueta sin correspondencia conocida, un archivo vacío) — nunca fallar en silencio, ni interpolar, ni inventar un valor que falta. Precedente: `read_dataset` (`formats.py`) ya sigue este mismo criterio al despachar.

## 4. Nunca aplicar un umbral arbitrario al cargar (sección 24)

Se carga el dato completo tal como lo reporta la fuente, incluidos los pares con peso 0 o poca confianza — es la interfaz (o, para análisis matemático, un parámetro explícito de la consulta) quien decide después qué mostrar, nunca la propia ingesta. Precedente: la decisión 9 cargó las 9360 combinaciones reales de Yeh 2022 sin umbral, incluido el 75,3% con probabilidad exactamente 0.0; la decisión 10 registró la distribución completa de redes del cerebelo sin descartar ninguna por pequeña que fuera su fracción.

## 5. Escribir pruebas reales

Pruebas unitarias con datos sintéticos (la forma exacta de una fila/etiqueta real, pero fabricada para la prueba) que cubran: el caso normal, al menos un caso de forma inesperada que debe lanzar `ValueError`, y cualquier decisión de diseño no obvia (p. ej. qué hacer con una etiqueta sin datos reales detrás, como pasó con las 19 subcorticales de Gordon 333 en la decisión 7). Cuando la biblioteca real de la usuaria está montada (`E:\NeuroData` vía el puente con su ordenador), añadir además una prueba contra el archivo real, marcada `pytest.mark.skipif(not path.exists(), ...)` — patrón ya usado en `backend/tests/ingestion/test_brainnetome.py` — para que la suite siga pasando en cualquier entorno sin esa biblioteca montada, pero verifique de verdad contra el dato real cuando sí lo está.

## 6. Verificar toda cita antes de escribirla

DOI, autores, año, revista: verificados contra Crossref (u otra fuente primaria) antes de darlos de alta, nunca copiados de memoria ni de una referencia de terceros sin comprobar. Si el acceso directo a la publicación está bloqueado (reCAPTCHA en PubMed/PMC, por ejemplo), se busca un espejo bibliográfico independiente antes que dejarlo sin verificar. Precedentes: decisión 26 (verificación contra Crossref), decisión 40 (cita verificada vía espejo tras bloqueo de acceso directo).

## 7. Registrar el formato en el catálogo cerrado

Solo cuando el lector ya está escrito y verificado (pasos 1-6): añadir una entrada nueva a `SUPPORTED_FORMATS` en `backend/ingestion/datasets/formats.py`, con su `label`, `description`, `required_files` (los roles de archivo que necesita, nunca nombres de archivo fijos) y `atlas_metadata` real. Nunca se añade una etiqueta al catálogo sin que su lector real ya exista y esté probado — aceptar un nombre en un `dataset.yaml` sin lector detrás sería fingir un despacho que no existe (decisión 44).

## 8. Manifiesto real y generación de SQL

Crear o actualizar el `dataset.yaml` real del dataset con `format=<nueva etiqueta>` y su mapa `files` (rol -> ruta relativa dentro de la propia carpeta), y generar el SQL de alta con `scripts/register_from_manifest.py <carpeta>` (o, para integraciones futuras, la herramienta MCP `propose_dataset_ingestion`, decisión 46) — nunca a mano, para evitar una transcripción con errores.

## 9. Revisión humana y aplicación

El SQL generado se revisa a ojo (mismo criterio que todos los `scripts/register_*.py` desde la decisión 17) y se aplica con el procedimiento ya establecido (`docker cp` + `psql -f`, o `scripts/apply_sql.ps1`, decisión 41) — nunca de forma automática. Es idempotente (`ON CONFLICT (id) DO UPDATE`), así que reaplicarlo tras corregir algo no duplica ninguna fila.

## 10. Documentar como decisión numerada

Toda la investigación real (qué se comprobó, qué sorprendió, qué se descartó y por qué) se documenta como una entrada nueva en `docs/analisis-arquitectura.md`, siguiendo el mismo criterio de honestidad que el resto del proyecto: un hallazgo que contradice una suposición anterior se corrige explícitamente (ver decisión 45), nunca se reescribe en silencio una decisión ya publicada.

---

Quién puede seguir este protocolo: la propia usuaria, esta sesión, u otra sesión de IA — el criterio es el mismo en los tres casos (decisión 44). Ninguno de los pasos anteriores requiere conocimiento oculto de este repositorio: cada uno se apoya en un patrón ya usado y verificado en una decisión anterior, citada arriba como precedente.
