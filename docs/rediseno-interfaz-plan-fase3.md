# Rediseño de la interfaz · Fase 3: estructura. Plan de implementación

> **Para agentes:** OBLIGATORIO: usar superpowers:subagent-driven-development (si hay subagentes) o superpowers:executing-plans para ejecutar este plan. Los pasos usan casillas (`- [ ]`) para seguir el avance.

**Objetivo:** la estructura nueva de la interfaz, igual en los cuatro temas. Comprende la barra superior (marca, pestañas con icono, contexto de datos accesible, estado de los datos, Importar y Ajustes), los filtros con recuentos, las cabeceras de las vistas y las miniaturas, los recuadros de lectura con región, hemisferio, red y recuento, el panel de detalle de una región con jerarquía, los avisos flotantes en lugar de las franjas de error, deshacer y rehacer, y el buscador de regiones. No cambia lo que representan los gráficos ni la paleta.

**Arquitectura:**

- **Solo presentación.** El estado, los stores y los manejadores siguen siendo los del desarrollador principal (spec 5.1: «El estado y los manejadores son los actuales»). Se añaden las unidades y props que nombra el spec: `TopBar`, `DataContextMenu`, `Toast`, `Icon`, `NETWORK_SOURCE_SHORT_LABELS`, `WORKSPACE_VIEW_DESCRIPTIONS`, `connectionCountsByType`, los totales de conexiones, el historial `state/history.ts`, `logic/historyStep.ts`, `logic/regionSearch.ts` y `RegionSearch`. El historial se suscribe a los stores de selección y de filtros sin cambiar su código ni su API. Lo demás está justificado en «Desviaciones».
- **Lógica pura aparte.** Los recuentos, los nombres cortos, los títulos de región y de conexión, el teclado de la lista, el plegado de la barra, la cola de avisos, el orden de las conexiones, la comprobación de Tauri, los pasos del historial y la búsqueda de regiones van en módulos de `logic/` sin React. Se prueban con TDD en node, como el store del historial.
- **Colores solo del tema.** Los colores de interfaz salen de las variables de `index.css` (`--bg`, `--panel-bg`, `--text`, `--accent`, `--border`, `--success`...). Los de red salen de `useDrawColors().networkColor` en los componentes nuevos (`NetworkTag`, las filas de conexiones del detalle y las sugerencias del buscador), y de `resolveNetworkColor(clave)` donde ya se usaba (las muestras de los filtros). Hoy los dos dan el color original del atlas, con un solo argumento; la fase 2 los amplía.
- **Estilos** en `App.css`: una sección nueva al final, «Estructura». Las reglas que se quedan sin uso se borran.

**Tecnología:** React 19, TypeScript 6 estricto, Vite 8, zustand 5, vitest 4 (entorno node, sin DOM; `react-dom/server` para comprobar marcado) y oxlint.

**Spec:** `docs/rediseno-interfaz-diseno.md` (commit `1f524db`), secciones 5.1 y 5.3 a 5.8, con las reglas generales de las secciones 3, 7, 8, 9, 10, 11 y 12. La barra de estado que se valoró para 5.7 quedó descartada por la usuaria: no está en este plan. El buscador de regiones (5.8) se añadió después, a petición de la usuaria: es la Task 11.

**Numeración.** Las Tasks 1 a 10 se escribieron antes que el buscador y no se han tocado. En su texto, «Task 11», «Task 12» y «Task 13» son las que ahora son la 12, la 13 y la 14: la verificación en la app real (dos tareas) y la D4 con los retoques del spec.

**Referencia visual:** la maqueta aprobada `/home/dae/.config/superpowers/worktrees/Neurograph/rediseno-referencias/maqueta-claude-design/Main.dc.html`, pantalla principal a 1440×900. Sirve para la disposición, el espaciado, la jerarquía, el logotipo y los iconos. Donde no coincide con el spec, manda el spec.

**Orden de las fases:** esta fase va antes que la 2 (paleta suave). Lo propusimos nosotros, porque lo que más pesaba en la petición inicial era la estructura, y la usuaria nos dejó seguir en autónomo (spec 11). No depende de la fase 2.

**Lo que la fase 1 dejó para esta** (D3 de `docs/decisiones-diseno.md`, «Limitaciones conocidas», y spec 12):

- La barra superior ocupa dos o tres filas a 1280 y 1024 px desde que lleva el engranaje. La barra nueva va en una fila y, si no cabe, pliega lo secundario por pasos (Task 2). La verificación (Tasks 12 y 13) lo mide.
- La leyenda de la selección múltiple es un SVG de 260 px de ancho y en pantalla corta las etiquetas largas. Al exportarla ya se ensancha: `exportSvgAsJpeg` recibe un cuarto parámetro, `{ fitWidthToContent: true }` (commit `cea7df2`), y nunca estrecha la imagen (`fittedWidth`, commit `2ca8f7d`). En pantalla lo resuelve la Task 8, que deja esa llamada tal cual y el `<svg>` sin `viewBox`.
- Los anillos neutros de las muestras de color de red, que en Claro pierden los amarillos sobre blanco: los llevan todas las muestras de esta fase y `.legend-swatch` (Task 4).
- El anillo de foco del color de acento en toda la interfaz: una regla `:focus-visible` general (Task 1).

**Fuera de esta fase:**

- La leyenda del connectograma (5.4): la sección 11 del spec la pone en la fase 4.
- La opción «Colores de las redes» de Ajustes (5.2) y todo lo de la paleta suave: fase 2.
- Los cambios de los gráficos (sección 6): fase 4.
- El engranaje y el panel de Ajustes ya existen: son `SettingsMenu.tsx`, de la fase 1 (el spec lo llama `SettingsPopover`). La barra nueva lo integra tal cual.

**Dónde se trabaja:**

- Worktree `/home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz`, rama `rediseno-interfaz`.
- La copia principal `/home/dae/PycharmProjects/Neurograph/Neurograph` no se toca.
- `frontend/node_modules` ya está preparado en el worktree. No ejecutes `npm install`: esta fase no añade dependencias.

**Convenciones:**

- Identificadores en inglés y comentarios en castellano, como el código actual. Los comentarios nuevos citan «D4 de docs/decisiones-diseno.md»; el Step 0 de la Task 1 y el Step 1 de la Task 14 comprueban que ese número está libre.
- **Rutas absolutas en todos los comandos.** Las órdenes de `frontend/` empiezan con `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend`.
- Órdenes, desde `frontend/`:
  - Una prueba: `npx vitest run <ruta>`. Todas: `npm test`. Al escribir este plan había 115 pruebas. El Step 0 de la Task 1 anota las que haya al empezar: es la **BASE**, y cada tarea da sus cuentas como «BASE + N». Son las cuentas de este plan: si la revisión de una tarea añade pruebas, se suman (la de la Task 1 añadió 3, en `DataContextMenu.test.tsx`, commit `fdfd932`).
  - Tipos: `npx tsc -b`.
  - Lint: `npm run lint`. La línea base da **9 avisos** (3 `set-state-in-effect`, 4 `preserve-manual-memoization`, 2 `exhaustive-deps`) y ningún error; oxlint no imprime un resumen, así que se cuentan con `npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c`. No pueden aumentar. Si aparece un aviso nuevo, no se silencia: se reestructura el código (por ejemplo, se quita la memoización manual o el cálculo pasa a una función pura). Si no hay forma de volver a 9, la tarea se detiene y se informa como BLOQUEADA.
  - Compilación: `npm run build`. El aviso de tamaño de bloque (más de 500 kB) ya estaba.
- **`index.css` no se toca.** `theme/themeCss.test.ts` comprueba que los cuatro temas definen las mismas variables y que los textos y estados guardan 4,5:1 sobre el panel. Si alguna tarea necesitara una variable nueva, iría en los cuatro bloques, con esos contrastes.
- **Paso «Comprobar» al final de cada tarea:** las cuatro órdenes, todas bien, y la búsqueda de colores fijos de esa tarea sin resultados nuevos.
- oxlint avisa si un `.tsx` exporta algo que no sea un componente o un tipo (`react/only-export-components`). Las funciones puras van en archivos `.ts`.
- Las pruebas de componentes usan `renderToStaticMarkup` de `react-dom/server`, que funciona en node sin dependencias nuevas. Solo donde hay un requisito de marcado: roles, `aria-*`, botones sin anidar.
- `tsconfig.app.json` exige `import type` para los tipos (`verbatimModuleSyntax`) y da error por imports o variables sin usar (`noUnusedLocals`).
- **Commits:** uno o más por tarea. Mensaje en castellano sin tildes ni eñes, que empieza por `Estructura: ` y termina con la línea `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. `git add` solo de los archivos que nombra la tarea. Nada de `git stash`.
- **Estado y manejadores.** No cambies el estado, los stores ni los manejadores de App ni de los componentes salvo lo que dice cada tarea.
- `docs/` lo está tocando otra sesión: solo la Task 14 lo modifica.
- **Letra mínima de 0,7rem** en todo lo nuevo, también en rótulos, recuentos y etiquetas pequeñas (la revisión final de la fase 1 subió así los de Ajustes). La jerarquía la dan el peso y el color, no letras más pequeñas.

## Mapa de archivos

Nuevos, todos en `frontend/src/`:

| Archivo | Responsabilidad |
|---|---|
| `components/Icon.tsx` | Iconos SVG en línea de la maqueta, con trazo `currentColor` |
| `components/DataContextMenu.tsx` | Botón con lista desplegable (`role="listbox"`) del contexto de datos |
| `components/TopBar.tsx` | Barra superior (`TopBar`), que se pliega por pasos si no cabe, y estado de los datos (`DataStatus`) |
| `components/Toast.tsx` | Aviso flotante (`Toast`) y su región (`ToastRegion`), con la región viva que anuncia los avisos discretos, como el de deshacer |
| `components/NetworkTag.tsx` | Etiqueta de red con su color (`NetworkTag`) y resumen de una región (`RegionSummary`) |
| `logic/topBarFit.ts` | Orden en que se pliega la barra, elección del menor nivel que cabe y pestaña que recibe el foco al cerrar una síntesis |
| `logic/listbox.ts` | Teclado de la lista desplegable |
| `logic/dataContext.ts` | `NETWORK_SOURCE_SHORT_LABELS` y nombres cortos y completos de atlas y clasificaciones |
| `logic/displayText.ts` | Cifras breves, nombre corto de una red, texto de la selección, conexiones que pasan los filtros (en Filtros y en el recuadro de lectura), hemisferio, nombre de una región (con su lado), flecha y título de una conexión |
| `logic/toastQueue.ts` | Cola de avisos, con una clave por origen |
| `logic/desktopOnly.ts` | Ejecutar algo solo en la aplicación de escritorio (`isTauri()`) |
| `logic/filterCounts.ts` | Recuentos por tipo de conectividad, visibles y cargadas |
| `logic/regionConnections.ts` | Conexiones de una región por peso, con su sentido, y las cinco primeras |
| `logic/clipboard.ts` | Copiar al portapapeles sin lanzar errores, y cómo se escribe un atajo en cada sistema (⌘C o Ctrl+C; desde la Task 11, `shortcutLabel`) |
| `logic/historyStep.ts` | Qué cambia entre dos instantáneas del historial, cómo se dice, si merece el aviso con «Deshacer», qué dicen los botones y qué atajo deshace o rehace. Desde la Task 11, también si el foco está donde se escribe (`isTextEntry`), que comparten los dos atajos |
| `state/history.ts` | Historial de deshacer y rehacer: instantáneas de la selección y de los filtros |
| `components/HistoryButtons.tsx` | Botones «Deshacer» y «Rehacer» de la fila de selección de Filtros: `HistoryButtons`, con el historial, y `HistoryButtonsView`, sin él |
| `components/useHistoryShortcuts.ts` | Atajos de teclado del historial y aviso de puntero pulsado para el deslizador |
| `logic/regionSearch.ts` | Qué regiones sugiere el buscador y en qué orden, cuándo avisa de las redes ocultas, la sugerencia activa, las teclas del campo y el atajo Ctrl+K |
| `components/RegionSearch.tsx` | Buscador de regiones con autocompletado: `RegionSearch`, con los stores, y `RegionSearchView`, sin ellos |
| `components/useRegionSearchShortcut.ts` | Atajo Ctrl+K (⌘K) del buscador, y llevar el foco a su campo |
| Pruebas | Un `*.test.ts` por módulo de `logic/` y por el historial, más `components/TopBar.test.tsx`, `components/Toast.test.tsx`, `components/FilterPanel.test.tsx`, `components/Connectogram.test.tsx`, `components/DetailPanel.test.tsx`, `components/HistoryButtons.test.tsx` y `components/RegionSearch.test.tsx` |

Modificados:

- `App.tsx`: barra superior, contexto de datos, avisos, recuentos para los filtros, cabeceras de las vistas, deshacer (atajos, aviso y `resetHistory()` al cambiar de atlas y al llegar otra clasificación) y Ctrl+K, que lleva al buscador.
- `App.css`: sección «Estructura» nueva y borrado de las reglas que se quedan sin uso.
- `components/FilterPanel.tsx`: presentación nueva (5.3), la prop `historyControls` para los botones de deshacer y el buscador de regiones sobre la selección. La lógica y los comentarios del desarrollador principal se quedan.
- `components/DetailPanel.tsx`: presentación nueva (5.5). Exporta `RegionDetail` para su prueba de marcado.
- `components/Connectogram.tsx`: la lupa pasa a botón de alternar y el recuadro de lectura muestra región, hemisferio y red, y con una sola región seleccionada, su recuento. Una conexión lleva «↔», o «→» si es efectiva.
- `components/Hemisferios.tsx`: solo el recuadro de lectura, con la misma flecha.
- Documentos, en la Task 14: `docs/decisiones-diseno.md` (D4) y `docs/rediseno-interfaz-diseno.md` (retoques).

Sin cambios: `index.css`, `theme/*`, los stores que ya había en `state/` (el historial es un archivo nuevo que se suscribe a ellos), `SettingsMenu.tsx`, `Brain3D.tsx` (sus controles cambian solo por CSS) y los valores de `theme/networks.ts`. `ATLASES` está en `App.tsx`, no en `data/`, y ahí se queda.

## Desviaciones del spec en esta fase

La Task 14 las anota en el spec y en la D4.

1. **Pestañas: un `<nav>` con `aria-current`, no un `tablist`.** Cada pestaña cambia la pantalla entera, como una página. Un `tablist` solo puede contener elementos `tab`, así que el botón de cerrar de cada síntesis no podría ir junto a su pestaña. Además pediría un `tabpanel` y moverse entre pestañas con las flechas. Con `<nav aria-label="Vistas">` y `aria-current="page"` en la activa, los roles son los que corresponden a una navegación, y el botón de cerrar es un `<button>` hermano del de la pestaña, no anidado.
2. **Si la barra no cabe en una fila, se pliega lo secundario, por pasos.** El spec no dice qué pasa cuando no cabe (la maqueta está dibujada a 1440 px). Las pestañas de las vistas son la navegación principal, así que son lo último que se pliega. El orden es este, y solo se aplica lo que haga falta:
   1. «Datos reales» se queda en su punto de color. «Datos de demostración» nunca se pliega: es un aviso.
   2. «Importar» se queda en su icono.
   3. Las pestañas de síntesis inactivas se quedan en su icono. Sus nombres los escribe quien genera la síntesis y pueden ser largos: se cortan a 10rem, y enteros quedan en la etiqueta emergente.
   4. Las pestañas de vista inactivas se quedan en su icono.

   Lo plegado conserva su nombre para los lectores de pantalla y su etiqueta emergente al pasar el ratón. Las pestañas e «Importar» plegados la muestran también al llegar con el teclado (`:focus-visible`). El punto de «Datos reales» no se enfoca: sus cifras están en su nombre accesible, pero quien usa el teclado sin lector de pantalla no ve la etiqueta emergente. La barra mide si cabe y elige el menor paso que basta (`logic/topBarFit.ts`, atributo `data-collapse`), en lugar de puntos de corte fijos. Lo que ocupa depende del contenido: los nombres de atlas y clasificación, datos reales o de demostración, y cuántas pestañas de síntesis hay y cómo se llaman.

   Cálculo con la fuente real (anchos de avance de Atkinson Hyperlegible Next y las medidas del CSS de la Task 2), en la vista Atlas con HCP-MMP1.0 y «Redes»:
   - 1400 px, la ventana por defecto de Tauri: no se pliega nada (hacen falta unos 1319 px).
   - 1280 px: solo «Datos reales», que se queda en su punto (1236 px).
   - 1024 px, con la raíz a 16 px: se pliega todo lo que se puede (770 px).
   - A 1400 px con una pestaña de síntesis de nombre corto, como «Lenguaje»: solo «Datos reales» (1354 px). Con un nombre de unas 18 letras, como «Memoria de trabajo», también «Importar» (1350 px); con uno largo, también el nombre de la síntesis, que está inactiva en la vista Atlas (1224 px).
   - A 1400 px con dos o tres síntesis de nombre largo: «Datos reales», «Importar» y los nombres de las síntesis inactivas (1279 y 1334 px).
   - Los nombres de las vistas se ven en todos esos casos.

   Si ni así cabe, la barra pasa a dos filas. Son estimaciones: la verificación (Task 12) mide la barra real, y la D4 cita lo medido, no estas cifras.
3. **Los avisos van en una cola con clave, en lugar de `synthesisImportError` y `networkSourceError`.** Cada aviso necesita dos textos, el mensaje comprensible y los «Detalles», y el de «solo en la aplicación de escritorio» es nuevo. El flujo de los manejadores no cambia:
   - Cada `setSynthesisImportError(texto)` pasa a un aviso con la clave `importar`, y cada `setNetworkSourceError(texto)` a uno con la clave `redes`.
   - Cada `…(null)` pasa a retirar el aviso de esa clave.
   - Un aviso nuevo sustituye al anterior del mismo origen, como pasaba con las franjas.
   - El spec no dice dónde van. Van arriba a la derecha, bajo la barra y sobre la columna derecha, con su ancho: no tapan la vista grande ni su recuadro de lectura.
4. **«Redes» solo aparece si el atlas tiene más de una clasificación.** Es la condición de hoy (decisión 73). El spec no la cambia de forma explícita y dice que el estado y los manejadores son los actuales.
5. **Estado de los datos.** Tres detalles que el spec no define:
   - Mientras carga, muestra un punto neutro con «Cargando…».
   - Con datos de demostración, la etiqueta emergente conserva el aviso completo de hoy: datos sintéticos, solo ilustrativos, y que la API no respondió. Las cifras de esos datos no dicen nada.
   - El bloque es `role="status"`, así que el cambio se anuncia.
6. **Las secciones de los filtros siguen siendo plegables, pero con un botón y no con `<details>`.** La cabecera de «Redes» lleva los botones «Todas» y «Ninguna», que no pueden ir dentro de un `<summary>`. El título de cada sección es un botón con `aria-expanded` y `aria-controls`, dentro de su encabezado; «Todas» y «Ninguna» son botones hermanos, fuera de él. Las tres secciones empiezan abiertas, como hoy. Más cambios:
   - La línea «◎ resalta solo esa red · + la añade a lo ya resaltado» pasa a «¿Cómo funcionan los filtros?», porque ◎ y + ya no están siempre a la vista.
   - Esa ayuda gana una frase sobre los recuentos por tipo, que solos no se entienden, y otra que avisa de que las vistas pueden dibujar menos conexiones de las que pasan los filtros: con dos o más regiones seleccionadas, solo las que hay entre ellas, y con más de 10 000, ninguna.
   - «Se ven N de M conexiones» pasa a «N de M conexiones pasan los filtros», con singular donde toca. «Se ven» prometía lo que las vistas no siempre dibujan.
   - Cada sección es un grupo (`role="group"` con el nombre de su título) y no un `<section>`: tres puntos de referencia más en un panel lateral estorbarían.
   - ◎ y + aparecen con el ratón encima o con el foco del teclado dentro de la fila (`:has(:focus-visible)`), no con `:focus-within` como dice 5.3: un clic en la casilla no debe dejar la fila como si tuviera el ratón encima.
7. **Herramientas de la vista grande.** Van a la derecha de la cabecera si la vista grande mide al menos 40rem (720 px con la raíz de 18 px), lo que decide una consulta de contenedor. La cabecera les deja su hueco y la descripción se parte en dos o tres líneas. Cálculo con las medidas de la Task 5, con los filtros desplegados: a 1400 px el contenido de la vista grande mide 776 px y a 1366 px, 742 px, así que suben; a 1280 px mide 656 px y se quedan en una fila bajo la cabecera, como hoy, porque taparían la descripción. Con los filtros plegados suben también a 1280 px (872 px). El cerebro 3D sin selección no tiene botón de exportar, y ahí la cabecera no reserva el hueco.
8. **Miniaturas.** La capa que amplía al hacer clic se queda, pero fuera del orden del tabulador (`tabIndex={-1}` y `aria-hidden`). Con el teclado se usa «Ampliar», que deja el foco en el título de la vista ya ampliada.
9. **El «(hemisferio …)» de los nombres de HCP-MMP1.0.** La ingesta los guarda como «Area IFJa (hemisferio derecho)». El hemisferio ya se muestra aparte, en el recuadro de lectura y en la etiqueta del detalle, así que ahí se quita del nombre, pero solo si coincide con el hemisferio de la región: «izquierdo» con `L` y «derecho» con `R`. Si la región no tiene hemisferio (`hemisphere` puede ser `NULL`, migración 0008) o no coincide, el nombre se muestra entero. También se muestra entero si no acaba exactamente en «(hemisferio izquierdo)» o «(hemisferio derecho)». Si el nombre sin el sufijo solo repite la abreviatura, no se muestra: pasa con ingestas antiguas, como «V1 (hemisferio izquierdo)». Las pruebas cubren los cuatro casos.
10. **«Ver las N» se puede volver a plegar**, con «Ver solo las 5 primeras».
11. **Unidades nuevas que el spec no nombra:**
    - `NetworkTag.tsx`: `NetworkTag` y `RegionSummary`, que comparten los recuadros de lectura y el detalle.
    - `DataStatus`, en `TopBar.tsx`.
    - `HistoryButtons.tsx` y `useHistoryShortcuts.ts`, los botones y los atajos de deshacer. `HistoryButtonsView` pinta los botones sin el historial, para probarlos con cualquier estado. `FilterPanel` recibe los botones en una prop nueva, `historyControls`: el panel no sabe nada del historial.
    - `RegionSearchView`, el buscador sin estado, para probar su marcado con cualquier resultado, y `useRegionSearchShortcut.ts`, el atajo Ctrl+K. Tres piezas que el buscador comparte con tareas anteriores: `isTextEntry`, en `logic/historyStep.ts`, dice si el foco está donde se escribe, para los dos atajos; `shortcutLabel`, en `logic/clipboard.ts`, escribe un atajo como en cada sistema, para el de copiar y el del buscador; y `SIDE_IN_ABBREVIATION`, en `logic/displayText.ts`, pasa a exportarse.
    - Nueve módulos de lógica pura, para poder probarla sin DOM (sección 10): `topBarFit.ts`, `listbox.ts`, `dataContext.ts`, `displayText.ts`, `toastQueue.ts`, `desktopOnly.ts`, `filterCounts.ts`, `regionConnections.ts` y `clipboard.ts`.
12. **Título de una conexión y sentido de las efectivas.** El spec pide la misma jerarquía que en una región, sin decir el título. Es «IFJa ↔ 8C»: la flecha «→» queda para la conectividad efectiva, porque el principio 1 del spec reserva la flecha para ella. Más detalles:
    - La misma regla (`connectionArrow`, en `logic/displayText.ts`) vale donde la interfaz nombra una conexión: el título del detalle, los recuadros de lectura del connectograma y de los hemisferios, y la lista de conectividad inducida, que conserva los nombres completos (30/08). Es presentación: los datos y el orden de las regiones no cambian.
    - Las abreviaturas de HCP-MMP1.0 no llevan hemisferio, así que si las dos regiones se llaman igual o están en hemisferios distintos cada una lleva el suyo: «V1 (izq.) ↔ V1 (der.)». No se añade si la abreviatura ya dice el lado, como en Brainnetome («L_SFG_7_1») o Gordon («l_default_12»).
    - En los datos de una conexión que no es efectiva, «Origen» y «Destino» pasan a «Región A» y «Región B»: sin sentido, no hay origen.
    - En la lista de conexiones de una región, las efectivas dicen «hacia» o «desde» la otra región.
13. **Foco al cerrar.** Al cerrar una pestaña de síntesis, el foco pasa a la síntesis que ocupa su sitio, a la anterior si era la última, o a «Atlas». Al cerrar un aviso con «Entendido», pasa al botón del siguiente aviso o, si era el último, a «Importar» (el aviso de deshacer tiene su propio destino, en la desviación 14). Al plegar o desplegar Filtros, pasa al botón que sustituye al pulsado. Sin esto, el foco caería en la página, porque el botón que lo tenía desaparece.
14. **Detalles de deshacer (5.7) que el spec no fija o que cambian:**
    - Los cambios que llegan en la misma tarea del navegador son un solo paso: «Resaltar» una red oculta la muestra y la selecciona, con dos llamadas a dos stores.
    - Un arrastre del deslizador se da por terminado al soltar el puntero, aunque el valor se quede quieto a medio arrastre. Solo cuenta el puntero pulsado sobre el deslizador. Si el peso vuelve a donde estaba, no hay paso, y lo que se podía rehacer se conserva.
    - El spec pide `role="status"` para el aviso; aquí no lleva rol. Su texto lo anuncia una región viva oculta (`aria-live="polite"`) que está siempre en la página, porque una región viva que aparece con el texto ya dentro no siempre se anuncia; y el aviso visible, sin rol, no se lee dos veces. Los demás avisos, como los errores, siguen con `role="alert"`.
    - Los 8 s del aviso se paran mientras tiene el ratón encima o el foco: nadie pierde el botón mientras va a pulsarlo. Tras usar su «Deshacer», o al cerrarlo, el foco va al botón ↶ si se ve, y si no (con Filtros plegado), al título de la vista grande. Nunca a «Importar», que no tiene nada que ver.
    - El «Deshacer» del aviso deshace el último paso, que siempre es el suyo: cualquier otro cambio del historial retira el aviso.
    - N cuenta solo las regiones del atlas que se está viendo: los ids de un atlas anterior se quedan en el store y no se ven.
    - Con otra clasificación, el historial se vacía cuando llegan sus datos, no al elegirla: mientras carga se sigue viendo y usando la anterior, y si falla, no cambia nada.
    - En las descripciones, las regiones llevan su lado, «añadir IFJa (der.) a la selección», porque las abreviaturas de HCP-MMP1.0 no lo llevan; no se añade si la abreviatura ya lo dice. Quitar la única región seleccionada es «quitar … de la selección», no «limpiar la selección».
    - El peso se escribe como en Filtros (`formatMinWeight`): «peso mínimo de 1.0e-3 a 4.0e-3», y no «de 0,001 a 0,004» como en el ejemplo del spec.
    - El teclado no actúa con la tecla repetida por mantenerla pulsada, si otro ya atendió el evento, ni mientras está abierta una lista desplegable o el panel de Ajustes, que tienen su propio teclado. Con un teclado sin letras latinas, mira la tecla física (`event.code`).
15. **El recuento del recuadro de lectura (5.4) va solo en el del connectograma**, como en la maqueta, junto a la pista «pasa el ratón por otra región para verla», y solo con exactamente una región seleccionada. Sin umbral de peso, no lleva el paréntesis «(peso ≥ …)». El umbral se escribe como el valor de «Peso mínimo» en Filtros (`formatMinWeight`: «0.02» o «4.0e-3»), y no «0,02» como en el ejemplo del spec: así el mismo número se ve igual en los dos sitios.
16. **Buscador de regiones (5.8): lo que el spec no fija.**
    - Con la lista abierta, las teclas son las de la lista del contexto de datos (`listboxKey`), salvo espacio, Inicio y Fin, que son del campo: escriben o mueven el cursor, como en cualquier campo de texto. Con la lista cerrada, la flecha abajo la vuelve a abrir. Sin lista (solo el aviso de las redes ocultas, o «Ninguna región coincide.»), el primer Escape ya vacía el campo.
    - La sugerencia activa al escribir es la primera que no está ya seleccionada; si todas lo están, la primera. El spec dice «la primera»: así, escribir «te1m» e Intro dos veces añade las dos TE1m, en lugar de que el segundo Intro no haga nada.
    - La activa lleva el contorno del color de acento (8), porque el foco se queda en el campo y el fondo solo no se distingue lo bastante, y sus textos grises pasan a `--text`. Se desplaza a la vista al abrir la lista, al escribir y con el teclado, no con el ratón; el ratón sí la cambia, como en `DataContextMenu`.
    - Los avisos van en una línea bajo el campo, y la lista, que flota, bajo ella: una lista (`listbox`) no puede llevar botones. Sin ninguna coincidencia, dice «Ninguna región coincide.».
    - El aviso de las redes ocultas sale si nada visible coincide, y también si la abreviatura exacta (sin el lado) solo está en redes ocultas, aunque haya otras sugerencias: «pf» con la red de PF oculta dice «PF está en la red Frontoparietal, que está oculta.» junto a PFm o PFop. Nombra la región, si todas las coincidencias ocultas son la misma, o «Lo escrito», y sus redes, hasta tres, o cuántas son. «Mostrar la red», o «Mostrar las redes», las muestra todas a la vez, vuelve a abrir la lista y devuelve el foco al campo: ninguna coincidencia se queda escondida sin decirlo.
    - Las abreviaturas que llevan el lado (Brainnetome, Gordon) se buscan y se ordenan sin él, y los números en su orden: «sfg» da `L_SFG_7_1`, `R_SFG_7_1`, `L_SFG_7_2`… Escrita entera, con el lado, también se encuentra.
    - A igualdad de nivel y abreviatura, el orden es izquierdo, derecho y sin hemisferio.
    - La lista solo está en la página mientras está abierta, y el campo apunta a ella con `aria-controls` solo entonces, como `DataContextMenu`: la guarda de los atajos de deshacer busca listas abiertas, y una lista oculta pero presente la bloquearía.
    - Ctrl+K funciona en la vista Atlas, como los atajos de deshacer: en las demás pestañas no hay buscador. En el propio buscador, selecciona lo escrito. No actúa con Mayús, ni mientras está abierta otra lista desplegable o el panel de Ajustes. El marcador de posición lo dice: «Buscar región (Ctrl+K)», o «(⌘K)» en macOS.
    - Con el foco en el buscador, Ctrl+Z es del campo, como en cualquier campo de texto (5.7): la región añadida se deshace con ↶, o con Ctrl+Z fuera del campo.

De la maqueta no se toman:

- El botón de ayuda y la línea de fuente «Rosen y Halgren, 2021» del detalle: la sección 2 los deja fuera.
- Los anchos de columna de 264 y 320 px: se mantienen los 250 y 300 px de la D1, porque la sección 2 conserva su disposición. Sí se toman los 12 px de separación y de margen.

---

## Chunk 1: contexto de datos

### Task 1: iconos y contexto de datos con lista desplegable

**Files:**
- Create: `frontend/src/logic/listbox.ts`, `frontend/src/logic/dataContext.ts`
- Test: `frontend/src/logic/listbox.test.ts`, `frontend/src/logic/dataContext.test.ts`
- Create: `frontend/src/components/Icon.tsx`, `frontend/src/components/DataContextMenu.tsx`
- Modify: `frontend/src/App.tsx` (imports, `atlasSelector`, `networkSourceSelector`, sus dos usos y el fragmento de `renderHeader`)
- Modify: `frontend/src/App.css` (reglas `.atlas-selector`; sección nueva al final)

En esta tarea los dos menús van todavía dentro de la barra actual. La Task 2 cambia la barra.

- [ ] **Step 0: punto de partida**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git status --short frontend/ && git log --oneline -3
grep -n "^## D[0-9]" docs/decisiones-diseno.md
cd frontend && npm test 2>&1 | grep -E "^ +Tests " ; npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c
```

Expected:
- `git status --short frontend/` no muestra nada. Si muestra algo, es trabajo de otra sesión: no sigas y dilo.
- La última D de `docs/decisiones-diseno.md` es la D3, así que la D4 está libre. Si ya hay una D4, no sigas: los comentarios de todo el plan citan la D4, y hay que elegir otro número antes de escribir código.
- `Tests  115 passed (115)` y `9 : warning`, sin ninguna línea de `error`.

Guarda el punto de partida. La verificación (Task 11) sirve esta versión aparte para compararla con la nueva:

```bash
mkdir -p /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad && cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git rev-parse HEAD > /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase3-base.txt && cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase3-base.txt
```

La BASE es el número de pruebas que ha dado `npm test`: 115 si no ha cambiado nada desde que se escribió el plan. Si es otro, las cuentas del plan siguen valiendo, porque son relativas a ella. Anota también los 9 avisos de lint.

- [ ] **Step 1: escribir las pruebas que fallan**

`frontend/src/logic/listbox.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { initialActiveIndex, listboxKey } from "./listbox";

describe("listboxKey", () => {
  it("las flechas mueven la opción activa sin salirse de la lista", () => {
    expect(listboxKey("ArrowDown", 0, 3)).toEqual({ kind: "move", index: 1 });
    expect(listboxKey("ArrowDown", 2, 3)).toEqual({ kind: "move", index: 2 });
    expect(listboxKey("ArrowUp", 2, 3)).toEqual({ kind: "move", index: 1 });
    expect(listboxKey("ArrowUp", 0, 3)).toEqual({ kind: "move", index: 0 });
  });

  it("Inicio y Fin van a la primera y a la última", () => {
    expect(listboxKey("Home", 2, 3)).toEqual({ kind: "move", index: 0 });
    expect(listboxKey("End", 0, 3)).toEqual({ kind: "move", index: 2 });
  });

  it("Intro y la barra espaciadora eligen la opción activa", () => {
    expect(listboxKey("Enter", 1, 3)).toEqual({ kind: "choose", index: 1 });
    expect(listboxKey(" ", 1, 3)).toEqual({ kind: "choose", index: 1 });
  });

  it("Escape cierra; Tab cierra y deja que el foco siga su camino", () => {
    expect(listboxKey("Escape", 1, 3)).toEqual({ kind: "close", keepDefault: false });
    expect(listboxKey("Tab", 1, 3)).toEqual({ kind: "close", keepDefault: true });
  });

  it("las demás teclas no hacen nada; con la lista vacía solo cierran Escape y Tab", () => {
    expect(listboxKey("a", 1, 3)).toEqual({ kind: "ignore" });
    expect(listboxKey("ArrowDown", 0, 0)).toEqual({ kind: "ignore" });
    expect(listboxKey("Enter", 0, 0)).toEqual({ kind: "ignore" });
    expect(listboxKey("Escape", 0, 0)).toEqual({ kind: "close", keepDefault: false });
  });

  it("un índice fuera de rango se corrige antes de usarlo", () => {
    expect(listboxKey("ArrowDown", 7, 3)).toEqual({ kind: "move", index: 2 });
    expect(listboxKey("Enter", -1, 3)).toEqual({ kind: "choose", index: 0 });
  });
});

describe("initialActiveIndex", () => {
  it("al abrir, la opción activa es la elegida; si no hay ninguna, la primera", () => {
    expect(initialActiveIndex(2, 4)).toBe(2);
    expect(initialActiveIndex(-1, 4)).toBe(0);
    expect(initialActiveIndex(9, 4)).toBe(0);
    expect(initialActiveIndex(-1, 0)).toBe(0);
  });
});
```

`frontend/src/logic/dataContext.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { NETWORK_SOURCE_LABELS } from "../theme/networks";
import {
  NETWORK_SOURCE_SHORT_LABELS,
  atlasShortLabel,
  networkSourceLabel,
  networkSourceOptionLabel,
  networkSourceShortLabel,
} from "./dataContext";

// Las cuatro etiquetas de ATLASES (App.tsx) cuando se escribió esta prueba.
// Si se añade un atlas allí, añade aquí su etiqueta.
const ATLAS_LABELS = [
  "HCP-MMP1.0 — 360 regiones, redes funcionales",
  "Brainnetome — 246 regiones, conectividad estructural",
  "Gordon 333 — 333 regiones corticales, redes propias del atlas",
  "Subcórtex HCP — 19 regiones (amígdala, tálamo, cerebelo...)",
];

describe("atlasShortLabel", () => {
  it("se queda con lo que va antes de « — »", () => {
    expect(ATLAS_LABELS.map(atlasShortLabel)).toEqual(["HCP-MMP1.0", "Brainnetome", "Gordon 333", "Subcórtex HCP"]);
  });

  it("los nombres cortos de los cuatro atlas no se repiten", () => {
    expect(new Set(ATLAS_LABELS.map(atlasShortLabel)).size).toBe(ATLAS_LABELS.length);
  });

  it("sin « — », la etiqueta entera", () => {
    expect(atlasShortLabel("Atlas nuevo")).toBe("Atlas nuevo");
  });
});

describe("clasificaciones de red", () => {
  it("nombre corto de las clasificaciones conocidas", () => {
    expect(networkSourceShortLabel("cole-anticevic")).toBe("Cole-Anticevic");
    expect(networkSourceShortLabel("yeo2011-7")).toBe("Yeo 7");
    expect(networkSourceShortLabel("yeo2011-17")).toBe("Yeo 17");
  });

  it("toda clasificación con etiqueta tiene nombre corto, y no se repiten", () => {
    for (const source of Object.keys(NETWORK_SOURCE_LABELS)) {
      expect(Object.hasOwn(NETWORK_SOURCE_SHORT_LABELS, source)).toBe(true);
    }
    const shortLabels = Object.values(NETWORK_SOURCE_SHORT_LABELS);
    expect(new Set(shortLabels).size).toBe(shortLabels.length);
  });

  it("una clasificación desconocida se muestra con su identificador, como hasta ahora", () => {
    expect(networkSourceShortLabel("nueva2030")).toBe("nueva2030");
    expect(networkSourceShortLabel("constructor")).toBe("constructor");
    expect(networkSourceLabel("nueva2030")).toBe("nueva2030");
  });

  it("la etiqueta de la lista es la de siempre", () => {
    expect(networkSourceOptionLabel({ source: "cole-anticevic", regionCount: 360, isDefault: true }, 360)).toBe(
      "Cole-Anticevic (Ji et al., 2019) — 360 de 360 regiones (por defecto)",
    );
    expect(networkSourceOptionLabel({ source: "yeo2011-7", regionCount: 358, isDefault: false }, 360)).toBe(
      "Yeo et al., 2011 — 7 redes — 358 de 360 regiones",
    );
  });
});
```

- [ ] **Step 2: comprobar que fallan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/listbox.test.ts src/logic/dataContext.test.ts`
Expected: FAIL, porque no existen `./listbox` ni `./dataContext`.

- [ ] **Step 3: implementar `frontend/src/logic/listbox.ts`**

```ts
// Teclado de la lista desplegable del contexto de datos (D4 de
// docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 5.1 y 8).
// Función pura: dice qué hacer con cada tecla; DataContextMenu.tsx lo hace.

export type ListboxKeyResult =
  | { kind: "move"; index: number }
  | { kind: "choose"; index: number }
  // keepDefault: Tab cierra la lista y deja que el foco siga su camino
  // (desde el botón); Escape cierra y no hace nada más.
  | { kind: "close"; keepDefault: boolean }
  | { kind: "ignore" };

export function listboxKey(key: string, active: number, count: number): ListboxKeyResult {
  if (key === "Escape") return { kind: "close", keepDefault: false };
  if (key === "Tab") return { kind: "close", keepDefault: true };
  if (count === 0) return { kind: "ignore" };
  const last = count - 1;
  const current = Math.min(Math.max(active, 0), last);
  switch (key) {
    case "ArrowDown":
      return { kind: "move", index: Math.min(current + 1, last) };
    case "ArrowUp":
      return { kind: "move", index: Math.max(current - 1, 0) };
    case "Home":
      return { kind: "move", index: 0 };
    case "End":
      return { kind: "move", index: last };
    case "Enter":
    case " ":
      return { kind: "choose", index: current };
    default:
      return { kind: "ignore" };
  }
}

// Opción activa al abrir: la elegida, o la primera si no hay ninguna.
export function initialActiveIndex(selectedIndex: number, count: number): number {
  return selectedIndex >= 0 && selectedIndex < count ? selectedIndex : 0;
}
```

- [ ] **Step 4: implementar `frontend/src/logic/dataContext.ts`**

```ts
// Contexto de datos de la barra superior (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.1): nombres cortos para los botones y
// etiquetas completas para las listas. Funciones puras.
import type { NetworkSourceSummary } from "../data/api";
import { NETWORK_SOURCE_LABELS } from "../theme/networks";

// Nombre corto de cada clasificación de red. Es un mapa explícito y no un
// recorte de NETWORK_SOURCE_LABELS: recortando, Yeo 7 y Yeo 17 quedarían
// iguales.
export const NETWORK_SOURCE_SHORT_LABELS: Readonly<Record<string, string>> = {
  "cole-anticevic": "Cole-Anticevic",
  gordon333: "Gordon 333",
  "yeo2011-7": "Yeo 7",
  "yeo2011-17": "Yeo 17",
  power2011: "Power 2011",
};

// Una clasificación que no esté en el mapa se muestra con su identificador,
// como hasta ahora: nunca se oculta.
export function networkSourceShortLabel(source: string): string {
  return Object.hasOwn(NETWORK_SOURCE_SHORT_LABELS, source) ? NETWORK_SOURCE_SHORT_LABELS[source] : source;
}

export function networkSourceLabel(source: string): string {
  return Object.hasOwn(NETWORK_SOURCE_LABELS, source) ? NETWORK_SOURCE_LABELS[source] : source;
}

// Etiqueta de la lista: la de hoy, con «N de M regiones» y «(por defecto)».
export function networkSourceOptionLabel(summary: NetworkSourceSummary, nodeCount: number): string {
  return `${networkSourceLabel(summary.source)} — ${summary.regionCount} de ${nodeCount} regiones${
    summary.isDefault ? " (por defecto)" : ""
  }`;
}

// Nombre corto de un atlas: lo que va antes de « — » en su etiqueta de
// ATLASES (App.tsx). Es único en los cuatro atlas de hoy.
export function atlasShortLabel(label: string): string {
  const cut = label.indexOf(" — ");
  return cut === -1 ? label : label.slice(0, cut);
}
```

- [ ] **Step 5: comprobar que pasan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/listbox.test.ts src/logic/dataContext.test.ts`
Expected: PASS (14 pruebas).

- [ ] **Step 6: crear `frontend/src/components/Icon.tsx`**

Incluye ya todos los iconos de la fase: las tareas siguientes solo los usan.

```tsx
// Iconos SVG en línea (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 9). Son los trazos de 24×24 de la
// maqueta de Claude Design, dibujados con el color del texto
// (currentColor), así que siguen al tema sin ningún color propio. Son
// siempre decorativos (aria-hidden): el nombre accesible lo da el control
// que los lleva.
const PATHS = {
  // Pestañas de vista.
  atlas: "M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M6.3 7.2 17.7 16.8 M6.3 16.8 17.7 7.2",
  species: "M3 12a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M9 12a6 6 0 1 0 12 0a6 6 0 1 0 -12 0",
  tracts: "M3 18c4-8 8-12 18-12 M3 13c5-4 9-6 18-6 M3 8c6 0 10 4 18 10",
  nodes:
    "M15 5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M15 19a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4",
  // Matraz de las pestañas de síntesis de IA: sustituye al emoji 🧪.
  synthesis: "M9 3h6 M10 3v5.5L4.8 18a2 2 0 0 0 1.8 3h10.8a2 2 0 0 0 1.8-3L14 8.5V3 M7.3 15h9.4",
  // Acciones.
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  search: "M4 11a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-4.3-4.3",
  expand: "M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7",
  target:
    "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0",
  plus: "M5 12h14 M12 5v14",
  copy: "M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
  check: "M20 6 9 17l-5-5",
  close: "M18 6 6 18 M6 6l12 12",
  // Deshacer y rehacer (Task 10).
  undo: "M9 14 4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
  redo: "M15 14l5-5-5-5 M20 9H9.5a5.5 5.5 0 0 0 0 11H13",
  // Flechas.
  chevronDown: "M6 9l6 6 6-6",
  chevronUp: "M18 15l-6-6-6 6",
  chevronsLeft: "M11 17l-5-5 5-5 M18 17l-5-5 5-5",
  chevronsRight: "M13 17l5-5-5-5 M6 17l5-5-5-5",
  arrowRight: "M5 12h14 M12 5l7 7-7 7",
  // Carga en curso: un arco que App.css hace girar.
  spinner: "M21 12a9 9 0 1 1-6.2-8.6",
  // Avisos y ayuda.
  info: "M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 16v-4 M12 8h.01",
  alert: "M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 8v4 M12 16h.01",
  help: "M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
```

- [ ] **Step 7: crear `frontend/src/components/DataContextMenu.tsx`**

```tsx
// Lista desplegable del contexto de datos (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.1). Sustituye a los <select> nativos
// de la barra, que cortaban el texto: el botón muestra un nombre corto y la
// lista, las etiquetas completas. Solo presenta: qué atlas o qué
// clasificación está elegida, y qué pasa al elegir otra, sigue en App.
//
// Teclado (lógica en logic/listbox.ts): flecha abajo o arriba sobre el
// botón abre la lista. En ella, las flechas, Inicio y Fin mueven la opción
// activa, Intro o espacio la eligen, Escape cierra y Tab cierra y sigue.
// Al elegir o al cerrar con el teclado, el foco vuelve al botón. Para que
// vuelva también al cambiar de atlas, App no desmonta la barra (el
// Fragment con clave de renderHeader).
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { initialActiveIndex, listboxKey } from "../logic/listbox";
import { Icon } from "./Icon";

export interface DataContextOption {
  value: string;
  label: string;
}

interface DataContextMenuProps {
  // Rótulo pequeño del botón y nombre de la lista: «Atlas», «Redes».
  caption: string;
  // Nombre corto de lo elegido, el que muestra el botón.
  valueLabel: string;
  // Etiqueta emergente del botón: el nombre completo.
  title?: string;
  options: DataContextOption[];
  value: string;
  onChange: (value: string) => void;
  // La opción elegida todavía se está cargando (networkSourcePending de App):
  // el chevron pasa a ser un indicador que gira, del mismo tamaño, así que
  // el botón no cambia de ancho. «cargando…» queda para los lectores de
  // pantalla.
  pending?: boolean;
}

export function DataContextMenu({
  caption,
  valueLabel,
  title,
  options,
  value,
  onChange,
  pending = false,
}: DataContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const captionId = `${baseId}-caption`;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const openList = () => {
    setActive(initialActiveIndex(options.findIndex((option) => option.value === value), options.length));
    setOpen(true);
  };

  const closeList = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (index: number) => {
    const option = options[index];
    closeList();
    if (option && option.value !== value) onChange(option.value);
  };

  // Al abrir, el foco pasa a la lista: aria-activedescendant señala la
  // opción activa.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // La opción activa, siempre a la vista.
  useEffect(() => {
    if (open) document.getElementById(`${baseId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, baseId]);

  // Un clic fuera la cierra sin mover el foco: se queda donde se hizo clic.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!listRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      openList();
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const result = listboxKey(event.key, active, options.length);
    if (result.kind === "ignore") return;
    if (result.kind !== "close" || !result.keepDefault) event.preventDefault();
    if (result.kind === "move") setActive(result.index);
    else if (result.kind === "choose") choose(result.index);
    else closeList();
  };

  // Si el foco sale del bloque (un clic que enfoca otro control), la lista
  // se cierra.
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!open || !next || event.currentTarget.contains(next)) return;
    setOpen(false);
  };

  return (
    <div className="data-menu" onBlur={handleBlur}>
      <button
        ref={triggerRef}
        type="button"
        className="data-menu__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        title={title}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="data-menu__text">
          <span className="data-menu__caption" id={captionId}>
            {caption}
          </span>
          <span className="data-menu__value">
            {valueLabel}
            {pending && <span className="visually-hidden">, cargando…</span>}
          </span>
        </span>
        <Icon name={pending ? "spinner" : "chevronDown"} size={14} className={pending ? "data-menu__spinner" : undefined} />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="data-menu__list"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={captionId}
          aria-activedescendant={options.length > 0 ? optionId(active) : undefined}
          onKeyDown={handleListKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={option.value === value}
              className={index === active ? "data-menu__option data-menu__option--active" : "data-menu__option"}
              onClick={() => choose(index)}
              onMouseMove={() => setActive(index)}
            >
              <span className="data-menu__check">{option.value === value && <Icon name="check" size={14} />}</span>
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 8: usarlo en `frontend/src/App.tsx`**

1. **Imports.**
   - `import { useEffect, useState, type ReactNode } from "react";` pasa a `import { Fragment, useEffect, useState, type ReactNode } from "react";`.
   - Justo después de `import { SettingsMenu } from "./components/SettingsMenu";` añade `import { DataContextMenu } from "./components/DataContextMenu";`.
   - Sustituye `import { NETWORK_SOURCE_LABELS } from "./theme/networks";` por:

     ```ts
     import { atlasShortLabel, networkSourceLabel, networkSourceOptionLabel, networkSourceShortLabel } from "./logic/dataContext";
     ```

2. **Los dos selectores.** Sustituye todo el tramo desde `  const atlasSelector = (` hasta el `    ) : null;` que cierra `networkSourceSelector`, los dos incluidos. En medio está el comentario «Selector de clasificación de red (decisión 73)…». El tramo nuevo es este:

   ```tsx
     // Contexto de datos de la barra (D4 de docs/decisiones-diseno.md; spec
     // 5.1): listas desplegables en lugar de los <select> nativos, que
     // cortaban el texto. El botón muestra un nombre corto y la lista, las
     // etiquetas completas. Mismo estado y mismos manejadores que antes.
     const atlasMenu = (
       <DataContextMenu
         caption="Atlas"
         valueLabel={atlasShortLabel(selectedAtlas.label)}
         title={selectedAtlas.label}
         options={ATLASES.map((atlas) => ({ value: atlas.id, label: atlas.label }))}
         value={selectedAtlasId}
         onChange={handleChangeAtlas}
       />
     );

     // Selector de clasificación de red (decisión 73): solo si el atlas tiene
     // más de una cargada. Cambia la red de cada región en TODAS las vistas a
     // la vez (connectograma, hemisferios, filtros, cerebro 3D).
     const chosenNetworkSource = networkSource ?? defaultNetworkSource ?? "";
     const networkMenu =
       source.kind === "real" && sourcesForAtlas.length > 1 ? (
         <DataContextMenu
           caption="Redes"
           valueLabel={chosenNetworkSource ? networkSourceShortLabel(chosenNetworkSource) : "—"}
           title={chosenNetworkSource ? networkSourceLabel(chosenNetworkSource) : undefined}
           options={sourcesForAtlas.map((s) => ({
             value: s.source,
             label: networkSourceOptionLabel(s, source.nodes.length),
           }))}
           value={chosenNetworkSource}
           onChange={(value) => {
             setNetworkSourceError(null);
             setNetworkSource(value === defaultNetworkSource ? null : value);
           }}
           pending={networkSourcePending}
         />
       ) : null;
   ```

3. **Vista de carga.** En la rama `if (source.kind === "loading")`, `{atlasSelector}` pasa a `<div className="data-context">{atlasMenu}</div>`. El `<span className="demo-badge">Cargando…</span>` se queda hasta la Task 2.

4. **Espacio de trabajo.** En el `renderHeader(...)` del `return` final, sustituye:

   ```tsx
             {atlasSelector}
             {networkSourceSelector}
   ```

   por:

   ```tsx
             <div className="data-context">
               {atlasMenu}
               {networkMenu}
             </div>
   ```

   `{badge}` se queda como está.

5. **La barra no se desmonta al cambiar de atlas.** `renderHeader` devuelve un fragmento sin clave. En la vista de carga es el único hijo de `<div className="app">`, y React lo desenvuelve; en el espacio de trabajo lleva un hermano, y no. Así la barra cambia de sitio en el árbol, se vuelve a montar al elegir un atlas, y el foco cae en la página. Con una clave, React no lo desenvuelve nunca. En `renderHeader`, sustituye:

   ```tsx
     const renderHeader = (controls: ReactNode = null) => (
       <>
   ```

   por:

   ```tsx
     // Fragment con clave: sin ella, React lo desenvuelve cuando es el único
     // hijo (vista de carga) y la barra se vuelve a montar al cambiar de
     // atlas, con lo que el foco se pierde (D4 de docs/decisiones-diseno.md).
     const renderHeader = (controls: ReactNode = null) => (
       <Fragment key="barra">
   ```

   y el `    </>` que cierra la función, justo antes de `  );`, por `    </Fragment>`.

- [ ] **Step 9: estilos en `frontend/src/App.css`**

1. Borra estas cuatro líneas, del principio del archivo. Ya no hay ningún `.atlas-selector`:

   ```css
   .atlas-selector { display: block; margin: 0.4rem 0; font-size: 0.9rem; }
   .topbar .atlas-selector { display: inline-flex; align-items: center; margin: 0; font-size: 0.82rem; white-space: nowrap; }
   .topbar .atlas-selector select { max-width: 22rem; }
   .atlas-selector select { margin-left: 4px; padding: 2px 6px; background: var(--panel-bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; }
   ```

2. Añade al final del archivo:

   ```css

   /* ------------------------------------------------------------------
      Estructura (D4 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md,
      sección 5): barra superior, contexto de datos, filtros, cabeceras de
      las vistas, panel de detalle, avisos y deshacer. Solo usa variables
      de index.css: los cuatro temas se ven bien sin reglas propias.
      ------------------------------------------------------------------ */

   /* Texto solo para lectores de pantalla. Va con position: absolute, así
      que se coloca respecto al primer antepasado posicionado: todo panel
      que se desplaza por dentro y lleva texto así necesita position:
      relative. Sin él, el texto oculto de una lista larga alarga la página
      (Tasks 4 y 7). */
   .visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

   /* Foco visible en todos los controles (spec 8): 2 px del color de acento.
      :where() no suma especificidad, así que la regla propia de un control
      puede ajustarlo. */
   :where(button, a, input, select, summary, [tabindex]):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

   /* Iconos en línea (components/Icon.tsx): trazo del color del texto. */
   .icon { flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

   /* Contexto de datos (spec 5.1, punto 3): las dos listas en un bloque. */
   .data-context { display: flex; align-items: stretch; height: 40px; border: 1px solid var(--border); border-radius: 10px; background: var(--panel-bg); }
   .data-menu { position: relative; display: flex; }
   .data-menu + .data-menu { border-left: 1px solid var(--border); }
   .data-menu__trigger { display: flex; align-items: center; gap: 10px; padding: 0 10px 0 12px; border: none; border-radius: 9px; background: transparent; color: var(--text-muted); font: inherit; text-align: left; cursor: pointer; }
   .data-menu__trigger:hover, .data-menu__trigger[aria-expanded="true"] { background: var(--hover); color: var(--text-h); }
   .data-menu__text { display: flex; flex-direction: column; line-height: 1.15; }
   .data-menu__caption { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
   .data-menu__value { font-size: 0.72rem; font-weight: 600; color: var(--text-h); white-space: nowrap; }
   /* Mientras carga la clasificación elegida, el chevron gira. */
   .data-menu__spinner { animation: data-menu-spin 0.9s linear infinite; }
   @keyframes data-menu-spin { to { transform: rotate(360deg); } }
   .data-menu__list { position: absolute; top: calc(100% + 6px); right: 0; z-index: 25; box-sizing: border-box; min-width: 100%; width: max-content; max-width: min(28rem, calc(100vw - 24px)); max-height: min(60svh, 24rem); overflow-y: auto; margin: 0; padding: 4px; list-style: none; border: 1px solid var(--border-strong); border-radius: 10px; background: var(--panel-bg); box-shadow: var(--shadow); text-align: left; }
   /* Con el teclado, el foco está en la lista y la opción activa la señala
      aria-activedescendant. El fondo de --hover solo no llega a 3:1 sobre
      el panel, así que la opción activa lleva además el contorno del foco. */
   .data-menu__list:focus-visible { outline: none; }
   .data-menu__list:focus-visible .data-menu__option--active { outline: 2px solid var(--accent); outline-offset: -2px; }
   .data-menu__option { display: flex; align-items: flex-start; gap: 8px; padding: 7px 10px; border-radius: 7px; font-size: 0.72rem; line-height: 1.35; color: var(--text); cursor: pointer; }
   .data-menu__option--active { background: var(--hover); color: var(--text-h); }
   .data-menu__option[aria-selected="true"] { font-weight: 600; color: var(--text-h); }
   .data-menu__check { display: inline-flex; flex-shrink: 0; width: 14px; padding-top: 2px; }
   @media (prefers-reduced-motion: reduce) {
     .data-menu__spinner { animation: none; }
   }
   ```

- [ ] **Step 10: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/App.css src/components/Icon.tsx src/components/DataContextMenu.tsx
```

Expected:
- BASE + 14 pruebas en verde (129 con una BASE de 115).
- `tsc` sin errores; lint sin errores y con los mismos 9 avisos; `✓ built`.
- El `grep` solo muestra la línea de `.species-panel__figure img { … background: #ffffff; }`, que es blanca a propósito (fase 1).

- [ ] **Step 11: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/logic/listbox.ts frontend/src/logic/listbox.test.ts frontend/src/logic/dataContext.ts frontend/src/logic/dataContext.test.ts frontend/src/components/Icon.tsx frontend/src/components/DataContextMenu.tsx frontend/src/App.tsx frontend/src/App.css
git commit -m "Estructura: contexto de datos con listas desplegables accesibles

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 2: barra superior

### Task 2: barra superior

**Files:**
- Create: `frontend/src/logic/displayText.ts`, `frontend/src/logic/topBarFit.ts`
- Test: `frontend/src/logic/displayText.test.ts`, `frontend/src/logic/topBarFit.test.ts`
- Create: `frontend/src/components/TopBar.tsx`
- Test: `frontend/src/components/TopBar.test.tsx`
- Modify: `frontend/src/App.tsx` (imports, `viewToggle`, `renderHeader`, estado de los datos y texto de la vista de síntesis)
- Modify: `frontend/src/App.css` (barra antigua, pestañas, etiquetas de datos, botón de importar y sección «Estructura»)

La barra va en una sola fila. Si no cabe, pliega lo secundario por este orden, y solo lo que haga falta. Las pestañas de las vistas, que son la navegación principal, son lo último:

1. «Datos reales» se queda en su punto de color. «Datos de demostración» nunca se pliega: es un aviso.
2. «Importar» se queda en su icono.
3. Las pestañas de síntesis inactivas se quedan en su icono.
4. Las pestañas de vista inactivas se quedan en su icono.

Lo plegado conserva su nombre para los lectores de pantalla y su etiqueta emergente al pasar el ratón. Las pestañas e «Importar» plegados la muestran también con el foco del teclado, con CSS (`data-tip`). `TopBar` mide si la barra cabe y aplica el menor paso que basta: no hay puntos de corte fijos, porque lo que ocupa depende del contenido (atlas, clasificación, datos de demostración, pestañas de síntesis). Con la fuente real, en la vista Atlas con HCP-MMP1.0 y «Redes», el cálculo da:
- 1400 px: no se pliega nada.
- 1280 px: se pliega «Datos reales».
- 1024 px: se pliega todo lo que se puede.
- 1400 px con dos o tres síntesis de nombre largo: «Datos reales», «Importar» y los nombres de las síntesis inactivas. Los de las vistas se ven.

La verificación (Task 11) mide la barra real.

- [ ] **Step 1: escribir las pruebas que fallan**

`frontend/src/logic/topBarFit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TOP_BAR_COLLAPSE_STEPS, collapseAttribute, smallestFittingLevel, tabAfterClosing } from "./topBarFit";

describe("collapseAttribute", () => {
  it("pliega por orden: el estado de los datos, Importar, las síntesis y al final las vistas", () => {
    expect(TOP_BAR_COLLAPSE_STEPS).toEqual(["status", "import", "synthesis", "tabs"]);
    expect(collapseAttribute(0)).toBe("");
    expect(collapseAttribute(1)).toBe("status");
    expect(collapseAttribute(2)).toBe("status import");
    expect(collapseAttribute(4)).toBe("status import synthesis tabs");
  });
});

describe("smallestFittingLevel", () => {
  it("si cabe sin plegar nada, se queda en el nivel 0", () => {
    expect(smallestFittingLevel(() => true)).toBe(0);
  });

  it("se queda en el primer nivel que cabe, sin probar los siguientes", () => {
    const tried: number[] = [];
    const level = smallestFittingLevel((n) => {
      tried.push(n);
      return n >= 1;
    });
    expect(level).toBe(1);
    expect(tried).toEqual([0, 1]);
  });

  it("si no cabe con ninguno, el último, que ni se prueba", () => {
    const tried: number[] = [];
    const level = smallestFittingLevel((n) => {
      tried.push(n);
      return false;
    });
    expect(level).toBe(4);
    expect(tried).toEqual([0, 1, 2, 3]);
  });
});

describe("tabAfterClosing", () => {
  const noop = () => {};
  const TABS = [
    { id: "atlas" },
    { id: "species" },
    { id: "s1", onClose: noop },
    { id: "s2", onClose: noop },
    { id: "s3", onClose: noop },
  ];

  it("el foco pasa a la síntesis que ocupa su sitio, o a la anterior si era la última", () => {
    expect(tabAfterClosing(TABS, "s2")).toBe("s3");
    expect(tabAfterClosing(TABS, "s3")).toBe("s2");
  });

  it("sin más síntesis, a la primera pestaña (Atlas); una pestaña que no se cierra, a ninguna", () => {
    expect(tabAfterClosing(TABS.slice(0, 3), "s1")).toBe("atlas");
    expect(tabAfterClosing(TABS, "species")).toBeNull();
  });
});
```

`frontend/src/logic/displayText.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatCount } from "./displayText";

describe("formatCount", () => {
  it("separa los miles con un espacio duro a partir de cinco cifras", () => {
    expect(formatCount(64620)).toBe("64\u00a0620");
    expect(formatCount(1234567)).toBe("1\u00a0234\u00a0567");
  });

  it("deja sin separar los números de hasta cuatro cifras", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(360)).toBe("360");
    expect(formatCount(1047)).toBe("1047");
  });
});
```

`frontend/src/components/TopBar.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DataStatus, TopBar, type TopBarTab } from "./TopBar";

const noop = () => {};

const TABS: TopBarTab[] = [
  { id: "atlas", label: "Atlas", icon: "atlas", active: true, onSelect: noop },
  { id: "species", label: "Comparar especies", icon: "species", active: false, onSelect: noop },
  {
    id: "synthesis-1",
    label: "Memoria de trabajo",
    icon: "synthesis",
    active: false,
    onSelect: noop,
    onClose: noop,
    closeLabel: 'Cerrar pestaña de síntesis "Memoria de trabajo"',
  },
];

// Profundidad máxima de <button> anidados: un botón dentro de otro no es HTML válido.
function maxButtonDepth(html: string): number {
  let depth = 0;
  let max = 0;
  for (const match of html.matchAll(/<(\/?)button\b/g)) {
    depth += match[1] ? -1 : 1;
    max = Math.max(max, depth);
  }
  return max;
}

describe("TopBar", () => {
  const html = renderToStaticMarkup(<TopBar tabs={TABS} onImport={noop} />);

  it("marca solo la pestaña activa, con aria-current", () => {
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    const fromCurrent = html.slice(html.indexOf('aria-current="page"'));
    expect(fromCurrent.slice(0, fromCurrent.indexOf("</button>"))).toContain("Atlas");
  });

  it("una pestaña de síntesis se cierra con su propio <button>, sin anidar", () => {
    expect(html).toContain(
      'class="topbar__tab-close" aria-label="Cerrar pestaña de síntesis &quot;Memoria de trabajo&quot;"',
    );
    expect(html).not.toContain('role="button"');
    expect(maxButtonDepth(html)).toBe(1);
  });

  it("Importar y las pestañas llevan su etiqueta emergente, también para el teclado (data-tip), y su nombre en un texto que se puede plegar", () => {
    expect(html).toContain('title="Importar una síntesis de IA" data-tip="Importar una síntesis de IA"');
    expect(html).toContain('<span class="topbar__import-label">Importar</span>');
    expect(html).toContain('data-tip="Comparar especies"');
    expect(html).toContain('<span class="topbar__tab-label">Comparar especies</span>');
  });
});

describe("DataStatus", () => {
  it("con datos reales, la etiqueta emergente dice qué es y da las cifras", () => {
    const html = renderToStaticMarkup(<DataStatus kind="real" regionCount={360} connectionCount={64620} />);
    expect(html).toContain('<span class="data-status__text">Datos reales</span>');
    expect(html).toContain('title="Datos reales · 360 regiones · 64\u00a0620 conexiones"');
  });

  it("con datos de demostración, lo dice, y la etiqueta emergente conserva el aviso de siempre", () => {
    const html = renderToStaticMarkup(<DataStatus kind="demo" />);
    expect(html).toContain("Datos de demostración");
    expect(html).toContain("Datos sintéticos · solo ilustrativos.");
    expect(html).toContain("revisa que el backend esté en marcha");
  });
});
```

- [ ] **Step 2: comprobar que fallan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/topBarFit.test.ts src/logic/displayText.test.ts src/components/TopBar.test.tsx`
Expected: FAIL, porque no existen `./topBarFit`, `./displayText` ni `./TopBar`.

- [ ] **Step 3: implementar `frontend/src/logic/topBarFit.ts` y `frontend/src/logic/displayText.ts`**

`frontend/src/logic/topBarFit.ts`:

```ts
// Compactación de la barra superior (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.1). La barra va en una fila. Si no
// cabe, se pliega lo secundario por este orden, y solo lo que haga falta:
//   1. «Datos reales» se queda en su punto de color («Datos de
//      demostración» nunca: es un aviso).
//   2. «Importar» se queda en su icono.
//   3. Las pestañas de síntesis inactivas se quedan en su icono.
//   4. Las pestañas de vista inactivas se quedan en su icono.
// Las vistas son la navegación principal: son lo último que se pliega.
// Funciones puras; TopBar.tsx mide la barra y App.css aplica cada paso.

export const TOP_BAR_COLLAPSE_STEPS = ["status", "import", "synthesis", "tabs"] as const;

// Valor del atributo data-collapse con los `level` primeros pasos plegados.
export function collapseAttribute(level: number): string {
  return TOP_BAR_COLLAPSE_STEPS.slice(0, Math.max(0, level)).join(" ");
}

// Menor nivel con el que la barra cabe: fits(n) aplica el nivel n y dice
// si cabe. Los niveles se prueban en orden. Si no cabe con ninguno, se
// queda el último, en el que la barra puede pasar a dos filas.
export function smallestFittingLevel(
  fits: (level: number) => boolean,
  maxLevel: number = TOP_BAR_COLLAPSE_STEPS.length,
): number {
  for (let level = 0; level < maxLevel; level++) {
    if (fits(level)) return level;
  }
  return maxLevel;
}

// Pestaña que recibe el foco al cerrar una de síntesis (las únicas con
// onClose), porque el botón que lo tenía desaparece: la síntesis que ocupa
// su sitio, o la anterior si era la última; sin más síntesis, la primera
// pestaña (Atlas). null si la pestaña no se cierra o no está.
export function tabAfterClosing(tabs: readonly { id: string; onClose?: unknown }[], closedId: string): string | null {
  const closable = tabs.filter((tab) => tab.onClose !== undefined);
  const index = closable.findIndex((tab) => tab.id === closedId);
  if (index === -1) return null;
  return (closable[index + 1] ?? closable[index - 1] ?? tabs[0]).id;
}
```

`frontend/src/logic/displayText.ts`:

Las Tasks 4 y 6 añaden más funciones a este archivo.

```ts
// Textos que se muestran en la interfaz (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, sección 5). Funciones puras: se prueban
// sin DOM.

// Número con los miles separados por un espacio duro, como pide la
// ortografía del español (64 620). Los de cuatro cifras van sin separar
// (1047).
export function formatCount(value: number): string {
  const digits = String(Math.round(value));
  return digits.length <= 4 ? digits : digits.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}
```

- [ ] **Step 4: implementar `frontend/src/components/TopBar.tsx`**

```tsx
// Barra superior (D4 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md,
// 5.1): marca, pestañas de vista, contexto de datos (solo en la vista
// Atlas), Importar y el engranaje de Ajustes. Solo presenta: la vista
// activa, las pestañas de síntesis, el atlas elegido y los manejadores
// siguen en App.
import { useEffect, useLayoutEffect, useRef, type ReactNode, type Ref } from "react";
import { formatCount } from "../logic/displayText";
import { collapseAttribute, smallestFittingLevel, tabAfterClosing } from "../logic/topBarFit";
import { useDrawColors } from "../theme/useDrawColors";
import { Icon, type IconName } from "./Icon";
import { SettingsMenu } from "./SettingsMenu";

export interface TopBarTab {
  id: string;
  label: string;
  icon: IconName;
  active: boolean;
  onSelect: () => void;
  // Etiqueta emergente; por defecto, el nombre de la pestaña.
  title?: string;
  // Solo las pestañas de síntesis importadas (decisión 71) se cierran.
  onClose?: () => void;
  closeLabel?: string;
}

interface TopBarProps {
  tabs: TopBarTab[];
  onImport: () => void;
  // Contexto y estado de los datos: solo en la vista Atlas.
  context?: ReactNode;
  // El botón «Importar», para devolverle el foco al cerrar el último aviso
  // (Task 3).
  importRef?: Ref<HTMLButtonElement>;
}

// Logotipo de la maqueta (decisión de la usuaria, 24/09/2026; principio 4
// del spec): un anillo con cuatro nodos unidos. El anillo y las uniones
// van en los grises del tema; los nodos llevan colores de red de
// Cole-Anticevic (Lenguaje, Por defecto, Frontoparietal y Visual), la
// única excepción de color fuera de los datos, porque representan justo
// eso: redes. Salen del tema activo, así que siguen a la paleta.
const LOGO_NODES = [
  { cx: 6.2, cy: 9.5, network: "cole-anticevic.language" },
  { cx: 21.8, cy: 18.5, network: "cole-anticevic.default" },
  { cx: 6.2, cy: 18.5, network: "cole-anticevic.frontoparietal" },
  { cx: 17, cy: 3.3, network: "cole-anticevic.visual" },
] as const;

function Logo() {
  const { networkColor } = useDrawColors();
  return (
    <svg className="topbar__logo" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <circle className="topbar__logo-ring" cx="14" cy="14" r="11" />
      <path className="topbar__logo-links" d="M6.2 9.5Q14 14 21.8 18.5 M6.2 18.5Q14 14 17 3.3" />
      {LOGO_NODES.map((node) => (
        <circle
          key={node.network}
          className="topbar__logo-node"
          cx={node.cx}
          cy={node.cy}
          r="2.4"
          fill={networkColor(node.network)}
        />
      ))}
    </svg>
  );
}

// Ancho y contenido de la barra en su última medida: si no han cambiado,
// el resultado sería el mismo. La barra se vuelve a pintar en cada render
// de App, por ejemplo al mover el deslizador de peso.
const lastFit = new WeakMap<HTMLElement, string>();

// Aplica el menor nivel de compactación con el que la barra cabe en una
// fila (logic/topBarFit.ts; cada paso está en App.css). El nivel va en el
// atributo data-collapse, que no es estado de React: medir no provoca otro
// render. Con flex-wrap: nowrap, lo que no cabe sobresale y scrollWidth
// pasa de clientWidth.
function fitTopBar(bar: HTMLElement | null, force = false) {
  if (!bar) return;
  const signature = `${bar.clientWidth}|${bar.innerHTML}`;
  if (!force && lastFit.get(bar) === signature) return;
  const level = smallestFittingLevel((n) => {
    bar.dataset.collapse = collapseAttribute(n);
    return bar.scrollWidth <= bar.clientWidth;
  });
  bar.dataset.collapse = collapseAttribute(level);
  lastFit.set(bar, signature);
}

export function TopBar({ tabs, onImport, context = null, importRef }: TopBarProps) {
  const barRef = useRef<HTMLElement>(null);
  // Pestaña que recibe el foco tras cerrar una síntesis (tabAfterClosing):
  // el botón que lo tenía desaparece en el render siguiente.
  const focusAfterClose = useRef<string | null>(null);

  // Tras cada render, con el contenido nuevo (pestañas, atlas, estado...):
  // se vuelve a medir la barra y, si se acaba de cerrar una pestaña, se
  // enfoca la que le toca.
  useLayoutEffect(() => {
    const bar = barRef.current;
    fitTopBar(bar);
    const id = focusAfterClose.current;
    if (!bar || id === null) return;
    focusAfterClose.current = null;
    [...bar.querySelectorAll<HTMLButtonElement>(".topbar__tab-btn")].find((button) => button.dataset.tabId === id)?.focus();
  });

  // ...y cuando cambia el ancho de la ventana o termina de cargar una
  // fuente, que cambia lo que mide cada texto. loadingdone cubre también
  // las fuentes que se cargan tarde, al usarse por primera vez.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const refit = () => fitTopBar(bar, true);
    const observer = new ResizeObserver(() => fitTopBar(bar));
    observer.observe(bar);
    const fonts = document.fonts;
    void fonts?.ready.then(refit);
    fonts?.addEventListener("loadingdone", refit);
    return () => {
      observer.disconnect();
      fonts?.removeEventListener("loadingdone", refit);
    };
  }, []);

  const closeTab = (tab: TopBarTab) => {
    focusAfterClose.current = tabAfterClosing(tabs, tab.id);
    tab.onClose?.();
  };

  return (
    <header ref={barRef} className="topbar">
      <div className="topbar__brand">
        <Logo />
        <span className="topbar__name">NeuroGraph</span>
        <span className="topbar__stage">alfa</span>
      </div>
      {/* Cada pestaña cambia la pantalla entera, como una página: es una
          navegación con aria-current, no un tablist. Un tablist no admite
          el botón de cerrar de las síntesis junto a su pestaña. data-tip
          es la etiqueta que App.css muestra con el foco del teclado cuando
          la pestaña está plegada. */}
      <nav className="topbar__tabs" aria-label="Vistas">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`topbar__tab${tab.active ? " topbar__tab--active" : ""}${tab.onClose ? " topbar__tab--closable" : ""}`}
          >
            <button
              type="button"
              className="topbar__tab-btn"
              data-tab-id={tab.id}
              aria-current={tab.active ? "page" : undefined}
              title={tab.title ?? tab.label}
              data-tip={tab.title ?? tab.label}
              onClick={tab.onSelect}
            >
              <Icon name={tab.icon} className={tab.icon === "synthesis" ? "icon--synthesis" : undefined} />
              <span className="topbar__tab-label">{tab.label}</span>
            </button>
            {tab.onClose && (
              <button
                type="button"
                className="topbar__tab-close"
                aria-label={tab.closeLabel ?? `Cerrar ${tab.label}`}
                title="Cerrar pestaña"
                onClick={() => closeTab(tab)}
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        ))}
      </nav>
      <div className="topbar__end">
        {context}
        <button
          ref={importRef}
          type="button"
          className="topbar__import"
          title="Importar una síntesis de IA"
          data-tip="Importar una síntesis de IA"
          onClick={onImport}
        >
          <Icon name="upload" />
          <span className="topbar__import-label">Importar</span>
        </button>
        <SettingsMenu />
      </div>
    </header>
  );
}

interface DataStatusProps {
  kind: "real" | "demo" | "loading";
  regionCount?: number;
  connectionCount?: number;
}

// El aviso de siempre de los datos de demostración (antes, la etiqueta
// DATOS SINTÉTICOS · SOLO ILUSTRATIVOS y su texto emergente).
const DEMO_DATA_HELP =
  "Datos sintéticos · solo ilustrativos. La API no respondió, o este atlas aún no tiene datos — revisa que el backend esté en marcha (docker compose up -d en desarrollo).";

// Estado de los datos (spec 5.1, punto 4): un punto de color con «Datos
// reales» o «Datos de demostración», siempre a la vista en la vista Atlas
// (sección 24: nunca se confunde lo real con lo ilustrativo). Si la barra
// no cabe, «Datos reales» se queda en su punto; «Datos de demostración»
// nunca, porque es un aviso. La etiqueta emergente dice qué es y da las
// cifras, y el texto oculto lo lee a los lectores de pantalla. Es una
// región role="status": al cambiar de atlas, el cambio se anuncia.
export function DataStatus({ kind, regionCount = 0, connectionCount = 0 }: DataStatusProps) {
  const text = kind === "real" ? "Datos reales" : kind === "demo" ? "Datos de demostración" : "Cargando…";
  const detail =
    kind === "real"
      ? `${formatCount(regionCount)} regiones · ${formatCount(connectionCount)} conexiones`
      : kind === "demo"
        ? DEMO_DATA_HELP
        : null;
  const title = kind === "real" ? `${text} · ${detail}` : (detail ?? undefined);
  return (
    <span className={`data-status data-status--${kind}`} role="status" title={title}>
      <span className="data-status__dot" aria-hidden="true" />
      <span className="data-status__text">{text}</span>
      {detail && <span className="visually-hidden">. {detail}</span>}
    </span>
  );
}
```

- [ ] **Step 5: comprobar que pasan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/topBarFit.test.ts src/logic/displayText.test.ts src/components/TopBar.test.tsx`
Expected: PASS (13 pruebas).

- [ ] **Step 6: usar la barra en `frontend/src/App.tsx`**

1. **Imports.** Sustituye:

   ```ts
   import { SettingsMenu } from "./components/SettingsMenu";
   import { DataContextMenu } from "./components/DataContextMenu";
   ```

   por:

   ```ts
   import { DataContextMenu } from "./components/DataContextMenu";
   import { DataStatus, TopBar, type TopBarTab } from "./components/TopBar";
   ```

   `SettingsMenu` ya no se importa en App: lo pinta `TopBar`.

2. **Pestañas.** Sustituye todo `const viewToggle = ( … );`, desde `  const viewToggle = (` hasta el `  );` que va justo antes de `const synthesisImportBanner`, por:

   ```tsx
     // Pestañas de la barra (D4 de docs/decisiones-diseno.md; spec 5.1): las
     // cuatro vistas y las pestañas de síntesis de IA ya abiertas (decisión
     // 71). Estas nunca se pierden al cambiar de vista; solo se quitan al
     // cerrarlas con su botón.
     const tabs: TopBarTab[] = [
       { id: "atlas", label: "Atlas", icon: "atlas", active: view === "atlas", onSelect: () => setView("atlas") },
       {
         id: "species",
         label: "Comparar especies",
         icon: "species",
         active: view === "species",
         onSelect: () => setView("species"),
       },
       {
         id: "tractography",
         label: "Tractografía 3D",
         icon: "tracts",
         active: view === "tractography",
         onSelect: () => setView("tractography"),
       },
       {
         id: "tractography-nodes",
         label: "Nodos de tractografía",
         icon: "nodes",
         active: view === "tractography-nodes",
         onSelect: () => setView("tractography-nodes"),
       },
       ...synthesisTabs.map(
         ({ tabId, validated }): TopBarTab => ({
           id: tabId,
           label: validated.file.function,
           icon: "synthesis",
           title: `Síntesis de IA: ${validated.file.function}`,
           active: view === "synthesis" && activeSynthesisTabId === tabId,
           onSelect: () => {
             setActiveSynthesisTabId(tabId);
             setView("synthesis");
           },
           onClose: () => closeSynthesisTab(tabId),
           closeLabel: `Cerrar pestaña de síntesis "${validated.file.function}"`,
         }),
       ),
     ];
   ```

3. **`renderHeader`.** Sustituye el comentario que empieza por `// Barra superior compacta (decisión 74, 24/09/2026)`, el comentario del Fragment con clave de la Task 1 y la función `renderHeader` entera por:

   ```tsx
     // Barra superior (D4 de docs/decisiones-diseno.md; spec 5.1). Sustituye
     // a la franja compacta de la decisión 74 (D1): marca, pestañas con
     // icono, contexto de datos, Importar y Ajustes. El contexto (atlas,
     // redes y la etiqueta de datos reales o de demostración) solo llega en
     // la vista Atlas, y ahí está siempre visible (sección 24: nunca se
     // confunde lo real con lo ilustrativo). Fragment con clave: sin ella,
     // React lo desenvuelve cuando es el único hijo (vista de carga) y la
     // barra se vuelve a montar al cambiar de atlas, con lo que el foco se
     // pierde y el estado de los datos no se anuncia.
     const renderHeader = (context: ReactNode = null) => (
       <Fragment key="barra">
         <TopBar tabs={tabs} context={context} onImport={handleImportSynthesis} />
         {synthesisImportBanner}
         {networkSourceError && <p className="synthesis-import-error">{networkSourceError}</p>}
       </Fragment>
     );
   ```

   Las dos franjas de error se quedan hasta la Task 3.

4. **Vista de carga.** `<span className="demo-badge">Cargando…</span>` pasa a `<DataStatus kind="loading" />`.

5. **Estado de los datos.** Sustituye todo `const badge = …;`, desde `  const badge =` hasta el `    );` que cierra el `<span className="demo-badge">` de «DATOS SINTÉTICOS · SOLO ILUSTRATIVOS», por:

   ```tsx
     // Estado de los datos (spec 5.1, punto 4).
     const status =
       source.kind === "real" ? (
         <DataStatus kind="real" regionCount={source.nodes.length} connectionCount={source.connections.length} />
       ) : (
         <DataStatus kind="demo" />
       );
   ```

   En el `renderHeader(...)` del espacio de trabajo, `{badge}` pasa a `{status}`.

6. **Texto de la vista de síntesis.** El botón ya no se llama «Importar síntesis de IA…». Sustituye:

   ```tsx
               Esta pestaña de síntesis ya no existe (se cerró). Elige otra pestaña o importa una nueva con "Importar
               síntesis de IA…".
   ```

   por:

   ```tsx
               Esta pestaña de síntesis ya no existe (se cerró). Elige otra pestaña o importa una nueva con «Importar»,
               en la barra superior.
   ```

- [ ] **Step 7: estilos en `frontend/src/App.css`**

1. Borra estas líneas, del principio del archivo, porque las etiquetas de datos las sustituye `DataStatus`:

   ```css
   /* Etiquetas de datos reales y de demostración (decisión 18 y D3 de docs/decisiones-diseno.md): nunca
      se exportan. Sus colores (--success y --warning, con sus fondos -bg) los
      define cada tema en index.css. */
   .demo-badge { display: inline-block; background: var(--warning-bg); color: var(--warning); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }
   .real-badge { display: inline-block; background: var(--success-bg); color: var(--success); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }
   ```

2. Borra el bloque del selector de vistas, desde `/* Selector "Un atlas" / "Comparar especies" (decisión 38, 01/09/2026):` hasta la línea `.view-toggle__btn--active { … }`, las dos incluidas.

3. En el bloque de «Importar síntesis de IA» (comentario, `.synthesis-import-btn`, su `:hover`, `.synthesis-import-error` y `.synthesis-tab-close`), borra las dos reglas `.synthesis-import-btn` y la regla `.synthesis-tab-close`, y cambia el comentario por el de abajo. Queda este comentario seguido de la regla `.synthesis-import-error`, que se borra en la Task 3.

   ```css
   /* Aviso de error de "Importar síntesis de IA" (decisión 71, 11/09/2026):
      nunca silencioso -- si la validación real rechaza el archivo, se ve por
      qué. El botón Importar está ahora en la barra superior (D4). */
   ```

4. En el bloque de la decisión 74, sustituye el comentario de cabecera y las seis reglas de la barra (`.topbar`, `.topbar__brand`, `.topbar .view-toggle`, `.topbar .view-toggle__btn, .topbar .synthesis-import-btn`, `.topbar__controls` y `.topbar .real-badge, .topbar .demo-badge`) por:

   ```css
   /* ------------------------------------------------------------------
      Decisión 74 (24/09/2026): espacio de trabajo "una vista grande +
      miniaturas" (disposición elegida por la usuaria). Nada de esto cambia
      colores de datos (theme/networks.ts): solo reparto de espacio, tamaños
      de letra y espaciado del chrome. La barra superior de entonces la
      sustituye la de la D4, al final de este archivo.
      ------------------------------------------------------------------ */
   ```

5. En `.app--workspace`, `padding: 0.5rem 0.75rem 0.75rem;` pasa a `padding: 0 12px 12px;`: la barra va pegada arriba y de borde a borde.

6. `.topbar .settings { margin-left: auto; position: relative; }` pasa a `.topbar .settings { position: relative; }`. El sitio lo da ahora `.topbar__end`.

7. Añade al final del archivo:

   ```css

   /* Barra superior (spec 5.1). Va de borde a borde: los márgenes negativos
      anulan el relleno de .app. Va en una sola fila (nowrap): así TopBar
      puede medir si cabe (ver «Compactación», más abajo). */
   .topbar { display: flex; align-items: center; flex-wrap: nowrap; column-gap: 14px; min-height: 56px; margin: -1rem -1.5rem 1rem; padding: 0 12px 0 18px; box-sizing: border-box; border-bottom: 1px solid var(--border); background: var(--bg); text-align: left; }
   .app--workspace > .topbar { margin: 0 -12px 12px; }
   .topbar__brand { display: flex; align-items: center; gap: 10px; }
   .topbar__logo { flex-shrink: 0; }
   .topbar__logo-ring { fill: none; stroke: var(--border-strong); stroke-width: 1.5; }
   .topbar__logo-links { fill: none; stroke: var(--text-muted); stroke-width: 1.2; }
   /* El color de cada nodo va en su atributo fill (colores de red del tema).
      Un fill aquí lo taparía. El anillo fino los separa del fondo, también
      el amarillo sobre el blanco de Claro. */
   .topbar__logo-node { stroke: var(--border-strong); stroke-width: 0.8; }
   .topbar__name { font-size: 0.89rem; font-weight: 700; letter-spacing: -0.01em; color: var(--text-h); }
   .topbar__stage { padding: 1px 7px; border: 1px solid var(--border); border-radius: 999px; font-size: 0.7rem; font-weight: 600; color: var(--text-muted); }
   .topbar__tabs { display: flex; align-self: stretch; gap: 2px; margin-left: 6px; }
   .topbar__tab { display: flex; align-items: stretch; border-bottom: 2px solid transparent; }
   .topbar__tab--active { border-bottom-color: var(--accent); }
   .topbar__tab-btn { position: relative; display: flex; align-items: center; gap: 8px; padding: 2px 9px 0; border: none; background: none; color: var(--text-muted); font: inherit; font-size: 0.72rem; font-weight: 500; white-space: nowrap; cursor: pointer; }
   .topbar__tab-btn:hover, .topbar__tab--active .topbar__tab-btn { color: var(--text-h); }
   .topbar__tab--active .topbar__tab-btn { font-weight: 600; }
   .topbar__tab-btn:focus-visible { outline-offset: -2px; }
   /* El nombre de una síntesis lo escribe quien la genera: se corta a 10rem
      y entero queda en la etiqueta emergente. Los de las vistas caben. */
   .topbar__tab-label { max-width: 10rem; overflow: hidden; text-overflow: ellipsis; }
   .topbar__tab--closable .topbar__tab-btn { padding-right: 2px; }
   /* Las síntesis de IA conservan su naranja: tercera categoría visual
      (decisión de la usuaria, 11/09/2026). */
   .icon--synthesis { color: var(--synthesis); }
   .topbar__tab-close { align-self: center; display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; margin-right: 4px; padding: 0; border: none; border-radius: 6px; background: none; color: var(--text-muted); cursor: pointer; }
   .topbar__tab-close:hover { background: var(--hover); color: var(--text-h); }
   .topbar__end { display: flex; align-items: center; gap: 10px; margin-left: auto; }
   .topbar__import { position: relative; display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: 9px; background: var(--panel-bg); color: var(--text); font: inherit; font-size: 0.72rem; font-weight: 500; cursor: pointer; }
   .topbar__import:hover { border-color: var(--border-strong); background: var(--hover); color: var(--text-h); }
   /* Compactación (logic/topBarFit.ts). Si la barra no cabe en una fila,
      TopBar pone en data-collapse los pasos que hacen falta, por este
      orden: «Datos reales» se queda en su punto («Datos de demostración»
      nunca: es un aviso), Importar en su icono, las síntesis inactivas en
      el suyo (.topbar__tab--closable: solo ellas se cierran) y al final
      las vistas inactivas. Lo plegado sigue para los lectores de pantalla
      y en la etiqueta emergente. */
   .topbar[data-collapse~="status"] .data-status--real .data-status__text,
   .topbar[data-collapse~="import"] .topbar__import-label,
   .topbar[data-collapse~="synthesis"] .topbar__tab--closable:not(.topbar__tab--active) .topbar__tab-label,
   .topbar[data-collapse~="tabs"] .topbar__tab:not(.topbar__tab--active) .topbar__tab-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
   .topbar[data-collapse~="import"] .topbar__import { width: 36px; padding: 0; justify-content: center; }
   /* Con el foco del teclado, lo plegado muestra su nombre (data-tip) bajo
      el botón, como la etiqueta emergente del ratón. Hacia la derecha en
      las pestañas y hacia la izquierda en Importar, para no salirse de la
      barra: si sobresaliera, TopBar mediría de más. */
   .topbar[data-collapse~="synthesis"] .topbar__tab--closable:not(.topbar__tab--active) .topbar__tab-btn:focus-visible::after,
   .topbar[data-collapse~="tabs"] .topbar__tab:not(.topbar__tab--active) .topbar__tab-btn:focus-visible::after,
   .topbar[data-collapse~="import"] .topbar__import:focus-visible::after { content: attr(data-tip); position: absolute; top: calc(100% + 6px); left: 0; z-index: 30; padding: 4px 8px; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--panel-bg); box-shadow: var(--shadow); color: var(--text-h); font-size: 0.7rem; font-weight: 500; white-space: nowrap; pointer-events: none; }
   .topbar[data-collapse~="import"] .topbar__import:focus-visible::after { left: auto; right: 0; }
   /* Último recurso, si ni así cabe (muchas pestañas de síntesis en una
      ventana estrecha): dos filas. */
   .topbar[data-collapse~="tabs"] { flex-wrap: wrap; }

   /* Estado de los datos (spec 5.1, punto 4). */
   .data-status { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 0 6px; font-size: 0.7rem; font-weight: 600; color: var(--text-h); white-space: nowrap; }
   .data-status__dot { flex-shrink: 0; width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); box-shadow: 0 0 0 3px var(--hover); }
   .data-status--real .data-status__dot { background: var(--success); box-shadow: 0 0 0 3px var(--success-bg); }
   .data-status--demo .data-status__dot { background: var(--warning); box-shadow: 0 0 0 3px var(--warning-bg); }
   ```

8. Comprueba que ya no quedan usos ni reglas de las clases borradas:

   ```bash
   cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend
   grep -rn "view-toggle\|synthesis-import-btn\|synthesis-tab-close\|real-badge\|demo-badge\|topbar__controls" src/App.tsx src/components
   grep -n "^\.view-toggle\|^\.synthesis-import-btn\|^\.synthesis-tab-close\|^\.real-badge\|^\.demo-badge\|^\.topbar__controls\|^\.topbar \.view-toggle\|^\.topbar \.real-badge" src/App.css
   ```

   Expected: sin resultados en los dos. Dos comentarios de `App.css` siguen nombrando clases antiguas, y se quedan: el de `.synthesis-badge` (cita `.real-badge` y `.demo-badge`) y el de `.export-btn--active` (cita `.view-toggle__btn--active`; lo cambia la Task 5).

- [ ] **Step 8: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/App.css src/components/TopBar.tsx
```

Expected: BASE + 27 pruebas en verde (142 con una BASE de 115). `tsc`, lint y compilación como en la Task 1. El `grep` solo muestra la línea de `.species-panel__figure img`. Los dos efectos de `TopBar` no cambian estado de React, así que lint no da avisos nuevos. El efecto que va sin lista de dependencias lo es a propósito: mide tras cada render.

- [ ] **Step 9: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/logic/topBarFit.ts frontend/src/logic/topBarFit.test.ts frontend/src/logic/displayText.ts frontend/src/logic/displayText.test.ts frontend/src/components/TopBar.tsx frontend/src/components/TopBar.test.tsx frontend/src/App.tsx frontend/src/App.css
git commit -m "Estructura: barra superior con marca, pestanas con icono e Importar

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 3: avisos

### Task 3: avisos flotantes e Importar solo en la aplicación de escritorio

**Files:**
- Create: `frontend/src/logic/toastQueue.ts`, `frontend/src/logic/desktopOnly.ts`
- Test: `frontend/src/logic/toastQueue.test.ts`, `frontend/src/logic/desktopOnly.test.ts`
- Create: `frontend/src/components/Toast.tsx`
- Test: `frontend/src/components/Toast.test.tsx`
- Modify: `frontend/src/App.tsx` (import de React, estado de los errores, efecto de la clasificación, `handleChangeAtlas`, `handleImportSynthesis`, menú de redes y `renderHeader`)
- Modify: `frontend/src/App.css` (regla `.synthesis-import-error`; avisos al final)

- [ ] **Step 1: escribir las pruebas que fallan**

`frontend/src/logic/toastQueue.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dismissToast, showToast, type ToastEntry } from "./toastQueue";

const importError: ToastEntry = { key: "importar", tone: "error", message: "No se pudo abrir el selector de archivos." };

describe("showToast", () => {
  it("añade el aviso al final", () => {
    const queue = showToast([importError], "redes", { tone: "error", message: "Falló la clasificación." });
    expect(queue.map((toast) => toast.key)).toEqual(["importar", "redes"]);
  });

  it("un aviso con la misma clave sustituye al anterior y pasa al final", () => {
    const start = showToast([importError], "redes", { tone: "error", message: "Uno" });
    const queue = showToast(start, "importar", { tone: "info", message: "Dos" });
    expect(queue).toEqual([
      { key: "redes", tone: "error", message: "Uno" },
      { key: "importar", tone: "info", message: "Dos" },
    ]);
  });

  it("no modifica la cola que recibe", () => {
    const start: ToastEntry[] = [importError];
    showToast(start, "redes", { tone: "info", message: "Otro" });
    expect(start).toEqual([importError]);
  });
});

describe("dismissToast", () => {
  it("quita el aviso de esa clave", () => {
    expect(dismissToast([importError], "importar")).toEqual([]);
  });

  it("sin aviso de esa clave devuelve la misma cola, así React no vuelve a pintar", () => {
    const queue: ToastEntry[] = [importError];
    expect(dismissToast(queue, "redes")).toBe(queue);
  });
});
```

`frontend/src/logic/desktopOnly.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { IMPORT_DESKTOP_ONLY_MESSAGE, runInDesktop } from "./desktopOnly";

describe("runInDesktop", () => {
  it("en el navegador no llama a la acción", async () => {
    const action = vi.fn(async () => "archivo");
    await expect(runInDesktop(action, () => false)).resolves.toEqual({ kind: "browser" });
    expect(action).not.toHaveBeenCalled();
  });

  it("en la aplicación de escritorio devuelve lo que da la acción", async () => {
    await expect(runInDesktop(async () => "archivo", () => true)).resolves.toEqual({ kind: "done", value: "archivo" });
  });

  it("los errores de la acción llegan a quien llama, sin mirar su texto", async () => {
    const failing = async () => {
      throw new Error("sin diálogo");
    };
    await expect(runInDesktop(failing, () => true)).rejects.toThrow("sin diálogo");
  });

  it("por defecto pregunta a isTauri(): en node no hay Tauri", async () => {
    const action = vi.fn(async () => 1);
    await expect(runInDesktop(action)).resolves.toEqual({ kind: "browser" });
    expect(action).not.toHaveBeenCalled();
  });

  it("el aviso usa el texto del spec", () => {
    expect(IMPORT_DESKTOP_ONLY_MESSAGE).toBe("“Importar síntesis” solo funciona en la aplicación de escritorio.");
  });
});
```

`frontend/src/components/Toast.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ToastEntry } from "../logic/toastQueue";
import { ToastRegion } from "./Toast";

const noop = () => {};

const TOASTS: ToastEntry[] = [
  { key: "importar", tone: "info", message: "Uno" },
  { key: "redes", tone: "error", message: "Dos", details: "pila" },
];

describe("ToastRegion", () => {
  it("sin avisos no pinta nada", () => {
    expect(renderToStaticMarkup(<ToastRegion toasts={[]} onDismiss={noop} />)).toBe("");
  });

  it("cada aviso es role=alert, lleva su clave y se cierra con un botón", () => {
    const html = renderToStaticMarkup(<ToastRegion toasts={TOASTS} onDismiss={noop} />);
    expect(html.match(/role="alert"/g)).toHaveLength(2);
    expect(html).toContain('data-toast-key="redes"');
    expect(html.match(/>Entendido<\/button>/g)).toHaveLength(2);
  });

  it("«Detalles» solo aparece si hay texto técnico", () => {
    const html = renderToStaticMarkup(<ToastRegion toasts={TOASTS} onDismiss={noop} />);
    expect(html.match(/<summary>Detalles<\/summary>/g)).toHaveLength(1);
    expect(html).toContain("<pre>pila</pre>");
  });
});
```

- [ ] **Step 2: comprobar que fallan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/toastQueue.test.ts src/logic/desktopOnly.test.ts src/components/Toast.test.tsx`
Expected: FAIL, porque no existen los tres módulos.

- [ ] **Step 3: implementar `frontend/src/logic/toastQueue.ts`**

```ts
// Cola de avisos flotantes (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.6). Cada aviso tiene la clave de su
// origen ("importar", "redes"): uno nuevo sustituye al anterior del mismo
// origen, como pasaba con las franjas de error. Se quedan hasta que se
// cierran. Funciones puras: se prueban sin DOM.

export type ToastTone = "error" | "info";

export interface ToastContent {
  tone: ToastTone;
  // Mensaje comprensible, a la vista.
  message: string;
  // Texto técnico completo, en «Detalles».
  details?: string;
}

export interface ToastEntry extends ToastContent {
  key: string;
}

export function showToast(queue: readonly ToastEntry[], key: string, content: ToastContent): ToastEntry[] {
  return [...queue.filter((toast) => toast.key !== key), { key, ...content }];
}

// Si no hay aviso de esa clave devuelve la misma cola: setState no vuelve a
// pintar.
export function dismissToast(queue: ToastEntry[], key: string): ToastEntry[] {
  return queue.some((toast) => toast.key === key) ? queue.filter((toast) => toast.key !== key) : queue;
}
```

- [ ] **Step 4: implementar `frontend/src/logic/desktopOnly.ts`**

`isTauri()` existe en `@tauri-apps/api/core` 2.11.1, la versión instalada (`node_modules/@tauri-apps/api/core.d.ts`). En node devuelve `false` y el módulo se puede importar sin `window`.

```ts
// Acciones que solo existen en la aplicación de escritorio (D4 de
// docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 5.6).
// "Importar síntesis" abre el diálogo nativo de Tauri, que en el navegador
// (npm run dev) no existe. Se pregunta a isTauri() antes de intentarlo;
// nunca se compara el texto del error, que cambia según el navegador.
import { isTauri } from "@tauri-apps/api/core";

export const IMPORT_DESKTOP_ONLY_MESSAGE = "“Importar síntesis” solo funciona en la aplicación de escritorio.";

export type DesktopOnlyResult<T> = { kind: "browser" } | { kind: "done"; value: T };

export async function runInDesktop<T>(
  action: () => Promise<T>,
  inDesktop: () => boolean = isTauri,
): Promise<DesktopOnlyResult<T>> {
  if (!inDesktop()) return { kind: "browser" };
  return { kind: "done", value: await action() };
}
```

- [ ] **Step 5: implementar `frontend/src/components/Toast.tsx`**

```tsx
// Avisos flotantes (D4 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md,
// 5.6). Sustituyen a las franjas rojas fijas de App.tsx. Van arriba a la
// derecha, bajo la barra y sobre la columna derecha, sin tapar la vista
// grande. Cada aviso es role="alert", con un mensaje comprensible y, si lo
// hay, el texto técnico completo en «Detalles». Se quedan hasta que se
// cierran.
import { useLayoutEffect, useRef } from "react";
import type { ToastEntry } from "../logic/toastQueue";
import { Icon } from "./Icon";

export function Toast({ toast, onDismiss }: { toast: ToastEntry; onDismiss: () => void }) {
  return (
    <div className={`toast toast--${toast.tone}`} role="alert" data-toast-key={toast.key}>
      <Icon name={toast.tone === "error" ? "alert" : "info"} size={18} className="toast__icon" />
      <div className="toast__body">
        <p className="toast__message">{toast.message}</p>
        {toast.details && (
          <details className="toast__details">
            <summary>Detalles</summary>
            <pre>{toast.details}</pre>
          </details>
        )}
        <div className="toast__buttons">
          <button type="button" className="toast__close" onClick={onDismiss}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// Al cerrar un aviso con su botón, el foco pasa al botón del aviso
// siguiente (o del anterior, si era el último). Si no queda ninguno, lo
// decide quien pinta la región (onEmptied): App lo devuelve a «Importar».
// Sin esto, el foco caería en la página, porque el botón desaparece.
export function ToastRegion({
  toasts,
  onDismiss,
  onEmptied,
}: {
  toasts: readonly ToastEntry[];
  onDismiss: (key: string) => void;
  onEmptied?: () => void;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  const focusAfterDismiss = useRef<string | null>(null);

  useLayoutEffect(() => {
    const key = focusAfterDismiss.current;
    if (key === null) return;
    focusAfterDismiss.current = null;
    const toast = [...(regionRef.current?.querySelectorAll<HTMLElement>(".toast") ?? [])].find(
      (element) => element.dataset.toastKey === key,
    );
    toast?.querySelector<HTMLButtonElement>(".toast__close")?.focus();
  });

  if (toasts.length === 0) return null;

  const dismiss = (index: number) => {
    const next = toasts[index + 1] ?? toasts[index - 1];
    onDismiss(toasts[index].key);
    if (next) focusAfterDismiss.current = next.key;
    else onEmptied?.();
  };

  return (
    <div ref={regionRef} className="toast-region">
      {toasts.map((toast, index) => (
        <Toast key={toast.key} toast={toast} onDismiss={() => dismiss(index)} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: comprobar que pasan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/toastQueue.test.ts src/logic/desktopOnly.test.ts src/components/Toast.test.tsx`
Expected: PASS (13 pruebas).

- [ ] **Step 7: los avisos en `frontend/src/App.tsx`**

El flujo de los manejadores no cambia: cada rama que ponía un texto en una franja pone ahora un aviso con la misma clave de origen.

1. **Imports.**
   - `import { Fragment, useEffect, useState, type ReactNode } from "react";` pasa a `import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";`.
   - Tras `import { DataStatus, TopBar, type TopBarTab } from "./components/TopBar";` añade `import { ToastRegion } from "./components/Toast";`.
   - Tras `import { validateSynthesisFile } from "./logic/synthesisValidation";` añade:

     ```ts
     import { IMPORT_DESKTOP_ONLY_MESSAGE, runInDesktop } from "./logic/desktopOnly";
     import { dismissToast, showToast, type ToastContent, type ToastEntry } from "./logic/toastQueue";
     ```

2. **Claves de origen.** Justo después de la línea `type View = "atlas" | "species" | "tractography" | "tractography-nodes" | "synthesis";` añade:

   ```ts

   // Orígenes de los avisos (D4; spec 5.6): un aviso nuevo sustituye al
   // anterior del mismo origen.
   const IMPORT_TOAST = "importar";
   const NETWORK_TOAST = "redes";
   ```

3. **Estado.**
   - Borra la línea `  const [networkSourceError, setNetworkSourceError] = useState<string | null>(null);`.
   - Sustituye `  const [synthesisImportError, setSynthesisImportError] = useState<string | null>(null);` por:

     ```tsx
       // Avisos flotantes (D4 de docs/decisiones-diseno.md; spec 5.6). Sustituyen
       // a las dos franjas de error de antes: la de importar una síntesis y la
       // de cambiar la clasificación de redes. Se quedan hasta que se cierran.
       const [toasts, setToasts] = useState<ToastEntry[]>([]);
       const showNotice = (key: string, content: ToastContent) => setToasts((queue) => showToast(queue, key, content));
       // Al cerrar el último aviso, el foco vuelve a «Importar» (ToastRegion).
       const importButtonRef = useRef<HTMLButtonElement>(null);
     ```

4. **Error de clasificación, en el segundo `useEffect`.** Sustituye:

   ```tsx
             setNetworkSourceError(`No se pudo cargar la clasificación '${networkSource}' (${message}).`);
   ```

   por:

   ```tsx
             // setToasts y no showNotice: un setter de estado no es dependencia del efecto.
             setToasts((queue) =>
               showToast(queue, NETWORK_TOAST, {
                 tone: "error",
                 message: `No se pudo cargar la clasificación de redes «${networkSourceShortLabel(networkSource)}». Se vuelve a la clasificación por defecto del atlas.`,
                 details: `No se pudo cargar la clasificación '${networkSource}' (${message}).`,
               }),
             );
   ```

5. **Retirar el aviso de redes.** Con reemplazo en todas las apariciones (`replace_all`), `setNetworkSourceError(null);` pasa a `setToasts((queue) => dismissToast(queue, NETWORK_TOAST));`. Aparece dos veces: en `handleChangeAtlas` y en el `onChange` de `networkMenu`.

6. **`handleImportSynthesis`.** Sustituye la función entera por esta. Las ramas son las mismas; cambian los textos, que ahora separan el mensaje de los detalles, y la comprobación de `isTauri()`. `pickAndReadSynthesisFile` abre el diálogo y lee el archivo, así que su error puede venir de cualquiera de las dos cosas.

   ```tsx
     async function handleImportSynthesis() {
       setToasts((queue) => dismissToast(queue, IMPORT_TOAST));
       let picked: PickedSynthesisFile | null;
       try {
         // En el navegador (npm run dev) no hay diálogo de Tauri: ni se
         // intenta abrir (D4 de docs/decisiones-diseno.md; spec 5.6).
         const outcome = await runInDesktop(pickAndReadSynthesisFile);
         if (outcome.kind === "browser") {
           showNotice(IMPORT_TOAST, { tone: "info", message: IMPORT_DESKTOP_ONLY_MESSAGE });
           return;
         }
         picked = outcome.value;
       } catch (e) {
         showNotice(IMPORT_TOAST, {
           tone: "error",
           message: "No se pudo abrir o leer el archivo.",
           details: e instanceof Error ? e.message : String(e),
         });
         return;
       }
       if (picked === null) {
         // La usuaria cerró el diálogo sin elegir nada -- no es un error.
         return;
       }
       let raw: unknown;
       try {
         raw = JSON.parse(picked.content);
       } catch (e) {
         showNotice(IMPORT_TOAST, {
           tone: "error",
           message: "El archivo elegido no contiene un JSON válido.",
           details: `Archivo: ${picked.path}\n${e instanceof Error ? e.message : String(e)}`,
         });
         return;
       }
       if (source.kind !== "real") {
         showNotice(IMPORT_TOAST, {
           tone: "error",
           message:
             "No se puede importar ahora: no hay datos reales cargados contra los que verificar sus regiones " +
             "(estás viendo datos de demostración, o la API todavía no respondió).",
         });
         return;
       }
       const result = validateSynthesisFile(raw, selectedAtlasId, source.nodes);
       if (!result.ok) {
         const problems = result.errors.length === 1 ? "1 problema" : `${result.errors.length} problemas`;
         showNotice(IMPORT_TOAST, {
           tone: "error",
           message: `La síntesis no se ha importado: tiene ${problems}.`,
           details: result.errors.join("\n"),
         });
         return;
       }
       const tabId = `synthesis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
       setSynthesisTabs((prev) => [...prev, { tabId, validated: result.validated }]);
       setActiveSynthesisTabId(tabId);
       setView("synthesis");
     }
   ```

7. **Franjas.**
   - Borra la constante `synthesisImportBanner` entera (sus tres líneas) y la línea en blanco que la sigue.
   - En `renderHeader`, `<TopBar tabs={tabs} context={context} onImport={handleImportSynthesis} />` pasa a `<TopBar tabs={tabs} context={context} onImport={handleImportSynthesis} importRef={importButtonRef} />`, y las dos líneas de franja:

     ```tsx
           {synthesisImportBanner}
           {networkSourceError && <p className="synthesis-import-error">{networkSourceError}</p>}
     ```

     pasan a:

     ```tsx
           <ToastRegion
             toasts={toasts}
             onDismiss={(key) => setToasts((queue) => dismissToast(queue, key))}
             onEmptied={() => importButtonRef.current?.focus()}
           />
     ```

     El `<Fragment key="barra">` de `renderHeader` se queda.

8. Comprueba que no queda ningún resto:

   ```bash
   grep -n "synthesisImportError\|networkSourceError\|setSynthesisImportError\|setNetworkSourceError\|synthesis-import-error" /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/src/App.tsx
   ```

   Expected: sin resultados.

- [ ] **Step 8: estilos en `frontend/src/App.css`**

1. Borra el comentario «Aviso de error de "Importar síntesis de IA"…» que dejó la Task 2 y la regla `.synthesis-import-error { … }`.

2. Añade al final del archivo. `position: fixed` no depende de dónde esté el aviso en el DOM: `renderHeader` lo pone justo tras la barra, así que con el teclado se llega a él enseguida.

   ```css

   /* Avisos flotantes (spec 5.6), encima de todo: arriba a la derecha, bajo
      la barra (56 px más 12 de margen) y sobre la columna derecha, con su
      ancho. Así no tapan la vista grande ni su recuadro de lectura. */
   .toast-region { position: fixed; top: 68px; right: 12px; z-index: 40; display: flex; flex-direction: column; gap: 8px; width: min(300px, calc(100vw - 24px)); }
   .toast { display: flex; align-items: flex-start; gap: 12px; padding: 12px 12px 12px 14px; border: 1px solid var(--border-strong); border-radius: 12px; background: var(--panel-bg); box-shadow: var(--shadow); text-align: left; }
   .toast__icon { margin-top: 1px; color: var(--text-h); }
   .toast--error .toast__icon { color: var(--error); }
   .toast__body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
   .toast__message { margin: 0; font-size: 0.72rem; font-weight: 600; line-height: 1.4; color: var(--text-h); }
   .toast__details > summary { cursor: pointer; font-size: 0.7rem; color: var(--text-muted); }
   .toast__details pre { max-height: 10rem; overflow: auto; margin: 6px 0 0; padding: 8px; border-radius: 6px; background: var(--code-bg); color: var(--text); font-family: var(--mono); font-size: 0.7rem; white-space: pre-wrap; word-break: break-word; }
   .toast__buttons { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 4px; }
   .toast__close { height: 30px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--code-bg); color: var(--text); font: inherit; font-size: 0.7rem; font-weight: 600; cursor: pointer; }
   .toast__close:hover { border-color: var(--border-strong); background: var(--hover); color: var(--text-h); }
   ```

- [ ] **Step 9: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/App.css src/components/Toast.tsx
```

Expected: BASE + 40 pruebas en verde (155 con una BASE de 115). Lo demás, como en las tareas anteriores.

- [ ] **Step 10: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/logic/toastQueue.ts frontend/src/logic/toastQueue.test.ts frontend/src/logic/desktopOnly.ts frontend/src/logic/desktopOnly.test.ts frontend/src/components/Toast.tsx frontend/src/components/Toast.test.tsx frontend/src/App.tsx frontend/src/App.css
git commit -m "Estructura: avisos flotantes e Importar solo en la aplicacion de escritorio

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 4: filtros

### Task 4: filtros con recuentos

**Files:**
- Create: `frontend/src/logic/filterCounts.ts`
- Test: `frontend/src/logic/filterCounts.test.ts`
- Modify: `frontend/src/logic/displayText.ts` y `frontend/src/logic/displayText.test.ts` (`networkShortLabel`, `selectionStatusText` y `connectionsPassingText`)
- Modify: `frontend/src/components/FilterPanel.tsx` (imports, props, secciones plegables y lo que devuelve)
- Test: `frontend/src/components/FilterPanel.test.tsx`
- Modify: `frontend/src/App.tsx` (recuentos, props del panel, botón de desplegar y foco al plegar y desplegar)
- Modify: `frontend/src/App.css` (reglas del panel de filtros y anillo de `.legend-swatch`)

- [ ] **Step 1: escribir las pruebas que fallan**

`frontend/src/logic/filterCounts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ConnectionType } from "../state/filters";
import type { GraphConnection, GraphNode } from "../types/domain";
import { countConnections } from "./filterCounts";
import { filterGraph } from "./visibility";

function node(id: string, network: string): GraphNode {
  return { id, label: id, abbreviation: id, hemisphere: "L", network, position3d: [0, 0, 0], referenceSpace: null };
}

function connection(id: string, source: string, target: string, type: ConnectionType, weight: number): GraphConnection {
  return { id, source, target, type, weight, evidenceLevel: "direct" };
}

const NODES = [node("a", "red1"), node("b", "red1"), node("c", "red2")];
const CONNECTIONS = [
  connection("ab-e", "a", "b", "structural", 0.5),
  connection("ab-f", "a", "b", "functional", 0.05),
  connection("ac-e", "a", "c", "structural", 0.3),
  connection("bc-ef", "b", "c", "effective", 0.9),
];

describe("countConnections", () => {
  it("cuenta cada tipo con los filtros de redes y peso, aunque su casilla esté desmarcada", () => {
    const counts = countConnections(NODES, CONNECTIONS, {
      hiddenNetworks: new Set(),
      hiddenConnectionTypes: new Set<ConnectionType>(["structural"]),
      minWeight: 0.1,
    });
    expect(counts.byType).toEqual({ structural: 2, functional: 0, effective: 1 });
  });

  it("una red oculta quita las conexiones que la tocan", () => {
    const counts = countConnections(NODES, CONNECTIONS, {
      hiddenNetworks: new Set(["red2"]),
      hiddenConnectionTypes: new Set(),
      minWeight: 0,
    });
    expect(counts.byType).toEqual({ structural: 1, functional: 1, effective: 0 });
  });

  it("visibles son las que pasan todos los filtros, como en filterGraph; cargadas, todas", () => {
    const filters = {
      hiddenNetworks: new Set<string>(),
      hiddenConnectionTypes: new Set<ConnectionType>(["structural"]),
      minWeight: 0.1,
    };
    const counts = countConnections(NODES, CONNECTIONS, filters);
    expect(counts.visible).toBe(filterGraph(NODES, CONNECTIONS, filters).connections.length);
    expect(counts.visible).toBe(1);
    expect(counts.loaded).toBe(4);
  });

  it("un tipo que el panel no conoce no suma en ningún tipo, pero sí entre las visibles, como en filterGraph", () => {
    const withUnknown = [...CONNECTIONS, connection("ab-x", "a", "b", "desconocido" as string as ConnectionType, 0.5)];
    const filters = { hiddenNetworks: new Set<string>(), hiddenConnectionTypes: new Set<ConnectionType>(), minWeight: 0 };
    const counts = countConnections(NODES, withUnknown, filters);
    expect(counts.byType).toEqual({ structural: 2, functional: 1, effective: 1 });
    expect(counts.visible).toBe(filterGraph(NODES, withUnknown, filters).connections.length);
    expect(counts.visible).toBe(5);
  });

  it("una conexión con un extremo que no está entre los nodos no cuenta, salvo entre las cargadas", () => {
    const withOrphan = [...CONNECTIONS, connection("az", "a", "z", "structural", 0.9)];
    const counts = countConnections(NODES, withOrphan, {
      hiddenNetworks: new Set(),
      hiddenConnectionTypes: new Set(),
      minWeight: 0,
    });
    expect(counts.byType.structural).toBe(2);
    expect(counts.visible).toBe(4);
    expect(counts.loaded).toBe(5);
  });
});
```

En `frontend/src/logic/displayText.test.ts`:
- Cambia el import a `import { connectionsPassingText, formatCount, networkShortLabel, selectionStatusText } from "./displayText";`.
- Añade al final:

```ts
describe("networkShortLabel", () => {
  it("quita el paréntesis final de la clasificación", () => {
    expect(networkShortLabel("cole-anticevic.visual")).toBe("Visual");
    expect(networkShortLabel("cole-anticevic.default")).toBe("Por defecto");
    expect(networkShortLabel("yeo2011-7.vis")).toBe("Visual — Vis");
  });

  it("una red sin etiqueta se muestra con su clave", () => {
    expect(networkShortLabel("atlas-nuevo.red")).toBe("atlas-nuevo.red");
    expect(networkShortLabel("constructor")).toBe("constructor");
  });
});

describe("selectionStatusText", () => {
  it("cuenta las regiones seleccionadas", () => {
    expect(selectionStatusText(1, false)).toBe("1 región seleccionada");
    expect(selectionStatusText(12, false)).toBe("12 regiones seleccionadas");
  });

  it("sin regiones, dice si hay una conexión seleccionada o nada", () => {
    expect(selectionStatusText(0, true)).toBe("1 conexión seleccionada");
    expect(selectionStatusText(0, false)).toBe("Ninguna región seleccionada");
  });
});

describe("connectionsPassingText", () => {
  it("cuenta las que pasan los filtros, con el singular donde toca", () => {
    expect(connectionsPassingText(4, 9)).toBe("4 de 9 conexiones pasan los filtros");
    expect(connectionsPassingText(1, 9)).toBe("1 de 9 conexiones pasa los filtros");
    expect(connectionsPassingText(1, 1)).toBe("1 de 1 conexión pasa los filtros");
    expect(connectionsPassingText(0, 0)).toBe("0 de 0 conexiones pasan los filtros");
  });
});
```

`frontend/src/components/FilterPanel.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GraphNode } from "../types/domain";
import { FilterPanel } from "./FilterPanel";

const NODES: GraphNode[] = [
  { id: "a", label: "A", abbreviation: "A", hemisphere: "L", network: "cole-anticevic.visual", position3d: [0, 0, 0], referenceSpace: null },
  { id: "b", label: "B", abbreviation: "B", hemisphere: "R", network: "cole-anticevic.default", position3d: [0, 0, 0], referenceSpace: null },
];

// Profundidad máxima de <button> anidados: un botón dentro de otro no es HTML válido.
function maxButtonDepth(html: string): number {
  let depth = 0;
  let max = 0;
  for (const match of html.matchAll(/<(\/?)button\b/g)) {
    depth += match[1] ? -1 : 1;
    max = Math.max(max, depth);
  }
  return max;
}

describe("FilterPanel", () => {
  const html = renderToStaticMarkup(
    <FilterPanel
      nodes={NODES}
      connectionCountsByType={{ structural: 3, functional: 0, effective: 1 }}
      connectionTotals={{ visible: 4, loaded: 9 }}
    />,
  );

  it("cada sección se pliega con un botón aria-expanded que controla su cuerpo, y empieza abierta", () => {
    const toggles = [
      ...html.matchAll(/<button type="button" class="filters__disclosure" aria-expanded="true" aria-controls="([^"]+)"/g),
    ];
    expect(toggles).toHaveLength(3);
    for (const [, id] of toggles) expect(html).toContain(`id="${id}"`);
    expect(html).not.toContain('hidden=""');
  });

  it("«Todas» y «Ninguna» son botones aparte, fuera del de la sección", () => {
    expect(maxButtonDepth(html)).toBe(1);
    expect(html).toContain(">Todas</button>");
    expect(html).toContain(">Ninguna</button>");
  });

  it("◎ y + dicen qué hacen, en su nombre y en su etiqueta emergente", () => {
    expect(html).toContain(
      'aria-label="Resaltar solo la red Visual (sustituye la selección)" title="Resaltar solo la red Visual (sustituye la selección)"',
    );
    expect(html).toContain('aria-label="Añadir la red Visual a la selección"');
  });

  it("cada red dice cuántas regiones tiene, y la cabecera cuántas redes hay, también con su unidad para los lectores de pantalla", () => {
    expect(html.match(/<span class="filters__count" aria-hidden="true">1<\/span>/g)).toHaveLength(3);
    expect(html.match(/<span class="visually-hidden">, 1 región<\/span>/g)).toHaveLength(2);
    expect(html).toContain('<span class="visually-hidden">, 2 redes</span>');
  });

  it("da el recuento de cada tipo, con su unidad, y cuántas conexiones pasan los filtros", () => {
    expect(html).toContain('<span class="filters__count" aria-hidden="true">3</span><span class="visually-hidden">, 3 conexiones</span>');
    expect(html).toContain('<span class="visually-hidden">, 1 conexión</span>');
    expect(html).toContain("4 de 9 conexiones pasan los filtros");
  });

  it("el deslizador dice el peso mínimo con palabras", () => {
    expect(html).toContain('aria-valuetext="0 (sin filtro, se muestra todo)"');
  });
});
```

- [ ] **Step 2: comprobar que fallan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/filterCounts.test.ts src/logic/displayText.test.ts src/components/FilterPanel.test.tsx`
Expected: FAIL, porque no existen `./filterCounts`, `networkShortLabel` ni `selectionStatusText`, y el panel todavía no tiene las secciones nuevas.

- [ ] **Step 3: implementar `frontend/src/logic/filterCounts.ts`**

```ts
// Recuentos del panel de filtros (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.3). Usa las mismas reglas de
// visibilidad que las vistas (logic/visibility.ts).
import type { ConnectionType, FiltersState } from "../state/filters";
import type { GraphConnection, GraphNode } from "../types/domain";
import { isConnectionVisible, isNodeVisible } from "./visibility";

export interface ConnectionCounts {
  // Por tipo: las que pasan los demás filtros (redes y peso mínimo), sin
  // contar la casilla de su propio tipo. Así se ve cuántas añadiría
  // marcarla.
  byType: Record<ConnectionType, number>;
  // Las que pasan todos los filtros («N de M…»): las mismas que
  // filterGraph.
  visible: number;
  // Todas las cargadas para el atlas («…de M conexiones»).
  loaded: number;
}

export function countConnections(
  nodes: readonly GraphNode[],
  connections: readonly GraphConnection[],
  filters: Pick<FiltersState, "hiddenNetworks" | "hiddenConnectionTypes" | "minWeight">,
): ConnectionCounts {
  const visibleIds = new Set(nodes.filter((node) => isNodeVisible(node, filters)).map((node) => node.id));
  const isEndpointVisible = (id: string) => visibleIds.has(id);
  const withoutTypeFilter = { hiddenConnectionTypes: new Set<ConnectionType>(), minWeight: filters.minWeight };
  const byType: Record<ConnectionType, number> = { structural: 0, functional: 0, effective: 0 };
  let visible = 0;
  for (const connection of connections) {
    if (!isConnectionVisible(connection, withoutTypeFilter, isEndpointVisible)) continue;
    // Un tipo que el panel no conoce (un dato nuevo del backend) no tiene
    // casilla y no suma en ninguno; sí cuenta entre las visibles, como en
    // las vistas.
    if (Object.hasOwn(byType, connection.type)) byType[connection.type] += 1;
    if (isConnectionVisible(connection, filters, isEndpointVisible)) visible += 1;
  }
  return { byType, visible, loaded: connections.length };
}
```

- [ ] **Step 4: ampliar `frontend/src/logic/displayText.ts`**

Añade el import al principio, tras el comentario de cabecera:

```ts
import { NETWORK_LABELS } from "../theme/networks";
```

Añade al final:

```ts
// Nombre de una red sin el paréntesis final de su clasificación: «Visual»
// y no «Visual (Cole-Anticevic)», porque la clasificación ya se ve en el
// botón «Redes» de la barra. Antes este recorte estaba dentro de
// FilterPanel (decisión 74).
export function networkShortLabel(network: string): string {
  const label = Object.hasOwn(NETWORK_LABELS, network) ? NETWORK_LABELS[network] : network;
  return label.replace(/\s*\([^()]*\)\s*$/, "") || label;
}

// Texto de la selección en el panel de filtros (spec 5.3).
export function selectionStatusText(regionCount: number, connectionSelected: boolean): string {
  if (regionCount > 0) {
    return regionCount === 1 ? "1 región seleccionada" : `${regionCount} regiones seleccionadas`;
  }
  return connectionSelected ? "1 conexión seleccionada" : "Ninguna región seleccionada";
}

// «N de M conexiones pasan los filtros», bajo el peso mínimo (spec 5.3).
// El spec decía «Se ven N de M», pero las vistas pueden dibujar menos (D4).
export function connectionsPassingText(visible: number, loaded: number): string {
  const noun = loaded === 1 ? "conexión" : "conexiones";
  const verb = visible === 1 ? "pasa" : "pasan";
  return `${formatCount(visible)} de ${formatCount(loaded)} ${noun} ${verb} los filtros`;
}
```

- [ ] **Step 5: comprobar que pasan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/filterCounts.test.ts src/logic/displayText.test.ts`
Expected: PASS (12 pruebas: 5 de `filterCounts` y 7 de `displayText`).

- [ ] **Step 6: `frontend/src/components/FilterPanel.tsx`**

La lógica del desarrollador principal no cambia: `networkKeys`, `nodeIdsByNetwork`, `markAllNetworks`, `unmarkAllNetworks`, `selectWholeNetwork`, `addNetworkToSelection` y sus comentarios.

1. **Imports.** Sustituye `import { useMemo } from "react";` por `import { useId, useMemo, useState, type ReactNode } from "react";`. Tras `import { formatMinWeight, sliderPositionToWeight, weightToSliderPosition } from "../logic/weightScale";` añade:

   ```ts
   import { connectionsPassingText, formatCount, networkShortLabel, selectionStatusText } from "../logic/displayText";
   import { MAX_RENDERED_CONNECTIONS } from "../logic/renderSafety";
   ```

   Tras `import type { GraphNode } from "../types/domain";` añade `import { Icon } from "./Icon";`.

2. **Props.** La interfaz `FilterPanelProps` queda así:

   ```ts
   interface FilterPanelProps {
     nodes: GraphNode[];
     // Decisión 74: el panel se puede plegar para dejar más sitio a la vista
     // principal. Sin esto, no se muestra el botón de plegar.
     onCollapse?: () => void;
     // D4 de docs/decisiones-diseno.md (spec 5.3). Las calcula App con
     // logic/filterCounts.ts: cuántas conexiones de cada tipo pasan los
     // filtros de redes y peso, sin contar su casilla...
     connectionCountsByType: Record<ConnectionType, number>;
     // ...y «N de M conexiones pasan los filtros»: N, las que pasan todos
     // los filtros; M, las cargadas para el atlas.
     connectionTotals: { visible: number; loaded: number };
   }
   ```

   La firma pasa a `export function FilterPanel({ nodes, onCollapse, connectionCountsByType, connectionTotals }: FilterPanelProps) {`.

3. **Botón de sección.** Justo antes de `interface FilterPanelProps {` añade:

   ```tsx
   // Título de una sección plegable (D4 de docs/decisiones-diseno.md; spec
   // 5.3): un botón con aria-expanded que controla el cuerpo de la sección.
   // Va dentro del encabezado; los demás botones de la cabecera («Todas»,
   // «Ninguna») van fuera de él.
   function SectionToggle({
     open,
     controls,
     onToggle,
     children,
   }: {
     open: boolean;
     controls: string;
     onToggle: () => void;
     children: ReactNode;
   }) {
     return (
       <button type="button" className="filters__disclosure" aria-expanded={open} aria-controls={controls} onClick={onToggle}>
         <Icon name="chevronDown" size={14} className="filters__chevron" />
         {children}
       </button>
     );
   }

   ```

4. **Ids y secciones.** Justo después de `const hasSelection = selectedNodeIds.size > 0 || selectedConnectionId !== null;` añade:

   ```tsx
     const headingId = useId();
     // Secciones plegables (decisión 74): las tres empiezan abiertas, como
     // con los <details open> de antes.
     const [openSections, setOpenSections] = useState({ networks: true, types: true, weight: true });
     const toggleSection = (section: keyof typeof openSections) =>
       setOpenSections((current) => ({ ...current, [section]: !current[section] }));
   ```

5. **Lo que devuelve.** Sustituye desde el comentario `// Decisión 74 (24/09/2026): mismo contenido y mismas acciones que` hasta el final del archivo por:

   ```tsx
     // D4 de docs/decisiones-diseno.md (spec 5.3): el mismo contenido y las
     // mismas acciones de la decisión 74 (D1), con otra jerarquía. Las
     // secciones siguen siendo plegables, pero su título es un botón con
     // aria-expanded y no un <summary>: la cabecera de «Redes» lleva además
     // «Todas» y «Ninguna», que no pueden ir dentro de un <summary>. Hay una
     // fila por red con su número de regiones: ◎ y + aparecen al pasar el
     // ratón o al llegar a la fila con el teclado. Junto a cada tipo de
     // conectividad va su recuento, y bajo el peso mínimo, «N de M
     // conexiones pasan los filtros». Los números a la vista van con
     // aria-hidden y su unidad en texto oculto: «Estructural, 3
     // conexiones» y no «Estructural 3». Cada sección es un grupo con el
     // nombre de su título (role="group"), no un <section>: tres puntos de
     // referencia más en un panel lateral estorbarían al navegar por ellos.
     return (
       <aside className="filter-panel filters" aria-labelledby={`${headingId}-title`}>
         <div className="filters__header">
           <h2 id={`${headingId}-title`}>Filtros</h2>
           {onCollapse && (
             <button
               type="button"
               className="filters__collapse"
               title="Plegar el panel de filtros"
               aria-label="Plegar el panel de filtros"
               onClick={onCollapse}
             >
               <Icon name="chevronsLeft" />
             </button>
           )}
         </div>

         <div className="filters__selection">
           <span>{selectionStatusText(selectedNodeIds.size, selectedConnectionId !== null)}</span>
           <button
             type="button"
             className="filters__text-btn filters__text-btn--strong"
             disabled={!hasSelection}
             title="Quita el resaltado actual (nodos o conexión seleccionada) en las tres vistas"
             onClick={clearNodeSelection}
           >
             Limpiar
           </button>
         </div>

         <div className="filters__section" role="group" aria-labelledby={`${headingId}-networks`}>
           <div className="filters__section-header">
             <h3 className="filters__heading" id={`${headingId}-networks`}>
               <SectionToggle
                 open={openSections.networks}
                 controls={`${headingId}-networks-body`}
                 onToggle={() => toggleSection("networks")}
               >
                 Redes{" "}
                 <span className="filters__heading-count" aria-hidden="true">
                   {networkKeys.length}
                 </span>
                 <span className="visually-hidden">
                   , {networkKeys.length === 1 ? "1 red" : `${networkKeys.length} redes`}
                 </span>
               </SectionToggle>
             </h3>
             <span className="filters__bulk">
               <button type="button" className="filters__text-btn" title="Marcar todas las redes" onClick={markAllNetworks}>
                 Todas
               </button>
               <button type="button" className="filters__text-btn" title="Desmarcar todas las redes" onClick={unmarkAllNetworks}>
                 Ninguna
               </button>
             </span>
           </div>
           <div id={`${headingId}-networks-body`} hidden={!openSections.networks}>
             {networkKeys.length === 0 ? (
               <p className="filter-panel__empty">Sin redes cargadas todavía.</p>
             ) : (
               <ul className="filters__networks">
                 {networkKeys.map((network) => {
                   const label = NETWORK_LABELS[network] ?? network;
                   const shortLabel = networkShortLabel(network);
                   const count = nodeIdsByNetwork.get(network)?.length ?? 0;
                   const regions = `${count} región${count === 1 ? "" : "es"}`;
                   // ◎ y + (spec 5.3): su nombre dice qué hacen, también si
                   // ◎ sustituye la selección entera.
                   const highlight = `Resaltar solo la red ${shortLabel} (sustituye la selección)`;
                   const add = `Añadir la red ${shortLabel} a la selección`;
                   return (
                     <li key={network} className="filters__network">
                       {/* En la lista, el nombre sin la clasificación, que ya se
                           ve en el botón «Redes» de la barra. El nombre completo
                           sigue en el texto emergente. */}
                       <label title={`${label} — ${regions}`}>
                         <input
                           type="checkbox"
                           checked={!hiddenNetworks.has(network)}
                           onChange={() => toggleNetwork(network)}
                         />
                         <span className="filters__swatch" style={{ backgroundColor: resolveNetworkColor(network) }} />
                         <span className="filters__name">{shortLabel}</span>
                         <span className="visually-hidden">, {regions}</span>
                       </label>
                       <span className="filters__count" aria-hidden="true">
                         {formatCount(count)}
                       </span>
                       <span className="filters__actions">
                         <button
                           type="button"
                           className="filters__icon-btn"
                           aria-label={highlight}
                           title={highlight}
                           onClick={() => selectWholeNetwork(network)}
                         >
                           <Icon name="target" size={14} />
                         </button>
                         <button
                           type="button"
                           className="filters__icon-btn"
                           aria-label={add}
                           title={add}
                           onClick={() => addNetworkToSelection(network)}
                         >
                           <Icon name="plus" size={14} />
                         </button>
                       </span>
                     </li>
                   );
                 })}
               </ul>
             )}
           </div>
         </div>

         <div className="filters__section" role="group" aria-labelledby={`${headingId}-types`}>
           <div className="filters__section-header">
             <h3 className="filters__heading" id={`${headingId}-types`}>
               <SectionToggle
                 open={openSections.types}
                 controls={`${headingId}-types-body`}
                 onToggle={() => toggleSection("types")}
               >
                 Tipo de conectividad
               </SectionToggle>
             </h3>
           </div>
           <div id={`${headingId}-types-body`} hidden={!openSections.types}>
             <ul className="filters__types">
               {CONNECTION_TYPES.map((type) => (
                 <li key={type}>
                   <label
                     className="filters__type"
                     title="Conexiones de este tipo que pasan los filtros de redes y de peso mínimo, aunque su casilla esté desmarcada"
                   >
                     <input
                       type="checkbox"
                       checked={!hiddenConnectionTypes.has(type)}
                       onChange={() => toggleConnectionType(type)}
                     />
                     <span className="filters__name">{CONNECTION_TYPE_LABELS[type]}</span>
                     <span className="filters__count" aria-hidden="true">
                       {formatCount(connectionCountsByType[type])}
                     </span>
                     <span className="visually-hidden">
                       ,{" "}
                       {connectionCountsByType[type] === 1
                         ? "1 conexión"
                         : `${formatCount(connectionCountsByType[type])} conexiones`}
                     </span>
                   </label>
                 </li>
               ))}
             </ul>
           </div>
         </div>

         <div className="filters__section" role="group" aria-labelledby={`${headingId}-weight`}>
           <div className="filters__section-header">
             <h3 className="filters__heading" id={`${headingId}-weight`}>
               <SectionToggle
                 open={openSections.weight}
                 controls={`${headingId}-weight-body`}
                 onToggle={() => toggleSection("weight")}
               >
                 Peso mínimo
               </SectionToggle>
             </h3>
             <span className="filters__weight-value">{formatMinWeight(minWeight)}</span>
           </div>
           <div id={`${headingId}-weight-body`} hidden={!openSections.weight}>
             <input
               type="range"
               className="filters__slider"
               min={0}
               max={1}
               step={0.001}
               value={weightToSliderPosition(minWeight)}
               onChange={(event) => setMinWeight(sliderPositionToWeight(Number(event.target.value)))}
               aria-label="Peso mínimo de conectividad"
               aria-valuetext={formatMinWeight(minWeight)}
             />
             <p className="filters__visible">
               {connectionsPassingText(connectionTotals.visible, connectionTotals.loaded)}
             </p>
           </div>
         </div>

         <details className="filters__help">
           <summary>
             <Icon name="help" size={15} />
             ¿Cómo funcionan los filtros?
           </summary>
           <p>◎ resalta solo esa red · + la añade a lo ya resaltado.</p>
           <p>
             El número junto a cada tipo de conectividad cuenta sus conexiones que pasan los filtros de redes y de
             peso mínimo, aunque su casilla esté desmarcada: así se ve cuántas añadiría al marcarla.
           </p>
           <p>
             Las vistas pueden dibujar menos conexiones de las que pasan los filtros: con dos o más regiones
             seleccionadas, solo las que hay entre ellas, y si pasan de {formatCount(MAX_RENDERED_CONNECTIONS)}, ninguna.
           </p>
           <p>
             Peso mínimo: escala logarítmica. El peso real de conectividad se concentra en varios órdenes de magnitud
             por debajo de 0.01, así que cada tramo del deslizador multiplica el peso en vez de sumarle una cantidad
             fija. En el extremo izquierdo (0) no se filtra nada.
           </p>
         </details>
       </aside>
     );
   }
   ```

   Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/components/FilterPanel.test.tsx`
   Expected: PASS (6 pruebas).

- [ ] **Step 7: `frontend/src/App.tsx`**

1. **Imports.**
   - `import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";` pasa a `import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";`.
   - Tras `import { DataStatus, TopBar, type TopBarTab } from "./components/TopBar";` añade `import { Icon } from "./components/Icon";`.
   - Tras `import { dismissToast, showToast, type ToastContent, type ToastEntry } from "./logic/toastQueue";` añade:

     ```ts
     import { countConnections, type ConnectionCounts } from "./logic/filterCounts";
     import { useFiltersStore } from "./state/filters";
     ```

2. **Constante.** Tras `const NETWORK_TOAST = "redes";` añade:

   ```ts
   const NO_CONNECTION_COUNTS: ConnectionCounts = {
     byType: { structural: 0, functional: 0, effective: 0 },
     visible: 0,
     loaded: 0,
   };
   ```

3. **Recuentos.** Justo después de `  const networkSourcePending = source.kind === "real" && source.networkSource !== networkSource;` añade lo siguiente. Van antes de cualquier `return`, como todos los hooks.

   ```tsx

     // Recuentos del panel de filtros (D4 de docs/decisiones-diseno.md; spec
     // 5.3): por tipo de conectividad con los demás filtros, y cuántas
     // conexiones pasan todos. Se calculan aquí porque el panel solo recibe
     // los nodos.
     const hiddenNetworks = useFiltersStore((state) => state.hiddenNetworks);
     const hiddenConnectionTypes = useFiltersStore((state) => state.hiddenConnectionTypes);
     const minWeight = useFiltersStore((state) => state.minWeight);
     const connectionCounts = useMemo(
       () =>
         source.kind === "loading"
           ? NO_CONNECTION_COUNTS
           : countConnections(source.nodes, source.connections, { hiddenNetworks, hiddenConnectionTypes, minWeight }),
       [source, hiddenNetworks, hiddenConnectionTypes, minWeight],
     );
   ```

4. **Foco al plegar y desplegar.** El botón que se pulsa desaparece, y el foco caería en la página. Justo después del bloque anterior añade:

   ```tsx

     // Plegar y desplegar Filtros (D4 de docs/decisiones-diseno.md): el foco
     // pasa al botón que sustituye al que se ha pulsado.
     const filtersRef = useRef<HTMLDivElement>(null);
     const focusFiltersToggle = useRef(false);
     useEffect(() => {
       if (!focusFiltersToggle.current) return;
       focusFiltersToggle.current = false;
       filtersRef.current
         ?.querySelector<HTMLButtonElement>(filtersCollapsed ? ".ws-filters__expand" : ".filters__collapse")
         ?.focus();
     }, [filtersCollapsed]);
     const toggleFilters = (collapsed: boolean) => {
       focusFiltersToggle.current = true;
       setFiltersCollapsed(collapsed);
     };
   ```

5. **Panel de filtros.** `<div className="ws-filters">` pasa a `<div className="ws-filters" ref={filtersRef}>`, y el bloque `{filtersCollapsed ? ( … ) : ( … )}` que lleva dentro pasa a:

   ```tsx
             {filtersCollapsed ? (
               <button
                 type="button"
                 className="ws-filters__expand"
                 title="Desplegar el panel de filtros"
                 aria-label="Desplegar el panel de filtros"
                 onClick={() => toggleFilters(false)}
               >
                 <Icon name="chevronsRight" />
                 <span>Filtros</span>
               </button>
             ) : (
               <FilterPanel
                 nodes={source.nodes}
                 onCollapse={() => toggleFilters(true)}
                 connectionCountsByType={connectionCounts.byType}
                 connectionTotals={{ visible: connectionCounts.visible, loaded: connectionCounts.loaded }}
               />
             )}
   ```

- [ ] **Step 8: estilos en `frontend/src/App.css`**

Las vistas de tractografía reutilizan varias clases del panel antiguo (`.filter-panel`, `.filter-row--network`, `.filter-panel__bulk-btn`, `.filter-panel__selection-status`, `.filter-panel__weight-help`, `.legend-swatch`): esas reglas se quedan. Solo se borran las que únicamente usaba `FilterPanel`.

1. Borra la línea `.filter-panel__bulk-actions { display: flex; gap: 8px; margin: 0.4rem 0 0.6rem; }`. Las dos de `.filter-panel__bulk-btn` que la siguen se quedan.

2. Borra estas tres líneas, que van tras `.filter-row--network label { … }`:

   ```css
   .filter-panel__select-network-btn { font-size: 0.68rem; padding: 1px 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--panel-bg); color: var(--text-muted); cursor: pointer; white-space: nowrap; flex: 0 0 auto; }
   .filter-panel__select-network-btn:hover { border-color: var(--text-muted); background: var(--code-bg); color: var(--text); }
   .filter-row__actions { display: flex; gap: 4px; flex: 0 0 auto; }
   ```

3. Sustituye el bloque que empieza por `/* Panel de filtros compacto. */`, desde esa línea hasta `.filter-panel input[type="range"] { width: 100%; }`, las dos incluidas, por:

   ```css
   /* Panel de filtros compacto (decisión 74). Estas reglas quedan para el
      botón de icono de Ajustes y para los paneles de las vistas de
      tractografía, que reutilizan sus clases. El panel de filtros de la
      vista Atlas usa las de la D4, al final de este archivo. */
   .icon-btn { font-size: 0.85rem; line-height: 1; padding: 3px 7px; border: 1px solid var(--border); border-radius: 4px; background: var(--panel-bg); color: var(--text-muted); cursor: pointer; }
   .icon-btn:hover { border-color: var(--text-muted); color: var(--text-h); background: var(--code-bg); }
   .filter-panel .filter-panel__selection-status { margin: 0.4rem 0 0; }
   .filter-row--network { flex-wrap: nowrap; padding: 1px 0; }
   .filter-row--network label { overflow: hidden; }
   .filter-row--network .legend-swatch { flex: 0 0 auto; }
   .filter-row--network input { flex: 0 0 auto; margin: 0; }
   ```

4. Sustituye las dos reglas de `.ws-filters__expand` (la base y `:hover`) por:

   ```css
   .ws-filters__expand { flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px 0; border: 1px solid var(--border); border-radius: 12px; background: var(--panel-bg); color: var(--text-muted); font: inherit; font-size: 0.72rem; cursor: pointer; }
   .ws-filters__expand > span { writing-mode: vertical-rl; }
   .ws-filters__expand:hover { border-color: var(--border-strong); background: var(--hover); color: var(--text-h); }
   ```

5. Añade al final del archivo:

   ```css

   /* Panel de filtros de la vista Atlas (spec 5.3). position: relative: el
      texto para lectores de pantalla (.visually-hidden) se coloca respecto
      a este panel, que se desplaza por dentro, y no alarga la página. */
   .ws-filters .filter-panel { position: relative; border-radius: 12px; padding: 14px; }
   .filters__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
   .filters__header h2 { margin: 0; font-size: 0.78rem; font-weight: 600; color: var(--text-h); }
   .filters__collapse { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: none; border-radius: 7px; background: transparent; color: var(--text-muted); cursor: pointer; }
   .filters__collapse:hover { background: var(--hover); color: var(--text-h); }
   .filters__selection { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 16px; padding: 8px 10px; border-radius: 9px; background: var(--code-bg); font-size: 0.72rem; color: var(--text); }
   .filters__text-btn { padding: 0; border: none; background: none; color: var(--text-muted); font: inherit; font-size: 0.7rem; cursor: pointer; }
   .filters__text-btn:hover:not(:disabled) { color: var(--text-h); }
   .filters__text-btn:disabled { opacity: 0.5; cursor: default; }
   .filters__text-btn--strong { font-weight: 600; color: var(--text-h); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--text-faint); }
   .filters__section + .filters__section { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
   .filters__section-header { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 4px 10px; margin-bottom: 6px; }
   .filters__heading { margin: 0 0 6px; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
   .filters__section-header .filters__heading { margin: 0; }
   .filters__heading-count { margin-left: 6px; font-weight: 400; letter-spacing: 0; }
   /* Título plegable de cada sección (decisión 74): el chevron apunta
      abajo con la sección abierta y a la derecha con ella plegada. */
   .filters__disclosure { display: inline-flex; align-items: center; gap: 6px; padding: 0; border: none; background: none; color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; }
   .filters__disclosure:hover { color: var(--text-h); }
   .filters__chevron { transition: transform 0.15s ease; }
   .filters__disclosure[aria-expanded="false"] .filters__chevron { transform: rotate(-90deg); }
   .filters [hidden] { display: none; }
   .filters__bulk { display: flex; gap: 10px; }
   .filters__networks, .filters__types { display: flex; flex-direction: column; gap: 1px; margin: 0; padding: 0; list-style: none; }
   .filters__networks { margin: 0 -6px; }
   .filters__network { position: relative; display: flex; align-items: center; gap: 6px; min-height: 28px; padding: 0 6px; border-radius: 7px; }
   /* La fila se marca con el ratón encima o con el foco del teclado dentro
      (:focus-visible, no :focus-within: un clic en la casilla no debe dejar
      la fila como si tuviera el ratón encima). Reglas separadas: sin :has(),
      solo se pierde la del teclado. */
   .filters__network:hover { background: var(--code-bg); }
   .filters__network:has(:focus-visible) { background: var(--code-bg); }
   .filters__network label, .filters__type { display: flex; align-items: center; gap: 9px; flex: 1 1 auto; min-width: 0; font-size: 0.72rem; color: var(--text); cursor: pointer; }
   .filters__type { min-height: 26px; }
   .filters input[type="checkbox"] { flex-shrink: 0; width: 14px; height: 14px; margin: 0; }
   /* Anillo neutro alrededor del color (principio 6): así se ven también los
      colores extremos, como el negro de la saliencia de Gordon 333. */
   .filters__swatch { flex-shrink: 0; width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 0 1px var(--text-faint); }
   .filters__name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
   .filters__count { flex-shrink: 0; font-family: var(--mono); font-size: 0.7rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
   /* ◎ y + se ven al pasar el ratón por la fila o al llegar a ella con el
      teclado, en el sitio del número de regiones. El resto del tiempo
      quedan fuera de la vista, pero no con display: none: siguen en el
      orden del tabulador, así que Mayús+Tab llega a ellos desde la fila
      siguiente, y los lectores de pantalla los encuentran. */
   .filters__actions { display: flex; flex-shrink: 0; gap: 2px; }
   .filters__network:not(:hover):not(:has(:focus-visible)) .filters__actions { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
   .filters__network:hover .filters__count { display: none; }
   .filters__network:has(:focus-visible) .filters__count { display: none; }
   .filters__icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; padding: 0; border: none; border-radius: 6px; background: var(--hover); color: var(--text); cursor: pointer; }
   .filters__icon-btn:hover { background: var(--border); color: var(--text-h); }
   /* El valor del peso va en una sola línea: junto al título si cabe y, si
      no, en la suya. Con la letra de ancho fijo, «0 (sin filtro, se
      muestra todo)» mide 252 px y no cabe en los 220 del panel; con la
      normal, 172. */
   .filters__weight-value { font-size: 0.7rem; font-weight: 500; color: var(--text-h); white-space: nowrap; }
   .filters__slider { display: block; width: 100%; margin: 10px 0 6px; }
   .filters__visible { margin: 0; font-size: 0.7rem; color: var(--text-muted); }
   .filters__help { margin-top: 16px; font-size: 0.7rem; color: var(--text-muted); }
   .filters__help > summary { display: flex; align-items: center; gap: 6px; list-style: none; cursor: pointer; }
   .filters__help > summary::-webkit-details-marker { display: none; }
   .filters__help > summary:hover { color: var(--text-h); }
   .filters__help p { margin: 8px 0 0; line-height: 1.45; }
   @media (prefers-reduced-motion: reduce) {
     .filters__chevron { transition: none; }
   }
   /* El mismo anillo en las muestras de las vistas de tractografía, que
      siguen con .legend-swatch: en Claro, los amarillos casi no se veían
      sobre el blanco (D3, «Limitaciones conocidas»). */
   .legend-swatch { box-shadow: 0 0 0 1px var(--text-faint); }
   ```

6. Comprueba que las clases borradas no se usan en ningún componente:

   ```bash
   grep -rn "filter-section\|filter-panel__hint\|filter-panel__select-network-btn\|filter-row__actions\|filter-row__name\|filter-panel__bulk-actions\|filter-panel__header" /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/src
   ```

   Expected: sin resultados.

- [ ] **Step 9: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/App.css src/components/FilterPanel.tsx
```

Expected:
- BASE + 56 pruebas en verde (171 con una BASE de 115).
- `tsc`, lint y compilación como antes.
- El `grep` solo muestra la línea de `.species-panel__figure img`.
- Si lint marca un aviso nuevo `preserve-manual-memoization` en el `useMemo` de App, comprueba primero que sus dependencias son exactamente `[source, hiddenNetworks, hiddenConnectionTypes, minWeight]` y que dentro solo se usan esas. Si sigue, quita el `useMemo` y calcula `countConnections(…)` directamente en el render: es una pasada por las conexiones, y el aviso no puede quedarse (Convenciones).

- [ ] **Step 10: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/logic/filterCounts.ts frontend/src/logic/filterCounts.test.ts frontend/src/logic/displayText.ts frontend/src/logic/displayText.test.ts frontend/src/components/FilterPanel.tsx frontend/src/components/FilterPanel.test.tsx frontend/src/App.tsx frontend/src/App.css
git commit -m "Estructura: filtros con recuentos por red y por tipo de conectividad

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 5: vistas y recuadros de lectura

### Task 5: cabeceras de las vistas, herramientas, lupa y miniaturas

**Files:**
- Modify: `frontend/src/App.tsx` (`WORKSPACE_VIEW_DESCRIPTIONS` y `WorkspaceView`)
- Modify: `frontend/src/components/Connectogram.tsx` (import, un comentario y el control de la lupa)
- Test: `frontend/src/components/Connectogram.test.tsx`
- Modify: `frontend/src/App.css` (rejilla, vistas, botones de herramienta, desplegables y regla de la lupa)

`Brain3D.tsx` no se toca: su botón de exportar lleva `aria-disabled={exporting}` desde la revisión final de la fase 1 (commit `2ca8f7d`), y los estilos nuevos de `.export-btn` conservan la regla `[aria-disabled="true"]` junto a `:disabled`.

- [ ] **Step 1: escribir la prueba que falla**

`frontend/src/components/Connectogram.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Connectogram } from "./Connectogram";

describe("Connectogram", () => {
  it("la lupa es un botón de alternar con aria-pressed, no una casilla (spec 5.4)", () => {
    const html = renderToStaticMarkup(<Connectogram nodes={[]} connections={[]} />);
    expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*>(?:(?!<\/button>).)*Lupa<\/button>/s);
    expect(html).not.toContain('type="checkbox"');
  });
});
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/components/Connectogram.test.tsx`
Expected: FAIL, porque la lupa todavía es una casilla.

- [ ] **Step 2: la lupa, en `frontend/src/components/Connectogram.tsx`**

1. Tras `import { useAppearanceStore } from "../state/appearance";` añade `import { Icon } from "./Icon";`.
2. En el comentario de la lupa, la línea `  // la casilla "Lupa" activada, un círculo sigue al ratón y dibuja` pasa a `  // el botón «Lupa» activado, un círculo sigue al ratón y dibuja`.
3. Sustituye el `<label className="connectogram-lens-toggle" …>` entero, desde esa línea hasta su `</label>`, por:

   ```tsx
           {/* Botón de alternar (D4 de docs/decisiones-diseno.md; spec 5.4):
               antes era una casilla. Mismo estado. */}
           <button
             type="button"
             className="export-btn"
             aria-pressed={lensEnabled}
             title="Amplía la zona bajo el ratón (útil en zonas con muchos nodos)"
             onClick={() => {
               setLensEnabled((enabled) => !enabled);
               setHoveredNodeId(null);
             }}
           >
             <Icon name="search" size={15} />
             Lupa
           </button>
   ```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/components/Connectogram.test.tsx`
Expected: PASS.

- [ ] **Step 3: cabeceras y miniaturas en `frontend/src/App.tsx`**

`useEffect` ya estaba importado y `useRef` lo importa la Task 3.

1. Tras el objeto `WORKSPACE_VIEW_TITLES`, es decir, tras las líneas `  brain3d: "Cerebro 3D",` y `};`, añade:

   ```tsx

   // Una línea bajo el título de la vista grande que explica cómo leerla (D4
   // de docs/decisiones-diseno.md; spec 5.4). Es un texto fijo: vale con
   // cualquier atlas y cualquier selección. El grosor de las líneas del
   // connectograma es max(1, peso × 6) px, y en HCP-MMP1.0 ningún peso pasa
   // de 0,144: la frase no promete diferencias que no se ven.
   const WORKSPACE_VIEW_DESCRIPTIONS: Record<WorkspaceViewId, string> = {
     connectogram:
       "Cada punto del círculo es una región, con el color de su red, y cada línea, una conexión. El grosor solo cambia con pesos mayores que 0,17: por debajo, todas las líneas miden lo mismo.",
     hemispheres:
       "Vista desde arriba: la parte anterior arriba y el hemisferio izquierdo a la izquierda. Verde: conexiones dentro de un hemisferio; rosa: entre los dos.",
     brain3d:
       "Cada región en su posición real y con el color de su red. Con una selección, muestra lo seleccionado y sus conexiones: una región con sus vecinas, varias con las conexiones entre ellas, o una conexión. Arrastra para girar y usa la rueda para acercarte.",
   };
   ```

2. Sustituye desde el comentario `// Marco de cada vista del espacio de trabajo (decisión 74). En miniatura,` hasta el final del archivo por:

   ```tsx
   // Marco de cada vista del espacio de trabajo (decisión 74, D1). En
   // miniatura, una capa transparente encima recoge el clic para ampliarla:
   // así un clic en la miniatura nunca selecciona por accidente una región
   // que apenas se ve, y seleccionar se hace en la vista grande.
   //
   // D4 (spec 5.4): la vista grande lleva una línea que explica cómo leerla.
   // Las miniaturas llevan un botón visible «Ampliar», que es también el
   // camino con el teclado: la capa sale del orden del tabulador. Al
   // ampliar con el botón, el foco pasa al título de la vista ampliada, que
   // es el mismo componente (las tres vistas nunca se desmontan). Las
   // herramientas de cada vista siguen dentro de ella; App.css las coloca a
   // la derecha de la cabecera cuando caben.
   function WorkspaceView({
     id,
     area,
     isMain,
     onEnlarge,
     children,
   }: {
     id: WorkspaceViewId;
     area: string;
     isMain: boolean;
     onEnlarge: (id: WorkspaceViewId) => void;
     children: ReactNode;
   }) {
     const title = WORKSPACE_VIEW_TITLES[id];
     const headingRef = useRef<HTMLHeadingElement>(null);
     const focusHeadingWhenMain = useRef(false);

     useEffect(() => {
       if (isMain && focusHeadingWhenMain.current) {
         focusHeadingWhenMain.current = false;
         headingRef.current?.focus();
       }
     }, [isMain]);

     const enlarge = () => {
       focusHeadingWhenMain.current = true;
       onEnlarge(id);
     };

     return (
       <section
         className={`ws-view ${isMain ? "ws-view--main" : "ws-view--thumb"}`}
         data-view={id}
         style={{ gridArea: area }}
         aria-label={title}
       >
         <div className="ws-view__header">
           <div className="ws-view__heading">
             <h2 ref={headingRef} tabIndex={-1}>
               {title}
             </h2>
             {isMain && <p className="ws-view__description">{WORKSPACE_VIEW_DESCRIPTIONS[id]}</p>}
           </div>
           {!isMain && (
             <button
               type="button"
               className="ws-view__enlarge"
               aria-label={`Ampliar ${title}`}
               title={`Ver ${title} en grande`}
               onClick={enlarge}
             >
               <Icon name="expand" size={14} />
               Ampliar
             </button>
           )}
         </div>
         <div className="ws-view__body">{children}</div>
         {!isMain && (
           <button
             type="button"
             className="ws-view__overlay"
             tabIndex={-1}
             aria-hidden="true"
             onClick={() => onEnlarge(id)}
           />
         )}
       </section>
     );
   }
   ```

- [ ] **Step 4: estilos en `frontend/src/App.css`**

1. **Botones de herramienta.** Sustituye las cuatro reglas `.export-btn`, `.export-btn:hover`, `.export-btn:disabled, .export-btn[aria-disabled="true"]` y `.export-btn:disabled:hover, .export-btn[aria-disabled="true"]:hover`, y el comentario «Botón "Ocultar no seleccionados"…» con la regla `.export-btn--active` que lo sigue, por lo de abajo. El comentario de una línea que las precede («display:flex column (30/08/2026)…») se queda. `[aria-disabled="true"]` sigue junto a `:disabled`: es el estado del botón de exportar del cerebro 3D mientras exporta.

   ```css
   /* Botón de herramienta de las vistas (D4; spec 5.4): 30 px de alto,
      esquinas de 8 px y fondo elevado, como en la maqueta. */
   .export-btn { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--code-bg); color: var(--text); font: inherit; font-size: 0.7rem; font-weight: 500; white-space: nowrap; cursor: pointer; }
   .export-btn:hover { border-color: var(--border-strong); background: var(--hover); color: var(--text-h); }
   .export-btn:disabled, .export-btn[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; }
   .export-btn:disabled:hover, .export-btn[aria-disabled="true"]:hover { border-color: var(--border); background: var(--code-bg); color: var(--text); }
   /* Estado activo: "Ocultar no seleccionados" de los hemisferios
      (02/09/2026, petición de la usuaria) y la lupa del connectograma
      (aria-pressed, D4). El borde usa --accent para que el estado se
      distinga con al menos 3:1 (WCAG 1.4.11), como la tarjeta del tema
      elegido en Ajustes. */
   .export-btn--active, .export-btn[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-bg); color: var(--text-h); font-weight: 600; }
   ```

2. **Desplegables.** Borra estas tres reglas: el estilo nuevo, común, va al final.

   ```css
   .brain3d-homology select { margin-left: 4px; padding: 2px 6px; background: var(--panel-bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; }
   .brain3d-surface-controls select { margin-left: 4px; padding: 2px 6px; background: var(--panel-bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; }
   .species-panel__selectors select { margin-left: 4px; padding: 2px 6px; background: var(--panel-bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; }
   ```

   `.ws-view .brain3d-homology select, .ws-view .brain3d-surface-controls select { font-size: 0.74rem; padding: 1px 4px; max-width: 16rem; }` pasa a `.ws-view .brain3d-homology select, .ws-view .brain3d-surface-controls select { font-size: 0.7rem; max-width: 16rem; }`.

3. **Restos.** Borra `.ws-view .export-btn { font-size: 0.72rem; padding: 2px 8px; }` y la regla `.connectogram-lens-toggle { … }`.

4. **Rejilla.** En `.workspace`, la línea `  gap: 10px;` pasa a `  gap: 12px;`.

5. **Marco de las vistas.** Sustituye desde `.ws-view { position: relative; …` hasta `.ws-view__overlay:focus-visible { … }`, las dos incluidas, por:

   ```css
   .ws-view { position: relative; container-type: inline-size; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--panel-bg); border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px 12px; box-sizing: border-box; overflow: hidden; }
   .ws-view__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex: 0 0 auto; margin-bottom: 6px; }
   .ws-view__heading { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
   .ws-view__header h2 { margin: 0; font-size: 0.89rem; font-weight: 600; color: var(--text-h); }
   .ws-view__description { margin: 0; font-size: 0.7rem; line-height: 1.4; color: var(--text-muted); }
   .ws-view--thumb .ws-view__header { align-items: center; margin-bottom: 2px; }
   .ws-view--thumb .ws-view__header h2 { font-size: 0.72rem; }
   .ws-view__enlarge { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 8px; border: none; border-radius: 7px; background: transparent; color: var(--text-muted); font: inherit; font-size: 0.7rem; cursor: pointer; }
   .ws-view--thumb:hover { border-color: var(--accent-border); }
   .ws-view--thumb:hover .ws-view__enlarge, .ws-view__enlarge:focus-visible { background: var(--hover); color: var(--text-h); }
   .ws-view__body { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; }
   /* Capa que amplía la miniatura con un clic en cualquier punto (decisión
      74). Fuera del orden del tabulador: con el teclado se usa «Ampliar». */
   .ws-view__overlay { position: absolute; inset: 0; background: transparent; border: none; cursor: zoom-in; border-radius: 12px; }
   ```

6. Añade al final del archivo:

   ```css

   /* Herramientas de cada vista (spec 5.4): lupa, exportar y «Ocultar no
      seleccionados» siguen dentro de su vista, con su estado. Si el
      contenido de la vista grande mide al menos 40rem, van a la derecha de
      la cabecera, que les deja su hueco (--ws-tools-width) y parte la
      descripción en dos o tres líneas. Con los filtros desplegados, eso
      pasa desde unos 1340 px de ventana: a 1400 px el contenido mide
      776 px. Si es más estrecha, como a 1280 px (656 px), se quedan en una
      fila bajo la cabecera, porque taparían la descripción. Del cerebro 3D
      solo sube el botón de exportar: sus desplegables, que son más, quedan
      en una fila bajo la cabecera.
      Cada hueco es el ancho de las herramientas a 0,7rem más 12 px de
      separación, redondeado hacia arriba: lupa y exportar, 184 px, algo
      más con la lupa activa (en negrita); «Ocultar no seleccionados» y
      exportar, 286 px; exportar, 107 px (con la raíz de 18 px). */
   .ws-view[data-view="connectogram"] { --ws-tools-width: 11.5rem; }
   .ws-view[data-view="hemispheres"] { --ws-tools-width: 17rem; }
   .ws-view[data-view="brain3d"] { --ws-tools-width: 7rem; }
   @container (min-width: 40rem) {
     .ws-view--main .ws-view__header { padding-right: var(--ws-tools-width); }
     /* El cerebro 3D sin nada seleccionado no tiene botón de exportar: no
        se reserva su hueco. Sin :has(), la regla no se aplica y el hueco
        se queda, que no tapa nada. */
     .ws-view--main[data-view="brain3d"]:not(:has(.brain3d-toolbar > .export-btn)) .ws-view__header { padding-right: 0; }
     .ws-view--main .viz-panel__toolbar,
     .ws-view--main .brain3d-toolbar > .export-btn { position: absolute; top: 10px; right: 12px; margin: 0; }
   }

   /* Desplegables nativos con estilo propio (spec 5.4): sin la flecha del
      sistema y con un chevron hecho con dos degradados del color del texto
      secundario, así que sigue al tema. Los del cerebro 3D y, por herencia
      de controles (sección 2), los de Comparar especies. */
   .brain3d-homology select,
   .brain3d-surface-controls select,
   .species-panel__selectors select { appearance: none; height: 30px; margin-left: 4px; padding: 0 28px 0 10px; border: 1px solid var(--border); border-radius: 8px; background-color: var(--code-bg); background-image: linear-gradient(45deg, transparent 50%, var(--text-muted) 50%), linear-gradient(135deg, var(--text-muted) 50%, transparent 50%); background-position: calc(100% - 15px) 50%, calc(100% - 10px) 50%; background-size: 5px 5px; background-repeat: no-repeat; color: var(--text-h); font: inherit; font-weight: 500; cursor: pointer; }
   .brain3d-homology select:hover,
   .brain3d-surface-controls select:hover,
   .species-panel__selectors select:hover { border-color: var(--border-strong); }
   /* Desactivados, atenuados como los botones desactivados. */
   .brain3d-homology select:disabled,
   .brain3d-surface-controls select:disabled,
   .species-panel__selectors select:disabled { opacity: 0.5; cursor: not-allowed; }
   .brain3d-homology select:disabled:hover,
   .brain3d-surface-controls select:disabled:hover,
   .species-panel__selectors select:disabled:hover { border-color: var(--border); }
   ```

7. Comprueba los restos:

   ```bash
   grep -rn "connectogram-lens-toggle\|ws-view__enlarge-hint" /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/src
   ```

   Expected: sin resultados.

- [ ] **Step 5: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/App.css
```

Expected: BASE + 57 pruebas en verde (172 con una BASE de 115). El `grep`, como en la Task 4. Lo demás, como antes.

- [ ] **Step 6: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/App.tsx frontend/src/components/Connectogram.tsx frontend/src/components/Connectogram.test.tsx frontend/src/App.css
git commit -m "Estructura: cabeceras de las vistas, herramientas, lupa y miniaturas

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 6: región, hemisferio y red en los recuadros de lectura

**Files:**
- Modify: `frontend/src/logic/displayText.ts` y `frontend/src/logic/displayText.test.ts` (`hemisphereLabel`, `regionTitleParts` y `regionPassingText`)
- Create: `frontend/src/components/NetworkTag.tsx`
- Modify: `frontend/src/components/Connectogram.tsx` y `frontend/src/components/Hemisferios.tsx` (recuadro de lectura)
- Modify: `frontend/src/App.css` (etiqueta de red y recuadro de lectura con una región)

Con una región seleccionada, el recuadro del connectograma añade a la derecha cuántas de sus conexiones pasan los filtros, con el umbral, y la pista «pasa el ratón por otra región para verla» (spec 5.4, como en la maqueta).

- [ ] **Step 1: escribir las pruebas que fallan**

En `frontend/src/logic/displayText.test.ts`, el import pasa a:

```ts
import {
  connectionsPassingText,
  formatCount,
  hemisphereLabel,
  networkShortLabel,
  regionPassingText,
  regionTitleParts,
  selectionStatusText,
} from "./displayText";
```

Añade al final:

```ts
describe("regionPassingText", () => {
  it("cuenta las conexiones de la región que pasan los filtros, con el umbral como en Filtros", () => {
    expect(regionPassingText(5, 0.02)).toBe("5 conexiones pasan los filtros (peso ≥ 0.02)");
    expect(regionPassingText(1, 0.0039810717)).toBe("1 conexión pasa los filtros (peso ≥ 4.0e-3)");
    expect(regionPassingText(359, 0)).toBe("359 conexiones pasan los filtros");
  });
});

describe("hemisphereLabel", () => {
  it("nombra el hemisferio, o dice que no hay", () => {
    expect(hemisphereLabel("L")).toBe("Hemisferio izquierdo");
    expect(hemisphereLabel("R")).toBe("Hemisferio derecho");
    expect(hemisphereLabel(null)).toBe("Sin hemisferio asignado");
  });
});

describe("regionTitleParts", () => {
  it("abreviatura y nombre, sin el «(hemisferio …)» final de HCP-MMP1.0", () => {
    expect(regionTitleParts({ abbreviation: "IFJa", label: "Area IFJa (hemisferio derecho)", hemisphere: "R" })).toEqual({
      main: "IFJa",
      secondary: "Area IFJa",
    });
  });

  it("sin nombre aparte si solo repite la abreviatura (ingestas antiguas de HCP-MMP1.0)", () => {
    expect(regionTitleParts({ abbreviation: "V1", label: "V1 (hemisferio izquierdo)", hemisphere: "L" })).toEqual({
      main: "V1",
      secondary: null,
    });
  });

  it("sin abreviatura, el nombre es lo principal", () => {
    expect(regionTitleParts({ abbreviation: null, label: "Tálamo izquierdo", hemisphere: "L" })).toEqual({
      main: "Tálamo izquierdo",
      secondary: null,
    });
  });

  it("un nombre que no acaba en «(hemisferio …)» no se toca", () => {
    expect(regionTitleParts({ abbreviation: "A8m_L", label: "medial area 8 (izquierda)", hemisphere: "L" })).toEqual({
      main: "A8m_L",
      secondary: "medial area 8 (izquierda)",
    });
  });

  it("el sufijo solo se quita si coincide con el hemisferio de la región", () => {
    expect(regionTitleParts({ abbreviation: "IFJa", label: "Area IFJa (hemisferio derecho)", hemisphere: null })).toEqual({
      main: "IFJa",
      secondary: "Area IFJa (hemisferio derecho)",
    });
    expect(regionTitleParts({ abbreviation: "IFJa", label: "Area IFJa (hemisferio derecho)", hemisphere: "L" })).toEqual({
      main: "IFJa",
      secondary: "Area IFJa (hemisferio derecho)",
    });
  });
});
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/displayText.test.ts`
Expected: FAIL, porque no existen `regionPassingText`, `hemisphereLabel` ni `regionTitleParts`.

- [ ] **Step 2: implementar, en `frontend/src/logic/displayText.ts`**

Tras el import de `NETWORK_LABELS` añade `import type { GraphNode } from "../types/domain";` y `import { formatMinWeight } from "./weightScale";`. Añade al final:

```ts
export function hemisphereLabel(hemisphere: GraphNode["hemisphere"]): string {
  if (hemisphere === "L") return "Hemisferio izquierdo";
  if (hemisphere === "R") return "Hemisferio derecho";
  return "Sin hemisferio asignado";
}

// La ingesta de HCP-MMP1.0 guarda el nombre con el hemisferio al final:
// «Area IFJa (hemisferio derecho)» (backend/ingestion/neuroimaging/hcp_mmp1.py).
// Donde el hemisferio se muestra aparte, no se repite en el nombre.
const HEMISPHERE_SUFFIX = /\s*\(hemisferio (izquierdo|derecho)\)\s*$/;

// Lo principal de una región (la abreviatura, o el nombre si no la tiene) y
// el nombre que la acompaña, o null si no añade nada. Mismo criterio que
// abbreviationAddsInformation (logic/regionLabel.ts): un nombre que empieza
// por la abreviatura va solo. El sufijo del hemisferio solo se quita si
// coincide con el de la región: una región sin hemisferio (puede ser NULL,
// migración 0008) o con otro conserva el nombre entero.
export function regionTitleParts(node: Pick<GraphNode, "abbreviation" | "label" | "hemisphere">): {
  main: string;
  secondary: string | null;
} {
  const suffix = HEMISPHERE_SUFFIX.exec(node.label);
  const name =
    (suffix && node.hemisphere === (suffix[1] === "izquierdo" ? "L" : "R") ? node.label.slice(0, suffix.index) : "") ||
    node.label;
  if (!node.abbreviation || name.startsWith(node.abbreviation)) return { main: name, secondary: null };
  return { main: node.abbreviation, secondary: name };
}

// Recuadro de lectura con una región seleccionada (spec 5.4, como en la
// maqueta): cuántas de sus conexiones pasan los filtros, con el umbral de
// peso si lo hay, escrito como en Filtros (formatMinWeight, que nunca
// redondea hacia arriba).
export function regionPassingText(count: number, minWeight: number): string {
  const text = count === 1 ? "1 conexión pasa los filtros" : `${formatCount(count)} conexiones pasan los filtros`;
  return minWeight > 0 ? `${text} (peso ≥ ${formatMinWeight(minWeight)})` : text;
}
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/displayText.test.ts`
Expected: PASS (14 pruebas).

- [ ] **Step 3: crear `frontend/src/components/NetworkTag.tsx`**

```tsx
// Etiqueta de red con su color y resumen de una región (D4 de
// docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 5.4 y 5.5).
// Los usan los recuadros de lectura del connectograma y de los hemisferios
// y el panel de detalle.
import { hemisphereLabel, networkShortLabel, regionTitleParts } from "../logic/displayText";
import { NETWORK_LABELS } from "../theme/networks";
import { useDrawColors } from "../theme/useDrawColors";
import type { GraphNode } from "../types/domain";

// A la vista, el nombre corto de la red, porque la clasificación ya está en
// el botón «Redes» de la barra; para los lectores de pantalla y en la
// etiqueta emergente, el completo. El color sale de useDrawColors, como en
// las vistas: cuando llegue la paleta suave (fase 2), la seguirá. El punto
// lleva un anillo neutro (principio 6 del spec) en App.css.
export function NetworkTag({ network }: { network: string }) {
  const colors = useDrawColors();
  const label = Object.hasOwn(NETWORK_LABELS, network) ? NETWORK_LABELS[network] : network;
  return (
    <span className="network-tag" title={label}>
      <span className="network-tag__dot" style={{ backgroundColor: colors.networkColor(network) }} aria-hidden="true" />
      <span aria-hidden="true">{networkShortLabel(network)}</span>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

// Región, hemisferio y red: «IFJa — Area IFJa · hemisferio derecho» y la
// etiqueta de su red.
export function RegionSummary({ node }: { node: GraphNode }) {
  const { main, secondary } = regionTitleParts(node);
  return (
    <span className="region-summary">
      <strong>{main}</strong>
      {secondary && ` — ${secondary}`}
      {` · ${hemisphereLabel(node.hemisphere).toLowerCase()}`}
      <NetworkTag network={node.network} />
    </span>
  );
}
```

- [ ] **Step 4: los recuadros de lectura**

En `frontend/src/components/Connectogram.tsx`:

1. Tras `import { Icon } from "./Icon";` añade `import { RegionSummary } from "./NetworkTag";`, y tras `import { MAX_RENDERED_CONNECTIONS } from "../logic/renderSafety";` añade `import { regionPassingText } from "../logic/displayText";`.
2. Sustituye:

   ```tsx
     if (hoveredNode) {
       readout = (
         <span>
           <RegionReadoutText node={hoveredNode} />
         </span>
       );
     } else if (selectedConnection) {
   ```

   por:

   ```tsx
     if (hoveredNode) {
       // Región, hemisferio y red con su color (D4 de docs/decisiones-diseno.md; spec 5.4).
       readout = <RegionSummary node={hoveredNode} />;
     } else if (selectedConnection) {
   ```

3. Sustituye:

   ```tsx
     } else if (selectedNodesList.length === 1) {
       const node = selectedNodesList[0];
       readout = (
         <span>
           <RegionReadoutText node={node} />
         </span>
       );
     } else if (selectedNodesList.length > 1) {
   ```

   por lo de abajo. El recuento sale de `filteredConnections`, las conexiones que ya filtra el connectograma, y solo se calcula en esta rama: con el ratón encima de otra región, el recuadro muestra esa. Solo sale con exactamente una región seleccionada: `selectedNodesList` deja fuera las que ocultan los filtros, así que puede tener una sola aunque haya más seleccionadas.

   ```tsx
     } else if (selectedNodesList.length === 1) {
       const node = selectedNodesList[0];
       // Con una sola región seleccionada, cuántas de sus conexiones pasan
       // los filtros, con el umbral, y una pista (D4 de
       // docs/decisiones-diseno.md; spec 5.4, como en la maqueta).
       const single = selectedNodeIds.size === 1;
       const passing = single ? filteredConnections.filter((c) => c.source === node.id || c.target === node.id).length : 0;
       readout = (
         <span className="readout-selection">
           <RegionSummary node={node} />
           {single && <span className="readout-selection__count">{regionPassingText(passing, filters.minWeight)}</span>}
           {single && <span className="readout-selection__hint">pasa el ratón por otra región para verla</span>}
         </span>
       );
     } else if (selectedNodesList.length > 1) {
   ```

En `frontend/src/components/Hemisferios.tsx`:

1. Tras `import { useAppearanceStore } from "../state/appearance";` añade `import { RegionSummary } from "./NetworkTag";`.
2. Sustituye:

   ```tsx
     if (hoveredNode) {
       readout = (
         <span>
           <RegionReadoutText node={hoveredNode} />
           {" · "}
           {hoveredNode.hemisphere === "L" ? "hemisferio izquierdo" : hoveredNode.hemisphere === "R" ? "hemisferio derecho" : "sin hemisferio asignado"}
         </span>
       );
     } else if (selectedConnection) {
   ```

   por:

   ```tsx
     if (hoveredNode) {
       // Región, hemisferio y red con su color (D4 de docs/decisiones-diseno.md; spec 5.4).
       readout = <RegionSummary node={hoveredNode} />;
     } else if (selectedConnection) {
   ```

3. En la rama `selectedNodesList.length === 1`, sustituye su contenido, desde `const node = selectedNodesList[0];` hasta el `);` que cierra `readout`, por `readout = <RegionSummary node={selectedNodesList[0]} />;`. El recuento y la pista van solo en el connectograma, como en la maqueta.

`RegionReadoutText` sigue haciendo falta en los dos archivos: la usan la conexión seleccionada y, en el connectograma, la lista de la selección múltiple. Los recuadros conservan su altura fija (decisión 74b): no toques sus reglas de `App.css`.

- [ ] **Step 5: estilos**

Añade al final de `frontend/src/App.css`:

```css

/* Recuadro de lectura del connectograma con una región seleccionada (spec
   5.4): la región a la izquierda, su recuento a la derecha y la pista
   debajo. El recuadro conserva su altura fija (decisión 74b): lo que no
   cabe se desplaza dentro. */
.readout-selection { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; column-gap: 12px; }
.readout-selection__count { font-size: 0.92em; color: var(--text); white-space: nowrap; }
.readout-selection__hint { flex-basis: 100%; font-size: 0.92em; color: var(--text-muted); }

/* Etiqueta de red y resumen de una región (spec 5.4 y 5.5). Fondo neutro:
   --accent-bg es morado en Original y parecería «seleccionado».
   position: relative, para el nombre completo oculto que lleva dentro. */
.network-tag { position: relative; display: inline-flex; align-items: center; gap: 6px; height: 1.7em; margin-left: 8px; padding: 0 8px; border: 1px solid var(--border); border-radius: 999px; background: var(--code-bg); color: var(--text-h); font-size: 0.92em; line-height: 1; white-space: nowrap; vertical-align: middle; }
.network-tag__dot { flex-shrink: 0; width: 7px; height: 7px; border-radius: 50%; box-shadow: 0 0 0 1px var(--text-faint); }
.region-summary strong { color: var(--text-h); }
```

- [ ] **Step 6: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/App.css src/components/NetworkTag.tsx
```

Expected: BASE + 64 pruebas en verde (179 con una BASE de 115). El `grep`, como en la Task 4. Lo demás, como antes.

- [ ] **Step 7: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/logic/displayText.ts frontend/src/logic/displayText.test.ts frontend/src/components/NetworkTag.tsx frontend/src/components/Connectogram.tsx frontend/src/components/Hemisferios.tsx frontend/src/App.css
git commit -m "Estructura: region, hemisferio y red en los recuadros de lectura

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 6: panel de detalle

### Task 7: panel de detalle de una región

**Files:**
- Create: `frontend/src/logic/regionConnections.ts`, `frontend/src/logic/clipboard.ts`
- Test: `frontend/src/logic/regionConnections.test.ts`, `frontend/src/logic/clipboard.test.ts`
- Modify: `frontend/src/components/DetailPanel.tsx` (imports, `ConnectionRow`, componentes nuevos `ScientificId` y `RegionDetail`, y la rama de una región)
- Test: `frontend/src/components/DetailPanel.test.tsx`
- Modify: `frontend/src/App.css` (panel de detalle)

- [ ] **Step 1: escribir las pruebas que fallan**

`frontend/src/logic/regionConnections.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { GraphConnection } from "../types/domain";
import { CONNECTIONS_PREVIEW_COUNT, regionConnectionsByWeight, visibleRegionConnections } from "./regionConnections";

function connection(id: string, source: string, target: string, weight: number): GraphConnection {
  return { id, source, target, type: "structural", weight, evidenceLevel: "direct" };
}

describe("regionConnectionsByWeight", () => {
  it("reúne las conexiones de la región, con el id de la otra y su sentido, de mayor a menor peso", () => {
    const result = regionConnectionsByWeight(
      [connection("1", "a", "b", 0.1), connection("2", "c", "a", 0.5), connection("3", "b", "c", 0.9), connection("4", "a", "d", 0.3)],
      "a",
    );
    expect(result.map((row) => [row.connection.id, row.otherId, row.outgoing])).toEqual([
      ["2", "c", false],
      ["4", "d", true],
      ["1", "b", true],
    ]);
  });

  it("a igual peso, ordena por id: el orden no cambia de un render a otro", () => {
    const result = regionConnectionsByWeight([connection("b", "a", "x", 0.2), connection("a", "a", "y", 0.2)], "a");
    expect(result.map((row) => row.connection.id)).toEqual(["a", "b"]);
  });
});

describe("visibleRegionConnections", () => {
  it("se ven las cinco primeras y, al desplegar, todas", () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7];
    expect(CONNECTIONS_PREVIEW_COUNT).toBe(5);
    expect(visibleRegionConnections(sorted, false)).toEqual([1, 2, 3, 4, 5]);
    expect(visibleRegionConnections(sorted, true)).toEqual(sorted);
    expect(visibleRegionConnections([1, 2], false)).toEqual([1, 2]);
  });
});
```

`frontend/src/logic/clipboard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { copyShortcutLabel, copyText } from "./clipboard";

describe("copyText", () => {
  it("copia y devuelve true", async () => {
    const written: string[] = [];
    const clipboard = {
      writeText: async (text: string) => {
        written.push(text);
      },
    };
    await expect(copyText("region.human.hcp-mmp1.r_ifja", clipboard)).resolves.toBe(true);
    expect(written).toEqual(["region.human.hcp-mmp1.r_ifja"]);
  });

  it("si el portapapeles falla, devuelve false sin lanzar", async () => {
    const clipboard = {
      writeText: async () => {
        throw new Error("permiso denegado");
      },
    };
    await expect(copyText("x", clipboard)).resolves.toBe(false);
  });

  it("sin portapapeles (contexto no seguro), devuelve false", async () => {
    await expect(copyText("x", undefined)).resolves.toBe(false);
  });
});

describe("copyShortcutLabel", () => {
  it("⌘C en macOS y Ctrl+C en los demás sistemas", () => {
    expect(copyShortcutLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15")).toBe("⌘C");
    expect(copyShortcutLabel("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")).toBe("Ctrl+C");
  });
});
```

`frontend/src/components/DetailPanel.test.tsx`. Prueba `RegionDetail` directamente: con `renderToStaticMarkup`, zustand devuelve el estado inicial del store, así que `DetailPanel` siempre saldría sin selección.

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GraphConnection, GraphNode } from "../types/domain";
import { RegionDetail } from "./DetailPanel";

function node(id: string, abbreviation: string): GraphNode {
  return {
    id,
    label: `Area ${abbreviation} (hemisferio derecho)`,
    abbreviation,
    hemisphere: "R",
    network: "cole-anticevic.visual",
    position3d: [0, 0, 0],
    referenceSpace: null,
  };
}

const REGION = node("r_ifja", "IFJa");
const OTHERS = ["a", "b", "c", "d", "e", "f"].map((id) => node(`r_${id}`, id.toUpperCase()));
// Seis conexiones; la más fuerte, efectiva y con la región como origen.
const CONNECTIONS: GraphConnection[] = OTHERS.map((other, i) => ({
  id: `c${i}`,
  source: REGION.id,
  target: other.id,
  type: i === 5 ? "effective" : "structural",
  weight: (i + 1) / 10,
  evidenceLevel: "direct",
}));

describe("RegionDetail", () => {
  const html = renderToStaticMarkup(
    <RegionDetail node={REGION} connections={CONNECTIONS} nodeById={new Map([REGION, ...OTHERS].map((n) => [n.id, n]))} />,
  );

  it("se ven las cinco primeras, y «Ver las N» dice si la lista está desplegada y cuál controla", () => {
    expect(html.match(/<li class="detail__connection">/g)).toHaveLength(5);
    const listId = /<ul class="detail__connections" id="([^"]+)"/.exec(html)?.[1];
    expect(listId).toBeDefined();
    expect(html).toContain(`aria-expanded="false" aria-controls="${listId}"`);
    expect(html).toContain("Ver las 6");
  });

  it("el botón de copiar tiene nombre, y lo que pasa al copiar se anuncia en una región role=status", () => {
    expect(html).toContain('aria-label="Copiar el identificador"');
    expect(html).toContain('<span class="visually-hidden" role="status"></span>');
  });

  it("una conexión efectiva dice su sentido", () => {
    expect(html).toContain('<span class="detail__connection-direction">hacia </span>');
  });
});
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/regionConnections.test.ts src/logic/clipboard.test.ts src/components/DetailPanel.test.tsx`
Expected: FAIL, porque no existen los módulos y `DetailPanel` no exporta `RegionDetail`.

- [ ] **Step 2: implementar `frontend/src/logic/regionConnections.ts`**

```ts
// Conexiones de una región para el panel de detalle (D4 de
// docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 5.5): de
// mayor a menor peso, y al principio solo las cinco primeras.
import type { GraphConnection } from "../types/domain";

export const CONNECTIONS_PREVIEW_COUNT = 5;

export interface RegionConnection {
  connection: GraphConnection;
  otherId: string;
  // La región es el origen de la conexión. Solo se muestra en las
  // efectivas, las que tienen sentido: «hacia» o «desde» la otra.
  outgoing: boolean;
}

export function regionConnectionsByWeight(connections: readonly GraphConnection[], regionId: string): RegionConnection[] {
  return (
    connections
      .filter((c) => c.source === regionId || c.target === regionId)
      .map((connection) => ({
        connection,
        otherId: connection.source === regionId ? connection.target : connection.source,
        outgoing: connection.source === regionId,
      }))
      // A igual peso, por id: el orden no cambia de un render a otro.
      .sort(
        (a, b) =>
          b.connection.weight - a.connection.weight ||
          (a.connection.id < b.connection.id ? -1 : a.connection.id > b.connection.id ? 1 : 0),
      )
  );
}

export function visibleRegionConnections<T>(
  sorted: readonly T[],
  showAll: boolean,
  limit = CONNECTIONS_PREVIEW_COUNT,
): readonly T[] {
  return showAll ? sorted : sorted.slice(0, limit);
}
```

- [ ] **Step 3: implementar `frontend/src/logic/clipboard.ts`**

```ts
// Copiar al portapapeles (D4 de docs/decisiones-diseno.md; spec 5.5). Nunca
// lanza: sin portapapeles (contexto no seguro, permiso denegado) devuelve
// false, y quien llama selecciona el texto para copiarlo a mano.
export interface ClipboardLike {
  writeText(text: string): Promise<void>;
}

export async function copyText(text: string, clipboard: ClipboardLike | undefined): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Atajo para copiar a mano lo seleccionado: ⌘C en macOS y Ctrl+C en los
// demás sistemas.
export function copyShortcutLabel(userAgent: string): string {
  return /Mac/i.test(userAgent) ? "⌘C" : "Ctrl+C";
}
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/regionConnections.test.ts src/logic/clipboard.test.ts`
Expected: PASS (7 pruebas).

- [ ] **Step 4: `frontend/src/components/DetailPanel.tsx`**

1. **Imports.** Sustituye el bloque de imports entero por este. `NETWORK_LABELS` sale: la red va ahora en `NetworkTag`.

   ```ts
   import { useEffect, useId, useMemo, useRef, useState } from "react";
   import { CONNECTION_TYPE_LABELS, EVIDENCE_LEVEL_LABELS } from "../theme/networks";
   import { exportResolverFor, ngFill, ngStroke } from "../theme/colors";
   import { useDrawColors } from "../theme/useDrawColors";
   import { useAppearanceStore } from "../state/appearance";
   import { useSelectionStore } from "../state/selection";
   import { fetchInducedTracts } from "../data/api";
   import { inducedConnections } from "../logic/induced";
   import { exportSvgAsJpeg } from "../logic/exportImage";
   import { abbreviationAddsInformation } from "../logic/regionLabel";
   import { copyShortcutLabel, copyText } from "../logic/clipboard";
   import { formatCount, hemisphereLabel, regionTitleParts } from "../logic/displayText";
   import { CONNECTIONS_PREVIEW_COUNT, regionConnectionsByWeight, visibleRegionConnections } from "../logic/regionConnections";
   import { weightToSliderPosition } from "../logic/weightScale";
   import type { GraphConnection, GraphNode, InducedTract } from "../types/domain";
   import { Icon } from "./Icon";
   import { NetworkTag } from "./NetworkTag";
   ```

2. **`ConnectionRow`.** Sustituye la función entera por:

   ```tsx
   // Una conexión de la región (D4 de docs/decisiones-diseno.md; spec 5.5).
   // Conserva la información de antes: la otra región, el tipo, el peso con
   // el mismo formato y el nivel de evidencia. Añade el color de la red de
   // la otra región, el sentido de las efectivas («hacia» o «desde» la otra
   // región) y una barra de peso en la escala logarítmica del filtro
   // (logic/weightScale.ts), porque los pesos abarcan varios órdenes de
   // magnitud. El color sale de useDrawColors, como en las vistas.
   function ConnectionRow({
     conn,
     otherLabel,
     otherNetwork,
     outgoing,
   }: {
     conn: GraphConnection;
     otherLabel: string;
     otherNetwork: string | null;
     outgoing: boolean;
   }) {
     const colors = useDrawColors();
     return (
       <li className="detail__connection">
         <span
           className="detail__connection-dot"
           style={{ backgroundColor: colors.networkColor(otherNetwork ?? "unclassified") }}
           aria-hidden="true"
         />
         <span className="detail__connection-name">
           {conn.type === "effective" && (
             <span className="detail__connection-direction">{outgoing ? "hacia " : "desde "}</span>
           )}
           {otherLabel}
         </span>
         <span className="detail__connection-weight">
           <span className="visually-hidden">peso </span>
           {conn.weight}
         </span>
         <span className="detail__connection-bar" aria-hidden="true">
           <span style={{ width: `${Math.round(weightToSliderPosition(conn.weight) * 100)}%` }} />
         </span>
         <span className="detail__connection-meta">
           {CONNECTION_TYPE_LABELS[conn.type]} · {EVIDENCE_LEVEL_LABELS[conn.evidenceLevel]}
         </span>
       </li>
     );
   }
   ```

3. **Componentes nuevos.** Justo después de la función `membershipDescription`, antes de `export function DetailPanel`, añade:

   ```tsx
   // ID científico al pie, en letra monoespaciada, con un botón para copiarlo
   // (D4; spec 5.5). Si el portapapeles no está disponible (permiso denegado,
   // contexto no seguro), se selecciona el texto para copiarlo a mano, y se
   // dice, a la vista y a los lectores de pantalla; si vuelve a fallar, se
   // vuelve a anunciar. El temporizador que devuelve el botón a «Copiar» se
   // cancela en el clic siguiente y si el panel se desmonta antes.
   function ScientificId({ id, label }: { id: string; label: string }) {
     const codeRef = useRef<HTMLElement>(null);
     const timerRef = useRef<number | undefined>(undefined);
     const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
     // Sube con cada intento: el mensaje se vuelve a pintar, y a anunciar,
     // aunque diga lo mismo que la vez anterior.
     const [attempt, setAttempt] = useState(0);

     useEffect(() => () => window.clearTimeout(timerRef.current), []);

     const handleCopy = async () => {
       window.clearTimeout(timerRef.current);
       setAttempt((count) => count + 1);
       if (await copyText(id, navigator.clipboard)) {
         setStatus("copied");
         timerRef.current = window.setTimeout(() => setStatus("idle"), 1500);
         return;
       }
       const code = codeRef.current;
       const selection = window.getSelection();
       if (code && selection) selection.selectAllChildren(code);
       setStatus("failed");
     };

     const message =
       status === "copied"
         ? "Identificador copiado"
         : status === "failed"
           ? `No se pudo copiar: el identificador queda seleccionado (${copyShortcutLabel(navigator.userAgent)})`
           : "";

     return (
       <div className="detail__id">
         <span className="detail__id-label">{label}</span>
         <code ref={codeRef} className="detail__id-value">
           {id}
         </code>
         <button
           type="button"
           className="detail__id-copy"
           aria-label="Copiar el identificador"
           title={status === "copied" ? "Copiado" : "Copiar"}
           onClick={handleCopy}
         >
           <Icon name={status === "copied" ? "check" : "copy"} size={14} />
         </button>
         {/* El fallo se ve, bajo el ID; «copiado» solo se anuncia, porque
             el botón ya lo muestra con ✓. */}
         <span className={status === "failed" ? "detail__id-status" : "visually-hidden"} role="status">
           {message && <span key={attempt}>{message}</span>}
         </span>
       </div>
     );
   }

   // Detalle de una región (D4 de docs/decisiones-diseno.md; spec 5.5), de
   // más a menos importante: la región, su red y su hemisferio, cómo se
   // asignó la red, sus conexiones (más fuertes primero; se ven las cinco
   // primeras) y, al pie, el ID científico. DetailPanel monta uno por región
   // (key), así que «Ver las N» vuelve a plegarse al cambiar de región sin
   // ningún efecto. Se exporta solo para su prueba de marcado
   // (DetailPanel.test.tsx): en node, la selección del store no se puede
   // fijar antes de pintar DetailPanel.
   export function RegionDetail({
     node,
     connections,
     nodeById,
   }: {
     node: GraphNode;
     connections: GraphConnection[];
     nodeById: Map<string, GraphNode>;
   }) {
     const [showAll, setShowAll] = useState(false);
     const listId = useId();
     const sorted = useMemo(() => regionConnectionsByWeight(connections, node.id), [connections, node.id]);
     const shown = visibleRegionConnections(sorted, showAll);
     const { main, secondary } = regionTitleParts(node);

     return (
       <aside className="detail-panel detail detail--with-id" aria-label="Región seleccionada">
         <p className="detail__eyebrow">Región seleccionada</p>
         <h2 className="detail__title">
           <span className="detail__main">{main}</span>
           {secondary && <span className="detail__secondary">{secondary}</span>}
         </h2>
         <div className="detail__tags">
           <NetworkTag network={node.network} />
           <span className="detail__tag">{hemisphereLabel(node.hemisphere)}</span>
         </div>
         {node.networkAlgorithm && (
           <p className="detail__note" title="Cómo se asignó la red">
             <Icon name="info" size={14} />
             <span>
               <span className="visually-hidden">Cómo se asignó la red: </span>
               {membershipDescription(node.networkAlgorithm, node.networkConfidence ?? null)}
             </span>
           </p>
         )}
         <div className="detail__section-header">
           <h3 className="detail__heading">
             Conexiones <span className="detail__count">{formatCount(sorted.length)}</span>
           </h3>
           {sorted.length > 1 && <span className="detail__hint">más fuertes primero · barra logarítmica</span>}
         </div>
         {sorted.length === 0 ? (
           <p className="detail-panel__empty-note">Esta región no tiene conexiones cargadas.</p>
         ) : (
           <ul className="detail__connections" id={listId}>
             {shown.map(({ connection, otherId, outgoing }) => {
               const other = nodeById.get(otherId);
               return (
                 <ConnectionRow
                   key={connection.id}
                   conn={connection}
                   otherLabel={regionDisplayText(other, otherId)}
                   otherNetwork={other?.network ?? null}
                   outgoing={outgoing}
                 />
               );
             })}
           </ul>
         )}
         {sorted.length > CONNECTIONS_PREVIEW_COUNT && (
           <button
             type="button"
             className="detail__more"
             aria-expanded={showAll}
             aria-controls={listId}
             onClick={() => setShowAll((value) => !value)}
           >
             {showAll ? `Ver solo las ${CONNECTIONS_PREVIEW_COUNT} primeras` : `Ver las ${formatCount(sorted.length)}`}
             <Icon name={showAll ? "chevronUp" : "arrowRight"} size={14} />
           </button>
         )}
         <ScientificId id={node.id} label="ID científico" />
       </aside>
     );
   }
   ```

4. **La rama de una región.** Sustituye el bloque `if (selectedNodesList.length === 1) { … }` entero, que calcula `related` y devuelve el `<aside>` con el `<dl>`, por:

   ```tsx
     if (selectedNodesList.length === 1) {
       const node = selectedNodesList[0];
       return <RegionDetail key={node.id} node={node} connections={connections} nodeById={nodeById} />;
     }
   ```

   Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/components/DetailPanel.test.tsx`
   Expected: PASS (3 pruebas).

- [ ] **Step 5: estilos en `frontend/src/App.css`**

1. Borra el comentario `/* Panel de detalle en la columna derecha. */` y la regla `.ws-detail .detail-panel h2 { … }` que lo sigue: con su especificidad, ganaría al título nuevo (`.detail-panel .detail__title`). Hasta la Task 8, los `<h2>` de la conexión y de la selección múltiple se ven con el tamaño general de `index.css`.

2. Añade al final del archivo. Todas las reglas llevan `.detail-panel` delante para ganar a las de la decisión 74 (`.detail-panel h3`, `.detail-panel ul`...), que la Task 8 limpia.

   ```css

   /* Panel de detalle (spec 5.5). position: relative: el texto oculto de
      sus listas (.visually-hidden) se coloca respecto al panel, que se
      desplaza por dentro. Sin él, «Ver las 359» alargaría la página. */
   .ws-detail .detail-panel { position: relative; border-radius: 12px; padding: 14px 16px; }
   .ws-detail .detail { display: flex; flex-direction: column; gap: 8px; }
   .ws-detail .detail--with-id { padding-bottom: 0; }
   .detail > * { flex-shrink: 0; }
   .detail-panel .detail__eyebrow, .detail-panel .detail__heading { margin: 0; padding: 0; border: none; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
   .detail-panel .detail__title { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; margin: -4px 0 0; font-size: inherit; line-height: 1.2; letter-spacing: normal; }
   .detail-panel .detail__main { font-size: 1.44rem; font-weight: 700; letter-spacing: -0.01em; color: var(--text-h); overflow-wrap: anywhere; }
   .detail-panel .detail__secondary { font-size: 0.78rem; font-weight: 400; color: var(--text); }
   .detail-panel .detail__tags { display: flex; flex-wrap: wrap; gap: 6px; }
   .detail-panel .detail__tags .network-tag { height: 24px; margin-left: 0; padding: 0 10px; font-size: 0.7rem; }
   .detail-panel .detail__tag { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border: 1px solid var(--border); border-radius: 999px; font-size: 0.7rem; color: var(--text); }
   .detail-panel .detail__note { display: flex; gap: 8px; margin: 0; font-size: 0.7rem; line-height: 1.45; color: var(--text-muted); }
   .detail-panel .detail__note .icon { margin-top: 2px; }
   .detail-panel .detail__section-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px; padding-top: 10px; border-top: 1px solid var(--border); }
   .detail-panel .detail__count { margin-left: 6px; font-weight: 400; letter-spacing: 0; }
   .detail-panel .detail__hint { font-size: 0.7rem; color: var(--text-muted); }
   .detail-panel .detail__connections { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
   /* Cada conexión en tres filas: la otra región, a todo lo ancho; la barra
      de peso con el peso a su derecha, y el tipo y la evidencia. El peso
      conserva su formato de siempre, que puede llegar a 22 cifras
      (0.00007545708085457741): a la derecha del nombre le quitaría casi
      todo el sitio. */
   .detail-panel .detail__connection { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; grid-template-areas: "dot name name" ". bar weight" ". meta meta"; align-items: center; column-gap: 8px; row-gap: 3px; padding: 6px 0; border-bottom: 1px solid var(--border); }
   .detail-panel .detail__connection:last-child { border-bottom: none; }
   .detail-panel .detail__connection-dot { grid-area: dot; width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 1px var(--text-faint); }
   .detail-panel .detail__connection-name { grid-area: name; font-size: 0.7rem; font-weight: 600; color: var(--text-h); overflow-wrap: anywhere; }
   .detail-panel .detail__connection-direction { font-weight: 400; color: var(--text-muted); }
   .detail-panel .detail__connection-weight { grid-area: weight; font-family: var(--mono); font-size: 0.7rem; color: var(--text); }
   .detail-panel .detail__connection-bar { grid-area: bar; height: 3px; border-radius: 2px; background: var(--border); overflow: hidden; }
   .detail-panel .detail__connection-bar > span { display: block; height: 100%; border-radius: 2px; background: var(--text-muted); }
   .detail-panel .detail__connection-meta { grid-area: meta; font-size: 0.7rem; color: var(--text-muted); }
   .detail-panel .detail__more { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; padding: 2px 0; border: none; background: none; color: var(--text-h); font: inherit; font-size: 0.7rem; font-weight: 600; cursor: pointer; }
   .detail-panel .detail__more:hover { text-decoration: underline; text-underline-offset: 3px; }
   /* ID científico al pie: queda abajo aunque la lista sea corta, y a la
      vista aunque sea larga. */
   .detail-panel .detail__id { position: sticky; bottom: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin: auto -16px 0; padding: 6px 8px 6px 16px; border-top: 1px solid var(--border); background: var(--panel-bg); }
   .detail-panel .detail__id-label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); white-space: nowrap; }
   .detail-panel .detail__id-value { flex: 1 1 auto; min-width: 0; padding: 0; background: none; font-size: 0.7rem; color: var(--text-muted); word-break: break-all; }
   .detail-panel .detail__id-copy { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: none; border-radius: 6px; background: transparent; color: var(--text-muted); cursor: pointer; }
   .detail-panel .detail__id-copy:hover { background: var(--hover); color: var(--text-h); }
   /* Si no se pudo copiar, se dice bajo el ID. */
   .detail-panel .detail__id-status { flex-basis: 100%; font-size: 0.7rem; line-height: 1.35; color: var(--text); }
   ```

- [ ] **Step 6: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/App.css src/components/DetailPanel.tsx
```

Expected: BASE + 74 pruebas en verde (189 con una BASE de 115). El `grep`, como en la Task 4. Lo demás, como antes. Si lint avisa en el `useEffect` de limpieza de `ScientificId` (`exhaustive-deps`, por leer `timerRef.current`), copia la referencia al empezar el efecto (`const timer = timerRef;`) y limpia con `timer.current`.

- [ ] **Step 7: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/logic/regionConnections.ts frontend/src/logic/regionConnections.test.ts frontend/src/logic/clipboard.ts frontend/src/logic/clipboard.test.ts frontend/src/components/DetailPanel.tsx frontend/src/components/DetailPanel.test.tsx frontend/src/App.css
git commit -m "Estructura: panel de detalle de una region

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 8: detalle de una conexión y de varias regiones

Estas dos vistas conservan su contenido y reciben la misma jerarquía de títulos, etiquetas y listas (spec 5.5). La leyenda de la selección múltiple deja de cortar en pantalla las etiquetas largas, lo que la fase 1 dejó para esta (spec 12).

**Files:**
- Modify: `frontend/src/logic/displayText.ts` y `frontend/src/logic/displayText.test.ts` (`connectionArrow`, `regionNameWithSide` y `connectionTitle`)
- Modify: `frontend/src/components/DetailPanel.tsx` (conexión, selección múltiple y ancho de la leyenda en pantalla)
- Modify: `frontend/src/components/Connectogram.tsx` y `frontend/src/components/Hemisferios.tsx` (la flecha del recuadro de lectura)
- Modify: `frontend/src/App.css` (reglas del detalle de la decisión 74 y reglas nuevas)

La flecha «→» queda para la conectividad efectiva, la única con sentido (principio 1 del spec), en todos los sitios donde se nombra una conexión: el título del detalle, los dos recuadros de lectura y la lista de conectividad inducida. Las demás llevan «↔». En esos dos últimos sitios los nombres siguen completos, como pidió la usuaria el 30/08/2026.

- [ ] **Step 1: la flecha y el título de una conexión**

En `frontend/src/logic/displayText.test.ts`:
- Añade `connectionArrow`, `connectionTitle` y `regionNameWithSide` al import de `./displayText` y, debajo de él, `import type { GraphNode } from "../types/domain";`.
- Añade al final:

```ts
describe("connectionArrow", () => {
  it("«→» solo para la conectividad efectiva; «↔» para las demás", () => {
    expect(connectionArrow("effective")).toBe("→");
    expect(connectionArrow("structural")).toBe("↔");
    expect(connectionArrow("functional")).toBe("↔");
  });
});

describe("regionNameWithSide", () => {
  it("añade el lado, salvo si no hay hemisferio o si la abreviatura ya lo dice", () => {
    expect(regionNameWithSide({ abbreviation: "IFJa", label: "Area IFJa (hemisferio derecho)", hemisphere: "R" })).toBe("IFJa (der.)");
    expect(regionNameWithSide({ abbreviation: "L_SFG_7_1", label: "SFG_L_7_1", hemisphere: "L" })).toBe("L_SFG_7_1");
    expect(regionNameWithSide({ abbreviation: "l_amygdala", label: "Amígdala", hemisphere: "L" })).toBe("l_amygdala");
    expect(regionNameWithSide({ abbreviation: null, label: "Tronco del encéfalo", hemisphere: null })).toBe("Tronco del encéfalo");
  });
});

describe("connectionTitle", () => {
  const NODES = new Map<string, Pick<GraphNode, "abbreviation" | "label" | "hemisphere">>([
    ["l_v1", { abbreviation: "V1", label: "Primary Visual Cortex (hemisferio izquierdo)", hemisphere: "L" }],
    ["r_v1", { abbreviation: "V1", label: "Primary Visual Cortex (hemisferio derecho)", hemisphere: "R" }],
    ["l_v2", { abbreviation: "V2", label: "Second Visual Area (hemisferio izquierdo)", hemisphere: "L" }],
    ["talamo", { abbreviation: null, label: "Tálamo", hemisphere: null }],
  ]);

  it("la flecha, solo para la conectividad efectiva", () => {
    expect(connectionTitle({ source: "l_v1", target: "l_v2", type: "effective" }, NODES)).toBe("V1 → V2");
    expect(connectionTitle({ source: "l_v1", target: "l_v2", type: "structural" }, NODES)).toBe("V1 ↔ V2");
  });

  it("con el mismo nombre o en hemisferios distintos, cada región lleva su lado", () => {
    expect(connectionTitle({ source: "l_v1", target: "r_v1", type: "functional" }, NODES)).toBe("V1 (izq.) ↔ V1 (der.)");
    expect(connectionTitle({ source: "l_v2", target: "r_v1", type: "structural" }, NODES)).toBe("V2 (izq.) ↔ V1 (der.)");
  });

  it("una región sin hemisferio no lleva lado, y una que no está cargada se nombra con su id", () => {
    expect(connectionTitle({ source: "talamo", target: "l_v1", type: "structural" }, NODES)).toBe("Tálamo ↔ V1 (izq.)");
    expect(connectionTitle({ source: "x", target: "l_v1", type: "structural" }, NODES)).toBe("x ↔ V1 (izq.)");
  });
});
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/displayText.test.ts`
Expected: FAIL, porque no existen `connectionArrow`, `regionNameWithSide` ni `connectionTitle`.

En `frontend/src/logic/displayText.ts`, `import type { GraphNode } from "../types/domain";` pasa a `import type { GraphConnection, GraphNode } from "../types/domain";`, y al final añade:

```ts
// Flecha de una conexión: «→» solo para la conectividad efectiva, la única
// con sentido (principio 1 del spec), y «↔» para las demás. La usan el
// título del detalle, los recuadros de lectura y la lista de conectividad
// inducida (D4).
export function connectionArrow(type: GraphConnection["type"]): string {
  return type === "effective" ? "→" : "↔";
}

// Abreviaturas que ya dicen el lado: «L_SFG_7_1» (Brainnetome),
// «l_default_12» (Gordon 333), «l_amygdala» (subcórtex del HCP).
const SIDE_IN_ABBREVIATION = /^[lr]_|_[lr]$/i;

// Nombre corto de una región con su lado, «IFJa (der.)», porque las
// abreviaturas de HCP-MMP1.0 no lo llevan. Sin lado si la región no tiene
// hemisferio o si su abreviatura ya lo dice. El mismo formato en el título
// de una conexión y en el historial de deshacer.
export function regionNameWithSide(node: Pick<GraphNode, "abbreviation" | "label" | "hemisphere">): string {
  const main = regionTitleParts(node).main;
  if (node.hemisphere === null || (node.abbreviation !== null && SIDE_IN_ABBREVIATION.test(node.abbreviation))) {
    return main;
  }
  return `${main} (${node.hemisphere === "L" ? "izq." : "der."})`;
}

// Título de una conexión en el panel de detalle (D4; spec 5.5): «IFJa ↔
// 8C», o «IFJa → 8C» si es efectiva. Si las dos regiones se llaman igual o
// están en hemisferios distintos, cada una lleva su lado: «V1 (izq.) ↔ V1
// (der.)». Una región que no está entre las cargadas se nombra con su id.
export function connectionTitle(
  connection: Pick<GraphConnection, "source" | "target" | "type">,
  nodeById: ReadonlyMap<string, Pick<GraphNode, "abbreviation" | "label" | "hemisphere">>,
): string {
  const region = (id: string) => nodeById.get(id) ?? { abbreviation: null, label: id, hemisphere: null };
  const source = region(connection.source);
  const target = region(connection.target);
  const withSide = regionTitleParts(source).main === regionTitleParts(target).main || source.hemisphere !== target.hemisphere;
  const name = (node: Pick<GraphNode, "abbreviation" | "label" | "hemisphere">) =>
    withSide ? regionNameWithSide(node) : regionTitleParts(node).main;
  return `${name(source)} ${connectionArrow(connection.type)} ${name(target)}`;
}
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/displayText.test.ts`
Expected: PASS (19 pruebas).

En `DetailPanel.tsx`, el import de `../logic/displayText` pasa a `import { connectionArrow, connectionTitle, formatCount, hemisphereLabel, regionTitleParts } from "../logic/displayText";`.

- [ ] **Step 2: la conexión**

Sustituye el `return (…)` de la rama `if (connection) {`, el que devuelve el `<aside className="detail-panel">` con `<h2>Conexión</h2>`, por el de abajo. Las dos constantes `source` y `target` de la rama se quedan. El ID pasa del principio al pie, con su botón de copiar.

```tsx
    return (
      <aside className="detail-panel detail detail--with-id" aria-label="Conexión seleccionada">
        <p className="detail__eyebrow">Conexión seleccionada</p>
        <h2 className="detail__title">
          <span className="detail__main detail__main--text">{connectionTitle(connection, nodeById)}</span>
        </h2>
        <dl className="detail__facts">
          {/* «Origen» y «Destino» solo si la conexión tiene sentido (efectiva);
              si no, las dos regiones van en pie de igualdad. */}
          <dt>{connection.type === "effective" ? "Origen" : "Región A"}</dt>
          <dd>{regionDisplayText(source, connection.source)}</dd>
          <dt>{connection.type === "effective" ? "Destino" : "Región B"}</dt>
          <dd>{regionDisplayText(target, connection.target)}</dd>
          <dt>Tipo</dt>
          <dd>{CONNECTION_TYPE_LABELS[connection.type]}</dd>
          <dt>Peso</dt>
          <dd>{connection.weight}</dd>
          <dt>Nivel de evidencia</dt>
          <dd>{EVIDENCE_LEVEL_LABELS[connection.evidenceLevel]}</dd>
        </dl>
        <ScientificId key={connection.id} id={connection.id} label="ID" />
      </aside>
    );
```

- [ ] **Step 3: la selección múltiple**

En el `return` final (dos o más regiones):

1. `<aside className="detail-panel">` pasa a `<aside className="detail-panel detail" aria-label="Regiones seleccionadas">`.
2. `<h2>{selectedNodesList.length} regiones seleccionadas</h2>` pasa a:

   ```tsx
         <p className="detail__eyebrow">Selección múltiple</p>
         <h2 className="detail__title">
           <span className="detail__main detail__main--text">{selectedNodesList.length} regiones seleccionadas</span>
         </h2>
   ```

3. La cabecera de la leyenda:

   ```tsx
         <div className="detail-panel__legend-header">
           <span>Leyenda</span>
   ```

   pasa a:

   ```tsx
         <div className="detail__section-header">
           <h3 className="detail__heading">Leyenda</h3>
   ```

   El botón «Exportar leyenda JPEG» y el `<svg>` de la leyenda no cambian.

4. `<h3>Conectividad entre las regiones seleccionadas</h3>` pasa a:

   ```tsx
         <div className="detail__section-header">
           <h3 className="detail__heading">Conectividad entre las regiones seleccionadas</h3>
         </div>
   ```

   `<h3>Tractos con nombre</h3>` cambia igual.

5. Las dos listas de primer nivel, la de conectividad inducida (`{induced.map(…)}`) y la de tractos (`{tracts.map(…)}`), pasan de `<ul>` a `<ul className="detail__list">`. La lista de estudios de dentro de `TractRow` se queda como está.

6. En la lista de conectividad inducida, la flecha sigue la regla de arriba y los nombres siguen completos. Sustituye:

   ```tsx
                   {sourceLabel} → {targetLabel} — {CONNECTION_TYPE_LABELS[c.type]}, peso {c.weight}, {EVIDENCE_LEVEL_LABELS[c.evidenceLevel]}
   ```

   por:

   ```tsx
                   {sourceLabel} {connectionArrow(c.type)} {targetLabel} — {CONNECTION_TYPE_LABELS[c.type]}, peso {c.weight},{" "}
                   {EVIDENCE_LEVEL_LABELS[c.evidenceLevel]}
   ```

- [ ] **Step 4: la flecha en los recuadros de lectura**

En `frontend/src/components/Connectogram.tsx` y en `frontend/src/components/Hemisferios.tsx`, la rama `selectedConnection` del recuadro de lectura escribe `{" → "}` entre las dos regiones, sea cual sea el tipo. En los dos archivos, esa línea pasa a:

```tsx
        {` ${connectionArrow(selectedConnection.type)} `}
```

Los imports:
- En `Connectogram.tsx`, `import { regionPassingText } from "../logic/displayText";` pasa a `import { connectionArrow, regionPassingText } from "../logic/displayText";`.
- En `Hemisferios.tsx`, tras `import { RegionSummary } from "./NetworkTag";` añade `import { connectionArrow } from "../logic/displayText";`.

- [ ] **Step 5: la leyenda, sin cortar las etiquetas largas en pantalla**

La leyenda es un SVG de 260 px de ancho fijo. Al exportarla, `exportSvgAsJpeg` ya ensancha la imagen hasta que cabe el texto (`fitWidthToContent`, fase 1). En pantalla, las etiquetas largas se cortan. Ahora el ancho se mide tras cada render, con el texto ya pintado: 260 px, o más si el texto lo necesita.

Qué pasa con la exportación: parte del ancho que el `<svg>` tiene en pantalla y solo lo ensancha, nunca lo estrecha (`fittedWidth`). Con etiquetas cortas, el ancho en pantalla sigue siendo 260 px y el JPEG sale igual que antes de esta fase. Con etiquetas largas, sale del ancho mayor de los dos: el medido en pantalla o el medido con la fuente de la exportación. Puede salir algo más ancho que antes, pero nunca cortado. La Task 12 lo compara con la versión anterior.

1. `import { useEffect, useId, useMemo, useRef, useState } from "react";` pasa a `import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";`.
2. Justo después de la interfaz `Props`, añade:

   ```tsx

   // Ancho mínimo de la leyenda de la selección múltiple (el de siempre) y
   // hueco a la derecha de su texto más largo (el mismo que a la izquierda).
   const LEGEND_MIN_WIDTH = 260;
   const LEGEND_MARGIN = 10;

   // Escribe en el <svg> de la leyenda el ancho de su texto. Si el navegador
   // todavía no puede medirlo (getBBox falla sin maqueta), se queda el que
   // tenga, como hace contentRightEdge en logic/exportImage.ts.
   function fitLegendWidth(svg: SVGSVGElement | null) {
     if (!svg) return;
     let box: DOMRect;
     try {
       box = svg.getBBox();
     } catch {
       return;
     }
     svg.setAttribute("width", String(Math.max(LEGEND_MIN_WIDTH, Math.ceil(box.x + box.width + LEGEND_MARGIN))));
   }
   ```

3. Justo después de `  const legendSvgRef = useRef<SVGSVGElement>(null);` añade:

   ```tsx
     // La leyenda cortaba en pantalla las etiquetas largas (spec, sección 12;
     // D3 de docs/decisiones-diseno.md). Tras cada render se mide su texto y
     // se escribe el ancho en el propio <svg>: LEGEND_MIN_WIDTH, el de
     // siempre, o más si el texto lo necesita. Si el panel es más estrecho,
     // su recuadro se desplaza en horizontal. El ancho no es estado de React
     // (el <svg> no lleva la prop width), así que medir no provoca otro
     // render. La exportación parte de este ancho y solo lo ensancha
     // (fitWidthToContent): con etiquetas cortas el JPEG sale como antes, y
     // con largas puede salir algo más ancho, nunca cortado.
     useLayoutEffect(() => fitLegendWidth(legendSvgRef.current));
     // Una fuente que llega tarde cambia lo que mide el texto: se vuelve a medir.
     useEffect(() => {
       const fonts = document.fonts;
       const refit = () => fitLegendWidth(legendSvgRef.current);
       fonts?.addEventListener("loadingdone", refit);
       return () => fonts?.removeEventListener("loadingdone", refit);
     }, []);
   ```

4. En `handleExportLegend`, la llamada `exportSvgAsJpeg(legendSvgRef.current, …, exportResolverFor(…), { fitWidthToContent: true })` se queda exactamente como está (commit `cea7df2` de la fase 1). Solo cambia su comentario, que habla de un ancho fijo en pantalla. Sustituye el comentario entero:

   ```tsx
         // fitWidthToContent: la leyenda es un SVG de ancho fijo (260 px), y
         // la fuente de la exportación (una pila del sistema) es más ancha
         // que la serif con la que salía antes el JPEG. Sin esto, una
         // etiqueta larga se cortaría en la imagen. En pantalla la leyenda
         // sigue igual: la fase 3 rehace este panel (D3 de
         // docs/decisiones-diseno.md).
   ```

   por:

   ```tsx
         // fitWidthToContent: la exportación usa otra fuente (una pila del
         // sistema, D3 de docs/decisiones-diseno.md), así que vuelve a medir
         // el texto con ella y, si no cabe en el ancho que el <svg> tiene en
         // pantalla (el del efecto de arriba, D4), ensancha la imagen. Nunca
         // la estrecha. Sin esto, una etiqueta larga podría salir cortada.
   ```

5. En el `<svg ref={legendSvgRef} …>` de la leyenda, borra la línea `        width={260}`. No le añadas `viewBox`: con él, `fitWidthToContent` no mide (lo dice `exportImage.ts`). Envuelve el `<svg>` entero, desde `<svg` hasta `</svg>`, en `<div className="detail__legend">` … `</div>`. El comentario que lo precede se queda donde está.
6. Comprueba que la exportación sigue igual:

   ```bash
   grep -n "fitWidthToContent: true\|viewBox" /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/src/components/DetailPanel.tsx
   ```

   Expected: una sola línea, la de `{ fitWidthToContent: true },`, y ningún `viewBox`.

- [ ] **Step 6: estilos en `frontend/src/App.css`**

1. Borra las tres reglas `.detail-panel dl { … }`, `.detail-panel dt { … }` y `.detail-panel dd { … }`. La de `.detail-panel ul` se queda: la usa la lista de estudios.
2. Borra la regla `.detail-panel h3 { … }` y la regla `.detail-panel__legend-header { … }`. El comentario «Modo de selección múltiple (30/08/2026)…» que las precede se queda: sigue describiendo las reglas `.detail-panel__empty-note` y `.detail-panel__no-citation`.
3. Añade al final del archivo:

   ```css
   .detail-panel .detail__main--text { font-size: 1rem; font-weight: 600; letter-spacing: 0; }
   .detail-panel .detail__facts { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 12px; margin: 0; font-size: 0.7rem; }
   .detail-panel .detail__facts dt { margin: 0; font-size: inherit; font-weight: 400; color: var(--text-muted); }
   .detail-panel .detail__facts dd { margin: 0; color: var(--text-h); overflow-wrap: anywhere; }
   .detail-panel .detail__list { margin: 0; padding-left: 1.1rem; font-size: 0.7rem; line-height: 1.45; }
   .detail-panel .detail__list > li + li { margin-top: 6px; }
   /* Recuadro de la leyenda: si su texto es más ancho que el panel, se
      desplaza en horizontal, sin ensanchar el panel entero. */
   .detail-panel .detail__legend { max-width: 100%; overflow-x: auto; }
   .ws-detail .detail-panel--empty { display: flex; align-items: center; justify-content: center; text-align: center; font-size: 0.72rem; line-height: 1.5; }
   ```

4. Comprueba los restos:

   ```bash
   grep -rn "detail-panel__legend-header" /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/src
   grep -nE "^\s*<(h2|h3|dl)>" /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/src/components/DetailPanel.tsx
   ```

   Expected: sin resultados en los dos. El segundo busca títulos y listas sin clase; no cuenta el comentario de `regionDisplayText`, que nombra `<dd>/<h2>`.

- [ ] **Step 7: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/App.css src/components/DetailPanel.tsx
grep -rn '" → "\| → {' src/components
```

El último `grep` no debe dar nada: ninguna flecha fija entre dos regiones.

Expected: BASE + 79 pruebas en verde (194 con una BASE de 115). El primer `grep`, como en la Task 4. Lo demás, como antes. El efecto de la leyenda no tiene lista de dependencias a propósito, y lint no avisa por eso. El ancho medido y la exportación se comprueban en el navegador, en la Task 12.

- [ ] **Step 8: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/logic/displayText.ts frontend/src/logic/displayText.test.ts frontend/src/components/DetailPanel.tsx frontend/src/components/Connectogram.tsx frontend/src/components/Hemisferios.tsx frontend/src/App.css
git commit -m "Estructura: detalle de una conexion y de varias regiones

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 7: historial de deshacer

### Task 9: historial de deshacer y rehacer

Spec 5.7: con un clic de más se pierde un montaje. Un clic en una línea selecciona esa conexión y vacía la selección de regiones, y «Resaltar» una red sustituye la selección entera. Esta tarea hace el historial: la descripción de cada paso (`logic/historyStep.ts`) y el store (`state/history.ts`). La Task 10 le pone los botones, el teclado y el aviso con «Deshacer».

Los stores de selección y de filtros son del desarrollador principal: estas dos tareas no cambian ni su código ni su API. El historial se suscribe a ellos con `subscribe` y restaura con `setState`.

**Files:**
- Create: `frontend/src/logic/historyStep.ts`, `frontend/src/state/history.ts`
- Test: `frontend/src/logic/historyStep.test.ts`, `frontend/src/state/history.test.ts`

Cómo funciona el historial (`state/history.ts`):
- Cada paso es una instantánea de la selección (regiones y conexión) y de los filtros (redes y tipos ocultos, peso mínimo), con los mismos `Set` que tenían los stores: ninguno de los dos modifica un `Set`, siempre crea uno nuevo. Deshacer los devuelve tal cual.
- Registra en una microtarea: los cambios que llegan juntos son un solo paso. «Resaltar» una red oculta la muestra y la selecciona con dos llamadas a dos stores.
- Compara el contenido: «Todas» con ninguna red oculta crea un `Set` nuevo, pero no es un paso.
- Un arrastre del deslizador de peso es un solo paso: se registra al soltar el puntero, que solo cuenta si se pulsó sobre el deslizador (lo avisa `useHistoryShortcuts`, en la Task 10). Si el peso vuelve a donde estaba, no hay paso, y lo que se podía rehacer se conserva. Con el teclado, los cambios de peso a menos de 500 ms se juntan, y se registran cuando el valor lleva 500 ms quieto.
- No registra lo que él mismo restaura, y guarda los 50 últimos pasos.
- Guarda el último paso registrado (`lastStep`). Con él, App decide si sale el aviso con «Deshacer» (Task 10), y cuenta solo las regiones del atlas que se está viendo.
- Se vacía al cambiar de atlas o de clasificación: App llama a `resetHistory()`. App no vacía la selección al cambiar de atlas: los ids del atlas anterior se quedan en el store y las vistas los ignoran. Así que `resetHistory()` va al final de `handleChangeAtlas`, y la instantánea de partida es la selección tal como queda. Con otra clasificación, se vacía cuando llegan sus datos, no al elegirla: mientras carga se sigue viendo la anterior, y si falla, se queda (Task 10).
- En desarrollo, al recargar el módulo en caliente, el anterior deja de escuchar a los stores (`import.meta.hot?.dispose`).

- [ ] **Step 1: escribir las pruebas de `logic/historyStep.ts`**

`frontend/src/logic/historyStep.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ConnectionType } from "../state/filters";
import type { GraphConnection, GraphNode } from "../types/domain";
import {
  changedKinds,
  describeStep,
  historyButtons,
  historyShortcut,
  stepNotice,
  type HistorySnapshot,
} from "./historyStep";

function region(id: string, abbreviation: string, hemisphere: "L" | "R"): GraphNode {
  const side = hemisphere === "L" ? "izquierdo" : "derecho";
  return {
    id,
    label: `Area ${abbreviation} (hemisferio ${side})`,
    abbreviation,
    hemisphere,
    network: "cole-anticevic.visual",
    position3d: [0, 0, 0],
    referenceSpace: null,
  };
}

const NODES = [region("r_ifja", "IFJa", "R"), region("l_v1", "V1", "L"), region("r_v1", "V1", "R"), region("r_fef", "FEF", "R")];
const CONNECTION: GraphConnection = { id: "c1", source: "l_v1", target: "r_v1", type: "structural", weight: 0.1, evidenceLevel: "direct" };
const CONTEXT = {
  nodeById: new Map(NODES.map((n) => [n.id, n])),
  findConnection: (id: string) => (id === CONNECTION.id ? CONNECTION : undefined),
};
const LOADED = (id: string) => NODES.some((n) => n.id === id);

function snapshot(changes: Partial<HistorySnapshot> = {}): HistorySnapshot {
  return {
    selectedNodeIds: new Set(),
    selectedConnectionId: null,
    hiddenNetworks: new Set(),
    hiddenConnectionTypes: new Set<ConnectionType>(),
    minWeight: 0,
    ...changes,
  };
}

describe("describeStep", () => {
  it("añadir o quitar regiones de la selección, con su lado", () => {
    const one = snapshot({ selectedNodeIds: new Set(["l_v1"]) });
    const two = snapshot({ selectedNodeIds: new Set(["l_v1", "r_ifja"]) });
    expect(describeStep(one, two, CONTEXT)).toBe("añadir IFJa (der.) a la selección");
    expect(describeStep(two, one, CONTEXT)).toBe("quitar IFJa (der.) de la selección");
    const four = snapshot({ selectedNodeIds: new Set(["l_v1", "r_v1", "r_ifja", "r_fef"]) });
    expect(describeStep(four, one, CONTEXT)).toBe("quitar 3 regiones");
    expect(describeStep(one, four, CONTEXT)).toBe("añadir 3 regiones");
  });

  it("quitar la única región seleccionada es «quitar», no «limpiar»", () => {
    expect(describeStep(snapshot({ selectedNodeIds: new Set(["r_ifja"]) }), snapshot(), CONTEXT)).toBe(
      "quitar IFJa (der.) de la selección",
    );
  });

  it("seleccionar una conexión, sustituir la selección o limpiarla", () => {
    const regions = snapshot({ selectedNodeIds: new Set(["l_v1", "r_ifja"]) });
    expect(describeStep(regions, snapshot({ selectedConnectionId: "c1" }), CONTEXT)).toBe(
      "seleccionar la conexión V1 (izq.) ↔ V1 (der.)",
    );
    expect(describeStep(regions, snapshot({ selectedNodeIds: new Set(["r_fef"]) }), CONTEXT)).toBe("seleccionar FEF (der.)");
    expect(describeStep(regions, snapshot(), CONTEXT)).toBe("limpiar la selección");
  });

  it("filtros: redes, tipos y peso mínimo, escrito como en Filtros", () => {
    expect(describeStep(snapshot(), snapshot({ hiddenNetworks: new Set(["cole-anticevic.visual"]) }), CONTEXT)).toBe(
      "ocultar la red Visual",
    );
    expect(describeStep(snapshot({ hiddenNetworks: new Set(["a", "b"]) }), snapshot(), CONTEXT)).toBe("mostrar 2 redes");
    expect(
      describeStep(snapshot(), snapshot({ hiddenConnectionTypes: new Set<ConnectionType>(["structural"]) }), CONTEXT),
    ).toBe("ocultar el tipo Estructural");
    expect(describeStep(snapshot({ minWeight: 0.001 }), snapshot({ minWeight: 0.0039810717 }), CONTEXT)).toBe(
      "peso mínimo de 1.0e-3 a 4.0e-3",
    );
  });

  it("si cambian varias cosas a la vez, «varios cambios»", () => {
    const after = snapshot({ selectedNodeIds: new Set(["r_ifja"]), hiddenNetworks: new Set(["cole-anticevic.visual"]) });
    expect(describeStep(snapshot(), after, CONTEXT)).toBe("varios cambios");
  });
});

describe("changedKinds", () => {
  it("compara el contenido de los Set, no solo su referencia", () => {
    expect(changedKinds(snapshot({ hiddenNetworks: new Set(["a"]) }), snapshot({ hiddenNetworks: new Set(["a"]) }))).toEqual([]);
  });
});

describe("stepNotice", () => {
  const three = snapshot({ selectedNodeIds: new Set(["l_v1", "r_v1", "r_ifja"]) });

  it("avisa si el paso quita dos o más regiones: sustituir o vaciar", () => {
    expect(stepNotice(three, snapshot({ selectedConnectionId: "c1" }), LOADED)).toBe("Se sustituyó la selección de 3 regiones");
    expect(stepNotice(three, snapshot({ selectedNodeIds: new Set(["r_fef"]) }), LOADED)).toBe(
      "Se sustituyó la selección de 3 regiones",
    );
    expect(stepNotice(three, snapshot(), LOADED)).toBe("Se vació la selección de 3 regiones");
  });

  it("no avisa si quita una región o ninguna", () => {
    expect(stepNotice(three, snapshot({ selectedNodeIds: new Set(["l_v1", "r_v1"]) }), LOADED)).toBeNull();
    expect(stepNotice(three, snapshot({ ...three, minWeight: 0.01 }), LOADED)).toBeNull();
  });

  it("solo cuentan las regiones del atlas que se está viendo", () => {
    const withOld = snapshot({ selectedNodeIds: new Set(["r_ifja", "otro_atlas_1", "otro_atlas_2"]) });
    expect(stepNotice(withOld, snapshot(), LOADED)).toBeNull();
    const twoLoaded = snapshot({ selectedNodeIds: new Set(["r_ifja", "r_fef", "otro_atlas_1"]) });
    expect(stepNotice(twoLoaded, snapshot(), LOADED)).toBe("Se vació la selección de 2 regiones");
  });
});

describe("historyButtons", () => {
  const before = snapshot();
  const after = snapshot({ selectedNodeIds: new Set(["r_ifja"]) });

  it("con pasos, cada botón describe el suyo", () => {
    const buttons = historyButtons({ past: [before], present: after, future: [], pendingFrom: null }, CONTEXT);
    expect(buttons.undo).toEqual({ enabled: true, tip: "Deshacer: añadir IFJa (der.) a la selección" });
    expect(buttons.redo).toEqual({ enabled: false, tip: "Nada que rehacer" });
    const undone = historyButtons({ past: [], present: before, future: [after], pendingFrom: null }, CONTEXT);
    expect(undone.redo).toEqual({ enabled: true, tip: "Rehacer: añadir IFJa (der.) a la selección" });
  });

  it("un cambio de peso sin registrar ya se puede deshacer", () => {
    const weighted = snapshot({ minWeight: 0.02 });
    const buttons = historyButtons({ past: [], present: weighted, future: [], pendingFrom: before }, CONTEXT);
    expect(buttons.undo.tip).toBe("Deshacer: peso mínimo de 0 (sin filtro, se muestra todo) a 0.02");
  });
});

describe("historyShortcut", () => {
  const key = (
    k: string,
    mods: Partial<Pick<KeyboardEvent, "code" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey" | "repeat" | "defaultPrevented">> = {},
  ) => ({
    key: k,
    code: `Key${k.toUpperCase()}`,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    repeat: false,
    defaultPrevented: false,
    ...mods,
  });
  const body = { tagName: "BODY" };

  it("Ctrl+Z y ⌘Z deshacen; Ctrl+Mayús+Z, ⌘Mayús+Z y Ctrl+Y rehacen", () => {
    expect(historyShortcut(key("z", { ctrlKey: true }), body)).toBe("undo");
    expect(historyShortcut(key("z", { metaKey: true }), body)).toBe("undo");
    expect(historyShortcut(key("Z", { ctrlKey: true, shiftKey: true }), body)).toBe("redo");
    expect(historyShortcut(key("Z", { metaKey: true, shiftKey: true }), body)).toBe("redo");
    expect(historyShortcut(key("y", { ctrlKey: true }), body)).toBe("redo");
  });

  it("con un teclado sin letras latinas, mira la tecla física", () => {
    expect(historyShortcut({ ...key("я", { ctrlKey: true }), code: "KeyZ" }, body)).toBe("undo");
    expect(historyShortcut({ ...key("н", { ctrlKey: true }), code: "KeyY" }, body)).toBe("redo");
  });

  it("sin Ctrl ni ⌘, con Alt, repetida, ya atendida o dentro de un campo de texto, nada", () => {
    expect(historyShortcut(key("z"), body)).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true, altKey: true }), body)).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true, repeat: true }), body)).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true, defaultPrevented: true }), body)).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true }), { tagName: "INPUT", type: "text" })).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true }), { tagName: "TEXTAREA" })).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true }), { tagName: "DIV", isContentEditable: true })).toBeNull();
  });

  it("en el deslizador o en una casilla sí deshace", () => {
    expect(historyShortcut(key("z", { ctrlKey: true }), { tagName: "INPUT", type: "range" })).toBe("undo");
    expect(historyShortcut(key("z", { ctrlKey: true }), { tagName: "INPUT", type: "checkbox" })).toBe("undo");
  });
});
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/historyStep.test.ts`
Expected: FAIL, porque no existe `./historyStep`.

- [ ] **Step 2: implementar `frontend/src/logic/historyStep.ts`**

```ts
// Pasos del historial de deshacer (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.7): qué cambia entre dos
// instantáneas, cómo se dice, si merece el aviso con «Deshacer», qué dicen
// los botones y qué atajo de teclado deshace o rehace. Funciones puras: se
// prueban sin DOM.
import type { ConnectionType } from "../state/filters";
import { CONNECTION_TYPE_LABELS } from "../theme/networks";
import type { GraphConnection, GraphNode } from "../types/domain";
import { connectionTitle, formatCount, networkShortLabel, regionNameWithSide } from "./displayText";
import { formatMinWeight } from "./weightScale";

// La selección y los filtros en un momento dado (state/history.ts). Son
// los mismos Set que tenían los stores: ninguno de los dos los modifica,
// siempre crea uno nuevo.
export interface HistorySnapshot {
  selectedNodeIds: Set<string>;
  selectedConnectionId: string | null;
  hiddenNetworks: Set<string>;
  hiddenConnectionTypes: Set<ConnectionType>;
  minWeight: number;
}

// Con qué se nombra lo que cambia: las regiones cargadas y, cuando hace
// falta, una conexión, que se busca solo entonces.
export interface StepContext {
  nodeById: ReadonlyMap<string, GraphNode>;
  findConnection: (id: string) => GraphConnection | undefined;
}

export type ChangeKind = "selection" | "networks" | "types" | "weight";

function missing<T>(from: ReadonlySet<T>, other: ReadonlySet<T>): T[] {
  return [...from].filter((item) => !other.has(item));
}

function sameSet<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  return a === b || (a.size === b.size && missing(a, b).length === 0);
}

// Qué ha cambiado de una instantánea a otra. Compara el contenido de los
// Set, no solo la referencia: «Todas» con ninguna red oculta crea un Set
// nuevo, pero no cambia nada.
export function changedKinds(before: HistorySnapshot, after: HistorySnapshot): ChangeKind[] {
  const kinds: ChangeKind[] = [];
  if (
    before.selectedConnectionId !== after.selectedConnectionId ||
    !sameSet(before.selectedNodeIds, after.selectedNodeIds)
  ) {
    kinds.push("selection");
  }
  if (!sameSet(before.hiddenNetworks, after.hiddenNetworks)) kinds.push("networks");
  if (!sameSet(before.hiddenConnectionTypes, after.hiddenConnectionTypes)) kinds.push("types");
  if (before.minWeight !== after.minWeight) kinds.push("weight");
  return kinds;
}

// Nombre de una región en una descripción, con su lado: «IFJa (der.)»
// (logic/displayText.ts). Una región que no está cargada se nombra con su id.
function regionName(id: string, context: StepContext): string {
  const node = context.nodeById.get(id);
  return node ? regionNameWithSide(node) : id;
}

function describeSelection(before: HistorySnapshot, after: HistorySnapshot, context: StepContext): string {
  if (after.selectedConnectionId !== null && after.selectedConnectionId !== before.selectedConnectionId) {
    const connection = context.findConnection(after.selectedConnectionId);
    return `seleccionar la conexión ${connection ? connectionTitle(connection, context.nodeById) : after.selectedConnectionId}`;
  }
  const added = missing(after.selectedNodeIds, before.selectedNodeIds);
  const removed = missing(before.selectedNodeIds, after.selectedNodeIds);
  // Quitar la única región seleccionada es «quitar», no «limpiar».
  if (after.selectedNodeIds.size === 0 && after.selectedConnectionId === null) {
    return removed.length === 1 && before.selectedConnectionId === null
      ? `quitar ${regionName(removed[0], context)} de la selección`
      : "limpiar la selección";
  }
  // Sustituir: se quita algo a la vez que se añade, o se deja una conexión
  // por una región.
  if (added.length > 0 && (removed.length > 0 || before.selectedConnectionId !== null)) {
    return added.length === 1 ? `seleccionar ${regionName(added[0], context)}` : `seleccionar ${formatCount(added.length)} regiones`;
  }
  if (added.length > 0) {
    return added.length === 1
      ? `añadir ${regionName(added[0], context)} a la selección`
      : `añadir ${formatCount(added.length)} regiones`;
  }
  return removed.length === 1
    ? `quitar ${regionName(removed[0], context)} de la selección`
    : `quitar ${formatCount(removed.length)} regiones`;
}

function describeHidden(
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
  one: (item: string, hide: boolean) => string,
  many: (count: number, hide: boolean) => string,
  mixed: string,
): string {
  const hidden = missing(after, before);
  const shown = missing(before, after);
  if (hidden.length > 0 && shown.length > 0) return mixed;
  const items = hidden.length > 0 ? hidden : shown;
  return items.length === 1 ? one(items[0], hidden.length > 0) : many(items.length, hidden.length > 0);
}

// Descripción de un paso, en castellano, para la etiqueta emergente de
// Deshacer y Rehacer: «añadir IFJa (der.) a la selección», «quitar 3
// regiones», «seleccionar la conexión V1 (izq.) ↔ V1 (der.)», «limpiar la
// selección», «ocultar la red Visual», «peso mínimo de 1.0e-3 a 4.0e-3» o,
// si cambian varias cosas, «varios cambios». El peso se escribe como en
// Filtros (formatMinWeight).
export function describeStep(before: HistorySnapshot, after: HistorySnapshot, context: StepContext): string {
  const kinds = changedKinds(before, after);
  if (kinds.length !== 1) return "varios cambios";
  switch (kinds[0]) {
    case "selection":
      return describeSelection(before, after, context);
    case "networks":
      return describeHidden(
        before.hiddenNetworks,
        after.hiddenNetworks,
        (network, hide) => `${hide ? "ocultar" : "mostrar"} la red ${networkShortLabel(network)}`,
        (count, hide) => `${hide ? "ocultar" : "mostrar"} ${count} redes`,
        "cambiar las redes visibles",
      );
    case "types":
      return describeHidden(
        before.hiddenConnectionTypes,
        after.hiddenConnectionTypes,
        (type, hide) => `${hide ? "ocultar" : "mostrar"} el tipo ${CONNECTION_TYPE_LABELS[type] ?? type}`,
        (count, hide) => `${hide ? "ocultar" : "mostrar"} ${count} tipos`,
        "cambiar los tipos visibles",
      );
    case "weight":
      return `peso mínimo de ${formatMinWeight(before.minWeight)} a ${formatMinWeight(after.minWeight)}`;
  }
}

// El aviso con «Deshacer» sale cuando un paso quita dos o más regiones de
// la selección: un clic en una línea, «Resaltar» otra red o «Limpiar». Solo
// cuentan las regiones del atlas que se está viendo (isLoaded): los ids de
// un atlas anterior se quedan en el store, y no se ven. null si el paso no
// lo merece.
export function stepNotice(
  before: HistorySnapshot,
  after: HistorySnapshot,
  isLoaded: (id: string) => boolean,
): string | null {
  const removed = missing(before.selectedNodeIds, after.selectedNodeIds).filter(isLoaded);
  if (removed.length < 2) return null;
  const replaced = [...before.selectedNodeIds].filter(isLoaded).length;
  const emptied = after.selectedNodeIds.size === 0 && after.selectedConnectionId === null;
  return `${emptied ? "Se vació" : "Se sustituyó"} la selección de ${formatCount(replaced)} regiones`;
}

// Lo que necesitan los botones: el historial tal como lo guarda
// state/history.ts.
export interface HistoryView {
  past: readonly HistorySnapshot[];
  present: HistorySnapshot;
  future: readonly HistorySnapshot[];
  pendingFrom: HistorySnapshot | null;
}

export interface HistoryButtonState {
  enabled: boolean;
  tip: string;
}

// Estado y etiqueta emergente de «Deshacer» y «Rehacer»: el paso que se
// desharía o se reharía, o que no hay ninguno. Un cambio de peso que todavía
// no se ha registrado (pendingFrom) ya se puede deshacer, y con él ya no hay
// nada que rehacer; si el peso ha vuelto a donde estaba, no cuenta.
export function historyButtons(
  history: HistoryView,
  context: StepContext,
): { undo: HistoryButtonState; redo: HistoryButtonState } {
  const pending =
    history.pendingFrom !== null && changedKinds(history.pendingFrom, history.present).length > 0
      ? history.pendingFrom
      : null;
  const undoFrom = pending ?? history.past.at(-1) ?? null;
  const redoTo = pending ? null : (history.future[0] ?? null);
  return {
    undo: undoFrom
      ? { enabled: true, tip: `Deshacer: ${describeStep(undoFrom, history.present, context)}` }
      : { enabled: false, tip: "Nada que deshacer" },
    redo: redoTo
      ? { enabled: true, tip: `Rehacer: ${describeStep(history.present, redoTo, context)}` }
      : { enabled: false, tip: "Nada que rehacer" },
  };
}

// Tipos de <input> en los que se escribe: ahí Ctrl+Z es del campo.
const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "number", "password", "tel", "url"]);

// Atajo de teclado del historial: Ctrl+Z (⌘Z en macOS) deshace; Ctrl+Mayús+Z,
// ⌘Mayús+Z y Ctrl+Y rehacen. Con distribuciones de teclado sin letras
// latinas, se mira la tecla física (code). No actúa dentro de un campo de
// texto, si la tecla se repite al mantenerla pulsada o si otro ya atendió
// el evento (defaultPrevented).
export function historyShortcut(
  event: Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey" | "repeat" | "defaultPrevented">,
  target: { tagName: string; type?: string; isContentEditable?: boolean } | null,
): "undo" | "redo" | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.repeat || event.defaultPrevented) return null;
  if (
    target &&
    (target.isContentEditable ||
      target.tagName === "TEXTAREA" ||
      (target.tagName === "INPUT" && TEXT_INPUT_TYPES.has(target.type ?? "text")))
  ) {
    return null;
  }
  const letter = /^[a-z]$/i.test(event.key)
    ? event.key.toLowerCase()
    : event.code === "KeyZ"
      ? "z"
      : event.code === "KeyY"
        ? "y"
        : "";
  if (letter === "z") return event.shiftKey ? "redo" : "undo";
  if (letter === "y" && event.ctrlKey && !event.shiftKey) return "redo";
  return null;
}
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/historyStep.test.ts`
Expected: PASS (15 pruebas).

- [ ] **Step 3: escribir las pruebas de `state/history.ts`**

`frontend/src/state/history.test.ts`. Usan los stores de verdad, que en node funcionan sin React, y los temporizadores falsos de vitest para el deslizador. `vi.useFakeTimers()` no toca las microtareas, así que `await flush()` sigue dejando pasar la del historial.

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFiltersStore } from "./filters";
import { HISTORY_LIMIT, redo, resetHistory, setPointerHeld, undo, useHistoryStore } from "./history";
import { useSelectionStore } from "./selection";

// El historial registra cada cambio en una microtarea: así, los cambios
// que llegan juntos son un solo paso. await flush() la deja pasar.
const flush = () => Promise.resolve();
const selection = () => useSelectionStore.getState();
const filters = () => useFiltersStore.getState();
const history = () => useHistoryStore.getState();

beforeEach(() => {
  useSelectionStore.setState({ selectedNodeIds: new Set(), selectedConnectionId: null });
  useFiltersStore.setState({ hiddenNetworks: new Set(), hiddenConnectionTypes: new Set(), minWeight: 0 });
  resetHistory();
});

afterEach(() => {
  vi.useRealTimers();
  setPointerHeld(false);
});

describe("historial", () => {
  it("registra un cambio de la selección, lo deshace y lo rehace con los mismos Set", async () => {
    const empty = selection().selectedNodeIds;
    selection().toggleNode("a");
    await flush();
    const withA = selection().selectedNodeIds;
    expect(history().past).toHaveLength(1);
    undo();
    expect(selection().selectedNodeIds).toBe(empty);
    redo();
    expect(selection().selectedNodeIds).toBe(withA);
  });

  it("lo que llega a la vez a los dos stores es un solo paso, y deshacerlo no registra nada más", async () => {
    filters().setHiddenNetworks(new Set(["red"]));
    selection().selectNodes(["a", "b"]);
    await flush();
    expect(history().past).toHaveLength(1);
    undo();
    await flush();
    expect(filters().hiddenNetworks.size).toBe(0);
    expect(selection().selectedNodeIds.size).toBe(0);
    expect(history().past).toHaveLength(0);
    expect(history().future).toHaveLength(1);
  });

  it("«Todas» con ninguna red oculta no es un paso", async () => {
    filters().setHiddenNetworks(new Set());
    await flush();
    expect(history().past).toHaveLength(0);
  });

  it("un cambio nuevo tras deshacer borra lo que se podía rehacer", async () => {
    selection().toggleNode("a");
    await flush();
    selection().toggleNode("b");
    await flush();
    undo();
    expect(history().future).toHaveLength(1);
    selection().toggleNode("c");
    await flush();
    expect(history().future).toHaveLength(0);
    redo();
    expect([...selection().selectedNodeIds]).toEqual(["a", "c"]);
  });

  it("no registra lo que él mismo restaura", async () => {
    selection().toggleNode("a");
    await flush();
    undo();
    await flush();
    expect(history().past).toHaveLength(0);
    expect(history().future).toHaveLength(1);
  });

  it("un arrastre del deslizador es un solo paso, que se registra al soltar", async () => {
    vi.useFakeTimers();
    setPointerHeld(true);
    for (const weight of [0.001, 0.002, 0.004]) {
      filters().setMinWeight(weight);
      await flush();
      vi.advanceTimersByTime(600);
    }
    expect(history().past).toHaveLength(0);
    setPointerHeld(false);
    expect(history().past).toHaveLength(1);
    undo();
    expect(filters().minWeight).toBe(0);
  });

  it("un arrastre que acaba donde empezó no es un paso, y no borra lo que se podía rehacer", async () => {
    selection().toggleNode("a");
    await flush();
    undo();
    setPointerHeld(true);
    filters().setMinWeight(0.004);
    await flush();
    filters().setMinWeight(0);
    await flush();
    setPointerHeld(false);
    expect(history().past).toHaveLength(0);
    expect(history().future).toHaveLength(1);
    expect(history().pendingFrom).toBeNull();
  });

  it("con el teclado, los cambios de peso a menos de 500 ms se juntan", async () => {
    vi.useFakeTimers();
    filters().setMinWeight(0.001);
    await flush();
    vi.advanceTimersByTime(300);
    filters().setMinWeight(0.002);
    await flush();
    vi.advanceTimersByTime(300);
    expect(history().past).toHaveLength(0);
    vi.advanceTimersByTime(300);
    expect(history().past).toHaveLength(1);
    filters().setMinWeight(0.004);
    await flush();
    vi.advanceTimersByTime(600);
    expect(history().past).toHaveLength(2);
    undo();
    expect(filters().minWeight).toBe(0.002);
  });

  it("un cambio de peso pendiente seguido de uno de la selección son dos pasos, en orden", async () => {
    vi.useFakeTimers();
    filters().setMinWeight(0.004);
    await flush();
    selection().toggleNode("a");
    await flush();
    expect(history().past).toHaveLength(2);
    undo();
    expect(selection().selectedNodeIds.size).toBe(0);
    expect(filters().minWeight).toBe(0.004);
    undo();
    expect(filters().minWeight).toBe(0);
  });

  it("deshacer con un cambio de peso sin registrar vuelve al valor de antes", async () => {
    vi.useFakeTimers();
    filters().setMinWeight(0.004);
    await flush();
    undo();
    expect(filters().minWeight).toBe(0);
  });

  it("al cambiar de atlas se vacía, y parte de lo que hay ahora", async () => {
    selection().toggleNode("a");
    await flush();
    resetHistory();
    expect(history().past).toHaveLength(0);
    expect(history().future).toHaveLength(0);
    undo();
    expect([...selection().selectedNodeIds]).toEqual(["a"]);
  });

  it(`guarda como mucho ${HISTORY_LIMIT} pasos`, async () => {
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      selection().toggleNode(`r${i}`);
      await flush();
    }
    expect(history().past).toHaveLength(HISTORY_LIMIT);
  });

  it("guarda el último paso para el aviso, y deshacer lo retira", async () => {
    selection().selectNodes(["a", "b", "c"]);
    await flush();
    selection().selectConnection("c1");
    await flush();
    expect(history().lastStep?.before.selectedNodeIds.size).toBe(3);
    expect(history().lastStep?.after.selectedConnectionId).toBe("c1");
    undo();
    expect(history().lastStep).toBeNull();
  });
});
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/state/history.test.ts`
Expected: FAIL, porque no existe `./history`.

- [ ] **Step 4: implementar `frontend/src/state/history.ts`**

```ts
// Historial de deshacer y rehacer (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.7). Guarda instantáneas de la
// selección y de los filtros. Se suscribe a sus dos stores, que son del
// desarrollador principal, sin cambiar su código ni su API, y las restaura
// con setState. No registra los cambios que provoca él mismo.
// - Los cambios que llegan en la misma tarea son un solo paso: «Resaltar»
//   una red oculta la muestra y la selecciona a la vez.
// - Un arrastre del deslizador de peso es un solo paso: se registra al
//   soltar el puntero (setPointerHeld). Con el teclado, los cambios de peso
//   que llegan a menos de 500 ms se juntan. Si el peso vuelve a donde
//   estaba, no hay paso.
// - Guarda los 50 últimos pasos.
// - App lo vacía al cambiar de atlas o de clasificación (resetHistory).
import { create } from "zustand";
import { changedKinds, type HistorySnapshot } from "../logic/historyStep";
import { useFiltersStore } from "./filters";
import { useSelectionStore } from "./selection";

export const HISTORY_LIMIT = 50;
export const WEIGHT_SETTLE_MS = 500;

interface HistoryState {
  // Instantáneas de antes de cada paso, de la más antigua a la más reciente.
  past: HistorySnapshot[];
  // El estado de los stores tal como se registró por última vez.
  present: HistorySnapshot;
  // Instantáneas de después de cada paso deshecho; la primera es la próxima.
  future: HistorySnapshot[];
  // Cambio de peso todavía sin registrar: la instantánea de antes.
  pendingFrom: HistorySnapshot | null;
  // Sube con cada cambio del historial. lastStep es el último paso
  // registrado, hasta el siguiente cambio: App decide con él si sale el
  // aviso con «Deshacer» (logic/historyStep.ts, stepNotice).
  version: number;
  lastStep: { before: HistorySnapshot; after: HistorySnapshot } | null;
}

function currentSnapshot(): HistorySnapshot {
  const { selectedNodeIds, selectedConnectionId } = useSelectionStore.getState();
  const { hiddenNetworks, hiddenConnectionTypes, minWeight } = useFiltersStore.getState();
  return { selectedNodeIds, selectedConnectionId, hiddenNetworks, hiddenConnectionTypes, minWeight };
}

export const useHistoryStore = create<HistoryState>(() => ({
  past: [],
  present: currentSnapshot(),
  future: [],
  pendingFrom: null,
  version: 0,
  lastStep: null,
}));

let restoring = false;
let batchScheduled = false;
let pointerHeld = false;
let settleTimer: ReturnType<typeof setTimeout> | undefined;

function bump(changes: Partial<HistoryState>) {
  useHistoryStore.setState((state) => ({ ...changes, version: state.version + 1 }));
}

// Registra el cambio de peso pendiente como un paso. Si el peso ha vuelto a
// donde estaba, no hay paso, y lo que se podía rehacer se conserva.
function commitPendingWeight() {
  clearTimeout(settleTimer);
  const { pendingFrom, present, past } = useHistoryStore.getState();
  if (pendingFrom === null) return;
  if (changedKinds(pendingFrom, present).length === 0) {
    bump({ pendingFrom: null, lastStep: null });
    return;
  }
  bump({
    past: [...past, pendingFrom].slice(-HISTORY_LIMIT),
    future: [],
    pendingFrom: null,
    lastStep: { before: pendingFrom, after: present },
  });
}

function settleWeight() {
  // Mientras el puntero sigue pulsado, el arrastre no ha terminado.
  if (!pointerHeld) commitPendingWeight();
}

function record(next: HistorySnapshot) {
  const { present, pendingFrom } = useHistoryStore.getState();
  const kinds = changedKinds(present, next);
  if (kinds.length === 0) return;
  if (kinds.length === 1 && kinds[0] === "weight") {
    // Deslizador: se junta con los cambios de peso que siguen.
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settleWeight, WEIGHT_SETTLE_MS);
    bump({ present: next, pendingFrom: pendingFrom ?? present, lastStep: null });
    return;
  }
  commitPendingWeight();
  const { past, present: before } = useHistoryStore.getState();
  bump({ past: [...past, before].slice(-HISTORY_LIMIT), present: next, future: [], lastStep: { before, after: next } });
}

function flushBatch() {
  if (!batchScheduled) return;
  batchScheduled = false;
  record(currentSnapshot());
}

function scheduleRecord() {
  if (restoring || batchScheduled) return;
  batchScheduled = true;
  queueMicrotask(flushBatch);
}

const unsubscribers = [useSelectionStore.subscribe(scheduleRecord), useFiltersStore.subscribe(scheduleRecord)];

// En desarrollo, al recargar este módulo en caliente, el módulo anterior
// deja de escuchar a los stores.
import.meta.hot?.dispose(() => {
  for (const unsubscribe of unsubscribers) unsubscribe();
});

// Pone en los stores una instantánea: los mismos Set y valores que tenían.
function apply(snapshot: HistorySnapshot) {
  restoring = true;
  try {
    useSelectionStore.setState({
      selectedNodeIds: snapshot.selectedNodeIds,
      selectedConnectionId: snapshot.selectedConnectionId,
    });
    useFiltersStore.setState({
      hiddenNetworks: snapshot.hiddenNetworks,
      hiddenConnectionTypes: snapshot.hiddenConnectionTypes,
      minWeight: snapshot.minWeight,
    });
  } finally {
    restoring = false;
  }
}

export function undo() {
  flushBatch();
  commitPendingWeight();
  const { past, present, future } = useHistoryStore.getState();
  const previous = past.at(-1);
  if (!previous) return;
  apply(previous);
  bump({ past: past.slice(0, -1), present: previous, future: [present, ...future], lastStep: null });
}

export function redo() {
  flushBatch();
  commitPendingWeight();
  const { past, present, future } = useHistoryStore.getState();
  const next = future[0];
  if (!next) return;
  apply(next);
  bump({ past: [...past, present].slice(-HISTORY_LIMIT), present: next, future: future.slice(1), lastStep: null });
}

// Vacía el historial: la instantánea de partida es lo que haya ahora en los
// stores. App lo llama al cambiar de atlas y cuando llega otra
// clasificación de redes.
export function resetHistory() {
  batchScheduled = false;
  clearTimeout(settleTimer);
  bump({ past: [], present: currentSnapshot(), future: [], pendingFrom: null, lastStep: null });
}

// Puntero pulsado o suelto sobre el deslizador de peso
// (useHistoryShortcuts): un arrastre se registra al soltar.
export function setPointerHeld(held: boolean) {
  pointerHeld = held;
  if (!held) commitPendingWeight();
}
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/state/history.test.ts`
Expected: PASS (13 pruebas).

- [ ] **Step 5: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
```

Expected: BASE + 107 pruebas en verde (222 con una BASE de 115). Lo demás, como antes. La aplicación todavía no importa el historial: lo hace la Task 10. Al importarse, el módulo se suscribe a los stores.

- [ ] **Step 6: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/logic/historyStep.ts frontend/src/logic/historyStep.test.ts frontend/src/state/history.ts frontend/src/state/history.test.ts
git commit -m "Estructura: historial de deshacer y rehacer

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 8: botones, teclado y aviso de deshacer

### Task 10: deshacer y rehacer en la interfaz

Spec 5.7, con el historial de la Task 9:
- Botones de icono ↶ «Deshacer» y ↷ «Rehacer» en la fila de selección de Filtros, junto a «N regiones seleccionadas · Limpiar», que es donde se arma el montaje. Llevan `aria-disabled` cuando no hay paso, una etiqueta emergente que describe el paso, también con el foco del teclado (como en la barra superior, con `data-tip`), y `aria-keyshortcuts`.
- Teclado: Ctrl+Z (⌘Z en macOS) deshace; Ctrl+Mayús+Z, ⌘Mayús+Z y Ctrl+Y rehacen. Un solo escuchador en `window`, activo en la vista Atlas aunque el panel de Filtros esté plegado, que se quita al salir. No actúa dentro de un campo de texto, con la tecla repetida por mantenerla pulsada, si otro ya atendió el evento (`defaultPrevented`) ni mientras está abierta una lista desplegable o el panel de Ajustes. Con un teclado sin letras latinas, mira la tecla física (`event.code`).
- Aviso con «Deshacer» cuando un paso quita dos o más regiones de la selección: un clic en una línea, «Resaltar» otra red o «Limpiar». Dice «Se sustituyó la selección de N regiones» o «Se vació la selección de N regiones», y N cuenta solo las regiones del atlas que se está viendo. Usa la cola de avisos de la Task 3 con la clave `deshacer`:
  - No lleva rol. Su texto lo anuncia una región viva (`aria-live="polite"`), oculta y siempre presente, para que no se lea dos veces. Los demás avisos, como los errores, siguen con `role="alert"`.
  - No toma el foco. Se va solo a los 8 s, pero el tiempo se para mientras tiene el ratón encima o el foco; y se va con el siguiente cambio del historial.
  - Tras usar su «Deshacer», o al cerrarlo, el foco va al botón ↶ si se ve, y si no (con Filtros plegado), al título de la vista grande. Nunca a «Importar».
- El historial se vacía al cambiar de atlas (`handleChangeAtlas`) y cuando llegan los datos de otra clasificación de redes: un efecto sobre la clasificación cargada (`source.networkSource`), no sobre la elegida. El menú de redes no cambia.

**Files:**
- Modify: `frontend/src/logic/toastQueue.ts`, `frontend/src/components/Toast.tsx` y `frontend/src/components/Toast.test.tsx` (avisos sin rol con región viva, con acción y que se van solos)
- Create: `frontend/src/components/HistoryButtons.tsx`, `frontend/src/components/useHistoryShortcuts.ts`
- Test: `frontend/src/components/HistoryButtons.test.tsx`
- Modify: `frontend/src/components/FilterPanel.tsx` (prop `historyControls` y fila de selección)
- Modify: `frontend/src/App.tsx` (imports, constantes, `handleChangeAtlas`, atajos, historial al llegar otra clasificación, aviso y panel de filtros)
- Modify: `frontend/src/App.css` (botones y acción del aviso)

- [ ] **Step 1: avisos con región viva, acción y tiempo**

1. En `frontend/src/components/Toast.test.tsx`, la prueba «sin avisos no pinta nada» pasa a ser esta, porque la región viva está siempre:

   ```tsx
     it("sin avisos solo pinta la región viva, vacía", () => {
       expect(renderToStaticMarkup(<ToastRegion toasts={[]} onDismiss={noop} />)).toBe(
         '<div class="visually-hidden" aria-live="polite"></div>',
       );
     });
   ```

   Y justo antes de la de «Detalles», añade esta:

   ```tsx
     it("un aviso discreto no lleva rol: lo anuncia la región viva, y puede llevar una acción", () => {
       const html = renderToStaticMarkup(
         <ToastRegion
           toasts={[{ key: "deshacer", tone: "info", polite: true, message: "Se vació la selección de 3 regiones", action: { label: "Deshacer", run: noop } }]}
           onDismiss={noop}
         />,
       );
       expect(html).toContain('<div class="visually-hidden" aria-live="polite"><span>Se vació la selección de 3 regiones</span></div>');
       expect(html).not.toContain("role=");
       expect(html).toContain('<button type="button" class="toast__action">Deshacer</button>');
     });
   ```

   Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/components/Toast.test.tsx`
   Expected: FAIL: `ToastEntry` no admite `polite` ni `action` (lo dice `tsc`), no hay región viva y el aviso sale con `role="alert"`.

2. En `frontend/src/logic/toastQueue.ts`, sustituye la interfaz `ToastContent` por:

   ```ts
   // Un botón con una acción, además de «Entendido»: el «Deshacer» del aviso
   // de deshacer (spec 5.7).
   export interface ToastAction {
     label: string;
     run: () => void;
   }

   export interface ToastContent {
     tone: ToastTone;
     // Mensaje comprensible, a la vista.
     message: string;
     // Texto técnico completo, en «Detalles».
     details?: string;
     // Un aviso discreto, como el de deshacer, no interrumpe: no lleva
     // role="alert", y su texto lo anuncia la región viva de ToastRegion
     // (aria-live="polite").
     polite?: boolean;
     action?: ToastAction;
     // Se va solo pasado este tiempo, salvo mientras tiene el ratón encima o
     // el foco. stamp distingue un aviso nuevo del anterior del mismo origen:
     // con él, el tiempo vuelve a empezar y el texto se vuelve a anunciar.
     autoDismissMs?: number;
     stamp?: number;
     // Adónde va el foco tras usar su acción, o al cerrarlo si es el último
     // aviso, en lugar de volver a «Importar».
     returnFocus?: () => void;
   }
   ```

3. Sustituye `frontend/src/components/Toast.tsx` entero por lo de abajo. El tiempo lo lleva cada aviso: se para con el ratón encima (`mouseenter`) o con el foco dentro (`focus` y `blur`, que en React burbujean), y vuelve a empezar al salir o con un aviso nuevo del mismo origen (`stamp`). La región viva lleva un `<span>` por aviso con la misma clave y el mismo `stamp`: con un aviso nuevo se monta otro, y se vuelve a anunciar aunque el texto sea el mismo.

   ```tsx
   // Avisos flotantes (D4 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md,
   // 5.6). Sustituyen a las franjas rojas fijas de App.tsx. Van arriba a la
   // derecha, bajo la barra y sobre la columna derecha, sin tapar la vista
   // grande. Cada aviso es role="alert", con un mensaje comprensible y, si lo
   // hay, el texto técnico completo en «Detalles», y se queda hasta que se
   // cierra. Los discretos (polite), como el aviso con «Deshacer» (5.7), no
   // llevan rol: su texto lo anuncia una región viva siempre presente. Pueden
   // llevar un botón de acción e irse solos.
   import { useEffect, useLayoutEffect, useRef, useState } from "react";
   import type { ToastEntry } from "../logic/toastQueue";
   import { Icon } from "./Icon";

   export function Toast({
     toast,
     onDismiss,
     onAction,
     onExpire,
   }: {
     toast: ToastEntry;
     onDismiss: () => void;
     onAction?: () => void;
     // Se ha ido solo (autoDismissMs): no mueve el foco.
     onExpire?: () => void;
   }) {
     // Mientras tiene el ratón encima o el foco dentro, el tiempo no corre; al
     // salir, vuelve a empezar.
     const [hovered, setHovered] = useState(false);
     const [focused, setFocused] = useState(false);
     const expireRef = useRef(onExpire);
     useEffect(() => {
       expireRef.current = onExpire;
     });
     useEffect(() => {
       if (toast.autoDismissMs === undefined || hovered || focused) return;
       const timer = setTimeout(() => expireRef.current?.(), toast.autoDismissMs);
       return () => clearTimeout(timer);
     }, [toast.autoDismissMs, toast.stamp, hovered, focused]);

     return (
       <div
         className={`toast toast--${toast.tone}`}
         role={toast.polite ? undefined : "alert"}
         data-toast-key={toast.key}
         onMouseEnter={() => setHovered(true)}
         onMouseLeave={() => setHovered(false)}
         onFocus={() => setFocused(true)}
         onBlur={(event) => {
           if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
         }}
       >
         <Icon name={toast.tone === "error" ? "alert" : "info"} size={18} className="toast__icon" />
         <div className="toast__body">
           <p className="toast__message">{toast.message}</p>
           {toast.details && (
             <details className="toast__details">
               <summary>Detalles</summary>
               <pre>{toast.details}</pre>
             </details>
           )}
           <div className="toast__buttons">
             {toast.action && (
               <button type="button" className="toast__action" onClick={onAction}>
                 {toast.action.label}
               </button>
             )}
             <button type="button" className="toast__close" onClick={onDismiss}>
               Entendido
             </button>
           </div>
         </div>
       </div>
     );
   }

   // Al cerrar un aviso con «Entendido», el foco pasa al «Entendido» del
   // siguiente (o del anterior, si era el último). Si no queda ninguno, va
   // adonde diga el aviso (returnFocus) o, si no dice nada, adonde decida quien
   // pinta la región (onEmptied): App lo devuelve a «Importar». Tras usar la
   // acción de un aviso, va siempre adonde diga el aviso. Sin esto, el foco
   // caería en la página, porque el botón desaparece. Un aviso que se va solo
   // no mueve el foco.
   export function ToastRegion({
     toasts,
     onDismiss,
     onEmptied,
   }: {
     toasts: readonly ToastEntry[];
     onDismiss: (key: string) => void;
     onEmptied?: () => void;
   }) {
     const regionRef = useRef<HTMLDivElement>(null);
     const focusAfterDismiss = useRef<string | null>(null);

     useLayoutEffect(() => {
       const key = focusAfterDismiss.current;
       if (key === null) return;
       focusAfterDismiss.current = null;
       const toast = [...(regionRef.current?.querySelectorAll<HTMLElement>(".toast") ?? [])].find(
         (element) => element.dataset.toastKey === key,
       );
       toast?.querySelector<HTMLButtonElement>(".toast__close")?.focus();
     });

     const leave = (index: number, runAction: boolean) => {
       const toast = toasts[index];
       const next = toasts[index + 1] ?? toasts[index - 1];
       if (runAction) toast.action?.run();
       onDismiss(toast.key);
       if (next && !runAction) focusAfterDismiss.current = next.key;
       else (toast.returnFocus ?? onEmptied)?.();
     };

     return (
       <>
         {/* Región viva de los avisos discretos: siempre presente, para que el
             lector de pantalla anuncie el texto cuando cambia. */}
         <div className="visually-hidden" aria-live="polite">
           {toasts
             .filter((toast) => toast.polite)
             .map((toast) => (
               <span key={`${toast.key}-${toast.stamp ?? 0}`}>{toast.message}</span>
             ))}
         </div>
         {toasts.length > 0 && (
           <div ref={regionRef} className="toast-region">
             {toasts.map((toast, index) => (
               <Toast
                 key={toast.key}
                 toast={toast}
                 onDismiss={() => leave(index, false)}
                 onAction={() => leave(index, true)}
                 onExpire={() => onDismiss(toast.key)}
               />
             ))}
           </div>
         )}
       </>
     );
   }
   ```

   Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/components/Toast.test.tsx`
   Expected: PASS (4 pruebas).

- [ ] **Step 2: botones y teclado**

`frontend/src/components/HistoryButtons.test.tsx`. Con `renderToStaticMarkup`, zustand da el estado inicial del historial, sin pasos: un botón con un paso se prueba con `HistoryButtonsView`, que recibe el estado de los botones. Lo que dice cada paso ya lo prueba `historyButtons` (Task 9).

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HistoryButtons, HistoryButtonsView } from "./HistoryButtons";

const noop = () => {};

describe("HistoryButtons", () => {
  it("sin pasos, los dos botones llevan aria-disabled y lo dicen en su etiqueta emergente", () => {
    // Con renderToStaticMarkup, zustand da el estado inicial del historial:
    // sin pasos.
    const html = renderToStaticMarkup(<HistoryButtons nodes={[]} connections={[]} />);
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(html).toContain('data-tip="Nada que deshacer"');
    expect(html).toContain('data-tip="Nada que rehacer"');
  });

  it("con un paso, su botón lo describe; los dos declaran sus atajos de teclado", () => {
    const html = renderToStaticMarkup(
      <HistoryButtonsView
        undo={{ enabled: true, tip: "Deshacer: añadir IFJa (der.) a la selección" }}
        redo={{ enabled: false, tip: "Nada que rehacer" }}
        onUndo={noop}
        onRedo={noop}
      />,
    );
    expect(html).toContain(
      'aria-label="Deshacer" aria-disabled="false" aria-keyshortcuts="Control+Z Meta+Z" title="Deshacer: añadir IFJa (der.) a la selección" data-tip="Deshacer: añadir IFJa (der.) a la selección"',
    );
    expect(html).toContain('aria-label="Rehacer" aria-disabled="true" aria-keyshortcuts="Control+Shift+Z Control+Y Meta+Shift+Z"');
  });
});
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/components/HistoryButtons.test.tsx`
Expected: FAIL, porque no existe `./HistoryButtons`.

`frontend/src/components/HistoryButtons.tsx`:

```tsx
// Deshacer y rehacer (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.7): dos botones de icono en la fila
// de selección de Filtros, donde se arma el montaje. Su etiqueta emergente
// describe el paso (logic/historyStep.ts, historyButtons), también con el
// foco del teclado (data-tip, en App.css). Sin paso, llevan aria-disabled y
// no hacen nada. El teclado lo atiende useHistoryShortcuts, desde App.
import { useMemo, type Ref } from "react";
import { historyButtons, type HistoryButtonState } from "../logic/historyStep";
import { redo, undo, useHistoryStore } from "../state/history";
import type { GraphConnection, GraphNode } from "../types/domain";
import { Icon } from "./Icon";

// Los botones sin el historial: se prueban con cualquier estado.
export function HistoryButtonsView({
  undo: undoButton,
  redo: redoButton,
  onUndo,
  onRedo,
  undoRef,
}: {
  undo: HistoryButtonState;
  redo: HistoryButtonState;
  onUndo: () => void;
  onRedo: () => void;
  // App devuelve aquí el foco tras el «Deshacer» del aviso.
  undoRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <span className="history">
      <button
        ref={undoRef}
        type="button"
        className="history__btn"
        aria-label="Deshacer"
        aria-disabled={!undoButton.enabled}
        aria-keyshortcuts="Control+Z Meta+Z"
        title={undoButton.tip}
        data-tip={undoButton.tip}
        onClick={onUndo}
      >
        <Icon name="undo" size={14} />
      </button>
      <button
        type="button"
        className="history__btn"
        aria-label="Rehacer"
        aria-disabled={!redoButton.enabled}
        aria-keyshortcuts="Control+Shift+Z Control+Y Meta+Shift+Z"
        title={redoButton.tip}
        data-tip={redoButton.tip}
        onClick={onRedo}
      >
        <Icon name="redo" size={14} />
      </button>
    </span>
  );
}

export function HistoryButtons({
  nodes,
  connections,
  undoRef,
}: {
  nodes: readonly GraphNode[];
  connections: readonly GraphConnection[];
  undoRef?: Ref<HTMLButtonElement>;
}) {
  const past = useHistoryStore((state) => state.past);
  const present = useHistoryStore((state) => state.present);
  const future = useHistoryStore((state) => state.future);
  const pendingFrom = useHistoryStore((state) => state.pendingFrom);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  // La conexión se busca solo si el paso la nombra.
  const buttons = historyButtons(
    { past, present, future, pendingFrom },
    { nodeById, findConnection: (id) => connections.find((connection) => connection.id === id) },
  );
  return <HistoryButtonsView undo={buttons.undo} redo={buttons.redo} onUndo={undo} onRedo={redo} undoRef={undoRef} />;
}
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/components/HistoryButtons.test.tsx`
Expected: PASS (2 pruebas).

`frontend/src/components/useHistoryShortcuts.ts`. Es un `.ts` y no un `.tsx`: un archivo de componentes que exporta un hook haría avisar a oxlint (`only-export-components`). Solo cuenta el puntero pulsado sobre un deslizador (`input type="range"`): un clic en otro sitio no deja un arrastre a medias.

```ts
// Atajos del historial de deshacer (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.7): un solo escuchador de teclado en
// window, activo en la vista Atlas aunque el panel de Filtros esté
// plegado. Ctrl+Z (⌘Z) deshace; Ctrl+Mayús+Z y Ctrl+Y rehacen; dentro de un
// campo de texto no hace nada (logic/historyStep.ts, historyShortcut).
// Tampoco mientras está abierta una lista desplegable o el panel de
// Ajustes, que atienden su propio teclado. Avisa además al historial de
// cuándo se pulsa y se suelta el puntero sobre el deslizador de peso: un
// arrastre es un solo paso.
import { useEffect } from "react";
import { historyShortcut } from "../logic/historyStep";
import { redo, setPointerHeld, undo } from "../state/history";

// La lista del contexto de datos (DataContextMenu) y el panel de Ajustes
// (SettingsMenu) solo están en la página mientras están abiertos.
const OPEN_POPUP = '[role="listbox"], .settings__panel';

export function useHistoryShortcuts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector(OPEN_POPUP)) return;
      const action = historyShortcut(event, event.target instanceof HTMLElement ? event.target : null);
      if (action === null) return;
      event.preventDefault();
      if (action === "undo") undo();
      else redo();
    };
    // Solo cuenta el puntero pulsado sobre un deslizador.
    let held = false;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof HTMLInputElement) || event.target.type !== "range") return;
      held = true;
      setPointerHeld(true);
    };
    // También si el puntero se suelta fuera de la ventana: al perder el foco.
    const onRelease = () => {
      if (!held) return;
      held = false;
      setPointerHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onRelease, true);
    window.addEventListener("pointercancel", onRelease, true);
    window.addEventListener("blur", onRelease);
    return () => {
      onRelease();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onRelease, true);
      window.removeEventListener("pointercancel", onRelease, true);
      window.removeEventListener("blur", onRelease);
    };
  }, [enabled]);
}
```

- [ ] **Step 3: los botones en `frontend/src/components/FilterPanel.tsx`**

El panel no sabe nada del historial: App le pasa los botones en una prop nueva, `historyControls`.

1. En la interfaz `FilterPanelProps`, tras `connectionTotals: { visible: number; loaded: number };`, añade:

   ```ts
     // Deshacer y rehacer (D4; spec 5.7): los botones los pinta App
     // (HistoryButtons), junto a «Limpiar». El panel no sabe nada del
     // historial.
     historyControls?: ReactNode;
   ```

2. La firma pasa a:

   ```tsx
   export function FilterPanel({
     nodes,
     onCollapse,
     connectionCountsByType,
     connectionTotals,
     historyControls,
   }: FilterPanelProps) {
   ```

3. En la fila `<div className="filters__selection">`, el botón «Limpiar» entero pasa a ir dentro de un `<span className="filters__selection-actions">`, seguido de `{historyControls}`:

   ```tsx
           <span className="filters__selection-actions">
             <button
               type="button"
               className="filters__text-btn filters__text-btn--strong"
               disabled={!hasSelection}
               title="Quita el resaltado actual (nodos o conexión seleccionada) en las tres vistas"
               onClick={clearNodeSelection}
             >
               Limpiar
             </button>
             {historyControls}
           </span>
   ```

- [ ] **Step 4: `frontend/src/App.tsx`**

1. **Imports.**
   - Tras `import { ToastRegion } from "./components/Toast";` añade:

     ```ts
     import { HistoryButtons } from "./components/HistoryButtons";
     import { useHistoryShortcuts } from "./components/useHistoryShortcuts";
     ```

   - Tras `import { countConnections, type ConnectionCounts } from "./logic/filterCounts";` añade `import { stepNotice } from "./logic/historyStep";`.
   - Tras `import { useFiltersStore } from "./state/filters";` añade `import { resetHistory, undo, useHistoryStore } from "./state/history";`.

2. **Constantes.** Tras `const NETWORK_TOAST = "redes";` añade:

   ```ts
   // Aviso con «Deshacer» (D4; spec 5.7): se va solo a los 8 s.
   const UNDO_TOAST = "deshacer";
   const UNDO_NOTICE_MS = 8000;
   ```

3. **Cambio de atlas.** Al final de `handleChangeAtlas`, tras `    setSource({ kind: "loading" });`, añade:

   ```tsx
       // D4 (spec 5.7): el atlas nuevo empieza con el historial de deshacer
       // vacío. App no vacía la selección al cambiar de atlas (los ids del
       // anterior se quedan en el store y las vistas los ignoran), así que la
       // instantánea de partida es la selección tal como queda.
       resetHistory();
   ```

4. **Atajos, clasificación y aviso.** Justo después de `toggleFilters` (Task 4), antes de `const selectedAtlas = …` y de cualquier `return`, añade lo de abajo. El menú de redes no cambia: el historial se vacía cuando llega la clasificación nueva, y si falla, `source.networkSource` no cambia y el historial se queda. El efecto corre también al montar App, con el historial vacío.

   ```tsx
     // Deshacer y rehacer con el teclado, en la vista Atlas (D4 de
     // docs/decisiones-diseno.md; spec 5.7).
     useHistoryShortcuts(view === "atlas");

     // Con otra clasificación de redes, las redes guardadas en el historial
     // dejan de valer (spec 5.7). Se vacía cuando llega, no al elegirla:
     // mientras carga se sigue viendo la anterior, y si falla, se queda.
     const loadedNetworkSource = source.kind === "real" ? source.networkSource : null;
     useEffect(() => {
       resetHistory();
     }, [loadedNetworkSource]);

     // Aviso con «Deshacer» (spec 5.7): sale cuando un paso quita dos o más
     // regiones de la selección (logic/historyStep.ts, stepNotice). Su texto lo
     // anuncia la región viva de ToastRegion, sin mover el foco. Se va solo a
     // los 8 s, salvo mientras tiene el ratón encima o el foco, y con el
     // siguiente cambio del historial.
     const undoButtonRef = useRef<HTMLButtonElement>(null);
     useEffect(() => {
       const loadedIds = new Set(source.kind === "loading" ? [] : source.nodes.map((node) => node.id));
       // Tras el «Deshacer» del aviso, el foco va al botón ↶ si se ve (con
       // Filtros plegado no está), y si no, al título de la vista grande.
       // Nunca a «Importar».
       const focusAfterUndo = () => {
         const button = undoButtonRef.current;
         if (button && button.getClientRects().length > 0) button.focus();
         else document.querySelector<HTMLElement>(".ws-view--main .ws-view__header h2")?.focus();
       };
       return useHistoryStore.subscribe((state, previous) => {
         if (state.version === previous.version) return;
         const notice = state.lastStep && stepNotice(state.lastStep.before, state.lastStep.after, (id) => loadedIds.has(id));
         if (!notice) {
           // Si el foco estaba en el aviso, no se pierde con él.
           if (document.activeElement?.closest(`[data-toast-key="${UNDO_TOAST}"]`)) focusAfterUndo();
           setToasts((queue) => dismissToast(queue, UNDO_TOAST));
           return;
         }
         setToasts((queue) =>
           showToast(queue, UNDO_TOAST, {
             tone: "info",
             polite: true,
             message: notice,
             action: { label: "Deshacer", run: undo },
             autoDismissMs: UNDO_NOTICE_MS,
             stamp: state.version,
             returnFocus: focusAfterUndo,
           }),
         );
       });
     }, [source]);
   ```

   El «Deshacer» del aviso deshace el último paso, que es el suyo: cualquier cambio posterior del historial ya ha retirado el aviso. Las regiones cargadas salen de `source`, y el efecto se vuelve a suscribir cuando cambia.

5. **Panel de filtros.** En el `<FilterPanel … />` del espacio de trabajo, tras la prop `connectionTotals`, añade:

   ```tsx
                 historyControls={
                   <HistoryButtons nodes={source.nodes} connections={source.connections} undoRef={undoButtonRef} />
                 }
   ```

- [ ] **Step 5: estilos en `frontend/src/App.css`**

Añade al final del archivo:

```css

/* Deshacer y rehacer (spec 5.7), en la fila de selección de Filtros. Con
   el foco del teclado, la etiqueta emergente (data-tip) se ve también:
   hacia la izquierda y como mucho de 12rem, para no salirse del panel. */
.filters__selection { flex-wrap: wrap; }
.filters__selection-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.history { display: inline-flex; gap: 2px; }
.history__btn { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: none; border-radius: 6px; background: transparent; color: var(--text-h); cursor: pointer; }
.history__btn:hover:not([aria-disabled="true"]) { background: var(--hover); }
.history__btn[aria-disabled="true"] { color: var(--text-faint); cursor: default; }
.history__btn:focus-visible::after { content: attr(data-tip); position: absolute; top: calc(100% + 6px); right: 0; z-index: 30; width: max-content; max-width: 12rem; padding: 4px 8px; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--panel-bg); box-shadow: var(--shadow); color: var(--text-h); font-size: 0.7rem; font-weight: 500; line-height: 1.35; text-align: left; white-space: normal; pointer-events: none; }
/* Botón de acción de un aviso, como «Deshacer». */
.toast__action { height: 30px; padding: 0 10px; border: 1px solid var(--accent-border); border-radius: 8px; background: var(--accent-bg); color: var(--text-h); font: inherit; font-size: 0.7rem; font-weight: 600; cursor: pointer; }
.toast__action:hover { border-color: var(--accent); }
```

- [ ] **Step 6: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/App.css src/components/Toast.tsx src/components/HistoryButtons.tsx
```

Expected: BASE + 110 pruebas en verde (225 con una BASE de 115). El `grep`, como en la Task 4. Lo demás, como antes. En la aplicación real lo comprueba la Task 12.

- [ ] **Step 7: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/logic/toastQueue.ts frontend/src/components/Toast.tsx frontend/src/components/Toast.test.tsx frontend/src/components/HistoryButtons.tsx frontend/src/components/HistoryButtons.test.tsx frontend/src/components/useHistoryShortcuts.ts frontend/src/components/FilterPanel.tsx frontend/src/App.tsx frontend/src/App.css
git commit -m "Estructura: deshacer y rehacer en Filtros, con teclado y aviso

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 9: buscador de regiones

### Task 11: buscador de regiones

Spec 5.8 (commit `1f524db`), petición de la usuaria: con 360 regiones en el círculo, es muy difícil localizar a ojo una región como TE1m.
- Un campo con autocompletado en Filtros, justo encima de la selección (5.3), con el patrón *combobox*: el campo (`role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-activedescendant` y, mientras la lista está abierta, `aria-controls`) y su lista (`role="listbox"`). Las teclas de la lista son las de la lista del contexto de datos (`logic/listbox.ts`, Task 1). La sugerencia activa lleva el contorno del color de acento y se desplaza a la vista al moverse con el teclado, como en `DataContextMenu` tras su revisión (commit `fdfd932`). El ratón también la cambia, pero no desplaza la lista.
- Busca en la abreviatura y en el nombre completo, sin distinguir mayúsculas ni tildes. Las abreviaturas que llevan el lado (Brainnetome, Gordon) se buscan y se ordenan sin él. Orden: abreviatura exacta, abreviatura que empieza por lo escrito, abreviatura que lo contiene y nombre que lo contiene; a igualdad, por abreviatura, con los números en su orden, y por lado. Como mucho, 8 sugerencias.
- Solo sugiere regiones de redes visibles. Si lo escrito solo está en redes ocultas, o si la abreviatura exacta solo está en redes ocultas aunque haya otras sugerencias, lo dice en una línea bajo el campo («TE1m está en la red Auditiva, que está oculta.») con «Mostrar la red», o «Mostrar las redes» si son varias. Los botones llaman a `toggleNetwork` del store de filtros.
- Cada sugerencia lleva el color de su red con el anillo neutro, la abreviatura con su lado cuando no lo lleva, el nombre sin «(hemisferio …)» y «seleccionada» si ya lo está. Los nombres salen de `regionNameWithSide` y `regionTitleParts` (Tasks 6 y 8).
- Elegir una región llama a `addNodes([id])` del store de selección, que no cambia, así que el historial (Task 9) la registra y se puede deshacer. El campo se vacía y conserva el foco. Si ya estaba seleccionada, no cambia nada.
- Ctrl+K (⌘K en macOS) lleva el foco al buscador desde cualquier sitio de la vista Atlas, y despliega Filtros si está plegado. Sigue el diseño de los atajos de la Task 10: un escuchador en `window`, la decisión en una función pura, la misma guarda de los campos de texto (`isTextEntry`, que esta tarea saca de `logic/historyStep.ts`) y nada mientras está abierta otra lista desplegable o el panel de Ajustes.
- Detalles que el spec no fija: la desviación 16.

Las Tasks 1 a 10 ya están escritas (la 1 y la 2, también hechas), y esta parte de lo que dejan. Toca código de cinco de ellas, con sus propios pasos: `logic/clipboard.ts` (Task 7), `logic/displayText.ts` (Task 8), `logic/historyStep.ts` (Task 9), `FilterPanel.tsx` (Tasks 4 y 10) y `App.tsx` (Tasks 4 y 10).

**Files:**
- Modify: `frontend/src/logic/historyStep.ts` (exporta `ShortcutTarget` e `isTextEntry`), `frontend/src/logic/clipboard.ts` (`shortcutLabel`) y `frontend/src/logic/displayText.ts` (exporta `SIDE_IN_ABBREVIATION`)
- Create: `frontend/src/logic/regionSearch.ts`, `frontend/src/components/RegionSearch.tsx` y `frontend/src/components/useRegionSearchShortcut.ts`
- Test: `frontend/src/logic/regionSearch.test.ts` y `frontend/src/components/RegionSearch.test.tsx`
- Modify: `frontend/src/components/FilterPanel.tsx` (el buscador, sobre la selección), `frontend/src/App.tsx` (import y Ctrl+K) y `frontend/src/App.css` (el buscador, al final)

- [ ] **Step 1: lo que el buscador comparte con tareas anteriores**

Tres cambios pequeños, sin cambiar lo que hacen:

1. En `frontend/src/logic/historyStep.ts` (Task 9), los dos atajos, el del historial y el del buscador, no actúan donde se escribe:
   - El comentario `// Tipos de <input> en los que se escribe: ahí Ctrl+Z es del campo.` pasa a decir «ahí los atajos de teclado son del campo», en dos líneas si hace falta.

   - Justo después de la línea `const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "number", "password", "tel", "url"]);` añade:

     ```ts

     // Dónde está el foco cuando llega un atajo de teclado.
     export interface ShortcutTarget {
       tagName: string;
       type?: string;
       isContentEditable?: boolean;
     }

     // Si el foco está donde se escribe: ahí los atajos de teclado son del campo.
     // La comparten los del historial y el del buscador de regiones (5.8).
     export function isTextEntry(target: ShortcutTarget | null): boolean {
       return (
         target !== null &&
         (target.isContentEditable === true ||
           target.tagName === "TEXTAREA" ||
           (target.tagName === "INPUT" && TEXT_INPUT_TYPES.has(target.type ?? "text")))
       );
     }
     ```

   - En `historyShortcut`, el parámetro `target: { tagName: string; type?: string; isContentEditable?: boolean } | null,` pasa a `target: ShortcutTarget | null,`, y en su cuerpo, el `if (target && (target.isContentEditable || …)) { return null; }` de diez líneas, el único que mira si el foco está donde se escribe, pasa a `  if (isTextEntry(target)) return null;`.

2. En `frontend/src/logic/clipboard.ts` (Task 7), el atajo de copiar y el del buscador se escriben igual en cada sistema. Justo antes del comentario de `copyShortcutLabel` añade lo de abajo, y el cuerpo de `copyShortcutLabel` pasa a `  return shortcutLabel("C", userAgent);`.

   ```ts
   // Cómo se escribe un atajo de teclado en cada sistema: «⌘C» en macOS y
   // «Ctrl+C» en los demás. Lo usan el ID científico y el buscador de
   // regiones (Ctrl+K, logic/regionSearch.ts).
   export function shortcutLabel(key: string, userAgent: string): string {
     return /Mac/i.test(userAgent) ? `⌘${key}` : `Ctrl+${key}`;
   }

   ```

3. En `frontend/src/logic/displayText.ts` (Task 8), `const SIDE_IN_ABBREVIATION = /^[lr]_|_[lr]$/i;` pasa a `export const SIDE_IN_ABBREVIATION = /^[lr]_|_[lr]$/i;`: el buscador busca y ordena esas abreviaturas sin el lado.

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/historyStep.test.ts src/logic/clipboard.test.ts src/logic/displayText.test.ts`
Expected: PASS (38 pruebas): nada cambia de comportamiento.

- [ ] **Step 2: escribir las pruebas de `logic/regionSearch.ts`**

`frontend/src/logic/regionSearch.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { GraphNode } from "../types/domain";
import {
  SEARCH_LIMIT,
  defaultActiveIndex,
  normalizeSearch,
  regionSearchShortcut,
  searchKey,
  searchRegions,
  searchShortcutLabel,
} from "./regionSearch";

const AUDITORY = "cole-anticevic.auditory";
const VISUAL = "cole-anticevic.visual";
const FRONTOPARIETAL = "cole-anticevic.frontoparietal";
const DEFAULT = "cole-anticevic.default";

// Regiones con el nombre que da la ingesta: el completo y, al final, su
// hemisferio.
function region(id: string, abbreviation: string | null, hemisphere: "L" | "R" | null, name: string, network = AUDITORY): GraphNode {
  const side = hemisphere === "L" ? " (hemisferio izquierdo)" : hemisphere === "R" ? " (hemisferio derecho)" : "";
  return { id, label: `${name}${side}`, abbreviation, hemisphere, network, position3d: [0, 0, 0], referenceSpace: null };
}

const NODES = [
  region("r_te1m", "TE1m", "R", "Area TE1 Middle"),
  region("a5", "A5", "L", "Auditory 5 Complex next to TE1"),
  region("l_pte1", "PTE1", "L", "Area PTE1"),
  region("l_te1m", "TE1m", "L", "Area TE1 Middle"),
  region("l_te1a", "TE1a", "L", "Area TE1 anterior"),
  region("l_te1", "TE1", "L", "Area TE1"),
  region("l_v1", "V1", "L", "Primary Visual Cortex", VISUAL),
];
const NONE_HIDDEN = new Set<string>();

const labels = (query: string, hidden: ReadonlySet<string> = NONE_HIDDEN, nodes = NODES) =>
  searchRegions(nodes, query, hidden).suggestions.map((suggestion) => suggestion.label);

describe("searchRegions", () => {
  it("ordena: abreviatura exacta, que empieza por lo escrito, que lo contiene y nombre que lo contiene", () => {
    expect(labels("te1")).toEqual(["TE1 (izq.)", "TE1a (izq.)", "TE1m (izq.)", "TE1m (der.)", "PTE1 (izq.)", "A5 (izq.)"]);
  });

  it("no distingue mayúsculas ni tildes, ni en lo escrito ni en el nombre", () => {
    expect(normalizeSearch("  Área   TE1m ")).toBe("area te1m");
    expect(labels("ÁREA te1 MIDDLE")).toEqual(["TE1m (izq.)", "TE1m (der.)"]);
    expect(labels("area de", NONE_HIDDEN, [region("x1", "X1", "L", "Área de prueba")])).toEqual(["X1 (izq.)"]);
  });

  it(`sugiere como mucho ${SEARCH_LIMIT} regiones`, () => {
    const many = Array.from({ length: 12 }, (_, i) => region(`r${i}`, `R${i}`, "L", `Región ${i}`));
    expect(labels("r", NONE_HIDDEN, many)).toHaveLength(SEARCH_LIMIT);
  });

  it("cada sugerencia lleva el nombre sin «(hemisferio …)», y el lado solo si la abreviatura no lo lleva", () => {
    expect(searchRegions(NODES, "te1m", NONE_HIDDEN).suggestions).toEqual([
      { id: "l_te1m", label: "TE1m (izq.)", name: "Area TE1 Middle", network: AUDITORY },
      { id: "r_te1m", label: "TE1m (der.)", name: "Area TE1 Middle", network: AUDITORY },
    ]);
    expect(labels("brain", NONE_HIDDEN, [region("bs", "BS", null, "Brain Stem")])).toEqual(["BS"]);
  });

  it("las abreviaturas con el lado se buscan y se ordenan sin él, con los números en su orden: el par queda junto", () => {
    const brainnetome = [
      region("sfg_10_1_l", "L_SFG_10_1", "L", "Superior frontal gyrus, area 10"),
      region("sfg_7_2_r", "R_SFG_7_2", "R", "Superior frontal gyrus, area 7"),
      region("sfg_7_1_r", "R_SFG_7_1", "R", "Superior frontal gyrus, area 7"),
      region("sfg_7_2_l", "L_SFG_7_2", "L", "Superior frontal gyrus, area 7"),
      region("sfg_7_1_l", "L_SFG_7_1", "L", "Superior frontal gyrus, area 7"),
    ];
    expect(labels("sfg", NONE_HIDDEN, brainnetome)).toEqual(["L_SFG_7_1", "R_SFG_7_1", "L_SFG_7_2", "R_SFG_7_2", "L_SFG_10_1"]);
    expect(labels("l_sfg_7_1", NONE_HIDDEN, brainnetome)).toEqual(["L_SFG_7_1"]);
    const gordon = [region("g12", "l_default_12", "L", "Default 12"), region("g2", "l_default_2", "L", "Default 2")];
    expect(labels("default", NONE_HIDDEN, gordon)).toEqual(["l_default_2", "l_default_12"]);
  });

  it("solo sugiere regiones de redes visibles", () => {
    expect(labels("1", new Set([AUDITORY]))).toEqual(["V1 (izq.)"]);
  });

  it("si lo escrito solo está en redes ocultas, lo dice y nombra la red", () => {
    expect(searchRegions(NODES, "te1m", new Set([AUDITORY]))).toEqual({
      suggestions: [],
      hidden: { message: "TE1m está en la red Auditiva, que está oculta.", networks: [AUDITORY] },
      noMatch: false,
    });
  });

  it("una abreviatura exacta que solo está en redes ocultas se avisa aunque haya sugerencias visibles", () => {
    const nodes = [
      region("l_pf", "PF", "L", "Area PF Complex", FRONTOPARIETAL),
      region("r_pf", "PF", "R", "Area PF Complex", FRONTOPARIETAL),
      region("l_pfm", "PFm", "L", "Area PFm Complex", DEFAULT),
    ];
    expect(searchRegions(nodes, "pf", new Set([FRONTOPARIETAL]))).toEqual({
      suggestions: [{ id: "l_pfm", label: "PFm (izq.)", name: "Area PFm Complex", network: DEFAULT }],
      hidden: { message: "PF está en la red Frontoparietal, que está oculta.", networks: [FRONTOPARIETAL] },
      noMatch: false,
    });
    expect(searchRegions(nodes, "pf", NONE_HIDDEN).hidden).toBeNull();
  });

  it("con coincidencias en varias redes ocultas, las nombra; con más de tres, dice cuántas", () => {
    const split = [region("l_te1m", "TE1m", "L", "Area TE1 Middle"), region("r_te1m", "TE1m", "R", "Area TE1 Middle", VISUAL)];
    expect(searchRegions(split, "te1m", new Set([AUDITORY, VISUAL])).hidden).toEqual({
      message: "TE1m está en las redes Auditiva y Visual, que están ocultas.",
      networks: [AUDITORY, VISUAL],
    });
    const spread = [AUDITORY, VISUAL, FRONTOPARIETAL, DEFAULT].map((network, i) => region(`r${i}`, `R${i}`, "L", `Región ${i}`, network));
    expect(searchRegions(spread, "r", new Set([AUDITORY, VISUAL, FRONTOPARIETAL, DEFAULT])).hidden).toEqual({
      message: "Lo escrito está en 4 redes ocultas.",
      networks: [AUDITORY, VISUAL, FRONTOPARIETAL, DEFAULT],
    });
  });

  it("sin nada escrito no busca, y sin ninguna coincidencia lo dice", () => {
    expect(searchRegions(NODES, "   ", NONE_HIDDEN)).toEqual({ suggestions: [], hidden: null, noMatch: false });
    expect(searchRegions(NODES, "zzz", NONE_HIDDEN)).toEqual({ suggestions: [], hidden: null, noMatch: true });
  });
});

describe("defaultActiveIndex", () => {
  const suggestions = ["a", "b", "c"].map((id) => ({ id, label: id, name: null, network: VISUAL }));

  it("la primera sugerencia que no está ya seleccionada; si todas lo están, la primera", () => {
    expect(defaultActiveIndex(suggestions, new Set())).toBe(0);
    expect(defaultActiveIndex(suggestions, new Set(["a"]))).toBe(1);
    expect(defaultActiveIndex(suggestions, new Set(["a", "b", "c"]))).toBe(0);
  });
});

describe("searchKey", () => {
  const open = { open: true, active: 1, count: 3, hasText: true };
  const closed = { open: false, active: 0, count: 3, hasText: true };

  it("con la lista abierta: flechas, Intro, Escape y Tab, como la lista del contexto de datos", () => {
    expect(searchKey("ArrowDown", open)).toEqual({ kind: "move", index: 2 });
    expect(searchKey("ArrowUp", open)).toEqual({ kind: "move", index: 0 });
    expect(searchKey("Enter", open)).toEqual({ kind: "choose", index: 1 });
    expect(searchKey("Escape", open)).toEqual({ kind: "close", keepDefault: false });
    expect(searchKey("Tab", open)).toEqual({ kind: "close", keepDefault: true });
    for (const key of [" ", "Home", "End", "a"]) expect(searchKey(key, open)).toEqual({ kind: "ignore" });
  });

  it("sin lista: la flecha abajo la abre y Escape vacía el campo a la primera", () => {
    expect(searchKey("ArrowDown", closed)).toEqual({ kind: "open" });
    expect(searchKey("ArrowDown", { ...closed, count: 0 })).toEqual({ kind: "ignore" });
    expect(searchKey("Escape", closed)).toEqual({ kind: "clear" });
    expect(searchKey("Escape", { ...closed, count: 0 })).toEqual({ kind: "clear" });
    expect(searchKey("Escape", { ...closed, hasText: false })).toEqual({ kind: "ignore" });
    expect(searchKey("Enter", closed)).toEqual({ kind: "ignore" });
  });
});

describe("regionSearchShortcut", () => {
  const NO_KEYS = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, repeat: false, defaultPrevented: false };
  const key = (k: string, mods: Partial<KeyboardEvent> = {}) => ({ key: k, code: `Key${k.toUpperCase()}`, ...NO_KEYS, ...mods });
  const body = { tagName: "BODY" };

  it("Ctrl+K y ⌘K, también con un teclado sin letras latinas", () => {
    expect(regionSearchShortcut(key("k", { ctrlKey: true }), body)).toBe(true);
    expect(regionSearchShortcut(key("k", { metaKey: true }), body)).toBe(true);
    expect(regionSearchShortcut({ ...key("л", { ctrlKey: true }), code: "KeyK" }, body)).toBe(true);
  });

  it("no con Mayús o Alt, repetida, ya atendida o dentro de otro campo de texto; en el propio buscador, sí", () => {
    expect(regionSearchShortcut(key("k"), body)).toBe(false);
    expect(regionSearchShortcut(key("K", { ctrlKey: true, shiftKey: true }), body)).toBe(false);
    expect(regionSearchShortcut(key("k", { ctrlKey: true, altKey: true }), body)).toBe(false);
    expect(regionSearchShortcut(key("k", { ctrlKey: true, repeat: true }), body)).toBe(false);
    expect(regionSearchShortcut(key("k", { ctrlKey: true, defaultPrevented: true }), body)).toBe(false);
    const field = { tagName: "INPUT", type: "text" };
    expect(regionSearchShortcut(key("k", { ctrlKey: true }), field)).toBe(false);
    expect(regionSearchShortcut(key("k", { ctrlKey: true }), field, true)).toBe(true);
  });

  it("el atajo se nombra como en cada sistema, igual que el de copiar", () => {
    expect(searchShortcutLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)")).toBe("⌘K");
    expect(searchShortcutLabel("Mozilla/5.0 (X11; Linux x86_64)")).toBe("Ctrl+K");
  });
});
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/regionSearch.test.ts`
Expected: FAIL, porque no existe `./regionSearch`.

- [ ] **Step 3: implementar `frontend/src/logic/regionSearch.ts`**

Las tildes se quitan con `normalize("NFD")` y `\p{Mn}` (marcas que no ocupan espacio), con la bandera `u`, que `tsconfig.app.json` admite (`target` ES2023). El orden compara con `localeCompare(…, "es", { numeric: true })`, que pone 7 antes que 10.

```ts
// Buscador de regiones (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.8): qué regiones sugiere lo escrito y
// en qué orden, cuándo avisa de las redes ocultas, cuál queda activa, qué
// hace cada tecla en el campo y cuándo Ctrl+K lleva a él. Funciones puras:
// se prueban sin DOM.
import type { GraphNode } from "../types/domain";
import { shortcutLabel } from "./clipboard";
import { SIDE_IN_ABBREVIATION, networkShortLabel, regionNameWithSide, regionTitleParts } from "./displayText";
import { isTextEntry, type ShortcutTarget } from "./historyStep";
import { listboxKey, type ListboxKeyResult } from "./listbox";

// Como mucho, 8 sugerencias (spec 5.8).
export const SEARCH_LIMIT = 8;

// Sin mayúsculas ni tildes: «Área» y «area» son lo mismo. NFD separa cada
// letra de su tilde, y \p{Mn} quita las tildes. Los espacios de más no
// cuentan.
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export interface RegionSuggestion {
  id: string;
  // La abreviatura, con su lado si no lo lleva: «TE1m (izq.)»
  // (regionNameWithSide, logic/displayText.ts).
  label: string;
  // El nombre completo sin «(hemisferio …)», o null si no dice nada más
  // (regionTitleParts).
  name: string | null;
  network: string;
}

// Aviso de las redes ocultas: qué dice y qué redes muestra su botón.
export interface HiddenHint {
  message: string;
  networks: string[];
}

export interface RegionSearchResult {
  // Sugerencias de las redes visibles, como mucho SEARCH_LIMIT.
  suggestions: RegionSuggestion[];
  // Aviso de las redes ocultas, si lo hay.
  hidden: HiddenHint | null;
  // Lo escrito no coincide con ninguna región, ni visible ni oculta.
  noMatch: boolean;
}

interface Match {
  node: GraphNode;
  level: number;
  // Abreviatura sin el lado (o nombre, si no la tiene), para ordenar.
  sortKey: string;
}

// El nombre completo, sin «(hemisferio …)».
function fullName(node: GraphNode): string {
  const { main, secondary } = regionTitleParts(node);
  return secondary ?? main;
}

// La abreviatura sin el lado que llevan algunas (SIDE_IN_ABBREVIATION):
// «L_SFG_7_1» se busca y se ordena como «SFG_7_1», así que el par
// izquierdo y derecho quedan juntos.
function bareAbbreviation(node: GraphNode): string | null {
  return node.abbreviation === null ? null : node.abbreviation.replace(SIDE_IN_ABBREVIATION, "");
}

// Nivel de una abreviatura: 0, exacta; 1, empieza por lo escrito; 2, lo
// contiene. null si no coincide.
function abbreviationLevel(abbreviation: string, query: string): number | null {
  if (abbreviation === "") return null;
  if (abbreviation === query) return 0;
  if (abbreviation.startsWith(query)) return 1;
  return abbreviation.includes(query) ? 2 : null;
}

// Nivel de la coincidencia (spec 5.8): el mejor de la abreviatura sin el
// lado y de la entera (así «l_sfg_7_1» también encuentra L_SFG_7_1); si no,
// 3, el nombre completo que lo contiene. null si no coincide.
function matchLevel(node: GraphNode, query: string): number | null {
  const levels = [bareAbbreviation(node), node.abbreviation]
    .map((abbreviation) => (abbreviation === null ? null : abbreviationLevel(normalizeSearch(abbreviation), query)))
    .filter((level): level is number => level !== null);
  if (levels.length > 0) return Math.min(...levels);
  return normalizeSearch(fullName(node)).includes(query) ? 3 : null;
}

// A igualdad de nivel, por abreviatura (con los números en su orden: 7
// antes que 10) y por lado: izquierdo, derecho y sin hemisferio.
const SIDE_ORDER = { L: 0, R: 1 } as const;
const sideOrder = (node: GraphNode) => (node.hemisphere === null ? 2 : SIDE_ORDER[node.hemisphere]);

function compareMatches(a: Match, b: Match): number {
  return (
    a.level - b.level ||
    a.sortKey.localeCompare(b.sortKey, "es", { numeric: true }) ||
    sideOrder(a.node) - sideOrder(b.node) ||
    (a.node.id < b.node.id ? -1 : a.node.id > b.node.id ? 1 : 0)
  );
}

function joinNames(names: readonly string[]): string {
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

// El aviso de las redes ocultas (spec 5.8): nombra la región, si todas las
// coincidencias ocultas son la misma («TE1m», también las dos de un par), o
// «Lo escrito», y su red o sus redes; con más de tres, solo cuántas. El
// botón las muestra todas.
function hiddenHint(matches: readonly Match[]): HiddenHint {
  const networks = [...new Set(matches.map(({ node }) => node.network))];
  const names = new Set(matches.map(({ node }) => bareAbbreviation(node) ?? regionTitleParts(node).main));
  const who = names.size === 1 ? [...names][0] : "Lo escrito";
  const where =
    networks.length === 1
      ? `la red ${networkShortLabel(networks[0])}, que está oculta`
      : networks.length <= 3
        ? `las redes ${joinNames(networks.map(networkShortLabel))}, que están ocultas`
        : `${networks.length} redes ocultas`;
  return { message: `${who} está en ${where}.`, networks };
}

export function searchRegions(
  nodes: readonly GraphNode[],
  query: string,
  hiddenNetworks: ReadonlySet<string>,
): RegionSearchResult {
  const wanted = normalizeSearch(query);
  if (wanted === "") return { suggestions: [], hidden: null, noMatch: false };
  const matches: Match[] = [];
  for (const node of nodes) {
    const level = matchLevel(node, wanted);
    if (level !== null) matches.push({ node, level, sortKey: normalizeSearch(bareAbbreviation(node) ?? fullName(node)) });
  }
  matches.sort(compareMatches);
  // Solo redes visibles (spec 5.8): las regiones de una red oculta no se
  // ven en las vistas.
  const visible = matches.filter(({ node }) => !hiddenNetworks.has(node.network));
  const inHidden = matches.filter(({ node }) => hiddenNetworks.has(node.network));
  // El aviso sale si nada visible coincide, o si la abreviatura exacta solo
  // está en redes ocultas, aunque haya sugerencias visibles: «pf» con la
  // red de PF oculta lo dice, aunque se vean PFm y PFop.
  const exact = matches.filter(({ level }) => level === 0);
  const hidden =
    visible.length === 0 && inHidden.length > 0
      ? hiddenHint(inHidden)
      : exact.length > 0 && exact.every(({ node }) => hiddenNetworks.has(node.network))
        ? hiddenHint(exact)
        : null;
  return {
    suggestions: visible.slice(0, SEARCH_LIMIT).map(({ node }) => ({
      id: node.id,
      label: regionNameWithSide(node),
      name: regionTitleParts(node).secondary,
      network: node.network,
    })),
    hidden,
    noMatch: matches.length === 0,
  };
}

export const NO_MATCH_TEXT = "Ninguna región coincide.";

// Sugerencia activa al escribir: la primera, salvo que ya esté seleccionada;
// entonces, la primera que no lo esté. Así, escribir «te1m» e Intro dos
// veces añade las dos. Si todas lo están, la primera.
export function defaultActiveIndex(suggestions: readonly RegionSuggestion[], selectedIds: ReadonlySet<string>): number {
  const index = suggestions.findIndex((suggestion) => !selectedIds.has(suggestion.id));
  return index === -1 ? 0 : index;
}

// Qué hace cada tecla en el campo (patrón combobox, spec 5.8). Con la lista
// abierta, como en la lista del contexto de datos (logic/listbox.ts): las
// flechas se mueven, Intro elige, Escape cierra y Tab cierra y sigue.
// Espacio, Inicio y Fin son del campo: escriben o mueven el cursor. Sin
// lista, la flecha abajo la abre y Escape vacía el campo a la primera.
export type SearchKeyResult = ListboxKeyResult | { kind: "open" } | { kind: "clear" };

export function searchKey(
  key: string,
  state: { open: boolean; active: number; count: number; hasText: boolean },
): SearchKeyResult {
  if (state.open) {
    if (key === " " || key === "Home" || key === "End") return { kind: "ignore" };
    return listboxKey(key, state.active, state.count);
  }
  if (key === "ArrowDown" && state.count > 0) return { kind: "open" };
  if (key === "Escape" && state.hasText) return { kind: "clear" };
  return { kind: "ignore" };
}

// Atajo del buscador (spec 5.8): Ctrl+K, o ⌘K en macOS, con la tecla física
// si el teclado no tiene letras latinas. Las mismas reglas que los atajos
// del historial (logic/historyStep.ts): no con Alt ni Mayús, ni con la tecla
// repetida, ni si otro ya atendió el evento, ni dentro de otro campo de
// texto. En el propio buscador sí (inRegionSearch): selecciona lo escrito.
export function regionSearchShortcut(
  event: Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey" | "repeat" | "defaultPrevented">,
  target: ShortcutTarget | null,
  inRegionSearch = false,
): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.repeat || event.defaultPrevented) return false;
  const letter = /^[a-z]$/i.test(event.key) ? event.key.toLowerCase() : event.code === "KeyK" ? "k" : "";
  return letter === "k" && (inRegionSearch || !isTextEntry(target));
}

// Cómo se escribe el atajo en cada sistema, como el de copiar
// (logic/clipboard.ts): «⌘K» en macOS, «Ctrl+K» en los demás.
export function searchShortcutLabel(userAgent: string): string {
  return shortcutLabel("K", userAgent);
}
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/logic/regionSearch.test.ts`
Expected: PASS (16 pruebas).

- [ ] **Step 4: el componente**

`frontend/src/components/RegionSearch.test.tsx`. Con `renderToStaticMarkup`, el buscador de verdad sale cerrado; la lista abierta, los avisos de las redes ocultas y «Ninguna región coincide.» se prueban con `RegionSearchView`, que recibe el estado, como en la Task 10.

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { RegionSearchResult } from "../logic/regionSearch";
import { RegionSearch, RegionSearchView } from "./RegionSearch";

const noop = () => {};
const AUDITORY = "cole-anticevic.auditory";
const VISUAL = "cole-anticevic.visual";
const TE1M: RegionSearchResult["suggestions"] = [
  { id: "l_te1m", label: "TE1m (izq.)", name: "Area TE1 Middle", network: AUDITORY },
  { id: "r_te1m", label: "TE1m (der.)", name: "Area TE1 Middle", network: AUDITORY },
];

const HANDLERS = { onQueryChange: noop, onKeyDown: noop, onFocusChange: noop, onChoose: noop, onHover: noop, onShowNetworks: noop };

function view(result: RegionSearchResult, open: boolean, selected: string[] = []) {
  const state = { baseId: "busca", query: "te1m", result, open, active: 0, selectedIds: new Set(selected), shortcutLabel: "Ctrl+K" };
  return renderToStaticMarkup(<RegionSearchView {...state} {...HANDLERS} />);
}

describe("RegionSearch", () => {
  it("es un combobox con nombre y con su atajo, y empieza cerrado y sin lista", () => {
    const html = renderToStaticMarkup(<RegionSearch nodes={[]} />);
    const input = html.match(/<input[^>]*>/)?.[0] ?? "";
    for (const attribute of ['role="combobox"', 'aria-autocomplete="list"', 'aria-expanded="false"', 'aria-keyshortcuts="Control+K Meta+K"']) {
      expect(input).toContain(attribute);
    }
    expect(input).not.toContain("aria-controls");
    expect(input).not.toContain("aria-activedescendant");
    const id = input.match(/ id="([^"]+)"/)?.[1];
    expect(html).toContain(`<label class="visually-hidden" for="${id}">Buscar una región</label>`);
    expect(html).not.toContain('role="listbox"');
  });

  it("abierto, el campo controla la lista y apunta a la sugerencia activa", () => {
    const html = view({ suggestions: TE1M, hidden: null, noMatch: false }, true, ["l_te1m"]);
    expect(html).toContain('aria-expanded="true" aria-controls="busca-list" aria-activedescendant="busca-option-0"');
    expect(html).toContain('<ul id="busca-list" class="region-search__list" role="listbox" aria-label="Regiones sugeridas">');
    expect(html).toContain('<li id="busca-option-0" class="region-search__option region-search__option--active" role="option" aria-selected="true">');
    expect(html).toContain('<li id="busca-option-1" class="region-search__option" role="option" aria-selected="false">');
    expect(html).toContain('<span class="region-search__label">TE1m (izq.)</span><span class="region-search__name"> Area TE1 Middle</span>');
    expect(html.match(/seleccionada/g)).toHaveLength(1);
  });

  it("los avisos van en una línea bajo el campo: el de las redes ocultas, con su botón, también junto a la lista", () => {
    const one = view(
      { suggestions: [], hidden: { message: "TE1m está en la red Auditiva, que está oculta.", networks: [AUDITORY] }, noMatch: false },
      false,
    );
    expect(one).toContain(
      '<div class="region-search__status" role="status"><span>TE1m está en la red Auditiva, que está oculta.</span><button type="button" class="filters__text-btn filters__text-btn--strong">Mostrar la red</button></div>',
    );
    expect(one).not.toContain('role="listbox"');
    const both = view(
      {
        suggestions: TE1M,
        hidden: { message: "TE1m está en las redes Auditiva y Visual, que están ocultas.", networks: [AUDITORY, VISUAL] },
        noMatch: false,
      },
      true,
    );
    expect(both).toContain(">Mostrar las redes</button></div><ul");
    expect(view({ suggestions: [], hidden: null, noMatch: true }, false)).toContain(
      '<div class="region-search__status" role="status"><span>Ninguna región coincide.</span></div>',
    );
  });
});
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/components/RegionSearch.test.tsx`
Expected: FAIL, porque no existe `./RegionSearch`.

`frontend/src/components/RegionSearch.tsx`. Tres detalles:
- La lista solo está en la página mientras está abierta: la guarda de los atajos de la Task 10 mira si hay alguna lista abierta (`[role="listbox"]`), y una lista oculta pero presente la bloquearía siempre. `aria-controls` apunta a ella solo entonces, como en `DataContextMenu`.
- Con dos líneas por sugerencia, ocho no caben en la lista. Un efecto desplaza la activa a la vista al abrir la lista, al escribir y con el teclado, y no con el ratón (la marca `scrollActiveRef`, como en `DataContextMenu`). Ajusta `list.scrollTop` a mano, con lo visible medido sin el borde (`clientTop`, `clientHeight`): `scrollIntoView` desplazaría también a `.app--workspace`, que tiene `overflow: hidden`.
- El estado (`role="status"`) está siempre, para que se anuncie lo que aparezca en él. Va bajo el campo; la lista, que flota, bajo él.

```tsx
// Buscador de regiones (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.8): un campo con autocompletado en
// Filtros, sobre la selección, con el patrón combobox. Sugiere regiones de
// las redes visibles (logic/regionSearch.ts). Elegir una la añade a la
// selección con addNodes, del store de selección, así que es un paso que se
// puede deshacer (5.7). El campo se vacía y conserva el foco, para seguir
// añadiendo. Si lo buscado está en redes ocultas, lo dice en una línea bajo
// el campo, con un botón para mostrarlas: una lista (listbox) no puede
// llevar botones. Ctrl+K lleva aquí (useRegionSearchShortcut, desde App).
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";
import {
  NO_MATCH_TEXT,
  defaultActiveIndex,
  searchKey,
  searchRegions,
  searchShortcutLabel,
  type RegionSearchResult,
} from "../logic/regionSearch";
import { useFiltersStore } from "../state/filters";
import { useSelectionStore } from "../state/selection";
import { useDrawColors } from "../theme/useDrawColors";
import type { GraphNode } from "../types/domain";
import { Icon } from "./Icon";

interface RegionSearchViewProps {
  baseId: string;
  query: string;
  result: RegionSearchResult;
  // La lista está abierta y active es la sugerencia activa.
  open: boolean;
  active: number;
  selectedIds: ReadonlySet<string>;
  shortcutLabel: string;
  inputRef?: Ref<HTMLInputElement>;
  listRef?: Ref<HTMLUListElement>;
  onQueryChange: (query: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onFocusChange: (focused: boolean) => void;
  onChoose: (index: number) => void;
  // El ratón pasa por una sugerencia: pasa a ser la activa.
  onHover: (index: number) => void;
  onShowNetworks: (networks: readonly string[]) => void;
}

// El buscador sin estado: se prueba con cualquier resultado.
export function RegionSearchView(props: RegionSearchViewProps) {
  const { baseId, query, result, open, active, selectedIds, shortcutLabel, inputRef, listRef } = props;
  const { onQueryChange, onKeyDown, onFocusChange, onChoose, onHover, onShowNetworks } = props;
  const { networkColor } = useDrawColors();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const hint = result.hidden;
  return (
    <div className="region-search">
      <label className="visually-hidden" htmlFor={inputId}>Buscar una región</label>
      <div className="region-search__field">
        <Icon name="search" size={14} className="region-search__icon" />
        <input
          ref={inputRef}
          id={inputId}
          className="region-search__input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? optionId(active) : undefined}
          aria-keyshortcuts="Control+K Meta+K"
          placeholder={`Buscar región (${shortcutLabel})`}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
        />
      </div>
      {/* Siempre presente, para que se anuncie lo que aparezca en ella. Va
          bajo el campo; la lista, que flota, bajo ella. */}
      <div className="region-search__status" role="status">
        {hint && (
          <>
            <span>{hint.message}</span>
            <button
              type="button"
              className="filters__text-btn filters__text-btn--strong"
              onClick={() => onShowNetworks(hint.networks)}
            >
              {hint.networks.length === 1 ? "Mostrar la red" : "Mostrar las redes"}
            </button>
          </>
        )}
        {result.noMatch && <span>{NO_MATCH_TEXT}</span>}
      </div>
      {/* La lista solo está en la página mientras está abierta: la guarda de
          los atajos de deshacer busca listas abiertas ([role="listbox"]).
          Un clic en ella no se lleva el foco del campo. */}
      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="region-search__list"
          role="listbox"
          aria-label="Regiones sugeridas"
          onMouseDown={(event) => event.preventDefault()}
        >
          {result.suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={optionId(index)}
              className={`region-search__option${index === active ? " region-search__option--active" : ""}`}
              role="option"
              aria-selected={index === active}
              onClick={() => onChoose(index)}
              onMouseMove={() => onHover(index)}
            >
              <span className="region-search__dot" style={{ backgroundColor: networkColor(suggestion.network) }} aria-hidden="true" />
              <span className="region-search__text">
                <span className="region-search__label">{suggestion.label}</span>
                {suggestion.name && <span className="region-search__name"> {suggestion.name}</span>}
              </span>
              {selectedIds.has(suggestion.id) && (
                <span className="region-search__selected">
                  <span className="visually-hidden">, </span>seleccionada
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RegionSearch({ nodes }: { nodes: readonly GraphNode[] }) {
  const hiddenNetworks = useFiltersStore((state) => state.hiddenNetworks);
  const toggleNetwork = useFiltersStore((state) => state.toggleNetwork);
  const selectedNodeIds = useSelectionStore((state) => state.selectedNodeIds);
  const addNodes = useSelectionStore((state) => state.addNodes);
  const [query, setQuery] = useState("");
  // null: la sugerencia activa por defecto (defaultActiveIndex).
  const [active, setActive] = useState<number | null>(null);
  // Escape cerró la lista; se vuelve a abrir al escribir o con la flecha abajo.
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Si la sugerencia activa debe desplazarse a la vista: al abrir la lista,
  // al escribir y con el teclado, nunca al pasar el ratón (como en
  // DataContextMenu).
  const scrollActiveRef = useRef(true);
  const baseId = useId();

  const result = useMemo(() => searchRegions(nodes, query, hiddenNetworks), [nodes, query, hiddenNetworks]);
  const { suggestions } = result;
  const open = focused && !dismissed && suggestions.length > 0;
  const current = Math.min(active ?? defaultActiveIndex(suggestions, selectedNodeIds), Math.max(suggestions.length - 1, 0));

  // La sugerencia activa, a la vista: con dos líneas cada una, ocho no caben
  // en la lista. Se ajusta list.scrollTop a mano, porque scrollIntoView
  // desplazaría también a .app--workspace, que tiene overflow: hidden. Lo
  // visible se mide sin el borde (clientTop, clientHeight).
  useEffect(() => {
    if (!open || !scrollActiveRef.current) return;
    scrollActiveRef.current = false;
    const list = listRef.current;
    const option = document.getElementById(`${baseId}-option-${current}`);
    if (!list || !option) return;
    const top = list.getBoundingClientRect().top + list.clientTop;
    const bottom = top + list.clientHeight;
    const box = option.getBoundingClientRect();
    if (box.top < top) list.scrollTop -= top - box.top;
    else if (box.bottom > bottom) list.scrollTop += box.bottom - bottom;
  }, [open, current, baseId]);

  const restart = (text: string) => {
    scrollActiveRef.current = true;
    setQuery(text);
    setActive(null);
    setDismissed(false);
  };

  // Elegir una región la añade a la selección (spec 5.8). Si ya estaba, no
  // cambia nada: ni siquiera se llama a addNodes, que crearía otro Set.
  const choose = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    if (!selectedNodeIds.has(suggestion.id)) addNodes([suggestion.id]);
    restart("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const action = searchKey(event.key, { open, active: current, count: suggestions.length, hasText: query !== "" });
    switch (action.kind) {
      case "ignore":
        return;
      case "move":
        event.preventDefault();
        scrollActiveRef.current = true;
        setActive(action.index);
        return;
      case "choose":
        event.preventDefault();
        choose(action.index);
        return;
      case "close":
        if (!action.keepDefault) event.preventDefault();
        setDismissed(true);
        return;
      case "open":
        event.preventDefault();
        scrollActiveRef.current = true;
        setActive(null);
        setDismissed(false);
        return;
      case "clear":
        event.preventDefault();
        restart("");
        return;
      default: {
        // Comprobación exhaustiva, como en DataContextMenu: un resultado
        // nuevo de searchKey que no se trate aquí no compila.
        const exhaustive: never = action;
        return exhaustive;
      }
    }
  };

  const onFocusChange = (isFocused: boolean) => {
    if (isFocused) scrollActiveRef.current = true;
    setFocused(isFocused);
  };

  const onHover = (index: number) => {
    scrollActiveRef.current = false;
    setActive(index);
  };

  // «Mostrar la red» o «Mostrar las redes»: dejan de estar ocultas, la lista
  // vuelve a abrirse y el foco vuelve al campo, donde ya salen sus regiones.
  const showNetworks = (networks: readonly string[]) => {
    for (const network of networks) toggleNetwork(network);
    scrollActiveRef.current = true;
    setDismissed(false);
    inputRef.current?.focus();
  };

  return (
    <RegionSearchView
      baseId={baseId}
      query={query}
      result={result}
      open={open}
      active={current}
      selectedIds={selectedNodeIds}
      shortcutLabel={searchShortcutLabel(typeof navigator === "undefined" ? "" : navigator.userAgent)}
      inputRef={inputRef}
      listRef={listRef}
      onQueryChange={restart}
      onKeyDown={onKeyDown}
      onFocusChange={onFocusChange}
      onChoose={choose}
      onHover={onHover}
      onShowNetworks={showNetworks}
    />
  );
}
```

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/components/RegionSearch.test.tsx`
Expected: PASS (3 pruebas).

- [ ] **Step 5: el atajo**

`frontend/src/components/useRegionSearchShortcut.ts`. Es un `.ts`, como `useHistoryShortcuts.ts`, por la misma razón (`only-export-components`). La guarda de listas abiertas deja fuera la del propio buscador: con el foco en el campo, Ctrl+K selecciona lo escrito.

```ts
// Atajo del buscador de regiones (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.8): Ctrl+K (⌘K) lleva el foco al
// buscador desde cualquier sitio de la vista Atlas. El mismo diseño que los
// atajos del historial (useHistoryShortcuts): un escuchador en window, solo
// en la vista Atlas, con la decisión en una función pura
// (logic/regionSearch.ts, regionSearchShortcut). No actúa mientras está
// abierta una lista desplegable, salvo la del propio buscador, o el panel de
// Ajustes. Anula lo que haría el navegador con Ctrl+K.
import { useEffect, useRef } from "react";
import { regionSearchShortcut } from "../logic/regionSearch";

const OPEN_POPUP = '[role="listbox"]:not(.region-search__list), .settings__panel';

// Lleva el foco al campo del buscador que haya en container y selecciona lo
// escrito, para poder sustituirlo.
export function focusRegionSearch(container: ParentNode | null) {
  const input = container?.querySelector<HTMLInputElement>(".region-search__input");
  input?.focus();
  input?.select();
}

export function useRegionSearchShortcut(enabled: boolean, onShortcut: () => void) {
  // La función más reciente, sin volver a poner el escuchador en cada render.
  const onShortcutRef = useRef(onShortcut);
  useEffect(() => {
    onShortcutRef.current = onShortcut;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector(OPEN_POPUP)) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!regionSearchShortcut(event, target, target?.classList.contains("region-search__input") ?? false)) return;
      event.preventDefault();
      onShortcutRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
```

- [ ] **Step 6: el buscador en `frontend/src/components/FilterPanel.tsx`**

1. Tras `import { Icon } from "./Icon";` añade `import { RegionSearch } from "./RegionSearch";`.
2. Justo antes de `      <div className="filters__selection">` (la fila de la selección, que la Task 10 dejó con «Limpiar» y los botones de deshacer), añade:

   ```tsx
         {/* Buscador de regiones (D4; spec 5.8), justo encima de la selección,
             porque ahí se arma el montaje. */}
         <RegionSearch nodes={nodes} />

   ```

   El panel ya recibe los nodos cargados (`nodes`).

- [ ] **Step 7: Ctrl+K en `frontend/src/App.tsx`**

1. Tras `import { useHistoryShortcuts } from "./components/useHistoryShortcuts";` (Task 10) añade `import { focusRegionSearch, useRegionSearchShortcut } from "./components/useRegionSearchShortcut";`.
2. Justo después del efecto del aviso con «Deshacer» de la Task 10, el único de `App.tsx` que termina con `  }, [source]);`, añade lo de abajo. Con Filtros plegado, el atajo lo despliega con `setFiltersCollapsed(false)` y no con `toggleFilters` (Task 4), que dejaría el foco en el botón de plegar: aquí va al buscador, cuando ya está en la página. `filtersRef` es el de la Task 4.

   ```tsx
     // Ctrl+K (⌘K) lleva al buscador de regiones, en la vista Atlas (D4 de
     // docs/decisiones-diseno.md; spec 5.8). Con Filtros plegado, primero lo
     // despliega, y el foco llega cuando el buscador ya está en la página.
     const focusSearchAfterExpand = useRef(false);
     useEffect(() => {
       if (filtersCollapsed || !focusSearchAfterExpand.current) return;
       focusSearchAfterExpand.current = false;
       focusRegionSearch(filtersRef.current);
     }, [filtersCollapsed]);
     useRegionSearchShortcut(view === "atlas", () => {
       if (!filtersCollapsed) {
         focusRegionSearch(filtersRef.current);
         return;
       }
       focusSearchAfterExpand.current = true;
       setFiltersCollapsed(false);
     });
   ```

- [ ] **Step 8: estilos en `frontend/src/App.css`**

Añade al final del archivo:

```css

/* Buscador de regiones (spec 5.8), en Filtros sobre la selección. La lista
   de sugerencias flota sobre el panel, con su ancho. El anillo de foco lo
   lleva el recuadro del campo, que incluye la lupa. */
.region-search { position: relative; margin-bottom: 10px; }
.region-search__field { display: flex; align-items: center; gap: 6px; padding: 0 8px; border: 1px solid var(--border); border-radius: 9px; background: var(--code-bg); color: var(--text-muted); }
.region-search__field:focus-within { outline: 2px solid var(--accent); outline-offset: 1px; }
.region-search__icon { flex-shrink: 0; }
.region-search__input { flex: 1 1 auto; min-width: 0; height: 30px; padding: 0; border: none; background: transparent; color: var(--text-h); font: inherit; font-size: 0.72rem; }
.region-search__input:focus-visible { outline: none; }
.region-search__input::placeholder { color: var(--text-muted); opacity: 1; }
.region-search__list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 20; max-height: 18rem; overflow-y: auto; margin: 0; padding: 4px; list-style: none; border: 1px solid var(--border-strong); border-radius: 9px; background: var(--panel-bg); box-shadow: var(--shadow); }
.region-search__option { display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; border-radius: 6px; font-size: 0.72rem; line-height: 1.35; color: var(--text); cursor: pointer; }
.region-search__option:hover { background: var(--hover); }
/* El foco se queda en el campo: la sugerencia activa lleva el contorno del
   foco (spec 8), porque el fondo --hover solo no se distingue lo bastante,
   y sus textos grises pasan a --text, que sí llega a 4,5:1 sobre él. */
.region-search__option--active { background: var(--hover); color: var(--text-h); outline: 2px solid var(--accent); outline-offset: -2px; }
.region-search__option--active .region-search__name, .region-search__option--active .region-search__selected { color: var(--text); }
.region-search__dot { flex-shrink: 0; width: 8px; height: 8px; margin-top: 4px; border-radius: 50%; box-shadow: 0 0 0 1px var(--text-faint); }
.region-search__text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.region-search__label { font-weight: 600; color: var(--text-h); }
.region-search__name { color: var(--text-muted); overflow-wrap: anywhere; }
.region-search__selected { flex-shrink: 0; font-size: 0.7rem; font-weight: 600; color: var(--text-muted); }
.region-search__status { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; font-size: 0.72rem; line-height: 1.4; color: var(--text-muted); }
.region-search__status:not(:empty) { margin-top: 6px; }
```

- [ ] **Step 9: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/App.css src/components/RegionSearch.tsx
```

Expected: BASE + 129 pruebas en verde (244 con una BASE de 115). El `grep`, como en la Task 4. Lo demás, como antes. En la aplicación real lo comprueba la Task 13 (fase `buscador`).

- [ ] **Step 10: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/logic/historyStep.ts frontend/src/logic/clipboard.ts frontend/src/logic/displayText.ts frontend/src/logic/regionSearch.ts frontend/src/logic/regionSearch.test.ts frontend/src/components/RegionSearch.tsx frontend/src/components/RegionSearch.test.tsx frontend/src/components/useRegionSearchShortcut.ts frontend/src/components/FilterPanel.tsx frontend/src/App.tsx frontend/src/App.css
git commit -m "Estructura: buscador de regiones con autocompletado y Ctrl+K

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 10: verificación en la app real, primera parte

### Task 12: verificación en la app real: preparación, barra, temas, síntesis, teclado y avisos

**Files:**
- Create: una carpeta nueva en el scratchpad, con los scripts de verificación, una copia de la versión anterior a esta fase y lo que generen. Nada de esto entra en el repositorio.

La verificación ocupa dos tareas. Esta prepara la carpeta, los dos servidores y los ayudantes, y hace las fases de la barra, los temas, las síntesis, el teclado y los avisos. La Task 13 hace las vistas, los filtros, la exportación, el deshacer y el buscador, y revisa todo. La Task 14 escribe la D4 con lo que se haya visto.

**Reglas del navegador.**

- Se usa un navegador sin interfaz aparte, con un script de Node. Nada de herramientas MCP de navegador:
  - Las del MCP de Playwright escriben la carpeta `.playwright-mcp/` en la copia principal, que es su directorio de trabajo, y la copia principal no se toca.
  - Las `mcp__claude-in-chrome__*` y `mcp__browsermcp__*` manejan el Chrome de la usuaria, que ella está mirando.
- Playwright 1.55.0 se carga desde `/home/dae/PycharmProjects/gh3.2/node_modules/playwright`. Solo se carga: allí no se escribe nada.
- Se lanza `chromium.launch({ headless: true })` con un perfil desechable. Todo lo que se genera (perfil, capturas, informes) va a la carpeta del scratchpad.
- Si Playwright falla, la alternativa es `google-chrome --headless=new --user-data-dir=<carpeta del scratchpad>`. Nunca Chrome con el perfil de la usuaria.
- Los puertos 5173 (el de la usuaria) y 5199 (el que mira la usuaria) no se usan.
- Cada fase se lanza en su propia orden, con `timeout` y un tiempo límite largo, o en segundo plano. Al terminar cada una no deben quedar navegadores sueltos (Step 6).
- Los servidores de desarrollo se paran al terminar la Task 13.
- La plantilla de la fase 1 es `/tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/task9-final-20260924-194434/` (`final.cjs`, con la versión anterior servida aparte y los JSON guardados). Si ya no existe, los scripts de abajo bastan.

**Honestidad.**

- Cada comprobación se informa como «visto», «distinto» o «sin comprobar».
- Nunca se cambia una expectativa, ni el script, para que desaparezca una diferencia. «Corrige el script» vale solo cuando la suposición del propio script era errónea (un selector, un tiempo de espera), y se anota en el informe.
- Los scripts nunca dan por buena otra región: si no pueden seleccionar la que buscan, lo apuntan en `sinComprobar`, y lo que dependía de ella queda «sin comprobar».
- Cada fase guarda su JSON aunque falle a medias, con el error en `fallo`.
- La D4 solo afirma lo que muestran los JSON y las capturas.

- [ ] **Step 1: pruebas, tipos, lint y compilación**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint && npm run build
```

Expected: BASE + 127 pruebas en verde (242 con una BASE de 115); `tsc` limpio; lint sin errores y con los mismos 9 avisos; `✓ built`.

- [ ] **Step 2: carpeta de trabajo, versión anterior y estado de la copia principal**

```bash
D=$(mktemp -d /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase3-verif-XXXXXX) && mkdir -p "$D/tmp" "$D/antes" && echo "$D"
git -C /home/dae/PycharmProjects/Neurograph/Neurograph status --short > "$D/copia-principal-antes.txt"; cat "$D/copia-principal-antes.txt"
```

Apunta la ruta que imprime. El estado de la terminal no se conserva entre órdenes: en los pasos siguientes, sustituye `$D` por esa ruta.

La versión anterior a esta fase es el commit que guardó el Step 0 de la Task 1. Si `fase3-base.txt` no existe, es el padre del primer commit de la fase: `git log --reverse --format=%H --grep='^Estructura: ' | head -1`, seguido de `^`. Se saca con `git archive`, que solo lee del repositorio. Lanza estas líneas en una sola orden, porque `BASE_COMMIT` no se conserva de una orden a otra:

```bash
BASE_COMMIT=$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase3-base.txt) && echo "$BASE_COMMIT" && \
git -C /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz archive "$BASE_COMMIT" frontend | tar -x -C "$D/antes" && \
ln -s /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/node_modules "$D/antes/frontend/node_modules"
```

Sustituye `$D/antes/frontend/vite.config.ts` por este, con la ruta de `$D` escrita en `cacheDir`, para que la copia no toque la caché de Vite del worktree:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Copia de la rama antes de la fase 3, solo para comparar las
// exportaciones (Task 13). cacheDir propio, fuera del worktree.
export default defineConfig({
  plugins: [react()],
  cacheDir: '<ruta de $D>/vite-cache-antes',
  server: { port: 5242, strictPort: true },
})
```

- [ ] **Step 3: los dos servidores**

Elige dos puertos libres que no sean 5173 ni 5199; aquí, 5241 para la versión nueva y 5242 para la anterior:

```bash
ss -ltn | grep -E ':(5241|5242) ' || echo "5241 y 5242 libres"
```

Si alguno está ocupado, elige otros dos libres y cámbialos en todos estos sitios:
- el `server.port` del `vite.config.ts` de la copia anterior (Step 2);
- las dos órdenes de arranque de abajo;
- `PORT` y `PORT_ANTES` en cada orden que lanza una fase (Step 6 de esta tarea y Step 3 de la Task 13);
- la comprobación de puertos del Step 0 de la Task 13;
- las órdenes que paran los servidores y el `ss` del Step 6 de la Task 13.

Arranca los dos en segundo plano (`run_in_background`), cada uno en su orden, y apunta el identificador de tarea de cada uno:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vite --port 5241 --strictPort
```

```bash
cd "$D/antes/frontend" && npx vite --port 5242 --strictPort
```

Los datos reales los sirve el backend de la usuaria, en `127.0.0.1:8420`, que acepta cualquier puerto local. Solo se le hacen peticiones GET de lectura. No lo arranques tú: si no responde, la fase «preflight» lo dice (Step 6).

- [ ] **Step 4: los ayudantes**

Crea `$D/lib-fase3.cjs`. Los usan los dos scripts de fases:

```js
// Ayudantes de la verificación de la fase 3 (Tasks 12 y 13 de
// docs/rediseno-interfaz-plan-fase3.md). Playwright 1.55 de
// /home/dae/PycharmProjects/gh3.2 (solo se carga), Chromium sin interfaz y
// perfil desechable. Todo lo que se genera va a la carpeta de este archivo.
const { chromium } = require("/home/dae/PycharmProjects/gh3.2/node_modules/playwright");
const fs = require("fs");
const path = require("path");

const OUT = __dirname;
const BASE = `http://localhost:${process.env.PORT}/`;
const BASE_ANTES = `http://localhost:${process.env.PORT_ANTES}/`;
const API = "http://127.0.0.1:8420";
const ATLAS = "atlas.human.hcp.mmp1_0";
const ATLAS_BRAINNETOME = "atlas.human.brainnetome.bna_246";
const THEMES = ["original", "grafito", "noche", "claro"];
const CONNECTOGRAM = '.ws-view--main svg[aria-label="Connectograma"]';

const out = (name) => path.join(OUT, name);
const save = (name, data) => fs.writeFileSync(out(name), JSON.stringify(data, null, 2));
const readJson = (name) => JSON.parse(fs.readFileSync(out(name), "utf8"));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Regiones que selectNode no pudo seleccionar con seguridad: lo que
// dependía de ellas queda «sin comprobar». Cada fase lo guarda en su JSON.
const notVerified = [];

// Ejecuta una fase y guarda su JSON pase lo que pase: si falla a medias,
// queda lo que se llegó a ver, las regiones sin comprobar y el error.
async function recording(name, r, body) {
  try {
    await body();
  } catch (e) {
    r.fallo = String(e?.stack ?? e);
    throw e;
  } finally {
    r.sinComprobar = notVerified;
    save(name, r);
  }
}

// init: script que corre en la página antes que la app (la fase «sintesis»
// lo usa para simular Tauri). saved: /regions y /connections de HCP-MMP1.0
// salen de los JSON que guarda «preflight». GET /connections devuelve las
// filas en otro orden en cada petición, y con él cambia el orden de dibujo:
// para comparar imágenes o recuentos, los datos tienen que ser los mismos.
// Los errores de la consola llevan la dirección que los produjo.
async function launch(width, height, { init, saved = false } = {}) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
  });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, acceptDownloads: true });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE.slice(0, -1) });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  if (saved) {
    const cors = { "access-control-allow-origin": "*" };
    await page.route(
      (u) => u.port === "8420" && u.pathname === "/regions" && u.searchParams.get("atlas_id") === ATLAS && !u.searchParams.has("network_source"),
      (route) => route.fulfill({ path: out("regions.json"), contentType: "application/json", headers: cors }),
    );
    await page.route(
      (u) => u.port === "8420" && u.pathname === "/connections" && u.searchParams.get("atlas_id") === ATLAS,
      (route) => route.fulfill({ path: out("connections.json"), contentType: "application/json", headers: cors }),
    );
  }
  const errors = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const url = m.location()?.url;
    errors.push(url ? `${m.text()} [${url}]` : m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return { browser, page, errors };
}

// .real-badge es la etiqueta de datos reales de la versión anterior a la fase.
async function load(page, theme, base = BASE) {
  await page.goto(base);
  await page.evaluate((t) => localStorage.setItem("neurograph.apariencia", JSON.stringify({ theme: t, paletteMode: null })), theme);
  await page.reload();
  await page.locator(".data-status--real, .real-badge").first().waitFor({ timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
}

// El control con el foco, con su nombre accesible o su texto.
async function focused(page) {
  return page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return "body";
    const name = a.getAttribute("aria-label") ?? a.textContent.trim().slice(0, 50);
    return `${a.tagName.toLowerCase()}.${String(a.className).trim().split(/\s+/).join(".")} «${name}»`;
  });
}

// Amplía una vista: con «Ampliar» en la versión nueva y con la capa en la anterior.
async function enlarge(page, title) {
  const button = page.locator(`button.ws-view__enlarge[aria-label="Ampliar ${title}"]`);
  const overlay = page.locator(`button.ws-view__overlay[aria-label="Ver ${title} en grande"]`);
  if (await button.count()) await button.click();
  else if (await overlay.count()) await overlay.click();
  await page.locator(".ws-view--main .ws-view__header h2", { hasText: title }).waitFor();
  await page.waitForTimeout(600);
  await page.mouse.move(4, 4);
}

// La selección, leída del store de la propia app: el mismo módulo que Vite
// sirve a la página, en las dos versiones.
const selectionState = (page) =>
  page.evaluate(async () => {
    const { selectedNodeIds, selectedConnectionId } = (await import("/src/state/selection.ts")).useSelectionStore.getState();
    return { nodes: [...selectedNodeIds], connection: selectedConnectionId };
  });

const restoreSelection = (page, state) =>
  page.evaluate(async ({ nodes, connection }) => {
    (await import("/src/state/selection.ts")).useSelectionStore.setState({
      selectedNodeIds: new Set(nodes),
      selectedConnectionId: connection,
    });
  }, state);

const HEMISPHERE_SUFFIX = /\s*\(hemisferio (izquierdo|derecho)\)\s*$/;

// Cómo empieza el recuadro de lectura con esa región, en las dos versiones:
// «IFJa — Area IFJa…», o el nombre solo si ya empieza por la abreviatura
// («Hippocampus…», la región H). Sale de regions.json («preflight»).
function expectedRegion(abbreviation, hemisphere) {
  const row = readJson("regions.json").find((item) => item.abbreviation === abbreviation && item.hemisphere === hemisphere);
  if (!row) throw new Error(`No hay ${abbreviation} (${hemisphere}) en regions.json`);
  const name = row.label.replace(HEMISPHERE_SUFFIX, "");
  return {
    id: row.id,
    start: name.startsWith(abbreviation) ? name : `${abbreviation} — `,
    side: hemisphere === "L" ? "hemisferio izquierdo" : "hemisferio derecho",
  };
}

// Selecciona en el connectograma grande la región con esa abreviatura y ese
// hemisferio ("L" o "R"), y comprueba que es ella. Con el ratón encima, el
// recuadro de lectura tiene que nombrarla; tras el clic, tiene que seguir
// nombrándola y la selección tiene que tenerla. A 1024 px los círculos son
// pequeños y se tocan: si el centro no acierta, prueba a 2 px en cada
// dirección. Un clic que selecciona otra cosa se deshace: vuelve la
// selección de antes. Si no lo consigue, devuelve null y la apunta en
// notVerified. Nunca da por buena otra región.
async function selectNode(page, abbreviation, hemisphere) {
  const expected = expectedRegion(abbreviation, hemisphere);
  const readout = page.locator(".ws-view--main .connectogram-readout");
  const namesIt = (text) => text.startsWith(expected.start) && text.includes(expected.side);
  const centers = await page.locator(CONNECTOGRAM).evaluate((svg, ab) => {
    const found = [];
    for (const t of svg.querySelectorAll("text")) {
      const c = t.textContent === ab ? t.parentElement.querySelector("circle") : null;
      if (!c) continue;
      const r = c.getBoundingClientRect();
      found.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    return found;
  }, abbreviation);
  for (const center of centers) {
    for (const [dx, dy] of [[0, 0], [-2, 0], [2, 0], [0, -2], [0, 2]]) {
      const x = center.x + dx;
      const y = center.y + dy;
      await page.mouse.move(x, y);
      await page.waitForTimeout(250);
      if (!namesIt((await readout.textContent()) ?? "")) continue;
      const before = await selectionState(page);
      await page.mouse.click(x, y);
      await page.waitForTimeout(400);
      const text = (await readout.textContent()) ?? "";
      const after = await selectionState(page);
      await page.mouse.move(4, 4);
      await page.waitForTimeout(300);
      if (namesIt(text) && !before.nodes.includes(expected.id) && after.nodes.includes(expected.id)) return text;
      await restoreSelection(page, before);
      await page.waitForTimeout(300);
    }
  }
  notVerified.push(`${abbreviation} (${hemisphere})`);
  return null;
}

// Clic en el centro de una línea del connectograma grande. Comprueba que ha
// quedado seleccionada una conexión.
async function clickLine(page) {
  const point = await page.locator(CONNECTOGRAM).evaluate((svg) => {
    const line = [...svg.querySelectorAll("path")].find((p) => p.style.cursor === "pointer");
    if (!line) return null;
    const m = line.getPointAtLength(line.getTotalLength() / 2);
    const ctm = svg.getScreenCTM();
    return { x: m.x * ctm.a + ctm.e, y: m.y * ctm.d + ctm.f };
  });
  if (!point) throw new Error("No hay ninguna línea en el connectograma");
  await page.mouse.click(point.x, point.y);
  await page.mouse.move(4, 4);
  await page.waitForTimeout(400);
  if (!(await selectionState(page)).connection) throw new Error("El clic en la línea no seleccionó ninguna conexión");
}

// Deslizador controlado por React: se usa el setter del prototipo.
async function setWeightPosition(page, position) {
  await page.evaluate((p) => {
    const el = document.querySelector('input[aria-label="Peso mínimo de conectividad"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, String(p));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, position);
  await page.waitForTimeout(500);
}

const detailInfo = (page) =>
  page.evaluate(() => ({
    eyebrow: document.querySelector(".ws-detail .detail__eyebrow")?.textContent ?? null,
    title: document.querySelector(".ws-detail .detail__title")?.textContent ?? null,
    tags: [...document.querySelectorAll(".ws-detail .detail__tags > *")].map((e) => e.textContent),
    note: document.querySelector(".ws-detail .detail__note")?.textContent ?? null,
    factLabels: [...document.querySelectorAll(".ws-detail .detail__facts dt")].map((e) => e.textContent),
    facts: [...document.querySelectorAll(".ws-detail .detail__facts dd")].map((e) => e.textContent),
    rows: document.querySelectorAll(".ws-detail .detail__connection").length,
    names: [...document.querySelectorAll(".ws-detail .detail__connection-name")].slice(0, 5).map((e) => e.textContent),
    weights: [...document.querySelectorAll(".ws-detail .detail__connection-weight")].slice(0, 5).map((e) => e.textContent),
    more: document.querySelector(".ws-detail .detail__more")?.textContent ?? null,
    id: document.querySelector(".ws-detail .detail__id-value")?.textContent ?? null,
  }));

// Herramientas de la vista grande: si suben a la cabecera (absolute) y si
// tapan el título o la descripción.
const toolsLayout = (page) =>
  page.evaluate(() => {
    const view = document.querySelector(".ws-view--main");
    const tools = view.querySelector(".viz-panel__toolbar") ?? view.querySelector(".brain3d-toolbar > .export-btn");
    const heading = view.querySelector(".ws-view__heading").getBoundingClientRect();
    const description = view.querySelector(".ws-view__description");
    const a = tools?.getBoundingClientRect();
    return {
      view: view.dataset.view,
      contentWidth: view.clientWidth - 24,
      position: tools ? getComputedStyle(tools).position : null,
      overlap: Boolean(a) && a.left < heading.right && heading.left < a.right && a.top < heading.bottom && heading.top < a.bottom,
      descriptionLines: Math.round(description.getBoundingClientRect().height / parseFloat(getComputedStyle(description).lineHeight)),
      headerPaddingRight: getComputedStyle(view.querySelector(".ws-view__header")).paddingRight,
    };
  });

// Si dos elementos se solapan en pantalla (null si falta alguno).
const overlaps = (page, selectorA, selectorB) =>
  page.evaluate(
    ([a, b]) => {
      const ea = document.querySelector(a);
      const eb = document.querySelector(b);
      if (!ea || !eb) return null;
      const ra = ea.getBoundingClientRect();
      const rb = eb.getBoundingClientRect();
      return ra.left < rb.right && rb.left < ra.right && ra.top < rb.bottom && rb.top < ra.bottom;
    },
    [selectorA, selectorB],
  );

// El morado del acento de Original (#ac61d1) fuera de Original: no debe
// quedar ninguno (el uiSnapshot de la verificación de la fase 1).
const purpleScan = (page) =>
  page.evaluate(() => {
    const found = [];
    const props = ["color", "backgroundColor", "borderTopColor", "borderBottomColor", "outlineColor", "fill", "stroke", "boxShadow"];
    for (const el of document.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      for (const p of props) {
        if (/172,\s*97,\s*209/.test(style[p])) found.push(`${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className)} ${p}`);
      }
    }
    return found.slice(0, 20);
  });

// Lo que la D3 dejó para esta fase, en un tema: el anillo de foco del color
// de acento (con el foco del teclado, en la pestaña que sigue a «Atlas»),
// los anillos neutros de las muestras de red y «Todas» y «Ninguna» en una
// línea. .legend-swatch solo existe en las pestañas de tractografía con
// tractos cargados: se mide con una muestra de prueba con esa clase.
async function themeEvidence(page) {
  await page.locator(".topbar__tab-btn").first().focus();
  await page.keyboard.press("Tab");
  return page.evaluate(() => {
    const probe = document.createElement("span");
    document.body.append(probe);
    const resolve = (color) => {
      probe.style.color = color;
      return getComputedStyle(probe).color;
    };
    const accent = resolve("var(--accent)");
    const faint = resolve("var(--text-faint)");
    const focus = getComputedStyle(document.activeElement);
    probe.className = "legend-swatch";
    const legendRing = getComputedStyle(probe).boxShadow;
    probe.remove();
    const filterRing = getComputedStyle(document.querySelector(".filters__swatch")).boxShadow;
    const [all, none] = [...document.querySelectorAll(".filters__bulk button")].map((b) => b.getBoundingClientRect());
    return {
      foco: { elemento: document.activeElement?.textContent ?? null, estilo: focus.outlineStyle, color: focus.outlineColor, acento: accent, igual: focus.outlineColor === accent },
      anilloFiltros: { valor: filterRing, conTextFaint: filterRing.includes(faint) },
      anilloLeyenda: { valor: legendRing, conTextFaint: legendRing.includes(faint) },
      todasYNingunaEnUnaLinea: Boolean(all && none) && Math.abs(all.top - none.top) < 2,
    };
  });
}

// El panel de Ajustes se ve entero.
async function settingsFit(page) {
  await page.locator('button[aria-label="Ajustes"]').click();
  await page.locator(".settings__panel").waitFor();
  const box = await page.locator(".settings__panel").evaluate((p) => {
    const r = p.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, vw: innerWidth, vh: innerHeight };
  });
  await page.keyboard.press("Escape");
  return { ...box, inside: box.left >= 0 && box.top >= 0 && box.right <= box.vw && box.bottom <= box.vh };
}

// Estado de la barra superior: qué está plegado (data-collapse), si cabe
// en una fila y qué textos se ven.
async function barState(page) {
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const bar = document.querySelector(".topbar");
    const shown = (el) => Boolean(el) && el.getBoundingClientRect().width > 1;
    const status = document.querySelector(".data-status__text");
    return {
      collapse: bar.dataset.collapse ?? null,
      height: Math.round(bar.getBoundingClientRect().height),
      overflow: bar.scrollWidth > bar.clientWidth,
      tabLabels: [...document.querySelectorAll(".topbar__tab-label")].filter(shown).map((e) => e.textContent),
      statusText: shown(status) ? status.textContent : null,
      importLabel: shown(document.querySelector(".topbar__import-label")),
    };
  });
}

// Ejecuta la fase que se pide en la línea de órdenes.
function run(phases) {
  const phase = phases[process.argv[2]];
  if (!phase) {
    console.error(`Fase desconocida. Usa: ${Object.keys(phases).join(", ")}`);
    process.exit(1);
  }
  phase(...process.argv.slice(3)).then(
    () => console.log(notVerified.length ? `hecho; sin comprobar: ${notVerified.join(", ")}` : "hecho"),
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}

module.exports = {
  API, ATLAS, ATLAS_BRAINNETOME, BASE, BASE_ANTES, CONNECTOGRAM, THEMES,
  out, save, readJson, wait, recording, launch, load, focused, enlarge, selectionState, selectNode, clickLine,
  setWeightPosition, detailInfo, toolsLayout, overlaps, purpleScan, themeEvidence, settingsFit, barState, run,
};
```

- [ ] **Step 5: las fases de la primera parte**

Crea `$D/verify-fase3.cjs`:

```js
// Verificación de la fase 3, primera parte (Task 12 de
// docs/rediseno-interfaz-plan-fase3.md): barra superior, temas, síntesis,
// teclado y avisos.
//   PORT=5241 PORT_ANTES=5242 TMPDIR=<carpeta>/tmp node verify-fase3.cjs <fase>
const fs = require("fs");
const {
  API, ATLAS, ATLAS_BRAINNETOME, BASE, BASE_ANTES, CONNECTOGRAM, THEMES,
  out, save, readJson, wait, recording, launch, load, focused, enlarge, selectNode,
  detailInfo, toolsLayout, overlaps, purpleScan, themeEvidence, settingsFit, barState, run,
} = require("./lib-fase3.cjs");

// Espera a que respondan los dos servidores y guarda los datos de
// HCP-MMP1.0 con un GET de solo lectura; de Brainnetome, que las fases
// «teclado» y «deshacer» cargan, solo cuenta las regiones. Termina con
// código 2 si falta un servidor o HCP-MMP1.0, y con 3 si solo falta
// Brainnetome.
async function phasePreflight() {
  const r = {};
  for (const [name, base] of [["nueva", BASE], ["anterior", BASE_ANTES]]) {
    r[name] = false;
    for (let i = 0; i < 60 && !r[name]; i++) {
      try {
        r[name] = (await fetch(base)).ok;
      } catch {
        // Todavía arrancando.
      }
      if (!r[name]) await wait(1000);
    }
  }
  try {
    for (const [file, url] of [
      ["regions.json", `${API}/regions?atlas_id=${ATLAS}`],
      ["connections.json", `${API}/connections?atlas_id=${ATLAS}`],
    ]) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url}: ${response.status}`);
      const text = await response.text();
      fs.writeFileSync(out(file), text);
      r[file] = JSON.parse(text).length;
    }
    r.backend = r["regions.json"] > 0;
    const brainnetome = await fetch(`${API}/regions?atlas_id=${ATLAS_BRAINNETOME}`);
    r.brainnetome = brainnetome.ok ? (await brainnetome.json()).length : `error ${brainnetome.status}`;
  } catch (e) {
    r.backend = false;
    r.backendError = String(e);
  }
  save("preflight.json", r);
  console.log(JSON.stringify(r));
  if (!r.nueva || !r.anterior || !r.backend) process.exit(2);
  if (!(r.brainnetome > 0)) process.exit(3);
}

const readoutHeight = (page) => page.locator(".ws-view--main .connectogram-readout").evaluate((e) => e.getBoundingClientRect().height);

// Los cuatro temas a 1400x900 (la ventana de Tauri), 1280x800 y 1024x768.
async function phaseTemas() {
  const report = {};
  await recording("temas.json", report, async () => {
    for (const theme of THEMES) {
      for (const [width, height] of [[1400, 900], [1280, 800], [1024, 768]]) {
        const { browser, page, errors } = await launch(width, height);
        const tag = `${theme}-${width}x${height}`;
        const r = { errors };
        report[tag] = r;
        try {
          await load(page, theme);
          await page.screenshot({ path: out(`${tag}-1-inicio.png`) });
          r.bar = await barState(page);
          // Botón y valor de cada menú, con los espacios normalizados.
          r.layout = await page.evaluate(() => ({
            horizontalScroll: document.documentElement.scrollWidth > innerWidth,
            pageFits: document.documentElement.scrollHeight <= innerHeight,
            context: [...document.querySelectorAll(".data-menu__trigger")].map((e) =>
              [...e.querySelectorAll(".data-menu__caption, .data-menu__value")].map((s) => s.textContent).join(" ").replace(/\s+/g, " ").trim(),
            ),
            status: document.querySelector(".data-status")?.textContent,
          }));
          r.layout.contextOk = JSON.stringify(r.layout.context) === JSON.stringify(["Atlas HCP-MMP1.0", "Redes Cole-Anticevic"]);
          if (theme !== "original") r.purple = await purpleScan(page);
          if (width === 1400) r.theme = await themeEvidence(page);
          await enlarge(page, "Connectograma");
          r.connectogramTools = await toolsLayout(page);
          const heights = [await readoutHeight(page)];
          const first = await page.locator(`${CONNECTOGRAM} circle`).first().boundingBox();
          await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
          await page.waitForTimeout(300);
          heights.push(await readoutHeight(page));
          await page.mouse.move(4, 4);
          r.selected = await selectNode(page, "IFJa", "R");
          if (r.selected) {
            heights.push(await readoutHeight(page));
            r.readout = await page.locator(".ws-view--main .connectogram-readout").textContent();
            r.detail = await detailInfo(page);
          }
          r.readoutHeights = heights;
          await page.screenshot({ path: out(`${tag}-2-region.png`) });
          await enlarge(page, "Hemisferios");
          r.hemispheresTools = await toolsLayout(page);
          r.hemispheresReadout = await page.locator(".ws-view--main .hemisferios-readout").textContent();
          await enlarge(page, "Cerebro 3D");
          await page.waitForTimeout(1500);
          r.brainTools = await toolsLayout(page);
          await page.screenshot({ path: out(`${tag}-3-cerebro3d.png`) });
          if (width === 1024) r.settings = await settingsFit(page);
        } finally {
          await browser.close();
        }
      }
    }
  });
}

// Con el foco del teclado, lo plegado muestra su nombre (data-tip). Se
// llega con Tab desde el control anterior, para que cuente como teclado.
async function tipOnFocus(page, selector) {
  await page.locator(selector).first().focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  return page.evaluate(() => ({
    focused: document.activeElement?.className ?? null,
    tip: getComputedStyle(document.activeElement, "::after").content,
  }));
}

// La barra a varios anchos, con datos reales y con datos de demostración
// (se simulan contestando a /regions con una lista vacía).
async function phaseBarra() {
  const r = {};
  await recording("barra.json", r, async () => {
    for (const width of [1600, 1440, 1400, 1366, 1280, 1152, 1024, 900]) {
      const { browser, page, errors } = await launch(width, width <= 900 ? 640 : 800);
      r[`errores-${width}`] = errors;
      try {
        await load(page, "grafito");
        r[`reales-${width}`] = await barState(page);
        await page.screenshot({ path: out(`barra-reales-${width}.png`), clip: { x: 0, y: 0, width, height: 110 } });
        if (width === 1024) {
          r.tipPestana = await tipOnFocus(page, '.topbar__tab-btn[data-tab-id="species"]');
          r.tipImportar = await tipOnFocus(page, ".topbar__import");
          await page.screenshot({ path: out("barra-1024-etiqueta-con-foco.png"), clip: { x: 0, y: 0, width, height: 110 } });
        }
      } finally {
        await browser.close();
      }
    }
    for (const width of [1280, 1024]) {
      const { browser, page } = await launch(width, 800);
      try {
        await page.route(
          (url) => url.pathname === "/regions",
          (route) => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "[]" }),
        );
        await page.goto(BASE);
        await page.evaluate(() => localStorage.setItem("neurograph.apariencia", JSON.stringify({ theme: "grafito", paletteMode: null })));
        await page.reload();
        await page.locator(".data-status--demo").waitFor({ timeout: 60000 });
        r[`demo-${width}`] = await barState(page);
        r[`demo-${width}-emergente`] = await page.locator(".data-status--demo").getAttribute("title");
        await page.screenshot({ path: out(`barra-demo-${width}.png`), clip: { x: 0, y: 0, width, height: 110 } });
      } finally {
        await browser.close();
      }
    }
  });
}

// Tauri simulado: el diálogo de abrir devuelve una ruta (o falla una vez, si
// window.__DIALOG_FAIL__) y read_synthesis_file devuelve el texto que el
// script deja en window.__NEXT_SYNTHESIS__. La app importa con su
// validación de siempre, contra las regiones cargadas.
function tauriStub() {
  window.isTauri = true;
  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd) => {
      if (cmd === "plugin:dialog|open") {
        if (window.__DIALOG_FAIL__) {
          window.__DIALOG_FAIL__ = false;
          throw new Error("diálogo simulado que falla");
        }
        return "/prueba/sintesis.json";
      }
      if (cmd === "read_synthesis_file") return window.__NEXT_SYNTHESIS__ ?? "";
      throw new Error(`Tauri simulado: ${cmd}`);
    },
  };
}

function synthesisFile(name, regionIds) {
  const citation = { authors: "Autora A", year: 2020, title: "Título de prueba", journal: null, doi: null, url: null };
  const finding = { id: "h1", summary: "Hallazgo de prueba", evidenceType: "functional", regionIds, networkSlug: null, citation, agreesWith: null, conflictsWith: null };
  return JSON.stringify({ schemaVersion: 1, function: name, generatedBy: "Verificación de la fase 3", atlasId: ATLAS, notes: null, findings: [finding] });
}

async function importSynthesis(page, text) {
  await page.evaluate((t) => {
    window.__NEXT_SYNTHESIS__ = t;
  }, text);
  await page.locator(".topbar__import").click();
}

async function readToast(toast) {
  await toast.waitFor();
  await toast.locator("summary").click();
  return { aviso: await toast.locator(".toast__message").textContent(), detalles: await toast.locator("pre").textContent() };
}

// Dos pestañas de síntesis de nombre largo: la barra con ellas a 1400, 1280
// y 1024 px; cerrarlas con el teclado, y los avisos de error al importar.
async function phaseSintesis() {
  const r = {};
  await recording("sintesis.json", r, async () => {
    const { browser, page, errors } = await launch(1400, 900, { init: tauriStub });
    r.errores = errors;
    const toast = page.locator('.toast[role="alert"]');
    const ids = readJson("regions.json").slice(0, 2).map((row) => row.id);
    const NAMES = ["Memoria de trabajo visoespacial en adultos mayores", "Atención sostenida y control inhibitorio en la infancia"];
    try {
      await load(page, "grafito");
      for (const name of NAMES) {
        await importSynthesis(page, synthesisFile(name, ids));
        await page.locator('.topbar__tab-btn[aria-current="page"]', { hasText: name.slice(0, 12) }).waitFor();
        await page.locator(".topbar__tab-btn", { hasText: "Atlas" }).click();
        await page.locator(".data-status--real").waitFor();
        r[`${name.slice(0, 12)}-1400`] = await barState(page);
      }
      await page.screenshot({ path: out("sintesis-dos-pestanas-1400.png") });
      for (const [width, height] of [[1280, 800], [1024, 768]]) {
        await page.setViewportSize({ width, height });
        r[`dos-${width}`] = await barState(page);
        await page.screenshot({ path: out(`sintesis-dos-pestanas-${width}.png`) });
      }
      await page.setViewportSize({ width: 1400, height: 900 });
      const close = page.locator(".topbar__tab-close");
      await close.nth(1).focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      r.focoTrasCerrarLaSegunda = await focused(page);
      await close.first().focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);
      r.focoTrasCerrarLaUltima = await focused(page);
      r.pestanasTrasCerrar = await close.count();
      await importSynthesis(page, "{no es json");
      r.jsonRoto = await readToast(toast);
      await toast.getByRole("button", { name: "Entendido" }).click();
      await page.evaluate(() => {
        window.__DIALOG_FAIL__ = true;
      });
      await page.locator(".topbar__import").click();
      r.dialogoFalla = await readToast(toast);
      await toast.getByRole("button", { name: "Entendido" }).click();
      await importSynthesis(page, synthesisFile("Prueba", ["region.no.existe"]));
      r.regionDesconocida = await readToast(toast);
      await page.screenshot({ path: out("sintesis-aviso-validacion.png") });
    } finally {
      await browser.close();
    }
  });
}

async function activeOption(page) {
  return page.evaluate(() => {
    const list = document.querySelector('[role="listbox"]');
    return list ? (document.getElementById(list.getAttribute("aria-activedescendant"))?.textContent ?? null) : null;
  });
}

const loadedAtlas = (page, name) =>
  page.waitForFunction(
    (n) => document.querySelector(".data-menu__value")?.textContent === n && document.querySelector(".data-status--real"),
    name,
    { timeout: 120000 },
  );

// Lista del contexto de datos, solo con el teclado.
async function phaseTeclado() {
  const r = {};
  await recording("teclado.json", r, async () => {
    const { browser, page, errors } = await launch(1280, 800);
    r.errores = errors;
    try {
      await load(page, "grafito");
      const atlas = page.locator(".data-menu__trigger", { hasText: "Atlas" });
      await atlas.focus();
      await page.keyboard.press("ArrowDown");
      r.alAbrir = { listas: await page.locator('[role="listbox"]').count(), foco: await focused(page), activa: await activeOption(page) };
      await page.screenshot({ path: out("teclado-1-lista-abierta.png") });
      await page.keyboard.press("ArrowDown");
      r.trasFlecha = await activeOption(page);
      await page.keyboard.press("Escape");
      r.trasEscape = { listas: await page.locator('[role="listbox"]').count(), foco: await focused(page) };
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Tab");
      r.trasTab = { listas: await page.locator('[role="listbox"]').count(), foco: await focused(page) };
      await atlas.focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      r.trasElegir = { foco: await focused(page) };
      await loadedAtlas(page, "Brainnetome");
      // La barra no se ha vuelto a montar al pasar por la vista de carga: el
      // foco sigue en el botón «Atlas».
      r.trasCargar = { foco: await focused(page), atlas: await page.locator(".data-menu__value").first().textContent() };
      await page.screenshot({ path: out("teclado-2-brainnetome.png") });
      await atlas.focus();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Home");
      await page.keyboard.press("Enter");
      await loadedAtlas(page, "HCP-MMP1.0");
      // Mientras carga una clasificación, el botón no cambia de ancho: la
      // respuesta se retrasa 1,5 s para verlo.
      await page.route(
        (u) => u.pathname === "/regions" && u.searchParams.has("network_source"),
        async (route) => {
          await wait(1500);
          await route.continue();
        },
      );
      const redes = page.locator(".data-menu__trigger", { hasText: "Redes" });
      await redes.focus();
      await page.keyboard.press("ArrowDown");
      // «— 7 redes» y no «7 redes», que también está en «17 redes».
      for (let i = 0; i < 10 && !((await activeOption(page)) ?? "").includes("— 7 redes"); i++) await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      const trigger = async () => ({
        texto: await redes.textContent(),
        ancho: await redes.evaluate((e) => e.getBoundingClientRect().width),
        gira: await page.locator(".data-menu__spinner").count(),
      });
      r.redesMientrasCarga = await trigger();
      // El botón dice «Yeo 7» en cuanto se elige; ha llegado cuando deja de girar.
      await page.waitForFunction(
        () => document.querySelectorAll(".data-menu__value")[1]?.textContent === "Yeo 7" && !document.querySelector(".data-menu__spinner"),
        null,
        { timeout: 120000 },
      );
      r.redesElegida = await trigger();
    } finally {
      await browser.close();
    }
  });
}

// Avisos: Importar en el navegador, un error simulado al cambiar de
// clasificación, dos avisos a la vez, dónde se ven y adónde va el foco al
// cerrarlos.
async function phaseAvisos() {
  const r = {};
  await recording("avisos.json", r, async () => {
    const { browser, page, errors } = await launch(1280, 800);
    r.errores = errors; // Se espera el 500 simulado; nada más.
    const toast = page.locator('.toast[role="alert"]');
    const failNetworkSource = (url) => url.pathname === "/regions" && url.searchParams.has("network_source");
    const toastOfFocus = () => page.evaluate(() => document.activeElement?.closest(".toast")?.dataset.toastKey ?? null);
    try {
      await load(page, "grafito");
      await page.locator(".topbar__import").click();
      await toast.waitFor();
      r.importar = await toast.textContent();
      // Arriba a la derecha: ni sobre la barra ni sobre la vista grande.
      r.sitio = { sobreLaBarra: await overlaps(page, ".toast-region", ".topbar"), sobreLaVistaGrande: await overlaps(page, ".toast-region", ".ws-view--main") };
      await page.screenshot({ path: out("avisos-1-importar.png") });
      await toast.getByRole("button", { name: "Entendido" }).focus();
      await page.keyboard.press("Enter");
      r.importarTrasCerrar = { avisos: await toast.count(), foco: await focused(page) };
      await page.route(failNetworkSource, (route) => route.fulfill({ status: 500, body: "fallo simulado" }));
      await page.locator(".topbar__import").click();
      await page.locator(".data-menu__trigger", { hasText: "Redes" }).click();
      await page.locator('[role="option"]', { hasText: "— 7 redes" }).click();
      await toast.nth(1).waitFor({ timeout: 30000 });
      r.dosAvisos = await toast.count();
      r.redes = await readToast(toast.nth(1));
      await page.screenshot({ path: out("avisos-2-dos-avisos.png") });
      await toast.first().getByRole("button", { name: "Entendido" }).focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      r.focoTrasCerrarElPrimero = { aviso: await toastOfFocus(), foco: await focused(page) };
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      r.focoTrasCerrarElUltimo = await focused(page);
      await page.unroute(failNetworkSource);
      r.redesTrasError = await page.locator(".data-menu__value").nth(1).textContent();
    } finally {
      await browser.close();
    }
  });
}

// Las demás pestañas: sin contexto de datos, con la pestaña marcada; y
// Ajustes a 900x600, el tamaño mínimo de la ventana de Tauri. Las pestañas
// de tractografía piden sus datos al backend: sus errores de carga se
// separan de los demás.
async function phaseOtras() {
  const r = {};
  await recording("otras.json", r, async () => {
    const first = await launch(1280, 800);
    try {
      await load(first.page, "claro");
      for (const [name, slug] of [["Comparar especies", "especies"], ["Tractografía 3D", "tractografia"], ["Nodos de tractografía", "nodos"], ["Atlas", "atlas"]]) {
        await first.page.locator(".topbar__tab-btn", { hasText: name }).click();
        await first.page.waitForTimeout(800);
        r[slug] = await first.page.evaluate(() => ({
          actual: document.querySelector('[aria-current="page"]')?.textContent ?? null,
          contextoDeDatos: Boolean(document.querySelector(".data-context")),
        }));
        await first.page.screenshot({ path: out(`otras-${slug}.png`) });
      }
    } finally {
      r.erroresDeTractografia = first.errors.filter((e) => /tract/i.test(e));
      r.otrosErrores = first.errors.filter((e) => !/tract/i.test(e));
      await first.browser.close();
    }
    const small = await launch(900, 600);
    try {
      await load(small.page, "grafito");
      r.ajustes900x600 = await settingsFit(small.page);
    } finally {
      await small.browser.close();
    }
  });
}

run({
  preflight: phasePreflight,
  temas: phaseTemas,
  barra: phaseBarra,
  sintesis: phaseSintesis,
  teclado: phaseTeclado,
  avisos: phaseAvisos,
  otras: phaseOtras,
});
```

- [ ] **Step 6: ejecutar**

Primero «preflight», que espera a los dos servidores, guarda `regions.json` y `connections.json` de HCP-MMP1.0 con un GET de solo lectura y cuenta las regiones de Brainnetome:

```bash
cd "$D" && PORT=5241 PORT_ANTES=5242 TMPDIR="$D/tmp" timeout 300 node verify-fase3.cjs preflight
```

Si termina con código 2, mira `preflight.json`. Si falta el backend o HCP-MMP1.0, no lances las demás fases, que necesitan datos reales: dilo en el informe y en la D4, y pasa a la Task 13 solo para parar los servidores. Si falta un servidor, revisa el Step 3. Con código 3 solo falta Brainnetome: lanza las demás fases igualmente, y el cambio de atlas de `teclado` y de `deshacer` quedará «sin comprobar».

Después, cada fase en su propia orden, con un tiempo límite de 15 minutos (`temas` abre doce navegadores; mejor en segundo plano):

```bash
cd "$D" && PORT=5241 PORT_ANTES=5242 TMPDIR="$D/tmp" timeout 900 node verify-fase3.cjs temas
```

Lo mismo con `barra`, `sintesis`, `teclado`, `avisos` y `otras`. Tras cada una, comprueba que no quedan navegadores sueltos. En el patrón, `tm[p]` encuentra `tmp` en la línea de órdenes de los navegadores, pero no en la de la propia búsqueda, que dice `tm[p]`:

```bash
pgrep -af "$D/tm[p]" || echo "sin navegadores sueltos"
```

Expected: «sin navegadores sueltos». Si lista alguno, ciérralos y vuelve a comprobar:

```bash
pkill -f "$D/tm[p]"
```

Si una fase falla por una suposición del script (un selector, un tiempo de espera), corrígela, anótalo y repite esa fase. Si falla por la app, sigue: la Task 13 revisa todo y corrige.

---

## Chunk 11: verificación en la app real, segunda parte

### Task 13: verificación en la app real: vistas, filtros, exportación, deshacer, buscador y revisión

**Files:**
- Create: más archivos en la carpeta `$D` de la Task 12. Nada de esto entra en el repositorio.
- Modify: solo los arreglos del Step 5, si hacen falta.

Siguen las reglas del navegador y de honestidad de la Task 12.

- [ ] **Step 0: la carpeta y los servidores de la Task 12**

Si esta tarea empieza en otra sesión, o si la Task 12 terminó hace rato, recupera la carpeta, la más reciente:

```bash
D=$(ls -dt /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase3-verif-* | head -1) && echo "$D"
ss -ltn | grep -E ':(5241|5242) ' || echo "no hay ningún servidor en marcha"
```

Apunta la ruta, que sustituye a `$D` en lo que sigue, como en la Task 12. Tienen que salir los dos puertos. Si falta alguno, arráncalo con su orden del Step 3 de la Task 12. Después, vuelve a lanzar «preflight», que espera a los dos servidores y guarda otra vez los datos:

```bash
cd "$D" && PORT=5241 PORT_ANTES=5242 TMPDIR="$D/tmp" timeout 300 node verify-fase3.cjs preflight
```

Con código 2 o 3, lo mismo que en el Step 6 de la Task 12.

- [ ] **Step 1: las fases de la segunda parte**

Crea `$D/verify-fase3-b.cjs`:

```js
// Verificación de la fase 3, segunda parte (Task 13 de
// docs/rediseno-interfaz-plan-fase3.md): vistas, filtros, exportación,
// deshacer y buscador.
//   PORT=5241 PORT_ANTES=5242 TMPDIR=<carpeta>/tmp node verify-fase3-b.cjs <fase> [argumentos]
const {
  BASE, BASE_ANTES, CONNECTOGRAM,
  out, readJson, recording, launch, load, focused, enlarge, selectionState, selectNode, clickLine,
  setWeightPosition, detailInfo, toolsLayout, overlaps, run,
} = require("./lib-fase3.cjs");

// Las selecciones de la D3 para la leyenda: etiquetas largas y cortas.
const LONG = [["3b", "R"], ["TPOJ1", "L"], ["SCEF", "L"]];
const SHORT = [["1", "R"], ["2", "R"], ["H", "R"]];

// Ancho de las acciones ◎ y + de una red: 1 px ocultas, unos 46 px a la vista.
const actionsWidth = (page, index = 0) =>
  page.locator(".filters__network").nth(index).locator(".filters__actions").evaluate((e) => Math.round(e.getBoundingClientRect().width));

// «Peso mínimo»: el valor largo, «0 (sin filtro, se muestra todo)», no se
// parte: si no cabe junto al título, baja entero a la línea siguiente, y
// queda dentro del panel.
const weightValueLayout = (page) =>
  page.evaluate(() => {
    const value = document.querySelector(".filters__weight-value");
    const heading = value.parentElement.querySelector(".filters__heading").getBoundingClientRect();
    const panel = document.querySelector(".ws-filters .filter-panel").getBoundingClientRect();
    const v = value.getBoundingClientRect();
    return {
      texto: value.textContent,
      bajoElTitulo: v.top >= heading.bottom - 1,
      dentro: v.left >= panel.left && v.right <= panel.right,
    };
  });

// Cabeceras, herramientas, lupa, miniaturas, filtros y panel de detalle.
async function phaseVistas() {
  const r = {};
  await recording("vistas.json", r, async () => {
    for (const [width, height] of [[1440, 900], [1280, 800]]) {
      const { browser, page, errors } = await launch(width, height);
      r[`errores-${width}`] = errors;
      try {
        await load(page, "grafito");
        r[`peso-${width}`] = await weightValueLayout(page);
        await enlarge(page, "Connectograma");
        r[`herramientas-${width}`] = await toolsLayout(page);
        await page.screenshot({ path: out(`vistas-${width}-1-connectograma.png`) });
        if (width !== 1440) continue;
        const lupa = page.locator(".ws-view--main button[aria-pressed]", { hasText: "Lupa" });
        r.lupa = [await lupa.getAttribute("aria-pressed")];
        await lupa.click();
        r.lupa.push(await lupa.getAttribute("aria-pressed"));
        await lupa.click();
        r.lupa.push(await lupa.getAttribute("aria-pressed"));
        await page.locator('button.ws-view__enlarge[aria-label="Ampliar Hemisferios"]').focus();
        await page.keyboard.press("Enter");
        await page.locator(".ws-view--main .ws-view__header h2", { hasText: "Hemisferios" }).waitFor();
        r.focoTrasAmpliar = await focused(page);
        r.herramientasHemisferios = await toolsLayout(page);
        await page.screenshot({ path: out("vistas-1440-2-hemisferios.png") });
        // Un clic en la capa de una miniatura la sigue ampliando...
        await page.locator('.ws-view--thumb[data-view="connectogram"] .ws-view__overlay').click();
        await page.waitForTimeout(600);
        r.clicEnLaCapa = await page.locator(".ws-view--main").getAttribute("data-view");
        // ...y el tabulador nunca llega a ella.
        await page.mouse.move(4, 4);
        await page.locator(".topbar__tab-btn").first().focus();
        let overlayReached = false;
        for (let i = 0; i < 120 && !overlayReached; i++) {
          await page.keyboard.press("Tab");
          overlayReached = await page.evaluate(() => Boolean(document.activeElement?.classList.contains("ws-view__overlay")));
        }
        r.tabLlegaALaCapa = overlayReached;
        await enlarge(page, "Cerebro 3D");
        r.herramientasCerebroSinSeleccion = await toolsLayout(page);
        await page.screenshot({ path: out("vistas-1440-3-cerebro3d-sin-seleccion.png") });
        await enlarge(page, "Connectograma");
        const row = page.locator(".filters__network").first();
        r.filtros = { accionesEnReposo: await actionsWidth(page) };
        await row.hover();
        r.filtros.accionesAlPasar = await actionsWidth(page);
        await page.screenshot({ path: out("vistas-1440-4-fila-de-red.png") });
        // Un clic en la casilla no deja ◎ y + a la vista...
        await row.locator('input[type="checkbox"]').click();
        await page.mouse.move(700, 450);
        r.filtros.trasClicEnLaCasilla = await actionsWidth(page);
        await row.locator('input[type="checkbox"]').click();
        await page.mouse.move(700, 450);
        // ...y con el teclado sí se ven, con Tab y con Mayús+Tab.
        await row.locator('input[type="checkbox"]').focus();
        await page.keyboard.press("Tab");
        r.filtros.conTabulador = { foco: await focused(page), ancho: await actionsWidth(page) };
        await page.locator(".filters__network").nth(1).locator('input[type="checkbox"]').focus();
        await page.keyboard.press("Shift+Tab");
        r.filtros.conMayusTab = { foco: await focused(page), ancho: await actionsWidth(page) };
        const typesToggle = page.locator(".filters__disclosure", { hasText: "Tipo de conectividad" });
        await typesToggle.click();
        r.filtros.seccionPlegada = { ariaExpanded: await typesToggle.getAttribute("aria-expanded"), cuerpoVisible: await page.locator(".filters__types").isVisible() };
        await typesToggle.click();
        r.filtros.seccionDesplegada = await typesToggle.getAttribute("aria-expanded");
        const recuadro = await selectNode(page, "IFJa", "R");
        r.region = { recuadro, detalle: recuadro ? await detailInfo(page) : "sin comprobar" };
        if (recuadro) {
          await page.locator(".detail__more").click();
          r.regionDesplegada = await detailInfo(page);
          // El texto oculto de la lista larga no alarga la página.
          r.paginaTrasDesplegar = await page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight }));
          await page.screenshot({ path: out("vistas-1440-5-detalle-desplegado.png") });
          // El peso conserva su formato; cada fila cabe en los 300 px del panel.
          r.filasDeConexion = await page.evaluate(() =>
            [...document.querySelectorAll(".ws-detail .detail__connection")].slice(0, 5).map((item) => ({
              ancho: Math.round(item.getBoundingClientRect().width),
              desborda: item.scrollWidth > item.clientWidth,
              nombre: Math.round(item.querySelector(".detail__connection-name").getBoundingClientRect().width),
              peso: item.querySelector(".detail__connection-weight").textContent,
            })),
          );
          await page.locator(".detail__more").click();
          r.regionPlegada = await detailInfo(page);
          await page.locator(".detail__id-copy").click();
          await page.waitForTimeout(300);
          r.copiar = await page.evaluate(async () => ({
            estado: document.querySelector(".detail__id [role=status]")?.textContent ?? null,
            portapapeles: await navigator.clipboard.readText().catch((e) => `error: ${e}`),
            seleccion: String(getSelection()),
          }));
          await page.screenshot({ path: out("vistas-1440-6-detalle-region.png") });
        }
        // Con todas las conexiones pasan más de 10 000 y el connectograma no
        // dibuja ninguna: con el peso de las exportaciones, sí.
        await setWeightPosition(page, 0.6);
        await clickLine(page);
        r.conexion = await detailInfo(page);
        await page.screenshot({ path: out("vistas-1440-7-detalle-conexion.png") });
        await page.locator(".ws-filters button", { hasText: "Limpiar" }).click();
        let all = true;
        for (const [abbreviation, hemisphere] of LONG) all = Boolean(await selectNode(page, abbreviation, hemisphere)) && all;
        r.multiple = all ? await detailInfo(page) : "sin comprobar";
        // El recuento del recuadro de lectura solo sale con una región.
        r.recuentoConVarias = await page.locator(".ws-view--main .readout-selection__count").count();
        r.leyenda = await page.evaluate(() => {
          const svg = document.querySelector(".ws-detail .legend-svg");
          if (!svg) return null;
          const box = svg.getBBox();
          const frame = svg.parentElement;
          return {
            ancho: Number(svg.getAttribute("width")),
            bordeDelTexto: Math.ceil(box.x + box.width),
            desplazable: frame.scrollWidth > frame.clientWidth,
            textos: [...svg.querySelectorAll("text")].map((t) => t.textContent),
          };
        });
        await page.screenshot({ path: out("vistas-1440-8-detalle-multiple.png") });
      } finally {
        await browser.close();
      }
    }
  });
}

// Referencia calculada aquí con los mismos datos que recibe la página (los
// JSON guardados), con la regla de logic/visibility.ts: peso >= el mínimo y
// los dos extremos en redes visibles.
function reference(regions, connections, { hiddenNetwork = null, hiddenTypes = [], minWeight = 0, regionId = null } = {}) {
  const visible = new Set(regions.filter((row) => row.network !== hiddenNetwork).map((row) => row.id));
  const byType = { structural: 0, functional: 0, effective: 0 };
  let passing = 0;
  let ofRegion = 0;
  for (const c of connections) {
    if (c.weight < minWeight || !visible.has(c.source) || !visible.has(c.target)) continue;
    if (c.type in byType) byType[c.type] += 1;
    if (hiddenTypes.includes(c.type)) continue;
    passing += 1;
    if (c.source === regionId || c.target === regionId) ofRegion += 1;
  }
  return { byType, passing, loaded: connections.length, ofRegion };
}

// Lo que dice el panel, con las cifras ya como números: los recuentos por
// tipo con la clave de cada tipo, y en «N de M conexiones pasan los
// filtros» y en el recuadro de lectura, las cifras sin el espacio fino
// que separa los miles.
async function panelCounts(page) {
  return page.evaluate(async () => {
    // NETWORK_LABELS de la propia app, servido por Vite, para nombrar cada red.
    const { NETWORK_LABELS } = await import("/src/theme/networks.ts");
    const KEYS = { Estructural: "structural", Funcional: "functional", Efectiva: "effective" };
    const numbers = (text) => (text ?? "").replace(/(\d)\s(?=\d{3}\b)/g, "$1").match(/\d+/g)?.map(Number) ?? [];
    const readout = document.querySelector(".ws-view--main .readout-selection__count")?.textContent ?? null;
    const passing = document.querySelector(".filters__visible").textContent;
    return {
      labels: NETWORK_LABELS,
      networks: [...document.querySelectorAll(".filters__network label")].map((label) => label.title),
      types: Object.fromEntries(
        [...document.querySelectorAll(".filters__type")].map((row) => {
          const name = row.querySelector(".filters__name").textContent.trim();
          return [KEYS[name] ?? name, numbers(row.querySelector(".filters__count").textContent)[0]];
        }),
      ),
      passingText: passing,
      passing: numbers(passing).slice(0, 2),
      readoutText: readout,
      readout: readout === null ? null : numbers(readout)[0],
    };
  });
}

// Recuentos de Filtros y del recuadro de lectura contra la referencia.
async function phaseFiltros() {
  const r = {};
  await recording("filtros.json", r, async () => {
    const regions = readJson("regions.json");
    const connections = readJson("connections.json");
    const ifja = regions.find((row) => row.abbreviation === "IFJa" && row.hemisphere === "R").id;
    const { browser, page, errors } = await launch(1440, 900, { saved: true });
    r.errores = errors;
    try {
      await load(page, "grafito");
      await enlarge(page, "Connectograma");
      r.region = await selectNode(page, "IFJa", "R");
      const panel = await panelCounts(page);
      const perNetwork = new Map();
      for (const row of regions) perNetwork.set(row.network, (perNetwork.get(row.network) ?? 0) + 1);
      const expected = [...perNetwork].map(([key, n]) => `${panel.labels[key] ?? key} — ${n} región${n === 1 ? "" : "es"}`);
      r.redes = { iguales: JSON.stringify([...panel.networks].sort()) === JSON.stringify([...expected].sort()), panel: panel.networks, referencia: expected };
      const compare = async (name, options) => {
        const now = await panelCounts(page);
        const ref = reference(regions, connections, { ...options, regionId: ifja });
        r[name] = {
          iguales: {
            tipos: Object.keys(ref.byType).every((type) => now.types[type] === ref.byType[type]),
            pasan: now.passing[0] === ref.passing && now.passing[1] === ref.loaded,
            // Sin la región seleccionada, el recuadro queda sin comprobar.
            recuadro: r.region ? now.readout === ref.ofRegion : "sin comprobar",
          },
          panel: { tipos: now.types, pasan: now.passingText, recuadro: now.readoutText },
          referencia: ref,
        };
      };
      await compare("inicio");
      const structural = page.locator(".filters__type", { hasText: "Estructural" }).locator("input");
      await structural.click();
      await compare("sinEstructural", { hiddenTypes: ["structural"] });
      await structural.click();
      const firstNetwork = [...perNetwork.keys()].find((key) => (panel.labels[key] ?? key) === panel.networks[0].split(" — ")[0]);
      await page.locator(".filters__network").first().locator("input").click();
      await compare("sinLaPrimeraRed", { hiddenNetwork: firstNetwork });
      await page.locator(".filters__network").first().locator("input").click();
      await setWeightPosition(page, 0.6);
      const minWeight = await page.evaluate(async () => (await import("/src/logic/weightScale.ts")).sliderPositionToWeight(0.6));
      await compare("conPeso", { minWeight });
      r.pesoMinimo = minWeight;
      await page.screenshot({ path: out("filtros-con-peso.png") });
    } finally {
      await browser.close();
    }
  });
}

// Exportaciones con los datos guardados, en una versión (nueva o la
// anterior a esta fase) y un tema: connectograma y hemisferios en las dos,
// cerebro 3D solo en la nueva, y las leyendas larga y corta de la D3.
async function phaseExportar(which, theme) {
  const base = which === "anterior" ? BASE_ANTES : BASE;
  const tag = `${which}-${theme}`;
  const r = { which, theme, files: {} };
  await recording(`exportar-${tag}.json`, r, async () => {
    const { browser, page, errors } = await launch(1400, 900, { saved: true });
    r.errors = errors;
    // measure corre en la página; arg le llega como argumento, porque la
    // función se serializa sin las variables de este script.
    const exportFrom = async (button, name, measure, arg) => {
      const size = await page.evaluate(measure, arg);
      const [download] = await Promise.all([page.waitForEvent("download", { timeout: 90000 }), button.click()]);
      await download.saveAs(out(name));
      r.files[name] = size;
    };
    const svgSize = (selector) => {
      const svg = document.querySelector(selector);
      return { kind: "svg", width: svg.width.baseVal.value, height: svg.height.baseVal.value };
    };
    try {
      await load(page, theme, base);
      await setWeightPosition(page, 0.6);
      await enlarge(page, "Connectograma");
      if (!(await selectNode(page, ...LONG[0]))) throw new Error(`No se pudo seleccionar ${LONG[0].join(" ")}: exportación sin comprobar`);
      const exportButton = page.locator(".ws-view--main button.export-btn", { hasText: "Exportar JPEG" });
      await exportFrom(exportButton, `${tag}-connectograma.jpg`, svgSize, CONNECTOGRAM);
      await enlarge(page, "Hemisferios");
      await exportFrom(exportButton, `${tag}-hemisferios.jpg`, svgSize, ".ws-view--main .viz-panel__area svg");
      if (which === "nueva") {
        await enlarge(page, "Cerebro 3D");
        await page.locator(".ws-view--main .brain3d-surface-status", { hasText: "En color: lo seleccionado y sus vecinos" }).waitFor({ timeout: 120000 });
        await page.waitForTimeout(2500);
        await page.mouse.move(4, 4);
        await exportFrom(exportButton, `${tag}-cerebro3d.jpg`, () => {
          const canvas = document.querySelector(".ws-view--main canvas");
          return { kind: "canvas", width: canvas.width, height: canvas.height };
        });
      }
      await enlarge(page, "Connectograma");
      const legendButton = page.locator(".ws-detail button.export-btn", { hasText: "Exportar leyenda JPEG" });
      let long = true;
      for (const [abbreviation, hemisphere] of LONG.slice(1)) long = Boolean(await selectNode(page, abbreviation, hemisphere)) && long;
      r.longTexts = await page.locator(".ws-detail .legend-svg text").allTextContents();
      if (long) await exportFrom(legendButton, `${tag}-leyenda-larga.jpg`, svgSize, ".ws-detail .legend-svg");
      await page.locator(".ws-filters button", { hasText: "Limpiar" }).click();
      await page.waitForTimeout(400);
      let short = true;
      for (const [abbreviation, hemisphere] of SHORT) short = Boolean(await selectNode(page, abbreviation, hemisphere)) && short;
      r.shortTexts = await page.locator(".ws-detail .legend-svg text").allTextContents();
      if (short) await exportFrom(legendButton, `${tag}-leyenda-corta.jpg`, svgSize, ".ws-detail .legend-svg");
    } finally {
      await browser.close();
    }
  });
}

// Deshacer y rehacer: un montaje de tres regiones y una red oculta; un clic
// en una línea que lo sustituye, con su aviso; los atajos y los botones; el
// tiempo del aviso; su «Deshacer»; Filtros plegado; ◎ y «Limpiar»; un
// arrastre del deslizador; y otra clasificación y otro atlas, que vacían
// el historial.
async function phaseDeshacer() {
  const r = {};
  await recording("deshacer.json", r, async () => {
    const { browser, page, errors } = await launch(1440, 900);
    r.errores = errors;
    const selectionText = () => page.locator(".filters__selection > span").first().textContent();
    const undoButton = page.locator('.history__btn[aria-label="Deshacer"]');
    const redoButton = page.locator('.history__btn[aria-label="Rehacer"]');
    const notice = page.locator('.toast[data-toast-key="deshacer"]');
    const live = page.locator('[aria-live="polite"]');
    const noticeUndo = notice.getByRole("button", { name: "Deshacer" });
    // El aviso, si está: su texto y su rol.
    const noticeState = () =>
      page.evaluate(() => {
        const toast = document.querySelector('.toast[data-toast-key="deshacer"]');
        return toast ? { texto: toast.querySelector(".toast__message")?.textContent ?? null, rol: toast.getAttribute("role") } : null;
      });
    const buttons = async () => ({
      deshacer: await undoButton.getAttribute("aria-disabled"),
      rehacer: await redoButton.getAttribute("aria-disabled"),
      etiqueta: await undoButton.getAttribute("data-tip"),
    });
    const counts = async () => {
      const state = await selectionState(page);
      return { regiones: state.nodes.length, conexion: state.connection !== null };
    };
    const press = async (keys) => {
      await page.keyboard.press(keys);
      await page.waitForTimeout(300);
    };
    try {
      await load(page, "grafito");
      await enlarge(page, "Connectograma");
      r.alEmpezar = await buttons();
      let montaje = true;
      for (const [abbreviation, hemisphere] of [["IFJa", "R"], ["FEF", "R"], ["8C", "R"]]) {
        montaje = Boolean(await selectNode(page, abbreviation, hemisphere)) && montaje;
      }
      if (!montaje) throw new Error("No se pudo armar el montaje: deshacer sin comprobar");
      const lastNetwork = page.locator(".filters__network").last().locator("input");
      await lastNetwork.click();
      r.montaje = { seleccion: await selectionText(), botones: await buttons() };
      // La etiqueta emergente de «Deshacer», con el foco del teclado.
      await page.locator(".ws-filters button", { hasText: "Limpiar" }).focus();
      await page.keyboard.press("Tab");
      r.etiquetaConElTeclado = await page.evaluate(() => ({
        foco: document.activeElement?.getAttribute("aria-label") ?? null,
        visible: getComputedStyle(document.activeElement, "::after").content,
      }));
      // Clic en una línea: sustituye el montaje y sale el aviso, sin rol y
      // sin tomar el foco; su texto está en la región viva.
      await clickLine(page);
      r.trasClicEnLinea = {
        seleccion: await selectionText(),
        aviso: await noticeState(),
        regionViva: await live.textContent(),
        focoEnElAviso: await page.evaluate(() => Boolean(document.activeElement?.closest(".toast"))),
        sobreElRecuadro: await overlaps(page, ".toast-region", ".ws-view--main .connectogram-readout"),
        sobreLaBarra: await overlaps(page, ".toast-region", ".topbar"),
      };
      await page.screenshot({ path: out("deshacer-1-aviso.png") });
      // Atajos: Ctrl+Z, Ctrl+Y y Ctrl+Mayús+Z.
      await press("Control+z");
      r.trasCtrlZ = { seleccion: await selectionText(), redOculta: !(await lastNetwork.isChecked()), aviso: await notice.count() };
      await press("Control+y");
      r.trasCtrlY = await counts();
      await press("Control+z");
      await press("Control+Shift+z");
      r.trasCtrlMayusZ = await counts();
      // Botones.
      await undoButton.click();
      await page.waitForTimeout(300);
      r.trasBotonDeshacer = await counts();
      await redoButton.click();
      await page.waitForTimeout(300);
      r.trasBotonRehacer = await counts();
      await undoButton.click();
      await page.waitForTimeout(300);
      // El aviso no se va mientras tiene el ratón encima; al salir, a los 8 s.
      await clickLine(page);
      await notice.hover();
      await page.waitForTimeout(9000);
      r.avisoConElRatonEncima = await notice.count();
      await page.mouse.move(4, 4);
      await page.waitForTimeout(8500);
      r.avisoTrasOchoSegundos = await notice.count();
      // Su «Deshacer» devuelve el montaje y deja el foco en ↶.
      await press("Control+z");
      await clickLine(page);
      await noticeUndo.click();
      await page.waitForTimeout(300);
      r.botonDelAviso = { seleccion: await selectionText(), aviso: await notice.count(), foco: await focused(page) };
      // Con Filtros plegado: el foco pasa al botón que sustituye al pulsado,
      // el «Deshacer» del aviso lo deja en el título de la vista y Ctrl+Z
      // sigue funcionando.
      await page.locator(".filters__collapse").focus();
      await press("Enter");
      r.plegado = { focoAlPlegar: await focused(page) };
      await clickLine(page);
      await noticeUndo.click();
      await page.waitForTimeout(300);
      r.plegado.botonDelAviso = { seleccion: await counts(), foco: await focused(page) };
      await clickLine(page);
      await press("Control+z");
      r.plegado.trasCtrlZ = await counts();
      await page.locator(".ws-filters__expand").focus();
      await press("Enter");
      r.plegado.focoAlDesplegar = await focused(page);
      // ◎ sustituye el montaje; «Limpiar» lo vacía. Los dos, con aviso.
      const firstNetwork = page.locator(".filters__network").first();
      await firstNetwork.hover();
      await firstNetwork.locator('button[aria-label^="Resaltar solo la red"]').click();
      await page.waitForTimeout(300);
      r.trasResaltar = { seleccion: await selectionText(), aviso: await noticeState() };
      await press("Control+z");
      await page.locator(".ws-filters button", { hasText: "Limpiar" }).click();
      await page.waitForTimeout(300);
      r.trasLimpiar = { seleccion: await selectionText(), aviso: await noticeState() };
      await press("Control+z");
      // Un arrastre del deslizador y un solo Ctrl+Z.
      const slider = page.locator('input[aria-label="Peso mínimo de conectividad"]');
      await slider.scrollIntoViewIfNeeded();
      const before = await slider.inputValue();
      const box = await slider.boundingBox();
      await page.mouse.move(box.x + 2, box.y + box.height / 2);
      await page.mouse.down();
      for (const f of [0.2, 0.35, 0.5, 0.65]) {
        await page.mouse.move(box.x + box.width * f, box.y + box.height / 2);
        await page.waitForTimeout(200);
      }
      await page.mouse.up();
      await page.waitForTimeout(300);
      r.arrastre = { antes: before, despues: await slider.inputValue(), etiqueta: await undoButton.getAttribute("data-tip") };
      await press("Control+z");
      r.arrastreDeshecho = await slider.inputValue();
      // Otra clasificación vacía el historial cuando llega.
      await page.locator(".data-menu__trigger", { hasText: "Redes" }).click();
      await page.locator('[role="option"]', { hasText: "— 7 redes" }).click();
      // El botón dice «Yeo 7» en cuanto se elige; ha llegado cuando deja de girar.
      await page.waitForFunction(
        () => document.querySelectorAll(".data-menu__value")[1]?.textContent === "Yeo 7" && !document.querySelector(".data-menu__spinner"),
        null,
        { timeout: 120000 },
      );
      await page.waitForTimeout(300);
      r.trasCambiarClasificacion = await buttons();
      // Otro atlas, también: antes, un paso para que haya algo que vaciar.
      await page.locator(".ws-filters button", { hasText: "Limpiar" }).click();
      await page.waitForTimeout(300);
      r.antesDeCambiarAtlas = await buttons();
      await page.locator(".data-menu__trigger", { hasText: "Atlas" }).click();
      await page.locator('[role="option"]', { hasText: "Brainnetome" }).click();
      await page.waitForFunction(() => document.querySelector(".data-menu__value")?.textContent === "Brainnetome" && document.querySelector(".data-status--real"), null, { timeout: 120000 });
      r.trasCambiarAtlas = await buttons();
    } finally {
      await browser.close();
    }
  });
}

// Buscador de regiones (spec 5.8), con HCP-MMP1.0: las sugerencias de
// «te1m»; Intro dos veces, con el foco en el campo; Ctrl+Z; las flechas con
// ocho sugerencias y Escape; los avisos de redes ocultas (las de TE1m, una
// abreviatura exacta oculta con otras visibles y varias redes a la vez);
// Ctrl+K desde el connectograma, con Filtros desplegado y plegado; y tildes.
// En Claro, la lista con una región ya seleccionada, para la captura.
async function phaseBuscador() {
  const r = {};
  await recording("buscador.json", r, async () => {
    const regions = readJson("regions.json");
    const te1m = regions.filter((row) => row.abbreviation === "TE1m");
    r.te1m = te1m.map((row) => ({ id: row.id, hemisferio: row.hemisphere, red: row.network }));
    // Nombres con tildes en la base: NFD los cambia. Si no hay ninguno, las
    // tildes se prueban escribiéndolas sobre nombres que no las llevan.
    const accented = regions.filter((row) => row.label.normalize("NFD") !== row.label);
    r.nombresConTilde = accented.length;
    // Para el aviso de la abreviatura exacta oculta: una abreviatura que es
    // el principio de otras de otras redes. PF si vale (PFm, PFop, PFt…).
    const bare = (abbreviation) => abbreviation.replace(/^[lr]_|_[lr]$/i, "").toLowerCase();
    const groups = new Map();
    for (const row of regions.filter((item) => item.abbreviation)) {
      groups.set(bare(row.abbreviation), [...(groups.get(bare(row.abbreviation)) ?? []), row]);
    }
    const candidates = [...groups.keys()].sort((a, b) => (a === "pf" ? -1 : b === "pf" ? 1 : a < b ? -1 : 1));
    r.exactaOculta = null;
    for (const key of candidates) {
      const networks = [...new Set(groups.get(key).map((row) => row.network))];
      const weaker = regions.filter((row) => row.abbreviation && bare(row.abbreviation) !== key && bare(row.abbreviation).startsWith(key) && !networks.includes(row.network));
      if (weaker.length === 0) continue;
      r.exactaOculta = { abreviatura: groups.get(key)[0].abbreviation, redes: networks, visibles: weaker.map((row) => row.abbreviation) };
      break;
    }
    for (const theme of ["grafito", "claro"]) {
      const { browser, page, errors } = await launch(1440, 900);
      const t = (r[theme] = { errores: errors });
      const input = page.locator(".region-search__input");
      const labels = () => page.locator(".region-search__label").allTextContents();
      const selectionText = () => page.locator(".filters__selection > span").first().textContent();
      // El campo: su valor, si tiene el foco, si la lista está abierta, la
      // sugerencia activa, las que dicen «seleccionada» y el texto del estado
      // (sin el botón).
      const field = () =>
        page.evaluate(() => {
          const el = document.querySelector(".region-search__input");
          const active = document.getElementById(el.getAttribute("aria-activedescendant") ?? "");
          return {
            valor: el.value,
            foco: document.activeElement === el,
            abierta: el.getAttribute("aria-expanded"),
            activa: active?.querySelector(".region-search__label")?.textContent ?? null,
            seleccionadas: [...document.querySelectorAll(".region-search__option")]
              .filter((option) => option.querySelector(".region-search__selected"))
              .map((option) => option.querySelector(".region-search__label").textContent),
            estado: document.querySelector(".region-search__status > span")?.textContent ?? "",
            boton: document.querySelector(".region-search__status button")?.textContent ?? null,
          };
        });
      const type = async (text) => {
        await input.fill("");
        await input.click();
        await page.keyboard.type(text);
        await page.waitForTimeout(200);
      };
      const hideNetworks = (keys) =>
        page.evaluate(async (list) => {
          const { NETWORK_LABELS } = await import("/src/theme/networks.ts");
          for (const key of list) {
            const name = NETWORK_LABELS[key] ?? key;
            const label = [...document.querySelectorAll(".filters__network label")].find((l) => l.title.startsWith(`${name} — `));
            const box = label?.querySelector("input");
            if (box?.checked) box.click();
          }
        }, keys);
      try {
        await load(page, theme);
        await enlarge(page, "Connectograma");
        await type("te1m");
        t.sugerencias = await labels();
        t.alEscribir = await field();
        if (theme === "claro") {
          // Con una ya seleccionada, para ver «seleccionada» en este tema.
          await page.keyboard.press("Enter");
          await page.keyboard.type("te1m");
          await page.waitForTimeout(200);
          t.otraVez = await field();
          await page.screenshot({ path: out("buscador-claro-1-sugerencias.png") });
          continue;
        }
        await page.screenshot({ path: out("buscador-grafito-1-sugerencias.png") });
        // Intro añade la activa; el campo se vacía y conserva el foco.
        await page.keyboard.press("Enter");
        await page.waitForTimeout(200);
        t.trasIntro = { seleccion: await selectionText(), ...(await field()) };
        // Otra vez «te1m»: la activa es la primera que no está seleccionada.
        await page.keyboard.type("te1m");
        await page.waitForTimeout(200);
        t.otraVez = await field();
        await page.screenshot({ path: out("buscador-grafito-2-seleccionada.png") });
        await page.keyboard.press("Enter");
        await page.waitForTimeout(200);
        t.trasSegundoIntro = { seleccion: await selectionText(), ...(await field()) };
        // En el campo, Ctrl+Z es del campo (spec 5.7): se sale con Tab.
        await page.keyboard.press("Tab");
        await page.keyboard.press("Control+z");
        await page.waitForTimeout(300);
        t.trasCtrlZ = { seleccion: await selectionText(), ids: (await selectionState(page)).nodes };
        // Flechas: «1» da ocho sugerencias, más de las que caben en la lista;
        // la activa sigue a la vista. Escape cierra y deja lo escrito; otro,
        // vacía el campo.
        await type("1");
        t.flechas = { sugerencias: (await labels()).length };
        for (let i = 0; i < 7; i++) await page.keyboard.press("ArrowDown");
        await page.waitForTimeout(200);
        t.flechas.activa = await page.evaluate(() => {
          const list = document.querySelector(".region-search__list");
          const option = document.querySelector(".region-search__option--active");
          if (!list || !option) return null;
          const top = list.getBoundingClientRect().top + list.clientTop;
          const bottom = top + list.clientHeight;
          const box = option.getBoundingClientRect();
          return {
            posicion: [...list.children].indexOf(option),
            aLaVista: box.top >= top - 0.5 && box.bottom <= bottom + 0.5,
            desplazada: list.scrollTop > 0,
          };
        });
        await page.screenshot({ path: out("buscador-grafito-3-flechas.png") });
        await page.keyboard.press("Escape");
        t.flechas.trasEscape = await field();
        await page.keyboard.press("Escape");
        t.flechas.trasOtroEscape = await field();
        // Las redes de TE1m, ocultas: el aviso, sin lista, y su botón.
        const networks = [...new Set(te1m.map((row) => row.network))];
        t.redEsperada = await page.evaluate(
          async (key) => (await import("/src/logic/displayText.ts")).networkShortLabel(key),
          (te1m.find((row) => row.hemisphere === "L") ?? te1m[0]).network,
        );
        await hideNetworks(networks);
        await type("te1m");
        t.redOculta = { ...(await field()), lista: await page.locator(".region-search__list").count() };
        await page.screenshot({ path: out("buscador-grafito-4-red-oculta.png") });
        await page.locator(".region-search__status button").click();
        await page.waitForTimeout(300);
        t.trasMostrar = { sugerencias: await labels(), ...(await field()) };
        // Una abreviatura exacta oculta, con otras más débiles visibles.
        await page.locator(".ws-filters button", { hasText: "Todas" }).click();
        if (r.exactaOculta) {
          await hideNetworks(r.exactaOculta.redes);
          await type(r.exactaOculta.abreviatura.toLowerCase());
          t.exactaOculta = { sugerencias: await labels(), ...(await field()) };
          await page.screenshot({ path: out("buscador-grafito-5-exacta-oculta.png") });
          await page.locator(".ws-filters button", { hasText: "Todas" }).click();
        }
        // Varias redes ocultas: con «Ninguna», «1» está en muchas.
        await page.locator(".ws-filters button", { hasText: "Ninguna" }).click();
        await type("1");
        t.variasRedes = await field();
        await page.locator(".region-search__status button").click();
        await page.waitForTimeout(300);
        t.trasMostrarLasRedes = { sugerencias: (await labels()).length, ...(await field()) };
        // Ctrl+K desde el connectograma, con Filtros desplegado y plegado.
        const heading = page.locator(".ws-view--main .ws-view__header h2");
        await heading.focus();
        await page.keyboard.press("Control+k");
        await page.waitForTimeout(200);
        t.ctrlK = { foco: (await field()).foco };
        await page.locator(".filters__collapse").click();
        await page.waitForTimeout(300);
        await heading.focus();
        await page.keyboard.press("Control+k");
        await page.waitForTimeout(400);
        t.ctrlKPlegado = {
          desplegado: (await page.locator(".filters__collapse").count()) === 1,
          foco: await page.evaluate(() => document.activeElement?.classList.contains("region-search__input") ?? false),
        };
        // Tildes y mayúsculas, con todas las redes visibles.
        await page.locator(".ws-filters button", { hasText: "Todas" }).click();
        await type("ÁREA TE1 MIDDLE");
        t.conTildes = await labels();
        if (accented.length > 0) {
          const plain = accented[0].label.normalize("NFD").replace(/\p{Mn}/gu, "").slice(0, 12);
          await type(plain);
          t.sinTildes = { buscado: plain, original: accented[0].label, opciones: await page.locator(".region-search__option").allTextContents() };
        }
      } finally {
        await browser.close();
      }
    }
  });
}

run({ vistas: phaseVistas, filtros: phaseFiltros, exportar: phaseExportar, deshacer: phaseDeshacer, buscador: phaseBuscador });
```

- [ ] **Step 2: el análisis de las exportaciones**

Crea `$D/analizar-exportaciones.py`. Usa PIL y numpy, que ya están instalados (los usó la verificación de la fase 1):

```python
"""Exportaciones de la verificación de la fase 3 (Task 13 de docs/rediseno-interfaz-plan-fase3.md).

Cada JPEG: que se decodifica, que tiene las esquinas blancas y que mide lo
esperado (el SVG por 3; el lienzo 3D, lo que mide el lienzo; la leyenda,
al menos su ancho en pantalla por 3, porque la exportación puede
ensancharla). El connectograma, los hemisferios y las leyendas se comparan
con los de la versión anterior a esta fase, exportados con los mismos
datos. Lo que falte (una fase que falló a medias) se apunta como «falta».
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

D = Path(sys.argv[1])
report = {}


def pixels_of(path):
    return np.asarray(Image.open(path).convert("RGB"), dtype=int)


for theme in ("grafito", "original"):
    for which in ("nueva", "anterior"):
        summary = D / f"exportar-{which}-{theme}.json"
        if not summary.exists():
            report[summary.name] = "falta"
            continue
        exported = json.loads(summary.read_text())
        if "fallo" in exported:
            report[f"{summary.name}-fallo"] = exported["fallo"].splitlines()[0]
        for name, size in exported["files"].items():
            path = D / name
            if not path.exists():
                report[name] = "falta"
                continue
            image = Image.open(path)
            image.load()
            pixels = np.asarray(image.convert("RGB"), dtype=int)
            height, width, _ = pixels.shape
            corners = [pixels[0, 0], pixels[0, -1], pixels[-1, 0], pixels[-1, -1]]
            scale = 3 if size["kind"] == "svg" else 1
            expected = [int(size["width"] * scale), int(size["height"] * scale)]
            ink = (pixels < 200).any(axis=2)
            columns = np.nonzero(ink.any(axis=0))[0]
            legend = "leyenda" in name
            report[name] = {
                "formato": image.format,
                "tamano": [width, height],
                "esperado": expected,
                "tamanoBien": (width >= expected[0] and height == expected[1]) if legend else [width, height] == expected,
                "esquinasBlancas": all(bool((c >= 245).all()) for c in corners),
                "tintaEnLaUltimaColumna": int(ink[:, -1].sum()),
                "hastaElBordeDerecho": int(width - 1 - columns.max()) if len(columns) else None,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest()[:16],
            }
    for kind in ("connectograma", "hemisferios", "leyenda-larga", "leyenda-corta"):
        new, old = D / f"nueva-{theme}-{kind}.jpg", D / f"anterior-{theme}-{kind}.jpg"
        key = f"{theme}-{kind}-comparada"
        if not new.exists() or not old.exists():
            report[key] = "falta"
            continue
        a, b = pixels_of(new), pixels_of(old)
        same_shape = a.shape == b.shape
        report[key] = {
            "bytesIguales": new.read_bytes() == old.read_bytes(),
            "pixelesIguales": same_shape and bool((a == b).all()),
            "pixelesDistintos": int((a != b).any(axis=2).sum()) if same_shape else None,
            "anchoNueva": a.shape[1],
            "anchoAnterior": b.shape[1],
        }
(D / "exportaciones.json").write_text(json.dumps(report, indent=1, ensure_ascii=False))
for key, value in report.items():
    print(key, value)
```

- [ ] **Step 3: ejecutar**

Cada fase en su propia orden, como en la Task 12, y sin navegadores sueltos al terminar cada una (la misma comprobación con `pgrep`):

```bash
cd "$D" && PORT=5241 PORT_ANTES=5242 TMPDIR="$D/tmp" timeout 900 node verify-fase3-b.cjs vistas
```

Lo mismo con `filtros`, `deshacer` y `buscador`, y con la exportación en las dos versiones y los dos temas: `exportar nueva grafito`, `exportar nueva original`, `exportar anterior grafito` y `exportar anterior original`. Después:

```bash
cd "$D" && python3 analizar-exportaciones.py "$D"
```

- [ ] **Step 4: revisar lo que salió**

Abre las capturas (`$D/*.png`) con la herramienta Read y los `$D/*.json`. Cada punto se informa como visto, distinto o sin comprobar.

- **En todos los JSON:** `sinComprobar` lista las regiones que un script no pudo seleccionar con seguridad; lo que dependía de ellas queda «sin comprobar». Si hay `fallo`, la fase se paró ahí: lo anterior se vio y lo demás queda «sin comprobar».
- **Preflight** (`preflight.json`): los dos servidores y el backend responden; HCP-MMP1.0 con 360 regiones y 64 620 conexiones, o lo que tenga la base; Brainnetome con regiones (`brainnetome` mayor que 0).
- **Temas** (`temas.json` y `*-1-inicio.png`, `*-2-region.png`, `*-3-cerebro3d.png`), en los cuatro temas:
  - La barra ocupa una fila (`bar.height` ≤ 60 y `bar.overflow` falso), no hay desplazamiento horizontal y la página cabe (`layout.pageFits`).
  - `bar.collapse`: vacío a 1400 px, `status` a 1280 y `status import synthesis tabs` a 1024.
  - El logotipo lleva sus cuatro nodos de color de red y «alfa»; el contexto se lee entero (`layout.contextOk`: «Atlas HCP-MMP1.0» y «Redes Cole-Anticevic»); el estado muestra el punto verde.
  - Fuera de Original, `purple` está vacío.
  - Lo que la D3 dejó para esta fase, en `theme` (a 1400 px), en cada tema: el anillo de foco es del color de acento (`foco.igual`, con `foco.estilo` `solid`); las muestras de los filtros y `.legend-swatch` llevan el anillo neutro (`anilloFiltros.conTextFaint` y `anilloLeyenda.conTextFaint`); y «Todas» y «Ninguna» van en una línea (`todasYNingunaEnUnaLinea`).
  - Herramientas: a 1400 px, las del connectograma, los hemisferios y el cerebro 3D con una región seleccionada suben a la cabecera (`position` `absolute`) sin tapar el título ni la descripción (`overlap` falso). A 1280 y a 1024 px se quedan debajo (`static`). Si a 1400 px no suben, la D4 lo dice con el `contentWidth` medido.
  - `readoutHeights`: los tres valores iguales (en reposo, con el ratón encima de una región y con una seleccionada). Si `selected` es null, hay dos, y lo de IFJa queda «sin comprobar» a ese ancho.
  - `readout`, con IFJa seleccionada: región, hemisferio, red, «359 conexiones pasan los filtros» y «pasa el ratón por otra región para verla». `hemispheresReadout`: región, hemisferio y red, sin recuento.
  - `detail`: «Región seleccionada», IFJa con «Area IFJa», la etiqueta de red y la de hemisferio, la nota de cómo se asignó la red, cinco filas con los pesos de mayor a menor, «Ver las 359» y el ID.
  - A 1024x768, `settings.inside` es verdadero.
- **Barra** (`barra.json` y `barra-*.png`). En todos los anchos, `overflow` es falso y `height` ≤ 60:
  - 1600, 1440, 1400 y 1366 px: `collapse` vacío, con los cuatro nombres de pestaña, «Datos reales» e «Importar».
  - 1280 px: `status`; los cuatro nombres siguen.
  - 1152, 1024 y 900 px: `status import synthesis tabs`; solo la pestaña activa conserva su nombre.
  - Con el foco del teclado a 1024 px, la pestaña plegada y la de Importar muestran su nombre: `tip` es `"Comparar especies"` y `"Importar una síntesis de IA"` (mira `barra-1024-etiqueta-con-foco.png`).
  - Con datos de demostración, «Datos de demostración» se ve siempre (`statusText`), y su etiqueta emergente empieza por «Datos sintéticos · solo ilustrativos.».

  Lo que importa es el orden. Apunta para la D4 los valores medidos, sobre todo si no coinciden con el cálculo.
- **Síntesis** (`sintesis.json` y `sintesis-*.png`), con Tauri simulado y la validación de siempre:
  - Con dos síntesis de nombre largo a 1400 px, se pliegan «Datos reales», «Importar» y los nombres de las síntesis inactivas (`status import synthesis`), y se ven los cuatro nombres de las vistas.
  - A 1280 y a 1024 px, sin desbordar.
  - Al cerrar con el teclado la segunda síntesis, el foco pasa a la primera; al cerrar la primera, a «Atlas». `pestanasTrasCerrar` es 0.
  - JSON roto: «El archivo elegido no contiene un JSON válido.», con la ruta y el mensaje del analizador en «Detalles».
  - Diálogo que falla: «No se pudo abrir o leer el archivo.», con «diálogo simulado que falla» en «Detalles».
  - Región desconocida: «La síntesis no se ha importado: tiene 1 problema.», con `region.no.existe` en «Detalles».
- **Teclado** (`teclado.json`):
  - Al abrir, la lista tiene el foco y la opción activa es la elegida; la flecha la mueve; Escape cierra y devuelve el foco al botón; Tab cierra la lista.
  - Intro elige Brainnetome y el foco vuelve al botón «Atlas», y sigue en él cuando el atlas ha terminado de cargar (`trasCargar`): la barra no se ha vuelto a montar.
  - Mientras carga Yeo 7, el botón «Redes» muestra el indicador que gira (`gira` 1) y dice «Yeo 7, cargando…» a los lectores de pantalla. Cargado, `gira` es 0. El `ancho` es el mismo en los dos momentos.
- **Avisos** (`avisos.json` y sus capturas):
  - Importar en el navegador muestra «“Importar síntesis” solo funciona en la aplicación de escritorio.», arriba a la derecha: `sitio.sobreLaBarra` y `sitio.sobreLaVistaGrande` son falsos. Al cerrarlo con el teclado no queda ningún aviso y el foco vuelve a «Importar».
  - Con dos avisos, el de la clasificación lleva su texto técnico en «Detalles». Al cerrar el primero con el teclado, el foco pasa al «Entendido» del otro (`aviso` es `redes`); al cerrar el último, vuelve a «Importar». La clasificación vuelve a la de por defecto.
  - `errores` solo contiene el 500 simulado.
- **Otras pestañas** (`otras.json`): cada una queda marcada (`aria-current`) y ninguna muestra el contexto de datos. A 900x600, el panel de Ajustes se ve entero. `otrosErrores` está vacío. `erroresDeTractografia` son de las pestañas de tractografía, que piden sus datos al backend: se esperan si la base no los tiene, no son de esta fase, y la D4 los nombra.
- **Vistas** (`vistas.json` y sus capturas):
  - «Peso mínimo» (`peso-1440` y `peso-1280`): «0 (sin filtro, se muestra todo)» queda dentro del panel (`dentro`) y, si no cabe junto al título, baja entero a la línea siguiente (`bajoElTitulo`).
  - A 1440 px las herramientas suben a la cabecera sin tapar nada; a 1280 px, no.
  - La lupa pasa de `false` a `true` y vuelve a `false`.
  - Con «Ampliar» y el teclado, el foco acaba en el título de la vista ampliada (`h2`).
  - Un clic en la capa de la miniatura la amplía (`clicEnLaCapa` es `connectogram`), y el tabulador nunca llega a la capa (`tabLlegaALaCapa` falso).
  - El cerebro 3D sin selección no reserva el hueco de las herramientas (`headerPaddingRight` es `0px`).
  - ◎ y + miden 1 px en reposo y tras un clic en la casilla con el ratón ya fuera (`trasClicEnLaCasilla`). Se ven al pasar el ratón y al llegar con Tab (unos 46 px). Con Mayús+Tab desde la fila siguiente, el foco llega a «Añadir la red … a la selección», que se ve.
  - La sección «Tipo de conectividad» se pliega con su botón y se vuelve a desplegar.
  - «Ver las 359» despliega la lista y la página sigue sin desplazamiento (`scrollHeight` ≤ `innerHeight`); las filas no desbordan los 300 px del panel y los pesos conservan su formato. «Ver solo las 5 primeras» la vuelve a plegar.
  - Copiar: el estado dice «Identificador copiado» y el portapapeles tiene el ID; o, si el portapapeles falla, «No se pudo copiar: el identificador queda seleccionado (Ctrl+C)», a la vista, y el ID queda seleccionado.
  - La conexión se titula «… ↔ …» (las de HCP-MMP1.0 son estructurales), y sus datos son «Región A», «Región B», «Tipo», «Peso» y «Nivel de evidencia» (`factLabels`), con el ID al pie.
  - Con tres regiones seleccionadas, el recuadro de lectura no lleva recuento (`recuentoConVarias` es 0).
  - La leyenda de la selección múltiple ya no corta el nombre largo de TPOJ1: `leyenda.ancho` es al menos `bordeDelTexto` + 10 y pasa de 260. Si el panel es más estrecho, su recuadro se desplaza (`desplazable`). Mira `vistas-1440-8-detalle-multiple.png`.
- **Filtros** (`filtros.json`), contra la referencia calculada con los mismos datos:
  - `redes.iguales` es verdadero: cada red con su número de regiones.
  - En `inicio`, `sinLaPrimeraRed` y `conPeso`, los tres `iguales` son verdaderos: los recuentos por tipo, «N de M conexiones pasan los filtros» (N = `referencia.passing`, M = `referencia.loaded`) y el recuadro, «K conexiones pasan los filtros» (K = `referencia.ofRegion`). En `conPeso`, el recuadro lleva `(peso ≥ …)` escrito como el valor de «Peso mínimo».
  - Sin «Estructural», su recuento no cambia y pasan 0 conexiones: las de HCP-MMP1.0 son todas estructurales. También ahí, los tres `iguales` son verdaderos.
- **Exportación** (`exportaciones.json` y `exportar-*.json`), con Grafito y con Original:
  - Los JPEG de la versión nueva (connectograma, hemisferios, cerebro 3D y leyendas) se decodifican, tienen las esquinas blancas y el tamaño esperado (`tamanoBien`), y no tienen tinta en la última columna.
  - Connectograma y hemisferios: iguales a los de la versión anterior (`pixelesIguales`), porque esta fase no toca los gráficos. Si no, es «distinto»: mira las dos imágenes y apunta `pixelesDistintos`.
  - Leyenda corta: igual que la de la versión anterior, byte a byte o al menos píxel a píxel.
  - Leyenda larga: `anchoNueva` ≥ `anchoAnterior` y sin cortar. Apunta los dos anchos para la D4.
  - «falta» en un archivo o una comparación: esa exportación queda «sin comprobar».
  - Sin errores en la consola (`errors`).
- **Deshacer** (`deshacer.json` y `deshacer-1-aviso.png`):
  - Al empezar, los dos botones llevan `aria-disabled="true"`.
  - Tras el montaje, «3 regiones seleccionadas», y «Deshacer» describe el último paso: «Deshacer: ocultar la red …». Con el foco del teclado, esa etiqueta se ve (`etiquetaConElTeclado`: el foco en «Deshacer» y el mismo texto, entre comillas).
  - Un clic en una línea deja «1 conexión seleccionada» y saca el aviso «Se sustituyó la selección de 3 regiones» (`aviso.texto`). El aviso no tiene rol (`aviso.rol` null), su texto está en la región viva (`regionViva`), no se lleva el foco (`focoEnElAviso` falso) y no tapa el recuadro de lectura ni la barra (`sobreElRecuadro` y `sobreLaBarra` falsos).
  - Ctrl+Z devuelve las 3 regiones, con la red todavía oculta, y retira el aviso. Ctrl+Y y Ctrl+Mayús+Z vuelven a la conexión (`regiones` 0 y `conexion` verdadero). Los botones hacen lo mismo: `trasBotonDeshacer`, 3 regiones; `trasBotonRehacer`, la conexión.
  - Con el ratón encima, el aviso sigue a los 9 s (`avisoConElRatonEncima` 1); con el ratón fuera, se va a los 8 s (`avisoTrasOchoSegundos` 0).
  - El «Deshacer» del aviso devuelve las 3 regiones, retira el aviso y deja el foco en el botón «Deshacer» de Filtros.
  - Con Filtros plegado (`plegado`): el foco pasa al botón «Filtros» al plegar y al de plegar al desplegar; el «Deshacer» del aviso devuelve las 3 regiones y deja el foco en el título de la vista grande (`h2`, «Connectograma»); y Ctrl+Z también las devuelve.
  - ◎ sustituye el montaje por las regiones de esa red, con el aviso «Se sustituyó la selección de 3 regiones» (`trasResaltar`). «Limpiar» deja «Ninguna región seleccionada», con «Se vació la selección de 3 regiones» (`trasLimpiar`).
  - Un arrastre del deslizador cambia el valor; «Deshacer» lo describe como «Deshacer: peso mínimo de 0 (sin filtro, se muestra todo) a …», y un solo Ctrl+Z lo devuelve al de antes (`arrastreDeshecho` igual a `antes`).
  - Cuando llega Yeo 7, los dos botones vuelven a llevar `aria-disabled="true"` (`trasCambiarClasificacion`). Tras «Limpiar», «Deshacer» vuelve a estar activo (`antesDeCambiarAtlas`), y tras cambiar de atlas, los dos vuelven a llevar `aria-disabled="true"`.
- **Buscador** (`buscador.json` y `buscador-*.png`), con HCP-MMP1.0. El texto del estado (`estado`) es el del aviso sin el botón, que va aparte (`boton`):
  - Al escribir «te1m», las dos primeras sugerencias son «TE1m (izq.)» y «TE1m (der.)» (`grafito.sugerencias` y `claro.sugerencias`), la lista está abierta (`alEscribir.abierta` `"true"`) y la activa es la primera (`alEscribir.activa`).
  - Intro añade la activa: «1 región seleccionada», el campo vacío (`trasIntro.valor` `""`) y con el foco (`trasIntro.foco`).
  - Otra vez «te1m»: «TE1m (izq.)» dice «seleccionada» (`otraVez.seleccionadas`) y la activa es «TE1m (der.)», la primera que no está seleccionada. Intro la añade: «2 regiones seleccionadas», con el foco en el campo.
  - Fuera del campo (con Tab, porque en él Ctrl+Z es del campo), Ctrl+Z quita la última: «1 región seleccionada», y queda la TE1m izquierda (`trasCtrlZ.ids`, contra `te1m`).
  - Flechas: «1» da 8 sugerencias (`flechas.sugerencias`), más de las que caben en la lista. Tras siete flechas abajo, la activa es la octava (`flechas.activa.posicion` 7) y sigue a la vista (`aLaVista`), con la lista desplazada (`desplazada`). Escape cierra la lista y deja «1» (`trasEscape`: `abierta` `"false"`, `valor` `"1"`); otro Escape vacía el campo (`trasOtroEscape.valor` `""`).
  - Con las redes de TE1m ocultas, «te1m» no abre lista (`redOculta.lista` 0) y el estado empieza por «TE1m está en la red X» (o «en las redes», si TE1m está en dos), con X = `redEsperada` (Auditiva, si `te1m` dice que su red es la auditiva de Cole-Anticevic). Tras su botón, TE1m vuelve a salir (`trasMostrar.sugerencias`) y el foco está en el campo.
  - Abreviatura exacta oculta: con las redes de `exactaOculta.abreviatura` ocultas (PF, si alguna abreviatura que empieza por PF está en otra red), su búsqueda sugiere las visibles que empiezan igual (`grafito.exactaOculta.sugerencias`, de `exactaOculta.visibles`) y, a la vez, el estado dice «PF está en la red X, que está oculta.», con «Mostrar la red». Si `exactaOculta` es null, «sin comprobar».
  - Varias redes: con todas ocultas («Ninguna»), «1» no sugiere nada y el estado dice «Lo escrito está en …», con las redes (hasta tres) o cuántas son, y el botón «Mostrar las redes» (`variasRedes`). Tras pulsarlo, 8 sugerencias y el foco en el campo (`trasMostrarLasRedes`).
  - Ctrl+K desde el connectograma deja el foco en el campo (`ctrlK.foco`); con Filtros plegado, lo despliega y también (`ctrlKPlegado`).
  - Tildes y mayúsculas: «ÁREA TE1 MIDDLE» sugiere las dos TE1m (`conTildes`). Si `nombresConTilde` es 0, la base no tiene nombres con tildes: dilo, y esa búsqueda, con tildes sobre nombres que no las llevan, es la prueba. Si es mayor que 0, el nombre con tildes aparece también al buscarlo sin ellas (`sinTildes`).
  - Capturas: en Grafito y en Claro (este, con TE1m izquierda ya seleccionada), la lista se lee, con el punto de color de la red y su anillo, la abreviatura con su lado, el nombre y «seleccionada», y ningún texto por debajo de 0,7rem. La sugerencia activa lleva el contorno del color de acento, y su nombre y su «seleccionada» se leen sobre el fondo. En `buscador-grafito-3-flechas.png`, la octava a la vista; en `buscador-grafito-4-red-oculta.png` y `buscador-grafito-5-exacta-oculta.png`, el aviso bajo el campo, con su botón, y en la segunda también la lista, bajo el aviso.
- **Consola:** ningún error fuera de los esperados: el 500 simulado de `avisos` y los de la tractografía de `otras`. El aviso de three.js sobre `THREE.Clock` no es un error.

- [ ] **Step 5: si algo no cuadra**

Corrígelo en el código, con las reglas de la tarea de la que venga, y vuelve a pasar el Step 1 de la Task 12. Haz un commit aparte con los archivos que cambies, con un mensaje `Estructura: …`. Repite la fase que lo mostró; si el arreglo toca `App.tsx` o `App.css`, repite todas las fases de las Tasks 12 y 13. Apúntalo para la D4.

- [ ] **Step 6: parar los servidores y comprobar la copia principal**

Para los dos `vite` que arrancaste en la Task 12: por su identificador de tarea en segundo plano, o, si ya no lo tienes, con estas dos órdenes. En el patrón, `524[1]` encuentra `5241` en la línea de órdenes de `vite`, pero no en la de la propia búsqueda:

```bash
pkill -f "vite --port 524[1]"; pkill -f "vite --port 524[2]"
```

Después:

```bash
ss -ltn | grep -E ':(5241|5242) ' || echo "servidores parados"
pgrep -af "$D/tm[p]" || echo "sin navegadores sueltos"
git -C /home/dae/PycharmProjects/Neurograph/Neurograph status --short | diff "$D/copia-principal-antes.txt" - && echo "copia principal sin cambios"
```

Expected: «servidores parados», «sin navegadores sueltos» y «copia principal sin cambios». Si la copia principal cambió, no borres nada: dilo en el informe.

---

## Chunk 12: decisión y spec

### Task 14: D4, retoques del spec y commit

**Files:**
- Modify: `docs/decisiones-diseno.md` (la D4, al final)
- Modify: `docs/rediseno-interfaz-diseno.md` (retoques donde la implementación se apartó)

`docs/` lo toca también otra sesión. Aquí solo se tocan esos dos archivos, y en el commit solo entran ellos.

- [ ] **Step 1: comprobar el número de la D y el estado de `docs/`**

Antes de tocar nada, mira si los dos archivos ya tienen cambios sin commit:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git status --short docs/
```

Si `docs/decisiones-diseno.md` o `docs/rediseno-interfaz-diseno.md` salen en la lista, son cambios de otra sesión: no sigas, no los toques, y termina la tarea como BLOQUEADA, diciendo qué archivo y qué cambios.

Antes de escribir «(D4)» en ningún sitio, comprueba que la D4 sigue libre en los tres sitios donde podría haber aparecido otra. Las tres órdenes solo leen:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz
grep -n "^## D[0-9]" docs/decisiones-diseno.md
git show master:docs/decisiones-diseno.md | grep -n "^## D[0-9]"
grep -n "^## D[0-9]" /home/dae/PycharmProjects/Neurograph/Neurograph/docs/decisiones-diseno.md
```

Expected: D1, D2 y D3 en la rama; D1 y D2 en `master` y en la copia principal. La siguiente libre es la D4.

Busca también, siempre, todas las referencias a la D4 de esta fase, incluidas las partidas entre líneas o entre paréntesis:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && grep -rnw "D4" frontend/src docs/rediseno-interfaz-diseno.md
```

Expected: los comentarios de esta fase en `frontend/src`, y en el spec ninguna o las que ya hubiera. Si alguna de las tres listas de arriba ya tiene una D4 o más, la nueva es la siguiente libre: la D5, o la que toque. Cambia por ese número todas las referencias de `frontend/src` que salieron, vuelve a pasar las pruebas, los tipos, lint y la compilación, y usa ese número en los Steps 2, 3 y 4, también en el mensaje del commit.

- [ ] **Step 2: retoques del spec**

En `docs/rediseno-interfaz-diseno.md`, añade o cambia lo siguiente, con el mismo estilo del documento (frases cortas, listas):

- **Cabecera, «Estado»:** tras la frase de la fase 1, «La fase 3 también: D4 de `docs/decisiones-diseno.md`, con el plan en `docs/rediseno-interfaz-plan-fase3.md`.».
- **5.1, punto 2 (pestañas):** van en un `<nav aria-label="Vistas">` con `aria-current="page"` en la activa, no en un `tablist`. Cada pestaña cambia la pantalla entera, y un `tablist` no admite el botón de cerrar junto a cada síntesis. El nombre de una síntesis se corta a 10rem; entero queda en la etiqueta emergente. Al cerrar una síntesis, el foco pasa a la que ocupa su sitio, a la anterior o a «Atlas».
- **5.1, nuevo punto sobre el ancho:**
  - La barra va en una fila. Si no cabe, pliega lo secundario por este orden, y solo lo que haga falta: «Datos reales» se queda en su punto, «Importar» en su icono, las síntesis inactivas en el suyo y, al final, las vistas inactivas.
  - «Datos de demostración» nunca se pliega. Lo plegado conserva su nombre para los lectores de pantalla y su etiqueta emergente, que aparece también con el foco del teclado. El punto de «Datos reales» no se enfoca.
  - La barra mide si cabe (`logic/topBarFit.ts`, atributo `data-collapse`), porque lo que ocupa depende del contenido. Si ni así cabe, pasa a dos filas.
  - Añade los valores medidos en la Task 12 (fases `barra` y `sintesis`, revisadas en la Task 13): 1400, 1280 y 1024 px y con dos síntesis de nombre largo.
- **5.1, punto 3 (contexto de datos):**
  - El botón «Redes» solo aparece si el atlas tiene más de una clasificación cargada, como hasta ahora.
  - La lista marca la opción elegida con ✓, y Tab también la cierra.
  - Al elegir o al cerrar con el teclado, el foco vuelve al botón, también cuando el atlas nuevo termina de cargar. Con un clic fuera, se queda donde se hizo clic.
  - Mientras carga la clasificación, un indicador que gira ocupa el sitio del chevron, y «cargando…» queda para los lectores de pantalla: el botón no cambia de ancho. Con movimiento reducido, el indicador no gira: queda un arco quieto.
- **5.1, punto 4 (estado):**
  - Mientras carga, un punto neutro con «Cargando…».
  - La etiqueta emergente de «Datos reales» dice qué es y da las cifras («Datos reales · 360 regiones · 64 620 conexiones»).
  - La de «Datos de demostración» conserva el aviso de siempre: datos sintéticos, solo ilustrativos, y que la API no respondió.
  - Es una región `role="status"`.
- **5.3:**
  - Las secciones siguen siendo plegables, como en la D1, y empiezan abiertas. Su título es un botón con `aria-expanded` y `aria-controls`, y no un `<summary>`, porque la cabecera de «Redes» lleva «Todas» y «Ninguna», que van fuera de él. Cada sección es un grupo (`role="group"`, con el nombre de su título), no un `<section>`.
  - ◎ y + quedan fuera de la vista, pero no del orden del tabulador ni de los lectores de pantalla. Se ven al pasar el ratón o con el foco del teclado dentro de la fila, también con Mayús+Tab (`:has(:focus-visible)`, no `:focus-within`): un clic en la casilla no los deja a la vista.
  - «Se ven N de M conexiones» pasa a «N de M conexiones pasan los filtros», porque las vistas pueden dibujar menos. La ayuda lo explica: con dos o más regiones seleccionadas, solo las que hay entre ellas, y con más de 10 000, ninguna. También explica los recuentos por tipo.
  - Los números a la vista llevan su unidad para los lectores de pantalla («Estructural, 3 conexiones»), y el deslizador dice el peso con `aria-valuetext`.
  - El valor de «Peso mínimo» no se parte: si no cabe junto al título, como «0 (sin filtro, se muestra todo)», baja entero a la línea siguiente.
  - La selección dice «1 región seleccionada», «N regiones seleccionadas», «1 conexión seleccionada» o «Ninguna región seleccionada».
  - Al plegar o desplegar el panel, el foco pasa al botón que sustituye al pulsado.
- **5.4:**
  - Las herramientas van a la derecha de la cabecera si la vista grande mide al menos 40rem (consulta de contenedor); más estrecha, se quedan en una fila bajo ella. El cerebro 3D sin selección no reserva su hueco. Añade lo medido a 1400 y a 1280 px.
  - La capa de las miniaturas no entra en el orden del tabulador: con el teclado se usa «Ampliar», que deja el foco en el título de la vista ampliada.
  - Las descripciones de las vistas no prometen lo que no se ve: la del connectograma no promete grosores (solo cambian con pesos mayores que 0,17), y la del cerebro 3D dice qué muestra con una selección: una región con sus vecinas, varias con las conexiones entre ellas, o una conexión.
  - Recuadro de lectura: el «(hemisferio …)» del final de los nombres de HCP-MMP1.0 no se repite si coincide con el hemisferio de la región. El recuento va solo en el del connectograma, como en la maqueta, y solo con exactamente una región seleccionada. El umbral se escribe como el valor de «Peso mínimo» en Filtros: el ejemplo pasa a «5 conexiones pasan los filtros (peso ≥ 0.02)», y sin umbral no hay paréntesis.
  - Una conexión, en el recuadro de lectura y en la lista de conectividad inducida, lleva «→» solo si es efectiva, y «↔» si no, como el título del detalle.
- **5.5:**
  - «Ver las N» se puede volver a plegar («Ver solo las 5 primeras»).
  - Junto a la abreviatura va el nombre sin el «(hemisferio …)» final, si coincide con el de la región; si solo repite la abreviatura, no se muestra.
  - En la lista, las conexiones efectivas dicen «hacia» o «desde» la otra región. El peso conserva su formato, en su propia fila con la barra. La pista dice «más fuertes primero · barra logarítmica».
  - El ID queda pegado al pie del panel. Al copiarlo, el botón confirma «Copiado» y lo anuncia. Si el portapapeles falla, el ID queda seleccionado y se lee a la vista «No se pudo copiar: el identificador queda seleccionado (Ctrl+C)», con «⌘C» en macOS; cada intento fallido se vuelve a anunciar.
  - La vista de una conexión lleva el mismo pie con el ID. Su título es «A ↔ B», o «A → B» si es efectiva. Con el mismo nombre o hemisferios distintos, cada región lleva «(izq.)» o «(der.)», salvo si su abreviatura ya dice el lado, como en Brainnetome («L_SFG_7_1») o Gordon («l_default_12»). Sus datos dicen «Región A» y «Región B», u «Origen» y «Destino» si es efectiva.
- **5.6:**
  - Los avisos van arriba a la derecha, bajo la barra y sobre la columna derecha, con su ancho: no tapan la vista grande ni su recuadro de lectura. Los botones van bajo el mensaje.
  - Cada aviso tiene un origen (importar una síntesis, cambiar la clasificación, deshacer). Uno nuevo sustituye al anterior del mismo origen, como las franjas de antes.
  - Se cierra con «Entendido», y el foco pasa al aviso siguiente o, si era el último, a «Importar».
  - Los mensajes separan el texto comprensible del técnico, que va en «Detalles»: «No se pudo abrir o leer el archivo.», «El archivo elegido no contiene un JSON válido.» y «La síntesis no se ha importado: tiene N problemas.».
- **5.7:**
  - Los cambios que llegan juntos (en la misma tarea del navegador) son un solo paso. Un arrastre que acaba donde empezó no es un paso, y lo que se podía rehacer se conserva.
  - El aviso no lleva `role="status"`: su texto lo anuncia una región viva oculta (`aria-live="polite"`), siempre presente, y el aviso visible no lleva rol, para que no se lea dos veces. Los demás avisos, como los errores, siguen con `role="alert"`.
  - Se va solo a los 8 s, pero el tiempo se para mientras tiene el ratón encima o el foco. Tras usar su «Deshacer», o al cerrarlo, el foco va al botón ↶ si se ve, y si no, al título de la vista grande; nunca a «Importar».
  - N cuenta solo las regiones del atlas que se está viendo.
  - El «Deshacer» del aviso deshace el último paso, que es el suyo: cualquier otro cambio del historial retira el aviso.
  - Con otra clasificación, el historial se vacía cuando llegan sus datos, no al elegirla; si falla, se queda.
  - Los botones los recibe `FilterPanel` en una prop nueva, `historyControls`.
  - Las regiones se nombran con su lado, «añadir IFJa (der.) a la selección», salvo si la abreviatura ya lo dice. Quitar la única región seleccionada es «quitar IFJa (der.) de la selección», no «limpiar la selección».
  - El peso se escribe como en Filtros: el ejemplo pasa a «peso mínimo de 1.0e-3 a 4.0e-3».
  - El teclado no actúa con la tecla repetida por mantenerla pulsada, si otro ya atendió el evento, ni mientras está abierta una lista desplegable o el panel de Ajustes. Con un teclado sin letras latinas, mira la tecla física.
- **5.8** (la desviación 16):
  - Con la lista abierta, espacio, Inicio y Fin son del campo; con la lista cerrada, la flecha abajo la vuelve a abrir. Sin lista, el primer Escape ya vacía el campo.
  - La sugerencia activa al escribir es la primera que no está ya seleccionada (si todas lo están, la primera): así, «te1m» e Intro dos veces añade las dos TE1m. Lleva el contorno del color de acento, se desplaza a la vista con el teclado y el ratón también la cambia.
  - Los avisos van en una línea bajo el campo, y la lista bajo ella. Sin coincidencias: «Ninguna región coincide.». El de las redes ocultas sale también si la abreviatura exacta solo está en redes ocultas, aunque haya otras sugerencias; nombra sus redes, hasta tres, o cuántas son, y «Mostrar la red» o «Mostrar las redes» las muestra todas y devuelve el foco al campo.
  - Las abreviaturas con el lado (Brainnetome, Gordon) se buscan y se ordenan sin él, con los números en su orden. A igualdad de nivel y abreviatura: izquierdo, derecho y sin hemisferio.
  - La lista solo está en la página mientras está abierta, y `aria-controls` solo entonces.
  - Ctrl+K funciona en la vista Atlas; en el propio buscador, selecciona lo escrito; no actúa con Mayús ni con otra lista desplegable o el panel de Ajustes abiertos. El marcador de posición lo dice: «Buscar región (Ctrl+K)», o «(⌘K)» en macOS.
  - Con el foco en el buscador, Ctrl+Z es del campo (5.7): la región añadida se deshace con ↶, o con Ctrl+Z fuera del campo.
- **9, tras el párrafo «Fase 1.»:** un párrafo **Fase 3** con las unidades que el spec no nombraba:
  - `NetworkTag.tsx` (`NetworkTag`, `RegionSummary`), `DataStatus` en `TopBar.tsx`, `HistoryButtons.tsx` (con `HistoryButtonsView`), `useHistoryShortcuts.ts`, `RegionSearchView` en `RegionSearch.tsx`, `useRegionSearchShortcut.ts`, e `isTextEntry` en `logic/historyStep.ts`, la guarda de los campos de texto que comparten los dos atajos.
  - Los nueve módulos de `logic/`: `topBarFit`, `listbox`, `dataContext`, `displayText`, `toastQueue`, `desktopOnly`, `filterCounts`, `regionConnections` y `clipboard`.
  - `SettingsPopover` es el `SettingsMenu` de la fase 1.
  - `ATLASES` sigue en `App.tsx`.
- **10:** las pruebas de la fase 3 son de lógica pura (los módulos de arriba, `historyStep`, `regionSearch` y el store `history`) y de marcado con `renderToStaticMarkup` (`TopBar`, `Toast`, `FilterPanel`, `Connectogram`, `DetailPanel`, `HistoryButtons` y `RegionSearch`).
- **11:** la frase del orden de implementación ya está (commit `51644c9`); añade «(D4)» tras ella.
- **12, «Fuente en el JPEG»:** la frase «En pantalla sigue cortando las etiquetas largas, como en master; queda para la fase 3» pasa a decir que desde la fase 3 (D4) la leyenda mide su texto en pantalla y ensancha su `<svg>`, y que su recuadro se desplaza en horizontal si no cabe en el panel. Añade la consecuencia en la exportación: con etiquetas cortas el JPEG sale igual que antes; con largas, del ancho mayor de los dos, el de la pantalla o el de la fuente de la exportación, así que puede salir algo más ancho que antes, pero nunca cortado. Pon los anchos medidos en la Task 13.

Si en el Step 5 de la Task 13 cambiaste algo que el spec describe, retócalo también.

- [ ] **Step 3: escribir la D4 al final de `docs/decisiones-diseno.md`**

Toma la D3 de ese mismo archivo como modelo: su forma, sus encabezados en negrita y su línea sobre las secciones del spec retocadas.

- Título: `## D4. Estructura de la interfaz (fase 3 del rediseño) -- dd/mm/aaaa`, con la fecha del día.
- Párrafos con encabezado en negrita:
  - **Motivación.** La interfaz tenía aspecto de alfa: la barra superior mezclaba navegación, datos y acciones, y la información no tenía jerarquía. Es la estructura común a los cuatro temas de la D3.
  - **Orden de las fases.** La fase 3 se hizo antes que la 2 (paleta suave). Lo propusimos nosotros, porque lo que más pesaba en la petición inicial era la estructura (el menú superior, el logo y la jerarquía), y la usuaria nos dejó seguir en autónomo. No digas que lo eligió ella. La fase 3 no depende de la 2: los colores de red siguen saliendo de `resolveNetworkColor(clave)`, con un solo argumento.
  - **Decidido por la usuaria** (24/09/2026). Pidió deshacer y rehacer, porque un clic de más le hacía perder un montaje. Se valoró también una barra de estado fija al pie, y ella la descartó el mismo día: la maqueta ya da ese feedback donde se usa (la selección y el recuento de Filtros, el recuadro de lectura y el panel de detalle), y el pie lo repetiría. En la misma revisión del spec se añadieron el recuento del recuadro de lectura y los nombres de ◎ y +. El mismo día pidió un buscador de regiones, porque localizar a ojo una región entre 360 es muy difícil: decidió que fuera en Filtros, sobre la selección, y que solo sugiriera regiones de las redes visibles.
  - **Qué cambia.** Una lista, con una línea por cada parte: la barra superior y cómo se pliega, con los valores medidos en la Task 12 a 1400, 1280 y 1024 px y con dos síntesis; el contexto de datos accesible con el teclado; el estado de los datos; los avisos, arriba a la derecha, e Importar solo en la aplicación de escritorio; los filtros con recuentos; las cabeceras, las herramientas, la lupa como botón de alternar y «Ampliar»; los recuadros de lectura, con el recuento; el panel de detalle; deshacer y rehacer, con sus botones, sus atajos y su aviso (anunciado por una región viva, con un tiempo que se para con el ratón o el foco encima); el buscador de regiones, con su autocompletado, el aviso de las redes ocultas y Ctrl+K; y lo que la D3 dejó para esta fase: la barra (di que cabe en una fila y a qué altura solo si la Task 12 lo midió), los anillos neutros de las muestras, el foco del color de acento y la leyenda de la selección múltiple, que en pantalla ya no corta las etiquetas largas.
  - **Qué no cambia.** El estado, los stores y los manejadores del desarrollador principal, con estas excepciones, que se dicen una a una: la cola de avisos sustituye a las dos franjas con el mismo flujo; `handleImportSynthesis` pregunta antes a `isTauri()` y separa sus mensajes en texto comprensible y «Detalles», con los mensajes nuevos; `handleChangeAtlas` llama además a `resetHistory()`, y un efecto nuevo lo llama cuando llega otra clasificación (el menú de redes no cambia); y Ctrl+K despliega Filtros con su `setFiltersCollapsed` de siempre. Los stores de selección y de filtros no cambian: el historial se suscribe a ellos, y el buscador usa sus `addNodes` y `toggleNetwork`. Un comentario de `state/selection.ts`, que no se toca, queda desfasado: dice que el botón «Añadir a selección» de `FilterPanel` es el único sitio que llama a `addNodes`, y el buscador también lo llama. Dilo en la D4, para que lo sepa el desarrollador principal. Tampoco cambian `NETWORK_COLORS`, la lógica de representación, la disposición de la D1 (una vista grande, dos miniaturas, filtros a la izquierda y detalle a la derecha, con sus secciones de filtros plegables) ni los gráficos, que son la fase 4.
  - **Desviaciones del spec.** Las de este plan, incluido el cambio de «Se ven N de M» por «N de M conexiones pasan los filtros», y las que añadiera el Step 5 de la Task 13.
  - **Limitaciones conocidas:**
    - la ventana real de Tauri no se ha comprobado;
    - comprobación manual pendiente para la usuaria: Importar en la aplicación de escritorio, con el diálogo real (aquí se probó con Tauri simulado en el navegador, con la validación de siempre);
    - la barra espaciadora para volver a abrir la lista no se ha comprobado en Firefox (Tauri usa WebKit y Chromium);
    - quien usa el teclado sin lector de pantalla no ve la etiqueta emergente del punto de «Datos reales», que no se enfoca;
    - con movimiento reducido, el indicador de carga de «Redes» no gira (queda un arco quieto) y no hay ningún «cargando…» a la vista: el texto solo lo oyen los lectores de pantalla;
    - los errores de carga de las pestañas de tractografía, si los hubo en la fase `otras`, son de la base de datos, no de esta fase;
    - lo que las Tasks 12 y 13 dejaran sin ver, con las regiones que los scripts no pudieron seleccionar (`sinComprobar`).
  - **Pregunta abierta para la usuaria:** el peso de las conexiones conserva su formato de siempre, que puede llegar a 22 cifras. ¿Redondearlo, con el valor exacto en la etiqueta emergente?
  - **Verificación.** Describe el método aquí mismo, como la D3, sin remitir al scratchpad, que se borra con la sesión: Chromium sin interfaz (Playwright), un servidor de desarrollo propio y el backend local con datos reales, solo con peticiones GET; la versión anterior a la fase servida aparte y los mismos datos guardados para las dos, porque `GET /connections` no devuelve siempre el mismo orden; y cada región se selecciona comprobando, en el recuadro de lectura y en la selección, que es la buscada. Después, lo que se vio en las Tasks 12 y 13: temas y anchos, barra, síntesis, teclado, avisos, vistas, filtros contra la referencia, exportaciones comparadas con las de la versión anterior, deshacer y el buscador. Añade el número de pruebas, `tsc` limpio, lint con los mismos 9 avisos y la compilación.
  - **Queda para las fases 2 y 4.** Fase 2: la paleta suave y «Colores de las redes» en Ajustes; los consumidores nuevos de color de red (`NetworkTag` y las filas del detalle, con `useDrawColors().networkColor`, y las muestras de los filtros, con `resolveNetworkColor`) pasan a la versión con tema y modo. Fase 4: la leyenda del connectograma (5.4), los gráficos (sección 6), la atenuación por profundidad y la captura del 3D sin parpadeo.
- Al final, la línea con las secciones del spec retocadas en el Step 2, como la de la D3.
- Enlaza `docs/rediseno-interfaz-diseno.md` (secciones 5.1 y 5.3 a 5.8) y este plan, `docs/rediseno-interfaz-plan-fase3.md`.

- [ ] **Step 4: commit**

Otra sesión puede haber tocado `docs/` mientras trabajabas. Antes de añadir nada, mira qué cambia:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git status --short && git diff docs/
```

En el diff de `docs/decisiones-diseno.md` y `docs/rediseno-interfaz-diseno.md` solo deben estar tus cambios. Si alguno de los dos tiene cambios de otra sesión, no hagas el commit: no los añadas ni los deshagas, y termina la tarea como BLOQUEADA, diciendo qué archivo y qué cambios.

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add docs/decisiones-diseno.md docs/rediseno-interfaz-diseno.md
git commit -m "Estructura: D4, verificacion en la app real y retoques del spec

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

Si en el Step 1 la nueva D es otra, el mensaje lleva ese número («Estructura: D5, …»). Si en el Step 1 cambiaste referencias en el código, añade esos archivos al mismo `git add`.
