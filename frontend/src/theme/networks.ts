// Paleta y nombres de red compartidos entre el connectograma y el cerebro
// 3D. Vive en un solo sitio para que las dos visualizaciones nunca puedan
// mostrar colores distintos para la misma red (inconsistencia que rompería
// la lectura conjunta exigida por la sección 5.3).
export const NETWORK_COLORS: Record<string, string> = {
  executive: "#e05a47",
  memory: "#3f7fbf",
  attention: "#e8a33d",
  limbic: "#8e5fc7",
  language: "#3fa66a",
  sensory: "#2fb0b0",
  motor: "#c0574f",
  // Regiones reales cargadas desde un atlas (p. ej. HCP-MMP1.0) que aún
  // no tienen una red funcional asignada (eso llega con la parcelación
  // Cole-Anticevic, todavía no cargada). Gris deliberado: no es una red
  // más, es la ausencia explícita de una.
  unclassified: "#8a8a8a",
};

export const NETWORK_LABELS: Record<string, string> = {
  executive: "Control ejecutivo",
  memory: "Memoria",
  attention: "Atención",
  limbic: "Límbico",
  language: "Lenguaje",
  sensory: "Sensorial / visión",
  motor: "Moción y acción",
  unclassified: "Sin red asignada",
};

export const CONNECTION_TYPE_LABELS: Record<string, string> = {
  structural: "Estructural",
  functional: "Funcional",
  effective: "Efectiva",
};

export const EVIDENCE_LEVEL_LABELS: Record<string, string> = {
  direct: "Dato observado directamente",
  indirect: "Inferencia indirecta",
  hypothetical: "Hipótesis",
};
