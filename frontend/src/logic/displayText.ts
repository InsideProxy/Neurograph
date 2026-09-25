// Textos que se muestran en la interfaz (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, sección 5). Funciones puras: se prueban
// sin DOM.
import { NETWORK_LABELS } from "../theme/networks";
import type { GraphConnection, GraphNode } from "../types/domain";

// Número con los miles separados por un espacio duro, como pide la
// ortografía del español (64 620). Los de cuatro cifras van sin separar
// (1047). En el código, el espacio duro va escrito con su escape a
// propósito: a la vista no se distinguiría de un espacio normal.
export function formatCount(value: number): string {
  const digits = String(Math.round(value));
  return digits.length <= 4 ? digits : digits.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

// Nombre de una red sin el paréntesis final de su clasificación: «Visual»
// y no «Visual (Cole-Anticevic)», porque la clasificación ya se ve en el
// botón «Redes» de la barra. Antes este recorte estaba dentro de
// FilterPanel (decisión 74).
export function networkShortLabel(network: string): string {
  const label = Object.hasOwn(NETWORK_LABELS, network) ? NETWORK_LABELS[network] : network;
  return label.replace(/\s*\([^()]*\)\s*$/, "") || label;
}

// Texto de la selección en el panel de filtros (spec 5.3).
export function selectionStatusText(regionCount: number, connectionSelected: boolean): string {
  if (regionCount > 0) {
    return regionCount === 1 ? "1 región seleccionada" : `${regionCount} regiones seleccionadas`;
  }
  return connectionSelected ? "1 conexión seleccionada" : "Ninguna región seleccionada";
}

// «N de M conexiones pasan los filtros», bajo el peso mínimo (spec 5.3).
// El spec decía «Se ven N de M», pero las vistas pueden dibujar menos (D4).
export function connectionsPassingText(visible: number, loaded: number): string {
  const noun = loaded === 1 ? "conexión" : "conexiones";
  const verb = visible === 1 ? "pasa" : "pasan";
  return `${formatCount(visible)} de ${formatCount(loaded)} ${noun} ${verb} los filtros`;
}

export function hemisphereLabel(hemisphere: GraphNode["hemisphere"]): string {
  if (hemisphere === "L") return "Hemisferio izquierdo";
  if (hemisphere === "R") return "Hemisferio derecho";
  return "Sin hemisferio asignado";
}

// La ingesta de HCP-MMP1.0 guarda el nombre con el hemisferio al final:
// «Area IFJa (hemisferio derecho)» (backend/ingestion/neuroimaging/hcp_mmp1.py).
// Donde el hemisferio se muestra aparte, no se repite en el nombre.
const HEMISPHERE_SUFFIX = /\s*\(hemisferio (izquierdo|derecho)\)\s*$/;

// Lo principal de una región (la abreviatura, o el nombre si no la tiene) y
// el nombre que la acompaña, o null si no añade nada. Mismo criterio que
// abbreviationAddsInformation (logic/regionLabel.ts): un nombre que empieza
// por la abreviatura va solo. El sufijo del hemisferio solo se quita si
// coincide con el de la región: una región sin hemisferio (puede ser NULL,
// migración 0008) o con otro conserva el nombre entero.
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

// Un umbral de peso escrito sin exagerarlo: dos cifras significativas,
// truncadas, nunca redondeadas hacia arriba. Con un umbral de 0.0152, «peso
// ≥ 0.015», y no «0.02», que daría a entender que una conexión de 0.016 no
// pasa, cuando sí pasa. Desde 0.01, con decimales («0.015», «0.5»); por
// debajo, en notación exponencial con una cifra decimal («3.9e-3»,
// «1.0e-3»), como el valor de «Peso mínimo» en Filtros (formatMinWeight, en
// logic/weightScale.ts, que sí redondea al más cercano). Se trunca la
// escritura decimal más corta del número (toExponential sin argumento), no
// su valor binario: 0.29 se guarda como 0.28999… y debe dar «0.29».
export function formatWeightAtMost(value: number): string {
  if (!(value > 0)) return "0";
  const [mantissa, exponentText] = value.toExponential().split("e");
  const exponent = Number(exponentText);
  const digits = mantissa.replace(".", "").padEnd(2, "0");
  const truncated = `${digits[0]}.${digits[1]}e${exponent}`;
  return exponent >= -2 ? String(Number(truncated)) : truncated;
}

// Recuadro de lectura con una región seleccionada (spec 5.4, como en la
// maqueta): cuántas de sus conexiones pasan los filtros, con el umbral de
// peso si lo hay, sin exagerarlo (formatWeightAtMost). Por encima del tope
// de dibujo (logic/renderSafety.ts), las vistas no dibujan ninguna
// conexión, y el recuadro lo dice (notDrawn).
export function regionPassingText(count: number, minWeight: number, notDrawn = false): string {
  const text = count === 1 ? "1 conexión pasa los filtros" : `${formatCount(count)} conexiones pasan los filtros`;
  const notes: string[] = [];
  if (minWeight > 0) notes.push(`peso ≥ ${formatWeightAtMost(minWeight)}`);
  if (notDrawn && count > 0) notes.push(count === 1 ? "no se dibuja" : "no se dibujan");
  return notes.length > 0 ? `${text} (${notes.join("; ")})` : text;
}

// Flecha de una conexión: «→» solo para la conectividad efectiva, la única
// con sentido (principio 1 del spec), y «↔» para las demás. La usan el
// título del detalle, los recuadros de lectura y la lista de conectividad
// inducida (D4).
export function connectionArrow(type: GraphConnection["type"]): string {
  return type === "effective" ? "→" : "↔";
}

// Abreviaturas que ya dicen el lado: «L_SFG_7_1» (Brainnetome),
// «l_default_12» (Gordon 333), «l_amygdala» (subcórtex del HCP).
export const SIDE_IN_ABBREVIATION = /^[lr]_|_[lr]$/i;

// Nombre corto de una región con su lado, «IFJa (der.)», porque las
// abreviaturas de HCP-MMP1.0 no lo llevan. Sin lado si la región no tiene
// hemisferio o si su abreviatura ya lo dice. El mismo formato en el título
// de una conexión y en el historial de deshacer.
export function regionNameWithSide(node: Pick<GraphNode, "abbreviation" | "label" | "hemisphere">): string {
  const main = regionTitleParts(node).main;
  if (node.hemisphere === null || (node.abbreviation !== null && SIDE_IN_ABBREVIATION.test(node.abbreviation))) {
    return main;
  }
  return `${main} (${node.hemisphere === "L" ? "izq." : "der."})`;
}

// Título de una conexión en el panel de detalle (D4; spec 5.5): «IFJa ↔
// 8C», o «IFJa → 8C» si es efectiva. Si las dos regiones se llaman igual o
// están en hemisferios distintos, cada una lleva su lado: «V1 (izq.) ↔ V1
// (der.)». Una región que no está entre las cargadas se nombra con su id.
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
