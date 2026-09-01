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
import * as THREE from "three";

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

export function getLabelTexture(text: string): LabelTexture {
  const cached = textureCache.get(text);
  if (cached) return cached;
  const built = buildTexture(text);
  textureCache.set(text, built);
  return built;
}
