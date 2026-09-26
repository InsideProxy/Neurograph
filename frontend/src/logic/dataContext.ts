// Contexto de datos de la barra superior (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.1): nombres cortos para los botones y
// etiquetas completas para las listas. Funciones puras.
import type { NetworkSourceSummary } from "../data/api";
import { NETWORK_SOURCE_LABELS } from "../theme/networks";

// Nombre corto de cada clasificación de red. Es un mapa explícito y no un
// recorte de NETWORK_SOURCE_LABELS: recortando, Yeo 7 y Yeo 17 quedarían
// iguales.
export const NETWORK_SOURCE_SHORT_LABELS: Readonly<Record<string, string>> = {
  "cole-anticevic": "Cole-Anticevic",
  gordon333: "Gordon 333",
  "yeo2011-7": "Yeo 7",
  "yeo2011-17": "Yeo 17",
  power2011: "Power 2011",
};

// Una clasificación que no esté en el mapa se muestra con su identificador,
// como hasta ahora: nunca se oculta.
export function networkSourceShortLabel(source: string): string {
  return Object.hasOwn(NETWORK_SOURCE_SHORT_LABELS, source) ? NETWORK_SOURCE_SHORT_LABELS[source] : source;
}

export function networkSourceLabel(source: string): string {
  return Object.hasOwn(NETWORK_SOURCE_LABELS, source) ? NETWORK_SOURCE_LABELS[source] : source;
}

// Etiqueta de la lista: la de hoy, con «N de M regiones» y «(por defecto)».
export function networkSourceOptionLabel(summary: NetworkSourceSummary, nodeCount: number): string {
  return `${networkSourceLabel(summary.source)} — ${summary.regionCount} de ${nodeCount} regiones${
    summary.isDefault ? " (por defecto)" : ""
  }`;
}

// Nombre corto de un atlas: lo que va antes de « — » en su etiqueta de
// ATLASES (App.tsx). Es único en los cuatro atlas de hoy.
export function atlasShortLabel(label: string): string {
  const cut = label.indexOf(" — ");
  return cut === -1 ? label : label.slice(0, cut);
}
