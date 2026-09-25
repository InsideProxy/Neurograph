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

// Anillo de una región marcada (docs/rediseno-interfaz-diseno.md, 5.9), como
// en el connectograma y los hemisferios: fuera del contorno neutro, un hueco
// del color del fondo y el anillo del color de marca. Brain3D lo dibuja con
// un sprite, siempre de cara a la cámara, cuya textura (logic/textSprite.ts)
// es el hueco y el anillo: su centro, transparente, deja ver el marcador. Los
// grosores van en proporción al radio del marcador, así que una sola textura
// sirve para el normal y el seleccionado. Con el radio base, el hueco mide
// 0,0126 y el anillo 0,0165: cerca de 1,5 y 2 px en la vista de partida.
export const MARK_RING_GAP_RATIO = 0.42;
export const MARK_RING_WIDTH_RATIO = 0.55;

export interface MarkRing3d {
  // Donde empieza el hueco: el borde del contorno neutro.
  gapInner: number;
  // Donde empieza el anillo.
  ringInner: number;
  outerRadius: number;
}

export function markRing3d(size: MarkerSize): MarkRing3d {
  const gapInner = size.radius * size.outlineScale;
  const ringInner = gapInner + size.radius * MARK_RING_GAP_RATIO;
  return { gapInner, ringInner, outerRadius: ringInner + size.radius * MARK_RING_WIDTH_RATIO };
}
