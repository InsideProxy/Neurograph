// Estado de selección compartido entre el connectograma y el cerebro 3D
// (sección 5.3: seleccionar un nodo o una conexión en una vista debe
// resaltarlo en la otra). Es deliberadamente la única fuente de verdad
// de la selección: ningún componente debe guardar su propia copia.
import { create } from "zustand";

interface SelectionState {
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  selectNode: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNodeId: null,
  selectedConnectionId: null,
  selectNode: (id) => set({ selectedNodeId: id, selectedConnectionId: null }),
  selectConnection: (id) => set({ selectedConnectionId: id, selectedNodeId: null }),
}));
