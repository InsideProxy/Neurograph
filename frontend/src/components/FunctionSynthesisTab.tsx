// Pestaña temporal de "síntesis de IA" (decisión 71 de
// docs/analisis-arquitectura.md, 11/09/2026): muestra un archivo ya
// validado (frontend/src/logic/synthesisValidation.ts) que un asistente
// de IA propuso sobre qué regiones/redes REALMENTE cargadas en
// NeuroGraph asocia la literatura científica a una función cognitiva
// concreta.
//
// Deliberadamente NO reutiliza Connectogram/Brain3D: ambos dependen de
// los stores globales de selección/filtro (useSelectionStore,
// useFiltersStore) que ya usa la vista principal -- un filtro que la
// usuaria dejara puesto ahí (p. ej. "solo red X") podría ocultar en
// silencio regiones de esta síntesis sin ningún control visible en esta
// pestaña para corregirlo, exactamente el tipo de fallo silencioso que
// la sección 24 prohíbe. Esta pestaña dibuja su propio diagrama, aislado
// de ese estado global, con las MISMAS convenciones visuales ya
// establecidas en el resto del proyecto (color de red real de
// theme/networks.ts, línea discontinua para evidencia no directa,
// proyección 2D X/Y con Z descartado -- igual que
// backend/visualization/render_brain) para que se lea igual que el
// resto de la app sin heredar ninguno de sus efectos secundarios.
//
// Nunca se muestra ni un solo dato de este componente sin su cita al
// lado (sección 24) -- no hay ningún control para "ver cita" oculto
// detrás de un clic: la cita completa está siempre visible junto a su
// hallazgo.
import type { GraphNode } from "../types/domain";
import type { SynthesisFinding, ValidatedSynthesis } from "../types/synthesis";
import { EVIDENCE_TYPE_LABELS } from "../types/synthesis";
import { NETWORK_LABELS } from "../theme/networks";
import { useDrawColors } from "../theme/useDrawColors";

interface Props {
  validated: ValidatedSynthesis;
}

const DIAGRAM_SIZE = 420;
const DIAGRAM_PADDING = 36;

function projectNodes(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  // Misma proyección que backend/visualization (render_brain): vista
  // axial real, X/Y de la coordenada real, Z descartado a propósito --
  // nunca una posición inventada para este diagrama.
  const xs = nodes.map((n) => n.position3d[0]);
  const ys = nodes.map((n) => n.position3d[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const innerSize = DIAGRAM_SIZE - DIAGRAM_PADDING * 2;

  for (const node of nodes) {
    const nx = (node.position3d[0] - minX) / rangeX;
    const ny = (node.position3d[1] - minY) / rangeY;
    positions.set(node.id, {
      x: DIAGRAM_PADDING + nx * innerSize,
      // Se invierte el eje Y de pantalla (SVG crece hacia abajo) para
      // que "anterior" quede arriba, igual que las otras vistas 2D.
      y: DIAGRAM_SIZE - (DIAGRAM_PADDING + ny * innerSize),
    });
  }
  return positions;
}

function FindingDiagram({ validated }: Props) {
  const colors = useDrawColors();
  const nodes = Object.values(validated.resolvedNodes);
  const positions = projectNodes(nodes);

  if (nodes.length === 0) {
    return null;
  }

  const pairLines: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const finding of validated.file.findings) {
    for (let i = 0; i < finding.regionIds.length; i++) {
      for (let j = i + 1; j < finding.regionIds.length; j++) {
        const a = positions.get(finding.regionIds[i]);
        const b = positions.get(finding.regionIds[j]);
        if (a && b) {
          pairLines.push({ key: `${finding.id}-${i}-${j}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
        }
      }
    }
  }

  return (
    <svg
      className="synthesis-diagram"
      viewBox={`0 0 ${DIAGRAM_SIZE} ${DIAGRAM_SIZE}`}
      role="img"
      aria-label="Regiones reales resaltadas por esta síntesis, proyección axial (Z descartado)"
    >
      {/* Discontinuas a propósito: son asociaciones de literatura, nunca
          conectividad medida -- misma convención que evidenceLevel
          "hypothetical" en Connectogram/Hemisferios/Brain3D. */}
      {pairLines.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={colors.edge}
          strokeWidth={1.25}
          strokeDasharray="5,4"
          opacity={0.7}
        />
      ))}
      {nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        const color = colors.networkColor(node.network);
        return (
          <g key={node.id}>
            <circle cx={pos.x} cy={pos.y} r={7} fill={color} stroke={colors.nodeGap} strokeWidth={1} />
            <text x={pos.x + 9} y={pos.y + 4} fontSize={10} fill="var(--text)">
              {node.abbreviation ?? node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FindingCard({ finding, resolvedNodes, allFindings }: {
  finding: SynthesisFinding;
  resolvedNodes: Record<string, GraphNode>;
  allFindings: SynthesisFinding[];
}) {
  const findingsById = new Map(allFindings.map((f) => [f.id, f] as const));
  const agrees = (finding.agreesWith ?? []).map((id) => findingsById.get(id)).filter((f): f is SynthesisFinding => !!f);
  const conflicts = (finding.conflictsWith ?? [])
    .map((id) => findingsById.get(id))
    .filter((f): f is SynthesisFinding => !!f);

  return (
    <li className="synthesis-finding">
      <p className="synthesis-finding__summary">{finding.summary}</p>
      <p className="synthesis-finding__meta">
        {EVIDENCE_TYPE_LABELS[finding.evidenceType]}
        {finding.networkSlug && (
          <>
            {" · "}
            Red: {NETWORK_LABELS[finding.networkSlug] ?? finding.networkSlug}
          </>
        )}
      </p>
      <p className="synthesis-finding__regions">
        Regiones:{" "}
        {finding.regionIds
          .map((id) => resolvedNodes[id]?.label ?? id)
          .join(", ")}
      </p>
      {/* Cita siempre visible, nunca detrás de un clic (sección 24). */}
      <p className="synthesis-finding__citation">
        {finding.citation.authors} ({finding.citation.year}). {finding.citation.title}
        {finding.citation.journal ? `. ${finding.citation.journal}` : ""}
        {finding.citation.doi ? (
          <>
            {" · DOI: "}
            <a href={`https://doi.org/${finding.citation.doi}`} target="_blank" rel="noreferrer">
              {finding.citation.doi}
            </a>
          </>
        ) : null}
        {!finding.citation.doi && finding.citation.url ? (
          <>
            {" · "}
            <a href={finding.citation.url} target="_blank" rel="noreferrer">
              enlace
            </a>
          </>
        ) : null}
      </p>
      {agrees.length > 0 && (
        <p className="synthesis-finding__agrees">
          Coincide con: {agrees.map((f) => f.summary).join(" · ")}
        </p>
      )}
      {conflicts.length > 0 && (
        <p className="synthesis-finding__conflicts">
          Contradice a (desacuerdo real en la literatura, no resuelto aquí): {conflicts.map((f) => f.summary).join(" · ")}
        </p>
      )}
    </li>
  );
}

export function FunctionSynthesisTab({ validated }: Props) {
  const { file, resolvedNodes } = validated;
  return (
    <div className="synthesis-tab">
      <p className="synthesis-badge">
        SÍNTESIS DE IA A PARTIR DE LITERATURA · NO VERIFICADO — "{file.function}" · generado por {file.generatedBy} ·
        atlas {file.atlasId} · importado {new Date(validated.importedAt).toLocaleString()}
      </p>
      <p className="synthesis-disclaimer">
        Esto NO son datos reales de NeuroGraph ni una conclusión de la aplicación: es una propuesta de un asistente
        de IA a partir de literatura, con cada región verificada contra los datos realmente cargados, pero sin
        ninguna revisión humana todavía. Nunca se incorpora a la base de datos permanente de forma automática —
        cualquier promoción a dato permanente exige una decisión nueva, documentada y revisada a mano (ver
        docs/protocolo-sintesis-ia.md).
      </p>
      {file.notes && <p className="synthesis-notes">{file.notes}</p>}
      <div className="synthesis-layout">
        <div className="synthesis-diagram-wrap">
          <FindingDiagram validated={validated} />
        </div>
        <ul className="synthesis-findings-list">
          {file.findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} resolvedNodes={resolvedNodes} allFindings={file.findings} />
          ))}
        </ul>
      </div>
    </div>
  );
}
