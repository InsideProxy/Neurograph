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
}

export interface RingLayout {
  // Radio del anillo de los nodos.
  radius: number;
}

// El anillo de los nodos: su radio deja entre él y el borde del dibujo el
// margen de siempre o, si la etiqueta más larga no cabe, lo que esta ocupa,
// ampliada y con su pastilla. En un dibujo pequeño con etiquetas muy largas,
// el círculo no baja de la mitad de su radio de siempre: antes de reducirlo a
// un punto, las más largas se cortan, como antes.
export function ringLayout({ size, labels, nodeRadius, fontSize, fitLabels }: RingInput): RingLayout {
  const usual = size / 2 - RING_MARGIN;
  if (!fitLabels) return { radius: usual };
  const margin = Math.max(RING_MARGIN, labelReach(labels, nodeRadius, fontSize).enlarged);
  return { radius: Math.max(usual / 2, size / 2 - margin) };
}
