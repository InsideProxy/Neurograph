// Paleta y nombres de red compartidos entre el connectograma y el cerebro
// 3D. Vive en un solo sitio para que las dos visualizaciones nunca puedan
// mostrar colores distintos para la misma red (inconsistencia que rompería
// la lectura conjunta exigida por la sección 5.3).
//
// Las claves de red real llevan la fuente por delante
// (`<fuente>.<código_local>`, p. ej. `cole-anticevic.default`), no solo
// el nombre corto de la red: varias parcelaciones tienen redes con el
// mismo nombre pero método distinto (Cole-Anticevic y Gordon 333 tienen
// las dos una red "Default" y una "Visual"). Usar solo el nombre corto
// colapsaría dos redes distintas en el mismo color sin ningún aviso —
// riesgo 13 de docs/analisis-arquitectura.md, corregido el 28/08/2026
// junto con `backend/api/routers/regions.py` (que genera esta misma
// clave con `<fuente>.<código_local>`).
export const NETWORK_COLORS: Record<string, string> = {
  // -- Datos de demostración (frontend/src/data/demo.ts) --
  // Nunca colisionan con datos reales: la fuente nunca muestra datos de
  // demostración y reales a la vez (frontend/src/App.tsx).
  executive: "#e05a47",
  memory: "#3f7fbf",
  attention: "#e8a33d",
  limbic: "#8e5fc7",
  language: "#7a4fa0",
  sensory: "#2fb0b0",
  motor: "#c0574f",
  // -- Redes reales de Cole-Anticevic (Ji et al., 2019), cargadas sobre
  // HCP-MMP1.0. Colores extraídos del propio .dlabel.nii, no inventados.
  "cole-anticevic.visual": "#0000ff",
  "cole-anticevic.visual2": "#6400ff",
  "cole-anticevic.somatomotor": "#00ffff",
  "cole-anticevic.cingulo-opercular": "#990099",
  "cole-anticevic.dorsal-attention": "#00ff00",
  "cole-anticevic.language": "#009b9b",
  "cole-anticevic.frontoparietal": "#ffff00",
  "cole-anticevic.auditory": "#fa3efb",
  "cole-anticevic.default": "#ff0000",
  "cole-anticevic.posterior-multimodal": "#b15928",
  "cole-anticevic.ventral-multimodal": "#ff9d00",
  "cole-anticevic.orbito-affective": "#417d00",
  // -- Redes propias del atlas Gordon 333 (Gordon et al., 2016), no
  // derivadas por voto como las de Cole-Anticevic: vienen ya decididas
  // en el propio archivo. Colores extraídos igualmente del
  // Gordon333.32k_fs_LR.dlabel.nii original, no inventados.
  "gordon333.default": "#ff0000",
  "gordon333.visual": "#0000be",
  "gordon333.smhand": "#00ffff",
  "gordon333.cinguloopunerc": "#800080",
  "gordon333.dorsalattn": "#00ff00",
  "gordon333.frontoparietal": "#ffff00",
  "gordon333.auditory": "#ff00ff",
  "gordon333.ventralattn": "#008080",
  "gordon333.parietooccip": "#ffffcc",
  "gordon333.smmouth": "#ff8000",
  "gordon333.medialparietal": "#9b4bff",
  "gordon333.salience": "#000000",
  // -- Redes de Yeo et al. 2011 (7 y 17) y comunidades de Power et al.
  // 2011 (decisión 73), asignadas a las regiones de HCP-MMP1.0 por voto
  // mayoritario de vértices. Colores extraídos de la tabla de etiquetas
  // del propio RSN-networks.32k_fs_LR.dlabel.nii del HCP, no inventados
  // (un test de frontend/src/logic/networkSurface.test.ts comprueba que
  // coinciden con los de frontend/public/parcels/networks/*.json).
  "yeo2011-7.vis": "#781285",
  "yeo2011-7.sommot": "#4682b4",
  "yeo2011-7.dorsattn": "#00760e",
  "yeo2011-7.salventattn": "#c439f9",
  "yeo2011-7.limbic": "#dcf8a3",
  "yeo2011-7.cont": "#e69321",
  "yeo2011-7.default": "#cd3d4e",
  "yeo2011-17.viscent": "#781285",
  "yeo2011-17.visperi": "#ff0000",
  "yeo2011-17.sommota": "#4682b4",
  "yeo2011-17.sommotb": "#2acca3",
  "yeo2011-17.dorsattna": "#499b3b",
  "yeo2011-17.dorsattnb": "#00760e",
  "yeo2011-17.salventattna": "#c439f9",
  "yeo2011-17.salventattnb": "#ff97d4",
  "yeo2011-17.limbica": "#dcf8a3",
  "yeo2011-17.limbicb": "#798631",
  "yeo2011-17.contc": "#778baf",
  "yeo2011-17.conta": "#e69321",
  "yeo2011-17.contb": "#863149",
  "yeo2011-17.temppar": "#0b2fff",
  "yeo2011-17.defaultc": "#000082",
  "yeo2011-17.defaulta": "#ffff00",
  "yeo2011-17.defaultb": "#cd3d4e",
  "power2011.default-mode": "#ff0000",
  "power2011.hand-somatosensory-motor": "#00ffff",
  "power2011.visual": "#0000ff",
  "power2011.fronto-parietal-task-control": "#f5f50f",
  "power2011.ventral-attention": "#008080",
  "power2011.caudate-putamen": "#004628",
  "power2011.superior-temporal-gyrus": "#ffb8d3",
  "power2011.cingulo-opercular-task-control": "#800080",
  "power2011.dorsal-attention": "#00dc00",
  "power2011.mouth-somatosensory-motor": "#ff8000",
  "power2011.thalamus": "#c3412c",
  "power2011.salience": "#000000",
  "power2011.unknown-medial-temporal-parietal": "#fff8b4",
  "power2011.unknown-with-memory-retrieval-activity": "#006cff",
  "power2011.hippocampus": "#002850",
  "power2011.auditory": "#ff00ff",
  "power2011.unknown-similar-to-nelson-2010": "#ffb45a",
  // Región sin pertenencia a red calculada todavía (p. ej. otros atlas
  // sin clasificación funcional cargada, como el subcórtex del HCP).
  // Gris deliberado: no es una red más, es la ausencia explícita de una.
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
  "cole-anticevic.visual": "Visual (Cole-Anticevic)",
  "cole-anticevic.visual2": "Visual 2 (Cole-Anticevic)",
  "cole-anticevic.somatomotor": "Somatomotora (Cole-Anticevic)",
  "cole-anticevic.cingulo-opercular": "Cíngulo-opercular (Cole-Anticevic)",
  "cole-anticevic.dorsal-attention": "Atención dorsal (Cole-Anticevic)",
  "cole-anticevic.language": "Lenguaje (Cole-Anticevic)",
  "cole-anticevic.frontoparietal": "Frontoparietal (Cole-Anticevic)",
  "cole-anticevic.auditory": "Auditiva (Cole-Anticevic)",
  "cole-anticevic.default": "Por defecto (Cole-Anticevic, Default Mode Network)",
  "cole-anticevic.posterior-multimodal": "Multimodal posterior (Cole-Anticevic)",
  "cole-anticevic.ventral-multimodal": "Multimodal ventral (Cole-Anticevic)",
  "cole-anticevic.orbito-affective": "Orbito-afectiva (Cole-Anticevic)",
  "gordon333.default": "Por defecto (Gordon 333, Default Mode Network)",
  "gordon333.visual": "Visual (Gordon 333)",
  "gordon333.smhand": "Somatomotora — mano (Gordon 333)",
  "gordon333.cinguloopunerc": "Cíngulo-opercular (Gordon 333)",
  "gordon333.dorsalattn": "Atención dorsal (Gordon 333)",
  "gordon333.frontoparietal": "Frontoparietal (Gordon 333)",
  "gordon333.auditory": "Auditiva (Gordon 333)",
  "gordon333.ventralattn": "Atención ventral (Gordon 333)",
  "gordon333.parietooccip": "Parieto-occipital (Gordon 333)",
  "gordon333.smmouth": "Somatomotora — boca (Gordon 333)",
  "gordon333.medialparietal": "Parietal medial (Gordon 333)",
  "gordon333.salience": "Saliencia (Gordon 333)",
  // Decisión 73: nombre en castellano + nombre ORIGINAL del artículo/archivo.
  "yeo2011-7.vis": "Visual — Vis (Yeo 2011, 7 redes)",
  "yeo2011-7.sommot": "Somatomotora — SomMot (Yeo 2011, 7 redes)",
  "yeo2011-7.dorsattn": "Atención dorsal — DorsAttn (Yeo 2011, 7 redes)",
  "yeo2011-7.salventattn": "Saliencia / atención ventral — SalVentAttn (Yeo 2011, 7 redes)",
  "yeo2011-7.limbic": "Límbica — Limbic (Yeo 2011, 7 redes)",
  "yeo2011-7.cont": "Control frontoparietal — Cont (Yeo 2011, 7 redes)",
  "yeo2011-7.default": "Por defecto (Default Mode Network) — Default (Yeo 2011, 7 redes)",
  "yeo2011-17.viscent": "Visual central — VisCent (Yeo 2011, 17 redes)",
  "yeo2011-17.visperi": "Visual periférica — VisPeri (Yeo 2011, 17 redes)",
  "yeo2011-17.sommota": "Somatomotora A — SomMotA (Yeo 2011, 17 redes)",
  "yeo2011-17.sommotb": "Somatomotora B — SomMotB (Yeo 2011, 17 redes)",
  "yeo2011-17.dorsattna": "Atención dorsal A — DorsAttnA (Yeo 2011, 17 redes)",
  "yeo2011-17.dorsattnb": "Atención dorsal B — DorsAttnB (Yeo 2011, 17 redes)",
  "yeo2011-17.salventattna": "Saliencia / atención ventral A — SalVentAttnA (Yeo 2011, 17 redes)",
  "yeo2011-17.salventattnb": "Saliencia / atención ventral B — SalVentAttnB (Yeo 2011, 17 redes)",
  "yeo2011-17.limbica": "Límbica A — LimbicA (Yeo 2011, 17 redes)",
  "yeo2011-17.limbicb": "Límbica B — LimbicB (Yeo 2011, 17 redes)",
  "yeo2011-17.contc": "Control frontoparietal C — ContC (Yeo 2011, 17 redes)",
  "yeo2011-17.conta": "Control frontoparietal A — ContA (Yeo 2011, 17 redes)",
  "yeo2011-17.contb": "Control frontoparietal B — ContB (Yeo 2011, 17 redes)",
  "yeo2011-17.temppar": "Temporoparietal — TempPar (Yeo 2011, 17 redes)",
  "yeo2011-17.defaultc": "Por defecto C — DefaultC (Yeo 2011, 17 redes)",
  "yeo2011-17.defaulta": "Por defecto A — DefaultA (Yeo 2011, 17 redes)",
  "yeo2011-17.defaultb": "Por defecto B — DefaultB (Yeo 2011, 17 redes)",
  "power2011.default-mode": "Por defecto — Default mode (Power 2011)",
  "power2011.hand-somatosensory-motor": "Somatomotora — mano — Hand somatosensory-motor (Power 2011)",
  "power2011.visual": "Visual — Visual (Power 2011)",
  "power2011.fronto-parietal-task-control": "Control de tarea frontoparietal — Fronto-parietal task control (Power 2011)",
  "power2011.ventral-attention": "Atención ventral — Ventral attention (Power 2011)",
  "power2011.caudate-putamen": "Caudado-putamen — Caudate putamen (Power 2011)",
  "power2011.superior-temporal-gyrus": "Giro temporal superior — Superior temporal gyrus (Power 2011)",
  "power2011.cingulo-opercular-task-control": "Control de tarea cíngulo-opercular — Cingulo-opercular task control (Power 2011)",
  "power2011.dorsal-attention": "Atención dorsal — Dorsal attention (Power 2011)",
  "power2011.mouth-somatosensory-motor": "Somatomotora — boca — Mouth somatosensory-motor (Power 2011)",
  "power2011.thalamus": "Tálamo — Thalamus (Power 2011)",
  "power2011.salience": "Saliencia — Salience (Power 2011)",
  "power2011.unknown-medial-temporal-parietal": "Sin identificar (temporal medial / parietal) — Unknown medial temporal parietal (Power 2011)",
  "power2011.unknown-with-memory-retrieval-activity": "Sin identificar (con actividad de recuperación de memoria) — Unknown with memory retrieval activity (Power 2011)",
  "power2011.hippocampus": "Hipocampo — Hippocampus (Power 2011)",
  "power2011.auditory": "Auditiva — Auditory (Power 2011)",
  "power2011.unknown-similar-to-nelson-2010": "Sin identificar (similar a Nelson 2010) — Unknown similar to Nelson 2010 (Power 2011)",
  unclassified: "Sin red asignada",
};

// Clasificaciones de red (el `<fuente>` de cada clave de arriba) -- para
// el selector de clasificación de App.tsx (decisión 73). Una fuente que
// no esté aquí se muestra con su identificador tal cual, nunca se oculta.
export const NETWORK_SOURCE_LABELS: Record<string, string> = {
  "cole-anticevic": "Cole-Anticevic (Ji et al., 2019)",
  gordon333: "Gordon 333 (Gordon et al., 2016)",
  "yeo2011-7": "Yeo et al., 2011 — 7 redes",
  "yeo2011-17": "Yeo et al., 2011 — 17 redes",
  power2011: "Power et al., 2011 — comunidades",
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

// Colores "intermedios" para todo lo que dibujan directamente
// Connectogram.tsx / Hemisferios.tsx / Brain3D.tsx / DetailPanel.tsx
// (líneas, contornos de nodo, texto, flechas) -- decisión 18 de
// docs/analisis-arquitectura.md, 30/08/2026. La app tiene ahora un tema
// oscuro real (frontend/src/index.css) pero la exportación a JPEG sigue
// forzando SIEMPRE fondo blanco explícito (decisión 11,
// frontend/src/logic/exportImage.ts) sin importar el tema en pantalla
// -- así que cualquier color que se dibuja dentro de un SVG o un canvas
// exportable tiene que leerse con contraste suficiente sobre los DOS
// fondos a la vez, no solo sobre uno. Elegidos maximizando el contraste
// WCAG más bajo de los dos (contra blanco puro #ffffff y contra el
// fondo oscuro real de los paneles, --panel-bg = #1d1e26) con un script
// de búsqueda exhaustiva sobre luminancia relativa, no a ojo: los
// cuatro llegan a un contraste >=3.85:1 contra ambos fondos (script y
// resultado documentados en la propia decisión 18).
//
// IMPORTANTE: los NETWORK_COLORS de arriba NUNCA se tocan por este
// motivo -- son datos extraídos de cada atlas real (ver comentario del
// propio NETWORK_COLORS), no una elección de diseño, y alterarlos sería
// fabricar un color que el atlas de origen no dice. Cuando un color de
// red real es un extremo (p. ej. "#000000" de gordon333.salience, o
// "#ffffcc" de gordon333.parietooccip) que desaparecería contra uno de
// los dos fondos, la solución es un halo/contorno neutro alrededor del
// nodo con NEUTRAL_COLOR (ver el trazo del nodo en
// Connectogram.tsx/Hemisferios.tsx y el mesh de contorno en
// Brain3D.tsx) -- nunca cambiar el color real.
export const NEUTRAL_COLOR = "#837f90";
export const ACCENT_SELECTED_COLOR = "#ac61d1";
export const INTRA_HEMISPHERE_COLOR = "#2a925e";
export const INTER_HEMISPHERE_COLOR = "#cf596d";
// Segundo color para el resaltado por homología real (Brain3D.tsx,
// 02/09/2026): cuando la usuaria elige una especie de comparación, las
// regiones con al menos una fila `Homology` real ya cargada hacia esa
// especie (backend `GET /homologies?species_id=...`, decisión 34) se
// pintan con este color en vez del NETWORK_COLORS real de su nodo --
// nunca al revés (nunca se inventa una lista de regiones "de circuito
// procedimental": ver la decisión de la usuaria, 02/09/2026, tras
// comprobar que no existe tal conjunto en los datos reales, solo la
// homología real cargada en la decisión 40, hoy limitada al complejo
// SMA). Elegido con el mismo método que NEUTRAL_COLOR/ACCENT_SELECTED_
// COLOR/INTRA_HEMISPHERE_COLOR/INTER_HEMISPHERE_COLOR de arriba (búsqueda
// por luminancia relativa sobre HSL, maximizando el contraste WCAG más
// bajo de los dos fondos reales de la app): #da500b llega a 4.09:1 contra
// blanco puro y 4.05:1 contra --panel-bg (#1d1e26), y su tono (naranja,
// hue~20) no coincide con ningún otro color "intermedio" ya usado aquí
// (violeta de ACCENT_SELECTED_COLOR, verde de INTRA_HEMISPHERE_COLOR,
// rosa de INTER_HEMISPHERE_COLOR) para que las cuatro señales nunca se
// confundan entre sí.
export const HOMOLOGY_HIGHLIGHT_COLOR = "#da500b";
