# Protocolo de síntesis de IA a partir de literatura

Este documento formaliza, como la ficha técnica del archivo JSON, el proceso que debe seguir cualquier asistente de IA (esta sesión, Claude Desktop, u otro) al proponer, a partir de literatura científica, qué regiones/redes YA CARGADAS REALMENTE en NeuroGraph parecen estar asociadas a una función cognitiva o condición concreta -- ver la decisión 71 de `docs/analisis-arquitectura.md` para el diseño completo acordado con la usuaria, 11/09/2026.

**Qué es esto y qué NO es.** Un archivo de síntesis es una PROPUESTA de lectura de la literatura, verificada solo en el sentido de que cada región que menciona existe de verdad en los datos ya cargados de NeuroGraph -- nunca es un dato real de NeuroGraph, nunca una conclusión de la propia aplicación, y nunca pasa a la base de datos permanente de forma automática. Al importarlo, la app lo muestra en una pestaña temporal con un aviso naranja bien visible ("SÍNTESIS DE IA A PARTIR DE LITERATURA — NO VERIFICADO"), distinto tanto del verde de "DATOS REALES" como del ámbar de "DATOS SINTÉTICOS". Promoverlo a dato permanente exige siempre una decisión nueva, documentada y revisada a mano -- mismo criterio que la síntesis de homología SMA de la decisión 40, nunca un botón de "guardar en la base de datos" (rechazado explícitamente en el diseño).

**Quién hace la búsqueda de literatura.** El propio asistente de IA, con sus propias herramientas de búsqueda (web, un conector académico como Consensus, lo que tenga disponible) -- NeuroGraph no tiene ni necesita una integración propia con ninguna API académica para esto (decisión de la usuaria, 11/09/2026: "la hace el propio asistente de IA que estés usando"). Esto mantiene el mismo principio que ya declara `README.md`: "La IA (Claude u otro modelo) es su intérprete, nunca su motor científico".

## 1. Resolver region_id reales, nunca inventados

Antes de escribir ni una línea del JSON, cada región que se vaya a mencionar se busca con la herramienta MCP `search_region` (`backend/mcp/server.py`), filtrando por el atlas que se esté usando (`atlas_id`). Nunca se adivina un `id` a partir del nombre de una región o de lo que "suele" usar un atlas -- el `id` real es el que devuelve `search_region`, tal cual.

Si `search_region` no devuelve ninguna región razonable para lo que la literatura describe (por ejemplo, una estructura que ese atlas concreto no separa como región propia), ese hallazgo se deja fuera del archivo en vez de forzarlo contra una región que no la representa de verdad.

## 2. Un `atlas_id` único por archivo

Todo el archivo se resuelve contra UN SOLO atlas (el mismo que declara `atlasId` en el JSON) -- nunca se mezclan region_id de dos atlas distintos en el mismo archivo, mismo principio que el resto de NeuroGraph (sección 24: nunca combinar dos parcelaciones del mismo espacio físico como si fueran una sola). Si la literatura habla de regiones que solo existen en un atlas distinto al que la usuaria tiene cargado en ese momento, se avisa de esto en `notes` en vez de forzar una correspondencia aproximada.

## 3. Cada hallazgo necesita su cita real y completa

`authors`, `year` y `title` son obligatorios; `journal`/`doi`/`url` se incluyen cuando existen. La cita se verifica contra la fuente real (igual que el paso 6 del protocolo de ingesta, `docs/protocolo-ingesta-ia.md`) -- nunca se cita de memoria ni se inventa un DOI. Nunca se deja un hallazgo sin cita: es lo único que permite a la usuaria juzgar por sí misma cuánto peso darle.

## 4. Representar el desacuerdo real, no forzar una sola respuesta

Cuando la literatura está genuinamente dividida (como ocurrió investigando afantasia el 11/09/2026: Kutsche 2026/Liu 2024/Monzel 2024/Milton 2021 por un lado, Takamura 2026 en desacuerdo sobre las vías visuales primarias), el archivo debe representar AMBOS lados como hallazgos independientes, enlazados con `conflictsWith`, en vez de elegir uno y omitir el otro. `agreesWith` sirve para lo contrario: señalar hallazgos que se refuerzan entre sí. Ninguno de los dos campos es obligatorio, pero omitirlos cuando existe un desacuerdo real conocido sería ocultarlo.

## 5. `networkSlug` solo si el propio atlas ya lo asigna

Si un hallazgo dice que "toda una red" está implicada (p. ej. la red por defecto de Cole-Anticevic), `networkSlug` debe ser exactamente la clave real que ya usa NeuroGraph para esa red en ese atlas (`<fuente>.<código_local>`, p. ej. `cole-anticevic.default` -- ver `frontend/src/theme/networks.ts` o el campo `network` que ya devuelve `search_region` en cada región). Nunca se inventa un nombre de red nuevo. Si el hallazgo habla de regiones concretas sin que la literatura lo enmarque como una red completa, se deja `networkSlug: null`.

## 6. Esquema del archivo

```json
{
  "schemaVersion": 1,
  "function": "afantasia",
  "generatedBy": "Claude Desktop (Sonnet 5), 11/09/2026",
  "atlasId": "atlas.human.hcp.mmp1_0",
  "findings": [
    {
      "id": "f1",
      "summary": "Conectividad reducida entre el nodo de imaginería fusiforme y regiones frontoparietales de control.",
      "evidenceType": "functional",
      "regionIds": ["region.human.hcp-mmp1.area37", "region.human.hcp-mmp1.area8"],
      "networkSlug": null,
      "citation": {
        "authors": "Liu et al.",
        "year": 2024,
        "title": "Reduced FIN-frontoparietal connectivity in aphantasia (7T fMRI)",
        "journal": null,
        "doi": null,
        "url": null
      },
      "agreesWith": ["f2"],
      "conflictsWith": null
    },
    {
      "id": "f2",
      "summary": "Sin diferencias en vías visuales primarias; implica más bien tractos frontotemporales/cingulares.",
      "evidenceType": "structural",
      "regionIds": ["region.human.hcp-mmp1.area8"],
      "networkSlug": null,
      "citation": {
        "authors": "Takamura et al.",
        "year": 2026,
        "title": "White matter tract differences in aphantasia",
        "journal": null,
        "doi": null,
        "url": null
      },
      "agreesWith": null,
      "conflictsWith": ["f1"]
    }
  ],
  "notes": "Desacuerdo real en la literatura sobre si la vía visual primaria está implicada -- ver f1 vs f2."
}
```

Cada campo real está definido con su tipo exacto en `frontend/src/types/synthesis.ts`; `evidenceType` es uno de `functional`, `structural`, `lesion`, `connectivity`, `other`.

## 7. Guardar el archivo e importarlo

El archivo se guarda como un `.json` en cualquier ruta local (la que elija la propia usuaria al importarlo, no una carpeta fija del proyecto). Dentro de NeuroGraph, el botón "Importar síntesis de IA…" (en cualquier vista) abre el selector nativo de archivos y, al elegirlo, la propia app **revalida otra vez, por su cuenta**, cada `regionId` contra las regiones que tiene realmente cargadas en ese momento (`frontend/src/logic/synthesisValidation.ts`) -- nunca confía en que el archivo ya viniera bien resuelto, ni siquiera si lo generó esta misma sesión. Si algo no resuelve (un atlas distinto al activo, un id que no existe, una cita incompleta, una referencia cruzada a un hallazgo que no existe), la importación se rechaza entera y explica por qué -- nunca se importa una parte y se descarta el resto en silencio.

## 8. Esto nunca sustituye una decisión documentada para hacerlo permanente

Ver la decisión 40 (`docs/analisis-arquitectura.md`) como precedente: una síntesis asistida por IA, por bien fundamentada que esté, se convierte en dato permanente de NeuroGraph solo cuando una persona la revisa a mano y se documenta como una decisión nueva, numerada, con la misma disciplina que cualquier otra ingesta -- nunca porque el archivo de síntesis ya "parece correcto".

---

Quién puede seguir este protocolo: la propia usuaria, esta sesión, u otra sesión de IA -- mismo criterio que `docs/protocolo-ingesta-ia.md`. Ninguno de los pasos anteriores requiere tocar la base de datos ni el backend: todo el ciclo (buscar literatura, resolver ids reales con `search_region`, construir el JSON, importarlo, revisarlo) ocurre sin ninguna escritura permanente.
