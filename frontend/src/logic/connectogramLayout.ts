// Geometría del connectograma de la fase 4 del rediseño
// (docs/rediseno-interfaz-diseno.md, 6.1). Funciones puras: se prueban sin
// DOM. El dibujo de los nodos y las marcas de regiones (5.9) usan las mismas,
// así que la pastilla de una región marcada sigue exactamente a su etiqueta.
import { pillAround, type TextAnchor } from "./marks";

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

// --- Espacio de las etiquetas (6.1) ---
//
// Decisión del usuario del 25/09/2026: el margen entre el anillo de los nodos
// y el borde del dibujo se reserva según la etiqueta más larga, para que
// ninguna se corte. Antes era fijo, de 40 px: las abreviaturas cortas de
// HCP-MMP1.0 cabían, pero las largas de Brainnetome, Gordon 333 o el
// Subcórtex se cortaban por los lados, y giradas se cortarían también arriba
// y abajo. Los 40 px siguen siendo el mínimo: con etiquetas cortas el círculo
// mide lo de siempre, o casi, y con largas se encoge lo justo. La regla del
// tamaño de la letra según el número de nodos no cambia.

// El margen de siempre (radio = lado / 2 − 40), del desarrollador principal.
export const RING_MARGIN = 40;

// Ancho estimado de una etiqueta, sin DOM y antes de dibujarla: sus letras
// contadas por grupos, con el avance medio de cada grupo en Atkinson
// Hyperlegible Next con peso 700 (el de una etiqueta ampliada, el más ancho),
// medido en el archivo de la fuente (src/assets/fonts), en em:
// - estrechas: i, j, l, f, r, t, I, 1, el espacio y los signos, 0,36;
// - anchas: las demás mayúsculas, m y w, 0,68;
// - las demás minúsculas, las cifras y lo que no sea ASCII, 0,57.
// Encima, un 10 % de seguridad: cubre las letras más anchas de cada grupo y
// la fuente del sistema con que sale el JPEG (logic/exportImage.ts), que no
// es la de la pantalla. Y el espaciado entre letras de la página (:root, en
// index.css), que el texto del SVG hereda.
const NARROW_LETTERS = /[fijlrtI1\s.,:;'"|!()[\]{}_/-]/;
const WIDE_LETTERS = /[A-HJ-Zmw]/;
const NARROW_ADVANCE = 0.36;
const WIDE_ADVANCE = 0.68;
const REGULAR_ADVANCE = 0.57;
const LABEL_WIDTH_SAFETY = 1.1;
const PAGE_LETTER_SPACING = 0.18;

export function estimatedLabelWidth(text: string, fontSize: number): number {
  let ems = 0;
  let letters = 0;
  for (const letter of text) {
    ems += NARROW_LETTERS.test(letter) ? NARROW_ADVANCE : WIDE_LETTERS.test(letter) ? WIDE_ADVANCE : REGULAR_ADVANCE;
    letters += 1;
  }
  return ems * fontSize * LABEL_WIDTH_SAFETY + letters * PAGE_LETTER_SPACING;
}

// Las cuentas de las etiquetas en el dibujo de los nodos
// (components/Connectogram.tsx): la etiqueta empieza a 7 px del borde de su
// nodo, y una región ampliada (seleccionada o con el ratón encima) tiene el
// nodo 3 px mayor y la letra 1,5 px mayor, en negrita.
const LABEL_GAP = 7;
const ENLARGED_NODE_GROWTH = 3;
const ENLARGED_FONT_GROWTH = 1.5;

export interface LabelReach {
  // Del anillo de los nodos al final de la etiqueta más larga, en reposo.
  rest: number;
  // Del anillo al final de la etiqueta más larga ampliada, con la pastilla
  // de una región marcada (5.9) alrededor: lo más lejos que llega una
  // etiqueta.
  enlarged: number;
}

export function labelReach(labels: readonly (string | null)[], nodeRadius: number, fontSize: number): LabelReach {
  const enlargedFont = fontSize + ENLARGED_FONT_GROWTH;
  let rest = 0;
  let enlarged = 0;
  for (const label of labels) {
    if (!label) continue;
    rest = Math.max(rest, estimatedLabelWidth(label, fontSize));
    enlarged = Math.max(enlarged, estimatedLabelWidth(label, enlargedFont));
  }
  // La pastilla es la de logic/marks.ts: sobresale del final del texto.
  const pill = pillAround({ x: 0, y: 0, width: enlarged, height: 0 }, enlargedFont);
  return {
    rest: nodeRadius + LABEL_GAP + rest,
    enlarged: nodeRadius + ENLARGED_NODE_GROWTH + LABEL_GAP + pill.x + pill.width,
  };
}

// --- Halo de la región seleccionada (6.1) ---

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
// Distancia de los arcos al anillo de los nodos, en píxeles: como poco 34,
// por fuera de las etiquetas de HCP-MMP1.0 en reposo, que acaban a unos 31 px
// (una larga y ampliada, seleccionada o con el ratón encima, llega a unos 40
// y lo cruza), y dentro del margen de 40 px del dibujo. Con etiquetas más
// largas, los arcos se apartan hasta quedar a HEMISPHERE_ARC_CLEARANCE del
// final de la más larga en reposo, y el margen del anillo crece para que
// quepan (ringLayout, al final).
export const HEMISPHERE_ARC_OFFSET = 34;
export const HEMISPHERE_ARC_CLEARANCE = 3;
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

// --- El anillo de los nodos (6.1) ---

export interface RingInput {
  // Lado del dibujo, en píxeles.
  size: number;
  // Las abreviaturas de los nodos que se dibujan; null, sin etiqueta.
  labels: readonly (string | null)[];
  // El radio de los nodos y la letra de las etiquetas en reposo, de la regla
  // según el número de nodos.
  nodeRadius: number;
  fontSize: number;
  // false en la miniatura: el margen de siempre, sin mirar las etiquetas. A
  // ese tamaño no se leen, y reservarles sitio dejaría el círculo en un
  // punto.
  fitLabels: boolean;
  // Si se dibujan los arcos de hemisferio: el margen los incluye.
  withArcs?: boolean;
}

export interface RingLayout {
  // Radio del anillo de los nodos.
  radius: number;
  // Distancia de los arcos de hemisferio al anillo, si se dibujan.
  arcOffset: number;
}

// El anillo de los nodos: su radio deja entre él y el borde del dibujo el
// margen de siempre o, si no caben en él, lo que ocupan la etiqueta más
// larga, ampliada y con su pastilla, y los arcos de hemisferio, si se
// dibujan, por fuera de las etiquetas en reposo. En un dibujo pequeño con
// etiquetas muy largas, el círculo no baja de la mitad de su radio de
// siempre: antes de reducirlo a un punto, las más largas se cortan, como
// antes, y los arcos se acercan al anillo para no salirse del dibujo.
export function ringLayout({ size, labels, nodeRadius, fontSize, fitLabels, withArcs = false }: RingInput): RingLayout {
  const usual = size / 2 - RING_MARGIN;
  if (!fitLabels) return { radius: usual, arcOffset: HEMISPHERE_ARC_OFFSET };
  const reach = labelReach(labels, nodeRadius, fontSize);
  const arcOffset = Math.max(HEMISPHERE_ARC_OFFSET, reach.rest + HEMISPHERE_ARC_CLEARANCE);
  const margin = Math.max(RING_MARGIN, reach.enlarged, withArcs ? arcOffset + HEMISPHERE_ARC_WIDTH / 2 : 0);
  const radius = Math.max(usual / 2, size / 2 - margin);
  return { radius, arcOffset: Math.min(arcOffset, size / 2 - radius - HEMISPHERE_ARC_WIDTH / 2) };
}
