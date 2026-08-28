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

// minWeight empieza en 0.3, no en 0: con matrices de conectividad real
// densas (p. ej. las 30 135 conexiones de Brainnetome, sin umbral por
// decisión de la usuaria — sección 24, nunca se descarta nada al cargar
// los datos), dibujar TODAS de golpe al abrir la página congelaría el
// navegador. 0.3 dista mucho de ser una "verdad": es solo el punto de
// partida de la vista, ajustable en cualquier momento con el deslizador
// — el dato completo sigue estando ahí debajo, intacto.
const INITIAL_MIN_WEIGHT = 0.3;

export const useFiltersStore = create<FiltersState>((set) => ({
  hiddenNetworks: new Set(),
  hiddenConnectionTypes: new Set(),
  minWeight: INITIAL_MIN_WEIGHT,
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
