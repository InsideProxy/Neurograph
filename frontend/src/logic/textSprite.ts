// Textura de texto para etiquetar cada nodo del cerebro 3D con su
// abreviatura (decisión de la usuaria, 30/08/2026: la abreviatura debe
// aparecer en el propio dibujo, no solo al pasar el ratón). Se usa un
// <canvas> 2D convertido en textura, en vez de una librería de texto 3D
// (troika-three-text, @react-three/drei <Text>...): mismo criterio ya
// aplicado a OrbitControls en Brain3D.tsx -- no arrastrar dependencias
// nuevas para algo que three.js puro ya resuelve.
//
// Con hasta varios cientos de regiones reales, generar un <canvas> por
// nodo sería caro; como muchas comparten la misma abreviatura (p. ej.
// "V1" aparece una vez por hemisferio en HCP-MMP1.0), se cachean las
// texturas por texto: como mucho una por abreviatura distinta, nunca
// una por nodo.
//
// Marcas de regiones (docs/rediseno-interfaz-diseno.md, 5.9): la etiqueta de
// una región marcada va sobre una pastilla del color de marca, y su marcador
// lleva un anillo, también en una textura. Las dos se guardan por sus
// colores, además de por el texto.
import * as THREE from "three";
import { markRing3d, markerSize } from "./markerSize";

// LabelTexture, no solo la textura suelta (corregido 30/08/2026: "los
// nombres de las áreas del cerebro 3D... se ven cortados"). Causa real:
// el canvas tenía un ancho FIJO de 160px con una fuente fija de 44px --
// cualquier abreviatura de más de unos pocos caracteres (p. ej. "9-46d"
// de HCP-MMP1.0, "l_default_12" de Gordon 333, "l_amygdala" del
// subcórtex del HCP) no cabía y quedaba recortada por el propio borde
// del canvas, no por el sprite. `aspect` (ancho/alto real del canvas
// dimensionado para el texto) se guarda junto a la textura para que
// quien dibuje el `<sprite>` (Brain3D.tsx) pueda escalarlo sin deformar
// el texto ni volver a cortarlo con un ancho fijo propio.
export interface LabelTexture {
  texture: THREE.CanvasTexture;
  aspect: number;
}

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

// Anillo de una región marcada (spec 5.9; markRing3d en
// logic/markerSize.ts): el hueco del color del fondo y el anillo del color de
// marca, con el centro transparente. Una textura por cada par de colores.
const RING_TEXTURE_SIZE = 128;
// Radio exterior del anillo en la textura, 2 px menos que la mitad para el
// suavizado del borde: el sprite mide un poco más que el anillo.
const RING_OUTER_PX = 62;
export const MARK_RING_SPRITE_SCALE = RING_TEXTURE_SIZE / 2 / RING_OUTER_PX;

const RING_PROPORTIONS = (() => {
  const ring = markRing3d(markerSize(false));
  return { ringInner: ring.ringInner / ring.outerRadius, gapInner: ring.gapInner / ring.outerRadius };
})();

export function markRingTextureKey(gap: string, ring: string): string {
  return `${gap}\u0000${ring}`;
}

const ringCache = new Map<string, THREE.CanvasTexture>();

function circle(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.beginPath();
  ctx.arc(RING_TEXTURE_SIZE / 2, RING_TEXTURE_SIZE / 2, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function getMarkRingTexture(gap: string, ring: string): THREE.CanvasTexture {
  const key = markRingTextureKey(gap, ring);
  const cached = ringCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = RING_TEXTURE_SIZE;
  canvas.height = RING_TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = ring;
    circle(ctx, RING_OUTER_PX);
    ctx.fillStyle = gap;
    circle(ctx, RING_OUTER_PX * RING_PROPORTIONS.ringInner);
    ctx.globalCompositeOperation = "destination-out";
    circle(ctx, RING_OUTER_PX * RING_PROPORTIONS.gapInner);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  ringCache.set(key, texture);
  return texture;
}
