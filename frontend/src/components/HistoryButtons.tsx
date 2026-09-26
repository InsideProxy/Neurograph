// Deshacer y rehacer (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.7): dos botones de icono en la fila
// de selección de Filtros, donde se arma el montaje. Su etiqueta emergente
// describe el paso (logic/historyStep.ts, historyButtons), también con el
// foco del teclado (data-tip, en App.css). Sin paso, llevan aria-disabled y
// no hacen nada. El teclado lo atiende useHistoryShortcuts, desde App.
import { useMemo, type Ref } from "react";
import { historyButtons, type HistoryButtonState } from "../logic/historyStep";
import { redo, undo, useHistoryStore } from "../state/history";
import type { GraphConnection, GraphNode } from "../types/domain";
import { Icon } from "./Icon";

// Los botones sin el historial: se prueban con cualquier estado.
export function HistoryButtonsView({
  undo: undoButton,
  redo: redoButton,
  onUndo,
  onRedo,
  undoRef,
}: {
  undo: HistoryButtonState;
  redo: HistoryButtonState;
  onUndo: () => void;
  onRedo: () => void;
  // App devuelve aquí el foco tras el «Deshacer» del aviso.
  undoRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <span className="history">
      <button
        ref={undoRef}
        type="button"
        className="history__btn"
        aria-label="Deshacer"
        aria-disabled={!undoButton.enabled}
        aria-keyshortcuts="Control+Z Meta+Z"
        title={undoButton.tip}
        data-tip={undoButton.tip}
        onClick={onUndo}
      >
        <Icon name="undo" size={14} />
      </button>
      <button
        type="button"
        className="history__btn"
        aria-label="Rehacer"
        aria-disabled={!redoButton.enabled}
        aria-keyshortcuts="Control+Shift+Z Control+Y Meta+Shift+Z"
        title={redoButton.tip}
        data-tip={redoButton.tip}
        onClick={onRedo}
      >
        <Icon name="redo" size={14} />
      </button>
    </span>
  );
}

export function HistoryButtons({
  nodes,
  connections,
  undoRef,
}: {
  nodes: readonly GraphNode[];
  connections: readonly GraphConnection[];
  undoRef?: Ref<HTMLButtonElement>;
}) {
  const past = useHistoryStore((state) => state.past);
  const present = useHistoryStore((state) => state.present);
  const future = useHistoryStore((state) => state.future);
  const pendingFrom = useHistoryStore((state) => state.pendingFrom);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  // La conexión se busca solo si el paso la nombra.
  const buttons = historyButtons(
    { past, present, future, pendingFrom },
    { nodeById, findConnection: (id) => connections.find((connection) => connection.id === id) },
  );
  return <HistoryButtonsView undo={buttons.undo} redo={buttons.redo} onUndo={undo} onRedo={redo} undoRef={undoRef} />;
}
