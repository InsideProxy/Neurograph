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
};

export const NETWORK_LABELS: Record<string, string> = {
  executive: "Control ejecutivo",
  memory: "Memoria",
  attention: "Atención",
  limbic: "Límbico",
  language: "Lenguaje",
  sensory: "Sensorial / visión",
  motor: "Moción y acción",
};

export const CONNECTION_TYPE_LABELS: Record<string, string> = {
  structural: "Estructural",
  functional: "Funcional",
  effective: "Efectiva",
};
