// Filtros de la visualización (sección 5.1: "Permite filtrado por umbral,
// tipo de conexión, red..."; sección 20: "filtros; selección de redes;
// selección de tipos de conectividad"). Un único estado compartido por
// las dos vistas, igual que la selección (src/state/selection.ts).
import { create } from "zustand";
import type { GraphConnection } from "../types/domain";

export type ConnectionType = GraphConnection["type"];

export interface FiltersState {
  hiddenNetworks: Set<string>;
  hiddenConnectionTypes: Set<ConnectionType>;
  minWeight: number;
  toggleNetwork: (network: string) => void;
  toggleConnectionType: (type: ConnectionType) => void;
  setMinWeight: (weight: number) => void;
}

export const useFiltersStore = create<FiltersState>((set) => ({
  hiddenNetworks: new Set(),
  hiddenConnectionTypes: new Set(),
  minWeight: 0,
  toggleNetwork: (network) =>
    set((state) => {
      const next = new Set(state.hiddenNetworks);
      if (next.has(network)) next.delete(network);
      else next.add(network);
      return { hiddenNetworks: next };
    }),
  toggleConnectionType: (type) =>
    set((state) => {
      const next = new Set(state.hiddenConnectionTypes);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { hiddenConnectionTypes: next };
    }),
  setMinWeight: (weight) => set({ minWeight: weight }),
}));
