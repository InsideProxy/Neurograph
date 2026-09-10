// Visualización 3 (panel grande) — Cerebro 3D en vista de FOCO, no de
// conjunto (decisión de la usuaria, 30/08/2026, diseño de interfaz de
// tres paneles): a diferencia del connectograma y de Hemisferios.tsx
// (que siempre dibujan todo el grafo filtrado, o la conectividad
// inducida entre una selección múltiple), este panel dibuja EN CADA
// MOMENTO solo la red de conectividad de lo seleccionado -- nunca el
// grafo completo:
//   - un nodo seleccionado -> ese nodo + sus vecinos directos + las
//     conexiones reales entre ellos (su red de un salto);
//   - una conexión seleccionada -> sus dos extremos + esa conexión;
//   - dos o más nodos seleccionados -> los nodos elegidos + la
//     conectividad real que existe ENTRE ellos (mismo criterio que
//     Connectogram.tsx/Hemisferios.tsx, `inducedConnections`);
//   - nada seleccionado -> ningún dibujo: un aviso explícito invitando a
//     seleccionar algo en el connectograma o en Hemisferios, nunca el
//     grafo completo como valor por defecto (eso sería precisamente la
//     vista "de conjunto" que este panel existe para no ser).
// El resto de la codificación visual (color de red, discontinuo para
// evidencia no directa, flecha para conectividad efectiva, abreviatura
// permanente junto al nodo) no cambia respecto a la versión anterior de
// este componente -- solo cambia QUÉ subconjunto del grafo se dibuja.
//
// Nota de implementación: usamos three/examples/jsm/controls/OrbitControls
// directamente (de forma imperativa) en vez de @react-three/drei, para no
// arrastrar su enorme superficie de dependencias opcionales (mediapipe,
// rapier, etc.) que no necesitamos en este esqueleto. Por la misma razón,
// las conexiones usan la etiqueta <threeLine> que @react-three/fiber ya
// expone precisamente para evitar la colisión entre el <line> de three.js
// y el <line> de SVG en el sistema de tipos de React, y las etiquetas de
// abreviatura (30/08/2026) usan un <sprite> con una textura de <canvas>
// propia (src/logic/textSprite.ts) en vez de troika-three-text o
// @react-three/drei <Text> -- mismo criterio.
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import type { GraphConnection, GraphNode } from "../types/domain";
import { useSelectionStore } from "../state/selection";
import { useFiltersStore } from "../state/filters";
import { filterGraph } from "../logic/visibility";
import { inducedConnections } from "../logic/induced";
import { MAX_RENDERED_CONNECTIONS } from "../logic/renderSafety";
import { exportCanvasAsJpeg } from "../logic/exportImage";
import { getLabelTexture } from "../logic/textSprite";
import { NETWORK_COLORS, NEUTRAL_COLOR, ACCENT_SELECTED_COLOR, HOMOLOGY_HIGHLIGHT_COLOR } from "../theme/networks";
import { fetchSpeciesList, type SpeciesListItem } from "../data/speciesApi";
import { fetchHomologiesForSpecies, homologyRegionIds } from "../data/homologyApi";
import { ErrorBoundary } from "./ErrorBoundary";
import { ReferenceMesh } from "./ReferenceMesh";

// Fondo de la escena en pantalla (decisión 18, 30/08/2026): mismo valor
// que --panel-bg en frontend/src/index.css. three.js no puede leer
// variables CSS, así que este valor se duplica aquí a propósito -- si
// --panel-bg cambia algún día, este literal hay que actualizarlo a mano
// junto a él (documentado también en index.css). ExportBridge, más
// abajo, lo sustituye temporalmente por blanco al exportar, igual que ya
// hacía con el color de "clear" del renderer.
const SCENE_BG = "#1d1e26";

// Malla de fondo del cerebro 3D (petición de la usuaria, 30/08/2026: "falta
// una malla que simule el cerebro... las áreas no pueden aparecer 'en el
// aire'"), generada una sola vez por scripts/generate_brain_meshes.py a
// partir de archivos reales de la biblioteca -- ver el docstring de ese
// script y la decisión 22 de docs/analisis-arquitectura.md para la
// justificación completa. DOS mallas, nunca una, porque los cuatro atlas de
// NeuroGraph viven en dos espacios de referencia genuinamente distintos:
// mezclar todos los nodos sobre una única malla sería el mismo error de
// sistemas de coordenadas mixtos que prohíbe la sección 24. La clave de
// este mapa es siempre el valor REAL de `GraphNode.referenceSpace` (nunca
// el id del atlas): así, el día que un atlas nuevo declare uno de estos dos
// espacios ya conocidos, muestra su malla automáticamente sin tocar este
// componente, y un espacio todavía no soportado sencillamente no muestra
// ninguna malla en vez de adivinar la más parecida.
const REFERENCE_SPACE_MESH: Record<string, string> = {
  fsLR_32k_S1200_groupavg_midthickness_MSMAll: "/meshes/fslr32k_midthickness.glb",
  MNI152_FSL_2mm: "/meshes/mni152_fsl_2mm_brain.glb",
};

// Determina la malla de fondo a partir del espacio de referencia REAL de
// los nodos que de verdad se están mostrando -- nunca del id del atlas
// seleccionado en App.tsx (ese id es solo una etiqueta de interfaz; el
// espacio de referencia es el dato científico real que ya viaja en cada
// nodo desde el backend). `null` en tres casos, todos deliberados: datos de
// demostración (`referenceSpace` siempre `null`, nunca se les superpone una
// malla anatómica real -- sección 24), un espacio de referencia real pero
// todavía sin malla soportada (mejor no mostrar nada que una aproximación
// no verificada), o -- no debería ocurrir nunca con el diseño actual, que
// muestra un solo atlas a la vez, pero se comprueba en vez de asumirlo --
// varios espacios de referencia distintos mezclados en el mismo conjunto de
// nodos.
function resolveMeshUrl(nodes: GraphNode[]): string | null {
  const spaces = new Set(nodes.map((n) => n.referenceSpace).filter((s): s is string => s !== null));
  if (spaces.size !== 1) {
    if (spaces.size > 1) {
      // eslint-disable-next-line no-console
      console.error(
        "Brain3D: nodos con más de un espacio de referencia a la vez, no se muestra ninguna malla:",
        [...spaces]
      );
    }
    return null;
  }
  const [space] = spaces;
  return REFERENCE_SPACE_MESH[space] ?? null;
}

// El material translúcido único (30/08/2026, deliberadamente el mismo
// para las dos mallas de este componente: ninguna debe parecer más
// "real" que la otra) y el resto del tratamiento de la malla de fondo
// -- `depthWrite={false}`, `raycast={() => null}` -- ahora viven en
// `./ReferenceMesh.tsx` (extraído el 08/09/2026, decisión 63, al
// añadir la tercera malla de Tractography3D.tsx: mismo componente,
// nunca una copia que pudiera desincronizarse).
// Registro explícito de <threeLine> bajo la clave 'ThreeLine' del
// catálogo de react-three-fiber (en vez de confiar en que r3f le quite
// el prefijo "three" automáticamente). Confirmado el 28/08/2026: en esta
// versión (@react-three/fiber 9.7.0 + React 19), quitar el prefijo SÍ
// pasa al crear el elemento por primera vez, pero NO al actualizarlo
// (commitUpdate llama a validateInstance con el nombre sin recortar) —
// una inconsistencia real de la librería entre creación y actualización,
// nunca detectada antes porque `connections` siempre había estado vacío
// (Fase 4 no empezada): la primera vez que de verdad se dibujó una línea
// fue con los datos de demostración (que sí traen conexiones), al caer
// a ellos por un fallo de CORS — ver riesgo 12 del análisis de
// arquitectura. Con el registro explícito, la búsqueda en el catálogo
// encuentra 'ThreeLine' directamente tanto al crear como al actualizar,
// sin pasar nunca por ese mecanismo de recorte.
extend({ ThreeLine: THREE.Line });

// Centroide de un conjunto de nodos -- ver los dos usos distintos más
// abajo (centro de giro de la cámara, y el centro de referencia que YA no
// se usa para eso, ver el comentario junto a `target`).
function computeCentroid(nodes: GraphNode[]): THREE.Vector3 {
  if (nodes.length === 0) return new THREE.Vector3(0, 0, 0);
  const sum = nodes.reduce(
    (acc, n) => {
      acc.x += n.position3d[0];
      acc.y += n.position3d[1];
      acc.z += n.position3d[2];
      return acc;
    },
    { x: 0, y: 0, z: 0 }
  );
  return new THREE.Vector3(sum.x / nodes.length, sum.y / nodes.length, sum.z / nodes.length);
}

function Controls({ target }: { target: THREE.Vector3 }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  // Encontrado y corregido el 29/08/2026 (reportado por la usuaria:
  // "una dirección aleja el cerebro al mover el ratón, no solo con la
  // rueda" -- comportamiento errático, no un simple ajuste de
  // velocidad). La causa: `new OrbitControls(...)` tiene un efecto
  // secundario real en su propio constructor (engancha listeners de
  // puntero/rueda al DOM del canvas), y antes se creaba dentro de
  // `useMemo` -- pero `useMemo` es solo para cálculos puros. En
  // desarrollo, StrictMode invoca dos veces cualquier cálculo hecho
  // dentro de useMemo precisamente para detectar este tipo de
  // impureza: se creaban DOS instancias de OrbitControls enganchadas
  // al mismo canvas, pero solo la segunda quedaba guardada y con
  // `dispose()` en su limpieza -- la primera quedaba huérfana, sin
  // nadie que la desconectara, y seguía moviendo la cámara por su
  // cuenta en cada arrastre: dos sistemas de coordenadas esféricas
  // independientes escribiendo sobre la misma cámara a la vez, lo que
  // se sentía como una dirección que aleja el cerebro de forma
  // errática. `useEffect` sí tiene un ciclo de limpieza real en
  // StrictMode (monta -> limpia -> monta de nuevo), así que aquí la
  // instancia se crea una sola vez de verdad por cada montaje real.
  useEffect(() => {
    // Eje de giro anatómicamente correcto (30/08/2026, corrige una queja
    // real de la usuaria, insistiendo tras la decisión 23: "el encéfalo
    // sigue siendo incómodo de mover. El eje fronto-occipital debe ser
    // cambiado por un eje sagital"). Causa real, no encontrada hasta ahora:
    // `position3d` guarda las coordenadas reales tal como las da el
    // backend -- convención estándar de neuroimagen, X = izquierda-derecha,
    // Y = posterior-anterior (el eje fronto-occipital), Z =
    // inferior-superior -- pero nunca se remapea a la convención "Y arriba"
    // de three.js/OrbitControls. Como `OrbitControls` gira siempre
    // alrededor del vector `up` de la cámara (por defecto (0,1,0)), y ese
    // (0,1,0) coincidía con el eje Y de los DATOS (fronto-occipital), el
    // polo real de cada giro era ese eje -- exactamente lo que la usuaria
    // identifica y pide cambiar. Con `up` puesto en (0,0,1) (el eje Z real,
    // inferior-superior), el polo de giro pasa a ser el eje vertical
    // anatómico de verdad: mover el ratón gira el cerebro alrededor de su
    // propio eje superoinferior, dejando alcanzar con normalidad una vista
    // sagital (lateral) en vez de quedar atrapada girando alrededor del
    // eje fronto-occipital. No se ha tocado ninguna coordenada de nodos,
    // conexiones ni malla -- viven en el mismo espacio de siempre; el único
    // cambio real es qué vector usa `OrbitControls` como polo.
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enablePan = false;
    // Límites de zoom: sin ellos, la rueda del ratón puede acercar la
    // cámara casi hasta el plano "near" (todo se recorta) o alejarla
    // muchísimo (el cerebro se vuelve un punto).
    controls.minDistance = 2;
    controls.maxDistance = 30;
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);

  // Sincronizar el objetivo de la cámara es un efecto aparte, separado
  // de la creación: `target` (30/08/2026, ver el comentario junto a su
  // cálculo en Brain3D más abajo -- ahora es el centro del cerebro
  // completo, estable, no el foco actual) solo cambia de identidad al
  // cambiar de atlas, y no queremos destruir y recrear los controles --
  // perdiendo el ángulo de cámara actual de la usuaria -- por eso.
  useEffect(() => {
    controlsRef.current?.target.copy(target);
    controlsRef.current?.update();
  }, [target]);

  useFrame(() => controlsRef.current?.update());
  return null;
}

// Si el contexto WebGL se pierde (ocurre en algunos equipos con GPU
// integrada cuando hay muchos objetos en pantalla), el navegador no lanza
// ningún error de JavaScript: simplemente deja de dibujar, y la escena
// desaparece sin avisar — el síntoma exacto de "parece que ha crusheado".
// Esto lo detecta y avisa en vez de dejar un lienzo en blanco sin
// explicación.
function ContextLossWatcher({ onLost }: { onLost: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      // eslint-disable-next-line no-console
      console.error("Se perdió el contexto WebGL del cerebro 3D.");
      onLost();
    };
    canvas.addEventListener("webglcontextlost", handleLost);
    return () => canvas.removeEventListener("webglcontextlost", handleLost);
  }, [gl, onLost]);
  return null;
}

// Puente para exportar el frame actual del canvas WebGL a JPEG en color
// sobre fondo blanco (sección 20; decisión de la usuaria, 30/08/2026,
// ver docs/analisis-arquitectura.md): react-three-fiber no expone
// gl/scene/camera fuera del árbol de <Canvas>, así que este componente
// vive dentro de él solo para guardar una función de exportación en el
// ref que le pasa Brain3D. Se fuerza primero un frame con fondo blanco
// opaco, se lee el canvas, y se restaura el fondo original para no
// alterar lo que ve la usuaria en pantalla.
//
// Bug real encontrado y corregido el 30/08/2026 (decisión 18, junto con
// el tema oscuro): esto SOLO cambiaba `gl.setClearColor`, que es lo que
// pinta el renderer cuando `scene.background` es `null`. Ahora que la
// escena tiene un fondo propio (`SCENE_BG`, ver `<color attach=
// "background">` en `Brain3D`), `scene.background` GANA siempre sobre el
// color de "clear" -- forzar solo `setClearColor` habría exportado igual
// el fondo oscuro en vez de blanco, deshaciendo en la práctica la
// decisión 11 en cuanto se activara el tema oscuro. Por eso aquí se
// sustituye también `scene.background` temporalmente, no solo el color
// de "clear".
function ExportBridge({ exportRef }: { exportRef: { current: (() => void) | null } }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    exportRef.current = () => {
      const previousClearColor = gl.getClearColor(new THREE.Color());
      const previousClearAlpha = gl.getClearAlpha();
      const previousBackground = scene.background;
      gl.setClearColor("#ffffff", 1);
      scene.background = new THREE.Color("#ffffff");
      gl.render(scene, camera);
      exportCanvasAsJpeg(gl.domElement, `neurograph-cerebro3d-${Date.now()}.jpg`);
      gl.setClearColor(previousClearColor, previousClearAlpha);
      scene.background = previousBackground;
      gl.render(scene, camera);
    };
    return () => {
      exportRef.current = null;
    };
  }, [gl, scene, camera, exportRef]);
  return null;
}

// Etiqueta de abreviatura junto al nodo (decisión de la usuaria,
// 30/08/2026: la abreviatura debe aparecer en el propio dibujo, no solo
// al seleccionar/pasar el ratón). `<sprite>` mira siempre a la cámara
// por definición (billboard), así que el texto nunca queda de canto.
// Se omite por completo cuando la región no tiene abreviatura registrada
// todavía (atlas sin backfill de la migración 0007): nunca se inventa
// una a partir de `label`.
function NodeLabel({ node }: { node: GraphNode }) {
  // useMemo va antes que cualquier retorno condicional (regla de los
  // hooks: el orden de llamada no puede depender de datos) -- por eso
  // el texto de repuesto "" en vez de omitir la llamada cuando no hay
  // abreviatura; getLabelTexture("") solo se pide una vez por caché.
  const label = useMemo(() => getLabelTexture(node.abbreviation ?? ""), [node.abbreviation]);
  if (!node.abbreviation) return null;
  // Separación aumentada (30/08/2026, ronda de ajustes tras revisión
  // visual: "las abreviaturas... se confunden con la esfera") de 0.15 a
  // 0.24 -- junto con el radio de nodo reducido en NodeMesh (baseRadius,
  // más abajo), deja un hueco visible entre la esfera y su etiqueta en
  // vez de que la etiqueta arranque casi pegada al borde superior.
  const position: [number, number, number] = [
    node.position3d[0],
    node.position3d[1] + 0.24,
    node.position3d[2],
  ];
  // Ancho del sprite proporcional al aspecto real de la textura (corregido
  // 30/08/2026: "los nombres... se ven cortados"). Antes el sprite usaba
  // una escala fija [0.32, 0.13, 1] emparejada con un canvas de ancho
  // también fijo en textSprite.ts -- cualquier abreviatura más larga que
  // esa combinación (p. ej. "9-46d", "l_default_12") ya llegaba recortada
  // desde la propia textura. Ahora textSprite.ts dimensiona el canvas al
  // texto real y expone su proporción (`aspect`); aquí se mantiene la
  // altura fija y se calcula el ancho a partir de esa proporción, así el
  // texto nunca sale cortado ni deformado sea cual sea su longitud.
  const labelHeight = 0.13;
  const labelWidth = labelHeight * label.aspect;
  return (
    <sprite position={position} scale={[labelWidth, labelHeight, 1]}>
      <spriteMaterial map={label.texture} transparent depthWrite={false} sizeAttenuation />
    </sprite>
  );
}

function NodeMesh({
  node,
  isHomologyHighlighted,
}: {
  node: GraphNode;
  // Homología real hacia la especie de comparación elegida (02/09/2026,
  // ver HomologyComparisonControl más abajo): SIEMPRE calculado a partir
  // de filas `Homology` ya cargadas (GET /homologies?species_id=...,
  // decisión 34) -- nunca una lista de regiones inventada. `false` por
  // defecto (ninguna especie de comparación elegida, o esta región en
  // concreto no tiene ninguna fila de homología real hacia ella).
  isHomologyHighlighted: boolean;
}) {
  const { selectedNodeIds, toggleNode } = useSelectionStore();
  const isSelected = selectedNodeIds.has(node.id);
  // Radio reducido dos veces (30/08/2026, ronda de ajustes tras revisión
  // visual: primero de 0.16/0.11 a 0.12/0.08, y de nuevo -- "aún más
  // pequeños" -- a 0.09/0.06) -- deja más espacio real alrededor de cada
  // nodo, tanto para distinguir nodos vecinos entre sí como para separar
  // visualmente la esfera de su etiqueta (ver NodeLabel).
  const baseRadius = isSelected ? 0.09 : 0.06;
  // Vista en dos colores por homología real (02/09/2026, petición de la
  // usuaria tras cerrar el resto del inventario pendiente): el color de
  // red real (NETWORK_COLORS) es la codificación por defecto de SIEMPRE,
  // igual que en Connectogram.tsx/Hemisferios.tsx -- este resaltado solo
  // lo SUSTITUYE, nunca lo combina ni lo atenúa, para que las dos
  // señales (red funcional real / homología real) nunca se mezclen en
  // un tercer color ambiguo que no sea ninguna de las dos.
  const fillColor = isHomologyHighlighted
    ? HOMOLOGY_HIGHLIGHT_COLOR
    : NETWORK_COLORS[node.network] ?? "#888";
  return (
    <>
      {/* Halo de contorno neutro (decisión 18, 30/08/2026) -- equivalente
          3D del `stroke` que ya llevaba el nodo en Connectogram.tsx/
          Hemisferios.tsx. El color de relleno de abajo es SIEMPRE el
          color de red real (NETWORK_COLORS, extraído del atlas de
          origen -- nunca se toca), pero algunos de esos colores reales
          son extremos (p. ej. "#000000" de gordon333.salience): con
          `meshStandardMaterial`, un color puramente negro no refleja
          NADA de luz ambiental/puntual, así que ese nodo desaparecería
          literalmente contra el fondo oscuro de la escena. Este segundo
          mesh, un poco más grande y con las caras traseras hacia fuera
          (`side: THREE.BackSide`), deja ver solo un fino borde alrededor
          del nodo real -- técnica estándar de "contorno por casco
          invertido". Usa NEUTRAL_COLOR/ACCENT_SELECTED_COLOR (theme/
          networks.ts), los mismos "colores intermedios" legibles tanto
          en pantalla (fondo oscuro) como en la exportación (blanco
          forzado, ver ExportBridge) -- por eso el halo también se ve
          bien en la figura exportada, no solo en pantalla. */}
      <mesh position={node.position3d} scale={1.18}>
        <sphereGeometry args={[baseRadius, 14, 14]} />
        <meshBasicMaterial
          color={isSelected ? ACCENT_SELECTED_COLOR : NEUTRAL_COLOR}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh position={node.position3d} onClick={() => toggleNode(node.id)}>
        {/* 14x14 en vez de 24x24: con cientos de regiones reales, cada
            segmento de más cuesta 360 veces más caro que en la demo de 8
            nodos. Sigue viéndose redondo a esta escala. */}
        <sphereGeometry args={[baseRadius, 14, 14]} />
        <meshStandardMaterial
          color={fillColor}
          emissive={isSelected ? "#ffffff" : "#000000"}
          emissiveIntensity={isSelected ? 0.4 : 0}
        />
      </mesh>
      <NodeLabel node={node} />
    </>
  );
}

function DirectionArrow({
  from,
  to,
  color,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
}) {
  // Un pequeño cono a un 80% del trayecto, orientado de origen a destino:
  // el equivalente 3D de la flecha del connectograma para conectividad
  // efectiva (sección 5.1: "Se puede codificar dirección... mediante
  // flechas").
  const position = useMemo(() => from.clone().lerp(to, 0.8), [from, to]);
  const quaternion = useMemo(() => {
    const direction = to.clone().sub(from).normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction
    );
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <coneGeometry args={[0.035, 0.09, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function ConnectionLine({
  a,
  b,
  isSelected,
  isDashed,
  isDirected,
  onClick,
}: {
  a: [number, number, number];
  b: [number, number, number];
  isSelected: boolean;
  isDashed: boolean;
  isDirected: boolean;
  onClick: () => void;
}) {
  const from = useMemo(() => new THREE.Vector3(...a), [a]);
  const to = useMemo(() => new THREE.Vector3(...b), [b]);
  // Colores "intermedios" (decisión 18, 30/08/2026), no "#222222"/
  // "#999999": el primero tenía casi cero contraste contra el fondo
  // oscuro de la escena (una conexión SELECCIONADA era casi invisible,
  // justo el caso que más importa distinguir) -- ver theme/networks.ts.
  const color = isSelected ? ACCENT_SELECTED_COLOR : NEUTRAL_COLOR;

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints([from, to]);
    if (isDashed) {
      // computeLineDistances() vive en THREE.Line, no en BufferGeometry;
      // como aquí no tenemos la instancia de Line todavía, se calcula a
      // mano el atributo lineDistance que necesita lineDashedMaterial
      // (con dos puntos es solo [0, distancia entre ambos]).
      geom.setAttribute(
        "lineDistance",
        new THREE.Float32BufferAttribute([0, from.distanceTo(to)], 1)
      );
    }
    return geom;
  }, [from, to, isDashed]);

  return (
    <>
      <threeLine geometry={geometry} onClick={onClick}>
        {isDashed ? (
          <lineDashedMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.95 : 0.55}
            dashSize={0.08}
            gapSize={0.06}
          />
        ) : (
          <lineBasicMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.95 : 0.55}
          />
        )}
      </threeLine>
      {isDirected && <DirectionArrow from={from} to={to} color={color} />}
    </>
  );
}

// Estado de carga de la lista de especies reales (mismo patrón que
// SpeciesComparisonPanel.tsx -- unión discriminada, nunca un booleano
// "loading" suelto que no distinga "cargando" de "vacío por error").
type SpeciesListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; items: SpeciesListItem[] };

// Estado de la homología real hacia la especie de comparación elegida.
// "idle" (ninguna especie elegida todavía) es un estado real aparte de
// "loaded con cero resultados" (especie elegida, pero sin ninguna fila
// de homología real que la toque) -- las dos situaciones deben poder
// distinguirse en el mensaje que ve la usuaria.
type HomologyState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; ids: Set<string>; matchCount: number };

// Conjunto vacío estable (misma identidad en cada render) para el caso
// "sin homología resaltada todavía" -- evita crear un `Set` nuevo en
// cada render de Brain3D cuando `HomologyState` no está en "loaded".
const EMPTY_HOMOLOGY_IDS: Set<string> = new Set();

// Control de "resaltar por homología real hacia..." (02/09/2026,
// petición de la usuaria: "vista 3D en dos colores", resuelta como una
// capacidad general -- ver el comentario junto a HOMOLOGY_HIGHLIGHT_COLOR
// en theme/networks.ts para el porqué -- en vez de una lista fija de
// regiones inventada). Vive fuera del `if (!focus)`/`return` principal
// de Brain3D para que el control se muestre y mantenga su selección
// tanto si hay algo seleccionado en el connectograma como si no --
// mismo criterio que un filtro, no que la propia vista de foco.
function HomologyComparisonControl({
  speciesList,
  comparisonSpeciesId,
  onChangeComparisonSpeciesId,
  homology,
}: {
  speciesList: SpeciesListState;
  comparisonSpeciesId: string;
  onChangeComparisonSpeciesId: (id: string) => void;
  homology: HomologyState;
}) {
  return (
    <div className="brain3d-homology">
      <label>
        Resaltar homología real hacia:{" "}
        <select
          value={comparisonSpeciesId}
          onChange={(e) => onChangeComparisonSpeciesId(e.target.value)}
          disabled={speciesList.kind !== "loaded"}
        >
          <option value="">(ninguna)</option>
          {speciesList.kind === "loaded" &&
            speciesList.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.scientificName}
              </option>
            ))}
        </select>
      </label>
      {speciesList.kind === "error" && (
        <span className="brain3d-homology__status brain3d-homology__status--error">
          No se pudo cargar la lista de especies reales.
        </span>
      )}
      {homology.kind === "loading" && (
        <span className="brain3d-homology__status">Buscando homología real…</span>
      )}
      {homology.kind === "error" && (
        <span className="brain3d-homology__status brain3d-homology__status--error">{homology.message}</span>
      )}
      {homology.kind === "loaded" && (
        <span className="brain3d-homology__status">
          {homology.matchCount === 0
            ? "Sin homología real cargada hacia esta especie todavía."
            : `${homology.ids.size} región(es) con homología real hacia esta especie -- resaltadas en naranja.`}
        </span>
      )}
    </div>
  );
}

interface Props {
  nodes: GraphNode[];
  connections: GraphConnection[];
}

// Calcula el subgrafo de foco actual a partir de la selección compartida
// (sección 5.3) -- nunca el grafo completo. Devuelve `null` cuando no hay
// nada seleccionado: eso es una situación real distinta de "selección
// con red vacía" (p. ej. un nodo real sin ninguna conexión todavía), así
// que quien llama debe poder distinguirlas.
function computeFocus(
  nodes: GraphNode[],
  connections: GraphConnection[],
  selectedNodeIds: Set<string>,
  selectedConnectionId: string | null
): { nodes: GraphNode[]; connections: GraphConnection[] } | null {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  if (selectedConnectionId) {
    const conn = connections.find((c) => c.id === selectedConnectionId);
    if (!conn) return null;
    const source = nodeById.get(conn.source);
    const target = nodeById.get(conn.target);
    if (!source || !target) return null;
    return { nodes: [source, target], connections: [conn] };
  }

  if (selectedNodeIds.size >= 2) {
    const induced = inducedConnections(connections, selectedNodeIds) ?? [];
    const focusNodes = nodes.filter((n) => selectedNodeIds.has(n.id));
    if (focusNodes.length === 0) return null;
    return { nodes: focusNodes, connections: induced };
  }

  if (selectedNodeIds.size === 1) {
    const [id] = selectedNodeIds;
    const center = nodeById.get(id);
    if (!center) return null;
    const related = connections.filter((c) => c.source === id || c.target === id);
    const neighborIds = new Set<string>([id]);
    for (const c of related) {
      neighborIds.add(c.source);
      neighborIds.add(c.target);
    }
    const focusNodes = nodes.filter((n) => neighborIds.has(n.id));
    return { nodes: focusNodes, connections: related };
  }

  return null;
}

export function Brain3D({ nodes: allNodes, connections: allConnections }: Props) {
  const { selectedNodeIds, selectedConnectionId, selectConnection } = useSelectionStore();
  const filters = useFiltersStore();
  const { nodes, connections: filteredConnections } = filterGraph(allNodes, allConnections, filters);

  const focus = useMemo(
    () => computeFocus(nodes, filteredConnections, selectedNodeIds, selectedConnectionId),
    [nodes, filteredConnections, selectedNodeIds, selectedConnectionId]
  );

  // Tope de seguridad (01/09/2026, mismo criterio y mismo diagnóstico real
  // que Connectogram.tsx/Hemisferios.tsx -- ver logic/renderSafety.ts). El
  // riesgo aquí es menor por construcción (`computeFocus` ya acota las
  // conexiones a las que tocan la selección, y el botón "Ver en 3D" de
  // FilterPanel.tsx selecciona una red completa, no el grafo entero), pero
  // una red real con muchas regiones puede seguir induciendo miles de
  // conexiones -- se aplica el mismo tope por seguridad, nunca un
  // subconjunto truncado al azar.
  const tooManyFocusConnections = (focus?.connections.length ?? 0) > MAX_RENDERED_CONNECTIONS;
  const visibleFocusConnections = tooManyFocusConnections ? [] : (focus?.connections ?? []);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  // A partir de TODOS los nodos del atlas actual (nunca solo los filtrados
  // ni solo los del foco actual): la malla de fondo representa el espacio
  // de referencia del atlas cargado, no cambia según qué esté seleccionado
  // ni según qué filtros estén activos ahora mismo.
  const meshUrl = useMemo(() => resolveMeshUrl(allNodes), [allNodes]);
  const [contextLost, setContextLost] = useState(false);
  // Eje de giro de la cámara (30/08/2026, corrige una queja real de la
  // usuaria: "la sensación al rotar el cerebro es incómoda... pon el eje
  // de giro en el centro del cerebro, no detrás, no consigo encuadrar una
  // vista lateral"). Antes se recalculaba en cada selección a partir de
  // `focus.nodes` (solo el nodo/conexión elegidos y sus vecinos directos)
  // -- un puñado de regiones que rara vez está cerca del centro
  // anatómico real, así que el punto sobre el que gira `OrbitControls`
  // saltaba de un sitio a otro según qué estuviera seleccionado, muchas
  // veces lejos del centro de la cabeza: girar la cámara alrededor de un
  // punto así se siente como si el eje estuviera "detrás" del cerebro en
  // vez de en su centro, y nunca hay un ángulo estable desde el que
  // encuadrar una vista lateral limpia. Ahora el objetivo es el centroide
  // de TODOS los nodos del atlas actual (`allNodes`, nunca solo el foco ni
  // los filtrados) -- un punto fijo, estable, que no se mueve al
  // seleccionar otra cosa, y que al promediar regiones repartidas por
  // todo el cerebro cae cerca del centro anatómico real. La región
  // seleccionada se sigue distinguiendo por color/resalte (NodeMesh), no
  // moviendo la cámara hacia ella -- si hace falta acercarse a algo
  // concreto, la rueda del ratón controla el zoom.
  const target = useMemo(() => computeCentroid(allNodes), [allNodes]);
  const exportRef = useRef<(() => void) | null>(null);
  const handleExport = () => exportRef.current?.();

  // Lista de especies reales para el selector de comparación (mismo
  // origen que SpeciesComparisonPanel.tsx: GET /species) -- se pide una
  // sola vez al montar, nunca por cada cambio de selección/foco.
  const [speciesList, setSpeciesList] = useState<SpeciesListState>({ kind: "loading" });
  useEffect(() => {
    let cancelled = false;
    fetchSpeciesList()
      .then((items) => {
        if (!cancelled) setSpeciesList({ kind: "loaded", items });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "error desconocido";
          setSpeciesList({ kind: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Homología real hacia la especie de comparación elegida (02/09/2026).
  // Se conserva aunque cambie la selección del connectograma (no vive
  // dentro de `focus`) para no obligar a la usuaria a volver a elegir
  // especie cada vez que selecciona otra región.
  const [comparisonSpeciesId, setComparisonSpeciesId] = useState("");
  const [homology, setHomology] = useState<HomologyState>({ kind: "idle" });
  // Volver a "idle" al deseleccionar la especie de comparación se hace
  // aquí, desde el propio evento que lo causa -- no dentro del efecto de
  // abajo (que solo debe sincronizar con la API externa cuando SÍ hay
  // especie elegida) -- mismo criterio que sugiere el aviso real de
  // oxlint react(set-state-in-effect): "derive the value during render,
  // initialize state directly, or update it from the event that caused
  // the change".
  const handleChangeComparisonSpeciesId = (id: string) => {
    setComparisonSpeciesId(id);
    if (!id) setHomology({ kind: "idle" });
  };
  useEffect(() => {
    if (!comparisonSpeciesId) return;
    let cancelled = false;
    setHomology({ kind: "loading" });
    fetchHomologiesForSpecies(comparisonSpeciesId)
      .then((matches) => {
        if (!cancelled) {
          setHomology({ kind: "loaded", ids: homologyRegionIds(matches), matchCount: matches.length });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "error desconocido";
          setHomology({ kind: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [comparisonSpeciesId]);
  const homologyNodeIds = homology.kind === "loaded" ? homology.ids : EMPTY_HOMOLOGY_IDS;

  const homologyControl = (
    <HomologyComparisonControl
      speciesList={speciesList}
      comparisonSpeciesId={comparisonSpeciesId}
      onChangeComparisonSpeciesId={handleChangeComparisonSpeciesId}
      homology={homology}
    />
  );

  if (contextLost) {
    return (
      <p className="canvas-error">
        Se perdió el contexto gráfico (WebGL) al dibujar el cerebro 3D —
        pasa a veces con muchos objetos en pantalla en algunos equipos.
        Recarga la página. Si se repite, dime qué navegador y sistema usas.
      </p>
    );
  }

  // Vista de foco, no de conjunto (decisión de la usuaria, 30/08/2026):
  // sin nada seleccionado, este panel no dibuja el grafo completo -- ya
  // lo hacen el connectograma y Hemisferios. Invita a seleccionar algo
  // en cualquiera de los otros dos en vez de mostrar un lienzo vacío sin
  // explicación.
  if (!focus) {
    return (
      <>
        {homologyControl}
        <div className="brain3d-focus-placeholder">
          Selecciona una región (o una conexión) en el connectograma o en
          el esquema de hemisferios para ver aquí, en 3D, su red de
          conectividad.
        </div>
      </>
    );
  }

  return (
    <>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flex: "0 0 auto", flexWrap: "wrap", gap: 8 }}>
      {homologyControl}
      <button type="button" className="export-btn" onClick={handleExport}>
        Exportar JPEG
      </button>
    </div>
    {tooManyFocusConnections && (
      <p className="connectogram-toomany-warning">
        Hay {focus.connections.length} conexiones reales entre los nodos
        seleccionados — demasiadas para dibujar aquí sin riesgo. Se
        muestran los nodos, pero ninguna línea. Reduce la selección o
        sube el "peso mínimo" en el panel de Filtros.
      </p>
    )}
    {/* flex:1 + minHeight:0: canvas-wrap ahora es una columna flex (ver
        App.css) para que este panel comparta altura con el botón de
        arriba en vez de desbordar el contenedor de altura fija --
        minHeight:0 es necesario porque un hijo flex por defecto no se
        encoge por debajo de su contenido, y el <Canvas> de r3f no tiene
        una altura de contenido intrínseca útil aquí. */}
    <div style={{ flex: "1 1 auto", minHeight: 0 }}>
    <Canvas
      // preserveDrawingBuffer: sin esto, no hay garantía de que el
      // contenido siga en el búfer de dibujo en el momento de leerlo
      // con toBlob/toDataURL (el navegador puede limpiarlo antes del
      // siguiente frame) -- necesario para que la exportación a JPEG
      // sea fiable en vez de "funciona a veces".
      gl={{ preserveDrawingBuffer: true }}
      // Posición inicial de la cámara (30/08/2026, parte de la misma
      // corrección que `camera.up.set(0, 0, 1)` en Controls más arriba):
      // con el polo de giro ahora en el eje Z real (inferior-superior),
      // una cámara en [0, 0, 6] quedaría situada EXACTAMENTE sobre ese
      // polo -- una vista inicial degenerada (mirando el cerebro desde
      // arriba, por el propio eje de giro), el mismo tipo de problema que
      // se acaba de corregir, solo que ahora alrededor del eje "correcto".
      // Colocarla en el eje X (izquierda-derecha) en su lugar da, por
      // construcción, una vista lateral (sagital) de partida -- exactamente
      // lo que la usuaria pedía poder encuadrar.
      camera={{ position: [6, 0, 0], fov: 45 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          "webglcontextrestored",
          () => setContextLost(false),
          { once: true }
        );
      }}
    >
      {/* Fondo de la escena (decisión 18, 30/08/2026): antes no se fijaba
          ningún fondo, así que el <Canvas> quedaba transparente y dejaba
          ver el fondo de la página (blanco, antes de esta misma
          decisión) -- ahora usa el mismo tono que el resto de paneles en
          pantalla (SCENE_BG = --panel-bg). ExportBridge lo sustituye
          temporalmente por blanco al exportar. */}
      <color attach="background" args={[SCENE_BG]} />
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={60} />
      <Controls target={target} />
      <ContextLossWatcher onLost={() => setContextLost(true)} />
      <ExportBridge exportRef={exportRef} />
      {/* Malla de fondo (30/08/2026, petición de la usuaria) -- ver
          REFERENCE_SPACE_MESH/resolveMeshUrl más arriba y ReferenceMesh.tsx. Envuelta
          en su propio ErrorBoundary (nunca el mismo que usa App.tsx para
          todo el panel): si el .glb no carga por lo que sea, el cerebro 3D
          sigue mostrando nodos y conexiones con normalidad, solo sin fondo
          anatómico -- un fallo de la malla nunca debe tirar toda la vista
          de foco. `<Suspense>` es obligatorio: `useLoader` suspende
          mientras el archivo se descarga la primera vez (luego queda en
          caché por url). */}
      {meshUrl && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <ReferenceMesh url={meshUrl} />
          </Suspense>
        </ErrorBoundary>
      )}
      {focus.nodes.map((node) => (
        <NodeMesh key={node.id} node={node} isHomologyHighlighted={homologyNodeIds.has(node.id)} />
      ))}
      {visibleFocusConnections.map((conn) => {
        const a = nodeById.get(conn.source);
        const b = nodeById.get(conn.target);
        if (!a || !b) return null;
        // Todo lo que aparece en la vista de foco está, por construcción,
        // "seleccionado" en algún sentido (toca al nodo elegido, es la
        // conexión elegida, o une a dos nodos de la selección múltiple) --
        // por eso basta con reutilizar las mismas condiciones que ya
        // existían, sin una bandera aparte para el caso de selección
        // múltiple.
        const isSelected =
          selectedConnectionId === conn.id ||
          selectedNodeIds.has(conn.source) ||
          selectedNodeIds.has(conn.target);
        return (
          <ConnectionLine
            key={conn.id}
            a={a.position3d}
            b={b.position3d}
            isSelected={isSelected}
            isDashed={conn.evidenceLevel !== "direct"}
            isDirected={conn.type === "effective"}
            onClick={() => selectConnection(conn.id)}
          />
        );
      })}
    </Canvas>
    </div>
    </>
  );
}
