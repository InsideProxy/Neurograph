// Panel de filtros (secciones 5.1 y 20): permite ocultar redes, ocultar
// tipos de conectividad y aplicar un umbral mínimo de peso. Sirve también
// de leyenda: el color de cada casilla es el mismo que usan las dos
// visualizaciones (src/theme/networks.ts).
//
// Bug real corregido el 01/09/2026 (decisión 41 de
// docs/analisis-arquitectura.md): esta lista mostraba SIEMPRE las 20
// claves de NETWORK_LABELS enteras -- las 7 genéricas de solo
// demostración (frontend/src/data/demo.ts) mezcladas con las reales de
// Cole-Anticevic/Gordon 333, sin filtrar por lo que de verdad hay
// cargado en el atlas activo. Marcar "Lenguaje" (la clave genérica de
// demo) nunca coincidía con ningún dato real -- `region_to_node()` en
// el backend siempre cualifica la clave real como
// `<fuente>.<código_local>` (p. ej. `cole-anticevic.language`) -- así
// que el filtro parecía roto aunque los datos reales sí existieran.
// Ahora la lista se calcula a partir de `nodes` (los nodos realmente
// cargados para el atlas/fuente activa, real o demo): solo aparecen
// redes que de verdad tienen al menos un nodo, nunca una lista fija.
import { useMemo } from "react";
import { CONNECTION_TYPE_LABELS, NETWORK_COLORS, NETWORK_LABELS, NEUTRAL_COLOR } from "../theme/networks";
import { useFiltersStore, type ConnectionType } from "../state/filters";
import { useSelectionStore } from "../state/selection";
import { formatMinWeight, sliderPositionToWeight, weightToSliderPosition } from "../logic/weightScale";
import type { GraphNode } from "../types/domain";

const CONNECTION_TYPES: ConnectionType[] = ["structural", "functional", "effective"];

interface FilterPanelProps {
  nodes: GraphNode[];
}

export function FilterPanel({ nodes }: FilterPanelProps) {
  const {
    hiddenNetworks,
    hiddenConnectionTypes,
    minWeight,
    toggleNetwork,
    toggleConnectionType,
    setMinWeight,
    setHiddenNetworks,
  } = useFiltersStore();
  const { selectedNodeIds, selectedConnectionId, selectNodes, addNodes, clearNodeSelection } =
    useSelectionStore();

  // Redes presentes de verdad en los nodos actuales (real o demo, nunca
  // los dos a la vez -- App.tsx ya garantiza eso). El orden sigue el de
  // NETWORK_LABELS (agrupa por fuente de forma legible); una clave que
  // apareciera en los datos pero no en NETWORK_LABELS todavía (un atlas
  // nuevo sin registrar en theme/networks.ts) se añade al final con su
  // propio nombre en vez de ocultarse -- nunca se descarta un dato real
  // por no tener etiqueta bonita todavía.
  const networkKeys = useMemo(() => {
    const present = new Set(nodes.map((node) => node.network));
    const known = Object.keys(NETWORK_LABELS).filter((key) => present.has(key));
    const unknown = [...present].filter((key) => !(key in NETWORK_LABELS)).sort();
    return [...known, ...unknown];
  }, [nodes]);

  // Ids de nodo por red (01/09/2026, para el botón "Seleccionar red" de
  // cada fila, más abajo) -- se agrupa una sola vez aquí en vez de
  // recorrer `nodes` dentro de cada `onClick`.
  const nodeIdsByNetwork = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const node of nodes) {
      const list = map.get(node.network);
      if (list) list.push(node.id);
      else map.set(node.network, [node.id]);
    }
    return map;
  }, [nodes]);

  // "Marcar todas"/"desmarcar todas" (petición de la usuaria, 30/08/2026,
  // corregido el mismo día: la primera versión afectaba también a "Tipo
  // de conectividad" -- la usuaria pidió explícitamente que NO lo haga).
  // Solo actúan sobre la lista de redes, por eso viven dentro de su
  // propio fieldset en vez de arriba del todo del panel.
  const markAllNetworks = () => setHiddenNetworks(new Set());
  const unmarkAllNetworks = () => setHiddenNetworks(new Set(networkKeys));

  // Botón "Seleccionar red" (01/09/2026, petición explícita de la
  // usuaria tras pedir ver la red de lenguaje en 3D: no existía ninguna
  // forma de elegir una red entera de una vez, solo nodo a nodo).
  // Reemplaza la selección de nodos por TODOS los de esta red
  // (`selectNodes`, nunca `toggleNode` uno a uno) y, si la red estaba
  // oculta por el filtro, la muestra primero -- una red oculta no tiene
  // ningún nodo real dibujado en el connectograma/hemisferios/3D (los
  // tres filtran por `hiddenNetworks` antes de nada), así que
  // seleccionarla sin desocultarla dejaría el cerebro 3D vacío pese a
  // que la selección "existe" en el estado. El cerebro 3D, al recibir
  // dos o más nodos seleccionados, dibuja solo la conectividad real
  // INDUCIDA entre ellos (Brain3D.tsx, `computeFocus`) -- nunca el grafo
  // completo -- así que este botón es también la forma segura de ver una
  // red entera sin arriesgar el problema real de rendimiento corregido
  // hoy mismo (ver el tope de conexiones dibujadas en Connectogram.tsx/
  // Hemisferios.tsx).
  const selectWholeNetwork = (network: string) => {
    if (hiddenNetworks.has(network)) {
      const next = new Set(hiddenNetworks);
      next.delete(network);
      setHiddenNetworks(next);
    }
    selectNodes(nodeIdsByNetwork.get(network) ?? []);
  };

  // Botón "Añadir a selección" (07/09/2026, petición explícita de la
  // usuaria: poder comprobar si hay conectividad real compartida ENTRE
  // varias redes, no solo dentro de una). Misma lógica de desocultar la
  // red que `selectWholeNetwork`, pero AMPLÍA la selección (`addNodes`)
  // en vez de reemplazarla -- así se pueden ir sumando redes una a una y
  // `inducedConnections` (ya existente) calcula sola la conectividad
  // real entre TODOS los nodos acumulados, cruce entre redes incluido.
  const addNetworkToSelection = (network: string) => {
    if (hiddenNetworks.has(network)) {
      const next = new Set(hiddenNetworks);
      next.delete(network);
      setHiddenNetworks(next);
    }
    addNodes(nodeIdsByNetwork.get(network) ?? []);
  };

  const hasSelection = selectedNodeIds.size > 0 || selectedConnectionId !== null;

  return (
    <aside className="filter-panel">
      <h2>Filtros</h2>

      <fieldset>
        <legend>Redes</legend>
        <div className="filter-panel__bulk-actions">
          <button type="button" className="filter-panel__bulk-btn" onClick={markAllNetworks}>
            Marcar todas
          </button>
          <button type="button" className="filter-panel__bulk-btn" onClick={unmarkAllNetworks}>
            Desmarcar todas
          </button>
        </div>
        <div className="filter-panel__selection-status">
          <span>
            {selectedNodeIds.size > 0
              ? `${selectedNodeIds.size} nodo${selectedNodeIds.size === 1 ? "" : "s"} resaltado${selectedNodeIds.size === 1 ? "" : "s"}`
              : "Ningún nodo resaltado"}
          </span>
          <button
            type="button"
            className="filter-panel__bulk-btn"
            disabled={!hasSelection}
            title="Quita el resaltado actual (nodos o conexión seleccionada) en las tres vistas"
            onClick={clearNodeSelection}
          >
            Limpiar selección
          </button>
        </div>
        {networkKeys.length === 0 && (
          <p className="filter-panel__empty">Sin redes cargadas todavía.</p>
        )}
        {networkKeys.map((network) => (
          <div key={network} className="filter-row filter-row--network">
            <label>
              <input
                type="checkbox"
                checked={!hiddenNetworks.has(network)}
                onChange={() => toggleNetwork(network)}
              />
              <span
                className="legend-swatch"
                style={{ backgroundColor: NETWORK_COLORS[network] ?? NEUTRAL_COLOR }}
              />
              {NETWORK_LABELS[network] ?? network}
            </label>
            <div className="filter-row__actions">
              <button
                type="button"
                className="filter-panel__select-network-btn"
                title={`Seleccionar y resaltar los ${nodeIdsByNetwork.get(network)?.length ?? 0} nodos de esta red, reemplazando cualquier selección anterior (se refleja en el conectograma y en el cerebro 3D)`}
                onClick={() => selectWholeNetwork(network)}
              >
                Resaltar
              </button>
              <button
                type="button"
                className="filter-panel__select-network-btn"
                title={`Añadir los ${nodeIdsByNetwork.get(network)?.length ?? 0} nodos de esta red a la selección actual, sin quitar lo ya resaltado -- para comprobar conectividad compartida entre varias redes`}
                onClick={() => addNetworkToSelection(network)}
              >
                + Añadir
              </button>
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset>
        <legend>Tipo de conectividad</legend>
        {CONNECTION_TYPES.map((type) => (
          <label key={type} className="filter-row">
            <input
              type="checkbox"
              checked={!hiddenConnectionTypes.has(type)}
              onChange={() => toggleConnectionType(type)}
            />
            {CONNECTION_TYPE_LABELS[type]}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Peso mínimo: {formatMinWeight(minWeight)}</legend>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={weightToSliderPosition(minWeight)}
          onChange={(event) => setMinWeight(sliderPositionToWeight(Number(event.target.value)))}
        />
        <p className="filter-panel__weight-help">
          Escala logarítmica: el peso real de conectividad se concentra en
          varios órdenes de magnitud por debajo de 0.01, así que cada tramo
          del deslizador multiplica el peso en vez de sumarle una cantidad
          fija. En el extremo izquierdo (0) no se filtra nada.
        </p>
      </fieldset>
    </aside>
  );
}
