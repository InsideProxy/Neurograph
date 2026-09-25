// Textos que se muestran en la interfaz (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, sección 5). Funciones puras: se prueban
// sin DOM.
import { NETWORK_LABELS } from "../theme/networks";
import type { GraphNode } from "../types/domain";
import { formatMinWeight } from "./weightScale";

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

export function hemisphereLabel(hemisphere: GraphNode["hemisphere"]): string {
  if (hemisphere === "L") return "Hemisferio izquierdo";
  if (hemisphere === "R") return "Hemisferio derecho";
  return "Sin hemisferio asignado";
}

// La ingesta de HCP-MMP1.0 guarda el nombre con el hemisferio al final:
// \u00abArea IFJa (hemisferio derecho)\u00bb (backend/ingestion/neuroimaging/hcp_mmp1.py).
// Donde el hemisferio se muestra aparte, no se repite en el nombre.
const HEMISPHERE_SUFFIX = /\s*\(hemisferio (izquierdo|derecho)\)\s*$/;

// Lo principal de una regi\u00f3n (la abreviatura, o el nombre si no la tiene) y
// el nombre que la acompa\u00f1a, o null si no a\u00f1ade nada. Mismo criterio que
// abbreviationAddsInformation (logic/regionLabel.ts): un nombre que empieza
// por la abreviatura va solo. El sufijo del hemisferio solo se quita si
// coincide con el de la regi\u00f3n: una regi\u00f3n sin hemisferio (puede ser NULL,
// migraci\u00f3n 0008) o con otro conserva el nombre entero.
export function regionTitleParts(node: Pick<GraphNode, "abbreviation" | "label" | "hemisphere">): {
  main: string;
  secondary: string | null;
} {
  const suffix = HEMISPHERE_SUFFIX.exec(node.label);
  const name =
    (suffix && node.hemisphere === (suffix[1] === "izquierdo" ? "L" : "R") ? node.label.slice(0, suffix.index) : "") ||
    node.label;
  if (!node.abbreviation || name.startsWith(node.abbreviation)) return { main: name, secondary: null };
  return { main: node.abbreviation, secondary: name };
}

// Recuadro de lectura con una regi\u00f3n seleccionada (spec 5.4, como en la
// maqueta): cu\u00e1ntas de sus conexiones pasan los filtros, con el umbral de
// peso si lo hay, escrito como en Filtros (formatMinWeight, que nunca
// redondea hacia arriba).
export function regionPassingText(count: number, minWeight: number): string {
  const text = count === 1 ? "1 conexi\u00f3n pasa los filtros" : `${formatCount(count)} conexiones pasan los filtros`;
  return minWeight > 0 ? `${text} (peso \u2265 ${formatMinWeight(minWeight)})` : text;
}
