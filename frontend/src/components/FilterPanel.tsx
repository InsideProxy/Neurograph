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
import { useId, useMemo, useState, type ReactNode } from "react";
import { CONNECTION_TYPE_LABELS, NETWORK_LABELS } from "../theme/networks";
import { useDrawColors } from "../theme/useDrawColors";
import { useFiltersStore, type ConnectionType } from "../state/filters";
import { useSelectionStore } from "../state/selection";
import { formatMinWeight, sliderPositionToWeight, weightToSliderPosition } from "../logic/weightScale";
import { connectionsPassingText, formatCount, networkShortLabel, selectionStatusText } from "../logic/displayText";
import { MAX_RENDERED_CONNECTIONS } from "../logic/renderSafety";
import type { GraphNode } from "../types/domain";
import { Icon } from "./Icon";
import { MarksLine } from "./MarksLine";
import { RegionSearch } from "./RegionSearch";
import { useTourControl } from "./useTourControl";

const CONNECTION_TYPES: ConnectionType[] = ["structural", "functional", "effective"];

// Título de una sección plegable (D4 de docs/decisiones-diseno.md; spec
// 5.3): un botón con aria-expanded que controla el cuerpo de la sección.
// Va dentro del encabezado; los demás botones de la cabecera («Todas»,
// «Ninguna») van fuera de él.
function SectionToggle({
  open,
  controls,
  onToggle,
  children,
}: {
  open: boolean;
  controls: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="filters__disclosure" aria-expanded={open} aria-controls={controls} onClick={onToggle}>
      <Icon name="chevronDown" size={14} className="filters__chevron" />
      {children}
    </button>
  );
}

interface FilterPanelProps {
  nodes: GraphNode[];
  // Decisión 74: el panel se puede plegar para dejar más sitio a la vista
  // principal. Sin esto, no se muestra el botón de plegar.
  onCollapse?: () => void;
  // D4 de docs/decisiones-diseno.md (spec 5.3). Las calcula App con
  // logic/filterCounts.ts: cuántas conexiones de cada tipo pasan los
  // filtros de redes y peso, sin contar su casilla...
  connectionCountsByType: Record<ConnectionType, number>;
  // ...y «N de M conexiones pasan los filtros»: N, las que pasan todos
  // los filtros; M, las cargadas para el atlas.
  connectionTotals: { visible: number; loaded: number };
  // Deshacer y rehacer (D4; spec 5.7): los botones los pinta App
  // (HistoryButtons), junto a «Limpiar». El panel no sabe nada del
  // historial.
  historyControls?: ReactNode;
}

export function FilterPanel({
  nodes,
  onCollapse,
  connectionCountsByType,
  connectionTotals,
  historyControls,
}: FilterPanelProps) {
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

  // Muestras de color con la paleta activa (spec 4.3), como en las vistas.
  const { networkColor } = useDrawColors();

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

  const headingId = useId();
  // Secciones plegables (decisión 74): las tres empiezan abiertas, como
  // con los <details open> de antes.
  const [openSections, setOpenSections] = useState({ networks: true, types: true, weight: true });
  const toggleSection = (section: keyof typeof openSections) =>
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  // El tour guiado (D11; spec 5.10) las abre para señalar lo de dentro y, al
  // salir, las deja como estaban.
  useTourControl("secciones", openSections, setOpenSections);

  // D4 de docs/decisiones-diseno.md (spec 5.3): el mismo contenido y las
  // mismas acciones de la decisión 74 (D1), con otra jerarquía. Las
  // secciones siguen siendo plegables, pero su título es un botón con
  // aria-expanded y no un <summary>: la cabecera de «Redes» lleva además
  // «Todas» y «Ninguna», que no pueden ir dentro de un <summary>. Hay una
  // fila por red con su número de regiones: ◎ y + aparecen al pasar el
  // ratón o al llegar a la fila con el teclado. Junto a cada tipo de
  // conectividad va su recuento, y bajo el peso mínimo, «N de M
  // conexiones pasan los filtros». Los números a la vista van con
  // aria-hidden y su unidad en texto oculto: «Estructural, 3
  // conexiones» y no «Estructural 3». Cada sección es un grupo con el
  // nombre de su título (role="group"), no un <section>: tres puntos de
  // referencia más en un panel lateral estorbarían al navegar por ellos.
  return (
    <aside className="filter-panel filters" aria-labelledby={`${headingId}-title`}>
      <div className="filters__header">
        <h2 id={`${headingId}-title`}>Filtros</h2>
        {onCollapse && (
          <button
            type="button"
            className="filters__collapse"
            title="Plegar el panel de filtros"
            aria-label="Plegar el panel de filtros"
            onClick={onCollapse}
          >
            <Icon name="chevronsLeft" />
          </button>
        )}
      </div>

      {/* Buscador de regiones (D4; spec 5.8), justo encima de la selección,
          porque ahí se arma el montaje. */}
      <RegionSearch nodes={nodes} />

      <div className="filters__selection" data-tour="seleccion">
        <span className="filters__selection-text">
          {selectionStatusText(selectedNodeIds.size, selectedConnectionId !== null)}
        </span>
        <span className="filters__selection-actions">
          <button
            type="button"
            className="filters__text-btn filters__text-btn--strong"
            disabled={!hasSelection}
            title="Quita el resaltado actual (nodos o conexión seleccionada) en las tres vistas"
            onClick={clearNodeSelection}
          >
            Limpiar
          </button>
          {historyControls}
        </span>
      </div>

      {/* Marcas de regiones (spec 5.9), bajo la selección: son una capa
          aparte de ella. */}
      <MarksLine nodes={nodes} />

      <div className="filters__section" role="group" aria-labelledby={`${headingId}-networks`} data-tour="redes">
        <div className="filters__section-header">
          <h3 className="filters__heading" id={`${headingId}-networks`}>
            <SectionToggle
              open={openSections.networks}
              controls={`${headingId}-networks-body`}
              onToggle={() => toggleSection("networks")}
            >
              Redes{" "}
              <span className="filters__heading-count" aria-hidden="true">
                {networkKeys.length}
              </span>
              <span className="visually-hidden">
                , {networkKeys.length === 1 ? "1 red" : `${networkKeys.length} redes`}
              </span>
            </SectionToggle>
          </h3>
          {/* «Mostrar» y «Ocultar», no «marcar»: marcar es ahora otra cosa
              (spec 5.9 y 5.10; D11). */}
          <span className="filters__bulk">
            <button type="button" className="filters__text-btn" title="Mostrar todas las redes" onClick={markAllNetworks}>
              Todas
            </button>
            <button type="button" className="filters__text-btn" title="Ocultar todas las redes" onClick={unmarkAllNetworks}>
              Ninguna
            </button>
          </span>
        </div>
        <div id={`${headingId}-networks-body`} hidden={!openSections.networks}>
          {networkKeys.length === 0 ? (
            <p className="filter-panel__empty">Sin redes cargadas todavía.</p>
          ) : (
            <ul className="filters__networks">
              {networkKeys.map((network) => {
                const label = NETWORK_LABELS[network] ?? network;
                const shortLabel = networkShortLabel(network);
                const count = nodeIdsByNetwork.get(network)?.length ?? 0;
                const regions = `${count} región${count === 1 ? "" : "es"}`;
                // ◎ y + (spec 5.3): su nombre dice qué hacen, también si
                // ◎ sustituye la selección entera.
                const highlight = `Resaltar solo la red ${shortLabel} (sustituye la selección)`;
                const add = `Añadir la red ${shortLabel} a la selección`;
                return (
                  <li key={network} className="filters__network" data-tour="red" data-network={network}>
                    {/* En la lista, el nombre sin la clasificación, que ya se
                        ve en el botón «Redes» de la barra. El nombre completo
                        sigue en el texto emergente. */}
                    <label title={`${label} — ${regions}`}>
                      <input
                        type="checkbox"
                        checked={!hiddenNetworks.has(network)}
                        onChange={() => toggleNetwork(network)}
                      />
                      <span className="filters__swatch" style={{ backgroundColor: networkColor(network) }} />
                      <span className="filters__name">{shortLabel}</span>
                      <span className="visually-hidden">, {regions}</span>
                    </label>
                    <span className="filters__count" aria-hidden="true">
                      {formatCount(count)}
                    </span>
                    <span className="filters__actions">
                      <button
                        type="button"
                        className="filters__icon-btn"
                        aria-label={highlight}
                        title={highlight}
                        onClick={() => selectWholeNetwork(network)}
                      >
                        <Icon name="target" size={14} />
                      </button>
                      <button
                        type="button"
                        className="filters__icon-btn"
                        aria-label={add}
                        title={add}
                        onClick={() => addNetworkToSelection(network)}
                      >
                        <Icon name="plus" size={14} />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="filters__section" role="group" aria-labelledby={`${headingId}-types`}>
        <div className="filters__section-header">
          <h3 className="filters__heading" id={`${headingId}-types`}>
            <SectionToggle
              open={openSections.types}
              controls={`${headingId}-types-body`}
              onToggle={() => toggleSection("types")}
            >
              Tipo de conectividad
            </SectionToggle>
          </h3>
        </div>
        <div id={`${headingId}-types-body`} hidden={!openSections.types}>
          <ul className="filters__types">
            {CONNECTION_TYPES.map((type) => (
              <li key={type}>
                <label
                  className="filters__type"
                  title="Conexiones de este tipo que pasan los filtros de redes y de peso mínimo, aunque su casilla esté desmarcada"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenConnectionTypes.has(type)}
                    onChange={() => toggleConnectionType(type)}
                  />
                  <span className="filters__name">{CONNECTION_TYPE_LABELS[type]}</span>
                  <span className="filters__count" aria-hidden="true">
                    {formatCount(connectionCountsByType[type])}
                  </span>
                  {/* Con los dígitos seguidos: un espacio duro en medio del
                      número hace que algunas voces lo lean en dos trozos
                      (como en DataStatus, components/TopBar.tsx). */}
                  <span className="visually-hidden">
                    ,{" "}
                    {connectionCountsByType[type] === 1 ? "1 conexión" : `${connectionCountsByType[type]} conexiones`}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="filters__section" role="group" aria-labelledby={`${headingId}-weight`} data-tour="peso">
        <div className="filters__section-header">
          <h3 className="filters__heading" id={`${headingId}-weight`}>
            <SectionToggle
              open={openSections.weight}
              controls={`${headingId}-weight-body`}
              onToggle={() => toggleSection("weight")}
            >
              Peso mínimo
            </SectionToggle>
          </h3>
          <span className="filters__weight-value">{formatMinWeight(minWeight)}</span>
        </div>
        <div id={`${headingId}-weight-body`} hidden={!openSections.weight}>
          <input
            type="range"
            className="filters__slider"
            min={0}
            max={1}
            step={0.001}
            value={weightToSliderPosition(minWeight)}
            onChange={(event) => setMinWeight(sliderPositionToWeight(Number(event.target.value)))}
            aria-label="Peso mínimo de conectividad"
            aria-valuetext={formatMinWeight(minWeight)}
          />
          <p className="filters__visible">
            {connectionsPassingText(connectionTotals.visible, connectionTotals.loaded)}
          </p>
        </div>
      </div>

      <details className="filters__help">
        <summary>
          <Icon name="help" size={15} />
          ¿Cómo funcionan los filtros?
        </summary>
        <p>◎ resalta solo esa red · + la añade a lo ya resaltado.</p>
        <p>
          Ctrl+clic (⌘+clic en macOS) en una región, o Ctrl+Intro (⌘+Intro) en el buscador, la marca o la
          desmarca: se resalta en las tres vistas para encontrarla de un vistazo, sin cambiar la selección. Las
          marcas no salen en las imágenes exportadas.
        </p>
        <p>
          El número junto a cada tipo de conectividad cuenta sus conexiones que pasan los filtros de redes y de
          peso mínimo, aunque su casilla esté desmarcada: así se ve cuántas añadiría al marcarla.
        </p>
        <p>
          Las vistas pueden dibujar menos conexiones de las que pasan los filtros: con dos o más regiones
          seleccionadas, solo las que hay entre ellas, y si pasan de {formatCount(MAX_RENDERED_CONNECTIONS)}, ninguna.
        </p>
        <p>
          Peso mínimo: escala logarítmica. El peso real de conectividad se concentra en varios órdenes de magnitud
          por debajo de 0.01, así que cada tramo del deslizador multiplica el peso en vez de sumarle una cantidad
          fija. En el extremo izquierdo (0) no se filtra nada.
        </p>
      </details>
    </aside>
  );
}
