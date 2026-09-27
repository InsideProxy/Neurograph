# Rediseño de la interfaz · Fase 4: gráficos. Plan de implementación

> **Para agentes:** OBLIGATORIO: usar superpowers:subagent-driven-development (si hay subagentes) o superpowers:executing-plans para ejecutar este plan. Los pasos usan casillas (`- [ ]`) para seguir el avance. Este plan cambia la forma de revisar de esa habilidad: ver «Proceso».

**Objetivo:** lo que falta de la sección 6 del spec, sin cambiar lo que representan los gráficos: en el connectograma, las etiquetas radiales (y las marcas que las siguen), los arcos de hemisferio, el halo de la región seleccionada y la leyenda; en el cerebro 3D, los surcos más visibles y las etiquetas con la tipografía nueva, el fondo translúcido del tema y su caché por tema y versión de fuentes.

**Arquitectura:**

- **Geometría pura del connectograma**, en un módulo nuevo, `logic/connectogramLayout.ts`: la etiqueta radial (`radialLabel`), el halo (`selectionHalo`) y los arcos (`hemisphereBlocks`, `hemisphereArcs`, `arcPath`, `arcLabelSides`). El dibujo de los nodos y las marcas de la 5.9 usan las mismas funciones, así que la pastilla de una región marcada sigue exactamente a su etiqueta. Una prueba de marcado lo ata.
- **`Connectogram.tsx`, solo añadidos y lo mínimo:** la etiqueta de siempre pasa a `radialLabel`, con su giro; el halo va en un grupo encima de los nodos; los arcos, debajo de todo; la leyenda, fuera del `<svg>` (componente nuevo, `ConnectogramLegend`). No cambian las posiciones, el orden, las líneas, los radios, los colores ni la regla de tamaño de las etiquetas.
- **Surcos:** `sulcRange` pasa a los percentiles 5 y 95, calculados una vez por archivo (se guardan con el vector en un `WeakMap`), y `fillVertexColorsByIndex` suaviza el valor normalizado (`sulcShade`, un smoothstep recortado a 0-1). `PaintedCortex` y `Brain3D` no cambian para esto.
- **Etiquetas 3D:** dos tokens de dibujo nuevos, `label3dText` y `label3dBackground`. Todas las etiquetas van sobre una pastilla, como ya iban las de las marcas: las de siempre, con el texto del tema sobre su fondo translúcido; las marcadas, con los colores de marca. Una sola función dibuja las dos. La caché se indexa por texto, los dos colores y una versión de fuentes, en un store nuevo (`state/labelFont.ts`) que sube cuando `document.fonts.load(...)` termina. Mientras se captura el JPEG, los colores son los de exportación, como los demás tokens.

**Tecnología:** React 19, TypeScript 6 estricto, Vite 8, zustand 5, three.js 0.185, @react-three/fiber 9.7, d3 7, vitest 4 (entorno node, sin DOM; `react-dom/server` para el marcado) y oxlint.

**Spec:** `docs/rediseno-interfaz-diseno.md`: 6.1, 6.2 y 6.3; 5.4 («Leyenda del connectograma»); 4.1, 4.2 y 4.4; 5.9 (las marcas repiten la colocación de las etiquetas); 7, 8, 9, 10, 11 y 12. Decisiones D3, D4 y D5 de `docs/decisiones-diseno.md`. Maqueta aprobada: `/home/dae/.config/superpowers/worktrees/Neurograph/rediseno-referencias/maqueta-claude-design/` (`Connectograma.dc.html`, `Hemisferios.dc.html` y `Main.dc.html`), solo de lectura.

## Qué hay ya y qué falta

Auditoría sobre `c23aa91` (rama `rediseno-fase4`, recién creada desde `rediseno-interfaz`). Las líneas son de ese commit. Este plan solo cubre lo «parcial» y lo «pendiente».

| Punto del spec | Estado | Evidencia |
|---|---|---|
| 6.1 Etiquetas por fuera del anillo, radiales y giradas con el ángulo del nodo; en la mitad izquierda, 180° más y alineadas al final; tamaño por la regla actual | **pendiente** (van por fuera y con la regla de tamaño, pero rectas) | `components/Connectogram.tsx:541-549`: desplazamiento radial y texto horizontal, con `textAnchor` según `ux` (`start`, `middle` o `end`); `:582-596`, sin `transform`; `:164`, la regla de tamaño. La lupa sí las gira, hacia dentro: `:824-840`. |
| 6.1 Arcos de hemisferio IZQUIERDO y DERECHO, solo si cada hemisferio es un bloque seguido y ningún nodo tiene `hemisphere` nulo | **pendiente** | Nada en `Connectogram.tsx`. Solo los hemisferios rotulan sus elipses (`Hemisferios.tsx:520-525`). |
| 6.1 Líneas: la misma geometría, la regla de grosor, los tokens de color, la opacidad por estado y el `dash` | hecho (fase 1, D3) | `Connectogram.tsx:443-464`; la curva por el centro, `:450`. |
| 6.1 Nodos: relleno con el color de red del modo activo y anillo `nodeRing` de 1 px | hecho (fases 1 y 2) | `Connectogram.tsx:571-577`; el modo de paleta, en `theme/useDrawColors.ts:24`. |
| 6.1 Seleccionado: anillo `selected` de 2,5 px más un halo del mismo color al 35 % | **parcial**: el anillo, sí; el halo, no | `Connectogram.tsx:575-577`. Ningún halo. |
| 6.1 Resaltado al pasar el ratón con `hoverHighlight` (76c) | hecho (fase 1) | `Connectogram.tsx:488-508`; en la lupa, `:808`. |
| 5.4 Leyenda del connectograma, fija abajo a la izquierda, fuera del SVG, con cuatro entradas (fase 4 según 11) | **pendiente** | Ni en `Connectogram.tsx` ni en `App.tsx`: «Evidencia no directa» y «Color del punto» no aparecen en `frontend/src`. |
| 6.2 La geometría y el cálculo, los mismos | hecho (no han cambiado) | `components/Hemisferios.tsx`. |
| 6.2 Colores de los tokens de 4.2 | hecho (fase 1) | `Hemisferios.tsx:514-525`, `:580` y `:603`, `:672-676`. |
| 6.2 Elipses con `hemiFill` (`none` en Original) y contorno `edge` opaco | hecho (fase 1) | `Hemisferios.tsx:546-565`, sin `stroke-opacity`; `theme/themes.ts:127`. |
| 6.2 El texto, con la tipografía nueva | hecho (fase 1): el `<svg>` la hereda | `App.css:1` (`.app { font-family: var(--sans) }`); el `<svg>` no fija otra. La Task 9 lo mira en la app. |
| 6.3 Surcos: percentiles 5 y 95, una vez por archivo, y suavizado, en todos los temas | **pendiente** | `logic/surfaceParcels.ts:196-206`: mínimo y máximo, en cada repintado; `:251`: normalización lineal. |
| 6.3 Marcadores: radio 0,03 y 0,042, contorno 1,36, clic 0,06 y 0,09, etiqueta a 0,18 del borde | hecho (D5) | `logic/markerSize.ts:18-30`; `Brain3D.tsx:596` y `:678`. |
| 6.3 Etiquetas: tipografía nueva, texto y fondo translúcido del tema, caché por texto, tema y versión de fuentes | **pendiente** | `logic/textSprite.ts:47-48` (`bold 44px system-ui`); `:66-70` (contorno blanco y `#111111`, igual en todos los temas); `:88-90` (la clave es el texto; solo las de las marcas llevan colores, desde la 5.9). |
| 6.3 Fondo y materiales con tokens (`sceneBg`) | hecho (fase 1) | `Brain3D.tsx:1631` y `:1674`; `Tractography3D.tsx:263`; `TractographyNodes3D.tsx:262`. |
| 6.3 Oclusión por la corteza | hecho (rama `rediseno-oclusion`, ya fusionada) | `logic/cortexOcclusion.ts:242`; `components/Brain3D.occlusionWiring.test.ts`. |
| 6.3 Captura del 3D sin parpadeo | hecho (D5) | `logic/capture3d.ts:22` y `:101`. |
| D5, «queda para el resto de la fase 4»: la fila que ocupaba solo el interruptor desde 40rem | hecho: la oclusión quitó el interruptor | spec 6.3, «Se quitan el interruptor y su preferencia». |

**Fuera del spec 6, anotado para quien coordina:** la D3 dejó para «la fase 4 (diagrama)» el anillo neutro de los nodos del diagrama de síntesis en Claro (`FunctionSynthesisTab.tsx:120`, contorno `nodeGap`, blanco sobre el panel blanco). No está en la sección 6 ni en la 11, y las pestañas de síntesis no se rediseñan en esta ronda (spec 2). Este plan no lo toca: lo decide el usuario (ver «Para decidir el usuario»).

## Dónde encaja

- **Orden de las fases:** 1 (D3), 3 (D4), la parte 3D de la 4 (D5), 2 (paleta suave) y ahora el resto de la 4. La rama parte de `rediseno-interfaz` en `c23aa91`, con la paleta suave, la oclusión por la corteza y las marcas ya fusionadas.
- **`rediseno-interfaz` ha seguido avanzando.** Al revisar este plan iba por `bd8dee3`, cuatro commits más: la D7 (paleta suave), la D8 (oclusión) y la D9 (marcas) en `docs/decisiones-diseno.md`, retoques del spec, y la línea de marcas contextual (`MarksLine`, `FilterPanel.test.tsx`, `marksWiring.test.ts` y reglas de `App.css` lejos de las que toca este plan). Ninguna ancla del plan cambia con ellos. **Quien coordina decide si fusiona `rediseno-interfaz` en `rediseno-fase4` antes de la Task 1** (recomendado: la Task 10 escribe en los mismos documentos, y así no habría conflictos al fusionar de vuelta). El Step 0 de la Task 1 lo mira y vuelve a medir la BASE.
- **Número de la D:** la D6 la tiene reservada otra conversación (rama `rediseno-avisos`), y la D7, la D8 y la D9 ya están en `rediseno-interfaz`. Esta fase será, previsiblemente, la **D10**. La Task 10 lo comprueba. El código no cita el número: dice «fase 4 del rediseño».

## Fuera de esta fase

- Lo que ya está hecho (tabla de arriba): marcadores, oclusión, captura, fondo y materiales del 3D, y los hemisferios.
- Resaltar en el connectograma las vecinas de la región seleccionada, como hace la maqueta (nodos algo mayores y etiquetas en `strong`): el spec no lo pide, y cambiaría lo que se ve de la selección.
- El anillo de los nodos del diagrama de síntesis en Claro (ver arriba).
- Los valores de `NETWORK_COLORS` y de las constantes de la decisión 18, y la lógica de representación.

## Dónde se trabaja

- Worktree `/home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4`, rama `rediseno-fase4`. Quien coordina fusiona después en `rediseno-interfaz`.
- **Nunca** se toca `rediseno-interfaz` (el usuario lo usa en el puerto 5199), `rediseno-marcas`, `rediseno-avisos`, `rediseno-oclusion` ni la copia principal `/home/dae/PycharmProjects/Neurograph/Neurograph`, aunque el directorio de trabajo de la sesión apunte allí.
- `frontend/node_modules` ya está en el worktree. No ejecutes `npm install`: esta fase no añade dependencias.

## Convenciones

- Identificadores en inglés y comentarios en castellano, como el código actual. Los comentarios nuevos citan «fase 4 del rediseño» y la sección del spec, sin número de D.
- En los textos nuevos se escribe «el usuario». Los comentarios antiguos del desarrollador principal dicen «la usuaria»: se dejan como están.
- **Código del desarrollador principal:** cambios aditivos y mínimos. Sus comentarios se quedan tal cual. Donde el plan sustituye código suyo, lo dice y explica por qué; si un comentario suyo describe justo lo que se quita, se sustituye solo ese comentario, y el plan lo señala.
- **Rutas absolutas en todos los comandos.** Las órdenes de `frontend/` empiezan con `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend`.
- **Recursos.** La máquina del usuario se quedó sin memoria dos veces por los procesos de prueba y los navegadores. Una orden pesada cada vez, nunca varias a la vez, y las pruebas con `nice -n 19` y dos hilos. Sin navegadores ni servidores fuera de las Tasks 8 y 9.
- Órdenes, desde `frontend/`:
  - Una prueba: `nice -n 19 npx vitest run --maxWorkers=2 <ruta>`. Todas: `nice -n 19 npx vitest run --maxWorkers=2`. El Step 0 de la Task 1 anota las que haya al empezar: es la **BASE** (516 al escribir el plan, sobre `c23aa91`). Cada tarea da sus cuentas como «BASE + N»: Task 1, BASE + 8; Task 2, BASE + 12; Task 3, BASE + 24; Task 4, BASE + 26; Task 5, BASE + 33; Task 6, BASE + 37; Task 7, BASE + 43. En la prueba en seco fueron de 516 a 559.
  - Tipos: `nice -n 19 npx tsc -b`.
  - Lint: `nice -n 19 npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c`. La línea base es de **9 avisos** y ningún error (3 `set-state-in-effect`, 4 `preserve-manual-memoization`, todos en `Connectogram.tsx`, y 2 `exhaustive-deps`). No puede subir. Si aparece un aviso nuevo, no se silencia: se reestructura el código (por ejemplo, sin memoización manual). Si no hay forma de volver a 9, la tarea se detiene y se informa como BLOQUEADA.
  - Compilación: `nice -n 19 npm run build 2>&1 | grep -E "built in|error"`. El aviso de tamaño de bloque (más de 500 kB) ya estaba.
- **Paso «Comprobar» al final de cada tarea:** las cuatro órdenes, una tras otra y todas bien, y sin colores fijos nuevos fuera de la tabla de tokens y de las pruebas, en lo cambiado desde el commit de partida y en los archivos nuevos que aún no tienen commit:

  ```bash
  cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && { git diff "$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt)" -- frontend/src ':!frontend/src/theme/themes.ts' ':!*.test.ts' ':!*.test.tsx' | grep -E '^\+'; git ls-files --others --exclude-standard -- frontend/src ':!*.test.ts' ':!*.test.tsx' | xargs -r cat; } | grep -oiE '#[0-9a-f]{3,8}\b|rgba?\(' ; echo "fin de la búsqueda"
  ```

  Expected: solo `fin de la búsqueda`.
- **El commit de partida** lo guarda el Step 0 de la Task 1 en `fase4-base.txt`, en el scratchpad de la sesión que coordina (`/tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/`). Si ese scratchpad no existe, guárdalo en el de la sesión que ejecute el plan y usa esa ruta donde el plan diga la otra. Si se pierde, es el commit de este plan: `git log --format=%H -1 --grep='^Plan de la fase 4: graficos'`.
- **Sustituciones en archivos existentes.** Cada «busca» aparece una sola vez en su archivo. Si no lo encuentras tal cual, no sigas a ciegas: averigua por qué. Las anclas se probaron en seco sobre `c23aa91`. Si la diferencia viene de un commit posterior que haya entrado en la rama, adapta el «busca» sin cambiar lo que hace la sustitución y anótalo en el informe de la tarea; si viene de otra cosa, para y dilo.
- oxlint avisa si un `.tsx` exporta algo que no sea un componente o un tipo (`react/only-export-components`): las funciones puras van en archivos `.ts`.
- `tsconfig.app.json` exige `import type` para los tipos (`verbatimModuleSyntax`) y da error por imports o variables sin usar (`noUnusedLocals`), también en las pruebas.
- **Colores:** solo tokens. En los SVG, de `useDrawColors`, con su atributo `data-ng-*` para la exportación; en el HTML, las variables de `index.css`. `index.css` no se toca.
- **Letra mínima de 0,7rem** en lo nuevo del HTML.
- **Estado y manejadores.** No cambian los stores ni los manejadores del desarrollador principal. Solo se añade un store propio, `state/labelFont.ts` (Task 7).
- **Commits:** uno por tarea. Mensaje en castellano sin tildes ni eñes, que empieza por `Graficos: ` y termina con la línea `Co-Authored-By` del modelo que implementa (por ejemplo, `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`). `git add` solo de los archivos que nombra la tarea. Nada de `git stash`.
- **`docs/`:** solo la Task 10 lo modifica.

## Proceso

Rigor equilibrado, como pidió el usuario el 25/09/2026: foco en funcionalidad, datos, aspecto, teclado y contraste; los matices que solo afectan al lector de pantalla son «menores».

- **El plan va en el repositorio antes de empezar** (commit «Plan de la fase 4: graficos (revisado)»): el worktree queda limpio para el Step 0.
- **Dos tandas, con un implementador cada una**, en el worktree `rediseno-fase4` y una detrás de otra (el mismo worktree no admite dos a la vez):
  - **tanda 1, connectograma:** Tasks 1 a 4;
  - **tanda 2, cerebro 3D:** Tasks 5 a 7.

  Cada tarea, con su commit y su paso «Comprobar».
- **Una revisión conjunta por tanda**, en lugar de las dos revisiones por tarea de la habilidad: dos revisores en paralelo, subagentes nuevos sin el historial de la sesión, repartidos por áreas (secciones «Revisión de la tanda»). Solo leen: no abren navegadores ni servidores, ni ejecutan pruebas, `tsc`, lint o la compilación, porque dos a la vez cargarían la máquina; una prueba concreta se la piden a quien coordina.
- **Arreglos:** una sola ronda por tanda, en un commit `Graficos: correcciones de la revision de la tanda N`. Solo se vuelve a revisar lo que salió «importante», y solo ese punto.
- Después, la **verificación en la app real** (Tasks 8 y 9), solo cuando el usuario no esté usando la máquina o lo permita, con un solo navegador sin interfaz a la vez y las demás reglas de la Task 8. Al final, la **D y los retoques del spec** (Task 10).

## Mapa de archivos

Nuevos, en `frontend/src/`:

| Archivo | Responsabilidad |
|---|---|
| `logic/connectogramLayout.ts` | Geometría de la fase 4 en el connectograma: etiqueta radial, halo, bloques y arcos de hemisferio, su trazado y el lado de sus rótulos |
| `logic/connectogramLayout.test.ts` | Pruebas de esa geometría, con los ángulos de `d3.scalePoint`, como el componente |
| `components/ConnectogramLegend.tsx` | La leyenda del connectograma (5.4) |
| `components/connectogramGraphics.test.tsx` | Marcado del connectograma: etiquetas radiales, marcas que las siguen, halo, arcos y leyenda |
| `logic/sulcShading.test.ts` | Percentiles y suavizado de los surcos, sobre un vector conocido |
| `state/labelFont.ts` | Versión de fuentes de las etiquetas del 3D: pide la fuente y sube al llegar |
| `state/labelFont.test.ts` | Pruebas de esa versión |
| `components/Brain3D.labelsWiring.test.ts` | Las líneas de `Brain3D.tsx` que conectan las etiquetas nuevas |

Modificados:

- `components/Connectogram.tsx`: etiquetas radiales (Task 1), halo (Task 2), arcos (Task 3) y leyenda (Task 4). Las marcas y la lupa, lo justo para seguirlos.
- `logic/marks.ts`: solo el comentario de `outwardLabel` (Task 1).
- `App.css`: las reglas de la leyenda, tras las de la lupa (Task 4).
- `logic/surfaceParcels.ts`: `sulcRange`, `percentile`, `sulcShade` y una línea de `fillVertexColorsByIndex` (Task 5).
- `theme/themes.ts`: tokens `label3dText` y `label3dBackground` (Task 6); `theme/themeCss.test.ts`, su prueba.
- `logic/textSprite.ts`: tipografía, estilo, clave y caché de las etiquetas (Task 7); `logic/textSprite.test.ts`, reescrito.
- `components/Brain3D.tsx`: `NodeLabel`, `MarkLook`, su llamada y la petición de la fuente (Task 7); `components/Brain3D.marksWiring.test.ts`, dos pruebas que fijaban las líneas que cambian.
- Documentos, en la Task 10: `docs/decisiones-diseno.md` y `docs/rediseno-interfaz-diseno.md`.

Sin cambios: `Hemisferios.tsx`, `MarkedLabel.tsx`, `PaintedCortex.tsx`, `ReferenceMesh.tsx`, `logic/markerSize.ts`, `logic/cortexOcclusion.ts`, `logic/capture3d.ts`, `logic/exportImage.ts`, `logic/exportPalette.ts`, `theme/networks.ts`, `theme/colors.ts`, `theme/useDrawColors.ts`, `index.css`, `App.tsx` y los stores del desarrollador principal.

## Desviaciones y decisiones de diseño

La Task 10 las anota en la D y en el spec.

1. **Etiquetas radiales (6.1).** `radialLabel(posición, ux, uy, separación)`: la separación de siempre (`radio del nodo + 7`) en la dirección que va del centro al nodo, y el giro con el ángulo del nodo. En la mitad derecha, alineada al principio; en la izquierda (`ux < 0`, el mismo criterio que la lupa), 180° más y alineada al final. Arriba y abajo del todo, en vertical. La regla de tamaño (`labelFontSize` según el número de nodos, y +1,5 y negrita para la seleccionada o la que tiene el ratón encima) no cambia. `markedLayout` llama a la misma función con los mismos argumentos, y `MarkedLabel`, que ya giraba la pastilla con el texto en la lupa, recibe el mismo `transform`. `outwardLabel` sigue siendo la regla de los hemisferios.
2. **Espacio de las etiquetas** (pregunta 2; lo decidió el usuario el 25/09/2026, D10). Con el radio del desarrollador principal, `lado / 2 − 40`, la etiqueta más larga de HCP-MMP1.0 (letra de 5,5 px) acaba a unos 31 px del anillo y cabe. En los atlas de abreviaturas largas no: calculado con sus abreviaturas, unos 51 px en Brainnetome («L_MVOcC _5_1», así, con un espacio, en los datos), 75 en Gordon 333 («r_frontoparietal_20») y 130 en el Subcórtex (19 regiones, letra de 9 px). Ya se cortaban por los lados, y giradas se cortarían también arriba y abajo. El plan no encogía el círculo; el usuario eligió ajustar el margen a la etiqueta más larga, para que ninguna se corte:
   - el ancho se estima sin DOM (`estimatedLabelWidth`), con el avance medio de cada grupo de letras medido en el woff2 de Atkinson Hyperlegible Next de peso 700, un 10 % de seguridad y los 0,18 px de espaciado entre letras de la página;
   - se reserva el sitio de la etiqueta ampliada (negrita, letra 1,5 px mayor y nodo 3 px mayor), con la pastilla de una marca;
   - el margen es de 40 px como poco, el radio no baja de la mitad del de siempre, y la miniatura conserva los 40 px;
   - tras la revisión de la tanda 1, el margen cuenta las etiquetas de todo el atlas, no solo las que se ven: el radio es estable por atlas, salvo cuando el número de nodos a la vista cruza 40 o 150 y cambia la letra;
   - radios con un lado de 666 px (antes, 293): HCP-MMP1.0, 291,0; Brainnetome, 264,6; Gordon 333, 246,6; Subcórtex, 187,7.
3. **Halo (6.1).** Un anillo del color `selected`, con `stroke-opacity` 0,35 y 2 px de grosor, separado 2 px del contorno de 2,5 px, como en la maqueta (`selHalo`), en todos los temas. Va en un grupo propio encima de los nodos, así que tiñe un poco a las vecinas, como en la maqueta. Se exporta con `data-ng-stroke="selected"`; su opacidad es fija y no lleva referencia. En la lupa, la región seleccionada lleva también su halo.
4. **Marca y halo juntos.** Las marcas no cambian: el anillo de una región marcada sigue justo por fuera del contorno de 2,5 px (5.9) y se dibuja encima del halo, que lo rodea y asoma por fuera (el halo va de 9,25 a 11,25 px del centro de una región seleccionada de HCP-MMP1.0, y el anillo, de 8,75 a 10,25). En la lupa, igual. Se descartó llevar el anillo por fuera del halo: caería sobre el principio de la etiqueta, a 13 px, y su pastilla lo cortaría. Y el halo no puede apartarse de la marca, porque el JPEG no lleva marcas y el halo tiene que salir igual con o sin ellas. **Cómo quedó (D10):** la punta de la pastilla de una región seleccionada y marcada tapa cerca de 1 px del borde de fuera del halo; y en la lupa el halo va con su nodo, así que llega hasta el principio de su etiqueta, que allí va hacia dentro, y las vecinas que se dibujan después pueden taparlo.
5. **Arcos de hemisferio (6.1).**
   - **Cuándo:** los dos hemisferios presentes, ningún nodo con `hemisphere` nulo y cada hemisferio en un único bloque seguido del orden actual, contando que el círculo se cierra (un bloque puede pasar por el principio del orden). Con un solo hemisferio no hay arcos: el spec habla de dos. Se evalúa sobre los nodos que pasan los filtros, en su orden, que no se toca. Con los datos del backend, HCP-MMP1.0 los tiene (180 del derecho y luego 180 del izquierdo), y Brainnetome, Gordon 333 y el Subcórtex no (alternan, y el Subcórtex tiene una región sin hemisferio). El orden es el de las filas de `/regions`, que el backend no ordena de forma explícita: si un día cambiara, los arcos podrían aparecer o desaparecer.
   - **Dónde:** a 34 px del anillo de los nodos, por fuera de las etiquetas de HCP-MMP1.0 en reposo (acaban a unos 31 px) y dentro del margen de 40 px. Una etiqueta larga y ampliada (seleccionada o con el ratón encima) llega a unos 40 px y cruza el arco, que queda debajo. Cada uno va del borde de su primer nodo al de su último, menos 4° a cada lado, como en la maqueta; con un bloque muy corto, la separación se reduce a un cuarto del arco.
   - **Cómo:** 1,5 px, extremos redondos, token `edge` opaco: el mismo contorno que las elipses de los hemisferios (6.2). La maqueta usaba `faint`, que no es un token de dibujo y queda por debajo de 3:1 (4.1), lo que el spec 8 exige a los gráficos.
   - **Rótulos:** «IZQUIERDO» y «DERECHO» en las esquinas de arriba, como en la maqueta, a 10 px del borde, en letra de 10 px y peso 600, como los de los hemisferios, con 1 px de espaciado, como en la maqueta, y el token `label`. Cada rótulo va del lado en que queda el punto medio de su arco; con los dos igual de centrados, el izquierdo a la izquierda. Así, un atlas que empezara por el izquierdo tendría sus rótulos bien puestos.
   - **En la miniatura,** los arcos sin rótulos, como en la maqueta.
   - Se exportan: son parte del dibujo.
6. **Leyenda (5.4)** (pregunta 1; lo decidió el usuario el 25/09/2026, D10). `ConnectogramLegend`, una lista con nombre («Leyenda del connectograma», `role="list"`) y cuatro entradas con su muestra en un `<svg>` decorativo. **Va bajo el dibujo, no encima:** en su propia fila de `.viz-panel`, abajo a la izquierda, fuera del `<svg>` (no se exporta) y solo en la vista grande. El hueco del dibujo se queda con el alto que sobra, y el círculo se ajusta a él. Va sobre el panel, con su mismo fondo y un borde, y sin selección de texto; letra de 0,7rem en `--text-muted`. Las muestras son del color del texto (`--text`): las de las dos líneas, de 1 px y con extremos rectos, como las del dibujo, y la discontinua con el `dash` del tema. Las entradas van en una fila, o en dos o tres si no caben; con 8 px entre entradas y 6 entre la muestra y su texto, a 1400 × 900 caben en una (unos 771 px de 776, calculado).
   - **Por qué no encima.** En la maqueta, el círculo es más pequeño respecto a su lado (radio 0,39 del lado) y la leyenda cabía en la esquina. En la app es de 0,43 a 0,47, y a 1400 × 900 la leyenda habría tapado, calculado, una docena de nodos del cuadrante de abajo a la izquierda, con sus etiquetas, y la lupa en esa esquina. Debajo no tapa nada, pero el dibujo pierde alto: a 1400 × 900, su lado baja de 666 a unos 615 px, calculado, y el del JPEG, de 1998 a 1845.
7. **Surcos (6.3).** Percentiles 5 y 95 con interpolación lineal entre los dos valores más cercanos (el método por defecto de numpy), sin contar los NaN. Se guardan en un `WeakMap` con el propio `Float32Array` que da `parseSulcFile`: se calculan una vez por cada carga del archivo (al cambiar de atlas, el archivo se vuelve a leer y a calcular), no en cada repintado, y sin tocar `PaintedCortex` ni `Brain3D`. El valor normalizado se recorta a 0-1 (fuera de los percentiles queda por debajo de 0 o por encima de 1) y pasa por un smoothstep. Ese mismo valor oscurece las regiones con color en los surcos: el factor sigue entre 0,7 y 1, pero ahora más vértices llegan a los extremos, también en el mapa entero pintado. En el archivo de `fsLR 32k`, el rango pasa de −1,69…1,16 a −0,85…0,56. Original conserva sus grises de 0,35 y 0,72; cambia la forma de repartirlos, en todos los temas.
8. **Colores de las etiquetas 3D (6.3).** Dos tokens nuevos por tema (4.2): `label3dText`, el `--text` de `index.css`, y `label3dBackground`, el fondo de la escena (`sceneBg`, que es el `--panel-bg`) con transparencia: 0,84 en Grafito y Noche y 0,88 en Claro, los de la maqueta (su `scrim`), y 0,84 en Original, sobre su panel, como los demás (la maqueta usaba ahí `--bg` al 82 %). El texto supera 4,5:1 sobre ese fondo con cualquier cosa detrás (probado con el fondo compuesto sobre negro y sobre blanco: de 5,9:1 a 12,5:1). En la maqueta, las etiquetas de las vecinas no se veían (`sc-if` en falso); el spec no las quita, y aquí se ven todas, con su pastilla.
9. **Etiquetas 3D: forma, fuente y caché (6.3).**
   - Todas son una pastilla, como ya lo eran las de una región marcada (5.9): una sola función las dibuja, con el mismo lienzo de 84 px de alto para una letra de 44 (el texto sale del tamaño de antes). La pastilla es algo más ancha que el texto con contorno de antes (34 px de margen por lado en vez de 18).
   - Letra: `600 44px 'Atkinson Hyperlegible Next', system-ui, sans-serif`, el peso de las etiquetas del connectograma.
   - La textura va en sRGB y el material sin curva de tono (`toneMapped={false}`), como ya iban la pastilla y el anillo de las marcas: los colores salen como en los SVG. Esto cambia una prueba de las marcas, que decía «las etiquetas de siempre, con ella» (Task 7).
   - **Clave de la caché:** el texto, los dos colores y la versión de fuentes. El spec dice «texto, tema y versión»: los colores representan el tema y cubren también la exportación (mientras se captura, los de exportación) y las marcas. Cuando la versión sube, las texturas de la versión anterior se liberan (`dispose`), para no acumular memoria.
   - **Versión de fuentes:** `state/labelFont.ts`, un store de zustand con `version`. `Brain3D` pide la fuente al montar (`requestLabelFont(document.fonts)`), una vez por sesión; cuando `document.fonts.load(LABEL_FONT)` termina, la versión sube y las etiquetas se vuelven a dibujar. Si no llega, se quedan con la de respaldo, sin error.
   - **Exportación:** `NodeLabel` recibe `colors`, que durante la captura son los de exportación (4.4). Con los temas 2 a 4, el JPEG lleva el texto de Claro sobre blanco al 88 %; con Original, las de Original, claras sobre una pastilla oscura, sobre el blanco del JPEG (ver abajo). Las etiquetas del JPEG del 3D salen con la fuente de la interfaz, porque son texturas que la aplicación dibuja con ella; lo que dice el spec 7 («las etiquetas del JPEG usan la pila de fuentes del sistema») vale para los SVG, que se dibujan fuera de la página.
10. **Unidades nuevas** que el spec no nombra: `logic/connectogramLayout.ts`, `components/ConnectogramLegend.tsx` y `state/labelFont.ts`.

## Qué cambia en los JPEG

Por diseño, donde cambia el dibujo. Al día con lo construido (D10); en la app no se ha comprobado, porque las Tasks 8 y 9 no se pasaron.

- **Connectograma:**
  - las etiquetas, giradas;
  - el círculo, algo menor: el margen se ajusta a la etiqueta más larga del atlas (desviación 2), y el lado del dibujo depende de las filas de la leyenda, que va debajo (desviación 6). A 1400 × 900, el JPEG pasa de 1998 a 1845 px de lado;
  - con HCP-MMP1.0, los dos arcos con sus rótulos (con Brainnetome, Gordon 333 y el Subcórtex, no);
  - con una selección, el halo de cada región seleccionada, con el color de selección de la exportación (`#16181c` con los temas 2 a 4, `#ac61d1` con Original) al 35 %.

  Los nodos, las líneas y sus colores son los de antes, en el mismo orden y con los mismos ángulos; sus posiciones cambian con el radio. La leyenda no entra, porque va fuera del `<svg>`, y las marcas siguen sin entrar.
- **Hemisferios:** nada. `Hemisferios.tsx` no cambia.
- **Leyenda de la selección múltiple:** nada.
- **Cerebro 3D:** el sombreado de la corteza (surcos), en todos los temas, también en Original y dentro de las regiones con color; y las etiquetas, con la tipografía nueva, al lado de su marcador y sobre la pastilla con los colores de exportación. Con los temas 2 a 4, el texto de Claro sobre blanco al 88 %; con Original, los de Original, claros sobre una pastilla oscura, sobre el blanco del JPEG (pregunta 3, que se decidió así). La de la región seleccionada, con el texto fuerte, en negrita y algo mayor.

## Para decidir el usuario

Este plan sigue el spec y deja estas preguntas abiertas. La Task 9 da las cifras de la app real, y la D las recoge.

1. **La leyenda tapa parte del círculo** (desviación 6), y, donde tapa, también la lupa. ¿Se queda fija sobre el dibujo, como en el spec y en la maqueta, o pasa bajo el dibujo, fuera de él (el círculo mediría unos 40 px menos de lado a 1400 × 900, un 6 %)? Otras opciones: mostrarla solo cuando cabe, o esconderla mientras la lupa está activa.
2. **Etiquetas largas** (desviación 2): en Brainnetome, Gordon 333 y el Subcórtex, las etiquetas radiales se cortan también arriba y abajo. ¿Se deja así, o se ajusta el margen a la etiqueta más larga en esos atlas (el círculo sería más pequeño en ellos; en HCP-MMP1.0 no cambia)?
3. **Etiquetas del 3D exportado con el tema Original:** salen como en pantalla, texto claro sobre una pastilla oscura, sobre el blanco del JPEG (la regla de 4.4: con Original, los colores de Original). ¿O prefiere, solo para ellas, las de Claro?
4. **Etiquetas de todas las vecinas en el 3D:** con una región de muchas conexiones (hasta 359 en HCP-MMP1.0), sus pastillas tapan más corteza que el texto con contorno de antes. La maqueta solo rotulaba la seleccionada, pero el spec no quita las demás.
5. **Diagrama de síntesis en Claro:** la D3 dejó para la fase 4 el anillo neutro de sus nodos. Está fuera de la sección 6: ¿se hace aparte?
6. **Para confirmar, el sombreado de las regiones con color** (desviación 7): el suavizado de los surcos también acentúa el sombreado de las regiones pintadas con el color de su red, en el mapa entero. Es la lectura literal del spec (el suavizado va sobre el valor normalizado, que usan los dos), pero cambia más la corteza pintada de lo que dice «surcos más visibles».

---

## Chunk 1: connectograma (tanda 1)

### Task 1: etiquetas radiales, y las marcas las siguen

**Files:**
- Create: `frontend/src/logic/connectogramLayout.ts`
- Create: `frontend/src/logic/connectogramLayout.test.ts`
- Create: `frontend/src/components/connectogramGraphics.test.tsx`
- Modify: `frontend/src/components/Connectogram.tsx` (un import, la etiqueta de la marca, la de siempre y la pastilla)
- Modify: `frontend/src/logic/marks.ts` (solo el comentario de `outwardLabel`)

- [ ] **Step 0: punto de partida**

Comprueba que el worktree está limpio, en su rama y con lo que este plan da por hecho: la oclusión, la paleta suave y las marcas, fusionadas.

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git status --short && git branch --show-current && git log --oneline -3
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git merge-base --is-ancestor rediseno-interfaz HEAD && echo "al día con rediseno-interfaz" || git log --oneline HEAD..rediseno-interfaz
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && grep -n "^## D[0-9]" docs/decisiones-diseno.md
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && ls frontend/src/logic/cortexOcclusion.ts frontend/src/logic/marks.ts frontend/src/theme/softPalettes.ts frontend/src/components/MarkedLabel.tsx
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && grep -n "outwardLabel(pos" frontend/src/components/Connectogram.tsx frontend/src/components/Hemisferios.tsx
```

Expected:
- `git status --short` sin salida. Si hay cambios, son de otra sesión: no sigas y termina la tarea como BLOQUEADA.
- La rama es `rediseno-fase4`, y el último commit, «Plan de la fase 4: graficos (revisado)», sobre `c23aa91`, o la fusión de `rediseno-interfaz` que haya hecho quien coordina (ver «Dónde encaja»); apúntalo.
- `al día con rediseno-interfaz`, o la lista de sus commits que faltan. Si faltan, pregunta a quien coordina si los fusiona antes de seguir (no los fusiones tú).
- La lista de D llega al menos a la D5.
- Los cuatro archivos existen.
- `outwardLabel(pos` aparece una vez en cada uno de los dos componentes.

Si algo no cuadra, el código no es el que espera el plan: averigua por qué antes de seguir.

Guarda el commit de partida y apunta las cuentas:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git rev-parse HEAD > /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt && cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 2>&1 | grep -E "^\s+Tests "
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c
```

Expected: `Tests  516 passed (516)` (es la BASE; si hay más, apunta cuántas) y `9 : warning`, sin errores.

- [ ] **Step 1: las pruebas de la geometría y del marcado**

La geometría, en una prueba pura. El marcado, con `renderToStaticMarkup`: los stores de selección y de marcas se sustituyen por unos con IFJa (der.) seleccionada, e IFJa (der.) y V1 (izq.) marcadas. Así se prueba también una etiqueta ampliada (la de la región seleccionada). La prueba de la pastilla ata las dos geometrías: la etiqueta de siempre y la de la marca tienen que tener los mismos atributos.

Crea `frontend/src/logic/connectogramLayout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { labelTransform, radialLabel } from "./connectogramLayout";

// Geometría del connectograma de la fase 4 del rediseño
// (docs/rediseno-interfaz-diseno.md, 6.1).
describe("radialLabel", () => {
  it("en la mitad derecha, fuera del nodo, girada con su ángulo y alineada al principio", () => {
    const right = radialLabel({ x: 100, y: 50 }, 1, 0, 10);
    expect(right).toEqual({ x: 110, y: 50, anchor: "start", rotation: 0 });
    const lowerRight = radialLabel({ x: 0, y: 0 }, Math.SQRT1_2, Math.SQRT1_2, 10);
    expect(lowerRight.x).toBeCloseTo(7.071, 3);
    expect(lowerRight.y).toBeCloseTo(7.071, 3);
    expect(lowerRight.anchor).toBe("start");
    expect(lowerRight.rotation).toBeCloseTo(45);
  });

  it("en la mitad izquierda, girada 180° más y alineada al final, para leerse de izquierda a derecha", () => {
    const left = radialLabel({ x: 100, y: 50 }, -1, 0, 10);
    expect(left.x).toBe(90);
    expect(left.y).toBeCloseTo(50);
    expect(left.anchor).toBe("end");
    expect(left.rotation).toBeCloseTo(360);
    const upperLeft = radialLabel({ x: 0, y: 0 }, -Math.SQRT1_2, -Math.SQRT1_2, 10);
    expect(upperLeft.anchor).toBe("end");
    expect(upperLeft.rotation).toBeCloseTo(45);
  });

  it("arriba y abajo del círculo, en vertical y hacia fuera", () => {
    expect(radialLabel({ x: 0, y: 0 }, 0, -1, 10)).toEqual({ x: 0, y: -10, anchor: "start", rotation: -90 });
    expect(radialLabel({ x: 0, y: 0 }, 0, 1, 10)).toEqual({ x: 0, y: 10, anchor: "start", rotation: 90 });
  });
});

describe("labelTransform", () => {
  it("gira alrededor del punto de la etiqueta", () => {
    expect(labelTransform({ x: 110, y: 50, anchor: "start", rotation: 30 })).toBe("rotate(30 110 50)");
  });
});
```

Crea `frontend/src/components/connectogramGraphics.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GraphNode } from "../types/domain";
import { DRAW_TOKENS } from "../theme/themes";
import { Connectogram } from "./Connectogram";

// Gráficos del connectograma de la fase 4 del rediseño
// (docs/rediseno-interfaz-diseno.md, 6.1 y 5.4), en el marcado. Con
// renderToStaticMarkup, zustand da el estado inicial de cada store: aquí la
// selección empieza con IFJa (der.), y las marcas con IFJa (der.) y V1
// (izq.). El tema es el de por defecto, Grafito. Sin DOM, el <svg> mide lo de
// partida, 420 px: el centro está en (210, 210).
vi.mock("../state/selection", async () => {
  const { create } = await import("zustand");
  return {
    useSelectionStore: create(() => ({
      selectedNodeIds: new Set(["r_ifja"]),
      selectedConnectionId: null,
      toggleNode: () => {},
      selectNodes: () => {},
      addNodes: () => {},
      clearNodeSelection: () => {},
      selectConnection: () => {},
    })),
  };
});
vi.mock("../state/marks", async () => {
  const { create } = await import("zustand");
  return {
    useMarksStore: create(() => ({ markedIds: new Set(["r_ifja", "l_v1"]), toggleMark: () => {}, clearMarks: () => {} })),
  };
});

function region(id: string, abbreviation: string, hemisphere: "L" | "R" | null): GraphNode {
  return {
    id,
    label: `Area ${abbreviation}`,
    abbreviation,
    hemisphere,
    network: "cole-anticevic.visual",
    position3d: [0, 0, 0],
    referenceSpace: null,
  };
}

// En el orden del círculo: los dos primeros, en la mitad derecha (arriba y
// abajo); los dos últimos, en la izquierda (abajo y arriba). Cada hemisferio,
// un bloque seguido, como en HCP-MMP1.0.
const NODES = [
  region("r_ifja", "IFJa", "R"),
  region("r_fef", "FEF", "R"),
  region("l_v1", "V1", "L"),
  region("l_te1m", "TE1m", "L"),
];
const CENTER = 210;
const TOKENS = DRAW_TOKENS.grafito;

type Attributes = Record<string, string>;

function attributes(text: string): Attributes {
  return Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
}

// Cada nodo del dibujo, con su posición (el translate de su grupo) y los
// atributos de su etiqueta.
function nodeLabels(html: string): Map<string, { x: number; y: number; label: Attributes }> {
  const found = new Map<string, { x: number; y: number; label: Attributes }>();
  const pattern = /<g transform="translate\(([-\d.e]+), ([-\d.e]+)\)"><circle [^>]*><\/circle><\/g><text ([^>]*)>([^<]*)<\/text>/g;
  for (const m of html.matchAll(pattern)) found.set(m[4], { x: Number(m[1]), y: Number(m[2]), label: attributes(m[3]) });
  return found;
}

// La etiqueta de una región marcada: el texto sobre su pastilla, con el color
// de texto de marca.
function markedLabel(html: string, text: string): { rect: Attributes; text: Attributes } | null {
  const m = new RegExp(`<rect ([^>]*)></rect><text ([^>]*fill="${TOKENS.markText}"[^>]*)>${text}</text>`).exec(html);
  return m ? { rect: attributes(m[1]), text: attributes(m[2]) } : null;
}

function rotation(transform: string): { angle: number; x: number; y: number } {
  const m = /^rotate\(([-\d.e]+) ([-\d.e]+) ([-\d.e]+)\)$/.exec(transform);
  if (!m) throw new Error(`transform inesperado: ${transform}`);
  return { angle: Number(m[1]), x: Number(m[2]), y: Number(m[3]) };
}

// Ángulo en grados de 0 a 360.
const normalized = (degrees: number) => ((degrees % 360) + 360) % 360;

describe("etiquetas del connectograma (6.1)", () => {
  const html = renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} />);
  const labels = nodeLabels(html);

  it("hay una etiqueta por nodo, con el color de las abreviaturas", () => {
    expect([...labels.keys()].sort()).toEqual(["FEF", "IFJa", "TE1m", "V1"]);
    for (const { label } of labels.values()) expect(label.fill).toBe(TOKENS.label);
  });

  it("van por fuera del anillo, en la dirección que va del centro al nodo", () => {
    for (const [text, { x, y, label }] of labels) {
      const [lx, ly] = [Number(label.x), Number(label.y)];
      const node = Math.hypot(x - CENTER, y - CENTER);
      expect(Math.hypot(lx - CENTER, ly - CENTER), text).toBeGreaterThan(node);
      // Misma dirección: el producto vectorial de las dos es nulo.
      expect((x - CENTER) * (ly - y) - (y - CENTER) * (lx - x), text).toBeCloseTo(0, 6);
    }
  });

  it("giradas con el ángulo del nodo: en la mitad derecha, alineadas al principio; en la izquierda, 180° más y al final", () => {
    for (const [text, { x, y, label }] of labels) {
      const turn = rotation(label.transform);
      expect([turn.x, turn.y], text).toEqual([Number(label.x), Number(label.y)]);
      const angle = (Math.atan2(y - CENTER, x - CENTER) * 180) / Math.PI;
      const right = x > CENTER;
      expect(label["text-anchor"], text).toBe(right ? "start" : "end");
      expect(normalized(turn.angle), text).toBeCloseTo(normalized(right ? angle : angle + 180), 6);
    }
  });

  it("la pastilla de una región marcada sigue exactamente a su etiqueta, también seleccionada", () => {
    for (const text of ["IFJa", "V1"]) {
      const { label } = labels.get(text)!;
      const marked = markedLabel(html, text);
      expect(marked, text).not.toBeNull();
      for (const name of ["x", "y", "transform", "text-anchor", "font-size", "font-weight"]) {
        expect(marked!.text[name], `${text}: ${name}`).toBe(label[name]);
      }
      expect(marked!.rect.transform, text).toBe(label.transform);
      expect(marked!.rect.fill, text).toBe(TOKENS.mark);
    }
  });
});
```

- [ ] **Step 2: ver que fallan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/logic/connectogramLayout.test.ts src/components/connectogramGraphics.test.tsx 2>&1 | tail -15
```

Expected: FAIL. `connectogramLayout.test.ts` no encuentra `./connectogramLayout`, y en `connectogramGraphics.test.tsx` falla «giradas con el ángulo del nodo…» con `transform inesperado: undefined`: hoy las etiquetas no giran. Las otras tres pasan ya, porque describen lo que no cambia (hacia fuera, una por nodo) o lo que ya coincide (la pastilla sigue a la etiqueta recta).

- [ ] **Step 3: la geometría y el dibujo**

Crea `frontend/src/logic/connectogramLayout.ts`:

```ts
// Geometría del connectograma de la fase 4 del rediseño
// (docs/rediseno-interfaz-diseno.md, 6.1). Funciones puras: se prueban sin
// DOM. El dibujo de los nodos y las marcas de regiones (5.9) usan las mismas,
// así que la pastilla de una región marcada sigue exactamente a su etiqueta.
import type { TextAnchor } from "./marks";

export interface RadialLabel {
  x: number;
  y: number;
  anchor: TextAnchor;
  // Giro del texto alrededor de (x, y), en grados.
  rotation: number;
}

// Etiqueta de un nodo, por fuera del anillo y en dirección radial (6.1): a
// `offset` del nodo en la dirección (ux, uy), el vector unitario que va del
// centro al nodo, y girada con el ángulo del nodo. En la mitad derecha va
// alineada al principio, así que crece hacia fuera. En la izquierda se gira
// 180° más y se alinea al final: sigue creciendo hacia fuera y se lee de
// izquierda a derecha. Es lo contrario de la lupa, que las pone hacia dentro.
export function radialLabel(position: { x: number; y: number }, ux: number, uy: number, offset: number): RadialLabel {
  const angle = (Math.atan2(uy, ux) * 180) / Math.PI;
  const leftHalf = ux < 0;
  return {
    x: position.x + ux * offset,
    y: position.y + uy * offset,
    anchor: leftHalf ? "end" : "start",
    rotation: leftHalf ? angle + 180 : angle,
  };
}

// El atributo transform del texto, y de la pastilla de una región marcada,
// que gira con él (components/MarkedLabel.tsx).
export function labelTransform(label: RadialLabel): string {
  return `rotate(${label.rotation} ${label.x} ${label.y})`;
}
```

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
import { MARK_ELEMENT, isMarkGesture, markRing, outwardLabel, type ClickKeys } from "../logic/marks";
```

Sustitúyelo por:

```tsx
import { MARK_ELEMENT, isMarkGesture, markRing, type ClickKeys } from "../logic/marks";
import { labelTransform, radialLabel } from "../logic/connectogramLayout";
```

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
        label: outwardLabel(pos, (pos.x - center) / radius, (pos.y - center) / radius, currentNodeRadius + 7),
```

Sustitúyelo por:

```tsx
        label: radialLabel(pos, (pos.x - center) / radius, (pos.y - center) / radius, currentNodeRadius + 7),
```

La etiqueta de siempre. Se quitan `labelX`, `labelY` y `textAnchor`, y el comentario que explicaba cómo se alineaba el texto recto, que deja de valer; el comentario largo del desarrollador principal que va antes («Etiqueta SIEMPRE por fuera del círculo…») sigue siendo cierto y se queda.

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
          const labelOffset = currentNodeRadius + 7;
          const labelX = pos.x + ux * labelOffset;
          const labelY = pos.y + uy * labelOffset;
          // Cerca de arriba/abajo (ux pequeño) centrado; a los lados,
          // alineado para que el texto crezca hacia fuera del círculo, no
          // hacia dentro.
          const textAnchor = ux > 0.3 ? "start" : ux < -0.3 ? "end" : "middle";
```

Sustitúyelo por:

```tsx
          const labelOffset = currentNodeRadius + 7;
          // Fase 4 del rediseño (docs/rediseno-interfaz-diseno.md, 6.1): la
          // etiqueta va además girada en dirección radial. En la mitad
          // derecha se alinea al principio; en la izquierda se gira 180° más
          // y se alinea al final, para leerse de izquierda a derecha. Las
          // dos crecen hacia fuera del círculo. La pastilla de una región
          // marcada (markedLayout, arriba) usa la misma cuenta.
          const label = radialLabel(pos, ux, uy, labelOffset);
```

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
```

Sustitúyelo por:

```tsx
                <text
                  x={label.x}
                  y={label.y}
                  transform={labelTransform(label)}
                  textAnchor={label.anchor}
                  dominantBaseline="central"
```

La pastilla de una región marcada gira con su etiqueta (`MarkedLabel` ya acepta el `transform`: la lupa lo usa).

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
                <MarkedLabel
                  text={node.abbreviation}
                  x={label.x}
                  y={label.y}
                  anchor={label.anchor}
                  fontSize={fontSize}
                  fontWeight={fontWeight}
                  colors={colors}
                />
```

Sustitúyelo por:

```tsx
                <MarkedLabel
                  text={node.abbreviation}
                  x={label.x}
                  y={label.y}
                  anchor={label.anchor}
                  fontSize={fontSize}
                  fontWeight={fontWeight}
                  transform={labelTransform(label)}
                  colors={colors}
                />
```

En `frontend/src/logic/marks.ts`, busca:

```ts
// apunta hacia fuera, y alineada para que el texto crezca hacia fuera. Es la
// regla de las etiquetas del connectograma y de los hemisferios, que cada
// vista aplica con su dirección y su separación.
```

Sustitúyelo por:

```ts
// apunta hacia fuera, y alineada para que el texto crezca hacia fuera. Es la
// regla de las etiquetas de los hemisferios. Las del connectograma van
// además giradas en dirección radial desde la fase 4 del rediseño
// (radialLabel, en logic/connectogramLayout.ts).
```

- [ ] **Step 4: ver que pasan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/logic/connectogramLayout.test.ts src/components/connectogramGraphics.test.tsx src/components/marksViews.test.tsx src/logic/marks.test.ts 2>&1 | tail -6
```

Expected: PASS, las cuatro. Las dos nuevas suman 8 pruebas; `marksViews.test.tsx` y `marks.test.ts`, las de las marcas, siguen pasando.

- [ ] **Step 5: Comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 2>&1 | grep -E "^\s+Tests "
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx tsc -b && echo "tsc limpio"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run build 2>&1 | grep -E "built in|error"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && { git diff "$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt)" -- frontend/src ':!frontend/src/theme/themes.ts' ':!*.test.ts' ':!*.test.tsx' | grep -E '^\+'; git ls-files --others --exclude-standard -- frontend/src ':!*.test.ts' ':!*.test.tsx' | xargs -r cat; } | grep -oiE '#[0-9a-f]{3,8}\b|rgba?\(' ; echo "fin de la búsqueda"
```

Expected: BASE + 8 pruebas en verde; `tsc limpio`; `9 : warning` y ningún error; `✓ built in …`; y solo `fin de la búsqueda`.

- [ ] **Step 6: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git add frontend/src/logic/connectogramLayout.ts frontend/src/logic/connectogramLayout.test.ts frontend/src/components/connectogramGraphics.test.tsx frontend/src/components/Connectogram.tsx frontend/src/logic/marks.ts && git commit -m "Graficos: etiquetas radiales del connectograma, y las marcas las siguen

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

Con la línea `Co-Authored-By` del modelo que implementa.

### Task 2: halo de la región seleccionada

**Files:**
- Modify: `frontend/src/logic/connectogramLayout.ts` (al final)
- Modify: `frontend/src/logic/connectogramLayout.test.ts` (el import y al final)
- Modify: `frontend/src/components/connectogramGraphics.test.tsx` (al final)
- Modify: `frontend/src/components/Connectogram.tsx` (el import, el halo en el dibujo y en la lupa)

Las marcas no cambian: el anillo de una región marcada sigue donde estaba (5.9) y se dibuja encima del halo (desviación 4).

- [ ] **Step 1: las pruebas**

En `frontend/src/logic/connectogramLayout.test.ts`, busca:

```ts
import { labelTransform, radialLabel } from "./connectogramLayout";
```

Sustitúyelo por:

```ts
import {
  SELECTION_HALO_GAP,
  SELECTION_HALO_OPACITY,
  labelTransform,
  radialLabel,
  selectionHalo,
} from "./connectogramLayout";
import { markRing } from "./marks";
```

Al final de `frontend/src/logic/connectogramLayout.test.ts`, añade:

```ts
describe("halo de la región seleccionada", () => {
  it("es un anillo al 35 %, por fuera del contorno de 2,5 px y separado de él", () => {
    const halo = selectionHalo(6, 2.5);
    expect(SELECTION_HALO_OPACITY).toBe(0.35);
    expect(halo.radius - halo.strokeWidth / 2 - (6 + 2.5 / 2)).toBeCloseTo(SELECTION_HALO_GAP);
  });

  it("con una marca, el anillo de la marca no se mueve y deja ver el borde de fuera del halo", () => {
    const halo = selectionHalo(6, 2.5);
    const ring = markRing(6, 2.5);
    expect(ring.radius - ring.strokeWidth / 2).toBeGreaterThan(6 + 2.5 / 2);
    expect(ring.radius + ring.strokeWidth / 2).toBeLessThan(halo.radius + halo.strokeWidth / 2);
  });
});
```

Al final de `frontend/src/components/connectogramGraphics.test.tsx`, añade:

```tsx
describe("halo de la región seleccionada (6.1)", () => {
  const html = renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} />);
  const halos = [...html.matchAll(/<circle ([^>]*stroke-opacity="0.35"[^>]*)><\/circle>/g)].map((m) => attributes(m[1]));
  const ifja = nodeLabels(html).get("IFJa")!;
  const node = attributes(/<g transform="translate\([^)]*\)"><circle ([^>]*)><\/circle><\/g><text [^>]*>IFJa</.exec(html)![1]);

  it("solo la región seleccionada lo lleva: un anillo del color de selección al 35 %, que se exporta", () => {
    expect(halos).toHaveLength(1);
    const [halo] = halos;
    expect([Number(halo.cx), Number(halo.cy)]).toEqual([ifja.x, ifja.y]);
    expect(halo.fill).toBe("none");
    expect(halo.stroke).toBe(TOKENS.selected);
    expect(halo["data-ng-stroke"]).toBe("selected");
    expect(halo["data-ng-mark"]).toBeUndefined();
  });

  it("va por fuera del contorno de 2,5 px del nodo; el anillo de su marca, donde estaba y encima, deja ver su borde de fuera", () => {
    const [halo] = halos;
    expect(node["stroke-width"]).toBe("2.5");
    const nodeOuter = Number(node.r) + Number(node["stroke-width"]) / 2;
    expect(Number(halo.r) - Number(halo["stroke-width"]) / 2).toBeGreaterThan(nodeOuter);
    const ring = attributes(new RegExp(`<circle ([^>]*stroke="${TOKENS.mark}"[^>]*)></circle>`).exec(html)![1]);
    expect(Number(ring.cx)).toBe(ifja.x);
    expect(Number(ring.r) - Number(ring["stroke-width"]) / 2).toBeGreaterThan(nodeOuter);
    expect(Number(ring.r) + Number(ring["stroke-width"]) / 2).toBeLessThan(Number(halo.r) + Number(halo["stroke-width"]) / 2);
    expect(html.indexOf(`stroke="${TOKENS.mark}"`)).toBeGreaterThan(html.indexOf('stroke-opacity="0.35"'));
  });
});
```

- [ ] **Step 2: ver que fallan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/logic/connectogramLayout.test.ts src/components/connectogramGraphics.test.tsx 2>&1 | tail -15
```

Expected: FAIL. Las dos pruebas nuevas de la geometría (`selectionHalo is not a function`) y las dos del marcado (`expected [] to have a length of 1` y `Cannot read properties of undefined`). Las 8 de la Task 1 siguen pasando.

- [ ] **Step 3: el halo**

Al final de `frontend/src/logic/connectogramLayout.ts`, añade:

```ts
// Un anillo: el radio de su trazo, en el centro del trazo, y su grosor.
export interface Ring {
  radius: number;
  strokeWidth: number;
}

// Halo de una región seleccionada (6.1): un anillo del color de selección al
// 35 %, en todos los temas, por fuera de su contorno de 2,5 px y separado de
// él por un hueco, como en la maqueta. Si la región está marcada, el anillo
// de la marca (markRing, 5.9) no se mueve: va encima y tapa la parte de
// dentro del halo, y el borde de fuera del halo sigue viéndose.
export const SELECTION_HALO_GAP = 2;
export const SELECTION_HALO_WIDTH = 2;
export const SELECTION_HALO_OPACITY = 0.35;

export function selectionHalo(nodeRadius: number, nodeStrokeWidth: number): Ring {
  return {
    radius: nodeRadius + nodeStrokeWidth / 2 + SELECTION_HALO_GAP + SELECTION_HALO_WIDTH / 2,
    strokeWidth: SELECTION_HALO_WIDTH,
  };
}
```

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
import { labelTransform, radialLabel } from "../logic/connectogramLayout";
```

Sustitúyelo por:

```tsx
import { SELECTION_HALO_OPACITY, labelTransform, radialLabel, selectionHalo } from "../logic/connectogramLayout";
```

Dónde va el halo: la misma cuenta que el dibujo de los nodos, con la región seleccionada ampliada (radio + 3) y su contorno de 2,5 px.

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
  return (
    <div className="viz-panel">
    {!compact && (
```

Sustitúyelo por:

```tsx
  // Halo de las regiones seleccionadas (fase 4 del rediseño; spec 6.1): un
  // anillo del color de selección al 35 % por fuera de su contorno. Una
  // región seleccionada siempre se dibuja ampliada (radio + 3) y con el
  // contorno de 2,5 px, como en el dibujo de los nodos, más abajo.
  const halo = selectionHalo(nodeRadius + 3, 2.5);
  const haloCenters = [...selectedNodeIds].flatMap((id) => {
    const pos = positions.get(id);
    return pos ? [{ id, pos }] : [];
  });

  return (
    <div className="viz-panel">
    {!compact && (
```

Su dibujo, en un grupo tras el de los nodos y antes del de las marcas, que queda encima.

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
      </g>
      {/* Marcas (spec 5.9), encima de los nodos y de las etiquetas, para que
```

Sustitúyelo por:

```tsx
      </g>
      {/* Halo de las regiones seleccionadas (fase 4 del rediseño; spec 6.1),
          encima de los nodos vecinos, como en la maqueta, y debajo del anillo
          de una marca, que no se mueve. Es parte del dibujo: se exporta, con
          el color de selección de la exportación. */}
      {haloCenters.length > 0 && (
        <g style={{ pointerEvents: "none" }}>
          {haloCenters.map(({ id, pos }) => (
            <circle
              key={id}
              cx={pos.x}
              cy={pos.y}
              r={halo.radius}
              fill="none"
              stroke={colors.selected}
              {...ngStroke("selected")}
              strokeOpacity={SELECTION_HALO_OPACITY}
              strokeWidth={halo.strokeWidth}
            />
          ))}
        </g>
      )}
      {/* Marcas (spec 5.9), encima de los nodos y de las etiquetas, para que
```

En la lupa, la región seleccionada también lleva su halo, debajo del anillo de su marca.

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
          // Región marcada (spec 5.9): el anillo, con el hueco del color del
          // fondo, detrás del nodo, y la etiqueta sobre su pastilla, girada
          // con ella.
          const isMarked = markedIds.has(node.id);
```

Sustitúyelo por:

```tsx
          // Halo de una región seleccionada (fase 4 del rediseño; spec 6.1),
          // como en el dibujo principal: debajo del anillo de una marca.
          const lensHalo = selectionHalo(r, 2.5);
          // Región marcada (spec 5.9): el anillo, con el hueco del color del
          // fondo, detrás del nodo, y la etiqueta sobre su pastilla, girada
          // con ella.
          const isMarked = markedIds.has(node.id);
```

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
            <g key={node.id}>
              {isMarked && (
                <circle
                  {...MARK_ELEMENT}
```

Sustitúyelo por:

```tsx
            <g key={node.id}>
              {isSelected && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={lensHalo.radius}
                  fill="none"
                  stroke={colors.selected}
                  strokeOpacity={SELECTION_HALO_OPACITY}
                  strokeWidth={lensHalo.strokeWidth}
                />
              )}
              {isMarked && (
                <circle
                  {...MARK_ELEMENT}
```

- [ ] **Step 4: ver que pasan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/logic/connectogramLayout.test.ts src/components/connectogramGraphics.test.tsx src/components/marksViews.test.tsx 2>&1 | tail -6
```

Expected: PASS, las tres: 12 pruebas en las dos nuevas, y las de las marcas.

- [ ] **Step 5: Comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 2>&1 | grep -E "^\s+Tests "
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx tsc -b && echo "tsc limpio"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run build 2>&1 | grep -E "built in|error"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && { git diff "$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt)" -- frontend/src ':!frontend/src/theme/themes.ts' ':!*.test.ts' ':!*.test.tsx' | grep -E '^\+'; git ls-files --others --exclude-standard -- frontend/src ':!*.test.ts' ':!*.test.tsx' | xargs -r cat; } | grep -oiE '#[0-9a-f]{3,8}\b|rgba?\(' ; echo "fin de la búsqueda"
```

Expected: BASE + 12 pruebas; lo demás, como en la Task 1.

- [ ] **Step 6: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git add frontend/src/logic/connectogramLayout.ts frontend/src/logic/connectogramLayout.test.ts frontend/src/components/connectogramGraphics.test.tsx frontend/src/components/Connectogram.tsx && git commit -m "Graficos: halo de la region seleccionada en el connectograma

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 3: arcos de hemisferio

**Files:**
- Modify: `frontend/src/logic/connectogramLayout.ts` (al final)
- Modify: `frontend/src/logic/connectogramLayout.test.ts` (el import y al final)
- Modify: `frontend/src/components/connectogramGraphics.test.tsx` (al final)
- Modify: `frontend/src/components/Connectogram.tsx` (el import, los arcos y su dibujo)

- [ ] **Step 1: las pruebas**

Los ángulos de las pruebas salen de `d3.scalePoint` con la misma configuración que el componente, así que los arcos se prueban contra los ángulos de verdad de los nodos.

En `frontend/src/logic/connectogramLayout.test.ts`, busca:

```ts
import {
  SELECTION_HALO_GAP,
  SELECTION_HALO_OPACITY,
  labelTransform,
  radialLabel,
  selectionHalo,
} from "./connectogramLayout";
```

Sustitúyelo por:

```ts
import * as d3 from "d3";
import {
  HEMISPHERE_ARC_GAP,
  SELECTION_HALO_GAP,
  SELECTION_HALO_OPACITY,
  arcLabelSides,
  arcPath,
  hemisphereArcs,
  hemisphereBlocks,
  labelTransform,
  radialLabel,
  selectionHalo,
  type Hemisphere,
} from "./connectogramLayout";
```

Al final de `frontend/src/logic/connectogramLayout.test.ts`, añade:

```ts
// Los ángulos de pantalla de `count` nodos, como en components/Connectogram.tsx.
function screenAngles(count: number): { angleOf: (index: number) => number; step: number } {
  const scale = d3.scalePoint<number>().domain(d3.range(count)).range([0, 2 * Math.PI]).padding(0.5);
  return { angleOf: (index) => (scale(index) ?? 0) - Math.PI / 2, step: scale.step() };
}

const repeat = (hemisphere: Hemisphere, count: number): Hemisphere[] => Array.from({ length: count }, () => hemisphere);

describe("hemisphereBlocks", () => {
  it("un bloque seguido por hemisferio, como en HCP-MMP1.0 (primero el derecho)", () => {
    expect(hemisphereBlocks([...repeat("R", 180), ...repeat("L", 180)])).toEqual([
      { hemisphere: "R", first: 0, last: 179 },
      { hemisphere: "L", first: 180, last: 359 },
    ]);
  });

  it("el círculo se cierra: un bloque puede pasar por el principio del orden", () => {
    expect(hemisphereBlocks(["L", "R", "R", "L"])).toEqual([
      { hemisphere: "R", first: 1, last: 2 },
      { hemisphere: "L", first: 3, last: 0 },
    ]);
  });

  it("sin arcos si los hemisferios alternan, si alguno no tiene hemisferio o si solo hay uno", () => {
    expect(hemisphereBlocks(["R", "L", "R", "L"])).toBeNull();
    expect(hemisphereBlocks(["R", "R", null, "L"])).toBeNull();
    expect(hemisphereBlocks(["R", "R", "R"])).toBeNull();
    expect(hemisphereBlocks([])).toBeNull();
  });
});

describe("hemisphereArcs", () => {
  it("cada arco va del borde de su primer nodo al de su último, menos 4° a cada lado", () => {
    const { angleOf, step } = screenAngles(360);
    const arcs = hemisphereArcs(hemisphereBlocks([...repeat("R", 180), ...repeat("L", 180)])!, 360, angleOf, step);
    expect(arcs.map((arc) => arc.hemisphere)).toEqual(["R", "L"]);
    expect(arcs[0].start).toBeCloseTo(-Math.PI / 2 + HEMISPHERE_ARC_GAP);
    expect(arcs[0].end).toBeCloseTo(Math.PI / 2 - HEMISPHERE_ARC_GAP);
    expect(arcs[1].start).toBeCloseTo(Math.PI / 2 + HEMISPHERE_ARC_GAP);
    expect(arcs[1].end).toBeCloseTo((3 * Math.PI) / 2 - HEMISPHERE_ARC_GAP);
  });

  it("con un bloque que pasa por el principio, su arco también; y con uno muy corto, la separación se acorta", () => {
    const four = screenAngles(4);
    const [, left] = hemisphereArcs(hemisphereBlocks(["L", "R", "R", "L"])!, 4, four.angleOf, four.step);
    expect(left.end - left.start).toBeCloseTo(Math.PI - 2 * HEMISPHERE_ARC_GAP);
    const many = screenAngles(360);
    const [single] = hemisphereArcs([{ hemisphere: "R", first: 5, last: 5 }], 360, many.angleOf, many.step);
    expect(single.end - single.start).toBeCloseTo(many.step / 2);
  });
});

describe("arcPath", () => {
  it("dibuja el arco en el sentido de las agujas del reloj, con la bandera de arco grande cuando pasa de media vuelta", () => {
    expect(arcPath(100, 100, 50, -Math.PI / 2, Math.PI / 2)).toBe("M 100 50 A 50 50 0 0 1 100 150");
    expect(arcPath(100, 100, 50, 0, (3 * Math.PI) / 2)).toBe("M 150 100 A 50 50 0 1 1 100 50");
  });
});

describe("arcLabelSides", () => {
  const { angleOf, step } = screenAngles(360);
  const arcsOf = (hemispheres: Hemisphere[]) => hemisphereArcs(hemisphereBlocks(hemispheres)!, hemispheres.length, angleOf, step);

  it("cada rótulo va en la esquina del lado en que queda su arco", () => {
    const hcp = arcLabelSides(arcsOf([...repeat("R", 180), ...repeat("L", 180)]));
    expect([hcp.get("R"), hcp.get("L")]).toEqual(["right", "left"]);
    const reversed = arcLabelSides(arcsOf([...repeat("L", 180), ...repeat("R", 180)]));
    expect([reversed.get("L"), reversed.get("R")]).toEqual(["right", "left"]);
  });

  it("si los dos arcos quedan igual de centrados, el izquierdo a la izquierda", () => {
    const sides = arcLabelSides([
      { hemisphere: "R", start: -Math.PI / 2, end: Math.PI / 2 + Math.PI },
      { hemisphere: "L", start: Math.PI / 2 - 0.1, end: Math.PI / 2 + 0.1 },
    ]);
    expect([sides.get("L"), sides.get("R")]).toEqual(["left", "right"]);
  });
});
```

Al final de `frontend/src/components/connectogramGraphics.test.tsx`, añade:

```tsx
describe("arcos de hemisferio (6.1)", () => {
  const arcsOf = (html: string) =>
    [...html.matchAll(/<path d="M ([-\d.]+) ([-\d.]+) A [^"]* ([-\d.]+) ([-\d.]+)" ([^>]*)><\/path>/g)].map((m) => ({
      ends: [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])],
      attrs: attributes(m[5]),
    }));
  const titlesOf = (html: string) =>
    [...html.matchAll(/<text ([^>]*)>(IZQUIERDO|DERECHO)<\/text>/g)].map((m) => ({ text: m[2], attrs: attributes(m[1]) }));

  it("con cada hemisferio en un bloque seguido, dos arcos finos por fuera de las etiquetas, uno a cada lado", () => {
    const arcs = arcsOf(renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} />));
    expect(arcs).toHaveLength(2);
    for (const arc of arcs) {
      expect([arc.attrs.fill, arc.attrs.stroke, arc.attrs["data-ng-stroke"], arc.attrs["stroke-width"]]).toEqual(["none", TOKENS.edge, "edge", "1.5"]);
      const [x0, y0, x1, y1] = arc.ends;
      // A 34 px del anillo de los nodos, que en 420 px tiene radio 170.
      expect(Math.hypot(x0 - CENTER, y0 - CENTER)).toBeCloseTo(204, 1);
      expect(Math.hypot(x1 - CENTER, y1 - CENTER)).toBeCloseTo(204, 1);
      expect(Math.sign(x0 - CENTER)).toBe(Math.sign(x1 - CENTER));
    }
    expect(arcs.map((arc) => Math.sign(arc.ends[0] - CENTER)).sort()).toEqual([-1, 1]);
  });

  it("rotulados IZQUIERDO y DERECHO en las esquinas de arriba, cada uno del lado de su hemisferio, y se exportan", () => {
    const titles = titlesOf(renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} />));
    const byText = new Map(titles.map((title) => [title.text, title.attrs]));
    expect(titles).toHaveLength(2);
    expect(Number(byText.get("IZQUIERDO")!.x)).toBeLessThan(CENTER);
    expect(byText.get("IZQUIERDO")!["text-anchor"]).toBe("start");
    expect(Number(byText.get("DERECHO")!.x)).toBeGreaterThan(CENTER);
    expect(byText.get("DERECHO")!["text-anchor"]).toBe("end");
    for (const { attrs } of titles) expect([attrs.fill, attrs["data-ng-fill"]]).toEqual([TOKENS.label, "label"]);
  });

  it("en la miniatura, los arcos sin rótulos", () => {
    const html = renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} compact />);
    expect(arcsOf(html)).toHaveLength(2);
    expect(titlesOf(html)).toHaveLength(0);
  });

  it("no se dibujan si los hemisferios alternan, si alguna región no tiene hemisferio o si solo hay uno", () => {
    const alternating = [NODES[0], NODES[2], NODES[1], NODES[3]];
    const withoutSide = [...NODES.slice(0, 3), region("sub_tronco", "BS", null)];
    const oneSide = NODES.slice(0, 2);
    for (const nodes of [alternating, withoutSide, oneSide]) {
      const html = renderToStaticMarkup(<Connectogram nodes={nodes} connections={[]} />);
      expect(arcsOf(html)).toHaveLength(0);
      expect(titlesOf(html)).toHaveLength(0);
    }
  });
});
```

- [ ] **Step 2: ver que fallan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/logic/connectogramLayout.test.ts src/components/connectogramGraphics.test.tsx 2>&1 | tail -15
```

Expected: FAIL: las 8 pruebas nuevas de la geometría (`hemisphereBlocks is not a function` y parecidos) y 3 de las 4 nuevas del marcado (no hay arcos ni rótulos). La cuarta, «no se dibujan si…», ya pasa: hoy no se dibuja ninguno.

- [ ] **Step 3: los arcos**

Al final de `frontend/src/logic/connectogramLayout.ts`, añade:

```ts
// --- Arcos de hemisferio (6.1) ---

export type Hemisphere = "L" | "R";

export const HEMISPHERE_NAMES: Readonly<Record<Hemisphere, string>> = { L: "IZQUIERDO", R: "DERECHO" };

// Un hemisferio en el orden del círculo: de su nodo `first` a su nodo `last`,
// los dos incluidos. El círculo se cierra: si el bloque pasa por el principio
// del orden, `last` es menor que `first`.
export interface HemisphereBlock {
  hemisphere: Hemisphere;
  first: number;
  last: number;
}

// Los bloques de los dos hemisferios en el orden actual de los nodos, o null
// si no se dibujan arcos: algún nodo no tiene hemisferio, falta uno de los
// dos, o alguno no forma un único bloque seguido. El orden no se toca: solo se
// mira.
export function hemisphereBlocks(hemispheres: readonly (Hemisphere | null)[]): HemisphereBlock[] | null {
  const count = hemispheres.length;
  if (hemispheres.some((hemisphere) => hemisphere === null)) return null;
  // Dónde empieza cada bloque: donde cambia el hemisferio respecto al nodo
  // anterior, contando el paso del último al primero.
  const starts: number[] = [];
  for (let i = 0; i < count; i++) {
    if (hemispheres[i] !== hemispheres[(i - 1 + count) % count]) starts.push(i);
  }
  if (starts.length !== 2) return null;
  return starts.map((first, k) => ({
    hemisphere: hemispheres[first] as Hemisphere,
    first,
    last: (starts[1 - k] - 1 + count) % count,
  }));
}

// Separación entre los dos arcos, a cada lado de cada uno: 4°, como en la
// maqueta.
export const HEMISPHERE_ARC_GAP = (4 * Math.PI) / 180;
// Distancia de los arcos al anillo de los nodos, en píxeles: por fuera de las
// etiquetas de HCP-MMP1.0 en reposo, que acaban a unos 31 px (una larga y
// ampliada, seleccionada o con el ratón encima, llega a unos 40 y lo cruza),
// y dentro del margen de 40 px del dibujo.
export const HEMISPHERE_ARC_OFFSET = 34;
export const HEMISPHERE_ARC_WIDTH = 1.5;

// Ángulos de pantalla, en radianes, en el sentido de las agujas del reloj:
// los del dibujo de los nodos.
export interface HemisphereArc {
  hemisphere: Hemisphere;
  start: number;
  end: number;
}

// El arco de cada bloque va del borde de su primer nodo al de su último (medio
// paso antes y medio después), menos la separación a cada lado. `angleOf(i)`
// es el ángulo de pantalla del nodo i, y `step`, el paso entre dos nodos
// seguidos.
export function hemisphereArcs(
  blocks: readonly HemisphereBlock[],
  count: number,
  angleOf: (index: number) => number,
  step: number,
): HemisphereArc[] {
  return blocks.map(({ hemisphere, first, last }) => {
    const from = angleOf(first) - step / 2;
    const sweep = (((last - first + count) % count) + 1) * step;
    const gap = Math.min(HEMISPHERE_ARC_GAP, sweep / 4);
    return { hemisphere, start: from + gap, end: from + sweep - gap };
  });
}

const round2 = (value: number) => Math.round(value * 100) / 100;

// Trazado SVG del arco de la circunferencia de centro (cx, cy) y radio r que
// va de `start` a `end`, en el sentido de las agujas del reloj.
export function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const large = end - start > Math.PI ? 1 : 0;
  const point = (angle: number) => `${round2(cx + r * Math.cos(angle))} ${round2(cy + r * Math.sin(angle))}`;
  return `M ${point(start)} A ${round2(r)} ${round2(r)} 0 ${large} 1 ${point(end)}`;
}

// Esquina de arriba en la que va el rótulo de cada arco: la del lado en que
// queda el punto medio de su arco. Si los dos quedan a la misma distancia del
// centro, el izquierdo a la izquierda.
export function arcLabelSides(arcs: readonly HemisphereArc[]): Map<Hemisphere, "left" | "right"> {
  const middleX = (arc: HemisphereArc) => Math.cos((arc.start + arc.end) / 2);
  const [a, b] = arcs;
  const aRight = Math.abs(middleX(a) - middleX(b)) < 1e-9 ? a.hemisphere === "R" : middleX(a) > middleX(b);
  return new Map([
    [a.hemisphere, aRight ? "right" : "left"],
    [b.hemisphere, aRight ? "left" : "right"],
  ]);
}
```

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
import { SELECTION_HALO_OPACITY, labelTransform, radialLabel, selectionHalo } from "../logic/connectogramLayout";
```

Sustitúyelo por:

```tsx
import {
  HEMISPHERE_ARC_OFFSET,
  HEMISPHERE_ARC_WIDTH,
  HEMISPHERE_NAMES,
  SELECTION_HALO_OPACITY,
  arcLabelSides,
  arcPath,
  hemisphereArcs,
  hemisphereBlocks,
  labelTransform,
  radialLabel,
  selectionHalo,
} from "../logic/connectogramLayout";
```

Los arcos se calculan con los mismos ángulos que `positions` (`angleScale`), sin memoización manual: son unas cuentas por nodo, y una memoización nueva podría sumar un aviso de lint (Convenciones).

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
```

Sustitúyelo por:

```tsx
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Arcos de hemisferio (fase 4 del rediseño; spec 6.1): dos arcos finos por
  // fuera de las etiquetas, rotulados IZQUIERDO y DERECHO. Solo si, en el
  // orden actual, cada hemisferio forma un único bloque seguido y ningún nodo
  // tiene el hemisferio sin asignar; si no, no se dibujan. El orden de los
  // nodos no se toca, y los ángulos son los de `positions`.
  const blocks = hemisphereBlocks(nodes.map((node) => node.hemisphere));
  const arcs = blocks
    ? hemisphereArcs(blocks, nodes.length, (index) => (angleScale(nodes[index].id) ?? 0) - Math.PI / 2, angleScale.step())
    : [];
  const arcSides = arcs.length === 2 ? arcLabelSides(arcs) : null;
```

Su dibujo, debajo de todo, justo tras `<defs>`.

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
      </defs>
      <g>
        {visibleConnections.map((conn) => {
```

Sustitúyelo por:

```tsx
      </defs>
      {/* Arcos de hemisferio (fase 4 del rediseño; spec 6.1), debajo de todo.
          Sus rótulos van en las esquinas de arriba, cada uno del lado de su
          arco, y no se ven en la miniatura, como en la maqueta. Se
          exportan: son parte del dibujo. */}
      {arcs.length > 0 && (
        <g style={{ pointerEvents: "none" }}>
          {arcs.map((arc) => (
            <path
              key={arc.hemisphere}
              d={arcPath(center, center, radius + HEMISPHERE_ARC_OFFSET, arc.start, arc.end)}
              fill="none"
              stroke={colors.edge}
              {...ngStroke("edge")}
              strokeWidth={HEMISPHERE_ARC_WIDTH}
              strokeLinecap="round"
            />
          ))}
          {!compact &&
            arcSides &&
            arcs.map((arc) => {
              const right = arcSides.get(arc.hemisphere) === "right";
              return (
                <text
                  key={`${arc.hemisphere}-rotulo`}
                  x={right ? size - 10 : 10}
                  y={18}
                  textAnchor={right ? "end" : "start"}
                  fontSize={10}
                  fontWeight={600}
                  letterSpacing={1}
                  fill={colors.label}
                  {...ngFill("label")}
                >
                  {HEMISPHERE_NAMES[arc.hemisphere]}
                </text>
              );
            })}
        </g>
      )}
      <g>
        {visibleConnections.map((conn) => {
```

- [ ] **Step 4: ver que pasan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/logic/connectogramLayout.test.ts src/components/connectogramGraphics.test.tsx src/components/marksViews.test.tsx src/components/Connectogram.test.tsx 2>&1 | tail -6
```

Expected: PASS, las cuatro: 24 pruebas en las dos nuevas.

- [ ] **Step 5: Comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 2>&1 | grep -E "^\s+Tests "
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx tsc -b && echo "tsc limpio"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run build 2>&1 | grep -E "built in|error"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && { git diff "$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt)" -- frontend/src ':!frontend/src/theme/themes.ts' ':!*.test.ts' ':!*.test.tsx' | grep -E '^\+'; git ls-files --others --exclude-standard -- frontend/src ':!*.test.ts' ':!*.test.tsx' | xargs -r cat; } | grep -oiE '#[0-9a-f]{3,8}\b|rgba?\(' ; echo "fin de la búsqueda"
```

Expected: BASE + 24 pruebas; lo demás, como en la Task 1. Si lint sube de 9 avisos, no silencies el nuevo: sigue las Convenciones.

- [ ] **Step 6: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git add frontend/src/logic/connectogramLayout.ts frontend/src/logic/connectogramLayout.test.ts frontend/src/components/connectogramGraphics.test.tsx frontend/src/components/Connectogram.tsx && git commit -m "Graficos: arcos de hemisferio en el connectograma

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 4: leyenda del connectograma

**Files:**
- Create: `frontend/src/components/ConnectogramLegend.tsx`
- Modify: `frontend/src/components/Connectogram.tsx` (un import, la clase del hueco y la leyenda)
- Modify: `frontend/src/App.css` (las reglas de la leyenda, tras las de la lupa)
- Modify: `frontend/src/components/connectogramGraphics.test.tsx` (al final)

- [ ] **Step 1: la prueba de marcado**

Al final de `frontend/src/components/connectogramGraphics.test.tsx`, añade:

```tsx
describe("leyenda del connectograma (5.4)", () => {
  it("en la vista grande, fuera del <svg>, con sus cuatro entradas; la discontinua, con el discontinuo del tema", () => {
    const html = renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} />);
    const legend = /<ul class="connectogram-legend" aria-label="Leyenda del connectograma">(.*?)<\/ul>/.exec(html);
    expect(legend).not.toBeNull();
    expect(html.indexOf(legend![0])).toBeGreaterThan(html.indexOf("</svg>", html.indexOf('aria-label="Connectograma"')));
    const entries = [...legend![1].matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1]);
    expect(entries.map((entry) => entry.replace(/<svg .*?<\/svg>/, ""))).toEqual([
      "Evidencia no directa (indirecta o hipótesis)",
      "Evidencia directa",
      "Efectiva (con dirección)",
      "Color del punto = red",
    ]);
    for (const entry of entries) expect(entry).toMatch(/^<svg class="connectogram-legend__sample"[^>]*aria-hidden="true"/);
    expect(entries[0]).toContain(`stroke-dasharray="${TOKENS.dash}"`);
    expect(entries[1]).not.toContain("stroke-dasharray");
  });

  it("no está en la miniatura", () => {
    expect(renderToStaticMarkup(<Connectogram nodes={NODES} connections={[]} compact />)).not.toContain("connectogram-legend");
  });
});
```

- [ ] **Step 2: ver que falla**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/components/connectogramGraphics.test.tsx 2>&1 | tail -10
```

Expected: FAIL en «en la vista grande, fuera del <svg>…» (`expected null not to be null`). La de la miniatura ya pasa.

- [ ] **Step 3: la leyenda**

Crea `frontend/src/components/ConnectogramLegend.tsx`:

```tsx
// Leyenda del connectograma (docs/rediseno-interfaz-diseno.md, 5.4; fase 4
// del rediseño): lo que dicen las líneas (discontinua, continua y con
// flecha) y el color de los puntos, la codificación del principio 1 del
// spec. Va fija abajo a la izquierda de la vista grande, encima del dibujo y
// fuera del <svg>, así que no se exporta. Sin eventos (App.css): el ratón
// sigue llegando al dibujo de debajo, también con la lupa. Las muestras son
// del color del texto, y la discontinua lleva el discontinuo del tema (token
// dash), el de las líneas del dibujo.
import type { ReactNode } from "react";

function Sample({ children }: { children: ReactNode }) {
  return (
    <svg
      className="connectogram-legend__sample"
      width="26"
      height="8"
      viewBox="0 0 26 8"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function ConnectogramLegend({ dash }: { dash: string }) {
  return (
    <ul className="connectogram-legend" aria-label="Leyenda del connectograma">
      <li>
        <Sample>
          <path d="M1 4H25" strokeDasharray={dash} />
        </Sample>
        Evidencia no directa (indirecta o hipótesis)
      </li>
      <li>
        <Sample>
          <path d="M1 4H25" />
        </Sample>
        Evidencia directa
      </li>
      <li>
        <Sample>
          <path d="M1 4H22 M18 1l4 3-4 3" />
        </Sample>
        Efectiva (con dirección)
      </li>
      <li>
        <Sample>
          <circle cx="4" cy="4" r="2.5" />
          <path d="M8 4H25" />
        </Sample>
        Color del punto = red
      </li>
    </ul>
  );
}
```

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
import { Icon } from "./Icon";
```

Sustitúyelo por:

```tsx
import { ConnectogramLegend } from "./ConnectogramLegend";
import { Icon } from "./Icon";
```

El hueco del dibujo lleva una clase más, que lo hace `position: relative` (App.css). La leyenda va en él, tras el `<svg>`: con `position: absolute`, no cuenta para lo que mide el `ResizeObserver` del desarrollador principal.

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
    <div ref={containerRef} className="viz-panel__area">
```

Sustitúyelo por:

```tsx
    <div ref={containerRef} className="viz-panel__area connectogram-area">
```

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
    </svg>
    </div>
    {!compact && <div className="connectogram-readout">{readout}</div>}
```

Sustitúyelo por:

```tsx
    </svg>
    {/* Leyenda (fase 4 del rediseño; spec 5.4): fuera del <svg>, así que no
        se exporta. Solo en la vista grande. */}
    {!compact && <ConnectogramLegend dash={colors.dash} />}
    </div>
    {!compact && <div className="connectogram-readout">{readout}</div>}
```

En `frontend/src/App.css`, busca:

```css
.connectogram-lens__label { paint-order: stroke; stroke: var(--panel-bg); stroke-width: 3px; stroke-linejoin: round; }
```

Sustitúyelo por:

```css
.connectogram-lens__label { paint-order: stroke; stroke: var(--panel-bg); stroke-width: 3px; stroke-linejoin: round; }

/* Leyenda del connectograma (spec 5.4; fase 4 del rediseño): fija abajo a
   la izquierda del dibujo, encima de él y fuera del <svg>, así que no se
   exporta. Sin eventos, así que el ratón sigue llegando a los nodos de
   debajo, también con la lupa, y sin selección de texto al arrastrar, como
   los dibujos (5.9). Su fondo es el del panel, algo translúcido, como en la
   maqueta, si el navegador tiene color-mix(); si no, opaco. Muestras del
   color del texto. */
.connectogram-area { position: relative; }
.connectogram-legend { position: absolute; left: 12px; bottom: 12px; display: flex; flex-direction: column; gap: 3px; max-width: 13rem; margin: 0; padding: 7px 10px; list-style: none; border: 1px solid var(--border); border-radius: 10px; background: var(--panel-bg); color: var(--text-muted); font-size: 0.7rem; line-height: 1.3; text-align: left; pointer-events: none; -webkit-user-select: none; user-select: none; }
@supports (color: color-mix(in srgb, currentColor 50%, transparent)) {
  .connectogram-legend { background: color-mix(in srgb, var(--panel-bg) 84%, transparent); }
}
.connectogram-legend li { display: flex; align-items: center; gap: 8px; }
.connectogram-legend__sample { flex: 0 0 auto; color: var(--text); fill: currentColor; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.connectogram-legend__sample path { fill: none; }
```

- [ ] **Step 4: ver que pasa**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/components/connectogramGraphics.test.tsx src/components/Connectogram.test.tsx src/components/marksViews.test.tsx 2>&1 | tail -6
```

Expected: PASS, las tres: 12 pruebas en `connectogramGraphics.test.tsx`.

- [ ] **Step 5: Comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 2>&1 | grep -E "^\s+Tests "
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx tsc -b && echo "tsc limpio"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run build 2>&1 | grep -E "built in|error"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && { git diff "$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt)" -- frontend/src ':!frontend/src/theme/themes.ts' ':!*.test.ts' ':!*.test.tsx' | grep -E '^\+'; git ls-files --others --exclude-standard -- frontend/src ':!*.test.ts' ':!*.test.tsx' | xargs -r cat; } | grep -oiE '#[0-9a-f]{3,8}\b|rgba?\(' ; echo "fin de la búsqueda"
```

Expected: BASE + 26 pruebas; lo demás, como en la Task 1.

- [ ] **Step 6: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git add frontend/src/components/ConnectogramLegend.tsx frontend/src/components/Connectogram.tsx frontend/src/App.css frontend/src/components/connectogramGraphics.test.tsx && git commit -m "Graficos: leyenda del connectograma

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Revisión de la tanda 1 (Tasks 1 a 4)

La hace quien coordina, con dos revisores en paralelo (subagentes nuevos, sin el historial de la sesión). Cada uno recibe el diff de la tanda (`git diff "$(cat …/fase4-base.txt)"..HEAD`), este plan y las secciones 5.4, 5.9, 6.1, 4.2, 4.4, 8 y 12 del spec, más la maqueta (`Connectograma.dc.html`, solo de lectura).

Los revisores solo leen: no abren navegadores ni servidores (la app real se prueba en las Tasks 8 y 9), y no ejecutan pruebas, `tsc`, lint ni la compilación, porque dos a la vez cargarían la máquina. Si necesitan una prueba concreta, se la piden a quien coordina, que la pasa, una cada vez.

- [ ] **Revisor A: geometría, marcas y exportación**
  - Las etiquetas frente a 6.1: por fuera, radiales, giradas, la mitad izquierda girada 180° y alineada al final; la regla de tamaño, la de siempre; la lupa, sin cambios.
  - Que la pastilla de una región marcada siga a su etiqueta en todos los casos (ampliada, en las dos mitades, arriba y abajo), y que la prueba de marcado lo ate de verdad.
  - El halo frente a 6.1 y la maqueta, en el dibujo y en la lupa, y con una marca (desviaciones 3 y 4): el anillo de la marca, donde estaba y encima del halo, sin tocar la etiqueta ni su pastilla. Que las marcas no cambien.
  - Los arcos: la regla de cuándo (bloques seguidos con el círculo cerrado, sin nulos, los dos hemisferios), sus ángulos frente a los de `positions`, su radio frente a las etiquetas en reposo y ampliadas y al margen de 40 px, y el lado de los rótulos (desviación 5).
  - Que las líneas, los nodos, sus colores, sus posiciones y su orden no cambien (principio 1 y 6.1): el diff no los toca.
  - La exportación: `data-ng-stroke="selected"` en el halo, `edge` en los arcos, `label` en los rótulos, y nada de las marcas ni de la leyenda en el clon (4.4 y 5.9).
- [ ] **Revisor B: leyenda, aspecto y código**
  - La leyenda frente a 5.4 y la maqueta: las cuatro entradas con su texto exacto, sus muestras (el `dash` del tema en la discontinua), fuera del `<svg>`, solo en la vista grande, sin eventos.
  - El contraste (spec 8), calculado con `index.css`: el texto de la leyenda (`--text-muted`) sobre el panel al 84 % compuesto sobre el panel del dibujo, al menos 4,5:1; las muestras (`--text`), al menos 3:1; y los arcos (`edge`) sobre el panel, al menos 3:1. Letra de 0,7rem.
  - Lo que tapa la leyenda (desviación 6): se calcula con las medidas de D4 (a 1400 × 900, el `<svg>` mide 666 px en un hueco de 776); no se corrige aquí, es una pregunta para el usuario.
  - Sin colores fijos; los comentarios del desarrollador principal, intactos salvo el que describe el texto recto, que se sustituye; comentarios nuevos en castellano y con «el usuario».
  - Que las pruebas comprueben lo que dicen y no puedan pasar con un dibujo mal hecho; lint en la línea base.
- [ ] **Arreglos:** una ronda, en un commit `Graficos: correcciones de la revision de la tanda 1`. Si alguno añade pruebas, las cuentas de las tareas siguientes suben lo mismo. Solo se vuelve a revisar lo que salió «importante».

---

## Chunk 2: cerebro 3D (tanda 2)

### Task 5: surcos más visibles

**Files:**
- Modify: `frontend/src/logic/surfaceParcels.ts` (`sulcRange` y una línea de `fillVertexColorsByIndex`)
- Create: `frontend/src/logic/sulcShading.test.ts`

`surfaceParcels.test.ts`, del desarrollador principal, no se toca: sus pruebas siguen pasando con los percentiles, porque sus vectores de dos valores quedan recortados a los mismos extremos. Las nuevas van en un archivo aparte.

- [ ] **Step 1: la prueba, sobre un vector conocido (spec 10)**

Crea `frontend/src/logic/sulcShading.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  SULC_PERCENTILES,
  fillVertexColorsByIndex,
  percentile,
  sulcRange,
  sulcShade,
  type CortexGrays,
} from "./surfaceParcels";

// Surcos más visibles (docs/rediseno-interfaz-diseno.md, 6.3 y 10): los
// percentiles 5 y 95 y el suavizado, sobre un vector conocido. La rampa
// 0, 1, …, 100 tiene sus percentiles 5 y 95 en 5 y 95.
const ramp = (count: number) => Float32Array.from({ length: count }, (_, i) => i);

describe("percentile", () => {
  it("interpola entre los dos valores más cercanos, como numpy", () => {
    expect(percentile([0, 10], 5)).toBeCloseTo(0.5);
    expect(percentile([0, 10], 95)).toBeCloseTo(9.5);
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([7], 95)).toBe(7);
  });
});

describe("sulcRange", () => {
  it("son los percentiles 5 y 95 del archivo, no su mínimo y su máximo", () => {
    expect(SULC_PERCENTILES).toEqual([5, 95]);
    expect(sulcRange(ramp(101))).toEqual([5, 95]);
  });

  it("no cuenta los vértices sin dato, y sin un rango de verdad devuelve null", () => {
    expect(sulcRange(Float32Array.from([Number.NaN, ...ramp(101), Number.NaN]))).toEqual([5, 95]);
    expect(sulcRange(Float32Array.from([2, 2, 2]))).toBeNull();
    expect(sulcRange(Float32Array.from([Number.NaN]))).toBeNull();
    expect(sulcRange(null)).toBeNull();
  });

  it("se calcula una vez por archivo de surcos", () => {
    const sulc = ramp(101);
    const first = sulcRange(sulc);
    expect(sulcRange(sulc)).toBe(first);
    expect(sulcRange(ramp(101))).not.toBe(first);
  });
});

describe("sulcShade", () => {
  it("recorta a 0-1 y suaviza con smoothstep", () => {
    expect(sulcShade(-0.5)).toBe(0);
    expect(sulcShade(0)).toBe(0);
    expect(sulcShade(0.25)).toBeCloseTo(0.15625);
    expect(sulcShade(0.5)).toBe(0.5);
    expect(sulcShade(1)).toBe(1);
    expect(sulcShade(1.5)).toBe(1);
  });
});

describe("fillVertexColorsByIndex, con los percentiles y el suavizado", () => {
  const grays: CortexGrays = {
    sulcus: [0, 0, 0],
    gyrus: [1, 1, 1],
    noData: [0.4, 0.4, 0.4],
    medialWall: [0.2, 0.2, 0.2],
  };
  // Todos los vértices en la categoría 0, en gris, salvo el 50, que está en
  // la 1 y tiene color.
  const vertexIndex = new Int32Array(101);
  vertexIndex[50] = 1;
  const out = new Float32Array(101 * 3);
  fillVertexColorsByIndex(out, vertexIndex, 2, ramp(101), (category) => (category === 1 ? [1, 0.5, 0] : null), grays);

  it("por debajo del percentil 5, el gris del surco; por encima del 95, el del giro; entre ellos, suavizado", () => {
    expect(out[4 * 3]).toBe(0);
    expect(out[5 * 3]).toBe(0);
    expect(out[95 * 3]).toBe(1);
    expect(out[100 * 3]).toBe(1);
    // 20 queda a 1/6 del rango: el smoothstep da 2/27, más oscuro que el 0,2 de antes.
    expect(out[20 * 3]).toBeCloseTo(2 / 27, 6);
  });

  it("el color de una región se oscurece en los surcos con el mismo valor suavizado", () => {
    // 50 queda en medio: 0,7 + 0,3 × 0,5.
    const colored = Array.from(out.slice(50 * 3, 50 * 3 + 3));
    [0.85, 0.425, 0].forEach((value, i) => expect(colored[i]).toBeCloseTo(value, 5));
  });
});
```

- [ ] **Step 2: ver que falla**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/logic/sulcShading.test.ts 2>&1 | tail -15
```

Expected: FAIL en 6 de las 7: `percentile` y `sulcShade` no existen, y `sulcRange` da el mínimo y el máximo (`[0, 100]`), cada vez un array nuevo. Pasa ya «el color de una región…»: en la rampa, el 50 queda en medio con las dos cuentas.

- [ ] **Step 3: los percentiles y el suavizado**

En `frontend/src/logic/surfaceParcels.ts`, busca:

```ts
export function sulcRange(sulc: Float32Array | null): [number, number] | null {
  if (!sulc) return null;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const v of sulc) {
    if (Number.isNaN(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return Number.isFinite(min) && max > min ? [min, max] : null;
}
```

Sustitúyelo por:

```ts
// Surcos más visibles (docs/rediseno-interfaz-diseno.md, 6.3; fase 4 del
// rediseño). El degradado surco -> giro va de los percentiles 5 y 95 del
// archivo, no de su mínimo y su máximo: unos pocos vértices extremos
// estiraban el rango y casi toda la corteza quedaba en grises medios. En el
// archivo del HCP, el rango pasa de -1,69 a 1,16 a de -0,85 a 0,56.
export const SULC_PERCENTILES: readonly [number, number] = [5, 95];

// Percentil p (de 0 a 100) de unos valores ya ordenados, interpolando entre
// los dos más cercanos (el método por defecto de numpy).
export function percentile(sorted: ArrayLike<number>, p: number): number {
  const position = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, sorted.length - 1);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

// Los percentiles se calculan una vez por archivo de surcos: se guardan con
// el propio vector, que es el mismo mientras no se cargue otro archivo.
const sulcRangeCache = new WeakMap<Float32Array, [number, number] | null>();

export function sulcRange(sulc: Float32Array | null): [number, number] | null {
  if (!sulc) return null;
  const cached = sulcRangeCache.get(sulc);
  if (cached !== undefined) return cached;
  const values = sulc.filter((v) => !Number.isNaN(v)).sort();
  const low = values.length > 0 ? percentile(values, SULC_PERCENTILES[0]) : Number.NaN;
  const high = values.length > 0 ? percentile(values, SULC_PERCENTILES[1]) : Number.NaN;
  const range: [number, number] | null = high > low ? [low, high] : null;
  sulcRangeCache.set(sulc, range);
  return range;
}

// Suavizado del valor normalizado del surco (6.3): se recorta a 0-1, porque
// fuera de los percentiles quedan valores por debajo de 0 y por encima de 1,
// y pasa por un smoothstep, que lleva más vértices hacia el gris del surco y
// el del giro sin saltos.
export function sulcShade(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}
```

En la misma función que pinta, el valor normalizado pasa por el suavizado.

En `frontend/src/logic/surfaceParcels.ts`, busca:

```ts
    const t = range && !Number.isNaN(s) ? (s - range[0]) / (range[1] - range[0]) : null;
```

Sustitúyelo por:

```ts
    const t = range && !Number.isNaN(s) ? sulcShade((s - range[0]) / (range[1] - range[0])) : null;
```
- [ ] **Step 4: ver que pasan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/logic/sulcShading.test.ts src/logic/surfaceParcels.test.ts 2>&1 | tail -6
```

Expected: PASS, los dos: las 7 nuevas y las 17 de siempre.

- [ ] **Step 5: Comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 2>&1 | grep -E "^\s+Tests "
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx tsc -b && echo "tsc limpio"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run build 2>&1 | grep -E "built in|error"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && { git diff "$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt)" -- frontend/src ':!frontend/src/theme/themes.ts' ':!*.test.ts' ':!*.test.tsx' | grep -E '^\+'; git ls-files --others --exclude-standard -- frontend/src ':!*.test.ts' ':!*.test.tsx' | xargs -r cat; } | grep -oiE '#[0-9a-f]{3,8}\b|rgba?\(' ; echo "fin de la búsqueda"
```

Expected: BASE + 33 pruebas; lo demás, como en la Task 1.

- [ ] **Step 6: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git add frontend/src/logic/surfaceParcels.ts frontend/src/logic/sulcShading.test.ts && git commit -m "Graficos: surcos mas visibles en el cerebro 3D

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 6: colores de las etiquetas del 3D

**Files:**
- Modify: `frontend/src/theme/themes.ts` (dos tokens en `DrawTokens` y sus valores en los cuatro temas)
- Modify: `frontend/src/theme/themeCss.test.ts` (al final)

Los valores son los de la desviación 8: el `--text` de cada tema y su `sceneBg` con transparencia. Las pruebas de `colors.test.ts` que recorren todos los tokens (la exportación del 3D y la de los SVG dan los mismos colores) los cubren sin cambios.

- [ ] **Step 1: la prueba**

Al final de `frontend/src/theme/themeCss.test.ts`, añade:

```ts
// Etiquetas del cerebro 3D (spec 6.3; fase 4 del rediseño): el texto del
// tema sobre el fondo de la escena, translúcido. Detrás puede quedar
// cualquier cosa (la corteza, una red, el fondo): el texto se lee con al
// menos 4,5:1 con el fondo compuesto sobre negro y sobre blanco, los dos
// extremos.
describe("etiquetas del cerebro 3D", () => {
  it.each(THEME_IDS)("tema %s: el texto del tema sobre el fondo de la escena translúcido, legible con cualquier cosa detrás", (id) => {
    const vars = variables(THEME_BLOCKS.get(id)!.body);
    const { label3dText, label3dBackground, sceneBg } = DRAW_TOKENS[id];
    expect(label3dText).toBe(vars.get("--text"));
    const background = parseColor(label3dBackground);
    expect(background.rgb).toEqual(parseColor(sceneBg).rgb);
    expect(background.alpha).toBeGreaterThanOrEqual(0.8);
    expect(background.alpha).toBeLessThan(1);
    for (const behind of [
      [0, 0, 0],
      [255, 255, 255],
    ] as const) {
      expect(contrast(parseColor(label3dText).rgb, over(label3dBackground, behind)), `detrás ${behind}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
```

- [ ] **Step 2: ver que falla**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/theme/themeCss.test.ts 2>&1 | tail -10
```

Expected: FAIL en las 4 nuevas (`expected undefined to be '#c7c5d0'` y parecidos).

- [ ] **Step 3: los tokens**

En `frontend/src/theme/themes.ts`, busca:

```ts
  mark: string;
  markText: string;
}
```

Sustitúyelo por:

```ts
  mark: string;
  markText: string;
  // Etiquetas del cerebro 3D (docs/rediseno-interfaz-diseno.md, 6.3; fase 4
  // del rediseño): el texto del tema, el --text de index.css, sobre un fondo
  // translúcido, el de la escena con algo de transparencia, como en la
  // maqueta. theme/themeCss.test.ts comprueba las dos cosas y que el texto
  // supera 4,5:1 con cualquier cosa detrás. Al exportar, las de la paleta de
  // exportación, como los demás tokens.
  label3dText: string;
  label3dBackground: string;
}
```

En `frontend/src/theme/themes.ts`, busca:

```ts
    cortexNoData: gray(0.55),
    mark: "#2563eb",
    markText: "#ffffff",
  },
```

Sustitúyelo por:

```ts
    cortexNoData: gray(0.55),
    mark: "#2563eb",
    markText: "#ffffff",
    label3dText: "#c7c5d0",
    label3dBackground: "rgba(29, 30, 38, 0.84)",
  },
```

En `frontend/src/theme/themes.ts`, busca:

```ts
    cortexNoData: hexToSrgb("#7d838c"),
    mark: "#2563eb",
    markText: "#ffffff",
  },
```

Sustitúyelo por:

```ts
    cortexNoData: hexToSrgb("#7d838c"),
    mark: "#2563eb",
    markText: "#ffffff",
    label3dText: "#c9ced6",
    label3dBackground: "rgba(22, 25, 30, 0.84)",
  },
```

En `frontend/src/theme/themes.ts`, busca:

```ts
    cortexNoData: hexToSrgb("#7a8396"),
    mark: "#2563eb",
    markText: "#ffffff",
  },
```

Sustitúyelo por:

```ts
    cortexNoData: hexToSrgb("#7a8396"),
    mark: "#2563eb",
    markText: "#ffffff",
    label3dText: "#cbd5e6",
    label3dBackground: "rgba(17, 23, 38, 0.84)",
  },
```

En `frontend/src/theme/themes.ts`, busca:

```ts
    cortexNoData: hexToSrgb("#b9bdc4"),
    mark: "#1d4ed8",
    markText: "#ffffff",
  },
```

Sustitúyelo por:

```ts
    cortexNoData: hexToSrgb("#b9bdc4"),
    mark: "#1d4ed8",
    markText: "#ffffff",
    label3dText: "#3a3d43",
    label3dBackground: "rgba(255, 255, 255, 0.88)",
  },
```
- [ ] **Step 4: ver que pasan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/theme/ 2>&1 | tail -6
```

Expected: PASS, los cuatro archivos de `theme/`.

- [ ] **Step 5: Comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 2>&1 | grep -E "^\s+Tests "
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx tsc -b && echo "tsc limpio"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run build 2>&1 | grep -E "built in|error"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && { git diff "$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt)" -- frontend/src ':!frontend/src/theme/themes.ts' ':!*.test.ts' ':!*.test.tsx' | grep -E '^\+'; git ls-files --others --exclude-standard -- frontend/src ':!*.test.ts' ':!*.test.tsx' | xargs -r cat; } | grep -oiE '#[0-9a-f]{3,8}\b|rgba?\(' ; echo "fin de la búsqueda"
```

Expected: BASE + 37 pruebas; lo demás, como en la Task 1. Los colores nuevos están en `themes.ts`, que la búsqueda deja fuera: es la tabla de tokens.

- [ ] **Step 6: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git add frontend/src/theme/themes.ts frontend/src/theme/themeCss.test.ts && git commit -m "Graficos: colores de las etiquetas del cerebro 3D

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 7: etiquetas del 3D con la tipografía nueva, sobre su pastilla, y su caché

**Files:**
- Modify: `frontend/src/logic/textSprite.ts` (cabecera, y de la caché a `getLabelTexture`)
- Create: `frontend/src/state/labelFont.ts`
- Create: `frontend/src/state/labelFont.test.ts`
- Modify: `frontend/src/logic/textSprite.test.ts` (se sustituye entero)
- Modify: `frontend/src/components/Brain3D.tsx` (imports, `NodeLabel`, `MarkLook`, su llamada y la petición de la fuente)
- Modify: `frontend/src/components/Brain3D.marksWiring.test.ts` (dos pruebas que fijaban las líneas que cambian)
- Create: `frontend/src/components/Brain3D.labelsWiring.test.ts`

La oclusión, los marcadores, el anillo de las marcas y la captura no cambian. `buildTexture`, del desarrollador principal, conserva su forma y sus comentarios (medir antes de dimensionar, volver a fijar la fuente, el respaldo sin contexto), pero dibuja la pastilla que antes dibujaba `buildPillTexture`, que desaparece: el contorno blanco y el texto casi negro, iguales en todos los temas, pasan a ser el texto del tema sobre su pastilla (spec 6.3). Su comentario sobre el contorno blanco se sustituye por uno que lo explica. `LabelPill` pasa a llamarse `LabelStyle`, porque ya no es solo de las marcas.

Dos pruebas de las marcas fijaban las líneas que cambian: la etiqueta de siempre llevaba la curva de tono y la clave solo con la pastilla. Se actualizan, y lo dicen en su comentario.

- [ ] **Step 1: las pruebas**

Sustituye el contenido entero de `frontend/src/logic/textSprite.test.ts` por:

```ts
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getLabelTexture, getMarkRingTexture, labelTextureKey, markRingTextureKey } from "./textSprite";

// Estilos de etiqueta: la de siempre en Grafito (texto del tema sobre su
// fondo translúcido) y la de una región marcada (docs/rediseno-interfaz-diseno.md, 5.9 y 6.3).
const GRAFITO = { background: "rgba(22, 25, 30, 0.84)", color: "#c9ced6" };
const PILL = { background: "#2563eb", color: "#ffffff" };

// Las texturas se guardan en caché (logic/textSprite.ts), por su texto, sus
// dos colores y la versión de fuentes (fase 4 del rediseño, spec 6.3).
describe("claves de la caché de texturas", () => {
  it("cambian con el texto, con cada color y con la versión de fuentes", () => {
    const key = labelTextureKey("V1", GRAFITO, 0);
    expect(labelTextureKey("V1", { ...GRAFITO }, 0)).toBe(key);
    expect(labelTextureKey("V2", GRAFITO, 0)).not.toBe(key);
    expect(labelTextureKey("V1", { ...GRAFITO, background: "rgba(255, 255, 255, 0.88)" }, 0)).not.toBe(key);
    expect(labelTextureKey("V1", { ...GRAFITO, color: "#3a3d43" }, 0)).not.toBe(key);
    expect(labelTextureKey("V1", GRAFITO, 1)).not.toBe(key);
    expect(labelTextureKey("V1", PILL, 0)).not.toBe(key);
  });

  it("el anillo de las marcas, por el color del hueco y el del anillo", () => {
    expect(markRingTextureKey("#16191e", "#2563eb")).not.toBe(markRingTextureKey("#ffffff", "#2563eb"));
    expect(markRingTextureKey("#16191e", "#2563eb")).not.toBe(markRingTextureKey("#16191e", "#1d4ed8"));
  });
});

// Que las texturas se guardan de verdad con esas claves. En node no hay DOM:
// un <canvas> sin contexto 2D basta, porque sin él textSprite crea igual la
// textura, vacía, y la guarda.
describe("caché de texturas", () => {
  beforeAll(() => {
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => null }) });
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("la misma etiqueta es la misma textura; con otro tema, otra", () => {
    const label = getLabelTexture("V1", GRAFITO, 0);
    expect(getLabelTexture("V1", { ...GRAFITO }, 0)).toBe(label);
    expect(getLabelTexture("V1", { ...GRAFITO, color: "#3a3d43" }, 0)).not.toBe(label);
    expect(getLabelTexture("V1", PILL, 0)).not.toBe(label);
    expect(getLabelTexture("V1", { ...PILL, background: "#1d4ed8" }, 0)).not.toBe(getLabelTexture("V1", PILL, 0));
  });

  it("el anillo es otra textura con otro color de hueco o de anillo, y la misma con los mismos", () => {
    const ring = getMarkRingTexture("#16191e", "#2563eb");
    expect(getMarkRingTexture("#16191e", "#2563eb")).toBe(ring);
    expect(getMarkRingTexture("#ffffff", "#2563eb")).not.toBe(ring);
    expect(getMarkRingTexture("#16191e", "#1d4ed8")).not.toBe(ring);
  });

  // Va la última: sube la versión de fuentes de la caché.
  it("cuando sube la versión de fuentes, las etiquetas se vuelven a dibujar y las de antes se liberan", () => {
    const before = getLabelTexture("V1", GRAFITO, 0);
    const disposed = vi.fn();
    before.texture.addEventListener("dispose", disposed);
    const after = getLabelTexture("V1", GRAFITO, 1);
    expect(after).not.toBe(before);
    expect(disposed).toHaveBeenCalledTimes(1);
    expect(getLabelTexture("V1", GRAFITO, 1)).toBe(after);
  });
});
```

Crea `frontend/src/state/labelFont.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { LABEL_FONT } from "../logic/textSprite";
import { requestLabelFont, useLabelFontStore } from "./labelFont";

// Versión de fuentes de las etiquetas del 3D (docs/rediseno-interfaz-diseno.md, 6.3).
describe("requestLabelFont", () => {
  it("pide la fuente de las etiquetas y, cuando llega, sube la versión", async () => {
    const before = useLabelFontStore.getState().version;
    const fonts = { load: vi.fn(() => Promise.resolve([])) };
    await requestLabelFont(fonts);
    expect(fonts.load).toHaveBeenCalledWith(LABEL_FONT);
    expect(useLabelFontStore.getState().version).toBe(before + 1);
  });

  it("la pide una sola vez", async () => {
    const fonts = { load: vi.fn(() => Promise.resolve([])) };
    await requestLabelFont(fonts);
    const after = useLabelFontStore.getState().version;
    await requestLabelFont(fonts);
    expect(fonts.load).toHaveBeenCalledTimes(1);
    expect(useLabelFontStore.getState().version).toBe(after);
  });

  it("si no llega, o no hay document.fonts, la versión no cambia y no hay error", async () => {
    const before = useLabelFontStore.getState().version;
    await requestLabelFont({ load: () => Promise.reject(new Error("sin red")) });
    await requestLabelFont(undefined);
    expect(useLabelFontStore.getState().version).toBe(before);
  });
});

describe("tipografía de las etiquetas", () => {
  it("es la de la interfaz, con la de respaldo del sistema", () => {
    expect(LABEL_FONT).toBe("600 44px 'Atkinson Hyperlegible Next', system-ui, sans-serif");
  });
});
```

Crea `frontend/src/components/Brain3D.labelsWiring.test.ts`:

```ts
import { describe, expect, it } from "vitest";

// Cómo se conectan las etiquetas del cerebro 3D de la fase 4 del rediseño
// (docs/rediseno-interfaz-diseno.md, 6.3). La textura, su caché y la versión
// de fuentes se prueban en logic/textSprite.test.ts y
// state/labelFont.test.ts; los colores, en theme/themeCss.test.ts. Esto
// guarda las líneas de Brain3D.tsx que los conectan:
// - la etiqueta toma sus colores de `colors`, que mientras se captura el JPEG
//   son los de la paleta de exportación;
// - su textura depende de la versión de fuentes, que Brain3D pide al montar.
//
// Lee Brain3D.tsx como texto, igual que Brain3D.occlusionWiring.test.ts: usa
// <Canvas> y los hooks de @react-three/fiber, que necesitan WebGL, y vitest
// corre en node sin DOM.
interface NodeFs {
  readFileSync(path: URL, encoding: "utf8"): string;
}
const { readFileSync } = (
  globalThis as unknown as { process: { getBuiltinModule(id: "node:fs"): NodeFs } }
).process.getBuiltinModule("node:fs");

// El código sin comentarios y con los espacios juntos.
const BRAIN_CODE = readFileSync(new URL("./Brain3D.tsx", import.meta.url), "utf8")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1")
  .replace(/\s+/g, " ");

describe("etiquetas del 3D: conexión en Brain3D.tsx", () => {
  it("la etiqueta toma el texto y el fondo de `colors`, los de exportación mientras se captura", () => {
    expect(BRAIN_CODE).toContain("const colors = useDrawColors(exportPhase === \"capturing\");");
    expect(BRAIN_CODE).toContain("colors={colors} overlay={overlay} pill={mark?.pill ?? null} />");
    expect(BRAIN_CODE).toContain("const background = pill?.background ?? colors.label3dBackground;");
    expect(BRAIN_CODE).toContain("const color = pill?.color ?? colors.label3dText;");
  });

  it("la textura depende del texto, de los dos colores y de la versión de fuentes, que se pide al montar", () => {
    expect(BRAIN_CODE).toContain("const fontVersion = useLabelFontStore((state) => state.version);");
    expect(BRAIN_CODE).toContain(
      'const label = useMemo( () => getLabelTexture(node.abbreviation ?? "", { background, color }, fontVersion), ' +
        "[node.abbreviation, background, color, fontVersion], );",
    );
    expect(BRAIN_CODE).toContain("useEffect(() => { void requestLabelFont(document.fonts); }, []);");
  });
});
```

En `frontend/src/components/Brain3D.marksWiring.test.ts`, busca:

```ts
    expect(BRAIN).toContain("pill={mark?.pill ?? null}");
    expect(BRAIN).toMatch(/const label = useMemo\(\(\) => getLabelTexture\(node\.abbreviation \?\? "", pill\), \[node\.abbreviation, pill\]\);/);
  });

  // Con la curva de tono del lienzo, el azul de marca salía apagado.
  it("el anillo y la pastilla, sin la curva de tono; las etiquetas de siempre, con ella", () => {
    expect(BRAIN_CODE).toContain(
      "<spriteMaterial map={label.texture} transparent depthWrite={false} depthTest={!overlay} sizeAttenuation toneMapped={pill === null} ",
    );
```

Sustitúyelo por:

```ts
    expect(BRAIN).toContain("pill={mark?.pill ?? null}");
    // Desde la fase 4 (spec 6.3), la etiqueta de siempre también va sobre una
    // pastilla, con los colores del tema: los de marca, si los hay, ganan.
    expect(BRAIN).toContain("const background = pill?.background ?? colors.label3dBackground;");
    expect(BRAIN).toContain("const color = pill?.color ?? colors.label3dText;");
  });

  // Con la curva de tono del lienzo, el azul de marca salía apagado. Desde la
  // fase 4 (spec 6.3), las etiquetas de siempre tampoco la llevan: salen con
  // los colores del tema.
  it("el anillo y todas las etiquetas, también la pastilla, sin la curva de tono", () => {
    expect(BRAIN_CODE).toContain(
      "<spriteMaterial map={label.texture} transparent depthWrite={false} depthTest={!overlay} sizeAttenuation toneMapped={false} ",
    );
```
- [ ] **Step 2: ver que fallan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/logic/textSprite.test.ts src/state/labelFont.test.ts src/components/Brain3D.labelsWiring.test.ts src/components/Brain3D.marksWiring.test.ts 2>&1 | tail -20
```

Expected: FAIL en los cuatro archivos: `labelFont.test.ts` no encuentra `./labelFont`; en `textSprite.test.ts`, la clave y la caché no cambian con la versión de fuentes; `Brain3D.labelsWiring.test.ts` no encuentra sus líneas; y en `Brain3D.marksWiring.test.ts` fallan las dos pruebas actualizadas.

- [ ] **Step 3: la textura, la versión de fuentes y el 3D**

En `frontend/src/logic/textSprite.ts`, busca:

```ts
// Marcas de regiones (docs/rediseno-interfaz-diseno.md, 5.9): la etiqueta de
// una región marcada va sobre una pastilla del color de marca, y su marcador
// lleva un anillo, también en una textura. Las dos se guardan por sus
// colores, además de por el texto.
import * as THREE from "three";
```

Sustitúyelo por:

```ts
// Marcas de regiones (docs/rediseno-interfaz-diseno.md, 5.9): la etiqueta de
// una región marcada va sobre una pastilla del color de marca, y su marcador
// lleva un anillo, también en una textura. Las dos se guardan por sus
// colores, además de por el texto.
//
// Fase 4 del rediseño (spec 6.3): todas las etiquetas van sobre una
// pastilla, con la tipografía de la interfaz: las de siempre, con el texto
// del tema sobre su fondo translúcido, y las de una región marcada, con los
// colores de marca. La caché las guarda por su texto, sus dos colores y la
// versión de fuentes (state/labelFont.ts).
import * as THREE from "three";
```

En `frontend/src/logic/textSprite.ts`, busca:

```ts
const textureCache = new Map<string, LabelTexture>();

function buildTexture(text: string): LabelTexture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // No debería pasar en un navegador real; una textura 1x1 transparente
    // es un resultado inofensivo si pasa, no un error visible en cascada.
    return { texture: new THREE.CanvasTexture(canvas), aspect: 1 };
  }
  const fontSize = 44;
  const font = `bold ${fontSize}px system-ui, sans-serif`;
  // Medir el texto real ANTES de fijar el tamaño del canvas -- es lo que
  // permite que el canvas se dimensione para el texto en vez de al revés.
  ctx.font = font;
  const textWidth = ctx.measureText(text).width;
  const paddingX = 18; // hueco para el contorno blanco (lineWidth 9) a cada lado
  const paddingY = 20;
  canvas.width = Math.max(1, Math.ceil(textWidth + paddingX * 2));
  canvas.height = Math.ceil(fontSize + paddingY * 2);
  // Redimensionar canvas.width/height reinicia el estado del contexto 2D
  // en cualquier navegador (se pierde el `font` fijado arriba) -- hay que
  // volver a fijar todo después de este punto, no solo una vez.
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Contorno blanco grueso: la abreviatura tiene que leerse igual sobre
  // cualquier color de red (theme/networks.ts trae más de 25 colores
  // distintos, algunos claros) y sobre el fondo oscuro del propio lienzo.
  ctx.lineWidth = 9;
  ctx.strokeStyle = "#ffffff";
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = "#111111";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return { texture, aspect: canvas.width / canvas.height };
}

// Etiqueta de una región marcada (docs/rediseno-interfaz-diseno.md, 5.9): el
// texto de contraste sobre una pastilla del color de marca del tema, como en
// el connectograma y los hemisferios.
export interface LabelPill {
  background: string;
  color: string;
}

// Clave de la caché: la etiqueta de siempre, por su texto, como hasta ahora;
// la de una región marcada lleva además los colores de su pastilla, que
// cambian con el tema.
export function labelTextureKey(text: string, pill: LabelPill | null): string {
  return pill ? `${text}\u0000${pill.background}\u0000${pill.color}` : text;
}

// La pastilla ocupa todo el alto de la etiqueta de siempre (el mismo lienzo
// de 84 px para un texto de 44), así que el texto sale del mismo tamaño. Sus
// extremos son semicírculos: el margen a los lados deja el texto dentro.
const PILL_FONT_SIZE = 44;
const PILL_PADDING_X = 34;
const PILL_PADDING_Y = 20;
const PILL_INSET = 6;

function buildPillTexture(text: string, pill: LabelPill): LabelTexture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { texture: new THREE.CanvasTexture(canvas), aspect: 1 };
  const font = `bold ${PILL_FONT_SIZE}px system-ui, sans-serif`;
  ctx.font = font;
  const textWidth = ctx.measureText(text).width;
  canvas.width = Math.max(1, Math.ceil(textWidth + PILL_PADDING_X * 2));
  canvas.height = Math.ceil(PILL_FONT_SIZE + PILL_PADDING_Y * 2);
  // Al redimensionar el lienzo se pierde el estado del contexto: se vuelve a
  // fijar la fuente.
  ctx.font = font;
  const width = canvas.width - PILL_INSET * 2;
  const height = canvas.height - PILL_INSET * 2;
  const radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(PILL_INSET + radius, PILL_INSET);
  ctx.arcTo(PILL_INSET + width, PILL_INSET, PILL_INSET + width, PILL_INSET + height, radius);
  ctx.arcTo(PILL_INSET + width, PILL_INSET + height, PILL_INSET, PILL_INSET + height, radius);
  ctx.arcTo(PILL_INSET, PILL_INSET + height, PILL_INSET, PILL_INSET, radius);
  ctx.arcTo(PILL_INSET, PILL_INSET, PILL_INSET + width, PILL_INSET, radius);
  ctx.closePath();
  ctx.fillStyle = pill.background;
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = pill.color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  // Los colores del lienzo son sRGB: así salen como en los dibujos SVG.
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { texture, aspect: canvas.width / canvas.height };
}

export function getLabelTexture(text: string, pill: LabelPill | null = null): LabelTexture {
  const key = labelTextureKey(text, pill);
  const cached = textureCache.get(key);
  if (cached) return cached;
  const built = pill ? buildPillTexture(text, pill) : buildTexture(text);
  textureCache.set(key, built);
  return built;
}
```

Sustitúyelo por:

```ts
// Tipografía de las etiquetas (spec 6.3 y 7; fase 4 del rediseño): la de la
// interfaz, Atkinson Hyperlegible Next. El lienzo no espera a que llegue:
// dibuja con la que haya. state/labelFont.ts la pide y, cuando llega, sube
// la versión de fuentes, así que las etiquetas se vuelven a dibujar con ella.
export const LABEL_FONT_SIZE = 44;
export const LABEL_FONT = `600 ${LABEL_FONT_SIZE}px 'Atkinson Hyperlegible Next', system-ui, sans-serif`;

// Cómo se ve una etiqueta: su texto sobre una pastilla. Las de siempre
// llevan el texto del tema sobre su fondo translúcido (tokens label3dText y
// label3dBackground de theme/themes.ts); las de una región marcada, el texto
// de marca sobre el color de marca (5.9).
export interface LabelStyle {
  background: string;
  color: string;
}

// Clave de la caché: el texto, los dos colores de la etiqueta, que salen del
// tema (de la paleta de exportación mientras se captura el JPEG, o de las
// marcas), y la versión de fuentes.
export function labelTextureKey(text: string, style: LabelStyle, fontVersion: number): string {
  return [text, style.background, style.color, String(fontVersion)].join("\u0000");
}

const textureCache = new Map<string, LabelTexture>();
// Versión de fuentes de las texturas de la caché. Cuando sube, las de antes ya
// no sirven: se liberan.
let cachedFontVersion = 0;

// La pastilla ocupa todo el alto de la etiqueta (84 px para un texto de 44,
// el tamaño de siempre), así que el texto sale del mismo tamaño que antes.
// Sus extremos son semicírculos: el margen a los lados deja el texto dentro.
const PILL_PADDING_X = 34;
const PILL_PADDING_Y = 20;
const PILL_INSET = 6;

function buildTexture(text: string, style: LabelStyle): LabelTexture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // No debería pasar en un navegador real; una textura 1x1 transparente
    // es un resultado inofensivo si pasa, no un error visible en cascada.
    return { texture: new THREE.CanvasTexture(canvas), aspect: 1 };
  }
  // Medir el texto real ANTES de fijar el tamaño del canvas -- es lo que
  // permite que el canvas se dimensione para el texto en vez de al revés.
  ctx.font = LABEL_FONT;
  const textWidth = ctx.measureText(text).width;
  canvas.width = Math.max(1, Math.ceil(textWidth + PILL_PADDING_X * 2));
  canvas.height = Math.ceil(LABEL_FONT_SIZE + PILL_PADDING_Y * 2);
  // Redimensionar canvas.width/height reinicia el estado del contexto 2D
  // en cualquier navegador (se pierde el `font` fijado arriba) -- hay que
  // volver a fijar todo después de este punto, no solo una vez.
  ctx.font = LABEL_FONT;
  // Hasta la fase 4, la etiqueta de siempre era texto casi negro con un
  // contorno blanco grueso, igual en todos los temas; ahora es el texto del
  // tema sobre la pastilla translúcida, que lo separa de lo que haya detrás
  // (theme/themeCss.test.ts comprueba que se lee con cualquier cosa detrás).
  const width = canvas.width - PILL_INSET * 2;
  const height = canvas.height - PILL_INSET * 2;
  const radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(PILL_INSET + radius, PILL_INSET);
  ctx.arcTo(PILL_INSET + width, PILL_INSET, PILL_INSET + width, PILL_INSET + height, radius);
  ctx.arcTo(PILL_INSET + width, PILL_INSET + height, PILL_INSET, PILL_INSET + height, radius);
  ctx.arcTo(PILL_INSET, PILL_INSET + height, PILL_INSET, PILL_INSET, radius);
  ctx.arcTo(PILL_INSET, PILL_INSET, PILL_INSET + width, PILL_INSET, radius);
  ctx.closePath();
  ctx.fillStyle = style.background;
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = style.color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  // Los colores del lienzo son sRGB: así salen como en los dibujos SVG.
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { texture, aspect: canvas.width / canvas.height };
}

export function getLabelTexture(text: string, style: LabelStyle, fontVersion: number): LabelTexture {
  if (fontVersion !== cachedFontVersion) {
    for (const { texture } of textureCache.values()) texture.dispose();
    textureCache.clear();
    cachedFontVersion = fontVersion;
  }
  const key = labelTextureKey(text, style, fontVersion);
  const cached = textureCache.get(key);
  if (cached) return cached;
  const built = buildTexture(text, style);
  textureCache.set(key, built);
  return built;
}
```
Crea `frontend/src/state/labelFont.ts`:

```ts
// Versión de fuentes de las etiquetas del cerebro 3D
// (docs/rediseno-interfaz-diseno.md, 6.3; fase 4 del rediseño). Las
// etiquetas se dibujan en un <canvas>, que no espera a que llegue la fuente:
// dibuja con la que haya. Cuando document.fonts.load(LABEL_FONT) termina, la
// versión sube: la caché de texturas (logic/textSprite.ts) deja de encontrar
// las de antes y las etiquetas se vuelven a dibujar con la fuente buena.
import { create } from "zustand";
import { LABEL_FONT } from "../logic/textSprite";

interface LabelFontState {
  version: number;
}

export const useLabelFontStore = create<LabelFontState>(() => ({ version: 0 }));

// Lo que se usa de document.fonts (un FontFaceSet): así se prueba sin DOM.
export interface FontLoader {
  load(font: string): Promise<unknown>;
}

const requested = new WeakSet<FontLoader>();

// Pide la fuente de las etiquetas una sola vez por cada FontFaceSet (en la
// página hay uno, document.fonts) y, cuando llega, sube la versión. Si no
// llega, las etiquetas se quedan con la fuente de respaldo, sin error.
export function requestLabelFont(fonts: FontLoader | undefined): Promise<void> {
  if (!fonts || requested.has(fonts)) return Promise.resolve();
  requested.add(fonts);
  return fonts.load(LABEL_FONT).then(
    () => useLabelFontStore.setState((state) => ({ version: state.version + 1 })),
    () => undefined,
  );
}
```

La textura toma el estilo con su nombre nuevo.

En `frontend/src/components/Brain3D.tsx`, busca:

```tsx
import { MARK_RING_SPRITE_SCALE, getLabelTexture, getMarkRingTexture, type LabelPill } from "../logic/textSprite";
```

Sustitúyelo por:

```tsx
import { MARK_RING_SPRITE_SCALE, getLabelTexture, getMarkRingTexture, type LabelStyle } from "../logic/textSprite";
```

En `frontend/src/components/Brain3D.tsx`, busca:

```tsx
import { useMarksStore } from "../state/marks";
```

Sustitúyelo por:

```tsx
import { useMarksStore } from "../state/marks";
import { requestLabelFont, useLabelFontStore } from "../state/labelFont";
```

`NodeLabel` recibe los colores de dibujo (los de exportación mientras se captura) y la versión de fuentes. El comentario del desarrollador principal sobre `useMemo` se queda.

En `frontend/src/components/Brain3D.tsx`, busca:

```tsx
function NodeLabel({
  node,
  offset,
  occlusion,
  overlay = false,
  pill = null,
}: {
  node: GraphNode;
  offset: number;
  occlusion: CortexOcclusion;
  overlay?: boolean;
  // Región marcada (docs/rediseno-interfaz-diseno.md, 5.9): la etiqueta va
  // sobre una pastilla del color de marca (logic/textSprite.ts).
  pill?: LabelPill | null;
}) {
  // useMemo va antes que cualquier retorno condicional (regla de los
  // hooks: el orden de llamada no puede depender de datos) -- por eso
  // el texto de repuesto "" en vez de omitir la llamada cuando no hay
  // abreviatura; getLabelTexture("") solo se pide una vez por caché.
  const label = useMemo(() => getLabelTexture(node.abbreviation ?? "", pill), [node.abbreviation, pill]);
```

Sustitúyelo por:

```tsx
function NodeLabel({
  node,
  offset,
  occlusion,
  colors,
  overlay = false,
  pill = null,
}: {
  node: GraphNode;
  offset: number;
  occlusion: CortexOcclusion;
  // Etiquetas del 3D (docs/rediseno-interfaz-diseno.md, 6.3; fase 4 del
  // rediseño): el texto del tema sobre su fondo translúcido. Mientras se
  // captura el JPEG, los de la paleta de exportación, como lo demás.
  colors: DrawColors;
  overlay?: boolean;
  // Región marcada (docs/rediseno-interfaz-diseno.md, 5.9): la etiqueta va
  // sobre una pastilla del color de marca (logic/textSprite.ts).
  pill?: LabelStyle | null;
}) {
  // La versión de fuentes (state/labelFont.ts): cuando llega la fuente, las
  // etiquetas se vuelven a dibujar con ella.
  const fontVersion = useLabelFontStore((state) => state.version);
  const background = pill?.background ?? colors.label3dBackground;
  const color = pill?.color ?? colors.label3dText;
  // useMemo va antes que cualquier retorno condicional (regla de los
  // hooks: el orden de llamada no puede depender de datos) -- por eso
  // el texto de repuesto "" en vez de omitir la llamada cuando no hay
  // abreviatura; getLabelTexture("") solo se pide una vez por caché.
  const label = useMemo(
    () => getLabelTexture(node.abbreviation ?? "", { background, color }, fontVersion),
    [node.abbreviation, background, color, fontVersion],
  );
```

Todas las etiquetas, sin la curva de tono (desviación 9).

En `frontend/src/components/Brain3D.tsx`, busca:

```tsx
      {/* toneMapped: la pastilla de una región marcada sale con el color de
          marca tal cual, sin la curva de tono del lienzo, como el anillo. */}
      <spriteMaterial
        map={label.texture}
        transparent
        depthWrite={false}
        depthTest={!overlay}
        sizeAttenuation
        toneMapped={pill === null}
```

Sustitúyelo por:

```tsx
      {/* Sin la curva de tono del lienzo (toneMapped): la etiqueta sale con
          los colores del tema, o con los de marca, tal cual, como en los
          dibujos SVG y como el anillo de las marcas (fase 4; spec 6.3). */}
      <spriteMaterial
        map={label.texture}
        transparent
        depthWrite={false}
        depthTest={!overlay}
        sizeAttenuation
        toneMapped={false}
```

En `frontend/src/components/Brain3D.tsx`, busca:

```tsx
interface MarkLook {
  pill: LabelPill;
```

Sustitúyelo por:

```tsx
interface MarkLook {
  pill: LabelStyle;
```

`NodeMesh` le pasa sus colores, los mismos que usa el marcador.

En `frontend/src/components/Brain3D.tsx`, busca:

```tsx
      <NodeLabel node={node} offset={size.labelOffset} occlusion={occlusion} overlay={overlay} pill={mark?.pill ?? null} />
```

Sustitúyelo por:

```tsx
      <NodeLabel
        node={node}
        offset={size.labelOffset}
        occlusion={occlusion}
        colors={colors}
        overlay={overlay}
        pill={mark?.pill ?? null}
      />
```

La fuente se pide al montar, una vez por sesión (`requestLabelFont` no repite).

En `frontend/src/components/Brain3D.tsx`, busca:

```tsx
  const [occlusion] = useState(createCortexOcclusion);
```

Sustitúyelo por:

```tsx
  const [occlusion] = useState(createCortexOcclusion);

  // Tipografía de las etiquetas (fase 4 del rediseño; spec 6.3): se pide la
  // fuente al montar y, cuando llega, las etiquetas se vuelven a dibujar con
  // ella (state/labelFont.ts).
  useEffect(() => {
    void requestLabelFont(document.fonts);
  }, []);
```
- [ ] **Step 4: ver que pasan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 src/logic/textSprite.test.ts src/state/labelFont.test.ts src/components/Brain3D.labelsWiring.test.ts src/components/Brain3D.marksWiring.test.ts src/components/Brain3D.occlusionWiring.test.ts 2>&1 | tail -6
```

Expected: PASS, los cinco.

- [ ] **Step 5: Comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 2>&1 | grep -E "^\s+Tests "
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx tsc -b && echo "tsc limpio"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run build 2>&1 | grep -E "built in|error"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && { git diff "$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt)" -- frontend/src ':!frontend/src/theme/themes.ts' ':!*.test.ts' ':!*.test.tsx' | grep -E '^\+'; git ls-files --others --exclude-standard -- frontend/src ':!*.test.ts' ':!*.test.tsx' | xargs -r cat; } | grep -oiE '#[0-9a-f]{3,8}\b|rgba?\(' ; echo "fin de la búsqueda"
```

Expected: BASE + 43 pruebas; lo demás, como en la Task 1. `set-state-in-effect` no sube: `requestLabelFont` cambia un store de zustand cuando llega la fuente, no un estado de React dentro del efecto.

- [ ] **Step 6: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git add frontend/src/logic/textSprite.ts frontend/src/logic/textSprite.test.ts frontend/src/state/labelFont.ts frontend/src/state/labelFont.test.ts frontend/src/components/Brain3D.tsx frontend/src/components/Brain3D.marksWiring.test.ts frontend/src/components/Brain3D.labelsWiring.test.ts && git commit -m "Graficos: etiquetas del cerebro 3D con la tipografia nueva, sobre su pastilla, y su cache por tema y fuente

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Revisión de la tanda 2 (Tasks 5 a 7)

Como la de la tanda 1: dos revisores en paralelo, subagentes nuevos, con el diff de la tanda (`git diff <commit de la Task 4 o de sus correcciones>..HEAD`), este plan y las secciones 4.2, 4.4, 5.9, 6.3, 7, 8 y 12 del spec. Solo leen: sin navegadores ni servidores, y sin pruebas, `tsc`, lint ni compilación (una prueba concreta, a quien coordina).

- [ ] **Revisor A: surcos**
  - Los percentiles frente a 6.3 y 10: el método (interpolación lineal, sin NaN), el recorte a 0-1 y el smoothstep; que se calculen una vez por archivo (el `WeakMap` por vector) y que un archivo nuevo, o uno sin rango, no se quede con un valor viejo.
  - El sombreado de las regiones con color, con el mismo valor suavizado (desviación 7): que el factor siga entre 0,7 y 1.
  - Original conserva sus grises (0,35 y 0,72); `PaintedCortex` y `Brain3D` no cambian para esto; las pruebas de `surfaceParcels.test.ts` siguen pasando sin tocarlas.
  - Que las pruebas nuevas no puedan pasar con la cuenta de antes, salvo la que se dice.
- [ ] **Revisor B: etiquetas**
  - Los tokens frente a la desviación 8 y a la maqueta (`text` y `scrim`), su contraste con cualquier cosa detrás (spec 8) y que la exportación los resuelva como los demás (4.4).
  - La textura: la fuente de la interfaz (spec 7), la pastilla compartida con las marcas, el espacio de color sRGB y el tamaño del texto, el de antes.
  - La caché: la clave (texto, dos colores y versión), que al subir la versión se liberen las de antes sin romper un material que aún la use, y que la memoria no crezca sin límite al cambiar de tema.
  - La versión de fuentes: una sola petición por sesión, sin error si falla o si no hay `document.fonts`, y que todas las etiquetas se vuelvan a dibujar al subir.
  - `Brain3D`: los colores de `NodeLabel` son los de exportación mientras se captura; la pastilla de marca gana al estilo del tema; sin curva de tono; la oclusión, los marcadores y el anillo, sin cambios. Que el cambio de las dos pruebas de las marcas esté justificado y no esconda un fallo.
  - Comentarios del desarrollador principal intactos salvo el del contorno blanco, que se sustituye; lint en la línea base.
- [ ] **Arreglos:** una ronda, en un commit `Graficos: correcciones de la revision de la tanda 2`. Solo se vuelve a revisar lo que salió «importante».

---

## Chunk 3: verificación en la app real, preparación

### Task 8: verificación en la app real: preparación

**Files:**
- Create: una carpeta nueva en disco (`/home/dae/.config/superpowers/worktrees/Neurograph/fase4-verif-XXXXXX`), con los scripts y lo que generen, y un worktree desechable con la versión anterior a la fase (`/home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes`). Nada de esto entra en el repositorio. La Task 9 quita el worktree; la carpeta se quita al final de la Task 10.

La verificación ocupa dos tareas. Esta prepara la carpeta, la versión anterior, el servidor y los scripts; la Task 9 pasa las fases, mira las capturas, escribe el informe y cierra.

Qué se comprueba, con HCP-MMP1.0 y datos reales:
- las etiquetas radiales a cuatro tamaños de ventana: giro, alineación, hacia fuera, dentro del dibujo y sin cruzar los arcos; y la fuente de las etiquetas del connectograma y de los hemisferios;
- los arcos, contra los hemisferios del backend: con HCP-MMP1.0, sí, y cada uno cubre su bloque; con Brainnetome, Gordon 333 y el Subcórtex, no;
- el halo y las marcas que siguen a las etiquetas, en el dibujo y en la lupa, con los temas Grafito y Claro (los colores de Original los cubre su exportación);
- la leyenda a cuatro tamaños: sus entradas, sin eventos, en la vista grande y no en la miniatura, y **qué tapa del dibujo** (para la pregunta 1 al usuario);
- la exportación de los SVG con los temas Grafito y Original: el halo, los arcos y sus rótulos con los colores de exportación, sin marcas ni leyenda;
- que, sin selección, con los mismos datos y el tema Grafito, el connectograma dibuja los mismos nodos y las mismas líneas que antes de la fase, y los hemisferios salen iguales (pantalla y JPEG);
- los surcos: los percentiles de la app, contra los calculados aparte con el archivo de verdad, y cuántos vértices quedan cerca de los extremos antes y después;
- el cerebro 3D con Grafito (y el paso a Claro en vivo) y con Original: la fuente cargada, la versión de fuentes, los colores de la textura en un `<canvas>` de verdad, capturas y la exportación.

Son 12 navegadores, uno detrás de otro: 8 sin WebGL, 2 con WebGL y 2 para comparar con la versión anterior.

La D (Task 10) solo afirma lo que se vea en las dos tareas.

**Cuándo.** Solo cuando el usuario no está usando la máquina, o si lo permite de forma expresa: se le quedó sin memoria dos veces por los procesos de prueba y los navegadores. Lo pregunta quien coordina (Step 0).

**Reglas de recursos, del navegador y de los procesos.**

- **Un solo navegador sin interfaz a la vez en toda la máquina.** Cada fase abre uno y lo cierra. Antes de cada fase, y antes de arrancar cada servidor, `antes-de-lanzar.sh` (Step 5) comprueba que hay al menos 8 GB de memoria disponible (`free -m`, columna «disponible») y que no hay ningún otro navegador sin interfaz en marcha, de esta sesión o de otra. Si no, no lances: espera y vuelve a comprobar (con Monitor y un bucle `until`, o preguntando a quien coordina).
- **La carpeta de trabajo va en disco, no en el scratchpad:** `/tmp` es memoria (un tmpfs de 4 GB, con unos 2,5 GB ya usados al escribir el plan), y en `TMPDIR` van los perfiles de Chromium, su memoria compartida y las descargas. Tras cada fase se vacía `$D/tmp`.
- **Todo con `nice -n 19`:** los servidores y las fases.
- **Fases 2D sin WebGL** (`--disable-3d-apis`): la miniatura del 3D, que siempre está montada, no gasta CPU en SwiftShader. Su ErrorBoundary deja en la consola el error de no poder crear el lienzo: es de esperar, y el script lo aparta (`erroresEsperados`).
- **Fases 3D** con WebGL por software, `requestAnimationFrame` a unos 5 fotogramas por segundo (un script que corre antes que la app) y una ventana pequeña, de 1024 × 768.
- Se usa un Chromium sin interfaz con un script de Node suelto: Playwright 1.55.0 de `/home/dae/PycharmProjects/gh3.2/node_modules/playwright`, que solo se carga (allí no se escribe nada), con `chromium.launch({ headless: true })` y un contexto nuevo en cada fase (perfil desechable). **Nunca** el Chrome del usuario, `mcp__claude-in-chrome__*`, `mcp__browsermcp__*` ni las herramientas del MCP de Playwright.
- **Puertos:** 5291 para la versión nueva y 5292 para la anterior, que solo se arranca durante las fases `igual` (Task 9, Step 3). **Nunca** 5173 (el del usuario) ni 5199 (el de `rediseno-interfaz`, que mira el usuario).
- **Solo se matan procesos propios.** Tras cada fase, `pkill -f -- "$(basename "$D")/[t]mp"`: los navegadores de esta carpeta. Los servidores se paran con la herramienta de tareas; solo si un puerto sigue ocupado, `pkill -f -- "vite --port 529[1] "` o `pkill -f -- "vite --port 529[2] "`. **Nunca** uses como patrón `vite`, `node`, `chrom*` ni una ruta de un worktree. Los corchetes evitan que el patrón se encuentre a sí mismo.
- El backend del usuario está en `127.0.0.1:8420`. No lo arranques. Solo recibe peticiones GET: el script corta cualquier otra. `GET /connections` devuelve las filas en otro orden en cada petición, y con él cambia el orden de dibujo: por eso los scripts sirven a las dos versiones los mismos JSON de HCP-MMP1.0, guardados en la fase `preflight`.
- **Tiempo:** `timeout 570` en cada orden y el tiempo límite de la herramienta en 600000 ms, o en segundo plano, comprobando cada poco si ha terminado. Los scripts guardan su JSON tras cada caso y también si fallan.

**Honestidad.**

- Cada comprobación se informa como «visto», «distinto» o «sin comprobar».
- Nunca se cambia una expectativa, ni el script, para que desaparezca una diferencia. «Corrige el script» vale solo cuando la suposición del propio script era errónea (un selector, un tiempo de espera), y se anota en el informe. Los scripts solo se probaron en seco con `node --check` y `py_compile`: es posible que alguno necesite un arreglo así la primera vez.
- Los scripts nunca dan por buena otra región: si no pueden seleccionar o marcar la que buscan, la apuntan en `sinComprobar`, y lo que dependía de ella queda «sin comprobar».
- Cada fase guarda su JSON aunque falle a medias, con el error en `fallo`.

- [ ] **Step 0: permiso del usuario**

Quien coordina pregunta al usuario si puede usar la máquina ahora para la verificación: un servidor de desarrollo y un navegador sin interfaz, uno cada vez, durante un rato. Sin su permiso, o mientras él la esté usando, esta tarea no empieza: termina como BLOQUEADA y se retoma cuando lo permita. Apunta para el informe cuándo y cómo lo permitió.

- [ ] **Step 1: pruebas, tipos, lint y compilación**

Una orden cada vez:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vitest run --maxWorkers=2 2>&1 | grep -E "^\s+Tests "
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx tsc -b && echo "tsc limpio"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npm run build 2>&1 | grep -E "built in|error"
```

Expected: BASE + 43 pruebas en verde (más las que añadieran las revisiones); `tsc limpio`; `9 : warning` y ningún error; `✓ built in …`.

- [ ] **Step 2: carpeta de trabajo y estado de la copia principal**

```bash
D=$(mktemp -d /home/dae/.config/superpowers/worktrees/Neurograph/fase4-verif-XXXXXX) && mkdir -p "$D/tmp" && echo "$D"
git -C /home/dae/PycharmProjects/Neurograph/Neurograph status --short > "$D/copia-principal-antes.txt"; cat "$D/copia-principal-antes.txt"
```

Apunta la ruta que imprime. El estado de la terminal no se conserva entre órdenes: en los pasos siguientes, sustituye `$D` por esa ruta.

- [ ] **Step 3: la versión anterior («antes»)**

**Qué es «antes».** El commit que guardó el Step 0 de la Task 1 (`fase4-base.txt`; si no existe, el de este plan: `git log --format=%H -1 --grep='^Plan de la fase 4: graficos'`). Solo es «la rama sin esta fase» si desde entonces no ha entrado nada más. Compruébalo, y apunta HEAD para el informe:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && BASE_COMMIT=$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt) && echo "base $BASE_COMMIT" && echo "HEAD $(git rev-parse HEAD)" && echo "--- commits desde la base:" && git log --format='%h %s' "$BASE_COMMIT"..HEAD && echo "--- cambios sin commit en frontend/:" && git status --short frontend/ && echo "fin"
```

- Si hay cambios sin commit en `frontend/`, alguien está trabajando en el worktree: no sigas y termina la tarea como BLOQUEADA.
- «Antes» vive en un worktree desechable, fuera de `/tmp`, porque sus `node_modules` son enlaces duros de los del worktree y tienen que estar en el mismo disco. Si ya existe `/home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes`, es de una verificación anterior: no sigas y dilo.
- **Si todos los commits desde la base empiezan por `Graficos: `** (los de esta fase y sus correcciones), «antes» es la base. En una sola orden:

  ```bash
  git -C /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 worktree add --detach /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes "$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt)" && \
  cp -al /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend/node_modules /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes/frontend/node_modules && \
  rm -rf /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes/frontend/node_modules/.vite /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes/frontend/node_modules/.vite-temp /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes/frontend/node_modules/.tmp && \
  git -C /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes log --oneline -1
  ```

- **Si ha entrado algún otro commit,** «antes» es HEAD sin los commits `Graficos: `. Se deshacen en el worktree desechable, sin commit. En una sola orden:

  ```bash
  BASE_COMMIT=$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase4-base.txt) && \
  git -C /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 worktree add --detach /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes HEAD && \
  git -C /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes revert --no-commit $(git -C /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 log --format=%H --grep='^Graficos: ' "$BASE_COMMIT"..HEAD) && \
  cp -al /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend/node_modules /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes/frontend/node_modules && \
  rm -rf /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes/frontend/node_modules/.vite /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes/frontend/node_modules/.vite-temp /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes/frontend/node_modules/.tmp
  ```

  Si `git revert` da conflictos, para y dilo: «antes» no se puede construir así.

Su servidor no se arranca todavía: solo hace falta en el Step 3 de la Task 9.

- [ ] **Step 4: el servidor de la versión nueva**

Los scripts se crean en el Step 5; la comprobación de recursos, a mano: al menos 8192 MB en la columna «disponible» y ningún navegador sin interfaz.

```bash
free -m | awk '/^Mem:/ {print "memoria disponible: " $7 " MB"}'
ss -ltn | grep -E ':(5291|5292) ' || echo "5291 y 5292 libres"
```

Si alguno está ocupado, elige otros dos libres que no sean el 5173 ni el 5199, y cámbialos en las órdenes de arranque, en `PORT` y `PORT_ANTES` de cada fase y en los patrones de `pkill`.

Arráncalo en segundo plano (`run_in_background`) y apunta su identificador de tarea: la Task 9 lo para. Sirve el propio worktree, con su configuración; el `--port` va primero, para que lo encuentre el patrón de `pkill`:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend && nice -n 19 npx vite --port 5291 --strictPort
```

- [ ] **Step 5: los scripts**

Crea `$D/antes-de-lanzar.sh`:

```sh
#!/bin/sh
# Antes de lanzar cada fase de la verificación (Task 9 de
# docs/rediseno-interfaz-plan-fase4.md): al menos 8 GB de memoria disponible y
# ningún navegador sin interfaz en marcha en toda la máquina. Sale con 0 si se
# puede lanzar; si no, con 1, y dice por qué.
avail=$(free -m | awk '/^Mem:/ {print $7}')
# Solo cuentan los procesos cuyo ejecutable es un Chromium (chrome o
# headless_shell de Playwright): así no cuenta la propia orden que lo busca.
others=$(pgrep -fa -- '--headless' | grep -Eci '^[0-9]+ [^ ]*(chrom|headless_shell)')
echo "memoria disponible: ${avail} MB; navegadores sin interfaz en marcha: ${others}"
[ "$avail" -ge 8192 ] && [ "$others" -eq 0 ]
```

Crea `$D/verify-fase4.cjs`:

```js
// Verificación de la fase 4 (Tasks 8 y 9 de docs/rediseno-interfaz-plan-fase4.md):
// el connectograma (etiquetas radiales, arcos de hemisferio, halo, marcas y
// leyenda), su exportación, la misma geometría y los mismos hemisferios que
// antes, los surcos y las etiquetas del cerebro 3D con su exportación.
//   PORT=5291 PORT_ANTES=5292 TMPDIR=<carpeta>/tmp nice -n 19 node verify-fase4.cjs <fase> [caso]
// La carpeta está en disco, no en /tmp, que es memoria: los perfiles de
// Chromium y su memoria compartida van a TMPDIR.
// Un solo navegador cada vez: cada fase abre uno y lo cierra. Playwright 1.55
// de /home/dae/PycharmProjects/gh3.2 (solo se carga), Chromium sin interfaz y
// perfil desechable. Las fases 2D van sin WebGL (--disable-3d-apis): la
// miniatura del 3D, que siempre está montada, no gasta CPU, y su
// ErrorBoundary deja en la consola un error que se espera (erroresEsperados).
// Las del 3D, con WebGL por software, requestAnimationFrame a unos 5
// fotogramas por segundo y una ventana pequeña. Todo lo que se genera va a la
// carpeta de este archivo, y cada fase guarda su JSON aunque falle.
const { chromium } = require("/home/dae/PycharmProjects/gh3.2/node_modules/playwright");
const fs = require("fs");
const path = require("path");

const OUT = __dirname;
const BASE = `http://localhost:${process.env.PORT}/`;
const BASE_ANTES = `http://localhost:${process.env.PORT_ANTES}/`;
const API = "http://127.0.0.1:8420";
const ATLAS = "atlas.human.hcp.mmp1_0";
// Los otros tres atlas: su id, el principio de su nombre en la lista de
// «Atlas» y el nombre de su captura y de su JSON guardado. Sus /regions
// también salen de «preflight»: el backend no ordena las filas, y los arcos
// dependen del orden.
const OTHER_ATLASES = [
  ["atlas.human.brainnetome.bna_246", "Brainnetome", "brainnetome"],
  ["atlas.human.gordon333.cortex", "Gordon 333", "gordon333"],
  ["atlas.human.hcp.subcortex_grayordinates", "Subcórtex HCP", "subcortex"],
];
const CONNECTOGRAM = '.ws-view--main svg[aria-label="Connectograma"]';
const HEMISPHERES = '.ws-view--main svg[aria-label="Esquema de hemisferios"]';
const SIZES = [[1400, 900], [1280, 800], [1024, 768], [900, 600]];
// Posición del deslizador de peso: unas 3 000 conexiones en HCP-MMP1.0 (D3).
const WEIGHT_POSITION = 0.6;
// Regiones de la prueba: una en cada mitad del círculo (en HCP-MMP1.0 el
// hemisferio derecho va primero, en la mitad derecha).
const RIGHT = ["IFJa", "R"];
const LEFT = ["V1", "L"];
const SOMATOMOTOR = 'button[aria-label="Resaltar solo la red Somatomotora (sustituye la selección)"]';
const LEGEND_TEXTS = [
  "Evidencia no directa (indirecta o hipótesis)",
  "Evidencia directa",
  "Efectiva (con dirección)",
  "Color del punto = red",
];
// Errores de consola que se esperan sin WebGL: el lienzo 3D no se puede crear
// y su ErrorBoundary lo recoge. Cualquier otro error se informa.
const EXPECTED_WITHOUT_WEBGL = /WebGL|webgl|ErrorBoundary|The above error occurred/;

const out = (name) => path.join(OUT, name);
const save = (name, data) => fs.writeFileSync(out(name), JSON.stringify(data, null, 2));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Regiones que no se pudieron seleccionar o marcar con seguridad: lo que
// dependía de ellas queda «sin comprobar». Cada fase lo guarda en su JSON.
const notVerified = [];

// Ejecuta una fase y guarda su JSON tras cada caso y al final, también si
// falla. Si `timeout` corta la orden, queda lo del último checkpoint.
async function recording(name, report, body) {
  const checkpoint = () => save(name, { ...report, sinComprobar: notVerified });
  try {
    await body(checkpoint);
  } catch (e) {
    report.fallo = String(e?.stack ?? e);
    throw e;
  } finally {
    checkpoint();
  }
}

// Corre en la página antes que la app: guarda cada <svg> que se serializa
// (exportSvgAsJpeg lo hace con XMLSerializer justo antes de dibujar el JPEG).
function captureSerializedSvg() {
  const serialize = XMLSerializer.prototype.serializeToString;
  window.__ngSerialized = [];
  XMLSerializer.prototype.serializeToString = function (node) {
    const text = serialize.call(this, node);
    if (node && node.nodeName && node.nodeName.toLowerCase() === "svg") window.__ngSerialized.push(text);
    return text;
  };
}

// Corre en la página antes que la app, solo en las fases del 3D:
// requestAnimationFrame a unos 5 fotogramas por segundo, para que el WebGL por
// software no ocupe la CPU.
function throttleAnimationFrames() {
  const timers = new Map();
  let next = 1;
  window.requestAnimationFrame = (callback) => {
    const id = next++;
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        callback(performance.now());
      }, 200),
    );
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
  };
}

// webgl: false en las fases 2D. /regions y /connections de HCP-MMP1.0 salen
// de los JSON de «preflight»: GET /connections devuelve las filas en otro
// orden en cada petición, y para comparar dos versiones los datos tienen que
// ser los mismos. Al backend solo le llegan peticiones GET.
async function launch({ webgl = false, width = 1400, height = 900 } = {}) {
  const args = webgl
    ? ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"]
    : ["--disable-3d-apis"];
  const browser = await chromium.launch({ headless: true, args });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, acceptDownloads: true });
  await context.addInitScript(captureSerializedSvg);
  if (webgl) await context.addInitScript(throttleAnimationFrames);
  const page = await context.newPage();
  const cors = { "access-control-allow-origin": "*" };
  await page.route(
    (u) => u.port === "8420",
    (route) => (route.request().method() === "GET" ? route.fallback() : route.abort()),
  );
  await page.route(
    (u) => u.port === "8420" && u.pathname === "/regions" && u.searchParams.get("atlas_id") === ATLAS && !u.searchParams.has("network_source"),
    (route) => route.fulfill({ path: out("regions.json"), contentType: "application/json", headers: cors }),
  );
  await page.route(
    (u) => u.port === "8420" && u.pathname === "/connections" && u.searchParams.get("atlas_id") === ATLAS,
    (route) => route.fulfill({ path: out("connections.json"), contentType: "application/json", headers: cors }),
  );
  for (const [id, , file] of OTHER_ATLASES) {
    if (!fs.existsSync(out(`regions-${file}.json`))) continue;
    await page.route(
      (u) => u.port === "8420" && u.pathname === "/regions" && u.searchParams.get("atlas_id") === id && !u.searchParams.has("network_source"),
      (route) => route.fulfill({ path: out(`regions-${file}.json`), contentType: "application/json", headers: cors }),
    );
  }
  const errors = [];
  const expected = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    (!webgl && EXPECTED_WITHOUT_WEBGL.test(m.text()) ? expected : errors).push(m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => (!webgl && EXPECTED_WITHOUT_WEBGL.test(e.message) ? expected : errors).push(`pageerror: ${e.message}`));
  return { browser, page, errors, expected };
}

async function load(page, base, theme) {
  await page.goto(base);
  await page.evaluate((t) => localStorage.setItem("neurograph.apariencia", JSON.stringify({ theme: t, paletteMode: null })), theme);
  await page.reload();
  await page.locator(".data-status--real").waitFor({ timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
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

// Lleva una vista a grande con «Ampliar» (si no lo está ya).
async function enlarge(page, title) {
  const heading = page.locator(".ws-view--main .ws-view__header h2", { hasText: title });
  if (!(await heading.count())) {
    await page.locator(`button.ws-view__enlarge[aria-label="Ampliar ${title}"]`).click();
    await heading.waitFor();
  }
  await page.waitForTimeout(600);
  await page.mouse.move(4, 4);
}

const regionId = (abbreviation, hemisphere) => {
  const rows = JSON.parse(fs.readFileSync(out("regions.json"), "utf8"));
  const row = rows.find((r) => r.abbreviation === abbreviation && r.hemisphere === hemisphere);
  if (!row) throw new Error(`No hay ${abbreviation} (${hemisphere}) en regions.json`);
  return row.id;
};

// Stores de la app, leídos del mismo módulo que sirve Vite.
const selectedIds = (page) =>
  page.evaluate(async () => [...(await import("/src/state/selection.ts")).useSelectionStore.getState().selectedNodeIds]);
const markedIds = (page) => page.evaluate(async () => [...(await import("/src/state/marks.ts")).useMarksStore.getState().markedIds]);
const restoreSelection = (page, ids) =>
  page.evaluate(async (list) => {
    (await import("/src/state/selection.ts")).useSelectionStore.setState({ selectedNodeIds: new Set(list), selectedConnectionId: null });
  }, ids);
const drawTokens = (page, theme) => page.evaluate(async (t) => (await import("/src/theme/themes.ts")).DRAW_TOKENS[t], theme);

// Centro en pantalla del nodo de esa abreviatura en el connectograma grande
// (puede haber dos, uno por hemisferio: se devuelven los dos).
const nodeCenters = (page, abbreviation) =>
  page.locator(CONNECTOGRAM).evaluate((svg, ab) => {
    const found = [];
    for (const t of svg.querySelectorAll('text[data-ng-fill="label"]')) {
      const circle = t.textContent === ab ? t.previousElementSibling?.querySelector("circle") : null;
      if (!circle) continue;
      const r = circle.getBoundingClientRect();
      found.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    return found;
  }, abbreviation);

// Clic (o Ctrl+clic, para marcar) en el nodo de esa región. Comprueba en el
// store que es la buscada; si el clic cambia otra cosa, lo deshace. Si no lo
// consigue, la apunta en notVerified y devuelve false: nunca da por buena
// otra región.
async function clickNode(page, [abbreviation, hemisphere], mark = false) {
  const id = regionId(abbreviation, hemisphere);
  const read = mark ? markedIds : selectedIds;
  for (const center of await nodeCenters(page, abbreviation)) {
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const before = await read(page);
      if (before.includes(id)) return true;
      if (mark) await page.keyboard.down("Control");
      await page.mouse.click(center.x + dx, center.y + dy);
      if (mark) await page.keyboard.up("Control");
      await page.mouse.move(4, 4);
      await page.waitForTimeout(400);
      const after = await read(page);
      if (after.includes(id) && after.length === before.length + 1) return true;
      if (mark) await page.evaluate(async (list) => (await import("/src/state/marks.ts")).useMarksStore.setState({ markedIds: new Set(list) }), before);
      else await restoreSelection(page, before);
      await page.waitForTimeout(300);
    }
  }
  notVerified.push(`${mark ? "marcar" : "seleccionar"} ${abbreviation} (${hemisphere})`);
  return false;
}

// Geometría de las etiquetas del connectograma grande, en coordenadas del
// dibujo: cada nodo (el translate de su grupo) con su etiqueta.
const labelGeometry = (page) =>
  page.locator(CONNECTOGRAM).evaluate((svg) => {
    const size = Number(svg.getAttribute("width"));
    const center = size / 2;
    const box = svg.getBoundingClientRect();
    const arcs = [...svg.querySelectorAll('path[d*=" A "]')].map((p) => {
      const m = /^M ([-\d.]+) ([-\d.]+) A ([-\d.]+) /.exec(p.getAttribute("d"));
      return { radius: Number(m[3]), width: Number(p.getAttribute("stroke-width")) };
    });
    const nodes = [];
    for (const text of svg.querySelectorAll('text[data-ng-fill="label"]')) {
      const group = text.previousElementSibling;
      const m = /^translate\(([-\d.e]+), ([-\d.e]+)\)$/.exec(group?.getAttribute("transform") ?? "");
      if (!m) continue;
      const turn = /^rotate\(([-\d.e]+) ([-\d.e]+) ([-\d.e]+)\)$/.exec(text.getAttribute("transform") ?? "");
      const r = text.getBoundingClientRect();
      nodes.push({
        text: text.textContent,
        x: Number(m[1]),
        y: Number(m[2]),
        lx: Number(text.getAttribute("x")),
        ly: Number(text.getAttribute("y")),
        anchor: text.getAttribute("text-anchor"),
        rotation: turn ? Number(turn[1]) : null,
        length: text.getComputedTextLength(),
        inside: r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5,
        font: getComputedStyle(text).fontFamily,
      });
    }
    return { size, center, arcs, nodes };
  });

// Las reglas de 6.1 sobre esa geometría.
function checkLabels({ center, arcs, nodes }) {
  const normalized = (d) => ((d % 360) + 360) % 360;
  const wrong = [];
  let extent = 0;
  let crossing = 0;
  const arcInner = arcs.length ? Math.min(...arcs.map((a) => a.radius - a.width / 2)) : null;
  for (const n of nodes) {
    const angle = (Math.atan2(n.y - center, n.x - center) * 180) / Math.PI;
    const right = n.x - center > 1e-6;
    const left = n.x - center < -1e-6;
    const expectedRotation = left ? angle + 180 : angle;
    const outward = Math.hypot(n.lx - center, n.ly - center) > Math.hypot(n.x - center, n.y - center);
    const along = Math.abs((n.x - center) * (n.ly - n.y) - (n.y - center) * (n.lx - n.x)) < 1e-3;
    const rotationOk = n.rotation !== null && Math.abs(normalized(n.rotation) - normalized(expectedRotation)) < 1e-3;
    const anchorOk = n.anchor === (left ? "end" : "start") || (!right && !left);
    if (!outward || !along || !rotationOk || !anchorOk) wrong.push(`${n.text}: fuera ${outward}, radial ${along}, giro ${n.rotation} (esperado ${expectedRotation.toFixed(2)}), alineación ${n.anchor}`);
    const far = Math.hypot(n.lx - center, n.ly - center) + n.length - Math.hypot(n.x - center, n.y - center);
    extent = Math.max(extent, far);
    if (arcInner !== null && Math.hypot(n.lx - center, n.ly - center) + n.length > arcInner) crossing++;
  }
  return {
    etiquetas: nodes.length,
    malGiradas: wrong.length,
    ejemplos: wrong.slice(0, 5),
    recortadas: nodes.filter((n) => !n.inside).map((n) => n.text).slice(0, 20),
    numeroRecortadas: nodes.filter((n) => !n.inside).length,
    maximoFueraDelAnillo: Math.round(extent * 10) / 10,
    cruzanLosArcos: arcInner === null ? null : crossing,
    fuente: [...new Set(nodes.map((n) => n.font))],
  };
}

// Arcos y rótulos del connectograma grande, contra los hemisferios de sus
// nodos: cada arco cubre su bloque (salvo los 4° y el medio paso de cada
// extremo) y ningún nodo del otro hemisferio queda dentro.
async function arcState(page) {
  const raw = await page.locator(CONNECTOGRAM).evaluate((svg) => {
    const center = Number(svg.getAttribute("width")) / 2;
    const arcs = [...svg.querySelectorAll('path[d*=" A "]')].map((p) => {
      const m = /^M ([-\d.]+) ([-\d.]+) A [-\d.]+ [-\d.]+ 0 [01] 1 ([-\d.]+) ([-\d.]+)$/.exec(p.getAttribute("d"));
      return {
        from: Math.atan2(Number(m[2]) - center, Number(m[1]) - center),
        to: Math.atan2(Number(m[4]) - center, Number(m[3]) - center),
        stroke: p.getAttribute("stroke"),
        ref: p.getAttribute("data-ng-stroke"),
      };
    });
    const titles = [...svg.querySelectorAll("text")]
      .filter((t) => t.textContent === "IZQUIERDO" || t.textContent === "DERECHO")
      .map((t) => ({ text: t.textContent, x: Number(t.getAttribute("x")), anchor: t.getAttribute("text-anchor"), fill: t.getAttribute("fill") }));
    const angles = [];
    for (const text of svg.querySelectorAll('text[data-ng-fill="label"]')) {
      const m = /^translate\(([-\d.e]+), ([-\d.e]+)\)$/.exec(text.previousElementSibling?.getAttribute("transform") ?? "");
      if (m) angles.push(Math.atan2(Number(m[2]) - center, Number(m[1]) - center));
    }
    return { center, arcs, titles, angles, nodes: angles.length };
  });
  return raw;
}

// Con los hemisferios de regions.json en el orden del dibujo: qué arco es de
// cuál y si cubre su bloque.
function checkArcs(raw, hemispheres) {
  const turn = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const step = (2 * Math.PI) / raw.nodes;
  const slack = (4 * Math.PI) / 180 + step / 2 + 1e-6;
  return raw.arcs.map((arc) => {
    const sweep = turn(arc.to - arc.from);
    const inside = (a, margin = 0) => turn(a - (arc.from - margin)) <= sweep + 2 * margin;
    const members = raw.angles.map((a, i) => (inside(a) ? hemispheres[i] : null)).filter(Boolean);
    const hemisphere = members[0] ?? null;
    return {
      hemisferio: hemisphere,
      soloSuyos: members.every((h) => h === hemisphere),
      cubreSuBloque: raw.angles.every((a, i) => hemispheres[i] !== hemisphere || inside(a, slack)),
      mitad: Math.cos(arc.from + sweep / 2) > 0 ? "derecha" : "izquierda",
      color: arc.stroke,
      referencia: arc.ref,
    };
  });
}

// Lo que se espera de los arcos con unos hemisferios: dos bloques seguidos,
// contando que el círculo se cierra, y ninguno nulo. Se calcula aquí, sin
// logic/connectogramLayout.ts, que es lo que se comprueba.
function expectsArcs(hemispheres) {
  if (hemispheres.some((h) => h === null)) return false;
  let changes = 0;
  for (let i = 0; i < hemispheres.length; i++) if (hemispheres[i] !== hemispheres[(i + hemispheres.length - 1) % hemispheres.length]) changes++;
  return changes === 2;
}

async function chooseAtlas(page, label, count) {
  await page.locator(".data-menu__trigger", { hasText: "Atlas" }).click();
  await page.locator('.data-menu__list [role="option"]', { hasText: label }).click();
  await page.locator(".data-status--real").waitFor({ timeout: 120000 });
  await page.waitForFunction(
    ([selector, n]) => document.querySelectorAll(`${selector} g[transform^="translate("] > circle`).length === n,
    [CONNECTOGRAM, count],
    { timeout: 120000 },
  );
  await page.waitForTimeout(1500);
}

const exportButton = (page) => page.locator(".ws-view--main button.export-btn", { hasText: "Exportar JPEG" });

async function download(page, button, file) {
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 90000 }), button.click()]);
  await d.saveAs(out(file));
  return file;
}

// El último <svg> serializado por la exportación, leído como documento.
async function lastSerialized(page, before) {
  return page.evaluate((n) => {
    const text = window.__ngSerialized[n];
    if (!text) return null;
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const root = doc.documentElement;
    const read = (attr, target) => [...doc.querySelectorAll(`[${attr}]`)].map((e) => [e.getAttribute(attr), e.getAttribute(target)]);
    return {
      width: Number(root.getAttribute("width")),
      height: Number(root.getAttribute("height")),
      fontFamily: root.getAttribute("font-family"),
      marcas: doc.querySelectorAll("[data-ng-mark]").length,
      leyenda: text.includes("connectogram-legend") || text.includes("Color del punto"),
      halos: [...doc.querySelectorAll('circle[stroke-opacity="0.35"]')].map((c) => ({ stroke: c.getAttribute("stroke"), ref: c.getAttribute("data-ng-stroke") })),
      arcos: [...doc.querySelectorAll('path[d*=" A "]')].map((p) => p.getAttribute("stroke")),
      rotulos: [...doc.querySelectorAll("text")].filter((t) => /^(IZQUIERDO|DERECHO)$/.test(t.textContent)).map((t) => t.getAttribute("fill")),
      // Las etiquetas de los nodos: las que van tras el grupo de su nodo (los
      // rótulos de los arcos también llevan data-ng-fill="label").
      etiquetasGiradas: [...doc.querySelectorAll('text[data-ng-fill="label"]')].filter(
        (t) => /^translate\(/.test(t.previousElementSibling?.getAttribute("transform") ?? "") && /^rotate\(/.test(t.getAttribute("transform") ?? ""),
      ).length,
      etiquetas: [...doc.querySelectorAll('text[data-ng-fill="label"]')].filter((t) => /^translate\(/.test(t.previousElementSibling?.getAttribute("transform") ?? "")).length,
      paint: [...read("data-ng-fill", "fill"), ...read("data-ng-stroke", "stroke")],
      opacity: read("data-ng-stroke-opacity", "stroke-opacity"),
    };
  }, before);
}

// Los colores de la exportación contra la paleta de exportación del tema
// (spec 4.4): los de hoy con Original y los de Claro con los demás; las
// redes, con la columna de Claro de la paleta suave (la automática de los
// temas 2 a 4) o con NETWORK_COLORS (la de Original).
async function exportColors(page, serialized, theme) {
  const tables = await page.evaluate(async () => ({
    DRAW_TOKENS: (await import("/src/theme/themes.ts")).DRAW_TOKENS,
    SOFT: (await import("/src/theme/softPalettes.ts")).SOFT_NETWORK_COLORS,
    NETWORK_COLORS: (await import("/src/theme/networks.ts")).NETWORK_COLORS,
    EXPORT_FONT_FAMILY: (await import("/src/logic/exportPalette.ts")).EXPORT_FONT_FAMILY,
  }));
  const tokens = theme === "original" ? tables.DRAW_TOKENS.original : tables.DRAW_TOKENS.claro;
  const networks = theme === "original" ? tables.NETWORK_COLORS : tables.SOFT.claro;
  const colorOf = (key) => (Object.hasOwn(networks, key) ? networks[key] : networks.unclassified);
  const wrong = [
    ...serialized.paint.filter(([ref, value]) => (ref.startsWith("net:") ? colorOf(ref.slice(4)) : tokens[ref]) !== value),
    ...serialized.opacity.filter(([ref, value]) => String(tokens[ref]) !== value),
  ];
  return {
    total: serialized.paint.length + serialized.opacity.length,
    distintos: wrong.length,
    ejemplos: wrong.slice(0, 5).map(([ref, value]) => `${ref}=${value}`),
    fuenteDelSistema: serialized.fontFamily === tables.EXPORT_FONT_FAMILY,
    haloConElDeExportacion: serialized.halos.every((h) => h.stroke === tokens.selected && h.ref === "selected"),
    arcosConElDeExportacion: serialized.arcos.every((stroke) => stroke === tokens.edge),
    rotulosConElDeExportacion: serialized.rotulos.every((fill) => fill === tokens.label),
  };
}

// Espera a que la corteza pinte lo que toca (con selección, ella y sus vecinas).
async function waitPainted(page) {
  const selected = (await selectedIds(page)).length > 0;
  const text = selected ? "En color: lo seleccionado y sus vecinos" : "Cada región con el color real de su red";
  await page.locator(".ws-view--main .brain3d-surface-status", { hasText: text }).waitFor({ timeout: 180000 });
  await page.waitForTimeout(3000);
  await page.mouse.move(4, 4);
}

// El lienzo 3D tal como está (preserveDrawingBuffer), en PNG.
async function canvasPng(page, file) {
  const dataUrl = await page.locator(".ws-view--main canvas").first().evaluate((c) => c.toDataURL("image/png"));
  fs.writeFileSync(out(file), Buffer.from(dataUrl.split(",")[1], "base64"));
  return file;
}

// La red Somatomotora de Cole-Anticevic con su ◎ de Filtros, como en la D5:
// 39 regiones. El botón solo se ve con el ratón o el foco encima: se pulsa
// desde la página.
async function selectSomatomotor(page) {
  await page.locator(SOMATOMOTOR).evaluate((b) => b.click());
  await page.waitForTimeout(800);
  return (await selectedIds(page)).length;
}

// ---------------------------------------------------------------- fases --

const reportName = (phase, only) => `${phase}${only ? `-${only}` : ""}.json`;

// Espera al servidor nuevo y guarda, con GET de solo lectura, /regions y
// /connections de HCP-MMP1.0 y /regions de los otros tres atlas. Con
// «antes», solo espera a los dos servidores: los datos ya están, y las dos
// versiones tienen que recibir los mismos. Sale con código 2 si falta algo.
async function phasePreflight(withBefore) {
  const r = {};
  const servers = [["nueva", BASE], ...(withBefore === "antes" ? [["anterior", BASE_ANTES]] : [])];
  for (const [name, base] of servers) {
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
  if (withBefore === "antes") {
    r.datos = fs.existsSync(out("regions.json")) && fs.existsSync(out("connections.json"));
    save("preflight-antes.json", r);
    console.log(JSON.stringify(r));
    if (!r.nueva || !r.anterior || !r.datos) process.exit(2);
    return;
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
    r.otrosAtlas = {};
    for (const [id, , file] of OTHER_ATLASES) {
      const text = await (await fetch(`${API}/regions?atlas_id=${id}`)).text();
      fs.writeFileSync(out(`regions-${file}.json`), text);
      const rows = JSON.parse(text);
      r.otrosAtlas[id] = { regiones: rows.length, hemisferios: rows.map((row) => row.hemisphere) };
    }
    r.backend = r["regions.json"] > 0;
  } catch (e) {
    r.backend = false;
    r.backendError = String(e);
  }
  save("preflight.json", r);
  console.log(JSON.stringify({ ...r, otrosAtlas: Object.keys(r.otrosAtlas ?? {}) }));
  if (!r.nueva || !r.backend) process.exit(2);
}

// Etiquetas radiales (6.1) a los cuatro tamaños, en Grafito: giro, alineación,
// hacia fuera, dentro del dibujo y sin cruzar los arcos; y la fuente de las
// etiquetas del connectograma y de los hemisferios.
async function phaseEtiquetas() {
  const report = {};
  await recording("etiquetas.json", report, async (checkpoint) => {
    const { browser, page, errors, expected } = await launch();
    report.errors = errors;
    report.erroresEsperados = expected;
    try {
      await load(page, BASE, "grafito");
      await setWeightPosition(page, WEIGHT_POSITION);
      await enlarge(page, "Connectograma");
      for (const [width, height] of SIZES) {
        const tag = `${width}x${height}`;
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(900);
        await page.mouse.move(4, 4);
        report[tag] = checkLabels(await labelGeometry(page));
        await page.locator(".ws-view--main").screenshot({ path: out(`etiquetas-${tag}.png`) });
        checkpoint();
      }
      await enlarge(page, "Hemisferios");
      report.fuenteHemisferios = await page
        .locator(HEMISPHERES)
        .evaluate((svg) => [...new Set([...svg.querySelectorAll('text[data-ng-fill="label"]')].map((t) => getComputedStyle(t).fontFamily))]);
    } finally {
      await browser.close();
    }
  });
}

// Arcos de hemisferio (6.1): en HCP-MMP1.0 sí, en los otros tres atlas no. Lo
// esperado sale de los hemisferios que da el backend, en su orden.
async function phaseArcos() {
  const report = {};
  await recording("arcos.json", report, async (checkpoint) => {
    const preflight = JSON.parse(fs.readFileSync(out("preflight.json"), "utf8"));
    const { browser, page, errors, expected } = await launch();
    report.errors = errors;
    report.erroresEsperados = expected;
    try {
      await load(page, BASE, "grafito");
      await setWeightPosition(page, WEIGHT_POSITION);
      await enlarge(page, "Connectograma");
      const tokens = await drawTokens(page, "grafito");
      const hcp = JSON.parse(fs.readFileSync(out("regions.json"), "utf8")).map((row) => row.hemisphere);
      const raw = await arcState(page);
      report.hcp = {
        esperado: expectsArcs(hcp),
        arcos: checkArcs(raw, hcp),
        rotulos: raw.titles,
        colorEsperado: tokens.edge,
        rotuloEsperado: tokens.label,
      };
      await page.locator(".ws-view--main").screenshot({ path: out("arcos-hcp.png") });
      checkpoint();
      for (const [id, label, file] of OTHER_ATLASES) {
        const { regiones, hemisferios } = preflight.otrosAtlas[id];
        await chooseAtlas(page, label, regiones);
        const other = await arcState(page);
        report[id] = { esperado: expectsArcs(hemisferios), nodos: other.nodes, arcos: other.arcs.length, rotulos: other.titles.length };
        await page.locator(".ws-view--main").screenshot({ path: out(`arcos-${file}.png`) });
        checkpoint();
      }
    } finally {
      await browser.close();
    }
  });
}

// Halo de la región seleccionada y marcas que siguen a las etiquetas, en el
// dibujo y en la lupa. El caso es un tema.
async function phaseHalo(theme) {
  const report = {};
  await recording(reportName("halo", theme), report, async (checkpoint) => {
    const { browser, page, errors, expected } = await launch();
    report.errors = errors;
    report.erroresEsperados = expected;
    try {
      await load(page, BASE, theme);
      await setWeightPosition(page, WEIGHT_POSITION);
      await enlarge(page, "Connectograma");
      const tokens = await drawTokens(page, theme);
      report.seleccion = await clickNode(page, RIGHT);
      report.marcas = [await clickNode(page, RIGHT, true), await clickNode(page, LEFT, true)];
      await page.mouse.move(4, 4);
      await page.waitForTimeout(400);
      const raw = await page.locator(CONNECTOGRAM).evaluate((svg) => {
        const attrs = (e) => (e ? Object.fromEntries([...e.attributes].map((a) => [a.name, a.value])) : null);
        const box = (e) => {
          const b = e.getBBox();
          return { x: b.x, y: b.y, width: b.width, height: b.height };
        };
        const nodeGroups = [...svg.querySelectorAll('g[transform^="translate("]')];
        const lens = svg.querySelector(".connectogram-lens__bg")?.parentElement ?? null;
        // Cada región marcada: su anillo (centrado en el nodo), la etiqueta de
        // siempre de ese nodo y la de encima, sobre su pastilla.
        const marks = [];
        for (const group of svg.querySelectorAll("g[data-ng-mark] > g")) {
          const ring = group.querySelector(":scope > circle");
          const text = group.querySelector("g[data-ng-mark] > text");
          if (!ring || !text) continue;
          const node = nodeGroups.find((g) => g.getAttribute("transform") === `translate(${ring.getAttribute("cx")}, ${ring.getAttribute("cy")})`);
          marks.push({
            texto: text.textContent,
            anillo: attrs(ring),
            marca: attrs(text),
            cajaMarca: box(text),
            pastilla: attrs(text.previousElementSibling),
            cajaPastilla: box(text.previousElementSibling),
            nodo: attrs(node?.querySelector("circle")),
            etiqueta: attrs(node?.nextElementSibling),
          });
        }
        return {
          halos: [...svg.querySelectorAll('circle[stroke-opacity="0.35"]')].filter((c) => !lens?.contains(c)).map(attrs),
          seleccionados: nodeGroups
            .filter((g) => g.querySelector("circle")?.getAttribute("stroke-width") === "2.5")
            .map((g) => ({ transform: g.getAttribute("transform"), nodo: attrs(g.querySelector("circle")) })),
          marks,
        };
      });
      report.dibujo = raw;
      const outer = (c) => Number(c.r) + Number(c["stroke-width"]) / 2;
      const inner = (c) => Number(c.r) - Number(c["stroke-width"]) / 2;
      const [halo] = raw.halos;
      const [selected] = raw.seleccionados;
      report.halo = {
        uno: raw.halos.length === 1 && raw.seleccionados.length === 1,
        centrado: Boolean(halo && selected) && selected.transform === `translate(${halo.cx}, ${halo.cy})`,
        color: halo ? [halo.stroke, halo["data-ng-stroke"], halo["stroke-opacity"]] : null,
        colorEsperado: [tokens.selected, "selected", "0.35"],
        fueraDelContorno: Boolean(halo && selected) && inner(halo) > outer(selected.nodo),
      };
      report.marcasSiguen = raw.marks.map((m) => ({
        texto: m.texto,
        igual: ["x", "y", "transform", "text-anchor", "font-size", "font-weight"].every((k) => m.etiqueta && m.marca[k] === m.etiqueta[k]),
        pastillaGirada: m.pastilla?.transform === m.etiqueta?.transform,
        pastillaTapa:
          m.cajaPastilla.x <= m.cajaMarca.x &&
          m.cajaPastilla.y <= m.cajaMarca.y &&
          m.cajaPastilla.x + m.cajaPastilla.width >= m.cajaMarca.x + m.cajaMarca.width &&
          m.cajaPastilla.y + m.cajaPastilla.height >= m.cajaMarca.y + m.cajaMarca.height,
        seleccionada: m.nodo?.["stroke-width"] === "2.5",
        // El anillo de la marca, justo por fuera del contorno (5.9), y su
        // borde de fuera, por dentro del del halo, que se ve alrededor.
        anilloFueraDelContorno: m.nodo ? inner(m.anillo) > outer(m.nodo) : null,
        haloAsomaPorFuera: m.nodo?.["stroke-width"] === "2.5" && halo ? outer(m.anillo) < outer(halo) : null,
      }));
      await page.locator(CONNECTOGRAM).screenshot({ path: out(`halo-${theme}.png`) });
      checkpoint();
      // La lupa, sobre la región seleccionada: el halo y el anillo de marca,
      // también ampliados.
      await page.locator(".ws-view--main button.export-btn", { hasText: "Lupa" }).click();
      const center = await page.locator(CONNECTOGRAM).evaluate((svg) => {
        const circle = svg.querySelector('g[transform^="translate("] > circle[stroke-width="2.5"]');
        if (!circle) return null;
        const r = circle.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      if (center) {
        await page.mouse.move(center.x + 0.5, center.y + 0.5);
        await page.waitForTimeout(500);
        // El halo de la lupa, por su color: la guía del anillo de la lupa
        // también lleva stroke-opacity 0,35.
        report.lupa = await page.locator(CONNECTOGRAM).evaluate((svg, selected) => {
          const lens = svg.querySelector(".connectogram-lens__bg")?.parentElement;
          if (!lens) return null;
          const ring = (c) => ({ cx: c.getAttribute("cx"), r: Number(c.getAttribute("r")), width: Number(c.getAttribute("stroke-width")) });
          return {
            halos: [...lens.querySelectorAll(`circle[stroke-opacity="0.35"][stroke="${selected}"]`)].map(ring),
            anillos: [...lens.querySelectorAll("circle[data-ng-mark]")].map(ring),
          };
        }, tokens.selected);
        // En la lupa, como en el dibujo: el anillo de la marca por dentro del
        // borde de fuera del halo.
        const lensHalo = report.lupa?.halos[0];
        const lensRing = report.lupa?.anillos.find((r) => r.cx === lensHalo?.cx);
        report.lupa = {
          ...report.lupa,
          haloVisible: report.lupa?.halos.length === 1,
          haloAsomaPorFuera: lensHalo && lensRing ? lensRing.r + lensRing.width / 2 < lensHalo.r + lensHalo.width / 2 : null,
        };
        const box = await page.locator(CONNECTOGRAM).boundingBox();
        await page.screenshot({ path: out(`halo-${theme}-lupa.png`), clip: { x: Math.max(box.x, center.x - 130), y: Math.max(box.y, center.y - 130), width: 260, height: 260 } });
      } else {
        notVerified.push("lupa: no se encontró la región seleccionada");
      }
    } finally {
      await browser.close();
    }
  });
}

// La leyenda (5.4) a los cuatro tamaños: en la vista grande sí y en la
// miniatura no, sus entradas, sin eventos, y qué tapa del dibujo.
async function phaseLeyenda() {
  const report = {};
  await recording("leyenda.json", report, async (checkpoint) => {
    const { browser, page, errors, expected } = await launch();
    report.errors = errors;
    report.erroresEsperados = expected;
    try {
      await load(page, BASE, "grafito");
      await setWeightPosition(page, WEIGHT_POSITION);
      for (const [width, height] of SIZES) {
        const tag = `${width}x${height}`;
        await page.setViewportSize({ width, height });
        await enlarge(page, "Connectograma");
        await page.waitForTimeout(900);
        report[tag] = await page.evaluate((selector) => {
          const legend = document.querySelector(".ws-view--main .connectogram-legend");
          const svg = document.querySelector(selector);
          if (!legend || !svg) return { leyenda: Boolean(legend) };
          const r = legend.getBoundingClientRect();
          const hits = (e) => {
            const b = e.getBoundingClientRect();
            return b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom;
          };
          const circles = [...svg.querySelectorAll('g[transform^="translate("] > circle')];
          const labels = [...svg.querySelectorAll('text[data-ng-fill="label"]')];
          const under = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
          return {
            leyenda: true,
            entradas: [...legend.querySelectorAll("li")].map((li) => li.textContent),
            discontinua: legend.querySelector("li path")?.getAttribute("stroke-dasharray") ?? null,
            caja: { izquierda: Math.round(r.left), arriba: Math.round(r.top), ancho: Math.round(r.width), alto: Math.round(r.height) },
            letraEnRem: parseFloat(getComputedStyle(legend).fontSize) / root,
            sinEventos: !legend.contains(under),
            fueraDelSvg: !svg.contains(legend),
            nodosTapados: circles.filter(hits).length,
            etiquetasTapadas: labels.filter(hits).length,
            nodos: circles.length,
          };
        }, CONNECTOGRAM);
        if (report[tag].entradas) report[tag].entradasBien = JSON.stringify(report[tag].entradas) === JSON.stringify(LEGEND_TEXTS);
        await page.locator(".ws-view--main").screenshot({ path: out(`leyenda-${tag}.png`) });
        await enlarge(page, "Hemisferios");
        report[tag].enLaMiniatura = await page.locator('.ws-view--thumb[data-view="connectogram"] .connectogram-legend').count();
        checkpoint();
      }
    } finally {
      await browser.close();
    }
  });
}

// Exportación de los SVG con una región seleccionada y marcada. El caso es
// un tema (grafito u original).
async function phaseExportar(theme) {
  const report = {};
  await recording(reportName("exportar", theme), report, async (checkpoint) => {
    const { browser, page, errors, expected } = await launch();
    report.errors = errors;
    report.erroresEsperados = expected;
    const warnings = [];
    page.on("console", (m) => m.type() === "warning" && m.text().startsWith("Exportación:") && warnings.push(m.text()));
    report.avisosDeExportacion = warnings;
    try {
      await load(page, BASE, theme);
      await setWeightPosition(page, WEIGHT_POSITION);
      await enlarge(page, "Connectograma");
      report.seleccion = await clickNode(page, RIGHT);
      report.marca = await clickNode(page, RIGHT, true);
      for (const [view, file] of [["Connectograma", `exportar-${theme}-connectograma.jpg`], ["Hemisferios", `exportar-${theme}-hemisferios.jpg`]]) {
        await enlarge(page, view);
        const before = await page.evaluate(() => window.__ngSerialized.length);
        await download(page, exportButton(page), file);
        const serialized = await lastSerialized(page, before);
        report[view] = serialized
          ? { jpeg: file, ancho: serialized.width, alto: serialized.height, ...serialized, paint: undefined, opacity: undefined, colores: await exportColors(page, serialized, theme) }
          : { fallo: "la exportación no serializó ningún SVG" };
        checkpoint();
      }
    } finally {
      await browser.close();
    }
  });
}

// Lo mismo que antes de la fase, con los mismos datos y sin selección: la
// geometría y los datos del connectograma, y los hemisferios. El caso es
// «versión-tema»: antes-grafito, nueva-grafito, antes-original o
// nueva-original.
async function phaseIgual(only) {
  const report = {};
  await recording(reportName("igual", only), report, async () => {
    const [version, theme] = only.split("-");
    const { browser, page, errors, expected } = await launch();
    report.errors = errors;
    report.erroresEsperados = expected;
    try {
      await load(page, version === "antes" ? BASE_ANTES : BASE, theme);
      await setWeightPosition(page, WEIGHT_POSITION);
      await enlarge(page, "Connectograma");
      // Nodos (posición, radio, colores y trazo) y líneas (trazado, color,
      // opacidad, grosor y discontinuo), en el orden del dibujo.
      const geometry = await page.locator(CONNECTOGRAM).evaluate((svg) => {
        const pick = (e, names) => names.map((n) => e.getAttribute(n));
        return {
          ancho: svg.getAttribute("width"),
          nodos: [...svg.querySelectorAll('g[transform^="translate("] > circle')].map((c) => [
            c.parentElement.getAttribute("transform"),
            ...pick(c, ["r", "fill", "stroke", "stroke-width"]),
          ]),
          lineas: [...svg.querySelectorAll('path[d*=" Q "]')].map((p) => pick(p, ["d", "stroke", "stroke-opacity", "stroke-width", "stroke-dasharray", "marker-end"])),
        };
      });
      fs.writeFileSync(out(`igual-${only}-connectograma.json`), JSON.stringify(geometry));
      report.connectograma = { nodos: geometry.nodos.length, lineas: geometry.lineas.length, ancho: geometry.ancho };
      await enlarge(page, "Hemisferios");
      await page.locator(HEMISPHERES).screenshot({ path: out(`igual-${only}-hemisferios.png`) });
      await download(page, exportButton(page), `igual-${only}-hemisferios.jpg`);
    } finally {
      await browser.close();
    }
  });
}

// Surcos (6.3): los percentiles que calcula la app con el archivo de verdad,
// contra los calculados aquí, y cuántos vértices quedan cerca del gris del
// surco o del giro antes y después. Sin WebGL: solo lógica.
async function phaseSurcos() {
  const report = {};
  await recording("surcos.json", report, async () => {
    const file = JSON.parse(fs.readFileSync(process.env.SULC_FILE, "utf8"));
    const values = file.values.filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
    const pct = (p) => {
      const pos = (p / 100) * (values.length - 1);
      const lo = Math.floor(pos);
      const hi = Math.min(lo + 1, values.length - 1);
      return values[lo] + (values[hi] - values[lo]) * (pos - lo);
    };
    const [p5, p95] = [pct(5), pct(95)];
    const [min, max] = [values[0], values[values.length - 1]];
    const smooth = (t) => {
      const c = Math.min(1, Math.max(0, t));
      return c * c * (3 - 2 * c);
    };
    const share = (f) => values.filter((v) => f(v) <= 0.1 || f(v) >= 0.9).length / values.length;
    report.esperado = { p5, p95, min, max };
    report.cercaDeLosExtremos = {
      antes: Math.round(share((v) => (v - min) / (max - min)) * 1000) / 10,
      despues: Math.round(share((v) => smooth((v - p5) / (p95 - p5))) * 1000) / 10,
    };
    const { browser, page, errors, expected } = await launch();
    report.errors = errors;
    report.erroresEsperados = expected;
    try {
      await load(page, BASE, "grafito");
      report.app = await page.evaluate(async () => {
        const m = await import("/src/logic/surfaceParcels.ts");
        const raw = await (await fetch("/parcels/fslr32k_sulc.json")).json();
        const sulc = m.parseSulcFile(raw, raw.values.length);
        return { rango: m.sulcRange(sulc), mismaVez: m.sulcRange(sulc) === m.sulcRange(sulc) };
      });
      report.coincide = Boolean(report.app.rango) && Math.abs(report.app.rango[0] - p5) < 1e-6 && Math.abs(report.app.rango[1] - p95) < 1e-6;
    } finally {
      await browser.close();
    }
  });
}

// El cerebro 3D con la red Somatomotora (6.3), en un solo navegador por tema:
// la fuente y su versión, los colores de la textura en un <canvas> de
// verdad, capturas, y la exportación, con la pantalla igual antes y después.
// Con Grafito, además, el cambio de tema en vivo. El caso es un tema
// (grafito u original).
async function phaseCerebro3d(theme) {
  const report = {};
  await recording(reportName("cerebro3d", theme), report, async (checkpoint) => {
    const { browser, page, errors } = await launch({ webgl: true, width: 1024, height: 768 });
    report.errors = errors;
    try {
      await load(page, BASE, theme);
      await enlarge(page, "Cerebro 3D");
      report.seleccion = await selectSomatomotor(page);
      await waitPainted(page);
      report.textura = await page.evaluate(async (t) => {
        const { getLabelTexture, LABEL_FONT } = await import("/src/logic/textSprite.ts");
        const { DRAW_TOKENS } = await import("/src/theme/themes.ts");
        const { useLabelFontStore } = await import("/src/state/labelFont.ts");
        const version = useLabelFontStore.getState().version;
        const tokens = DRAW_TOKENS[t];
        const { texture } = getLabelTexture("IFJa", { background: tokens.label3dBackground, color: tokens.label3dText }, version);
        const canvas = texture.image;
        const ctx = canvas.getContext("2d");
        const row = Math.round(canvas.height / 2);
        // Fondo: un punto de la pastilla antes del texto. Texto: el píxel de la
        // fila del medio más distinto del fondo.
        const background = [...ctx.getImageData(Math.round(canvas.height * 0.25), row, 1, 1).data];
        const line = ctx.getImageData(0, row, canvas.width, 1).data;
        let best = null;
        let bestDiff = -1;
        for (let x = 0; x < canvas.width; x++) {
          const px = [line[4 * x], line[4 * x + 1], line[4 * x + 2], line[4 * x + 3]];
          const diff = Math.abs(px[0] - background[0]) + Math.abs(px[1] - background[1]) + Math.abs(px[2] - background[2]);
          if (px[3] > 200 && diff > bestDiff) {
            bestDiff = diff;
            best = px;
          }
        }
        // Los colores esperados, de los tokens: #rrggbb y rgba(r, g, b, a).
        const rgba = (value) => {
          const hex = /^#([0-9a-f]{6})$/i.exec(value);
          if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(255);
          const m = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(value);
          return [Number(m[1]), Number(m[2]), Number(m[3]), Math.round(Number(m[4]) * 255)];
        };
        const near = (a, b, tolerance) => Boolean(a) && a.every((v, i) => Math.abs(v - b[i]) <= tolerance);
        const expectedBackground = rgba(tokens.label3dBackground);
        const expectedText = rgba(tokens.label3dText);
        return {
          version,
          fuenteCargada: document.fonts.check(LABEL_FONT),
          fondo: background,
          texto: best,
          fondoEsperado: expectedBackground,
          textoEsperado: expectedText,
          fondoBien: near(background, expectedBackground, 3),
          textoBien: near(best?.slice(0, 3), expectedText.slice(0, 3), 12),
        };
      }, theme);
      checkpoint();
      await page.locator(".ws-view--main").screenshot({ path: out(`cerebro3d-${theme}.png`) });
      report.lienzo = await page.locator(".ws-view--main canvas").first().evaluate((c) => [c.width, c.height]);
      await canvasPng(page, `cerebro3d-${theme}-antes.png`);
      await download(page, exportButton(page), `cerebro3d-${theme}.jpg`);
      await page.waitForTimeout(2000);
      await page.mouse.move(4, 4);
      await canvasPng(page, `cerebro3d-${theme}-despues.png`);
      checkpoint();
      // Cambiar de tema en vivo: las etiquetas se vuelven a dibujar con el
      // nuevo (se mira en la captura).
      if (theme === "grafito") {
        await page.evaluate(async () => (await import("/src/state/appearance.ts")).useAppearanceStore.getState().setTheme("claro"));
        await page.waitForTimeout(3000);
        await page.mouse.move(4, 4);
        await page.locator(".ws-view--main").screenshot({ path: out("cerebro3d-grafito-a-claro.png") });
      }
    } finally {
      await browser.close();
    }
  });
}

const phases = {
  preflight: phasePreflight,
  etiquetas: phaseEtiquetas,
  arcos: phaseArcos,
  halo: phaseHalo,
  leyenda: phaseLeyenda,
  exportar: phaseExportar,
  igual: phaseIgual,
  surcos: phaseSurcos,
  cerebro3d: phaseCerebro3d,
};
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
```

Crea `$D/comparar.py`:

```python
"""Comparaciones de la verificación de la fase 4 (Task 9 de
docs/rediseno-interfaz-plan-fase4.md). Lee las imágenes y los JSON de su
carpeta y escribe comparar.json. Necesita numpy y Pillow (los tiene el
python3 de pyenv de esta máquina).

- «jpeg»: cada JPEG se decodifica, mide lo esperado y tiene las esquinas
  blancas.
- «pantalla3d»: el lienzo 3D, igual píxel a píxel antes y después de exportar.
- «igual»: sin selección y con los mismos datos, en Grafito, el connectograma
  dibuja los mismos nodos y las mismas líneas que antes de la fase, y los
  hemisferios salen iguales, en pantalla (píxel a píxel) y en el JPEG (byte a
  byte).
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

D = Path(__file__).parent


def missing(*names):
    lost = [n for n in names if not (D / n).exists()]
    return {"sinComprobar": f"falta {', '.join(lost)}"} if lost else None


def read_json(name):
    return json.loads((D / name).read_text()) if (D / name).exists() else None


def jpeg(name, size):
    if missing(name):
        return missing(name)
    image = np.asarray(Image.open(D / name).convert("RGB"), dtype=int)
    height, width = image.shape[:2]
    corners = [image[3, 3], image[3, -4], image[-4, 3], image[-4, -4]]
    return {
        "tamano": [width, height],
        "tamanoEsperado": list(size) if size else None,
        "tamanoBien": size is None or [width, height] == list(size),
        "esquinasBlancas": all(int(c.min()) >= 250 for c in corners),
    }


def same_bytes(a, b):
    return missing(a, b) or {"igual": (D / a).read_bytes() == (D / b).read_bytes()}


def pixels(a, b):
    if missing(a, b):
        return missing(a, b)
    A = np.asarray(Image.open(D / a).convert("RGB"), dtype=int)
    B = np.asarray(Image.open(D / b).convert("RGB"), dtype=int)
    if A.shape != B.shape:
        return {"tamanosDistintos": [list(A.shape[:2]), list(B.shape[:2])]}
    d = np.abs(A - B).max(axis=2)
    return {"tamano": list(A.shape[:2]), "pxDistintos": int((d > 0).sum()), "max": int(d.max())}


report = {"jpeg": {}, "pantalla3d": {}, "igual": {}}

for theme in ("grafito", "original"):
    exported = read_json(f"exportar-{theme}.json") or {}
    for view, key in (("connectograma", "Connectograma"), ("hemisferios", "Hemisferios")):
        info = exported.get(key) or {}
        size = (info["ancho"] * 3, info["alto"] * 3) if "ancho" in info else None
        report["jpeg"][f"{theme} {view}"] = jpeg(f"exportar-{theme}-{view}.jpg", size)
    three = read_json(f"cerebro3d-{theme}.json") or {}
    report["jpeg"][f"{theme} cerebro3d"] = jpeg(f"cerebro3d-{theme}.jpg", three.get("lienzo"))
    report["pantalla3d"][theme] = pixels(f"cerebro3d-{theme}-antes.png", f"cerebro3d-{theme}-despues.png")

for theme in ("grafito",):
    before = read_json(f"igual-antes-{theme}-connectograma.json")
    after = read_json(f"igual-nueva-{theme}-connectograma.json")
    if before is None or after is None:
        report["igual"][f"{theme} connectograma"] = {"sinComprobar": "falta algún JSON de igual"}
    else:
        different = [i for i, (a, b) in enumerate(zip(before["nodos"], after["nodos"])) if a != b]
        report["igual"][f"{theme} connectograma"] = {
            "igual": before == after,
            "nodos": [len(before["nodos"]), len(after["nodos"])],
            "lineas": [len(before["lineas"]), len(after["lineas"])],
            "ancho": [before["ancho"], after["ancho"]],
            "nodosDistintos": different[:5],
            "lineasIguales": before["lineas"] == after["lineas"],
        }
    report["igual"][f"{theme} hemisferios pantalla"] = pixels(f"igual-antes-{theme}-hemisferios.png", f"igual-nueva-{theme}-hemisferios.png")
    report["igual"][f"{theme} hemisferios jpeg"] = same_bytes(f"igual-antes-{theme}-hemisferios.jpg", f"igual-nueva-{theme}-hemisferios.jpg")

(D / "comparar.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
print(json.dumps(report, indent=2, ensure_ascii=False))
```

```bash
sh -n "$D/antes-de-lanzar.sh" && node --check "$D/verify-fase4.cjs" && python3 -m py_compile "$D/comparar.py" && echo "scripts correctos"
```

La Task 9 sigue con esta misma carpeta `$D` y con el servidor en marcha. Si la hace otro agente, pásale la ruta de `$D` y el identificador del servidor.

## Chunk 4: verificación en la app real, fases e informe

### Task 9: verificación en la app real: fases, informe y cierre

**Files:**
- Create: en la carpeta `$D` de la Task 8, los JSON, las capturas, `comparar.json` e `informe.md`. Nada de esto entra en el repositorio.
- Modify: solo si algo sale «distinto» por un fallo de la fase (Step 7), los archivos de la tarea de la que venga.

Sigue a la Task 8, con su carpeta `$D` y el servidor 5291 en marcha. Sus reglas y su «Honestidad» valen igual aquí. Si no la sigue enseguida (por ejemplo, si pasa a otro momento del día), quien coordina vuelve a preguntar al usuario si puede usar la máquina.

**Cada fase, por separado:** primero la comprobación de recursos y después la orden, con `timeout 570` y el tiempo límite de la herramienta en 600000 ms (o en segundo plano). Tras cada una, quita los navegadores que hayan quedado, vacía `$D/tmp` y compruébalo. Las fases van de más a menos importante: si hay que parar antes, lo que falte queda «sin comprobar».

Antes de cada fase:

```bash
sh "$D/antes-de-lanzar.sh"
```

Si sale con 1 (poca memoria u otro navegador sin interfaz en marcha), no lances: espera y vuelve a comprobar.

Después de cada fase:

```bash
pkill -f -- "$(basename "$D")/[t]mp"; pgrep -fa "$(basename "$D")/[t]mp" || { rm -rf "$D/tmp"/* && echo "ningún navegador suelto; tmp vacío"; }
```

- [ ] **Step 1: las fases 2D, sin WebGL**

La primera guarda los datos:

```bash
cd "$D" && PORT=5291 PORT_ANTES=5292 TMPDIR="$D/tmp" timeout 570 nice -n 19 node verify-fase4.cjs preflight
```

Expected: `"nueva":true`, `"regions.json":360`, `"connections.json":64620`, `"backend":true` y los tres `otrosAtlas`, o las cifras que haya: apúntalas. Si sale con código 2, falta el servidor o el backend: no sigas y dilo. Esta fase no abre navegador: guarda `/regions` y `/connections` de HCP-MMP1.0 y `/regions` de los otros tres atlas, que las fases sirven desde esos archivos (el backend no ordena las filas, y los arcos dependen del orden).

Después, una orden por fase, con la misma forma (`… nice -n 19 node verify-fase4.cjs <fase> [caso]`), en este orden:

- `etiquetas`;
- `arcos`;
- `halo grafito` y `halo claro`;
- `leyenda`;
- `exportar grafito` y `exportar original`;
- `surcos`, con `SULC_FILE=/home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4/frontend/public/parcels/fslr32k_sulc.json` delante de `timeout`.

Cada una termina con `hecho` o con `hecho; sin comprobar: …`. Si una falla, su JSON guarda el error en `fallo`: mira si es del script (un selector, una espera) o de la fase, antes de seguir.

- [ ] **Step 2: las fases 3D**

Las mismas reglas: `cerebro3d grafito` y `cerebro3d original`. Cada una hace, en un solo navegador, las etiquetas, las capturas y la exportación.

- [ ] **Step 3: lo mismo que antes, con la versión anterior**

Comprueba los recursos (`sh "$D/antes-de-lanzar.sh"`), arranca el servidor de «antes» en segundo plano y apunta su identificador:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes/frontend && nice -n 19 npx vite --port 5292 --strictPort
```

Después, las fases, cada una con la comprobación de recursos y la limpieza:

```bash
cd "$D" && PORT=5291 PORT_ANTES=5292 TMPDIR="$D/tmp" timeout 570 nice -n 19 node verify-fase4.cjs preflight antes
```

Expected: `"nueva":true`, `"anterior":true` y `"datos":true`. No vuelve a pedir datos: las dos versiones reciben los mismos. Luego `igual antes-grafito` e `igual nueva-grafito`.

Al terminar, para el servidor de «antes» con la herramienta de tareas, y comprueba:

```bash
ss -ltn | grep -E ':5292 ' || echo "5292 libre"
```

Solo si sigue ocupado: `pkill -f -- "vite --port 529[2] "`, y vuelve a comprobarlo en otra orden.

- [ ] **Step 4: las comparaciones de imágenes**

```bash
cd "$D" && python3 comparar.py > /dev/null && echo "comparar.json escrito"
```

- [ ] **Step 5: mirar las capturas**

Ábrelas con la herramienta de lectura de imágenes. Anota lo que veas, bien o mal:

- `etiquetas-<tamaño>.png` (4): etiquetas giradas en todo el círculo, que se leen de izquierda a derecha en las dos mitades y no se salen del dibujo; los arcos y sus rótulos.
- `arcos-hcp.png`: IZQUIERDO a la izquierda y DERECHO a la derecha, cada arco sobre su mitad, con su hueco arriba y abajo. `arcos-brainnetome.png`, `arcos-gordon333.png` y `arcos-subcortex.png`: sin arcos; anota cuánto se cortan sus etiquetas largas (pregunta 2).
- `halo-<tema>.png` (2) y `halo-<tema>-lupa.png` (2): el halo de IFJa (der.), tenue, sin tapar su etiqueta; el anillo de su marca, donde estaba, encima del halo, que asoma por fuera; la pastilla de V1 (izq.) y la de IFJa sobre su etiqueta, giradas con ella.
- `leyenda-<tamaño>.png` (4): la leyenda legible en su esquina, y qué tapa (pregunta 1).
- `cerebro3d-<tema>.png` (2) y `cerebro3d-grafito-a-claro.png`: las etiquetas con la letra nueva, sobre su pastilla del tema, legibles sobre la corteza; los surcos, más marcados que en las capturas de la D5; y, tras pasar a Claro en vivo, las etiquetas con el estilo de Claro.
- Los JPEG, `exportar-<tema>-connectograma.jpg`, `exportar-<tema>-hemisferios.jpg` y `cerebro3d-<tema>.jpg`: fondo blanco, halo y arcos con los colores de exportación, sin marcas ni leyenda; en el 3D, las etiquetas con la pastilla de exportación (con Original, oscura: pregunta 3).

- [ ] **Step 6: el informe**

Escribe `$D/informe.md`. Empieza por cuándo y cómo dio permiso el usuario (Step 0 de la Task 8), HEAD, la base y cómo se construyó «antes». Después, una tabla: cada comprobación, «visto», «distinto» o «sin comprobar», y de dónde sale.

| Comprobación | Dónde | «Visto» si |
|---|---|---|
| Datos | `preflight.json`, `preflight-antes.json` | El servidor (y el anterior) y el backend responden; anota las cifras. |
| Etiquetas radiales | `etiquetas.json` | En los cuatro tamaños: `malGiradas` 0, `numeroRecortadas` 0 y `cruzanLosArcos` 0, con `etiquetas` 360. Anota `maximoFueraDelAnillo`. |
| Tipografía de los dibujos | `etiquetas.json`, `fuente` y `fuenteHemisferios` | Las dos listas empiezan por `"Atkinson Hyperlegible Next"`. |
| Arcos con HCP-MMP1.0 | `arcos.json`, `hcp` | `esperado` true; dos arcos, uno por hemisferio, con `soloSuyos` y `cubreSuBloque` true, el `R` en la mitad derecha y el `L` en la izquierda; `color` igual a `colorEsperado` y `referencia` `edge`; IZQUIERDO con `x` pequeña y `start`, DERECHO con `x` grande y `end`, los dos con `rotuloEsperado`. |
| Sin arcos en los demás atlas | `arcos.json`, los otros tres | `esperado` false, y `arcos` y `rotulos` 0, con `nodos` igual a sus regiones. |
| Halo, Grafito y Claro | `halo-<tema>.json`, `halo` | `seleccion` true; `uno`, `centrado` y `fueraDelContorno` true; `color` igual a `colorEsperado`. |
| Marcas que siguen a sus etiquetas, Grafito y Claro | `halo-<tema>.json`, `marcas` y `marcasSiguen` | `marcas` [true, true]; en IFJa y V1, `igual`, `pastillaGirada`, `pastillaTapa` y `anilloFueraDelContorno` true; en IFJa, `seleccionada` y `haloAsomaPorFuera` true. |
| Halo y marca en la lupa | `halo-<tema>.json`, `lupa` | `haloVisible` y `haloAsomaPorFuera` true. |
| Leyenda | `leyenda.json` | En los cuatro tamaños: `leyenda`, `entradasBien`, `sinEventos` y `fueraDelSvg` true; `discontinua` `3 3`; `letraEnRem` de al menos 0,7; `enLaMiniatura` 0. |
| Lo que tapa la leyenda | `leyenda.json` | No es de «visto»: copia, para la D y el usuario, `nodosTapados`, `etiquetasTapadas` y `caja` de cada tamaño. |
| Exportación de los SVG | `exportar-<tema>.json` | En el connectograma: `marcas` 0, `leyenda` false, un halo, dos arcos, dos rótulos, `etiquetasGiradas` igual a `etiquetas`, y en `colores`: `distintos` 0, `fuenteDelSistema`, `haloConElDeExportacion`, `arcosConElDeExportacion` y `rotulosConElDeExportacion` true. En los hemisferios: `marcas` 0, sin halos ni arcos y `distintos` 0. `avisosDeExportacion` vacío. |
| JPEG | `comparar.json`, `jpeg` | `tamanoBien` y `esquinasBlancas` true en los seis. |
| Igual que antes | `comparar.json`, `igual` | Con Grafito: el connectograma, `igual` true (mismos nodos, mismas líneas, mismo ancho); los hemisferios, `pxDistintos` 0 en pantalla e `igual` true en el JPEG. |
| Surcos | `surcos.json` | `coincide` y `app.mismaVez` true; anota `cercaDeLosExtremos` (antes y después). |
| Etiquetas del 3D, Grafito y Original | `cerebro3d-<tema>.json` | `seleccion` 39; `textura.version` de 1 o más; `fuenteCargada`, `fondoBien` y `textoBien` true. |
| Exportación del 3D | `comparar.json`, `pantalla3d` y `jpeg` | `pxDistintos` 0 (la pantalla, igual antes y después de exportar); el JPEG, del tamaño del lienzo y con las esquinas blancas. |
| Consola | `errors` de cada JSON | Vacía. `erroresEsperados`, solo en las fases 2D y solo del lienzo 3D sin WebGL. Si sale otra cosa, cópiala tal cual. |
| Revisión visual | Step 5 | Lo anotado. |

Añade al final los casos de `sinComprobar` y, si corregiste el script, qué y por qué.

- [ ] **Step 7: si algo sale «distinto»**

Usa superpowers:systematic-debugging. Según de dónde venga:
- **De la fase:** corrígelo con su prueba (TDD), en un commit `Graficos: …` con el paso «Comprobar», y vuelve a pasar la fase afectada.
- **Del script:** corrige su suposición (un selector, una espera) y anótalo en el informe.
- **De fuera de la fase** (datos, backend): anótalo, sin tocarlo.
- **Lo que tapa la leyenda, los cortes de las etiquetas largas y las etiquetas del 3D exportado con Original** no se corrigen aquí: son preguntas para el usuario.

- [ ] **Step 8: cerrar**

Para el servidor de la versión nueva con la herramienta de tareas (el identificador del Step 4 de la Task 8). Después, comprueba que no queda nada propio:

```bash
ss -ltn | grep -E ':(5291|5292) ' || echo "puertos libres"
```

Solo si un puerto sigue ocupado, mata ese servidor, y solo ese: `pkill -f -- "vite --port 529[1] "` para el 5291 y `pkill -f -- "vite --port 529[2] "` para el 5292. Vuelve a lanzar la orden de `ss` en otra orden, hasta que diga `puertos libres`.

Quita el worktree de «antes», que no tiene nada que guardar:

```bash
git -C /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 worktree remove --force /home/dae/.config/superpowers/worktrees/Neurograph/fase4-antes && git -C /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 worktree prune && git -C /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 worktree list
```

```bash
pkill -f -- "$(basename "$D")/[t]mp"; pgrep -fa "$(basename "$D")/[t]mp" || echo "ningún navegador suelto"
git -C /home/dae/PycharmProjects/Neurograph/Neurograph status --short | diff "$D/copia-principal-antes.txt" - && echo "copia principal sin cambios"
```

Expected: `puertos libres`; la lista de worktrees, sin `fase4-antes`; `ningún navegador suelto`; y `copia principal sin cambios`. Si la copia principal cambió, dilo en el informe sin tocarla: no sabes si fue esta tarea.

La carpeta `$D` se queda, con el informe y las capturas: las necesita la Task 10, y quien coordina, para enseñar al usuario las preguntas. Se quita al final de la Task 10.

## Chunk 5: decisión y spec

### Task 10: la D de la fase 4, retoques del spec y commit

**Files:**
- Modify: `docs/decisiones-diseno.md` (la D nueva, al final)
- Modify: `docs/rediseno-interfaz-diseno.md` (retoques donde la implementación concretó o se apartó)

- [ ] **Step 1: el número de la D y el estado de `docs/`**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git status --short docs/
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git merge-base --is-ancestor rediseno-interfaz HEAD && echo "al día con rediseno-interfaz" || echo "rediseno-interfaz tiene commits que esta rama no tiene"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && grep -n "^## D[0-9]" docs/decisiones-diseno.md
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && for b in $(git for-each-ref --format='%(refname:short)' refs/heads); do echo "--- $b"; git show "$b:docs/decisiones-diseno.md" 2>/dev/null | grep -n "^## D[0-9]"; done
for f in /home/dae/.config/superpowers/worktrees/Neurograph/*/docs/decisiones-diseno.md /home/dae/PycharmProjects/Neurograph/Neurograph/docs/decisiones-diseno.md; do echo "--- $f"; grep -n "^## D[0-9]" "$f"; done
```

- Si `docs/decisiones-diseno.md` o `docs/rediseno-interfaz-diseno.md` tienen cambios sin commit, son de otra sesión: no sigas, no los toques y termina la tarea como BLOQUEADA, diciendo qué archivo y qué cambios.
- Si `rediseno-interfaz` tiene commits que esta rama no tiene y tocan `docs/`, díselo a quien coordina antes de escribir: puede querer fusionarla primero, para no dejar conflictos en los dos documentos al fusionar de vuelta. Se escribe sobre los documentos tal como estén en la rama.
- La D nueva es la **siguiente libre** en todas esas listas, contando que la D6 está reservada (rama `rediseno-avisos`) y que la D7, la D8 y la D9 son de la fase 2, la oclusión y las marcas aunque todavía no aparezcan. Lo esperado es la **D10**. Llámala D<n> en lo que sigue, y pregunta a quien coordina si algo no cuadra.
- El código no cita el número (dice «fase 4 del rediseño»), así que no hay que cambiar nada en `frontend/src`.

Antes de escribir el número en ningún sitio, comprueba que nadie lo usa ya, en esta rama y en todas las demás. Los planes (`rediseno-interfaz-plan-*.md`) quedan fuera, porque nombran números posibles sin usarlos (este mismo dice «D10»):

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && grep -rnw "D<n>" docs frontend/src scripts --exclude='rediseno-interfaz-plan-*.md' ; echo "fin de la búsqueda"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git grep -nw "D<n>" $(git for-each-ref --format='%(refname:short)' refs/heads) -- docs frontend/src scripts ':!docs/rediseno-interfaz-plan-*.md' ; echo "fin de la búsqueda en las ramas"
```

con `D<n>` cambiado por el número. Expected: solo `fin de la búsqueda`. Si sale algo, ese número ya está tomado: vuelve a empezar este Step con el siguiente.

**Dónde va.** Al final de `docs/decisiones-diseno.md` de esta rama. Si en la rama todavía no están la D6 a la D9 (llegan con otras fusiones), la D<n> va igualmente al final, tras la última que haya: quien coordina la deja en su sitio al fusionar en `rediseno-interfaz`. Dilo en el informe.

- [ ] **Step 2: retoques del spec**

En `docs/rediseno-interfaz-diseno.md`, con el estilo del documento (frases cortas, listas):

- **Cabecera, «Estado»:** tras la frase de la parte 3D, «Y el resto de la fase 4 (gráficos): D<n> de `docs/decisiones-diseno.md`, con el plan en `docs/rediseno-interfaz-plan-fase4.md`.».
- **4.2:** dos filas nuevas en la tabla de tokens de dibujo, `label3dText` y `label3dBackground`, con los valores de `theme/themes.ts`, y una nota bajo «Otros detalles del dibujo»: el texto es el `--text` de cada tema y el fondo, su `sceneBg` con transparencia (0,84, y 0,88 en Claro); con cualquier cosa detrás, el texto supera 4,5:1 (de 5,9:1 a 12,5:1).
- **5.4, «Leyenda del connectograma»:** dónde va exactamente (dentro del hueco del dibujo, abajo a la izquierda, encima de él, sin eventos, a 0,7rem, con el panel al 84 % de fondo), sus muestras (la discontinua con el `dash` del tema) y lo que tapa, con las cifras de la Task 9. Y que es una pregunta abierta (12).
- **6.1:**
  - Etiquetas: la regla exacta (desviación 1): la mitad izquierda es `ux < 0`, como en la lupa; arriba y abajo, en vertical; la separación y la regla de tamaño, las de siempre; la pastilla de una marca las sigue con la misma función. Y el límite de la desviación 2: con abreviaturas largas se cortan.
  - Arcos: la regla de cuándo (desviación 5, con el círculo cerrado y los dos hemisferios), dónde (a 34 px del anillo, 4° de hueco, 1,5 px, token `edge`), sus rótulos en las esquinas de arriba y del lado de su arco, sin rótulos en la miniatura, y que se exportan. Con los datos de hoy: HCP-MMP1.0, sí; Brainnetome, Gordon 333 y el Subcórtex, no.
  - Halo: 2 px, a 2 px del contorno, al 35 % (opacidad fija, sin referencia de exportación), en un grupo encima de los nodos, también en la lupa; y, con una marca, el anillo de la marca donde estaba y encima, con el halo asomando por fuera (en 5.9 también, junto al anillo).
- **6.3:**
  - Surcos: el método de los percentiles, una vez por archivo con un `WeakMap`, el recorte a 0-1 y que el mismo valor oscurece las regiones con color (desviación 7), con el rango del archivo de `fsLR 32k` y la cifra de `cercaDeLosExtremos` de la Task 9.
  - Etiquetas: los dos tokens; todas sobre una pastilla, como las de las marcas; la letra (`600 44px`); sRGB y sin curva de tono; la clave (texto, dos colores y versión) y por qué los colores representan el tema; la liberación de las texturas al subir la versión; `state/labelFont.ts`; y los colores de exportación.
- **9, un párrafo «Fase 4 (gráficos)»** tras los de las fases anteriores: `logic/connectogramLayout.ts`, `components/ConnectogramLegend.tsx` y `state/labelFont.ts`.
- **10, un párrafo «Fase 4»:** las pruebas nuevas, de BASE a BASE + 43 (y las de las revisiones): la geometría del connectograma, el marcado (etiquetas, marcas, halo, arcos y leyenda), los percentiles y el suavizado, los tokens de las etiquetas 3D con su contraste, la textura y su caché, la versión de fuentes y las líneas de `Brain3D.tsx`. Y las dos pruebas de las marcas que cambiaron.
- **11:** la fase 4 hecha, con la D5 y la D<n>.
- **12, «Para decidir el usuario»:** las cinco preguntas de este plan, con las cifras de la Task 9.

Si en el Step 7 de la Task 9 cambiaste algo que el spec describe, retócalo también.

- [ ] **Step 3: la D, al final de `docs/decisiones-diseno.md`**

Toma la D5 de ese archivo como modelo: su forma, sus encabezados en negrita y su línea final sobre las secciones del spec retocadas.

- Título: `## D<n>. Gráficos (resto de la fase 4 del rediseño) -- dd/mm/aaaa`, con la fecha del día.
- Párrafos con encabezado en negrita:
  - **Motivación.** El spec (6 y 11) dejaba para la fase 4 las etiquetas radiales, los arcos, la leyenda y los nodos del connectograma, los hemisferios y el cerebro 3D. La parte 3D se adelantó (D5), y la oclusión y las marcas llegaron después. Esta es la auditoría del plan: qué estaba hecho (con la evidencia) y qué faltaba.
  - **Decidido por el usuario.** El spec y la maqueta, aprobados el 24/09/2026 y validados por el desarrollador principal. Si el usuario contestó alguna de las cinco preguntas antes de cerrar, lo que decidió.
  - **Qué cambia.** Una línea por parte: etiquetas radiales, marcas que las siguen, halo, arcos, leyenda, surcos y etiquetas del 3D.
  - **Qué no cambia.** Los datos, el orden y las posiciones de los nodos, las líneas y su regla de grosor, `NETWORK_COLORS`, los stores del desarrollador principal, los hemisferios (`Hemisferios.tsx`, sin cambios; la Task 9 **vio** su pantalla y su JPEG iguales que antes, o dilo como salió), los marcadores, la oclusión y la captura. Y que el connectograma dibuja los mismos nodos y las mismas líneas que antes, sin selección y con los mismos datos (Task 9).
  - **Diferencias con el spec.** Las desviaciones de este plan que sigan en pie, y las que añadieran las Tasks 8 y 9.
  - **Qué cambia en los JPEG.** La sección del plan, con lo que vio la Task 9.
  - **Correcciones de las revisiones.** Una línea con lo que cambiaron las dos revisiones (sus commits), o que no hizo falta.
  - **Limitaciones conocidas:** la ventana real de Tauri, sin comprobar; los cortes de las etiquetas largas; lo que tapa la leyenda; el contraste de las muestras y de la leyenda, calculado y no medido en píxeles; lo que la Task 9 dejara «sin comprobar».
  - **Para decidir el usuario.** Las cinco preguntas, con las cifras de la Task 9.
  - **Verificación.** El método, aquí mismo y sin remitir al scratchpad, que se borra con la sesión: cuándo dio permiso el usuario; Chromium sin interfaz (Playwright 1.55), uno cada vez, con `nice -n 19`, sin WebGL en las fases 2D y con los fotogramas a 5 por segundo en las del 3D; el servidor de desarrollo propio (5291) y el de la versión anterior (5292), este solo para comparar; el backend local con datos reales, solo con peticiones GET y los mismos JSON para las dos versiones; y cada región seleccionada o marcada comprobando en el store que es la buscada. Después, lo que dice el informe de la Task 9, comprobación por comprobación, con «visto», «distinto» o «sin comprobar», y el HEAD verificado. Y el número de pruebas, `tsc` limpio, lint con la línea base y la compilación.
- Al final, la línea con las secciones del spec retocadas en el Step 2, como en la D5, y los enlaces al spec (4.2, 5.4, 5.9, 6.1, 6.3, 9 a 12) y a este plan, `docs/rediseno-interfaz-plan-fase4.md`.

- [ ] **Step 4: commit**

Otra sesión puede haber tocado `docs/` mientras trabajabas. Antes de añadir nada, mira qué cambia y vuelve a buscar el número:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git status --short && git diff docs/
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && grep -rnw "D<n>" docs frontend/src scripts --exclude='rediseno-interfaz-plan-*.md' ; echo "fin de la búsqueda"
```

- En el diff de los dos documentos solo deben estar tus cambios. Si alguno tiene cambios de otra sesión, no hagas el commit: no los añadas ni los deshagas, y termina la tarea como BLOQUEADA, diciendo qué archivo y qué cambios.
- La búsqueda solo debe encontrar lo que escribiste tú, en esos dos documentos. Si encuentra el número en otro sitio, otra sesión lo ha tomado a la vez: no hagas el commit y dilo.

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-fase4 && git add docs/decisiones-diseno.md docs/rediseno-interfaz-diseno.md && git commit -m "Graficos: D<n>, verificacion en la app real y retoques del spec

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

Con el número de la D en el mensaje y la línea `Co-Authored-By` del modelo que implementa.

- [ ] **Step 5: la carpeta de la verificación**

Cuando quien coordina ya no necesite las capturas (para enseñar al usuario las preguntas), quita la carpeta de la Task 8, que está en disco y no se borra sola:

```bash
rm -rf /home/dae/.config/superpowers/worktrees/Neurograph/fase4-verif-XXXXXX
```

con la ruta de verdad. No toques ninguna otra carpeta de `/home/dae/.config/superpowers/worktrees/Neurograph/`.
