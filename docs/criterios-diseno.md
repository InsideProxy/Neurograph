# NeuroGraph — Criterios de diseño

Reglas vigentes de la interfaz: disposición, aspecto e interacción. Lo que tiene significado científico (qué codifica cada color, grosor o trazo) está en `docs/criterios-funcionales.md` §10 y no se cambia por diseño. Entre paréntesis va la entrada del log de la que sale cada criterio (números: §7 de `docs/analisis-arquitectura.md`; D: `docs/decisiones-diseno.md`).

## Disposición

- **La vista «Un atlas» cabe entera en la ventana**, sin desplazamiento de página. Tiene tres columnas:
  - los filtros, que se pliegan a una franja;
  - la vista elegida, en grande;
  - las otras dos vistas como miniaturas vivas, encima del panel de detalle, que se desplaza por dentro.

  Al hacer clic en una miniatura, esa vista pasa a la grande; una capa transparente evita seleccionar nada por accidente. Por defecto, el cerebro 3D va en grande. (D1)
- **Cambiar de vista no desmonta nada.** Las tres vistas se montan siempre y solo cambia su zona de la rejilla, así que se conservan la cámara, el modo de corteza y la especie de comparación. En miniatura solo se ve el dibujo. (D1)
- **Barra superior compacta:** marca, pestañas, atlas, redes y la etiqueta de datos. La explicación larga de esa etiqueta va en el texto emergente. (D1)
- **Otras pestañas:** «Comparar especies», las dos de tractografía y la de síntesis son vistas aparte. Tienen su propia maquetación y comparten la barra superior. (39, 62, 66, 71, D1)
- **Ventana de escritorio:** 1400×900, con un mínimo de 900×600. Empieza oculta y solo aparece cuando el arranque ha ido bien. (38, 55)

## Aspecto

- **Tema oscuro explícito**, que no depende del modo del sistema operativo. El chrome de la interfaz no se exporta. (18)
- **Colores de interfaz con contraste medido (WCAG):** los colores intermedios (neutro, acento, intra e inter) se eligen para leerse sobre el fondo oscuro y sobre el blanco de la exportación. (18, 50)
- **Se reutilizan las variables y patrones existentes.** No se añaden colores sueltos ni un patrón de botón nuevo. (43, 60)

## Etiquetas y lectura

- **Etiquetas de los nodos:** la abreviatura va siempre junto al nodo, en todas las vistas. El nombre completo nunca flota junto al ratón: aparece en un recuadro fijo bajo el dibujo y en la leyenda del panel de detalle. (14, 15, 19)
- **Abreviatura y nombre:** en recuadros y leyendas se muestra la abreviatura seguida del nombre, salvo que el nombre ya empiece por ella. (19, 23)
- **Recuadros de lectura de altura fija**, para que lo que cambia al pasar el ratón no altere el tamaño del dibujo. El texto que no cabe se desplaza dentro del recuadro, o en el 3D se corta con el texto completo en el emergente. (D1b)
- **Tamaños:** el radio de los nodos y el tamaño de letra dependen del número de nodos, nunca del tamaño del contenedor. En el SVG, 1 unidad es 1 px. (19, 21)

## Selección y filtros

- **Selección:**
  - un clic añade o quita el nodo de la selección;
  - seleccionar una conexión borra la selección de nodos, y al revés.

  (14, 43)
- **Controles de red:** en cada red, ◎ sustituye la selección por la red y + la añade a la selección. Hay además un botón para limpiar la selección. (60, 61, D1)
- **Panel de filtros:**
  - secciones plegables y una línea por red, con el nombre corto;
  - el texto emergente da el nombre completo y el número de regiones;
  - «Marcar o desmarcar todas» solo afecta a las redes;
  - la explicación del deslizador de peso va bajo «¿Cómo funciona?».

  (19, 61, D1)
- **Textos de los controles:**
  - cada texto describe lo que el control hace de verdad;
  - un control deshabilitado explica por qué en su texto emergente.

  (43, 60)

## Vistas

- **Connectograma:**
  - **Lupa:** una casilla, solo en la vista grande, que amplía ×3 los nodos cercanos al puntero. Pasar el ratón o hacer clic actúa sobre el nodo más cercano, a 12 px como mucho. Dentro de la lupa solo se dibujan las conexiones activas. (D2, D2b)
  - **Resaltado al pasar el ratón:** las conexiones del nodo pasan al amarillo de resaltado, encima de todas, y el resto se atenúa. La capa resaltada no recibe clics. (D2c)
- **Hemisferios:**
  - el botón «Ocultar no seleccionados» dibuja solo la selección, sin sustituir a los filtros;
  - las elipses se calculan con el rango real de todos los nodos, para que las posiciones no salten.

  (43)
- **Cerebro 3D:**
  - **Cámara:** la vertical es el eje superior-inferior y arranca en vista lateral. Gira alrededor del centroide fijo del atlas y no se recentra al seleccionar. Zoom con la rueda y sin desplazamiento lateral. (23, 24)
  - **Controles:**
    - «Corteza»: pintada o translúcida;
    - «Forma»: real, inflada (la opción por defecto) o muy inflada;
    - «Hemisferio».

    Un clic en la corteza selecciona la región. El foco se dibuja encima de la corteza opaca. (72)
  - **Mallas de fondo:** son translúcidas, no roban clics a los nodos y un fallo al cargarlas no tumba la vista. (22)
- **Tractografía:** una lista de casillas con el color de cada tracto y el recuento «mostradas/reales». La geometría se pide al marcar el tracto. (62)
- **Comparar especies:**
  - un texto de ayuda antes de las imágenes;
  - los errores reales (por ejemplo, un 404) se muestran como texto, no como una imagen rota.

  (39, 60)
