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
//
// Fase 4 del rediseño (spec 6.3): todas las etiquetas van sobre una
// pastilla, con la tipografía de la interfaz: las de siempre, con el texto
// del tema sobre su fondo translúcido, y las de una región marcada, con los
// colores de marca. La caché las guarda por su texto, sus dos colores y la
// versión de fuentes (state/labelFont.ts).
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
