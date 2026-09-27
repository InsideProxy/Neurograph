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
// colores de marca. La de la región seleccionada destaca, en negrita. La
// caché las guarda por su texto, sus dos colores, su peso y la versión de
// fuentes (state/labelFont.ts). Y la etiqueta recibe el clic antes que lo
// demás (raycastLabelFirst, al final).
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
// Es una fuente variable: un solo archivo trae los dos pesos que se usan, así
// que al llegar la de 600 llega también la negrita.
export const LABEL_FONT_SIZE = 44;
export type LabelWeight = 600 | 700;
export const LABEL_WEIGHT: LabelWeight = 600;

// La etiqueta de la región seleccionada destaca, como en la maqueta: el texto
// fuerte del tema (token label3dStrong, el --text-h), en negrita y algo mayor
// (13 px frente a 12 en la maqueta: Brain3D la dibuja 13/12 más alta).
export const STRONG_LABEL_WEIGHT: LabelWeight = 700;
export const STRONG_LABEL_SCALE = 13 / 12;

export function labelFont(weight: LabelWeight): string {
  return `${weight} ${LABEL_FONT_SIZE}px 'Atkinson Hyperlegible Next', system-ui, sans-serif`;
}

export const LABEL_FONT = labelFont(LABEL_WEIGHT);

// Los colores de una etiqueta: su texto sobre una pastilla. Las de siempre
// llevan el texto del tema sobre su fondo translúcido (tokens label3dText y
// label3dBackground de theme/themes.ts), o el texto fuerte si es la de la
// región seleccionada; las de una región marcada, el texto de marca sobre el
// color de marca (5.9).
export interface LabelColors {
  background: string;
  color: string;
}

// Cómo se ve una etiqueta: sus colores y el peso de la letra.
export interface LabelStyle extends LabelColors {
  weight: LabelWeight;
}

// Clave de la caché: el texto, los dos colores de la etiqueta, que salen del
// tema (de la paleta de exportación mientras se captura el JPEG, o de las
// marcas), el peso de la letra y la versión de fuentes.
export function labelTextureKey(text: string, style: LabelStyle, fontVersion: number): string {
  return [text, style.background, style.color, String(style.weight), String(fontVersion)].join("\u0000");
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
  ctx.font = labelFont(style.weight);
  const textWidth = ctx.measureText(text).width;
  canvas.width = Math.max(1, Math.ceil(textWidth + PILL_PADDING_X * 2));
  canvas.height = Math.ceil(LABEL_FONT_SIZE + PILL_PADDING_Y * 2);
  // Redimensionar canvas.width/height reinicia el estado del contexto 2D
  // en cualquier navegador (se pierde el `font` fijado arriba) -- hay que
  // volver a fijar todo después de este punto, no solo una vez.
  ctx.font = labelFont(style.weight);
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

// --- El clic en las etiquetas (fase 4 del rediseño) ---
//
// Decisión del usuario del 25/09/2026: un clic en la etiqueta selecciona su
// región, y Ctrl+clic la marca (Brain3D.tsx). La etiqueta tiene que recibirlo
// antes que lo demás, como se dibuja: react-three-fiber entrega el clic por
// orden de distancia a la cámara, y en ese punto pueden quedar más cerca la
// corteza pintada, la zona de clic de un marcador o una línea (Line.threshold
// de three.js: se alcanza desde 1 unidad). Su manejador iría primero, y el de
// la corteza corta el clic. Esta función hace el raycast de siempre del
// sprite, que tiene en cuenta su ancla (Sprite.center), y adelanta sus
// impactos LABEL_PICK_LEAD, más que cualquier distancia de la escena: quedan
// delante de todo y, entre etiquetas, en su orden, así que la de delante, la
// que se dibuja encima, recibe el clic. Con la malla translúcida, donde las
// etiquetas no se dibujan encima de todo, un marcador que tape una parte de
// una etiqueta en un foco muy denso no le quita el clic en esa parte.
export const LABEL_PICK_LEAD = 1e6;

export function raycastLabelFirst(this: THREE.Sprite, raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
  const first = intersects.length;
  THREE.Sprite.prototype.raycast.call(this, raycaster, intersects);
  for (let i = first; i < intersects.length; i++) intersects[i].distance -= LABEL_PICK_LEAD;
}
