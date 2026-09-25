# Rediseño de la interfaz: documento de diseño

- **Fecha:** 24/09/2026
- **Estado:** aprobado por el usuario y validado por el main developer el 24/09/2026, tras tres pasadas de revisión de un agente aparte. La fase 1 está implementada: D3 de `docs/decisiones-diseno.md`, con el plan en `docs/rediseno-interfaz-plan-fase1.md`. La fase 3 también: D4 de `docs/decisiones-diseno.md`, con el plan en `docs/rediseno-interfaz-plan-fase3.md`. Y la legibilidad del cerebro 3D, la parte 3D de la fase 4, que se adelantó y se hizo en paralelo en la rama `rediseno-3d`, ya fusionada: D5 de `docs/decisiones-diseno.md`, con el plan en `docs/rediseno-interfaz-plan-3d.md` (sección 11).
- **Referencia visual:** lienzo de Claude Design «Rediseño de NeuroGraph», https://claude.ai/artifact/57gitCZSpXJZYCdiYhrknA (privado: hay que pedir acceso a su dueño). Es una referencia de aspecto. Los valores que mandan son los de este documento.

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
4. **En la interfaz, el color significa «red».** Los temas nuevos usan un acento neutro, casi blanco sobre oscuro y casi negro sobre claro. La única excepción es el logotipo de la maqueta, que lleva cuatro nodos con colores de red: representa justo eso, redes (decisión del usuario, 24/09/2026).
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
| `success` datos reales | `#7fe0a0` | `#6cc497` | `#5fd0a0` | `#1f6e45` |
| `warning` datos de demostración | `#f0c473` | `#e7c46a` | `#edc766` | `#7a5d00` |
| `error` | `#ff9b9b` | `#f09a9a` | `#f59c9c` | `#b42318` |
| `synthesis` síntesis de IA | `#ff7b3d` | `#ff7b3d` | `#ff7b3d` | `#b93d0a` |
| `color-scheme` | `dark` | `dark` | `dark` | `light` |

Notas:

- **Original** reproduce los colores actuales de `index.css` y `App.css`; `accentSoft` y `accentBorder` son los `--accent-bg` y `--accent-border` de hoy.
- **Acento:** no hay texto sobre fondo de acento sólido. Los estados activos usan `accentSoft` como fondo, y su borde es `accentBorder`, o `accent` cuando el estado tiene que distinguirse con al menos 3:1 (WCAG 1.4.11), como la tarjeta del tema elegido en Ajustes.
- **Síntesis de IA:** conserva su naranja, que fue decisión del usuario como tercera categoría visual. En Claro es más oscuro para leerse sobre blanco.
- **Fondos de estado:** cada color de estado tiene su fondo translúcido (`--success-bg`, `--warning-bg`, `--error-bg`, `--synthesis-bg`) en `index.css`. Las etiquetas de estado van sobre `--bg` con ese fondo tintado, y así superan 4,5:1 en los cuatro temas. Para lograrlo en Claro, `success` pasa de `#227a4d` (4,2:1) a `#1f6e45` (4,9:1), y el fondo de síntesis queda en `rgba(185, 61, 10, 0.06)` (4,6:1).
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
| `nodeGap` contorno de los nodos del diagrama de síntesis | `#0b0c10` | `#0f1115` | `#0a0e17` | `#ffffff` |
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
- **Tema por defecto: Grafito.** Lo elegimos con la delegación del usuario («lo que sea mejor, tu criterio»), y se le confirma al pedirle permiso para fusionar. Es también el tema que aplica `index.css` sin `data-theme`, antes de que cargue el JS.
- **Primer render:** `main.tsx` lee la elección de forma síncrona y aplica `data-theme` y `color-scheme` en `<html>` antes del primer render, para que no parpadee el tema equivocado. `index.css` define los tokens de 4.1 para cada `data-theme`.

## 5. Estructura, común a todos los temas

### 5.1 Barra superior

De izquierda a derecha:

1. **Marca:** el logotipo de la maqueta, «NeuroGraph» y la etiqueta «alfa». El logotipo es un anillo gris con cuatro nodos unidos, pintados con colores de red de Cole-Anticevic (Lenguaje, Por defecto, Frontoparietal y Visual) del tema activo.
2. **Pestañas de vista:**
   - Atlas (antes «Un atlas»), Comparar especies, Tractografía 3D y Nodos de tractografía, cada una con icono. La activa lleva un subrayado del color de acento.
   - Las síntesis importadas se añaden como pestañas con icono en lugar del emoji 🧪 y con un `<button>` real para cerrarlas, en lugar del `span` con `role="button"`.
   - Van en un `<nav aria-label="Vistas">`, con `aria-current="page"` en la activa, y no en un `tablist`. Cada pestaña cambia la pantalla entera, y un `tablist` no admite el botón de cerrar junto a cada síntesis.
   - El nombre de una síntesis se corta a 10rem; entero queda en la etiqueta emergente.
   - Al cerrar una síntesis, el foco pasa a la que ocupa su sitio, a la anterior si era la última, o a «Atlas».
3. **Contexto de datos:** dos botones de lista desplegable, «ATLAS · HCP-MMP1.0» y «REDES · Cole-Anticevic», que sustituyen a los `<select>` nativos que cortaban el texto.
   - El botón muestra un nombre corto.
     - Atlas: el texto de la etiqueta de `ATLASES` antes de « — », que es único en los cuatro atlas.
     - Redes: un mapa explícito nuevo, `NETWORK_SOURCE_SHORT_LABELS`, con «Cole-Anticevic», «Gordon 333», «Yeo 7», «Yeo 17» y «Power 2011». No se recorta la etiqueta, porque Yeo 7 y Yeo 17 quedarían iguales. Una fuente que no esté en el mapa se muestra con su identificador, como hoy.
   - El botón «Redes» solo aparece si el atlas tiene más de una clasificación cargada, como hasta ahora (decisión 73).
   - La lista muestra las etiquetas completas que ya hay: la de `ATLASES`, y la fuente con «N de M regiones» y «(por defecto)», como hoy. No se añaden citas que los datos no tengan. La opción elegida lleva ✓.
   - Mientras carga la clasificación (`networkSourcePending`), un indicador que gira ocupa el sitio del chevron, y «cargando…» queda para los lectores de pantalla y la etiqueta emergente: el botón no cambia de ancho. Con movimiento reducido, el indicador no gira: queda un arco quieto.
   - Se maneja con teclado: `role="listbox"`, flechas, Inicio, Fin, Intro, espacio y Escape; Tab también la cierra.
   - Al elegir o al cerrar con el teclado, el foco vuelve al botón, también cuando el atlas nuevo termina de cargar. Con un clic fuera, se queda donde se hizo clic.
   - El estado y los manejadores son los actuales.
4. **Estado de los datos:** un punto de color `success` con «Datos reales», o `warning` con «Datos de demostración». Es una región `role="status"`: el cambio se anuncia.
   - La etiqueta emergente de «Datos reales» dice qué es y da las cifras: «Datos reales · 360 regiones · 64 620 conexiones».
   - La de «Datos de demostración» conserva el aviso de siempre: datos sintéticos, solo ilustrativos, y que la API no respondió o el atlas aún no tiene datos.
   - Mientras carga, un punto neutro con «Cargando…».
5. **Acciones:** «Importar» (botón secundario con icono; etiqueta emergente «Importar una síntesis de IA») y el engranaje de Ajustes.

**Ancho.** La barra va en una fila. Si no cabe, pliega lo secundario por este orden, y solo lo que haga falta:

1. «Datos reales» se queda en su punto. «Datos de demostración» nunca se pliega: es un aviso.
2. «Importar» se queda en su icono.
3. Las pestañas de síntesis inactivas se quedan en su icono.
4. Las pestañas de vista inactivas se quedan en su icono. Son la navegación principal: lo último que se pliega.

- Lo plegado conserva su nombre para los lectores de pantalla y su etiqueta emergente, que aparece también con el foco del teclado. El punto de «Datos reales» no se enfoca.
- La barra mide si cabe y elige el menor paso que basta (`logic/topBarFit.ts`, atributo `data-collapse`), en lugar de puntos de corte fijos. Lo que ocupa depende del contenido: el atlas y la clasificación, datos reales o de demostración, y cuántas síntesis hay y cómo se llaman. Si ni así cabe, pasa a dos filas.
- Medido en la vista Atlas, con HCP-MMP1.0, Cole-Anticevic y datos reales (D4), siempre en una fila de 56 px:
  - 1600, 1440, 1400 y 1366 px: no se pliega nada.
  - 1280 px: solo «Datos reales».
  - 1152 px: también «Importar». Se ven los cuatro nombres de vista.
  - 1024 y 900 px: todo. Solo la pestaña activa conserva su nombre.
  - 1400 px con una síntesis de nombre largo: «Datos reales» e «Importar». Con dos, también los nombres de las síntesis, y lo mismo a 1280 px; a 1024 px, todo.

### 5.2 Ajustes

Un panel emergente que sale del engranaje:

- **Tema:** cuatro tarjetas con vista previa (fondo, panel y cinco colores de red del tema) y una descripción de una línea.
- **Colores de las redes:** un control de dos opciones, «Suaves» y «Originales del atlas», con una muestra de la paleta y una nota: «Los originales son los del archivo de cada atlas: úsalos si una figura tiene que coincidir con la del artículo».
- Se cierra con Escape, con un clic fuera, al salir de él con Tab o con su botón. Con Escape o con su botón, el foco vuelve al engranaje. Con un clic fuera, el foco se queda donde se hizo clic.

### 5.3 Filtros

- **Cabecera:** «Filtros» y el botón de plegar. Al plegar o desplegar el panel, el foco pasa al botón que sustituye al pulsado.
- **Buscador de regiones** (5.8), justo encima de la selección.
- **Selección:** ocupa siempre dos líneas, así que la lista de redes no salta cuando cambia el texto.
  - En la primera, «1 región seleccionada», «N regiones seleccionadas», «1 conexión seleccionada» o «Ninguna región seleccionada».
  - En la segunda, a la derecha, «Limpiar» y los botones de deshacer y rehacer (5.7).
- **Secciones:** «Redes», «Tipo de conectividad» y «Peso mínimo» siguen siendo plegables, como en la D1, y empiezan abiertas.
  - Su título es un botón con `aria-expanded` y `aria-controls`, y no un `<summary>`, porque la cabecera de «Redes» lleva «Todas» y «Ninguna», que van fuera de él.
  - Cada sección es un grupo (`role="group"`, con el nombre de su título), no un `<section>`: tres puntos de referencia más en un panel lateral estorbarían.
- **Redes:**
  - Cabecera con el número de redes y los botones de texto «Todas» y «Ninguna», que ya no ocupan dos líneas.
  - Cada fila lleva casilla, color, nombre y número de regiones de esa red, contado sobre los nodos cargados.
  - Las acciones ◎ y + aparecen al pasar el ratón o con el foco del teclado dentro de la fila, también con Mayús+Tab. Es `:has(:focus-visible)` y no `:focus-within`: un clic en la casilla no los deja a la vista.
    - El resto del tiempo quedan fuera de la vista, pero no del orden del tabulador ni de los lectores de pantalla.
    - En las pantallas táctiles (`hover: none`) se ven siempre, junto al número de regiones.
    - Siguen distinguiendo las dos funciones de hoy: ◎ resalta solo esa red y sustituye la selección; + la añade a lo ya resaltado.
    - Sus etiquetas emergentes y `aria-label` lo dicen: «Resaltar solo la red Auditiva (sustituye la selección)» y «Añadir la red Auditiva a la selección».
    - Si ◎ sustituye una selección de varias regiones, sale el aviso con «Deshacer» (5.7).
- **Tipo de conectividad:** junto a cada tipo, cuántas conexiones de ese tipo pasan los demás filtros (redes y peso mínimo), sin contar su propia casilla. Así se ve cuántas añadiría al marcarla. `App` calcula esos recuentos y se los pasa a `FilterPanel` en una prop nueva, `connectionCountsByType`.
- **Peso mínimo:** el valor, el deslizador y «N de M conexiones pasan los filtros», con singular donde toca. N son las conexiones que pasan todos los filtros; M, las cargadas para el atlas. Van en otra prop nueva.
  - Decía «Se ven N de M conexiones», pero las vistas pueden dibujar menos, como explica la ayuda.
  - El valor no se parte: si no cabe junto al título, como «0 (sin filtro, se muestra todo)», baja entero a la línea siguiente.
  - El deslizador dice el peso con `aria-valuetext`.
- **Números:** los que están a la vista llevan su unidad para los lectores de pantalla («Estructural, 3 conexiones»), con los dígitos seguidos, sin el espacio de los miles.
- **Ayuda:** «¿Cómo funcionan los filtros?», con el texto de ayuda actual y tres cosas más:
  - la línea de ◎ y +, que ya no están siempre a la vista;
  - qué cuenta el número junto a cada tipo de conectividad;
  - que las vistas pueden dibujar menos conexiones de las que pasan los filtros: con dos o más regiones seleccionadas, solo las que hay entre ellas, y con más de 10 000, ninguna.
- **Controles:** casillas y deslizador con `accent-color` del tema.

### 5.4 Vista grande y miniaturas

- **Cabecera:** `WorkspaceView` sigue pintando la cabecera. En la vista grande añade una línea que explica cómo leerla: un texto fijo por vista, `WORKSPACE_VIEW_DESCRIPTIONS`.
  - Las descripciones no prometen lo que no se ve. La del connectograma no promete grosores, que solo cambian con pesos mayores que 0.17. La del cerebro 3D dice qué muestra con una selección: una región con sus vecinas, varias con las conexiones entre ellas, o una conexión.
- **Herramientas:** siguen dentro de cada vista, con su estado donde está hoy (lupa y exportar en el connectograma, «Ocultar no seleccionados» y exportar en los hemisferios, controles del cerebro 3D).
  - En la vista grande se colocan por CSS a la derecha de la cabecera, con posición absoluta dentro de `.ws-view--main`, si la vista mide al menos 40rem (una consulta de contenedor). La cabecera les deja su hueco, y la descripción se parte en dos o tres líneas.
  - Más estrecha, se quedan en una fila bajo la cabecera, porque taparían la descripción. Medido con los filtros desplegados: a 1400 px el contenido de la vista grande mide 776 px y suben; a 1280 px mide 656 px y se quedan debajo.
  - Del cerebro 3D solo sube «Exportar JPEG»: sus desplegables, que son más, quedan en una fila bajo la cabecera. La cabecera le reserva el hueco siempre que el botón está: con una selección, y también sin ella con la corteza pintada, que es lo de por defecto (decisión 72), porque entonces el 3D pinta el mapa entero. Sin selección y con la corteza translúcida, o mientras carga su mapa de regiones, no hay botón ni hueco.
  - No se sube estado a `App`.
- **Lupa:** pasa de casilla a botón de alternar (`aria-pressed`).
- **Controles del cerebro 3D:** siguen siendo `<select>` nativos, con estilo propio (`appearance: none` y chevron).
- **Leyenda del connectograma:** fija abajo a la izquierda, fuera del SVG, así que no se exporta. Tiene cuatro entradas:
  - «Evidencia no directa (indirecta o hipótesis)», con muestra discontinua.
  - «Evidencia directa», con muestra continua.
  - «Efectiva (con dirección)», con muestra de flecha.
  - «Color del punto = red».
- **Recuadro de lectura:** conserva su altura fija (decisión 74b) y muestra región, hemisferio y red como etiqueta de color.
  - El «(hemisferio …)» del final de los nombres de HCP-MMP1.0 no se repite si coincide con el hemisferio de la región. Un nombre de red largo acaba en «…», con el completo en la etiqueta emergente.
  - En el del connectograma, con exactamente una región seleccionada, añade cuántas de sus conexiones pasan los filtros, con el umbral, como en la maqueta: «5 conexiones pasan los filtros (peso ≥ 0.015)». Sin umbral no hay paréntesis. Con varias regiones no hay recuento, y el recuadro de los hemisferios no lo lleva.
  - El umbral va en la notación del valor de «Peso mínimo» en Filtros, pero truncado a dos cifras significativas, nunca redondeado hacia arriba, para no exagerarlo: un umbral de 0,0152 se escribe «0.015», no «0.02». Por eso puede quedar una cifra por debajo del valor de Filtros, que redondea: «3.9e-3» frente a «4.0e-3» (12).
  - Si las conexiones que pasan los filtros superan el tope de dibujo (10 000), las vistas no dibujan ninguna, y el recuento lo dice: «359 conexiones pasan los filtros (no se dibujan)». Con umbral, en un solo paréntesis: «(peso ≥ 0.015; no se dibujan)».
  - Añade también la pista «pasa el ratón por otra región para verla». Si la región y el recuento caben en una línea, la pista va debajo; si el recuento baja a la segunda, como a 1280 px, la pista va con él. Con la vista grande de menos de 30rem (a 1024 px con los filtros desplegados), la pista no se muestra.
  - Una conexión, aquí y en la lista de conectividad inducida, lleva «→» solo si es efectiva, y «↔» si no, como el título del detalle (5.5).
- **Miniaturas:** botón visible «Ampliar» con icono, en lugar del texto «⤢ ampliar». Se mantiene la capa que amplía al hacer clic en cualquier punto, pero fuera del orden del tabulador: con el teclado se usa «Ampliar», que deja el foco en el título de la vista ampliada.

### 5.5 Panel de detalle de una región

De más a menos importante:

1. La etiqueta «REGIÓN SELECCIONADA», la abreviatura en grande y el nombre. El nombre va sin el «(hemisferio …)» final si coincide con el de la región, y si solo repite la abreviatura, no se muestra.
2. Dos etiquetas: la red, con su color, y el hemisferio. Un nombre de red largo acaba en «…», con el completo en la etiqueta emergente.
3. Cómo se asignó la red: el texto actual de `membershipDescription`, con un icono de información.
4. **Conexiones (N):**
   - Ordenadas por peso, de mayor a menor. Se ven las cinco primeras; «Ver las N» despliega la lista completa, y «Ver solo las 5 primeras» la vuelve a plegar.
   - N cuenta todas las conexiones cargadas de la región, sin filtros, y la pista lo dice: «todas las cargadas · más fuertes primero · barra logarítmica», o «la única cargada · barra logarítmica». El recuadro de lectura cuenta, en cambio, las que pasan los filtros (5.4).
   - Cada fila conserva la información de hoy (`ConnectionRow`): la otra región, el tipo, el peso con el mismo formato y el nivel de evidencia. Añade el color de la red de la otra región y una barra de peso. El peso va en su propia fila, con la barra.
   - En las conexiones efectivas, la fila dice «hacia» o «desde» la otra región.
   - La barra usa la escala logarítmica que ya existe en `logic/weightScale.ts`, porque los pesos abarcan varios órdenes de magnitud.
5. **ID científico:** al pie, en letra monoespaciada, con un botón para copiarlo (`navigator.clipboard`; si falla, se selecciona el texto).
   - El pie queda pegado abajo del panel.
   - Al copiarlo, el botón pasa a ✓ y se anuncia «Identificador copiado».
   - Si el portapapeles falla, el ID queda seleccionado y se lee a la vista «No se pudo copiar: el identificador queda seleccionado (Ctrl+C)», con «⌘C» en macOS. Cada intento fallido se vuelve a anunciar.

Las vistas de una conexión y de varias regiones conservan su contenido y reciben la misma jerarquía de títulos, etiquetas y listas.

- **Una conexión:** lleva el mismo pie con el ID. Su título es «A ↔ B», o «A → B» si es efectiva: la flecha es la conectividad efectiva (principio 1).
  - Si las dos regiones se llaman igual o están en hemisferios distintos, cada una lleva «(izq.)» o «(der.)», salvo si su abreviatura ya dice el lado, como en Brainnetome («L_SFG_7_1») o Gordon («l_default_12»).
  - Sus datos dicen «Región A» y «Región B», u «Origen» y «Destino» si es efectiva.
- **Varias regiones:** la leyenda de la selección múltiple mide su texto en pantalla y ensancha su SVG, así que no corta las etiquetas largas. Si no cabe en el panel, su recuadro se desplaza en horizontal (12).

### 5.6 Avisos

- Los errores de importar una síntesis y de cambiar la clasificación de redes pasan a un aviso flotante que se puede cerrar. Sustituyen a las franjas rojas fijas de `App.tsx` (`synthesis-import-error`).
- El aviso lleva `role="alert"` y un mensaje comprensible, con el texto técnico completo en «Detalles», que se puede desplazar con el teclado.
  - Los mensajes de importar separan el texto comprensible del técnico: «No se pudo abrir o leer el archivo.», «El archivo elegido no contiene un JSON válido.» y «La síntesis no se ha importado: tiene N problemas.».
- Los errores se quedan hasta que se cierran, con «Entendido», que va bajo el mensaje. El foco pasa entonces al aviso siguiente o, si era el último, a «Importar».
- Cada aviso tiene un origen: importar una síntesis, cambiar la clasificación o deshacer (5.7). Uno nuevo sustituye al anterior del mismo origen, como las franjas de antes.
- **Dónde:** abajo a la derecha, sobre la columna derecha y con su ancho (300 px, a 12 px del borde derecho y del de abajo), apilados hacia arriba: el más reciente queda abajo.
  - No tapan la vista grande ni su recuadro de lectura, Filtros, la barra ni la primera miniatura. Arriba a la derecha, bajo la barra, que era lo previsto, tapaban el «Ampliar» de la primera miniatura (D4).
  - Sí tapan el pie del panel de detalle, con el ID y su botón de copiar, mientras se ven: es el precio aceptado. Con dos avisos y «Detalles» abierto, tapan también parte de la segunda miniatura.
  - Quedan por debajo del panel de Ajustes y de las listas desplegables. Escala de `z-index`: las vistas, 1 como mucho; los avisos, 10; Ajustes y las listas, de 20 a 25; las etiquetas emergentes, 30.
  - Si no caben en la ventana, se desplazan por dentro, también con la rueda del ratón. La región sube como mucho hasta 8 px bajo la barra de una fila.
- Si `isTauri()` (de `@tauri-apps/api/core`, presente en la versión instalada, 2.11.1) indica que la aplicación corre en un navegador, «Importar» no intenta abrir el diálogo. Muestra el aviso «“Importar síntesis” solo funciona en la aplicación de escritorio». Nunca se compara el texto del error, porque cambia según el navegador.

### 5.7 Deshacer y rehacer

Petición del usuario (24/09/2026): con un clic de más se pierde un montaje. Un clic en una línea selecciona esa conexión y vacía la selección de regiones, y «Resaltar» una red reemplaza la selección entera.

Se valoró una barra de estado fija al pie. El usuario la descartó el mismo día: la maqueta ya da ese feedback donde se usa, y el pie lo repetiría. Ese feedback está en la selección y el recuento de Filtros (5.3), el recuadro de lectura (5.4) y el panel de detalle (5.5).

- **Qué se guarda:** cada cambio de la selección (regiones y conexión) y de los filtros (redes y tipos ocultos, peso mínimo). Cada paso es una instantánea de las dos cosas, no una acción. Los cambios que llegan juntos, en la misma tarea del navegador, son un solo paso: «Resaltar» una red oculta la muestra y la selecciona.
- **Qué no se guarda:** el paso del ratón, la vista ampliada, la lupa, el tema y el plegado de paneles o secciones.
- **Cambio de atlas o de clasificación:** el historial se vacía, porque las regiones y las redes guardadas dejan de valer. El atlas nuevo empieza con el historial vacío.
  - Con otra clasificación, se vacía cuando llegan sus datos, no al elegirla: mientras carga se sigue viendo y usando la anterior, y si falla, no cambia nada.
  - También se vacía al caer a los datos de demostración, que son otras regiones.
- **Deslizador de peso:** un arrastre cuenta como un solo paso. Los cambios seguidos con el teclado se agrupan si llegan con menos de 500 ms de diferencia.
  - El arrastre se da por terminado al soltar el puntero, aunque el valor se quede quieto a medio arrastre. Solo cuenta el puntero pulsado sobre el deslizador.
  - Un arrastre que acaba donde empezó no es un paso, y lo que se podía rehacer se conserva.
- **Profundidad:** los 50 últimos pasos.
- **Controles:**
  - **Botones de icono ↶ «Deshacer» y ↷ «Rehacer»:** van en la fila de selección de Filtros, junto a «N regiones seleccionadas · Limpiar» (5.3), que es donde se arma el montaje. Los recibe `FilterPanel` en una prop nueva, `historyControls`: el panel no sabe nada del historial.
    - Llevan `aria-disabled` cuando no hay paso.
    - Su etiqueta emergente describe el paso, por ejemplo «Deshacer: quitar R_SFG_7_2 de la selección». Aparece también al llegar con el teclado.
  - **Teclado:** Ctrl+Z (⌘Z en macOS) deshace; Ctrl+Mayús+Z y Ctrl+Y rehacen.
    - Los botones lo declaran con `aria-keyshortcuts`.
    - No se interceptan dentro de un campo de texto: con el foco en el buscador (5.8), Ctrl+Z es del campo.
    - Funcionan en la vista Atlas, aunque el panel de Filtros esté plegado.
    - No actúan con la tecla repetida por mantenerla pulsada, si otro ya atendió el evento, ni mientras está abierta una lista desplegable o el panel de Ajustes. Con un teclado sin letras latinas, miran la tecla física (`event.code`).
  - **Aviso con «Deshacer»:** aparece cuando un solo paso quita dos o más regiones de la selección, por un clic en una línea, «Resaltar» otra red o «Limpiar». Dice «Se sustituyó la selección de N regiones» o «Se vació la selección de N regiones», con un botón «Deshacer».
    - Usa la cola de avisos (5.6) y no roba el foco.
    - No lleva `role="status"`: su texto lo anuncia una región viva oculta (`aria-live="polite"`) que está siempre en la página, porque una región viva que aparece con el texto ya dentro no siempre se anuncia. El aviso visible no lleva rol, para que no se lea dos veces. Los demás avisos, como los errores, siguen con `role="alert"`.
    - Se va solo a los 8 s, pero el tiempo se para mientras tiene el ratón encima o el foco. Se va también con cualquier otro cambio del historial, también cuando se vacía, y al salir de la vista Atlas.
    - Su «Deshacer» deshace el último paso, que siempre es el suyo. Tras usarlo, o al cerrarlo, el foco va al botón ↶ si se ve, y si no (con Filtros plegado), al título de la vista grande; nunca a «Importar».
    - N cuenta solo las regiones del atlas que se está viendo: los ids de un atlas anterior se quedan en el store y no se ven.
- **Arquitectura:**
  - Un store nuevo, `state/history.ts`, se suscribe a `useSelectionStore` y `useFiltersStore` y guarda instantáneas. Deshacer y rehacer las restauran con `setState`.
  - No cambia la API ni el código de esos dos stores, que son del desarrollador principal.
  - Ignora los cambios que provoca él mismo.
- **Descripción de un paso:** una función pura (`logic/historyStep.ts`) compara dos instantáneas. Ejemplos: «añadir R_SFG_7_2 a la selección», «añadir IFJa (der.) a la selección», «quitar 3 regiones», «seleccionar la conexión A ↔ B», «limpiar la selección», «ocultar la red Visual», «peso mínimo de 1.0e-3 a 4.0e-3» o, si cambian varias cosas, «varios cambios».
  - Las regiones llevan su lado, «IFJa (der.)», porque las abreviaturas de HCP-MMP1.0 no lo llevan; no se añade si la abreviatura ya lo dice. Un id de otro atlas, que el store conserva, es «una región de otro atlas».
  - Quitar la única región seleccionada es «quitar IFJa (der.) de la selección», no «limpiar la selección».
  - El peso se escribe como el umbral del recuadro de lectura (5.4): en la notación de Filtros, truncado a dos cifras significativas.

### 5.8 Buscador de regiones

Petición del usuario (24/09/2026): con 360 regiones en el círculo, es muy difícil localizar a ojo una región como TE1m.

- **Dónde:** en Filtros, justo encima de la selección (5.3), porque ahí se arma el montaje (decisión del usuario). Vale para las tres vistas, que comparten la selección.
- **Autocompletado:** al escribir aparece una lista de sugerencias bajo el campo (patrón *combobox*, `aria-autocomplete="list"`).
  - Queda activa la primera sugerencia que no está ya seleccionada (si todas lo están, la primera), así que Intro la elige: «te1m» e Intro dos veces añade las dos TE1m.
  - La activa lleva el contorno del color de acento, porque el foco se queda en el campo, y sus textos grises pasan al color del texto. Se desplaza a la vista al abrir la lista, al escribir y con el teclado.
  - El ratón también la cambia, pero solo si se mueve de verdad: no cuentan los mousemove que WebKit envía cuando la lista se desplaza bajo el ratón quieto, ni el primero tras abrirse la lista. Lo mismo en la lista del contexto de datos (5.1).
  - Las flechas se mueven por la lista, con las teclas de la lista del contexto de datos, salvo espacio, Inicio y Fin, que son del campo: escriben o mueven el cursor. Con la lista cerrada, la flecha abajo la vuelve a abrir.
  - Escape cierra la lista; un segundo Escape vacía el campo. Sin lista, el primer Escape ya lo vacía.
  - Los avisos van en una línea bajo el campo, y la lista, que flota, bajo ella: una lista (`listbox`) no puede llevar botones. Sin ninguna coincidencia, dice «Ninguna región coincide.».
  - La lista solo está en la página mientras está abierta, y el campo apunta a ella con `aria-controls` solo entonces: la guarda de los atajos de deshacer busca listas abiertas.
- **Qué busca:** la abreviatura y el nombre completo, sin distinguir mayúsculas ni tildes.
  - Orden: abreviatura exacta; abreviatura que empieza por lo escrito; abreviatura que lo contiene; nombre que lo contiene.
  - Las abreviaturas que llevan el lado (Brainnetome, Gordon) se buscan y se ordenan sin él, con los números en su orden: «sfg» da `L_SFG_7_1`, `R_SFG_7_1`, `L_SFG_7_2`… Escrita entera, con el lado, también se encuentra.
  - A igualdad de nivel y de abreviatura, por lado: izquierdo, derecho y sin hemisferio.
  - Como máximo, 8 sugerencias.
- **Solo redes visibles** (decisión del usuario): se sugieren las regiones de las redes que no están ocultas en Filtros, porque las demás no se ven en las vistas. Si lo escrito solo aparece en redes ocultas, lo dice, con un botón que las muestra. Por ejemplo, con Cole-Anticevic: «TE1m está en las redes Por defecto y Frontoparietal, que están ocultas.», con «Mostrar las redes».
  - El aviso sale también si la abreviatura exacta está en una red oculta, aunque haya otras sugerencias: «pf», con Cíngulo-opercular oculta, dice «PF está en la red Cíngulo-opercular, que está oculta.» junto a PFm y PFt.
  - Si solo está oculta una parte de las coincidencias exactas, nombra la región con su lado. En Cole-Anticevic, la TE1m izquierda está en Por defecto y la derecha en Frontoparietal: con Por defecto oculta, «te1m» dice «TE1m (izq.) está en la red Por defecto, que está oculta.», con la derecha en la lista.
  - Nombra la región, si todas las coincidencias ocultas son la misma, o «Lo escrito», y sus redes, hasta tres, o cuántas son. Ante el sonido /i/, «y» pasa a «e»: «Visual e Hipocampo».
  - «Mostrar la red», o «Mostrar las redes», las muestra todas a la vez, vuelve a abrir la lista y devuelve el foco al campo. Ninguna coincidencia se queda escondida sin decirlo.
- **Cada sugerencia** lleva:
  - el color de su red, con el anillo neutro;
  - la abreviatura, con su lado cuando la abreviatura no lo lleva («TE1m (izq.)»);
  - el nombre completo, sin el sufijo «(hemisferio …)»;
  - «seleccionada», si ya lo está.
- **Elegir una región:** se añade a la selección con `addNodes`, que nunca quita regiones, así que es un paso que se puede deshacer (5.7).
  - El campo se vacía y conserva el foco, para seguir añadiendo regiones.
  - Si la región ya estaba seleccionada, no cambia nada.
- **Atajo:** Ctrl+K (⌘K en macOS) lleva el foco al buscador. Si Filtros está plegado, lo despliega.
  - Funciona en la vista Atlas, como los atajos de deshacer: en las demás pestañas no hay buscador. En el propio buscador, selecciona lo escrito.
  - No actúa dentro de otro campo de texto, con Mayús, ni mientras está abierta otra lista desplegable o el panel de Ajustes.
  - El marcador de posición lo dice: «Buscar región (Ctrl+K)», o «(⌘K)» en macOS.
- **Deshacer:** con el foco en el buscador, Ctrl+Z es del campo, como en cualquier campo de texto (5.7). La región añadida se deshace con ↶, o con Ctrl+Z fuera del campo.
- **Arquitectura:**
  - `logic/regionSearch.ts`: función pura que normaliza, busca, ordena y detecta coincidencias en redes ocultas.
  - `RegionSearch`: componente que reutiliza la lógica de teclado de `logic/listbox.ts`.

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
- **Marcadores de región:** el radio base se reduce a la mitad, de 0,06 a 0,03, y el de la región seleccionada queda un 40 % mayor que el resto (0,042). Así no tapan la región pintada. Lo que dependía del radio se ajusta con él (D5):
  - El contorno neutro del marcador tiene que seguir viéndose en nodos `#000000`. Pasa de escala 1,18 a 1,36, y así conserva el grosor absoluto de antes (0,0108).
  - La zona de clic conserva el radio de antes (0,06, y 0,09 en la región seleccionada), en una esfera invisible: seleccionar con un clic no cuesta más.
  - La etiqueta queda a 0,18 del borde del marcador, como antes en uno normal.
- **Etiquetas 3D** (`logic/textSprite.ts`):
  - Usan la tipografía nueva, con el texto y un fondo translúcido del tema.
  - La caché pasa de indexarse por texto a indexarse por texto, tema y una versión de fuentes, que sube cuando `document.fonts.load(...)` termina. Así las etiquetas se regeneran al cambiar de tema y cuando llega la fuente.
- **Fondo y materiales:** `SCENE_BG` deja de ser constante en `Brain3D.tsx`, `Tractography3D.tsx` y `TractographyNodes3D.tsx` y pasa a ser el token `sceneBg`. Los materiales usan los tokens de 4.2.
- **Atenuar lo que queda detrás** (idea del usuario, 24/09/2026; D5):
  - Es un interruptor en los controles del 3D, activado por defecto y guardado en este navegador con su propia clave (`neurograph.cerebro3d.atenuar`), aparte de la apariencia. Desactivado, los materiales son los de siempre.
  - Líneas, marcadores con su contorno, conos de dirección y etiquetas se ven más tenues cuanto más lejos de la cámara están, dentro de la profundidad del cerebro. Así una región de la cara interna o del otro hemisferio no parece flotar delante. Se calcula en cada fragmento, así que una línea larga se desvanece a lo largo de su recorrido.
  - **Tramo:** se mide con el elipsoide inscrito en la caja del cerebro que se ve (la de un solo hemisferio si solo se ve uno y, sin corteza pintada, la de todos los nodos del atlas), en la profundidad del eje de la cámara y no en la distancia euclídea. Va desde 0,2 de la semiprofundidad del cerebro por delante de su centro hasta su cara más lejana en la dirección de la vista. Lo más lejano conserva 0,2 de opacidad.
  - Para las líneas no se usa la oclusión estricta: van en recta entre dos puntos de la corteza y pasan por dentro, así que quedarían casi todas tapadas.
  - La exportación reproduce la atenuación tal como se ve.
- **Captura del 3D sin parpadeo** (D5): la captura se dibuja en un `WebGLRenderTarget` fuera de pantalla, con el mismo proceso de color que el lienzo (curva de tono y codificación sRGB). Mientras dura «exportando», el lienzo visible no se vuelve a dibujar: lo dibuja un `useFrame` de prioridad 1, y solo fuera de la exportación. Así ya no se ven en pantalla los fotogramas con los colores de exportación (limitación anotada en D3). Si se ha perdido el contexto WebGL, el lienzo no tiene tamaño o la captura sale vacía, no se descarga nada, y la consola lo dice.

## 7. Tipografía

- **Fuentes:** Atkinson Hyperlegible Next (400, 500, 600 y 700) para la interfaz y Atkinson Hyperlegible Mono (400 y 500) para IDs y cifras. Distingue bien I, l y 1 en abreviaturas como IFJa, IP1 o LIPd.
- **Instalación:** como archivos `woff2` en `frontend/src/assets/fonts/`, con su licencia (SIL OFL 1.1) y `@font-face` en `index.css`. Son fuentes variables: un archivo por subconjunto (latin y latin-ext) cubre todos los pesos. No se piden a internet: la aplicación de escritorio tiene que funcionar sin conexión.
- **Cursivas:** también se instalan las cursivas de Next (latin y latin-ext). Con `font-synthesis: none`, sin ellas los textos en cursiva saldrían rectos.
- **Licencia:** `frontend/src/assets/fonts/LEEME.md` deja claro que las fuentes siguen bajo la OFL y no bajo la licencia general del repositorio. El texto de la licencia está en `frontend/public/licenses/`, que la compilación copia a `dist/licenses/`.
- **JPEG:** las etiquetas del JPEG usan la pila de fuentes del sistema declarada en el SVG (ver 4.4), no la fuente nueva.

## 8. Accesibilidad

- **Contraste:** el texto supera 4,5:1 y los controles y gráficos de interfaz 3:1 (medido en 4.1 y 4.2). La excepción son los colores de red suaves en Claro (4.3), que cuentan con el anillo neutro.
- **Foco visible:** contorno de 2 px del color de acento en todos los controles.
- **Teclado:** los paneles emergentes y las listas se cierran con Escape y devuelven el foco. Todo lo que aparece al pasar el ratón aparece también al llegar con el teclado.
- **Nombres y estados:** los botones que solo tienen icono llevan `aria-label`, los de alternar `aria-pressed`, y los avisos `role="alert"`, salvo el de deshacer, que anuncia una región viva (5.7).

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
- **`state/history.ts`:** el historial de deshacer (5.7). Es un store propio que se suscribe a los de selección y filtros sin cambiarlos.
- **`logic/historyStep.ts`:** función pura que describe cada paso (5.7) y decide si merece el aviso con «Deshacer».
- **`logic/regionSearch.ts` y `RegionSearch`:** el buscador de regiones (5.8).

**Fase 1.** Lo construido difiere de lo anterior en estos puntos (D3 de `docs/decisiones-diseno.md`):

- **Sin `UI_TOKENS`:** los tokens de interfaz viven solo en `index.css`. La vista previa de cada tema en Ajustes toma de ahí sus colores: cada bloque de tema se aplica también a `[data-theme-preview="<id>"]`, así que no se repiten en TypeScript.
- **Sin modo de paleta todavía:** `resolveNetworkColor(key)` y `exportColorFor(ref, kind, theme)` no lo reciben (`kind` es el tipo de atributo: color u opacidad), y `effectivePaletteMode` no existe. Llegan con la paleta suave, en la fase 2. El store ya guarda `paletteMode`, para no tener que migrar lo guardado.
- **Nombres en inglés,** como el resto del código: `theme`, `paletteMode` y `forExport`. El hook es `useDrawColors(forExport)` y el panel de Ajustes, `SettingsMenu`.
- **Token nuevo:** `nodeGap` (4.2), para que el diagrama de síntesis no conserve ningún color fijo.
- **Añadido:** `exportResolverFor(theme)` y los ayudantes tipados `ngFill`, `ngStroke` y `ngStrokeOpacity` (`theme/colors.ts`). Con ellos, una referencia `data-ng-*` mal escrita es un error de compilación.

**Fase 3.** Lo construido añade unidades que el spec no nombraba (D4 de `docs/decisiones-diseno.md`):

- **Componentes:**
  - `NetworkTag.tsx`: `NetworkTag` y `RegionSummary`, que comparten los recuadros de lectura y el detalle.
  - `DataStatus`, en `TopBar.tsx`.
  - `HistoryButtons.tsx`, con `HistoryButtonsView`, que pinta los botones sin el historial, para probarlos con cualquier estado.
  - `RegionSearchView`, en `RegionSearch.tsx`: el buscador sin estado, para probar su marcado con cualquier resultado.
- **Hooks:** `useHistoryShortcuts.ts` (los atajos de deshacer), `useRegionSearchShortcut.ts` (Ctrl+K) y `useMouseMoved.ts`, que dice si un mousemove mueve el ratón de verdad (5.8).
- **Nueve módulos de lógica pura en `logic/`,** para probarla sin DOM (10): `topBarFit`, `listbox`, `dataContext`, `displayText`, `toastQueue`, `desktopOnly`, `filterCounts`, `regionConnections` y `clipboard`.
- **Piezas compartidas:** `isTextEntry`, en `logic/historyStep.ts`, la guarda de los campos de texto que comparten los dos atajos; `shortcutLabel`, en `logic/clipboard.ts`, que escribe un atajo como en cada sistema; y `formatWeightAtMost`, en `logic/displayText.ts`, el umbral truncado (5.4).
- `SettingsPopover` es el `SettingsMenu` de la fase 1.
- `ATLASES` sigue en `App.tsx`.

**Parte 3D de la fase 4.** Lo construido añade estas unidades (D5 de `docs/decisiones-diseno.md`):

- `logic/markerSize.ts`: el radio del marcador y, en un solo sitio, lo que depende de él: el contorno, la zona de clic y la separación de la etiqueta (6.3).
- `logic/depthFade.ts`: la atenuación por profundidad. El factor, el tramo con el tamaño del cerebro que se ve, el parche de los shaders y los uniforms y las props que comparten los materiales.
- `logic/depthFadePreference.ts`: la preferencia del interruptor, guardada en el navegador.
- `logic/capture3d.ts`: las fases de la exportación y la captura fuera de pantalla.
- `components/DepthFadeToggle.tsx`: el interruptor «Atenuar lo que queda detrás».
- `exportPixelsAsJpeg`, en `logic/exportImage.ts`: el JPEG a partir de los píxeles de la captura, sin leer el lienzo.

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
- **`history`:**
  - registra los cambios de selección y de filtros, y deshace y rehace;
  - agrupa el deslizador;
  - se vacía al cambiar de atlas;
  - no registra lo que él mismo restaura;
  - respeta el límite de 50 pasos.
- **`historyStep`:** descripciones sobre casos conocidos (una región, varias, una conexión, filtros y varios cambios a la vez) y la regla del aviso: el paso quita dos o más regiones.
- **Recuadro de lectura:** el texto «N conexiones pasan los filtros (peso ≥ X)», con el singular donde toca, el umbral truncado y «(no se dibujan)».
- **`regionSearch`:**
  - sin distinguir mayúsculas ni tildes;
  - el orden de 5.8 y el límite de 8;
  - solo redes visibles, con el aviso de la red oculta;
  - el lado en las abreviaturas que no lo llevan.
- **Sin romper nada:** las pruebas actuales siguen pasando, incluida `networkSurface.test.ts`, que compara `NETWORK_COLORS` con los JSON.

El recorrido del DOM de `applyExportColors` es mínimo y se comprueba en la aplicación real, exportando con cada tema. Cada fase se verifica además con capturas del antes y el después.

**Fase 3.** 156 pruebas nuevas en 20 archivos, de 115 a 271 (D4):

- **Lógica pura:** los nueve módulos de la sección 9 (`topBarFit`, `listbox`, `dataContext`, `displayText`, `toastQueue`, `desktopOnly`, `filterCounts`, `regionConnections` y `clipboard`), `historyStep`, `regionSearch` y el store `history`.
- **Marcado,** con `renderToStaticMarkup` de `react-dom/server`, que funciona en node sin dependencias nuevas: `TopBar`, `DataContextMenu`, `Toast`, `FilterPanel`, `Connectogram`, `DetailPanel`, `HistoryButtons` y `RegionSearch`. Solo donde hay un requisito de marcado: roles, `aria-*` y botones sin anidar.

## 11. Fases

Cada fase es una decisión de diseño en `docs/decisiones-diseno.md` (numeración D: la fase 1 es la D3, la fase 3 la D4 y la parte 3D de la fase 4, la D5), con su propio commit. Todas dejan la aplicación correcta.

1. **Base de temas.**
   - Tokens de interfaz y de dibujo conectados en todos los componentes.
   - Store, persistencia y tema antes del primer render.
   - Engranaje y Ajustes con los cuatro temas.
   - Exportación correcta: atributos `data-ng-*`, `applyExportColors` y modo «exportando» del 3D.
   - Tipografía local y `accent-color`.
   - Al terminar, los cuatro temas funcionan con los colores de red originales. El tema Original tiene los mismos colores que hoy. Cambian la tipografía y el acento de las casillas y los deslizadores, que pasa del color por defecto del navegador al morado del tema.
2. **Paleta suave.** Script y tabla, `resolveNetworkColor` en todos los consumidores, y la opción «Suaves / Originales del atlas» en Ajustes. La exportación ya la sigue.
3. **Estructura.** Barra superior, contexto de datos, filtros con recuentos, cabeceras y miniaturas, panel de detalle, avisos, deshacer y rehacer, y el buscador de regiones.
4. **Gráficos.** Connectograma (etiquetas radiales, arcos, leyenda y nodos), hemisferios y cerebro 3D (surcos, marcadores, etiquetas, atenuación por profundidad y captura sin parpadeo).

Orden de implementación: 1, 3, 3D, 2 y 4. La estructura se adelantó a la paleta porque es lo que más pesaba en la petición inicial (menú superior y jerarquía). Lo propusimos nosotros y el usuario nos dejó seguir en autónomo (D4). «3D» es la parte 3D de la fase 4 (D5), adelantada a petición del usuario: los marcadores de región, atenuar lo que queda detrás y la captura sin parpadeo (6.3). Se hizo en paralelo con la fase 3, en la rama `rediseno-3d`, y se fusionó después de ella (commit `63622f0`).

## 12. Riesgos y puntos abiertos

- **Tema por defecto:** Grafito, elegido con la delegación del usuario; se le confirma al pedirle permiso para fusionar.
- **Daltonismo:** ninguna de las dos paletas lo tiene en cuenta. Una opción específica cambiaría tonos, y con ello la semántica de color, así que necesita su propia decisión.
- **Fuente en el JPEG:** se declara una pila de fuentes del sistema. Incrustar la fuente nueva en el SVG queda para más adelante. Esa pila es más ancha que la serif que usaba antes el navegador. Por eso la leyenda de la selección múltiple, que es un SVG de ancho fijo, mide su texto con la fuente de la exportación y ensancha la imagen al exportarla (D3 de `docs/decisiones-diseno.md`).
  - Desde la fase 3 (D4), la leyenda mide también su texto en pantalla y ensancha su `<svg>`, así que ya no corta las etiquetas largas. Si no cabe en el panel, su recuadro se desplaza en horizontal.
  - En la exportación, con etiquetas cortas el JPEG sale igual que antes. Con largas, sale del ancho mayor de los dos, el de la pantalla o el de la fuente de la exportación: puede salir algo más ancho que antes, pero nunca cortado.
  - Medido con TPOJ1, 3b y SCEF: la leyenda mide 402 px en pantalla, y su JPEG, 1224 px (408 × 3), igual byte a byte que antes de la fase, porque manda el ancho de la fuente de la exportación. Con etiquetas cortas, 780 px, también igual byte a byte.
- **Formato del peso en el detalle** (pregunta abierta para el usuario, D4): la lista de conexiones conserva el formato de siempre, con todas sus cifras («0.07035581528181838»). ¿Redondearlo, con el valor exacto en la etiqueta emergente?
- **Umbral en Filtros** (pregunta abierta para el usuario, D4): el recuadro de lectura y el historial truncan el umbral para no exagerarlo («3.9e-3»), y Filtros lo redondea al más cercano («4.0e-3», con `formatMinWeight`, que es del desarrollador principal). ¿Debe Filtros truncarlo también, para que los dos digan lo mismo?
- **Captura del 3D y three.js** (D5): la captura depende de un detalle interno de three.js 0.185. Su destino se marca como de WebXR (`isXRRenderTarget`) para recibir la curva de tono y la codificación sRGB, como el lienzo, con el formato interno `RGBA8` fijado. Una prueba fija esa configuración, y otra lee `WebGLPrograms.js` de three.js y falla si deja de mirar esa marca. Si three.js cambiara ese detalle, el JPEG perdería la curva de tono.
- **Para decidir el usuario tras ver las capturas** (D5):
  - **La línea media:** las etiquetas de los pares mediales, como 5m, 24dd o 6mp, siguen dobles, porque sus dos copias quedan casi a la misma profundidad, y ajustar el tramo no las separa. Lo recomendado es la oclusión real contra la superficie pintada para marcadores y etiquetas: una pasada tenue sin prueba de profundidad, como hoy, y otra a opacidad plena con ella. Las líneas se quedan con la atenuación por distancia.
  - **El mínimo de la atenuación,** hoy 0,2.
  - **El cono de dirección,** con datos que tengan conectividad efectiva: hoy tiene radio 0,035, algo mayor que un marcador normal.
- **Arcos de hemisferio:** solo aparecen si el orden de los nodos agrupa cada hemisferio. Con atlas que los alternan, no se dibujan.
- **«Original» no es la app de hoy:** conserva sus colores, pero recibe la tipografía y el acento en casillas y deslizadores (fase 1), la estructura (fase 3) y las mejoras de los gráficos (fase 4), como los demás temas.
