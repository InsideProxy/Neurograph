// Estado de selección compartido entre el connectograma y el cerebro 3D
// (sección 5.3: seleccionar un nodo o una conexión en una vista debe
// resaltarlo en la otra). Es deliberadamente la única fuente de verdad
// de la selección: ningún componente debe guardar su propia copia.
//
// Selección múltiple de nodos (decisión de la usuaria, 30/08/2026): un
// programa de investigación, no de ilustración, necesita poder preguntar
// "¿qué conectividad existe ENTRE estas regiones que elijo?", no solo
// "¿qué conecta con esta única región?". Clic normal añade/quita una
// región del conjunto (confirmado con la usuaria; no se usa ningún
// modificador de teclado). Seleccionar una conexión y seleccionar nodos
// siguen siendo modos mutuamente excluyentes, igual que antes: elegir
// una conexión vacía el conjunto de nodos, y tocar cualquier nodo
// deselecciona la conexión activa.
import { create } from "zustand";

interface SelectionState {
  selectedNodeIds: Set<string>;
  selectedConnectionId: string | null;
  toggleNode: (id: string) => void;
  clearNodeSelection: () => void;
  selectConnection: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNodeIds: new Set(),
  selectedConnectionId: null,
  toggleNode: (id) =>
    set((state) => {
      const next = new Set(state.selectedNodeIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedNodeIds: next, selectedConnectionId: null };
    }),
  clearNodeSelection: () => set({ selectedNodeIds: new Set() }),
  selectConnection: (id) => set({ selectedConnectionId: id, selectedNodeIds: new Set() }),
}));
