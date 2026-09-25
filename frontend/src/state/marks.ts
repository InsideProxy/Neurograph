// Marcas de regiones (docs/rediseno-interfaz-diseno.md, 5.9). Son una capa
// aparte de la selección: seleccionar activa la red de la región, con sus
// conexiones y el foco del 3D; marcar solo la señala, para encontrarla de
// un vistazo en todas las vistas, sin cambiar lo que se dibuja.
// - Ctrl+clic (⌘+clic en macOS) en un nodo marca o desmarca la región, y
//   Ctrl+Intro en el buscador de regiones, la sugerencia activa.
// - Marcar, desmarcar y «Quitar marcas» son pasos del historial de deshacer:
//   state/history.ts se suscribe a este store y restaura sus instantáneas.
//   Como los de selección y filtros, cada cambio crea un Set nuevo y nunca
//   modifica el anterior, que el historial guarda.
// - No se guardan: se pierden al recargar. Al cambiar de atlas se vacían
//   (resetForAtlasChange, en state/history.ts), y con otra clasificación de
//   redes se conservan, porque las regiones son las mismas.
import { create } from "zustand";

interface MarksState {
  markedIds: Set<string>;
  toggleMark: (id: string) => void;
  clearMarks: () => void;
}

export const useMarksStore = create<MarksState>((set) => ({
  markedIds: new Set(),
  toggleMark: (id) =>
    set((state) => {
      const next = new Set(state.markedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { markedIds: next };
    }),
  // Sin marcas no cambia nada: ni siquiera avisa a quien escucha.
  clearMarks: () => set((state) => (state.markedIds.size === 0 ? state : { markedIds: new Set() })),
}));
