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
