// Marcas de regiones (docs/rediseno-interfaz-diseno.md, 5.9): el gesto que
// marca, la geometría del anillo y de la pastilla de la etiqueta en el
// connectograma y los hemisferios, lo que la exportación quita y la línea de
// las marcas en Filtros. Funciones puras: se prueban sin DOM. El store es
// state/marks.ts.
import type { GraphNode } from "../types/domain";
import { formatCount, joinNames, regionNameWithSide } from "./displayText";

// Teclas que acompañan a un clic: las de un evento de ratón del DOM, de
// React o de react-three-fiber.
export interface ClickKeys {
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

// Ctrl+clic marca o desmarca una región, y en macOS ⌘+clic, porque allí
// Ctrl+clic abre el menú contextual. Con Alt o Mayús no: es otro gesto. El
// clic normal sigue seleccionando.
export function isMarkGesture(keys: ClickKeys): boolean {
  return (keys.ctrlKey || keys.metaKey) && !keys.altKey && !keys.shiftKey;
}

// --- Connectograma y hemisferios ---

// Anillo exterior de un nodo marcado: del color de marca y separado del
// contorno del nodo por un hueco del color del fondo, así se distingue
// aunque la red sea azul. radius es el del trazo del anillo, en su centro.
export const MARK_RING_GAP = 1.5;
export const MARK_RING_WIDTH = 1.5;

export function markRing(nodeRadius: number, nodeStrokeWidth: number): { radius: number; strokeWidth: number } {
  return {
    radius: nodeRadius + nodeStrokeWidth / 2 + MARK_RING_GAP + MARK_RING_WIDTH / 2,
    strokeWidth: MARK_RING_WIDTH,
  };
}

export type TextAnchor = "start" | "middle" | "end";

// Dónde va la etiqueta de un nodo: a `offset` en la dirección (ux, uy), que
// apunta hacia fuera, y alineada para que el texto crezca hacia fuera. Es la
// regla de las etiquetas del connectograma y de los hemisferios, que cada
// vista aplica con su dirección y su separación.
export function outwardLabel(
  position: { x: number; y: number },
  ux: number,
  uy: number,
  offset: number,
): { x: number; y: number; anchor: TextAnchor } {
  return {
    x: position.x + ux * offset,
    y: position.y + uy * offset,
    anchor: ux > 0.3 ? "start" : ux < -0.3 ? "end" : "middle",
  };
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Pastilla de la etiqueta: un rectángulo de extremos redondos alrededor de la
// caja del texto, con margen. En el sistema de coordenadas del texto: si el
// texto va girado, la pastilla gira con él (components/MarkedLabel.tsx).
const PILL_PADDING_X = 0.4;
const PILL_PADDING_Y = 0.1;

export function pillAround(box: Box, fontSize: number): Box & { rx: number } {
  const padX = fontSize * PILL_PADDING_X;
  const padY = fontSize * PILL_PADDING_Y;
  const height = box.height + padY * 2;
  return { x: box.x - padX, y: box.y - padY, width: box.width + padX * 2, height, rx: height / 2 };
}

// Caja estimada de un texto de una línea, antes de medirlo: la anchura media
// de una letra de las abreviaturas, y la línea centrada en y
// (dominant-baseline: central). MarkedLabel mide después la de verdad.
const AVERAGE_CHAR_WIDTH = 0.62;
const LINE_HEIGHT = 1.2;

export function estimatedTextBox(text: string, x: number, y: number, anchor: TextAnchor, fontSize: number): Box {
  const width = text.length * fontSize * AVERAGE_CHAR_WIDTH;
  const height = fontSize * LINE_HEIGHT;
  const left = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
  return { x: left, y: y - height / 2, width, height };
}

// --- Exportación ---

// Las marcas solo existen en pantalla: los JPEG salen como sin ellas
// (decisión del usuario). Sus elementos llevan este atributo, y
// exportSvgAsJpeg (logic/exportImage.ts) los quita del clon antes de
// serializarlo. El 3D no las dibuja mientras captura (Brain3D.tsx).
export const MARK_ATTRIBUTE = "data-ng-mark";
export const MARK_ELEMENT = { [MARK_ATTRIBUTE]: "" } as const;

export interface MarkRemovalRoot {
  querySelectorAll(selector: string): ArrayLike<{ remove(): void }>;
}

// Quita del clon los elementos de las marcas. Devuelve cuántos ha quitado.
export function removeMarkElements(root: MarkRemovalRoot): number {
  const elements = Array.from(root.querySelectorAll(`[${MARK_ATTRIBUTE}]`));
  for (const element of elements) element.remove();
  return elements.length;
}

// --- La línea de las marcas en Filtros ---

// Cuántas regiones se nombran; las demás son «y N más».
export const MARKS_NAMED = 3;

export interface MarksSummary {
  // Regiones marcadas del atlas que se está viendo. Los ids que no están
  // cargados no cuentan: al cambiar de atlas las marcas se vacían, pero si
  // los datos caen a los de demostración, las del atlas real se quedan en el
  // store y no se ven.
  count: number;
  // Las primeras MARKS_NAMED, en el orden en que se marcaron, con su lado:
  // «IFJa (der.)».
  names: string[];
  // Todas, para la etiqueta emergente.
  allNames: string[];
  // Las que ocultan los filtros: no se dibujan.
  hidden: number;
}

export function marksSummary(
  markedIds: ReadonlySet<string>,
  nodeById: ReadonlyMap<string, GraphNode>,
  isHidden: (node: GraphNode) => boolean,
): MarksSummary {
  const marked = [...markedIds].map((id) => nodeById.get(id)).filter((node): node is GraphNode => node !== undefined);
  const allNames = marked.map(regionNameWithSide);
  return {
    count: marked.length,
    names: allNames.slice(0, MARKS_NAMED),
    allNames,
    hidden: marked.filter(isHidden).length,
  };
}

// «Marcadas: 5», o «Ninguna región marcada».
export function marksHeading(count: number): string {
  return count === 0 ? "Ninguna región marcada" : `Marcadas: ${formatCount(count)}`;
}

// «TE1m (izq.), IFJa (der.), V1 (izq.) y 2 más», o todas si son pocas:
// «V1 (izq.) e IFJa (der.)».
export function marksNamesText(summary: Pick<MarksSummary, "count" | "names">): string {
  const more = summary.count - summary.names.length;
  return more > 0 ? `${summary.names.join(", ")} y ${formatCount(more)} más` : joinNames(summary.names);
}

// «1 oculta por los filtros», o null si no hay ninguna.
export function marksHiddenText(hidden: number): string | null {
  if (hidden === 0) return null;
  return `${formatCount(hidden)} ${hidden === 1 ? "oculta" : "ocultas"} por los filtros`;
}

// Lo que anuncia la región viva de la línea al cambiar las marcas: «5
// regiones marcadas: TE1m (izq.), …; 1 oculta por los filtros». El número va
// con los dígitos seguidos, como los de Filtros para los lectores de
// pantalla.
export function marksAnnouncement(summary: MarksSummary): string {
  if (summary.count === 0) return marksHeading(0);
  const hidden = marksHiddenText(summary.hidden);
  const counted = summary.count === 1 ? "1 región marcada" : `${summary.count} regiones marcadas`;
  return `${counted}: ${marksNamesText(summary)}${hidden ? `; ${hidden}` : ""}`;
}

// Sin marcas, la línea explica el gesto: Ctrl+clic, o ⌘+clic en macOS, como
// los demás atajos (shortcutLabel, logic/clipboard.ts).
export function markGestureHint(userAgent: string): string {
  return `${/Mac/i.test(userAgent) ? "⌘+clic" : "Ctrl+clic"} en una región para marcarla`;
}
