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
  // Añadidos el 30/08/2026 (petición de la usuaria: "marcar todas"/
  // "desmarcar todas" en el panel de filtros). Reciben la lista completa
  // de claves posibles (redes o tipos de conexión) en vez de vaciar/
  // llenar un Set "en abstracto", para que FilterPanel no tenga que
  // duplicar aquí su propia noción de qué claves existen.
  setHiddenNetworks: (networks: Set<string>) => void;
  setHiddenConnectionTypes: (types: Set<ConnectionType>) => void;
}

// minWeight empieza en 0, no en 0.3 (corregido el 07/09/2026, decisión
// 61 de docs/analisis-arquitectura.md): 0.3 se eligió en su día mirando
// solo la escala de Brainnetome, pero el peso real de Rosen & Halgren
// (64620 conexiones, decisión 41) nunca supera 0.144 -- con 0.3 por
// defecto, esa red entera queda invisible desde el primer arranque, sin
// ningún aviso (0 conexiones nunca dispara el aviso de "demasiadas").
// Ya no hace falta un umbral científico por defecto para evitar que el
// navegador se congele: esa es ahora responsabilidad exclusiva del tope
// de dibujado (`logic/renderSafety.ts`, MAX_RENDERED_CONNECTIONS,
// decisión 42/60) -- si hay demasiado que dibujar, el aviso lo dice
// explícitamente y pide subir este mismo deslizador, nunca oculta datos
// en silencio. Con 0, la vista inicial nunca descarta ninguna
// conectividad real por un umbral inventado (sección 24); el deslizador
// del panel de Filtros ahora usa una escala logarítmica real
// (`logic/weightScale.ts`) para poder subir desde 0 con precisión, ya
// que el dato real se concentra en varios órdenes de magnitud por
// debajo de 0.01.
const INITIAL_MIN_WEIGHT = 0;

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
  setHiddenNetworks: (networks) => set({ hiddenNetworks: new Set(networks) }),
  setHiddenConnectionTypes: (types) => set({ hiddenConnectionTypes: new Set(types) }),
}));
