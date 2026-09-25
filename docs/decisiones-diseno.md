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

## D5. Legibilidad del 3D (parte 3D de la fase 4) -- 25/09/2026

**Motivación.** Con la corteza pintada (decisión 72), los marcadores, las etiquetas y las líneas de la selección se dibujan encima de la superficie, sin prueba de profundidad, para que no queden tapados dentro de un surco. Pero así una región de la cara interna o del otro hemisferio parecía estar delante de la corteza que se ve, y las etiquetas de regiones homólogas de los dos hemisferios salían dobles. Con el conectoma denso de HCP-MMP1.0 y el peso mínimo cerca de 0, una región seleccionada mostraba una estrella de hasta 359 líneas que parecía flotar. Además, al exportar el 3D se veían unos fotogramas con los colores de exportación (limitación anotada en la D3).

**Decidido por el usuario (24/09/2026).** Atenuar lo que queda detrás, con un interruptor en los controles del 3D, activado por defecto; para las líneas, atenuación por distancia y no oclusión. Adelantar esta parte de la fase 4 y hacerla en paralelo a la fase 3.

**Rama y fusión.** Se hizo en paralelo a la fase 3 (D4), en la rama `rediseno-3d` y con su propio plan, y se verificó en esa rama, sobre `9b2b92a`. Se fusionó en `rediseno-interfaz` después de la D4, con el commit `63622f0`. Tras la fusión se comprobó, en una prueba corta, lo que las dos ramas no habían visto juntas: la cabecera de la vista de la fase 3 con la barra del 3D y su interruptor («Tras la fusión», en la verificación). El orden de las fases queda 1, 3, 3D, 2 y 4 (spec, sección 11).

**Qué cambia.**
- **«Atenuar lo que queda detrás».** Líneas, marcadores con su contorno, conos de dirección y etiquetas se ven más tenues cuanto más lejos de la cámara quedan dentro del cerebro, con la corteza pintada y en la vista con las esferas en su posición real. Lo más lejano conserva 0,2 de opacidad. La atenuación se calcula en cada fragmento según su profundidad, así que una línea larga se desvanece a lo largo de su recorrido. El tramo va desde 0,2 de la semiprofundidad del cerebro por delante de su centro hasta su cara más lejana en la dirección de la vista. Se mide con la caja del cerebro que se ve: la de un solo hemisferio si solo se ve uno y, sin corteza pintada, la de todos los nodos del atlas. Es un botón de alternar en la barra del 3D, activado por defecto y guardado en este navegador (`neurograph.cerebro3d.atenuar`). Desactivado, los materiales son los de siempre. Las miniaturas siguen la misma preferencia. El JPEG reproduce la atenuación tal como se ve.
- **Marcadores a la mitad.** Radio 0,03, y 0,042 la región seleccionada. El contorno pasa a escala 1,36 y conserva el grosor absoluto de antes (0,0108). La zona de clic conserva el radio de antes (0,06 y 0,09) en una esfera invisible. La etiqueta queda a 0,18 del borde del marcador, como antes en uno normal (en el seleccionado quedaba a 0,15).
- **Captura sin parpadeo.** La exportación se dibuja en un destino fuera de pantalla con el mismo proceso de color que el lienzo, y mientras dura el lienzo no se vuelve a dibujar. En pantalla ya no se ve ningún fotograma con los colores de exportación. Si se ha perdido el contexto WebGL, el lienzo no tiene tamaño o la captura sale vacía, no se descarga nada, en vez de un JPEG negro, y la consola lo dice.
- **Robustez añadida en la revisión de las Tasks 1-4:**
  - la comprobación de la captura vacía (el primer píxel leído no es opaco);
  - una prueba que lee `WebGLPrograms.js` de three.js y falla si cambia el detalle del que depende la captura;
  - una prueba que exige `key={fadeKey(fade)}` en cada material que lleva `fadeMaterialProps`;
  - la esfera de clic lleva `visible={false}` en el `<mesh>` y no en su material, así three.js no la sube a la GPU (los clics la siguen encontrando).

**Qué no cambia.** Los datos, los stores, `NETWORK_COLORS` y la lógica de representación: el color es la red, el grosor es el peso, el trazo discontinuo es evidencia no directa y el cono es conectividad efectiva. La atenuación solo cambia la opacidad según la profundidad. Esta minifase no toca `App.tsx`, `App.css` ni `index.css`. Con la atenuación desactivada, el 3D es el de antes salvo el tamaño de los marcadores y la separación de las etiquetas (verificación).

**Diferencias con el spec.**
- El tramo de la atenuación sale del elipsoide inscrito en la caja del cerebro que se ve, no de una esfera: el cerebro es más largo que ancho, y con la esfera lo del otro hemisferio apenas se atenuaba en la vista lateral. La profundidad es la del eje de la cámara, no la distancia euclídea.
- Desactivada, los materiales no llevan el parche; al alternar, se crean materiales nuevos. La clave de React que lo hace es imprescindible: react-three-fiber 9.7 pondría a 0 las props del parche al quitarlas, y three.js fallaría.
- Con la atenuación, marcadores, contornos y conos se dibujan como transparentes, de atrás adelante con las líneas; los `renderOrder` no cambian.
- El contorno del marcador pasa de escala 1,18 a 1,36, y la zona de clic es una esfera invisible con el radio de antes.
- El lienzo no se para con `frameloop="never"` sino con un `useFrame` de prioridad 1 que solo dibuja fuera de la exportación. La exportación pasa por tres fases (`capturing`, `restoring`, `idle`).
- El destino de la captura se marca como de WebXR para recibir la curva de tono y la codificación sRGB, como el lienzo, con el formato interno `RGBA8` fijado.
- El interruptor usa las clases de los botones de herramienta (`.export-btn` y `.export-btn--active`), sin CSS nuevo, dentro de su propio `div` (`.brain3d-depth-fade`). Así no es hijo directo de la barra, y la regla de la fase 3 que sube «Exportar JPEG» a la cabecera (`.brain3d-toolbar > .export-btn`) no lo alcanza. Su estado pulsado toma el borde `--accent` de la regla de la fase 3 para los botones de alternar. La preferencia tiene su propia clave y no va en `neurograph.apariencia`.
- `preserveDrawingBuffer: true` se queda, aunque la exportación ya no lea el lienzo.
- Unidades nuevas: `logic/markerSize.ts`, `logic/depthFade.ts`, `logic/depthFadePreference.ts`, `logic/capture3d.ts`, `components/DepthFadeToggle.tsx` y `exportPixelsAsJpeg`, en `logic/exportImage.ts`.

**Limitaciones conocidas.**
- **Las etiquetas dobles de la línea media siguen ahí.** La atenuación por distancia separa bien las dos copias de un par lateral, pero las de un par medial quedan casi a la misma profundidad. Lo decide el usuario (más abajo).
- La captura depende de un detalle interno de three.js 0.185 (`isXRRenderTarget`). Una prueba fija la configuración del destino y otra lee el código de three.js. Si three.js cambiara ese detalle, el JPEG perdería la curva de tono, y la comparación con el JPEG de la versión anterior (verificación) lo detectaría.
- En la vista translúcida y en los atlas volumétricos, los marcadores atenuados siguen escribiendo profundidad. En la translúcida se ve con la malla: un marcador lejano atenuado tapa el pliegue que pasa por detrás de él (6r izquierda, en el JPEG). Si una línea que pasa por detrás de uno muestra un corte no se pudo distinguir en las capturas (los marcadores lejanos miden 6-9 px).
- Un marcador atenuado deja ver su contorno a través del relleno. Con la corteza pintada, los lejanos conservan algo más de contraste que su factor: 0,32-0,45, con factores de 0,22-0,33. En el JPEG, cuyo contorno de selección es casi negro, un marcador lejano atenuado se ve como un disco tenue con el borde algo más oscuro.
- Con la atenuación activada, un marcador cercano queda encima de las líneas que pasan por él; antes, todas las líneas iban encima de todos los marcadores. En la translúcida, los marcadores cercanos pierden el velo de la malla y se ven algo más vivos.
- **Desde 40rem, el interruptor va solo en una fila.** Cuando el contenido de la vista grande mide 40rem o más (a 1400 × 900, 776 px), «Exportar JPEG» sube a la cabecera (D4, desviación 7) y el interruptor se queda solo en la cuarta fila de la barra. La barra mide 138 px, frente a 102 px y tres filas sin él, y el lienzo, 518 px de alto en vez de 554. En la fila de «Hemisferio» hay sitio, pero `.brain3d-surface-controls` ocupa la línea entera. Por debajo de 40rem (1280 × 800, 1024 × 768 y 900 × 600), el interruptor comparte fila con «Exportar JPEG» y no cuesta nada. En la rama sola, antes de la fase 3, compartían fila en todos los tamaños, y la barra medía solo 2-3 px más.
- **A 900 × 600, el tamaño mínimo de la ventana, el lienzo 3D mide 95 px de alto.** La vista grande tiene 276 px de ancho, y su barra ocupa 244 px de sus 520. Sin el interruptor mide lo mismo, así que no viene de esta minifase. A 1024 × 768, el lienzo mide 348 px.
- Notas de la revisión de las Tasks 1-4, sin cambios:
  - la etiqueta se separa en +Y de los datos, no hacia arriba en pantalla;
  - un clic puede tocar dos zonas de clic que se solapan en el rayo; era así antes, pero ahora el solape no se ve.

**Para decidir el usuario: las etiquetas dobles de la línea media.**

Se repitió en la app la escena de su captura: red Somatomotora, corteza pintada inflada, los dos hemisferios y la cámara del principio, que mira el hemisferio derecho de lado. Se midió la opacidad de cada etiqueta con el fondo restado, en escenas con las regiones de un solo hemisferio, para que la gemela no quedara encima. Coincide con el factor del shader a ±0,002 en las 16 etiquetas que no tocan nada. La tabla da el factor de las dos copias de cada par:

| Par | Grupo | x izq. / der. (mm) | Separación en profundidad | Copia de detrás (izq.) | Copia de delante (der.) | Detrás entre delante | Entre las dos etiquetas |
|---|---|---|---|---|---|---|---|
| 5m | medial | −5,4 / 7,1 | 15 mm | 0,80 | 0,96 | 0,83 | 14 px |
| 24dd | medial | −7,6 / 7,8 | 14 mm | 0,84 | 0,97 | 0,86 | 15 px |
| 24dv | medial | −8,7 / 8,8 | 13 mm | 0,86 | 0,98 | 0,88 | 9 px |
| 5L | medial | −11,6 / 12,2 | 23 mm | 0,74 | 0,98 | 0,75 | 24 px |
| 6mp | medial | −14,7 / 15,7 | 31 mm | 0,71 | 1,00 | 0,71 | 27 px |
| 7AL | de su captura | −20,1 / 20,6 | 41 mm | 0,59 | 1,00 | 0,59 | 37 px |
| 4 | de su captura | −27,6 / 28,8 | 64 mm | 0,46 | 1,00 | 0,46 | 48 px |
| 3b | de su captura | −39,9 / 38,8 | 85 mm | 0,31 | 1,00 | 0,31 | 65 px |
| FOP2 | lateral | −41,8 / 42,0 | 94 mm | 0,34 | 1,00 | 0,34 | 23 px |
| OP1 | lateral | −46,4 / 45,8 | 105 mm | 0,25 | 1,00 | 0,25 | 23 px |
| 1 | lateral | −47,3 / 49,2 | 102 mm | 0,25 | 1,00 | 0,25 | 70 px |
| OP4 | lateral | −55,7 / 56,5 | 120 mm | 0,22 | 1,00 | 0,22 | 22 px |
| 6v | lateral | −57,2 / 59,5 | 118 mm | 0,23 | 1,00 | 0,23 | 48 px |

Los pares laterales se separan: la copia de detrás queda en 0,22-0,34, y la de delante, en 1. En los mediales, la de detrás sigue en 0,71-0,86 y la de delante en 0,96-1,00, a 9-27 px de ella. En los de su captura, 3b baja a 0,31, 4 a 0,46 y 7AL a 0,59.

**Por qué no basta con ajustar el tramo.** El factor solo depende de la profundidad. Las dos copias de un par medial están a 13-31 mm una de otra en la dirección de la vista, y el tramo mide 79 mm. Adelantar su principio (`DEPTH_FADE_NEAR`, hoy −0,2) atenúa las dos copias a la vez y apenas cambia la proporción entre ellas. Calculado con la profundidad de cada etiqueta en esa escena (detrás / delante, y entre paréntesis detrás entre delante):

| `DEPTH_FADE_NEAR` | 5m | 24dd | 24dv | 5L | 6mp | 7AL | 4 |
|---|---|---|---|---|---|---|---|
| −0,2 (hoy) | 0,80 / 0,96 (0,83) | 0,84 / 0,97 (0,86) | 0,86 / 0,98 (0,88) | 0,74 / 0,98 (0,75) | 0,71 / 1,00 (0,71) | 0,59 / 1,00 (0,59) | 0,46 / 1,00 (0,46) |
| −0,4 | 0,69 / 0,87 (0,80) | 0,73 / 0,88 (0,83) | 0,76 / 0,89 (0,84) | 0,63 / 0,90 (0,71) | 0,61 / 0,95 (0,64) | 0,51 / 0,96 (0,53) | 0,40 / 1,00 (0,40) |
| −0,6 | 0,61 / 0,77 (0,78) | 0,64 / 0,79 (0,81) | 0,66 / 0,80 (0,83) | 0,56 / 0,81 (0,69) | 0,53 / 0,87 (0,62) | 0,45 / 0,88 (0,51) | 0,36 / 0,97 (0,37) |
| −1,0 | 0,49 / 0,62 (0,78) | 0,51 / 0,64 (0,80) | 0,53 / 0,65 (0,82) | 0,45 / 0,65 (0,69) | 0,43 / 0,71 (0,61) | 0,37 / 0,72 (0,51) | 0,31 / 0,84 (0,36) |

Con −1,0, la copia de delante de 5m baja a 0,62 y la de detrás sigue a 0,78 de ella: el par sigue doble, solo más tenue, y lo que está delante y se ve también se apaga. Para separarlas por distancia haría falta un tramo de unos 30 mm alrededor de la línea media, que apagaría de golpe todo lo que queda detrás de ella.

**Siguiente paso recomendado: oclusión real contra la superficie pintada, para marcadores y etiquetas.** Es lo que el usuario pidió al principio («opacidad por oclusión»). Por ejemplo, en dos pasadas:
- una tenue, sin prueba de profundidad, como hoy;
- otra a opacidad plena, con prueba de profundidad contra la corteza.

Lo que tapa la corteza que se ve quedaría tenue, y lo demás, pleno, sea cual sea su profundidad. Las líneas se quedan con la atenuación por distancia, como decidió el usuario el 24/09/2026. Hay que tener en cuenta tres cosas, todavía sin comprobar en la app:
- Con la cámara de lado, la cara interna del hemisferio de delante queda detrás de su propia corteza. Las dos copias de un par medial se verían tenues. Se separarían, una plena y otra tenue, en las vistas en que solo se ve una.
- Con la forma «Real», un marcador dentro de un surco quedaría tenue. Es el caso por el que hoy se dibujan sin prueba de profundidad.
- Un marcador apoyado en la superficie necesita un pequeño margen de profundidad para no quedar cortado por ella.

**Queda para el resto de la fase 4.**
- **Cerebro 3D:** los surcos más visibles (percentiles 5 y 95, con suavizado) y las etiquetas con la tipografía nueva, el fondo translúcido del tema y su caché por tema y versión de fuentes (spec 6.3). También, la fila que el interruptor ocupa él solo desde 40rem (limitaciones).
- **Connectograma** (etiquetas radiales, arcos, leyenda y nodos) **y hemisferios** (spec 6.1 y 6.2).
- Lo que el usuario decida:
  - la línea media (arriba);
  - el mínimo de la atenuación (0,2);
  - con datos que tengan conectividad efectiva, el tamaño del cono de dirección: radio 0,035, algo mayor que un marcador normal.

**Verificación.**
- **Pruebas.** En la rama, sobre `9b2b92a`: `vitest` 201/201, las 129 de antes y 72 nuevas (61 de la implementación y 11 de la ronda de arreglos de la revisión); `tsc -b` limpio, `oxlint` sin errores y con los mismos 9 avisos, y `vite build` correcto, con el aviso de tamaño de bloque de siempre. Tras la fusión, sobre `63622f0`: `vitest` 343/343 en 39 archivos (las 271 de la D4 y las 72 de esta minifase), `tsc -b` limpio, `oxlint` sin errores y con los mismos 9 avisos, y `vite build` correcto.
- **Cómo se probó en la rama.** En Chromium 140 sin interfaz (Playwright 1.55, WebGL por software) y con el backend local, solo con peticiones GET. Había dos servidores de desarrollo propios: la versión nueva (`9b2b92a`) y la anterior a esta minifase (`c84e6c6`). `GET /connections` cambia el orden de las filas, y con él el orden de dibujo, así que `/regions` y `/connections` de HCP-MMP1.0 (360 regiones y 64 620 conexiones) se sirvieron a las dos versiones desde los mismos JSON. Ventana de 1400 × 900; para la barra, también 1280 × 800 y 1024 × 768. Tema Grafito salvo donde se dice. Lo que sigue, hasta «Tras la fusión», se midió en la rama.
- **Atenuación en las capturas.** En Grafito y en Claro, activada y desactivada:
  - la red Somatomotora (39 regiones, peso mínimo 0);
  - la estrella de 4 derecha (sus 359 conexiones), con la corteza pintada y en la translúcida;
  - en Grafito, además, la estrella vértice a vértice (Power 2011).

  Activada, las etiquetas y los marcadores del hemisferio lejano se ven tenues. Las copias izquierdas de 3b, 4, OP1-OP4 e Ig dejan de competir con las derechas, y las de los pares mediales (5m, 5L, 24dd, 24dv) siguen dobles. Desactivada, se ve como antes, con los marcadores nuevos.

  Las líneas se atenúan hacia el otro hemisferio. En la estrella, al alternar cambia el 6 % de los píxeles, el 79 % de ellos a más oscuro. El mapa de diferencias muestra los trazos atenuados sobre todo lejos de 4 derecha; junto a ella, donde se cruzan todas, apenas cambia. A lo largo de una línea aislada no se pudo medir: con el fondo exacto, las que están solas son del hemisferio de delante y no cambian (46 muestras, el 90 % a ±0,04 de su factor).
- **Medida de la atenuación.**
  - **Escena.** Cinco regiones cercanas (hemisferio derecho) y cinco lejanas (izquierdo), separadas en pantalla y sin líneas. Con la corteza pintada (forma real) y con la translúcida, en pantalla y en el JPEG. Además, un solo hemisferio, el izquierdo, que enseña a la cámara su cara interna.
  - **Medida del plan.** El contraste de cada etiqueta con la mediana del fondo que la rodea, activada entre desactivada.
    - Las cercanas dan 1,0 en todos los casos.
    - Las lejanas quedan por encima del umbral de 0,5 en la pintada (0,622 en pantalla y 0,608 en el JPEG), en el JPEG de la translúcida (0,712) y con un solo hemisferio (0,505). En la translúcida en pantalla dan 0,34.
  - **Por qué no es la app.** La medida da por hecho un fondo liso. El sombreado de la corteza y los pliegues de la malla entran en ella y no se atenúan. Pesa más en las etiquetas lejanas, de unos 6 px de letra: en el fondo solo, sin la etiqueta, la medida de «1» izquierda da 12,1, y con ella, 12,2.
  - **Medida con el fondo restado.** Se repitió la escena, y las capturas y los JPEG salieron iguales byte a byte. Se fotografió también sin marcadores ni etiquetas, que es el fondo, igual con la atenuación activada y desactivada. Restado el fondo, la misma medida da en las lejanas:
    - 0,283 en la pintada, 0,255 en la translúcida y 0,253 con un solo hemisferio. Coinciden con el factor del shader (0,282, 0,253 y 0,252): como mucho a 0,01 región a región.
    - En el JPEG, 0,33 y 0,27, a ±0,07 del factor región a región. Con mínimos cuadrados sobre toda la tinta, a ±0,05.
  - **El JPEG reproduce la atenuación.** Con el fondo restado, sus etiquetas lejanas quedan a +0,05 y +0,01 de las de la pantalla. Con la medida del plan, −0,01 en la pintada y +0,37 en la translúcida.
  - **Marcadores.** Lo lejano quedó en 0,514 veces lo cercano en la pintada, en 0,347 en su JPEG y en 0,44 en la translúcida. En crudo, en la pintada: los lejanos 18-54 activada frente a 26-108 desactivada, y los cercanos 64-250 en los dos estados. En el JPEG de la translúcida, la medida del plan (el centro contra un anillo 5 px por fuera) da 0,964, y 0,881 con el fondo restado. El relleno pastel se parece al gris de la malla y, atenuado, deja ver el contorno casi negro de la exportación. Sobre todo el disco, con el fondo restado, lo lejano queda en 0,22 de lo cercano, como su factor (0,20-0,30), y en la imagen se ve atenuado.
- **Desactivada contra la versión anterior,** región a región y en la misma escena.
  - **Translúcida en pantalla:** el contraste de las etiquetas quedó entre 0,91 y 1,07 veces el de antes, y el de los marcadores, entre 0,97 y 1,00.
  - **Pintada y los JPEG, con la medida del plan:** fuera de ±0,1. En la pintada, 0,88-1,15 en las etiquetas y 0,87-1,00 en los marcadores; en los JPEG, 0,85-1,14 y 0,71-1,13.
  - **Con el fondo restado:** los marcadores de la pintada quedan en 0,94-1,00. Las etiquetas no, 0,49-1,24, porque se han movido a propósito 1,6-2,7 px, y con 6-10 px de letra caen en otra fase de píxel: la «1» es una columna nítida en la anterior y dos columnas grises en la nueva. Desactivada, su material es exactamente el de antes, sin parche, comprobado en el código y en la escena viva.
  - **En los JPEG,** además, la compresión por bloques cambia alrededor de los marcadores más pequeños y de las etiquetas movidas.
- **Interruptor:**
  - activado por defecto, con `aria-pressed`, el estilo del tema (distinto en Grafito y en Claro) y letra de 0,72rem;
  - no es hijo directo de la barra;
  - se conserva al recargar; Espacio y Enter lo alternan y el foco se queda en él, y se llega con Tab desde el selector de hemisferio;
  - la miniatura no tiene barra y sigue la preferencia: al alternar cambia el 8 % de sus píxeles, tres cuartas partes a más oscuro con la atenuación;
  - con el almacenamiento roto, carga activado, se puede desactivar y no hay errores.
- **Barra del 3D:**
  - a 1400 × 900, 4 filas y 122 px (la anterior, 4 y 119); a 1280 × 800, 4 y 122 (4 y 119); a 1024 × 768, 5 y 140 (5 y 138);
  - el interruptor va en la fila de «Exportar JPEG»;
  - el lienzo baja 3, 3 y 2 px (551, 451 y 414 px de alto, frente a 554, 454 y 416);
  - con el interruptor oculto, la barra y el lienzo miden lo mismo que en la anterior, y sin selección la barra mide lo mismo que con ella (D1b).
- **Marcadores:**
  - **Diámetros, con el script del plan, a píxeles enteros.** 18 px el seleccionado (esperado 17,2) y 14 y 15 los normales (12,1 y 13,5); en la anterior, 33 (32,0), 20 y 24 (21,1 y 23,6). Todos a ±2 px.
  - **Proporciones, con el mismo script.** Seleccionado entre normal, 1,30. Nuevo entre anterior, 0,548 el seleccionado y 0,664 el normal, fuera por poco de 0,58 ± 0,08: a píxeles enteros, el borde antialiasado suma 1-2 px, un 10-15 % en un disco de 12-14 px.
  - **Con el borde a media altura y muestreo subpíxel** (dos medidas): 0,574 y 0,583 el normal (esperado 0,576), 0,537 y 0,538 el seleccionado (0,538) y 1,43 y 1,35 seleccionado entre normal (1,4).
  - **Zona de clic.** Un clic a 0,072 del centro de un marcador seleccionado y a 0,05 del de uno sin seleccionar sigue tocando su zona de clic, y a 0,08 no, como antes.
  - **Anillo del nodo `#000000`** (9-46d derecha, Saliencia de Power 2011). Se ve en Grafito y en Claro con la corteza pintada, y en Grafito con la translúcida. En Claro translúcida es un borde gris fino, y el nodo se distingue por su núcleo negro sobre el fondo claro.
- **Captura:**
  - en la versión nueva, los seis fotogramas tras pulsar «Exportar JPEG» y el de 500 ms después son iguales píxel a píxel al de antes;
  - en la anterior, 4 fotogramas (del segundo al quinto) tenían los colores de exportación, en hasta el 29 % de los píxeles;
  - el JPEG mide lo que el lienzo (785 × 551) y tiene las esquinas blancas;
  - un doble clic, el de Playwright y el síncrono, da una descarga;
  - con el teclado, el botón conserva el foco;
  - `aria-disabled` es `true` justo tras el clic y `false` después.
- **Contra la versión anterior,** con la atenuación desactivada y el mismo lienzo:
  - sin selección, el JPEG es igual byte a byte;
  - con la red Somatomotora y el peso mínimo en 0, fuera de marcadores y etiquetas hay 0 píxeles distintos de 403 117 en pantalla y 0 de 391 350 en el JPEG.
- **Línea media:** la escena de la captura del usuario, con la opacidad de cada etiqueta medida con el fondo restado (la tabla de arriba). El tramo que usa el shader es el que calcula `logic/depthFade.ts` con esa cámara y esa malla. El fondo es igual con la atenuación activada y desactivada.
- **Consola:** sin errores en ninguna fase, y sin el aviso de que el parche de la atenuación no se aplicara. El único aviso fue el de three.js sobre `THREE.Clock`, que ya salía antes.
- **Tras la fusión.** Una comprobación corta sobre `63622f0`, en Chromium 140 sin interfaz (Playwright 1.55, WebGL por software), con un servidor de desarrollo propio y el backend local con datos reales, solo con peticiones GET: el script cortaba cualquier otra, y no salió ninguna. HCP-MMP1.0 con Cole-Anticevic y la red Somatomotora seleccionada con su ◎ de Filtros: 39 regiones, las mismas que da `/regions`, con el peso mínimo de por defecto, 0. El cerebro 3D, en la vista grande, con la corteza pintada. Tema Grafito salvo donde se dice.
- **«Exportar JPEG» y el interruptor,** con la red seleccionada:

  | Ventana | Contenido de la vista grande | «Exportar JPEG» | Barra del 3D | Lienzo | Sin el interruptor (oculto por CSS) |
  |---|---|---|---|---|---|
  | 1400 × 900 | 776 px (43rem) | en la cabecera | 138 px, 4 filas | 518 px | 102 px y 3 filas; lienzo de 554 px |
  | 1280 × 800 | 656 px (36rem) | en la barra, en la fila del interruptor | 138 px, 4 filas | 418 px | igual |
  | 1024 × 768 | 400 px (25rem) | en la barra, en la fila del interruptor | 174 px, 5 filas | 348 px | igual |
  | 900 × 600 | 276 px (17rem) | en la barra, en la fila del interruptor | 244 px | 95 px | igual |

  - A 1400 × 900, «Exportar JPEG» queda arriba a la derecha de la cabecera, en el hueco de 126 px que le reserva la fase 3, a 21 px de la descripción, que ocupa tres líneas. A 1280 × 800 queda al extremo derecho de la fila del interruptor, que va a la izquierda.
  - En los cuatro tamaños no se solapa nada: título, descripción, «Exportar JPEG», los cuatro desplegables, el interruptor, la línea de estado y el lienzo. «Exportar JPEG» recibe el clic en su centro y cerca de sus cuatro esquinas, y el interruptor también (medido a 1400, 1280 y 900 px de ancho).
  - A 1400 × 900 y a 1280 × 800, sin selección la barra y el lienzo miden lo mismo que con ella (D1b).
- **Interruptor, en Claro y en Grafito** (1400 × 900):
  - Activado al cargar, sin preferencia guardada. Un clic lo desactiva: `aria-pressed` pasa a `false`, se guarda `false` y cambia el lienzo (el 3,2 % de sus píxeles en Claro y el 2,4 % en Grafito). Se conserva al recargar. Con el foco en él, Espacio e Intro lo alternan y el foco se queda; al recargar, sigue como se dejó.
  - **Contraste del estado pulsado.** El borde es el `--accent` de la regla de la fase 3 (`.export-btn[aria-pressed="true"]`). En Claro queda a 17,8:1 del fondo del panel y a 15,8:1 de su propio relleno; en Grafito, a 14,8:1 y a 12,2:1. En los píxeles de la captura, 17,1:1 y 15,1:1, y 14,4:1 y 11,8:1. En la rama sola, en Claro, quedaba a ~2,2:1.
- **Exportación,** con la red seleccionada, a 1400 × 900 (el botón en la cabecera) y a 1280 × 800 (en la barra), con el código de la verificación en la rama:
  - los seis fotogramas tras el clic y el de 500 ms después son iguales píxel a píxel al de antes: en pantalla no aparece ninguno con los colores de exportación;
  - `aria-disabled` pasa de `false` a `true` justo tras el clic, y vuelve a `false`;
  - el JPEG mide lo que el lienzo (776 × 518 y 656 × 418) y tiene las cuatro esquinas blancas;
  - cada clic da una descarga, también un clic de ratón de verdad en el botón de la cabecera.
- **Avisos,** a 1280 × 800 y a 900 × 600. «Importar», en el navegador, saca el aviso «“Importar síntesis” solo funciona en la aplicación de escritorio.», con `role="alert"`. Con él solo, y con él y el de deshacer («Limpiar» con la red seleccionada da «Se vació la selección de 39 regiones»), la pila queda sobre la columna derecha: empieza en x = 968 y 588 px, y la barra del 3D acaba en x = 943 y 563. No tapa la barra, ni el interruptor, ni «Exportar JPEG», ni los desplegables, que reciben el clic en su centro y cerca de sus esquinas.
- **Consola, tras la fusión:** sin errores. El único aviso fue el de `THREE.Clock`.
- **No comprobado:**
  - la ventana real de Tauri (WebKitGTK en Linux, WebView2 en Windows), y en ella la captura con multimuestreo (4 muestras, resueltas con `blitFramebuffer`);
  - el rendimiento con una GPU real;
  - un atlas volumétrico (Brainnetome);
  - los conos de dirección y las líneas continuas, que no están en los datos: en HCP-MMP1.0 todas las conexiones son estructurales e indirectas;
  - en la translúcida, si una línea que pasa por detrás de un marcador atenuado muestra un corte;
  - la opacidad a lo largo de una línea aislada que cruce el tramo: en las escenas probadas, las líneas lejanas se cruzan con otras;
  - la captura vacía, el contexto perdido y el lienzo sin tamaño, que solo cubren las pruebas unitarias.

El spec queda al día con estas diferencias y con lo que queda abierto:
- 6.3: los marcadores (el contorno a escala 1,36, la zona de clic con el radio de antes y la etiqueta a 0,18 del borde), la atenuación (el tramo con el elipsoide de la caja del cerebro que se ve, en la profundidad del eje de la cámara, el mínimo de 0,2, la preferencia guardada en el navegador y los materiales de siempre al desactivarla) y la captura (el `useFrame` de prioridad 1, el mismo proceso de color que el lienzo, y sin JPEG si falta el contexto, el tamaño o los píxeles);
- 9: las unidades nuevas;
- 11: la D5 y el estado del documento;
- 12: la dependencia de `isXRRenderTarget`, con las pruebas que la vigilan, y lo que tiene que decidir el usuario.

Spec: `docs/rediseno-interfaz-diseno.md`, sección 6.3. Plan: `docs/rediseno-interfaz-plan-3d.md`.

## D7. Paleta suave de las redes (fase 2 del rediseño) -- 25/09/2026

**Numeración.** La D6, «Avisos arriba a la derecha, bajo la barra» (commit `08dbc8e`), está en la rama `rediseno-avisos` y no se ha fusionado en esta.

**Motivación.** Los colores de red eran primarios puros (`#0000ff`, `#00ff00`, `#ffff00`…), y al usuario le parecían un «RGB burdo» (D3). `NETWORK_COLORS` es un dato de cada atlas, y el desarrollador principal dejó escrito que no se toca (`theme/networks.ts:225`). La paleta suave es una capa de presentación calculada a partir de él (spec, principio 2), y siempre se puede volver a los originales.

**Decidido por el usuario (24/09/2026).** «La semántica de colores la mantenemos, pero otros tonos más amables». Aprobó la maqueta con la primera paleta suave («justamente lo que buscábamos, validado por main»), con la opción de volver a los originales cuando una figura tenga que coincidir con la del artículo.

**La paleta B, elegida por el usuario (25/09/2026).** La primera paleta, la A, salía del método de la maqueta. Al verla en la app, el usuario dijo «por defecto y multimodales muy poco distinguibles... en general todos poco distinguibles», y «no sé si demasiado suaves, poco contraste». El método apretaba la luminosidad en una banda estrecha, recortaba el croma a un tope bajo y separaba poco. Así, las redes que el atlas distingue sobre todo por el croma o por la luminosidad quedaban juntas: en Cole-Anticevic, el rojo de Por defecto, el marrón de Multimodal posterior y el naranja de Multimodal ventral. Se le enseñaron, lado a lado, tres candidatas y los originales, en Grafito y en Claro, con la lista de redes de Filtros y franjas de corteza pintada:
- **A, la de entonces:** bandas de luminosidad de 0,60–0,90 (0,46–0,76 en Claro), el croma recortado a 0,13–0,145 y una separación de ΔE_OK 0,085.
- **B, intermedia.**
- **C, viva:** bandas de 0,52–0,92 (0,36–0,70 en Claro), el croma por 0,95 con tope de 0,22–0,23 y una separación de 0,13.

Eligió la **B · intermedia** (`14e9fcc`). Frente a la A, cambia en `scripts/generate_soft_palettes.py`:
- **Croma proporcional:** el original por 0,85, con tope de 0,18 en Grafito y Claro y de 0,19 en Noche, en lugar del recorte a 0,13, 0,145 y 0,14. Conserva las diferencias de croma del atlas.
- **Bandas más anchas:** 0,56–0,92 en Grafito y Noche, y 0,40–0,72 en Claro.
- **Separación:** apunta a ΔE_OK 0,11, con hasta 400 pasadas. Yeo 17 no llega dentro de los márgenes: se queda en 0,097, y sus propios colores del atlas distan solo 0,065. La comprobación y las pruebas exigen un suelo de 0,095.
- **Márgenes asimétricos:** la separación puede sacar la L de la banda 0,02 por abajo y 0,06 por arriba en los temas oscuros, para que ninguna red baje de 3:1 con el panel; en Claro, 0,06 por cada lado.
- **Extremos de la banda:** la comprobación admite que la separación meta hacia dentro hasta 0,09 (`MAX_INWARD_SHIFT`) a la red más oscura o a la más clara de un grupo. En Power, Hipocampo sube 0,070: empieza al pie de la banda junto al negro de Saliencia, que no puede bajar más de 0,02.
- **«Sin clasificar»** sigue a la banda: `#a4a4a4` en los temas oscuros y `#6f6f6f` en Claro.

**«Automática».** El control de Ajustes tiene tres opciones y no las dos del spec (desviación 8). «Automática» da «Suaves» en los temas nuevos y «Originales del atlas» en Original. El usuario preguntó por ella y la entendió («ok ya entiendo... selección automática»).

**Qué cambia.**
- **Generador y tabla.** `scripts/generate_soft_palettes.py`, solo con la biblioteca estándar de Python, lee `NETWORK_COLORS`, aplica el método de 4.3 y escribe `theme/softPalettes.ts`: `SOFT_NETWORK_COLORS`, con una columna por tema (Grafito, Noche y Claro) y las 73 claves, en seis grupos: las cinco clasificaciones y las claves de demostración. Con `--check` dice si la tabla está al día.
- **El modo en las funciones de color** (`theme/colors.ts`): `effectivePaletteMode`, y `resolveNetworkColor`, `exportNetworkColor` y `exportColorFor` con el modo.
- **Todo lo que pinta un color de red sigue la paleta sin tocar su código,** porque lo toma de `useDrawColors`, que ahora lee también el modo: el connectograma, los hemisferios, el cerebro 3D (también al exportar), las etiquetas de red, el buscador, el logotipo, el detalle y el diagrama de síntesis.
- **Las muestras de Filtros** toman el color de `useDrawColors().networkColor`.
- **Exportación:** con «Suaves», la columna de Claro. Un solo resolvedor, `currentExportResolver()`, lee el tema y el modo al exportar. Los SVG y el 3D toman el color de red de `exportNetworkColor`, así que coinciden por construcción.
- **Ajustes:** «Colores de las redes», con las tres opciones, una muestra y la nota del spec. Cada tarjeta de tema enseña la paleta que tendría su tema.
- **Lo que la revisión final de la fase 1 pidió para esta fase, cumplido:** un solo resolvedor de exportación que lee tema y modo; la exportación 3D sigue la paleta, y la prueba que la liga con la de los SVG cubre los dos modos; y las muestras de Filtros y los puntos de Ajustes siguen la paleta, cada tarjeta la de su tema.

**Qué no cambia.**
- `NETWORK_COLORS`, las constantes de la decisión 18 y la lógica de representación.
- `Brain3D.tsx`, `PaintedCortex.tsx` e `index.css`: esta fase no toca ni una línea.
- Los stores, salvo el de apariencia, que gana `setPaletteMode`.
- De `FilterPanel`, que es del desarrollador principal, solo cambia de dónde sale el color de sus muestras.
- Con «Automática», el tema Original conserva los colores de siempre.
- Con «Originales del atlas», la pantalla y las exportaciones tienen que ser las de antes, en los cuatro temas. Lo sostienen las pruebas unitarias: `resolveNetworkColor` con «Originales del atlas» en los cuatro temas, `exportColorFor` con los colores de hoy en el tema Original, y la prueba que liga la exportación 3D con la de los SVG. En la app no se ha comprobado (verificación, abajo).

**La tabla frente a la maqueta.** La maqueta se hizo con la paleta A y el prototipo `palette.py`, que está fuera del repositorio. El generador parte de él, con sus dos correcciones: el recorte del croma por bisección y la luminosidad repartida sobre el mínimo y el máximo reales de cada grupo, sin los acromáticos. Con el método A, la tabla era la de la maqueta salvo en tres a cinco redes de Power por tema, porque a la entrada de la maqueta le faltaban dos de sus diecisiete redes, y salvo las claves nuevas: esas dos y las siete de demostración. Con la B, los colores ya no son los de la maqueta, sino los que eligió el usuario al compararlos en la app.

**Cifras de la B.** ΔE_OK mínimo entre dos redes del grupo / contraste mínimo con el panel:

| Grupo | Grafito | Noche | Claro | Original con «Suaves» (columna de Grafito sobre `#1d1e26`) |
|---|---|---|---|---|
| Demostración | 0,110 / 3,47 | 0,110 / 3,52 | 0,111 / 2,52 | 0,110 / 3,27 |
| Cole-Anticevic | 0,115 / 3,37 | 0,113 / 3,39 | 0,111 / 2,43 | 0,115 / 3,17 |
| Gordon 333 | 0,117 / 3,67 | 0,113 / 3,72 | 0,111 / 2,13 | 0,117 / 3,45 |
| Yeo 7 | 0,154 / 3,48 | 0,156 / 3,53 | 0,137 / 2,42 | 0,154 / 3,27 |
| Yeo 17 | 0,097 / 3,20 | 0,097 / 3,25 | 0,108 / 1,97 | 0,097 / 3,02 |
| Power 2011 | 0,111 / 3,51 | 0,112 / 3,56 | 0,111 / 1,98 | 0,111 / 3,30 |

El tono se desvía como mucho 1,19° en los temas oscuros y 1,46° en Claro. La tabla de Cole-Anticevic está en el spec (4.3).

**Desviaciones del spec.** El spec queda al día con todas (4.1, 4.3, 4.5, 5.2, 9 y 10). Son las del plan, con lo que pasó después:
1. **El modo de paleta vive en `theme/colors.ts`:** `PaletteMode`, `PALETTE_MODES`, `isPaletteMode` y `effectivePaletteMode`. Así la lógica de la paleta está en un solo módulo puro, y `theme/` no depende de `state/`. El tipo estaba en el store, que ahora lo importa de ahí.
2. **Las funciones puras reciben el modo que se aplica,** `"suave"` u `"original"`, no la elección guardada. Solo `effectivePaletteMode(tema, elección)` recibe la elección, que puede ser `null`. La convierten quienes la tienen: `useDrawColors` y `currentExportResolver`, que la leen del store, y `SettingsChoices`, para cada tarjeta y para la muestra.
3. **`exportNetworkColor(clave, modo)`, nueva:** el color de red de la exportación, que usan las dos vías. La prueba invariante lo comprueba en los cuatro temas y con los dos modos.
4. **`currentExportResolver()`,** en `theme/useDrawColors.ts`, sustituye las tres llamadas `exportResolverFor(useAppearanceStore.getState().theme)`, y esos tres componentes dejan de importar el store.
5. **`useDrawColors(forExport)` conserva su firma,** para no tocar `Brain3D.tsx`.
6. **Las muestras de Filtros pasan a `useDrawColors().networkColor`,** como las vistas. Las de Ajustes siguen con `resolveNetworkColor`, porque cada tarjeta necesita su propio tema.
7. **Cada tarjeta enseña la paleta que tendría su tema.** Con «Automática», la de Original enseña la original y las otras tres, la suave de su tema. Con una elección, la siguen todas, porque cambiar de tema la conserva (4.5). La maqueta pintaba siempre la automática.
8. **Tres opciones: «Automática», «Suaves» y «Originales del atlas».** El spec decía dos. Con dos no se podía volver al automático: los radios nativos marcan al moverse con las flechas, así que con solo recorrer el grupo quedaba fijada una elección, y la tarjeta de Original, «Los colores de siempre», pasaba a enseñar puntos suaves. Lo decidió la revisión del plan.
   - «Automática» es la elección `null` y la de por defecto. Lleva la línea «Automática: suaves en los temas nuevos; originales en Original.».
   - Son radios nativos en un `role="radiogroup"`, en lugar de los botones con `role="radio"` de la maqueta. El radio queda oculto (`.visually-hidden`) y su etiqueta hace de botón.
   - La opción marcada lleva el borde, el fondo y el anillo del acento, como la tarjeta del tema elegido, para distinguirse con al menos 3:1. La maqueta usaba `borderStrong`, por debajo de 3:1.
   - Las flechas van a mano desde la revisión de la tanda 2 (abajo).
9. **La muestra** son las doce redes de Cole-Anticevic con la paleta que se aplica, como en la maqueta, y no las de la clasificación cargada, que Ajustes no conoce. Es decorativa (`aria-hidden`) y no lleva el nombre de cada red en una etiqueta emergente, que solo alcanzaría el ratón (spec 8).
10. **La nota** es la del spec, no la primera frase de la maqueta («Cada red conserva su color de siempre, con otra intensidad.»).
11. **`SettingsChoices`** es el contenido del panel sin el store, para probar su marcado en node. Por lo mismo, la prueba de que las muestras de Filtros siguen una elección guardada crea otro store, con `vi.resetModules()` y un `localStorage` simulado.
12. **El generador,** además de lo que pide el spec:
    - no escribe nada si un grupo no cumple la comprobación, que incluye el contraste del tema Original con «Suaves»;
    - con `--check`, dice si la tabla está al día sin escribirla;
    - un grupo con una sola red es un error claro;
    - escribe en UTF-8 aunque la consola sea cp1252, como en Windows, y la tabla con finales de línea LF;
    - la cabecera de la tabla dice que está generada, cómo se regenera y con qué bandas, márgenes y topes;
    - el orden de las claves dentro de un grupo es parte del método;
    - desde la revisión de la tanda 1, la tabla lleva al final la copia de `NETWORK_COLORS` de la que sale (`SOFT_PALETTE_SOURCE`).
13. **El contraste con el panel se prueba en `theme/themeCss.test.ts`,** que lee el panel de cada tema de `index.css`. Cubre también el tema Original con «Suaves», que el spec no pedía: con la A quedaba en 3,66:1 como mínimo, y con la B queda en 3,02:1.
14. **Tabla desfasada.** Si a la tabla le faltara una clave, `resolveNetworkColor` daría el color del atlas antes que un gris que parecería «sin red». La prueba de la tabla lo impide, y desde la revisión de la tanda 1 `npm test` detecta también cualquier cambio de `NETWORK_COLORS` sin regenerarla.
15. **Las claves de demostración** son un grupo más del método. La tabla cubre las 73 claves de `NETWORK_COLORS`, `unclassified` incluida.
16. **El logotipo sigue la paleta** (5.1, «del tema activo»): con «Originales del atlas», sus cuatro nodos son los primarios de Cole-Anticevic.
17. **El tono se comprueba con un croma de 0,04 o más** en el color suave: por debajo, el redondeo a `#rrggbb` ya lo mueve más de 3°. Hoy ninguna red con color queda por debajo.
18. **El panel de Ajustes crece** con la sección nueva, entre 160 y 185 px, calculado. La D3 lo midió en 412 px de alto, y la D3 y la D4 lo vieron entero a 900 × 600. Con 160-185 px más pasaría de los 480 px que le deja esa ventana (`max-height: calc(100svh - 120px)`), y se desplazaría por dentro. Es un cálculo: no se ha medido en un navegador.

**Correcciones de las revisiones.**
- **Tanda 1** (Tasks 1 y 2, datos y lógica), con dos revisores en paralelo. Commit `79ed7c5`:
  - dos pruebas nuevas, y las mismas comprobaciones en el generador, para las dos correcciones del prototipo: ninguna red con color queda casi gris, y la más oscura y la más clara de cada grupo quedan en los extremos de la banda. Deshacer cualquiera de las dos hace fallar las pruebas y la comprobación;
  - `SOFT_PALETTE_SOURCE`, con el que `npm test` detecta una tabla desfasada;
  - la prueba del tope del croma de cada tema, también en la comprobación del generador;
  - una prueba de un valor guardado sin `paletteMode`.
- **Tanda 2** (Task 3, Ajustes), con un solo revisor, porque el diff era pequeño. Commit `38b2bdf`:
  - las flechas del grupo, a mano (`logic/radioGroup.ts`): dan la vuelta en los extremos y conservan el anillo de foco también en WebKit, el motor de Tauri en Linux, que no hace ninguna de las dos cosas;
  - el panel de Ajustes se cierra si el foco cae fuera (`focusin` en el documento), también con Tab tras un clic en un texto del panel;
  - la muestra lleva el anillo de `--text-muted`, como los demás puntos de red;
  - las pruebas de marcado comprueban lo que dicen: un `name` no vacío, una sola opción marcada, radios `.visually-hidden` sin `hidden` ni `style`, y doce redes en la muestra;
  - `text-wrap: balance` en la ayuda y `user-select: none` en las opciones.

**Limitaciones conocidas.**
- **Dos colores casi blancos en los temas oscuros:** «Por defecto A» de Yeo 17 (`#fcffb0`) y «Sin identificar (temporal medial / parietal)» de Power (`#fffbcf`). Quedan cerca del color del texto.
- **Original con «Suaves» queda justo por encima de 3:1:** 3,02:1, con «Visual central» de Yeo 17 (`#9849a3`) sobre `#1d1e26`. Una red nueva podría bajar de ahí, y entonces el generador se negaría a escribir la tabla.
- **El croma por 0,85 apaga también las redes que ya tenían poco croma** en el atlas.
- **En Claro,** los colores suaves quedan entre 1,97 y 2,52:1 sobre blanco, y cuentan con el anillo neutro (principio 6).
- **Daltonismo:** ninguna de las dos paletas lo tiene en cuenta (spec 12).
- **Para el desarrollador principal:** la línea de estado del 3D dice «Cada región con el color real de su red» (`Brain3D.tsx`), y varios comentarios suyos hablan del «color real» (`Brain3D.tsx`, `theme/networks.ts` y `logic/surfaceParcels.ts`). Con «Suaves», no es literal. No se ha cambiado, porque es su código.
- El tamaño del panel de Ajustes, sin medir (desviación 18).
- La ventana real de Tauri no se ha comprobado.

**Verificación.**
- **Pruebas:** `vitest`, 411 en verde tras la paleta B (343 antes de la fase: 68 nuevas), y `oxlint` sin errores y con los 9 avisos de siempre. Hoy son 516, con la oclusión (D8) y las marcas (D9).
- **Experimentos de regresión,** con la paleta B: se deshizo cada una de las dos correcciones del prototipo y se quitó el tope del croma. En los tres casos, el generador se niega a escribir (sale con código 1 y la tabla no cambia), y `softPalettes.test.ts` falla con la tabla que saldría: 7, 3 y 4 de sus 21 pruebas.
- **La verificación en la app real (Tasks 4 y 5 del plan) se empezó y se paró.** Sus navegadores sin interfaz, cada uno con WebGL por software, sobrecargaban la máquina del usuario: la CPU al 98 % y una carga de 54. Más tarde, el núcleo cerró por falta de memoria el Chrome del usuario. Antes de pararla solo había comprobado los datos y un caso, Original con «Automática» y aún con la paleta A, hasta que una captura se quedó sin tiempo. No cuenta como verificación.
- **Sin comprobar,** por eso, todo lo de la tabla del plan:
  - los colores de red en pantalla, en los cuatro temas con las tres elecciones, y que «Automática» sea la paleta que se aplica;
  - que las exportaciones sigan la paleta, con la columna de Claro con «Suaves»;
  - que con «Originales del atlas» salgan iguales byte a byte que antes, con los temas Original y Grafito;
  - el teclado por las tres opciones, en Chromium y en WebKit, y lo que se guarda;
  - el tamaño del panel de Ajustes;
  - la consola.
- **Lo que queda en pie:** las pruebas unitarias, los experimentos de regresión y la prueba del propio usuario en la app, con la paleta B. La aprobó («perfecto») y dijo «creo que está todo operativo».
- **Recomendado:** pasar más adelante una versión ligera, con la máquina libre: un solo navegador, con `nice 19`, y como versión «antes» la de `4977d05`, que tiene la oclusión pero no la paleta ni las marcas, para comparar solo la paleta.

**Queda para la fase 4.** La leyenda del connectograma (5.4) y los gráficos de la sección 6 que no hizo la parte 3D: etiquetas radiales, arcos de hemisferio y nodos del connectograma, hemisferios, surcos y etiquetas 3D. Y, del diagrama de síntesis, el contorno de los nodos en Claro (D3).

El spec queda al día con esta fase:
- el estado del documento;
- la nota del acento, que vale también para la opción marcada de «Colores de las redes» (4.1);
- el método de la paleta B, con sus cifras y la tabla de Cole-Anticevic, y la nota de que la maqueta usaba la A (4.3);
- «Automática», que es la elección `null` (4.5), y el control de tres opciones (5.2);
- las unidades de la fase (9) y sus pruebas (10);
- el orden y el estado de las fases (11);
- los puntos abiertos (12).

Spec: `docs/rediseno-interfaz-diseno.md`, secciones 4.1, 4.3 a 4.5, 5.2 y 9 a 12. Plan: `docs/rediseno-interfaz-plan-fase2.md`.

## D8. Oclusión por la corteza en el cerebro 3D -- 25/09/2026

**Motivación.** Sustituye a «Atenuar lo que queda detrás», de la D5. El usuario la descartó: dependía de la distancia a la cámara y no de lo que tapa la corteza, y en un primer plano se veía igual activada que desactivada. Pidió «simplemente oclusión con alfa en función de profundidad que seguramente render nativo 3d ya incorpora».

**Decidido por el usuario (25/09/2026).** Lo que la corteza pintada tapa se ve tenue, y más cuanto más hondo queda, con la profundidad real de la corteza. Sin interruptor. Tras verlo en la app, aprobó los valores tal como están («perfecto»).

**Qué cambia** (spec 6.3, commit `4ed9c82`).
- En cada fotograma, la corteza pintada sola, en la capa 1 de three.js, se dibuja en un destino con textura de profundidad (`DepthTexture`). Usa la misma cámara y el mismo hemisferio visible, y un material que solo escribe profundidad (`scene.overrideMaterial`). Lo hace un `useFrame` de prioridad 0,5, entre los controles (0) y `ExportBridge` (1), que dibuja el lienzo.
- Los materiales de la capa de foco (líneas, marcadores con su contorno, conos de dirección y etiquetas) comparan su profundidad en la vista con la de la corteza en su píxel. La posición en la textura sale de la posición de recorte, que el shader de vértices pasa al de fragmentos.
- Su opacidad se multiplica por 1 − (1 − mínimo) · smoothstep(inicio, fin, detrás), con inicio 0,25, fin 0,75 y mínimo 0,2, en unidades de la escena (1 = 40 mm): entera hasta 10 mm por detrás de la corteza, y 0,2 desde 30 mm.
- La capa de foco se sigue dibujando sin prueba de profundidad: la opacidad hace la oclusión.
- No hay interruptor. Sin la corteza pintada (malla translúcida, atlas volumétricos o la vista de repuesto), no hay pasada y los materiales no llevan el parche: todo se ve entero, como antes de la D5.
- La exportación la reproduce tal como se ve. `capture3d.ts` no cambia: la captura usa la misma cámara y la profundidad de la corteza del último fotograma.
- Se quitan `logic/depthFade.ts`, `logic/depthFadePreference.ts` y `components/DepthFadeToggle.tsx`, con sus pruebas, y `fadeKey`, con la prueba de su regla. La clave `neurograph.cerebro3d.atenuar` deja de leerse. `PaintedCortex.tsx` pierde `visibleBounds`, que solo usaba la atenuación.
- Sin el interruptor desaparece la fila que ocupaba él solo en la barra del 3D desde 40rem (limitación de la D5). En la prueba de humo, el lienzo mide 776 × 554, lo mismo que la D5 midió a 1400 × 900 con el interruptor oculto.

**Rama y fusión.** Se hizo en la rama `rediseno-oclusion`, desde la D5 (`b3454e5`) y a la vez que la fase 2 (D7): la implementación en `be312e7` y las correcciones de la revisión en `4977d05`. Se fusionó en `rediseno-interfaz` con el commit `0e2ff8b`.

**Detalles de la implementación.**
- **Las luces también van en la capa 1,** aunque en la pasada no alumbran nada. three.js guarda un solo estado de luces para la pasada y para el lienzo: si el número de luces cambiara entre las dos, cada material con luces volvería a pasar por `getProgram` en cada fotograma. Medido en Chromium: 7 revisiones por fotograma con 6 marcadores sin el arreglo, y 0 con él.
- **El parche solo va con la corteza pintada:** sin ella, `occlusionMaterialProps` devuelve `{}`. Solo entonces los marcadores y los conos pasan a `transparent`; en la translúcida siguen opacos, como antes de la D5.
- **La limpieza va en un `useLayoutEffect`.** Corre en el mismo commit de React en que react-three-fiber quita el `useFrame` de la pasada, así que ningún fotograma se dibuja con la oclusión encendida y sin pasada; por ejemplo, al pasar de la corteza pintada a la translúcida.
- **Guardas ante una actualización de three.js y de react-three-fiber:** pruebas que leen su código y fallan si cambia algo de lo que depende la oclusión.
  - Que `packing.glsl.js` siga pasando la profundidad a la de la vista con la cuenta que copia el parche (`perspectiveDepthToViewZ`).
  - Que `WebGLRenderer.js` siga usando `scene.overrideMaterial` y dibujando solo lo que ve la capa de la cámara, y que el material de la corteza lo admita (`allowOverride`).
  - Que react-three-fiber siga ordenando los `useFrame` por prioridad, con números.
- **La conexión, fijada:** `Brain3D.occlusionWiring.test.ts` lee `Brain3D.tsx` y `PaintedCortex.tsx` y comprueba las prioridades, la limpieza en `useLayoutEffect`, que la pasada solo se monta con la corteza pintada y que la corteza está en su capa. Otra prueba fija enteras las dos funciones que el parche añade al shader.

**Diferencias con el spec.** Ninguna: se construyó lo que dice 6.3. Los valores son los de partida. La verificación con capturas que debía ajustarlos se interrumpió (abajo), y el usuario los aprobó al verlos en la app.

**Limitaciones conocidas.**
- **Salto en la silueta:** una línea que sale por el borde de la corteza pasa de tenue a entera en cosa de un píxel, porque el destino de la profundidad no tiene antialiasing.
- **Con la forma «Real» (midthickness),** un marcador dentro de un surco se ve tenue: la corteza de alrededor lo tapa. La D5 ya lo preveía.
- **Una etiqueta junto a la silueta** puede quedar partida: una parte tenue y otra entera.
- **Coste.** En cada fotograma, un dibujo más de la corteza, solo de profundidad (64 984 vértices), y dos recorridos más de la escena. En memoria, un adjunto de color RGBA8 y una textura de profundidad de 24 bits, los dos del tamaño del búfer de dibujo: unos 3,4 MB a 776 × 554. Con un adjunto de color R8 se ahorrarían tres cuartas partes de ese adjunto; queda como opción.
- **La tabla de la línea media de la D5 queda superada:** medía la atenuación por distancia, que ya no existe.

**Verificación.**
- **Pruebas,** en la rama: 352 (las 343 de antes, 61 nuevas y 52 quitadas con la atenuación), y 357 tras las correcciones de la revisión. `tsc -b` limpio, `oxlint` sin errores y con los 9 avisos de siempre, y `vite build` correcto.
- **Prueba de humo** en Chromium sin interfaz, con WebGL por software (SwiftShader). No es la verificación.
  - En la vista lateral de partida, las regiones del hemisferio izquierdo (5m, OP4 y V1) y los tramos de línea que pasan por dentro del cerebro se ven tenues. 4, 3b y 6mp, del lado que se ve, se ven enteras.
  - Apagando la oclusión desde la prueba, porque no hay interruptor, cambian 1 873 píxeles, 1 849 de ellos más claros sin ella.
  - La vista translúcida no cambia. Con un solo hemisferio, su cara interna se ve.
  - Sin errores en la consola ni el aviso de que el parche no se aplicara.
- **Revisión del código,** con 26 mutaciones. Cinco pasaban todas las pruebas: quitar la guarda de `ngOcclusionOn`, quitar el signo de `ngCortexViewDepth`, `#ifndef` en vez de `#ifdef`, cambiar near y far, y leer el canal `.y`. Desde `4977d05`, cada una hace fallar una prueba.
- **La verificación con capturas,** que debía ajustar el inicio, el fin y el mínimo y medir las dos copias de los pares de la línea media (5m, 24dd y 6mp), se interrumpió antes de terminar, por la misma sobrecarga de la máquina que paró la de la D7: sin comprobar. La prueba de humo solo seleccionó una copia de cada región.
- **El usuario lo vio en la app** y aprobó los valores tal como están («perfecto»).
- **No comprobado:** la ventana real de Tauri, el rendimiento con una GPU real y los conos de dirección, que no están en los datos.

El spec (6.3) se escribió para esta decisión, en `4ed9c82`. Después cambian: los valores, que dejan de ser de partida, la pasada, con la prioridad y las luces, y lo que se ve en la vista lateral, que ahora dice lo que vio la prueba de humo en lugar de dar por tenues los pares de la línea media (6.3); las unidades (9) y las pruebas (10); el orden (11); y, en 12, los puntos resueltos, la línea media y los valores de la oclusión, y un riesgo nuevo, su dependencia de three.js y de react-three-fiber.

Spec: `docs/rediseno-interfaz-diseno.md`, sección 6.3.

## D9. Marcas de regiones -- 25/09/2026

**Origen.** El usuario arrastró sobre el connectograma, y el navegador seleccionó las etiquetas como texto, con barras azules. Propuso convertirlo en una función: «una cosa es activar red y otra seleccionar... remarcar nodos seleccionados en todas las vistas». Las marcas son una capa aparte de la selección. Seleccionar sigue activando la red de la región, con sus conexiones y el foco del 3D; marcar solo resalta, para encontrar regiones de un vistazo en las tres vistas sin cambiar lo que se dibuja (spec 5.9).

**Decidido con el usuario (25/09/2026).**
- Ctrl+clic en un nodo marca o desmarca la región; en macOS, Cmd+clic, porque allí Ctrl+clic abre el menú contextual. El clic normal sigue seleccionando.
- Ctrl+Intro en el buscador de regiones marca la sugerencia activa. Lo propusimos nosotros, y lo aprobó.
- En el 3D se marcan el marcador y la etiqueta.
- Deshacer, sí; guardar, no.
- No se exportan.
- Los dibujos dejan de seleccionar texto al arrastrar (`user-select: none`).
- Después, también decisión suya: la línea de las marcas en Filtros solo aparece cuando hay marcas. Hecho en la rama `rediseno-marcas` (`dec7cad`, fusión `7b9e161`): sin marcas no hay línea, y una región viva oculta, siempre presente, sigue anunciando «Ninguna región marcada» al quitar la última.

**Spec:** 5.9, en `5c53cdb`, y `baf8889`: el aviso con «Deshacer» sale también al quitar dos o más marcas.

**Qué cambia.** La implementación está en `f882e6d`, `0a1345e`, `438ed91`, `0f3f1d9`, `854b6df` y `1320dd3`. Las correcciones de la revisión, en `178e3ec`, se hicieron en la rama `rediseno-marcas` y se fusionaron con `c23aa91`.
- **Store,** `state/marks.ts`: las regiones marcadas, con `toggleMark` y `clearMarks`. Cada cambio crea un `Set` nuevo, como la selección.
- **Historial:** la instantánea guarda las marcas. Marcar, desmarcar y «Quitar marcas» son pasos («marcar IFJa (der.)», «quitar las marcas (5)»), y quitar dos o más saca el aviso con «Deshacer». Al cambiar de atlas, `resetForAtlasChange()` vacía las marcas y el historial, sin que el vaciado sea un paso: `handleChangeAtlas` la llama en lugar de `resetHistory()`. Con otra clasificación de redes, las marcas se conservan.
- **Color de marca,** con los tokens `mark` y `markText` (`DRAW_TOKENS`, y `--mark` y `--mark-text` en `index.css`): `#2563eb` con texto blanco, y `#1d4ed8` en Claro.
- **Connectograma, también en la lupa, y hemisferios.** La etiqueta va sobre una pastilla, `MarkedLabel`: un rectángulo redondeado con el mismo `transform` que el texto, medido con `getBBox` antes de pintar. El nodo lleva un anillo exterior del color de marca, separado de él por un hueco del color del fondo, así que se distingue aunque la red sea azul. La exportación quita del clon todo lo que lleva `data-ng-mark`.
- **Filtros:** `MarksLine`, bajo la selección: «Marcadas: N», con los nombres de las primeras y «y N más», cuántas ocultan los filtros y «Quitar marcas».
- **Buscador:** Ctrl+Intro (Cmd+Intro en macOS) marca o desmarca la sugerencia activa, en lugar de añadirla a la selección.
- **Cerebro 3D.** El marcador lleva un anillo, un sprite de cara a la cámara con el hueco y el anillo, y la etiqueta va sobre la pastilla. Los dos llevan `toneMapped={false}`, para que salgan con el color de marca. Las marcas se dibujan también sin foco, fuera de la selección y con el mapa entero pintado, con la oclusión (D8). Mientras se captura la exportación, no se dibujan. `PaintedCortex` pasa a `onRegionClick` las teclas del clic y el desplazamiento del arrastre (cambio aditivo).
- `user-select: none` en `.viz-svg` y `.legend-svg`.

**Contrastes.** El texto de la pastilla queda a 5,17:1, y a 6,70:1 en Claro. El color de marca, a 3,21:1 o más sobre el fondo y el panel de los cuatro temas, y a 3,13–3,14:1 sobre `hemiFill`. En Original, la muestra de color de la línea de Filtros queda a 2,99:1 sobre `--code-bg`, pero es decorativa.

**Correcciones de las revisiones.**
- **Revisión propia** (`854b6df`): `MarkedLabel` solo escribe en la pastilla lo que cambia, porque cada escritura obligaba a recalcular el dibujo antes de medir la etiqueta siguiente; y la ayuda de Filtros, más clara.
- **En el 3D, un Ctrl+clic ya no selecciona la línea de detrás** (`1320dd3`): react-three-fiber entrega el clic a todo lo que atraviesa el rayo, y las líneas se alcanzan desde 1 unidad de la escena, 40 mm.
- **Los tres «importantes» de la revisión,** en `178e3ec`:
  - **Doble marca en el 3D:** con esferas solapadas, como en la vista lateral de partida, un Ctrl+clic marcaba a la vez V1 (izq.) y V1 (der.). El gesto de marcar lleva ahora `stopPropagation` y se queda en la de delante; el clic normal sigue como estaba.
  - **La línea de Filtros:** tiene siempre el mismo alto; «Quitar marcas» no se parte ni se encoge; los nombres se cortan con «…», y cuántas ocultan los filtros va en su propia línea, entera.
  - **La sugerencia aplastada del buscador:** «seleccionada» y «marcada» van una sobre otra, y el aviso de Ctrl+Intro cabe en una línea.
- **Además,** en la misma ronda: un Ctrl+arrastre en el 3D ya no marca al soltar (umbral de 4 px, `MARK_CLICK_MAX_DRAG`); la región viva de Filtros solo anuncia cuántas y cuáles; y cada prueba que añadió falla con su mutación.

**Qué no cambia.** Los stores de selección y de filtros; el clic normal, que sigue seleccionando; y los JPEG, que salen como sin marcas. De `PaintedCortex.tsx`, que es del desarrollador principal, solo se amplía lo que pasa a `onRegionClick`.

**Limitaciones conocidas.**
- **Las marcas de la lupa repiten la geometría de sus etiquetas.** Las etiquetas radiales de la fase 4 tendrán que ponerla al día también ahí.
- **Conducta del código del desarrollador principal, que se deja como estaba:** un arrastre normal para girar que acaba sobre la corteza selecciona una región.
- **Falta un navegador real para comprobar:**
  - la pastilla y el anillo con 360 nodos y en la lupa;
  - el anillo 3D a distintos zooms;
  - WebKitGTK, el motor de Tauri en Linux;
  - que las exportaciones salgan sin marcas;
  - la línea de Filtros con una barra de desplazamiento clásica.

**Verificación.** Solo pruebas unitarias: 516 en `c23aa91`, 91 de ellas nuevas con las marcas. En un navegador no se ha comprobado nada todavía (la lista de arriba).

El spec queda al día con esta decisión: la línea de Filtros solo con marcas (5.9), las unidades (9), las pruebas (10), el orden (11) y la geometría repetida de la lupa (12).

Spec: `docs/rediseno-interfaz-diseno.md`, sección 5.9.
