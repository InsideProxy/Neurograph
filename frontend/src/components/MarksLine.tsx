// Línea de las marcas en Filtros (docs/rediseno-interfaz-diseno.md, 5.9),
// bajo la selección: «Marcadas: N» con los nombres de las primeras y «y N
// más», cuántas ocultan los filtros (esas no se dibujan) y «Quitar marcas».
// Contextual (decisión del usuario, 25/09/2026): sin marcas no se dibuja
// nada -- ni el rótulo, ni el botón --, para aprovechar el espacio. Mientras
// hay marcas, el recuadro tiene siempre el mismo alto, para que la lista de
// redes no salte al marcar más regiones, al quitar alguna ni al mostrar u
// ocultar una red con los filtros: una fila con «Marcadas: N» y «Quitar
// marcas», y debajo dos líneas justas (App.css).
// - «Quitar marcas» es un paso del historial (state/history.ts): con dos o
//   más, sale el aviso con «Deshacer».
// - Las marcas cambian con un clic en las vistas o con Ctrl+Intro en el
//   buscador: la región viva de abajo, montada siempre, también sin marcas,
//   anuncia cuántas y cuáles, como la del aviso con «Deshacer» (spec 5.7).
//   Así «Quitar marcas», o deshacer la última marca, anuncia «Ninguna
//   región marcada» aunque la fila ya no esté. No anuncia las que ocultan
//   los filtros, para no repetirse cada vez que se muestra o se oculta una
//   red.
import { useMemo } from "react";
import {
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
  onClear,
}: {
  summary: MarksSummary;
  onClear: () => void;
}) {
  const hidden = marksHiddenText(summary.hidden);
  return (
    <>
      {summary.count > 0 && (
        <div className="filters__marks">
          <div className="filters__marks-row">
            <span className="filters__marks-heading">
              <span className="filters__marks-swatch" aria-hidden="true" />
              <span>{marksHeading(summary.count)}</span>
            </span>
            <button
              type="button"
              className="filters__text-btn filters__text-btn--strong"
              title="Quita las marcas de todas las regiones (se puede deshacer)"
              onClick={onClear}
            >
              Quitar marcas
            </button>
          </div>
          {/* Dos líneas justas: los nombres se cortan con «…» si no caben.
              Si los filtros ocultan alguna, cuántas va en una línea propia,
              que no se corta, y los nombres ocupan una. Los nombres de
              todas están en la etiqueta emergente. */}
          <p className="filters__marks-detail" title={joinNames(summary.allNames)}>
            <span className="filters__marks-text">{marksNamesText(summary)}</span>
            {hidden !== null && <span className="filters__marks-hidden">{hidden}</span>}
          </p>
        </div>
      )}
      {/* Región viva fuera del bloque de arriba: montada siempre, también
          sin marcas, para poder anunciar que ya no queda ninguna. */}
      <span className="visually-hidden" role="status">
        {marksAnnouncement(summary)}
      </span>
    </>
  );
}

export function MarksLine({ nodes }: { nodes: readonly GraphNode[] }) {
  const markedIds = useMarksStore((state) => state.markedIds);
  const clearMarks = useMarksStore((state) => state.clearMarks);
  const hiddenNetworks = useFiltersStore((state) => state.hiddenNetworks);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const summary = marksSummary(markedIds, nodeById, (node) => hiddenNetworks.has(node.network));
  return <MarksLineView summary={summary} onClear={clearMarks} />;
}
