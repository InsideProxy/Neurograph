// Exportación de las visualizaciones a JPEG en color sobre fondo blanco
// (sección 20; decisión de la usuaria, 30/08/2026, ver
// docs/analisis-arquitectura.md): las imágenes tienen que poder usarse
// directamente como figuras de un paper o de la tesis, así que la
// exportación nunca depende del tema visual en pantalla -- siempre
// compone sobre blanco explícito, se vea la app como se vea en pantalla
// (incluido un futuro tema oscuro).

// Calidad JPEG y factor de sobre-muestreo: una figura de paper necesita
// más resolución que la pantalla. 3x el tamaño en pantalla da un
// resultado razonable para impresión sin generar archivos
// desproporcionados; 0.95 evita artefactos de compresión visibles en
// líneas finas (bordes de nodo, texto).
const JPEG_QUALITY = 0.95;
const EXPORT_SCALE = 3;

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
 */
export function exportSvgAsJpeg(svg: SVGSVGElement, filename: string): void {
  const width = svg.viewBox?.baseVal?.width || svg.width.baseVal.value || svg.clientWidth;
  const height = svg.viewBox?.baseVal?.height || svg.height.baseVal.value || svg.clientHeight;
  if (!width || !height) {
    // eslint-disable-next-line no-console
    console.error("No se pudo exportar: el SVG no tiene un tamaño medible todavía.");
    return;
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
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
