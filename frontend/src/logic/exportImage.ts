// Exportación de las visualizaciones a JPEG en color sobre fondo blanco
// (sección 20; decisión de la usuaria, 30/08/2026, ver
// docs/analisis-arquitectura.md): las imágenes tienen que poder usarse
// directamente como figuras de un paper o de la tesis, así que el fondo
// nunca depende del tema en pantalla: siempre se compone sobre blanco
// explícito. Los colores sí siguen al tema, pero a su paleta de
// exportación, pensada para leerse sobre ese blanco (D3 de
// docs/decisiones-diseno.md).
import { applyExportColors, EXPORT_FONT_FAMILY, type ColorResolver } from "./exportPalette";

// Calidad JPEG y factor de sobre-muestreo: una figura de paper necesita
// más resolución que la pantalla. 3x el tamaño en pantalla da un
// resultado razonable para impresión sin generar archivos
// desproporcionados; 0.95 evita artefactos de compresión visibles en
// líneas finas (bordes de nodo, texto).
const JPEG_QUALITY = 0.95;
const EXPORT_SCALE = 3;

// Hueco a la derecha del contenido medido cuando la imagen se ensancha para
// que quepa (opción fitWidthToContent). Da aire tras el texto y absorbe las
// pequeñas diferencias entre medir en la página y dibujar la imagen.
const FIT_WIDTH_MARGIN = 10;

/**
 * Ancho de la imagen con la opción fitWidthToContent: el borde derecho del
 * contenido más el margen, redondeado hacia arriba. Nunca estrecha el ancho
 * de partida. Si la medida no es un número finito (por ejemplo, porque no
 * se pudo medir), devuelve el ancho de partida.
 */
export function fittedWidth(base: number, contentRight: number, margin = FIT_WIDTH_MARGIN): number {
  if (!Number.isFinite(contentRight)) return base;
  return Math.max(base, Math.ceil(contentRight + margin));
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revocar de forma diferida: algunos navegadores necesitan que la URL
  // siga siendo válida un instante después del click que dispara la
  // descarga.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exporta un elemento <svg> autocontenido (sin <image> externas sujetas
 * a CORS -- el connectograma no usa ninguna) como JPEG en color sobre
 * fondo blanco.
 *
 * @param resolveColor Resuelve las referencias `data-ng-*` del clon a la
 * paleta de exportación del tema y de los colores de red activos (D3 de
 * docs/decisiones-diseno.md; spec 4.4). Quien llama lo obtiene con
 * `currentExportResolver()` (theme/useDrawColors.ts).
 * @param options.fitWidthToContent Ensancha la imagen hasta el borde
 * derecho del contenido, medido con la fuente de la exportación, más
 * FIT_WIDTH_MARGIN. Solo se ajusta el borde derecho: nunca estrecha la
 * imagen ni cambia su altura, y lo que sobresalga por la izquierda o por
 * arriba sigue fuera. getBBox no cuenta los trazos (stroke): un contorno
 * pegado al borde derecho depende del margen para verse entero. Solo sirve
 * para un SVG sin `viewBox`, cuyo contenido está en píxeles; con `viewBox`,
 * el contenido se escala a la caja del SVG y la opción se ignora (en
 * desarrollo, con un aviso en la consola).
 */
export function exportSvgAsJpeg(
  svg: SVGSVGElement,
  filename: string,
  resolveColor: ColorResolver,
  options: { fitWidthToContent?: boolean } = {},
): void {
  let width = svg.viewBox?.baseVal?.width || svg.width.baseVal.value || svg.clientWidth;
  const height = svg.viewBox?.baseVal?.height || svg.height.baseVal.value || svg.clientHeight;
  if (!width || !height) {
    // eslint-disable-next-line no-console
    console.error("No se pudo exportar: el SVG no tiene un tamaño medible todavía.");
    return;
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;

  // Paleta de exportación (D3 de docs/decisiones-diseno.md): colores legibles sobre el blanco
  // de la exportación, sea cual sea el tema de pantalla. En desarrollo se
  // avisa una vez por cada referencia distinta sin color de exportación
  // (nunca una vez por elemento: un token roto suele repetirse en muchos
  // elementos y no hace falta el mismo aviso decenas de veces): quedaría
  // con el color de pantalla.
  const warnedRefs = new Set<string>();
  applyExportColors(clone, resolveColor, (ref, attribute) => {
    if (import.meta.env.DEV && !warnedRefs.has(ref)) {
      warnedRefs.add(ref);
      // eslint-disable-next-line no-console
      console.warn(`Exportación: ${attribute}="${ref}" no tiene color de exportación.`);
    }
  });
  clone.setAttribute("font-family", EXPORT_FONT_FAMILY);

  // Ancho ajustado al texto (opción fitWidthToContent). Se mide aquí, con
  // la fuente de la exportación ya puesta en el clon: el texto del JPEG usa
  // esa fuente, no la de la pantalla, y cada fuente tiene su ancho.
  if (options.fitWidthToContent) {
    if (!svg.hasAttribute("viewBox")) {
      width = fittedWidth(width, contentRightEdge(clone));
    } else if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("Exportación: fitWidthToContent se ignora en un SVG con viewBox.");
    }
  }
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * EXPORT_SCALE;
    canvas.height = height * EXPORT_SCALE;
    const ctx = canvas.getContext("2d");
    URL.revokeObjectURL(svgUrl);
    if (!ctx) {
      // eslint-disable-next-line no-console
      console.error("No se pudo exportar: el navegador no dio un contexto 2D de canvas.");
      return;
    }
    // Fondo blanco explícito: el SVG no trae fondo propio. En pantalla se
    // lo pone el CSS (.viz-svg, .legend-svg), que no viaja con el clon.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) triggerDownload(blob, filename);
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  };
  image.onerror = () => {
    URL.revokeObjectURL(svgUrl);
    // eslint-disable-next-line no-console
    console.error("No se pudo exportar el SVG a JPEG (fallo al cargar la imagen serializada).");
  };
  image.src = svgUrl;
}

// Borde derecho del contenido de un clon de SVG, en sus unidades (píxeles,
// sin viewBox), o NaN si no se puede medir; en ese caso la exportación
// sigue con el ancho de partida. El navegador solo mide lo que está en el
// documento, así que el clon se cuelga un instante de <body> y se quita en
// el acto, antes de que llegue a pintarse: ni se ve ni sus id repetidos
// molestan al SVG original. position: fixed y fuera de la vista, para que
// una leyenda alta no alargue el desplazamiento de la página mientras se
// mide; visibility: hidden y no display: none, porque sin maqueta getBBox
// no mide nada.
//
// La medida vale para el JPEG si se cumplen dos condiciones:
// - Ninguna regla de la página se aplica directamente al clon (a su clase,
//   o a svg, text o tspan) cambiando el texto. all: initial solo corta la
//   herencia: :root fija letter-spacing, text-rendering y font-synthesis,
//   que el SVG exportado, dibujado como imagen aparte, no hereda. Solo el
//   letter-spacing ya daría entre 8 y 13 px de más en una etiqueta larga.
//   Hoy la única regla que toca el clon es .legend-svg, y no cambia la
//   fuente.
// - EXPORT_FONT_FAMILY no nombra ninguna fuente que la página cargue con
//   @font-face. Si lo hiciera, en la página se mediría con esa fuente,
//   pero la imagen no puede cargarla y dibujaría con otra.
function contentRightEdge(clone: SVGSVGElement): number {
  const holder = document.createElement("div");
  holder.style.cssText = "all: initial; position: fixed; left: -100000px; top: -100000px; visibility: hidden;";
  holder.appendChild(clone);
  document.body.appendChild(holder);
  try {
    const box = clone.getBBox();
    return box.x + box.width;
  } catch (error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("Exportación: no se pudo medir el contenido; se usa el ancho de partida.", error);
    }
    return Number.NaN;
  } finally {
    holder.remove();
    clone.remove();
  }
}

/**
 * Exporta el contenido YA RENDERIZADO de un <canvas> como JPEG. Quien llama
 * es responsable de haber dibujado ya un frame con fondo blanco opaco antes
 * de invocar esto. Esta función solo se encarga de codificar y descargar.
 * El cerebro 3D ya no lee su lienzo: pasa por exportPixelsAsJpeg
 * (Legibilidad del 3D).
 */
export function exportCanvasAsJpeg(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob(
    (blob) => {
      if (blob) triggerDownload(blob, filename);
    },
    "image/jpeg",
    JPEG_QUALITY
  );
}

/**
 * Exporta como JPEG, del mismo tamaño, píxeles RGBA ordenados de arriba
 * abajo: la captura del cerebro 3D, dibujada fuera de pantalla
 * (logic/capture3d.ts; Legibilidad del 3D). Se copian a un <canvas> 2D y se
 * codifican como las demás exportaciones.
 */
export function exportPixelsAsJpeg(
  pixels: Uint8Array<ArrayBuffer>,
  width: number,
  height: number,
  filename: string,
): void {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // eslint-disable-next-line no-console
    console.error("No se pudo exportar: el navegador no dio un contexto 2D de canvas.");
    return;
  }
  const data = new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  ctx.putImageData(new ImageData(data, width, height), 0, 0);
  exportCanvasAsJpeg(canvas, filename);
}
