// Versión de fuentes de las etiquetas del cerebro 3D
// (docs/rediseno-interfaz-diseno.md, 6.3; fase 4 del rediseño). Las
// etiquetas se dibujan en un <canvas>, que no espera a que llegue la fuente:
// dibuja con la que haya. Cuando document.fonts.load(LABEL_FONT) termina, la
// versión sube: la caché de texturas (logic/textSprite.ts) deja de encontrar
// las de antes y las etiquetas se vuelven a dibujar con la fuente buena.
import { create } from "zustand";
import { LABEL_FONT } from "../logic/textSprite";

interface LabelFontState {
  version: number;
}

export const useLabelFontStore = create<LabelFontState>(() => ({ version: 0 }));

// Lo que se usa de document.fonts (un FontFaceSet): así se prueba sin DOM.
export interface FontLoader {
  load(font: string): Promise<unknown>;
}

const requested = new WeakSet<FontLoader>();

// Pide la fuente de las etiquetas una sola vez por cada FontFaceSet (en la
// página hay uno, document.fonts) y, cuando llega, sube la versión. Si no
// llega, las etiquetas se quedan con la fuente de respaldo, sin error: también
// si load lanza la excepción en vez de devolver una promesa rechazada, porque
// se llama dentro de la cadena de promesas.
export function requestLabelFont(fonts: FontLoader | undefined): Promise<void> {
  if (!fonts || requested.has(fonts)) return Promise.resolve();
  requested.add(fonts);
  return Promise.resolve()
    .then(() => fonts.load(LABEL_FONT))
    .then(
      () => useLabelFontStore.setState((state) => ({ version: state.version + 1 })),
      () => undefined,
    );
}
