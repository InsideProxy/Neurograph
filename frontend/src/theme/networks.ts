// Paleta y nombres de red compartidos entre el connectograma y el cerebro
// 3D. Vive en un solo sitio para que las dos visualizaciones nunca puedan
// mostrar colores distintos para la misma red (inconsistencia que rompería
// la lectura conjunta exigida por la sección 5.3).
//
// Las 12 redes con prefijo real (Visual, Visual2, Somatomotor...) son las
// de la parcelación Cole-Anticevic (Ji et al., 2019, NeuroImage), cargada
// el 28/08/2026 sobre HCP-MMP1.0 (ver
// backend/ingestion/neuroimaging/cole_anticevic_networks.py). Sus colores
// son los mismos que trae el archivo .dlabel.nii original, no inventados:
// así un lector que conozca la convención de Cole-Anticevic reconoce la
// red por el color, igual que en la literatura.
export const NETWORK_COLORS: Record<string, string> = {
  // -- Datos de demostración (frontend/src/data/demo.ts) --
  executive: "#e05a47",
  memory: "#3f7fbf",
  attention: "#e8a33d",
  limbic: "#8e5fc7",
  sensory: "#2fb0b0",
  motor: "#c0574f",
  // -- Redes reales de Cole-Anticevic (colores del archivo original) --
  visual: "#0000ff",
  visual2: "#6400ff",
  somatomotor: "#00ffff",
  "cingulo-opercular": "#990099",
  "dorsal-attention": "#00ff00",
  language: "#009b9b",
  frontoparietal: "#ffff00",
  auditory: "#fa3efb",
  default: "#ff0000",
  "posterior-multimodal": "#b15928",
  "ventral-multimodal": "#ff9d00",
  "orbito-affective": "#417d00",
  // Región sin pertenencia a red calculada todavía (p. ej. otros atlas
  // sin clasificación funcional cargada). Gris deliberado: no es una red
  // más, es la ausencia explícita de una.
  unclassified: "#8a8a8a",
};

export const NETWORK_LABELS: Record<string, string> = {
  executive: "Control ejecutivo",
  memory: "Memoria",
  attention: "Atención",
  limbic: "Límbico",
  sensory: "Sensorial / visión",
  motor: "Moción y acción",
  visual: "Visual",
  visual2: "Visual 2",
  somatomotor: "Somatomotora",
  "cingulo-opercular": "Cíngulo-opercular",
  "dorsal-attention": "Atención dorsal",
  language: "Lenguaje",
  frontoparietal: "Frontoparietal",
  auditory: "Auditiva",
  default: "Por defecto (Default Mode Network)",
  "posterior-multimodal": "Multimodal posterior",
  "ventral-multimodal": "Multimodal ventral",
  "orbito-affective": "Orbito-afectiva",
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
