# Rediseño de la interfaz · Legibilidad del 3D. Plan de implementación

> **Para agentes:** OBLIGATORIO: usar superpowers:subagent-driven-development (si hay subagentes) o superpowers:executing-plans para ejecutar este plan. Los pasos usan casillas (`- [ ]`) para seguir el avance.

**Objetivo:** que el cerebro 3D se lea mejor sin cambiar lo que representa. Lo que queda detrás se ve más tenue, con un interruptor activado por defecto; los marcadores de región miden la mitad; y exportar el JPEG deja de mostrar en pantalla fotogramas con los colores de exportación.

**Arquitectura:**

- **Atenuación en el shader.** Los materiales de la capa de foco (líneas, marcadores con su contorno, conos de dirección y etiquetas) reciben un parche con `onBeforeCompile`. La profundidad en el espacio de la cámara pasa del shader de vértices al de fragmentos, y el alfa se multiplica por `1 − (1 − mín)·smoothstep(cerca, lejos, profundidad)`: una línea larga se desvanece a lo largo de su recorrido. El tramo `cerca`–`lejos` se recalcula en cada fotograma con la cámara y la caja del cerebro que se ve. Todos los materiales comparten los mismos uniforms. Con el interruptor desactivado, los materiales son los de siempre, sin parche.
- **Marcadores:** un solo módulo decide el radio y lo que depende de él (`logic/markerSize.ts`).
- **Captura fuera de pantalla.** La exportación pasa por tres fases: `capturing`, `restoring` e `idle`. Fuera de `idle`, el lienzo visible no se dibuja. La captura se dibuja en un `WebGLRenderTarget` con el mismo proceso de color que el lienzo, se lee con `readRenderTargetPixels`, se le da la vuelta y se codifica como un JPEG del mismo tamaño que hoy.
- **Lógica pura aparte**, probada con TDD en node: el factor, el tramo, la caja y su semiprofundidad, el parche de los shaders, las props y la clave de React de los materiales, la preferencia, los tamaños, las fases de la exportación, la vuelta de las filas, el destino de la captura y lo que se comprueba antes de capturar.
- **Solo presentación.** No cambian los stores, los datos ni `NETWORK_COLORS`. Los colores salen de `useDrawColors`, como ya hacía `Brain3D`. No se tocan `App.tsx`, `App.css` ni `index.css`.

**Tecnología:** React 19, TypeScript 6 estricto, Vite 8, three.js 0.185.1, @react-three/fiber 9.7.0, vitest 4 (entorno node, sin DOM; `react-dom/server` para el marcado) y oxlint.

**Spec:** `docs/rediseno-interfaz-diseno.md` (commit `1f524db`): de la sección 6.3, «Marcadores de región», «Atenuar lo que queda detrás» y «Captura del 3D sin parpadeo», con los principios (3), la accesibilidad (8), las pruebas (10) y los riesgos (12).

**Qué es esta minifase.** La parte 3D de la fase 4, adelantada a petición del usuario (24/09/2026). Con la corteza pintada, los marcadores, las etiquetas y las líneas se dibujan encima de la superficie sin prueba de profundidad (`depthTest={!overlay}`). Así, las regiones de la cara interna o del otro hemisferio parecen delante de la corteza visible, y las etiquetas de regiones homólogas de los dos hemisferios salen dobles, una encima de otra. Con el conectoma denso de HCP-MMP1.0 y el peso mínimo cerca de 0, una región seleccionada muestra una estrella de hasta 359 líneas que parece flotar.

**Fuera de esta minifase** (el resto de la fase 4, más adelante): los percentiles de los surcos, el nuevo estilo de las etiquetas 3D y su caché por tema, el connectograma, los hemisferios y la paleta suave.

**Rama en paralelo.** Esta minifase va en `rediseno-3d`, creada desde `1f524db`, mientras la fase 3 («Estructura») se implementa en `rediseno-interfaz`. La fase 3 no toca `Brain3D.tsx`, `PaintedCortex.tsx`, `ReferenceMesh.tsx` ni `textSprite.ts`, y esta minifase no toca `App.tsx`, `App.css` ni `index.css`: las dos ramas se fusionan sin conflictos. Hay dos puntos de contacto, que se resuelven sin CSS nuevo (desviación 7):

- La fase 3 reescribe `.export-btn` y conserva `.export-btn--active` y `[aria-pressed="true"]`. El interruptor usa esas clases, así que al fusionar toma el estilo nuevo.
- La fase 3 sube a la cabecera de la vista el `.brain3d-toolbar > .export-btn`, que es el botón de exportar. El interruptor va dentro de su propio `div`, y esa regla no le afecta.

**Lo que la D3 dejó para aquí** (`docs/decisiones-diseno.md`, «Limitaciones conocidas»): durante la exportación del 3D y justo después, la pantalla mostraba unos fotogramas con los colores de exportación. Lo corrige la Task 4.

**Dónde se trabaja:**

- Worktree `/home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d`, rama `rediseno-3d`.
- La copia principal `/home/dae/PycharmProjects/Neurograph/Neurograph` no se toca.
- `frontend/node_modules` ya está en el worktree. No ejecutes `npm install`: esta minifase no añade dependencias.

**Convenciones:**

- Identificadores en inglés y comentarios en castellano, como el código actual. Los comentarios nuevos citan «Legibilidad del 3D»: el número de su decisión D se asigna al fusionar esta rama en `rediseno-interfaz`, así que no aparece en el código.
- **Rutas absolutas en todos los comandos.** Las órdenes de `frontend/` empiezan con `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend`.
- Órdenes, desde `frontend/`:
  - Una prueba: `npx vitest run <ruta>`. Todas: `npm test`. Al escribir este plan había 129 pruebas. El Step 0 de la Task 1 anota las que haya al empezar: es la **BASE**, y cada tarea da sus cuentas como «BASE + N».
  - Tipos: `npx tsc -b`.
  - Lint: `npm run lint`. La línea base da **9 avisos** (3 `set-state-in-effect`, uno de ellos en `Brain3D.tsx`; 4 `preserve-manual-memoization`; 2 `exhaustive-deps`) y ningún error. oxlint no imprime un resumen, así que se cuentan con `npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c`. No pueden aumentar. Si aparece un aviso nuevo, no se silencia: se reestructura el código (por ejemplo, se quita una memoización manual o el cálculo pasa a una función pura). Si no hay forma de volver a 9, la tarea se detiene y se informa como BLOQUEADA.
  - Compilación: `npm run build`. El aviso de tamaño de bloque (más de 500 kB) ya estaba.
- **Paso «Comprobar» al final de cada tarea:** las cuatro órdenes, todas bien.
- **Sustituciones en archivos existentes.** Cada «Busca» aparece una sola vez en el archivo. Si no lo encuentras tal cual, no sigas: el archivo no es el que espera el plan, y hay que averiguar por qué antes de tocar nada.
- oxlint avisa si un `.tsx` exporta algo que no sea un componente o un tipo (`react/only-export-components`): las funciones puras van en archivos `.ts`.
- `tsconfig.app.json` exige `import type` para los tipos (`verbatimModuleSyntax`) y da error por imports o variables sin usar (`noUnusedLocals`).
- **Colores:** solo los de `useDrawColors`. El único color fijo nuevo es el blanco de la exportación (decisión 11), que ya era fijo.
- **Letra mínima de 0,7rem** en lo nuevo.
- **Estado y manejadores.** No cambies el estado, los stores ni los manejadores salvo lo que dice cada tarea.
- **Commits:** uno por tarea. Mensaje en castellano sin tildes ni eñes, que empieza por `Legibilidad 3D: ` y termina con la línea `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. `git add` solo de los archivos que nombra la tarea. Nada de `git stash`.
- **`docs/`:** esta minifase no toca `docs/decisiones-diseno.md` ni el spec. Su entrada D y los retoques del spec se escriben al fusionarla en `rediseno-interfaz`, que es donde la fase 3 también los toca; la Task 7 deja el borrador.

## Mapa de archivos

Nuevos, en `frontend/src/`:

| Archivo | Responsabilidad |
|---|---|
| `logic/markerSize.ts` | Radio de los marcadores y lo que depende de él: escala del contorno, zona de clic y separación de la etiqueta |
| `logic/depthFade.ts` | Atenuación por profundidad: factor, tramo, caja del cerebro y su semiprofundidad en la dirección de la vista, parche de los shaders, uniforms compartidos y su actualización, y las props y la clave de React de los materiales |
| `logic/depthFadePreference.ts` | Preferencia del interruptor en `localStorage`, con `try/catch` |
| `logic/capture3d.ts` | Fases de la exportación, vuelta de las filas, destino de la captura y dibujo fuera de pantalla, que antes comprueba el contexto WebGL y el tamaño del lienzo |
| `components/DepthFadeToggle.tsx` | Botón de alternar «Atenuar lo que queda detrás» |
| Pruebas | `logic/markerSize.test.ts`, `logic/depthFade.test.ts`, `logic/depthFadePreference.test.ts`, `logic/capture3d.test.ts` y `components/DepthFadeToggle.test.tsx` |

Modificados:

- `components/Brain3D.tsx`: los marcadores (Task 1), la atenuación y su interruptor (Task 3) y la exportación (Task 4).
- `components/PaintedCortex.tsx`: la caja de la superficie que se ve, en `SurfaceOverlayHelpers` (Task 3).
- `logic/exportImage.ts`: `exportPixelsAsJpeg` (Task 4).

Sin cambios: `App.tsx`, `App.css`, `index.css`, los stores, `theme/*`, `ReferenceMesh.tsx`, `logic/textSprite.ts`, `logic/renderSafety.ts` y los valores de `theme/networks.ts`.

## Desviaciones y decisiones de diseño

El borrador de la decisión (Task 7) las recoge.

1. **Atenuación: la técnica sugerida, con estas precisiones.**
   - La profundidad es la del eje de la cámara (`-mvPosition.z`), tanto la de cada fragmento como la del centro del cerebro, que se pasa al espacio de la cámara con su matriz. No es la distancia euclídea: así el tramo sigue centrado aunque el centro de giro de los controles, que es el centroide de los nodos, no coincida con el centro de la caja.
   - **El tramo sale del elipsoide del cerebro, no de una esfera:** `cerca = c − 0,2·E` y `lejos = c + E`. `c` es la profundidad del centro de la caja del cerebro que se ve. `E` es la distancia de ese centro a la cara más lejana del elipsoide inscrito en la caja, en la dirección de la vista: `E = √((hx·dx)² + (hy·dy)² + (hz·dz)²)`, con `h` la mitad de la caja y `d` la dirección de la cámara. Con la esfera que proponía el encargo (`d − 0,2R` a `d + R`), el radio lo marca el largo del cerebro, que es mayor que su ancho. Calculado con los nodos de HCP-MMP1.0 y la cámara del principio, que da una vista lateral: con la esfera, las regiones más alejadas del otro hemisferio se quedarían en ~0,3 de opacidad, y la mediana de ese hemisferio en ~0,6; con el elipsoide, en 0,2 y ~0,45. Además, el elipsoide sigue la profundidad real del cerebro en cualquier vista. La Task 5 lo mide.
   - **Qué caja.** Con la corteza pintada, la de la superficie que se ve, que da `PaintedCortex`. Si solo se ve un hemisferio, la suya: con la del cerebro entero, su cara interna, que es la que mira a la cámara, quedaría detrás del centro y se atenuaría. Sin corteza pintada (vista translúcida, atlas volumétricos, o si la corteza no carga), la de todos los nodos del atlas.
   - La fórmula `1 − (1 − mín)·smoothstep(cerca, lejos, profundidad)` es `mix(1, mín, smoothstep(…))`, pero con `mín = 1` da exactamente 1. El mínimo es 0,2, el extremo alto del margen del encargo (0,15 a 0,2): lo del otro lado sigue viéndose.
   - Anclas del parche: `#include <common>` y `#include <fog_vertex>` en el shader de vértices, y `#include <common>` y `#include <opaque_fragment>` en el de fragmentos. Están, una vez cada una, en los cuatro shaders de three.js 0.185 que usa la capa de foco (`basic`, `dashed`, `physical` y `sprite`), y una prueba lo comprueba sobre `THREE.ShaderLib`. Todo o nada: si falta un ancla o está repetida, el material se queda como estaba y en desarrollo se avisa una vez.
2. **Desactivado es el material de siempre, sin parche**, y no el parche con el mínimo en 1. Así «desactivado» es exactamente lo de hoy, y sirve de escape si el parche fallara en algún WebView. Cada material de la capa de foco lleva una clave de React que cambia con el interruptor (`fadeKey`): al alternar se crean materiales nuevos, y las mallas, las geometrías y los eventos se quedan. La clave es imprescindible. Al desactivar desaparecen las props del parche, y react-three-fiber 9.7 no deja sin tocar una prop que desaparece: `applyProps` se salta los `undefined`, pero `diffProps` repone las props quitadas y, en un material, cuyo constructor recibe parámetros, las pone a 0. Con `customProgramCacheKey` a 0, three.js falla en cuanto vuelve a preparar el programa del material, porque `WebGLPrograms.getParameters` la llama. Además, three.js no vuelve a compilar por su cuenta el shader de un material que ya existe.
3. **Con la atenuación activada, marcadores, contornos y conos son transparentes:** si no, su alfa no cuenta. Los `renderOrder` no cambian, pero three.js los dibuja entonces en la pasada de transparentes, ordenados de atrás adelante junto a las líneas. Solo con el interruptor activado, y la verificación lo mira en las capturas (Task 7):
   - Con la corteza pintada, un marcador cercano queda encima de las líneas que pasan por él. Hoy todas las líneas van encima de todos los marcadores, y los marcadores entre sí van en el orden en que se crearon.
   - En la vista translúcida, los marcadores cercanos se dibujan después de la malla de fondo y pierden su velo (opacidad 0,14).
   - Un marcador atenuado deja ver un poco su contorno a través del relleno.
   - En la vista translúcida y en los atlas volumétricos, que no tienen corteza pintada y sí prueba de profundidad, los marcadores y los conos atenuados siguen escribiendo profundidad, como hoy. Una línea que se dibuje después y pase por detrás de uno puede mostrar un pequeño corte, aunque el marcador se vea tenue. Se deja así.
4. **Marcadores** (`logic/markerSize.ts`):
   - Radio 0,03, y 0,042 la región seleccionada (1,4 veces).
   - El contorno pasa de escala 1,18 a 1,36. Su anillo mide 0,0108, lo mismo que hoy en un marcador normal (0,06 × 0,18). Con 1,18 y el radio nuevo mediría 0,0054, menos de un píxel a la distancia de partida, y los nodos `#000000` se perderían sobre el fondo oscuro.
   - La zona de clic conserva los radios de antes (0,06 y 0,09, con los mismos 14 × 14 segmentos) en una esfera invisible: con `visible={false}` en el material, three.js no la dibuja, pero el raycast la encuentra. Seleccionar con un clic cuesta lo mismo que antes. Con la corteza pintada sigue sin haber clic en los marcadores.
   - La etiqueta queda a 0,18 del borde del marcador, como antes en un marcador normal (0,24 desde el centro con el radio de 0,06): a 0,21 del centro, y a 0,222 en la región seleccionada. En esta quedaba a 0,15 del borde (radio 0,09), y ahora también a 0,18.
   - El cono de dirección (radio 0,035) no cambia, así que queda algo mayor que un marcador normal. Se deja a la revisión visual del usuario con datos que tengan conectividad efectiva: en HCP-MMP1.0 todas las conexiones son estructurales, así que no se dibuja ningún cono.
5. **El lienzo se para sin `frameloop="never"`.** Un `useFrame` con prioridad 1 en `ExportBridge` dibuja la escena en cada fotograma, pero solo en `idle`. Con una prioridad mayor que 0, react-three-fiber deja de dibujar por su cuenta: es su forma prevista de tomar el control del dibujo. `frameloop="never"` no basta:
   - react-three-fiber 9.7 repone el `frameloop` de la prop del `<Canvas>` en cada render (`configure`: `if (state.frameloop !== frameloop) state.setFrameloop(frameloop)`), y `Brain3D` se vuelve a pintar al empezar la exportación;
   - con `"never"`, su bucle todavía dibuja el fotograma pendiente (`internal.frames > 0`);
   - y al volver a `"always"` podría dibujar antes de que el árbol de react-three-fiber aplique los colores de pantalla.

   Con las fases, los colores de exportación entran en los materiales en el mismo commit en que el dibujo se para. El dibujo vuelve un fotograma después de que la corteza pintada recalcule los colores de pantalla: esa es la fase `restoring`. `exportRef` desaparece: el botón despacha la petición al reductor de las fases.
6. **El destino de la captura se marca como de WebXR** (`isXRRenderTarget`), con `colorSpace` sRGB, el formato interno `RGBA8` fijado, `UnsignedByteType`, 4 muestras y sin resolver la profundidad (`resolveDepthBuffer: false`: solo se lee el color).
   - En three.js 0.185, un destino normal recibe el dibujo en lineal y sin curva de tono. En pantalla, en cambio, el shader aplica la curva ACES que pone react-three-fiber y la codificación sRGB, y las transparencias se mezclan sobre esos valores. three.js solo aplica las dos cosas en pantalla o en un destino de WebXR, con el espacio de color de su textura (`WebGLPrograms`, `WebGLRenderer.setProgram` y `getUnlitUniformColorSpace`).
   - La marca también actúa en `WebGLTextures`, y por eso el formato interno `RGBA8` es imprescindible. Con la marca, el renderbuffer multimuestra se crea en `RGBA8`, pero la textura en la que se resuelven sus muestras seguiría el `colorSpace` y sería `SRGB8_ALPHA8`. Resolver entre formatos distintos (`blitFramebuffer`) da `INVALID_OPERATION`.
   - Con todo ello, la captura usa los mismos programas que el lienzo y el JPEG sale con los colores de hoy. Es un detalle interno de three.js: una prueba fija la configuración del destino, y la Task 6 compara el JPEG con el de la versión anterior. La captura con multimuestreo no se puede comprobar aquí en WebKitGTK ni en WebView2.
   - Antes de capturar se comprueba que el contexto WebGL sigue vivo y que el lienzo tiene tamaño. Si no, no hay JPEG, que con el contexto perdido saldría negro: `console.error`, y se sale de la exportación por el camino de siempre.
7. **El interruptor no lleva CSS nuevo.** Usa `.export-btn` y, activado, `.export-btn--active`, que ya toman sus colores del tema (su texto mide 0,72rem dentro de la vista). Va dentro de `div.brain3d-depth-fade`, que no tiene reglas, para no ser hijo directo de `.brain3d-toolbar` (ver «Rama en paralelo»). Se ve siempre que hay lienzo, también sin selección, para que la barra no cambie de alto al seleccionar (D1b). Si añade una fila a la barra, el lienzo baja: la Task 5 lo mide a tres tamaños de ventana. Las miniaturas no tienen barra, pero siguen la misma preferencia.
8. **La preferencia tiene su propia clave**, `neurograph.cerebro3d.atenuar` (`"true"` o `"false"`), y no va en `neurograph.apariencia`, que es del store de apariencia. Es estado local de `Brain3D`, como la exportación.
9. **Unidades nuevas** que el spec no nombra: `logic/markerSize.ts`, `logic/depthFade.ts`, `logic/depthFadePreference.ts`, `logic/capture3d.ts`, `components/DepthFadeToggle.tsx` y `exportPixelsAsJpeg` en `logic/exportImage.ts`.
10. **`preserveDrawingBuffer: true` se queda**, aunque la exportación ya no lea el lienzo: no se cambia cómo se presenta, y la verificación lo lee.

---

## Chunk 1: marcadores

### Task 1: marcadores a la mitad

**Files:**
- Create: `frontend/src/logic/markerSize.ts`
- Test: `frontend/src/logic/markerSize.test.ts`
- Modify: `frontend/src/components/Brain3D.tsx` (`NodeLabel` y `NodeMesh`)

- [ ] **Step 0: punto de partida**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d && git branch --show-current && git status --short && git log --oneline -3
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npm test 2>&1 | grep -E "^ +Tests " ; npm run lint 2>&1 | grep -oE ": (warning|error) " | sort | uniq -c
```

Expected:
- La rama es `rediseno-3d` y `git status --short` no muestra nada, o solo este plan si todavía no tiene commit. Si muestra otra cosa, es trabajo de otra sesión: no sigas y dilo.
- `Tests  129 passed (129)` y `9 : warning`, sin ninguna línea de `error`.

Guarda el punto de partida: la verificación (Tasks 5 a 7) sirve esa versión aparte, para comparar.

```bash
mkdir -p /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad && git -C /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d rev-parse HEAD > /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/leg3d-base.txt && cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/leg3d-base.txt
```

La BASE es el número de pruebas que ha dado `npm test`: 129 si no ha cambiado nada desde que se escribió el plan. Si es otro, las cuentas del plan siguen valiendo, porque son relativas a ella. Anota también los 9 avisos de lint.

- [ ] **Step 1: escribir la prueba que falla**

`frontend/src/logic/markerSize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { markerSize } from "./markerSize";

// Radios de antes de la Legibilidad del 3D, para comparar.
const OLD_RADIUS = 0.06;
const OLD_SELECTED_RADIUS = 0.09;
const OLD_OUTLINE_SCALE = 1.18;
const OLD_LABEL_OFFSET = 0.24;

describe("markerSize", () => {
  it("el radio base es la mitad del de antes y el de la región seleccionada, un 40 % mayor", () => {
    expect(markerSize(false).radius).toBeCloseTo(OLD_RADIUS / 2, 10);
    expect(markerSize(true).radius / markerSize(false).radius).toBeCloseTo(1.4, 10);
  });

  it("el anillo del contorno de un marcador normal mide lo mismo que antes", () => {
    const { radius, outlineScale } = markerSize(false);
    expect(radius * (outlineScale - 1)).toBeCloseTo(OLD_RADIUS * (OLD_OUTLINE_SCALE - 1), 10);
  });

  it("el anillo de la región seleccionada no es más fino que el de un marcador normal", () => {
    const ring = (s: ReturnType<typeof markerSize>) => s.radius * (s.outlineScale - 1);
    expect(ring(markerSize(true))).toBeGreaterThanOrEqual(ring(markerSize(false)));
  });

  it("la zona de clic es la esfera de antes y envuelve el contorno", () => {
    expect(markerSize(false).hitRadius).toBe(OLD_RADIUS);
    expect(markerSize(true).hitRadius).toBe(OLD_SELECTED_RADIUS);
    for (const selected of [false, true]) {
      const size = markerSize(selected);
      expect(size.hitRadius).toBeGreaterThan(size.radius * size.outlineScale);
    }
  });

  // Antes, la etiqueta iba a 0,24 del centro en los dos: a 0,18 del borde de
  // un marcador normal y a 0,15 del de uno seleccionado. Ahora, a 0,18 en
  // los dos.
  it("la etiqueta queda a 0,18 del borde del marcador, la separación que tenía un marcador normal", () => {
    const gap = OLD_LABEL_OFFSET - OLD_RADIUS;
    for (const selected of [false, true]) {
      const size = markerSize(selected);
      expect(size.labelOffset - size.radius).toBeCloseTo(gap, 10);
    }
  });
});
```

- [ ] **Step 2: comprobar que falla**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npx vitest run src/logic/markerSize.test.ts`
Expected: FAIL, porque no existe `./markerSize`.

- [ ] **Step 3: implementar `frontend/src/logic/markerSize.ts`**

```ts
// Tamaño de los marcadores de región del cerebro 3D (Legibilidad del 3D;
// docs/rediseno-interfaz-diseno.md, 6.3). El radio base baja a la mitad, de
// 0,06 a 0,03, para que el marcador no tape la región pintada, y el de una
// región seleccionada es un 40 % mayor. Lo que dependía del radio se decide
// aquí, en un solo sitio:
// - El contorno neutro (decisión 18) es la misma esfera, detrás y a otra
//   escala. Con 1,36, el anillo de un marcador normal mide 0,0108, lo mismo
//   que medía con el radio y la escala de antes (0,06 × 0,18): sigue
//   viéndose alrededor de los nodos #000000.
// - La zona de clic es la esfera de antes (0,06 y 0,09), invisible: el
//   marcador encoge, pero seleccionarlo con un clic no cuesta más.
// - La etiqueta queda a 0,18 del borde del marcador, como antes en un
//   marcador normal (0,24 desde el centro con el radio de 0,06). En la
//   región seleccionada quedaba a 0,15 (radio 0,09), y ahora también a 0,18.

export const MARKER_RADIUS = 0.03;
export const SELECTED_MARKER_SCALE = 1.4;
export const MARKER_OUTLINE_SCALE = 1.36;
export const LABEL_GAP = 0.18;
const HIT_RADIUS = 0.06;
const SELECTED_HIT_RADIUS = 0.09;

export interface MarkerSize {
  radius: number;
  outlineScale: number;
  hitRadius: number;
  labelOffset: number;
}

export function markerSize(isSelected: boolean): MarkerSize {
  const radius = isSelected ? MARKER_RADIUS * SELECTED_MARKER_SCALE : MARKER_RADIUS;
  return {
    radius,
    outlineScale: MARKER_OUTLINE_SCALE,
    hitRadius: isSelected ? SELECTED_HIT_RADIUS : HIT_RADIUS,
    labelOffset: radius + LABEL_GAP,
  };
}
```

- [ ] **Step 4: comprobar que pasa**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npx vitest run src/logic/markerSize.test.ts`
Expected: PASS, 5 pruebas.

- [ ] **Step 5: los marcadores en `frontend/src/components/Brain3D.tsx`**

Siete sustituciones.

**1. La importación.**

Busca:

```tsx
import { getLabelTexture } from "../logic/textSprite";
```

Sustitúyelo por:

```tsx
import { getLabelTexture } from "../logic/textSprite";
import { markerSize } from "../logic/markerSize";
```

**2. `NodeLabel` recibe la separación.**

Busca:

```tsx
function NodeLabel({ node, overlay = false }: { node: GraphNode; overlay?: boolean }) {
```

Sustitúyelo por:

```tsx
function NodeLabel({ node, offset, overlay = false }: { node: GraphNode; offset: number; overlay?: boolean }) {
```

**3. La posición de la etiqueta.** El comentario del desarrollador principal se queda; se añade el nuestro.

Busca:

```tsx
  // vez de que la etiqueta arranque casi pegada al borde superior.
  const position: [number, number, number] = [
    node.position3d[0],
    node.position3d[1] + 0.24,
    node.position3d[2],
  ];
```

Sustitúyelo por:

```tsx
  // vez de que la etiqueta arranque casi pegada al borde superior.
  // Legibilidad del 3D: el marcador es más pequeño y la separación
  // (`offset`, de logic/markerSize.ts) se mide desde su borde: 0,18, la
  // que dejaba 0.24 con el radio normal de antes.
  const position: [number, number, number] = [
    node.position3d[0],
    node.position3d[1] + offset,
    node.position3d[2],
  ];
```

**4. El radio, en `NodeMesh`.**

Busca:

```tsx
  // visualmente la esfera de su etiqueta (ver NodeLabel).
  const baseRadius = isSelected ? 0.09 : 0.06;
```

Sustitúyelo por:

```tsx
  // visualmente la esfera de su etiqueta (ver NodeLabel).
  // Legibilidad del 3D (spec 6.3): otra vez a la mitad, 0,03, para no tapar
  // la región pintada, con la región seleccionada un 40 % mayor. El
  // contorno, la zona de clic y la etiqueta se ajustan con el radio
  // (logic/markerSize.ts).
  const size = markerSize(isSelected);
```

**5. El contorno.**

Busca:

```tsx
      <mesh position={node.position3d} scale={1.18} renderOrder={overlay ? 2 : 0} {...overlayNoRaycast(overlay)}>
        <sphereGeometry args={[baseRadius, 14, 14]} />
```

Sustitúyelo por:

```tsx
      <mesh position={node.position3d} scale={size.outlineScale} renderOrder={overlay ? 2 : 0} {...overlayNoRaycast(overlay)}>
        <sphereGeometry args={[size.radius, 14, 14]} />
```

**6. El relleno ya no recibe el clic.** Con la corteza pintada no lo recibía; sin ella, ahora lo recibe la zona de clic (sustitución 7).

Busca:

```tsx
      <mesh
        position={node.position3d}
        renderOrder={overlay ? 2 : 0}
        {...(overlay ? overlayNoRaycast(true) : { onClick: () => toggleNode(node.id) })}
      >
        {/* 14x14 en vez de 24x24: con cientos de regiones reales, cada
            segmento de más cuesta 360 veces más caro que en la demo de 8
            nodos. Sigue viéndose redondo a esta escala. */}
        <sphereGeometry args={[baseRadius, 14, 14]} />
```

Sustitúyelo por:

```tsx
      <mesh position={node.position3d} renderOrder={overlay ? 2 : 0} {...overlayNoRaycast(overlay)}>
        {/* 14x14 en vez de 24x24: con cientos de regiones reales, cada
            segmento de más cuesta 360 veces más caro que en la demo de 8
            nodos. Sigue viéndose redondo a esta escala. */}
        <sphereGeometry args={[size.radius, 14, 14]} />
```

**7. La zona de clic y la etiqueta.**

Busca:

```tsx
      </mesh>
      <NodeLabel node={node} overlay={overlay} />
```

Sustitúyelo por:

```tsx
      </mesh>
      {/* Zona de clic (Legibilidad del 3D): la esfera de antes, invisible.
          three.js no dibuja un material con visible={false}, pero el
          raycast de react-three-fiber sí la encuentra: el marcador encogió,
          y seleccionarlo con un clic cuesta lo mismo que antes. Con la
          corteza pintada no hay, como antes: se selecciona pulsando la
          propia región. */}
      {!overlay && (
        <mesh position={node.position3d} onClick={() => toggleNode(node.id)}>
          <sphereGeometry args={[size.hitRadius, 14, 14]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
      <NodeLabel node={node} offset={size.labelOffset} overlay={overlay} />
```

Comprueba que no queda el radio de antes en el código. El patrón busca código, no palabras: el comentario del desarrollador principal en `NodeLabel`, que habla de `baseRadius`, se queda.

```bash
grep -n "const baseRadius\|\[baseRadius, 14, 14\]\|scale={1.18}\|+ 0.24," /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend/src/components/Brain3D.tsx
```

Expected: sin resultados. Antes de esta tarea, la misma orden da 5 líneas.

- [ ] **Step 6: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npm test && npx tsc -b && npm run lint && npm run build
```

Expected: BASE + 5 pruebas en verde (134 con una BASE de 129); `tsc` limpio; lint sin errores y con los mismos 9 avisos; `✓ built`.

- [ ] **Step 7: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d && git add frontend/src/logic/markerSize.ts frontend/src/logic/markerSize.test.ts frontend/src/components/Brain3D.tsx
git commit -m "Legibilidad 3D: marcadores a la mitad, con el contorno, la zona de clic y la etiqueta ajustados

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 2: lógica de la atenuación

### Task 2: lógica de la atenuación por profundidad y su preferencia

**Files:**
- Create: `frontend/src/logic/depthFade.ts`, `frontend/src/logic/depthFadePreference.ts`
- Test: `frontend/src/logic/depthFade.test.ts`, `frontend/src/logic/depthFadePreference.test.ts`

Solo lógica, sin interfaz: la app no cambia hasta la Task 3. `depthFade.ts` importa three.js, que funciona en node para lo que se usa aquí (matemáticas y `ShaderLib`, sin WebGL).

- [ ] **Step 1: escribir las pruebas de `depthFade` que fallan**

`frontend/src/logic/depthFade.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  DEPTH_FADE_MIN,
  DEPTH_FADE_PROGRAM_KEY,
  NO_DEPTH_FADE,
  createDepthFade,
  depthBounds,
  depthExtent,
  depthFadeFactor,
  depthFadeRange,
  fadeKey,
  fadeMaterialProps,
  patchDepthFadeShader,
  tuplePoints,
  updateDepthFadeUniforms,
  type CompilingShader,
  type DepthFadeUniforms,
} from "./depthFade";

describe("depthFadeFactor", () => {
  const range = { near: 4, far: 8, fadeMin: 0.2 };

  it("hasta near se ve entero y desde far queda en fadeMin", () => {
    expect(depthFadeFactor(1, range)).toBe(1);
    expect(depthFadeFactor(4, range)).toBe(1);
    expect(depthFadeFactor(8, range)).toBeCloseTo(0.2, 10);
    expect(depthFadeFactor(20, range)).toBeCloseTo(0.2, 10);
  });

  it("a mitad del tramo, a mitad de camino (smoothstep(0,5) = 0,5)", () => {
    expect(depthFadeFactor(6, range)).toBeCloseTo(0.6, 10);
  });

  it("baja sin saltos: nunca sube al alejarse", () => {
    let previous = Infinity;
    for (let depth = 0; depth <= 10; depth += 0.25) {
      const factor = depthFadeFactor(depth, range);
      expect(factor).toBeLessThanOrEqual(previous);
      previous = factor;
    }
  });

  it("sin atenuación da exactamente 1 a cualquier profundidad", () => {
    for (const depth of [-3, 0, 0.3, 1, 7, 1e6]) expect(depthFadeFactor(depth, NO_DEPTH_FADE)).toBe(1);
  });
});

describe("depthFadeRange", () => {
  it("empieza 0,2 de la semiprofundidad por delante del centro y acaba en la cara más lejana", () => {
    const range = depthFadeRange(6, 2);
    expect(range.near).toBeCloseTo(5.6, 10);
    expect(range.far).toBeCloseTo(8, 10);
    expect(range.fadeMin).toBe(DEPTH_FADE_MIN);
  });

  it("la cara cercana del cerebro se ve entera y la más lejana queda en el mínimo", () => {
    const range = depthFadeRange(6, 2);
    expect(depthFadeFactor(6 - 2, range)).toBe(1);
    expect(depthFadeFactor(6 + 2, range)).toBeCloseTo(DEPTH_FADE_MIN, 10);
  });

  it("el mínimo queda entre 0,15 y 0,2, como pide el spec", () => {
    expect(DEPTH_FADE_MIN).toBeGreaterThanOrEqual(0.15);
    expect(DEPTH_FADE_MIN).toBeLessThanOrEqual(0.2);
  });

  it("con una semiprofundidad o una distancia que no sirven, sin atenuación", () => {
    expect(depthFadeRange(6, 0)).toEqual(NO_DEPTH_FADE);
    expect(depthFadeRange(6, -1)).toEqual(NO_DEPTH_FADE);
    expect(depthFadeRange(Number.NaN, 2)).toEqual(NO_DEPTH_FADE);
    expect(depthFadeRange(6, Number.POSITIVE_INFINITY)).toEqual(NO_DEPTH_FADE);
  });
});

describe("depthBounds", () => {
  const points: [number, number, number][] = [
    [-1, -2, -3],
    [1, 2, 3],
    [0, 1, -1],
    [10, 10, 10],
  ];

  it("centro y mitad del tamaño de la caja de los puntos", () => {
    expect(depthBounds(tuplePoints(points), 0, 3)).toEqual({ center: [0, 0, 0], halfSize: [1, 2, 3] });
  });

  it("solo cuenta los puntos del tramo y aplica la escala", () => {
    expect(depthBounds(tuplePoints(points), 2, 4, 0.5)).toEqual({ center: [2.5, 2.75, 2.25], halfSize: [2.5, 2.25, 2.75] });
  });

  it("sirve un BufferAttribute de three.js tal cual", () => {
    const attribute = new THREE.Float32BufferAttribute(points.slice(0, 3).flat(), 3);
    expect(depthBounds(attribute, 0, attribute.count)?.halfSize).toEqual([1, 2, 3]);
  });

  it("null sin puntos o con alguno que no es finito", () => {
    expect(depthBounds(tuplePoints(points), 2, 2)).toBeNull();
    expect(depthBounds(tuplePoints([[0, Number.NaN, 0]]), 0, 1)).toBeNull();
  });
});

describe("depthExtent", () => {
  const halfSize: [number, number, number] = [1.7, 2.2, 1.5];

  it("mirando a lo largo de un eje, la mitad del cerebro en ese eje", () => {
    expect(depthExtent(halfSize, [1, 0, 0])).toBeCloseTo(1.7, 10);
    expect(depthExtent(halfSize, [0, -1, 0])).toBeCloseTo(2.2, 10);
    expect(depthExtent(halfSize, [0, 0, 1])).toBeCloseTo(1.5, 10);
  });

  it("en diagonal, la del elipsoide: entre el eje más corto y el más largo", () => {
    const d = Math.SQRT1_2;
    expect(depthExtent(halfSize, [d, d, 0])).toBeCloseTo(Math.sqrt((1.7 ** 2 + 2.2 ** 2) / 2), 10);
  });
});

describe("patchDepthFadeShader", () => {
  // Las cuatro familias de shaders de los materiales de la capa de foco.
  const families = {
    "LineBasicMaterial y MeshBasicMaterial": THREE.ShaderLib.basic,
    LineDashedMaterial: THREE.ShaderLib.dashed,
    MeshStandardMaterial: THREE.ShaderLib.physical,
    SpriteMaterial: THREE.ShaderLib.sprite,
  };

  for (const [name, shader] of Object.entries(families)) {
    it(`se aplica a ${name} de esta versión de three.js`, () => {
      const patch = patchDepthFadeShader(shader.vertexShader, shader.fragmentShader);
      if (!patch.ok) throw new Error(`faltan ${patch.missing.join(", ")}`);
      expect(patch.vertexShader).toContain("#include <common>\nvarying float ngViewDepth;");
      expect(patch.vertexShader).toContain("#include <fog_vertex>\n\tngViewDepth = - mvPosition.z;");
      expect(patch.fragmentShader).toContain(
        "#include <common>\nvarying float ngViewDepth;\nuniform float ngFadeNear;\nuniform float ngFadeFar;\nuniform float ngFadeMin;",
      );
      expect(patch.fragmentShader).toContain(
        "#include <opaque_fragment>\n\tgl_FragColor.a *= 1.0 - ( 1.0 - ngFadeMin ) * smoothstep( ngFadeNear, ngFadeFar, ngViewDepth );",
      );
    });
  }

  // Sin WebGL no se puede compilar, pero sí desplegar los #include como
  // hace three.js y mirar el orden: mvPosition existe antes de usarse, el
  // varying y los uniforms se declaran una vez, y el alfa se toca después de
  // escribir gl_FragColor.
  const expand = (source: string): string =>
    source.replace(/^[ \t]*#include +<([\w\d./]+)>/gm, (_, name: string) =>
      expand(THREE.ShaderChunk[name as keyof typeof THREE.ShaderChunk]),
    );

  for (const [name, shader] of Object.entries(families)) {
    it(`en ${name}, con los #include desplegados, cada cosa está donde debe`, () => {
      const patch = patchDepthFadeShader(shader.vertexShader, shader.fragmentShader);
      if (!patch.ok) throw new Error(`faltan ${patch.missing.join(", ")}`);
      const vertex = expand(patch.vertexShader);
      const fragment = expand(patch.fragmentShader);
      const main = (source: string) => source.indexOf("void main()");
      expect(vertex.split("varying float ngViewDepth;")).toHaveLength(2);
      expect(vertex.indexOf("varying float ngViewDepth;")).toBeLessThan(main(vertex));
      expect(vertex.indexOf("vec4 mvPosition")).toBeGreaterThan(main(vertex));
      expect(vertex.indexOf("vec4 mvPosition")).toBeLessThan(vertex.indexOf("ngViewDepth = - mvPosition.z;"));
      for (const declaration of [
        "varying float ngViewDepth;",
        "uniform float ngFadeNear;",
        "uniform float ngFadeFar;",
        "uniform float ngFadeMin;",
      ]) {
        expect(fragment.split(declaration)).toHaveLength(2);
        expect(fragment.indexOf(declaration)).toBeLessThan(main(fragment));
      }
      expect(fragment.indexOf("gl_FragColor = vec4(")).toBeLessThan(fragment.indexOf("gl_FragColor.a *="));
    });
  }

  it("el alfa se atenúa antes de premultiplicarse", () => {
    const shader = THREE.ShaderLib.basic;
    const patch = patchDepthFadeShader(shader.vertexShader, shader.fragmentShader);
    if (!patch.ok) throw new Error("no se aplicó");
    expect(patch.fragmentShader.indexOf("gl_FragColor.a *=")).toBeLessThan(
      patch.fragmentShader.indexOf("#include <premultiplied_alpha_fragment>"),
    );
  });

  it("si falta un trozo, no toca nada y dice cuál falta", () => {
    const shader = THREE.ShaderLib.basic;
    const vertex = shader.vertexShader.replace("#include <fog_vertex>", "");
    expect(patchDepthFadeShader(vertex, shader.fragmentShader)).toEqual({
      ok: false,
      missing: ["#include <fog_vertex> (vértices)"],
    });
    expect(patchDepthFadeShader("void main() {}", "void main() {}")).toEqual({
      ok: false,
      missing: [
        "#include <common> (vértices)",
        "#include <fog_vertex> (vértices)",
        "#include <common> (fragmentos)",
        "#include <opaque_fragment> (fragmentos)",
      ],
    });
  });

  it("si un trozo aparece dos veces, tampoco toca nada", () => {
    const shader = THREE.ShaderLib.basic;
    const fragment = `${shader.fragmentShader}\n#include <opaque_fragment>`;
    expect(patchDepthFadeShader(shader.vertexShader, fragment)).toEqual({
      ok: false,
      missing: ["#include <opaque_fragment> (fragmentos)"],
    });
  });
});

describe("createDepthFade", () => {
  const compiling = (vertexShader: string, fragmentShader: string): CompilingShader => ({
    vertexShader,
    fragmentShader,
    uniforms: { diffuse: { value: 1 } },
  });

  it("parchea el shader y le da los uniforms compartidos, los mismos objetos", () => {
    const fade = createDepthFade();
    const shader = compiling(THREE.ShaderLib.sprite.vertexShader, THREE.ShaderLib.sprite.fragmentShader);
    fade.onBeforeCompile(shader);
    expect(shader.vertexShader).toContain("ngViewDepth = - mvPosition.z;");
    expect(shader.uniforms.ngFadeNear).toBe(fade.uniforms.ngFadeNear);
    expect(shader.uniforms.ngFadeFar).toBe(fade.uniforms.ngFadeFar);
    expect(shader.uniforms.ngFadeMin).toBe(fade.uniforms.ngFadeMin);
    expect(shader.uniforms.diffuse).toEqual({ value: 1 });
    expect(fade.customProgramCacheKey()).toBe(DEPTH_FADE_PROGRAM_KEY);
  });

  it("empieza sin atenuación", () => {
    const { uniforms } = createDepthFade();
    expect([uniforms.ngFadeNear.value, uniforms.ngFadeFar.value, uniforms.ngFadeMin.value]).toEqual([
      NO_DEPTH_FADE.near,
      NO_DEPTH_FADE.far,
      NO_DEPTH_FADE.fadeMin,
    ]);
  });

  it("con un shader sin los trozos, lo deja igual, sin uniforms, y avisa", () => {
    const onMissing = vi.fn();
    const shader = compiling("void main() {}", "void main() {}");
    createDepthFade(onMissing).onBeforeCompile(shader);
    expect(shader).toEqual(compiling("void main() {}", "void main() {}"));
    expect(onMissing).toHaveBeenCalledOnce();
  });

  it("por defecto, el aviso sale en la consola (en desarrollo) una sola vez", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fade = createDepthFade();
    fade.onBeforeCompile(compiling("void main() {}", "void main() {}"));
    fade.onBeforeCompile(compiling("void main() {}", "void main() {}"));
    // vitest corre en modo de desarrollo (import.meta.env.DEV).
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

describe("fadeMaterialProps", () => {
  it("sin atenuación no añade nada: el material es el de siempre", () => {
    expect(fadeMaterialProps(null, false)).toEqual({});
    expect(fadeMaterialProps(null, true)).toEqual({});
  });

  it("con atenuación, el parche compartido; transparent solo en lo que era opaco", () => {
    const fade = createDepthFade();
    const patch = { onBeforeCompile: fade.onBeforeCompile, customProgramCacheKey: fade.customProgramCacheKey };
    expect(fadeMaterialProps(fade, false)).toEqual(patch);
    expect(fadeMaterialProps(fade, true)).toEqual({ ...patch, transparent: true });
  });

  it("son propiedades de los materiales de three.js: el programa lleva la clave de la atenuación", () => {
    const fade = createDepthFade();
    const material = new THREE.MeshBasicMaterial();
    Object.assign(material, fadeMaterialProps(fade, true));
    expect(material.transparent).toBe(true);
    expect(material.onBeforeCompile).toBe(fade.onBeforeCompile);
    expect(material.customProgramCacheKey()).toBe(DEPTH_FADE_PROGRAM_KEY);
  });
});

describe("fadeKey", () => {
  it("cambia al activar o desactivar la atenuación, y solo entonces", () => {
    expect(fadeKey(createDepthFade())).not.toBe(fadeKey(null));
    expect(fadeKey(createDepthFade())).toBe(fadeKey(createDepthFade()));
  });
});

describe("updateDepthFadeUniforms", () => {
  function cameraAt(x: number, y: number, z: number): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.up.set(0, 0, 1);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    return camera;
  }
  const brain = { center: [0, 0, 0] as [number, number, number], halfSize: [1.7, 2.2, 1.5] as [number, number, number] };

  it("en la vista lateral del principio (cámara en +X), el tramo sigue el ancho del cerebro", () => {
    const { uniforms } = createDepthFade();
    updateDepthFadeUniforms(uniforms, cameraAt(6, 0, 0), brain);
    expect(uniforms.ngFadeNear.value).toBeCloseTo(6 - 0.2 * 1.7, 6);
    expect(uniforms.ngFadeFar.value).toBeCloseTo(6 + 1.7, 6);
    expect(uniforms.ngFadeMin.value).toBe(DEPTH_FADE_MIN);
  });

  it("desde delante, sigue el largo; y mide la profundidad del centro de la caja", () => {
    const { uniforms } = createDepthFade();
    updateDepthFadeUniforms(uniforms, cameraAt(0, -6, 0), { ...brain, center: [0, -3, 0] });
    expect(uniforms.ngFadeNear.value).toBeCloseTo(3 - 0.2 * 2.2, 6);
    expect(uniforms.ngFadeFar.value).toBeCloseTo(3 + 2.2, 6);
  });

  it("sin caja, sin atenuación", () => {
    const { uniforms } = createDepthFade();
    updateDepthFadeUniforms(uniforms, cameraAt(6, 0, 0), brain);
    updateDepthFadeUniforms(uniforms, cameraAt(6, 0, 0), null);
    expect(uniforms.ngFadeMin.value).toBe(1);
  });

  // Casos límite: el tramo tiene que servir siempre, cerca antes que lejos y
  // sin NaN. En GLSL, smoothstep no está definido si el primer borde no es
  // menor que el segundo.
  function expectUsableRange(uniforms: DepthFadeUniforms) {
    for (const uniform of [uniforms.ngFadeNear, uniforms.ngFadeFar, uniforms.ngFadeMin]) {
      expect(Number.isNaN(uniform.value)).toBe(false);
    }
    expect(uniforms.ngFadeNear.value).toBeLessThan(uniforms.ngFadeFar.value);
  }

  it("con la cámara dentro de la caja (acercada con la rueda), un tramo que sirve", () => {
    const { uniforms } = createDepthFade();
    updateDepthFadeUniforms(uniforms, cameraAt(0.5, 0, 0), brain);
    expectUsableRange(uniforms);
    expect(uniforms.ngFadeNear.value).toBeCloseTo(0.5 - 0.2 * 1.7, 6);
    expect(uniforms.ngFadeFar.value).toBeCloseTo(0.5 + 1.7, 6);
  });

  it("con el centro de la caja detrás de la cámara, también", () => {
    const { uniforms } = createDepthFade();
    updateDepthFadeUniforms(uniforms, cameraAt(6, 0, 0), { ...brain, center: [8, 0, 0] });
    expectUsableRange(uniforms);
    expect(uniforms.ngFadeNear.value).toBeCloseTo(-2 - 0.2 * 1.7, 6);
    expect(uniforms.ngFadeFar.value).toBeCloseTo(-2 + 1.7, 6);
  });

  it("con una caja de tamaño cero (un solo nodo), sin atenuación y sin NaN", () => {
    const { uniforms } = createDepthFade();
    updateDepthFadeUniforms(uniforms, cameraAt(6, 0, 0), { center: [0.3, 0.1, 0.2], halfSize: [0, 0, 0] });
    expectUsableRange(uniforms);
    expect(uniforms.ngFadeMin.value).toBe(1);
  });
});
```

- [ ] **Step 2: comprobar que fallan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npx vitest run src/logic/depthFade.test.ts`
Expected: FAIL, porque no existe `./depthFade`.

- [ ] **Step 3: implementar `frontend/src/logic/depthFade.ts`**

```ts
// Atenuación por profundidad del cerebro 3D, «Atenuar lo que queda detrás»
// (Legibilidad del 3D; docs/rediseno-interfaz-diseno.md, 6.3). Con la
// corteza pintada, los marcadores, las líneas y las etiquetas de la
// selección se dibujan sin prueba de profundidad, así que lo que está en la
// cara interna o en el otro hemisferio parece flotar delante. Con la
// atenuación, cada fragmento de esos objetos pierde opacidad cuanto más lejos
// de la cámara queda dentro del cerebro: una línea larga se desvanece a lo
// largo de su recorrido. No se usa la oclusión estricta: las líneas van en
// recta entre dos puntos de la corteza, pasan por dentro y quedarían casi
// todas tapadas.
//
// Aquí está lo que se puede probar sin WebGL: el factor (el mismo cálculo que
// hace el shader), el tramo de profundidad, el tamaño del cerebro, el parche
// del código de los shaders, los uniforms que comparten los materiales, y
// las props y la clave de React de esos materiales. Brain3D.tsx lo conecta
// a la escena.
import * as THREE from "three";

// Opacidad que conserva lo más lejano (el spec pide entre 0,15 y 0,2).
export const DEPTH_FADE_MIN = 0.2;
// El tramo se mide con la semiprofundidad del cerebro en la dirección de la
// vista (depthExtent): empieza 0,2 de ella por delante del centro (hasta ahí,
// todo se ve entero) y acaba en la cara más lejana del cerebro (desde ahí,
// DEPTH_FADE_MIN).
export const DEPTH_FADE_NEAR = -0.2;
export const DEPTH_FADE_FAR = 1;

export interface DepthFadeRange {
  near: number;
  far: number;
  fadeMin: number;
}

// Sin atenuación: el factor vale exactamente 1 a cualquier profundidad.
export const NO_DEPTH_FADE: Readonly<DepthFadeRange> = { near: 0, far: 1, fadeMin: 1 };

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Factor por el que se multiplica la opacidad a una profundidad (la distancia
 * a la cámara a lo largo de su eje). Es la fórmula del shader:
 * 1 − (1 − fadeMin) · smoothstep(near, far, profundidad). Equivale a
 * mix(1, fadeMin, smoothstep(…)), pero con fadeMin = 1 da exactamente 1.
 */
export function depthFadeFactor(depth: number, range: DepthFadeRange): number {
  return 1 - (1 - range.fadeMin) * smoothstep(range.near, range.far, depth);
}

/**
 * Tramo de la atenuación para un cerebro cuyo centro está a `centerDepth` de
 * la cámara y que mide `extent` de su centro a su cara más lejana en la
 * dirección de la vista. Con valores que no sirven, sin atenuación.
 */
export function depthFadeRange(centerDepth: number, extent: number): DepthFadeRange {
  if (!Number.isFinite(centerDepth) || !Number.isFinite(extent) || extent <= 0) return NO_DEPTH_FADE;
  return {
    near: centerDepth + DEPTH_FADE_NEAR * extent,
    far: centerDepth + DEPTH_FADE_FAR * extent,
    fadeMin: DEPTH_FADE_MIN,
  };
}

// --- Tamaño del cerebro ---
//
// La caja del cerebro que se ve, en coordenadas de la escena. El tramo se
// mide con el elipsoide inscrito en ella y no con una esfera: el cerebro es
// más largo que ancho, y con la esfera, en la vista lateral del principio, la
// cara externa del otro hemisferio quedaría a poco más de medio radio del
// centro y apenas se atenuaría.

export interface DepthBounds {
  center: [number, number, number];
  halfSize: [number, number, number];
}

// Lo que se necesita de una lista de puntos. Un BufferAttribute de three.js
// lo cumple tal cual.
export interface PointList {
  getX(index: number): number;
  getY(index: number): number;
  getZ(index: number): number;
}

/** Los puntos de una lista de tripletes, como `position3d` de los nodos. */
export function tuplePoints(points: readonly (readonly [number, number, number])[]): PointList {
  return {
    getX: (index) => points[index][0],
    getY: (index) => points[index][1],
    getZ: (index) => points[index][2],
  };
}

/**
 * Caja de los puntos [start, end), multiplicados por `scale`: su centro y la
 * mitad de su tamaño en cada eje. null si no hay puntos o alguno no es
 * finito.
 */
export function depthBounds(points: PointList, start: number, end: number, scale = 1): DepthBounds | null {
  if (!(end > start)) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = start; i < end; i++) {
    const p = [points.getX(i), points.getY(i), points.getZ(i)];
    for (let axis = 0; axis < 3; axis++) {
      if (!Number.isFinite(p[axis])) return null;
      min[axis] = Math.min(min[axis], p[axis]);
      max[axis] = Math.max(max[axis], p[axis]);
    }
  }
  const center = [0, 1, 2].map((axis) => ((min[axis] + max[axis]) / 2) * scale);
  const halfSize = [0, 1, 2].map((axis) => ((max[axis] - min[axis]) / 2) * scale);
  return { center: [center[0], center[1], center[2]], halfSize: [halfSize[0], halfSize[1], halfSize[2]] };
}

/**
 * Distancia del centro a la cara más lejana del elipsoide de semiejes
 * `halfSize` en la dirección `direction` (vector unitario):
 * √((hx·dx)² + (hy·dy)² + (hz·dz)²).
 */
export function depthExtent(
  halfSize: readonly [number, number, number],
  direction: readonly [number, number, number],
): number {
  return Math.hypot(halfSize[0] * direction[0], halfSize[1] * direction[1], halfSize[2] * direction[2]);
}

// --- Parche de los shaders ---
//
// Los materiales de la capa de foco son de cuatro familias de three.js:
// LineBasicMaterial y MeshBasicMaterial (shader «basic»), LineDashedMaterial
// («dashed»), MeshStandardMaterial («physical») y SpriteMaterial
// («sprite»). Las cuatro traen, una sola vez, los trozos que sirven de ancla.
// En el shader de vértices, tras <fog_vertex> ya existe mvPosition, la
// posición en el espacio de la cámara. En el de fragmentos, tras
// <opaque_fragment> ya está gl_FragColor y el alfa todavía no se ha
// premultiplicado.

const COMMON = "#include <common>";
const FOG_VERTEX = "#include <fog_vertex>";
const OPAQUE_FRAGMENT = "#include <opaque_fragment>";

export type DepthFadePatch =
  | { ok: true; vertexShader: string; fragmentShader: string }
  | { ok: false; missing: string[] };

function occurrences(source: string, chunk: string): number {
  return source.split(chunk).length - 1;
}

// Añade `code` tras la única aparición de `chunk`. Con una función de
// reemplazo, para que un `$` del código no se interprete.
function insertAfter(source: string, chunk: string, code: string): string {
  return source.replace(chunk, () => `${chunk}\n${code}`);
}

/**
 * Añade la atenuación al código de un material de three.js. Todo o nada: si
 * falta alguno de los cuatro trozos, o aparece más de una vez, devuelve
 * `ok: false` con la lista, y el material se queda como estaba. Así, una
 * versión de three.js que cambie esos trozos deja la vista de siempre, nunca
 * un shader roto.
 */
export function patchDepthFadeShader(vertexShader: string, fragmentShader: string): DepthFadePatch {
  const anchors: [string, string, string][] = [
    ["vértices", vertexShader, COMMON],
    ["vértices", vertexShader, FOG_VERTEX],
    ["fragmentos", fragmentShader, COMMON],
    ["fragmentos", fragmentShader, OPAQUE_FRAGMENT],
  ];
  const missing = anchors
    .filter(([, source, chunk]) => occurrences(source, chunk) !== 1)
    .map(([stage, , chunk]) => `${chunk} (${stage})`);
  if (missing.length > 0) return { ok: false, missing };
  const vertex = insertAfter(vertexShader, COMMON, "varying float ngViewDepth;");
  const fragment = insertAfter(
    fragmentShader,
    COMMON,
    "varying float ngViewDepth;\nuniform float ngFadeNear;\nuniform float ngFadeFar;\nuniform float ngFadeMin;",
  );
  return {
    ok: true,
    vertexShader: insertAfter(vertex, FOG_VERTEX, "\tngViewDepth = - mvPosition.z;"),
    fragmentShader: insertAfter(
      fragment,
      OPAQUE_FRAGMENT,
      "\tgl_FragColor.a *= 1.0 - ( 1.0 - ngFadeMin ) * smoothstep( ngFadeNear, ngFadeFar, ngViewDepth );",
    ),
  };
}

// --- Uniforms compartidos y enganche a los materiales ---

export interface DepthFadeUniforms {
  ngFadeNear: { value: number };
  ngFadeFar: { value: number };
  ngFadeMin: { value: number };
}

// Lo que three.js pasa a onBeforeCompile y aquí se usa.
export interface CompilingShader {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
}

export interface DepthFade {
  // Los mismos objetos en todos los materiales: al cambiar su valor cambian
  // todos a la vez, sin volver a compilar.
  uniforms: DepthFadeUniforms;
  onBeforeCompile: (shader: CompilingShader) => void;
  // Clave del programa compilado de three.js: separa el parcheado del de
  // siempre.
  customProgramCacheKey: () => string;
}

export const DEPTH_FADE_PROGRAM_KEY = "neurograph-atenuacion-profundidad-v1";

const warnedMissing = new Set<string>();

// En desarrollo, un aviso por cada combinación de trozos que falten, no uno
// por material: la capa de foco puede tener cientos.
function warnMissingInDev(missing: string[]): void {
  const key = missing.join(", ");
  if (!import.meta.env.DEV || warnedMissing.has(key)) return;
  warnedMissing.add(key);
  // eslint-disable-next-line no-console
  console.warn(`Atenuación por profundidad: falta ${key} en el shader; ese material se dibuja sin atenuar.`);
}

/** Uniforms y enganche para los materiales de un lienzo. */
export function createDepthFade(onMissing: (missing: string[]) => void = warnMissingInDev): DepthFade {
  const uniforms: DepthFadeUniforms = {
    ngFadeNear: { value: NO_DEPTH_FADE.near },
    ngFadeFar: { value: NO_DEPTH_FADE.far },
    ngFadeMin: { value: NO_DEPTH_FADE.fadeMin },
  };
  return {
    uniforms,
    onBeforeCompile: (shader) => {
      const patch = patchDepthFadeShader(shader.vertexShader, shader.fragmentShader);
      if (!patch.ok) {
        onMissing(patch.missing);
        return;
      }
      shader.vertexShader = patch.vertexShader;
      shader.fragmentShader = patch.fragmentShader;
      Object.assign(shader.uniforms, uniforms);
    },
    customProgramCacheKey: () => DEPTH_FADE_PROGRAM_KEY,
  };
}

/**
 * Props que la atenuación añade a un material de la capa de foco: el parche
 * del shader y, en los marcadores y los conos, que hasta ahora eran opacos,
 * `transparent`. Así se pueden atenuar, y three.js los dibuja con las
 * líneas, de atrás adelante; los renderOrder no cambian. Sin atenuación
 * (null) no añade nada: el material es el de siempre.
 */
export function fadeMaterialProps(fade: DepthFade | null, opaque: boolean) {
  if (!fade) return {};
  return {
    onBeforeCompile: fade.onBeforeCompile,
    customProgramCacheKey: fade.customProgramCacheKey,
    ...(opaque ? { transparent: true } : {}),
  };
}

/**
 * Clave de React de cada material de la capa de foco. Cambia con el
 * interruptor, así que al alternar React crea materiales nuevos en vez de
 * cambiar las props de los que ya hay. Es imprescindible: al desactivar,
 * las props de fadeMaterialProps desaparecen, y react-three-fiber 9.7 no
 * deja sin tocar una prop que desaparece. Su applyProps se salta los
 * undefined, pero su diffProps repone las props quitadas y, en un material,
 * cuyo constructor recibe parámetros, las pone a 0. customProgramCacheKey
 * valdría 0, y three.js falla en cuanto vuelve a preparar el programa del
 * material, porque WebGLPrograms.getParameters la llama. Además, three.js
 * no vuelve a compilar por su cuenta el shader de un material que ya existe.
 */
export function fadeKey(fade: DepthFade | null): string {
  return fade ? "atenuado" : "normal";
}

const viewCenter = new THREE.Vector3();
const viewDirection = new THREE.Vector3();

/**
 * Pone en los uniforms el tramo de la atenuación para esta cámara y la caja
 * del cerebro que se ve. Sin caja, sin atenuación. Se llama en cada
 * fotograma, antes de dibujar.
 */
export function updateDepthFadeUniforms(
  uniforms: DepthFadeUniforms,
  camera: THREE.Camera,
  bounds: DepthBounds | null,
): void {
  let range: DepthFadeRange = NO_DEPTH_FADE;
  if (bounds) {
    camera.updateMatrixWorld();
    viewCenter.set(...bounds.center).applyMatrix4(camera.matrixWorldInverse);
    camera.getWorldDirection(viewDirection);
    const extent = depthExtent(bounds.halfSize, [viewDirection.x, viewDirection.y, viewDirection.z]);
    range = depthFadeRange(-viewCenter.z, extent);
  }
  uniforms.ngFadeNear.value = range.near;
  uniforms.ngFadeFar.value = range.far;
  uniforms.ngFadeMin.value = range.fadeMin;
}
```

- [ ] **Step 4: comprobar que pasan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npx vitest run src/logic/depthFade.test.ts`
Expected: PASS, 39 pruebas. Si falla «se aplica a …» o «cada cosa está donde debe», la versión de three.js instalada no es la 0.185 o ha cambiado sus shaders: no toques la prueba, dilo.

- [ ] **Step 5: escribir las pruebas de la preferencia que fallan**

`frontend/src/logic/depthFadePreference.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { StorageLike } from "../state/appearance";
import { DEPTH_FADE_STORAGE_KEY, readDepthFadePreference, writeDepthFadePreference } from "./depthFadePreference";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const failingStorage: StorageLike = {
  getItem: () => {
    throw new Error("sin acceso");
  },
  setItem: () => {
    throw new Error("sin acceso");
  },
};

describe("preferencia de la atenuación por profundidad", () => {
  it("activada por defecto: sin almacenamiento, sin valor guardado o con uno que no se entiende", () => {
    expect(readDepthFadePreference(null)).toBe(true);
    expect(readDepthFadePreference(memoryStorage())).toBe(true);
    expect(readDepthFadePreference(memoryStorage({ [DEPTH_FADE_STORAGE_KEY]: "quizá" }))).toBe(true);
  });

  it("se guarda y se vuelve a leer", () => {
    const storage = memoryStorage();
    writeDepthFadePreference(storage, false);
    expect(storage.data[DEPTH_FADE_STORAGE_KEY]).toBe("false");
    expect(readDepthFadePreference(storage)).toBe(false);
    writeDepthFadePreference(storage, true);
    expect(readDepthFadePreference(storage)).toBe(true);
  });

  it("si el almacenamiento falla, activada y sin errores", () => {
    expect(readDepthFadePreference(failingStorage)).toBe(true);
    expect(() => writeDepthFadePreference(failingStorage, false)).not.toThrow();
    expect(() => writeDepthFadePreference(null, false)).not.toThrow();
  });
});
```

- [ ] **Step 6: comprobar que fallan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npx vitest run src/logic/depthFadePreference.test.ts`
Expected: FAIL, porque no existe `./depthFadePreference`.

- [ ] **Step 7: implementar `frontend/src/logic/depthFadePreference.ts`**

```ts
// Preferencia «Atenuar lo que queda detrás» del cerebro 3D (Legibilidad del
// 3D; docs/rediseno-interfaz-diseno.md, 6.3): activada por defecto y guardada
// en este navegador, para quien lo use. Cada lectura y escritura va en
// try/catch, como la apariencia (state/appearance.ts): si el almacenamiento
// falla o no existe, vale el valor por defecto y el interruptor sigue
// funcionando durante la sesión.
import type { StorageLike } from "../state/appearance";

export const DEPTH_FADE_STORAGE_KEY = "neurograph.cerebro3d.atenuar";

export function readDepthFadePreference(storage: StorageLike | null): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(DEPTH_FADE_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function writeDepthFadePreference(storage: StorageLike | null, enabled: boolean): void {
  if (!storage) return;
  try {
    storage.setItem(DEPTH_FADE_STORAGE_KEY, String(enabled));
  } catch {
    // Sin almacenamiento (modo privado, cuota llena): la elección dura solo
    // esta sesión.
  }
}
```

- [ ] **Step 8: comprobar que pasan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npx vitest run src/logic/depthFadePreference.test.ts`
Expected: PASS, 3 pruebas.

- [ ] **Step 9: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npm test && npx tsc -b && npm run lint && npm run build
```

Expected: BASE + 47 pruebas en verde (176 con una BASE de 129). Lo demás, como en la Task 1.

- [ ] **Step 10: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d && git add frontend/src/logic/depthFade.ts frontend/src/logic/depthFade.test.ts frontend/src/logic/depthFadePreference.ts frontend/src/logic/depthFadePreference.test.ts
git commit -m "Legibilidad 3D: logica de la atenuacion por profundidad y su preferencia

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 3: la atenuación en la escena

### Task 3: atenuar lo que queda detrás, con su interruptor

**Files:**
- Create: `frontend/src/components/DepthFadeToggle.tsx`
- Test: `frontend/src/components/DepthFadeToggle.test.tsx`
- Modify: `frontend/src/components/PaintedCortex.tsx` (`SurfaceOverlayHelpers` y `helpers`)
- Modify: `frontend/src/components/Brain3D.tsx` (importaciones, `DepthFadeUpdater` nuevo, `NodeLabel`, `NodeMesh`, `DirectionArrow`, `ConnectionLine`, el estado de `Brain3D`, `renderFocus` y la barra)

Cómo funciona, para quien revise:

- `Brain3D` guarda si la atenuación está activada (`depthFadeOn`, leído de `localStorage` al montar) y, en un `useState` con inicializador, un `DepthFade`: los uniforms compartidos y el `onBeforeCompile` que parchea cada material. `activeFade` es ese objeto, o `null` con el interruptor desactivado.
- `renderFocus` pasa `activeFade` a `NodeMesh` (y a su `NodeLabel`) y a `ConnectionLine` (y a su `DirectionArrow`). Cada material de la capa de foco extiende `fadeMaterialProps(fade, …)`, que no añade nada con `null`, y lleva `key={fadeKey(fade)}`. Las dos funciones son de `logic/depthFade.ts` (Task 2). Con la clave, al alternar, React crea materiales nuevos. Es imprescindible: sin ella, al desactivar, react-three-fiber 9.7 pondría a 0 las props que desaparecen, y three.js fallaría al llamar a `customProgramCacheKey` (desviación 2).
- `DepthFadeUpdater`, dentro de `renderFocus`, pone el tramo en los uniforms en cada fotograma, con la caja que da `PaintedCortex` o, sin corteza pintada, la de todos los nodos del atlas (`nodeBounds`).

- [ ] **Step 1: escribir la prueba del interruptor que falla**

`frontend/src/components/DepthFadeToggle.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DepthFadeToggle } from "./DepthFadeToggle";

const noop = () => {};

describe("DepthFadeToggle", () => {
  it("es un botón de alternar con aria-pressed y el texto del spec", () => {
    const on = renderToStaticMarkup(<DepthFadeToggle enabled onToggle={noop} />);
    expect(on).toMatch(/<button type="button"[^>]*aria-pressed="true"[^>]*>Atenuar lo que queda detrás<\/button>/);
    const off = renderToStaticMarkup(<DepthFadeToggle enabled={false} onToggle={noop} />);
    expect(off).toMatch(/<button type="button"[^>]*aria-pressed="false"[^>]*>Atenuar lo que queda detrás<\/button>/);
  });

  it("activado, lleva el estilo de estado activo de los botones de herramienta", () => {
    expect(renderToStaticMarkup(<DepthFadeToggle enabled onToggle={noop} />)).toContain(
      'class="export-btn export-btn--active"',
    );
    expect(renderToStaticMarkup(<DepthFadeToggle enabled={false} onToggle={noop} />)).toContain('class="export-btn"');
  });

  it("va dentro de su propio contenedor, no suelto en la barra", () => {
    expect(renderToStaticMarkup(<DepthFadeToggle enabled onToggle={noop} />)).toMatch(
      /^<div class="brain3d-depth-fade"><button /,
    );
  });
});
```

- [ ] **Step 2: comprobar que falla**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npx vitest run src/components/DepthFadeToggle.test.tsx`
Expected: FAIL, porque no existe `./DepthFadeToggle`.

- [ ] **Step 3: implementar `frontend/src/components/DepthFadeToggle.tsx`**

```tsx
// Interruptor «Atenuar lo que queda detrás» de los controles del cerebro 3D
// (Legibilidad del 3D; docs/rediseno-interfaz-diseno.md, 6.3). Es un botón
// de alternar (aria-pressed) con el estilo de los botones de herramienta:
// .export-btn, y .export-btn--active cuando está activado, que toman sus
// colores del tema.
//
// Va dentro de su propio contenedor para no ser hijo directo de
// .brain3d-toolbar: la regla `.brain3d-toolbar > .export-btn` es la del
// botón de exportar, y la fase 3 lo coloca con ella en la cabecera de la
// vista.
export function DepthFadeToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="brain3d-depth-fade">
      <button
        type="button"
        className={enabled ? "export-btn export-btn--active" : "export-btn"}
        aria-pressed={enabled}
        title="Las líneas, los marcadores y las etiquetas se ven más tenues cuanto más lejos quedan dentro del cerebro"
        onClick={onToggle}
      >
        Atenuar lo que queda detrás
      </button>
    </div>
  );
}
```

- [ ] **Step 4: comprobar que pasa**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npx vitest run src/components/DepthFadeToggle.test.tsx`
Expected: PASS, 3 pruebas.

- [ ] **Step 5: la caja de la superficie en `frontend/src/components/PaintedCortex.tsx`**

Cuatro sustituciones. La caja se calcula en el mismo `useMemo` que `helpers`, que ya depende de la geometría, del hemisferio que se ve y del mapa: recorre los vértices visibles una vez por cambio de forma o de hemisferio.

**1. La importación.**

Busca:

```tsx
import { DISPLAY_SCALE } from "../data/api";
```

Sustitúyelo por:

```tsx
import { DISPLAY_SCALE } from "../data/api";
import { depthBounds, type DepthBounds } from "../logic/depthFade";
```

**2. El campo nuevo de `SurfaceOverlayHelpers`.**

Busca:

```tsx
export interface SurfaceOverlayHelpers {
  positionOfVertex: (vertex: number) => [number, number, number];
  isVertexVisible: (vertex: number) => boolean;
}
```

Sustitúyelo por:

```tsx
export interface SurfaceOverlayHelpers {
  positionOfVertex: (vertex: number) => [number, number, number];
  isVertexVisible: (vertex: number) => boolean;
  // Caja de la parte de la superficie que se ve (los dos hemisferios o uno),
  // en coordenadas de la escena. La atenuación por profundidad de
  // Brain3D.tsx (Legibilidad del 3D) se mide con ella.
  visibleBounds: DepthBounds | null;
}
```

**3. El tramo de vértices que se ve.**

Busca:

```tsx
  const helpers = useMemo<SurfaceOverlayHelpers>(() => {
    const position = geometry.getAttribute("position");
    return {
```

Sustitúyelo por:

```tsx
  const helpers = useMemo<SurfaceOverlayHelpers>(() => {
    const position = geometry.getAttribute("position");
    // Los vértices del hemisferio izquierdo van primero.
    const firstVisible = effectiveHemisphere === "R" ? map.nVerticesLeft : 0;
    const endVisible = effectiveHemisphere === "L" ? map.nVerticesLeft : position.count;
    return {
```

**4. La caja.**

Busca:

```tsx
      isVertexVisible: (vertex) =>
        effectiveHemisphere === "both" ||
        (effectiveHemisphere === "L" ? vertex < map.nVerticesLeft : vertex >= map.nVerticesLeft),
    };
```

Sustitúyelo por:

```tsx
      isVertexVisible: (vertex) =>
        effectiveHemisphere === "both" ||
        (effectiveHemisphere === "L" ? vertex < map.nVerticesLeft : vertex >= map.nVerticesLeft),
      visibleBounds: depthBounds(position, firstVisible, endVisible, DISPLAY_SCALE),
    };
```

- [ ] **Step 6: la atenuación en `frontend/src/components/Brain3D.tsx`**

Veinte sustituciones.

**1. Las importaciones de la lógica.** `fadeMaterialProps` y `fadeKey` vienen de `logic/depthFade.ts`, con sus pruebas: `Brain3D.tsx` crece lo menos posible.

Busca:

```tsx
import { markerSize } from "../logic/markerSize";
```

Sustitúyelo por:

```tsx
import { markerSize } from "../logic/markerSize";
import {
  createDepthFade,
  depthBounds,
  fadeKey,
  fadeMaterialProps,
  tuplePoints,
  updateDepthFadeUniforms,
  type DepthBounds,
  type DepthFade,
} from "../logic/depthFade";
import { readDepthFadePreference, writeDepthFadePreference } from "../logic/depthFadePreference";
import { browserStorage } from "../state/appearance";
```

**2. La importación del interruptor.**

Busca:

```tsx
import { ReferenceMesh } from "./ReferenceMesh";
```

Sustitúyelo por:

```tsx
import { ReferenceMesh } from "./ReferenceMesh";
import { DepthFadeToggle } from "./DepthFadeToggle";
```

**3. `DepthFadeUpdater`, tras `ContextLossWatcher`.** Su `useFrame` va con la prioridad por defecto, 0: react-three-fiber lo llama en cada fotograma, después del de `Controls`, que se suscribió antes, y antes de dibujar.

Busca:

```tsx
    canvas.addEventListener("webglcontextlost", handleLost);
    return () => canvas.removeEventListener("webglcontextlost", handleLost);
  }, [gl, onLost]);
  return null;
}
```

Sustitúyelo por:

```tsx
    canvas.addEventListener("webglcontextlost", handleLost);
    return () => canvas.removeEventListener("webglcontextlost", handleLost);
  }, [gl, onLost]);
  return null;
}

// Tramo de la atenuación por profundidad (Legibilidad del 3D;
// logic/depthFade.ts), en cada fotograma: después de que los controles
// coloquen la cámara, que se suscribieron antes, y antes de dibujar.
// `bounds` es la caja del cerebro que se ve.
function DepthFadeUpdater({ fade, bounds }: { fade: DepthFade; bounds: DepthBounds | null }) {
  useFrame(({ camera }) => updateDepthFadeUniforms(fade.uniforms, camera, bounds));
  return null;
}
```

**4. `NodeLabel` recibe la atenuación.**

Busca:

```tsx
function NodeLabel({ node, offset, overlay = false }: { node: GraphNode; offset: number; overlay?: boolean }) {
```

Sustitúyelo por:

```tsx
function NodeLabel({
  node,
  offset,
  fade,
  overlay = false,
}: {
  node: GraphNode;
  offset: number;
  fade: DepthFade | null;
  overlay?: boolean;
}) {
```

**5. El material de la etiqueta.**

Busca:

```tsx
      <spriteMaterial
        map={label.texture}
        transparent
        depthWrite={false}
        depthTest={!overlay}
        sizeAttenuation
      />
```

Sustitúyelo por:

```tsx
      <spriteMaterial
        key={fadeKey(fade)}
        map={label.texture}
        transparent
        depthWrite={false}
        depthTest={!overlay}
        sizeAttenuation
        {...fadeMaterialProps(fade, false)}
      />
```

**6. `NodeMesh` recibe la atenuación.**

Busca:

```tsx
function NodeMesh({
  node,
  isHomologyHighlighted,
  colors,
  overlay = false,
}: {
  node: GraphNode;
```

Sustitúyelo por:

```tsx
function NodeMesh({
  node,
  isHomologyHighlighted,
  colors,
  fade,
  overlay = false,
}: {
  node: GraphNode;
```

**7. Su tipo.**

Busca:

```tsx
  isHomologyHighlighted: boolean;
  colors: DrawColors;
}) {
  const { selectedNodeIds, toggleNode } = useSelectionStore();
```

Sustitúyelo por:

```tsx
  isHomologyHighlighted: boolean;
  colors: DrawColors;
  // Atenuación por profundidad (Legibilidad del 3D); null, desactivada.
  fade: DepthFade | null;
}) {
  const { selectedNodeIds, toggleNode } = useSelectionStore();
```

**8. El material del contorno.**

Busca:

```tsx
        <meshBasicMaterial
          color={isSelected ? colors.selected : colors.nodeRing}
          side={THREE.BackSide}
          depthTest={!overlay}
        />
```

Sustitúyelo por:

```tsx
        <meshBasicMaterial
          key={fadeKey(fade)}
          color={isSelected ? colors.selected : colors.nodeRing}
          side={THREE.BackSide}
          depthTest={!overlay}
          {...fadeMaterialProps(fade, true)}
        />
```

**9. El material del relleno.**

Busca:

```tsx
        <meshStandardMaterial
          color={fillColor}
          emissive={isSelected ? "#ffffff" : "#000000"}
          emissiveIntensity={isSelected ? 0.4 : 0}
          depthTest={!overlay}
        />
```

Sustitúyelo por:

```tsx
        <meshStandardMaterial
          key={fadeKey(fade)}
          color={fillColor}
          emissive={isSelected ? "#ffffff" : "#000000"}
          emissiveIntensity={isSelected ? 0.4 : 0}
          depthTest={!overlay}
          {...fadeMaterialProps(fade, true)}
        />
```

**10. La etiqueta del nodo.**

Busca:

```tsx
      <NodeLabel node={node} offset={size.labelOffset} overlay={overlay} />
```

Sustitúyelo por:

```tsx
      <NodeLabel node={node} offset={size.labelOffset} fade={fade} overlay={overlay} />
```

**11. `DirectionArrow` recibe la atenuación.**

Busca:

```tsx
function DirectionArrow({
  from,
  to,
  color,
  overlay = false,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  overlay?: boolean;
}) {
```

Sustitúyelo por:

```tsx
function DirectionArrow({
  from,
  to,
  color,
  fade,
  overlay = false,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  fade: DepthFade | null;
  overlay?: boolean;
}) {
```

**12. El material del cono.**

Busca:

```tsx
      <meshBasicMaterial color={color} depthTest={!overlay} />
```

Sustitúyelo por:

```tsx
      <meshBasicMaterial key={fadeKey(fade)} color={color} depthTest={!overlay} {...fadeMaterialProps(fade, true)} />
```

**13. `ConnectionLine` recibe la atenuación.**

Busca:

```tsx
  onClick,
  colors,
  overlay = false,
}: {
  a: [number, number, number];
  b: [number, number, number];
  isSelected: boolean;
  isDashed: boolean;
  isDirected: boolean;
  onClick: () => void;
  colors: DrawColors;
  overlay?: boolean;
}) {
```

Sustitúyelo por:

```tsx
  onClick,
  colors,
  fade,
  overlay = false,
}: {
  a: [number, number, number];
  b: [number, number, number];
  isSelected: boolean;
  isDashed: boolean;
  isDirected: boolean;
  onClick: () => void;
  colors: DrawColors;
  fade: DepthFade | null;
  overlay?: boolean;
}) {
```

**14. La línea discontinua.**

Busca:

```tsx
          <lineDashedMaterial
            color={color}
            transparent
            opacity={isSelected ? colors.edgeOpacitySelected : colors.edgeOpacity3d}
            dashSize={0.08}
            gapSize={0.06}
            depthTest={!overlay}
          />
```

Sustitúyelo por:

```tsx
          <lineDashedMaterial
            key={fadeKey(fade)}
            color={color}
            transparent
            opacity={isSelected ? colors.edgeOpacitySelected : colors.edgeOpacity3d}
            dashSize={0.08}
            gapSize={0.06}
            depthTest={!overlay}
            {...fadeMaterialProps(fade, false)}
          />
```

**15. La línea continua.**

Busca:

```tsx
          <lineBasicMaterial
            color={color}
            transparent
            opacity={isSelected ? colors.edgeOpacitySelected : colors.edgeOpacity3d}
            depthTest={!overlay}
          />
```

Sustitúyelo por:

```tsx
          <lineBasicMaterial
            key={fadeKey(fade)}
            color={color}
            transparent
            opacity={isSelected ? colors.edgeOpacitySelected : colors.edgeOpacity3d}
            depthTest={!overlay}
            {...fadeMaterialProps(fade, false)}
          />
```

**16. El cono de la línea.**

Busca:

```tsx
      {isDirected && <DirectionArrow from={from} to={to} color={color} overlay={overlay} />}
```

Sustitúyelo por:

```tsx
      {isDirected && <DirectionArrow from={from} to={to} color={color} fade={fade} overlay={overlay} />}
```

**17. El estado, en `Brain3D`, tras `cortexGrays`.** `useState(createDepthFade)` crea el objeto una sola vez por montaje, como cualquier inicializador de estado.

Busca:

```tsx
  const cortexGrays = useMemo(() => cortexGraysFromSrgb(colors), [colors]);
```

Sustitúyelo por:

```tsx
  const cortexGrays = useMemo(() => cortexGraysFromSrgb(colors), [colors]);

  // «Atenuar lo que queda detrás» (Legibilidad del 3D; spec 6.3): activado
  // por defecto y guardado en este navegador. `depthFade` guarda el parche y
  // los uniforms que comparten los materiales de la capa de foco, uno por
  // lienzo; `activeFade` es null con el interruptor desactivado.
  const [depthFadeOn, setDepthFadeOn] = useState(() => readDepthFadePreference(browserStorage()));
  const [depthFade] = useState(createDepthFade);
  const activeFade = depthFadeOn ? depthFade : null;
  const toggleDepthFade = () => {
    const next = !depthFadeOn;
    setDepthFadeOn(next);
    writeDepthFadePreference(browserStorage(), next);
  };
  // Caja de todos los nodos del atlas: con ella se mide la atenuación cuando
  // los marcadores van en su posición real (sin corteza pintada).
  const nodeBounds = useMemo(
    () => depthBounds(tuplePoints(allNodes.map((n) => n.position3d)), 0, allNodes.length),
    [allNodes],
  );
```

**18. `renderFocus`: el tramo y los nodos.**

Busca:

```tsx
    const overlay = helpers !== null;
    return (
      <>
        {[...placed.values()].map((node) => (
          <NodeMesh
            key={node.id}
            node={node}
            isHomologyHighlighted={homologyNodeIds.has(node.id)}
            colors={colors}
            overlay={overlay}
          />
        ))}
```

Sustitúyelo por:

```tsx
    const overlay = helpers !== null;
    return (
      <>
        {activeFade && <DepthFadeUpdater fade={activeFade} bounds={helpers ? helpers.visibleBounds : nodeBounds} />}
        {[...placed.values()].map((node) => (
          <NodeMesh
            key={node.id}
            node={node}
            isHomologyHighlighted={homologyNodeIds.has(node.id)}
            colors={colors}
            fade={activeFade}
            overlay={overlay}
          />
        ))}
```

**19. `renderFocus`: las líneas.**

Busca:

```tsx
              onClick={() => selectConnection(conn.id)}
              colors={colors}
              overlay={overlay}
            />
```

Sustitúyelo por:

```tsx
              onClick={() => selectConnection(conn.id)}
              colors={colors}
              fade={activeFade}
              overlay={overlay}
            />
```

**20. El interruptor, en la barra del lienzo**, antes del botón de exportar. La barra del aviso de «Selecciona una región», sin lienzo, no lo lleva.

Busca:

```tsx
        {homologyControl}
        {surfaceControls}
        {/* Desactivado mientras se exporta (ver handleExport y
```

Sustitúyelo por:

```tsx
        {homologyControl}
        {surfaceControls}
        <DepthFadeToggle enabled={depthFadeOn} onToggle={toggleDepthFade} />
        {/* Desactivado mientras se exporta (ver handleExport y
```

Comprueba que cada material de la capa de foco lleva la atenuación, y que la zona de clic no:

```bash
grep -c "{...fadeMaterialProps(fade" /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend/src/components/Brain3D.tsx
grep -n "<meshBasicMaterial visible={false} />" /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend/src/components/Brain3D.tsx
```

Expected: `6` (etiqueta, contorno, relleno, cono y las dos líneas), y una sola línea con el material invisible, el de la zona de clic, sin `fadeMaterialProps`: no se dibuja, así que no se atenúa.

- [ ] **Step 7: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npm test && npx tsc -b && npm run lint && npm run build
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && git diff -U0 -- src | grep -E '^\+.*#[0-9a-fA-F]{3,8}\b'; grep -nE '#[0-9a-fA-F]{3,8}\b' src/components/DepthFadeToggle.tsx
```

Expected: BASE + 50 pruebas en verde (179 con una BASE de 129). Los dos `grep` no encuentran ningún color fijo nuevo: el primero mira las líneas cambiadas de los archivos que ya existían, y el segundo, el archivo nuevo, que `git diff` no ve. Lo demás, como en la Task 1.

- [ ] **Step 8: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d && git add frontend/src/components/DepthFadeToggle.tsx frontend/src/components/DepthFadeToggle.test.tsx frontend/src/components/PaintedCortex.tsx frontend/src/components/Brain3D.tsx
git commit -m "Legibilidad 3D: atenuar lo que queda detras, con su interruptor

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 4: captura sin parpadeo

### Task 4: captura del 3D fuera de pantalla, sin parpadeo

**Files:**
- Create: `frontend/src/logic/capture3d.ts`
- Test: `frontend/src/logic/capture3d.test.ts`
- Modify: `frontend/src/logic/exportImage.ts` (comentario de `exportCanvasAsJpeg` y `exportPixelsAsJpeg` nueva)
- Modify: `frontend/src/components/Brain3D.tsx` (importaciones, `ExportBridge` y el estado de la exportación)

Cómo funciona, para quien revise:

1. «Exportar JPEG» despacha `request`: `idle` → `capturing`. En ese render, `Brain3D` pasa a los colores de exportación. En el mismo commit del árbol de react-three-fiber, los materiales reciben esos colores y el `useFrame` de `ExportBridge`, que solo dibuja en `idle`, deja de dibujar. En pantalla sigue el último fotograma.
2. Un fotograma después (la corteza pintada ya ha recalculado sus colores en su efecto), `renderSceneOffscreen` dibuja la escena sobre blanco en un destino fuera de pantalla del tamaño del lienzo, la lee y le da la vuelta. `exportPixelsAsJpeg` la codifica y la descarga. En el `finally`, `captured`: `capturing` → `restoring`, y `Brain3D` vuelve a los colores de pantalla. Si el contexto WebGL se ha perdido o el lienzo no tiene tamaño, `renderSceneOffscreen` no dibuja: lo dice con `console.error` y devuelve `null`. No hay JPEG, que con el contexto perdido saldría negro, y se sale por el mismo `finally`.
3. Un fotograma más, para que la corteza recalcule los suyos: `restored` → `idle`, y el lienzo se vuelve a dibujar.
4. Si el lienzo se desmonta o pierde el contexto WebGL en `capturing` o en `restoring`, la limpieza del efecto despacha `abort` → `idle`.

Se conserva lo de la D3: el botón con `aria-disabled` y la salida temprana de `handleExport`, una sola exportación a la vez (el reductor ignora `request` fuera de `idle`) y el `try/finally`.

- [ ] **Step 1: escribir las pruebas que fallan**

`frontend/src/logic/capture3d.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  createCaptureTarget,
  exportPhaseAfter,
  flipRows,
  renderSceneOffscreen,
  type ExportEvent,
  type ExportPhase,
} from "./capture3d";

describe("exportPhaseAfter", () => {
  it("una exportación entera: pedir, capturar, volver a pantalla", () => {
    let phase: ExportPhase = "idle";
    const steps: ExportPhase[] = [];
    for (const event of ["request", "captured", "restored"] as ExportEvent[]) {
      phase = exportPhaseAfter(phase, event);
      steps.push(phase);
    }
    expect(steps).toEqual(["capturing", "restoring", "idle"]);
  });

  it("pedir otra exportación durante una no hace nada", () => {
    expect(exportPhaseAfter("capturing", "request")).toBe("capturing");
    expect(exportPhaseAfter("restoring", "request")).toBe("restoring");
  });

  it("cada paso solo vale desde el anterior", () => {
    expect(exportPhaseAfter("idle", "captured")).toBe("idle");
    expect(exportPhaseAfter("idle", "restored")).toBe("idle");
    expect(exportPhaseAfter("capturing", "restored")).toBe("capturing");
    expect(exportPhaseAfter("restoring", "captured")).toBe("restoring");
  });

  it("si el lienzo se desmonta a mitad, se sale de la exportación", () => {
    for (const phase of ["idle", "capturing", "restoring"] as ExportPhase[]) {
      expect(exportPhaseAfter(phase, "abort")).toBe("idle");
    }
  });
});

describe("flipRows", () => {
  it("la última fila pasa a ser la primera, sin tocar el original", () => {
    // 2 × 3 píxeles; cada píxel lleva el número de su fila.
    const pixels = new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255, 1, 1, 1, 255, 1, 1, 1, 255, 2, 2, 2, 255, 2, 2, 2, 255]);
    const copy = pixels.slice();
    expect([...flipRows(pixels, 2, 3)]).toEqual([2, 2, 2, 255, 2, 2, 2, 255, 1, 1, 1, 255, 1, 1, 1, 255, 0, 0, 0, 255, 0, 0, 0, 255]);
    expect(pixels).toEqual(copy);
  });
});

describe("createCaptureTarget", () => {
  const target = createCaptureTarget(640, 480);

  it("tiene el tamaño pedido", () => {
    expect([target.width, target.height]).toEqual([640, 480]);
  });

  it("es RGBA de 8 bits, que se lee en todos los navegadores", () => {
    expect(target.texture.type).toBe(THREE.UnsignedByteType);
    expect(target.texture.format).toBe(THREE.RGBAFormat);
    expect(target.texture.internalFormat).toBe("RGBA8");
  });

  it("recibe la curva de tono y la codificación sRGB, como el lienzo", () => {
    expect((target as THREE.WebGLRenderTarget & { isXRRenderTarget?: boolean }).isXRRenderTarget).toBe(true);
    expect(target.texture.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it("con antialiasing y profundidad, que no se resuelve: solo se lee el color", () => {
    expect(target.samples).toBe(4);
    expect(target.depthBuffer).toBe(true);
    expect(target.resolveDepthBuffer).toBe(false);
  });
});

describe("renderSceneOffscreen", () => {
  // Un renderer con solo lo que se mira antes de dibujar: si la función
  // llamara a algo más (setRenderTarget, render…), la prueba fallaría.
  const renderer = (width: number, height: number, lost: boolean) =>
    ({
      getContext: () => ({ isContextLost: () => lost }),
      getDrawingBufferSize: (target: THREE.Vector2) => target.set(width, height),
    }) as unknown as THREE.WebGLRenderer;
  const camera = new THREE.PerspectiveCamera();

  it("con el contexto WebGL perdido no dibuja ni da píxeles (el JPEG saldría negro), y lo dice", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const scene = new THREE.Scene();
    expect(renderSceneOffscreen(renderer(640, 480, true), scene, camera)).toBeNull();
    expect(scene.background).toBeNull();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it("con el búfer de dibujo sin tamaño, tampoco", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(renderSceneOffscreen(renderer(0, 0, false), new THREE.Scene(), camera)).toBeNull();
    expect(renderSceneOffscreen(renderer(640, 0, false), new THREE.Scene(), camera)).toBeNull();
    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});
```

- [ ] **Step 2: comprobar que fallan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npx vitest run src/logic/capture3d.test.ts`
Expected: FAIL, porque no existe `./capture3d`.

- [ ] **Step 3: implementar `frontend/src/logic/capture3d.ts`**

```ts
// Captura del cerebro 3D para exportarlo sin parpadeo (Legibilidad del 3D;
// docs/rediseno-interfaz-diseno.md, 6.3). Hasta ahora (D3 de
// docs/decisiones-diseno.md), la exportación volvía a dibujar el lienzo
// visible con los colores de exportación, y en pantalla se veían entre 2 y 4
// fotogramas con ellos. Ahora la captura se dibuja en un destino fuera de
// pantalla y, mientras dura la exportación, el lienzo visible no se vuelve a
// dibujar: sigue mostrando el último fotograma.
import * as THREE from "three";

// --- Fases de la exportación ---
//
// - idle: sin exportar; el lienzo se dibuja en cada fotograma.
// - capturing: la escena lleva los colores de exportación; el lienzo no se
//   dibuja, y la captura va al destino fuera de pantalla.
// - restoring: la escena ya lleva otra vez los colores de pantalla, pero el
//   lienzo espera un fotograma más: la corteza pintada los recalcula en un
//   efecto, que para entonces ya ha terminado.
export type ExportPhase = "idle" | "capturing" | "restoring";
// abort: el lienzo se desmontó o perdió el contexto WebGL a mitad.
export type ExportEvent = "request" | "captured" | "restored" | "abort";

export function exportPhaseAfter(phase: ExportPhase, event: ExportEvent): ExportPhase {
  switch (event) {
    case "request":
      return phase === "idle" ? "capturing" : phase;
    case "captured":
      return phase === "capturing" ? "restoring" : phase;
    case "restored":
      return phase === "restoring" ? "idle" : phase;
    case "abort":
      return "idle";
  }
}

/**
 * Filas de abajo arriba, como las da readPixels de WebGL, puestas de arriba
 * abajo, como las espera una imagen. Devuelve una copia.
 */
export function flipRows(pixels: Uint8Array, width: number, height: number): Uint8Array<ArrayBuffer> {
  const rowBytes = width * 4;
  const flipped = new Uint8Array(rowBytes * height);
  for (let row = 0; row < height; row++) {
    const from = (height - 1 - row) * rowBytes;
    flipped.set(pixels.subarray(from, from + rowBytes), row * rowBytes);
  }
  return flipped;
}

/**
 * Destino fuera de pantalla que da los mismos colores que el lienzo:
 * - RGBA de 8 bits (UnsignedByteType): WebKitGTK y WebView2 no siempre leen
 *   destinos de coma flotante.
 * - En pantalla, three.js aplica en el shader la curva de tono (ACES, la de
 *   react-three-fiber) y la codificación sRGB, y mezcla las transparencias
 *   sobre esos valores. En un destino normal no aplica ninguna de las dos:
 *   dibuja en lineal. Las aplica en pantalla y en los destinos marcados como
 *   de WebXR (isXRRenderTarget), con el espacio de color de su textura
 *   (three.js 0.185: WebGLPrograms, WebGLRenderer.setProgram y
 *   getUnlitUniformColorSpace). Por eso el destino lleva esa marca y
 *   colorSpace sRGB.
 * - El formato interno RGBA8 es imprescindible. La marca también actúa en
 *   WebGLTextures: fuerza RGBA8 en el renderbuffer multimuestra, pero no en
 *   la textura en la que se resuelven sus muestras, que con colorSpace sRGB
 *   sería SRGB8_ALPHA8. Resolver entre formatos distintos (blitFramebuffer)
 *   da INVALID_OPERATION. Con RGBA8 fijado, los dos coinciden, y la GPU no
 *   vuelve a codificar a sRGB lo que el shader ya codificó.
 * - 4 muestras de antialiasing, como el lienzo (antialias de
 *   react-three-fiber). La profundidad no se resuelve (resolveDepthBuffer):
 *   solo se lee el color.
 */
export function createCaptureTarget(width: number, height: number): THREE.WebGLRenderTarget {
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    colorSpace: THREE.SRGBColorSpace,
    internalFormat: "RGBA8",
    samples: 4,
    resolveDepthBuffer: false,
  });
  return Object.assign(target, { isXRRenderTarget: true });
}

export interface CapturedPixels {
  pixels: Uint8Array<ArrayBuffer>;
  width: number;
  height: number;
}

/**
 * Dibuja la escena sobre blanco (decisión 11) en un destino fuera de
 * pantalla del tamaño del lienzo y devuelve sus píxeles, de arriba abajo. El
 * lienzo visible no se toca. Aunque falle, deja el destino, el color de
 * borrado y el fondo de la escena como estaban.
 *
 * Si se ha perdido el contexto WebGL o el búfer de dibujo no tiene tamaño,
 * no dibuja nada: lo dice en la consola y devuelve null. Con el contexto
 * perdido, readPixels no lee nada y el JPEG saldría negro.
 */
export function renderSceneOffscreen(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): CapturedPixels | null {
  const size = gl.getDrawingBufferSize(new THREE.Vector2());
  if (gl.getContext().isContextLost()) {
    // eslint-disable-next-line no-console
    console.error("No se pudo exportar el cerebro 3D: se perdió el contexto WebGL.");
    return null;
  }
  if (size.x === 0 || size.y === 0) {
    // eslint-disable-next-line no-console
    console.error(`No se pudo exportar el cerebro 3D: el lienzo mide ${size.x} × ${size.y} píxeles.`);
    return null;
  }
  const target = createCaptureTarget(size.x, size.y);
  const previousTarget = gl.getRenderTarget();
  const previousClearColor = gl.getClearColor(new THREE.Color());
  const previousClearAlpha = gl.getClearAlpha();
  const previousBackground = scene.background;
  try {
    // Como en la decisión 18: scene.background gana siempre al color de
    // borrado, así que se cambian los dos.
    gl.setClearColor("#ffffff", 1);
    scene.background = new THREE.Color("#ffffff");
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    const pixels = new Uint8Array(size.x * size.y * 4);
    gl.readRenderTargetPixels(target, 0, 0, size.x, size.y, pixels);
    return { pixels: flipRows(pixels, size.x, size.y), width: size.x, height: size.y };
  } finally {
    gl.setRenderTarget(previousTarget);
    gl.setClearColor(previousClearColor, previousClearAlpha);
    scene.background = previousBackground;
    target.dispose();
  }
}
```

- [ ] **Step 4: comprobar que pasan**

Run: `cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npx vitest run src/logic/capture3d.test.ts`
Expected: PASS, 11 pruebas.

- [ ] **Step 5: `frontend/src/logic/exportImage.ts`**

**1. El comentario de `exportCanvasAsJpeg`**, que ya no usa el cerebro 3D.

Busca:

```ts
/**
 * Exporta el contenido YA RENDERIZADO de un <canvas> (p. ej. el WebGL del
 * cerebro 3D) como JPEG. Quien llama es responsable de haber dibujado ya
 * un frame con fondo blanco opaco antes de invocar esto -- ver
 * `Brain3D.tsx` (`ExportBridge`), que fuerza ese frame antes de leer el
 * canvas. Esta función solo se encarga de codificar y descargar.
 */
```

Sustitúyelo por:

```ts
/**
 * Exporta el contenido YA RENDERIZADO de un <canvas> como JPEG. Quien llama
 * es responsable de haber dibujado ya un frame con fondo blanco opaco antes
 * de invocar esto. Esta función solo se encarga de codificar y descargar.
 * El cerebro 3D ya no lee su lienzo: pasa por exportPixelsAsJpeg
 * (Legibilidad del 3D).
 */
```

**2. `exportPixelsAsJpeg`.** `pixels` es `Uint8Array<ArrayBuffer>` porque `ImageData` solo acepta un `Uint8ClampedArray` sobre un `ArrayBuffer`, y así lo exige TypeScript 6.

Añade al final del archivo, tras una línea en blanco:

```ts
/**
 * Exporta como JPEG, del mismo tamaño, píxeles RGBA ordenados de arriba
 * abajo: la captura del cerebro 3D, dibujada fuera de pantalla
 * (logic/capture3d.ts; Legibilidad del 3D). Se copian a un <canvas> 2D y se
 * codifican como las demás exportaciones.
 */
export function exportPixelsAsJpeg(
  pixels: Uint8Array<ArrayBuffer>,
  width: number,
  height: number,
  filename: string,
): void {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // eslint-disable-next-line no-console
    console.error("No se pudo exportar: el navegador no dio un contexto 2D de canvas.");
    return;
  }
  const data = new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  ctx.putImageData(new ImageData(data, width, height), 0, 0);
  exportCanvasAsJpeg(canvas, filename);
}
```

- [ ] **Step 6: la exportación en `frontend/src/components/Brain3D.tsx`**

**1. `useReducer`.**

Busca:

```tsx
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
```

Sustitúyelo por:

```tsx
import { Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
```

**2. Las importaciones de la exportación.** `exportCanvasAsJpeg` deja de usarse aquí.

Busca:

```tsx
import { exportCanvasAsJpeg } from "../logic/exportImage";
```

Sustitúyelo por:

```tsx
import { exportPixelsAsJpeg } from "../logic/exportImage";
import { exportPhaseAfter, renderSceneOffscreen, type ExportEvent, type ExportPhase } from "../logic/capture3d";
```

**3. `ExportBridge`.** Se sustituye entero, con su comentario.

Sustituye desde la línea que empieza por `// Puente para exportar el frame actual del canvas WebGL a JPEG en color` hasta la línea anterior a la que empieza por `// Etiqueta de abreviatura junto al nodo (decisión de la usuaria,`, que se queda, por:

```tsx
// Puente para exportar el cerebro 3D a JPEG en color sobre fondo blanco
// (sección 20; decisiones 11 y 18, y D3 de docs/decisiones-diseno.md).
// react-three-fiber no expone gl, scene ni camera fuera del árbol de
// <Canvas>, así que este componente vive dentro de él.
//
// D3: la captura lleva los colores de EXPORTACIÓN, no los del tema de
// pantalla. Si no, en un tema oscuro la selección (casi blanca)
// desaparecería sobre el blanco del JPEG.
//
// Legibilidad del 3D (logic/capture3d.ts): la exportación pasa por tres
// fases, que Brain3D guarda en su estado.
// - «capturing»: Brain3D da a la escena los colores de exportación. Un
//   fotograma después, cuando ya están en los materiales y la corteza
//   pintada los ha recalculado en su efecto, la escena se dibuja sobre
//   blanco en un destino fuera de pantalla, se lee y se descarga.
// - «restoring»: vuelven los colores de pantalla; se espera otro fotograma,
//   a que la corteza los recalcule.
// - «idle»: el lienzo se vuelve a dibujar.
// Este componente dibuja la escena en cada fotograma (useFrame con
// prioridad 1: react-three-fiber deja entonces de dibujar por su cuenta),
// pero solo en «idle». Mientras se exporta, el lienzo sigue mostrando el
// último fotograma y nunca se ve uno con los colores de exportación, que
// era la limitación que anotó la D3.
//
// onPhaseEvent tiene que ser estable (Brain3D pasa el dispatch de su
// useReducer). Si cambiara en cada render, el efecto de la captura se
// limpiaría a mitad de la exportación y la cancelaría.
function ExportBridge({
  phase,
  onPhaseEvent,
}: {
  phase: ExportPhase;
  onPhaseEvent: (event: ExportEvent) => void;
}) {
  const { gl, scene, camera } = useThree();
  useFrame((state) => {
    if (phase === "idle") state.gl.render(state.scene, state.camera);
  }, 1);
  useEffect(() => {
    if (phase !== "capturing") return;
    let done = false;
    const frame = requestAnimationFrame(() => {
      // try/finally: aunque la captura falle, se sale de la fase. Sin
      // contexto WebGL o con el lienzo sin tamaño, renderSceneOffscreen lo
      // dice en la consola y devuelve null: no hay JPEG, y se sale igual.
      try {
        const capture = renderSceneOffscreen(gl, scene, camera);
        if (capture) {
          exportPixelsAsJpeg(capture.pixels, capture.width, capture.height, `neurograph-cerebro3d-${Date.now()}.jpg`);
        }
      } finally {
        done = true;
        onPhaseEvent("captured");
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      // Si el fotograma no llegó a ejecutarse (se desmontó el lienzo o se
      // perdió el contexto WebGL), también se sale de la exportación: si
      // no, Brain3D seguiría con los colores de exportación y el lienzo no
      // se volvería a dibujar.
      if (!done) onPhaseEvent("abort");
    };
  }, [phase, gl, scene, camera, onPhaseEvent]);
  useEffect(() => {
    if (phase !== "restoring") return;
    let done = false;
    const frame = requestAnimationFrame(() => {
      done = true;
      onPhaseEvent("restored");
    });
    return () => {
      cancelAnimationFrame(frame);
      if (!done) onPhaseEvent("abort");
    };
  }, [phase, onPhaseEvent]);
  return null;
}
```

**4. El estado de la exportación, en `Brain3D`.** `exporting` sigue existiendo, ahora derivado de la fase: lo usan `handleExport` y el `aria-disabled` del botón, que no cambian.

Busca:

```tsx
  const exportRef = useRef<(() => void) | null>(null);
  const [exporting, setExporting] = useState(false);
  // Mientras se exporta, el botón lleva aria-disabled y no disabled, para
  // que no pierda el foco del teclado; por eso el clic se ignora aquí.
  // ExportBridge descarta además una segunda petición que llegue antes de
  // que React aplique el estado.
  const handleExport = () => {
    if (exporting) return;
    exportRef.current?.();
  };
  // Colores de dibujo; durante la exportación, los de la paleta de
  // exportación (D3 de docs/decisiones-diseno.md). El fondo de la escena usa siempre los de
  // pantalla: la exportación ya fuerza el blanco, y así no hay un destello
  // de fondo claro en los temas oscuros.
  const screenColors = useDrawColors();
  const colors = useDrawColors(exporting);
```

Sustitúyelo por:

```tsx
  // Fases de la exportación (Legibilidad del 3D; logic/capture3d.ts y
  // ExportBridge). El dispatch de useReducer es estable, como pide
  // ExportBridge.
  const [exportPhase, dispatchExport] = useReducer(exportPhaseAfter, "idle");
  const exporting = exportPhase !== "idle";
  // Mientras se exporta, el botón lleva aria-disabled y no disabled, para
  // que no pierda el foco del teclado; por eso el clic se ignora aquí.
  // exportPhaseAfter descarta además una segunda petición que llegue antes
  // de que React aplique el estado.
  const handleExport = () => {
    if (exporting) return;
    dispatchExport("request");
  };
  // Colores de dibujo; durante la captura, los de la paleta de exportación
  // (D3 de docs/decisiones-diseno.md). El fondo de la escena usa siempre los
  // de pantalla: la captura ya fuerza el blanco en su destino, fuera de
  // pantalla.
  const screenColors = useDrawColors();
  const colors = useDrawColors(exportPhase === "capturing");
```

**5. `ExportBridge` en el lienzo.**

Busca:

```tsx
      <ExportBridge exportRef={exportRef} exporting={exporting} onExportingChange={setExporting} />
```

Sustitúyelo por:

```tsx
      <ExportBridge phase={exportPhase} onPhaseEvent={dispatchExport} />
```

**6. El comentario de `preserveDrawingBuffer`.**

Busca:

```tsx
      // siguiente frame) -- necesario para que la exportación a JPEG
      // sea fiable en vez de "funciona a veces".
      gl={{ preserveDrawingBuffer: true }}
```

Sustitúyelo por:

```tsx
      // siguiente frame) -- necesario para que la exportación a JPEG
      // sea fiable en vez de "funciona a veces". Legibilidad del 3D: la
      // exportación ya no lee este lienzo (se dibuja fuera de pantalla,
      // logic/capture3d.ts); se deja como estaba para no cambiar cómo se
      // presenta el lienzo.
      gl={{ preserveDrawingBuffer: true }}
```

Comprueba que no queda nada de la exportación anterior:

```bash
grep -n "exportRef\|setExporting\|onExportingChange\|exportCanvasAsJpeg\|exportingRef" /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend/src/components/Brain3D.tsx
```

Expected: sin resultados.

- [ ] **Step 7: comprobar**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npm test && npx tsc -b && npm run lint && npm run build
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && git diff -U0 -- src | grep -E '^\+.*#[0-9a-fA-F]{3,8}\b'; grep -nE '#[0-9a-fA-F]{3,8}\b' src/logic/capture3d.ts
```

Expected: BASE + 61 pruebas en verde (190 con una BASE de 129). El primer `grep` no encuentra nada, y el segundo solo las dos líneas del blanco de la exportación, que ya era fijo (decisión 11): `gl.setClearColor("#ffffff", 1);` y `scene.background = new THREE.Color("#ffffff");`. Lo demás, como en la Task 1.

- [ ] **Step 8: commit**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d && git add frontend/src/logic/capture3d.ts frontend/src/logic/capture3d.test.ts frontend/src/logic/exportImage.ts frontend/src/components/Brain3D.tsx
git commit -m "Legibilidad 3D: captura del 3D fuera de pantalla, sin parpadeo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 5: verificación en la app real, primera parte

### Task 5: verificación en la app real: preparación, atenuación, medida, preferencia y barra

**Files:**
- Create: una carpeta nueva en el scratchpad, con los scripts, una copia de la versión anterior a esta minifase y lo que generen. Nada de esto entra en el repositorio.

La verificación ocupa tres tareas. Esta prepara la carpeta, los dos servidores y los ayudantes, y hace las fases de la atenuación, la medida, la preferencia y la barra. La Task 6 hace los marcadores, la captura y la comparación con la versión anterior. La Task 7 analiza las imágenes, revisa todo y deja el borrador de la decisión.

**Reglas del navegador.**

- Se usa Chromium sin interfaz desde un script de Node. Nada de herramientas MCP de navegador:
  - las del MCP de Playwright escriben la carpeta `.playwright-mcp/` en la copia principal, que es su directorio de trabajo, y la copia principal no se toca;
  - las `mcp__claude-in-chrome__*` y `mcp__browsermcp__*` manejan el Chrome del usuario.
- Playwright 1.55.0 se carga desde `/home/dae/PycharmProjects/gh3.2/node_modules/playwright`. Solo se carga: allí no se escribe nada.
- `chromium.launch({ headless: true })` con un perfil desechable. Todo lo que se genera (perfil, capturas, JSON, descargas) va a la carpeta del scratchpad.
- Puertos propios: 5251 para la versión nueva y 5252 para la anterior. Nunca 5173, 5199, 5230, 5241 ni 5242.
- Cada fase, salvo «preflight», se lanza en su propia orden, en segundo plano (`run_in_background`) y con `timeout 1800` dentro de la orden. La herramienta Bash corta a los 10 minutos las órdenes en primer plano, y una fase que carga varias veces la corteza pintada puede pasar de ahí. Espera a que termine (llega el aviso) antes de lanzar la siguiente: dos fases a la vez se reparten la CPU del WebGL por software, y los tiempos de espera se disparan. Al terminar cada una no deben quedar navegadores sueltos (Step 6).
- Los servidores de desarrollo siguen en marcha hasta la Task 7, que los para.
- Los datos reales los sirve el backend del usuario, en `127.0.0.1:8420`. Solo se le hacen peticiones GET. No lo arranques tú: si no responde, «preflight» lo dice.
- `GET /connections` devuelve las filas en otro orden en cada petición, y con él cambia el orden de dibujo. Por eso `/regions` y `/connections` de HCP-MMP1.0 se sirven siempre de los JSON que deja «preflight», los mismos a las dos versiones. Son los de la verificación de la fase 1 (`task9-verif-20260924-175218/`) si siguen en el scratchpad.
- Las plantillas de la fase 1 están en el scratchpad: `task9-verif-20260924-175218/lib.cjs` y `verify.cjs`, y `task9-final-20260924-194434/fotograma.cjs` y `final.cjs`, que capturaron los fotogramas alrededor de una exportación 3D y probaron el botón. Si ya no existen, los scripts de abajo bastan.

**Honestidad.**

- Cada comprobación se informa como «visto», «distinto» o «sin comprobar».
- Nunca se cambia una expectativa, ni el script, para que desaparezca una diferencia. «Corrige el script» vale solo cuando la suposición del propio script era errónea (un selector, un tiempo de espera), y se anota en el informe.
- Cada fase guarda su JSON aunque falle a medias, con el error en `fallo`.
- La consola se guarda entera, errores y avisos. Si un aviso dice «Atenuación por profundidad: falta…», el parche no se aplicó: la fase que lo vio falla.
- El borrador de la decisión solo afirma lo que muestran los JSON y las capturas.

- [ ] **Step 1: pruebas, tipos, lint y compilación**

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npm test && npx tsc -b && npm run lint && npm run build
```

Expected: BASE + 61 pruebas en verde (190 con una BASE de 129); `tsc` limpio; lint sin errores y con los mismos 9 avisos; `✓ built`.

- [ ] **Step 2: carpeta de trabajo, versión anterior y estado de la copia principal**

```bash
D=$(mktemp -d /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/leg3d-verif-XXXXXX) && mkdir -p "$D/tmp" "$D/antes" && echo "$D"
git -C /home/dae/PycharmProjects/Neurograph/Neurograph status --short > "$D/copia-principal-antes.txt"; cat "$D/copia-principal-antes.txt"
```

Apunta la ruta que imprime. El estado de la terminal no se conserva entre órdenes: en los pasos siguientes, sustituye `$D` por esa ruta.

La verificación no escribe nada en la copia principal. Aun así, otra sesión trabaja allí en la fase 3, y su `git status` puede cambiar mientras dura la verificación: se guarda el de ahora para distinguirlo al final (Task 7).

La versión anterior es el commit que guardó el Step 0 de la Task 1. Si `leg3d-base.txt` no existe, es el padre del primer commit de esta minifase: `git log --reverse --format=%H --grep='^Legibilidad 3D: ' | head -1`, seguido de `^`. Se saca con `git archive`, que solo lee del repositorio. Lanza estas líneas en una sola orden, porque `BASE_COMMIT` no se conserva de una orden a otra:

```bash
BASE_COMMIT=$(cat /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/leg3d-base.txt) && echo "$BASE_COMMIT" && \
git -C /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d archive "$BASE_COMMIT" frontend | tar -x -C "$D/antes" && \
ln -s /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend/node_modules "$D/antes/frontend/node_modules"
```

Sustituye `$D/antes/frontend/vite.config.ts` por este, con la ruta de `$D` escrita en `cacheDir`, para que la copia no escriba su caché de Vite en `node_modules`:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Copia de la rama antes de la Legibilidad del 3D, solo para comparar
// (Tasks 5 a 7). cacheDir propio, fuera del worktree.
export default defineConfig({
  plugins: [react()],
  cacheDir: '<ruta de $D>/vite-cache-antes',
  server: { port: 5252, strictPort: true },
})
```

- [ ] **Step 3: los dos servidores**

```bash
ss -ltn | grep -E ':(5251|5252) ' || echo "5251 y 5252 libres"
```

Si alguno está ocupado, elige otros dos libres que no sean 5173, 5199, 5230, 5241 ni 5242, y cámbialos en todos estos sitios: el `server.port` del `vite.config.ts` de la copia (Step 2), las dos órdenes de arranque de abajo, `PORT` y `PORT_ANTES` en cada orden que lanza una fase (aquí y en las Tasks 6 y 7), las comprobaciones de puertos de los Steps 0 de las Tasks 6 y 7, y las órdenes que paran los servidores en el Step 5 de la Task 7. Los puertos van en el informe (Step 7).

Arranca los dos en segundo plano (`run_in_background`), cada uno en su orden, y apunta el identificador de tarea de cada uno: también van en el informe.

```bash
cd /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d/frontend && npx vite --port 5251 --strictPort
```

```bash
cd "$D/antes/frontend" && npx vite --port 5252 --strictPort
```

- [ ] **Step 4: los ayudantes**

Crea `$D/lib-3d.cjs`. Lo usan los dos scripts de fases.

Unas notas sobre lo que da por hecho, que la verificación de la fase 1 ya comprobó:

- En la vista «Atlas», el cerebro 3D es la vista grande al cargar (decisión 74), así que su lienzo es `.ws-view--main canvas`. En miniatura es `.ws-view--thumb canvas`, el único lienzo de las miniaturas.
- La cámara empieza en [6, 0, 0], con el eje Z arriba, un campo de visión de 45° y mirando al centroide de todos los nodos del atlas (`Controls`). `projector` reproduce esa proyección: da la posición en el lienzo de un punto de la escena y cuántos píxeles mide allí una unidad. Con la forma «Real (midthickness)» y en la vista translúcida, cada marcador está en su `position3d`, así que se puede proyectar. Con la forma inflada, no.
- `settle` espera a que dos fotos seguidas del lienzo sean iguales, para que una malla que todavía carga o un material que se compila no entren en una captura.
- La selección y el peso mínimo se ponen con los stores de la propia app, importando el módulo que Vite sirve a la página: no es lo que se verifica, y así no depende de acertar con el ratón.

Y sobre lo que añade:

- `launch` guarda los errores y los avisos de la consola, y `recording` hace fallar la fase si algún aviso dice «Atenuación por profundidad: falta…».
- `hideToggle` oculta el interruptor con CSS en las fases que comparan con la versión anterior, para que la barra y el lienzo midan lo mismo. `setFade` lo pulsa igual, con el clic del DOM.
- `downloadWaiter` espera una descarga sin dejar nunca un rechazo sin atender: si la fase falla antes de esperarla, Node no se cierra sin guardar el JSON.

```js
// Ayudantes de la verificación de la Legibilidad del 3D (Tasks 5 y 6 de
// docs/rediseno-interfaz-plan-3d.md). Playwright 1.55 de
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
const CANVAS = ".ws-view--main canvas";
const THUMB_CANVAS = ".ws-view--thumb canvas";
const TOOLBAR = ".ws-view--main .brain3d-toolbar";
const TOGGLE = ".ws-view--main .brain3d-depth-fade button";
const EXPORT = ".ws-view--main .brain3d-toolbar button.export-btn";
const STATUS = ".ws-view--main .brain3d-surface-status";
const FADE_KEY = "neurograph.cerebro3d.atenuar";
const DISPLAY_SCALE = 1 / 40;
// El aviso de logic/depthFade.ts cuando un shader no tiene las anclas del
// parche. Si sale en una fase, esa fase falla.
const PATCH_MISSING = "Atenuación por profundidad: falta";

const out = (name) => path.join(OUT, name);
const save = (name, data) => fs.writeFileSync(out(name), JSON.stringify(data, null, 2));
const readJson = (name) => JSON.parse(fs.readFileSync(out(name), "utf8"));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Los avisos de la consola guardados en un informe: las listas "warnings",
// a cualquier nivel.
function warningsIn(value) {
  if (Array.isArray(value)) return value.flatMap((item) => warningsIn(item));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, v]) => (key === "warnings" && Array.isArray(v) ? v : warningsIn(v)));
}

// Ejecuta una fase y guarda su JSON pase lo que pase: si falla a medias,
// queda lo que se llegó a ver y el error. Falla también si la consola avisó
// de que el parche de la atenuación no se aplicó.
async function recording(name, r, body) {
  try {
    await body();
    const missing = warningsIn(r).filter((w) => w.includes(PATCH_MISSING));
    if (missing.length > 0) throw new Error(`El parche de la atenuación no se aplicó: ${missing[0]}`);
  } catch (e) {
    r.fallo = String(e?.stack ?? e);
    throw e;
  } finally {
    save(name, r);
  }
}

// /regions y /connections de HCP-MMP1.0 salen siempre de los JSON que deja
// «preflight»: GET /connections devuelve las filas en otro orden en cada
// petición, y con él cambia el orden de dibujo. Así las dos versiones dibujan
// lo mismo. Lo demás (clasificaciones, especies) va al backend, solo GET.
// init: script que corre en la página antes que la app. Se guardan los
// errores y los avisos de la consola.
async function launch(width, height, { init } = {}) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
  });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, acceptDownloads: true });
  if (init) await context.addInitScript(init);
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
    const list = m.type() === "error" ? errors : m.type() === "warning" ? warnings : null;
    if (!list) return;
    const url = m.location()?.url;
    list.push(url ? `${m.text()} [${url}]` : m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return { browser, page, errors, warnings };
}

// Carga una versión con un tema. fade: true o false guarda esa preferencia
// antes de cargar; null la borra (vale la de por defecto). La versión
// anterior no la lee. .real-badge es la etiqueta de datos reales de esta
// rama; .data-status--real, la de la fase 3.
async function load(page, { theme = "grafito", fade = null, base = BASE } = {}) {
  await page.goto(base);
  await page.evaluate(
    ([t, key, f]) => {
      localStorage.setItem("neurograph.apariencia", JSON.stringify({ theme: t, paletteMode: null }));
      if (f === null) localStorage.removeItem(key);
      else localStorage.setItem(key, String(f));
    },
    [theme, FADE_KEY, fade],
  );
  await page.reload();
  await page.locator(".data-status--real, .real-badge").first().waitFor({ timeout: 120000 });
}

// La corteza pintada está lista cuando aparece su línea de estado.
const waitPainted = (page) => page.locator(STATUS).first().waitFor({ timeout: 120000 });

// Oculta el interruptor con CSS, solo en las fases que lo piden: así la
// barra y el lienzo miden lo mismo que en la versión anterior.
const hideToggle = (page) => page.addStyleTag({ content: ".brain3d-depth-fade { display: none !important; }" });

// Selección y filtros, con los stores de la propia app: el mismo módulo que
// Vite sirve a la página.
const selectNodes = (page, ids) =>
  page.evaluate(async (list) => (await import("/src/state/selection.ts")).useSelectionStore.getState().selectNodes(list), ids);
const selectConnection = (page, id) =>
  page.evaluate(async (c) => (await import("/src/state/selection.ts")).useSelectionStore.getState().selectConnection(c), id);
const selectionState = (page) =>
  page.evaluate(async () => {
    const { selectedNodeIds, selectedConnectionId } = (await import("/src/state/selection.ts")).useSelectionStore.getState();
    return { nodes: [...selectedNodeIds], connection: selectedConnectionId };
  });
const setMinWeight = (page, weight) =>
  page.evaluate(async (w) => (await import("/src/state/filters.ts")).useFiltersStore.getState().setMinWeight(w), weight);

// Clasificación de red Power 2011, con el segundo desplegable del contexto
// de datos: tiene nodos #000000 y mapa de redes vértice a vértice.
async function choosePower2011(page) {
  await page.locator(".data-menu__trigger").nth(1).click();
  await page.locator('.data-menu__list [role="option"]', { hasText: "Power" }).click();
  await page.locator(".data-menu__trigger", { hasText: "Power 2011" }).waitFor({ timeout: 60000 });
  await page.locator(".data-menu__spinner").waitFor({ state: "detached", timeout: 60000 });
}

// Espera a que un lienzo deje de cambiar: dos fotos seguidas iguales, con
// 600 ms entre ellas. Así una malla que todavía carga o un material que se
// compila no entran en una captura. false si no se asienta en `timeout`.
async function settle(page, timeout = 30000, selector = CANVAS) {
  await page.mouse.move(2, 2);
  const start = Date.now();
  let previous = null;
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(600);
    const current = await page.evaluate((sel) => document.querySelector(sel)?.toDataURL("image/png") ?? null, selector);
    if (current !== null && current === previous) return true;
    previous = current;
  }
  return false;
}

// Con la corteza pintada y una selección, la línea de estado lo dice.
async function waitFocus(page, painted = true) {
  if (painted) await page.locator(STATUS, { hasText: "En color" }).first().waitFor({ timeout: 120000 });
  else await page.locator(CANVAS).waitFor({ timeout: 60000 });
  await page.waitForTimeout(1000);
  return settle(page);
}

// Corteza: "painted", "network-vertices" o "translucent". Forma:
// "midthickness", "inflated" o "very_inflated"; hemisferio: "both", "L" o
// "R". Las dos, solo si no es translúcida.
async function setCortex(page, mode, shape, hemisphere) {
  const selects = page.locator(".ws-view--main .brain3d-surface-controls select");
  await selects.nth(0).selectOption(mode);
  if (shape) await selects.nth(1).selectOption(shape);
  if (hemisphere) await selects.nth(2).selectOption(hemisphere);
  await page.waitForTimeout(1500);
}

// Deja la atenuación como se pide con el interruptor y devuelve su
// aria-pressed. Si está oculto (hideToggle), lo pulsa con el clic del DOM.
async function setFade(page, on) {
  const button = page.locator(TOGGLE);
  if ((await button.getAttribute("aria-pressed")) !== String(on)) {
    if (await button.isVisible()) await button.click();
    else await button.evaluate((b) => b.click());
  }
  await settle(page);
  return button.getAttribute("aria-pressed");
}

async function snapshot(page, name, selector = CANVAS) {
  const dataUrl = await page.evaluate((sel) => document.querySelector(sel).toDataURL("image/png"), selector);
  fs.writeFileSync(out(name), Buffer.from(dataUrl.split(",")[1], "base64"));
  return name;
}

// Espera una descarga. Su rechazo queda atendido desde el principio: si la
// fase falla antes de esperarla, Node no se cierra por un rechazo sin
// atender, y `recording` llega a guardar el JSON.
function downloadWaiter(page, timeout = 60000) {
  const download = page.waitForEvent("download", { timeout });
  download.catch(() => {});
  return download;
}

async function exportJpeg(page, name) {
  const button = page.locator(EXPORT, { hasText: "Exportar JPEG" });
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), button.click()]);
  await download.saveAs(out(name));
  await settle(page);
  return name;
}

// Pasa una vista a grande con la capa de su miniatura (decisión 74).
async function enlarge(page, title) {
  const overlay = page.locator(`button.ws-view__overlay[aria-label="Ver ${title} en grande"]`);
  if (await overlay.count()) await overlay.click();
  await page.locator(".ws-view--main .ws-view__header h2", { hasText: title }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
}

// Tamaño del lienzo: el de su búfer y el de la página (iguales con
// deviceScaleFactor 1).
const canvasBox = (page) =>
  page.evaluate((sel) => {
    const c = document.querySelector(sel);
    const r = c.getBoundingClientRect();
    return { width: c.width, height: c.height, cssWidth: r.width, cssHeight: r.height };
  }, CANVAS);

// --- Geometría de la cámara ---
// Brain3D: cámara en [6, 0, 0], fov 45, eje Z arriba, mirando al centroide
// de todos los nodos del atlas (Controls). Las posiciones de la API van en
// mm; la escena, en mm / 40 (DISPLAY_SCALE). Con la forma «Real
// (midthickness)» y en la translúcida, cada marcador está en position3d.
const scaled = (region) => region.position3d.map((v) => v * DISPLAY_SCALE);

function centroid(regions) {
  const sum = [0, 0, 0];
  for (const region of regions) scaled(region).forEach((v, i) => (sum[i] += v));
  return sum.map((v) => v / regions.length);
}

// Proyección de un punto de la escena a píxeles del lienzo: la de
// THREE.PerspectiveCamera con lookAt. pxPerUnit: cuántos píxeles mide una
// unidad a esa profundidad.
function projector(box, target, { eye = [6, 0, 0], up = [0, 0, 1], fov = 45 } = {}) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => {
    const length = Math.hypot(...a);
    return a.map((v) => v / length);
  };
  const zAxis = unit(sub(eye, target));
  const xAxis = unit(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);
  const f = 1 / Math.tan((fov * Math.PI) / 360);
  const aspect = box.width / box.height;
  return (p) => {
    const d = sub(p, eye);
    const depth = -dot(d, zAxis);
    return {
      x: (((f / aspect) * dot(d, xAxis)) / depth + 1) * (box.width / 2),
      y: (1 - (f * dot(d, yAxis)) / depth) * (box.height / 2),
      depth,
      pxPerUnit: (f / depth) * (box.height / 2),
    };
  };
}

const regionId = (regions, abbreviation, hemisphere) => {
  const row = regions.find((x) => x.abbreviation === abbreviation && x.hemisphere === hemisphere);
  if (!row) throw new Error(`No hay ${abbreviation} (${hemisphere}) en regions.json`);
  return row.id;
};

// Ejecuta la fase que se pide en la línea de órdenes.
function run(phases) {
  const phase = phases[process.argv[2]];
  if (!phase) {
    console.error(`Fase desconocida. Usa: ${Object.keys(phases).join(", ")}`);
    process.exit(1);
  }
  phase(...process.argv.slice(3)).then(
    () => console.log("hecho"),
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}

module.exports = {
  API, ATLAS, BASE, BASE_ANTES, CANVAS, THUMB_CANVAS, TOOLBAR, TOGGLE, EXPORT, FADE_KEY,
  out, save, readJson, wait, recording, launch, load, waitPainted, hideToggle, selectNodes, selectConnection,
  selectionState, setMinWeight, choosePower2011, settle, waitFocus, setCortex, setFade, snapshot, downloadWaiter,
  exportJpeg, enlarge, canvasBox, scaled, centroid, projector, regionId, run,
};
```

- [ ] **Step 5: las fases de la primera parte**

Crea `$D/verify-3d.cjs`. Qué hace cada fase:

- **atenuacion:** en Grafito y en Claro, activada y desactivada: la red Somatomotora y la estrella de 4 derecha con la corteza pintada, y la estrella en la vista translúcida. En Grafito, además, la estrella con la corteza vértice a vértice, que necesita la clasificación Power 2011. También el estilo del interruptor.
- **medida:** cinco regiones cercanas y cinco lejanas, con la corteza pintada (forma real) y con la translúcida, en pantalla y en JPEG: la nueva activada y desactivada, y la anterior en la misma escena, con el mismo lienzo. Al final, en la nueva, un solo hemisferio, el izquierdo, que enseña a la cámara su cara interna: cinco regiones de esa cara y cinco de la externa.
- **persistencia:** la preferencia al recargar; Espacio y Enter con el foco en el interruptor, y Tab desde el selector de hemisferio; la miniatura del 3D, activada y desactivada; y un almacenamiento que falla.
- **barra:** la barra del 3D a 1400 × 900, 1280 × 800 y 1024 × 768, en la nueva, en la anterior y en la nueva con el interruptor oculto, que es el control. Sin selección y con 3b derecha.

```js
// Verificación de la Legibilidad del 3D en la app real, primera parte
// (Task 5 de docs/rediseno-interfaz-plan-3d.md): preflight, atenuacion,
// medida, persistencia y barra. La segunda parte está en verify-3d-b.cjs, y
// el análisis de las imágenes, en analizar-3d.py (Task 7).
//   PORT=5251 PORT_ANTES=5252 TMPDIR=<carpeta>/tmp node verify-3d.cjs <fase>
const fs = require("fs");
const path = require("path");
const {
  API, ATLAS, BASE, BASE_ANTES, CANVAS, THUMB_CANVAS, TOOLBAR, TOGGLE, FADE_KEY,
  out, save, readJson, wait, recording, launch, load, waitPainted, hideToggle, selectNodes, setMinWeight,
  choosePower2011, settle, waitFocus, setCortex, setFade, snapshot, exportJpeg, enlarge, canvasBox, scaled,
  centroid, projector, regionId, run,
} = require("./lib-3d.cjs");

// Datos guardados por la verificación de la fase 1: si siguen ahí, se usan
// los mismos.
const PHASE1 = "/tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/task9-verif-20260924-175218";

// Espera a los dos servidores, deja regions.json y connections.json de
// HCP-MMP1.0 (los de la fase 1 o, si no están, un GET de solo lectura) y
// guarda las regiones con la clasificación Power 2011, la que tiene nodos
// #000000. Código 2 si falta un servidor, el backend o los datos.
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
    for (const [file, endpoint] of [["regions.json", "regions"], ["connections.json", "connections"]]) {
      const saved = path.join(PHASE1, file);
      if (fs.existsSync(saved)) {
        fs.copyFileSync(saved, out(file));
        r[`origen-${file}`] = "fase 1";
      } else {
        const response = await fetch(`${API}/${endpoint}?atlas_id=${ATLAS}`);
        if (!response.ok) throw new Error(`${endpoint}: ${response.status}`);
        fs.writeFileSync(out(file), await response.text());
        r[`origen-${file}`] = "backend";
      }
      r[file] = readJson(file).length;
    }
    const power = await fetch(`${API}/regions?atlas_id=${ATLAS}&network_source=power2011`);
    if (power.ok) {
      fs.writeFileSync(out("regions-power2011.json"), await power.text());
      r.power2011 = readJson("regions-power2011.json").filter((x) => x.network === "power2011.salience").map((x) => `${x.abbreviation} (${x.hemisphere})`);
    } else {
      r.power2011 = `error ${power.status}`;
    }
    r.backend = true;
  } catch (e) {
    r.backend = false;
    r.backendError = String(e);
  }
  save("preflight.json", r);
  console.log(JSON.stringify(r));
  if (!r.nueva || !r.anterior || !r.backend || !(r["regions.json"] > 0) || !(r["connections.json"] > 0)) process.exit(2);
}

// Capturas con la atenuación activada y desactivada, en Grafito y en Claro,
// con la corteza pintada en la forma de por defecto (inflada): la red
// Somatomotora de Cole-Anticevic seleccionada, como en la captura del
// usuario, y la «estrella», una sola región (4 derecha) con el peso mínimo
// en 0, que dibuja sus 359 conexiones. La estrella, también en la vista
// translúcida. En Grafito, además, la estrella con la corteza «vértice a
// vértice», que solo existe con Yeo 2011 y Power 2011.
async function phaseAtenuacion() {
  const regions = readJson("regions.json");
  const somatomotor = regions.filter((x) => x.network === "cole-anticevic.somatomotor").map((x) => x.id);
  const star = [regionId(regions, "4", "R")];
  const report = {};
  await recording("atenuacion.json", report, async () => {
    for (const theme of ["grafito", "claro"]) {
      const { browser, page, errors, warnings } = await launch(1400, 900);
      const r = { errors, warnings };
      report[theme] = r;
      // Una escena, activada y desactivada; la deja activada.
      const scene = async (name, ids, painted) => {
        await selectNodes(page, ids);
        const s = { regiones: ids.length, asentado: await waitFocus(page, painted) };
        r[name] = s;
        s.activada = await setFade(page, true);
        await snapshot(page, `atenuacion-${theme}-${name}-activada.png`);
        s.desactivada = await setFade(page, false);
        await snapshot(page, `atenuacion-${theme}-${name}-desactivada.png`);
        s.otraVez = await setFade(page, true);
        await page.locator(".ws-view--main").screenshot({ path: out(`atenuacion-${theme}-${name}-vista.png`) });
      };
      try {
        await load(page, { theme });
        await waitPainted(page);
        r.alCargar = await page.locator(TOGGLE).getAttribute("aria-pressed");
        await setMinWeight(page, 0);
        await scene("somatomotora", somatomotor, true);
        await scene("estrella", star, true);
        r.boton = await page.locator(TOGGLE).evaluate((b) => {
          const style = getComputedStyle(b);
          return {
            texto: b.textContent,
            clase: b.className,
            letra: parseFloat(style.fontSize) / parseFloat(getComputedStyle(document.documentElement).fontSize),
            color: style.color,
            fondo: style.backgroundColor,
            borde: style.borderTopColor,
            hijoDirectoDeLaBarra: b.parentElement.classList.contains("brain3d-toolbar"),
          };
        });
        await setCortex(page, "translucent");
        await scene("estrella-translucida", star, false);
        if (theme === "grafito") {
          await choosePower2011(page);
          await setCortex(page, "network-vertices");
          await scene("estrella-vertices", star, true);
        }
      } finally {
        await browser.close();
      }
    }
  });
}

// Cinco regiones cercanas y cinco lejanas, repartidas para que ni sus
// marcadores ni sus etiquetas se toquen en pantalla (al menos 44 px entre
// todos los puntos) y lejos del borde. Las cercanas son del hemisferio
// `near`, de la más cercana hacia dentro; las lejanas, del hemisferio
// `far`, de la más lejana hacia dentro. La etiqueta va 0,222 más allá en el
// eje Y de los datos: radio seleccionado 0,042 más 0,18 (logic/markerSize.ts).
function pickNearFar(regions, project, box, near, far) {
  const labelOffset = 0.042 + 0.18;
  const candidates = regions.map((region) => {
    const p = scaled(region);
    return {
      id: region.id,
      abreviatura: region.abbreviation,
      hemisferio: region.hemisphere,
      marcador: project(p),
      etiqueta: project([p[0], p[1] + labelOffset, p[2]]),
    };
  });
  const inside = (q) => q.x > 30 && q.x < box.width - 30 && q.y > 30 && q.y < box.height - 30;
  const chosen = [];
  const pick = (list, lado) => {
    let count = 0;
    for (const c of list) {
      if (count === 5) break;
      if (!inside(c.marcador) || !inside(c.etiqueta)) continue;
      const points = chosen.flatMap((o) => [o.marcador, o.etiqueta]);
      const apart = [c.marcador, c.etiqueta].every((q) => points.every((o) => Math.hypot(q.x - o.x, q.y - o.y) >= 44));
      if (!apart) continue;
      chosen.push({ ...c, lado });
      count++;
    }
  };
  pick(candidates.filter((c) => c.hemisferio === near).sort((a, b) => a.marcador.depth - b.marcador.depth), "cerca");
  pick(candidates.filter((c) => c.hemisferio === far).sort((a, b) => b.marcador.depth - a.marcador.depth), "lejos");
  return chosen.map(({ id, abreviatura, hemisferio, lado }) => ({ id, abreviatura, hemisferio, lado }));
}

// Dónde quedan en el lienzo el marcador y la etiqueta de cada región, con la
// separación de la etiqueta de cada versión: 0,222 en la nueva y 0,24 en la
// anterior.
function placeRegions(regions, chosen, project, labelOffset) {
  return chosen.map((c) => {
    const p = scaled(regions.find((x) => x.id === c.id));
    return { ...c, marcador: project(p), etiqueta: project([p[0], p[1] + labelOffset, p[2]]) };
  });
}

// Lo cercano y lo lejano, con la atenuación activada y desactivada, en la
// corteza pintada (forma real: cada marcador en su position3d) y en la
// translúcida (esferas en su posición real). Sin líneas: peso mínimo 1. En
// pantalla y en el JPEG. La versión anterior, en la misma escena, es la
// referencia de la desactivada. En la nueva se oculta el interruptor, como
// en `comparar`, para que el lienzo mida lo mismo que en la anterior. Al
// final, en la nueva, un solo hemisferio: el izquierdo, que enseña a la
// cámara su cara interna, con cinco regiones de esa cara y cinco de la
// externa. analizar-3d.py mide los marcadores y las etiquetas en las
// posiciones proyectadas.
async function phaseMedida() {
  const regions = readJson("regions.json");
  const target = centroid(regions);
  const r = {};
  await recording("medida.json", r, async () => {
    for (const [version, base] of [["nueva", BASE], ["anterior", BASE_ANTES]]) {
      const { browser, page, errors, warnings } = await launch(1400, 900);
      const v = { errors, warnings };
      r[version] = v;
      try {
        await load(page, { theme: "grafito", base });
        if (version === "nueva") await hideToggle(page);
        await waitPainted(page);
        await setMinWeight(page, 1);
        await setCortex(page, "painted", "midthickness");
        if (!r.elegidas) {
          const box = await canvasBox(page);
          r.elegidas = pickNearFar(regions, projector(box, target), box, "R", "L");
        }
        await selectNodes(page, r.elegidas.map((x) => x.id));
        for (const modo of ["pintada", "translucida"]) {
          if (modo === "translucida") await setCortex(page, "translucent");
          const m = { asentado: await waitFocus(page, modo === "pintada"), lienzo: await canvasBox(page) };
          v[modo] = m;
          // Sin la línea de estado, el lienzo translúcido es más alto: los
          // puntos se proyectan con el lienzo de cada modo.
          m.regiones = placeRegions(regions, r.elegidas, projector(m.lienzo, target), version === "nueva" ? 0.222 : 0.24);
          for (const estado of version === "nueva" ? ["activada", "desactivada"] : ["anterior"]) {
            if (version === "nueva") m[estado] = await setFade(page, estado === "activada");
            else await settle(page);
            await snapshot(page, `medida-${modo}-${estado}.png`);
            await exportJpeg(page, `medida-${modo}-${estado}.jpg`);
          }
        }
        if (version === "nueva") {
          await setCortex(page, "painted", "midthickness", "L");
          const h = { lienzo: await canvasBox(page) };
          v.hemisferio = h;
          const project = projector(h.lienzo, target);
          const left = pickNearFar(regions, project, h.lienzo, "L", "L");
          await selectNodes(page, left.map((x) => x.id));
          h.asentado = await waitFocus(page);
          h.regiones = placeRegions(regions, left, project, 0.222);
          for (const estado of ["activada", "desactivada"]) {
            h[estado] = await setFade(page, estado === "activada");
            await snapshot(page, `medida-hemisferio-${estado}.png`);
          }
        }
      } finally {
        await browser.close();
      }
    }
  });
}

// El interruptor se guarda en este navegador: sobrevive a la recarga. Con
// el teclado, Espacio y Enter lo alternan sin que pierda el foco, y se llega
// a él con Tab desde el selector de hemisferio. Las miniaturas no tienen
// barra, pero siguen la preferencia. Con un almacenamiento que falla, vale
// el de por defecto y sigue funcionando.
async function phasePersistencia() {
  const regions = readJson("regions.json");
  const r = {};
  await recording("persistencia.json", r, async () => {
    const pressed = (page) => page.locator(TOGGLE).getAttribute("aria-pressed");
    const stored = (page) => page.evaluate((key) => localStorage.getItem(key), FADE_KEY);
    const state = async (page) => ({ pulsado: await pressed(page), guardado: await stored(page) });
    const focused = (page) => page.evaluate((sel) => document.activeElement === document.querySelector(sel), TOGGLE);
    const first = await launch(1400, 900);
    r.errors = first.errors;
    r.warnings = first.warnings;
    try {
      const { page } = first;
      await load(page, { theme: "grafito" });
      await waitPainted(page);
      r.porDefecto = await state(page);
      await page.locator(TOGGLE).click();
      r.trasDesactivar = await state(page);
      await page.reload();
      await waitPainted(page);
      r.trasRecargar = await state(page);
      await page.locator(TOGGLE).click();
      await page.reload();
      await waitPainted(page);
      r.activadaYRecargada = await state(page);

      // Teclado. React aplica el estado después del evento: se lee tras una
      // pausa corta.
      r.teclado = {};
      await page.locator(TOGGLE).focus();
      for (const [name, key] of [["espacio", "Space"], ["enter", "Enter"]]) {
        await page.keyboard.press(key);
        await page.waitForTimeout(300);
        r.teclado[name] = { ...(await state(page)), foco: await focused(page) };
      }
      await page.locator(".ws-view--main .brain3d-surface-controls label", { hasText: "Hemisferio" }).locator("select").focus();
      await page.keyboard.press("Tab");
      r.teclado.tabDesdeHemisferio = await focused(page);

      // Miniatura: la estrella de 4 derecha con el 3D en miniatura (el
      // connectograma en grande), activada y desactivada. Se cambia en el
      // 3D en grande, que es donde está el interruptor.
      await setMinWeight(page, 0);
      await selectNodes(page, [regionId(regions, "4", "R")]);
      await waitFocus(page);
      r.miniatura = {};
      for (const on of [true, false]) {
        const estado = on ? "activada" : "desactivada";
        await setFade(page, on);
        await enlarge(page, "Connectograma");
        const t = { asentado: await settle(page, 30000, THUMB_CANVAS) };
        r.miniatura[estado] = t;
        t.barra = await page.locator(".ws-view--thumb .brain3d-toolbar, .ws-view--thumb .brain3d-depth-fade").count();
        t.lienzo = await page.locator(THUMB_CANVAS).evaluate((c) => [c.width, c.height]);
        await snapshot(page, `persistencia-miniatura-${estado}.png`, THUMB_CANVAS);
        await enlarge(page, "Cerebro 3D");
        await waitFocus(page);
      }
    } finally {
      await first.browser.close();
    }
    // localStorage que falla en cada lectura y escritura (también el tema).
    const failing = await launch(1400, 900, {
      init: () => {
        Storage.prototype.getItem = () => {
          throw new Error("almacenamiento no disponible");
        };
        Storage.prototype.setItem = () => {
          throw new Error("almacenamiento no disponible");
        };
      },
    });
    r.conAlmacenamientoRoto = { errors: failing.errors, warnings: failing.warnings };
    try {
      const { page } = failing;
      await page.goto(BASE);
      await page.locator(".data-status--real, .real-badge").first().waitFor({ timeout: 120000 });
      await waitPainted(page);
      r.conAlmacenamientoRoto.alCargar = await pressed(page);
      await page.locator(TOGGLE).click();
      r.conAlmacenamientoRoto.trasPulsar = await pressed(page);
    } finally {
      await failing.browser.close();
    }
  });
}

// La barra del 3D: su alto, sus filas (los `top` distintos de sus
// controles; una fila nueva empieza 8 px o más por debajo de la anterior,
// porque en una misma fila un select y un botón no empiezan a la misma
// altura exacta), la fila del interruptor y la de «Exportar JPEG», y el alto
// del lienzo.
function measureToolbar(page) {
  return page.evaluate(
    ([toolbar, canvas]) => {
      const bar = document.querySelector(toolbar);
      if (!bar) return null;
      const box = (e) => e.getBoundingClientRect();
      const shown = (e) => e && box(e).height > 0;
      const controls = [...bar.querySelectorAll("select, button, input")].filter(shown);
      const tops = [...new Set(controls.map((e) => Math.round(box(e).top)))].sort((a, b) => a - b);
      const rows = tops.filter((top, i) => i === 0 || top - tops[i - 1] >= 8);
      const rowOf = (e) => (shown(e) ? rows.filter((top) => top <= Math.round(box(e).top)).length : null);
      const toggle = bar.querySelector(".brain3d-depth-fade button");
      const exportButton = [...bar.querySelectorAll("button")].find((b) => b.textContent.includes("Exportar JPEG"));
      const c = document.querySelector(canvas);
      return {
        alto: Math.round(box(bar).height),
        tops,
        filas: rows.length,
        filaInterruptor: rowOf(toggle),
        filaExportar: rowOf(exportButton),
        lienzoAlto: c ? Math.round(box(c).height) : null,
      };
    },
    [TOOLBAR, CANVAS],
  );
}

// La barra a 1400 × 900, 1280 × 800 y 1024 × 768, en la versión nueva, en
// la anterior y en la nueva con el interruptor oculto, que es el control:
// tiene que medir lo mismo que la anterior. Con la corteza pintada, sin
// selección (D1b: la barra no cambia de alto al seleccionar) y con 3b
// derecha seleccionada, con una captura de la vista.
async function phaseBarra() {
  const regions = readJson("regions.json");
  const sizes = [[1400, 900], [1280, 800], [1024, 768]];
  const report = {};
  await recording("barra.json", report, async () => {
    for (const [variant, base, hide] of [["nueva", BASE, false], ["anterior", BASE_ANTES, false], ["nueva-sin-interruptor", BASE, true]]) {
      const { browser, page, errors, warnings } = await launch(...sizes[0]);
      const r = { errors, warnings };
      report[variant] = r;
      try {
        await load(page, { theme: "grafito", base });
        if (hide) await hideToggle(page);
        await waitPainted(page);
        for (const selection of ["sinSeleccion", "conSeleccion"]) {
          if (selection === "conSeleccion") {
            await selectNodes(page, [regionId(regions, "3b", "R")]);
            await waitFocus(page);
          }
          for (const [width, height] of sizes) {
            const size = `${width}x${height}`;
            await page.setViewportSize({ width, height });
            await page.waitForTimeout(800);
            await settle(page);
            r[size] = { ...r[size], [selection]: await measureToolbar(page) };
            if (selection === "conSeleccion") await page.locator(".ws-view--main").screenshot({ path: out(`barra-${variant}-${size}.png`) });
          }
        }
      } finally {
        await browser.close();
      }
    }
  });
}

run({
  preflight: phasePreflight,
  atenuacion: phaseAtenuacion,
  medida: phaseMedida,
  persistencia: phasePersistencia,
  barra: phaseBarra,
});
```

- [ ] **Step 6: ejecutar**

Primero «preflight», que espera a los dos servidores, deja los datos de HCP-MMP1.0 y guarda las regiones con la clasificación Power 2011. Tarda menos de 5 minutos, así que puede ir en primer plano:

```bash
cd "$D" && PORT=5251 PORT_ANTES=5252 TMPDIR="$D/tmp" timeout 300 node verify-3d.cjs preflight
```

Si termina con código 2, mira `preflight.json`. Si falta el backend o los datos, no lances las demás fases: dilo en el informe y pasa a la Task 7 solo para parar los servidores. Si falta un servidor, revisa el Step 3.

Después, cada fase en segundo plano, una tras otra: `atenuacion`, `medida`, `persistencia` y `barra`. Espera el aviso de que ha terminado antes de lanzar la siguiente.

```bash
cd "$D" && PORT=5251 PORT_ANTES=5252 TMPDIR="$D/tmp" timeout 1800 node verify-3d.cjs atenuacion
```

Tras cada una, comprueba que no quedan navegadores sueltos. En el patrón, `tm[p]` encuentra `tmp` en la línea de órdenes de los navegadores, pero no en la de la propia búsqueda:

```bash
pgrep -af "$D/tm[p]" || echo "sin navegadores sueltos"
```

Expected: «sin navegadores sueltos». Si lista alguno, ciérralos y vuelve a comprobar:

```bash
pkill -f "$D/tm[p]"
```

Si una fase falla por una suposición del script (un selector, un tiempo de espera), corrígela, anótalo y repite esa fase. Si falla por la app, sigue: la Task 7 revisa todo y corrige.

- [ ] **Step 7: el informe de la tarea**

Los servidores siguen en marcha: las Tasks 6 y 7 los usan, y la 7 los para. El informe da lo que necesitan para seguir:

- la ruta de `$D`;
- los dos puertos (5251 y 5252, o los que los sustituyeran);
- el identificador de tarea en segundo plano de cada servidor;
- por fase, si terminó («hecho») o su `fallo`, y las correcciones de los scripts, si las hubo.

---

## Chunk 6: verificación en la app real, segunda parte

### Task 6: verificación en la app real: marcadores, captura y comparación

**Files:**
- Create: en la carpeta de la Task 5, `verify-3d-b.cjs` y lo que genere. Nada de esto entra en el repositorio.

Las reglas del navegador y de honestidad son las de la Task 5.

- [ ] **Step 0: la carpeta y los servidores de la Task 5**

`$D` es la carpeta que da el informe de la Task 5. Si no la tienes, es la carpeta `leg3d-verif-*` más reciente del scratchpad:

```bash
ls -dt /tmp/claude-1000/-home-dae-PycharmProjects-Neurograph-Neurograph/6f1cd430-11e0-4483-a66a-eec44d813eed/scratchpad/leg3d-verif-* | head -1
```

Comprueba que los dos servidores siguen escuchando en los puertos del informe (5251 y 5252, si no se cambiaron):

```bash
ss -ltn | grep -E ':(5251|5252) '
```

Expected: dos líneas. Si falta alguno, arráncalo otra vez en segundo plano con su orden del Step 3 de la Task 5 y apunta su nuevo identificador de tarea. Después, «preflight» espera a que los dos respondan:

```bash
cd "$D" && PORT=5251 PORT_ANTES=5252 TMPDIR="$D/tmp" timeout 300 node verify-3d.cjs preflight
```

- [ ] **Step 1: las fases de la segunda parte**

Crea `$D/verify-3d-b.cjs`. Qué hace cada fase:

- **marcadores:** en la versión nueva y en la anterior, con la vista translúcida (las esferas en su posición real, sin la corteza encima) y la atenuación desactivada:
  - una región seleccionada sola, para medir su marcador;
  - los dos extremos de una conexión seleccionada, que no están seleccionados, para medir el marcador normal de través a la línea;
  - la zona de clic de uno de esos extremos: un clic a 0,05 de su centro (dentro del radio de 0,06, el de antes) y otro a 0,08 (fuera). La línea recibe también el clic, porque three.js toca una línea a menos de 1 unidad, y vuelve a seleccionar la conexión: se mira la secuencia de cambios del store, no el estado final;
  - la zona de clic de dos regiones seleccionadas: un clic en el centro de un marcador lo quita de la selección, y otro a 0,072 del centro de un segundo marcador (fuera del marcador nuevo, dentro del radio de antes) también.

  Después, el anillo de un nodo `#000000` en la versión nueva, en Grafito y en Claro, con la corteza pintada (forma real) y con la translúcida. Con la clasificación Power 2011, 9-46d derecha es de la red Saliencia, `#000000`: el script lo comprueba antes de seguir. Se selecciona la región derecha cuya conexión más fuerte es con ella, y el peso mínimo se pone justo por debajo de esa conexión: 9-46d queda como vecina, sin seleccionar, así que sin el brillo de la selección y con el anillo neutro.
- **captura:** los fotogramas del lienzo justo antes de pulsar «Exportar JPEG», en los seis siguientes y 500 ms después, en la versión nueva y en la anterior, que sirve de control: en ella sí se ven fotogramas con los colores de exportación (D3). Grafito, 3b derecha y peso mínimo 4,0e-3, como en la fase 1. `aria-disabled` se lee tras la microtarea en la que React 19 aplica el clic. En la nueva, además: el JPEG, dos dobles clics (el de Playwright y el síncrono de la fase 1, dos `click()` seguidos), con una sola descarga cada uno, y la exportación con el teclado, que no pierde el foco.
- **comparar:** la versión nueva con la atenuación desactivada contra la anterior, con el mismo lienzo. En la nueva se oculta el interruptor, solo en esta fase, para que la barra y el lienzo midan lo mismo que en la anterior. Corteza pintada, forma real. Sin selección, el JPEG tiene que salir igual. Con la red Somatomotora y el peso mínimo en 0, las líneas tienen que ser iguales fuera de los marcadores y de las etiquetas, que sí cambian.

```js
// Verificación de la Legibilidad del 3D en la app real, segunda parte
// (Task 6 de docs/rediseno-interfaz-plan-3d.md): marcadores, captura y
// comparar. Usa los datos que dejó «preflight» (Task 5).
//   PORT=5251 PORT_ANTES=5252 TMPDIR=<carpeta>/tmp node verify-3d-b.cjs <fase>
const fs = require("fs");
const {
  BASE, BASE_ANTES, CANVAS, EXPORT,
  out, readJson, recording, launch, load, waitPainted, hideToggle, selectNodes, selectConnection, selectionState,
  setMinWeight, choosePower2011, settle, waitFocus, setCortex, snapshot, downloadWaiter, exportJpeg, canvasBox,
  scaled, centroid, projector, regionId, run,
} = require("./lib-3d.cjs");

const inside = (box, q, margin) => q.x > margin && q.x < box.width - margin && q.y > margin && q.y < box.height - margin;

// Zona de clic de un marcador no seleccionado (radio 0,06, como antes): el
// extremo `a` de la conexión seleccionada. Un clic a 0,05 de su centro, de
// través a la línea, cae dentro; uno a 0,08, fuera. La línea también recibe
// el clic, porque three.js la toca a menos de 1 unidad, y vuelve a
// seleccionar la conexión: el estado final no sirve. Se mira la secuencia
// de cambios del store: si la zona de clic recibe el clic, toggleNode deja
// un momento el extremo en la selección.
async function clickNearEndpoint(page, choice) {
  const rect = await page.locator(CANVAS).boundingBox();
  const { a, b } = choice;
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const across = [-(b.y - a.y) / length, (b.x - a.x) / length];
  const result = [];
  for (const distance of [0.05, 0.08]) {
    await page.evaluate(async () => {
      const { useSelectionStore } = await import("/src/state/selection.ts");
      window.__cambios = [];
      window.__dejarDeMirar = useSelectionStore.subscribe((s) => window.__cambios.push([...s.selectedNodeIds]));
    });
    const px = distance * a.pxPerUnit;
    await page.mouse.click(rect.x + a.x + across[0] * px, rect.y + a.y + across[1] * px);
    await page.waitForTimeout(600);
    const changes = await page.evaluate(() => {
      window.__dejarDeMirar();
      return window.__cambios;
    });
    result.push({ distancia: distance, desplazamientoPx: px, cambios: changes, tocoLaZonaDeClic: changes.some((ids) => ids.includes(choice.source)) });
    await selectConnection(page, choice.id);
    await waitFocus(page, false);
  }
  return result;
}

// Tamaño de los marcadores y zona de clic, en la versión nueva y en la
// anterior, con la corteza translúcida (las esferas en su posición real y
// sin la corteza encima) y la atenuación desactivada. Después, el anillo
// de los nodos #000000 en la versión nueva, en Grafito y en Claro.
async function phaseMarcadores() {
  const regions = readJson("regions.json");
  const connections = readJson("connections.json");
  const byId = new Map(regions.map((x) => [x.id, x]));
  const target = centroid(regions);
  const report = {};
  await recording("marcadores.json", report, async () => {
    for (const [version, base] of [["nueva", BASE], ["anterior", BASE_ANTES]]) {
      const { browser, page, errors, warnings } = await launch(1400, 900);
      const r = { errors, warnings };
      report[version] = r;
      try {
        await load(page, { theme: "grafito", base, fade: false });
        await waitPainted(page);
        // Seleccionado: 4 derecha sola, sin líneas (peso mínimo 1).
        const selected = regionId(regions, "4", "R");
        await setMinWeight(page, 1);
        await selectNodes(page, [selected]);
        await setCortex(page, "translucent");
        const s = { asentado: await waitFocus(page, false), lienzo: await canvasBox(page) };
        r.seleccionado = s;
        const project = projector(s.lienzo, target);
        s.punto = project(scaled(byId.get(selected)));
        await snapshot(page, `marcadores-${version}-seleccionado.png`);

        // No seleccionados: los dos extremos de una conexión seleccionada,
        // en el hemisferio derecho, delante del centro y a más de 120 px.
        const middle = project(target).depth;
        const nearRight = (id) => byId.get(id)?.hemisphere === "R" && project(scaled(byId.get(id))).depth < middle - 0.5;
        const choice = connections
          .filter((c) => nearRight(c.source) && nearRight(c.target))
          .map((c) => ({ id: c.id, source: c.source, a: project(scaled(byId.get(c.source))), b: project(scaled(byId.get(c.target))) }))
          .find(({ a, b }) => Math.hypot(a.x - b.x, a.y - b.y) > 120 && inside(s.lienzo, a, 40) && inside(s.lienzo, b, 40));
        if (!choice) throw new Error("No hay una conexión adecuada para medir los marcadores no seleccionados");
        await setMinWeight(page, 0);
        await selectConnection(page, choice.id);
        r.noSeleccionados = { ...choice, asentado: await waitFocus(page, false), lienzo: await canvasBox(page) };
        await snapshot(page, `marcadores-${version}-no-seleccionados.png`);
        r.clicNoSeleccionado = await clickNearEndpoint(page, choice);

        // Zona de clic: dos regiones seleccionadas y separadas, sin líneas.
        // Un clic en el centro de la primera la quita; uno a 0,072 (0,8
        // veces el radio de antes, 0,09) del centro de la segunda, fuera del
        // marcador nuevo, también.
        const candidates = regions
          .filter((x) => nearRight(x.id))
          .map((x) => ({ id: x.id, p: project(scaled(x)) }))
          .filter((x) => inside(s.lienzo, x.p, 60));
        const first = candidates[0];
        const second = candidates.find((x) => Math.hypot(x.p.x - first.p.x, x.p.y - first.p.y) > 150);
        if (!first || !second) throw new Error("No hay dos regiones adecuadas para la zona de clic");
        await setMinWeight(page, 1);
        await selectNodes(page, [first.id, second.id]);
        const c = { asentado: await waitFocus(page, false) };
        r.clic = c;
        const rect = await page.locator(CANVAS).boundingBox();
        await page.mouse.click(rect.x + first.p.x, rect.y + first.p.y);
        await page.waitForTimeout(600);
        c.trasClicEnElCentro = (await selectionState(page)).nodes;
        c.desplazamientoPx = 0.072 * second.p.pxPerUnit;
        await page.mouse.click(rect.x + second.p.x + c.desplazamientoPx, rect.y + second.p.y);
        await page.waitForTimeout(600);
        c.trasClicAUnLado = (await selectionState(page)).nodes;
        c.regiones = [first.id, second.id];
      } finally {
        await browser.close();
      }
    }

    // Anillo de los nodos #000000: con Power 2011, 9-46d derecha es de la red
    // Saliencia, #000000 (se comprueba aquí). Se selecciona la región derecha
    // cuya conexión más fuerte es con ella y el peso mínimo se pone justo por
    // debajo de esa conexión: se ven las dos y la línea que las une. 9-46d
    // derecha es vecina, así que no está seleccionada: sin el brillo de la
    // selección y con el anillo neutro.
    const power = readJson("regions-power2011.json");
    const salience = new Set(power.filter((x) => x.network === "power2011.salience").map((x) => x.id));
    const black = regionId(regions, "9-46d", "R");
    report.negroEsDeSaliencia = salience.has(black);
    if (!salience.has(black)) throw new Error("9-46d derecha no es de la red Saliencia en Power 2011: no es un nodo #000000");
    const weightTo = new Map();
    for (const c of connections) {
      if (c.source === black) weightTo.set(c.target, c.weight);
      if (c.target === black) weightTo.set(c.source, c.weight);
    }
    const [partner] = regions
      .filter((x) => x.hemisphere === "R" && !salience.has(x.id) && weightTo.has(x.id))
      .map((x) => {
        const w = weightTo.get(x.id);
        const neighbours = connections.filter((c) => (c.source === x.id || c.target === x.id) && c.weight >= w).length;
        return { id: x.id, abreviatura: x.abbreviation, peso: w, vecinas: neighbours };
      })
      .sort((a, b) => a.vecinas - b.vecinas || b.peso - a.peso);
    if (!partner) throw new Error("Ninguna región derecha fuera de Saliencia conecta con 9-46d derecha");
    for (const theme of ["grafito", "claro"]) {
      const { browser, page, errors, warnings } = await launch(1400, 900);
      const r = { errors, warnings, pareja: partner };
      report[`anillo-${theme}`] = r;
      try {
        await load(page, { theme, fade: false });
        await waitPainted(page);
        await choosePower2011(page);
        await setMinWeight(page, partner.peso * 0.999);
        await selectNodes(page, [partner.id]);
        for (const [modo, mode, shape] of [["pintada", "painted", "midthickness"], ["translucida", "translucent", undefined]]) {
          await setCortex(page, mode, shape);
          const m = { asentado: await waitFocus(page, mode === "painted"), lienzo: await canvasBox(page) };
          const project = projector(m.lienzo, target);
          m.negro = project(scaled(byId.get(black)));
          m.pareja = project(scaled(byId.get(partner.id)));
          r[modo] = m;
          await snapshot(page, `anillo-${theme}-${modo}.png`);
        }
      } finally {
        await browser.close();
      }
    }
  });
}

// Fotogramas alrededor de una exportación 3D, en la versión nueva y en la
// anterior, que sirve de control: en ella sí se ven fotogramas con los
// colores de exportación. Grafito, 3b derecha y peso mínimo 4,0e-3, como en
// la fase 1. En la nueva, además: un doble clic (el de Playwright y el
// síncrono de la fase 1) da una sola descarga, y al exportar con el teclado
// el botón conserva el foco.
async function phaseCaptura() {
  const regions = readJson("regions.json");
  const report = {};
  await recording("captura.json", report, async () => {
    for (const [version, base] of [["nueva", BASE], ["anterior", BASE_ANTES]]) {
      const { browser, page, errors, warnings } = await launch(1400, 900);
      const r = { errors, warnings };
      report[version] = r;
      try {
        await load(page, { theme: "grafito", base });
        await waitPainted(page);
        await setMinWeight(page, 10 ** -2.4);
        await selectNodes(page, [regionId(regions, "3b", "R")]);
        r.asentado = await waitFocus(page);
        r.lienzo = await canvasBox(page);
        const download = downloadWaiter(page);
        const frames = await page.evaluate(
          async ([canvasSelector, exportSelector]) => {
            const canvas = document.querySelector(canvasSelector);
            const grab = () => canvas.toDataURL("image/png");
            const button = [...document.querySelectorAll(exportSelector)].find((b) => b.textContent.includes("Exportar JPEG"));
            const result = { antes: grab() };
            button.click();
            // React 19 aplica el estado del clic en una microtarea: se lee
            // después, como en la fase 1 (task9-final-20260924-194434/final.cjs).
            await Promise.resolve();
            result.ariaDisabledTrasClic = button.getAttribute("aria-disabled");
            for (let i = 1; i <= 6; i++) {
              await new Promise((resolve) => requestAnimationFrame(resolve));
              result[`f${i}`] = grab();
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
            result.despues = grab();
            result.ariaDisabledDespues = button.getAttribute("aria-disabled");
            return result;
          },
          [CANVAS, EXPORT],
        );
        for (const [key, value] of Object.entries(frames)) {
          if (key.startsWith("aria")) r[key] = value;
          else fs.writeFileSync(out(`captura-${version}-${key}.png`), Buffer.from(value.split(",")[1], "base64"));
        }
        await (await download).saveAs(out(`captura-${version}.jpg`));
        if (version === "nueva") {
          const button = page.locator(EXPORT, { hasText: "Exportar JPEG" });
          let downloads = 0;
          page.on("download", () => downloads++);
          await button.dblclick();
          await page.waitForTimeout(4000);
          r.descargasConDobleClic = downloads;
          // El doble clic síncrono de la fase 1: dos click() seguidos, sin
          // que React aplique el estado entre uno y otro. Lo descarta el
          // reductor de las fases.
          downloads = 0;
          await page.evaluate((selector) => {
            const b = [...document.querySelectorAll(selector)].find((x) => x.textContent.includes("Exportar JPEG"));
            b.click();
            b.click();
          }, EXPORT);
          await page.waitForTimeout(4000);
          r.descargasConDobleClicSincrono = downloads;
          await button.focus();
          const keyboardDownload = downloadWaiter(page);
          await page.keyboard.press("Enter");
          await keyboardDownload;
          await page.waitForTimeout(1000);
          // Con `disabled`, el botón perdía el foco al exportar y no lo
          // recuperaba (D3): si sigue en él, no lo perdió.
          r.teclado = await page.evaluate((selector) => {
            const b = [...document.querySelectorAll(selector)].find((x) => x.textContent.includes("Exportar JPEG"));
            return { focoEnElBoton: document.activeElement === b, ariaDisabled: b.getAttribute("aria-disabled") };
          }, EXPORT);
        }
      } finally {
        await browser.close();
      }
    }
  });
}

// La versión nueva con la atenuación desactivada contra la anterior, con los
// mismos datos y el mismo lienzo. En la nueva se oculta el interruptor, solo
// en esta fase, para que la barra y el lienzo midan lo mismo que en la
// anterior. Corteza pintada, forma real. Sin selección, el JPEG tiene que
// salir igual: la captura fuera de pantalla da los colores de siempre. Con
// la red Somatomotora y el peso mínimo en 0, fuera de los marcadores y de
// las etiquetas, que sí cambian, las líneas tienen que ser iguales.
async function phaseComparar() {
  const regions = readJson("regions.json");
  const somatomotor = regions.filter((x) => x.network === "cole-anticevic.somatomotor");
  const target = centroid(regions);
  const report = {};
  await recording("comparar.json", report, async () => {
    for (const [version, base] of [["nueva", BASE], ["anterior", BASE_ANTES]]) {
      const { browser, page, errors, warnings } = await launch(1400, 900);
      const r = { errors, warnings };
      report[version] = r;
      try {
        await load(page, { theme: "grafito", base, fade: false });
        if (version === "nueva") await hideToggle(page);
        await waitPainted(page);
        await setCortex(page, "painted", "midthickness");
        r.sinSeleccion = { asentado: await settle(page), lienzo: await canvasBox(page) };
        await exportJpeg(page, `comparar-${version}-sin-seleccion.jpg`);
        await setMinWeight(page, 0);
        await selectNodes(page, somatomotor.map((x) => x.id));
        const m = { asentado: await waitFocus(page), lienzo: await canvasBox(page) };
        r.somatomotora = m;
        const project = projector(m.lienzo, target);
        m.puntos = somatomotor.map((x) => {
          const p = scaled(x);
          return {
            marcador: project(p),
            etiquetaAntes: project([p[0], p[1] + 0.24, p[2]]),
            etiquetaNueva: project([p[0], p[1] + 0.222, p[2]]),
          };
        });
        await snapshot(page, `comparar-${version}-somatomotora.png`);
        await exportJpeg(page, `comparar-${version}-somatomotora.jpg`);
      } finally {
        await browser.close();
      }
    }
  });
}

run({
  marcadores: phaseMarcadores,
  captura: phaseCaptura,
  comparar: phaseComparar,
});
```

- [ ] **Step 2: ejecutar**

Cada fase en segundo plano, una tras otra, como en la Task 5: `marcadores`, `captura` y `comparar`. Espera el aviso de que ha terminado antes de lanzar la siguiente, y comprueba después de cada una que no quedan navegadores sueltos (la misma orden con `pgrep`).

```bash
cd "$D" && PORT=5251 PORT_ANTES=5252 TMPDIR="$D/tmp" timeout 1800 node verify-3d-b.cjs marcadores
```

Si una fase falla por una suposición del script, corrígela, anótalo y repite esa fase. Si falla por la app, sigue: la Task 7 revisa todo y corrige.

- [ ] **Step 3: el informe de la tarea**

Como el de la Task 5, para la Task 7: la ruta de `$D`, los dos puertos, el identificador de tarea de cada servidor (siguen en marcha) y, por fase, si terminó o su `fallo`, con las correcciones de los scripts.

---

## Chunk 7: análisis, revisión y borrador de la decisión

### Task 7: análisis de las imágenes, revisión y borrador de la decisión

**Files:**
- Create: en la carpeta de la Task 5, `analizar-3d.py`, `analisis.json` y `decision-borrador.md`. Nada de esto entra en el repositorio.
- Modify: solo si algo no cuadra (Step 4), los archivos de la tarea de la que venga el fallo.

Las reglas del navegador y de honestidad son las de la Task 5.

- [ ] **Step 0: la carpeta y los servidores**

Como el Step 0 de la Task 6, con el informe de la Task 6: recupera `$D` y comprueba con `ss -ltn` que los dos servidores siguen escuchando. Si falta alguno, arráncalo otra vez (Step 3 de la Task 5) y apunta su identificador. Aquí solo hacen falta para repetir fases tras un arreglo (Step 4), y al final se paran (Step 5).

- [ ] **Step 1: el análisis de las imágenes**

Crea `$D/analizar-3d.py`. Usa numpy y Pillow, que ya están en el sistema. Mide:

- **medida:** en cada región elegida, el contraste de su etiqueta (la diferencia media de luminancia con el fondo alrededor de su centro) y el de su marcador (la distancia de color entre su centro y un anillo de muestras 5 px por fuera del contorno), en crudo y como razón entre la captura con la atenuación y la captura sin ella: 1 es igual y 0, invisible. La etiqueta es texto sobre fondo transparente y su contraste sigue a la opacidad: da los umbrales. El del marcador no, porque atenuado deja ver su contorno a través del relleno: lo lejano se compara con lo cercano. Además, la nueva desactivada contra la anterior, región a región, y lo mismo con un solo hemisferio.
- **tamanos:** el diámetro de cada marcador, buscando su borde desde fuera, contra el diámetro esperado de su contorno en pantalla. Las proporciones, con cada diámetro en unidades de la escena.
- **anillo:** el perfil de luminancia de través a la línea en el nodo `#000000`: el núcleo (la mediana del relleno, lejos de la línea que va a la pareja), el fondo y lo que se aparta de los dos, que es el anillo.
- **captura:** cuántos píxeles de cada fotograma difieren del de antes, y el tamaño y las esquinas de los JPEG.
- **comparar:** los píxeles distintos entre las dos versiones, fuera de unas máscaras sobre los marcadores y las etiquetas de las dos: 4 px más anchas en pantalla y 16 en el JPEG, que comprime en bloques.
- **barra** y **miniatura:** el resumen de la barra a los tres tamaños, y cuánto cambia la miniatura de activada a desactivada.
- **consola:** los errores y los avisos de cada fase.

```python
#!/usr/bin/env python3
"""Análisis de las imágenes de la verificación de la Legibilidad del 3D
(Task 7 de docs/rediseno-interfaz-plan-3d.md).

    python3 analizar-3d.py <carpeta>

Lee los JSON y las imágenes que dejaron verify-3d.cjs y verify-3d-b.cjs en
la carpeta y escribe analisis.json. Lo que falte queda como "falta": esa
comprobación es «sin comprobar».
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

D = Path(sys.argv[1])
report = {}

# Radios de la escena (logic/markerSize.ts y los de antes).
OUTLINE = {
    "nueva": {"seleccionado": 0.042 * 1.36, "normal": 0.03 * 1.36},
    "anterior": {"seleccionado": 0.09 * 1.18, "normal": 0.06 * 1.18},
}
FILL_NEW = 0.03
PATCH_MISSING = "Atenuación por profundidad: falta"


def load_json(name):
    path = D / name
    return json.loads(path.read_text()) if path.exists() else None


def image(name):
    path = D / name
    if not path.exists():
        return None
    img = Image.open(path)
    img.load()
    return np.asarray(img.convert("RGB"), dtype=float)


def luminance(rgb):
    return rgb @ np.array([0.2126, 0.7152, 0.0722])


def at(img, x, y):
    h, w, _ = img.shape
    return img[min(max(int(round(y)), 0), h - 1), min(max(int(round(x)), 0), w - 1)]


def marker_contrast(img, point, ring_px):
    """Distancia de color entre el centro del marcador (media de 3 × 3) y el
    fondo: la mediana de 24 puntos en un círculo de radio `ring_px`. No es
    proporcional a la opacidad: atenuado, el marcador deja ver su contorno a
    través del relleno. Sirve para comparar marcadores entre sí."""
    x, y = point["x"], point["y"]
    center = np.mean([at(img, x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)], axis=0)
    ring = [at(img, x + ring_px * np.cos(a), y + ring_px * np.sin(a)) for a in np.linspace(0, 2 * np.pi, 24, endpoint=False)]
    return float(np.linalg.norm(center - np.median(ring, axis=0)))


def label_contrast(img, point):
    """Contraste de la etiqueta: la diferencia media de luminancia con el
    fondo en ±10 × ±5 px alrededor de su centro. El fondo es la mediana del
    borde de un recuadro de ±16 × ±11 px. La etiqueta es texto sobre fondo
    transparente: cada píxel se mezcla con el fondo en proporción a su alfa,
    así que esta medida sigue a la opacidad. Por eso da los umbrales
    absolutos."""
    x, y = int(round(point["x"])), int(round(point["y"]))
    lum = luminance(img)
    h, w = lum.shape
    if not (16 <= x < w - 16 and 11 <= y < h - 11):
        return None
    inner = lum[y - 5 : y + 6, x - 10 : x + 11]
    outer = lum[y - 11 : y + 12, x - 16 : x + 17]
    border = np.concatenate([outer[0], outer[-1], outer[:, 0], outer[:, -1]])
    return float(np.abs(inner - np.median(border)).mean())


def ratio(a, b):
    return None if a is None or b is None or b == 0 else round(a / b, 3)


def median(values):
    values = [v for v in values if v is not None]
    return round(float(np.median(values)), 3) if values else None


def rounded(value):
    return None if value is None else round(value, 2)


def fade_rows(on, off, regions):
    """Por región: el contraste del marcador y el de la etiqueta con la
    atenuación activada y desactivada, en crudo, y su razón."""
    rows = []
    for region in regions:
        ring = OUTLINE["nueva"]["seleccionado"] * region["marcador"]["pxPerUnit"] + 5
        m_on, m_off = marker_contrast(on, region["marcador"], ring), marker_contrast(off, region["marcador"], ring)
        l_on, l_off = label_contrast(on, region["etiqueta"]), label_contrast(off, region["etiqueta"])
        rows.append(
            {
                "id": region["id"],
                "region": f"{region['abreviatura']} ({region['hemisferio']})",
                "lado": region["lado"],
                "profundidad": round(region["marcador"]["depth"], 3),
                "marcadorActivada": rounded(m_on),
                "marcadorDesactivada": rounded(m_off),
                "marcador": ratio(m_on, m_off),
                "etiquetaActivada": rounded(l_on),
                "etiquetaDesactivada": rounded(l_off),
                "etiqueta": ratio(l_on, l_off),
            }
        )
    return rows


def summary(rows):
    """Medianas de lo cercano y de lo lejano. Las etiquetas se juzgan con
    umbrales; los marcadores, entre sí: lo lejano, como mucho 0,75 veces lo
    cercano."""
    s = {f"{kind}{side.capitalize()}": median(r[kind] for r in rows if r["lado"] == side) for kind in ("etiqueta", "marcador") for side in ("cerca", "lejos")}
    s["marcadorLejosEntreCerca"] = ratio(s["marcadorLejos"], s["marcadorCerca"])
    return s


def against_previous(rows, off, before, new_regions, old_regions):
    """La nueva desactivada contra la anterior, región a región. El fondo del
    marcador se toma en el mismo círculo en las dos: 5 px por fuera del
    contorno de antes, el más grande. Cada etiqueta, en su sitio."""
    old_by_id = {r["id"]: r for r in old_regions}
    for row, region in zip(rows, new_regions):
        prior = old_by_id.get(region["id"])
        if prior is None:
            continue
        ring_new = OUTLINE["anterior"]["seleccionado"] * region["marcador"]["pxPerUnit"] + 5
        ring_old = OUTLINE["anterior"]["seleccionado"] * prior["marcador"]["pxPerUnit"] + 5
        row["marcadorNuevaEntreAnterior"] = ratio(marker_contrast(off, region["marcador"], ring_new), marker_contrast(before, prior["marcador"], ring_old))
        row["etiquetaNuevaEntreAnterior"] = ratio(label_contrast(off, region["etiqueta"]), label_contrast(before, prior["etiqueta"]))
    result = {}
    for kind in ("marcador", "etiqueta"):
        values = [r[f"{kind}NuevaEntreAnterior"] for r in rows if r.get(f"{kind}NuevaEntreAnterior") is not None]
        result[f"{kind}NuevaEntreAnterior"] = {"min": min(values), "max": max(values), "regiones": len(values)} if values else None
        result[f"{kind}NuevaEntreAnteriorA01"] = bool(values) and len(values) == len(rows) and all(abs(v - 1) <= 0.1 for v in values)
    return result


# --- medida: lo lejano, más tenue que lo cercano ---
medida = load_json("medida.json")
if medida:
    result = {}
    new, old = medida.get("nueva") or {}, medida.get("anterior") or {}
    for modo in ("pintada", "translucida"):
        info_new, info_old = new.get(modo) or {}, old.get(modo) or {}
        for fuente, ext in (("pantalla", "png"), ("jpeg", "jpg")):
            on, off, before = (image(f"medida-{modo}-{estado}.{ext}") for estado in ("activada", "desactivada", "anterior"))
            if "regiones" not in info_new or on is None or off is None:
                result[f"{modo}-{fuente}"] = "falta"
                continue
            rows = fade_rows(on, off, info_new["regiones"])
            entry = {"regiones": rows, **summary(rows)}
            if "regiones" in info_old and before is not None and before.shape == off.shape:
                entry.update(against_previous(rows, off, before, info_new["regiones"], info_old["regiones"]))
            else:
                entry["anterior"] = "falta" if before is None or "regiones" not in info_old else {"mismoTamano": False}
            result[f"{modo}-{fuente}"] = entry
        # El JPEG reproduce la atenuación: las medianas de las etiquetas del
        # JPEG menos las de la pantalla.
        screen, jpeg = result.get(f"{modo}-pantalla"), result.get(f"{modo}-jpeg")
        if isinstance(screen, dict) and isinstance(jpeg, dict):
            result[f"{modo}-jpegMenosPantalla"] = {
                key: None if screen[key] is None or jpeg[key] is None else round(jpeg[key] - screen[key], 3) for key in ("etiquetaCerca", "etiquetaLejos")
            }
    # Un solo hemisferio, el izquierdo: su cara interna, la cercana, no se
    # atenúa.
    hemisphere = new.get("hemisferio") or {}
    on, off = image("medida-hemisferio-activada.png"), image("medida-hemisferio-desactivada.png")
    if "regiones" in hemisphere and on is not None and off is not None:
        rows = fade_rows(on, off, hemisphere["regiones"])
        result["hemisferio"] = {"regiones": rows, **summary(rows)}
    else:
        result["hemisferio"] = "falta"
    report["medida"] = result
else:
    report["medida"] = "falta"


# --- marcadores: tamaño y anillo de los nodos #000000 ---
def diameter(img, point, direction, background, max_radius, threshold=30):
    """Píxeles que ocupa el disco a lo largo de `direction` (vector unitario).
    Se busca el borde desde fuera: a cada lado, desde `max_radius` hacia el
    centro, el primer píxel a `threshold` o más del fondo. Así un borde del
    relleno oscuro por la luz no corta la medida antes del contorno."""
    dx, dy = direction
    reach = []
    for sign in (1, -1):
        k = int(np.ceil(max_radius))
        while k > 0 and np.linalg.norm(at(img, point["x"] + sign * k * dx, point["y"] + sign * k * dy) - background) < threshold:
            k -= 1
        reach.append(k)
    return reach[0] + reach[1] + 1


def background_near(img, point, distance):
    samples = [at(img, point["x"] + distance * np.cos(a), point["y"] + distance * np.sin(a)) for a in np.linspace(0, 2 * np.pi, 32, endpoint=False)]
    return np.median(samples, axis=0)


def unit(v):
    n = np.hypot(*v)
    return (v[0] / n, v[1] / n)


def measured(img, point, direction, radius_scene):
    """Diámetro medido y esperado (2 × radio del contorno en píxeles), y el
    medido en unidades de la escena, entre los píxeles por unidad de su
    propio punto: así se comparan marcadores a distinta profundidad."""
    expected = 2 * radius_scene * point["pxPerUnit"]
    background = background_near(img, point, expected / 2 + 8)
    px = diameter(img, point, direction, background, expected * 0.75 + 4)
    return {"medido": px, "esperado": round(expected, 1), "enEscena": round(px / point["pxPerUnit"], 4)}


marcadores = load_json("marcadores.json")
if marcadores:
    sizes = {}
    for version in ("nueva", "anterior"):
        info = marcadores.get(version, {})
        sel, uns = info.get("seleccionado"), info.get("noSeleccionados")
        img_sel, img_uns = image(f"marcadores-{version}-seleccionado.png"), image(f"marcadores-{version}-no-seleccionados.png")
        entry = {}
        # En vertical: la etiqueta queda a la derecha del marcador.
        if sel and img_sel is not None:
            entry["seleccionado"] = measured(img_sel, sel["punto"], (0, 1), OUTLINE[version]["seleccionado"])
        # De través a la línea que los une, que pasa por su centro.
        if uns and img_uns is not None:
            a, b = uns["a"], uns["b"]
            across = unit((-(b["y"] - a["y"]), b["x"] - a["x"]))
            entry["noSeleccionados"] = [measured(img_uns, p, across, OUTLINE[version]["normal"]) for p in (a, b)]
        entry["clic"] = info.get("clic")
        entry["clicNoSeleccionado"] = info.get("clicNoSeleccionado")
        sizes[version] = entry
    # Cada diámetro, en unidades de la escena: entre los píxeles por unidad
    # de su propio punto.
    try:
        new_sel = sizes["nueva"]["seleccionado"]["enEscena"]
        new_uns = np.mean([r["enEscena"] for r in sizes["nueva"]["noSeleccionados"]])
        old_sel = sizes["anterior"]["seleccionado"]["enEscena"]
        old_uns = np.mean([r["enEscena"] for r in sizes["anterior"]["noSeleccionados"]])
        sizes["proporciones"] = {
            "seleccionadoEntreNormalNueva": round(new_sel / new_uns, 3),
            "nuevaEntreAnteriorSeleccionado": round(new_sel / old_sel, 3),
            "nuevaEntreAnteriorNormal": round(new_uns / old_uns, 3),
        }
    except (KeyError, TypeError, ZeroDivisionError):
        sizes["proporciones"] = "falta"
    report["tamanos"] = sizes

    rings = {"negroEsDeSaliencia": marcadores.get("negroEsDeSaliencia")}
    for theme in ("grafito", "claro"):
        for modo in ("pintada", "translucida"):
            info = (marcadores.get(f"anillo-{theme}") or {}).get(modo)
            img = image(f"anillo-{theme}-{modo}.png")
            if not info or img is None:
                rings[f"{theme}-{modo}"] = "falta"
                continue
            p, q = info["negro"], info["pareja"]
            across = unit((-(q["y"] - p["y"]), q["x"] - p["x"]))
            outline_px = OUTLINE["nueva"]["normal"] * p["pxPerUnit"]
            fill_px = FILL_NEW * p["pxPerUnit"]
            # Perfil de luminancia de través a la línea, cada medio píxel.
            samples = [
                (s, float(luminance(at(img, p["x"] + s * across[0], p["y"] + s * across[1]))))
                for s in np.arange(-(outline_px + 8), outline_px + 8.01, 0.5)
            ]
            # El núcleo: la mediana del relleno, sin los píxeles a menos de
            # 1,5 px de la línea que va a la pareja, que pasa por el centro y
            # se dibuja encima.
            inner = max(fill_px - 1.5, 1.0)
            steps = np.arange(-np.floor(inner), np.floor(inner) + 1)
            core_values = [
                float(luminance(at(img, p["x"] + dx, p["y"] + dy)))
                for dx in steps
                for dy in steps
                if dx * dx + dy * dy <= inner * inner and abs(dx * across[0] + dy * across[1]) >= 1.5
            ]
            core = float(np.median(core_values)) if core_values else float(luminance(at(img, p["x"], p["y"])))
            bg = float(np.median([v for s, v in samples if abs(s) >= outline_px + 4]))
            # El anillo: lo que, hasta el borde del contorno y fuera de la
            # línea, se aparta más de 40 a la vez del núcleo negro y del fondo.
            # Con fondo oscuro (Grafito, o la región pintada de negro) es lo
            # único que distingue el nodo. Con fondo blanco (Claro, translúcida)
            # el núcleo ya contrasta con el fondo, y el paso suavizado entre los
            # dos también contaría.
            ring = [v for s, v in samples if 2 <= abs(s) <= outline_px + 1 and abs(v - core) > 40 and abs(v - bg) > 40]
            rings[f"{theme}-{modo}"] = {
                "nucleo": round(core, 1),
                "muestrasDelNucleo": len(core_values),
                "fondo": round(bg, 1),
                "nucleoContraFondo": round(abs(core - bg), 1),
                "anilloVisible": bool(ring),
                "anillo": round(max(ring, key=lambda v: abs(v - bg)), 1) if ring else None,
                "muestrasDeAnillo": len(ring),
                "radioContornoPx": round(outline_px, 2),
                "perfil": [round(v) for _, v in samples],
            }
            # Recorte ampliado × 6 para mirarlo con Read.
            x, y = int(round(p["x"])), int(round(p["y"]))
            crop = Image.fromarray(img[max(y - 20, 0) : y + 21, max(x - 20, 0) : x + 21].astype(np.uint8))
            crop.resize((crop.width * 6, crop.height * 6), Image.NEAREST).save(D / f"anillo-{theme}-{modo}-recorte.png")
    report["anillo"] = rings
else:
    report["tamanos"] = report["anillo"] = "falta"


# --- captura: ningún fotograma con los colores de exportación ---
def jpeg_facts(name, box):
    img = image(name)
    if img is None:
        return "falta"
    h, w, _ = img.shape
    corners = [img[0, 0], img[0, -1], img[-1, 0], img[-1, -1]]
    return {
        "tamano": [w, h],
        "tamanoDelLienzo": [box["width"], box["height"]] if box else None,
        "tamanoBien": bool(box) and [w, h] == [box["width"], box["height"]],
        "esquinasBlancas": all(bool((c >= 245).all()) for c in corners),
    }


captura = load_json("captura.json")
if captura:
    result = {}
    for version in ("nueva", "anterior"):
        before = image(f"captura-{version}-antes.png")
        if before is None:
            result[version] = "falta"
            continue
        frames = {}
        for key in ("f1", "f2", "f3", "f4", "f5", "f6", "despues"):
            frame = image(f"captura-{version}-{key}.png")
            if frame is None or frame.shape != before.shape:
                frames[key] = "falta"
                continue
            changed = np.abs(frame - before).max(axis=2) > 0
            frames[key] = {"pixelesDistintos": int(changed.sum()), "fraccion": round(float(changed.mean()), 5)}
        compared = [f for f in frames.values() if isinstance(f, dict)]
        info = captura.get(version, {})
        result[version] = {
            "fotogramas": frames,
            # null si no se pudo comparar ningún fotograma: «sin comprobar».
            "algunFotogramaDistinto": any(f["fraccion"] > 0.005 for f in compared) if compared else None,
            "jpeg": jpeg_facts(f"captura-{version}.jpg", info.get("lienzo")),
        }
    report["captura"] = result
else:
    report["captura"] = "falta"


# --- comparar: la versión nueva sin atenuar contra la anterior ---
def masked_difference(new, old, points, margin):
    """Píxeles distintos (más de 8 en algún canal) fuera de los marcadores y
    de las etiquetas de las dos versiones, y en total. `margin` agranda cada
    máscara: 4 px en pantalla y 16 en el JPEG, que comprime en bloques de 8
    × 8 píxeles (16 × 16 para el color): un cambio dentro de la máscara
    altera todo su bloque."""
    h, w, _ = new.shape
    yy, xx = np.mgrid[0:h, 0:w]
    mask = np.zeros((h, w), dtype=bool)
    for p in points:
        m = p["marcador"]
        radius = OUTLINE["anterior"]["seleccionado"] * m["pxPerUnit"] + margin
        mask |= (xx - m["x"]) ** 2 + (yy - m["y"]) ** 2 <= radius**2
        for key in ("etiquetaAntes", "etiquetaNueva"):
            q = p[key]
            mask |= (xx - q["x"]) ** 2 + (yy - q["y"]) ** 2 <= (20 + margin) ** 2
    diff = np.abs(new - old).max(axis=2) > 8
    return {
        "margenPx": margin,
        "fueraDeLasMascaras": int((diff & ~mask).sum()),
        "pixelesFuera": int((~mask).sum()),
        "dentroDeLasMascaras": int((diff & mask).sum()),
    }


comparar = load_json("comparar.json")
if comparar:
    result = {}
    new_info, old_info = comparar.get("nueva", {}), comparar.get("anterior", {})
    a, b = image("comparar-nueva-sin-seleccion.jpg"), image("comparar-anterior-sin-seleccion.jpg")
    if a is None or b is None or a.shape != b.shape:
        result["sin-seleccion"] = "falta" if a is None or b is None else {"mismoTamano": False}
    else:
        close = np.abs(a - b).max(axis=2) <= 16
        result["sin-seleccion"] = {"mismoTamano": True, "fraccionA16": round(float(close.mean()), 5), "pixelesAMasDe16": int((~close).sum())}
    points = (new_info.get("somatomotora") or {}).get("puntos")
    for kind, ext, margin in (("somatomotora-pantalla", "png", 4), ("somatomotora-jpeg", "jpg", 16)):
        a, b = image(f"comparar-nueva-somatomotora.{ext}"), image(f"comparar-anterior-somatomotora.{ext}")
        if a is None or b is None or not points:
            result[kind] = "falta"
        elif a.shape != b.shape:
            result[kind] = {"mismoTamano": False}
        else:
            result[kind] = {"mismoTamano": True, **masked_difference(a, b, points, margin)}
    result["lienzos"] = {
        "nueva": (new_info.get("somatomotora") or {}).get("lienzo"),
        "anterior": (old_info.get("somatomotora") or {}).get("lienzo"),
    }
    report["comparar"] = result
else:
    report["comparar"] = "falta"


# --- barra: filas, alto y lienzo a los tres tamaños ---
barra = load_json("barra.json")
if barra:
    result = {}
    for size in ("1400x900", "1280x800", "1024x768"):
        row = {}
        for variant in ("nueva", "anterior", "nueva-sin-interruptor"):
            info = (barra.get(variant) or {}).get(size) or {}
            with_selection, without = info.get("conSeleccion"), info.get("sinSeleccion")
            if not with_selection:
                row[variant] = "falta"
                continue
            row[variant] = {
                "filas": with_selection["filas"],
                "alto": with_selection["alto"],
                "lienzoAlto": with_selection["lienzoAlto"],
                "altoSinSeleccion": without["alto"] if without else None,
                "mismaFilaInterruptorYExportar": None
                if with_selection["filaInterruptor"] is None
                else with_selection["filaInterruptor"] == with_selection["filaExportar"],
            }
        control, previous = row.get("nueva-sin-interruptor"), row.get("anterior")
        if isinstance(control, dict) and isinstance(previous, dict):
            row["controlIgualQueAnterior"] = all(control[k] == previous[k] for k in ("filas", "alto", "lienzoAlto"))
        result[size] = row
    report["barra"] = result
else:
    report["barra"] = "falta"


# --- miniatura: sigue la preferencia ---
on, off = image("persistencia-miniatura-activada.png"), image("persistencia-miniatura-desactivada.png")
if on is None or off is None:
    report["miniatura"] = "falta"
elif on.shape != off.shape:
    report["miniatura"] = {"mismoTamano": False}
else:
    changed = np.abs(on - off).max(axis=2) > 8
    report["miniatura"] = {"mismoTamano": True, "fraccionDistinta": round(float(changed.mean()), 5), "pixelesDistintos": int(changed.sum())}


# --- atenuacion y persistencia: lo que dicen sus JSON ---
report["atenuacion"] = load_json("atenuacion.json") or "falta"
report["persistencia"] = load_json("persistencia.json") or "falta"


def collect(value, key):
    """Lo que hay en las listas `key` de un JSON, a cualquier nivel."""
    if isinstance(value, dict):
        found = []
        for k, v in value.items():
            found += v if k == key and isinstance(v, list) else collect(v, key)
        return found
    if isinstance(value, list):
        return [x for item in value for x in collect(item, key)]
    return []


PHASES = ("atenuacion", "medida", "persistencia", "barra", "marcadores", "captura", "comparar")
phase_json = {name: load_json(f"{name}.json") for name in PHASES}
report["errores"] = {name: len(collect(data, "errors")) if data else "falta" for name, data in phase_json.items()}
# Los avisos, sin repetir, para leerlos uno a uno. El de three.js sobre
# THREE.Clock es conocido; el del parche de la atenuación hace fallar la fase.
report["avisos"] = {name: sorted(set(collect(data, "warnings"))) if data else "falta" for name, data in phase_json.items()}
report["avisosDelParche"] = sum(1 for data in phase_json.values() if data for w in collect(data, "warnings") if PATCH_MISSING in w)
report["fallos"] = {name: data.get("fallo") for name, data in phase_json.items() if data and data.get("fallo")}

(D / "analisis.json").write_text(json.dumps(report, indent=1, ensure_ascii=False))
for key in ("medida", "tamanos", "anillo", "captura", "comparar", "barra", "miniatura", "errores", "avisos", "avisosDelParche", "fallos"):
    value = report.get(key)
    print(key, json.dumps(value, ensure_ascii=False)[:1500])
```

- [ ] **Step 2: ejecutar**

```bash
cd "$D" && python3 analizar-3d.py "$D"
```

- [ ] **Step 3: revisar lo que salió**

Abre las capturas con la herramienta Read, además de los JSON. Cada punto se informa como visto, distinto o sin comprobar. Si un JSON tiene `fallo` (`analisis.json` → `fallos`), la fase se paró ahí: lo anterior se vio y lo demás queda «sin comprobar». En `analisis.json`, «falta» marca lo que no llegó a existir.

- **Preflight** (`preflight.json`): `nueva`, `anterior` y `backend` son true; `regions.json` es 360 y `connections.json`, 64 620, o lo que tenga la base, con su origen; `power2011` lista las cinco regiones de Saliencia, entre ellas `9-46d (R)`.
- **Atenuación** (`atenuacion.json` y `atenuacion-*.png`), en Grafito y en Claro:
  - `alCargar` es `"true"`: activada por defecto. En cada escena, `activada` es `"true"`, `desactivada` es `"false"`, `otraVez` es `"true"` y `asentado` es true.
  - `boton`: `texto` «Atenuar lo que queda detrás», `clase` con `export-btn--active`, `letra` de al menos 0,7 (rem) y `hijoDirectoDeLaBarra` false. `color`, `fondo` y `borde` cambian de Grafito a Claro: son del tema.
  - Mira las capturas, activada contra desactivada. Con la red Somatomotora, las etiquetas del hemisferio izquierdo, el lejano (la cámara empieza en +X), se ven tenues y dejan de competir con las del derecho. En la estrella, las líneas se desvanecen hacia el otro hemisferio y los marcadores lejanos se ven tenues; también en la translúcida (`estrella-translucida`) y, en Grafito, vértice a vértice (`estrella-vertices`). Desactivada, se ve como antes, con los marcadores nuevos.
  - Apunta también si el contorno se transparenta en los marcadores atenuados, si un marcador cercano tapa bien las líneas que pasan por él y, en la translúcida, si una línea que pasa por detrás de un marcador atenuado muestra un corte (desviación 3).
  - Los conos de dirección y las líneas continuas quedan «sin comprobar». En HCP-MMP1.0 todas las conexiones son estructurales e indirectas, así que todas las líneas son discontinuas y ninguna lleva cono.
- **Medida** (`analisis.json` → `medida`), para `pintada` y `translucida`, en pantalla y en JPEG:
  - Etiquetas: `etiquetaCerca` es al menos 0,85 y `etiquetaLejos`, como mucho 0,5.
  - Marcadores: `marcadorLejosEntreCerca` es como mucho 0,75. Su contraste no es proporcional a la opacidad, así que no tiene umbral propio. Da también los valores en crudo de `regiones`.
  - `‹modo›-jpegMenosPantalla`: las dos diferencias quedan a ±0,15. El JPEG reproduce la atenuación.
  - Desactivada contra la versión anterior, en la misma escena: `etiquetaNuevaEntreAnteriorA01` y `marcadorNuevaEntreAnteriorA01` son true. Es decir, en todas las regiones, cercanas y lejanas, las dos razones quedan a 1 ± 0,1 (`min` y `max`): desactivada, la atenuación no cambia la opacidad de nada.
  - Mira `medida-translucida-activada.png` contra `-desactivada.png`: activada, los marcadores cercanos se dibujan después de la malla translúcida y pierden su velo (desviación 3). Apunta cómo se ve.
  - `hemisferio`, solo el izquierdo: `etiquetaCerca`, su cara interna, es al menos 0,85, y `etiquetaLejos`, la externa, como mucho 0,5. Mira también `medida-hemisferio-*.png`.
- **Preferencia** (`persistencia.json`):
  - `porDefecto` es `{"pulsado": "true", "guardado": null}`; `trasDesactivar`, `{"false", "false"}`; `trasRecargar`, `{"false", "false"}`; y `activadaYRecargada`, `{"true", "true"}`.
  - `teclado`: `espacio` es `{"pulsado": "false", "guardado": "false", "foco": true}`; `enter`, `{"true", "true", true}`; y `tabDesdeHemisferio` es true.
  - `miniatura`: en `activada` y en `desactivada`, `barra` es 0 y `asentado`, true. En `analisis.json` → `miniatura`, `fraccionDistinta` es mayor que 0: la miniatura sigue la preferencia. Mira `persistencia-miniatura-*.png`: activada, la estrella se desvanece hacia el otro hemisferio; desactivada, no.
  - Con el almacenamiento roto, `alCargar` es `"true"`, `trasPulsar` es `"false"` y `errors` está vacío.
- **Barra** (`analisis.json` → `barra`, y `barra-*.png`), a 1400 × 900, 1280 × 800 y 1024 × 768:
  - `controlIgualQueAnterior` es true: con el interruptor oculto, la barra y el lienzo miden lo mismo que en la anterior. Si no, la medida no sirve: dilo y no saques conclusiones de las filas.
  - En `nueva`, `altoSinSeleccion` es igual a `alto` (D1b: la barra no cambia de alto al seleccionar).
  - Apunta, a cada tamaño, las `filas`, el `alto` y el `lienzoAlto` de la nueva y de la anterior, y `mismaFilaInterruptorYExportar`. Si la nueva ocupa una fila más, el lienzo baja: no es un fallo, es un dato para el borrador.
- **Tamaños** (`analisis.json` → `tamanos`):
  - En las dos versiones, cada `medido` queda a ±2 px de su `esperado`, que es el diámetro del contorno en pantalla.
  - `proporciones`: `seleccionadoEntreNormalNueva` entre 1,25 y 1,55 (1,4 en la escena); `nuevaEntreAnteriorSeleccionado` y `nuevaEntreAnteriorNormal`, a ±0,08 de 0,54 y 0,58. El contorno de antes medía 0,09 × 1,18 y 0,06 × 1,18, y el de ahora, 0,042 × 1,36 y 0,03 × 1,36.
  - `clic`, en las dos versiones: `trasClicEnElCentro` tiene solo la segunda región, y `trasClicAUnLado` está vacío. El clic a 0,072 del centro, fuera del marcador nuevo, sigue seleccionando, como antes.
  - `clicNoSeleccionado`, en las dos versiones: a 0,05, `tocoLaZonaDeClic` es true, y a 0,08, false. La zona de clic de un marcador sin seleccionar mide 0,06, como antes.
- **Anillo** (`analisis.json` → `anillo`, y los cuatro `anillo-*-recorte.png`, que Read muestra ampliados): `negroEsDeSaliencia` es true. En `grafito-pintada`, `grafito-translucida` y `claro-pintada`, `anilloVisible` es true: el anillo se aparta más de 40 de luminancia del núcleo negro y del fondo. En `claro-translucida`, el núcleo negro ya contrasta con el fondo blanco (`nucleoContraFondo` alto); apunta si el anillo se ve en el recorte.
- **Captura** (`analisis.json` → `captura`, y `captura.json`):
  - En la nueva, `algunFotogramaDistinto` es false: los seis fotogramas tras el clic y el de 500 ms después son iguales al de antes (`fraccion` como mucho 0,005, y normalmente 0). Si es null, no se comparó ningún fotograma: «sin comprobar».
  - `ariaDisabledTrasClic` es `"true"` y `ariaDisabledDespues`, `"false"`. En `jpeg`, `tamanoBien` y `esquinasBlancas` son true. `descargasConDobleClic` y `descargasConDobleClicSincrono` son 1, y `teclado.focoEnElBoton` es true.
  - En la anterior, el control, `algunFotogramaDistinto` es true, como anotó la D3. Si sale false, la prueba no ve el parpadeo, y el resultado de la nueva queda «sin comprobar».
- **Comparar** (`analisis.json` → `comparar`), la nueva con la atenuación desactivada contra la anterior, con el mismo lienzo (`lienzos` iguales):
  - `sin-seleccion`: `mismoTamano` es true y `fraccionA16` es al menos 0,99. La captura fuera de pantalla da los colores de siempre: curva de tono, sRGB y mezcla.
  - `somatomotora-pantalla`: `fueraDeLasMascaras` es como mucho el 0,1 % de `pixelesFuera`. Fuera de los marcadores y de las etiquetas, que cambian a propósito, las líneas son iguales: desactivada, la atenuación no toca nada. Si no, mira en las dos imágenes dónde están las diferencias.
  - `somatomotora-jpeg`, con las máscaras 16 px más anchas: la misma cuenta. Si solo falla aquí y en pantalla se cumple, mira si las diferencias quedan pegadas a las máscaras, que es la compresión por bloques, y dilo con las cifras.
- **Consola** (`analisis.json` → `errores`, `avisos` y `avisosDelParche`): 0 errores en todas las fases y `avisosDelParche` en 0. Lee `avisos` uno a uno: el de three.js sobre `THREE.Clock` es conocido y no es un fallo; cualquier otro, apúntalo.

Lo que no se puede comprobar aquí queda «sin comprobar»: la ventana real de Tauri (WebKitGTK en Linux y WebView2 en Windows), y en ella la captura con multimuestreo; el rendimiento con una GPU real; un atlas volumétrico (Brainnetome), con su malla MNI152; y los conos y las líneas continuas, que no están en los datos.

- [ ] **Step 4: si algo no cuadra**

Corrígelo en el código, con las reglas de la tarea de la que venga, y vuelve a pasar el Step 1 de la Task 5. Haz un commit aparte con los archivos que cambies, con un mensaje `Legibilidad 3D: …`. Apúntalo para el borrador.

Después, repite las fases. Si el arreglo toca `Brain3D.tsx`, o cualquier otro archivo de la app, repite todas las fases de las Tasks 5 y 6 salvo «preflight», y vuelve a pasar el análisis: lo que se midió antes del arreglo ya no vale para la versión arreglada. Si no las repites todas, marca en el informe y en el borrador cada resultado que no hayas repetido como «de antes del arreglo», y no lo cuentes como visto. Si solo cambia un script de la verificación, basta con repetir las fases que lo usan.

Si lo que no cuadra es una constante de la atenuación (el mínimo, 0,2, o el tramo), no la ajustes por tu cuenta: apunta lo medido y lo que ves en las capturas, y déjalo como pregunta para el usuario.

- [ ] **Step 5: parar los servidores y comprobar la copia principal**

Para los dos `vite` de la Task 5: por su identificador de tarea en segundo plano o, si ya no lo tienes, con estas dos órdenes. En el patrón, `525[1]` encuentra `5251` en la línea de órdenes de `vite`, pero no en la de la propia búsqueda:

```bash
pkill -f "vite --port 525[1]"; pkill -f "vite --port 525[2]"
```

Después:

```bash
ss -ltn | grep -E ':(5251|5252) ' || echo "servidores parados"
pgrep -af "$D/tm[p]" || echo "sin navegadores sueltos"
git -C /home/dae/PycharmProjects/Neurograph/Neurograph status --short | diff "$D/copia-principal-antes.txt" - && echo "copia principal: el mismo git status que al empezar"
git -C /home/dae/.config/superpowers/worktrees/Neurograph/rediseno-3d status --short
```

Expected: «servidores parados», «sin navegadores sueltos» y el worktree limpio (o solo con este plan, si sigue sin commit).

La verificación no escribe nada en la copia principal, pero otra sesión trabaja allí en la fase 3, y su `git status` puede haber cambiado desde el Step 2 de la Task 5. No se espera que salga igual. Si `diff` muestra líneas, no borres nada: cópialas en el informe, di que vienen de ese otro trabajo y comprueba que ninguna es de esta verificación (nada con `leg3d`, `vite-cache` ni capturas o JSON de las fases).

- [ ] **Step 6: el borrador de la decisión**

La entrada de esta minifase en `docs/decisiones-diseno.md` se escribe al fusionar la rama en `rediseno-interfaz`, con el siguiente número D libre. Aquí se deja su borrador, con el formato de la D3, en `$D/decision-borrador.md`, y se copia entero en el informe de la tarea. No toques `docs/`.

Parte de este texto y cambia lo que la verificación no confirme. Cada `‹…›` se sustituye por lo medido en `analisis.json` y en los JSON de las fases. Lo que quedó «distinto» o «sin comprobar» se dice así, y no se afirma.

```markdown
## D‹n›. Legibilidad del 3D (la parte 3D de la fase 4 del rediseño) -- ‹fecha›

**Motivación.** Con la corteza pintada (decisión 72), los marcadores, las etiquetas y las líneas de la selección se dibujan encima de la superficie, sin prueba de profundidad, para que no queden tapados dentro de un surco. Pero así una región de la cara interna o del otro hemisferio parecía estar delante de la corteza que se ve, y las etiquetas de regiones homólogas de los dos hemisferios salían dobles. Con el conectoma denso de HCP-MMP1.0 y el peso mínimo cerca de 0, una región seleccionada mostraba una estrella de hasta 359 líneas que parecía flotar. Además, al exportar el 3D se veían unos fotogramas con los colores de exportación (limitación anotada en la D3).

**Decidido por el usuario (24/09/2026).** Atenuar lo que queda detrás, con un interruptor en los controles del 3D, activado por defecto; para las líneas, atenuación por distancia y no oclusión. Adelantar esta parte de la fase 4 y hacerla en paralelo a la fase 3, en la rama `rediseno-3d`.

**Qué cambia.**
- **«Atenuar lo que queda detrás».** Líneas, marcadores con su contorno, conos de dirección y etiquetas se ven más tenues cuanto más lejos de la cámara quedan dentro del cerebro, con la corteza pintada y en la vista con las esferas en su posición real. Lo más lejano conserva 0,2 de opacidad. Cada fragmento se atenúa según su profundidad, así que una línea larga se desvanece a lo largo de su recorrido. El tramo va desde 0,2 de la semiprofundidad del cerebro por delante de su centro hasta su cara más lejana en la dirección de la vista. Se mide con la caja del cerebro que se ve (un solo hemisferio si solo se ve uno). Es un botón de alternar en la barra del 3D, activado por defecto y guardado en este navegador (`neurograph.cerebro3d.atenuar`). Desactivado, los materiales son los de siempre. Las miniaturas siguen la misma preferencia. El JPEG reproduce la atenuación tal como se ve.
- **Marcadores a la mitad.** Radio 0,03, y 0,042 la región seleccionada. El contorno pasa a escala 1,36 y conserva el grosor absoluto de antes; la zona de clic conserva el radio de antes; la etiqueta queda a 0,18 del borde del marcador, como antes en uno normal (en el seleccionado quedaba a 0,15).
- **Captura sin parpadeo.** La exportación se dibuja en un destino fuera de pantalla con el mismo proceso de color que el lienzo, y mientras dura el lienzo no se vuelve a dibujar. En pantalla ya no se ve ningún fotograma con los colores de exportación. Si se ha perdido el contexto WebGL o el lienzo no tiene tamaño, no se descarga nada, en vez de un JPEG negro, y la consola lo dice.

**Qué no cambia.** Los datos, los stores, `NETWORK_COLORS` y la lógica de representación: el color es la red, el grosor es el peso, el trazo discontinuo es evidencia no directa y el cono es conectividad efectiva. La atenuación solo cambia la opacidad según la profundidad. `App.tsx`, `App.css` e `index.css` no cambian.

**Diferencias con el spec.**
- El tramo de la atenuación sale del elipsoide de la caja del cerebro que se ve, no de una esfera: el cerebro es más largo que ancho, y con la esfera lo del otro hemisferio apenas se atenuaba en la vista lateral.
- Desactivada, los materiales no llevan el parche; al alternar, se crean materiales nuevos. La clave de React que lo hace es imprescindible: react-three-fiber 9.7 pondría a 0 las props del parche al quitarlas, y three.js fallaría.
- Con la atenuación, marcadores, contornos y conos se dibujan como transparentes, de atrás adelante con las líneas; los `renderOrder` no cambian.
- El contorno del marcador pasa de escala 1,18 a 1,36, y la zona de clic es una esfera invisible con el radio de antes.
- El lienzo no se para con `frameloop="never"` sino con un `useFrame` de prioridad 1 que solo dibuja fuera de la exportación. La exportación pasa por tres fases (`capturing`, `restoring`, `idle`).
- El destino de la captura se marca como de WebXR para recibir la curva de tono y la codificación sRGB, como el lienzo, con el formato interno `RGBA8` fijado.
- El interruptor usa las clases de los botones de herramienta (`.export-btn` y `.export-btn--active`), sin CSS nuevo.
- Unidades nuevas: `logic/markerSize.ts`, `logic/depthFade.ts`, `logic/depthFadePreference.ts`, `logic/capture3d.ts`, `components/DepthFadeToggle.tsx` y `exportPixelsAsJpeg`.

**Limitaciones conocidas.**
- La captura depende de un detalle interno de three.js 0.185 (`isXRRenderTarget`). Una prueba fija la configuración del destino, pero si three.js cambia ese detalle, el JPEG perdería la curva de tono: la comparación con el JPEG de la versión anterior (verificación) lo detectaría.
- En la vista translúcida y en los atlas volumétricos, los marcadores atenuados siguen escribiendo profundidad: una línea que se dibuje después y pase por detrás de uno puede mostrar un pequeño corte.
- ‹Lo que se viera en las capturas: el contorno a través del relleno atenuado, el velo de la vista translúcida, el orden de dibujo con la atenuación activada.›
- ‹La barra del 3D, si ocupa una fila más a alguno de los tres tamaños: a cuáles, y cuánto baja el lienzo.›

**Queda para el resto de la fase 4.**
- **Cerebro 3D:** los surcos más visibles (percentiles 5 y 95, con suavizado) y las etiquetas con la tipografía nueva, el fondo translúcido del tema y su caché por tema y versión de fuentes (spec 6.3).
- **Connectograma** (etiquetas radiales, arcos, leyenda y nodos) **y hemisferios** (spec 6.1 y 6.2).
- ‹Lo que el usuario decida tras ver las capturas: el mínimo de la atenuación y, con datos que tengan conectividad efectiva, el tamaño del cono de dirección.›

**Verificación.**
- `vitest` ‹190›/‹190›: las ‹129› de antes y ‹61› nuevas. `tsc -b` limpio, `oxlint` sin errores y con los mismos 9 avisos, y `vite build` correcto.
- En Chromium sin interfaz (Playwright 1.55, WebGL por software), con dos servidores de desarrollo propios (la versión nueva y la anterior a esta minifase) y el backend local, solo con peticiones GET. `/regions` y `/connections` de HCP-MMP1.0 se sirvieron a las dos versiones desde los mismos JSON. Ventana de 1400 × 900; para la barra, también 1280 × 800 y 1024 × 768.
- **Atenuación:** ‹capturas en Grafito y en Claro, activada y desactivada, con la red Somatomotora y con la estrella de 4 derecha, también en la translúcida y, en Grafito, vértice a vértice: lo que se vio›. Con la corteza pintada (forma real) y cinco regiones de cada lado, el contraste de las etiquetas lejanas con la atenuación entre el de sin ella fue ‹etiquetaLejos›, y el de las cercanas, ‹etiquetaCerca›. En los marcadores, lo lejano quedó en ‹marcadorLejosEntreCerca› veces lo cercano (‹valores en crudo›). En la vista translúcida, ‹…›. En el JPEG, ‹…›. Con un solo hemisferio, su cara interna quedó en ‹etiquetaCerca› y la externa, en ‹etiquetaLejos›.
- **Desactivada contra la versión anterior**, región a región y en la misma escena: el contraste de las etiquetas quedó entre ‹min› y ‹max› veces el de antes, y el de los marcadores, entre ‹min› y ‹max›.
- **Interruptor:** activado por defecto, `aria-pressed`, con el estilo del tema y letra de ‹…›rem; se conserva al recargar; Espacio y Enter lo alternan y el foco se queda en él, y se llega con Tab desde el selector de hemisferio; la miniatura no tiene barra y sigue la preferencia; con el almacenamiento roto, sigue funcionando sin errores.
- **Barra del 3D:** a 1400 × 900, ‹filas› filas y ‹alto› px (la anterior, ‹filas› y ‹alto›); a 1280 × 800, ‹…›; a 1024 × 768, ‹…›. El interruptor ‹va / no va› en la fila de «Exportar JPEG». El lienzo ‹mide lo mismo / baja ‹n› px›. Sin selección, la barra mide lo mismo que con ella (D1b).
- **Marcadores:** diámetros medidos ‹…› (esperados ‹…›); seleccionado entre normal, ‹…›; nuevo entre anterior, ‹…› y ‹…›. Un clic a 0,072 del centro de un marcador seleccionado y a 0,05 del de uno sin seleccionar sigue tocando su zona de clic, como antes. Anillo del nodo `#000000` (9-46d derecha, Power 2011): ‹visible en …›.
- **Captura:** en la versión nueva, los seis fotogramas tras pulsar «Exportar JPEG» y el de 500 ms después son iguales al de antes ‹píxel a píxel›; en la anterior, ‹n› fotogramas tenían los colores de exportación. El JPEG mide lo que el lienzo (‹ancho × alto›) y tiene las esquinas blancas. Un doble clic, el de Playwright y el síncrono, da una descarga, y con el teclado el botón conserva el foco.
- **Contra la versión anterior**, con la atenuación desactivada y el mismo lienzo: sin selección, el JPEG coincide en el ‹…› % de los píxeles (±16); con la red Somatomotora, fuera de marcadores y etiquetas hay ‹…› píxeles distintos de ‹…› en pantalla, y ‹…› en el JPEG.
- Sin errores en la consola ‹en ninguna fase›, y sin el aviso de que el parche de la atenuación no se aplicara. ‹Los avisos que hubo.›
- **No comprobado:** la ventana real de Tauri (WebKitGTK en Linux, WebView2 en Windows), y en ella la captura con multimuestreo (4 muestras, resueltas con `blitFramebuffer`); el rendimiento con una GPU real; un atlas volumétrico (Brainnetome); los conos de dirección y las líneas continuas, que no están en los datos (en HCP-MMP1.0 todas las conexiones son estructurales e indirectas). ‹Y lo que haya quedado sin comprobar.›

Spec: `docs/rediseno-interfaz-diseno.md`. Plan: `docs/rediseno-interfaz-plan-3d.md`.
```

Añade al final del borrador, aparte, los retoques del spec que habrá que hacer al fusionar, para que el spec diga lo que se construyó:

- 6.3, «Marcadores de región»: el contorno a escala 1,36, la zona de clic con el radio de antes y la etiqueta a 0,18 del borde del marcador.
- 6.3, «Atenuar lo que queda detrás»: el tramo con el elipsoide de la caja del cerebro que se ve, el mínimo de 0,2, la preferencia guardada en el navegador y que, desactivada, los materiales son los de siempre.
- 6.3, «Captura del 3D sin parpadeo»: el lienzo se para con un `useFrame` de prioridad 1, y el destino recibe el mismo proceso de color que el lienzo.
- 9, «Unidades nuevas»: las de esta minifase.
- 12, «Riesgos y puntos abiertos»: la dependencia de `isXRRenderTarget`, y lo que el usuario tenga que decidir tras ver las capturas (el mínimo de la atenuación y, con datos que tengan conectividad efectiva, el cono de dirección).

El informe de la tarea da, además:
- la ruta de `$D` y la lista de lo visto, lo distinto y lo sin comprobar;
- el resultado de la barra a los tres tamaños;
- las capturas más útiles para el usuario: `atenuacion-grafito-somatomotora-activada.png` y `-desactivada.png`, las dos de la estrella y las dos de la estrella translúcida;
- los commits de arreglo, si los hubo, y qué fases se repitieron después.
