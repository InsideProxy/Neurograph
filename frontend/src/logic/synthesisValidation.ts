// Validación real de un archivo de síntesis de IA (decisión 71 de
// docs/analisis-arquitectura.md) contra el estado REAL de la app en el
// momento de importar. Nunca se confía en lo que el archivo declara por
// sí solo -- ni siquiera en sus region_id, aunque quien lo generó ya los
// haya resuelto con la herramienta MCP `search_region`: esta función
// los busca otra vez, uno a uno, entre las regiones que la propia app
// tiene REALMENTE cargadas ahora mismo (`loadedNodes`, el mismo array
// que ya usan Connectogram/Brain3D/FilterPanel), y rechaza el archivo
// entero si falta uno solo -- nunca se importa "lo que sí resolvió",
// descartando en silencio lo que no (sección 24: nunca un resultado
// parcial disfrazado de éxito).
import type { GraphNode } from "../types/domain";
import type { EvidenceType, SynthesisFile, SynthesisFinding, ValidatedSynthesis } from "../types/synthesis";

export type SynthesisValidationResult =
  | { ok: true; validated: ValidatedSynthesis }
  | { ok: false; errors: string[] };

const EVIDENCE_TYPES: ReadonlySet<string> = new Set<EvidenceType>([
  "functional",
  "structural",
  "lesion",
  "connectivity",
  "other",
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export function validateSynthesisFile(
  raw: unknown,
  loadedAtlasId: string,
  loadedNodes: GraphNode[],
): SynthesisValidationResult {
  const errors: string[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ["El archivo no contiene un objeto JSON válido en su nivel superior."] };
  }
  const file = raw as Partial<SynthesisFile>;

  if (file.schemaVersion !== 1) {
    errors.push(`'schemaVersion' debe ser 1 (recibido: ${JSON.stringify(file.schemaVersion)}).`);
  }
  if (!isNonEmptyString(file.function)) {
    errors.push("Falta 'function' (el nombre de la función/condición cognitiva), o está vacío.");
  }
  if (!isNonEmptyString(file.generatedBy)) {
    errors.push("Falta 'generatedBy' (qué asistente de IA generó este archivo).");
  }
  if (!isNonEmptyString(file.atlasId)) {
    errors.push("Falta 'atlasId'.");
  } else if (file.atlasId !== loadedAtlasId) {
    errors.push(
      `El archivo se generó contra el atlas '${file.atlasId}', pero el atlas cargado ahora mismo es ` +
        `'${loadedAtlasId}'. Cambia al atlas correcto antes de importar -- nunca se reinterpreta un ` +
        `archivo de síntesis contra un atlas distinto del que el propio archivo declara.`,
    );
  }
  if (!Array.isArray(file.findings) || file.findings.length === 0) {
    errors.push("'findings' debe ser una lista con al menos un hallazgo real.");
  }

  // Si ya falta la base del archivo, no tiene sentido seguir validando
  // hallazgo a hallazgo -- solo produciría errores en cascada confusos
  // sobre una estructura que ya está señalada como inválida.
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const findings = file.findings as SynthesisFinding[];
  const nodesById = new Map(loadedNodes.map((n) => [n.id, n] as const));
  const findingIds = new Set<string>();
  const resolvedNodes: Record<string, GraphNode> = {};

  findings.forEach((finding, idx) => {
    const where = `Hallazgo #${idx + 1}`;

    if (!isNonEmptyString(finding?.id)) {
      errors.push(`${where}: falta 'id'.`);
    } else if (findingIds.has(finding.id)) {
      errors.push(`${where}: 'id' repetido ('${finding.id}') -- cada hallazgo necesita un id único dentro del archivo.`);
    } else {
      findingIds.add(finding.id);
    }

    if (!isNonEmptyString(finding?.summary)) {
      errors.push(`${where}: falta 'summary'.`);
    }

    if (!EVIDENCE_TYPES.has(finding?.evidenceType as string)) {
      errors.push(
        `${where}: 'evidenceType' inválido (${JSON.stringify(finding?.evidenceType)}) -- debe ser uno de: ` +
          `${[...EVIDENCE_TYPES].join(", ")}.`,
      );
    }

    if (!Array.isArray(finding?.regionIds) || finding.regionIds.length === 0) {
      errors.push(`${where}: 'regionIds' debe tener al menos una región real.`);
    } else {
      for (const regionId of finding.regionIds) {
        const node = nodesById.get(regionId);
        if (!node) {
          errors.push(
            `${where}: region_id '${regionId}' no existe entre las regiones REALMENTE cargadas del atlas ` +
              `'${loadedAtlasId}' -- nunca se muestra una región que no está verificada en los datos reales ` +
              `de NeuroGraph ahora mismo (búscala primero con la herramienta MCP search_region).`,
          );
        } else {
          resolvedNodes[regionId] = node;
        }
      }
    }

    if (finding?.networkSlug != null) {
      if (typeof finding.networkSlug !== "string" || finding.networkSlug.trim() === "") {
        errors.push(`${where}: 'networkSlug' debe ser una cadena no vacía, o null.`);
      } else if (Array.isArray(finding.regionIds)) {
        const networkVisibleEnRegiones = finding.regionIds.some(
          (rid) => nodesById.get(rid)?.network === finding.networkSlug,
        );
        if (!networkVisibleEnRegiones) {
          errors.push(
            `${where}: 'networkSlug' ('${finding.networkSlug}') no coincide con la red real de ninguna de las ` +
              `regiones listadas en este hallazgo -- nunca se muestra un nombre de red que el propio atlas no ` +
              `asigna a esas regiones.`,
          );
        }
      }
    }

    const citation = finding?.citation;
    if (
      typeof citation !== "object" ||
      citation === null ||
      !isNonEmptyString(citation.authors) ||
      typeof citation.year !== "number" ||
      !Number.isFinite(citation.year) ||
      !isNonEmptyString(citation.title)
    ) {
      errors.push(
        `${where}: falta una cita real y completa (authors, year, title) -- ningún hallazgo se muestra sin su ` +
          `cita (sección 24).`,
      );
    }
  });

  // Referencias cruzadas: agreesWith/conflictsWith solo pueden apuntar a
  // ids de hallazgos que de verdad existen dentro de este mismo archivo.
  findings.forEach((finding, idx) => {
    const where = `Hallazgo #${idx + 1}`;
    const refs = [...(finding?.agreesWith ?? []), ...(finding?.conflictsWith ?? [])];
    for (const ref of refs) {
      if (!findingIds.has(ref)) {
        errors.push(`${where}: referencia a un hallazgo inexistente ('${ref}') en agreesWith/conflictsWith.`);
      }
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    validated: {
      file: file as SynthesisFile,
      resolvedNodes,
      importedAt: new Date().toISOString(),
    },
  };
}
