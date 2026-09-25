// Textos que se muestran en la interfaz (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, sección 5). Funciones puras: se prueban
// sin DOM.
import { NETWORK_LABELS } from "../theme/networks";
import type { GraphConnection, GraphNode } from "../types/domain";
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

// Flecha de una conexi\u00f3n: \u00ab\u2192\u00bb solo para la conectividad efectiva, la \u00fanica
// con sentido (principio 1 del spec), y \u00ab\u2194\u00bb para las dem\u00e1s. La usan el
// t\u00edtulo del detalle, los recuadros de lectura y la lista de conectividad
// inducida (D4).
export function connectionArrow(type: GraphConnection["type"]): string {
  return type === "effective" ? "\u2192" : "\u2194";
}

// Abreviaturas que ya dicen el lado: \u00abL_SFG_7_1\u00bb (Brainnetome),
// \u00abl_default_12\u00bb (Gordon 333), \u00abl_amygdala\u00bb (subc\u00f3rtex del HCP).
const SIDE_IN_ABBREVIATION = /^[lr]_|_[lr]$/i;

// Nombre corto de una regi\u00f3n con su lado, \u00abIFJa (der.)\u00bb, porque las
// abreviaturas de HCP-MMP1.0 no lo llevan. Sin lado si la regi\u00f3n no tiene
// hemisferio o si su abreviatura ya lo dice. El mismo formato en el t\u00edtulo
// de una conexi\u00f3n y en el historial de deshacer.
export function regionNameWithSide(node: Pick<GraphNode, "abbreviation" | "label" | "hemisphere">): string {
  const main = regionTitleParts(node).main;
  if (node.hemisphere === null || (node.abbreviation !== null && SIDE_IN_ABBREVIATION.test(node.abbreviation))) {
    return main;
  }
  return `${main} (${node.hemisphere === "L" ? "izq." : "der."})`;
}

// T\u00edtulo de una conexi\u00f3n en el panel de detalle (D4; spec 5.5): \u00abIFJa \u2194
// 8C\u00bb, o \u00abIFJa \u2192 8C\u00bb si es efectiva. Si las dos regiones se llaman igual o
// est\u00e1n en hemisferios distintos, cada una lleva su lado: \u00abV1 (izq.) \u2194 V1
// (der.)\u00bb. Una regi\u00f3n que no est\u00e1 entre las cargadas se nombra con su id.
export function connectionTitle(
  connection: Pick<GraphConnection, "source" | "target" | "type">,
  nodeById: ReadonlyMap<string, Pick<GraphNode, "abbreviation" | "label" | "hemisphere">>,
): string {
  const region = (id: string) => nodeById.get(id) ?? { abbreviation: null, label: id, hemisphere: null };
  const source = region(connection.source);
  const target = region(connection.target);
  const withSide = regionTitleParts(source).main === regionTitleParts(target).main || source.hemisphere !== target.hemisphere;
  const name = (node: Pick<GraphNode, "abbreviation" | "label" | "hemisphere">) =>
    withSide ? regionNameWithSide(node) : regionTitleParts(node).main;
  return `${name(source)} ${connectionArrow(connection.type)} ${name(target)}`;
}
