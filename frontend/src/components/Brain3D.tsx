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
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import type { GraphConnection, GraphNode } from "../types/domain";
import { useSelectionStore } from "../state/selection";
import { useFiltersStore } from "../state/filters";
import { filterGraph } from "../logic/visibility";
import { inducedConnections } from "../logic/induced";
import { exportCanvasAsJpeg } from "../logic/exportImage";
import { getLabelTexture } from "../logic/textSprite";
import { NETWORK_COLORS } from "../theme/networks";

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

// Centro de la vista: se calcula a partir de los nodos que de verdad
// están en foco en cada momento (no de todo el grafo) -- así, al
// seleccionar una región lejos del centro del cerebro, la cámara se
// recentra sobre lo que hay que mirar en vez de dejarlo fuera de
// encuadre.
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
  // de la creación: `target` cambia de identidad cada vez que cambia el
  // foco actual (ver computeCentroid más arriba), y no queremos destruir
  // y recrear los controles -- perdiendo el ángulo de cámara actual del
  // usuario -- solo porque el centroide se recalculó.
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
// ref que le pasa Brain3D. Leer el canvas tal cual se ve en pantalla
// capturaría su fondo transparente (o el que tenga cuando exista un
// tema oscuro) -- para que la imagen sirva como figura de paper, se
// fuerza primero un frame con color de fondo blanco opaco, se lee el
// canvas, y se restaura el fondo original para no alterar lo que ve la
// usuaria en pantalla.
function ExportBridge({ exportRef }: { exportRef: { current: (() => void) | null } }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    exportRef.current = () => {
      const previousClearColor = gl.getClearColor(new THREE.Color());
      const previousClearAlpha = gl.getClearAlpha();
      gl.setClearColor("#ffffff", 1);
      gl.render(scene, camera);
      exportCanvasAsJpeg(gl.domElement, `neurograph-cerebro3d-${Date.now()}.jpg`);
      gl.setClearColor(previousClearColor, previousClearAlpha);
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
  const texture = useMemo(() => getLabelTexture(node.abbreviation ?? ""), [node.abbreviation]);
  if (!node.abbreviation) return null;
  const position: [number, number, number] = [
    node.position3d[0],
    node.position3d[1] + 0.15,
    node.position3d[2],
  ];
  return (
    <sprite position={position} scale={[0.32, 0.13, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} sizeAttenuation />
    </sprite>
  );
}

function NodeMesh({ node }: { node: GraphNode }) {
  const { selectedNodeIds, toggleNode } = useSelectionStore();
  const isSelected = selectedNodeIds.has(node.id);
  return (
    <>
      <mesh position={node.position3d} onClick={() => toggleNode(node.id)}>
        {/* 14x14 en vez de 24x24: con cientos de regiones reales, cada
            segmento de más cuesta 360 veces más caro que en la demo de 8
            nodos. Sigue viéndose redondo a esta escala. */}
        <sphereGeometry args={[isSelected ? 0.16 : 0.11, 14, 14]} />
        <meshStandardMaterial
          color={NETWORK_COLORS[node.network] ?? "#888"}
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
  const color = isSelected ? "#222222" : "#999999";

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
            opacity={isSelected ? 0.95 : 0.35}
            dashSize={0.08}
            gapSize={0.06}
          />
        ) : (
          <lineBasicMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.95 : 0.35}
          />
        )}
      </threeLine>
      {isDirected && <DirectionArrow from={from} to={to} color={color} />}
    </>
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

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const [contextLost, setContextLost] = useState(false);
  const target = useMemo(
    () => computeCentroid(focus?.nodes ?? []),
    [focus]
  );
  const exportRef = useRef<(() => void) | null>(null);
  const handleExport = () => exportRef.current?.();

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
      <div className="brain3d-focus-placeholder">
        Selecciona una región (o una conexión) en el connectograma o en
        el esquema de hemisferios para ver aquí, en 3D, su red de
        conectividad.
      </div>
    );
  }

  return (
    <>
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4, flex: "0 0 auto" }}>
      <button type="button" className="export-btn" onClick={handleExport}>
        Exportar JPEG
      </button>
    </div>
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
      camera={{ position: [0, 0, 6], fov: 45 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          "webglcontextrestored",
          () => setContextLost(false),
          { once: true }
        );
      }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={60} />
      <Controls target={target} />
      <ContextLossWatcher onLost={() => setContextLost(true)} />
      <ExportBridge exportRef={exportRef} />
      {focus.nodes.map((node) => (
        <NodeMesh key={node.id} node={node} />
      ))}
      {focus.connections.map((conn) => {
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
