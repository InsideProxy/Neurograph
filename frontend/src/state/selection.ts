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
//
// `selectNodes` (01/09/2026, petición de la usuaria tras "muéstrame la
// red de lenguaje en 3D": no existía ninguna forma de seleccionar una
// red entera de una vez, solo nodo a nodo) REEMPLAZA el conjunto de
// selección entero por la lista dada -- no lo amplía como `toggleNode`
// -- para que "seleccionar toda la red X" sea siempre un punto de
// partida predecible (esa red y solo esa red), nunca una mezcla
// acumulada con lo que hubiera seleccionado antes. Mismo criterio de
// exclusión mutua que el resto: vacía la conexión seleccionada.
//
// `addNodes` (07/09/2026, petición de la usuaria: comprobar si hay
// conectividad compartida entre varias redes necesita poder ir SUMANDO
// redes a una misma selección, no solo reemplazarla) AMPLÍA el conjunto
// ya seleccionado en vez de sustituirlo -- `selectNodes` sigue
// reemplazando como siempre (decisión anterior, sin cambios), así que
// "Resaltar" una red sigue siendo un punto de partida predecible; el
// botón nuevo "Añadir a selección" de FilterPanel.tsx es el único sitio
// que llama a `addNodes`.
import { create } from "zustand";

interface SelectionState {
  selectedNodeIds: Set<string>;
  selectedConnectionId: string | null;
  toggleNode: (id: string) => void;
  selectNodes: (ids: string[]) => void;
  addNodes: (ids: string[]) => void;
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
  selectNodes: (ids) => set({ selectedNodeIds: new Set(ids), selectedConnectionId: null }),
  addNodes: (ids) =>
    set((state) => {
      const next = new Set(state.selectedNodeIds);
      for (const id of ids) next.add(id);
      return { selectedNodeIds: next, selectedConnectionId: null };
    }),
  // Corregido el 07/09/2026: antes solo vaciaba `selectedNodeIds`, nunca
  // `selectedConnectionId` -- no tenía ningún efecto observable porque
  // no la llamaba nadie todavía. Con su primer uso real (el botón
  // "Limpiar selección" de FilterPanel.tsx) sí importa: limpiar "la
  // selección" debe vaciar cualquiera de los dos modos mutuamente
  // excluyentes, nunca solo uno.
  clearNodeSelection: () => set({ selectedNodeIds: new Set(), selectedConnectionId: null }),
  selectConnection: (id) => set({ selectedConnectionId: id, selectedNodeIds: new Set() }),
}));
