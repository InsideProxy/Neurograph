// Exportación de las visualizaciones a JPEG en color sobre fondo blanco
// (sección 20; decisión de la usuaria, 30/08/2026, ver
// docs/analisis-arquitectura.md): las imágenes tienen que poder usarse
// directamente como figuras de un paper o de la tesis, así que la
// exportación nunca depende del tema visual en pantalla -- siempre
// compone sobre blanco explícito, se vea la app como se vea en pantalla
// (incluido un futuro tema oscuro).
import { applyExportColors, EXPORT_FONT_FAMILY, type ColorResolver } from "./exportPalette";

// Calidad JPEG y factor de sobre-muestreo: una figura de paper necesita
// más resolución que la pantalla. 3x el tamaño en pantalla da un
// resultado razonable para impresión sin generar archivos
// desproporcionados; 0.95 evita artefactos de compresión visibles en
// líneas finas (bordes de nodo, texto).
const JPEG_QUALITY = 0.95;
const EXPORT_SCALE = 3;

// Hueco a la derecha del texto cuando la imagen se ensancha para que quepa
// (opción fitWidthToContent): el mismo que deja la leyenda a la izquierda,
// donde cada fila empieza en x = 10.
const FIT_WIDTH_MARGIN = 10;

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
 * paleta de exportación del tema activo (D3 de docs/decisiones-diseno.md).
 * Quien llama lo obtiene con `exportResolverFor(theme)` (theme/colors.ts).
 * @param options.fitWidthToContent Ensancha la imagen hasta que quepa todo
 * el contenido, medido con la fuente de la exportación. Nunca la estrecha,
 * y la altura no cambia. Solo sirve para un SVG sin `viewBox`, cuyo
 * contenido está en píxeles: con `viewBox`, el contenido se escala a la
 * caja del SVG y la opción se ignora.
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
  if (options.fitWidthToContent && !svg.hasAttribute("viewBox")) {
    width = Math.max(width, Math.ceil(contentRightEdge(clone) + FIT_WIDTH_MARGIN));
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
    // Fondo blanco explícito: nunca depender de que el SVG ya lo traiga
    // pintado (hoy sí, vía su propio style="background:#fff", pero esto
    // no debe romperse si ese estilo cambia en el futuro).
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
// sin viewBox). El navegador solo mide lo que está en el documento, así
// que el clon se cuelga un instante de <body> y se quita en el acto, antes
// de que llegue a pintarse: ni se ve ni sus id repetidos molestan al SVG
// original. visibility: hidden y no display: none, porque sin maqueta
// getBBox no mide nada. all: initial corta la herencia de la página:
// :root fija letter-spacing, text-rendering y font-synthesis, y el SVG
// exportado, que se dibuja como imagen aparte, no los hereda. Con ellos,
// el texto medido saldría más ancho que el del JPEG.
function contentRightEdge(clone: SVGSVGElement): number {
  const holder = document.createElement("div");
  holder.style.cssText = "all: initial; position: absolute; left: -100000px; top: 0; visibility: hidden;";
  holder.appendChild(clone);
  document.body.appendChild(holder);
  try {
    const box = clone.getBBox();
    return box.x + box.width;
  } finally {
    holder.remove();
    clone.remove();
  }
}

/**
 * Exporta el contenido YA RENDERIZADO de un <canvas> (p. ej. el WebGL del
 * cerebro 3D) como JPEG. Quien llama es responsable de haber dibujado ya
 * un frame con fondo blanco opaco antes de invocar esto -- ver
 * `Brain3D.tsx` (`ExportBridge`), que fuerza ese frame antes de leer el
 * canvas. Esta función solo se encarga de codificar y descargar.
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
