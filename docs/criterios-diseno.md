# NeuroGraph — Criterios de diseño

Reglas vigentes de la interfaz: disposición, aspecto e interacción. Lo que tiene significado científico (qué codifica cada color, grosor o trazo) está en `docs/criterios-funcionales.md` §10 y no se cambia por diseño. Los valores concretos (colores de cada tema, tokens y medidas) están en el diseño del rediseño, `docs/rediseno-interfaz-diseno.md`. Entre paréntesis va la entrada del log de la que sale cada criterio (números: §7 de `docs/analisis-arquitectura.md`; D: `docs/decisiones-diseno.md`).

## Disposición

- **La vista «Atlas» cabe entera en la ventana**, sin desplazamiento de página. Tiene tres columnas:
  - los filtros, que se pliegan a una franja;
  - la vista elegida, en grande;
  - las otras dos vistas como miniaturas vivas, encima del panel de detalle, que se desplaza por dentro.

  Por defecto, el cerebro 3D va en grande. (D1)
- **Miniaturas:** un clic en ellas, o su botón «Ampliar», las pasa a la grande. La capa que recibe ese clic evita seleccionar nada por accidente y queda fuera del orden del tabulador: con el teclado se usa «Ampliar». (D1, D4)
- **Cambiar de vista no desmonta nada.** Las tres vistas se montan siempre y solo cambia su zona de la rejilla, así que se conservan la cámara, el modo de corteza y la especie de comparación. En miniatura solo se ve el dibujo. (D1)
- **Barra superior, en una fila:** el logotipo, las pestañas de vista con icono, el contexto y el estado de los datos, «Importar», el botón «?» del tour guiado y el engranaje de Ajustes. (D1, D4, D11)
- **Si la barra no cabe**, pliega lo secundario por este orden, y solo lo que haga falta: «Datos reales» se queda en su punto, «Importar» y las síntesis inactivas en su icono y, al final, las vistas inactivas. Lo plegado conserva su nombre en la etiqueta emergente, también con el teclado. (D4)
- **Contexto de datos:** «Atlas» y «Redes» son listas desplegables que se manejan con el teclado, con el nombre corto en el botón y la etiqueta completa en la lista. «Redes» solo aparece si el atlas tiene más de una clasificación. (73, D4)
- **Estado de los datos:** un punto de color con «Datos reales» o «Datos de demostración», con las cifras o el aviso en la etiqueta emergente. «Datos de demostración» nunca se pliega. (D4)
- **Otras pestañas:** «Comparar especies», las dos de tractografía y las de síntesis son vistas aparte, con su propia maquetación. Comparten la barra superior y heredan los temas, la tipografía y los controles. (39, 62, 66, 71, D1, D3)
- **Ventana de escritorio:** 1400×900, con un mínimo de 900×600. Empieza oculta y solo aparece cuando el arranque ha ido bien. (38, 55)

## Temas y colores

- **Cuatro temas:** Original, Grafito, Noche y Claro, que se eligen en Ajustes y no dependen del modo del sistema operativo. Grafito es el de por defecto, también antes de que cargue el JS. Un tema cambia colores, nunca la estructura. (D3)
- **Original conserva los colores de antes del rediseño**, pero recibe como los demás la tipografía, la estructura y los gráficos nuevos. (D3)
- **La apariencia se guarda en el navegador:** el tema y los colores de las redes. Si el almacenamiento falla, se usan los valores por defecto, sin error. (D3, D7)
- **Ajustes:** el engranaje abre un panel con los cuatro temas en tarjetas, cada una con la paleta que tendría su tema, y «Colores de las redes». Los cambios se aplican en el acto. Se cierra con Escape, con un clic fuera o cuando el foco sale del panel. (D3, D7)
- **Todo color sale de un token:** los de interfaz, de las variables CSS de cada tema; los de dibujo (SVG y 3D), de `DRAW_TOKENS`, a través de `useDrawColors()`. Solo quedan fijos el blanco de la exportación y de las imágenes de Comparar especies, el brillo del nodo seleccionado en el 3D y los colores de los tractos. (D3, D10)
- **Contraste medido (WCAG) en cada tema:** el texto supera 4,5:1 sobre el panel, y los controles y gráficos de interfaz, 3:1. El tono tenue (`faint`) queda para separadores, iconos decorativos y controles desactivados. Los colores de dibujo de cada tema se eligen para leerse sobre su fondo, y los de exportación, sobre blanco. (18, 50, D3)
- **El acento de los temas nuevos es neutro**, casi blanco sobre oscuro y casi negro en Claro, para que en la interfaz el color signifique «red». Un estado activo que tiene que distinguirse con 3:1 lleva el borde del acento. El logotipo, con cuatro nodos de colores de red, es la única excepción. (D3, D4, D7)
- **Colores de las redes,** en Ajustes: «Automática», la de por defecto (suaves en los temas nuevos y originales en Original), «Suaves» u «Originales del atlas». Cambiar de tema no borra una elección hecha a mano. (D7)
- **La paleta suave es una capa de presentación** calculada a partir de `NETWORK_COLORS`, que no se toca. Conserva el tono y las diferencias de croma de cada red, reparte la luminosidad en una banda por tema y separa las redes cercanas. (D7)
- **La tabla suave es generada:** `frontend/src/theme/softPalettes.ts` no se edita a mano, sino con `scripts/generate_soft_palettes.py`, que no escribe si un grupo no cumple sus comprobaciones. `npm test` detecta una tabla desfasada. (D7)
- **Anillo neutro:** los nodos y todas las muestras de color de red lo llevan, para que se vean los colores extremos sobre cualquier fondo. En los temas oscuros, cada red suave supera 3:1 con el panel; en Claro quedan por debajo y cuentan con el anillo. (18, D3, D4, D7)

## Aspecto

- **Tipografía:** Atkinson Hyperlegible Next en la interfaz y Atkinson Hyperlegible Mono en los identificadores y las cifras. Van instaladas con la aplicación, sin pedir nada a internet, con su licencia OFL aparte. Botones, desplegables y campos heredan la fuente. (D3)
- **Controles:** las casillas y el deslizador toman el `accent-color` del tema; los botones de alternar llevan `aria-pressed`, y los que solo tienen icono, `aria-label`. El anillo de foco es del color de acento en toda la interfaz. (D3, D4)
- **Teclado:** lo que aparece al pasar el ratón aparece también con el foco del teclado. Los paneles emergentes y las listas se cierran con Escape y devuelven el foco a su botón. (D3, D4)
- **Se reutilizan las variables y patrones existentes.** No se añaden colores sueltos ni un patrón de botón nuevo. (43, 60)

## Etiquetas y lectura

- **Etiquetas de los nodos:** la abreviatura va siempre junto al nodo, en todas las vistas. El nombre completo nunca flota junto al ratón: aparece en un recuadro fijo bajo el dibujo y en el panel de detalle. (14, 15, 19)
- **Abreviatura y nombre:** en recuadros y leyendas se muestra la abreviatura seguida del nombre, salvo que el nombre ya empiece por ella. (19, 23)
- **Lado de la región:** en los textos que nombran una región (el buscador, el historial, el título de una conexión), la abreviatura lleva «(izq.)» o «(der.)» si hace falta y no lo dice ya. El «(hemisferio …)» de los nombres de HCP-MMP1.0 no se repite donde el hemisferio ya se ve. (D4)
- **Recuadros de lectura de altura fija**, para que lo que cambia al pasar el ratón no altere el tamaño del dibujo. El texto que no cabe se desplaza dentro del recuadro, o en el 3D se corta con el texto completo en el emergente. (D1b)
- **Contenido del recuadro:** la región, su hemisferio y su red como etiqueta de color. En el del connectograma, con exactamente una región seleccionada, cuántas de sus conexiones pasan los filtros, con el umbral truncado para no exagerarlo, y «(no se dibujan)» por encima del tope de dibujo. (D4)
- **Textos largos:** un nombre de red largo acaba en «…», con el completo en la etiqueta emergente. (D4)
- **Conexiones:** se escriben «A ↔ B», y «A → B» solo si la conexión es efectiva, la única con sentido. (D4)
- **Tamaños:** el radio de los nodos y el tamaño de letra dependen del número de nodos, nunca del tamaño del contenedor. En el SVG, 1 unidad es 1 px. (19, 21)

## Selección y filtros

- **Selección:**
  - un clic añade o quita el nodo de la selección;
  - seleccionar una conexión borra la selección de nodos, y al revés.

  (14, 43)
- **Controles de red:** en cada red, ◎ sustituye la selección por la red y + la añade a la selección. Aparecen al pasar el ratón o con el foco del teclado, y siempre en las pantallas táctiles. «Limpiar» vacía la selección. (60, 61, D1, D4)
- **Panel de filtros**, de arriba abajo:
  - el buscador de regiones;
  - la selección, en dos líneas, con «Limpiar», ↶ y ↷;
  - la línea de las marcas, solo si hay alguna;
  - las secciones plegables «Redes», «Tipo de conectividad» y «Peso mínimo»;
  - en «Redes», una línea por red, con el nombre corto y el número de regiones (el completo, en la etiqueta emergente), y «Todas» y «Ninguna», que solo afectan a las redes y lo dicen en su etiqueta emergente: «Mostrar todas las redes» y «Ocultar todas las redes».

  (19, 61, D1, D4, D9, D11)
- **Recuentos:** junto a cada tipo de conectividad, cuántas conexiones de ese tipo pasan los demás filtros; bajo el peso mínimo, «N de M conexiones pasan los filtros», porque las vistas pueden dibujar menos. La ayuda va bajo «¿Cómo funcionan los filtros?». (D1, D4)
- **Buscador de regiones,** encima de la selección. Ctrl+K (⌘K en macOS) lleva a él, y despliega Filtros si está plegado. Busca por abreviatura y por nombre, sin distinguir mayúsculas ni tildes, e Intro añade la sugerencia activa a la selección. (D4)
- **El buscador solo sugiere regiones de las redes visibles.** Si lo buscado está en una red oculta, lo dice y ofrece mostrarla: ninguna coincidencia se queda escondida sin decirlo. (D4)
- **Textos de los controles:**
  - cada texto describe lo que el control hace de verdad;
  - un control deshabilitado explica por qué en su texto emergente.

  (43, 60)

## Deshacer

- **Deshacer y rehacer** cubren la selección, los filtros y las marcas. Los botones ↶ y ↷ van en la fila de selección de Filtros y describen el paso en su etiqueta emergente. Los atajos son Ctrl+Z, Ctrl+Mayús+Z y Ctrl+Y (⌘ en macOS), y dentro de un campo de texto son del campo. (D4, D9)
- **Fuera del historial:** pasar el ratón, la vista ampliada, la lupa, el tema, el plegado de paneles y las acciones del tour guiado. Un arrastre del deslizador es un solo paso. Cambiar de atlas o de clasificación, o caer a los datos de demostración, vacía el historial. (D4, D11)
- **Aviso con «Deshacer»** cuando un solo paso quita dos o más regiones de la selección o dos o más marcas. No roba el foco, y se va solo salvo mientras tiene el ratón o el foco encima. (D4, D9)

## Marcas

- **Marcar no es seleccionar:** una marca solo señala la región en las tres vistas, sin cambiar lo que se dibuja. El clic normal sigue seleccionando. (D9)
- **Gesto:** Ctrl+clic (Cmd+clic en macOS) en un nodo, un marcador o una etiqueta del 3D, o en una región de la corteza pintada, marca o desmarca la región. En el buscador, Ctrl+Intro marca la sugerencia activa. (D9, D10)
- **Cómo se ven:** con el color de marca, reservado para ellas. La etiqueta va sobre una pastilla con texto de contraste, que la sigue también girada, y el nodo lleva un anillo exterior separado por un hueco del color del fondo, para distinguirse aunque la red sea azul. (D9, D10)
- **No se guardan ni se exportan.** Se pierden al recargar y se vacían al cambiar de atlas, sin que eso sea un paso del historial; con otra clasificación se conservan. (D9)
- **Los dibujos no seleccionan texto al arrastrar.** (D9)

## Tour guiado

- **Botón «?»,** en la barra, junto al engranaje: es lo único que abre el tour. Lleva su nombre en la etiqueta emergente, también con el teclado, y al salir del tour el foco vuelve a él. (D11)
- **La caja** usa los tokens del tema, la tipografía, el anillo de foco y los patrones de botón de la app, en los cuatro temas. Lo que no señala se atenúa con el fondo del tema. (D11)
- **Controles:** «← Anterior», «Siguiente →» («Terminar» en el último paso), «Salir», Escape y las flechas; «▶ Automático», unos 8 s por paso (más en los largos), que se pausa con cualquier otro control y no sale solo; y el paso, «3 de 13». Un clic en lo atenuado no hace nada. (D11)
- **Accesibilidad:** la caja es un diálogo con nombre y descripción que recibe el foco; una región viva anuncia cada paso, y con movimiento reducido no hay animaciones. Mientras dura, los atajos de la app no actúan. (D11)
- **La app hace cada paso** con sus propios stores y manejadores, y retroceder deshace el paso siguiente. Sin datos reales, o si los datos no cuentan lo que dicen los textos, solo explica y lo dice. (D11)
- **El montaje queda intacto:** al salir, desde cualquier paso, vuelven la pestaña, el atlas y la clasificación (con sus datos ya cargados), la selección, los filtros, las marcas, la vista grande, la lupa, el buscador, las secciones de Filtros y el historial. (D11)
- **Los cinco verbos, cada uno en su paso:** mostrar u ocultar una red, con su casilla; ◎ Resaltar, que sustituye la selección; + Añadir, que la suma; seleccionar, con un clic; y marcar, que solo señala. (D11)
- **Anclas:** el tour señala elementos con `data-tour`, nunca uno con `aria-haspopup`, `aria-expanded` o `aria-controls`, porque driver.js se los quita al dejar de señalarlo. (D11)

## Avisos

- **Avisos flotantes arriba a la derecha**, bajo la barra superior y sobre la columna derecha, apilados hacia abajo. Bajan con la barra si ocupa dos filas, y mientras se ven tapan la cabecera de la primera miniatura. (D6)
- **Cada aviso** lleva un mensaje comprensible y el texto técnico en «Detalles». Los errores se quedan hasta «Entendido», y uno nuevo sustituye al anterior del mismo origen. Quedan por debajo del panel de Ajustes y de las listas. (D4)
- **«Importar» en el navegador** no intenta abrir el diálogo: avisa de que solo funciona en la aplicación de escritorio. (D4)

## Vistas

- **Cabecera de la vista grande:** bajo el título, una línea que explica cómo leerla, sin prometer lo que no se ve. Sus herramientas suben a la derecha de la cabecera si la vista es ancha, y si no, quedan en una fila debajo; del cerebro 3D solo sube «Exportar JPEG». (D4)
- **Panel de detalle,** de más a menos importante: la región, su red con su color y su hemisferio, cómo se asignó la red, sus conexiones de más a menos peso con una barra de peso logarítmica, y el ID al pie, con un botón para copiarlo. Una conexión y varias regiones reciben la misma jerarquía. (D4)
- **Connectograma:**
  - **Etiquetas radiales:** por fuera del anillo y giradas con el ángulo de su nodo; en la mitad izquierda, del revés, para leerse de izquierda a derecha. (D10)
  - **Sitio para la etiqueta más larga:** el anillo deja hasta el borde lo que ocupa la más larga del atlas, ampliada y con su pastilla, para que ninguna se corte. El radio es estable por atlas: no cambia al mostrar u ocultar redes. (D10)
  - **Arcos de hemisferio,** rotulados IZQUIERDO y DERECHO, solo si cada hemisferio forma un bloque seguido en el orden actual y ningún nodo carece de hemisferio. El orden de los nodos no se toca para lograrlo. (D10)
  - **Región seleccionada:** su anillo lleva además un halo del color de selección, en todos los temas y también en la lupa. (D10)
  - **Leyenda:** bajo el dibujo y solo en la vista grande, con los trazos de la evidencia, la flecha de la conectividad efectiva y «Color del punto = red». (D10)
  - **Lupa:** un botón de alternar, solo en la vista grande, que amplía ×3 los nodos cercanos al puntero. Pasar el ratón o hacer clic actúa sobre el nodo más cercano, a 12 px como mucho. Dentro de la lupa solo se dibujan las conexiones activas. (D2, D2b, D4)
  - **Resaltado al pasar el ratón:** las conexiones del nodo pasan al color de resaltado, encima de todas, y el resto se atenúa. La capa resaltada no recibe clics. (D2c)
- **Hemisferios:**
  - **«Ocultar no seleccionados»** dibuja solo la selección, sin sustituir a los filtros. (43)
  - **Elipses:** se calculan con el rango real de todos los nodos, para que las posiciones no salten. En los temas nuevos llevan un relleno del tono elevado del tema y el contorno del color de las líneas; en Original, sin relleno, como antes. (43, D3)
- **Cerebro 3D:**
  - **Cámara:** la vertical es el eje superior-inferior y arranca en vista lateral. Gira alrededor del centroide fijo del atlas y no se recentra al seleccionar. Zoom con la rueda y sin desplazamiento lateral. (23, 24)
  - **Controles:**
    - «Corteza»: pintada o translúcida;
    - «Forma»: real, inflada (la opción por defecto) o muy inflada;
    - «Hemisferio».

    Un clic en la corteza selecciona la región. (72)
  - **Oclusión por la corteza:** el foco (líneas, marcadores, conos y etiquetas) se dibuja encima de la corteza, pero con la corteza pintada lo que ella tapa se ve tenue, más cuanto más hondo queda. No hay interruptor, y sin la corteza pintada todo se ve entero. (72, D8)
  - **Marcadores:** pequeños, para no tapar la región pintada, y algo mayor el de la región seleccionada. Su contorno se ve también en los nodos negros, y su zona de clic es mayor que el propio marcador. (D5)
  - **Etiquetas:** al lado de su marcador en pantalla, sobre una pastilla translúcida del tema y con la tipografía de la interfaz; la de la región seleccionada destaca. Un clic en la etiqueta selecciona su región. (D10)
  - **Surcos:** más marcados, con el sombreado estirado al rango central de sus valores y suavizado, en todos los temas y también dentro de las regiones con color. (D10)
  - **Mallas de fondo:** son translúcidas, no roban clics a los nodos y un fallo al cargarlas no tumba la vista. (22)
- **Tractografía:** una lista de casillas con el color de cada tracto y el recuento «mostradas/reales». La geometría se pide al marcar el tracto. (62)
- **Comparar especies:**
  - un texto de ayuda antes de las imágenes;
  - los errores reales (por ejemplo, un 404) se muestran como texto, no como una imagen rota.

  (39, 60)

## Exportación

- **Paleta de exportación:** el JPEG sale sobre blanco, con los colores de dibujo de Original en el tema Original y los de Claro en los temas nuevos. Las redes salen con la columna de Claro con «Suaves», y con `NETWORK_COLORS` con «Originales del atlas». (D3, D7)
- **En los SVG exportables, todo color es un atributo** con su referencia de tema (`data-ng-fill`, `data-ng-stroke` o `data-ng-stroke-opacity`, con sus ayudantes tipados), que la exportación resuelve en el clon; nunca `var()` ni una clase CSS. El SVG exportado declara una pila de fuentes del sistema. (D3)
- **Qué entra:** el dibujo, con los arcos y el halo. No entran el chrome de la interfaz, la leyenda del connectograma ni las marcas. La leyenda de la selección múltiple se ensancha para no cortar etiquetas. (18, D3, D9, D10)
- **Cerebro 3D:** se captura fuera de pantalla, sin mostrar fotogramas con los colores de exportación, y reproduce la oclusión tal como se ve. Si falta el contexto, el tamaño o los píxeles, no descarga nada. Sus etiquetas salen con la fuente de la interfaz. (D5, D8, D10)
