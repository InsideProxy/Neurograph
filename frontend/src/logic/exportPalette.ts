// Colores de la exportación JPEG (D3 de docs/decisiones-diseno.md; docs/rediseno-interfaz-diseno.md, 4.4).
// exportSvgAsJpeg clona el SVG tal como se ve en pantalla. Con temas, el
// clon llevaría los colores del tema de pantalla, que sobre el blanco de
// la exportación pueden no leerse. Cada elemento con color de tema lleva
// data-ng-fill / data-ng-stroke / data-ng-stroke-opacity con una
// referencia (un token de DrawTokens o "net:<clave>"). Aquí se sustituye
// su valor por el de la paleta de exportación antes de serializar.
import type { ExportAttributeKind } from "../theme/colors";

export interface ExportableElement {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  querySelectorAll(selector: string): ArrayLike<ExportableElement>;
}

// Recibe la referencia y el tipo de atributo: un color para fill/stroke, una
// opacidad para stroke-opacity. exportResolverFor (theme/colors.ts) cumple
// esta firma.
export type ColorResolver = (ref: string, kind: ExportAttributeKind) => string | null;

const MAPPINGS: readonly (readonly [dataAttribute: string, target: string, kind: ExportAttributeKind])[] = [
  ["data-ng-fill", "fill", "paint"],
  ["data-ng-stroke", "stroke", "paint"],
  ["data-ng-stroke-opacity", "stroke-opacity", "opacity"],
];

// onUnresolved: se llama con cada referencia sin valor de exportación. El
// atributo se queda como estaba, con el color de pantalla.
export function applyExportColors(
  root: ExportableElement,
  resolve: ColorResolver,
  onUnresolved?: (ref: string, dataAttribute: string) => void,
): void {
  for (const [dataAttribute, target, kind] of MAPPINGS) {
    const elements = [root, ...Array.from(root.querySelectorAll(`[${dataAttribute}]`))];
    for (const element of elements) {
      const ref = element.getAttribute(dataAttribute);
      if (ref === null) continue;
      const value = resolve(ref, kind);
      if (value !== null) element.setAttribute(target, value);
      else onUnresolved?.(ref, dataAttribute);
    }
  }
}

// Fuente explícita del SVG exportado: el SVG serializado no carga la fuente
// de la aplicación, y sin esto el navegador usaría su fuente por defecto.
export const EXPORT_FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
