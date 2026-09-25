---
title: NeuroGraph — Decisiones de diseño de la interfaz
fecha: 2026-09-24
---

# NeuroGraph — Decisiones de diseño de la interfaz

Documento hijo de `docs/analisis-arquitectura.md`. El principal recoge los criterios funcionales de la app: datos, criterio científico, API y MCP. Aquí se anotan las decisiones sobre el aspecto y el manejo de la interfaz: disposición, estética, interacción y correcciones visuales. Las de instalación y herramientas auxiliares van en `docs/decisiones-herramientas.md`.

**Numeración.** D1, D2… Las que vienen del principal llevan su número antiguo entre paréntesis. El principal conserva una línea con ese número que remite aquí, así que los comentarios del código que citan, por ejemplo, "decisión 74" o "decisión 76c" siguen llevando al sitio correcto. Un número sin letra (16, 53…) es una decisión del principal.

**Antecedentes.** Las decisiones de interfaz anteriores al 24/09/2026 se quedan en el principal: la 16 (tres paneles), la 18 (tema oscuro), la 19 (ajustes tras la primera revisión visual), la 21, la 23 y la 24 (grosor de las líneas, correcciones visuales y eje de giro del 3D) y la 60 (correcciones al usar por primera vez el ejecutable).

## D1. Rediseño de la disposición de la vista "Un atlas": todo en una pantalla, una vista grande + dos miniaturas (antes decisión 74) -- 24/09/2026

**Motivación.** La usuaria encontraba la aplicación "algo engorrosa" y preguntó si se podía mejorar la distribución de cuadros y el aspecto. Antes de proponer nada se midió la vista real en Chromium a los tamaños de pantalla habituales, con los datos reales de HCP-MMP1.0 (360 regiones). Hallazgo principal, un fallo de maquetación y no de gusto: el reparto de la decisión del 30/08/2026 (connectograma + hemisferios en una columna y el cerebro 3D al doble de tamaño, lado a lado) necesitaba unos 2 200 px de ancho útil. En cualquier pantalla menor, el cerebro 3D bajaba a una segunda fila: empezaba a 2 176 px de altura en 1920x1080 y a 1 855 px en 1366x768. La página medía casi tres pantallas, y las tres vistas que comparten la selección nunca se veían a la vez. Además: una cabecera de ~190 px en cinco filas, un panel de filtros de 1 325 px de alto (dos líneas por red) y una columna de detalle casi siempre vacía.

**Decidido por la usuaria (pregunta explícita, 24/09/2026).** Disposición "una vista grande + miniaturas", entre tres propuestas (3D al centro con las otras dos apiladas, rejilla 2x2, vista grande + miniaturas). Alcance "disposición + limpieza": sin tocar ningún color de datos.

**Qué cambia.**
- La vista "Un atlas" ocupa exactamente la ventana, sin desplazamiento de página. En la ventana por defecto de la app (1400x900), la vista grande mide ~800x790 px.
- La rejilla tiene tres columnas: filtros (plegables a una franja de 34 px), la vista elegida en grande, y a la derecha las otras dos como miniaturas vivas encima del panel de detalle, que se desplaza por dentro.
- Hacer clic en una miniatura la amplía. Se usa una capa transparente para que un clic en la miniatura nunca seleccione por accidente una región que apenas se ve. Por defecto, en grande va el cerebro 3D.
- Las tres vistas se montan siempre en el mismo orden y solo cambia su zona de la rejilla (`grid-area`). Así, al intercambiarlas no se desmontan: la cámara, el modo de corteza o la especie de homología se conservan. Comprobado en el navegador: tras poner "redes vértice a vértice", mandar el 3D a miniatura y traerlo de vuelta, el modo seguía igual.
- Connectograma y Hemisferios se ajustan al lado menor de su hueco (ancho y alto), no solo al ancho, para no salirse por abajo. El suelo baja de 320 a 160 px para caber en una miniatura; sin alto propio, se usa el criterio anterior. En miniatura, las tres vistas muestran solo el dibujo (prop `compact`: sin botones, resúmenes ni recuadros de lectura).
- La barra superior es compacta: marca, pestañas, atlas, redes y la etiqueta DATOS REALES / DATOS SINTÉTICOS · SOLO ILUSTRATIVOS, siempre visible (sección 24). Su explicación larga pasa al texto emergente. Desaparece el título grande "vista de desarrollo", y se quitan el tope de 1 800 px y los bordes laterales de `#root`.
- En el panel de filtros hay secciones plegables y una línea por red. En la lista, el nombre va sin el paréntesis final de la fuente ("Visual" en vez de "Visual (Cole-Anticevic)"), porque la clasificación ya se ve en el selector "Redes"; el nombre completo y el número de regiones siguen en el texto emergente. "Resaltar" y "+ Añadir" pasan a ◎ y +, con una línea que explica los dos símbolos, y la explicación del deslizador de peso queda bajo "¿Cómo funciona?".
- Las demás vistas (comparar especies, tractografía, síntesis) solo ganan la barra superior nueva: su maquetación no cambia.

**Verificación.** `tsc -b` limpio; `vitest` 53/53; `oxlint` sin avisos nuevos (los mismos 9); `vite build` correcto. Prueba en Chromium sin interfaz con la respuesta real de `/regions` simulada, a 1400x900, 1920x1080 y 1366x768: el documento mide exactamente la ventana en los tres casos. También se probó intercambiar vistas, seleccionar una región en el connectograma ampliado y verla en el panel de detalle, plegar los filtros, el cerebro 3D pintado en grande y en miniatura (WebGL por software), y las vistas de datos de demostración y de tractografía.

**Pendiente real:** probarlo en la ventana real de la app (`npm run tauri dev`). La barra de controles del cerebro 3D sigue ocupando tres filas cuando la vista grande es estrecha (~800 px); se deja así por ahora en vez de esconder controles en un menú.

**D1b (antes 74b). Corrección: la imagen temblaba al pasar el ratón (24/09/2026, fallo real señalado por la usuaria al probarlo en su app).** Al pasar el ratón sobre un nodo, el connectograma y el cerebro 3D temblaban. La causa la introdujo la propia D1. Los recuadros de lectura ("Bajo el cursor: …" en el 3D y el recuadro bajo el connectograma y los hemisferios) solo tenían altura mínima, y cada dibujo se ajusta ahora al hueco que queda libre. Al aparecer un nombre largo, el recuadro crecía una línea y el dibujo encogía. Entonces el punto se movía de debajo del ratón, el texto cambiaba o desaparecía, el dibujo volvía a crecer, y así en bucle. Se reprodujo en Chromium antes de corregir: pasando el ratón por 25 puntos de la corteza (Yeo 17, vértice a vértice), el lienzo 3D tomaba tres alturas distintas (569, 543 y 516 px). **Corrección:** esos recuadros tienen ahora altura fija dentro del espacio de trabajo. El texto que no cabe se desplaza dentro del recuadro (connectograma, hemisferios) o se corta a tres líneas con el texto completo en el emergente (3D). La línea de estado del 3D se muestra siempre, aunque esté vacía. **Comprobado con la misma prueba:** una sola altura de lienzo en el 3D (22-24 textos distintos bajo el cursor) y un único tamaño de SVG en el connectograma y en los hemisferios tras recorrer ~30 nodos cada uno. `tsc` limpio, `vitest` 53/53, `oxlint` sin avisos nuevos.

## D2. Lupa en el connectograma (antes decisión 76) -- 24/09/2026

**Propuesta de la usuaria.** Con 360 regiones (HCP-MMP1.0) los nodos quedan a ~5 px unos de otros y sus abreviaturas son ilegibles en las zonas densas. Pidió una casilla para activar una lupa que, al mover el ratón por los nodos, muestre esa zona ampliada.

**Entregado.** Casilla "Lupa" en la barra del connectograma (solo en la vista grande, no en la miniatura). Con ella activa, un círculo sigue al ratón y redibuja ampliados x3 los nodos cercanos, con su abreviatura legible y girada en dirección radial hacia dentro del círculo. Además, pasar el ratón o hacer clic actúa sobre el nodo más cercano al puntero (hasta 12 px, `logic/magnifier.ts`), sin tener que acertar con el punto de 3 px. La lupa no se exporta al JPEG: al pulsar el botón el ratón está fuera del dibujo.

**Primer intento descartado.** Un `<use>` que clonaba el dibujo entero, escalado y recortado con `clipPath`. En Chrome el pintado se quedaba colgado en cuanto la lupa tocaba el anillo (capturas que no respondían a los 30 s, y el JS de la página sí). Se sustituyó por redibujar solo los nodos cercanos (una decena). La lupa guarda su propia posición del ratón, así que moverla no redibuja los 360 nodos. Las conexiones no se amplían: el fondo de la lupa las tapa.

**Comprobado** en Chrome con HCP-MMP1.0: lupa legible arriba, abajo, izquierda y derecha del círculo; el recuadro de lectura muestra el nodo más cercano; un clic selecciona ese nodo (panel de detalle actualizado). `tsc` limpio, `vitest` 55/55.

**D2b (antes 76b). Conexiones activas dentro de la lupa (24/09/2026, petición de la usuaria: "podríamos dibujar conexiones activas también, para marcar fácilmente").** La lupa tapaba todas las conexiones. Ahora dibuja, ampliadas, solo las activas. En el color de selección, las que el dibujo principal ya resalta (tocan un nodo seleccionado, la conexión seleccionada o toda la vista inducida). En claro, las del nodo bajo el cursor, para ver adónde va antes de clicar. No se amplían todas: eso es lo que colgaba el primer intento. Las etiquetas llevan un halo del color de fondo para leerse encima de las líneas. **Comprobado** en Chrome (HCP-MMP1.0, peso mínimo 0,55; 5045 conexiones en el dibujo): con 45 seleccionado y el cursor en 6r, la lupa dibuja 57 trazos (los de 45 en color de selección y los de 6r en claro), sin bloqueos. `tsc` limpio, `vitest` 55/55.

**D2c (antes 76c). Resaltado fuerte de las conexiones al pasar el ratón (24/09/2026, petición de la usuaria: "algo muy resaltado, esté o no activada [la lupa]").** Al pasar el ratón por un nodo, con o sin lupa, sus conexiones se dibujan encima de todas: más gruesas y en `HOVER_HIGHLIGHT_COLOR` (amarillo claro `#ffd84a`, un tono que ningún trazo de conexión usaba). El resto se atenúa mientras dura el hover: las seleccionadas a 0,45 y las demás a 0,12. La lupa usa el mismo amarillo, y si una conexión está a la vez seleccionada y bajo el cursor, gana el amarillo. La capa resaltada no recibe eventos: el clic sigue llegando a la conexión real. Solo existe durante el hover, así que no llega al JPEG. **Comprobado** en Chrome (HCP-MMP1.0, peso mínimo 0,55): sin lupa, sobre OFC; con lupa, sobre 9-46d. `tsc` limpio, `vitest` 55/55.

## D3. Temas de la interfaz (fase 1 del rediseño) -- 24/09/2026

**Motivación.** El usuario encontraba la interfaz tosca, con aspecto de alfa, y los colores de red, primarios puros como `#0000ff`, `#00ff00` o `#ffff00`, un «RGB burdo». Pidió una aplicación más clara y amable, sin cambiar lo que muestra ni cómo lo codifica. El rediseño va en cuatro fases (spec, sección 11), y esta es la primera: la base de temas.

**Decidido por el usuario.** Cuatro temas elegibles desde un engranaje: 1 Original, 2 Grafito, 3 Noche y 4 Claro. El 1 conserva los colores de hoy. El público son investigadores que no son informáticos. Validado por el desarrollador principal el 24/09/2026, con el lienzo de Claude Design «Rediseño de NeuroGraph» como referencia de aspecto. El tema por defecto, Grafito, lo elegimos nosotros con su delegación («lo que sea mejor, tu criterio»), como proponía el spec (4.5); se le confirmará al pedirle permiso para fusionar la rama.

**Qué cambia.**
- **Cuatro temas con tokens.** Los colores de interfaz son variables CSS, un bloque por `data-theme` en `index.css` (spec 4.1). Sin `data-theme`, antes de que cargue el JS, se aplica el bloque del tema por defecto, Grafito. Los colores de dibujo, lo que se pinta dentro de los SVG y del lienzo 3D, están en `DRAW_TOKENS` (`theme/themes.ts`, spec 4.2), y los componentes que dibujan los leen con `useDrawColors()`. `FilterPanel` (las muestras de color de las redes) y `SettingsMenu` (la vista previa) solo necesitan colores de red y llaman directamente a `resolveNetworkColor`. Solo quedan fijos, a propósito: el blanco de la exportación; el fondo blanco de las imágenes de Comparar especies, que vienen dibujadas sobre blanco; el brillo blanco del nodo seleccionado en el 3D; las etiquetas del 3D (`logic/textSprite.ts`), que cambian en la fase 4; y el respaldo de los colores de tracto, que están fuera del rediseño.
- **Store de apariencia** (`state/appearance.ts`, zustand) con `theme` y `paletteMode`, guardado en `localStorage` con la clave `neurograph.apariencia`. Cada lectura y escritura va en `try/catch`: si el almacenamiento falla, se usan los valores por defecto. `main.tsx` aplica `data-theme` en `<html>` antes del primer render.
- **Tipografía local:** Atkinson Hyperlegible Next, con sus cursivas, y Atkinson Hyperlegible Mono, en `woff2` dentro de la aplicación, sin pedir nada a internet. La licencia OFL está en `frontend/public/licenses/`, y `frontend/src/assets/fonts/LEEME.md` aclara que las fuentes no siguen la licencia general del repositorio. Botones, desplegables y campos heredan la fuente, y las casillas y el deslizador toman el `accent-color` del tema.
- **Exportación JPEG con la paleta de exportación** (spec 4.4). Los SVG exportables (connectograma, hemisferios y leyenda de la selección múltiple) marcan cada color de tema con `data-ng-fill`, `data-ng-stroke` o `data-ng-stroke-opacity`. Antes de serializar el clon, `applyExportColors` pone los colores de exportación: los de Claro con los temas 2 a 4 y los de hoy con el tema 1. El SVG exportado declara una pila de fuentes del sistema. La leyenda, un SVG de ancho fijo (260 px), mide su texto con esa fuente y ensancha la imagen lo que haga falta (opción `fitWidthToContent` de `exportSvgAsJpeg`). El cerebro 3D entra en un modo «exportando», estado local de `Brain3D`: se vuelve a dibujar con los colores de exportación sobre blanco, se captura y vuelve a los de pantalla.
- **Ajustes:** un engranaje al final de la barra superior abre un panel con los cuatro temas en tarjetas. Cada vista previa toma los colores de su tema de `index.css`, mediante `data-theme-preview`. El cambio se aplica en el acto, también al fondo 3D, y se guarda. La etiqueta «TEMA» y las descripciones van a 0,7 y 0,72 rem, para que se lean.
- **Robustez añadida en las revisiones:**
  - Mientras exporta, el botón «Exportar JPEG» del 3D lleva `aria-disabled` e ignora los clics. No usa `disabled`, con el que perdía el foco del teclado. Además, pedir otra exportación durante una no hace nada: un doble clic da una sola imagen y el modo «exportando» no se queda atascado.
  - La captura 3D va en `try/finally`: aunque falle, se restaura el fondo y se sale del modo «exportando», y también se sale si el lienzo se desmonta antes de capturar. Después se vuelve a dibujar en el acto, para que el blanco de la captura no se vea en pantalla.
  - El panel de Ajustes no se sale de la pantalla a 1280 ni a 1024 px de ancho: tiene ancho y alto máximos, con desplazamiento interno.
  - El panel se cierra cuando el foco sale, con Tab o con Mayús+Tab, del bloque que forman el engranaje y el panel. Por eso pasar con Mayús+Tab del panel al engranaje no lo cierra. Sigue abierto con los clics dentro, también en zonas sin foco propio como el título.
  - Los ayudantes tipados `ngFill`, `ngStroke` y `ngStrokeOpacity` hacen que una referencia `data-ng-*` mal escrita sea un error de compilación, siempre que se usen. Hoy los usan todos los componentes, pero un atributo `data-ng-*` escrito a mano seguiría compilando. En desarrollo, cada referencia distinta sin color de exportación se avisa una vez en cada exportación.
  - Si la medida del ancho de la leyenda falla, la exportación sigue con el ancho de partida. Pedir el ajuste en un SVG con `viewBox` no hace nada, y en desarrollo lo avisa.

**Qué no cambia.** `NETWORK_COLORS` y los demás valores de `theme/networks.ts`, y la lógica de representación: el color del nodo es la red, el grosor es el peso, el trazo discontinuo es evidencia no directa y la flecha es conectividad efectiva. En los cuatro temas las redes conservan sus colores originales: la paleta suave es la fase 2. En el tema 1, en color solo cambian dos cosas:
- El respaldo de una red desconocida pasa a ser el gris de «sin clasificar» (`#8a8a8a`); antes era `#888`, `#888888` o `NEUTRAL_COLOR` según el componente (spec 4.2, «se unifica»). La excepción es la corteza vértice a vértice: ahí, como en master, una red desconocida conserva el color que trae el propio archivo de superficie.
- Las casillas y el deslizador pasan del color por defecto del navegador (azul en Chromium) al morado del acento (spec 5.3).

Además, en el tema 1 cambia la tipografía, en pantalla y en el JPEG, y aparece el engranaje.

**Diferencias con el spec en esta fase.**
- `UI_TOKENS` no existe en TypeScript: los tokens de interfaz viven solo en `index.css`. La vista previa de Ajustes los toma de ahí, porque cada bloque de tema se aplica también a `[data-theme-preview="<id>"]`.
- Modo de paleta: `resolveNetworkColor(key)` y `exportColorFor(ref, kind, theme)` todavía no lo reciben (`kind` es el tipo de atributo, color u opacidad), y `effectivePaletteMode` no existe. Llegan con la paleta suave, en la fase 2. El store ya guarda `paletteMode`, así que no habrá que migrar lo guardado.
- Nombres en inglés, como el resto del código: `useDrawColors({ paraExportar })` del spec es `useDrawColors(forExport)`, y `SettingsPopover` es `SettingsMenu`.
- Token nuevo, `nodeGap`: el contorno de los nodos del diagrama de síntesis. Hacía falta para que ningún color quedara fijo.

El spec queda al día con estas diferencias (sección 9, «Fase 1») y con los retoques que salieron de la implementación:
- el estado del documento;
- la fila `nodeGap` en 4.2;
- los fondos de estado y el `success` de Claro, que pasa de `#227a4d` a `#1f6e45` para superar 4,5:1 sobre su fondo tintado;
- la nota del acento: la tarjeta del tema elegido usa el borde `accent` para llegar a 3:1;
- el tema por defecto (4.5 y 12);
- el foco al cerrar Ajustes (5.2);
- las cursivas y la licencia de las fuentes (7);
- el acento de las casillas en el tema Original (11);
- la leyenda exportada con la fuente del JPEG (12).

**Limitaciones conocidas.**
- En el navegador, antes de que cargue el JS, se ve el tema por defecto, Grafito, que es el del `:root` de `index.css`. Quien haya elegido otro tema puede verlo un instante antes de que `main.tsx` aplique el suyo. En Tauri la ventana arranca oculta (`visible: false`), lo que debería taparlo. Pero se muestra cuando están en marcha los servicios (`frontend/src-tauri/src/lib.rs`), no cuando la página ya tiene el tema, y no se ha comprobado en la ventana real.
- Con el engranaje, la barra superior necesita una fila más cuando sus controles llenan la línea. Medido con datos reales: a 1280 px de ancho pasa de 92 a 139 px de alto, con el engranaje solo en la tercera fila, y a 1024 px, de 121 a 170 px. A 1400 px sigue en dos filas (de 92 a 97 px). La fase 3 rehace la barra superior (spec 5.1).
- En ventanas muy bajas, con la barra en tres o cuatro filas, el panel de Ajustes se sale un poco por abajo: a 1280 px de ancho, por debajo de 550 px de alto y como mucho 18 px; a 1024 y a 900 px, por debajo de 563 px y como mucho 49 px. Su contenido se desplaza por dentro. En Tauri no debería pasar: la ventana no baja de 900x600, y a ese tamaño el panel cabe entero (medido en Chromium).
- La leyenda de la selección múltiple sale entera en el JPEG, pero en pantalla sigue cortando las etiquetas largas, como en master. Eso queda para la fase 3, que rehace el panel de detalle.
- Durante la exportación del 3D y justo después, la pantalla muestra unos fotogramas con los colores de exportación sobre el fondo de pantalla: la selección casi negra y los grises de Claro. Luego React devuelve los de pantalla. En la prueba sin interfaz duró al menos tres fotogramas, y a los 500 ms la pantalla ya era la de antes.
- El anillo de foco del color de acento (spec 8) solo existe en Ajustes y en las miniaturas. En el resto queda el del navegador, que se ve pero no sigue el tema. Una regla `:focus-visible` general queda para la fase 3.
- En Claro, los colores de red muy claros (`#ffff00`, `#ffffcc`) casi no se ven en dos sitios: en el diagrama de síntesis, donde el contorno `nodeGap` es blanco sobre el panel blanco, y en las muestras de color de los filtros, que no tienen anillo. El anillo neutro queda para la fase 3 (muestras) y la fase 4 (diagrama).

**Queda para las fases 2 a 4.**
- **Fase 2, paleta suave:** `scripts/generate_soft_palettes.py`, la tabla `SOFT_NETWORK_COLORS`, el modo de paleta en `theme/colors.ts` y la opción «Suaves / Originales del atlas» en Ajustes.
- **Fase 3, estructura:** barra superior con selectores compactos, filtros con recuentos, cabeceras y miniaturas, panel de detalle y avisos.
- **Fase 4, gráficos:** etiquetas radiales, arcos de hemisferio y leyenda del connectograma; hemisferios; surcos, marcadores y etiquetas del cerebro 3D, que hasta entonces siguen con la fuente del sistema.

**Verificación.**
- `vitest` 115/115: las 55 de antes y 60 nuevas. Entre ellas hay dos pruebas nuevas:
  - Una lee `index.css` y comprueba que los cuatro temas definen las mismas variables, que cada bloque incluye su vista previa, que el respaldo sin `data-theme` es el tema por defecto y los contrastes de 4.1.
  - Otra comprueba que el cerebro 3D y los SVG exportan los mismos colores.

  `tsc -b` limpio, `oxlint` sin errores y con los mismos 9 avisos previos, y `vite build` correcto.
- En Chromium 140 sin interfaz (Playwright, WebGL por software), con un servidor de desarrollo propio y el backend local con datos reales: HCP-MMP1.0, 360 regiones y 64 620 conexiones, solo con peticiones GET. Ventana de 1400x900, peso mínimo 4,0e-3 (3 067 conexiones) y la región 3b del hemisferio derecho seleccionada con un clic en el connectograma grande, con la lupa desactivada.
- **Los cuatro temas:** capturas del connectograma y del cerebro 3D en grande. Los colores calculados (fondo, texto, acento de casillas y deslizador, etiqueta de datos reales) y el fondo 3D son los del tema. En Grafito, Noche y Claro no queda ningún `#ac61d1` en los estilos calculados de la página. La corteza muestra la región y sus vecinas en color y el resto en los grises del tema. La fuente Atkinson está cargada (normal, cursiva y Mono), y la usan también los botones y los desplegables. Los colores de red son los originales.
- **Tema 1 contra master:** una copia de master (443ad58), servida aparte y con los mismos pasos. Cada elemento del connectograma y de los hemisferios lleva exactamente los mismos colores. El cerebro 3D coincide salvo en píxeles de borde, por una diferencia de menos de un píxel en el alto del lienzo. Cambian la fuente y el acento de las casillas y del deslizador.
- **Engranaje, en los cuatro temas:** el panel muestra las cuatro tarjetas con la activa marcada y enfocada. Escape y su botón lo cierran y devuelven el foco al engranaje. Tab y Mayús+Tab lo cierran cuando el foco sale del bloque del engranaje y el panel; pasar al engranaje no lo cierra. Los clics dentro no lo cierran. Un clic fuera lo cierra y deja el foco donde se hizo clic.
- **Tamaños del panel:** se ve entero a 1400x900, 1280x800 y 1024x768 en los cuatro temas. Con la letra mayor de la revisión final se volvió a medir con Grafito y con Original a esos tamaños y a 900x600, y con Grafito a 1920x1080 y 1366x768: se ve entero en todos.
- **Cambio de tema desde las tarjetas, probado con Grafito:** elegir otro tema cambia la interfaz y el fondo 3D en el acto, y se conserva al recargar.
- **Vértice a vértice:** con Grafito, Yeo 7 y «Redes originales, vértice a vértice», la corteza se pinta sin errores en la consola. En ninguna prueba hubo errores en la consola; el único aviso es el de three.js sobre `THREE.Clock`, que también sale en master.
- **Exportación con Grafito:** connectograma, hemisferios, cerebro 3D y leyenda. Los JPEG tienen fondo blanco, líneas y anillos en los grises de Claro y la selección casi negra (`#16181c`). El clon exportado lleva exactamente los colores que esos SVG tienen en pantalla con el tema Claro, sin referencias sin resolver, y el JPEG 3D coincide con el 3D de Claro en pantalla (el 99 % de los píxeles, a ±16). Tras exportar, la pantalla queda igual píxel a píxel, también el lienzo 3D. Durante la exportación, el botón del 3D lleva `aria-disabled` y conserva el foco del teclado (con `disabled` lo perdía). Un segundo clic o un doble clic dan una sola descarga.
- **Exportación con Original:** connectograma, hemisferios y cerebro 3D con los colores de siempre. En el connectograma y los hemisferios, el clon exportado es igual a la pantalla, que es igual a master. El JPEG del connectograma tiene un histograma de color un 98,8 % igual al de master, y el JPEG 3D coincide con el de master salvo en píxeles de borde. En el JPEG de los hemisferios, los píxeles que cambian son las etiquetas, por la fuente, y cruces de líneas: `GET /connections` no devuelve siempre el mismo orden, y con él cambia el orden de dibujo.
- **Leyenda exportada:** la fuente del JPEG es más ancha que la serif con la que salía antes, y en la primera verificación una etiqueta larga salía cortada. Se añadió el ajuste de ancho y se volvió a comprobar con Grafito y con Original, sirviendo los mismos datos a la versión anterior y a la nueva:
  - Con TPOJ1 (izquierdo), 3b (derecho) y SCEF (izquierdo), el JPEG pasa de 780 px de ancho, con texto en la última columna, a 1224 px (408 × 3). Las tres etiquetas salen enteras, y la última tinta queda a 33 px del borde.
  - Con etiquetas cortas (1, 2 e Hippocampus, derecho), se queda en 780 px e igual byte a byte.
  - El connectograma y los hemisferios salen iguales byte a byte que antes del ajuste, sin errores en la consola.
- **Correcciones de la revisión final:** con los mismos datos servidos a las dos versiones, Grafito y Original, todas las exportaciones salen iguales byte a byte que antes de las correcciones: connectograma, hemisferios, cerebro 3D y leyendas larga y corta. Sin `data-theme`, la página toma ahora los colores de Grafito (antes, los de Original), y cada tema elegido sigue ganando. Con la letra mayor, el panel de Ajustes mide 8 px más (412 px). Si falla la medida de la leyenda, se exporta a 780 px con un aviso. Con `viewBox`, la opción se ignora con un aviso y la imagen sale igual.
- **No comprobado:** la ventana real de Tauri (WebKitGTK en Linux, WebView2 en Windows); el fondo 3D de Tractografía 3D y de Nodos de tractografía, porque la base local no tiene sus datos (sus paneles sí siguen el tema); y la pestaña de una síntesis de IA importada, que necesita el diálogo de la aplicación de escritorio.

Spec: `docs/rediseno-interfaz-diseno.md`. Plan: `docs/rediseno-interfaz-plan-fase1.md`.

## D4. Estructura de la interfaz (fase 3 del rediseño) -- 25/09/2026

**Motivación.** La interfaz tenía aspecto de alfa: la barra superior mezclaba navegación, datos y acciones, y la información no tenía jerarquía (spec, sección 1). Esta fase es la estructura común a los cuatro temas de la D3: barra superior, filtros, cabeceras de las vistas y miniaturas, recuadros de lectura, panel de detalle y avisos. Añade deshacer y rehacer y un buscador de regiones. No cambia lo que representan los gráficos ni la paleta.

**Orden de las fases.** La fase 3 se hizo antes que la 2 (paleta suave). Lo propusimos nosotros, porque lo que más pesaba en la petición inicial era la estructura (el menú superior, el logo y la jerarquía), y el usuario nos dejó seguir en autónomo. La fase 3 no depende de la 2. Los colores de red salen de `useDrawColors().networkColor` en los componentes nuevos y de `resolveNetworkColor(clave)` en las muestras de los filtros, y hoy los dos dan el color original del atlas, con un solo argumento. En paralelo, en la rama `rediseno-3d`, se hizo la legibilidad del cerebro 3D: la parte 3D de la fase 4, que el usuario pidió adelantar (spec 6.3: marcadores de región, atenuar lo que queda detrás y captura sin parpadeo). Tendrá su propia decisión, previsiblemente la D5, al fusionarla. El orden queda 1, 3, 3D, 2 y 4 (spec, sección 11).

**Decidido por el usuario (24/09/2026).**
- El logotipo lleva los cuatro nodos de color de la maqueta: Lenguaje, Por defecto, Frontoparietal y Visual de Cole-Anticevic, con los colores del tema activo. Es la única excepción al principio 4 del spec (en la interfaz, el color significa red), y representa justo eso, redes.
- Pidió deshacer y rehacer, porque un clic de más le hacía perder un montaje. Van en la fila de selección de Filtros, que es donde se arma.
- Se valoró también una barra de estado fija al pie, y él la descartó el mismo día: la maqueta ya da ese feedback donde se usa (la selección y el recuento de Filtros, el recuadro de lectura y el panel de detalle), y el pie lo repetiría. En la misma revisión del spec se añadieron el recuento del recuadro de lectura, que pidió como en la maqueta, y los nombres de ◎ y +.
- Pidió un buscador de regiones, porque localizar a ojo una región entre 360 es muy difícil. Decidió que fuera en Filtros, sobre la selección, y que solo sugiriera regiones de las redes visibles.

**Qué cambia.**
- **Barra superior** (spec 5.1). Una fila de 56 px con la marca (el logotipo, «NeuroGraph» y «alfa»), las pestañas de vista con icono, las de síntesis con su botón de cerrar, el contexto y el estado de los datos (solo en la vista Atlas), «Importar» y el engranaje de la D3. Si no cabe, pliega lo secundario por pasos, y solo lo que haga falta: «Datos reales» se queda en su punto, «Importar» en su icono, las síntesis inactivas en el suyo y, al final, las vistas inactivas. Medido: no pliega nada a 1366 px o más, pliega «Datos reales» a 1280 y también «Importar» a 1152. A 1024 y a 900 lo pliega todo, y solo la pestaña activa conserva su nombre. A 1400 px, una síntesis de nombre largo pliega «Datos reales» e «Importar», y dos, también sus nombres.
- **Contexto de datos** (5.1). «Atlas» y «Redes» pasan de `<select>` nativos, que cortaban el texto, a botones con lista desplegable: el nombre corto en el botón y la etiqueta completa en la lista. Se manejan con el teclado, y el foco vuelve al botón al elegir, también cuando el atlas nuevo termina de cargar. Mientras carga la clasificación, un indicador que gira sustituye al chevron sin cambiar el ancho del botón.
- **Estado de los datos** (5.1). Un punto de color con «Datos reales» o «Datos de demostración», con las cifras o el aviso en la etiqueta emergente, y «Cargando…» con un punto neutro. Es una región `role="status"`.
- **Avisos** (5.6). Sustituyen a las dos franjas rojas fijas, la de importar una síntesis y la de cambiar la clasificación. Flotan abajo a la derecha, sobre la columna derecha y con su ancho (300 px, a 12 px de los bordes), apilados hacia arriba. Llevan un mensaje comprensible, el texto técnico en «Detalles» y «Entendido». «Importar» pregunta antes a `isTauri()`: en el navegador no intenta abrir el diálogo y avisa de que solo funciona en la aplicación de escritorio.
- **Filtros** (5.3). Arriba, el buscador. La selección ocupa dos líneas, con «Limpiar», ↶ y ↷ en la segunda. Hay una fila por red con su número de regiones, y ◎ y + aparecen al pasar el ratón o con el teclado (en las pantallas táctiles, siempre). Junto a cada tipo de conectividad, cuántas conexiones de ese tipo pasan los demás filtros, y bajo el peso mínimo, «N de M conexiones pasan los filtros».
- **Vistas** (5.4). La vista grande lleva bajo su título una línea que explica cómo leerla, y sus herramientas suben a la derecha de la cabecera cuando caben. La lupa pasa a botón de alternar (`aria-pressed`). Las miniaturas llevan un botón «Ampliar» con icono, que es también el camino del teclado.
- **Recuadros de lectura** (5.4). Región, hemisferio y red con su color. En el del connectograma, con una sola región seleccionada, cuántas de sus conexiones pasan los filtros, con el umbral, y la pista «pasa el ratón por otra región para verla». Una conexión lleva «→» solo si es efectiva, y «↔» si no.
- **Panel de detalle** (5.5). La región, su red y su hemisferio, cómo se asignó la red, sus conexiones de más a menos peso (cinco, y «Ver las N») con el color de red de la otra región y una barra de peso logarítmica, y el ID al pie, con un botón para copiarlo. La vista de una conexión y la de varias regiones reciben la misma jerarquía.
- **Deshacer y rehacer** (5.7). Un historial propio, `state/history.ts`, guarda instantáneas de la selección y de los filtros, hasta 50 pasos. Los botones ↶ y ↷ describen el paso en su etiqueta emergente, y los atajos son Ctrl+Z, Ctrl+Mayús+Z y Ctrl+Y (con ⌘ en macOS). Un paso que quita dos o más regiones de la selección saca un aviso con «Deshacer». Lo anuncia una región viva, sin mover el foco, y se va a los 8 s, salvo mientras tiene el ratón encima o el foco.
- **Buscador de regiones** (5.8). Autocompleta por abreviatura y por nombre, sin distinguir mayúsculas ni tildes, y solo sugiere regiones de las redes visibles. Si lo buscado está en una red oculta, lo dice y ofrece mostrarla. Elegir una región la añade a la selección, y se puede deshacer. Ctrl+K (⌘K) lleva a él.
- **Lo que la D3 dejó para esta fase:**
  - La barra superior cabe en una fila de 56 px en todos los anchos medidos, de 900 a 1600 px. Con el engranaje de la D3 medía 97 px a 1400, 139 a 1280 y 170 a 1024.
  - Las muestras de color de red llevan el anillo neutro: en los filtros, en `.legend-swatch`, en las etiquetas de red y en los puntos del detalle y del buscador. Es de `--text-muted`, que supera 3:1 sobre los fondos de los cuatro temas (de 4,49:1 a 6,6:1).
  - Una regla `:focus-visible` general pone el anillo de foco del color de acento en toda la interfaz.
  - La leyenda de la selección múltiple mide su texto en pantalla y ensancha su `<svg>`, así que ya no corta las etiquetas largas. Si no cabe en el panel, su recuadro se desplaza en horizontal.

**Qué no cambia.** El estado, los stores y los manejadores del desarrollador principal, con estas excepciones:
- La cola de avisos sustituye a las dos franjas con el mismo flujo. Cada `setSynthesisImportError(texto)` pasa a un aviso con la clave `importar`, cada `setNetworkSourceError(texto)` a uno con la clave `redes`, y cada `…(null)` retira el de su clave.
- `handleImportSynthesis` pregunta antes a `isTauri()` y separa sus mensajes en un texto comprensible y «Detalles». Los mensajes nuevos son «No se pudo abrir o leer el archivo.», «El archivo elegido no contiene un JSON válido.» y «La síntesis no se ha importado: tiene N problemas.».
- `handleChangeAtlas` llama además a `resetHistory()`. Un efecto nuevo lo llama también cuando llegan otros datos: otra clasificación, o los de demostración si la API falla. El menú de redes no cambia.
- Ctrl+K despliega Filtros con su `setFiltersCollapsed` de siempre.

Los stores de selección y de filtros no cambian: el historial se suscribe a ellos, y el buscador usa sus `addNodes` y `toggleNetwork`. **Para el desarrollador principal:** un comentario de `state/selection.ts`, que no se ha tocado, queda desfasado. Dice que el botón «Añadir a selección» de `FilterPanel` es el único sitio que llama a `addNodes`, y ahora lo llama también el buscador.

Tampoco cambian `NETWORK_COLORS`, la lógica de representación, la disposición de la D1 (una vista grande, dos miniaturas, filtros a la izquierda y detalle a la derecha, con sus secciones de filtros plegables) ni los gráficos, que son la fase 4.

**Desviaciones del spec.** El spec queda al día con todas (5.1 y 5.3 a 5.8), con el detalle:
1. **Pestañas:** van en un `<nav aria-label="Vistas">`, con `aria-current="page"` en la activa, y no en un `tablist`. Cada pestaña cambia la pantalla entera, y un `tablist` no admite el botón de cerrar junto a cada síntesis.
2. **Barra que no cabe:** el spec no lo decía. Se pliega lo secundario por los pasos de arriba, y lo plegado conserva su nombre para los lectores de pantalla y su etiqueta emergente, también con el foco del teclado. La barra mide si cabe y elige el menor paso que basta (`logic/topBarFit.ts`, atributo `data-collapse`), porque lo que ocupa depende del contenido.
3. **Avisos:** van en una cola con una clave por origen (`importar`, `redes` y `deshacer`), en lugar de `synthesisImportError` y `networkSourceError`, con el mismo flujo: uno nuevo sustituye al anterior del mismo origen. El spec no decía dónde van. El plan los ponía arriba a la derecha, bajo la barra, pero así tapaban el «Ampliar» de la primera miniatura, y tras la verificación pasaron abajo a la derecha (commit `75469b7`).
4. **«Redes»** solo aparece si el atlas tiene más de una clasificación, la condición de siempre (decisión 73).
5. **Estado de los datos:** «Cargando…» mientras carga. Con datos de demostración, la etiqueta emergente conserva el aviso completo de siempre. Es una región `role="status"`.
6. **Filtros:** las secciones siguen plegables, pero con un botón en su título y no con `<details>`, porque la cabecera de «Redes» lleva «Todas» y «Ninguna». Cada sección es un grupo (`role="group"`), no un `<section>`. «Se ven N de M conexiones» pasa a «N de M conexiones pasan los filtros», porque las vistas pueden dibujar menos, y la ayuda lo explica. ◎ y + aparecen con `:has(:focus-visible)` y no con `:focus-within`, para que un clic en la casilla no los deje a la vista.
7. **Herramientas de la vista grande:** suben a la cabecera si la vista mide al menos 40rem (consulta de contenedor), y si no, se quedan en una fila debajo. Del cerebro 3D solo sube «Exportar JPEG», y la cabecera le reserva su hueco siempre que el botón está: con una selección, y también sin ella con la corteza pintada, que es lo de por defecto (decisión 72). El plan suponía que sin selección nunca hay botón, pero solo falta con la corteza translúcida o mientras carga su mapa de regiones.
8. **Miniaturas:** la capa que amplía con un clic sale del orden del tabulador. Con el teclado se usa «Ampliar», que deja el foco en el título de la vista ampliada.
9. **Nombres de HCP-MMP1.0:** el «(hemisferio …)» del final no se repite donde el hemisferio ya se ve, pero solo si coincide con el de la región.
10. **«Ver las N»** se puede volver a plegar («Ver solo las 5 primeras»).
11. **Unidades que el spec no nombraba:** `NetworkTag.tsx`, `DataStatus`, `HistoryButtons.tsx`, `useHistoryShortcuts.ts`, `RegionSearchView`, `useRegionSearchShortcut.ts`, `useMouseMoved.ts` y nueve módulos de lógica pura en `logic/` (spec, sección 9, «Fase 3»).
12. **Conexiones:** se titulan «IFJa ↔ 8C», y «→» queda para la efectiva, la única con sentido (principio 1). Cada región lleva su lado si hace falta («V1 (izq.) ↔ V1 (der.)»). En las no efectivas, «Origen» y «Destino» pasan a «Región A» y «Región B», y en la lista de una región, las efectivas dicen «hacia» o «desde» la otra.
13. **Foco al cerrar** una síntesis o un aviso, y al plegar Filtros: pasa a lo que sustituye a lo que tenía el foco, para que no caiga en la página.
14. **Deshacer** (5.7): el aviso no lleva `role="status"`, sino una región viva siempre presente. Los cambios de la misma tarea del navegador son un solo paso. Un arrastre termina al soltar el puntero. El peso se escribe como en Filtros, pero truncado, y las regiones llevan su lado. Además, el tiempo del aviso se para con el ratón o el foco encima, y el teclado no actúa con una lista o Ajustes abiertos, entre otros detalles.
15. **Recuento del recuadro de lectura:** va solo en el del connectograma, con exactamente una región seleccionada. El umbral se escribe en la notación de Filtros, pero truncado a dos cifras significativas: nunca exagera, aunque puede quedar una cifra por debajo del valor de Filtros. Por encima del tope de dibujo, añade «(no se dibujan)».
16. **Buscador** (5.8): las teclas, la sugerencia activa (la primera que no está ya seleccionada), el aviso de las redes ocultas también cuando hay otras sugerencias o cuando solo está oculta una parte de las coincidencias exactas, y Ctrl+K solo en la vista Atlas, entre otros detalles.

De la maqueta no se toman el botón de ayuda ni la línea de fuente del detalle (spec, sección 2), ni sus columnas de 264 y 320 px: se quedan las de 250 y 300 px de la D1, con los 12 px de separación de la maqueta.

**Arreglos tras las revisiones.** Las revisiones de las tareas 1 y 2 dejaron los commits `fdfd932`, `089703a`, `aff4804`, `d5826bf` y `b9db5f1`. La revisión conjunta de las tareas 4 a 11 dejó el `9e18ce2`:
- los avisos, por debajo de Ajustes y de las listas (`z-index` 10) y desplazables si no caben;
- el aviso de deshacer se retira siempre que se vacía el historial y fuera de la vista Atlas;
- la etiqueta de ↶ con el teclado ya no se corta;
- el buscador avisa también de una coincidencia exacta oculta solo en parte;
- el umbral del recuadro, truncado, y «(no se dibujan)»;
- las etiquetas de red largas acaban en «…»;
- el anillo de las muestras pasa a `--text-muted`;
- la fila de selección, en dos líneas;
- ◎ y +, siempre a la vista en las pantallas táctiles.

La verificación dejó el `75469b7`: los avisos, abajo a la derecha; el historial se vacía también al caer a los datos de demostración desde la clasificación por defecto; y un mousemove sin posición anterior ya no mueve la sugerencia activa.

**Limitaciones conocidas.**
- **Los avisos tapan el pie del panel de detalle** mientras se ven. Con cualquier aviso, el ID y su botón de copiar quedan debajo. Con el foco del teclado en ese botón, no se ven ni él ni su anillo hasta «Entendido» o, con el aviso de deshacer, hasta que este se va a los 8 s. Es el precio aceptado a cambio de dejar libre «Ampliar».
- **Queda un solape:** a 900×600, con dos avisos y «Detalles» abierto, la pila tapa en parte el «Ampliar» de la segunda miniatura. Su centro sigue recibiendo el clic, pero con el foco del teclado quedan tapados 33 de los 76 puntos medidos de su anillo. Cumple WCAG 2.4.11 (AA), porque el foco no queda oculto del todo, pero no 2.4.12 (AAA).
- La altura máxima de la región de avisos cuenta con la barra en una fila. Si la barra pasara a dos filas, que es raro, una pila de avisos que llenara la ventana podría meterse bajo ella.
- Los mousemove sintéticos de WebKit se descartan (`useMouseMoved`), pero eso solo se ha comprobado en Chromium, no en WebKitGTK, el motor de Tauri en Linux. Si allí no traen las mismas coordenadas, por ejemplo con escalado de pantalla, la sugerencia activa podría saltar a la que queda bajo el ratón al desplazar la lista con el teclado.
- La ventana real de Tauri no se ha comprobado (WebKitGTK en Linux, WebView2 en Windows).
- **Comprobación manual pendiente para el usuario: confirmar Importar en la aplicación de escritorio.** `isTauri()` mira `window.isTauri`, que pone Tauri. Aquí se probó en el navegador con Tauri simulado (`window.isTauri` y el diálogo) y la validación de siempre. Si en la ventana real faltara, «Importar» diría que solo funciona en la aplicación de escritorio.
- El recuadro de lectura trunca el umbral («peso ≥ 3.9e-3») y Filtros lo redondea («4.0e-3»). El recuadro nunca exagera, pero los dos pueden diferir en la última cifra. `formatMinWeight`, la función de Filtros, es del desarrollador principal y no se ha tocado (pregunta abierta, abajo).
- **Conducta del código del desarrollador principal, que se deja como estaba:** la selección sobrevive a un cambio de atlas, con los ids del anterior. «N regiones seleccionadas» puede contarlos, y con dos o más ids viejos el connectograma no dibuja líneas. El historial y su aviso solo cuentan las regiones del atlas que se ve, y un id viejo se nombra «una región de otro atlas».
- Con la corteza pintada, que es lo de por defecto (decisión 72), el cerebro 3D lleva «Exportar JPEG» también sin selección. Su cabecera reserva así el hueco de las herramientas (126 px), y su descripción ocupa tres líneas. Es lo correcto; el plan suponía otra cosa (desviación 7).
- Con movimiento reducido, el indicador de carga de «Redes» no gira (queda un arco quieto), y «cargando…» solo está en la etiqueta emergente y para los lectores de pantalla.
- Quien usa el teclado sin lector de pantalla no ve la etiqueta emergente del punto de «Datos reales», que no se enfoca.
- La barra espaciadora para volver a abrir la lista del contexto de datos no se ha comprobado en Firefox, que Tauri no usa: usa WebKit y, en Windows, WebView2, de Chromium.
- Solo con lector de pantalla: el botón «Mostrar la red» del buscador va dentro de su región `role="status"`, así que se lee con el aviso.

**Preguntas abiertas para el usuario.**
- En el detalle, el peso de las conexiones conserva su formato de siempre, con todas sus cifras («0.07035581528181838»). ¿Redondearlo, con el valor exacto en la etiqueta emergente?
- ¿Debe Filtros truncar también el valor de «Peso mínimo», como el recuadro de lectura, para que los dos digan lo mismo?

**Verificación.**
- `vitest` 271/271: las 115 de antes y 156 nuevas, en 20 archivos (spec, sección 10). `tsc -b` limpio, `oxlint` sin errores y con los mismos 9 avisos, y `vite build` correcto (el aviso de tamaño de bloque ya estaba).
- **Método.** Chromium 140 sin interfaz (Playwright 1.55), con un servidor de desarrollo propio y el backend local del usuario con datos reales, solo con peticiones GET: HCP-MMP1.0, con 360 regiones y 64 620 conexiones, y Brainnetome para cambiar de atlas.
  - La versión anterior a esta fase, la de `e1b4f72`, se sirvió aparte. Para comparar, las dos recibieron los mismos `/regions` y `/connections` guardados, porque `GET /connections` no devuelve siempre el mismo orden.
  - Cada región se seleccionó comprobando, en el recuadro de lectura y en la selección, que era la buscada. Los scripts encontraron todas las que buscaban.
  - Los cuatro temas se probaron a 1400×900, 1280×800 y 1024×768, y las demás pruebas, también a 900×600. La barra, además, a 1600, 1440, 1366 y 1152 px.
  - El fallo de una clasificación se simuló con un error 500, y Tauri, en el navegador.
- **Barra y temas.**
  - En los cuatro temas y en todos los anchos, la barra ocupa una fila de 56 px, sin desbordar, y la página cabe en la ventana, sin desplazamiento horizontal. Se pliega como se dice arriba; a 1152 px se ven los cuatro nombres de vista.
  - Con el foco del teclado, una pestaña plegada e «Importar» muestran su etiqueta emergente. «Datos de demostración» se ve siempre, también a 1024 px.
  - Con dos síntesis de nombre largo, a 1280 px se pliegan también sus nombres, y a 1024 px, todo. Al cerrar la segunda con el teclado, el foco pasa a la primera, y al cerrar esa, a «Atlas». Las demás pestañas quedan marcadas y no muestran el contexto de datos.
  - En los cuatro temas, el anillo de foco es del color de acento, las muestras llevan el anillo de `--text-muted`, y «Todas» y «Ninguna» van en una línea. Fuera de Original no queda ningún morado de Original.
  - Los recuadros de lectura miden lo mismo en reposo, con el ratón encima y con una región seleccionada. El panel de Ajustes cabe entero a 1024×768 y a 900×600.
- **Menús.**
  - Con el teclado, la lista del atlas se abre con el foco en la opción elegida, y las flechas la mueven. Escape la cierra y devuelve el foco al botón, y Tab también la cierra.
  - Intro elige Brainnetome, y el foco sigue en «Atlas» cuando termina de cargar.
  - Mientras carga Yeo 7, «Redes» muestra el indicador que gira y dice «Yeo 7, cargando…» a los lectores de pantalla, con el mismo ancho antes y después. A 900×600, las dos listas caben enteras.
- **Avisos.**
  - Van abajo a la derecha, con 300 px de ancho y a 12 px del borde derecho y del de abajo, a 1400, 1280 y 900 px. La barra acaba a 56 px. El borde de arriba de la pila, con un aviso, con dos y con dos y «Detalles» abierto, queda:
    - a 1400×900: a 788, 631 y 536 px;
    - a 1280×800: a 688, 531 y 436 px;
    - a 900×600: a 492, 344 y 274 px.
  - Nunca tapan la vista grande ni su recuadro de lectura, Filtros ni su deslizador de peso, la barra ni la primera miniatura. En las demás pestañas no tapan ningún control.
  - El panel de Ajustes y las listas quedan por encima: a 900×600, con dos avisos, Ajustes se solapa con los dos y queda encima en todos los puntos medidos. Con la ventana a 900×450 y tres avisos, la rueda desplaza la región.
  - Al cerrar un aviso con el teclado, el foco pasa al siguiente, y tras el último, a «Importar». Con el 500 de la clasificación, el aviso lleva el texto técnico en «Detalles» y la clasificación vuelve a la de por defecto. Con Tauri simulado, los tres errores de importar dan sus mensajes nuevos. Al salir de la vista Atlas, el aviso de deshacer se retira y el de importar se queda.
- **Vistas y detalle.**
  - A 1400 y a 1440 px, las herramientas suben a la cabecera sin tapar el título ni la descripción; a 1280 y a 1024 px se quedan debajo. La lupa se activa y se desactiva.
  - «Ampliar» con el teclado deja el foco en el título de la vista ampliada. Un clic en la capa de una miniatura la amplía, y el tabulador no llega a la capa.
  - Con IFJa (derecha) seleccionada, el recuadro del connectograma dice su nombre, «hemisferio derecho», su red y «359 conexiones pasan los filtros (no se dibujan)», con la pista. El de los hemisferios dice lo mismo sin recuento, y con tres regiones no hay recuento.
  - El detalle tiene la jerarquía de 5.5, con cinco conexiones de más a menos peso. «Ver las 359» las despliega sin que la página se desplace, y se vuelven a plegar. El ID se copia.
  - Una conexión se titula «6mp (izq.) ↔ 6r (der.)», con «Región A» y «Región B». Una red de nombre largo, de Power 2011, acaba en «…» en el detalle y en el recuadro, sin salirse. La leyenda de la selección múltiple, con TPOJ1, 3b y SCEF, mide 402 px y se desplaza dentro del panel.
- **Filtros, contra una referencia calculada con los mismos datos.**
  - ◎ y + no se ven en reposo ni tras un clic en la casilla, y sí al pasar el ratón y con Tab. Mayús+Tab llega a «Añadir la red … a la selección».
  - El número de regiones de cada red, los recuentos por tipo, «N de M conexiones pasan los filtros» y el recuento del recuadro coinciden con la referencia en cuatro estados: al empezar, sin «Estructural», sin la primera red y con peso mínimo. Con un peso mínimo de 0,00398, Filtros dice «4.0e-3», y el recuadro, «9 conexiones pasan los filtros (peso ≥ 3.9e-3)».
- **Deshacer.**
  - Los botones empiezan desactivados. Tras un montaje de tres regiones y una red oculta, «Deshacer» describe el último paso, y su etiqueta, con el teclado, queda dentro del panel.
  - Un clic en una línea deja «1 conexión seleccionada» y saca «Se sustituyó la selección de 3 regiones»: sin rol, en la región viva y sin llevarse el foco. Ctrl+Z, Ctrl+Y, Ctrl+Mayús+Z y los dos botones van y vuelven entre el montaje y la conexión.
  - El aviso sigue a los 9 s con el ratón encima y se va a los 8 s sin él. Su «Deshacer» devuelve el montaje y deja el foco en ↶, o en el título de la vista grande con Filtros plegado. ◎ y «Limpiar» sacan sus avisos.
  - Un arrastre del deslizador es un solo paso («peso mínimo de 0 a 9.3e-3»). Otra clasificación, otro atlas y la caída a los datos de demostración vacían el historial.
- **Buscador.**
  - «te1m» sugiere «TE1m (izq.)» y «TE1m (der.)», con la primera activa. Intro la añade y deja el campo vacío y con el foco. Otra vez «te1m», la activa es la derecha, e Intro la añade. Fuera del campo, Ctrl+Z quita la última.
  - Con «1», ocho sugerencias, y la octava sigue a la vista con las flechas. Escape cierra la lista y otro Escape vacía el campo.
  - En Cole-Anticevic, la TE1m izquierda está en Por defecto y la derecha en Frontoparietal. Con las dos redes ocultas, el aviso dice «TE1m está en las redes Por defecto y Frontoparietal, que están ocultas.», y «Mostrar las redes» las devuelve con el foco en el campo.
  - Con Cíngulo-opercular oculta, «pf» sugiere PFm y PFt y avisa a la vez «PF está en la red Cíngulo-opercular, que está oculta.». Con todas las redes ocultas, «1» dice «Lo escrito está en 8 redes ocultas.».
  - Ctrl+K lleva al campo, también con Filtros plegado, que despliega. «ÁREA TE1 MIDDLE» encuentra las dos TE1m: la base no tiene nombres con tildes, y así se prueban.
  - En Chromium, el primer mousemove tras abrirse la lista no cambia la sugerencia activa, y el siguiente sí.
  - El aviso con el lado, cuando solo una de las dos TE1m está oculta, lo cubre una prueba unitaria, no la app real.
- **Exportaciones, con Grafito y con Original.**
  - Todos los JPEG se decodifican, con las esquinas blancas y el tamaño esperado.
  - Las leyendas corta y larga salen iguales byte a byte que antes de la fase, con 780 y 1224 px de ancho.
  - El connectograma y los hemisferios cambian de tamaño porque la vista grande los muestra a otro tamaño en pantalla: 1998 px frente a 1929, y 2328×1722 frente a 2355×1740. Llevados a la misma escala, el dibujo es el mismo.
  - El del cerebro 3D, que solo se exportó con la versión nueva, sale bien.
- **Consola:** sin errores, salvo los 500 simulados. Las pestañas de tractografía cargaron sin errores.
- **Correcciones de los scripts,** que eran suposiciones suyas y no fallos de la app:
  - Playwright pasa `--disable-dev-shm-usage`, y Chromium guardaba su memoria compartida en `/tmp`, que estaba casi lleno. Se quitó esa opción.
  - `selectNode` da por buena la región si el recuadro la nombraba con el ratón encima y el clic la añadió a ella sola, aunque después la tape una línea.
  - `clickLine` busca un píxel en el que la línea queda encima.
  - La lista del buscador se cierra antes de pulsar «Todas», que tapaba.
  - La comprobación de «Ampliar» ya no toma el propio botón, ni sus esquinas redondeadas, por algo que lo tapa.
  - Cada flujo de pruebas usa su propio `TMPDIR`.
- **No comprobado:** la ventana real de Tauri, y el descarte de los mousemove sintéticos en WebKitGTK.

**Queda para las fases 2 y 4.**
- **Fase 2, paleta suave:** la paleta y «Colores de las redes» en Ajustes. Los consumidores nuevos de color de red pasan a la versión con tema y modo: `NetworkTag`, las filas del detalle y las sugerencias del buscador, con `useDrawColors().networkColor`, y las muestras de los filtros, con `resolveNetworkColor`.
- **Fase 4, gráficos:** la leyenda del connectograma (5.4) y el resto de los gráficos (sección 6). La atenuación por profundidad, los marcadores y la captura del 3D sin parpadeo van en la rama `rediseno-3d`.

El spec queda al día con estas desviaciones (5.1, 5.3 a 5.8 y sección 9, «Fase 3») y con los retoques que salieron de la implementación y de la verificación:
- el estado del documento;
- la barra medida (5.1);
- la fila de selección en dos líneas (5.3);
- la pista del recuadro de lectura según el ancho, y «(no se dibujan)» (5.4);
- el hueco del cerebro 3D con la corteza pintada (5.4);
- los avisos abajo a la derecha, por debajo de Ajustes y de las listas (5.6);
- deshacer y el buscador tal como se construyeron (5.7 y 5.8);
- el aviso de deshacer, sin `role="alert"` (8);
- las pruebas de la fase (10);
- el orden 1, 3, 3D, 2 y 4 (11);
- la leyenda en pantalla y las dos preguntas abiertas (12).

Spec: `docs/rediseno-interfaz-diseno.md`, secciones 5.1 y 5.3 a 5.8. Plan: `docs/rediseno-interfaz-plan-fase3.md`.
