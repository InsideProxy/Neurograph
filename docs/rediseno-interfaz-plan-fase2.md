# Rediseño de la interfaz · Fase 2: paleta suave. Plan de implementación

> **Para agentes:** OBLIGATORIO: usar superpowers:subagent-driven-development (si hay subagentes) o superpowers:executing-plans para ejecutar este plan. Los pasos usan casillas (`- [ ]`) para seguir el avance. Este plan cambia la forma de revisar de esa habilidad: ver «Proceso».

**Objetivo:** los colores de red «suaves» de la maqueta aprobada, derivados de los de cada atlas, en todas las vistas y en la exportación, con la opción de volver a los originales desde Ajustes. `NETWORK_COLORS` no cambia.

**Arquitectura:**

- **Tabla generada.** `scripts/generate_soft_palettes.py`, solo con la biblioteca estándar, lee `NETWORK_COLORS` de `theme/networks.ts`, aplica el método de la sección 4.3 del spec y escribe `theme/softPalettes.ts`: `SOFT_NETWORK_COLORS[tema][clave]` para Grafito, Noche y Claro. La tabla no se edita a mano, y `--check` dice si está al día.
- **Funciones puras con el modo** (`theme/colors.ts`): `effectivePaletteMode(tema, elección)`, `resolveNetworkColor(clave, tema, modo)`, `exportNetworkColor(clave, modo)` y `exportColorFor(ref, tipo, tema, modo)`. Con «Suaves», la exportación usa la columna de Claro.
- **Un solo sitio lee el store para dibujar:** `useDrawColors(forExport)`, que ahora lee el tema y el modo. Todo lo que ya pinta con `networkColor` sigue la paleta sin tocar su código: el connectograma, los hemisferios, el cerebro 3D (también al exportar), las etiquetas de red, el buscador, el logotipo, el detalle y el diagrama de síntesis.
- **Un solo resolvedor de exportación:** `currentExportResolver()` lee el tema y el modo del store al exportar. Sustituye las tres llamadas `exportResolverFor(useAppearanceStore.getState().theme)`.
- **Ajustes:** «Colores de las redes», con tres radios nativos en un `role="radiogroup"`: «Automática» (la de por defecto), «Suaves» y «Originales del atlas». Debajo, una muestra y la nota del spec. Cada tarjeta de tema enseña la paleta de su tema.

**Tecnología:** Python 3.10 o posterior (biblioteca estándar), React 19, TypeScript 6 estricto, Vite 8, zustand 5, vitest 4 (entorno node, sin DOM; `react-dom/server` para el marcado) y oxlint.

**Spec:** `docs/rediseno-interfaz-diseno.md` (commit `a4f2f7c` o posterior): 4.3, 4.4, 4.5, 5.2, 9 (con el párrafo «Fase 1»), 10, 11 y 12. D3 de `docs/decisiones-diseno.md`.

**Dónde encaja.** El orden de implementación es 1, 3, la parte 3D de la 4 (rama `rediseno-3d`), 2 y el resto de la 4. La fase 3 antes que la 2 lo propusimos nosotros; la parte 3D antes que la 2 la pidió el usuario el 24/09/2026. El spec, en 11, todavía dice «1, 3, 2 y 4», y la Task 6 lo pone al día. Esta fase empieza con la fase 3 ya fusionada en `rediseno-interfaz`, porque usa lo que ella dejó:

- `FilterPanel` con su presentación nueva y su prueba de marcado;
- `NetworkTag`, `RegionSearch` y el logotipo de `TopBar`, que ya pintan con `useDrawColors().networkColor`;
- la clase `.visually-hidden` y la regla general `:focus-visible` de `App.css`.

El Step 0 de la Task 1 lo comprueba.

**Rama en paralelo, `rediseno-3d`.** Cambia `Brain3D.tsx`, `PaintedCortex.tsx` y `logic/exportImage.ts`. Esta fase no toca `Brain3D.tsx` ni `PaintedCortex.tsx`: ni una línea.

- El 3D ya toma los colores de red de `colors.networkColor`, con `const colors = useDrawColors(exporting)`: la línea 946 en la copia de ensayo, que la rama 3D cambia a `useDrawColors(exportPhase === "capturing")`. Los usan `NodeMesh` (516), `regionColors` (1127) y `networkPaint` (1149).
- La firma de `useDrawColors(forExport)` no cambia. La paleta entra dentro de `theme/useDrawColors.ts`, así que las dos ramas se fusionan sin tocarse.
- En `logic/exportImage.ts`, esta fase solo cambia cuatro líneas del JSDoc de `exportSvgAsJpeg`, lejos de `exportCanvasAsJpeg` y `exportPixelsAsJpeg`, que son las que toca la rama 3D.
- Da igual cuál se fusione antes.

**Lo que la revisión final de la fase 1 pidió para esta fase** (24/09/2026):

- Un solo resolvedor de exportación que lea tema y modo juntos: `currentExportResolver()` (Task 2).
- La exportación 3D sigue la paleta: `drawColorsFor(tema, modo, true).networkColor` usa `exportNetworkColor`, igual que los SVG, y la prueba invariante de `theme/colors.test.ts`, que liga las dos vías, pasa a cubrir los dos modos (Task 2).
- Las muestras de `FilterPanel` y los puntos de Ajustes siguen la paleta, y cada tarjeta enseña la de su tema (Tasks 2 y 3).

**Fuera de esta fase:**

- Una paleta para daltonismo (spec 12).
- La leyenda del connectograma y los gráficos: fase 4.
- Los valores de `NETWORK_COLORS` y las constantes de la decisión 18.
- Los colores de los tractos y las imágenes que dibuja el backend.

**Dónde se trabaja:**

- Worktree `/home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz`, rama `rediseno-interfaz`.
- La copia principal `/home/dae/PycharmProjects/Neurograph/Neurograph` no se toca.
- `frontend/node_modules` ya está en el worktree. No ejecutes `npm install`: esta fase no añade dependencias, y el script de Python solo usa la biblioteca estándar.

**Convenciones:**

- Identificadores en inglés y comentarios en castellano, como el código actual. Los comentarios nuevos citan «fase 2 del rediseño» y la sección del spec, sin número de D: la D se asigna en la Task 6.
- **Rutas absolutas en todos los comandos.** Las órdenes de `frontend/` empiezan con `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend`, y las del script, con `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz`.
- Órdenes, desde `frontend/`:
  - Una prueba: `npx vitest run <ruta>`. Todas: `npm test`. El Step 0 de la Task 1 anota las que haya al empezar: es la **BASE**. Cada tarea da sus cuentas como «BASE + N»: la Task 1, BASE + 17; la 2, BASE + 48; la 3, BASE + 57. En la prueba en seco fueron de 247 a 304 sobre la copia de ensayo de la fase 3, y de 257 a 314 sobre la rama real en `3e2a9f9`, ya con la fase 3 entera.
  - Tipos: `npx tsc -b`.
  - Lint: `npm run lint`. oxlint no imprime un resumen, así que los avisos y los errores se cuentan con `npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c`. El Step 0 de la Task 1 anota ese recuento: es la **línea base de lint**, que no puede subir, y errores, ninguno. Al escribir este plan eran 9 avisos (3 `set-state-in-effect`, 4 `preserve-manual-memoization` y 2 `exhaustive-deps`); con la parte 3D fusionada pueden ser menos. Si aparece un aviso nuevo, no se silencia: se reestructura el código. Si no hay forma de volver a la línea base, la tarea se detiene y se informa como BLOQUEADA.
  - Compilación: `npm run build`. El aviso de tamaño de bloque (más de 500 kB) ya estaba.
- **Python:** `python3`, 3.10 o posterior. En esta máquina, `python3` es el de pyenv (3.10.13) y `/usr/bin/python3` es el 3.14: el script da la misma tabla con los dos.
- **Paso «Comprobar» al final de cada tarea:** las cuatro órdenes, todas bien, y sin colores fijos nuevos fuera de la tabla generada y de las pruebas:

  ```bash
  cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git diff "$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase2-base.txt)" -- frontend/src ':!frontend/src/theme/softPalettes.ts' ':!*.test.ts' ':!*.test.tsx' | grep -E '^\+' | grep -oiE '#[0-9a-f]{3,8}\b|rgba?\(' ; echo "fin de la búsqueda"
  ```

  Expected: solo `fin de la búsqueda`.
- **Sustituciones en archivos existentes.** Cada «busca» aparece una sola vez en su archivo. Si no lo encuentras tal cual, no sigas a ciegas: averigua por qué.
  - Las anclas se probaron en seco sobre la rama en `089703a` con las Tasks 3 a 11 de la fase 3 aplicadas, y sobre la rama real en `3e2a9f9`, con la fase 3 entera. Si la diferencia viene de correcciones posteriores de la fase 3, adapta el «busca» a lo que haya, sin cambiar lo que hace la sustitución, y anótalo en el informe de la tarea.
  - Si viene de otra cosa, para y dilo.
- oxlint avisa si un `.tsx` exporta algo que no sea un componente o un tipo (`react/only-export-components`): las funciones puras van en archivos `.ts`.
- `tsconfig.app.json` exige `import type` para los tipos (`verbatimModuleSyntax`) y da error por imports o variables sin usar (`noUnusedLocals`).
- **`index.css` no se toca.** `theme/themeCss.test.ts` comprueba que los cuatro temas definen las mismas variables y sus contrastes.
- **Letra mínima de 0,7rem** en lo nuevo.
- **Estado y manejadores.** Solo cambia el store de apariencia (`state/appearance.ts`): gana `setPaletteMode`. Los demás stores, los manejadores y los datos no cambian.
- **Commits:** uno por tarea. Mensaje en castellano sin tildes ni eñes, que empieza por `Paleta: ` y termina con la línea `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. `git add` solo de los archivos que nombra la tarea. Nada de `git stash`.
- **`docs/`:** lo toca también otra sesión. Solo la Task 6 lo modifica.
- En los textos nuevos se escribe «el usuario» y «decisión del usuario». Los comentarios antiguos del desarrollador principal y la D1 y la D2 dicen «la usuaria»: se dejan como están.

## Proceso

Rigor equilibrado, como pidió el usuario el 25/09/2026 al ver el coste de revisar tarea a tarea:

- **El plan va en el repositorio antes de empezar:** quien coordina hace commit de este archivo antes de repartir la Task 1. Así el worktree queda limpio para los Step 0.
- **Dos tandas.** La tanda 1 son las Tasks 1 y 2 (datos y lógica); la tanda 2, la Task 3 (Ajustes). Un implementador por tanda, o uno para las dos, con un commit y el paso «Comprobar» en cada tarea.
- **Una revisión conjunta por tanda**, en lugar de las dos revisiones por tarea de la habilidad: dos revisores en paralelo, repartidos por áreas (lo dicen las secciones «Revisión de la tanda»).
  - Primero, los fallos funcionales, la corrección de los datos y de los recuentos, el aspecto en los cuatro temas, el teclado y el contraste.
  - Los matices que solo afectan al lector de pantalla son «menores»: se arreglan si son triviales y, si no, se anotan.
- **Arreglos:** una sola ronda, en un commit `Paleta: correcciones de la revision de la tanda N`. Solo se vuelve a revisar lo que salió «importante», y solo ese punto.
- Después, la **verificación en la app real** con scripts en Chromium sin interfaz (Tasks 4 y 5), y la **D y los retoques del spec** (Task 6).

## Mapa de archivos

Nuevos:

| Archivo | Responsabilidad |
|---|---|
| `scripts/generate_soft_palettes.py` | Genera la paleta suave a partir de `NETWORK_COLORS` (spec 4.3), la comprueba y escribe la tabla; con `--check`, dice si está al día |
| `frontend/src/theme/softPalettes.ts` | Tabla GENERADA `SOFT_NETWORK_COLORS`; no se edita a mano |
| `frontend/src/theme/softPalettes.test.ts` | La tabla cumple el método: claves, tono, luminosidad, distancia y la tabla del spec |
| `frontend/src/components/SettingsMenu.test.tsx` | Marcado de «Colores de las redes» (tres opciones) y de la vista previa de las tarjetas |

Modificados, en `frontend/src/`:

- `theme/colors.ts`, entero: `PALETTE_MODES`, `PaletteMode` e `isPaletteMode` (antes el tipo estaba en el store), `effectivePaletteMode`, `resolveNetworkColor` con tema y modo, `exportNetworkColor`, y `exportColorFor` y `exportResolverFor` con el modo.
- `theme/useDrawColors.ts`, entero: `drawColorsFor(tema, modo, forExport)`, `useDrawColors` que lee también el modo, y `currentExportResolver`.
- `theme/colors.test.ts`, entero, y `theme/themeCss.test.ts`, con el contraste de los colores suaves sobre el panel.
- `state/appearance.ts` (`setPaletteMode`) y su prueba.
- `components/Connectogram.tsx`, `components/Hemisferios.tsx` y `components/DetailPanel.tsx`: solo las importaciones y la línea del resolvedor de su exportación.
- `components/FilterPanel.tsx`: las muestras de color, con `useDrawColors` (tres líneas). `components/FilterPanel.test.tsx`: dos pruebas nuevas al final, una con la paleta automática y otra con la guardada.
- `components/SettingsMenu.tsx`: los puntos de las tarjetas con la paleta de su tema (Task 2), y `SettingsChoices` con «Colores de las redes» y sus tres opciones (Task 3).
- `App.css`: las reglas del control, tras `.settings__theme-desc`.
- Solo comentarios: `components/NetworkTag.tsx`, `logic/exportImage.ts` y `logic/exportPalette.ts`.
- Documentos, en la Task 6: `docs/decisiones-diseno.md` y `docs/rediseno-interfaz-diseno.md`.

Sin cambios: `theme/networks.ts` (`NETWORK_COLORS` y las constantes de la decisión 18), `index.css`, `theme/themes.ts`, `Brain3D.tsx`, `PaintedCortex.tsx`, `ReferenceMesh.tsx`, `main.tsx`, `App.tsx` y los demás stores.

## Desviaciones y decisiones de diseño

La Task 6 las anota en la D y en el spec.

1. **El modo de paleta vive en `theme/colors.ts`.** `PaletteMode` estaba en `state/appearance.ts`. Pasa a `theme/colors.ts`, junto a `PALETTE_MODES`, `isPaletteMode` y `effectivePaletteMode`, para que la lógica de la paleta esté en un solo módulo puro y `theme/` no dependa de `state/`. El store lo importa de ahí.
2. **Las funciones puras reciben el modo que se aplica, no la elección guardada.** `resolveNetworkColor(clave, tema, modo)`, `exportNetworkColor(clave, modo)`, `exportColorFor(ref, tipo, tema, modo)`, `exportResolverFor(tema, modo)` y `drawColorsFor(tema, modo, forExport)` reciben `"suave"` u `"original"`. Solo `effectivePaletteMode(tema, elección)` recibe la elección, que puede ser `null`. Hacen la conversión quienes tienen la elección: `useDrawColors` y `currentExportResolver`, que la leen del store, y `SettingsChoices`, en Ajustes, para cada tarjeta (con el tema de la tarjeta) y para la muestra.
3. **`exportNetworkColor`, nueva.** Es el color de red de la exportación: con «Suaves», la columna de Claro; con «Originales», `NETWORK_COLORS`. La usan las dos vías de exportación, `exportColorFor` para los SVG y `drawColorsFor(…, true)` para el 3D, así que coinciden por construcción. La prueba invariante lo comprueba en los cuatro temas y con los dos modos.
4. **`currentExportResolver()`, en `theme/useDrawColors.ts`**, el archivo que ya une el store y los colores. Sustituye las tres llamadas `exportResolverFor(useAppearanceStore.getState().theme)`, y esos tres componentes dejan de importar el store.
5. **`useDrawColors(forExport)` conserva su firma**, para no tocar `Brain3D.tsx` (ver «Rama en paralelo»).
6. **Las muestras de Filtros pasan a `useDrawColors().networkColor`**, como las vistas; antes llamaban a `resolveNetworkColor(clave)`. Las de Ajustes siguen con `resolveNetworkColor`, porque cada tarjeta necesita su propio tema.
7. **Cada tarjeta enseña la paleta que tendría su tema**: `effectivePaletteMode(tema de la tarjeta, elección)`. Con «Automática», la de Original es la original, y las otras tres, la suave de su tema. Con una elección, la siguen todas, porque elegir otro tema la conserva (4.5). La maqueta pintaba siempre la automática, pero allí cambiar de tema borraba la elección, y el spec no lo hace.
8. **El control tiene tres opciones: «Automática», «Suaves» y «Originales del atlas».** El spec (5.2) dice dos. Con dos, no se podía volver al automático (`null`): los radios nativos marcan al moverse con las flechas, así que con solo recorrer el grupo quedaba fijada una elección para siempre, y la tarjeta del tema Original, «Los colores de siempre», pasaba a enseñar puntos suaves. «Automática» es la elección `null` y la de por defecto, y lleva una línea de ayuda: «Automática: suaves en los temas nuevos; originales en Original.». Lo decidió la revisión de este plan.
   - Son radios nativos dentro de un `role="radiogroup"` con nombre y con la nota como descripción; la ayuda describe el radio de «Automática». La maqueta usaba botones con `role="radio"`. Con radios nativos, el navegador da el teclado: Tab entra en la opción marcada y las flechas cambian de opción.
   - El radio queda oculto (`.visually-hidden`) y su etiqueta hace de botón.
   - La opción marcada lleva el borde, el fondo y el anillo del acento, como la tarjeta del tema elegido, para distinguirse con al menos 3:1 (spec 4.1). La maqueta la marcaba con `borderStrong`, que queda por debajo de 3:1.
9. **La muestra** son las doce redes de Cole-Anticevic, la clasificación por defecto, con la paleta que se aplica, como en la maqueta. No son las de la clasificación cargada: Ajustes no la conoce. Es decorativa (`aria-hidden`) y, a diferencia de la maqueta, sin el nombre de cada red en una etiqueta emergente: solo la alcanzaría el ratón, y el spec (8) pide lo mismo para el teclado.
10. **La nota** es la del spec. La maqueta llevaba antes otra frase, «Cada red conserva su color de siempre, con otra intensidad.», que el spec no recoge.
11. **`SettingsChoices`** es el contenido del panel sin el store: recibe tema, elección y manejadores. Así su marcado se prueba en node, donde el store se queda en su estado inicial (zustand 5 usa `getInitialState()` al renderizar en el servidor). Por eso mismo, la prueba de que las muestras de Filtros siguen una elección guardada crea otro store con `vi.resetModules()` y un `localStorage` simulado.
12. **El generador**, además de lo que pide el spec:
    - no escribe nada si un grupo no cumple la comprobación, que incluye el contraste del tema Original con «Suaves»;
    - con `--check`, dice si la tabla está al día sin escribirla;
    - un grupo con una sola red es un error claro, no un fallo a medias;
    - escribe en UTF-8 aunque la consola sea cp1252, como en Windows (`sys.stdout.reconfigure`), y la tabla con finales de línea LF;
    - la cabecera de la tabla dice que está generada, con qué orden se regenera y con qué bandas y topes de croma;
    - su documentación dice que el orden de las claves dentro de un grupo es parte del método.
13. **El contraste con el panel se prueba en `theme/themeCss.test.ts`**, que ya lee el panel de cada tema de `index.css`, y no con colores copiados. Se añade un caso que el spec no pide: el tema Original con «Suaves» usa la columna de Grafito sobre su propio panel, `#1d1e26`, y su mínimo es 3,66:1.
14. **Tabla desfasada.** Si a la tabla le faltara una clave conocida (por ejemplo, una red nueva sin regenerar), `resolveNetworkColor` daría el color del atlas antes que un gris que parecería «sin red». La prueba de la tabla lo impide.
15. **Las claves de demostración** son un grupo más del método (spec 4.3, «más un grupo con las claves de demostración sin prefijo»). La tabla cubre las 73 claves de `NETWORK_COLORS`, `unclassified` incluida.
16. **El logotipo** sigue la paleta, como pide el spec (5.1, «del tema activo»): con «Originales del atlas», sus cuatro nodos son los primarios de Cole-Anticevic.
17. **El tono se comprueba por encima de un croma de 0,04.** El spec (10) pide ±3° salvo en los acromáticos. Por debajo de 0,04 de croma, el redondeo a `#rrggbb` ya mueve el tono más de 3°, así que el script y la prueba no miran el tono de los colores suaves casi grises. Hoy no hay ninguno.
18. **El panel de Ajustes crece** con la sección nueva (entre 160 y 185 px, calculado) y a 900×600 ya no cabe entero: se desplaza por dentro, con su `max-height` de siempre. La D3 decía que a 900×600 cabía; la Task 5 lo mide, y la D nueva y el spec lo corrigen.

## La paleta generada frente a la de la maqueta

La maqueta aprobada se hizo con el prototipo `palette.py`, que está fuera del repositorio (`~/.config/superpowers/worktrees/Neurograph/rediseno-referencias/generadores/`, con `palettes.json`). El generador de esta fase parte de él:

- Conserva las dos correcciones que se hicieron allí: el recorte de croma por bisección, que primero fallaba, y la luminosidad repartida sobre el mínimo y el máximo reales de cada grupo, sin contar los acromáticos.
- Con las mismas claves y en el mismo orden da los mismos colores. Comprobado en seco: el prototipo vuelve a generar su `palettes.json` idéntico.
- Cole-Anticevic (la tabla de 4.3), Gordon 333, Yeo 7, Yeo 17 y `unclassified` salen idénticos en los tres temas.
- **Power cambia en cinco redes en Grafito, cuatro en Noche y tres en Claro.** En los tres temas, Por defecto, Somatomotora de boca y Tálamo; en Grafito y Noche, también «Sin identificar (temporal medial / parietal)»; y en Grafito, Atención dorsal.
  - El motivo: la lista de entrada de la maqueta (`network_colors.txt`) tenía 15 redes de Power, y `NETWORK_COLORS` tiene 17. Faltaban `power2011.auditory` (`#ff00ff`) y `power2011.unknown-similar-to-nelson-2010` (`#ffb45a`). Con dos redes más, el paso de separación mueve otras luminosidades.
  - Las diferencias son pequeñas: por ejemplo, Por defecto pasa de `#f99081` a `#ef8778` en Grafito.
- **Nuevas** respecto a la maqueta: esas dos redes de Power y las siete claves de demostración.
- Las cifras de 4.3 para las cinco clasificaciones se mantienen: contraste mínimo con el panel de 3,88 a 4,40 en Grafito, de 3,94 a 4,45 en Noche y de 1,78 a 2,11 en Claro, y ΔE_OK mínimo ≥ 0,085 en todas. El grupo de demostración da 4,05, 4,11 y 2,20.

---

## Chunk 1: generador y tabla (tanda 1)

### Task 1: generador de la paleta suave y tabla generada

**Files:**
- Create: `scripts/generate_soft_palettes.py`
- Create (lo genera el script): `frontend/src/theme/softPalettes.ts`
- Create: `frontend/src/theme/softPalettes.test.ts`
- Modify: `frontend/src/theme/themeCss.test.ts` (una prueba al final)

- [ ] **Step 0: punto de partida**

Comprueba que el código del worktree está limpio y que la fase 3 ya está fusionada, y guarda el commit de partida. Lo usan el paso «Comprobar» de cada tarea y las Tasks 4 y 5. `git status` mira solo `frontend/` y `scripts/`, como en la fase 3: `docs/` lo tocan otras sesiones.

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git status --short frontend/ scripts/ && git log --oneline -3
grep -n "^## D[0-9]" docs/decisiones-diseno.md
ls frontend/src/components/NetworkTag.tsx frontend/src/components/RegionSearch.tsx frontend/src/components/FilterPanel.test.tsx
grep -n "exportResolverFor(useAppearanceStore.getState().theme)" frontend/src/components/*.tsx
grep -n "resolveNetworkColor(" frontend/src/components/*.tsx
python3 --version
```

Expected:
- `git status --short frontend/ scripts/` sin salida. Si hay cambios, son de otra sesión: no sigas y termina la tarea como BLOQUEADA.
- La D4 (fase 3) en la lista. Si no está, la fase 3 no se ha fusionado: BLOQUEADA.
- Los tres archivos de la fase 3 existen.
- Tres llamadas a `exportResolverFor(useAppearanceStore.getState().theme)`: en `Connectogram.tsx`, `Hemisferios.tsx` y `DetailPanel.tsx`.
- `resolveNetworkColor(` con un argumento en `FilterPanel.tsx` y `SettingsMenu.tsx`.
- Python 3.10 o posterior.

Si algo no cuadra, el código no es el que espera el plan: averigua por qué antes de seguir.

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git rev-parse HEAD > /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase2-base.txt && cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase2-base.txt
cd frontend && npm test 2>&1 | grep -E "^\s+Tests " ; npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c
```

Apunta las pruebas que pasan (la BASE) y el recuento de lint (la línea base de lint: hoy, 9 avisos y ningún error). Si el scratchpad de esta sesión no existe, guarda `fase2-base.txt` en el de la sesión que ejecute el plan, y usa esa ruta donde el plan diga la otra.

- [ ] **Step 1: la prueba de la tabla, `frontend/src/theme/softPalettes.test.ts`**

Comprueba lo que pide el spec (10): una entrada por cada clave de `NETWORK_COLORS`, el tono (salvo en los acromáticos y los casi grises, desviación 17), la banda de luminosidad y la distancia dentro de cada grupo, más «sin clasificar» y la tabla de Cole-Anticevic de 4.3, que es la de la maqueta. Usa el mismo OKLab que el script.

Crea `frontend/src/theme/softPalettes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { NETWORK_COLORS } from "./networks";
import { SOFT_NETWORK_COLORS, SOFT_PALETTE_THEMES, type SoftPaletteTheme } from "./softPalettes";

// La tabla generada por scripts/generate_soft_palettes.py cumple el método
// de docs/rediseno-interfaz-diseno.md, 4.3 (pruebas de la sección 10). Mismo
// OKLab que el script. El contraste con el panel está en themeCss.test.ts,
// que lee el panel de index.css.

type Lab = readonly [number, number, number];

function oklab(hex: string): Lab {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [channel(0), channel(1), channel(2)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const lightness = (hex: string) => oklab(hex)[0];
const chroma = (hex: string) => Math.hypot(oklab(hex)[1], oklab(hex)[2]);
const hue = (hex: string) => (Math.atan2(oklab(hex)[2], oklab(hex)[1]) * 180) / Math.PI;
const deltaE = (first: string, second: string) => {
  const [a, b] = [oklab(first), oklab(second)];
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
};

const BANDS: Readonly<Record<SoftPaletteTheme, readonly [number, number]>> = {
  grafito: [0.6, 0.9],
  noche: [0.6, 0.9],
  claro: [0.46, 0.76],
};
const BAND_MARGIN = 0.06;
const L_TOLERANCE = 0.005; // el redondeo a #rrggbb mueve algo la L
const ACHROMATIC = 0.02;
// Acromáticos: los originales grises, que no tienen tono. Casi grises: los
// suaves por debajo de este croma, donde el redondeo a #rrggbb ya mueve el
// tono más de 3°.
const HUE_CHROMA_FLOOR = 0.04;

// Grupos del método: una clasificación por prefijo, más las claves de
// demostración, que no llevan prefijo. «Sin clasificar» va aparte.
function groups(): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const key of Object.keys(NETWORK_COLORS)) {
    if (key === "unclassified") continue;
    const group = key.includes(".") ? key.slice(0, key.indexOf(".")) : "demostración";
    result.set(group, [...(result.get(group) ?? []), key]);
  }
  return result;
}

describe("SOFT_NETWORK_COLORS", () => {
  it.each(SOFT_PALETTE_THEMES)("tema %s: un #rrggbb por cada clave de NETWORK_COLORS, y ninguna más", (theme) => {
    const table = SOFT_NETWORK_COLORS[theme];
    expect(Object.keys(table).sort()).toEqual(Object.keys(NETWORK_COLORS).sort());
    for (const [key, color] of Object.entries(table)) expect(color, key).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(SOFT_PALETTE_THEMES)("tema %s: cada red conserva su tono (±3°), salvo las casi grises", (theme) => {
    for (const [key, original] of Object.entries(NETWORK_COLORS)) {
      const soft = SOFT_NETWORK_COLORS[theme][key];
      if (chroma(original) < ACHROMATIC || chroma(soft) < HUE_CHROMA_FLOOR) continue;
      const drift = ((hue(soft) - hue(original) + 540) % 360) - 180;
      expect(Math.abs(drift), `${key}: ${original} -> ${soft}`).toBeLessThanOrEqual(3);
    }
  });

  it.each(SOFT_PALETTE_THEMES)("tema %s: la luminosidad queda en la banda del tema ±0,06", (theme) => {
    const [lo, hi] = BANDS[theme];
    for (const [key, color] of Object.entries(SOFT_NETWORK_COLORS[theme])) {
      expect(lightness(color), key).toBeGreaterThanOrEqual(lo - BAND_MARGIN - L_TOLERANCE);
      expect(lightness(color), key).toBeLessThanOrEqual(hi + BAND_MARGIN + L_TOLERANCE);
    }
  });

  it.each(SOFT_PALETTE_THEMES)("tema %s: dos redes del mismo grupo distan al menos ΔE_OK 0,085", (theme) => {
    const table = SOFT_NETWORK_COLORS[theme];
    for (const [group, keys] of groups()) {
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          const pair = `${group}: ${keys[i]} y ${keys[j]}`;
          expect(deltaE(table[keys[i]], table[keys[j]]), pair).toBeGreaterThanOrEqual(0.085);
        }
      }
    }
  });

  it("«sin clasificar» es un gris a la mitad de la banda menos 0,02", () => {
    expect([SOFT_NETWORK_COLORS.grafito.unclassified, SOFT_NETWORK_COLORS.noche.unclassified]).toEqual([
      "#a8a8a8",
      "#a8a8a8",
    ]);
    expect(SOFT_NETWORK_COLORS.claro.unclassified).toBe("#7d7d7d");
  });

  // La tabla de 4.3, que es la de la maqueta aprobada.
  it("Cole-Anticevic da los colores de la tabla del spec", () => {
    const expected: Record<string, readonly [string, string, string]> = {
      "cole-anticevic.visual": ["#4f74c4", "#4d76cf", "#294c9f"],
      "cole-anticevic.visual2": ["#8a85de", "#8780e3", "#5f56b2"],
      "cole-anticevic.somatomotor": ["#4cedec", "#19efef", "#00bdbd"],
      "cole-anticevic.cingulo-opercular": ["#ae66ac", "#b362b0", "#853a83"],
      "cole-anticevic.dorsal-attention": ["#98e191", "#91e38a", "#67b461"],
      "cole-anticevic.language": ["#35b3b3", "#35b3b3", "#008686"],
      "cole-anticevic.frontoparietal": ["#e3e67b", "#e4e66c", "#b7b840"],
      "cole-anticevic.auditory": ["#db90d8", "#df8cdd", "#b062ae"],
      "cole-anticevic.default": ["#eb8475", "#f27f6f", "#c05548"],
      "cole-anticevic.posterior-multimodal": ["#cc7242", "#cc7242", "#9e4812"],
      "cole-anticevic.ventral-multimodal": ["#f2a958", "#f8a647", "#c77b11"],
      "cole-anticevic.orbito-affective": ["#6a9e49", "#66a03d", "#3f750d"],
    };
    for (const [key, columns] of Object.entries(expected)) {
      const actual = SOFT_PALETTE_THEMES.map((theme) => SOFT_NETWORK_COLORS[theme][key]);
      expect(actual, key).toEqual(columns);
    }
  });
});
```

- [ ] **Step 2: el contraste con el panel, en `frontend/src/theme/themeCss.test.ts`**

Ese archivo ya lee de `index.css` el panel de cada tema. La prueba nueva va al final de su bloque «contraste de los temas».

En `frontend/src/theme/themeCss.test.ts`, busca:

```ts
import { DEFAULT_THEME, THEME_IDS, type ThemeId } from "./themes";
```

Sustitúyelo por:

```ts
import { SOFT_NETWORK_COLORS } from "./softPalettes";
import { DEFAULT_THEME, THEME_IDS, type ThemeId } from "./themes";
```

En `frontend/src/theme/themeCss.test.ts`, busca:

```ts
      expect(contrast(parseColor(vars.get(name)!).rgb, tinted), name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
```

Sustitúyelo por:

```ts
      expect(contrast(parseColor(vars.get(name)!).rgb, tinted), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Paleta suave (4.3 y 10): sobre el panel de los temas oscuros, los
  // colores de red superan 3:1. El tema Original, con «Suaves», usa la
  // columna de Grafito sobre su propio panel. En Claro no se exige: ahí los
  // nodos cuentan con el anillo neutro (principio 6).
  it.each([
    ["grafito", "grafito"],
    ["noche", "noche"],
    ["original", "grafito"],
  ] as const)("tema %s: los colores de red suaves (columna %s) superan 3:1 sobre el panel", (id, column) => {
    const panel = parseColor(variables(THEME_BLOCKS.get(id)!.body).get("--panel-bg")!).rgb;
    for (const [key, color] of Object.entries(SOFT_NETWORK_COLORS[column])) {
      expect(contrast(parseColor(color).rgb, panel), key).toBeGreaterThanOrEqual(3);
    }
  });
});
```

- [ ] **Step 3: ver que fallan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/theme/softPalettes.test.ts src/theme/themeCss.test.ts
```

Expected: FAIL en los dos archivos, porque `./softPalettes` todavía no existe («Failed to resolve import»).

- [ ] **Step 4: el generador, `scripts/generate_soft_palettes.py`**

Parte del prototipo de la maqueta (ver «La paleta generada frente a la de la maqueta»), con lo que añade la desviación 12. Solo usa la biblioteca estándar.

Crea `scripts/generate_soft_palettes.py`:

```python
#!/usr/bin/env python3
"""Genera la paleta «suave» de las redes: frontend/src/theme/softPalettes.ts.

Fase 2 del rediseño de la interfaz (docs/rediseno-interfaz-diseno.md, 4.3).
Los colores de NETWORK_COLORS (frontend/src/theme/networks.ts) son datos de
cada atlas y no se tocan: la paleta suave es una capa de presentación
calculada a partir de ellos, con una columna por tema (Grafito, Noche y
Claro). El tema Original no tiene columna propia: con «Suaves» usa la de
Grafito (frontend/src/theme/colors.ts).

Método, en OKLCH, por grupo de claves: una clasificación por prefijo
(«cole-anticevic.», «gordon333.»...), más un grupo con las claves de
demostración, que no llevan prefijo.

1. Tono: se conserva el de cada red.
2. Luminosidad: se reparte linealmente del mínimo al máximo del grupo sobre la
   banda del tema. Los acromáticos (C < 0,02) no cuentan para el mínimo y el
   máximo, y el resultado se recorta a la banda.
3. Croma: como mucho, el tope del tema. Si el color no cabe en sRGB, se
   recorta el croma sin mover L ni el tono.
4. Separación: mientras dos redes del grupo queden a menos de ΔE_OK 0,085, se
   sube 0,01 la L de la más clara y se baja 0,01 la de la más oscura, hasta
   200 pasadas. La L no sale de la banda más de 0,06 por cada lado.
5. «Sin clasificar» (unclassified): un gris con L = centro de la banda - 0,02.

El orden de las claves dentro de un grupo es parte del método: el paso 4
recorre los pares en el orden de NETWORK_COLORS, y otro orden puede dar otros
colores. Un grupo necesita al menos dos redes.

Parte del prototipo con el que se hizo la maqueta aprobada (palette.py, en
rediseno-referencias/generadores, fuera del repositorio), con sus dos
correcciones: la luminosidad se reparte sobre el mínimo y el máximo reales de
cada grupo, y el recorte del croma es una bisección de verdad (en el primer
prototipo, un croma que no cabía acababa en 0, un gris). Con las mismas claves
da los mismos colores.

Antes de escribir, muestra la comprobación de cada tema y grupo: distancia
mínima entre redes, contraste mínimo con el panel (también el del tema
Original, que con «Suaves» usa la columna de Grafito), deriva del tono y
luminosidad. Si un grupo no cumple lo que piden las pruebas
(frontend/src/theme/softPalettes.test.ts y themeCss.test.ts), no escribe nada y
sale con código 1.

Solo usa la biblioteca estándar (Python 3.10 o posterior).

Uso, desde la raíz del repositorio:

    python3 scripts/generate_soft_palettes.py          # comprueba y escribe la tabla
    python3 scripts/generate_soft_palettes.py --check  # solo dice si la tabla está al día
"""
from __future__ import annotations

import argparse
import math
import re
import sys
from itertools import combinations
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
NETWORKS_TS = REPO_ROOT / "frontend" / "src" / "theme" / "networks.ts"
OUTPUT_TS = REPO_ROOT / "frontend" / "src" / "theme" / "softPalettes.ts"

UNCLASSIFIED = "unclassified"
DEMO_GROUP = "demostración"
ACHROMATIC = 0.02  # croma por debajo del cual un color es un gris
MIN_DELTA_E = 0.085  # distancia mínima entre dos redes de un grupo
BAND_MARGIN = 0.06  # cuánto puede salir la L de la banda al separar
MAX_PASSES = 200
MAX_HUE_DRIFT = 3.0  # grados
HUE_CHROMA_FLOOR = 0.04  # por debajo, el redondeo a 8 bits ya mueve el tono
MIN_CONTRAST_DARK = 3.0  # con el panel, en Grafito y Noche
L_TOLERANCE = 0.005  # el redondeo a #rrggbb mueve algo la L

# Banda de luminosidad (L de OKLCH) y croma máximo de cada tema. El panel es
# el --panel-bg de index.css (spec 4.1); solo sirve para la comprobación.
THEMES = {
    "grafito": {"band": (0.60, 0.90), "cmax": 0.13, "panel": "#16191e"},
    "noche": {"band": (0.60, 0.90), "cmax": 0.145, "panel": "#111726"},
    "claro": {"band": (0.46, 0.76), "cmax": 0.14, "panel": "#ffffff"},
}
DARK_THEMES = ("grafito", "noche")
# El tema Original no tiene columna propia: con «Suaves» usa la de Grafito
# sobre su propio panel (--panel-bg de Original en index.css).
ORIGINAL_COLUMN, ORIGINAL_PANEL = "grafito", "#1d1e26"


# -- Color: sRGB, OKLab y OKLCH (Björn Ottosson) ------------------------------


def srgb_to_lin(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin_to_srgb(c: float) -> float:
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def hex_to_rgb(color: str) -> tuple[float, float, float]:
    h = color.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))


def rgb_to_hex(rgb) -> str:
    return "#" + "".join(f"{max(0, min(255, round(c * 255))):02x}" for c in rgb)


def rgb_to_oklab(rgb) -> tuple[float, float, float]:
    r, g, b = (srgb_to_lin(c) for c in rgb)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = (math.copysign(abs(v) ** (1 / 3), v) for v in (l, m, s))
    return (
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    )


def oklab_to_lin(lab) -> tuple[float, float, float]:
    L, a, b = lab
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_**3, m_**3, s_**3
    return (
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )


def to_oklch(color: str) -> tuple[float, float, float]:
    """(L, C, h en radianes)."""
    L, a, b = rgb_to_oklab(hex_to_rgb(color))
    return L, math.hypot(a, b), math.atan2(b, a)


def oklch_to_rgb_clamped(L: float, C: float, h: float) -> tuple[float, float, float]:
    """sRGB de (L, C, h). Si no cabe, recorta el croma por bisección, con el
    mismo L y el mismo tono: `lo` es siempre un croma que cabe y `hi`, uno
    que no cabe."""

    def inside(c: float) -> bool:
        lin = oklab_to_lin((L, c * math.cos(h), c * math.sin(h)))
        return all(-1e-6 <= v <= 1 + 1e-6 for v in lin)

    if inside(C):
        c = C
    else:
        lo, hi = 0.0, C
        for _ in range(40):
            mid = (lo + hi) / 2
            if inside(mid):
                lo = mid
            else:
                hi = mid
        c = lo
    lin = oklab_to_lin((L, c * math.cos(h), c * math.sin(h)))
    return tuple(lin_to_srgb(min(1, max(0, v))) for v in lin)


def relative_luminance(color: str) -> float:
    r, g, b = (srgb_to_lin(c) for c in hex_to_rgb(color))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(first: str, second: str) -> float:
    hi, lo = sorted((relative_luminance(first), relative_luminance(second)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def delta_e(first: str, second: str) -> float:
    return math.dist(rgb_to_oklab(hex_to_rgb(first)), rgb_to_oklab(hex_to_rgb(second)))


def hue_drift(original: str, soft: str) -> float:
    """Diferencia de tono en grados, entre -180 y 180."""
    diff = math.degrees(to_oklch(soft)[2] - to_oklch(original)[2])
    return (diff + 180) % 360 - 180


# -- Entrada: NETWORK_COLORS de networks.ts -----------------------------------

OBJECT = re.compile(r"export const NETWORK_COLORS: Record<string, string> = \{\n(.*?)\n\};", re.S)
ENTRY = re.compile(r'^\s*"?([\w.-]+)"?\s*:\s*"(#[0-9a-fA-F]{6})",?\s*(//.*)?$')


def read_network_colors(source: str) -> dict[str, str]:
    """NETWORK_COLORS, en el orden del archivo. Se para si una línea del
    objeto no es ni una entrada ni un comentario: así nunca se pierde una
    red en silencio."""
    match = OBJECT.search(source)
    if not match:
        sys.exit(f"No encuentro NETWORK_COLORS en {NETWORKS_TS}")
    colors: dict[str, str] = {}
    for line in match.group(1).split("\n"):
        if not line.strip() or line.strip().startswith("//"):
            continue
        entry = ENTRY.match(line)
        if not entry:
            sys.exit(f"Línea de NETWORK_COLORS que no entiendo: {line.strip()!r}")
        key, value = entry.group(1), entry.group(2).lower()
        if key in colors:
            sys.exit(f"Clave repetida en NETWORK_COLORS: {key}")
        colors[key] = value
    if UNCLASSIFIED not in colors:
        sys.exit(f"NETWORK_COLORS no tiene la clave {UNCLASSIFIED!r}")
    return colors


def group_of(key: str) -> str:
    return key.split(".", 1)[0] if "." in key else DEMO_GROUP


def groups_of(colors: dict[str, str]) -> dict[str, dict[str, str]]:
    groups: dict[str, dict[str, str]] = {}
    for key, value in colors.items():
        if key != UNCLASSIFIED:
            groups.setdefault(group_of(key), {})[key] = value
    for group, members in groups.items():
        if len(members) < 2:
            sys.exit(f"El grupo «{group}» tiene una sola red ({', '.join(members)}): el método "
                     "reparte la luminosidad entre las redes de un grupo y necesita al menos dos.")
    return groups


# -- Método (spec 4.3) --------------------------------------------------------


def soften(colors: dict[str, str], theme: dict) -> dict[str, str]:
    """Paleta suave de un grupo en un tema: clave -> #rrggbb."""
    lo, hi = theme["band"]
    cmax = theme["cmax"]
    lch = {key: to_oklch(value) for key, value in colors.items()}
    # 2) Luminosidad: del mínimo al máximo del grupo, sin los acromáticos.
    chromatic = [L for L, C, _ in lch.values() if C > ACHROMATIC] or [0.0, 1.0]
    smin, smax = min(chromatic), max(chromatic)
    span = max(smax - smin, 1e-6)
    lightness = {
        key: min(hi, max(lo, lo + (L - smin) / span * (hi - lo))) for key, (L, _, _) in lch.items()
    }
    keys = list(colors)

    def build() -> dict[str, str]:
        out = {}
        for key in keys:
            _, C0, h = lch[key]
            C = min(C0, cmax) if C0 > ACHROMATIC else 0.0  # 1) y 3)
            out[key] = rgb_to_hex(oklch_to_rgb_clamped(lightness[key], C, h))
        return out

    # 4) Separación.
    out = build()
    for _ in range(MAX_PASSES):
        moved = False
        for a, b in combinations(keys, 2):
            if delta_e(out[a], out[b]) < MIN_DELTA_E:
                up, down = (a, b) if lightness[a] >= lightness[b] else (b, a)
                lightness[up] = min(hi + BAND_MARGIN, lightness[up] + 0.01)
                lightness[down] = max(lo - BAND_MARGIN, lightness[down] - 0.01)
                moved = True
        if not moved:
            break
        out = build()
    return out


def unclassified_gray(theme: dict) -> str:
    """5) «Sin clasificar»: gris con L = centro de la banda - 0,02."""
    lo, hi = theme["band"]
    return rgb_to_hex(oklch_to_rgb_clamped((lo + hi) / 2 - 0.02, 0.0, 0.0))


def build_palettes(colors: dict[str, str]) -> dict[str, dict[str, str]]:
    """Tema -> clave -> color suave, con las claves en el orden de NETWORK_COLORS."""
    palettes = {}
    for name, theme in THEMES.items():
        soft: dict[str, str] = {UNCLASSIFIED: unclassified_gray(theme)}
        for group in groups_of(colors).values():
            soft.update(soften(group, theme))
        palettes[name] = {key: soft[key] for key in colors}
    return palettes


# -- Salida: softPalettes.ts ---------------------------------------------------


def header() -> str:
    bands = ", ".join(f"{name} {t['band'][0]:.2f}-{t['band'][1]:.2f}" for name, t in THEMES.items())
    caps = ", ".join(f"{name} {t['cmax']}" for name, t in THEMES.items())
    return (
        "// GENERADO por scripts/generate_soft_palettes.py a partir de NETWORK_COLORS\n"
        "// (theme/networks.ts). No se edita a mano: si cambian las redes, se vuelve a\n"
        "// generar con `python3 scripts/generate_soft_palettes.py` desde la raíz del\n"
        "// repositorio; con `--check`, el script dice si está al día.\n"
        "//\n"
        "// Paleta «suave» de las redes (docs/rediseno-interfaz-diseno.md, 4.3): el\n"
        "// tono de cada red, con la luminosidad (L de OKLCH) en la banda del tema y\n"
        "// el croma limitado. El tema Original no tiene columna propia: con «Suaves»\n"
        "// usa la de Grafito (theme/colors.ts).\n"
        f"// Bandas: {bands}.\n"
        f"// Croma máximo: {caps}.\n"
    )


def render_ts(palettes: dict[str, dict[str, str]]) -> str:
    names = ", ".join(f'"{name}"' for name in THEMES)
    table_type = "Readonly<Record<SoftPaletteTheme, Readonly<Record<string, string>>>>"
    lines = [
        header(),
        f"export const SOFT_PALETTE_THEMES = [{names}] as const;",
        "export type SoftPaletteTheme = (typeof SOFT_PALETTE_THEMES)[number];",
        "",
        f"export const SOFT_NETWORK_COLORS: {table_type} = {{",
    ]
    for name, palette in palettes.items():
        lines.append(f"  {name}: {{")
        lines.extend(f'    "{key}": "{value}",' for key, value in palette.items())
        lines.append("  },")
    lines.append("};")
    return "\n".join(lines) + "\n"


# -- Comprobación --------------------------------------------------------------


def check(colors: dict[str, str], palettes: dict[str, dict[str, str]]) -> list[str]:
    """Muestra la comprobación de cada tema y grupo; devuelve los fallos."""
    failures: list[str] = []
    groups = groups_of(colors)
    print(f"NETWORK_COLORS: {len(colors)} claves, {len(groups)} grupos y «{UNCLASSIFIED}».")
    for name, theme in THEMES.items():
        lo, hi = theme["band"]
        low, high = lo - BAND_MARGIN - L_TOLERANCE, hi + BAND_MARGIN + L_TOLERANCE
        soft, panel = palettes[name], theme["panel"]
        print(f"\n{name}: banda {lo:.2f}-{hi:.2f}, croma <= {theme['cmax']}, panel {panel}")
        print(
            "  grupo              n  ΔE mín orig -> suave"
            "  contraste orig -> suave  Δh máx  L suave"
        )
        for group, members in groups.items():
            keys = list(members)
            pairs = list(combinations(keys, 2))
            de_orig = min(delta_e(colors[a], colors[b]) for a, b in pairs)
            de_soft, pa, pb = min((delta_e(soft[a], soft[b]), a, b) for a, b in pairs)
            cr_orig = min(contrast(colors[k], panel) for k in keys)
            cr_soft = min(contrast(soft[k], panel) for k in keys)
            chromatic = [
                k
                for k in keys
                if to_oklch(colors[k])[1] >= ACHROMATIC and to_oklch(soft[k])[1] >= HUE_CHROMA_FLOOR
            ]
            drift = max((abs(hue_drift(colors[k], soft[k])) for k in chromatic), default=0.0)
            ls = [to_oklch(soft[k])[0] for k in keys]
            print(
                f"  {group:<16}{len(keys):>3}  {de_orig:.3f} -> {de_soft:.3f}"
                f"{cr_orig:>18.2f} -> {cr_soft:.2f}{drift:>13.1f}°  {min(ls):.2f}-{max(ls):.2f}"
            )
            where = f"{name}/{group}"
            if de_soft < MIN_DELTA_E:
                failures.append(f"{where}: ΔE_OK {de_soft:.4f} < {MIN_DELTA_E} ({pa} y {pb})")
            if drift > MAX_HUE_DRIFT:
                failures.append(f"{where}: el tono se mueve {drift:.1f}° (máximo 3°)")
            if min(ls) < low or max(ls) > high:
                failures.append(f"{where}: L {min(ls):.3f}-{max(ls):.3f} fuera de la banda")
            if name in DARK_THEMES and cr_soft < MIN_CONTRAST_DARK:
                failures.append(f"{where}: contraste {cr_soft:.2f} con el panel (mínimo 3)")
        print(f"  {UNCLASSIFIED}: {soft[UNCLASSIFIED]}")
        if name == ORIGINAL_COLUMN:
            cr = min(contrast(soft[k], ORIGINAL_PANEL) for k in colors if k != UNCLASSIFIED)
            print(f"  tema Original con «Suaves» (panel {ORIGINAL_PANEL}): contraste mín. {cr:.2f}")
            if cr < MIN_CONTRAST_DARK:
                failures.append(f"original: contraste {cr:.2f} con el panel (mínimo 3)")
    return failures


def main() -> None:
    # Salida en UTF-8 aunque la consola sea otra: en Windows, con cp1252,
    # «ΔE» y «Δh» darían un error (mismo arreglo que
    # scripts/register_cole_anticevic_networks.py).
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--check", action="store_true", help="solo dice si la tabla está al día")
    args = parser.parse_args()

    colors = read_network_colors(NETWORKS_TS.read_text(encoding="utf-8"))
    palettes = build_palettes(colors)
    text = render_ts(palettes)
    output = OUTPUT_TS.relative_to(REPO_ROOT)
    if args.check:
        current = OUTPUT_TS.read_text(encoding="utf-8") if OUTPUT_TS.exists() else ""
        if current != text:
            sys.exit(f"{output} no está al día: vuelve a generarlo.")
        print(f"{output} está al día.")
        return
    failures = check(colors, palettes)
    if failures:
        print("\nNo cumple la comprobación; no se escribe nada:", *failures, sep="\n  ")
        sys.exit(1)
    OUTPUT_TS.write_text(text, encoding="utf-8", newline="\n")
    print(f"\nComprobación correcta. Escrito {output}.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: generar la tabla**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && python3 scripts/generate_soft_palettes.py
```

Expected, exactamente (es la salida de la prueba en seco):

```text
NETWORK_COLORS: 73 claves, 6 grupos y «unclassified».

grafito: banda 0.60-0.90, croma <= 0.13, panel #16191e
  grupo              n  ΔE mín orig -> suave  contraste orig -> suave  Δh máx  L suave
  demostración      7  0.063 -> 0.101              2.90 -> 4.05          0.4°  0.59-0.90
  cole-anticevic   12  0.121 -> 0.088              2.05 -> 3.88          0.4°  0.57-0.90
  gordon333        12  0.147 -> 0.088              1.19 -> 4.40          0.4°  0.60-0.94
  yeo2011-7         7  0.211 -> 0.127              1.87 -> 4.17          0.4°  0.60-0.90
  yeo2011-17       17  0.065 -> 0.086              1.11 -> 3.88          0.7°  0.57-0.95
  power2011        17  0.113 -> 0.085              1.19 -> 4.12          0.6°  0.58-0.96
  unclassified: #a8a8a8
  tema Original con «Suaves» (panel #1d1e26): contraste mín. 3.66

noche: banda 0.60-0.90, croma <= 0.145, panel #111726
  grupo              n  ΔE mín orig -> suave  contraste orig -> suave  Δh máx  L suave
  demostración      7  0.063 -> 0.102              2.94 -> 4.11          0.4°  0.59-0.90
  cole-anticevic   12  0.121 -> 0.088              2.08 -> 4.09          0.4°  0.58-0.90
  gordon333        12  0.147 -> 0.085              1.17 -> 4.45          0.4°  0.60-0.91
  yeo2011-7         7  0.211 -> 0.126              1.89 -> 4.21          0.1°  0.60-0.90
  yeo2011-17       17  0.065 -> 0.086              1.13 -> 3.94          0.7°  0.57-0.94
  power2011        17  0.113 -> 0.085              1.17 -> 4.36          0.6°  0.59-0.96
  unclassified: #a8a8a8

claro: banda 0.46-0.76, croma <= 0.14, panel #ffffff
  grupo              n  ΔE mín orig -> suave  contraste orig -> suave  Δh máx  L suave
  demostración      7  0.063 -> 0.100              2.16 -> 2.20          0.3°  0.45-0.76
  cole-anticevic   12  0.121 -> 0.085              1.07 -> 2.11          0.2°  0.44-0.76
  gordon333        12  0.147 -> 0.088              1.03 -> 1.92          0.4°  0.46-0.79
  yeo2011-7         7  0.211 -> 0.127              1.17 -> 2.09          0.3°  0.46-0.76
  yeo2011-17       17  0.065 -> 0.085              1.07 -> 1.78          0.9°  0.43-0.81
  power2011        17  0.113 -> 0.086              1.09 -> 1.92          0.5°  0.45-0.79
  unclassified: #7d7d7d

Comprobación correcta. Escrito frontend/src/theme/softPalettes.ts.
```

Y se crea `frontend/src/theme/softPalettes.ts`. Si la salida no coincide, `NETWORK_COLORS` no es el que espera el plan: no toques la tabla a mano, averigua por qué.

Comprueba también que el Python del sistema da lo mismo y que `--check` lo ve al día:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && /usr/bin/python3 scripts/generate_soft_palettes.py --check && python3 scripts/generate_soft_palettes.py --check && head -18 frontend/src/theme/softPalettes.ts && grep -c '": "#' frontend/src/theme/softPalettes.ts
```

Expected: dos veces `frontend/src/theme/softPalettes.ts está al día.`; la cabecera `// GENERADO por scripts/generate_soft_palettes.py…`, con las bandas y el croma máximo; `SOFT_PALETTE_THEMES = ["grafito", "noche", "claro"]`; y 219 entradas (73 claves por 3 temas).

- [ ] **Step 6: ver que pasan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/theme/softPalettes.test.ts src/theme/themeCss.test.ts src/logic/networkSurface.test.ts
```

Expected: PASS. `networkSurface.test.ts`, que compara `NETWORK_COLORS` con los JSON de los atlas, sigue pasando: `NETWORK_COLORS` no se ha tocado.

- [ ] **Step 7: Comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c && npm run build 2>&1 | grep -E "built in|error"
git -C /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz diff --stat -- frontend/src/theme/networks.ts
```

Expected: BASE + 17 pruebas en verde; `tsc` limpio; lint con la línea base y ningún error; `✓ built in …`; el `diff --stat` de `networks.ts`, vacío. Y la búsqueda de colores fijos de «Convenciones», sin resultados.

- [ ] **Step 8: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add scripts/generate_soft_palettes.py frontend/src/theme/softPalettes.ts frontend/src/theme/softPalettes.test.ts frontend/src/theme/themeCss.test.ts && git commit -m "Paleta: generador de la paleta suave y tabla generada

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

## Chunk 2: el modo de paleta en la lógica y en los consumidores (tanda 1)

### Task 2: modo de paleta, un solo resolvedor de exportación y consumidores

**Files:**
- Modify: `frontend/src/theme/colors.ts` (entero)
- Modify: `frontend/src/theme/useDrawColors.ts` (entero)
- Modify: `frontend/src/state/appearance.ts`
- Modify: `frontend/src/components/Connectogram.tsx`, `frontend/src/components/Hemisferios.tsx` y `frontend/src/components/DetailPanel.tsx` (importaciones y resolvedor de la exportación)
- Modify: `frontend/src/components/FilterPanel.tsx` (muestras de color)
- Modify: `frontend/src/components/SettingsMenu.tsx` (puntos de las tarjetas)
- Modify, solo comentarios: `frontend/src/components/NetworkTag.tsx`, `frontend/src/logic/exportImage.ts` y `frontend/src/logic/exportPalette.ts`
- Test: `frontend/src/theme/colors.test.ts` (entero), `frontend/src/state/appearance.test.ts` y `frontend/src/components/FilterPanel.test.tsx`

Todo va en una tarea porque cambian firmas: con `resolveNetworkColor(clave, tema, modo)` y `exportResolverFor(tema, modo)`, sus llamadas dejan de compilar hasta que se actualizan.

- [ ] **Step 0: los archivos que se sustituyen enteros siguen como los dejó la fase 1**

Los Steps 1, 5 y 6 sustituyen enteros tres archivos. Si alguien los cambió después de `089703a` (una corrección de otra fase, por ejemplo), sustituirlos borraría ese cambio en silencio:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git diff --quiet 089703a -- frontend/src/theme/colors.ts frontend/src/theme/useDrawColors.ts frontend/src/theme/colors.test.ts && echo "sin cambios desde 089703a"
```

Expected: `sin cambios desde 089703a`. Si no sale, mira el cambio con `git diff 089703a -- <archivo>`, llévalo a mano al contenido nuevo sin cambiar lo que hace este plan, y anótalo en el informe de la tarea.

- [ ] **Step 1: las pruebas de los colores, `frontend/src/theme/colors.test.ts`**

Sustituyen a las de la fase 1, que fijaban «siempre el color original». Cubren lo que pide el spec (10):
- `effectivePaletteMode`;
- `resolveNetworkColor` en los cuatro temas y con los dos modos, con las claves desconocidas;
- `exportColorFor` con el modo, y con el tema Original y «Originales del atlas», exactamente los colores de hoy;
- `currentExportResolver`, que lee el store;
- la prueba invariante del 3D y los SVG, ahora con los dos modos.

Sustituye todo `frontend/src/theme/colors.test.ts` por:

```ts
import { describe, expect, it } from "vitest";
import { useAppearanceStore } from "../state/appearance";
import { NETWORK_COLORS, NEUTRAL_COLOR } from "./networks";
import { SOFT_NETWORK_COLORS } from "./softPalettes";
import { DRAW_TOKENS, THEME_IDS, type DrawTokens } from "./themes";
import {
  PALETTE_MODES,
  effectivePaletteMode,
  exportColorFor,
  exportNetworkColor,
  exportResolverFor,
  hasNetworkColor,
  isPaletteMode,
  ngFill,
  ngStrokeOpacity,
  resolveNetworkColor,
} from "./colors";
import { currentExportResolver, drawColorsFor } from "./useDrawColors";

const KNOWN_KEYS = Object.keys(NETWORK_COLORS);

describe("effectivePaletteMode", () => {
  it("sin elección (null), «Originales» con el tema Original y «Suaves» con los demás", () => {
    expect(effectivePaletteMode("original", null)).toBe("original");
    for (const theme of ["grafito", "noche", "claro"] as const) expect(effectivePaletteMode(theme, null)).toBe("suave");
  });

  it("una elección gana al automático en cualquier tema", () => {
    for (const theme of THEME_IDS) {
      expect(effectivePaletteMode(theme, "suave")).toBe("suave");
      expect(effectivePaletteMode(theme, "original")).toBe("original");
    }
  });

  it("isPaletteMode reconoce los dos modos", () => {
    expect(PALETTE_MODES.every(isPaletteMode)).toBe(true);
    expect(isPaletteMode("auto")).toBe(false);
    expect(isPaletteMode(null)).toBe(false);
  });
});

describe("resolveNetworkColor", () => {
  it.each(THEME_IDS)("con «Originales del atlas», el color de NETWORK_COLORS (tema %s)", (theme) => {
    for (const key of KNOWN_KEYS) expect(resolveNetworkColor(key, theme, "original"), key).toBe(NETWORK_COLORS[key]);
  });

  it.each(["grafito", "noche", "claro"] as const)("con «Suaves», la columna del tema %s", (theme) => {
    for (const key of KNOWN_KEYS) expect(resolveNetworkColor(key, theme, "suave"), key).toBe(SOFT_NETWORK_COLORS[theme][key]);
  });

  it("el tema Original, con «Suaves», usa la columna de Grafito", () => {
    for (const key of KNOWN_KEYS) expect(resolveNetworkColor(key, "original", "suave"), key).toBe(SOFT_NETWORK_COLORS.grafito[key]);
  });

  it("una red desconocida usa el «sin clasificar» de la paleta activa", () => {
    expect(resolveNetworkColor("no-existe", "grafito", "original")).toBe("#8a8a8a");
    expect(resolveNetworkColor("no-existe", "grafito", "suave")).toBe("#a8a8a8");
    expect(resolveNetworkColor("no-existe", "claro", "suave")).toBe("#7d7d7d");
    expect(resolveNetworkColor("no-existe", "original", "suave")).toBe("#a8a8a8");
    // Claves que existen en cualquier objeto por su prototipo, no como red.
    expect(resolveNetworkColor("constructor", "noche", "original")).toBe("#8a8a8a");
    expect(resolveNetworkColor("constructor", "noche", "suave")).toBe("#a8a8a8");
  });
});

describe("hasNetworkColor", () => {
  it("distingue una red real de una clave heredada o inexistente", () => {
    expect(hasNetworkColor("cole-anticevic.visual")).toBe(true);
    expect(hasNetworkColor("no-existe")).toBe(false);
    expect(hasNetworkColor("constructor")).toBe(false);
  });
});

describe("exportColorFor", () => {
  it("con «Originales del atlas», las redes salen con el color de NETWORK_COLORS en cualquier tema", () => {
    for (const theme of THEME_IDS) {
      expect(exportColorFor("net:cole-anticevic.default", "paint", theme, "original")).toBe("#ff0000");
    }
  });

  it("con «Suaves», las redes salen con la columna de Claro en cualquier tema (4.4)", () => {
    for (const theme of THEME_IDS) {
      expect(exportColorFor("net:cole-anticevic.default", "paint", theme, "suave")).toBe("#c05548");
    }
  });

  it("una red desconocida en net: usa el «sin clasificar» de la paleta de exportación", () => {
    expect(exportColorFor("net:desconocida", "paint", "claro", "original")).toBe("#8a8a8a");
    expect(exportColorFor("net:desconocida", "paint", "grafito", "suave")).toBe("#7d7d7d");
  });

  it("con el tema Original y «Originales del atlas», exactamente los colores de hoy", () => {
    for (const key of [...KNOWN_KEYS, "red-que-no-existe"]) {
      const today = hasNetworkColor(key) ? NETWORK_COLORS[key] : "#8a8a8a";
      expect(exportColorFor(`net:${key}`, "paint", "original", "original"), key).toBe(today);
    }
    expect(exportColorFor("edge", "paint", "original", "original")).toBe(NEUTRAL_COLOR);
    expect(exportColorFor("selected", "paint", "original", "original")).toBe("#ac61d1");
    expect(exportColorFor("edgeOpacityConnectogram", "opacity", "original", "original")).toBe("0.55");
    expect(exportColorFor("hemiFill", "paint", "original", "original")).toBe("none");
  });

  it("con los temas 2 a 4, los colores de dibujo de Claro, con cualquier paleta", () => {
    for (const mode of PALETTE_MODES) {
      expect(exportColorFor("edge", "paint", "noche", mode)).toBe(DRAW_TOKENS.claro.edge);
      expect(exportColorFor("selected", "paint", "grafito", mode)).toBe(DRAW_TOKENS.claro.selected);
    }
  });

  it("devuelve null para referencias desconocidas o que no son un color", () => {
    expect(exportColorFor("inventado", "paint", "original", "original")).toBeNull();
    expect(exportColorFor("cortexSulcus", "paint", "original", "original")).toBeNull();
  });

  it("un tipo que no coincide con el del token devuelve null", () => {
    expect(exportColorFor("edgeOpacitySelected", "paint", "original", "original")).toBeNull();
    expect(exportColorFor("edge", "opacity", "original", "original")).toBeNull();
    expect(exportColorFor("dash", "paint", "original", "original")).toBeNull();
    expect(exportColorFor("net:cole-anticevic.visual", "opacity", "original", "suave")).toBeNull();
  });

  it("las claves heredadas del prototipo no son un token válido", () => {
    expect(exportColorFor("toString", "paint", "original", "original")).toBeNull();
    expect(exportColorFor("__proto__", "paint", "original", "original")).toBeNull();
    expect(exportColorFor("constructor", "paint", "original", "original")).toBeNull();
  });

  it("exportResolverFor fija el tema y la paleta", () => {
    expect(exportResolverFor("claro", "suave")("edge", "paint")).toBe(DRAW_TOKENS.claro.edge);
    expect(exportResolverFor("noche", "suave")("net:cole-anticevic.visual", "paint")).toBe("#294c9f");
    expect(exportResolverFor("noche", "original")("net:cole-anticevic.visual", "paint")).toBe("#0000ff");
  });
});

// Los SVG exportan con currentExportResolver: lee el tema y la paleta del
// store al pulsar «Exportar JPEG» (el único resolvedor de exportación).
describe("currentExportResolver", () => {
  it.each([
    ["grafito", null, "#294c9f"],
    ["original", null, "#0000ff"],
    ["original", "suave", "#294c9f"],
    ["claro", "original", "#0000ff"],
  ] as const)("tema %s con paleta %s: Visual sale %s", (theme, paletteMode, expected) => {
    useAppearanceStore.setState({ theme, paletteMode });
    expect(currentExportResolver()("net:cole-anticevic.visual", "paint")).toBe(expected);
  });

  it("los colores de dibujo siguen al tema del store", () => {
    useAppearanceStore.setState({ theme: "original", paletteMode: "suave" });
    expect(currentExportResolver()("selected", "paint")).toBe(DRAW_TOKENS.original.selected);
    useAppearanceStore.setState({ theme: "noche", paletteMode: "original" });
    expect(currentExportResolver()("selected", "paint")).toBe(DRAW_TOKENS.claro.selected);
  });
});

describe("ayudantes data-ng-*", () => {
  it("ngFill y ngStrokeOpacity generan el atributo con la referencia", () => {
    expect(ngFill("edge")).toEqual({ "data-ng-fill": "edge" });
    expect(ngStrokeOpacity("edgeOpacitySelected")).toEqual({ "data-ng-stroke-opacity": "edgeOpacitySelected" });
  });
});

describe("ayudantes data-ng-* con tipo", () => {
  it("una referencia mal escrita no compila", () => {
    // Estos @ts-expect-error solo fallan con `tsc -b` (build y chequeo de tipos), no con `npm test`.
    // @ts-expect-error: "egde" no es un token de color
    ngFill("egde");
    // @ts-expect-error: "edge" es un color, no una opacidad
    ngStrokeOpacity("edge");
    expect(typeof ngFill).toBe("function");
  });
});

describe("drawColorsFor", () => {
  it("devuelve los tokens del tema y los colores de red de su paleta", () => {
    const colors = drawColorsFor("noche", "suave");
    expect(colors.edge).toBe(DRAW_TOKENS.noche.edge);
    expect(colors.networkColor("cole-anticevic.visual")).toBe("#4d76cf");
    expect(drawColorsFor("noche", "original").networkColor("cole-anticevic.visual")).toBe("#0000ff");
  });

  it("forExport devuelve los tokens de exportación", () => {
    expect(drawColorsFor("grafito", "suave", true).selected).toBe(DRAW_TOKENS.claro.selected);
    expect(drawColorsFor("original", "original", true).selected).toBe(DRAW_TOKENS.original.selected);
  });
});

// El cerebro 3D exporta volviendo a dibujar con drawColorsFor(tema, modo,
// true); los SVG, con exportColorFor sobre sus atributos data-ng-*. Las dos
// vías tienen que dar los mismos colores en cada tema y con cada paleta, o
// el 3D y el connectograma exportados no casarían.
describe("exportación: el 3D y los SVG usan los mismos colores", () => {
  const keys = [...KNOWN_KEYS, "red-que-no-existe"];
  const cases = THEME_IDS.flatMap((theme) => PALETTE_MODES.map((mode) => [theme, mode] as const));

  it.each(cases)("colores de red, tema %s, paleta %s", (theme, mode) => {
    const colors = drawColorsFor(theme, mode, true);
    for (const key of keys) {
      expect(colors.networkColor(key), key).toBe(exportColorFor(`net:${key}`, "paint", theme, mode));
    }
  });

  it.each(cases)("tokens de color y de opacidad, tema %s, paleta %s", (theme, mode) => {
    const colors = drawColorsFor(theme, mode, true);
    for (const key of Object.keys(DRAW_TOKENS[theme]) as (keyof DrawTokens)[]) {
      const value = colors[key];
      if (typeof value === "number") expect(exportColorFor(key, "opacity", theme, mode), key).toBe(String(value));
      else if (typeof value === "string" && key !== "dash") expect(exportColorFor(key, "paint", theme, mode), key).toBe(value);
    }
  });

  it.each(THEME_IDS)("tema %s: con «Suaves», la columna de Claro; con «Originales», NETWORK_COLORS", (theme) => {
    for (const key of KNOWN_KEYS) {
      expect(exportNetworkColor(key, "suave"), key).toBe(SOFT_NETWORK_COLORS.claro[key]);
      expect(drawColorsFor(theme, "suave", true).networkColor(key), key).toBe(SOFT_NETWORK_COLORS.claro[key]);
      expect(drawColorsFor(theme, "original", true).networkColor(key), key).toBe(NETWORK_COLORS[key]);
    }
  });
});
```

- [ ] **Step 2: `setPaletteMode`, en `frontend/src/state/appearance.test.ts`**

En `frontend/src/state/appearance.test.ts`, busca:

```ts
    const storage = memoryStorage({ [APPEARANCE_STORAGE_KEY]: '{"theme":"azul","paletteMode":"suave"}' });
    expect(readAppearance(storage)).toEqual({ theme: "grafito", paletteMode: "suave" });
```

Sustitúyelo por:

```ts
    const storage = memoryStorage({ [APPEARANCE_STORAGE_KEY]: '{"theme":"azul","paletteMode":"suave"}' });
    expect(readAppearance(storage)).toEqual({ theme: "grafito", paletteMode: "suave" });
    const badMode = memoryStorage({ [APPEARANCE_STORAGE_KEY]: '{"theme":"noche","paletteMode":"vivo"}' });
    expect(readAppearance(badMode)).toEqual({ theme: "noche", paletteMode: null });
```

En `frontend/src/state/appearance.test.ts`, busca:

```ts
    expect(JSON.parse(storage.data[APPEARANCE_STORAGE_KEY])).toEqual({ theme: "claro", paletteMode: "original" });
    expect(document.documentElement.dataset.theme).toBe("claro");
  });
```

Sustitúyelo por:

```ts
    expect(JSON.parse(storage.data[APPEARANCE_STORAGE_KEY])).toEqual({ theme: "claro", paletteMode: "original" });
    expect(document.documentElement.dataset.theme).toBe("claro");
  });

  it("setPaletteMode guarda la elección con el tema actual, sin cambiar el tema; null vuelve a «Automática»", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage });

    useAppearanceStore.setState({ theme: "noche", paletteMode: null });
    useAppearanceStore.getState().setPaletteMode("original");
    expect(useAppearanceStore.getState()).toMatchObject({ theme: "noche", paletteMode: "original" });
    expect(JSON.parse(storage.data[APPEARANCE_STORAGE_KEY])).toEqual({ theme: "noche", paletteMode: "original" });

    useAppearanceStore.getState().setPaletteMode(null);
    expect(useAppearanceStore.getState()).toMatchObject({ theme: "noche", paletteMode: null });
    expect(JSON.parse(storage.data[APPEARANCE_STORAGE_KEY])).toEqual({ theme: "noche", paletteMode: null });
  });
```

- [ ] **Step 3: las muestras de Filtros, en `frontend/src/components/FilterPanel.test.tsx`**

Dos pruebas: con la paleta automática y con una elección guardada.
- En node no hay almacenamiento, así que el store empieza en Grafito sin paleta elegida, y la automática es «Suaves».
- El store lee la elección guardada solo al crearse. Para la segunda prueba, `vi.resetModules()` lo vuelve a crear con un `localStorage` simulado, y `react-dom/server` y `FilterPanel` se importan después, ya con ese store. Sin esta prueba, un `useDrawColors` que no leyera el modo guardado pasaría todas las demás.
- Si el render de la prueba que ya hay en el archivo usa otros props obligatorios, copia los suyos.

En `frontend/src/components/FilterPanel.test.tsx`, busca:

```tsx
import { describe, expect, it } from "vitest";
```

Sustitúyelo por:

```tsx
import { afterEach, describe, expect, it, vi } from "vitest";
```

En `frontend/src/components/FilterPanel.test.tsx`, busca:

```tsx
import { FilterPanel } from "./FilterPanel";
```

Sustitúyelo por:

```tsx
import { NETWORK_COLORS } from "../theme/networks";
import { SOFT_NETWORK_COLORS } from "../theme/softPalettes";
import { FilterPanel } from "./FilterPanel";
```

Añade al final de `frontend/src/components/FilterPanel.test.tsx`, tras una línea en blanco:

```tsx
// Paleta suave (fase 2 del rediseño). En node no hay almacenamiento: el store
// empieza en Grafito sin paleta elegida, y la automática es «Suaves».
describe("FilterPanel: muestras de color", () => {
  const counts = {
    connectionCountsByType: { structural: 0, functional: 0, effective: 0 },
    connectionTotals: { visible: 0, loaded: 0 },
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("siguen la paleta automática", () => {
    const html = renderToStaticMarkup(<FilterPanel nodes={NODES} {...counts} />);
    const visual = SOFT_NETWORK_COLORS.grafito["cole-anticevic.visual"];
    expect(html).toMatch(new RegExp(`class="filters__swatch"[^>]*style="background-color:${visual}"`));
    expect(html).not.toContain(NETWORK_COLORS["cole-anticevic.visual"]);
  });

  // El store lee la elección guardada al crearse. vi.resetModules lo vuelve
  // a crear, ahora con un localStorage simulado que guarda «Originales del
  // atlas». Si useDrawColors no leyera el modo guardado, la muestra seguiría
  // siendo la suave.
  it("siguen la paleta guardada", async () => {
    vi.resetModules();
    const saved = JSON.stringify({ theme: "grafito", paletteMode: "original" });
    vi.stubGlobal("window", { localStorage: { getItem: () => saved, setItem: () => {} } });
    const server = await import("react-dom/server");
    const { FilterPanel: StoredFilterPanel } = await import("./FilterPanel");
    const html = server.renderToStaticMarkup(<StoredFilterPanel nodes={NODES} {...counts} />);
    expect(html).toMatch(
      new RegExp(`class="filters__swatch"[^>]*style="background-color:${NETWORK_COLORS["cole-anticevic.visual"]}"`),
    );
  });
});
```

- [ ] **Step 4: ver que fallan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/theme/colors.test.ts src/state/appearance.test.ts src/components/FilterPanel.test.tsx
```

Expected: FAIL. En `colors.test.ts`, porque `effectivePaletteMode`, `exportNetworkColor`, `currentExportResolver` y los parámetros nuevos no existen; en `appearance.test.ts`, porque falta `setPaletteMode`; y en `FilterPanel.test.tsx`, «siguen la paleta automática», porque la muestra lleva `#0000ff`. «Siguen la paleta guardada» ya pasa, porque hoy todo es original: está para que la implementación no ignore la elección guardada.

- [ ] **Step 5: implementar `frontend/src/theme/colors.ts`**

Sustituye todo `frontend/src/theme/colors.ts` por:

```ts
// Resolución de colores (docs/rediseno-interfaz-diseno.md, 4.3 a 4.5).
// Funciones puras: se prueban sin DOM. Reciben el modo de paleta que se
// aplica; solo effectivePaletteMode recibe la elección guardada, que puede
// ser null (automático).
import { NETWORK_COLORS } from "./networks";
import { SOFT_NETWORK_COLORS, type SoftPaletteTheme } from "./softPalettes";
import { exportDrawTokens, type DrawTokens, type OpacityToken, type PaintToken, type ThemeId } from "./themes";

const UNCLASSIFIED = "unclassified";

// Colores de las redes (4.3): «Suaves» o «Originales del atlas».
export const PALETTE_MODES = ["suave", "original"] as const;
export type PaletteMode = (typeof PALETTE_MODES)[number];

export function isPaletteMode(value: unknown): value is PaletteMode {
  return typeof value === "string" && (PALETTE_MODES as readonly string[]).includes(value);
}

// Modo que se aplica (4.5): el elegido o, sin elección (null), el
// automático: «Originales» con el tema Original y «Suaves» con los demás.
export function effectivePaletteMode(theme: ThemeId, paletteMode: PaletteMode | null): PaletteMode {
  return paletteMode ?? (theme === "original" ? "original" : "suave");
}

// True si la clave tiene color en NETWORK_COLORS (redes de los atlas, de demostración y «sin clasificar»), sin contar las heredadas del prototipo.
export function hasNetworkColor(key: string): boolean {
  return Object.hasOwn(NETWORK_COLORS, key);
}

// Columna de la paleta suave de cada tema. El tema Original no tiene
// columna propia: usa la de Grafito (4.3).
function softColumn(theme: ThemeId): SoftPaletteTheme {
  return theme === "original" ? "grafito" : theme;
}

// Color de una red en pantalla. Con «Originales del atlas», el de
// NETWORK_COLORS; con «Suaves», el de la tabla generada para el tema
// (theme/softPalettes.ts). Una clave desconocida usa el «sin clasificar» de
// la paleta activa. El `??` final solo actuaría con una tabla sin
// regenerar (theme/softPalettes.test.ts lo impide): antes el color del
// atlas que un gris que parecería «sin red».
export function resolveNetworkColor(key: string, theme: ThemeId, mode: PaletteMode): string {
  const known = hasNetworkColor(key) ? key : UNCLASSIFIED;
  if (mode === "original") return NETWORK_COLORS[known];
  return SOFT_NETWORK_COLORS[softColumn(theme)][known] ?? NETWORK_COLORS[known];
}

// Color de una red en la exportación JPEG, siempre sobre blanco (4.4): con
// «Suaves», la columna de Claro, sea cual sea el tema de pantalla.
export function exportNetworkColor(key: string, mode: PaletteMode): string {
  return resolveNetworkColor(key, "claro", mode);
}

// Referencia de pintura para un atributo `data-ng-fill`/`data-ng-stroke`:
// un token de color de DrawTokens o una red con el prefijo `net:`.
export type PaintRef = PaintToken | `net:${string}`;
export type ExportAttributeKind = "paint" | "opacity";

// Valor de exportación de una referencia `data-ng-*`. Con `kind: "paint"`
// resuelve `net:<clave de red>` (exportNetworkColor) o un token de
// DrawTokens que sea color (nunca "dash", que no es una pintura). Con
// `kind: "opacity"` resuelve un token de DrawTokens que sea número, como
// cadena. null si la referencia no existe, es heredada del prototipo, o no
// es de la clase pedida (los grises de la corteza son tripletes: nunca son
// ni "paint" ni "opacity").
export function exportColorFor(ref: string, kind: ExportAttributeKind, theme: ThemeId, mode: PaletteMode): string | null {
  const tokens = exportDrawTokens(theme);
  if (kind === "paint") {
    if (ref.startsWith("net:")) return exportNetworkColor(ref.slice("net:".length), mode);
    if (ref === "dash" || !Object.hasOwn(tokens, ref)) return null;
    const value = tokens[ref as keyof DrawTokens];
    return typeof value === "string" ? value : null;
  }
  if (!Object.hasOwn(tokens, ref)) return null;
  const value = tokens[ref as keyof DrawTokens];
  return typeof value === "number" ? String(value) : null;
}

export function exportResolverFor(
  theme: ThemeId,
  mode: PaletteMode,
): (ref: string, kind: ExportAttributeKind) => string | null {
  return (ref, kind) => exportColorFor(ref, kind, theme, mode);
}

// Ayudantes tipados para los atributos data-ng-*: una referencia mal
// escrita es un error de compilación en JSX, no un fallo silencioso que
// solo se ve en la imagen exportada.
export function ngFill(ref: PaintRef): { "data-ng-fill": PaintRef } {
  return { "data-ng-fill": ref };
}
export function ngStroke(ref: PaintRef): { "data-ng-stroke": PaintRef } {
  return { "data-ng-stroke": ref };
}
export function ngStrokeOpacity(ref: OpacityToken): { "data-ng-stroke-opacity": OpacityToken } {
  return { "data-ng-stroke-opacity": ref };
}
```

- [ ] **Step 6: implementar `frontend/src/theme/useDrawColors.ts`**

`useDrawColors(forExport)` conserva su firma: así `Brain3D.tsx` no cambia (ver «Rama en paralelo»).

Sustituye todo `frontend/src/theme/useDrawColors.ts` por:

```ts
// Colores de dibujo (SVG y 3D) del tema y de la paleta de redes activos (D3
// de docs/decisiones-diseno.md y fase 2 del rediseño). forExport: los de la
// exportación (docs/rediseno-interfaz-diseno.md, 4.4). Solo lo usa Brain3D,
// con su estado local «exportando».
import { useMemo } from "react";
import { useAppearanceStore } from "../state/appearance";
import {
  effectivePaletteMode,
  exportNetworkColor,
  exportResolverFor,
  resolveNetworkColor,
  type ExportAttributeKind,
  type PaletteMode,
} from "./colors";
import { DRAW_TOKENS, exportDrawTokens, type DrawTokens, type ThemeId } from "./themes";

export interface DrawColors extends DrawTokens {
  networkColor: (key: string) => string;
}

// mode: el modo de paleta que se aplica (effectivePaletteMode). Con
// forExport, los colores de red son los de la exportación, los mismos que
// exportColorFor da a los SVG: con «Suaves», la columna de Claro.
export function drawColorsFor(theme: ThemeId, mode: PaletteMode, forExport = false): DrawColors {
  if (forExport) return { ...exportDrawTokens(theme), networkColor: (key) => exportNetworkColor(key, mode) };
  return { ...DRAW_TOKENS[theme], networkColor: (key) => resolveNetworkColor(key, theme, mode) };
}

export function useDrawColors(forExport = false): DrawColors {
  const theme = useAppearanceStore((state) => state.theme);
  const paletteMode = useAppearanceStore((state) => state.paletteMode);
  const mode = effectivePaletteMode(theme, paletteMode);
  return useMemo(() => drawColorsFor(theme, mode, forExport), [theme, mode, forExport]);
}

// Resolvedor de la exportación de los SVG (4.4), con el tema y la paleta de
// ese momento: se llama al pulsar «Exportar JPEG», no al dibujar. Es el
// único sitio que lee los dos del store para exportar; el 3D llega a los
// mismos colores con useDrawColors(true).
export function currentExportResolver(): (ref: string, kind: ExportAttributeKind) => string | null {
  const { theme, paletteMode } = useAppearanceStore.getState();
  return exportResolverFor(theme, effectivePaletteMode(theme, paletteMode));
}
```

- [ ] **Step 7: `setPaletteMode`, en `frontend/src/state/appearance.ts`**

En `frontend/src/state/appearance.ts`, busca:

```ts
// Tema elegido y modo de la paleta de redes (D3 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 4.5). paletteMode null = automático:
// "original" con el tema 1 y "suave" con los demás. La paleta suave llega
// en la fase 2, pero el formato guardado ya la incluye para no tener que
// migrarlo después.
import { create } from "zustand";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "../theme/themes";

export type PaletteMode = "suave" | "original";
```

Sustitúyelo por:

```ts
// Tema elegido y modo de la paleta de redes (D3 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 4.5). paletteMode null = automático:
// "original" con el tema 1 y "suave" con los demás (effectivePaletteMode, en
// theme/colors.ts). Cambiar de tema no borra un modo elegido a mano.
import { create } from "zustand";
import { isPaletteMode, type PaletteMode } from "../theme/colors";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "../theme/themes";
```

En `frontend/src/state/appearance.ts`, busca:

```ts
      paletteMode: paletteMode === "suave" || paletteMode === "original" ? paletteMode : null,
```

Sustitúyelo por:

```ts
      paletteMode: isPaletteMode(paletteMode) ? paletteMode : null,
```

En `frontend/src/state/appearance.ts`, busca:

```ts
interface AppearanceState extends Appearance {
  setTheme: (theme: ThemeId) => void;
}
```

Sustitúyelo por:

```ts
interface AppearanceState extends Appearance {
  setTheme: (theme: ThemeId) => void;
  setPaletteMode: (paletteMode: PaletteMode | null) => void;
}
```

En `frontend/src/state/appearance.ts`, busca:

```ts
    applyThemeToDocument(theme);
  },
}));
```

Sustitúyelo por:

```ts
    applyThemeToDocument(theme);
  },
  // «Colores de las redes» en Ajustes (5.2). No toca el documento: los
  // colores de red no son variables CSS, los componentes los leen del store
  // con useDrawColors.
  setPaletteMode: (paletteMode) => {
    set({ paletteMode });
    writeAppearance(browserStorage(), { theme: get().theme, paletteMode });
  },
}));
```

- [ ] **Step 8: un solo resolvedor de exportación, en `frontend/src/components/Connectogram.tsx`, `Hemisferios.tsx` y `DetailPanel.tsx`**

En los tres, solo cambian las importaciones y la línea del resolvedor. El store deja de importarse: era solo para esa línea.

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
import { exportResolverFor, ngFill, ngStroke, ngStrokeOpacity } from "../theme/colors";
import { useDrawColors, type DrawColors } from "../theme/useDrawColors";
import { useAppearanceStore } from "../state/appearance";
```

Sustitúyelo por:

```tsx
import { ngFill, ngStroke, ngStrokeOpacity } from "../theme/colors";
import { currentExportResolver, useDrawColors, type DrawColors } from "../theme/useDrawColors";
```

En `frontend/src/components/Connectogram.tsx`, busca:

```tsx
        exportResolverFor(useAppearanceStore.getState().theme),
```

Sustitúyelo por:

```tsx
        currentExportResolver(),
```

En `frontend/src/components/Hemisferios.tsx`, busca:

```tsx
import { exportResolverFor, ngFill, ngStroke, ngStrokeOpacity } from "../theme/colors";
import { useDrawColors } from "../theme/useDrawColors";
import { useAppearanceStore } from "../state/appearance";
```

Sustitúyelo por:

```tsx
import { ngFill, ngStroke, ngStrokeOpacity } from "../theme/colors";
import { currentExportResolver, useDrawColors } from "../theme/useDrawColors";
```

En `frontend/src/components/Hemisferios.tsx`, busca:

```tsx
        exportResolverFor(useAppearanceStore.getState().theme),
```

Sustitúyelo por:

```tsx
        currentExportResolver(),
```

En `frontend/src/components/DetailPanel.tsx`, busca:

```tsx
import { exportResolverFor, ngFill, ngStroke } from "../theme/colors";
import { useDrawColors } from "../theme/useDrawColors";
import { useAppearanceStore } from "../state/appearance";
```

Sustitúyelo por:

```tsx
import { ngFill, ngStroke } from "../theme/colors";
import { currentExportResolver, useDrawColors } from "../theme/useDrawColors";
```

En `frontend/src/components/DetailPanel.tsx`, busca:

```tsx
        exportResolverFor(useAppearanceStore.getState().theme),
```

Sustitúyelo por:

```tsx
        currentExportResolver(),
```

Y los comentarios que nombraban la llamada antigua.

En `frontend/src/logic/exportImage.ts`, busca:

```ts
 * @param resolveColor Resuelve las referencias `data-ng-*` del clon a la
 * paleta de exportación del tema activo (D3 de docs/decisiones-diseno.md).
 * Quien llama lo obtiene con `exportResolverFor(theme)` (theme/colors.ts).
```

Sustitúyelo por:

```ts
 * @param resolveColor Resuelve las referencias `data-ng-*` del clon a la
 * paleta de exportación del tema y de los colores de red activos (D3 de
 * docs/decisiones-diseno.md; spec 4.4). Quien llama lo obtiene con
 * `currentExportResolver()` (theme/useDrawColors.ts).
```

En `frontend/src/logic/exportPalette.ts`, busca:

```ts
// opacidad para stroke-opacity. exportResolverFor (theme/colors.ts) cumple
// esta firma.
```

Sustitúyelo por:

```ts
// opacidad para stroke-opacity. exportResolverFor (theme/colors.ts) y
// currentExportResolver (theme/useDrawColors.ts) devuelven uno.
```

- [ ] **Step 9: las muestras de Filtros y de Ajustes, y un comentario de `NetworkTag`**

`FilterPanel` es del desarrollador principal: solo cambia de dónde sale el color de sus muestras, igual que en las vistas.

En `frontend/src/components/FilterPanel.tsx`, busca:

```tsx
import { resolveNetworkColor } from "../theme/colors";
```

Sustitúyelo por:

```tsx
import { useDrawColors } from "../theme/useDrawColors";
```

En `frontend/src/components/FilterPanel.tsx`, busca:

```tsx
  // Redes presentes de verdad en los nodos actuales (real o demo, nunca
```

Sustitúyelo por:

```tsx
  // Muestras de color con la paleta activa (spec 4.3), como en las vistas.
  const { networkColor } = useDrawColors();

  // Redes presentes de verdad en los nodos actuales (real o demo, nunca
```

En `frontend/src/components/FilterPanel.tsx`, busca:

```tsx
style={{ backgroundColor: resolveNetworkColor(network) }}
```

Sustitúyelo por:

```tsx
style={{ backgroundColor: networkColor(network) }}
```

En Ajustes, cada tarjeta pinta sus cinco puntos con la paleta que tendría su tema: la elegida o, sin elección, la automática de ese tema (desviación 7). La Task 3 mueve este bloque a `SettingsChoices`.

En `frontend/src/components/SettingsMenu.tsx`, busca:

```tsx
import { resolveNetworkColor } from "../theme/colors";
```

Sustitúyelo por:

```tsx
import { effectivePaletteMode, resolveNetworkColor } from "../theme/colors";
```

En `frontend/src/components/SettingsMenu.tsx`, busca:

```tsx
// Cinco redes de Cole-Anticevic para la vista previa de cada tema. En la
// fase 1, con sus colores originales en todos los temas.
```

Sustitúyelo por:

```tsx
// Cinco redes de Cole-Anticevic para la vista previa de cada tema, con la
// paleta que tendría ese tema (fase 2 del rediseño).
```

En `frontend/src/components/SettingsMenu.tsx`, busca:

```tsx
  const theme = useAppearanceStore((state) => state.theme);
```

Sustitúyelo por:

```tsx
  const theme = useAppearanceStore((state) => state.theme);
  const paletteMode = useAppearanceStore((state) => state.paletteMode);
```

En `frontend/src/components/SettingsMenu.tsx`, busca:

```tsx
style={{ background: resolveNetworkColor(key) }}
```

Sustitúyelo por:

```tsx
style={{ background: resolveNetworkColor(key, id, effectivePaletteMode(id, paletteMode)) }}
```

El comentario de `NetworkTag` hablaba en futuro de esta fase.

En `frontend/src/components/NetworkTag.tsx`, busca:

```tsx
// las vistas: cuando llegue la paleta suave (fase 2), la seguirá. El punto
```

Sustitúyelo por:

```tsx
// las vistas, así que sigue la paleta activa (fase 2 del rediseño). El punto
```

Si esa línea no está tal cual (la revisión de la fase 3 pudo cambiarla), busca el comentario con `grep -n "fase 2" frontend/src/components/NetworkTag.tsx` y cambia solo esa frase. Si no hay ninguno, no hagas nada ahí.

- [ ] **Step 10: ver que pasan**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/theme/colors.test.ts src/state/appearance.test.ts src/components/FilterPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 11: no queda ninguna llamada antigua, y el 3D no se ha tocado**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && grep -rn "exportResolverFor(useAppearanceStore\|resolveNetworkColor([a-z]*)" frontend/src ; grep -rn "exportResolverFor(" frontend/src --include=*.tsx ; grep -rn "currentExportResolver()" frontend/src/components ; git diff --stat "$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase2-base.txt)" -- frontend/src/components/Brain3D.tsx frontend/src/components/PaintedCortex.tsx frontend/src/theme/networks.ts
```

Expected: las dos primeras búsquedas, sin resultados; `currentExportResolver()`, tres veces (`Connectogram.tsx`, `Hemisferios.tsx` y `DetailPanel.tsx`); y el `diff --stat`, vacío.

- [ ] **Step 12: Comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c && npm run build 2>&1 | grep -E "built in|error"
```

Expected: BASE + 48 pruebas en verde; `tsc` limpio; lint con la línea base y ningún error; `✓ built in …`. Y la búsqueda de colores fijos de «Convenciones», sin resultados.

- [ ] **Step 13: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/theme/colors.ts frontend/src/theme/useDrawColors.ts frontend/src/theme/colors.test.ts frontend/src/state/appearance.ts frontend/src/state/appearance.test.ts frontend/src/components/Connectogram.tsx frontend/src/components/Hemisferios.tsx frontend/src/components/DetailPanel.tsx frontend/src/components/FilterPanel.tsx frontend/src/components/FilterPanel.test.tsx frontend/src/components/SettingsMenu.tsx frontend/src/components/NetworkTag.tsx frontend/src/logic/exportImage.ts frontend/src/logic/exportPalette.ts && git commit -m "Paleta: modo de paleta en los colores de red y un solo resolvedor de exportacion

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Revisión de la tanda 1 (Tasks 1 y 2)

La hace quien coordina el plan, con dos revisores en paralelo (subagentes nuevos, sin el historial de la sesión). Cada uno recibe el diff de la tanda, `git diff "$(cat …/fase2-base.txt)"..HEAD`, este plan y las secciones 4.3 a 4.5, 9 y 10 del spec. No abren navegadores ni servidores: la app real se prueba en las Tasks 4 y 5.

- [ ] **Revisor A: los datos y el método**
  - El script frente a 4.3: los cinco pasos, las bandas, los topes de croma, ΔE_OK 0,085, el margen de 0,06, los acromáticos, el grupo de demostración y el gris de «sin clasificar». La bisección y el reparto de la luminosidad por grupo, las dos correcciones del prototipo.
  - La lectura de `NETWORK_COLORS`: que no pierda ninguna red en silencio, `--check` y que no escriba nada si la comprobación falla.
  - La tabla frente a la de la maqueta: idéntica salvo Power, y por qué («La paleta generada frente a la de la maqueta»). Puede regenerar el `palettes.json` del prototipo en una copia en el scratchpad, nunca en la carpeta de referencias.
  - Las pruebas de la tabla: que comprueban lo que dice el spec y no otra cosa, y que no pueden pasar con una tabla mal generada.
  - `NETWORK_COLORS` no cambia y `networkSurface.test.ts` pasa.
- [ ] **Revisor B: la lógica y los consumidores**
  - `theme/colors.ts` frente a 4.3 a 4.5 y 9: el modo automático, las claves desconocidas y las heredadas del prototipo, la columna de Grafito para Original y la de Claro en la exportación.
  - La paridad del 3D y los SVG al exportar, en los cuatro temas y con los dos modos.
  - Que `currentExportResolver` sea el único que lee el store para exportar SVG, que no quede ninguna llamada antigua y que `Brain3D.tsx` no cambie.
  - El store: `setPaletteMode` guarda el tema actual y acepta `null` («Automática»), y `setTheme` conserva la elección. La prueba de la elección guardada en Filtros (`vi.resetModules`) de verdad crea otro store.
  - Que todo lo que pinta un color de red lo siga: las vistas, el 3D, las muestras, `NetworkTag`, `RegionSearch`, el logotipo, el detalle y el diagrama de síntesis. Y que se vuelva a pintar al cambiar el modo: las dependencias de `useMemo`.
  - Los comentarios, al día; lint con la línea base.
- [ ] **Arreglos:** una ronda, con la prioridad de «Proceso», en un commit `Paleta: correcciones de la revision de la tanda 1`. Si alguno añade pruebas, las cuentas de las tareas siguientes suben lo mismo. Solo se vuelve a revisar lo que salió «importante».

## Chunk 3: «Colores de las redes» en Ajustes (tanda 2)

### Task 3: «Colores de las redes» en Ajustes

**Files:**
- Modify: `frontend/src/components/SettingsMenu.tsx`
- Modify: `frontend/src/App.css` (reglas nuevas tras `.settings__theme-desc`)
- Test: `frontend/src/components/SettingsMenu.test.tsx` (nuevo)

Spec 5.2, con la desviación 8: un control de tres opciones, «Automática», «Suaves» y «Originales del atlas», con la ayuda de «Automática», una muestra de la paleta y la nota. El panel pasa a tener dos partes, y su contenido va en `SettingsChoices`, sin el store, para probar el marcado (desviación 11). `SettingsMenu` se queda con el engranaje, la apertura, el cierre y el foco, sin cambios.

- [ ] **Step 1: la prueba del marcado, `frontend/src/components/SettingsMenu.test.tsx`**

Comprueba:
- el `radiogroup` con nombre y nota, y los tres radios con el mismo `name`;
- la ayuda de «Automática», enlazada a su radio;
- la opción marcada: sin elección, «Automática»; con elección, la elegida;
- la muestra, con la paleta que se aplica y sin etiquetas emergentes;
- los puntos de cada tarjeta con la paleta de su tema.

Crea `frontend/src/components/SettingsMenu.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PaletteMode } from "../theme/colors";
import { NETWORK_COLORS } from "../theme/networks";
import { SOFT_NETWORK_COLORS } from "../theme/softPalettes";
import type { ThemeId } from "../theme/themes";
import { SettingsChoices } from "./SettingsMenu";

const noop = () => {};

function render(theme: ThemeId, paletteMode: PaletteMode | null): string {
  return renderToStaticMarkup(
    <SettingsChoices theme={theme} paletteMode={paletteMode} onTheme={noop} onPaletteMode={noop} />,
  );
}

// Los radios de «Colores de las redes», con sus atributos, sin depender del
// orden en que React los escribe.
function radios(html: string): Record<string, string>[] {
  return [...html.matchAll(/<input type="radio"[^>]*>/g)].map((m) =>
    Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])),
  );
}

const checkedOption = (html: string) => radios(html).find((radio) => "checked" in radio)?.value;

// Colores de los cinco puntos de cada tarjeta de tema, en orden.
function cardDots(html: string): string[][] {
  return html
    .split('<button type="button" class="settings__theme"')
    .slice(1)
    .map((card) => [...card.matchAll(/class="settings__preview-dot" style="background:(#[0-9a-f]{6})"/g)].map((m) => m[1]));
}

// La muestra de la paleta: su marcado y sus colores, en orden.
function sampleBlock(html: string): string {
  return html.slice(html.indexOf('class="settings__palette-sample"'), html.indexOf('class="settings__note"'));
}
const sample = (html: string) => [...sampleBlock(html).matchAll(/style="background:(#[0-9a-f]{6})"/g)].map((m) => m[1]);

const PREVIEW = [
  "cole-anticevic.visual",
  "cole-anticevic.default",
  "cole-anticevic.frontoparietal",
  "cole-anticevic.dorsal-attention",
  "cole-anticevic.auditory",
];
const COLE = Object.keys(NETWORK_COLORS).filter((key) => key.startsWith("cole-anticevic."));

describe("Ajustes: «Colores de las redes»", () => {
  it("es un radiogroup con nombre y nota, con tres radios del mismo name", () => {
    const html = render("grafito", null);
    const group =
      /<p class="settings__label" id="([^"]+)">Colores de las redes<\/p><div class="settings__palette" role="radiogroup" aria-labelledby="\1" aria-describedby="([^"]+)">/.exec(
        html,
      );
    expect(group).not.toBeNull();
    expect(html).toContain(
      `<p class="settings__note" id="${group![2]}">Los originales son los del archivo de cada atlas: úsalos si una figura tiene que coincidir con la del artículo.</p>`,
    );
    const options = radios(html);
    expect(options.map((radio) => radio.value)).toEqual(["auto", "suave", "original"]);
    expect(new Set(options.map((radio) => radio.name)).size).toBe(1);
    expect(html).toMatch(/value="auto"[^>]*\/>Automática<\/label>/);
    expect(html).toMatch(/value="suave"[^>]*\/>Suaves<\/label>/);
    expect(html).toMatch(/value="original"[^>]*\/>Originales del atlas<\/label>/);
  });

  it("«Automática» lleva su explicación", () => {
    const html = render("grafito", null);
    const auto = radios(html).find((radio) => radio.value === "auto");
    expect(html).toContain(
      `<p class="settings__hint" id="${auto?.["aria-describedby"]}">Automática: suaves en los temas nuevos; originales en Original.</p>`,
    );
  });

  it("sin elección, marca «Automática» en cualquier tema", () => {
    expect(checkedOption(render("grafito", null))).toBe("auto");
    expect(checkedOption(render("original", null))).toBe("auto");
  });

  it("marca la elección guardada", () => {
    expect(checkedOption(render("original", "suave"))).toBe("suave");
    expect(checkedOption(render("noche", "original"))).toBe("original");
  });

  it("la muestra enseña las doce redes de Cole-Anticevic con la paleta que se aplica", () => {
    expect(sample(render("noche", null))).toEqual(COLE.map((key) => SOFT_NETWORK_COLORS.noche[key]));
    expect(sample(render("original", null))).toEqual(COLE.map((key) => NETWORK_COLORS[key]));
    expect(sample(render("noche", "original"))).toEqual(COLE.map((key) => NETWORK_COLORS[key]));
    expect(sample(render("original", "suave"))).toEqual(COLE.map((key) => SOFT_NETWORK_COLORS.grafito[key]));
  });

  it("la muestra es decorativa y no tiene etiquetas emergentes, que el teclado no alcanza", () => {
    const block = sampleBlock(render("grafito", null));
    expect(block).toContain('aria-hidden="true"');
    expect(block).not.toContain("title=");
  });
});

describe("Ajustes: vista previa de cada tema", () => {
  it("con «Automática», cada tarjeta muestra la paleta automática de su tema", () => {
    expect(cardDots(render("grafito", null))).toEqual([
      PREVIEW.map((key) => NETWORK_COLORS[key]),
      PREVIEW.map((key) => SOFT_NETWORK_COLORS.grafito[key]),
      PREVIEW.map((key) => SOFT_NETWORK_COLORS.noche[key]),
      PREVIEW.map((key) => SOFT_NETWORK_COLORS.claro[key]),
    ]);
  });

  it("con «Suaves» elegida, Original enseña la columna de Grafito", () => {
    expect(cardDots(render("claro", "suave"))[0]).toEqual(PREVIEW.map((key) => SOFT_NETWORK_COLORS.grafito[key]));
  });

  it("con «Originales del atlas» elegida, todas las tarjetas enseñan los originales", () => {
    for (const dots of cardDots(render("noche", "original"))) {
      expect(dots).toEqual(PREVIEW.map((key) => NETWORK_COLORS[key]));
    }
  });
});
```

- [ ] **Step 2: ver que falla**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/components/SettingsMenu.test.tsx
```

Expected: FAIL, porque `SettingsMenu.tsx` no exporta `SettingsChoices`.

- [ ] **Step 3: `SettingsChoices` y el control, en `frontend/src/components/SettingsMenu.tsx`**

En `frontend/src/components/SettingsMenu.tsx`, busca:

```tsx
// Engranaje de Ajustes (D3 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 5.2).
// Fase 1: solo el tema. La opción «Colores de las redes» llega con la
// paleta suave, en la fase 2.
import { useEffect, useId, useRef, useState, type FocusEvent } from "react";
import { useAppearanceStore } from "../state/appearance";
import { effectivePaletteMode, resolveNetworkColor } from "../theme/colors";
import { THEME_IDS, THEME_INFO } from "../theme/themes";
```

Sustitúyelo por:

```tsx
// Engranaje de Ajustes (D3 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 5.2):
// el tema y, desde la fase 2 del rediseño, los colores de las redes.
import { useEffect, useId, useRef, useState, type FocusEvent } from "react";
import { useAppearanceStore } from "../state/appearance";
import { effectivePaletteMode, resolveNetworkColor, type PaletteMode } from "../theme/colors";
import { NETWORK_COLORS } from "../theme/networks";
import { THEME_IDS, THEME_INFO, type ThemeId } from "../theme/themes";
```

En `frontend/src/components/SettingsMenu.tsx`, busca:

```tsx
  "cole-anticevic.auditory",
];
```

Sustitúyelo por:

```tsx
  "cole-anticevic.auditory",
];

// Muestra de «Colores de las redes»: las doce redes de Cole-Anticevic, la
// clasificación por defecto, como en la maqueta.
const SAMPLE_NETWORKS = Object.keys(NETWORK_COLORS).filter((key) => key.startsWith("cole-anticevic."));

// Las tres opciones de «Colores de las redes». «Automática» es la elección
// null (spec 4.5), la de por defecto: suaves en los temas nuevos y
// originales en Original.
const PALETTE_OPTIONS: readonly { choice: PaletteMode | null; value: string; label: string }[] = [
  { choice: null, value: "auto", label: "Automática" },
  { choice: "suave", value: "suave", label: "Suaves" },
  { choice: "original", value: "original", label: "Originales del atlas" },
];
```

En `frontend/src/components/SettingsMenu.tsx`, busca:

```tsx
  const setTheme = useAppearanceStore((state) => state.setTheme);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogTitleId = useId();
  const themeLabelId = useId();
  const descBaseId = useId();
```

Sustitúyelo por:

```tsx
  const setTheme = useAppearanceStore((state) => state.setTheme);
  const setPaletteMode = useAppearanceStore((state) => state.setPaletteMode);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogTitleId = useId();
```

El contenido del panel pasa a `SettingsChoices`.

En `frontend/src/components/SettingsMenu.tsx`, busca:

```tsx
          <p className="settings__label" id={themeLabelId}>
            Tema
          </p>
          <div className="settings__themes" role="group" aria-labelledby={themeLabelId}>
            {THEME_IDS.map((id) => {
              const info = THEME_INFO[id];
              return (
                <button
                  key={id}
                  type="button"
                  className="settings__theme"
                  aria-pressed={theme === id}
                  aria-label={`${info.number} · ${info.name}`}
                  aria-describedby={`${descBaseId}-${id}`}
                  onClick={() => setTheme(id)}
                >
                  {/* data-theme-preview: index.css aplica a este elemento las
                      variables del tema que representa (D3 de docs/decisiones-diseno.md). */}
                  <span className="settings__preview" data-theme-preview={id} aria-hidden="true">
                    <span className="settings__preview-side" />
                    <span className="settings__preview-main">
                      {PREVIEW_NETWORKS.map((key) => (
                        <span key={key} className="settings__preview-dot" style={{ background: resolveNetworkColor(key, id, effectivePaletteMode(id, paletteMode)) }} />
                      ))}
                    </span>
                  </span>
                  <span className="settings__theme-name">
                    {info.number} · {info.name}
                  </span>
                  <span className="settings__theme-desc" id={`${descBaseId}-${id}`}>
                    {info.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
```

Sustitúyelo por:

```tsx
          <SettingsChoices theme={theme} paletteMode={paletteMode} onTheme={setTheme} onPaletteMode={setPaletteMode} />
        </div>
      )}
```

Añade al final de `frontend/src/components/SettingsMenu.tsx`, tras una línea en blanco:

```tsx
interface SettingsChoicesProps {
  theme: ThemeId;
  paletteMode: PaletteMode | null;
  onTheme: (theme: ThemeId) => void;
  onPaletteMode: (choice: PaletteMode | null) => void;
}

// Contenido del panel, sin el store (así se puede probar su marcado): el
// tema y los colores de las redes (spec 5.2).
export function SettingsChoices({ theme, paletteMode, onTheme, onPaletteMode }: SettingsChoicesProps) {
  const themeLabelId = useId();
  const descBaseId = useId();
  const paletteLabelId = useId();
  const paletteHintId = useId();
  const paletteNoteId = useId();
  const paletteName = useId();
  const mode = effectivePaletteMode(theme, paletteMode);
  return (
    <>
      <p className="settings__label" id={themeLabelId}>
        Tema
      </p>
      <div className="settings__themes" role="group" aria-labelledby={themeLabelId}>
        {THEME_IDS.map((id) => {
          const info = THEME_INFO[id];
          // La paleta que tendría ese tema: la elegida o, con «Automática»,
          // la de ese tema. Cambiar de tema no cambia la elección.
          const cardMode = effectivePaletteMode(id, paletteMode);
          return (
            <button
              key={id}
              type="button"
              className="settings__theme"
              aria-pressed={theme === id}
              aria-label={`${info.number} · ${info.name}`}
              aria-describedby={`${descBaseId}-${id}`}
              onClick={() => onTheme(id)}
            >
              {/* data-theme-preview: index.css aplica a este elemento las
                  variables del tema que representa (D3 de docs/decisiones-diseno.md). */}
              <span className="settings__preview" data-theme-preview={id} aria-hidden="true">
                <span className="settings__preview-side" />
                <span className="settings__preview-main">
                  {PREVIEW_NETWORKS.map((key) => (
                    <span key={key} className="settings__preview-dot" style={{ background: resolveNetworkColor(key, id, cardMode) }} />
                  ))}
                </span>
              </span>
              <span className="settings__theme-name">
                {info.number} · {info.name}
              </span>
              <span className="settings__theme-desc" id={`${descBaseId}-${id}`}>
                {info.description}
              </span>
            </button>
          );
        })}
      </div>
      {/* Radios nativos: el navegador da el teclado del grupo (Tab entra en
          la opción marcada y las flechas cambian de opción). */}
      <div className="settings__section">
        <p className="settings__label" id={paletteLabelId}>
          Colores de las redes
        </p>
        <div className="settings__palette" role="radiogroup" aria-labelledby={paletteLabelId} aria-describedby={paletteNoteId}>
          {PALETTE_OPTIONS.map((option) => (
            <label key={option.value} className="settings__palette-option">
              <input
                type="radio"
                className="visually-hidden"
                name={paletteName}
                value={option.value}
                checked={paletteMode === option.choice}
                aria-describedby={option.choice === null ? paletteHintId : undefined}
                onChange={() => onPaletteMode(option.choice)}
              />
              {option.label}
            </label>
          ))}
        </div>
        <p className="settings__hint" id={paletteHintId}>
          Automática: suaves en los temas nuevos; originales en Original.
        </p>
        {/* Decorativa: los nombres de las redes no se dan aquí, porque una
            etiqueta emergente solo la alcanzaría el ratón (spec 8). */}
        <div className="settings__palette-sample" aria-hidden="true">
          {SAMPLE_NETWORKS.map((key) => (
            <span key={key} style={{ background: resolveNetworkColor(key, theme, mode) }} />
          ))}
        </div>
        <p className="settings__note" id={paletteNoteId}>
          Los originales son los del archivo de cada atlas: úsalos si una figura tiene que coincidir con la del artículo.
        </p>
      </div>
    </>
  );
}
```

El foco al abrir no cambia: el efecto de `SettingsMenu` busca `button[aria-pressed="true"]` dentro del panel, y la tarjeta del tema elegido sigue ahí.

- [ ] **Step 4: los estilos, en `frontend/src/App.css`**

Solo variables del tema: el borde, el fondo y el anillo del acento en la opción marcada, como la tarjeta del tema elegido, y el anillo `--text-faint` en la muestra, como las de Filtros. El anillo de foco va en la etiqueta: el radio está oculto. Tres columnas: «Originales del atlas» ocupa dos líneas.

En `frontend/src/App.css`, busca:

```css
.settings__theme-desc { font-size: 0.72rem; line-height: 1.35; color: var(--text-muted); }
```

Sustitúyelo por:

```css
.settings__theme-desc { font-size: 0.72rem; line-height: 1.35; color: var(--text-muted); }
/* «Colores de las redes» (fase 2 del rediseño; spec 5.2): tres opciones en un
   control segmentado. Los radios nativos quedan ocultos (.visually-hidden) y
   su etiqueta hace de botón. La opción marcada lleva el borde y el anillo del
   acento, como la tarjeta del tema elegido, para distinguirse con al menos
   3:1. */
.settings__section { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
.settings__palette { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 3px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); }
.settings__palette-option { position: relative; display: flex; align-items: center; justify-content: center; min-height: 32px; padding: 4px 8px; border-radius: 7px; border: 1px solid transparent; color: var(--text-muted); font-size: 0.78rem; font-weight: 600; line-height: 1.2; text-align: center; cursor: pointer; }
.settings__palette-option:hover { color: var(--text-h); }
.settings__palette-option:has(input:checked) { border-color: var(--accent); background: var(--accent-bg); box-shadow: 0 0 0 1px var(--accent); color: var(--text-h); }
.settings__palette-option:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
.settings__hint { margin: 6px 0 0; font-size: 0.72rem; line-height: 1.4; color: var(--text-muted); }
.settings__palette-sample { display: flex; gap: 4px; margin-top: 10px; }
.settings__palette-sample span { flex: 1; height: 10px; border-radius: 3px; box-shadow: 0 0 0 1px var(--text-faint); }
.settings__note { margin: 10px 0 0; font-size: 0.72rem; line-height: 1.4; color: var(--text-muted); }
```

`.visually-hidden` y `:has(:focus-visible)` ya los usa la fase 3 en Filtros. Como allí, en la ventana real de Tauri no se ha comprobado.

- [ ] **Step 5: ver que pasa**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vitest run src/components/SettingsMenu.test.tsx
```

Expected: PASS (9 pruebas).

- [ ] **Step 6: Comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c && npm run build 2>&1 | grep -E "built in|error"
```

Expected: BASE + 57 pruebas en verde; `tsc` limpio; lint con la línea base y ningún error (ninguno nuevo en `SettingsMenu.tsx`: solo exporta componentes); `✓ built in …`. Y la búsqueda de colores fijos de «Convenciones», sin resultados.

- [ ] **Step 7: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add frontend/src/components/SettingsMenu.tsx frontend/src/components/SettingsMenu.test.tsx frontend/src/App.css && git commit -m "Paleta: opcion Colores de las redes en Ajustes

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Revisión de la tanda 2 (Task 3)

Como la de la tanda 1: dos revisores en paralelo, subagentes nuevos, con el diff de la tanda, `git diff <commit de la Task 2 o de sus correcciones>..HEAD`, este plan, la sección 5.2 del spec y la maqueta de Ajustes (`/home/dae/.config/superpowers/worktrees/Neurograph/rediseno-referencias/maqueta-claude-design/Main.dc.html`, bloque «Colores de las redes»). Sin navegadores: el aspecto real se ve en la Task 5.

- [ ] **Revisor A: marcado, teclado y contraste**
  - El `radiogroup`: nombre, nota como descripción, tres radios nativos con el mismo `name` y etiqueta visible, y la ayuda de «Automática» enlazada a su radio.
  - El teclado por las tres opciones: Tab entra en la opción marcada y las flechas cambian de opción, también de «Originales del atlas» a «Automática».
  - El panel se sigue cerrando con Escape, con Tab al salir y con un clic fuera, también con el foco en un radio. Con Escape o con su botón, el foco vuelve al engranaje; con un clic fuera, se queda donde se hizo clic (spec 5.2).
  - El anillo de foco en la etiqueta.
  - El contraste en los cuatro temas, calculado con las variables de `index.css`: el texto de las opciones no marcadas (`--text-muted` sobre `--bg`), con al menos 4,5:1, porque es texto; y el borde de la marcada (`--accent` sobre `--bg`), con al menos 3:1.
  - Letra mínima de 0,7rem.
- [ ] **Revisor B: aspecto, coherencia y pruebas**
  - El CSS frente a la maqueta (control segmentado, muestra y nota), con las desviaciones 8 a 10: tres columnas, y «Originales del atlas» en dos líneas.
  - La lógica de las tarjetas (desviación 7) y de «Automática» frente a 4.5 y 5.2.
  - Cuánto crece el panel (desviación 18): si cabe a 1400×900 y si se desplaza por dentro a 900×600, con `max-height`.
  - Sin colores fijos.
  - Que las pruebas comprueben lo que dicen.
- [ ] **Arreglos:** una ronda, en un commit `Paleta: correcciones de la revision de la tanda 2`. Solo se vuelve a revisar lo que salió «importante».

## Chunk 4: verificación en la app real, preparación

### Task 4: verificación en la app real: preparación

**Files:**
- Create: una carpeta nueva en el scratchpad, con los scripts, una copia de la versión anterior a esta fase y lo que generen. Nada de esto entra en el repositorio.
La verificación ocupa dos tareas. Esta prepara la carpeta, la versión anterior, los dos servidores y los scripts; la Task 5 pasa las fases, mira las capturas, escribe el informe y cierra.

Qué se comprueba:
- los cuatro temas con las tres elecciones («Automática», «Suaves» y «Originales del atlas»), en pantalla;
- el panel de Ajustes a cuatro tamaños, y el anillo de foco en el grupo, en cada tema;
- que las exportaciones (connectograma, hemisferios, cerebro 3D y leyenda) siguen la paleta, con la columna de Claro cuando es «Suaves»;
- que «Originales del atlas» sale igual byte a byte que antes de la fase, con los temas Original y Grafito, sirviendo a las dos versiones los mismos datos guardados;
- y el control de Ajustes con el teclado, por las tres opciones, con lo que se guarda.

La D (Task 6) solo afirma lo que se vea en las dos tareas.

**Reglas del navegador y de los procesos.**

- Se usa un Chromium sin interfaz con un script de Node suelto. **Nunca** las herramientas del MCP de Playwright (escriben `.playwright-mcp/` en la copia principal), ni `mcp__claude-in-chrome__*` ni `mcp__browsermcp__*` (manejan el Chrome del usuario, que él está mirando).
- Playwright 1.55.0 se carga desde `/home/dae/PycharmProjects/gh3.2/node_modules/playwright`. Solo se carga: allí no se escribe nada.
- `chromium.launch({ headless: true })` con un perfil desechable. El perfil, las capturas y los informes van a la carpeta nueva del scratchpad (`TMPDIR` apunta a ella).
- **Puertos propios:** 5261 para la versión nueva y 5262 para la anterior. Nunca 5173 (el del usuario), 5199 (el del coordinador, que sirve este mismo worktree y mira el usuario), 5230 (la vista previa), 5241, 5242, 5251 ni 5252.
- **Cachés propias.** El servidor nuevo arranca con una configuración del scratchpad (`--config`) que tiene su propia caché de Vite: el 5199 sirve este mismo worktree y usa `frontend/node_modules/.vite`. La copia anterior lleva la suya en su `vite.config.ts`.
- **Solo se matan procesos propios.** Tras cada fase, `pkill -f -- "$(basename "$D")/[t]mp"`: los navegadores de esta carpeta. Los servidores se paran con la herramienta de tareas; solo si un puerto sigue ocupado, `pkill -f -- "vite --port 526[1] "` o `pkill -f -- "vite --port 526[2] "`. **Nunca** uses como patrón `vite`, `node`, `chrom*` ni una ruta del worktree: alcanzarían los servidores 5173, 5199 y 5230. Los corchetes evitan que el patrón se encuentre a sí mismo en la orden.
- El backend del usuario está en `127.0.0.1:8420`. Solo se le hacen peticiones GET, y no lo arranques tú. `GET /connections` devuelve las filas en otro orden en cada petición, y con él cambia el orden de dibujo: por eso los scripts sirven a las dos versiones los mismos JSON guardados.
- **Tiempo:** `timeout 570` en cada orden y el tiempo límite de la herramienta en 600000 ms; o bien en segundo plano, comprobando cada poco si ha terminado. Los scripts guardan su JSON tras cada caso: si `timeout` corta la orden, queda lo hecho hasta entonces.

**Honestidad.**

- Cada comprobación se informa como «visto», «distinto» o «sin comprobar».
- Nunca se cambia una expectativa, ni el script, para que desaparezca una diferencia. «Corrige el script» vale solo cuando la suposición del propio script era errónea (un selector, un tiempo de espera), y se anota en el informe.
- Los scripts nunca dan por buena otra región: si no pueden seleccionar la que buscan, la apuntan en `sinComprobar`, y lo que dependía de ella queda «sin comprobar».
- Cada fase guarda su JSON aunque falle a medias, con el error en `fallo`.

- [ ] **Step 1: pruebas, tipos, lint, compilación y tabla al día**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npm test && npx tsc -b && npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c && npm run build 2>&1 | grep -E "built in|error"
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && python3 scripts/generate_soft_palettes.py --check
```

Expected: BASE + 57 pruebas en verde (más las que añadieran las revisiones); `tsc` limpio; lint con la línea base y ningún error; `✓ built in …`; y `frontend/src/theme/softPalettes.ts está al día.`

- [ ] **Step 2: carpeta de trabajo, versión anterior y estado de la copia principal**

```bash
D=$(mktemp -d /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase2-verif-XXXXXX) && mkdir -p "$D/tmp" "$D/antes" && echo "$D"
git -C /home/dae/PycharmProjects/Neurograph/Neurograph status --short > "$D/copia-principal-antes.txt"; cat "$D/copia-principal-antes.txt"
```

Apunta la ruta que imprime. El estado de la terminal no se conserva entre órdenes: en los pasos siguientes, sustituye `$D` por esa ruta. Si el scratchpad de esta sesión no existe, crea la carpeta en el de la sesión que ejecute el plan, el mismo que para `fase2-base.txt`.

**Qué es «antes».** Es el commit que guardó el Step 0 de la Task 1 (`fase2-base.txt`; si no existe, el padre del primer commit `Paleta: `). Solo es «la rama sin esta fase» si desde entonces no ha entrado nada más. Compruébalo, y apunta HEAD para el informe:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && BASE_COMMIT=$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase2-base.txt) && echo "base $BASE_COMMIT" && echo "HEAD $(git rev-parse HEAD)" && echo "--- commits desde la base:" && git log --format='%h %s' "$BASE_COMMIT"..HEAD && echo "--- cambios sin commit en frontend/:" && git status --short frontend/ && echo "fin"
```

- Si hay cambios sin commit en `frontend/`, alguien está trabajando en el worktree: no sigas y termina la tarea como BLOQUEADA.
- **Si todos los commits desde la base empiezan por `Paleta: `** (los de esta fase y sus correcciones), «antes» es la base. Se saca con `git archive`, que solo lee del repositorio. Lanza estas líneas en una sola orden:

  ```bash
  BASE_COMMIT=$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase2-base.txt) && \
  git -C /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz archive "$BASE_COMMIT" frontend | tar -x -C "$D/antes" && \
  ln -s /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/node_modules "$D/antes/frontend/node_modules"
  ```

- **Si ha entrado algún otro commit** (una corrección de otra fase, la fusión de la parte 3D…), la base ya no es «hoy sin esta fase». O paras y lo dices, o construyes «antes» desde HEAD quitando los commits `Paleta: `, en un clon dentro de `$D`. El clon solo lee del repositorio (`--shared`), y el worktree no se toca. En una sola orden:

  ```bash
  WT=/home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && \
  BASE_COMMIT=$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/fase2-base.txt) && \
  HEAD_COMMIT=$(git -C "$WT" rev-parse HEAD) && \
  git clone --quiet --shared --no-checkout "$(git -C "$WT" rev-parse --path-format=absolute --git-common-dir)" "$D/antes-repo" && \
  git -C "$D/antes-repo" checkout --quiet --detach "$HEAD_COMMIT" && \
  git -C "$D/antes-repo" revert --no-commit $(git -C "$D/antes-repo" log --format=%H --grep='^Paleta: ' "$BASE_COMMIT..$HEAD_COMMIT") && \
  mv "$D/antes-repo/frontend" "$D/antes/frontend" && \
  ln -s "$WT/frontend/node_modules" "$D/antes/frontend/node_modules"
  ```

  Si `git revert` da conflictos, para y dilo: «antes» no se puede construir así.

En los dos casos, sustituye `$D/antes/frontend/vite.config.ts` por este, con la ruta de `$D` escrita en `cacheDir`, para que la copia no toque la caché de Vite del worktree:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Copia de la rama antes de la fase 2, solo para comparar (Tasks 4 y 5
// de docs/rediseno-interfaz-plan-fase2.md). cacheDir propio, fuera del
// worktree.
export default defineConfig({
  plugins: [react()],
  cacheDir: '<ruta de $D>/vite-cache-antes',
  server: { port: 5262, strictPort: true },
})
```

- [ ] **Step 3: los dos servidores**

```bash
ss -ltn | grep -E ':(5261|5262) ' || echo "5261 y 5262 libres"
```

Si alguno está ocupado, elige otros dos libres que no estén en la lista prohibida de «Reglas», y cámbialos en la configuración del servidor nuevo, en el `server.port` de la copia anterior, en las dos órdenes de arranque, y en la Task 5: en `PORT` y `PORT_ANTES` de cada fase (Step 1) y en el Step 6, también en los patrones de `pkill`.

Crea `$D/vite-nueva.config.mts`, con la ruta de `$D` escrita en `cacheDir`. Importa la configuración del proyecto, así que el servidor es el de siempre, con otra caché y otro puerto. Es `.mts` para que Vite la cargue como módulo ES; así se probó con Vite 8 (`vite build` y `loadConfigFromFile`):

```ts
// Servidor de la versión nueva para las Tasks 4 y 5 de
// docs/rediseno-interfaz-plan-fase2.md: la configuración del proyecto, con
// caché y puerto propios. El 5199 del coordinador sirve este mismo worktree
// con frontend/node_modules/.vite, y así no se pisan.
import base from '/home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend/vite.config.ts'

export default { ...base, cacheDir: '<ruta de $D>/vite-cache-nueva', server: { ...base.server, port: 5261, strictPort: true } }
```

Arranca los dos en segundo plano (`run_in_background`), cada uno en su orden, y apunta el identificador de tarea de cada uno: la Task 5 los para. El `--port` va primero: así el patrón de rescate del Step 6 de la Task 5 encuentra el proceso.

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz/frontend && npx vite --port 5261 --strictPort --config "$D/vite-nueva.config.mts"
```

```bash
cd "$D/antes/frontend" && npx vite --port 5262 --strictPort
```

- [ ] **Step 4: los scripts**

Crea `$D/verify-fase2.cjs`:

```js
// Verificación de la fase 2 (Tasks 4 y 5 de docs/rediseno-interfaz-plan-fase2.md):
// la paleta en pantalla y en la exportación, «Originales del atlas» igual que
// antes de la fase, el panel de Ajustes y su control con el teclado.
//   PORT=5261 PORT_ANTES=5262 TMPDIR=<carpeta>/tmp node verify-fase2.cjs <fase> [caso]
// Con un caso (por ejemplo, «pantalla grafito» o «exportar noche-suave»),
// solo se hace ese, y el JSON lleva su nombre: así cada orden cabe en el
// tiempo límite.
// Playwright 1.55 de /home/dae/PycharmProjects/gh3.2 (solo se carga),
// Chromium sin interfaz y perfil desechable. Todo lo que se genera va a la
// carpeta de este archivo.
const { chromium } = require("/home/dae/PycharmProjects/gh3.2/node_modules/playwright");
const fs = require("fs");
const path = require("path");

const OUT = __dirname;
const BASE = `http://localhost:${process.env.PORT}/`;
const BASE_ANTES = `http://localhost:${process.env.PORT_ANTES}/`;
const API = "http://127.0.0.1:8420";
const ATLAS = "atlas.human.hcp.mmp1_0";
const THEMES = ["original", "grafito", "noche", "claro"];
// La elección guardada: null es «Automática».
const CHOICES = [null, "suave", "original"];
const SIZES = [[1400, 900], [1280, 800], [1024, 768], [900, 600]];
const CONNECTOGRAM = '.ws-view--main svg[aria-label="Connectograma"]';
const HEMISPHERES = 'svg[aria-label="Esquema de hemisferios"]';
// Posición del deslizador de peso: unas 3 000 conexiones en HCP-MMP1.0 (D3).
const WEIGHT_POSITION = 0.6;
// La primera región va en el recuadro y en el detalle; con las otras dos
// aparece la leyenda de la selección múltiple.
const REGIONS = [
  ["3b", "R"],
  ["TPOJ1", "L"],
  ["SCEF", "L"],
];

const out = (name) => path.join(OUT, name);
const save = (name, data) => fs.writeFileSync(out(name), JSON.stringify(data, null, 2));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const choiceName = (choice) => choice ?? "auto";
// El modo que se aplica (spec 4.5), calculado aquí y no con theme/colors.ts,
// que es lo que se comprueba.
const effective = (theme, choice) => choice ?? (theme === "original" ? "original" : "suave");

// Regiones que no se pudieron seleccionar con seguridad: lo que dependía de
// ellas queda «sin comprobar». Cada fase lo guarda en su JSON.
const notVerified = [];

// Ejecuta una fase y guarda su JSON tras cada caso (checkpoint) y al final.
// Si `timeout` corta la orden, Node no llega a ejecutar el finally: lo que
// quede guardado es lo del último checkpoint.
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
// (exportSvgAsJpeg lo hace con XMLSerializer justo antes de dibujar el
// JPEG). Así se leen los colores que de verdad lleva la exportación.
function captureSerializedSvg() {
  const serialize = XMLSerializer.prototype.serializeToString;
  window.__ngSerialized = [];
  XMLSerializer.prototype.serializeToString = function (node) {
    const text = serialize.call(this, node);
    if (node && node.nodeName && node.nodeName.toLowerCase() === "svg") window.__ngSerialized.push(text);
    return text;
  };
}

// /regions y /connections de HCP-MMP1.0 salen de los JSON de «preflight»:
// GET /connections devuelve las filas en otro orden en cada petición, y con
// él cambia el orden de dibujo. Para comparar dos versiones, los datos
// tienen que ser los mismos.
async function launch(width = 1400, height = 900) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
  });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, acceptDownloads: true });
  await context.addInitScript(captureSerializedSvg);
  const page = await context.newPage();
  const cors = { "access-control-allow-origin": "*" };
  await page.route(
    (u) => u.port === "8420" && u.pathname === "/regions" && u.searchParams.get("atlas_id") === ATLAS && !u.searchParams.has("network_source"),
    (route) => route.fulfill({ path: out("regions.json"), contentType: "application/json", headers: cors }),
  );
  await page.route(
    (u) => u.port === "8420" && u.pathname === "/connections" && u.searchParams.get("atlas_id") === ATLAS,
    (route) => route.fulfill({ path: out("connections.json"), contentType: "application/json", headers: cors }),
  );
  const errors = [];
  const warnings = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
    if (m.type() === "warning" && m.text().startsWith("Exportación:")) warnings.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return { browser, page, errors, warnings };
}

// choice: "suave", "original" o null («Automática»).
async function load(page, base, theme, choice) {
  await page.goto(base);
  await page.evaluate(
    ([t, c]) => localStorage.setItem("neurograph.apariencia", JSON.stringify({ theme: t, paletteMode: c })),
    [theme, choice],
  );
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

// La selección, leída del store de la propia app (el mismo módulo que sirve Vite).
const selectedIds = (page) =>
  page.evaluate(async () => [...(await import("/src/state/selection.ts")).useSelectionStore.getState().selectedNodeIds]);

const restoreSelection = (page, ids) =>
  page.evaluate(async (list) => {
    (await import("/src/state/selection.ts")).useSelectionStore.setState({ selectedNodeIds: new Set(list), selectedConnectionId: null });
  }, ids);

// Añade a la selección, con un clic en el connectograma grande, la región
// con esa abreviatura y ese hemisferio. Si el clic selecciona otra cosa, se
// deshace. Si no lo consigue, la apunta en notVerified y devuelve false:
// nunca da por buena otra región.
async function selectNode(page, abbreviation, hemisphere) {
  const id = regionId(abbreviation, hemisphere);
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
      const before = await selectedIds(page);
      if (before.includes(id)) return true;
      await page.mouse.click(center.x + dx, center.y + dy);
      await page.mouse.move(4, 4);
      await page.waitForTimeout(400);
      const after = await selectedIds(page);
      if (after.includes(id) && after.length === before.length + 1) return true;
      await restoreSelection(page, before);
      await page.waitForTimeout(300);
    }
  }
  notVerified.push(`${abbreviation} (${hemisphere})`);
  return false;
}

const exportButton = (page) => page.locator(".ws-view--main button.export-btn", { hasText: "Exportar JPEG" });
const legendButton = (page) => page.locator(".ws-detail button.export-btn", { hasText: "Exportar leyenda JPEG" });

async function download(page, button, file) {
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 90000 }), button.click()]);
  await d.saveAs(out(file));
  return file;
}

// Espera a que la corteza pinte lo que toca: con selección, ella y sus
// vecinas; sin selección (si falló), todas las regiones con su red. Así una
// selección fallida no hace esperar 120 s a un texto que no va a salir.
async function waitPainted(page) {
  const selected = (await selectedIds(page)).length > 0;
  const text = selected ? "En color: lo seleccionado y sus vecinos" : "Cada región con el color real de su red";
  await page.locator(".ws-view--main .brain3d-surface-status", { hasText: text }).waitFor({ timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.mouse.move(4, 4);
}

// El lienzo 3D tal como está (preserveDrawingBuffer), en PNG.
async function canvasPng(page, file) {
  const dataUrl = await page.locator(".ws-view--main canvas").first().evaluate((c) => c.toDataURL("image/png"));
  fs.writeFileSync(out(file), Buffer.from(dataUrl.split(",")[1], "base64"));
  return file;
}

const setTheme = (page, theme) =>
  page.evaluate(async (t) => (await import("/src/state/appearance.ts")).useAppearanceStore.getState().setTheme(t), theme);

// El control con el foco, con su nombre accesible, su valor o su texto.
const focused = (page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return "body";
    const name = a.getAttribute("aria-label") ?? (a.type === "radio" ? `radio ${a.value}` : a.textContent.trim().slice(0, 40));
    return `${a.tagName.toLowerCase()} «${name}»`;
  });

// Al engranaje con el teclado: desde el control anterior, con Tab. Enter lo abre.
async function openSettingsByKeyboard(page) {
  await page.locator('button[aria-label="Ajustes"]').focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const gear = await focused(page);
  await page.keyboard.press("Enter");
  await page.locator(".settings__panel").waitFor();
  return gear;
}

// Tab hasta el grupo de «Colores de las redes». Devuelve el recorrido.
async function tabToRadio(page) {
  const steps = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    const f = await focused(page);
    steps.push(f);
    if (f.startsWith("input «radio")) break;
  }
  return steps;
}

// El radio con el foco, la opción marcada y el anillo de foco de su etiqueta.
const radioState = (page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    const label = a?.closest(".settings__palette-option");
    const style = label ? getComputedStyle(label) : null;
    const probe = document.createElement("span");
    document.body.append(probe);
    probe.style.color = "var(--accent)";
    const accent = getComputedStyle(probe).color;
    probe.remove();
    return {
      foco: a?.type === "radio" ? a.value : null,
      marcada: document.querySelector(".settings__palette input:checked")?.value ?? null,
      anillo: style ? { estilo: style.outlineStyle, color: style.outlineColor, delAcento: style.outlineColor === accent } : null,
    };
  });

// El panel de Ajustes: si cabe en la ventana y si se desplaza por dentro.
async function settingsFit(page) {
  await page.locator('button[aria-label="Ajustes"]').click();
  await page.locator(".settings__panel").waitFor();
  await page.waitForTimeout(200);
  const box = await page.locator(".settings__panel").evaluate((p) => {
    const r = p.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
      alto: Math.round(r.height),
      vw: innerWidth,
      vh: innerHeight,
      scrollHeight: p.scrollHeight,
      clientHeight: p.clientHeight,
    };
  });
  await page.keyboard.press("Escape");
  return {
    ...box,
    dentro: box.left >= 0 && box.top >= 0 && box.right <= box.vw && box.bottom <= box.vh,
    seDesplaza: box.scrollHeight > box.clientHeight,
  };
}

// Tablas de la app, las mismas que sirve Vite, para calcular en Node lo
// esperado. No se usa theme/colors.ts, que es lo que se comprueba.
const appTables = (page) =>
  page.evaluate(async () => {
    const { SOFT_NETWORK_COLORS } = await import("/src/theme/softPalettes.ts");
    const { NETWORK_COLORS, NETWORK_LABELS } = await import("/src/theme/networks.ts");
    const { DRAW_TOKENS } = await import("/src/theme/themes.ts");
    return { SOFT_NETWORK_COLORS, NETWORK_COLORS, NETWORK_LABELS, DRAW_TOKENS };
  });

// #rrggbb en minúsculas, desde #rrggbb, rgb() o rgba().
function hex(color) {
  const text = String(color ?? "").trim();
  const h = /^#([0-9a-f]{6})$/i.exec(text);
  if (h) return `#${h[1].toLowerCase()}`;
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(text);
  return m ? `#${[m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("")}` : text;
}

const column = (theme) => (theme === "original" ? "grafito" : theme);
const tableFor = (tables, col, mode) => (mode === "original" ? tables.NETWORK_COLORS : tables.SOFT_NETWORK_COLORS[col]);
const colorIn = (table, key) => (Object.hasOwn(table, key) ? table[key] : table.unclassified);
const labelKeys = (tables) => Object.fromEntries(Object.entries(tables.NETWORK_LABELS).map(([key, label]) => [label, key]));

// pairs: [clave de red, color que se ve]. Una clave que no se reconoce
// llega como «?…» y cuenta como distinta.
function compare(pairs, table) {
  const wrong = pairs.filter(([key, got]) => hex(got) !== colorIn(table, key));
  return {
    total: pairs.length,
    distintos: wrong.length,
    ejemplos: wrong.slice(0, 5).map(([key, got]) => `${key}: ${got} (esperado ${colorIn(table, key)})`),
  };
}

const PREVIEW = [
  "cole-anticevic.visual",
  "cole-anticevic.default",
  "cole-anticevic.frontoparietal",
  "cole-anticevic.dorsal-attention",
  "cole-anticevic.auditory",
];
const LOGO = ["cole-anticevic.language", "cole-anticevic.default", "cole-anticevic.frontoparietal", "cole-anticevic.visual"];

// Colores de red que se ven: nodos del connectograma y de los hemisferios
// (su atributo fill), muestras de Filtros, logotipo y etiquetas de red.
async function screenColors(page, tables, theme, mode) {
  const raw = await page.evaluate((hemispheres) => {
    const svgNodes = (selector) =>
      [...document.querySelectorAll(`${selector} [data-ng-fill^="net:"]`)].map((e) => [e.getAttribute("data-ng-fill").slice(4), e.getAttribute("fill")]);
    return {
      connectograma: svgNodes('svg[aria-label="Connectograma"]'),
      hemisferios: svgNodes(hemispheres),
      filtros: [...document.querySelectorAll(".filters__swatch")].map((s) => {
        const title = s.closest("label")?.title ?? "";
        return [title.slice(0, title.lastIndexOf(" — ")), getComputedStyle(s).backgroundColor];
      }),
      logotipo: [...document.querySelectorAll(".topbar__logo-node")].map((c) => c.getAttribute("fill")),
      etiquetasDeRed: [...document.querySelectorAll(".network-tag")].map((t) => [t.title, getComputedStyle(t.querySelector(".network-tag__dot")).backgroundColor]),
    };
  }, HEMISPHERES);
  const table = tableFor(tables, column(theme), mode);
  const keyOf = labelKeys(tables);
  const byLabel = (pairs) => pairs.map(([label, color]) => [keyOf[label] ?? `?${label}`, color]);
  return {
    connectograma: compare(raw.connectograma, table),
    hemisferios: compare(raw.hemisferios, table),
    filtros: compare(byLabel(raw.filtros), table),
    logotipo: compare(raw.logotipo.map((color, i) => [LOGO[i], color]), table),
    etiquetasDeRed: compare(byLabel(raw.etiquetasDeRed), table),
  };
}

// Ajustes abierto: opción marcada, muestra y puntos de cada tarjeta, contra
// lo esperado con esa elección en cada tema.
async function settingsState(page, tables, theme, choice, file) {
  await page.locator('button[aria-label="Ajustes"]').click();
  await page.locator(".settings__panel").waitFor();
  await page.waitForTimeout(200);
  const raw = await page.evaluate(() => ({
    marcada: document.querySelector(".settings__palette input:checked")?.value ?? null,
    muestra: [...document.querySelectorAll(".settings__palette-sample span")].map((s) => getComputedStyle(s).backgroundColor),
    tarjetas: [...document.querySelectorAll(".settings__theme")].map((card) =>
      [...card.querySelectorAll(".settings__preview-dot")].map((d) => getComputedStyle(d).backgroundColor),
    ),
  }));
  await page.screenshot({ path: out(file) });
  await page.keyboard.press("Escape");
  const cole = Object.keys(tables.NETWORK_COLORS).filter((key) => key.startsWith("cole-anticevic."));
  return {
    marcada: raw.marcada,
    marcadaBien: raw.marcada === choiceName(choice),
    muestra: compare(raw.muestra.map((color, i) => [cole[i], color]), tableFor(tables, column(theme), effective(theme, choice))),
    tarjetas: raw.tarjetas.map((dots, i) =>
      compare(dots.map((color, j) => [PREVIEW[j], color]), tableFor(tables, column(THEMES[i]), effective(THEMES[i], choice))),
    ),
  };
}

// Colores que lleva el SVG serializado por la exportación: las redes contra
// la columna de exportación (Claro con «Suaves», NETWORK_COLORS con
// «Originales») y los tokens contra los de exportación del tema (los de hoy
// con Original, los de Claro con los demás).
async function exportedSvg(page, tables, button, file, theme, mode) {
  const count = await page.evaluate(() => window.__ngSerialized.length);
  await download(page, button, file);
  const pairs = await page.evaluate((n) => {
    const text = window.__ngSerialized[n];
    if (!text) return null;
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const read = (attr, target) => [...doc.querySelectorAll(`[${attr}]`)].map((e) => [e.getAttribute(attr), e.getAttribute(target)]);
    return { paint: [...read("data-ng-fill", "fill"), ...read("data-ng-stroke", "stroke")], opacity: read("data-ng-stroke-opacity", "stroke-opacity") };
  }, count);
  if (!pairs) return { fallo: "la exportación no serializó ningún SVG" };
  const tokens = theme === "original" ? tables.DRAW_TOKENS.original : tables.DRAW_TOKENS.claro;
  const nets = pairs.paint.filter(([ref]) => ref.startsWith("net:")).map(([ref, value]) => [ref.slice(4), value]);
  const tokenPaint = pairs.paint.filter(([ref]) => !ref.startsWith("net:"));
  const wrong = [
    ...tokenPaint.filter(([ref, value]) => value !== tokens[ref]),
    ...pairs.opacity.filter(([ref, value]) => value !== String(tokens[ref])),
  ];
  return {
    redes: compare(nets, tableFor(tables, "claro", mode)),
    tokens: { total: tokenPaint.length + pairs.opacity.length, distintos: wrong.length, ejemplos: wrong.slice(0, 5).map(([r, v]) => `${r}=${v}`) },
  };
}

// ---------------------------------------------------------------- fases --

// Nombre del JSON de una fase, con el caso si se pidió uno.
const reportName = (phase, only) => `${phase}${only ? `-${only}` : ""}.json`;

// Espera a los dos servidores y guarda los datos de HCP-MMP1.0 con un GET de
// solo lectura. Sale con código 2 si falta algo.
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
  } catch (e) {
    r.backend = false;
    r.backendError = String(e);
  }
  save("preflight.json", r);
  console.log(JSON.stringify(r));
  if (!r.nueva || !r.anterior || !r.backend) process.exit(2);
}

// Los cuatro temas con las tres elecciones, en pantalla (versión nueva). El
// caso es un tema.
async function phasePantalla(only) {
  const report = {};
  await recording(reportName("pantalla", only), report, async (checkpoint) => {
    for (const theme of only ? [only] : THEMES) {
      for (const choice of CHOICES) {
        const tag = `${theme}-${choiceName(choice)}`;
        const { browser, page, errors } = await launch();
        const r = (report[tag] = { errors });
        try {
          await load(page, BASE, theme, choice);
          await setWeightPosition(page, WEIGHT_POSITION);
          await enlarge(page, "Connectograma");
          const tables = await appTables(page);
          r.seleccion = await selectNode(page, ...REGIONS[0]);
          r.colores = await screenColors(page, tables, theme, effective(theme, choice));
          await page.screenshot({ path: out(`${tag}-connectograma.png`) });
          r.ajustes = await settingsState(page, tables, theme, choice, `${tag}-ajustes.png`);
          await enlarge(page, "Cerebro 3D");
          await waitPainted(page);
          r.lienzo3d = await canvasPng(page, `${tag}-cerebro3d-lienzo.png`);
          await page.screenshot({ path: out(`${tag}-cerebro3d.png`) });
        } finally {
          await browser.close();
          checkpoint();
        }
      }
    }
  });
}

// El panel de Ajustes en los cuatro temas: si cabe a cada tamaño, y una
// captura con el anillo de foco en el grupo, abierto con el teclado. El caso
// es un tema.
async function phaseAjustes(only) {
  const report = {};
  await recording(reportName("ajustes", only), report, async (checkpoint) => {
    for (const theme of only ? [only] : THEMES) {
      const { browser, page, errors } = await launch();
      const r = (report[theme] = { errors, tamanos: {} });
      try {
        await load(page, BASE, theme, null);
        await openSettingsByKeyboard(page);
        r.tabs = await tabToRadio(page);
        r.radio = await radioState(page);
        await page.screenshot({ path: out(`ajustes-foco-${theme}.png`) });
        await page.keyboard.press("Escape");
        for (const [width, height] of SIZES) {
          await page.setViewportSize({ width, height });
          await page.waitForTimeout(700);
          r.tamanos[`${width}x${height}`] = await settingsFit(page);
        }
        await page.locator('button[aria-label="Ajustes"]').click();
        await page.locator(".settings__panel").waitFor();
        await page.screenshot({ path: out(`ajustes-${theme}-900x600.png`) });
      } finally {
        await browser.close();
        checkpoint();
      }
    }
  });
}

// Las exportaciones siguen a la paleta (versión nueva). El caso es
// «tema-elección», por ejemplo «grafito-suave».
async function phaseExportar(only) {
  const report = {};
  await recording(reportName("exportar", only), report, async (checkpoint) => {
    for (const [theme, choice] of [["grafito", "suave"], ["grafito", "original"], ["noche", "suave"], ["original", "suave"]]) {
      const tag = `${theme}-${choice}`;
      if (only && only !== tag) continue;
      const { browser, page, errors, warnings } = await launch();
      const r = (report[tag] = { errors, avisosDeExportacion: warnings });
      try {
        await load(page, BASE, theme, choice);
        await setWeightPosition(page, WEIGHT_POSITION);
        await enlarge(page, "Connectograma");
        const tables = await appTables(page);
        r.seleccion = [];
        for (const region of REGIONS) r.seleccion.push(await selectNode(page, ...region));
        r.connectograma = await exportedSvg(page, tables, exportButton(page), `${tag}-connectograma.jpg`, theme, choice);
        // La leyenda solo existe con dos regiones seleccionadas o más.
        r.leyenda =
          (await selectedIds(page)).length >= 2
            ? await exportedSvg(page, tables, legendButton(page), `${tag}-leyenda.jpg`, theme, choice)
            : { sinComprobar: "menos de dos regiones seleccionadas" };
        await enlarge(page, "Hemisferios");
        r.hemisferios = await exportedSvg(page, tables, exportButton(page), `${tag}-hemisferios.jpg`, theme, choice);
        await enlarge(page, "Cerebro 3D");
        await waitPainted(page);
        r.cerebro3d = await download(page, exportButton(page), `${tag}-cerebro3d.jpg`);
        await page.waitForTimeout(1500);
        // El mismo 3D en pantalla con el tema Claro y la misma paleta:
        // comparar.py mira cuánto se parece a la exportación. Con el tema
        // Original no hay equivalente en pantalla: sus tokens de exportación
        // son los de hoy, no los de Claro.
        if (theme !== "original") {
          await setTheme(page, "claro");
          await page.waitForTimeout(2000);
          await page.mouse.move(4, 4);
          r.claroEnPantalla = await canvasPng(page, `${tag}-cerebro3d-claro-pantalla.png`);
        }
      } finally {
        await browser.close();
        checkpoint();
      }
    }
  });
}

// «Originales del atlas» deja la pantalla y las exportaciones como antes de
// la fase: la versión anterior y la nueva, con los mismos datos. El caso es
// «versión-tema-elección», por ejemplo «antes-original-auto».
async function phaseIgual(only) {
  const report = {};
  await recording(reportName("igual", only), report, async (checkpoint) => {
    for (const [version, base, theme, choice] of [
      ["antes", BASE_ANTES, "original", null],
      ["nueva", BASE, "original", null],
      ["nueva", BASE, "original", "original"],
      ["antes", BASE_ANTES, "grafito", null],
      ["nueva", BASE, "grafito", "original"],
    ]) {
      const tag = `igual-${version}-${theme}-${choiceName(choice)}`;
      if (only && `igual-${only}` !== tag) continue;
      const { browser, page, errors } = await launch();
      const r = (report[tag] = { errors });
      try {
        await load(page, base, theme, choice);
        await setWeightPosition(page, WEIGHT_POSITION);
        await enlarge(page, "Connectograma");
        r.seleccion = [await selectNode(page, ...REGIONS[0])];
        await page.screenshot({ path: out(`${tag}-pantalla-connectograma.png`) });
        await download(page, exportButton(page), `${tag}-connectograma.jpg`);
        for (const region of REGIONS.slice(1)) r.seleccion.push(await selectNode(page, ...region));
        if ((await selectedIds(page)).length >= 2) await download(page, legendButton(page), `${tag}-leyenda.jpg`);
        await enlarge(page, "Hemisferios");
        await page.screenshot({ path: out(`${tag}-pantalla-hemisferios.png`) });
        await download(page, exportButton(page), `${tag}-hemisferios.jpg`);
        await enlarge(page, "Cerebro 3D");
        await waitPainted(page);
        await page.screenshot({ path: out(`${tag}-pantalla-cerebro3d.png`) });
        await download(page, exportButton(page), `${tag}-cerebro3d.jpg`);
      } finally {
        await browser.close();
        checkpoint();
      }
    }
  });
}

// El control de Ajustes con el teclado, por las tres opciones, y lo que se guarda.
async function phaseTeclado() {
  const report = {};
  await recording("teclado.json", report, async (checkpoint) => {
    const { browser, page, errors } = await launch();
    report.errors = errors;
    const visual = () =>
      page.evaluate(() => document.querySelector('svg[aria-label="Connectograma"] [data-ng-fill="net:cole-anticevic.visual"]')?.getAttribute("fill") ?? null);
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("neurograph.apariencia") ?? "null"));
    // Una flecha y lo que queda: el radio con el foco, la opción marcada, el
    // color de Visual en el connectograma y lo guardado.
    const arrow = async (key) => {
      await page.keyboard.press(key);
      await page.waitForTimeout(400);
      return { ...(await radioState(page)), visual: await visual(), guardado: await stored() };
    };
    try {
      await load(page, BASE, "grafito", null);
      await setWeightPosition(page, WEIGHT_POSITION);
      await enlarge(page, "Connectograma");
      report.inicio = { visual: await visual(), guardado: await stored() };
      report.engranaje = await openSettingsByKeyboard(page);
      report.focoAlAbrir = await focused(page);
      report.tabs = await tabToRadio(page);
      report.enElGrupo = await radioState(page);
      report.flechas = [];
      for (const key of ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowLeft"]) report.flechas.push({ tecla: key, ...(await arrow(key)) });
      checkpoint();
      await page.keyboard.press("Escape");
      report.escape = { panelAbierto: await page.locator(".settings__panel").count(), foco: await focused(page) };

      await page.reload();
      await page.locator(".data-status--real").waitFor({ timeout: 120000 });
      await enlarge(page, "Connectograma");
      report.recargar = { visual: await visual(), guardado: await stored() };
      // Cambiar de tema con el teclado no borra la elección (4.5), y
      // «Automática» se puede volver a elegir.
      await openSettingsByKeyboard(page);
      report.recargar.marcada = (await radioState(page)).marcada;
      await page.keyboard.press("Tab");
      report.tarjeta = await focused(page);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(600);
      report.otroTema = { visual: await visual(), guardado: await stored(), marcada: (await radioState(page)).marcada };
      report.vueltaTabs = await tabToRadio(page);
      report.vueltaAutomatica = await arrow("ArrowRight");
      await page.keyboard.press("Escape");
      checkpoint();

      // En la ventana mínima de Tauri, el grupo se alcanza con el teclado y
      // queda a la vista dentro del panel, que se desplaza.
      await page.setViewportSize({ width: 900, height: 600 });
      await page.waitForTimeout(600);
      await openSettingsByKeyboard(page);
      report.pequena = { tabs: await tabToRadio(page) };
      report.pequena.aLaVista = await page.evaluate(() => {
        const option = document.activeElement?.closest(".settings__palette-option")?.getBoundingClientRect();
        const panel = document.querySelector(".settings__panel").getBoundingClientRect();
        return Boolean(option) && option.top >= panel.top && option.bottom <= panel.bottom && option.bottom <= innerHeight;
      });
      await page.screenshot({ path: out("teclado-900x600.png") });
    } finally {
      await browser.close();
    }
  });
}

const phases = {
  preflight: phasePreflight,
  pantalla: phasePantalla,
  ajustes: phaseAjustes,
  exportar: phaseExportar,
  igual: phaseIgual,
  teclado: phaseTeclado,
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
"""Comparaciones de la verificación de la fase 2 (Task 5 de
docs/rediseno-interfaz-plan-fase2.md). Lee las imágenes de su carpeta y
escribe comparar.json. Necesita numpy y Pillow (los tiene el python3 de
pyenv de esta máquina).

- «igual»: JPEG byte a byte y capturas píxel a píxel, antes y después de la
  fase, con «Originales del atlas».
- «exportar3d»: el JPEG 3D de un tema oscuro contra el lienzo 3D de Claro en
  pantalla, con la misma paleta (fase 1: el 99 % de los píxeles a ±16).
- «cambia»: con otra paleta, el 3D tiene que cambiar.
- «automatica»: «Automática» se ve igual que la paleta que aplica en cada
  tema (la original en Original y la suave en los demás).
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

D = Path(__file__).parent
KINDS = ("connectograma", "leyenda", "hemisferios", "cerebro3d")
SCREENS = ("connectograma", "hemisferios", "cerebro3d")


def missing(*names):
    lost = [n for n in names if not (D / n).exists()]
    return {"sinComprobar": f"falta {', '.join(lost)}"} if lost else None


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
    return {
        "tamano": list(A.shape[:2]),
        "pxDistintos": int((d > 0).sum()),
        "fraccionA16": round(float((d <= 16).mean()), 5),
        "max": int(d.max()),
    }


report = {"igual": {}, "exportar3d": {}, "cambia": {}, "automatica": {}}
before = {"original": "igual-antes-original-auto", "grafito": "igual-antes-grafito-auto"}
after = {
    "original-auto": ("original", "igual-nueva-original-auto"),
    "original-original": ("original", "igual-nueva-original-original"),
    "grafito-original": ("grafito", "igual-nueva-grafito-original"),
}
for name, (theme, tag) in after.items():
    for kind in KINDS:
        report["igual"][f"{name} {kind}.jpg"] = same_bytes(f"{before[theme]}-{kind}.jpg", f"{tag}-{kind}.jpg")
    for screen in SCREENS:
        report["igual"][f"{name} pantalla {screen}"] = pixels(f"{before[theme]}-pantalla-{screen}.png", f"{tag}-pantalla-{screen}.png")

for tag in ("grafito-suave", "grafito-original", "noche-suave"):
    report["exportar3d"][tag] = pixels(f"{tag}-cerebro3d.jpg", f"{tag}-cerebro3d-claro-pantalla.png")

report["cambia"]["exportacion 3D grafito suave/original"] = pixels("grafito-suave-cerebro3d.jpg", "grafito-original-cerebro3d.jpg")
for theme in ("original", "grafito", "noche", "claro"):
    report["cambia"][f"pantalla 3D {theme} suave/original"] = pixels(
        f"{theme}-suave-cerebro3d-lienzo.png", f"{theme}-original-cerebro3d-lienzo.png"
    )

for theme in ("original", "grafito", "noche", "claro"):
    applied = "original" if theme == "original" else "suave"
    report["automatica"][f"{theme} lienzo 3D"] = pixels(
        f"{theme}-auto-cerebro3d-lienzo.png", f"{theme}-{applied}-cerebro3d-lienzo.png"
    )
    report["automatica"][f"{theme} pantalla"] = pixels(
        f"{theme}-auto-connectograma.png", f"{theme}-{applied}-connectograma.png"
    )

(D / "comparar.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
print(json.dumps(report, indent=2, ensure_ascii=False))
```

```bash
node --check "$D/verify-fase2.cjs" && python3 -m py_compile "$D/comparar.py" && echo "scripts correctos"
```

La Task 5 sigue con esta misma carpeta `$D` y con estos servidores en marcha. Si la hace otro agente, pásale la ruta de `$D` y los identificadores de los dos servidores.

## Chunk 5: verificación en la app real, fases e informe

### Task 5: verificación en la app real: fases, informe y cierre

**Files:**
- Create: en la carpeta `$D` de la Task 4, los JSON, las capturas, `comparar.json` e `informe.md`. Nada de esto entra en el repositorio.
- Modify: solo si algo sale «distinto» por un fallo de la fase (Step 5), los archivos de la tarea de la que venga.

Sigue a la Task 4, con su carpeta `$D` y sus dos servidores en marcha. Sus «Reglas del navegador y de los procesos» y su «Honestidad» valen igual aquí.

- [ ] **Step 1: las fases**

Cada orden, por separado, con `timeout 570` y el tiempo límite de la herramienta en 600000 ms (o en segundo plano). Tras cada una, quita los navegadores que hayan quedado y compruébalo:

```bash
pkill -f -- "$(basename "$D")/[t]mp"; pgrep -fa "$(basename "$D")/[t]mp" || echo "ningún navegador suelto"
```

La primera:

```bash
cd "$D" && PORT=5261 PORT_ANTES=5262 TMPDIR="$D/tmp" timeout 570 node verify-fase2.cjs preflight
```

Expected: `{"nueva":true,"anterior":true,"regions.json":360,"connections.json":64620,"backend":true}`, o las cifras que haya: apúntalas. Si sale con código 2, falta un servidor o el backend: no sigas y dilo.

Después, una orden por caso, con la misma forma:

```bash
cd "$D" && PORT=5261 PORT_ANTES=5262 TMPDIR="$D/tmp" timeout 570 node verify-fase2.cjs pantalla original
```

- `pantalla original`, `pantalla grafito`, `pantalla noche` y `pantalla claro` (cada una, con las tres elecciones);
- `ajustes original`, `ajustes grafito`, `ajustes noche` y `ajustes claro`;
- `exportar grafito-suave`, `exportar grafito-original`, `exportar noche-suave` y `exportar original-suave`;
- `igual antes-original-auto`, `igual nueva-original-auto`, `igual nueva-original-original`, `igual antes-grafito-auto` e `igual nueva-grafito-original`;
- y `teclado`, sin caso.

Cada una termina con `hecho` o con `hecho; sin comprobar: …`. Si una falla, su JSON guarda el error en `fallo`: mira si es del script (un selector, una espera) o de la fase, antes de seguir.

- [ ] **Step 2: las comparaciones de imágenes**

```bash
cd "$D" && python3 comparar.py > /dev/null && echo "comparar.json escrito"
```

- [ ] **Step 3: mirar las capturas**

Ábrelas con la herramienta de lectura de imágenes. Anota lo que veas, bien o mal:

- `<tema>-<elección>-connectograma.png` (las 12): los nodos con la paleta que toca, los anillos neutros, las etiquetas legibles y el logotipo con los mismos colores.
- `<tema>-<elección>-ajustes.png` (las 12): el control con la opción marcada bien visible, la ayuda de «Automática», la muestra, la nota entera, y las tarjetas con sus puntos. En Claro, que los amarillos de la muestra se vean con su anillo.
- `ajustes-foco-<tema>.png` (las 4): el anillo de foco en la opción, abierta con el teclado.
- `ajustes-<tema>-900x600.png` (las 4): el panel dentro de la ventana, con su barra de desplazamiento.
- `<tema>-<elección>-cerebro3d.png` (las 12): la corteza pintada con la paleta que toca.
- `grafito-suave-*.jpg` y `original-suave-*.jpg`: fondo blanco, redes con la columna de Claro, y dibujo en los grises de Claro en el primero y con los colores de hoy en el segundo.
- `teclado-900x600.png`: el anillo de foco en la opción, dentro del panel.

- [ ] **Step 4: el informe**

Escribe `$D/informe.md`. Empieza por HEAD, la base y cómo se construyó «antes» (Step 2 de la Task 4). Después, una tabla: cada comprobación, «visto», «distinto» o «sin comprobar», y de dónde sale.

| Comprobación | Dónde | «Visto» si |
|---|---|---|
| Datos | `preflight.json` | Los dos servidores y el backend responden; anota las cifras. |
| Colores de red en pantalla, 4 temas × 3 elecciones | `pantalla-<tema>.json`, `colores` | En cada caso, `distintos` es 0 en connectograma, hemisferios, filtros, logotipo y etiquetasDeRed, con `total` mayor que 0 (4 en el logotipo) y `seleccion` true. |
| «Automática» es la paleta que aplica | `comparar.json`, `automatica` | `pxDistintos` 0 en el lienzo 3D y en la pantalla, en los cuatro temas (la original en Original y la suave en los demás). |
| Ajustes en los 12 casos | `pantalla-<tema>.json`, `ajustes` | `marcadaBien` true (con «Automática», la marcada es `auto`); `muestra` con 12 y 0 distintos; las 4 tarjetas con 5 y 0 distintos. |
| El panel de Ajustes cabe | `ajustes-<tema>.json`, `tamanos` | Con `dentro` true a los cuatro tamaños. A 1400×900, 1280×800 y 1024×768, anota si `seDesplaza`; a 900×600 se espera `seDesplaza` true (desviación 18). Anota el alto y `scrollHeight` de cada uno, para la D. |
| Anillo de foco en el grupo | `ajustes-<tema>.json`, `tabs` y `radio` | `tabs` acaba en `input «radio auto»`; `radio.anillo` con estilo `solid` y `delAcento` true en los cuatro temas; y las capturas `ajustes-foco-<tema>.png` lo confirman. |
| El 3D en pantalla cambia con la paleta | `comparar.json`, `cambia`, «pantalla 3D …» | `pxDistintos` mayor que 0 en los cuatro temas, y las capturas del Step 3 lo confirman. |
| Exportación de los SVG | `exportar-<caso>.json` | En los 4 casos y en connectograma, leyenda y hemisferios: `redes` con `total` mayor que 0 y 0 distintos, `tokens` con 0 distintos, `avisosDeExportacion` vacío y `seleccion` [true, true, true]. |
| Exportación 3D | `comparar.json`, `exportar3d` y `cambia` | `fraccionA16` de al menos 0,99 en grafito-suave, grafito-original y noche-suave (la fase 1 dio el 99 %), y `pxDistintos` mayor que 0 en «exportacion 3D grafito suave/original». |
| «Originales del atlas» igual que antes, JPEG | `comparar.json`, `igual`, y `igual-*.json` | `igual: true` en los 12 (4 tipos por 3 casos). Solo cuenta si en los `igual-*.json` de los dos lados todas las `seleccion` son true; si no, «sin comprobar». |
| «Originales del atlas» igual que antes, pantalla | `comparar.json`, `igual`, «pantalla …» | `pxDistintos` 0 en las 9 capturas, con la misma condición de `seleccion`. |
| Teclado, por las tres opciones | `teclado.json` | `engranaje` y `escape.foco`: `button «Ajustes»`; `focoAlAbrir`: `button «2 · Grafito»`; `tabs` acaba en `input «radio auto»`; `enElGrupo`: foco y marcada `auto`, anillo `solid` y `delAcento` true. En `flechas`: primero `suave` (visual `#4f74c4`, guardado `{"theme":"grafito","paletteMode":"suave"}`), después `original` (`#0000ff`, guardado con `original`), después `auto` (`#4f74c4`, guardado con `null`) y, con la flecha izquierda, `original` otra vez. `escape.panelAbierto` 0. |
| Lo que se guarda | `teclado.json` | `inicio`: visual `#4f74c4` y guardado con `paletteMode` null; `recargar`: visual `#0000ff`, guardado `{"theme":"grafito","paletteMode":"original"}` y marcada `original`; `tarjeta`: `button «3 · Noche»`; `otroTema`: visual `#0000ff`, guardado `{"theme":"noche","paletteMode":"original"}` y marcada `original`; `vueltaTabs` acaba en `input «radio original»`, y `vueltaAutomatica`: foco y marcada `auto`, visual `#4d76cf` y guardado `{"theme":"noche","paletteMode":null}`. |
| Ventana de 900×600 | `teclado.json`, `pequena` | `tabs` llega a un radio y `aLaVista` es true. |
| Consola | `errors` de cada JSON | Vacía. Si sale algo, cópialo tal cual. |
| Revisión visual | Step 3 | Lo anotado. |

Añade al final los casos de `sinComprobar` y, si corregiste el script, qué y por qué.

- [ ] **Step 5: si algo sale «distinto»**

Usa superpowers:systematic-debugging. Según de dónde venga:
- **De la fase:** corrígelo con su prueba (TDD), en un commit `Paleta: …` con el paso «Comprobar», y vuelve a pasar la fase afectada.
- **Del script:** corrige su suposición (un selector, una espera) y anótalo en el informe.
- **De fuera de la fase** (datos, backend): anótalo, sin tocarlo.

- [ ] **Step 6: cerrar**

Para los dos servidores con la herramienta de tareas (los identificadores del Step 3 de la Task 4). Después, comprueba que no queda nada propio:

```bash
ss -ltn | grep -E ':(5261|5262) ' || echo "puertos libres"
```

Solo si un puerto sigue ocupado, mata ese servidor, y solo ese: `pkill -f -- "vite --port 526[1] "` para el 5261 y `pkill -f -- "vite --port 526[2] "` para el 5262. Después, vuelve a lanzar la orden de `ss` de arriba, en otra orden, hasta que diga `puertos libres`.

```bash
pkill -f -- "$(basename "$D")/[t]mp"; pgrep -fa "$(basename "$D")/[t]mp" || echo "ningún navegador suelto"
git -C /home/dae/PycharmProjects/Neurograph/Neurograph status --short | diff "$D/copia-principal-antes.txt" - && echo "copia principal sin cambios"
```

Expected: `puertos libres`, `ningún navegador suelto` y `copia principal sin cambios`. Si la copia principal cambió, dilo en el informe sin tocarla: no sabes si fue esta tarea.

## Chunk 6: decisión y spec

### Task 6: la D de la fase 2, retoques del spec y commit

**Files:**
- Modify: `docs/decisiones-diseno.md` (la D nueva, al final)
- Modify: `docs/rediseno-interfaz-diseno.md` (retoques donde la implementación se apartó o concretó)

`docs/` lo toca también otra sesión. Aquí solo se tocan esos dos archivos, y en el commit solo entran ellos (y este plan, si todavía no estuviera en el repositorio).

- [ ] **Step 1: el número de la D y el estado de `docs/`**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git status --short docs/
grep -n "^## D[0-9]" docs/decisiones-diseno.md
git show master:docs/decisiones-diseno.md | grep -n "^## D[0-9]"
grep -n "^## D[0-9]" /home/dae/PycharmProjects/Neurograph/Neurograph/docs/decisiones-diseno.md
git ls-files docs/rediseno-interfaz-plan-fase2.md
```

- Si `docs/decisiones-diseno.md` o `docs/rediseno-interfaz-diseno.md` tienen cambios sin commit, son de otra sesión: no sigas, no los toques y termina la tarea como BLOQUEADA, diciendo qué archivo y qué cambios.
- La D nueva es la **siguiente libre** en las tres listas. Lo esperado es que la rama ya tenga la D4 (fase 3) y la de la parte 3D de la fase 4 (probablemente la D5), así que esta sería la D6; si la parte 3D todavía no se ha fusionado, la D5. Llámala D<n> en lo que sigue.
- El código no cita el número (dice «fase 2 del rediseño»), así que no hay que cambiar nada en `frontend/src`.
- Si `git ls-files` no imprime nada, el plan no está en el repositorio: se añade en el commit del Step 4.

Antes de escribir el número en ningún sitio, comprueba que nadie lo usa ya. Los planes (`rediseno-interfaz-plan-*.md`) quedan fuera, porque nombran números posibles sin usarlos (este mismo dice «D5» y «D6»):

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && grep -rnw "D<n>" docs frontend/src scripts --exclude='rediseno-interfaz-plan-*.md' ; echo "fin de la búsqueda"
```

con `D<n>` cambiado por el número. Expected: solo `fin de la búsqueda`. Si sale algo, ese número ya está tomado: vuelve a empezar este Step con el siguiente.

- [ ] **Step 2: retoques del spec**

En `docs/rediseno-interfaz-diseno.md`, con el estilo del documento (frases cortas, listas):

- **Cabecera, «Estado»:** tras las frases de las fases 1 y 3, «La fase 2 también: D<n> de `docs/decisiones-diseno.md`, con el plan en `docs/rediseno-interfaz-plan-fase2.md`.».
- **4.1, nota del acento:** la opción marcada de «Colores de las redes» también usa el borde `accent`, junto a la tarjeta del tema elegido.
- **4.3:**
  - Al principio, «Hay dos modos, que se eligen en Ajustes»: se eligen en Ajustes junto con «Automática», que no es un tercer modo sino la elección `null` de 4.5.
  - Tras «La tabla la genera `scripts/generate_soft_palettes.py`…»: el script solo usa la biblioteca estándar de Python; con `--check` dice si la tabla está al día; si un grupo no cumple la comprobación, no escribe nada; y el orden de las claves dentro de un grupo es parte del método.
  - En la «Comprobación», tres puntos más: el grupo de demostración (contraste mínimo de 4,05 en Grafito, 4,11 en Noche y 2,20 en Claro; ΔE_OK mínimo de 0,10); el tema Original con «Suaves», que usa la columna de Grafito sobre su panel `#1d1e26` y queda en 3,66:1 como mínimo; y la tabla frente a la de la maqueta (idéntica salvo tres a cinco redes de Power por tema, porque la maqueta no tenía dos de sus diecisiete redes, y las claves nuevas; ver «La paleta generada frente a la de la maqueta» en el plan).
- **4.5:** `null` se elige en Ajustes como «Automática», que es la opción de por defecto; elegirla después de otra vuelve al automático.
- **5.2, «Colores de las redes»:**
  - Tres opciones, «Automática», «Suaves» y «Originales del atlas», con la desviación y su motivo (desviación 8 del plan): con dos, no se podía volver al automático.
  - Son radios nativos en un `role="radiogroup"`, con la nota como descripción; la opción marcada lleva el borde y el anillo del acento. «Automática» lleva la línea «Automática: suaves en los temas nuevos; originales en Original.».
  - La muestra son las doce redes de Cole-Anticevic con la paleta que se aplica. Es decorativa y no lleva etiquetas emergentes.
  - En «Tema», cada tarjeta enseña la paleta que tendría su tema: la elegida o, con «Automática», la automática de ese tema.
  - El panel se desplaza por dentro cuando no cabe: da los altos medidos en la Task 5 y a qué tamaños se desplaza (a 900×600, sí).
- **9, un párrafo «Fase 2»** tras los de las fases anteriores, con lo construido:
  - `PaletteMode`, `PALETTE_MODES`, `isPaletteMode` y `effectivePaletteMode` están en `theme/colors.ts`; el tipo estaba en el store.
  - Las funciones puras reciben el modo que se aplica: `resolveNetworkColor(clave, tema, modo)`, `exportColorFor(ref, tipo, tema, modo)` y `exportResolverFor(tema, modo)`. Solo `effectivePaletteMode(tema, elección)` recibe la elección, con `null`.
  - Nuevas: `exportNetworkColor(clave, modo)`, que usan las dos vías de exportación, y `currentExportResolver()` (`theme/useDrawColors.ts`), el único resolvedor de exportación, que lee tema y modo al exportar.
  - `drawColorsFor(tema, modo, forExport)`; `useDrawColors(forExport)` conserva su firma, así que `Brain3D.tsx` no cambia.
  - `setPaletteMode` en el store, que acepta `null`, y `SettingsChoices`, el contenido de Ajustes sin el store.
  - En el párrafo «Fase 1», al final del punto «Sin modo de paleta todavía»: «Llegó en la fase 2».
- **10:**
  - El tono se comprueba en los colores suaves con un croma de al menos 0,04; por debajo, el redondeo a `#rrggbb` ya lo mueve más de 3°.
  - El contraste de la paleta suave se prueba en `themeCss.test.ts`, que lee el panel de `index.css`, y cubre también Original con «Suaves».
  - La prueba que liga la exportación 3D con la de los SVG cubre los dos modos.
  - Hay pruebas de marcado de `SettingsChoices` (con las tres opciones) y de las muestras de Filtros, con la paleta automática y con una elección guardada (`vi.resetModules`).
- **11:**
  - La frase «numeración D; la primera libre es la D3» pasa a decir qué D es cada fase: la 1, la D3; la 3, la D4; la parte 3D de la 4, la suya; y la 2, la D<n>.
  - En la fase 2, «la opción «Suaves / Originales del atlas»» pasa a «la opción «Colores de las redes» (Automática, Suaves y Originales del atlas)», con «(D<n>)».
  - El orden de implementación pasa a «1, 3, la parte 3D de la 4, 2 y el resto de la 4», con quién decidió cada cambio: la fase 3 antes que la 2 lo propusimos nosotros (la frase ya está); la parte 3D antes que la 2 la pidió el usuario el 24/09/2026, al preguntar por la atenuación por profundidad.
- **12, un riesgo más:** si cambia un color de `NETWORK_COLORS` y no se vuelve a generar la tabla, las pruebas lo detectan cuando cambian las claves o el tono, pero no si solo cambia la luminosidad: eso solo lo ve `generate_soft_palettes.py --check`.

Si en el Step 5 de la Task 5 cambiaste algo que el spec describe, retócalo también.

- [ ] **Step 3: la D, al final de `docs/decisiones-diseno.md`**

Toma la D3 de ese archivo como modelo: su forma, sus encabezados en negrita y su línea final sobre las secciones del spec retocadas.

- Título: `## D<n>. Paleta suave de las redes (fase 2 del rediseño) -- dd/mm/aaaa`, con la fecha del día.
- Párrafos con encabezado en negrita:
  - **Motivación.** Los colores de red eran primarios puros (`#0000ff`, `#00ff00`, `#ffff00`…) y al usuario le parecían un «RGB burdo». `NETWORK_COLORS` es dato de cada atlas y el desarrollador principal dejó escrito que no se toca (`theme/networks.ts:225`): la paleta suave es una capa de presentación calculada a partir de él.
  - **Decidido por el usuario** (24/09/2026): «la semántica de colores la mantenemos, pero otros tonos más amables». Aprobó la maqueta con esta paleta («justamente lo que buscábamos, validado por main»), con la opción de volver a los originales cuando una figura tenga que coincidir con la del artículo.
  - **Decidido en la revisión del plan:** la tercera opción, «Automática» (desviación 8), y por qué.
  - **Qué cambia.** Una línea por parte:
    - el generador y la tabla (tres columnas, 73 claves, seis grupos);
    - el modo en las funciones de color;
    - todo lo que pinta un color de red lo sigue sin tocar su código, porque lee `useDrawColors`: vistas, 3D, etiquetas de red, buscador, logotipo, detalle y diagrama de síntesis;
    - las muestras de Filtros;
    - la exportación, con la columna de Claro con «Suaves» y un solo resolvedor que lee tema y modo;
    - Ajustes, con las tres opciones y las tarjetas.
    - Añade las recomendaciones de la revisión final de la fase 1 que se cumplen aquí.
  - **Qué no cambia.**
    - `NETWORK_COLORS`, las constantes de la decisión 18 y la lógica de representación.
    - `Brain3D.tsx` y `PaintedCortex.tsx`: ni una línea.
    - Los stores, salvo `setPaletteMode`.
    - `FilterPanel`, que es del desarrollador principal, solo cambia de dónde sale el color de sus muestras.
    - Con «Automática», el tema Original sigue con los colores de siempre.
    - Con «Originales del atlas», la Task 5 **vio** en la app la pantalla y las exportaciones iguales que antes con los temas Original y Grafito. Con Noche y Claro no se miró en la app: lo sostienen las pruebas unitarias (`resolveNetworkColor` con «original» en los cuatro temas, y la prueba que liga la exportación 3D con la de los SVG). Dilo así, sin extender lo visto a los cuatro temas.
  - **La tabla frente a la maqueta.** Resumen de la sección del plan: idéntica en Cole-Anticevic, Gordon 333, Yeo 7, Yeo 17 y «sin clasificar», y distinta en tres a cinco redes de Power por tema, por las dos redes de Power que faltaban en la entrada de la maqueta. Más las claves nuevas.
  - **Desviaciones del spec.** Las de este plan que sigan en pie, y las que añadieran las Tasks 4 y 5.
  - **Correcciones de las revisiones.** Una línea con lo que cambiaron las revisiones de las dos tandas (sus commits `Paleta: correcciones de la revision de la tanda N`), o que no hizo falta cambiar nada.
  - **Limitaciones conocidas:**
    - la ventana real de Tauri no se ha comprobado;
    - los colores del 3D en pantalla solo se comprobaron a ojo y porque cambian con la paleta; la exportación 3D, contra el 3D de Claro en pantalla;
    - con «Suaves» en Claro, los colores de red quedan entre 1,78 y 2,20:1 sobre blanco y cuentan con el anillo neutro (principio 6);
    - ninguna paleta tiene en cuenta el daltonismo (spec 12);
    - el riesgo de la tabla desfasada del Step 2;
    - **el panel de Ajustes y la D3:** con la sección nueva, el panel mide lo que midió la Task 5 y a 900×600 se desplaza por dentro. Corrige lo que dice la D3 («se ve entero» a 900×600), con los valores medidos;
    - lo que la Task 5 dejara «sin comprobar».
  - **Verificación.** El método, aquí mismo y sin remitir al scratchpad, que se borra con la sesión: Chromium sin interfaz (Playwright), servidores de desarrollo propios con cachés propias, el backend local con datos reales solo con peticiones GET, la versión anterior servida aparte con los mismos datos guardados (y cómo se construyó, Step 2 de la Task 4), y cada región seleccionada comprobando que es la buscada. Después, lo que dice el informe de la Task 5, comprobación por comprobación, con «visto», «distinto» o «sin comprobar», y el HEAD verificado. Y el número de pruebas, `tsc` limpio, lint con la línea base y la compilación.
  - **Queda para la fase 4.** La leyenda del connectograma (5.4) y los gráficos de la sección 6 que no hiciera la parte 3D: etiquetas radiales, arcos de hemisferio, nodos del connectograma, hemisferios, surcos y etiquetas 3D. Y, del diagrama de síntesis, el contorno de los nodos en Claro (D3).
- Al final, la línea con las secciones del spec retocadas en el Step 2, como en la D3, y los enlaces al spec (4.1, 4.3 a 4.5, 5.2, 9 a 12) y a este plan, `docs/rediseno-interfaz-plan-fase2.md`.

- [ ] **Step 4: commit**

Otra sesión puede haber tocado `docs/` mientras trabajabas. Antes de añadir nada, mira qué cambia y vuelve a buscar el número:

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git status --short && git diff docs/
grep -rnw "D<n>" docs frontend/src scripts --exclude='rediseno-interfaz-plan-*.md' ; echo "fin de la búsqueda"
```

- En el diff de los dos documentos solo deben estar tus cambios. Si alguno tiene cambios de otra sesión, no hagas el commit: no los añadas ni los deshagas, y termina la tarea como BLOQUEADA, diciendo qué archivo y qué cambios.
- La búsqueda solo debe encontrar lo que escribiste tú, en esos dos documentos. Si encuentra el número en otro sitio, otra sesión lo ha tomado a la vez: no hagas el commit y dilo.

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-interfaz && git add docs/decisiones-diseno.md docs/rediseno-interfaz-diseno.md && git commit -m "Paleta: D<n>, verificacion en la app real y retoques del spec

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

Con el número de la D en el mensaje. Si el plan no estaba en el repositorio (Step 1), añade también `docs/rediseno-interfaz-plan-fase2.md` al `git add`.
