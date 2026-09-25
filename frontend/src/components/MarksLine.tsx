// Línea de las marcas en Filtros (docs/rediseno-interfaz-diseno.md, 5.9),
// bajo la selección: «Marcadas: N» con los nombres de las primeras y «y N
// más», cuántas ocultan los filtros (esas no se dibujan) y «Quitar marcas».
// Sin marcas, explica el gesto. Está siempre, y siempre con el mismo alto,
// para que la lista de redes no salte al marcar la primera región, al
// marcar más ni al quitarlas: una fila con «Marcadas: N» y «Quitar marcas»,
// y debajo dos líneas justas (App.css).
// - «Quitar marcas» es un paso del historial (state/history.ts): con dos o
//   más, sale el aviso con «Deshacer». Sin marcas lleva aria-disabled y no
//   disabled, para no perder el foco del teclado al pulsarlo, como los
//   botones de deshacer y rehacer.
// - Las marcas cambian con un clic en las vistas o con Ctrl+Intro en el
//   buscador: una región viva oculta anuncia cuántas y cuáles, como la del
//   aviso con «Deshacer» (spec 5.7). No anuncia las que ocultan los filtros,
//   para no repetirse cada vez que se muestra o se oculta una red.
import { useMemo } from "react";
import {
  markGestureHint,
  marksAnnouncement,
  marksHeading,
  marksHiddenText,
  marksNamesText,
  marksSummary,
  type MarksSummary,
} from "../logic/marks";
import { joinNames } from "../logic/displayText";
import { useFiltersStore } from "../state/filters";
import { useMarksStore } from "../state/marks";
import type { GraphNode } from "../types/domain";

// La línea sin los stores: se prueba con cualquier resumen.
export function MarksLineView({
  summary,
  gestureHint,
  onClear,
}: {
  summary: MarksSummary;
  // «Ctrl+clic en una región para marcarla», como en cada sistema.
  gestureHint: string;
  onClear: () => void;
}) {
  const empty = summary.count === 0;
  const hidden = marksHiddenText(summary.hidden);
  return (
    <div className="filters__marks">
      <div className="filters__marks-row">
        <span className="filters__marks-heading">
          <span className="filters__marks-swatch" aria-hidden="true" />
          <span>{marksHeading(summary.count)}</span>
        </span>
        <button
          type="button"
          className="filters__text-btn filters__text-btn--strong"
          aria-disabled={empty}
          title="Quita las marcas de todas las regiones (se puede deshacer)"
          onClick={() => {
            if (!empty) onClear();
          }}
        >
          Quitar marcas
        </button>
      </div>
      {/* Dos líneas justas: los nombres, o cómo marcar, se cortan con «…» si
          no caben. Si los filtros ocultan alguna, cuántas va en una línea
          propia, que no se corta, y los nombres ocupan una. Los nombres de
          todas están en la etiqueta emergente. */}
      <p className="filters__marks-detail" title={empty ? undefined : joinNames(summary.allNames)}>
        <span className="filters__marks-text">{empty ? gestureHint : marksNamesText(summary)}</span>
        {hidden !== null && <span className="filters__marks-hidden">{hidden}</span>}
      </p>
      <span className="visually-hidden" role="status">
        {marksAnnouncement(summary)}
      </span>
    </div>
  );
}

export function MarksLine({ nodes }: { nodes: readonly GraphNode[] }) {
  const markedIds = useMarksStore((state) => state.markedIds);
  const clearMarks = useMarksStore((state) => state.clearMarks);
  const hiddenNetworks = useFiltersStore((state) => state.hiddenNetworks);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const summary = marksSummary(markedIds, nodeById, (node) => hiddenNetworks.has(node.network));
  return (
    <MarksLineView
      summary={summary}
      gestureHint={markGestureHint(typeof navigator === "undefined" ? "" : navigator.userAgent)}
      onClear={clearMarks}
    />
  );
}
