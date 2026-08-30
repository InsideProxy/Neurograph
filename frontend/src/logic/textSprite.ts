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

const textureCache = new Map<string, THREE.CanvasTexture>();

function buildTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // No debería pasar en un navegador real; una textura 1x1 transparente
    // es un resultado inofensivo si pasa, no un error visible en cascada.
    return new THREE.CanvasTexture(canvas);
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "bold 44px system-ui, sans-serif";
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
  return texture;
}

export function getLabelTexture(text: string): THREE.CanvasTexture {
  const cached = textureCache.get(text);
  if (cached) return cached;
  const texture = buildTexture(text);
  textureCache.set(text, texture);
  return texture;
}
