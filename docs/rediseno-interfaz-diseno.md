# Rediseño de la interfaz: documento de diseño

- **Fecha:** 24/09/2026
- **Estado:** aprobado por el usuario y validado por el main developer el 24/09/2026, tras tres pasadas de revisión de un agente aparte. La fase 1 está implementada: D3 de `docs/decisiones-diseno.md`, con el plan en `docs/rediseno-interfaz-plan-fase1.md`. La fase 3 también: D4 de `docs/decisiones-diseno.md`, con el plan en `docs/rediseno-interfaz-plan-fase3.md`. Y la legibilidad del cerebro 3D, la parte 3D de la fase 4, que se adelantó y se hizo en paralelo en la rama `rediseno-3d`, ya fusionada: D5 de `docs/decisiones-diseno.md`, con el plan en `docs/rediseno-interfaz-plan-3d.md`. La fase 2 también: D7, con el plan en `docs/rediseno-interfaz-plan-fase2.md`; su verificación en la app real quedó pendiente. A petición del usuario, la oclusión por la corteza sustituyó a la atenuación de la D5 (D8, 6.3), y se añadieron las marcas de regiones (D9, 5.9). Y el resto de la fase 4, los gráficos: D10, con el plan en `docs/rediseno-interfaz-plan-fase4.md`; su verificación en la app real quedó pendiente. La D6 lleva los avisos arriba a la derecha, bajo la barra (5.6). Y el tour guiado, con el botón «?» de la barra, es la D11 (5.10); su verificación en la app real quedó pendiente.
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
- Un botón de ayuda general con contenido propio, como el del lienzo. El «?» de la barra abre el tour guiado (5.10; D11).
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
- **Acento:** no hay texto sobre fondo de acento sólido. Los estados activos usan `accentSoft` como fondo, y su borde es `accentBorder`, o `accent` cuando el estado tiene que distinguirse con al menos 3:1 (WCAG 1.4.11), como la tarjeta del tema elegido y la opción marcada de «Colores de las redes», en Ajustes.
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
| `label3dText` texto de las etiquetas 3D | `#c7c5d0` | `#c9ced6` | `#cbd5e6` | `#3a3d43` |
| `label3dStrong` el de la región seleccionada | `#f3f2f7` | `#f1f3f6` | `#f2f5fb` | `#14161a` |
| `label3dBackground` su pastilla | `rgba(29, 30, 38, 0.84)` | `rgba(22, 25, 30, 0.84)` | `rgba(17, 23, 38, 0.84)` | `rgba(255, 255, 255, 0.88)` |
| `mark` marcas: pastilla y anillo (5.9, D9) | `#2563eb` | `#2563eb` | `#2563eb` | `#1d4ed8` |
| `markText` texto sobre la pastilla de marca | `#ffffff` | `#ffffff` | `#ffffff` | `#ffffff` |

Otros detalles del dibujo:

- **Contraste:** `label` y `nodeRing` superan 4,7:1 sobre su panel en los temas nuevos. En Original quedan en 4,27:1, como hoy.
- **Etiquetas del 3D** (6.3; D10): el texto es el `--text` de cada tema, y el de la región seleccionada, su `--text-h`. La pastilla es su `sceneBg` con transparencia: 0,84, y 0,88 en Claro, como el `scrim` de la maqueta en los temas nuevos (en Original, la maqueta usaba su `--bg` al 82 %). Con cualquier cosa detrás (el fondo compuesto sobre negro y sobre blanco), el texto supera 4,5:1, y `theme/themeCss.test.ts` lo comprueba: de 5,9:1 a 12,5:1, y el de la seleccionada, de 9,0:1 a 18,1:1, calculado. En Original no conservan el aspecto de antes: hasta la fase 4, las etiquetas del 3D eran texto casi negro con un contorno blanco, igual en todos los temas.
- **Grosor:** el `dash` cambia solo el patrón del discontinuo; el grosor sigue siendo el peso. Hoy, el grosor al seleccionar y las flechas de conectividad efectiva siguen su regla actual.
- **Clave desconocida:** si una clave de red no está en la tabla, se usa el color de «sin clasificar» de la paleta activa. Hoy son `"#888"` y `NEUTRAL_COLOR`: se unifica.

### 4.3 Paleta de redes: suave y original

Hay dos modos. En Ajustes se eligen junto con «Automática», que no es un tercer modo sino la elección `null` de 4.5 (5.2):

- **Originales del atlas:** `NETWORK_COLORS` tal cual.
- **Suaves:** la tabla generada `SOFT_NETWORK_COLORS[tema][clave]`, para Grafito, Noche y Claro. El tema Original no tiene columna propia: con «Suaves» usa la de Grafito.

**La paleta elegida.** La maqueta se hizo con una primera paleta, la A: bandas de luminosidad estrechas (0,60–0,90, y 0,46–0,76 en Claro), el croma recortado a un tope de 0,13 a 0,145 y una separación de ΔE_OK 0,085. Vista en la app, al usuario le pareció poco distinguible y con poco contraste: en Cole-Anticevic se confundían el rojo de Por defecto, el marrón de Multimodal posterior y el naranja de Multimodal ventral. La comparó con otras dos candidatas y con los originales, y eligió la B, intermedia (D7). Lo que sigue es el método de la B.

La tabla la genera `scripts/generate_soft_palettes.py`, solo con la biblioteca estándar de Python. Lo que sigue describe su método; el script, que parte del prototipo usado para la maqueta, es la definición exacta. Cada grupo de claves se trata por separado: una clasificación por prefijo (`cole-anticevic.`, `gordon333.`, `yeo2011-7.`, `yeo2011-17.`, `power2011.`), más un grupo con las claves de demostración sin prefijo. En OKLCH:

1. **Tono:** se conserva el de cada red. Visual sigue en azul y Por defecto sigue en rojo.
2. **Luminosidad:** se reparte linealmente del mínimo al máximo del grupo sobre la banda del tema: 0,56–0,92 en Grafito y Noche, 0,40–0,72 en Claro.
   - Los acromáticos (C < 0,02) no cuentan para el mínimo y el máximo.
   - El resultado se recorta a la banda. Hace falta para los acromáticos: sin recorte, `#000000` (salience de Gordon y de Power) quedaría fuera de ella.
3. **Croma:** el original por 0,85, como mucho el tope del tema: 0,18 en Grafito y Claro, y 0,19 en Noche. Al ser proporcional, conserva las diferencias de croma del atlas: un rojo saturado y un marrón apagado siguen siéndolo. Si el color no cabe en sRGB, se recorta el croma, por bisección, sin mover L ni el tono.
4. **Separación:**
   - Mientras dos redes del grupo queden a menos del objetivo, ΔE_OK 0,11, se sube 0,01 la L de la más clara y se baja 0,01 la de la más oscura, hasta 400 pasadas.
   - La L puede salir de la banda como máximo un margen por cada lado. En Grafito y Noche, 0,02 por abajo, para que ninguna red baje de 3:1 con el panel, y 0,06 por arriba. En Claro, 0,06 por cada lado.
   - El objetivo no es una garantía. Dentro de esos márgenes, Yeo 17 se queda en 0,097 en Grafito y Noche, y sus propios colores del atlas distan solo 0,065. Lo garantizado es un suelo de 0,095, que exigen la comprobación del script y las pruebas.
   - Este paso puede alterar el orden de luminosidad que dejó el paso 2, y meter hacia dentro de la banda a la red más oscura o a la más clara de un grupo: la comprobación lo admite hasta 0,09. En Power, Hipocampo sube 0,070, porque empieza al pie de la banda junto al negro de Saliencia, que no puede bajar más de 0,02.
5. **Sin clasificar:** `unclassified` es un gris acromático con L = (mínimo + máximo de la banda) / 2 − 0,02. Queda en `#a4a4a4` en Grafito y Noche, y en `#6f6f6f` en Claro.

Además:

- Antes de escribir, el script comprueba cada tema y grupo: la distancia mínima, el contraste con el panel (también el de Original con «Suaves»), el tono, la banda con sus márgenes, el tope del croma y las dos correcciones del prototipo. Es decir, que ninguna red con color quede casi gris, y que la más oscura y la más clara de cada grupo queden en los extremos de la banda. Si un grupo no cumple, no escribe nada.
- Con `--check`, dice si la tabla está al día, sin escribirla.
- La tabla lleva al final la copia de `NETWORK_COLORS` de la que sale (`SOFT_PALETTE_SOURCE`): si cambia una clave, un color o el orden y no se regenera, `npm test` falla.
- El orden de las claves dentro de un grupo es parte del método: el paso 4 recorre los pares en el orden de `NETWORK_COLORS`.

Resultado para Cole-Anticevic, que es la clasificación por defecto:

| Red | Original (dato del atlas) | Grafito | Noche | Claro |
|---|---|---|---|---|
| Visual | `#0000ff` | `#3666d5` | `#3364db` | `#09309c` |
| Visual 2 | `#6400ff` | `#8275f1` | `#8273f7` | `#533eb6` |
| Somatomotora | `#00ffff` | `#4ff1f1` | `#4ff1f1` | `#00aeae` |
| Cíngulo-opercular | `#990099` | `#b04aae` | `#b247b0` | `#7c0f7b` |
| Atención dorsal | `#00ff00` | `#81ea7a` | `#7bec74` | `#40ab3b` |
| Lenguaje | `#009b9b` | `#48aaa9` | `#48aaa9` | `#007474` |
| Frontoparietal | `#ffff00` | `#edee46` | `#edee46` | `#acac00` |
| Auditiva | `#fa3efb` | `#e67ee4` | `#e97ae7` | `#aa45a9` |
| Por defecto | `#ff0000` | `#fb6b5a` | `#fc6352` | `#bd3024` |
| Multimodal posterior | `#b15928` | `#bb6f48` | `#be724b` | `#853e14` |
| Multimodal ventral | `#ff9d00` | `#f8a544` | `#f8a544` | `#b56e00` |
| Orbito-afectiva | `#417d00` | `#61953f` | `#61953f` | `#326300` |

Comprobación, con el ΔE_OK mínimo entre dos redes del grupo y el contraste mínimo con el panel:

| Grupo | Grafito | Noche | Claro | Original con «Suaves» (columna de Grafito sobre `#1d1e26`) |
|---|---|---|---|---|
| Demostración | 0,110 / 3,47 | 0,110 / 3,52 | 0,111 / 2,52 | 0,110 / 3,27 |
| Cole-Anticevic | 0,115 / 3,37 | 0,113 / 3,39 | 0,111 / 2,43 | 0,115 / 3,17 |
| Gordon 333 | 0,117 / 3,67 | 0,113 / 3,72 | 0,111 / 2,13 | 0,117 / 3,45 |
| Yeo 7 | 0,154 / 3,48 | 0,156 / 3,53 | 0,137 / 2,42 | 0,154 / 3,27 |
| Yeo 17 | 0,097 / 3,20 | 0,097 / 3,25 | 0,108 / 1,97 | 0,097 / 3,02 |
| Power 2011 | 0,111 / 3,51 | 0,112 / 3,56 | 0,111 / 1,98 | 0,111 / 3,30 |

- **Contraste con el panel:** con los originales, el mínimo de cada clasificación queda entre 1,11 y 2,05 sobre el panel de Grafito. Con la paleta suave, entre 3,20 y 3,67 en Grafito y entre 3,25 y 3,72 en Noche. Original con «Suaves» queda en 3,02 como mínimo, justo por encima de 3:1 (12).
- **En Claro:** entre 1,97 y 2,52 contra blanco, mejor que los originales contra blanco (1,03–1,17). El anillo neutro (principio 6) mantiene visibles los nodos.
- **Distinción entre redes:** el ΔE_OK mínimo queda en 0,108 o más en todos los grupos, salvo Yeo 17 en Grafito y Noche (0,097), que aun así mejora al de sus colores originales (0,065).
- **Tono:** se desvía como mucho 1,19° en Grafito y Noche, y 1,46° en Claro.

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
- Los materiales de la selección, los marcadores, las líneas, los conos de dirección, las etiquetas con su pastilla (6.3) y la malla de referencia de `ReferenceMesh` usan los tokens de exportación.

`ExportBridge` espera un fotograma dibujado con esos colores, lo captura y restaura el modo normal. Así la selección no desaparece sobre el blanco.

### 4.5 Elección y persistencia

- **Estado:** `{ tema, modoPaleta }`. `modoPaleta` vale `"suave"`, `"original"` o `null`, que es automático: `"original"` en el tema Original y `"suave"` en los demás.
- **«Automática»:** `null` se elige en Ajustes como «Automática», la opción de por defecto (5.2). Elegirla después de otra vuelve al automático.
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
5. **Acciones:** «Importar» (botón secundario con icono; etiqueta emergente «Importar una síntesis de IA»), el botón «?» del tour guiado (5.10; D11) y el engranaje de Ajustes.

**Ancho.** La barra va en una fila. Si no cabe, pliega lo secundario por este orden, y solo lo que haga falta:

1. «Datos reales» se queda en su punto. «Datos de demostración» nunca se pliega: es un aviso.
2. «Importar» se queda en su icono.
3. Las pestañas de síntesis inactivas se quedan en su icono.
4. Las pestañas de vista inactivas se quedan en su icono. Son la navegación principal: lo último que se pliega.

- Lo plegado conserva su nombre para los lectores de pantalla y su etiqueta emergente, que aparece también con el foco del teclado. El punto de «Datos reales» no se enfoca.
- La barra mide si cabe y elige el menor paso que basta (`logic/topBarFit.ts`, atributo `data-collapse`), en lugar de puntos de corte fijos. Lo que ocupa depende del contenido: el atlas y la clasificación, datos reales o de demostración, y cuántas síntesis hay y cómo se llaman. Si ni así cabe, pasa a dos filas.
- Medido en la vista Atlas, con HCP-MMP1.0, Cole-Anticevic y datos reales (D4), siempre en una fila de 56 px. Fue antes del botón «?» (D11), que ocupa 44 px más con su hueco: con él, cada paso llega algo antes, sin medir en un navegador.
  - 1600, 1440, 1400 y 1366 px: no se pliega nada.
  - 1280 px: solo «Datos reales».
  - 1152 px: también «Importar». Se ven los cuatro nombres de vista.
  - 1024 y 900 px: todo. Solo la pestaña activa conserva su nombre.
  - 1400 px con una síntesis de nombre largo: «Datos reales» e «Importar». Con dos, también los nombres de las síntesis, y lo mismo a 1280 px; a 1024 px, todo.

### 5.2 Ajustes

Un panel emergente que sale del engranaje:

- **Tema:** cuatro tarjetas con vista previa (fondo, panel y cinco colores de red) y una descripción de una línea. Cada tarjeta enseña la paleta que tendría su tema: la elegida o, con «Automática», la automática de ese tema.
- **Colores de las redes:** un control de tres opciones, «Automática», «Suaves» y «Originales del atlas» (D7). Eran dos, pero así no se podía volver al automático: los radios nativos marcan al moverse con las flechas, y con solo recorrer el grupo quedaba fijada una elección.
  - «Automática» es la elección `null` (4.5) y la de por defecto. Lleva la línea «Automática: suaves en los temas nuevos; originales en Original.».
  - Son radios nativos en un `role="radiogroup"`, con la nota como descripción. El radio queda oculto (`.visually-hidden`) y su etiqueta hace de botón. La opción marcada lleva el borde, el fondo y el anillo del acento, como la tarjeta del tema elegido (4.1).
  - Tab entra en la opción marcada, y las flechas cambian de opción y dan la vuelta en los extremos. Van a mano (`logic/radioGroup.ts`): WebKit, el motor de Tauri en Linux, no da la vuelta y deja sin anillo de foco el radio al que llega.
  - Debajo, una muestra con las doce redes de Cole-Anticevic en la paleta que se aplica, y la nota: «Los originales son los del archivo de cada atlas: úsalos si una figura tiene que coincidir con la del artículo». La muestra es decorativa y no lleva etiquetas emergentes, que solo alcanzaría el ratón (8).
- Se cierra con Escape, con un clic fuera, cuando el foco sale del engranaje y el panel (con Tab, también tras un clic en un texto del panel) o con su botón. Con Escape o con su botón, el foco vuelve al engranaje. Con un clic fuera, el foco se queda donde se hizo clic.
- **Tamaño:** la sección de colores lo alarga entre 160 y 185 px, calculado y sin medir en un navegador. Si no cabe en la ventana, se desplaza por dentro (`max-height`); a 900 × 600, previsiblemente (D7).

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
- **Leyenda del connectograma:** abajo a la izquierda, bajo el dibujo y fuera del SVG, así que no se exporta. Solo en la vista grande. Tiene cuatro entradas:
  - «Evidencia no directa (indirecta o hipótesis)», con muestra discontinua.
  - «Evidencia directa», con muestra continua.
  - «Efectiva (con dirección)», con muestra de flecha.
  - «Color del punto = red».

  Cómo quedó (D10):
  - **Bajo el dibujo, no encima** (decisión del usuario, 25/09/2026). En la maqueta iba encima, en la esquina: allí el radio del círculo es 0,39 del lado, y en la app, de 0,43 a 0,47. Encima habría tapado, calculado, una docena de nodos a 1400 × 900, con sus etiquetas, y la lupa en esa esquina. Ocupa su propia fila en la vista, y el hueco del dibujo se queda con el alto que sobra: el círculo se ajusta a él. A 1400 × 900, el lado del dibujo baja de 666 a unos 615 px, calculado.
  - **Aspecto:** una lista con nombre («Leyenda del connectograma», `role="list"`), sobre el panel, con su mismo fondo y un borde `--border`. Letra de 0,7rem en `--text-muted`, que supera 4,5:1 sobre el panel (4.1), y sin selección de texto al arrastrar (5.9).
  - **Muestras:** un `<svg>` decorativo del color del texto (`--text`). Las de las dos líneas son de 1 px y con extremos rectos, como las líneas del dibujo, y la discontinua lleva el `dash` del tema.
  - **Filas:** las entradas van en una fila, y en dos o tres si no caben, con 8 px entre entradas y 6 entre la muestra y su texto. A 1400 × 900 caben en una: unos 771 px de 776, calculado y sin medir en un navegador.
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
- **Dónde:** arriba a la derecha, bajo la barra y sobre la columna derecha, con su ancho (300 px, a 12 px de la barra y del borde derecho), apilados hacia abajo: el más reciente queda abajo (D6).
  - Su altura sale de `--topbar-bottom`, que publica la barra al medirse: si la barra ocupa dos filas, los avisos bajan con ella.
  - No tapan la vista grande ni su recuadro de lectura, Filtros, la barra ni el pie del panel de detalle.
  - Mientras se ven, tapan la cabecera de la primera miniatura, con su «Ampliar»: es el precio aceptado (D6). La D4 los había puesto abajo a la derecha por eso, pero allí el aviso de «Importar» salía lejos del botón y tapaba el pie del panel de detalle.
  - Quedan por debajo del panel de Ajustes y de las listas desplegables. Escala de `z-index`: las vistas, 1 como mucho; los avisos, 10; Ajustes y las listas, de 20 a 25; las etiquetas emergentes, 30.
  - Si no caben en la ventana, se desplazan por dentro, también con la rueda del ratón.
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

### 5.9 Marcar regiones

Petición del usuario (25/09/2026). Al arrastrar sobre el connectograma, el navegador seleccionaba las etiquetas como texto y las pintaba de azul, y él propuso convertirlo en función: «una cosa es activar red y otra seleccionar». Las marcas son una capa aparte de la selección. Seleccionar sigue activando la red de la región, con sus conexiones y el foco del 3D. Marcar solo resalta, para localizar regiones de un vistazo en todas las vistas, sin cambiar lo que se dibuja. Diseño aprobado por el usuario el mismo día.

- **Gesto:**
  - Ctrl+clic en un nodo marca o desmarca la región, en el connectograma (también en la lupa), en los hemisferios y en el 3D. En el 3D vale sobre el marcador, sobre su etiqueta (6.3; D10) y, con la corteza pintada, sobre la región.
  - En macOS, Cmd+clic, porque allí Ctrl+clic abre el menú contextual.
  - El clic normal sigue seleccionando, como hasta ahora.
- **Teclado:** en el buscador de regiones (5.8), Ctrl+Intro marca o desmarca la sugerencia activa, en lugar de seleccionarla. La línea de avisos del buscador lo recuerda.
- **Cómo se ven,** con un color de marca nuevo por tema, un azul como el de la selección de texto que vio el usuario:
  - En el connectograma y los hemisferios, la etiqueta de la región va sobre una pastilla del color de marca, con texto de contraste, y el nodo lleva un anillo exterior del mismo color, separado del nodo por un hueco del color del fondo. Así se distingue aunque la red sea azul.
    - En el connectograma, la pastilla gira con la etiqueta radial: sale de la misma función (6.1; D10).
    - Si la región está seleccionada, el anillo de la marca se queda donde estaba y va encima del halo de selección, que asoma por fuera (6.1).
  - En el 3D, marcador y etiqueta con ese anillo y esa pastilla, también fuera de la selección y también con el mapa entero pintado. La etiqueta empieza pasado el anillo (6.3). Con la oclusión (6.3), una marca que queda detrás de la corteza se ve tenue, como lo demás.
  - La pastilla y el anillo pasan 3:1 sobre el fondo de los cuatro temas, y el texto de la pastilla 4,5:1.
- **Filtros:** una línea bajo la selección (5.3), solo cuando hay alguna marca (decisión del usuario, 25/09/2026; D9). Sin marcas no hay línea; queda solo una región viva oculta, que anuncia «Ninguna región marcada» al quitar la última (`dec7cad`, fusión `7b9e161`). Lleva «Marcadas: N» con sus nombres (los primeros, y «y N más») y un botón «Quitar marcas». Si una región marcada queda oculta por los filtros, no se dibuja, y la línea lo dice («1 oculta por los filtros»).
- **Deshacer y rehacer** (5.7): marcar, desmarcar y «Quitar marcas» son pasos del historial, con su descripción («marcar IFJa (der.)», «quitar las marcas (5)»). «Quitar marcas» con dos o más marcas da además el aviso con «Deshacer» (5.6): es el mismo caso que quitar dos o más regiones de la selección de un golpe, que es lo que llevó al usuario a pedir el deshacer.
- **Duración:** no se guardan. Se pierden al recargar la página, y al cambiar de atlas se vacían (los identificadores de región ya no valen); ese vaciado no es un paso del historial. Al cambiar de clasificación de redes se conservan: las regiones son las mismas.
- **Exportación:** las marcas solo existen en pantalla; los JPEG salen como sin ellas (decisión del usuario). Los elementos de las marcas llevan un atributo que la exportación de SVG quita del clon, y el 3D no las dibuja mientras captura.
- **Además:** los dibujos (connectograma, hemisferios y leyenda) dejan de seleccionar texto al arrastrar (`user-select: none`). Las barras azules que vio el usuario eran esa selección.

### 5.10 Tour guiado

Petición del usuario (25/09/2026): un tutorial práctico de unos dos minutos, en tono cercano, que explique las funciones clave con un ejemplo real y en el que la app haga sola lo que explica.

- **Dónde:** un botón «?» (Ayuda) en la barra superior, junto al engranaje de Ajustes. El tour solo se abre con ese botón; no se ofrece por su cuenta (decisión del usuario).
- **Componente:** driver.js 1.8.0 (MIT, sin dependencias). Lleva los colores, la tipografía y el anillo de foco de la app, con los tokens del tema, en los cuatro temas. Una caja anclada al elemento del que habla, con esa zona iluminada y el resto atenuado.
- **Controles:**
  - «← Anterior», «Siguiente →» y «Salir». Salir también con Escape.
  - «▶ Automático»: avanza solo, unos 8 s por paso; se pausa con cualquier otro control.
  - El paso actual: «3 de 13».
  - Teclado: las flechas y Escape. El foco va a la caja y, al salir, vuelve al botón «?».
- **Modo demo:** en cada paso, la app hace la acción que explica: mostrar u ocultar redes, resaltar, añadir, seleccionar, buscar, marcar, mover el peso, activar la lupa o cambiar de vista. Retroceder deshace la acción del paso.
- **El montaje del usuario queda intacto.**
  - Al empezar, se guarda el estado: atlas, clasificación de redes, selección, filtros, marcas, vista grande, lupa, texto del buscador e historial de deshacer.
  - Al salir, en cualquier paso, se restaura todo tal como estaba.
  - Los pasos del tour no quedan en el historial.
- **Ejemplo real:** HCP-MMP1.0 con las redes de Cole-Anticevic, y la red frontoparietal, la que se enciende cuando algo exige atención. Si el atlas o la clasificación activos son otros, el tour cambia a estos y, al salir, vuelve a los del usuario. Si no hay datos reales, solo explica, sin hacer las acciones, y lo dice.
- **Los verbos, bien separados.** Es lo que más importa que quede claro:
  - **Mostrar u ocultar** una red, con su casilla: qué se dibuja.
  - **◎ Resaltar** una red: la selección pasa a ser solo esa red. Es exclusivo: sustituye lo que había.
  - **+ Añadir** una red: la suma a lo que ya está seleccionado.
  - **Seleccionar** una región, con un clic: la añade o la quita de la selección; se ven sus conexiones en las tres vistas.
  - **Marcar** una región, con Ctrl+clic o Ctrl+Intro en el buscador: solo la señala para encontrarla, sin cambiar lo que se dibuja (5.9).
- **Guion,** en tono cercano, de tú y con frases cortas; unos dos minutos:
  1. **Bienvenida:** qué va a enseñar, que puede ir a su ritmo o darle a ▶, y que su trabajo queda como estaba.
  2. **Atlas y redes,** en la barra: qué es cada cosa. Deja HCP-MMP1.0 y Cole-Anticevic.
  3. **Mostrar u ocultar,** con las casillas: oculta todas menos Frontoparietal y Lenguaje. «Así cruzas redes sin perderte entre 64.000 conexiones».
  4. **◎ Resaltar Frontoparietal:** «ojo, es exclusivo: te quedas solo con ella».
  5. **+ Añadir Lenguaje:** «y esto la suma a lo que ya tienes».
  6. **Peso mínimo:** lo sube hasta que el dibujo respira; el recuadro dice cuántas conexiones quedan.
  7. **Seleccionar IFJp (izq.),** un nudo de la red frontoparietal: empieza de cero con ella.
  8. **Buscador** (Ctrl+K): escribe «TE1m». Su red está oculta, así que el buscador lo dice y ofrece «Mostrar la red»; con Intro se añade a la selección.
  9. **Marcar V1 (izq.)** con Ctrl+clic: la pastilla azul y la línea «Marcadas» en Filtros.
  10. **Lupa:** con 360 puntos a 5 px, amplía lo que hay bajo el ratón y el clic va al nodo más cercano.
  11. **Cambiar de vista** con «Ampliar» en el 3D: la selección y las marcas se mantienen; lo que queda detrás de la corteza se ve tenue.
  12. **Deshacer y rehacer:** Ctrl+Z y Ctrl+Mayús+Z, también para las marcas.
  13. **Fin:** devuelve el montaje y recuerda el botón «?».
- **Accesibilidad:**
  - La caja es un diálogo con nombre y descripción, y el cambio de paso se anuncia.
  - Con `prefers-reduced-motion`, sin animaciones.
  - Se lee y se maneja entera con el teclado.
- **No se exporta ni se guarda.**
- **Además, por coherencia de palabras:** los botones «Todas» y «Ninguna» de las redes dicen «Mostrar todas las redes» y «Ocultar todas las redes» en su texto emergente, porque «marcar» es ahora otra cosa (5.9).

Cómo quedó (D11):

- **El botón «?»** es un icono de ayuda, entre «Importar» y el engranaje, con el nombre y la etiqueta emergente «Ayuda: tour de 2 minutos», que se ve también con el foco del teclado.
- **La caja** mide 300 px: al lado de la vista grande cabe en la columna de la derecha. Arriba lleva el paso, «3 de 13», y «Salir», un botón de texto como «Limpiar»; abajo, «▶ Automático» y «← Anterior», con el patrón de «Exportar JPEG», y «Siguiente →», con el del «Deshacer» de los avisos. En el último paso, «Siguiente →» es «Terminar». Lo demás se atenúa con `--bg` al 60 %.
- **Un clic en lo atenuado no hace nada:** se sale con «Salir» o con Escape, para no perder el tour por un clic de más.
- **Automático:** 8 s por paso, y en los largos, 250 ms por palabra hasta 12 s: el tour entero dura 1 min 50 s. Se para en el último paso.
- **Cada paso entra en lo que dejó el anterior** y la app hace su acción al poco (0,8 s), así que volver atrás deshace el paso siguiente y repite el suyo. «Atlas y redes» parte de cero: HCP-MMP1.0 con Cole-Anticevic, todo a la vista, nada seleccionado ni marcado y el connectograma en grande.
- **Peso mínimo:** se prueban 1, 2 y 5 por cada potencia de diez, y queda el que deja entre 300 y 600 conexiones de Frontoparietal y Lenguaje, lo más cerca de 450. Con los datos de hoy, 1.0e-3: 442 de 2628.
- **Buscador:** escribe «TE1m» y, a los 3 s, Intro añade TE1m (der.) y el campo se vacía, como en la app. Mientras, se ve el aviso de TE1m (izq.) con «Mostrar la red».
- **Marcar V1 (izq.):** V1 está en la red Visual, oculta desde el paso 3. El tour la muestra antes con su casilla, para que se vea la pastilla, y después la marca.
- **Lupa:** es el único paso en que el connectograma señalado admite el ratón, para probarla.
- **Cambiar de vista:** el paso entra con el 3D en miniatura y lo amplía.
- **Deshacer y rehacer:** ↶ y ↷ enseñan el historial del propio tour (la marca de V1), y el paso deshace y rehace con las funciones de la app.
- **Fin:** el montaje ya está devuelto cuando se ve el paso.
- **Textos:** cada paso tiene lo que explica, que vale con y sin datos reales, y lo que hace la app, solo con datos reales. Antes de empezar el ejemplo se comprueba que los datos cuentan lo que dicen los textos: 360 regiones, más de 64 000 conexiones, IFJp (izq.) en Frontoparietal, TE1m (izq.) en una red oculta y (der.) como la que añade Intro, y V1 (izq.) en Visual. Si algo no cuadra, solo explica y lo dice.
- **Sin datos reales,** el tour solo lleva a la vista Atlas y despliega Filtros y sus secciones, para señalar.
- **Al salir,** primero vuelven el atlas y la clasificación, y se espera a sus datos: al llegar, App vacía el historial. Luego la selección, los filtros y las marcas, con sus mismos Set, y el historial tal cual, salvo si los datos cayeron a los de demostración. Por último, las secciones de Filtros, el texto del buscador, la lupa, la vista grande, Filtros plegado y la pestaña. Mientras dura el tour, el historial no registra nada.
- **Atajos:** mientras dura, Ctrl+Z, Ctrl+Mayús+Z, Ctrl+Y y Ctrl+K no actúan.
- **Anclas:** `data-tour` en el contexto de datos, cada vista, la selección, el buscador, la sección de redes y cada red (con `data-network`), el peso mínimo y el botón «?». Mientras se señala la fila de una red, ◎ y + se ven.

## 6. Gráficos, sin cambiar lo que representan

### 6.1 Connectograma

- **Etiquetas:** van por fuera del anillo, en dirección radial y giradas con el ángulo del nodo. En la mitad izquierda se giran 180° y se alinean al final, para leerse de izquierda a derecha. Es lo contrario de la lupa, que las pone hacia dentro. El tamaño sigue la regla actual según el número de nodos.
  - **La regla exacta** (D10): la mitad izquierda es `ux < 0`, el mismo criterio que la lupa, y arriba y abajo del todo van en vertical. La separación es la de siempre, el radio del nodo + 7 px, en la dirección que va del centro al nodo. La regla de tamaño tampoco cambia: 5,5 px con más de 150 nodos, 7 con más de 40 y 9 con 40 o menos; la seleccionada o la que tiene el ratón encima, 1,5 px mayor y en negrita. La pastilla de una región marcada (5.9) sale de la misma función, `radialLabel`, y gira con la etiqueta.
  - **Sitio para la más larga** (decisión del usuario, 25/09/2026; D10): el anillo deja entre él y el borde del dibujo lo que ocupa la etiqueta más larga, para que ninguna se corte. Cuenta la etiqueta ampliada, la de una región seleccionada o con el ratón encima (negrita, letra 1,5 px mayor y nodo 3 px mayor), con la pastilla de una marca alrededor. Antes, el margen era siempre de 40 px (radio = lado / 2 − 40), y las etiquetas largas se cortaban por los lados.
    - El ancho se estima sin DOM (`estimatedLabelWidth`). Las letras cuentan por grupos, con el avance medio de cada grupo medido en el archivo de Atkinson Hyperlegible Next de peso 700: las estrechas, 0,36 em; las anchas, 0,68; las demás, 0,57. Se suma un 10 % de seguridad y el espaciado entre letras de la página, 0,18 px, el de `:root` en `index.css`.
    - Los 40 px son el mínimo, y el radio no baja de la mitad del de siempre: en un dibujo muy pequeño con etiquetas muy largas, las más largas se cortan antes de que el círculo quede en un punto. La miniatura conserva los 40 px: a ese tamaño, las etiquetas no se leen.
    - **Un radio por atlas** (decisión del usuario, tras la revisión): el margen cuenta las etiquetas de todas las regiones del atlas, también las que ocultan los filtros, así que el círculo no cambia al mostrar u ocultar redes. La letra sigue contando los nodos que se ven: si su número cruza 40 o 150, la letra cambia, y el radio con ella.
    - Radios, calculados con un lado de 666 px, donde antes eran 293: HCP-MMP1.0, 291,0; Brainnetome, 264,6; Gordon 333, 246,6; Subcórtex, 187,7, un 36 % menos por sus etiquetas de 21 letras (12). A 1400 × 900, con la leyenda debajo (5.4), el lado baja a unos 615 px y cada radio, unos 25,5 px: HCP-MMP1.0 queda en unos 265,5 px, un 9,4 % menos que antes.
- **Arcos de hemisferio:** dos arcos finos por fuera, rotulados IZQUIERDO y DERECHO. Solo se dibujan si, en el orden actual, los nodos de cada hemisferio forman un único bloque seguido y ninguno tiene `hemisphere` nulo. El orden de los nodos no se toca.
  - **Cuándo** (D10): con los dos hemisferios presentes, cada uno en un solo bloque seguido, contando que el círculo se cierra (un bloque puede pasar por el principio del orden). Se mira sobre los nodos que pasan los filtros. Con un solo hemisferio no hay arcos. Con los datos de hoy, HCP-MMP1.0 los tiene (180 regiones del derecho y luego 180 del izquierdo); Brainnetome, Gordon 333 y el Subcórtex no, porque alternan, y el Subcórtex tiene además una región sin hemisferio.
  - **Dónde:** a 34 px del anillo como poco, o más lejos, para quedar 3 px por fuera de la etiqueta más larga en reposo; el margen del anillo les deja sitio. En HCP-MMP1.0 quedan a 34 px, y una etiqueta larga ampliada los cruza por encima. Cada uno va del borde de su primer nodo al de su último, menos 4° a cada lado; con un bloque muy corto, menos.
  - **Cómo:** 1,5 px, extremos redondos y el token `edge` opaco, el del contorno de las elipses de los hemisferios (6.2). La maqueta usaba `faint`, que queda por debajo de 3:1 (8).
  - **Rótulos:** en las esquinas de arriba, a 10 px del borde, cada uno del lado en que queda el punto medio de su arco; si los dos quedan igual de centrados, el izquierdo a la izquierda. Letra de 10 px, peso 600 y 1 px de espaciado, con el token `label`, como los rótulos de los hemisferios.
  - **En la miniatura,** sin rótulos, como en la maqueta, y a 34 px del anillo. Si la etiqueta más larga en reposo llegara a menos de 3 px de ellos, no se dibujan: pasa con abreviaturas largas y letra grande, como las del IPL, y con HCP-MMP1.0 cuando se ven 150 regiones o menos, con su letra de 7 px.
  - Se exportan: son parte del dibujo.
- **Líneas:** la misma geometría (curva por el centro), la misma regla de grosor y los tokens de color, opacidad por estado y `dash` de 4.2.
- **Nodos:**
  - Relleno con el color de red del modo activo y anillo `nodeRing` de 1 px.
  - El seleccionado lleva anillo `selected` de 2,5 px, como hoy, más un halo del mismo color al 35 %, en todos los temas.
    - **El halo** (D10): un anillo de 2 px, a 2 px del contorno, como en la maqueta, con `stroke-opacity` fija de 0,35. Se exporta con el `selected` de la exportación (`data-ng-stroke`); su opacidad no lleva referencia. Va en un grupo propio encima de los nodos: tiñe un poco a las vecinas y queda encima de sus etiquetas, que en la maqueta quedaban encima de él (12).
    - **Con una marca** (5.9), el anillo de la marca se queda donde estaba, justo por fuera del contorno, y va encima del halo, que asoma por fuera: en HCP-MMP1.0, el halo va de 9,25 a 11,25 px del centro de la región, y el anillo, de 8,75 a 10,25. La punta de la pastilla de la etiqueta tapa cerca de 1 px del halo.
    - **En la lupa,** la región seleccionada lleva también su halo, debajo del anillo de su marca. Va con su nodo, así que las vecinas que se dibujan después pueden taparlo, y llega hasta el principio de su etiqueta, que allí va hacia dentro.
  - El resaltado al pasar el ratón usa `hoverHighlight` (decisión 76c).

### 6.2 Hemisferios

La geometría y el cálculo son los mismos. Los colores salen de los tokens de 4.2. Las elipses se rellenan con `hemiFill`, que en Original es `none` como hoy, y su contorno usa `edge` opaco. El texto usa la tipografía nueva.

### 6.3 Cerebro 3D

- **Surcos más visibles:** `sulcRange` pasa a devolver los percentiles 5 y 95 en lugar del mínimo y el máximo. `fillVertexColorsByIndex` aplica un suavizado (smoothstep) al valor normalizado.
  - Los percentiles se calculan una vez por archivo de surcos.
  - Se aplica en todos los temas; Original conserva sus grises de 0,35 y 0,72.
  - **Cómo** (D10): los percentiles interpolan entre los dos valores más cercanos, el método por defecto de numpy, sin contar los vértices sin dato. Se guardan en un `WeakMap` con el propio vector del archivo: se calculan una vez por cada carga, no en cada repintado (al cambiar de atlas, el archivo se vuelve a leer). En el archivo de `fsLR 32k`, el rango pasa de −1,69…1,16 a −0,85…0,56. El valor normalizado se recorta a 0-1, porque fuera de los percentiles queda por debajo de 0 o por encima de 1, y pasa por el smoothstep (`sulcShade`).
  - **También en las regiones con color** (decisión del usuario, 25/09/2026): el mismo valor suavizado oscurece en los surcos las regiones pintadas con el color de su red, también con el mapa entero pintado. El factor sigue entre 0,7 y 1, pero más vértices llegan a los extremos.
- **Marcadores de región:** el radio base se reduce a la mitad, de 0,06 a 0,03, y el de la región seleccionada queda un 40 % mayor que el resto (0,042). Así no tapan la región pintada. Lo que dependía del radio se ajusta con él (D5):
  - El contorno neutro del marcador tiene que seguir viéndose en nodos `#000000`. Pasa de escala 1,18 a 1,36, y así conserva el grosor absoluto de antes (0,0108).
  - La zona de clic conserva el radio de antes (0,06, y 0,09 en la región seleccionada), en una esfera invisible: seleccionar con un clic no cuesta más.
  - La etiqueta quedaba a 0,18 del borde del marcador, en +Y de los datos, como antes en uno normal. Desde la fase 4 va a su lado, en pantalla (Etiquetas 3D, abajo).
- **Etiquetas 3D** (`logic/textSprite.ts`):
  - Usan la tipografía nueva, con el texto y un fondo translúcido del tema.
  - La caché pasa de indexarse por texto a indexarse por texto, tema y una versión de fuentes, que sube cuando `document.fonts.load(...)` termina. Así las etiquetas se regeneran al cambiar de tema y cuando llega la fuente.
  - **Pastilla** (D10): todas van sobre una pastilla, como ya iban las de una región marcada (5.9), y una sola función dibuja las dos. Las de siempre llevan el texto del tema, `label3dText`, sobre su fondo translúcido, `label3dBackground` (4.2); las marcadas, los colores de marca. Van también en las vecinas de una región con muchas conexiones (decisión del usuario, 25/09/2026), aunque tapen más corteza que el texto con contorno de antes. El lienzo mide 84 px de alto para una letra de 44, así que el texto sale del tamaño de antes, con 34 px de margen a cada lado.
  - **Letra:** `600 44px 'Atkinson Hyperlegible Next', system-ui, sans-serif`, el peso de las etiquetas del connectograma. La textura va en sRGB, y el material, sin curva de tono (`toneMapped={false}`), como la pastilla y el anillo de las marcas: los colores salen como en los SVG.
  - **La de la región seleccionada destaca,** como en la maqueta: el texto fuerte del tema (`label3dStrong`, el `--text-h`), peso 700 y 13/12 más alta. Los colores de marca, si los hay, ganan.
  - **Caché:** la clave es el texto, los dos colores, el peso y la versión de fuentes. Los colores representan el tema y cubren también la exportación (mientras se captura, los de exportación) y las marcas. Cuando la versión sube, las texturas de la anterior se liberan (`dispose`).
  - **Versión de fuentes:** `state/labelFont.ts`, un store de zustand. `Brain3D` pide la fuente al montar, una sola vez; cuando `document.fonts.load(...)` termina, la versión sube y las etiquetas se vuelven a dibujar. Si no llega, o si `load` lanza una excepción, se quedan con la de respaldo, sin error.
  - **Al lado del marcador** (decisión del usuario, 25/09/2026): a la derecha de su marcador en pantalla y centrada en vertical, como en la maqueta. Con la pastilla en el sitio de antes, 0,21 más arriba en +Y de los datos, tapaba su propio marcador y los de las vecinas, porque con la corteza pintada se dibuja encima de todo. El sprite está en el centro del marcador, a su misma profundidad, y su ancla (`Sprite.center` = [−inicio / ancho, 0,5]) lo lleva hasta el inicio: el contorno (radio × 1,36) más 0,015, o el borde del anillo de la marca en una región marcada. Con el margen transparente de la textura, el hueco que se ve es de unas 0,024 unidades, unos 3 px en la vista de partida.
  - **Clic** (decisión del usuario, 25/09/2026): un clic en la etiqueta selecciona su región, o la deselecciona, y Ctrl+clic (Cmd+clic en macOS) la marca o la desmarca, como en el marcador, también con la corteza pintada. La etiqueta recibe el rayo antes que lo demás (`raycastLabelFirst`, que adelanta sus impactos), corta el clic (`stopPropagation`) y no hace nada al soltar un arrastre. Así evita tres conductas del código del desarrollador principal, que no cambian (12).
  - **Exportación:** mientras se captura, los colores son los de exportación (4.4). Con los temas 2 a 4, el texto de Claro sobre blanco al 88 %; con Original, los de Original, texto claro sobre una pastilla oscura, sobre el blanco del JPEG. Salen con la fuente de la interfaz, porque son texturas que la aplicación dibuja con ella (7).
- **Fondo y materiales:** `SCENE_BG` deja de ser constante en `Brain3D.tsx`, `Tractography3D.tsx` y `TractographyNodes3D.tsx` y pasa a ser el token `sceneBg`. Los materiales usan los tokens de 4.2.
- **Oclusión por la corteza** (petición del usuario, 25/09/2026). Sustituye a «Atenuar lo que queda detrás» (D5), que el usuario descartó: dependía de la distancia a la cámara y no de lo que tapa la corteza, así que en un primer plano no cambiaba nada.
  - **Qué se ve.** Con la corteza pintada, lo que ella tapa se ve tenue, y más cuanto más hondo queda. Lo que está delante, o en la misma superficie, se ve entero. Vale para las líneas, los marcadores con su contorno, los conos de dirección y las etiquetas. En la vista lateral, lo que queda detrás de la corteza que se ve, como las regiones del otro hemisferio, se ve tenue. En la prueba de humo (D8), con la vista lateral de partida, 5m, OP4 y V1 izquierdas se ven tenues, y 4, 3b y 6mp derechas, enteras. No hay interruptor: es como se dibuja.
  - **Cómo.** En cada fotograma, antes de dibujar la escena, la corteza sola se dibuja en un destino fuera de pantalla con textura de profundidad. Lo hace con la misma cámara y el mismo hemisferio visible, y se separa del resto con una capa de three.js. Cada fragmento de la capa de foco lee esa profundidad en su posición de pantalla y calcula cuánto queda detrás de la corteza, en el eje de la cámara. Su opacidad se multiplica por 1 − (1 − mínimo) · smoothstep(inicio, fin, detrás).
    - La pasada es un `useFrame` de prioridad 0,5, entre los controles (0) y `ExportBridge` (1), que dibuja el lienzo.
    - La corteza va en la capa 1, y las luces también, aunque en la pasada no alumbran nada: si el número de luces cambiara entre la pasada y el lienzo, three.js revisaría en cada fotograma el programa de cada material con luces (D8).
    - Solo con la corteza pintada llevan los materiales el parche, y solo entonces pasan los marcadores y los conos a `transparent`.
  - **Valores:** inicio 0,25 (10 mm), fin 0,75 (30 mm) y mínimo 0,2. La verificación con capturas que debía ajustarlos se interrumpió; el usuario los vio en la app y los aprobó tal cual (D8). El inicio cubre la mitad del marcador que queda bajo la superficie, con su contorno (0,057 en la región seleccionada). La etiqueta va a la profundidad del centro de su marcador desde la fase 4 (Etiquetas 3D, arriba); antes iba 0,21 más arriba en +Y de los datos, y el inicio la cubría también, vista desde detrás. El valor se deja como estaba (D10).
  - **Sin prueba de profundidad contra la corteza,** como hasta ahora. La opacidad hace la oclusión, y lo que queda un poco por debajo de la superficie, como la mitad de un marcador en su vértice ancla, no se corta de golpe.
  - **Líneas.** Van en recta entre dos puntos de la corteza y pasan por dentro de ella.
    - Una línea entre regiones cercanas apenas se hunde y se ve entera.
    - Una larga se atenúa en el tramo que pasa por dentro, más cuanto más hondo.
    - Una que pasa por detrás de la corteza se ve tenue. Una que cruza el hueco entre hemisferios, sin corteza delante, se ve entera.

    Así las conexiones cambian con la profundidad, como pidió el usuario.
  - **Sin corteza pintada** (malla translúcida y atlas volumétricos), no hay nada opaco que tape, y todo se ve entero, como antes de la D5.
  - **Exportación:** la reproduce tal como se ve. La captura usa la misma cámara y la profundidad de la corteza del último fotograma.
  - **Se quitan** el interruptor y su preferencia. La clave `neurograph.cerebro3d.atenuar` deja de leerse.
- **Captura del 3D sin parpadeo** (D5): la captura se dibuja en un `WebGLRenderTarget` fuera de pantalla, con el mismo proceso de color que el lienzo (curva de tono y codificación sRGB). Mientras dura «exportando», el lienzo visible no se vuelve a dibujar: lo dibuja un `useFrame` de prioridad 1, y solo fuera de la exportación. Así ya no se ven en pantalla los fotogramas con los colores de exportación (limitación anotada en D3). Si se ha perdido el contexto WebGL, el lienzo no tiene tamaño o la captura sale vacía, no se descarga nada, y la consola lo dice.

## 7. Tipografía

- **Fuentes:** Atkinson Hyperlegible Next (400, 500, 600 y 700) para la interfaz y Atkinson Hyperlegible Mono (400 y 500) para IDs y cifras. Distingue bien I, l y 1 en abreviaturas como IFJa, IP1 o LIPd.
- **Instalación:** como archivos `woff2` en `frontend/src/assets/fonts/`, con su licencia (SIL OFL 1.1) y `@font-face` en `index.css`. Son fuentes variables: un archivo por subconjunto (latin y latin-ext) cubre todos los pesos. No se piden a internet: la aplicación de escritorio tiene que funcionar sin conexión.
- **Cursivas:** también se instalan las cursivas de Next (latin y latin-ext). Con `font-synthesis: none`, sin ellas los textos en cursiva saldrían rectos.
- **Licencia:** `frontend/src/assets/fonts/LEEME.md` deja claro que las fuentes siguen bajo la OFL y no bajo la licencia general del repositorio. El texto de la licencia está en `frontend/public/licenses/`, que la compilación copia a `dist/licenses/`.
- **JPEG:** las etiquetas del JPEG usan la pila de fuentes del sistema declarada en el SVG (ver 4.4), no la fuente nueva. Las del JPEG del 3D, en cambio, llevan la fuente nueva: son texturas que la aplicación dibuja con ella (6.3; D10).

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
- **Sin modo de paleta todavía:** `resolveNetworkColor(key)` y `exportColorFor(ref, kind, theme)` no lo reciben (`kind` es el tipo de atributo: color u opacidad), y `effectivePaletteMode` no existe. Llegan con la paleta suave, en la fase 2. El store ya guarda `paletteMode`, para no tener que migrar lo guardado. Ya llegaron: ver «Fase 2», abajo (D7).
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

**Parte 3D de la fase 4.** Lo construido añade estas unidades (D5 de `docs/decisiones-diseno.md`, y la D8 para la oclusión):

- `logic/markerSize.ts`: el radio del marcador y, en un solo sitio, lo que depende de él: el contorno, la zona de clic y la separación de la etiqueta (6.3).
- `logic/cortexOcclusion.ts`: la oclusión por la corteza (6.3). Contiene el factor, el paso de la profundidad de la textura a la de la vista, el parche de los shaders, los uniforms y las props que comparten los materiales, y la pasada que dibuja la profundidad de la corteza. Sustituye a `logic/depthFade.ts`, `logic/depthFadePreference.ts` y `components/DepthFadeToggle.tsx` de la D5, que se quitan.
- `logic/capture3d.ts`: las fases de la exportación y la captura fuera de pantalla.
- `exportPixelsAsJpeg`, en `logic/exportImage.ts`: el JPEG a partir de los píxeles de la captura, sin leer el lienzo.

**Fase 2.** Lo construido difiere de lo anterior, o lo concreta, en estos puntos (D7 de `docs/decisiones-diseno.md`):

- **El modo de paleta vive en `theme/colors.ts`:** `PaletteMode`, `PALETTE_MODES`, `isPaletteMode` y `effectivePaletteMode`. El tipo estaba en el store, que ahora lo importa de ahí.
- **Las funciones puras reciben el modo que se aplica,** `"suave"` u `"original"`: `resolveNetworkColor(clave, tema, modo)`, `exportColorFor(ref, tipo, tema, modo)`, `exportResolverFor(tema, modo)` y `drawColorsFor(tema, modo, forExport)`. Solo `effectivePaletteMode(tema, elección)` recibe la elección, que puede ser `null`.
- **Nuevas:** `exportNetworkColor(clave, modo)`, el color de red de la exportación, que usan las dos vías, los SVG y el 3D; y `currentExportResolver()`, en `theme/useDrawColors.ts`, el único resolvedor de exportación, que lee tema y modo al exportar.
- `useDrawColors(forExport)` conserva su firma y lee también el modo, así que `Brain3D.tsx` no cambia.
- **Store:** `setPaletteMode`, que acepta `null` («Automática»).
- **Ajustes:** `SettingsChoices`, el contenido del panel sin el store, para probar su marcado; y `logic/radioGroup.ts`, las flechas del grupo «Colores de las redes» (5.2).
- **Tabla:** `theme/softPalettes.ts` lleva también `SOFT_PALETTE_THEMES` y `SOFT_PALETTE_SOURCE`, la copia de `NETWORK_COLORS` de la que sale (4.3).

**Marcas de regiones.** Lo construido añade estas unidades (D9 de `docs/decisiones-diseno.md`, 5.9):

- `state/marks.ts`: el store de las marcas. `state/history.ts` las guarda en sus instantáneas, y su `resetForAtlasChange()` vacía las marcas y el historial al cambiar de atlas.
- `logic/marks.ts`: funciones puras del gesto (con el umbral del arrastre), del anillo, de la pastilla, de lo que quita la exportación (`data-ng-mark`) y de la línea de Filtros.
- `components/MarkedLabel.tsx`: la pastilla de la etiqueta en el connectograma y los hemisferios.
- `components/MarksLine.tsx`: la línea de las marcas en Filtros.
- Los tokens `mark` y `markText`, en `DRAW_TOKENS`, y `--mark` y `--mark-text`, en `index.css`.
- En módulos que ya existían: `markRing3d`, en `logic/markerSize.ts`; la pastilla y el anillo del 3D, en `logic/textSprite.ts`; `searchKey`, en `logic/regionSearch.ts`, para Ctrl+Intro; y `joinNames`, que pasa a `logic/displayText.ts`.

**Fase 4 (gráficos).** Lo construido añade estas unidades (D10 de `docs/decisiones-diseno.md`):

- `logic/connectogramLayout.ts`: la geometría del connectograma, en funciones puras. La etiqueta radial (`radialLabel` y `labelTransform`), el ancho estimado de una etiqueta y lo que ocupa la más larga (`estimatedLabelWidth` y `labelReach`), el radio del anillo (`ringLayout`), el halo (`selectionHalo`) y los arcos de hemisferio (`hemisphereBlocks`, `hemisphereArcs`, `arcPath`, `arcLabelSides` y `thumbnailArcsFit`).
- `components/ConnectogramLegend.tsx`: la leyenda del connectograma (5.4).
- `state/labelFont.ts`: la versión de fuentes de las etiquetas del 3D, con `requestLabelFont` (6.3).
- Los tokens `label3dText`, `label3dStrong` y `label3dBackground`, en `DRAW_TOKENS` (4.2).
- En módulos que ya existían:
  - `percentile`, `SULC_PERCENTILES` y `sulcShade`, en `logic/surfaceParcels.ts`;
  - `labelStart`, `labelAnchor` y `LABEL_CLEARANCE`, en `logic/markerSize.ts`, que pierde `labelOffset` y `LABEL_GAP`;
  - la letra (`labelFont` y `LABEL_FONT`), la clave de la caché (`labelTextureKey`) y `raycastLabelFirst`, en `logic/textSprite.ts`, donde `LabelPill` pasa a llamarse `LabelColors`.

**Tour guiado.** Lo construido añade estas unidades (D11 de `docs/decisiones-diseno.md`, 5.10):

- **Lógica pura,** en `logic/`: `tourSteps.ts` (los 13 pasos, sus textos y sus anclas), `tourPlan.ts` (el ejemplo sobre los datos cargados y el peso mínimo), `tourRestore.ts` (qué cambiar y en qué orden para entrar en un paso y para volver), `tourAutoplay.ts` (el tiempo del automático) y `tourTestData.ts` (datos de prueba parecidos a HCP-MMP1.0, solo para las pruebas).
- `state/tourRunner.ts`: quien lleva el tour con los stores y lo que App le da, espera a los datos y devuelve el montaje.
- `state/tourControls.ts` y `components/useTourControl.ts`: la lupa, el texto del buscador y las secciones de Filtros, que son estado de su componente, ofrecidos al tour mientras está montado.
- `components/GuidedTour.tsx` y `components/tourDriver.ts`: el componente y la caja de driver.js.
- En `state/history.ts`: `pauseRecording`, `loadHistory` y `resumeRecording`, y se exportan `applySnapshot` y `currentSnapshot`.
- Dependencia nueva: driver.js 1.8.0 (MIT, sin dependencias). La compilación pasa de 1357 a 1407 kB de JS (de 380 a 395 kB con gzip) y de 48 a 54 kB de CSS.

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
  - Cada clave de `NETWORK_COLORS`, incluidas las de demostración y `unclassified`, tiene color en Grafito, Noche y Claro, y la tabla sale del `NETWORK_COLORS` actual (`SOFT_PALETTE_SOURCE`).
  - El tono se conserva en ±3°, salvo los acromáticos. Se mira en los colores suaves con un croma de 0,04 o más: por debajo, el redondeo a `#rrggbb` ya lo mueve más de 3°.
  - Ninguna red con color queda casi gris, y la más oscura y la más clara de cada grupo quedan en los extremos de la banda: las dos correcciones del prototipo.
  - La L queda dentro de la banda con los márgenes del tema, y el croma no pasa del tope (4.3).
  - El ΔE_OK mínimo dentro de cada grupo es ≥ 0,095, el suelo garantizado.
  - El contraste con el panel es ≥ 3:1 en Grafito, en Noche y en Original con «Suaves». Se prueba en `themeCss.test.ts`, que lee el panel de `index.css`.
  - El gris de «sin clasificar» y la tabla de Cole-Anticevic de 4.3.
- **`colors.ts`:**
  - `resolveNetworkColor` en todas las combinaciones de tema y modo; una clave desconocida da `unclassified`.
  - `effectivePaletteMode`.
  - `exportColorFor`, comprobando que con el tema Original y la paleta original devuelve exactamente los colores de hoy.
  - Una prueba invariante liga la exportación 3D con la de los SVG, en los cuatro temas y con los dos modos.
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

**Fase 2.** 68 pruebas nuevas, de 343 a 411 (D7):

- **Nuevas:** `softPalettes.test.ts` (la tabla), `SettingsMenu.test.tsx` (el marcado de `SettingsChoices`: las tres opciones, una sola marcada, la ayuda de «Automática», la muestra y las tarjetas) y `radioGroup.test.ts` (las flechas).
- **Ampliadas:** `colors.test.ts` (el modo, y la prueba invariante con los dos modos), `themeCss.test.ts` (el contraste de la paleta suave), `appearance.test.ts` (`setPaletteMode` y un valor guardado sin `paletteMode`) y `FilterPanel.test.tsx` (las muestras, con la paleta automática y con una elección guardada, en otro store creado con `vi.resetModules`).
- Deshacer cualquiera de las dos correcciones del prototipo, o quitar el tope del croma, hace fallar estas pruebas y la comprobación del generador (comprobado, D7).

**Oclusión por la corteza.** En su rama, de 343 a 357: 66 nuevas y 52 quitadas con la atenuación de la D5 (D8).

- `cortexOcclusion.test.ts`: el factor, el paso de la profundidad de la textura a la de la vista, el parche de los shaders (con sus dos funciones fijadas enteras), los uniforms, las props de los materiales, la pasada con un renderer falso y las guardas que leen el código de three.js y de react-three-fiber.
- `Brain3D.occlusionWiring.test.ts`: la conexión en `Brain3D.tsx` y `PaintedCortex.tsx`.
- Se quitan `depthFade.test.ts`, `depthFadePreference.test.ts`, `DepthFadeToggle.test.tsx` y `Brain3D.fadeKeyRule.test.ts`.

**Marcas de regiones.** 91 pruebas nuevas, de 425, tras fusionar la oclusión, a 516 (D9):

- **Nuevas:** `state/marks.test.ts`, `logic/marks.test.ts`, `MarkedLabel.test.tsx`, `marksViews.test.tsx`, `MarksLine.test.tsx`, `marksWiring.test.ts` y `Brain3D.marksWiring.test.ts`.
- **Ampliadas:** `historyStep`, `history`, `themeCss` (el contraste del color de marca), `markerSize`, `textSprite`, `regionSearch`, `RegionSearch` y `FilterPanel`.

**Fase 4 (gráficos).** 83 pruebas más, de 517 (las 516 de las marcas y una de su línea contextual) a 600 (D10):

- **Nuevas:**
  - `connectogramLayout.test.ts`: la geometría del connectograma. La etiqueta radial; el ancho estimado, contra el medido en la fuente para la etiqueta más ancha de cada atlas y con el espaciado de `index.css`; el radio del anillo; el halo; los bloques de hemisferio, los arcos y el lado de sus rótulos; y la regla de la miniatura.
  - `connectogramGraphics.test.tsx`: el marcado del connectograma. Las etiquetas y las marcas que las siguen, el radio (también estable al ocultar redes), el halo, los arcos y la leyenda, con sus estilos.
  - `sulcShading.test.ts`: los percentiles y el suavizado sobre un vector conocido, también en las regiones con color.
  - `labelFont.test.ts`: la versión de fuentes.
  - `Brain3D.labelsWiring.test.ts`: las líneas de `Brain3D.tsx` que conectan las etiquetas: sus colores, la versión de fuentes, su sitio, la de la región seleccionada y el clic.
- **Ampliadas:** `themeCss.test.ts` (los tokens de las etiquetas del 3D y su contraste con cualquier cosa detrás), `textSprite.test.ts` (la clave, la caché y su liberación, la letra y `raycastLabelFirst`, con el raycaster de three.js) y `markerSize.test.ts` (dónde empieza la etiqueta y su ancla, también con el raycaster de three.js; sustituyen a las dos pruebas de la separación de 0,18).
- **Cambiadas:** dos pruebas de `Brain3D.marksWiring.test.ts` fijaban líneas de la etiqueta que cambian: ahora todas llevan pastilla, y ninguna, la curva de tono. Y se quita la prueba de `cortexOcclusion.test.ts` que ataba el inicio de la oclusión a la separación de la etiqueta, que ya no existe.

**Tour guiado.** 115 pruebas más, de 600 a 715 (D11):

- **Nuevas:** `tourSteps.test.ts` (los pasos, sus anclas, los cinco verbos, los textos sin datos reales, los atajos que bloquea), `tourPlan.test.ts` (el ejemplo, el peso mínimo y que cada paso empieza donde acabó el anterior; los datos que no cuadran), `tourRestore.test.ts` (el orden y la vuelta exacta), `tourAutoplay.test.ts`, `state/tourControls.test.ts`, `state/tourRunner.test.ts` (el recorrido con una App de mentira que se porta como la de verdad: salir desde cada paso deja todo igual, con los mismos Set y el mismo historial, también con otro atlas y otra clasificación; sin datos reales no cambia nada; el automático) y `tourWiring.test.ts` (App, las anclas, los estilos y lo que se da por hecho de driver.js).
- **Ampliadas:** `history.test.ts` (la pausa), `TopBar.test.tsx` (el botón «?»), `FilterPanel.test.tsx` (los títulos de «Todas» y «Ninguna» y las anclas) y `RegionSearch.test.tsx` (su ancla).
- Cada mutación probada de `state/tourRunner.ts` (sin la pausa, sin esperar a los datos, sin el historial, sin repetir el paso al volver, sin pausar el automático al retroceder, sin el respaldo si algo falla y sin volver a registrar) hace fallar alguna prueba.

## 11. Fases

Cada fase es una decisión de diseño en `docs/decisiones-diseno.md` (numeración D: la fase 1 es la D3, la fase 3 la D4, la parte 3D de la fase 4 la D5, la fase 2 la D7 y el resto de la fase 4 la D10), con su propio commit. Todas dejan la aplicación correcta. Lo que el usuario pidió por el camino tiene también su decisión: la oclusión por la corteza, la D8, las marcas de regiones, la D9, y el tour guiado, la D11, en la rama `rediseno-tour`. La D6, los avisos arriba a la derecha, se hizo en la rama `rediseno-avisos` y se fusionó después de la D10.

1. **Base de temas.** Hecha (D3).
   - Tokens de interfaz y de dibujo conectados en todos los componentes.
   - Store, persistencia y tema antes del primer render.
   - Engranaje y Ajustes con los cuatro temas.
   - Exportación correcta: atributos `data-ng-*`, `applyExportColors` y modo «exportando» del 3D.
   - Tipografía local y `accent-color`.
   - Al terminar, los cuatro temas funcionan con los colores de red originales. El tema Original tiene los mismos colores que hoy. Cambian la tipografía y el acento de las casillas y los deslizadores, que pasa del color por defecto del navegador al morado del tema.
2. **Paleta suave.** Hecha (D7), con la verificación en la app real pendiente (12). Script y tabla, `resolveNetworkColor` en todos los consumidores, y la opción «Colores de las redes» (Automática, Suaves y Originales del atlas) en Ajustes. La exportación ya la sigue.
3. **Estructura.** Hecha (D4). Barra superior, contexto de datos, filtros con recuentos, cabeceras y miniaturas, panel de detalle, avisos, deshacer y rehacer, y el buscador de regiones.
4. **Gráficos.** Hecha: los marcadores y la captura sin parpadeo del 3D (D5), la oclusión por la corteza (D8) y el resto (D10), este con la verificación en la app real pendiente (12). Connectograma (etiquetas radiales, arcos, leyenda y nodos), hemisferios y cerebro 3D (surcos, marcadores, etiquetas, oclusión por la corteza y captura sin parpadeo). Los hemisferios ya estaban al día desde la fase 1.

Orden de implementación: 1, 3, 3D, 2 y el resto de la 4. La estructura se adelantó a la paleta porque es lo que más pesaba en la petición inicial (menú superior y jerarquía). Lo propusimos nosotros y el usuario nos dejó seguir en autónomo (D4). «3D» es la parte 3D de la fase 4 (D5), adelantada a petición del usuario: los marcadores de región, atenuar lo que queda detrás y la captura sin parpadeo (6.3). Se hizo en paralelo con la fase 3, en la rama `rediseno-3d`, y se fusionó después de ella (commit `63622f0`).

Después vino la fase 2 (D7), en `rediseno-interfaz`. A la vez, en la rama `rediseno-oclusion`, la oclusión por la corteza sustituyó a la atenuación de la D5, a petición del usuario (D8, 6.3; fusión `0e2ff8b`). Luego, también a petición suya, llegaron las marcas de regiones (D9, 5.9), con las correcciones de su revisión y la línea contextual de Filtros en la rama `rediseno-marcas` (fusiones `c23aa91` y `7b9e161`).

Por último, el resto de la fase 4 (D10), en la rama `rediseno-fase4`, que salió de `c23aa91`. Antes de empezar se le fusionó `rediseno-interfaz` (`604c27a`), y volvió a ella con la fusión `dc4c666`.

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
- **Oclusión y three.js** (D8): la oclusión depende también de detalles de three.js y de react-three-fiber: la cuenta de `perspectiveDepthToViewZ`, `scene.overrideMaterial`, las capas de la cámara y el orden de los `useFrame` por prioridad. Unas pruebas leen su código y fallan si cambian.
- **El cono de dirección** (para decidir el usuario, D5): con datos que tengan conectividad efectiva, hoy tiene radio 0,035, algo mayor que un marcador normal.
- **Dos colores suaves casi blancos** en Grafito y Noche (D7): «Por defecto A» de Yeo 17 (`#fcffb0`) y «Sin identificar (temporal medial / parietal)» de Power (`#fffbcf`) quedan cerca del color del texto.
- **Original con «Suaves», justo por encima de 3:1** (D7): su mínimo es 3,02:1, con «Visual central» de Yeo 17 (`#9849a3`) sobre `#1d1e26`. Con una red nueva podría bajar de 3:1, y el generador se negaría a escribir la tabla hasta que se ajuste el método.
- **«Color real» en el código del desarrollador principal** (D7): la línea de estado del 3D dice «Cada región con el color real de su red» (`Brain3D.tsx`), y varios comentarios suyos hablan del «color real». Con «Suaves» no es literal. No se ha cambiado, porque es su código: queda anotado para él.
- **Verificación de la fase 2 en la app real, pendiente** (D7): la del plan se paró porque sus navegadores sobrecargaban la máquina del usuario. Queda por pasar una versión ligera con la máquina libre: un solo navegador, con `nice 19`, y como versión anterior la de `4977d05`, para comparar solo la paleta. Con ella, medir también el panel de Ajustes (5.2).
- **Verificación de la fase 4 en la app real, pendiente** (D10): no se ha pasado. Por la regla del usuario, solo se pasa con la máquina libre o con su permiso: el 25/09/2026 se quedó sin memoria dos veces por los procesos de prueba y los navegadores. Sin comprobar en un navegador: las etiquetas del connectograma con la fuente real en todos los atlas, las filas y el alto de la leyenda, el halo, los arcos, el hueco entre la etiqueta del 3D y su marcador visto de lado, de frente y desde detrás, el clic en las etiquetas del 3D y los JPEG.
- **Verificación del tour guiado en la app real, pendiente** (D11): no se ha pasado en un navegador. Sin comprobar: la caja en los cuatro temas y a varios tamaños, dónde la pone driver.js en cada paso, la atenuación en Claro, el foco y el lector de pantalla, la animación y el movimiento reducido, la lupa en el paso 10 y la vuelta desde otro atlas.
- **Lo que App no guarda** (D11): si el tour se abre desde otra pestaña, pasa a Atlas y al salir vuelve, pero la pestaña se monta de nuevo, como al cambiar a mano (la cámara y los tractos de Tractografía 3D, por ejemplo). Si tiene que cambiar de atlas, la cámara y los controles del 3D vuelven a los de partida, como con cualquier cambio de atlas.
- **driver.js 1.8.0** (D11): el tour da por hecho que la caja es un diálogo con nombre y descripción y que driver.js quita `aria-haspopup`, `aria-expanded` y `aria-controls` de lo que deja de señalar. Una prueba lee su código y falla si cambia.
- **Los textos del tour cuentan datos** (D11): si cambian los datos de HCP-MMP1.0 y dejan de cuadrar, el tour solo explica, y la consola dice por qué.
- **Arcos de hemisferio:** solo aparecen si el orden de los nodos agrupa cada hemisferio. Con atlas que los alternan, no se dibujan: con los datos de hoy, solo los tiene HCP-MMP1.0. El orden es el de las filas de `/regions`, que el backend no fija de forma explícita: si cambiara, los arcos podrían aparecer o desaparecer (D10).
- **Ancho estimado de las etiquetas del connectograma** (D10): el margen del anillo sale de un ancho estimado, no medido en la página. En los atlas de los datos, la etiqueta más ancha de verdad queda de un 5 a un 10 % por debajo de la estimada. En el JPEG, que usa la fuente del sistema, caben con Noto Sans, Ubuntu o Liberation; con DejaVu Sans, más ancha, una etiqueta seleccionada muy larga puede perder hasta 3 px junto a un eje.
- **El círculo del connectograma depende de las etiquetas y de la leyenda** (D10): el del Subcórtex mide un 36 % menos que antes, por sus etiquetas de 21 letras; el radio puede cambiar al ocultar redes si el número de nodos a la vista cruza 40 o 150, porque cambia la letra; y el lado del JPEG depende de las filas de la leyenda (a 1400 × 900, de 1998 a 1845 px).
- **El halo, encima de las etiquetas de las vecinas** (D10): en la maqueta queda debajo, y cambiarlo obligaría a reorganizar el grupo de las etiquetas, que es del desarrollador principal. Con una región seleccionada y marcada, la punta de la pastilla tapa cerca de 1 px del halo. En la lupa, el halo llega a su etiqueta, que va hacia dentro, y algunas vecinas lo tapan.
- **Clics en el 3D, en el código del desarrollador principal** (D10): un clic normal en zonas de clic de marcadores que se solapan alterna las dos; las líneas se alcanzan desde 1 unidad (40 mm); y un arrastre para girar que acaba sobre la corteza pintada selecciona una región. No se han cambiado, porque es su código. El clic en las etiquetas evita los tres.
- **Pastillas de las etiquetas del 3D** (D10): tapan más corteza que el texto con contorno de antes, sobre todo con una región de muchas conexiones. En Claro, queda por mirar si el texto se ve demasiado fino con el zoom de partida.
- **Anillo de los nodos del diagrama de síntesis en Claro** (D3): la D3 lo dejó para la fase 4, pero está fuera de la sección 6, y queda para más adelante (D10).
- **«Original» no es la app de hoy:** conserva sus colores, pero recibe la tipografía y el acento en casillas y deslizadores (fase 1), la estructura (fase 3) y las mejoras de los gráficos (fase 4), como los demás temas.

- **Limitaciones conocidas, sacadas de las entradas del log al resumirlas:**
  - **Oclusión (D8):**
    - una línea que sale por el borde de la corteza pasa de tenue a entera en cosa de un píxel, porque el destino de la profundidad no tiene antialiasing;
    - con la forma «Real», un marcador dentro de un surco se ve tenue;
    - una etiqueta junto a la silueta puede quedar partida;
    - cuesta un dibujo más de la corteza por fotograma, solo de profundidad, y unos 3,4 MB a 776 × 554.
  - **Paleta B (D7):** el croma por 0,85 apaga también las redes que ya tenían poco croma en el atlas.
  - **Estructura (D4):**
    - Para el desarrollador principal: el comentario de `state/selection.ts` dice que `FilterPanel` es el único que llama a `addNodes`, y ya lo llama también el buscador.
    - Con el teclado y sin lector de pantalla no se ve la etiqueta emergente del punto de «Datos reales».
  - **Temas (D3):** en el navegador, con otro tema elegido, puede verse Grafito un instante antes de que cargue el JavaScript. En la ventana de Tauri no se ha comprobado.
  - **Gráficos (D10):** en el vistazo rápido, un Ctrl+clic sobre un nodo no marcó nada; probablemente cayó entre dos nodos, que están a unos 5 px. Marcar desde el buscador sí funcionó.
