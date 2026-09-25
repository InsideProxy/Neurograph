// Textos que se muestran en la interfaz (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, sección 5). Funciones puras: se prueban
// sin DOM.
import { NETWORK_LABELS } from "../theme/networks";

// Número con los miles separados por un espacio duro, como pide la
// ortografía del español (64 620). Los de cuatro cifras van sin separar
// (1047).
export function formatCount(value: number): string {
  const digits = String(Math.round(value));
  return digits.length <= 4 ? digits : digits.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

// Nombre de una red sin el par\u00e9ntesis final de su clasificaci\u00f3n: \u00abVisual\u00bb
// y no \u00abVisual (Cole-Anticevic)\u00bb, porque la clasificaci\u00f3n ya se ve en el
// bot\u00f3n \u00abRedes\u00bb de la barra. Antes este recorte estaba dentro de
// FilterPanel (decisi\u00f3n 74).
export function networkShortLabel(network: string): string {
  const label = Object.hasOwn(NETWORK_LABELS, network) ? NETWORK_LABELS[network] : network;
  return label.replace(/\s*\([^()]*\)\s*$/, "") || label;
}

// Texto de la selecci\u00f3n en el panel de filtros (spec 5.3).
export function selectionStatusText(regionCount: number, connectionSelected: boolean): string {
  if (regionCount > 0) {
    return regionCount === 1 ? "1 regi\u00f3n seleccionada" : `${regionCount} regiones seleccionadas`;
  }
  return connectionSelected ? "1 conexi\u00f3n seleccionada" : "Ninguna regi\u00f3n seleccionada";
}

// \u00abN de M conexiones pasan los filtros\u00bb, bajo el peso m\u00ednimo (spec 5.3).
// El spec dec\u00eda \u00abSe ven N de M\u00bb, pero las vistas pueden dibujar menos (D4).
export function connectionsPassingText(visible: number, loaded: number): string {
  const noun = loaded === 1 ? "conexi\u00f3n" : "conexiones";
  const verb = visible === 1 ? "pasa" : "pasan";
  return `${formatCount(visible)} de ${formatCount(loaded)} ${noun} ${verb} los filtros`;
}
