# Rediseño de la interfaz: documento de diseño

- **Fecha:** 24/09/2026
- **Estado:** propuesta aprobada por la usuaria y validada por el main developer el 24/09/2026. Revisado por un agente aparte en tres pasadas; pendiente de la revisión de la usuaria antes del plan de implementación.
- **Referencia visual:** lienzo de Claude Design «Rediseño de NeuroGraph», https://claude.ai/artifact/57gitCZSpXJZYCdiYhrknA (privado: hay que pedir acceso a su dueña). Es una referencia de aspecto. Los valores que mandan son los de este documento.

## 1. Objetivo

La aplicación funciona, pero su aspecto es de alfa:

- La barra superior mezcla navegación, datos y acciones.
- La información no tiene jerarquía.
- Los colores de red son primarios puros (`#0000ff`, `#00ff00`, `#ffff00`...).

Este rediseño la hace más clara y amable para su público, investigadores que no son informáticos, sin cambiar lo que muestra ni cómo lo codifica.

## 2. Alcance

Dentro:

- Un sistema de cuatro temas elegible desde un engranaje: 1 Original, 2 Grafito, 3 Noche y 4 Claro.
- Una paleta «suave» de redes, derivada de los colores reales de cada atlas, con la opción de volver a los originales.
- Estructura nueva, común a todos los temas: barra superior, Ajustes, filtros, cabeceras de las vistas, panel de detalle y avisos.
- Mejoras estéticas y de uso en el connectograma, los hemisferios y el cerebro 3D.
- Tipografía nueva, instalada con la aplicación.
- Exportación JPEG correcta en todos los temas.

Fuera:

- Backend, API, MCP, base de datos e instalador. El rediseño es solo de `frontend/`.
- Los valores de `NETWORK_COLORS` y de las constantes de la decisión 18 en `theme/networks.ts`.
- Cualquier codificación nueva o distinta (ver 3.1).
- La disposición de la decisión 74, que se mantiene: una vista grande, dos miniaturas, filtros a la izquierda y detalle a la derecha.
- La distribución de Comparar especies, Tractografía 3D, Nodos de tractografía y las pestañas de síntesis. Heredan temas, tipografía y controles, pero no se rediseñan en esta ronda.
- Los colores de los tractos (`logic/tractColors.ts`).
- Un botón de ayuda general: el lienzo lo dibuja, pero todavía no hay contenido de ayuda.
- La línea de fuente del panel de detalle («Rosen y Halgren, 2021») que aparece en el lienzo: `GraphConnection` no trae el estudio.
- Una paleta segura para daltonismo (ver 12).

## 3. Principios

1. **La lógica de representación no cambia.** El color del nodo es la red, el grosor de la línea es el peso, el trazo discontinuo es evidencia no directa (indirecta o hipótesis) y la flecha es conectividad efectiva. Las posiciones y el orden de los nodos siguen saliendo de los mismos datos.
2. **El color de red es un dato.** `NETWORK_COLORS` sigue siendo el color extraído de cada atlas (`theme/networks.ts:225`). La paleta suave es una capa de presentación calculada a partir de él, y siempre se puede volver a los originales.
3. **Un tema cambia colores, no estructura.** Barra, jerarquía, controles y mejoras de los gráficos son iguales en los cuatro temas.
4. **En la interfaz, el color significa «red».** Los temas nuevos usan un acento neutro, casi blanco sobre oscuro y casi negro sobre claro. El logotipo es monocromo.
5. **Todo color sale de un token.** No quedan colores fijos en componentes ni en `App.css`.
6. **Los nodos conservan su anillo neutro** (regla de `theme/networks.ts:228-234`). Es lo que mantiene visibles los colores extremos, como `#000000` o `#ffffcc`, sobre cualquier fondo.

## 4. Temas y colores

### 4.1 Tokens de interfaz

| Token | 1 Original | 2 Grafito | 3 Noche | 4 Claro |
|---|---|---|---|---|
| `bg` fondo | `#15161c` | `#0f1115` | `#0a0e17` | `#f3f2ee` |
| `panel` | `#1d1e26` | `#16191e` | `#111726` | `#ffffff` |
| `raised` elevado | `#23242c` | `#1d2127` | `#172035` | `#f6f5f1` |
| `hover` | `#2a2b34` | `#232830` | `#1c2640` | `#eeede8` |
| `border` | `#34343e` | `#262b33` | `#1f2940` | `#e2e0d9` |
| `borderStrong` | `#46465a` | `#363c47` | `#2e3b58` | `#cfccc3` |
| `text` | `#c7c5d0` | `#c9ced6` | `#cbd5e6` | `#3a3d43` |
| `strong` texto fuerte | `#f3f2f7` | `#f1f3f6` | `#f2f5fb` | `#14161a` |
| `muted` secundario | `#9995a8` | `#8d95a3` | `#8a97b0` | `#686c74` |
| `faint` tenue | `#6f6c7d` | `#5f6775` | `#5b6782` | `#9a9da4` |
| `accent` | `#ac61d1` | `#e8ecf1` | `#e3ebfb` | `#16181c` |
| `accentSoft` fondo de estado activo | `rgba(172, 97, 209, 0.15)` | `rgba(232, 236, 241, 0.08)` | `rgba(227, 235, 251, 0.08)` | `rgba(22, 24, 28, 0.06)` |
| `accentBorder` borde de estado activo | `rgba(172, 97, 209, 0.5)` | `rgba(232, 236, 241, 0.35)` | `rgba(227, 235, 251, 0.35)` | `rgba(22, 24, 28, 0.35)` |
| `success` datos reales | `#7fe0a0` | `#6cc497` | `#5fd0a0` | `#227a4d` |
| `warning` datos de demostración | `#f0c473` | `#e7c46a` | `#edc766` | `#7a5d00` |
| `error` | `#ff9b9b` | `#f09a9a` | `#f59c9c` | `#b42318` |
| `synthesis` síntesis de IA | `#ff7b3d` | `#ff7b3d` | `#ff7b3d` | `#b93d0a` |
| `color-scheme` | `dark` | `dark` | `dark` | `light` |

Notas:

- **Original** reproduce los colores actuales de `index.css` y `App.css`; `accentSoft` y `accentBorder` son los `--accent-bg` y `--accent-border` de hoy.
- **Acento:** no hay texto sobre fondo de acento sólido; los estados activos usan `accentSoft` y `accentBorder`.
- **Síntesis de IA:** conserva su naranja, que fue decisión de la usuaria como tercera categoría visual. En Claro es más oscuro para leerse sobre blanco.
- **Contraste sobre el panel** (medido):
  - `text`, `strong`, `muted`, `success`, `warning`, `error` y `synthesis` superan 4,5:1 en todos los temas.
  - `faint` queda entre 2,7 y 3,3:1: solo para separadores, iconos decorativos y controles desactivados, nunca para texto que haya que leer.

### 4.2 Tokens de dibujo

Lo que hoy son constantes en `theme/networks.ts` y valores sueltos en los componentes pasa a ser un token. En Original conserva exactamente el valor actual.

| Token | Original (hoy) | Grafito | Noche | Claro |
|---|---|---|---|---|
| `edge` línea neutra | `#837f90` | `#8b93a0` | `#8a98b6` | `#6f737c` |
| `edgeOpacityConnectogram` en reposo | 0,55 | 0,24 | 0,26 | 0,26 |
| `edgeOpacityHemispheres` en reposo | 0,6 | 0,3 | 0,3 | 0,3 |
| `edgeOpacity3d` en reposo | 0,55 | 0,55 | 0,55 | 0,55 |
| `edgeOpacityHoverOther`: el resto mientras se pasa el ratón | 0,12 | 0,08 | 0,08 | 0,08 |
| `edgeOpacityHoverSelected`: seleccionadas mientras se pasa el ratón | 0,45 | 0,4 | 0,4 | 0,4 |
| `edgeOpacitySelected` | 0,95 | 0,95 | 0,95 | 0,95 |
| `dash` evidencia no directa | `6 4` | `3 3` | `3 3` | `3 3` |
| `selected` selección | `#ac61d1` | `#f1f3f6` | `#f2f5fb` | `#16181c` |
| `hoverHighlight` | `#ffd84a` | `#ffd84a` | `#ffd84a` | `#b7791f` |
| `label` abreviaturas | `#837f90` | `#8d95a3` | `#8a97b0` | `#686c74` |
| `nodeRing` anillo neutro, 1 px | `#837f90` | `#8b93a0` | `#8a98b6` | `#6f737c` |
| `intra` intrahemisférica | `#2a925e` | `#6cc497` | `#5fd0a0` | `#2e8a5a` |
| `inter` interhemisférica | `#cf596d` | `#ec8d9c` | `#f58fa3` | `#c24a5f` |
| `hemiFill` relleno de las elipses de hemisferio | `none` | `#1d2127` | `#172035` | `#f6f5f1` |
| `homology` | `#da500b` | `#da500b` | `#da500b` | `#da500b` |
| `sceneBg` fondo 3D | `#1d1e26` | `#16191e` | `#111726` | `#ffffff` |
| `cortexSulcus` / `cortexGyrus` | sRGB 0,35 / 0,72 | `#565c66` / `#e3e5e9` | `#4f5869` / `#dfe4ee` | `#6f7680` / `#dcdfe4` |
| `cortexMedialWall` / `cortexNoData` | sRGB 0,25 / 0,55 | `#2a2e35` / `#7d838c` | `#262d3b` / `#7a8396` | `#a3a8b0` / `#b9bdc4` |

Otros detalles del dibujo:

- **Contraste:** `label` y `nodeRing` superan 4,7:1 sobre su panel en los temas nuevos. En Original quedan en 4,27:1, como hoy.
- **Grosor:** el `dash` cambia solo el patrón del discontinuo; el grosor sigue siendo el peso. Hoy, el grosor al seleccionar y las flechas de conectividad efectiva siguen su regla actual.
- **Clave desconocida:** si una clave de red no está en la tabla, se usa el color de «sin clasificar» de la paleta activa. Hoy son `"#888"` y `NEUTRAL_COLOR`: se unifica.

### 4.3 Paleta de redes: suave y original

Hay dos modos, que se eligen en Ajustes:

- **Originales del atlas:** `NETWORK_COLORS` tal cual.
- **Suaves:** la tabla generada `SOFT_NETWORK_COLORS[tema][clave]`, para Grafito, Noche y Claro. El tema Original no tiene columna propia: con «Suaves» usa la de Grafito.

La tabla la genera `scripts/generate_soft_palettes.py`. Lo que sigue describe su método; el script, que parte del prototipo usado para el lienzo, es la definición exacta. Cada grupo de claves se trata por separado: una clasificación por prefijo (`cole-anticevic.`, `gordon333.`, `yeo2011-7.`, `yeo2011-17.`, `power2011.`), más un grupo con las claves de demostración sin prefijo. En OKLCH:

1. **Tono:** se conserva el de cada red. Visual sigue en azul y Por defecto sigue en rojo.
2. **Luminosidad:** se reparte linealmente del mínimo al máximo del grupo sobre la banda del tema: 0,60–0,90 en Grafito y Noche, 0,46–0,76 en Claro.
   - Los acromáticos (C < 0,02) no cuentan para el mínimo y el máximo.
   - El resultado se recorta a la banda. Hace falta para los acromáticos: sin recorte, `#000000` (salience de Gordon y de Power) quedaría fuera de ella.
3. **Croma:** se limita a 0,13 en Grafito, 0,145 en Noche y 0,14 en Claro. Si el color no cabe en sRGB, se recorta el croma sin mover L ni el tono.
4. **Separación:**
   - Mientras dos redes del grupo queden a menos de ΔE_OK 0,085, se sube 0,01 la L de la más clara y se baja 0,01 la de la más oscura, hasta 200 pasadas.
   - La L puede salir de la banda como máximo 0,06 por cada lado.
   - Este paso puede alterar el orden de luminosidad que dejó el paso 2. Por ejemplo, Visual queda en L = 0,57 en Grafito.
5. **Sin clasificar:** `unclassified` es un gris acromático con L = (mínimo + máximo de la banda) / 2 − 0,02. Queda en `#a8a8a8` en Grafito y Noche, y en `#7d7d7d` en Claro.

Resultado para Cole-Anticevic, que es la clasificación por defecto:

| Red | Original (dato del atlas) | Grafito | Noche | Claro |
|---|---|---|---|---|
| Visual | `#0000ff` | `#4f74c4` | `#4d76cf` | `#294c9f` |
| Visual 2 | `#6400ff` | `#8a85de` | `#8780e3` | `#5f56b2` |
| Somatomotora | `#00ffff` | `#4cedec` | `#19efef` | `#00bdbd` |
| Cíngulo-opercular | `#990099` | `#ae66ac` | `#b362b0` | `#853a83` |
| Atención dorsal | `#00ff00` | `#98e191` | `#91e38a` | `#67b461` |
| Lenguaje | `#009b9b` | `#35b3b3` | `#35b3b3` | `#008686` |
| Frontoparietal | `#ffff00` | `#e3e67b` | `#e4e66c` | `#b7b840` |
| Auditiva | `#fa3efb` | `#db90d8` | `#df8cdd` | `#b062ae` |
| Por defecto | `#ff0000` | `#eb8475` | `#f27f6f` | `#c05548` |
| Multimodal posterior | `#b15928` | `#cc7242` | `#cc7242` | `#9e4812` |
| Multimodal ventral | `#ff9d00` | `#f2a958` | `#f8a647` | `#c77b11` |
| Orbito-afectiva | `#417d00` | `#6a9e49` | `#66a03d` | `#3f750d` |

Comprobación sobre las cinco clasificaciones:

- **Contraste mínimo de un color de red con el panel:** sube de 1,11–2,05 con los originales a 3,88–4,40 en Grafito y a 3,94–4,45 en Noche.
- **En Claro:** queda en 1,78–2,11 contra blanco, mejor que los originales contra blanco (1,03–1,17). El anillo neutro (principio 6) mantiene visibles los nodos.
- **Distinción entre redes:** el ΔE_OK mínimo entre dos redes de una clasificación queda en ≥ 0,085 en todas. En Yeo 17 mejora (de 0,065 a 0,086).

### 4.4 Exportación a JPEG

El fondo sigue siendo siempre blanco (decisión 11). Los colores dependen de dos elecciones independientes:

- **Colores de red:** con «Originales del atlas», los de `NETWORK_COLORS`; con «Suaves», los de la columna Claro.
- **Colores de dibujo:** con el tema Original, `DRAW_TOKENS.original` (las constantes de la decisión 18 y los valores sueltos de hoy), así que la exportación sale con los mismos colores que ahora. Con los temas 2 a 4, `DRAW_TOKENS.claro`.

**SVG exportables:** el connectograma (incluidos los marcadores de flecha de `<defs>`), los hemisferios (también sus marcadores) y la leyenda de la selección múltiple de `DetailPanel` (`legend-svg`). En ellos se cumple lo siguiente:

- Todo color es un atributo de presentación (`fill`, `stroke`, `stroke-opacity`), nunca `var()` ni una clase CSS, porque al serializar se pierden.
- Cada elemento con color de tema lleva `data-ng-fill`, `data-ng-stroke` o `data-ng-stroke-opacity`. Su valor es el nombre de un token de 4.2 o `net:<clave>` para un color de red. Por ejemplo, `edge`, `selected`, `label`, `nodeRing`, `intra`, `hemiFill`, `edgeOpacityConnectogram` o `edgeOpacityHemispheres`.
- `exportSvgAsJpeg` llama, antes de serializar el clon, a `applyExportColors(clon, resolver)`. Este recorre esos atributos y escribe el valor que devuelve `exportColorFor(ref, tema, modo)`.
- El `<svg>` exportado lleva `font-family` explícito (una pila de fuentes del sistema). Hoy no lo lleva y sale con la fuente por defecto del navegador.
- Lo que solo existe mientras el ratón está encima, como la lupa o el resaltado, no aparece en la exportación: al pulsar el botón, el puntero está fuera del dibujo. Es igual que hoy.

**Cerebro 3D:** `ExportBridge` ya cambia el fondo a blanco. Además activa un modo «exportando», que es estado local de `Brain3D` y no del store global: así el connectograma y los hemisferios no se repintan durante una exportación 3D. Mientras dura:

- Los tokens de dibujo y los colores de red del lienzo 3D son los de exportación.
- La corteza pintada recalcula sus colores, que es rápido.
- Los materiales de la selección, los marcadores, las líneas, los conos de dirección y la malla de referencia de `ReferenceMesh` usan los tokens de exportación.

`ExportBridge` espera un fotograma dibujado con esos colores, lo captura y restaura el modo normal. Así la selección no desaparece sobre el blanco.

### 4.5 Elección y persistencia

- **Estado:** `{ tema, modoPaleta }`. `modoPaleta` vale `"suave"`, `"original"` o `null`, que es automático: `"original"` en el tema Original y `"suave"` en los demás.
- **Independencia:** cambiar de tema no borra un `modoPaleta` elegido a mano.
- **Almacenamiento:** se guarda en `localStorage` con la clave `neurograph.apariencia`. Cada lectura y escritura va en `try/catch`: si el almacenamiento falla o no existe, se usan los valores por defecto sin error.
- **Tema por defecto: Grafito.** Es la propuesta; se confirma al revisar este documento.
- **Primer render:** `main.tsx` lee la elección de forma síncrona y aplica `data-theme` y `color-scheme` en `<html>` antes del primer render, para que no parpadee el tema equivocado. `index.css` define los tokens de 4.1 para cada `data-theme`.

## 5. Estructura, común a todos los temas

### 5.1 Barra superior

De izquierda a derecha:

1. **Marca:** logotipo monocromo, «NeuroGraph» y la etiqueta «alfa».
2. **Pestañas de vista:**
   - Atlas (antes «Un atlas»), Comparar especies, Tractografía 3D y Nodos de tractografía, cada una con icono. La activa lleva un subrayado del color de acento.
   - Las síntesis importadas se añaden como pestañas con icono en lugar del emoji 🧪 y con un `<button>` real para cerrarlas, en lugar del `span` con `role="button"`.
3. **Contexto de datos:** dos botones de lista desplegable, «ATLAS · HCP-MMP1.0» y «REDES · Cole-Anticevic», que sustituyen a los `<select>` nativos que cortaban el texto.
   - El botón muestra un nombre corto.
     - Atlas: el texto de la etiqueta de `ATLASES` antes de « — », que es único en los cuatro atlas.
     - Redes: un mapa explícito nuevo, `NETWORK_SOURCE_SHORT_LABELS`, con «Cole-Anticevic», «Gordon 333», «Yeo 7», «Yeo 17» y «Power 2011». No se recorta la etiqueta, porque Yeo 7 y Yeo 17 quedarían iguales. Una fuente que no esté en el mapa se muestra con su identificador, como hoy.
   - La lista muestra las etiquetas completas que ya hay: la de `ATLASES`, y la fuente con «N de M regiones» y «(por defecto)», como hoy. No se añaden citas que los datos no tengan.
   - Mientras carga, muestra el estado `networkSourcePending`.
   - Se maneja con teclado: `role="listbox"`, flechas, Intro y Escape.
   - El estado y los manejadores son los actuales.
4. **Estado de los datos:** un punto de color `success` con «Datos reales», o `warning` con «Datos de demostración». La etiqueta emergente da las cifras, por ejemplo «360 regiones · 64 620 conexiones».
5. **Acciones:** «Importar» (botón secundario con icono; etiqueta emergente «Importar una síntesis de IA») y el engranaje de Ajustes.

### 5.2 Ajustes

Un panel emergente que sale del engranaje:

- **Tema:** cuatro tarjetas con vista previa (fondo, panel y cinco colores de red del tema) y una descripción de una línea.
- **Colores de las redes:** un control de dos opciones, «Suaves» y «Originales del atlas», con una muestra de la paleta y una nota: «Los originales son los del archivo de cada atlas: úsalos si una figura tiene que coincidir con la del artículo».
- Se cierra con Escape, con un clic fuera o con su botón. Al cerrar, el foco vuelve al engranaje.

### 5.3 Filtros

- **Cabecera:** «Filtros» y el botón de plegar.
- **Selección:** «N regiones seleccionadas» y «Limpiar».
- **Redes:**
  - Cabecera con el número de redes y los botones de texto «Todas» y «Ninguna», que ya no ocupan dos líneas.
  - Cada fila lleva casilla, color, nombre y número de regiones de esa red, contado sobre los nodos cargados.
  - Las acciones ◎ y + aparecen al pasar el ratón o al llegar a la fila con el teclado (`:focus-within`).
- **Tipo de conectividad:** junto a cada tipo, cuántas conexiones de ese tipo pasan los demás filtros (redes y peso mínimo), sin contar su propia casilla. Así se ve cuántas añadiría al marcarla. `App` calcula esos recuentos y se los pasa a `FilterPanel` en una prop nueva, `connectionCountsByType`.
- **Peso mínimo:** el valor, el deslizador y «Se ven N de M conexiones». N son las conexiones visibles con todos los filtros; M, las cargadas para el atlas. Van en otra prop nueva.
- **Ayuda:** «¿Cómo funcionan los filtros?» con el texto de ayuda actual.
- **Controles:** casillas y deslizador con `accent-color` del tema.

### 5.4 Vista grande y miniaturas

- **Cabecera:** `WorkspaceView` sigue pintando la cabecera. En la vista grande añade una línea que explica cómo leerla: un texto fijo por vista, `WORKSPACE_VIEW_DESCRIPTIONS`.
- **Herramientas:** siguen dentro de cada vista, con su estado donde está hoy (lupa y exportar en el connectograma, «Ocultar no seleccionados» y exportar en los hemisferios, controles del cerebro 3D).
  - En la vista grande se colocan por CSS a la derecha de la cabecera, con posición absoluta dentro de `.ws-view--main`. Los controles del cerebro 3D, que son más, quedan en una fila bajo ella.
  - No se sube estado a `App`.
- **Lupa:** pasa de casilla a botón de alternar (`aria-pressed`).
- **Controles del cerebro 3D:** siguen siendo `<select>` nativos, con estilo propio (`appearance: none` y chevron).
- **Leyenda del connectograma:** fija abajo a la izquierda, fuera del SVG, así que no se exporta. Tiene cuatro entradas:
  - «Evidencia no directa (indirecta o hipótesis)», con muestra discontinua.
  - «Evidencia directa», con muestra continua.
  - «Efectiva (con dirección)», con muestra de flecha.
  - «Color del punto = red».
- **Recuadro de lectura:** conserva su altura fija (decisión 74b) y muestra región, hemisferio y red como etiqueta de color.
- **Miniaturas:** botón visible «Ampliar» con icono, en lugar del texto «⤢ ampliar». Se mantiene la capa que amplía al hacer clic en cualquier punto.

### 5.5 Panel de detalle de una región

De más a menos importante:

1. La etiqueta «REGIÓN SELECCIONADA», la abreviatura en grande y el nombre.
2. Dos etiquetas: la red, con su color, y el hemisferio.
3. Cómo se asignó la red: el texto actual de `membershipDescription`, con un icono de información.
4. **Conexiones (N):**
   - Ordenadas por peso, de mayor a menor. Se ven las cinco primeras y «Ver las N» despliega la lista completa.
   - Cada fila conserva la información de hoy (`ConnectionRow`): la otra región, el tipo, el peso con el mismo formato y el nivel de evidencia. Añade el color de la red de la otra región y una barra de peso.
   - La barra usa la escala logarítmica que ya existe en `logic/weightScale.ts`, porque los pesos abarcan varios órdenes de magnitud.
5. **ID científico:** al pie, en letra monoespaciada, con un botón para copiarlo (`navigator.clipboard`; si falla, se selecciona el texto).

Las vistas de una conexión y de varias regiones conservan su contenido y reciben la misma jerarquía de títulos, etiquetas y listas.

### 5.6 Avisos

- Los errores de importar una síntesis y de cambiar la clasificación de redes pasan a un aviso flotante que se puede cerrar. Sustituyen a las franjas rojas fijas de `App.tsx` (`synthesis-import-error`).
- El aviso lleva `role="alert"` y un mensaje comprensible, con el texto técnico completo en «Detalles».
- Los errores se quedan hasta que se cierran.
- Si `isTauri()` (de `@tauri-apps/api/core`, presente en la versión instalada, 2.11.1) indica que la aplicación corre en un navegador, «Importar» no intenta abrir el diálogo. Muestra el aviso «“Importar síntesis” solo funciona en la aplicación de escritorio». Nunca se compara el texto del error, porque cambia según el navegador.

## 6. Gráficos, sin cambiar lo que representan

### 6.1 Connectograma

- **Etiquetas:** van por fuera del anillo, en dirección radial y giradas con el ángulo del nodo. En la mitad izquierda se giran 180° y se alinean al final, para leerse de izquierda a derecha. Es lo contrario de la lupa, que las pone hacia dentro. El tamaño sigue la regla actual según el número de nodos.
- **Arcos de hemisferio:** dos arcos finos por fuera, rotulados IZQUIERDO y DERECHO. Solo se dibujan si, en el orden actual, los nodos de cada hemisferio forman un único bloque seguido y ninguno tiene `hemisphere` nulo. El orden de los nodos no se toca.
- **Líneas:** la misma geometría (curva por el centro), la misma regla de grosor y los tokens de color, opacidad por estado y `dash` de 4.2.
- **Nodos:**
  - Relleno con el color de red del modo activo y anillo `nodeRing` de 1 px.
  - El seleccionado lleva anillo `selected` de 2,5 px, como hoy, más un halo del mismo color al 35 %, en todos los temas.
  - El resaltado al pasar el ratón usa `hoverHighlight` (decisión 76c).

### 6.2 Hemisferios

La geometría y el cálculo son los mismos. Los colores salen de los tokens de 4.2. Las elipses se rellenan con `hemiFill`, que en Original es `none` como hoy, y su contorno usa `edge` opaco. El texto usa la tipografía nueva.

### 6.3 Cerebro 3D

- **Surcos más visibles:** `sulcRange` pasa a devolver los percentiles 5 y 95 en lugar del mínimo y el máximo. `fillVertexColorsByIndex` aplica un suavizado (smoothstep) al valor normalizado.
  - Los percentiles se calculan una vez por archivo de surcos.
  - Se aplica en todos los temas; Original conserva sus grises de 0,35 y 0,72.
- **Marcadores de región:** el radio base se reduce a la mitad y el de la región seleccionada queda un 40 % mayor que el resto. Así no tapan la región pintada. El contorno neutro del marcador (hoy a escala 1,18) tiene que seguir viéndose en nodos `#000000`; si con el tamaño nuevo deja de verse, se ensancha.
- **Etiquetas 3D** (`logic/textSprite.ts`):
  - Usan la tipografía nueva, con el texto y un fondo translúcido del tema.
  - La caché pasa de indexarse por texto a indexarse por texto, tema y una versión de fuentes, que sube cuando `document.fonts.load(...)` termina. Así las etiquetas se regeneran al cambiar de tema y cuando llega la fuente.
- **Fondo y materiales:** `SCENE_BG` deja de ser constante en `Brain3D.tsx`, `Tractography3D.tsx` y `TractographyNodes3D.tsx` y pasa a ser el token `sceneBg`. Los materiales usan los tokens de 4.2.

## 7. Tipografía

- **Fuentes:** Atkinson Hyperlegible Next (400, 500, 600 y 700) para la interfaz y Atkinson Hyperlegible Mono (400 y 500) para IDs y cifras. Distingue bien I, l y 1 en abreviaturas como IFJa, IP1 o LIPd.
- **Instalación:** como archivos `woff2` en `frontend/src/assets/fonts/`, con su licencia (SIL OFL 1.1) y `@font-face` en `index.css`. No se piden a internet: la aplicación de escritorio tiene que funcionar sin conexión.
- **JPEG:** las etiquetas del JPEG usan la pila de fuentes del sistema declarada en el SVG (ver 4.4), no la fuente nueva.

## 8. Accesibilidad

- **Contraste:** el texto supera 4,5:1 y los controles y gráficos de interfaz 3:1 (medido en 4.1 y 4.2). La excepción son los colores de red suaves en Claro (4.3), que cuentan con el anillo neutro.
- **Foco visible:** contorno de 2 px del color de acento en todos los controles.
- **Teclado:** los paneles emergentes y las listas se cierran con Escape y devuelven el foco. Todo lo que aparece al pasar el ratón aparece también al llegar con el teclado.
- **Nombres y estados:** los botones que solo tienen icono llevan `aria-label`, los de alternar `aria-pressed`, y los avisos `role="alert"`.

## 9. Arquitectura

### Unidades nuevas

- **`theme/themes.ts`:**
  - `ThemeId` (`"original" | "grafito" | "noche" | "claro"`).
  - `UI_TOKENS[tema]` (4.1) y `DRAW_TOKENS[tema]` (4.2).
  - `exportDrawTokens(tema)`, que devuelve `DRAW_TOKENS.original` para Original y `DRAW_TOKENS.claro` para los demás.
  - No depende de React.
- **`theme/softPalettes.ts`:** la tabla generada `SOFT_NETWORK_COLORS`. Solo datos; no se edita a mano.
- **`theme/colors.ts`:** funciones puras.
  - `resolveNetworkColor(clave, tema, modo)`.
  - `effectivePaletteMode(tema, modoPaleta)`.
  - `exportColorFor(ref, tema, modo)`, donde `ref` es un token o `net:<clave>`.
- **`scripts/generate_soft_palettes.py`:** extrae `NETWORK_COLORS` de `networks.ts`, aplica 4.3, escribe `softPalettes.ts` e imprime la comprobación.
- **`state/appearance.ts`:** store de zustand con `tema` y `modoPaleta`, más la persistencia de 4.5.
- **`theme/useDrawColors.ts`:** hook `useDrawColors({ paraExportar })` que devuelve los tokens de dibujo y `networkColor(clave)` según el store. Con `paraExportar`, devuelve los de exportación. Solo `Brain3D` lo usa así, con su estado local «exportando».
- **`logic/exportPalette.ts`:** `applyExportColors(raiz, resolver)`. Recorre `[data-ng-fill]`, `[data-ng-stroke]` y `[data-ng-stroke-opacity]` y escribe los atributos.
- **Componentes:** `TopBar`, `SettingsPopover`, `DataContextMenu` (con `NETWORK_SOURCE_SHORT_LABELS`), `Toast` e `Icon` (iconos SVG en línea).

### Archivos que cambian

- **Estilos:** `index.css` (tokens por `data-theme` y `@font-face`) y `App.css` (colores fijos pasados a tokens y estilos nuevos).
- **Entrada y estructura:**
  - `main.tsx`: tema aplicado antes del primer render.
  - `App.tsx`: barra superior, avisos, recuentos de filtros y descripciones de vista.
  - `FilterPanel.tsx` y `DetailPanel.tsx`.
- **Gráficos:**
  - `Connectogram.tsx`, `Hemisferios.tsx`, `Brain3D.tsx` (con `ExportBridge`), `PaintedCortex.tsx` y `ReferenceMesh.tsx`.
  - `Tractography3D.tsx` y `TractographyNodes3D.tsx` (solo el fondo).
  - `FunctionSynthesisTab.tsx` (colores a tokens).
- **Lógica:** `logic/surfaceParcels.ts` (percentiles y grises por tema), `logic/textSprite.ts` y `logic/exportImage.ts`.

### Sin cambios

Los valores de `NETWORK_COLORS` y de las constantes de la decisión 18 en `theme/networks.ts`. Pasan a alimentar el tema Original y la exportación.

## 10. Pruebas

vitest corre en node, sin DOM, así que la lógica se prueba con funciones puras y no se añaden dependencias:

- **`softPalettes`:**
  - Cada clave de `NETWORK_COLORS`, incluidas las de demostración y `unclassified`, tiene color en Grafito, Noche y Claro.
  - El tono se conserva en ±3°, salvo los acromáticos.
  - La L queda dentro de la banda ± 0,06.
  - El ΔE_OK mínimo dentro de cada grupo es ≥ 0,085.
  - El contraste con el panel es ≥ 3:1 en Grafito y Noche.
- **`colors.ts`:**
  - `resolveNetworkColor` en todas las combinaciones de tema y modo; una clave desconocida da `unclassified`.
  - `effectivePaletteMode`.
  - `exportColorFor`, comprobando que con el tema Original y la paleta original devuelve exactamente los colores de hoy.
- **`appearance`:** valores por defecto y lectura y escritura con un almacenamiento simulado que falla.
- **`sulcRange`:** percentiles y suavizado sobre un vector conocido.
- **Sin romper nada:** las pruebas actuales siguen pasando, incluida `networkSurface.test.ts`, que compara `NETWORK_COLORS` con los JSON.

El recorrido del DOM de `applyExportColors` es mínimo y se comprueba en la aplicación real, exportando con cada tema. Cada fase se verifica además con capturas del antes y el después.

## 11. Fases

Cada fase es una decisión de diseño en `docs/decisiones-diseno.md` (numeración D; la primera libre es la D3), con su propio commit. Todas dejan la aplicación correcta.

1. **Base de temas.**
   - Tokens de interfaz y de dibujo conectados en todos los componentes.
   - Store, persistencia y tema antes del primer render.
   - Engranaje y Ajustes con los cuatro temas.
   - Exportación correcta: atributos `data-ng-*`, `applyExportColors` y modo «exportando» del 3D.
   - Tipografía local y `accent-color`.
   - Al terminar, los cuatro temas funcionan con los colores de red originales. El tema Original tiene los mismos colores que hoy; solo cambia la tipografía.
2. **Paleta suave.** Script y tabla, `resolveNetworkColor` en todos los consumidores, y la opción «Suaves / Originales del atlas» en Ajustes. La exportación ya la sigue.
3. **Estructura.** Barra superior, contexto de datos, filtros con recuentos, cabeceras y miniaturas, panel de detalle y avisos.
4. **Gráficos.** Connectograma (etiquetas radiales, arcos, leyenda y nodos), hemisferios y cerebro 3D (surcos, marcadores y etiquetas).

## 12. Riesgos y puntos abiertos

- **Tema por defecto:** la propuesta es Grafito; se confirma al revisar este documento.
- **Daltonismo:** ninguna de las dos paletas lo tiene en cuenta. Una opción específica cambiaría tonos, y con ello la semántica de color, así que necesita su propia decisión.
- **Fuente en el JPEG:** se declara una pila de fuentes del sistema. Incrustar la fuente nueva en el SVG queda para más adelante.
- **Arcos de hemisferio:** solo aparecen si el orden de los nodos agrupa cada hemisferio. Con atlas que los alternan, no se dibujan.
- **«Original» no es la app de hoy:** conserva sus colores, pero recibe la tipografía (fase 1), la estructura (fase 3) y las mejoras de los gráficos (fase 4), como los demás temas.
