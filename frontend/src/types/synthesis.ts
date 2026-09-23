// Tipos del archivo de "síntesis de IA" (decisión 71 de
// docs/analisis-arquitectura.md, 11/09/2026; ver
// docs/protocolo-sintesis-ia.md para el protocolo completo que debe
// seguir cualquier IA -- esta sesión, Claude Desktop, u otra -- al
// construir uno de estos archivos).
//
// Diseño acordado con la usuaria, 11/09/2026 (respuestas a las cuatro
// preguntas sobre esta función): la búsqueda de literatura la hace el
// propio asistente de IA con sus propias herramientas, nunca una nueva
// integración del backend con una API académica; el resultado es
// SIEMPRE una tercera categoría visual, clara y separada de "DATOS
// REALES"/"DATOS SINTÉTICOS" (nunca se confunde con ninguna de las dos);
// nada de esto pasa a la base de datos permanente de forma automática
// -- promoverlo requiere siempre una decisión nueva, documentada y
// revisada a mano, igual que la síntesis de homología SMA de la
// decisión 40; el alcance es cualquier función cognitiva en texto libre,
// no solo las seis redes teóricas ya planeadas para la Fase 2.0.
//
// Principio de fondo (sección 24, igual que el resto del proyecto):
// nunca se inventa un region_id -- cada uno tiene que existir ya entre
// las regiones REALMENTE cargadas del atlas activo (verificado con la
// herramienta MCP `search_region`, backend/mcp/server.py, y
// REVALIDADO otra vez dentro de la propia app al importar, nunca
// confiando en lo que declare el archivo -- ver
// frontend/src/logic/synthesisValidation.ts). El archivo puede y debe
// representar hallazgos que se contradicen entre sí (`conflictsWith`)
// en vez de forzar una única respuesta cuando la literatura real está
// dividida -- fue precisamente lo que encontramos investigando
// afantasia con Consensus el 11/09/2026 (Kutsche 2026/Liu 2024/Monzel
// 2024/Milton 2021 por un lado, Takamura 2026 en desacuerdo).

import type { GraphNode } from "./domain";

// Tipo de evidencia real que respalda un hallazgo -- información sobre
// el propio estudio citado, nunca inventada ni supuesta por quien arma
// el archivo.
export type EvidenceType = "functional" | "structural" | "lesion" | "connectivity" | "other";

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  functional: "Neuroimagen funcional (fMRI, PET...)",
  structural: "Neuroimagen estructural / conectividad estructural",
  lesion: "Estudio de lesión",
  connectivity: "Conectividad funcional / tractografía",
  other: "Otro tipo de evidencia",
};

// Cita real y completa -- nunca una referencia genérica. `journal`/`doi`/
// `url` pueden faltar si el estudio real todavía no los tiene (mismo
// criterio que StudyCitation en types/domain.ts), pero authors/year/title
// son obligatorios: sin ellos no hay nada verificable que mostrar.
export interface SynthesisCitation {
  authors: string;
  year: number;
  title: string;
  journal: string | null;
  doi: string | null;
  url: string | null;
}

// Un hallazgo individual de la literatura. `regionIds` son SIEMPRE ids
// reales de regiones ya cargadas en NeuroGraph -- resueltas por quien
// arma el archivo con la herramienta MCP `search_region`, y
// revalidadas otra vez al importar (nunca confiadas a ciegas).
// `networkSlug`, si se da, tiene que ser una red real ya visible entre
// esas regiones en el atlas activo (p. ej. "cole-anticevic.default"),
// nunca un nombre de red inventado por la IA -- se deja `null` cuando el
// hallazgo habla de regiones concretas sin que la literatura lo
// enmarque como "toda una red conocida".
export interface SynthesisFinding {
  id: string;
  summary: string;
  evidenceType: EvidenceType;
  regionIds: string[];
  networkSlug: string | null;
  citation: SynthesisCitation;
  // Ids de otros hallazgos DENTRO DE ESTE MISMO ARCHIVO que este
  // hallazgo apoya o contradice -- para representar explícitamente el
  // desacuerdo científico real en vez de ocultarlo forzando una sola
  // respuesta (ver cabecera de este archivo). `null` o `[]` cuando no
  // aplica.
  agreesWith: string[] | null;
  conflictsWith: string[] | null;
}

export interface SynthesisFile {
  schemaVersion: 1;
  // Nombre libre de la función/condición cognitiva, tal cual lo escribió
  // quien pidió la síntesis -- p. ej. "afantasia" (sin restringirse a
  // las seis redes teóricas de la Fase 2.0).
  function: string;
  // Qué asistente de IA (y, si aplica, qué modelo/versión) construyó
  // este archivo -- p. ej. "Claude Desktop (Sonnet 5), 11/09/2026".
  generatedBy: string;
  // Atlas real contra el que se resolvieron los regionIds -- el import
  // rechaza el archivo si el atlas activo en ese momento no es este
  // mismo (nunca se reinterpreta contra un atlas distinto).
  atlasId: string;
  findings: SynthesisFinding[];
  // Notas libres de quien arma el archivo -- p. ej. resumir un
  // desacuerdo real que no cabe bien en un solo `conflictsWith`. `null`
  // si no hace falta ninguna.
  notes: string | null;
}

// Resultado ya validado y "congelado" en el momento de importar: guarda
// una copia de los GraphNode reales resueltos en ese instante, para que
// la pestaña siga siendo válida y estable aunque la usuaria cambie de
// atlas más tarde en la vista principal -- una pestaña de síntesis,
// una vez abierta, no depende de nada que pueda cambiar por su cuenta.
export interface ValidatedSynthesis {
  file: SynthesisFile;
  resolvedNodes: Record<string, GraphNode>;
  importedAt: string;
}
